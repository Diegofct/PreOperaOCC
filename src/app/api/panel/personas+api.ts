import { and, asc, eq, isNull, ne, sql } from 'drizzle-orm';
import { uuidv7 } from 'uuidv7';

import { baseServidor } from '@/db/servidor/cliente';
import { dispositivos, fichasLaborales, obras, usuarios } from '@/db/servidor/esquema';
import { personaNueva } from '@/features/panel/contratos';
import { filtroDeObra, veTodasLasObras } from '@/features/servidor/alcance';
import { requerirPermiso } from '@/features/servidor/guardia';
import { cuerpoJson, errorDePeticion, ok, responder } from '@/features/servidor/respuestas';
import { modulosDeLaObra } from '@/features/servidor/modulos-de-obra';
import {
  empresaDelAccesoSinObra,
  empresaDeLaPersona,
  esEmpresa,
  reparoDelAccesoSinObra,
} from '@/shared/rules/empresas';
import { motivoParaNoDarRol, motivoParaNoDarRolEnObra } from '@/shared/rules/permisos';
import { USUARIO_IA_WHATSAPP } from '@/shared/rules/whatsapp-automatico';

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

    // Spec 033, RF-28: las de una empresa (`?empresa=`) o las de una obra (`?obraId=`). La
    // empresa se resuelve con la regla y no en SQL: la de quien no tiene la toma de su
    // rol (RF-46), y esa regla vive en un solo sitio.
    const parametros = new URL(peticion.url).searchParams;
    const empresa = parametros.get('empresa');
    if (empresa !== null && !esEmpresa(empresa)) return errorDePeticion('Esa empresa no existe.');
    const obraId = parametros.get('obraId');

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
        empresa: usuarios.empresa,
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
        // Spec 024, RF-32: la marca «creado desde WhatsApp».
        desdeWhatsapp: sql<boolean>`exists (
          select 1 from whatsapp_creados c
          where c.tipo = 'persona' and c.registro_id = ${usuarios.id}
        )`.mapWith(Boolean),
        // Spec 035, RF-21: retirada en Recursos Humanos. Solo el estado: el resto de la
        // ficha no sale de `rrhh/servidor`.
        retirado: sql<boolean>`exists (
          select 1 from ${fichasLaborales}
          where ${fichasLaborales.usuarioId} = ${usuarios.id} and ${fichasLaborales.estado} = 'retirado'
        )`.mapWith(Boolean),
      })
      .from(usuarios)
      // `left` y no `inner`: el personal de gerencia no está adscrito a ninguna
      // obra, y con un inner join desaparecería del listado.
      .leftJoin(obras, eq(obras.id, usuarios.obraId))
      .where(
        and(
          isNull(usuarios.eliminadoEn),
          filtroDeObra(sesion, usuarios.obraId),
          // El usuario de sistema «IA WhatsApp» no es una persona de la obra (spec 024).
          ne(usuarios.id, USUARIO_IA_WHATSAPP.id),
          obraId ? eq(usuarios.obraId, obraId) : undefined,
        ),
      )
      .orderBy(asc(usuarios.nombreCompleto));

    const conEmpresa = filas.map((f) => ({ ...f, empresa: empresaDeLaPersona(f.empresa, f.rol) }));
    return ok(empresa ? conEmpresa.filter((f) => f.empresa === empresa) : conEmpresa);
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

    // El Encargado de OCC es de OCC y la auxiliar de RR. HH. de Elemental, los dos sin obra
    // (spec 034, RF-13; spec 035, RF-8): sin empresa, la suya; con obra o con otra empresa,
    // se les dice por qué no.
    datos.empresa ??= empresaDelAccesoSinObra(datos.rol);
    const reparo = reparoDelAccesoSinObra({ rol: datos.rol, obraId: datos.obraId ?? null, empresa: datos.empresa ?? null });
    if (reparo) {
      return Response.json({ error: reparo.mensaje, campos: { [reparo.campo]: reparo.mensaje } }, { status: 400 });
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

    return ok(
      { ...datos, id: creada.id, obraNombre: nombreObra, empresa: empresaDeLaPersona(datos.empresa, datos.rol) },
      201,
    );
  });
}
