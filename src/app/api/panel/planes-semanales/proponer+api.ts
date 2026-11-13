import { obraDelContrato } from '@/features/contratos/servidor/contrato';
import { pedidoDeLecturaDePlan } from '@/features/panel/plan-semanal';
import { iniciarPropuesta } from '@/features/plan-semanal/servidor/lecturas';
import { requerirPermiso } from '@/features/servidor/guardia';
import { ok, responder } from '@/features/servidor/respuestas';

/**
 * Proponer con IA el plan de una semana (spec 044, RF-5, RF-34 a RF-41, RF-52, RF-96, RF-101, RF-105).
 *
 * `POST /api/panel/planes-semanales/proponer?obraId=&semana=&sustituir=true`, sin cuerpo. `semana` es
 * el lunes. Responde 202 con `{ lecturaId }`: la propuesta sigue por detrás, porque el proxy corta a
 * los 120 s, y se consulta en `lecturas/:id`.
 *
 * 400 si la semana no se puede planear; 409 si la obra no tiene planificación vigente, si ya hay una
 * propuesta o lectura en curso de esa semana, o si hay borrador y no vino `sustituir=true` (con
 * `borrador`). Una obra fuera del alcance, 404.
 */
export async function POST(peticion: Request) {
  return responder(async () => {
    const sesion = await requerirPermiso(peticion, 'plan_semanal', 'escribir');
    if (sesion instanceof Response) return sesion;

    const pedido = pedidoDeLecturaDePlan.parse(Object.fromEntries(new URL(peticion.url).searchParams));
    const obraId = await obraDelContrato(sesion, pedido.obraId);
    if (obraId instanceof Response) return obraId;

    const iniciada = await iniciarPropuesta(sesion, { ...pedido, obraId });
    return iniciada instanceof Response ? iniciada : ok(iniciada, 202);
  });
}
