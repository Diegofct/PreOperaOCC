import { presupuestoEditado } from '@/features/panel/contratos';
import {
  detalleDe,
  guardarPresupuesto,
  presupuestoAlAlcance,
} from '@/features/presupuestos/servidor/presupuestos';
import { requerirPermiso } from '@/features/servidor/guardia';
import { cuerpoJson, noEncontrado, ok, responder } from '@/features/servidor/respuestas';

/**
 * Un presupuesto con su estructura, su resumen y lo que falta para aprobarlo.
 * `GET /api/panel/presupuestos/:id` (spec 031, RF-40, RF-50, RF-55). Cualquier versión,
 * también las reemplazadas, en solo lectura.
 */
export async function GET(peticion: Request, { id }: { id: string }) {
  return responder(async () => {
    const sesion = await requerirPermiso(peticion, 'contrato', 'ver');
    if (sesion instanceof Response) return sesion;

    const fila = await presupuestoAlAlcance(sesion, id);
    return fila ? ok(detalleDe(fila)) : noEncontrado('ese presupuesto');
  });
}

/**
 * Guardar un borrador. `PUT /api/panel/presupuestos/:id` con `{ version, nombre,
 * notaVersion, estructura }` (RF-47). Los totales los recalcula el servidor. Responde el
 * presupuesto guardado con su versión nueva; 409 si no es borrador o la versión cambió.
 */
export async function PUT(peticion: Request, { id }: { id: string }) {
  return responder(async () => {
    const sesion = await requerirPermiso(peticion, 'contrato', 'escribir');
    if (sesion instanceof Response) return sesion;

    const pedido = await cuerpoJson(peticion, presupuestoEditado);
    const resultado = await guardarPresupuesto(sesion, id, pedido);
    return resultado instanceof Response ? resultado : ok(resultado);
  });
}
