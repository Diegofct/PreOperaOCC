import { and, eq, isNull } from 'drizzle-orm';

import { baseServidor, baseServidorSerializable } from '@/db/servidor/cliente';
import { dispositivos, usuarios } from '@/db/servidor/esquema';
import { personaEditada } from '@/features/panel/contratos';
import { alcanzaLaObra } from '@/features/servidor/alcance';
import type { PersonaEnSesion } from '@/features/servidor/guardia';
import { requerirPermiso } from '@/features/servidor/guardia';
import {
  cuerpoJson,
  errorDePeticion,
  noEncontrado,
  ok,
  responder,
} from '@/features/servidor/respuestas';
import { modulosDeLaObra } from '@/features/servidor/modulos-de-obra';
import { motivoParaNoDarRol, motivoParaNoDarRolEnObra } from '@/shared/rules/permisos';

/** Editar y dar de baja una persona. `PATCH` y `DELETE /api/panel/personas/:id`. */

const COLUMNAS = {
  id: usuarios.id,
  usuario: usuarios.usuario,
  nombreCompleto: usuarios.nombreCompleto,
  documento: usuarios.documento,
  rol: usuarios.rol,
  cargo: usuarios.cargo,
  obraId: usuarios.obraId,
  activo: usuarios.activo,
};

/**
 * Comprueba que la persona existe y cae dentro del alcance de quien pregunta.
 *
 * Va antes de cada escritura, y no basta con filtrar el listado: quien conoce un
 * id puede llamar directamente a esta ruta sin haber pasado por la pantalla.
 */
async function personaAlcanzable(
  sesion: PersonaEnSesion,
  id: string,
): Promise<Response | null> {
  const [fila] = await baseServidor()
    .select({ obraId: usuarios.obraId, rol: usuarios.rol })
    .from(usuarios)
    .where(and(eq(usuarios.id, id), isNull(usuarios.eliminadoEn)))
    .limit(1);

  if (!fila) return noEncontrado('esa persona');
  if (!alcanzaLaObra(sesion, fila.obraId)) return noEncontrado('esa persona');
  if (fila.rol === 'admin' && sesion.rol !== 'admin') {
    return errorDePeticion('Solo la gerencia puede modificar a otra gerencia.', 403);
  }
  return null;
}

export async function PATCH(peticion: Request, { id }: { id: string }) {
  return responder(async () => {
    const sesion = await requerirPermiso(peticion, 'personas', 'escribir');
    if (sesion instanceof Response) return sesion;

    const fueraDeAlcance = await personaAlcanzable(sesion, id);
    if (fueraDeAlcance) return fueraDeAlcance;

    const cambios = await cuerpoJson(peticion, personaEditada);

    // La segunda cerradura de la misma puerta: nadie asciende a nadie por
    // encima de sí mismo. Con la tabla de permisos actual solo la gerencia
    // llega hasta aquí, así que hoy no rechaza a nadie — y precisamente por eso
    // se escribe, para que siga en pie el día que el permiso de escritura se
    // relaje. Antes esta ruta aceptaba el rol del cuerpo sin mirarlo.
    const motivo = cambios.rol ? motivoParaNoDarRol(sesion.rol, cambios.rol) : null;
    if (motivo) return errorDePeticion(motivo, 403);

    // Y con qué módulos queda su obra (spec 017, RF-11). Se mira el rol y la obra
    // **como quedarían**: cambiar de obra a un almacenista también puede dejarlo en
    // una que no lleva almacén.
    if (cambios.rol || cambios.obraId !== undefined) {
      const [actual] = await baseServidor()
        .select({ rol: usuarios.rol, obraId: usuarios.obraId })
        .from(usuarios)
        .where(eq(usuarios.id, id))
        .limit(1);
      if (!actual) return noEncontrado('esa persona');

      const sinModulo = motivoParaNoDarRolEnObra(
        cambios.rol ?? actual.rol,
        await modulosDeLaObra(cambios.obraId === undefined ? actual.obraId : cambios.obraId),
      );
      if (sinModulo) {
        return Response.json({ error: sinModulo, campos: { rol: sinModulo } }, { status: 400 });
      }
    }

    const [fila] = await baseServidor()
      .update(usuarios)
      .set(cambios)
      .where(and(eq(usuarios.id, id), isNull(usuarios.eliminadoEn)))
      .returning(COLUMNAS);

    return fila ? ok(fila) : noEncontrado('esa persona');
  });
}

/**
 * Baja de una persona: `activo = false` **y** lápida, y sus celulares revocados.
 *
 * `activo` y `eliminado_en`, las dos y no una: `activo` es lo que el celular ya
 * sabe leer —la réplica local no tiene columna de lápida— y `eliminado_en` es lo
 * que libera el nombre de usuario para que se pueda reutilizar. El índice único
 * de `usuarios.usuario` es parcial justamente por esto.
 *
 * Nunca se borra la fila: hay preoperacionales y bitácoras firmados apuntándole,
 * y un registro cuyo autor desapareció deja de ser evidencia de nada.
 *
 * ── Los celulares se revocan en el mismo paso (spec 015, RF-19 a RF-21) ──
 *
 * Hasta la spec 015 esta ruta respondía 409 a quien tuviera un celular activado
 * y pedía «desactivarlo» primero, pero el panel no tenía con qué: a un operador
 * con teléfono no se le podía dar de baja. La razón del 409 sigue siendo cierta:
 * la lápida libera el nombre de usuario, y un teléfono que conservara su acceso
 * quedaría con una identidad que se le puede dar a otra persona. Revocar todos
 * sus dispositivos en la misma operación cierra esa puerta igual: la guardia del
 * móvil y el refresco de token rechazan un dispositivo revocado.
 *
 * Van en un solo `batch`, que Neon ejecuta como una transacción: o la persona
 * queda de baja y sin celulares, o queda como estaba (RF-21). Dos peticiones
 * separadas podían dejarla sin teléfono pero todavía activa. Lo que ese celular
 * tuviera sin subir se queda en él —la cola no borra— y ya no llega: la ventana
 * de confirmación lo avisa (RF-18).
 */
export async function DELETE(peticion: Request, { id }: { id: string }) {
  return responder(async () => {
    const sesion = await requerirPermiso(peticion, 'personas', 'escribir');
    if (sesion instanceof Response) return sesion;

    const fueraDeAlcance = await personaAlcanzable(sesion, id);
    if (fueraDeAlcance) return fueraDeAlcance;

    // Darse de baja a uno mismo deja el sistema sin quien lo administre si
    // resulta ser el único administrador. Se corta aquí, que es barato.
    if (id === sesion.id) {
      return errorDePeticion('No puede darse de baja a usted mismo.', 400);
    }

    const ahora = new Date();
    const base = baseServidorSerializable();
    const [dada] = await base.batch([
      base
        .update(usuarios)
        .set({ activo: false, eliminadoEn: ahora })
        .where(and(eq(usuarios.id, id), isNull(usuarios.eliminadoEn)))
        .returning(COLUMNAS),
      // Todos, no el primero: quien cambió de teléfono sin desactivar el viejo
      // tiene dos. Si la persona ya estaba de baja (otra gerencia se adelantó),
      // esto no revoca nada que debiera seguir vivo.
      base
        .update(dispositivos)
        .set({ revocadoEn: ahora })
        .where(and(eq(dispositivos.usuarioId, id), isNull(dispositivos.revocadoEn))),
    ]);

    const [fila] = dada;
    return fila ? ok(fila) : noEncontrado('esa persona');
  });
}
