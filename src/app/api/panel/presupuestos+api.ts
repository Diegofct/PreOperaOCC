import { obraDelContrato } from '@/features/contratos/servidor/contrato';
import { presupuestoNuevo } from '@/features/panel/contratos';
import { crearEnBlanco, listarPresupuestos } from '@/features/presupuestos/servidor/presupuestos';
import { requerirPermiso } from '@/features/servidor/guardia';
import { cuerpoJson, ok, responder } from '@/features/servidor/respuestas';

/**
 * Los presupuestos de una obra (spec 031, RF-31). `GET /api/panel/presupuestos?obraId=`
 * los lista sin la estructura, de la versión más nueva a la más vieja. La gerencia elige
 * la obra; el residente, la suya.
 */
export async function GET(peticion: Request) {
  return responder(async () => {
    const sesion = await requerirPermiso(peticion, 'contrato', 'listar');
    if (sesion instanceof Response) return sesion;

    const obraId = await obraDelContrato(sesion, new URL(peticion.url).searchParams.get('obraId'));
    if (obraId instanceof Response) return obraId;
    return ok(await listarPresupuestos(obraId));
  });
}

/**
 * Crear un presupuesto en blanco. `POST /api/panel/presupuestos` con `{ obraId, nombre }`
 * (RF-48). 409 si la obra ya tiene un borrador (RF-57).
 */
export async function POST(peticion: Request) {
  return responder(async () => {
    const sesion = await requerirPermiso(peticion, 'contrato', 'escribir');
    if (sesion instanceof Response) return sesion;

    const pedido = await cuerpoJson(peticion, presupuestoNuevo);
    const obraId = await obraDelContrato(sesion, pedido.obraId);
    if (obraId instanceof Response) return obraId;

    const resultado = await crearEnBlanco(sesion, obraId, pedido.nombre);
    return resultado instanceof Response ? resultado : ok(resultado, 201);
  });
}
