import { and, asc, eq, isNull, sql } from 'drizzle-orm';
import { uuidv7 } from 'uuidv7';

import { baseServidor } from '@/db/servidor/cliente';
import { dispositivos, obras, usuarios } from '@/db/servidor/esquema';
import { personaNueva } from '@/features/panel/contratos';
import { filtroDeObra, veTodasLasObras } from '@/features/servidor/alcance';
import { requerirPermiso } from '@/features/servidor/guardia';
import { cuerpoJson, errorDePeticion, ok, responder } from '@/features/servidor/respuestas';
import { modulosDeLaObra } from '@/features/servidor/modulos-de-obra';
import { motivoParaNoDarRol, motivoParaNoDarRolEnObra } from '@/shared/rules/permisos';

/**
 * Las personas: operadores y personal administrativo. `GET` y `POST`.
 *
 * Una sola tabla para las dos superficies, a propósito. La misma persona es un
 * operador que entra al celular con PIN y —si su rol lo permite— alguien que
 * entra al panel con contraseña. Partirla en dos tablas obligaría a mantener
 * sincronizadas dos identidades de la misma persona, que es como se acaban
 * teniendo bitácoras firmadas por alguien que ya no existe.
 *
 * Aquí no se crea ninguna credencial. El PIN lo elige el operador en su equipo
 * y nunca sale de él; la contraseña web y el código de activación llegan con el
 * entregable del ingreso.
 */

export async function GET(peticion: Request) {
  return responder(async () => {
    const sesion = await requerirPermiso(peticion, 'personas', 'listar');
    if (sesion instanceof Response) return sesion;

    const filas = await baseServidor()
      .select({
        id: usuarios.id,
        usuario: usuarios.usuario,
        nombreCompleto: usuarios.nombreCompleto,
        documento: usuarios.documento,
        rol: usuarios.rol,
        cargo: usuarios.cargo,
        obraId: usuarios.obraId,
        obraNombre: obras.nombre,
        activo: usuarios.activo,
        /**
         * Si tiene algún celular activado (spec 015, RF-18). La ventana de baja lo
         * avisa antes de confirmar: darla de baja desactiva ese celular, y lo que
         * no haya subido desde él ya no llega. Una subconsulta y no un `join`: una
         * persona con dos teléfonos saldría dos veces en la lista.
         */
        celularActivo: sql<boolean>`exists (
          select 1 from ${dispositivos}
          where ${dispositivos.usuarioId} = ${usuarios.id}
            and ${dispositivos.revocadoEn} is null
        )`.mapWith(Boolean),
      })
      .from(usuarios)
      // `left` y no `inner`: el personal de gerencia no está adscrito a ninguna
      // obra, y con un inner join desaparecería del listado.
      .leftJoin(obras, eq(obras.id, usuarios.obraId))
      .where(and(isNull(usuarios.eliminadoEn), filtroDeObra(sesion, usuarios.obraId)))
      .orderBy(asc(usuarios.nombreCompleto));

    return ok(filas);
  });
}

export async function POST(peticion: Request) {
  return responder(async () => {
    const sesion = await requerirPermiso(peticion, 'personas', 'escribir');
    if (sesion instanceof Response) return sesion;

    const datos = await cuerpoJson(peticion, personaNueva);

    // Nadie da un acceso que no puede dar: la gerencia, el almacenista y el
    // encargado de planta solo los da la gerencia (001/RF-9, 008/RF-17). Antes
    // esta ruta solo miraba `admin`, y un residente habría podido registrar a un
    // almacenista si la tabla de permisos le abriera Personas.
    const motivo = motivoParaNoDarRol(sesion.rol, datos.rol);
    if (motivo) return errorDePeticion(motivo, 403);

    // Un residente registra gente para su obra y solo para su obra. Se
    // rechaza en vez de corregirse en silencio: si escogió otra obra, o se
    // equivocó o esperaba algo que este sistema no le permite, y en los dos
    // casos conviene que se entere.
    if (!veTodasLasObras(sesion)) {
      if (datos.obraId && datos.obraId !== sesion.obraId) {
        return errorDePeticion('Solo puede registrar personas en su propia obra.', 403);
      }
      datos.obraId ??= sesion.obraId;
    }

    // Y la obra tiene que llevar el módulo de ese acceso (spec 017, RF-11): un
    // almacenista en una obra sin almacén queda con una cuenta que solo sabe decirle
    // que no tiene dónde trabajar.
    const sinModulo = motivoParaNoDarRolEnObra(
      datos.rol,
      await modulosDeLaObra(datos.obraId ?? null),
    );
    if (sinModulo) {
      return Response.json({ error: sinModulo, campos: { rol: sinModulo } }, { status: 400 });
    }

    const [creada] = await baseServidor()
      .insert(usuarios)
      .values({ id: uuidv7(), ...datos })
      .returning({ id: usuarios.id, obraId: usuarios.obraId });

    // El nombre de la obra se resuelve aparte en vez de con un join en el
    // `returning`, que Postgres no admite. Son dos consultas solo al dar de
    // alta, no en el listado.
    const nombreObra = creada.obraId
      ? ((
          await baseServidor()
            .select({ nombre: obras.nombre })
            .from(obras)
            .where(eq(obras.id, creada.obraId))
        )[0]?.nombre ?? null)
      : null;

    return ok({ ...datos, id: creada.id, obraNombre: nombreObra }, 201);
  });
}
