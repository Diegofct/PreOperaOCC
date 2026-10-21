import {
  guardarContrato,
  leerContrato,
  obraDelContrato,
} from '@/features/contratos/servidor/contrato';
import { contratoEditado } from '@/features/panel/contratos';
import { requerirPermiso } from '@/features/servidor/guardia';
import { cuerpoJson, ok, responder } from '@/features/servidor/respuestas';

/**
 * El contrato de una obra (spec 031). `GET /api/panel/contrato?obraId=` lo trae con lo
 * que se calcula de él: el plazo, la diferencia con el presupuesto vigente (RF-16), lo
 * que falta para aprobar (RF-17) y quién lo cambió (RF-6). La gerencia elige la obra;
 * el residente, la suya (RF-4).
 */
export async function GET(peticion: Request) {
  return responder(async () => {
    const sesion = await requerirPermiso(peticion, 'contrato', 'ver');
    if (sesion instanceof Response) return sesion;

    const obraId = await obraDelContrato(sesion, new URL(peticion.url).searchParams.get('obraId'));
    if (obraId instanceof Response) return obraId;
    return ok(await leerContrato(obraId));
  });
}

/**
 * Guardar el contrato. `PUT /api/panel/contrato` con el formulario entero y la versión
 * que se leyó (0 si todavía no hay). Responde la versión nueva; 409 si otra persona lo
 * cambió o si está aprobado (RF-18).
 */
export async function PUT(peticion: Request) {
  return responder(async () => {
    const sesion = await requerirPermiso(peticion, 'contrato', 'escribir');
    if (sesion instanceof Response) return sesion;

    const pedido = await cuerpoJson(peticion, contratoEditado);
    const obraId = await obraDelContrato(sesion, pedido.obraId);
    if (obraId instanceof Response) return obraId;

    const resultado = await guardarContrato(sesion, obraId, pedido);
    return resultado instanceof Response ? resultado : ok(resultado);
  });
}
