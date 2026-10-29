import { retiroDeLaPersona } from '@/features/panel/contratos';
import { retirar } from '@/features/rrhh/servidor/fichas';
import { requerirPermiso } from '@/features/servidor/guardia';
import { cuerpoJson, ok, responder } from '@/features/servidor/respuestas';

/**
 * Retirar a una persona (spec 035, RF-19 a RF-22). `POST /api/panel/rrhh/fichas/:id/retirar`
 * con `{ version, fecha, motivo }`. Solo gerencia y la auxiliar (RF-6). Sin sus documentos
 * de retiro, 422 con los que faltan; retirada, pierde el acceso al panel y al celular.
 */
export async function POST(peticion: Request, { id }: { id: string }) {
  return responder(async () => {
    const sesion = await requerirPermiso(peticion, 'rrhh', 'escribir');
    if (sesion instanceof Response) return sesion;

    const pedido = await cuerpoJson(peticion, retiroDeLaPersona);
    const resultado = await retirar(sesion, id, pedido);
    return resultado instanceof Response ? resultado : ok(resultado);
  });
}
