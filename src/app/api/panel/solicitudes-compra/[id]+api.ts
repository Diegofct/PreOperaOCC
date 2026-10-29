import { corregirSolicitud, solicitudAlAlcance, solicitudDe } from '@/features/compras/servidor/solicitudes';
import { solicitudCorregida } from '@/features/panel/contratos';
import { requerirPermiso, requerirSesion } from '@/features/servidor/guardia';
import { cuerpoJson, errorDePeticion, noEncontrado, ok, responder } from '@/features/servidor/respuestas';
import { alcanza, motivoDeRechazo } from '@/shared/rules/permisos';

/**
 * Una solicitud de compra (spec 036, RF-11, RF-23, RF-28, RF-29, RF-31).
 * `GET /api/panel/solicitudes-compra/:id` la da con su historia, compras y recibos a quien
 * la alcanza: Compras de Elemental, todas; los demás, las de su lugar. `PUT` la corrige con
 * su `version`: solo quien la pidió, mientras está enviada o devuelta.
 */
export async function GET(peticion: Request, { id }: { id: string }) {
  return responder(async () => {
    const sesion = await requerirSesion(peticion);
    if (sesion instanceof Response) return sesion;
    if (!alcanza(sesion.rol, 'compras', 'ver') && !alcanza(sesion.rol, 'solicitudes', 'ver')) {
      return errorDePeticion(motivoDeRechazo('solicitudes', 'ver'), 403);
    }

    const fila = await solicitudAlAlcance(sesion, id);
    return fila ? ok(await solicitudDe(sesion, fila)) : noEncontrado('esa solicitud');
  });
}

export async function PUT(peticion: Request, { id }: { id: string }) {
  return responder(async () => {
    const sesion = await requerirPermiso(peticion, 'solicitudes', 'escribir');
    if (sesion instanceof Response) return sesion;

    const pedido = await cuerpoJson(peticion, solicitudCorregida);
    const resultado = await corregirSolicitud(sesion, id, pedido);
    return resultado instanceof Response ? resultado : ok(resultado);
  });
}
