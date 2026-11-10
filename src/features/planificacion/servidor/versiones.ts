/**
 * Aprobar y anular una planificación (spec 043, RF-34 a RF-39, RF-46, RF-99, RF-120 a RF-122).
 * **Solo servidor.**
 *
 * ── Un lote, en este orden ──
 *
 * Aprobar son dos cambios: la vigente pasa a `reemplazada` y el borrador a `vigente`. Van en un
 * solo `db.batch`, que en Neon es una transacción, y en ese orden porque el índice parcial de la
 * vigente no admite dos ni por un instante. Sin transacciones interactivas no se puede leer y
 * decidir en medio, así que las dos sentencias llevan la misma condición: que el borrador siga
 * siendo borrador y con la versión que vio la persona (RF-99). Si otra persona lo sustituyó o lo
 * aprobó mientras tanto, ninguna de las dos toca nada y se responde 409.
 *
 * ── Las fechas son de Colombia ──
 *
 * `rige_desde` es hoy y la que se reemplaza rige hasta ayer (RF-120), con `fechaDeJornada`: la
 * fecha del equipo daría la de UTC en el servidor (notas de T6). Una versión aprobada y reemplazada
 * el mismo día queda con el rango invertido, y la regla la trata como que no rigió ningún día.
 */
import { and, eq, ne, sql } from 'drizzle-orm';

import { baseServidor } from '@/db/servidor/cliente';
import { planificaciones } from '@/db/servidor/esquema';
import type { AprobacionDePlanificacion, PlanificacionDetalle } from '@/features/panel/planificacion';
import type { PersonaEnSesion } from '@/features/servidor/guardia';
import { errorDePeticion, noEncontrado } from '@/features/servidor/respuestas';
import { ultimoDiaQueRige } from '@/shared/rules/cumplimiento-de-obra';
import { fechaDeJornada } from '@/shared/rules/jornada';

import { detalleDePlanificacion, planificacionAlAlcance } from './planificaciones';

export const MENSAJE_DE_CHOQUE_DE_PLANIFICACION =
  'Este borrador cambió desde que lo abrió: otra persona lo sustituyó o lo aprobó. Vuelva a abrirlo antes de aprobar.';

/** RF-34 a RF-39, RF-46, RF-99, RF-120 a RF-122. */
export async function aprobarPlanificacion(
  sesion: PersonaEnSesion,
  id: string,
  pedido: AprobacionDePlanificacion,
): Promise<PlanificacionDetalle | Response> {
  const fila = await planificacionAlAlcance(sesion, id);
  if (!fila) return noEncontrado('esa planificación');
  if (fila.estado !== 'borrador') return errorDePeticion('Solo se aprueba un borrador.', 409);
  if (fila.version !== pedido.version) return errorDePeticion(MENSAJE_DE_CHOQUE_DE_PLANIFICACION, 409);

  // RF-35: una sola confirmación del conjunto, con la lista a la vista.
  if (fila.hallazgos.length > 0 && !pedido.confirmarHallazgos) {
    return Response.json(
      { error: `Esta planificación tiene ${fila.hallazgos.length} hallazgos. Revíselos y confirme que la aprueba así.`, hallazgos: fila.hallazgos },
      { status: 409 },
    );
  }

  // RF-121: en la primera de la obra, la respuesta mes por mes. Una lista vacía también es respuesta.
  const { mesesPorMarcar } = await detalleDePlanificacion(fila);
  if (mesesPorMarcar.length > 0 && pedido.mesesCumplidos === undefined) {
    return Response.json(
      { error: 'Antes de aprobar la primera planificación, diga cuáles de estos meses ya cumplieron su meta.', mesesPorMarcar },
      { status: 409 },
    );
  }

  const ahora = new Date();
  const hoy = fechaDeJornada(ahora.getTime());
  // RF-122: solo los meses que se preguntaron; uno inventado no se marca.
  const marcados = new Set(pedido.mesesCumplidos ?? []);
  const mesesCumplidos = mesesPorMarcar
    .filter((mes) => marcados.has(mes))
    .map((mes) => ({ mes, marcadoPor: sesion.id, marcadoEn: ahora.toISOString() }));

  const db = baseServidor();
  const sigueIntacto = sql`exists (select 1 from ${planificaciones} as b where b.id = ${fila.id} and b.estado = 'borrador' and b.version = ${pedido.version})`;
  const [, aprobada] = await db.batch([
    db
      .update(planificaciones)
      .set({ estado: 'reemplazada', rigeHasta: ultimoDiaQueRige(hoy), version: sql`${planificaciones.version} + 1`, actualizadoPor: sesion.id, actualizadoEn: ahora })
      .where(and(eq(planificaciones.obraId, fila.obraId), eq(planificaciones.estado, 'vigente'), ne(planificaciones.id, fila.id), sigueIntacto)),
    db
      .update(planificaciones)
      .set({
        estado: 'vigente',
        rigeDesde: hoy,
        aprobadoEn: ahora,
        aprobadoPor: sesion.id,
        mesesCumplidos,
        version: sql`${planificaciones.version} + 1`,
        actualizadoPor: sesion.id,
        actualizadoEn: ahora,
      })
      .where(and(eq(planificaciones.id, fila.id), eq(planificaciones.estado, 'borrador'), eq(planificaciones.version, pedido.version)))
      .returning(),
  ]);
  if (aprobada.length === 0) return errorDePeticion(MENSAJE_DE_CHOQUE_DE_PLANIFICACION, 409);
  return detalleDePlanificacion(aprobada[0]);
}

/**
 * RF-47, RF-48, RF-55, RF-118, RF-138: solo la vigente, con motivo, y deja de regir hoy mismo. Una
 * reemplazada ya no rige nada que anular, y anularla cambiaría cómo se miden periodos ya cerrados.
 * Los días desde hoy quedan sin meta («Sin planificación aprobada») hasta aprobar otra.
 */
export async function anularPlanificacion(
  sesion: PersonaEnSesion,
  id: string,
  motivo: string,
): Promise<PlanificacionDetalle | Response> {
  const fila = await planificacionAlAlcance(sesion, id);
  if (!fila) return noEncontrado('esa planificación');
  if (fila.estado !== 'vigente') return errorDePeticion('Solo se anula la planificación vigente.', 409);

  const ahora = new Date();
  const [anulada] = await baseServidor()
    .update(planificaciones)
    .set({
      estado: 'anulada',
      anuladoEn: ahora,
      anuladoPor: sesion.id,
      motivoAnulacion: motivo.trim(),
      rigeHasta: ultimoDiaQueRige(fechaDeJornada(ahora.getTime())),
      version: sql`${planificaciones.version} + 1`,
      actualizadoPor: sesion.id,
      actualizadoEn: ahora,
    })
    .where(and(eq(planificaciones.id, fila.id), eq(planificaciones.estado, 'vigente')))
    .returning();
  // Otra persona la anuló o la reemplazó entre la lectura y la escritura.
  if (!anulada) return errorDePeticion('Esta planificación ya no es la vigente. Vuelva a abrirla.', 409);
  return detalleDePlanificacion(anulada);
}
