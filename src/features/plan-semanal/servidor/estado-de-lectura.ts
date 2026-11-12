/**
 * En qué va una propuesta o una lectura de plan semanal (spec 044, RF-49, RF-101). **Solo servidor.**
 *
 * Va aparte de `lecturas.ts` a propósito. La pantalla consulta esto cada pocos segundos mientras la
 * IA trabaja, y `lecturas.ts` arrastra el lector de Excel y el cliente de la IA: más de mil módulos
 * para leer una fila. En producción da igual, pero el servidor de desarrollo de Expo vuelve a
 * evaluar la ruta en cada petición y con ese peso perdía unos 130 MB por consulta, hasta caerse sin
 * memoria a mitad de una lectura (medido el 2026-11-11). Este módulo solo toca la base.
 */
import { eq } from 'drizzle-orm';

import { baseServidor } from '@/db/servidor/cliente';
import { planSemanalLecturas } from '@/db/servidor/esquema';
import type { EstadoDeLecturaDePlanRespuesta } from '@/features/panel/plan-semanal';
import { alcanzaLaObra } from '@/features/servidor/alcance';
import type { PersonaEnSesion } from '@/features/servidor/guardia';

export const SE_PASO_DE_TIEMPO = 'Se pasó del tiempo y se dio por perdida. Vuelva a intentarlo.';

/** RF-49: en qué va una propuesta o lectura de una obra al alcance; `null` si no existe o no le toca. */
export async function estadoDeLecturaDePlan(sesion: PersonaEnSesion, lecturaId: string): Promise<EstadoDeLecturaDePlanRespuesta | null> {
  const [fila] = await baseServidor().select().from(planSemanalLecturas).where(eq(planSemanalLecturas.id, lecturaId)).limit(1);
  if (!fila || !alcanzaLaObra(sesion, fila.obraId)) return null;
  // Una que murió se ve como lo que es aunque nadie la haya vencido todavía: la vence la siguiente
  // petición de esa semana, y consultar no escribe.
  if (fila.estado === 'en_curso' && fila.venceEn.getTime() < Date.now()) {
    return { estado: 'fallida', planId: null, error: SE_PASO_DE_TIEMPO };
  }
  return { estado: fila.estado, planId: fila.estado === 'lista' ? fila.planId : null, error: fila.error };
}
