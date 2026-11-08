import { and, eq, isNull } from 'drizzle-orm';
import { uuidv7 } from 'uuidv7';

import { baseServidor } from '@/db/servidor/cliente';
import { clavesGeneradas, credencialesWeb, usuarios } from '@/db/servidor/esquema';
import { personaConObras } from '@/features/auth/servidor/accesos';
import { generarClaveTemporal, hashDeClave } from '@/features/auth/servidor/cripto';
import { cerrarTodasLasSesiones } from '@/features/auth/servidor/sesion';
import { alcanzaLaObra } from '@/features/servidor/alcance';
import { requerirSesion } from '@/features/servidor/guardia';
import { errorDePeticion, noEncontrado, ok, responder } from '@/features/servidor/respuestas';
import { alcanza as permite, motivoParaNoDarRol } from '@/shared/rules/permisos';

/**
 * `POST /api/panel/personas/:id/clave` — dar acceso al panel a alguien.
 *
 * Genera una contraseña temporal y **la devuelve una sola vez**. No se guarda en
 * claro en ninguna parte, así que no hay forma de volver a consultarla: si se
 * pierde, se genera otra. Eso es lo que se quiere — una clave recuperable es una
 * clave que alguien más puede recuperar.
 *
 * Quien la reciba está obligado a cambiarla al entrar (`debeCambiar`), de modo
 * que ni siquiera la gerencia acaba conociendo la contraseña definitiva de otro.
 *
 * **La gerencia y los directores** (041/RF-75, RF-76), a quienes pueden dar acceso y dentro
 * de sus obras. Un residente no: su único acceso es Operador, que no tiene contraseña. Lo
 * de la obra se comprueba aquí porque un director que pudiera con cualquiera tendría una
 * vía a otra obra. Y como quien genera la contraseña la conoce hasta que se cambie, queda
 * escrito quién la generó (RF-78), en el mismo lote que la contraseña: o las dos, o ninguna.
 *
 * **Y sobre uno mismo, no.** Esto no es "ver mi acceso": borra la contraseña
 * anterior y cierra las sesiones de esa persona. Pedirlo para uno mismo es
 * cerrarse la puerta con la clave nueva escrita en una pantalla que se pierde al
 * cambiar de módulo — ya pasó una vez, y hubo que reponerla con
 * `scripts/crear-admin.ts`. Quien quiera cambiar la suya tiene la pantalla de
 * cambio, que pide la actual y no deja a nadie fuera.
 */
export async function POST(peticion: Request, { id }: { id: string }) {
  return responder(async () => {
    const sesion = await requerirSesion(peticion);
    if (sesion instanceof Response) return sesion;
    // Con su propio mensaje: el general de `personas · activar` habla de códigos del celular.
    if (!permite(sesion.rol, 'personas', 'activar')) {
      return errorDePeticion('Generar contraseñas lo hacen la gerencia, el director de proyectos y el director de obra.', 403);
    }

    const db = baseServidor();

    const [persona] = await db
      .select({
        id: usuarios.id,
        nombreCompleto: usuarios.nombreCompleto,
        usuario: usuarios.usuario,
        rol: usuarios.rol,
        activo: usuarios.activo,
      })
      .from(usuarios)
      .where(and(eq(usuarios.id, id), isNull(usuarios.eliminadoEn)))
      .limit(1);

    if (!persona) return noEncontrado('esa persona');

    // Fuera de sus obras «no existe», como en el resto de las rutas de personas (041/RF-20).
    const obras = (await personaConObras(id))?.obras ?? [];
    const alcanza = obras.length === 0 ? alcanzaLaObra(sesion, null) : obras.some((o) => alcanzaLaObra(sesion, o));
    if (!alcanza) return noEncontrado('esa persona');

    // La misma regla que la interfaz, aquí porque aquí es donde vale: un botón
    // escondido se salta con una petición a mano.
    if (persona.id === sesion.id) {
      return errorDePeticion(
        'Esta acción reparte accesos a otras personas y cerraría su propia sesión. ' +
          'Para cambiar la suya, use "Cambiar mi contraseña".',
        400,
      );
    }

    if (persona.rol === 'operador') {
      return errorDePeticion(
        'Un operador no entra al panel: su acceso es la app del celular, con su PIN. ' +
          'Cámbiele el cargo si necesita que entre a la web.',
        400,
      );
    }

    // Solo a quien podría darle ese acceso (041/RF-76): el mensaje dice quién sí puede.
    const motivo = motivoParaNoDarRol(sesion.rol, persona.rol);
    if (motivo) return errorDePeticion(motivo, 403);

    if (!persona.activo) {
      return errorDePeticion('Esa persona está inactiva. Actívela antes de darle acceso.', 400);
    }

    const temporal = generarClaveTemporal();
    const hash = await hashDeClave(temporal);

    await db.batch([
      db
        .insert(credencialesWeb)
        .values({ usuarioId: persona.id, hash, debeCambiar: true })
        .onConflictDoUpdate({
          target: credencialesWeb.usuarioId,
          set: { hash, debeCambiar: true, ultimoIngresoEn: null },
        }),
      db.insert(clavesGeneradas).values({ id: uuidv7(), usuarioId: persona.id, generadaPor: sesion.id }),
    ]);

    // Reponer la contraseña invalida lo anterior: si se repone porque se
    // sospecha de un acceso ajeno, dejar la sesión de ese acceso abierta haría
    // inútil la reposición.
    await cerrarTodasLasSesiones(persona.id);

    return ok({
      usuario: persona.usuario,
      nombreCompleto: persona.nombreCompleto,
      claveTemporal: temporal,
    });
  });
}
