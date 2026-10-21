import { descarteDePresupuesto } from '@/features/panel/contratos';
import { descartarPresupuesto } from '@/features/presupuestos/servidor/presupuestos';
import { requerirPermiso } from '@/features/servidor/guardia';
import { cuerpoJson, ok, responder } from '@/features/servidor/respuestas';

/** Descartar un borrador, con motivo. `POST /api/panel/presupuestos/:id/descartar` (spec 031, RF-56). */
export async function POST(peticion: Request, { id }: { id: string }) {
  return responder(async () => {
    const sesion = await requerirPermiso(peticion, 'contrato', 'escribir');
    if (sesion instanceof Response) return sesion;

    const { motivo } = await cuerpoJson(peticion, descarteDePresupuesto);
    const resultado = await descartarPresupuesto(sesion, id, motivo);
    return resultado instanceof Response ? resultado : ok(resultado);
  });
}
