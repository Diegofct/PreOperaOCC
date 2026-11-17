import { requisicionPedida } from '@/features/panel/requisiciones';
import { crearRequisicion, lugarDeRequisiciones, requisicionesDelLugar } from '@/features/requisiciones/servidor/requisiciones';
import { requerirPermiso } from '@/features/servidor/guardia';
import { cuerpoJson, ok, responder } from '@/features/servidor/respuestas';

/**
 * Las requisiciones de una obra o de GeoLab (spec 046, RF-1 a RF-17, RF-45, RF-49 a RF-52).
 *
 * `GET /api/panel/requisiciones?obraId=` o `?empresa=geolab` las lista —RQ, SC y SP juntas, las
 * que esperan mi aprobación arriba— después de reacomodar la obra (RF-71). `POST` pide una de
 * compra o de pago en ese lugar y responde su número RQ y su paso. Pide quien escribe solicitudes:
 * la Administradora las ve y no pide (RF-8). Un lugar al que no se entra, 403 o 404 (RF-69).
 */
export async function GET(peticion: Request) {
  return responder(async () => {
    const sesion = await requerirPermiso(peticion, 'solicitudes', 'listar');
    if (sesion instanceof Response) return sesion;

    const lugar = await lugarDeRequisiciones(sesion, lugarDeLaPeticion(peticion));
    if (lugar instanceof Response) return lugar;

    return ok(await requisicionesDelLugar(sesion, lugar));
  });
}

export async function POST(peticion: Request) {
  return responder(async () => {
    const sesion = await requerirPermiso(peticion, 'solicitudes', 'escribir');
    if (sesion instanceof Response) return sesion;

    const lugar = await lugarDeRequisiciones(sesion, lugarDeLaPeticion(peticion));
    if (lugar instanceof Response) return lugar;

    const pedido = await cuerpoJson(peticion, requisicionPedida);
    const resultado = await crearRequisicion(sesion, lugar, pedido);
    return resultado instanceof Response ? resultado : ok(resultado, 201);
  });
}

function lugarDeLaPeticion(peticion: Request) {
  const parametros = new URL(peticion.url).searchParams;
  return { empresa: parametros.get('empresa'), obraId: parametros.get('obraId') };
}
