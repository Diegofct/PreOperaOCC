import { obraDelContrato } from '@/features/contratos/servidor/contrato';
import { catalogoDeLaObra } from '@/features/presupuestos/servidor/catalogo';
import { requerirPermiso } from '@/features/servidor/guardia';
import { ok, responder } from '@/features/servidor/respuestas';

/**
 * Las actividades que ofrece la bitácora de una obra (spec 031, RF-58, RF-59).
 * `GET /api/panel/presupuestos/catalogo?obraId=`: con presupuesto vigente, sus ítems con
 * capítulo y vía; sin él, la lista fija de siempre. Sin precios (RF-61).
 *
 * Con el permiso de la bitácora y no el del contrato: quien llena la bitácora necesita
 * la lista aunque no vea el módulo de contrato.
 */
export async function GET(peticion: Request) {
  return responder(async () => {
    const sesion = await requerirPermiso(peticion, 'bitacoras', 'ver');
    if (sesion instanceof Response) return sesion;

    const obraId = await obraDelContrato(sesion, new URL(peticion.url).searchParams.get('obraId'));
    if (obraId instanceof Response) return obraId;
    return ok(await catalogoDeLaObra(obraId));
  });
}
