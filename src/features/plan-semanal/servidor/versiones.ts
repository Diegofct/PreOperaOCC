/**
 * Aprobar y anular un plan semanal (spec 044, RF-56 a RF-68, RF-85, RF-99, RF-100, RF-106).
 * **Solo servidor.**
 *
 * ── Dos cerraduras para aprobar ──
 *
 * La tabla de permisos ya dejó fuera al Residente antes de llegar aquí (RF-59), y el alcance, a
 * quien no es de la obra. Lo que se decide aquí es lo que depende del plan: quién lo creó. Un plan
 * de la dirección no lo aprueba un Director de Obra, aunque el suyo sí (RF-56 a RF-58); la regla es
 * `puedeAprobarPlan` y el rechazo dice a quién le toca. Anular sigue la misma regla (RF-65).
 *
 * ── Una sola sentencia, condicionada ──
 *
 * Neon por HTTP no da transacciones interactivas. Aprobar es un `update` que solo toca la fila si
 * sigue siendo borrador y con la versión que vio la persona (RF-63): si otra la ajustó, la sustituyó
 * o la aprobó entretanto, no cambia nada y se responde 409. A diferencia de la planificación, aquí
 * no hay una vigente que reemplazar en el mismo lote: una semana con plan vigente no admite otro
 * hasta que se anule (RF-51, RF-68), y el índice parcial lo respalda si dos aprueban a la vez.
 *
 * ── Los avisos se miran otra vez ──
 *
 * Los avisos se calculan al aprobar, no se toman de lo que mostró la pantalla (RF-33, RF-100): lo
 * pendiente cambia con cada parte y puede haber una planificación más nueva desde que se abrió. Si
 * hay alguno, hace falta una sola confirmación del conjunto (RF-60), con la lista en la respuesta.
 *
 * ── Las fechas son de Colombia ──
 *
 * `rige_desde` y `rige_hasta` salen de la regla con `fechaDeJornada` (RF-62, RF-67). Un plan
 * anulado el mismo día que se aprobó, o antes de que empiece su semana, queda con el rango
 * invertido, y `planQueRige` lo trata como que no rigió ningún día.
 *
 * Nada de esto escribe fuera de `planes_semanales` (RF-85), y nada se borra (RF-69).
 */
import { and, eq, sql } from 'drizzle-orm';

import { baseServidor } from '@/db/servidor/cliente';
import { planesSemanales, usuarios } from '@/db/servidor/esquema';
import type { AprobacionDePlanSemanal, PlanSemanalDetalle } from '@/features/panel/plan-semanal';
import type { PersonaEnSesion } from '@/features/servidor/guardia';
import { errorDePeticion, noEncontrado } from '@/features/servidor/respuestas';
import { fechaDeJornada } from '@/shared/rules/jornada';
import { puedeAprobarPlan, quienApruebaElPlan, rigeDesdeAlAprobar, rigeHastaAlAnular, semanaTerminada } from '@/shared/rules/plan-semanal';

import { detalleDelPlan, planAlAlcance, vistaDelPlan, type FilaDelPlan } from './planes';

const CAMBIO_ANTES_DE_APROBAR =
  'Este borrador cambió desde que lo abrió: otra persona lo ajustó, lo sustituyó o lo aprobó. Vuelva a abrirlo antes de aprobar.';

/** RF-56 a RF-59, RF-65: por qué esta persona no aprueba ni anula este plan; `null` si le toca. */
async function rechazoPorAutor(sesion: PersonaEnSesion, plan: FilaDelPlan): Promise<Response | null> {
  const [autor] = await baseServidor().select({ rol: usuarios.rol }).from(usuarios).where(eq(usuarios.id, plan.creadoPor)).limit(1);
  // Un autor que no se encuentra cae en lo más restrictivo de la regla, igual que un cargo que no arma planes.
  const rol = autor?.rol ?? 'operador';
  return puedeAprobarPlan(sesion.rol, rol) ? null : errorDePeticion(quienApruebaElPlan(rol), 403);
}

