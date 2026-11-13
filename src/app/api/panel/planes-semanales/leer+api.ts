import { obraDelContrato } from '@/features/contratos/servidor/contrato';
import { pedidoDeLecturaDePlan } from '@/features/panel/plan-semanal';
import { iniciarLecturaDeExcel } from '@/features/plan-semanal/servidor/lecturas';
import { requerirPermiso } from '@/features/servidor/guardia';
import { ok, responder } from '@/features/servidor/respuestas';

/**
 * Leer el Excel de un plan semanal (spec 044, RF-5, RF-42 a RF-49, RF-52, RF-92, RF-101).
 *
 * `POST /api/panel/planes-semanales/leer?obraId=&semana=&sustituir=true` con los bytes del .xlsx en
 * el cuerpo. `semana` es el lunes de la semana a la que corresponde el archivo, que escoge la persona.
 * Responde 202 con `{ lecturaId }`: la lectura sigue por detrás y se consulta en `lecturas/:id`.
 *
 * 400 si la semana no se puede planear; 409 si la obra no tiene planificación vigente, si ya hay una
 * propuesta o lectura en curso de esa semana, o si hay borrador y no vino `sustituir=true`; 413 si
 * pesa más de 20 MB; 422 si el contenido no es `.xlsx` o no tiene nada a la vista.
 */
export async function POST(peticion: Request) {
  return responder(async () => {
    const sesion = await requerirPermiso(peticion, 'plan_semanal', 'escribir');
    if (sesion instanceof Response) return sesion;

    const pedido = pedidoDeLecturaDePlan.parse(Object.fromEntries(new URL(peticion.url).searchParams));
    const obraId = await obraDelContrato(sesion, pedido.obraId);
    if (obraId instanceof Response) return obraId;

    const iniciada = await iniciarLecturaDeExcel(sesion, { ...pedido, obraId }, new Uint8Array(await peticion.arrayBuffer()));
    return iniciada instanceof Response ? iniciada : ok(iniciada, 202);
  });
}
