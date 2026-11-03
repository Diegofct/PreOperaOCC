import { solicitudDePagoCorregida } from '@/features/panel/contratos';
import { requerirPermiso, requerirSesion } from '@/features/servidor/guardia';
import { cuerpoJson, errorDePeticion, noEncontrado, ok, responder } from '@/features/servidor/respuestas';
import {
  corregirSolicitudDePago,
  solicitudDePagoAlAlcance,
  solicitudDePagoDe,
} from '@/features/tesoreria/servidor/solicitudes-pago';
import { alcanza, motivoDeRechazo } from '@/shared/rules/permisos';

/**
 * Una solicitud de pago (spec 037, RF-9, RF-20, RF-27, RF-28, RF-5a).
 * `GET /api/panel/solicitudes-pago/:id` la da con su historia y sus pagos a quien la
 * alcanza: Tesorería de Elemental, todas; los demás, las de su lugar. `PUT` la corrige con su
 * `version`: solo quien la pidió, mientras está enviada o devuelta.
 */
export async function GET(peticion: Request, { id }: { id: string }) {
  return responder(async () => {
    const sesion = await requerirSesion(peticion);
    if (sesion instanceof Response) return sesion;
    if (!alcanza(sesion.rol, 'tesoreria', 'ver') && !alcanza(sesion.rol, 'solicitudes', 'ver')) {
      return errorDePeticion(motivoDeRechazo('solicitudes', 'ver'), 403);
    }

    const fila = await solicitudDePagoAlAlcance(sesion, id);
    return fila ? ok(await solicitudDePagoDe(sesion, fila)) : noEncontrado('esa solicitud');
  });
}

export async function PUT(peticion: Request, { id }: { id: string }) {
  return responder(async () => {
    const sesion = await requerirPermiso(peticion, 'solicitudes', 'escribir');
    if (sesion instanceof Response) return sesion;

    const pedido = await cuerpoJson(peticion, solicitudDePagoCorregida);
    const resultado = await corregirSolicitudDePago(sesion, id, pedido);
    return resultado instanceof Response ? resultado : ok(resultado);
  });
}