/** RF-56 a RF-63, RF-99, RF-100, RF-106. */
export async function aprobarPlan(sesion: PersonaEnSesion, id: string, pedido: AprobacionDePlanSemanal): Promise<PlanSemanalDetalle | Response> {
  const plan = await planAlAlcance(sesion, id);
  if (!plan) return noEncontrado('ese plan semanal');
  if (plan.estado !== 'borrador') return errorDePeticion('Solo se aprueba un borrador.', 409);

  const ahora = new Date();
  const hoy = fechaDeJornada(ahora.getTime());
  // RF-99: una semana que terminó ya no tiene qué medir con este plan; queda «Sin aprobar».
  if (semanaTerminada(plan.semana, hoy)) return errorDePeticion('La semana de este plan ya terminó: no se puede aprobar.', 409);

  const rechazo = await rechazoPorAutor(sesion, plan);
  if (rechazo) return rechazo;
  if (plan.version !== pedido.version) return errorDePeticion(CAMBIO_ANTES_DE_APROBAR, 409);

  const db = baseServidor();
  // RF-51, RF-68: con un plan vigente en la semana, primero se anula ese.
  const [vigente] = await db
    .select({ id: planesSemanales.id })
    .from(planesSemanales)
    .where(and(eq(planesSemanales.obraId, plan.obraId), eq(planesSemanales.semana, plan.semana), eq(planesSemanales.estado, 'vigente')))
    .limit(1);
  if (vigente) return errorDePeticion('Esa semana ya tiene un plan aprobado. Anúlelo antes de aprobar este.', 409);

  // RF-60: una sola confirmación del conjunto, con la lista a la vista.
  const { avisos } = await vistaDelPlan(plan);
  if (avisos.length > 0 && !pedido.confirmarAvisos) {
    return Response.json(
      { error: `Este plan tiene ${avisos.length} ${avisos.length === 1 ? 'aviso' : 'avisos'}. Revíselos y confirme que lo aprueba así.`, avisos },
      { status: 409 },
    );
  }

  const [aprobado] = await db
    .update(planesSemanales)
    .set({
      estado: 'vigente',
      rigeDesde: rigeDesdeAlAprobar(plan.semana, hoy),
      aprobadoEn: ahora,
      aprobadoPor: sesion.id,
      version: sql`${planesSemanales.version} + 1`,
      actualizadoEn: ahora,
    })
    .where(and(eq(planesSemanales.id, plan.id), eq(planesSemanales.estado, 'borrador'), eq(planesSemanales.version, pedido.version)))
    .returning();
  if (!aprobado) return errorDePeticion(CAMBIO_ANTES_DE_APROBAR, 409);
  return detalleDelPlan(sesion, aprobado);
}

/** RF-65 a RF-67: solo el vigente, con motivo, y deja de regir hoy mismo. */
export async function anularPlan(sesion: PersonaEnSesion, id: string, motivo: string): Promise<PlanSemanalDetalle | Response> {
  const plan = await planAlAlcance(sesion, id);
  if (!plan) return noEncontrado('ese plan semanal');
  if (plan.estado !== 'vigente') return errorDePeticion('Solo se anula un plan aprobado que siga vigente.', 409);

  const rechazo = await rechazoPorAutor(sesion, plan);
  if (rechazo) return rechazo;

  const ahora = new Date();
  const [anulado] = await baseServidor()
    .update(planesSemanales)
    .set({
      estado: 'anulado',
      anuladoEn: ahora,
      anuladoPor: sesion.id,
      motivoAnulacion: motivo.trim(),
      rigeHasta: rigeHastaAlAnular(fechaDeJornada(ahora.getTime())),
      version: sql`${planesSemanales.version} + 1`,
      actualizadoEn: ahora,
    })
    .where(and(eq(planesSemanales.id, plan.id), eq(planesSemanales.estado, 'vigente')))
    .returning();
  // Otra persona lo anuló entre la lectura y la escritura.
  if (!anulado) return errorDePeticion('Este plan ya no está vigente. Vuelva a abrirlo.', 409);
  return detalleDelPlan(sesion, anulado);
}
