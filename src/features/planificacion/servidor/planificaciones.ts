/**
 * Las versiones de la planificación de una obra y su detalle (spec 043, RF-40 a RF-45, RF-49,
 * RF-86, RF-91, RF-97). **Solo servidor.**
 *
 * Aquí no hay nada que edite una planificación. Desde la spec 045 un borrador se corrige en
 * pantalla (`borradores.ts`), y una aprobada sigue sin tocarse (RF-45); lo único que cambia una
 * versión aprobada son aprobar y anular, en `versiones.ts`.
 *
 * Spec 045: el detalle de una planificación de la 043 se ve normalizado —sus indirectos como
 * «Indirectos sin desglose» (RF-145)— sin reescribir lo guardado. Y al Director de Obra se le
 * recorta la mano de obra indirecta antes de responder (RF-150 a RF-152): renglones, hallazgos y
 * cifras descartadas que la nombran, y el Excel original, que trae la nómina.
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
import { normalizarLegada } from '@/shared/rules/planificacion-borrador';
import { recortarManoDeObraIndirecta, veSoloElTotalDeManoDeObraIndirecta } from '@/shared/rules/planificacion-indirectos';

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
  // Spec 045, RF-149: una nacida del presupuesto o de una copia no tiene Excel original.
  if (!p.mediaId) return null;
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

/**
 * RF-40, RF-121: el detalle, con el aviso de presupuesto más nuevo y los meses por responder. Spec
 * 045: normalizado si es de la 043 (RF-145) y recortado para el Director de Obra (RF-150 a RF-152).
 */
export async function detalleDePlanificacion(p: FilaDePlanificacion, sesion: PersonaEnSesion): Promise<PlanificacionDetalle> {
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

  const vista = recortarManoDeObraIndirecta(
    { estructura: normalizarLegada(p.estructura), hallazgos: p.hallazgos, rechazados: p.rechazados },
    sesion.rol,
  );
  return {
    ...fila(p),
    obraId: p.obraId,
    version: p.version,
    estructura: vista.estructura,
    hallazgos: vista.hallazgos,
    resumen: p.resumen,
    rechazados: vista.rechazados,
    mesesCumplidos: p.mesesCumplidos,
    // RF-40: sin presupuesto vigente no hay uno más nuevo del que avisar.
    presupuestoDesactualizado: vigente !== undefined && vigente.id !== p.presupuestoId,
    mesesPorMarcar,
    // Spec 045, RF-147 a RF-149, RF-152: el original solo si nació de un Excel y no hay recorte.
    origen: p.origen,
    copiadaDe: p.copiadaDe,
    tieneExcel: p.mediaId !== null && !vista.recortada,
    manoDeObraIndirectaRecortada: vista.recortada,
  };
}

/**
 * RF-152: el Excel original trae la nómina del personal y no se puede recortar, así que al Director
 * de Obra no se le entrega. Ve la mano de obra indirecta como total en la planificación.
 */
export function puedeBajarElExcelOriginal(sesion: PersonaEnSesion): boolean {
  return !veSoloElTotalDeManoDeObraIndirecta(sesion.rol);
}
