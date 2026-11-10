/**
 * Las versiones de la planificación de una obra y su detalle (spec 043, RF-40 a RF-45, RF-49,
 * RF-86, RF-91, RF-97). **Solo servidor.**
 *
 * Aquí no hay nada que edite una planificación: ni un `PUT` ni un campo suelto. Un borrador se
 * corrige arreglando el Excel y volviéndolo a subir (RF-51), y una aprobada no se toca (RF-45);
 * lo único que cambia una versión son aprobar y anular, en `versiones.ts`.
 *
 * El listado no trae las descartadas. Un borrador sustituido conserva su número para que la primera
 * aprobada sea la v1 (RF-44), así que listarlo pondría dos «v1» una encima de otra; se conserva
 * (RF-116) y se abre por su id, pero no es una versión de la obra.
 *
 * El alcance es el de siempre: la obra se resuelve con `obraDelContrato` en el listado, y en el
 * detalle se lee la fila y se mira su obra con `alcanzaLaObra`. Una de otra obra responde 404, no
 * 403, para no confirmar que existe.
 */
import { and, asc, eq, ne } from 'drizzle-orm';

import { baseServidor } from '@/db/servidor/cliente';
import { media, obras, planificaciones, presupuestos } from '@/db/servidor/esquema';
import { leer } from '@/features/media/servidor/almacen';
import type { PlanificacionDetalle, PlanificacionFila } from '@/features/panel/planificacion';
import { alcanzaLaObra } from '@/features/servidor/alcance';
import type { PersonaEnSesion } from '@/features/servidor/guardia';
import { mesesAnterioresPorMarcar } from '@/shared/rules/cumplimiento-de-obra';
import { fechaDeJornada } from '@/shared/rules/jornada';

type FilaDePlanificacion = typeof planificaciones.$inferSelect;

function fila(p: FilaDePlanificacion): PlanificacionFila {
  return {
    id: p.id,
    numeroVersion: p.numeroVersion,
    estado: p.estado,
    rigeDesde: p.rigeDesde,
    rigeHasta: p.rigeHasta,
    aprobadoEn: p.aprobadoEn?.toISOString() ?? null,
    anuladoEn: p.anuladoEn?.toISOString() ?? null,
    motivoAnulacion: p.motivoAnulacion,
    creadoEn: p.creadoEn.toISOString(),
  };
}

/** RF-44, RF-49: las versiones de la obra, de la primera a la última, sin las descartadas. */
export async function listarPlanificaciones(obraId: string): Promise<PlanificacionFila[]> {
  const filas = await baseServidor()
    .select()
    .from(planificaciones)
    .where(and(eq(planificaciones.obraId, obraId), ne(planificaciones.estado, 'descartada')))
    .orderBy(asc(planificaciones.numeroVersion));
  return filas.map(fila);
}

/** RF-49, RF-91: la planificación, si su obra está al alcance de quien pregunta. */
export async function planificacionAlAlcance(sesion: PersonaEnSesion, id: string): Promise<FilaDePlanificacion | null> {
  const [encontrada] = await baseServidor().select().from(planificaciones).where(eq(planificaciones.id, id)).limit(1);
  return encontrada && alcanzaLaObra(sesion, encontrada.obraId) ? encontrada : null;
}

/**
 * RF-8, RF-50: el Excel tal como se subió, con un nombre que diga de qué obra y versión es. `null`
 * si no está en el almacén. Sale solo por aquí: `media/[id]` no entrega estos archivos (T18).
 */
export async function excelOriginal(p: FilaDePlanificacion): Promise<{ contenido: Uint8Array<ArrayBuffer>; nombre: string } | null> {
  const db = baseServidor();
  const [archivo] = await db
    .select({ clave: media.claveR2 })
    .from(media)
    .where(and(eq(media.id, p.mediaId), eq(media.duenoTipo, 'planificacion'), eq(media.duenoId, p.id)))
    .limit(1);
  if (!archivo?.clave) return null;
  const leido = await leer(archivo.clave);
  if (!leido) return null;
  const [obra] = await db.select({ codigo: obras.codigo }).from(obras).where(eq(obras.id, p.obraId)).limit(1);
  return { contenido: leido.contenido, nombre: `Planificación ${obra?.codigo ?? ''} v${p.numeroVersion}.xlsx`.replace(/\s+/g, ' ') };
}

/** RF-40, RF-121: el detalle, con el aviso de presupuesto más nuevo y los meses por responder. */
export async function detalleDePlanificacion(p: FilaDePlanificacion): Promise<PlanificacionDetalle> {
  const db = baseServidor();
  const [vigente] = await db
    .select({ id: presupuestos.id })
    .from(presupuestos)
    .where(and(eq(presupuestos.obraId, p.obraId), eq(presupuestos.estado, 'vigente')))
    .limit(1);

  // RF-121: la pregunta mes por mes es solo de la primera aprobación de la obra.
  let mesesPorMarcar: string[] = [];
  if (p.estado === 'borrador') {
    const aprobadas = await db
      .select({ aprobadoEn: planificaciones.aprobadoEn })
      .from(planificaciones)
      .where(and(eq(planificaciones.obraId, p.obraId), ne(planificaciones.id, p.id)));
    if (!aprobadas.some((a) => a.aprobadoEn !== null)) mesesPorMarcar = mesesAnterioresPorMarcar(p.estructura.items, fechaDeJornada());
  }

  return {
    ...fila(p),
    obraId: p.obraId,
    version: p.version,
    estructura: p.estructura,
    hallazgos: p.hallazgos,
    resumen: p.resumen,
    rechazados: p.rechazados,
    mesesCumplidos: p.mesesCumplidos,
    // RF-40: sin presupuesto vigente no hay uno más nuevo del que avisar.
    presupuestoDesactualizado: vigente !== undefined && vigente.id !== p.presupuestoId,
    mesesPorMarcar,
  };
}
