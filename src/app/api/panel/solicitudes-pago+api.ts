import { solicitudDePagoPedida } from '@/features/panel/contratos';
import { requerirPermiso } from '@/features/servidor/guardia';
import { cuerpoJson, ok, responder } from '@/features/servidor/respuestas';
import {
  crearSolicitudDePago,
  lugarDeLosPagos,
  solicitudesDePagoDelLugar,
} from '@/features/tesoreria/servidor/solicitudes-pago';

/**
 * Las solicitudes de pago de una obra, OCC o Geolab (spec 037, RF-1, RF-2, RF-6 a RF-8,
 * RF-21, RF-27, RF-28). `GET /api/panel/solicitudes-pago?obraId=` o `?empresa=occ` las lista;
 * `POST` pide un pago en ese lugar y responde su número. Los valores, solo a quien los ve
 * (RF-5a).
 */
export async function GET(peticion: Request) {
  return responder(async () => {
    const sesion = await requerirPermiso(peticion, 'solicitudes', 'listar');
    if (sesion instanceof Response) return sesion;

    const lugar = await lugarDeLosPagos(sesion, lugarDeLaPeticion(peticion));
    if (lugar instanceof Response) return lugar;

    return ok(await solicitudesDePagoDelLugar(sesion, lugar));
  });
}

export async function POST(peticion: Request) {
  return responder(async () => {
    const sesion = await requerirPermiso(peticion, 'solicitudes', 'escribir');
    if (sesion instanceof Response) return sesion;

    const lugar = await lugarDeLosPagos(sesion, lugarDeLaPeticion(peticion));
    if (lugar instanceof Response) return lugar;

    const pedido = await cuerpoJson(peticion, solicitudDePagoPedida);
    const resultado = await crearSolicitudDePago(sesion, lugar, pedido);
    return resultado instanceof Response ? resultado : ok(resultado, 201);
  });
}

function lugarDeLaPeticion(peticion: Request) {
  const parametros = new URL(peticion.url).searchParams;
  return { empresa: parametros.get('empresa'), obraId: parametros.get('obraId') };
}
