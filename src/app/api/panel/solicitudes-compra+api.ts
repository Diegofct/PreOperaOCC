import { crearSolicitud, lugarDeLaSolicitud, solicitudesDelLugar } from '@/features/compras/servidor/solicitudes';
import { solicitudPedida } from '@/features/panel/contratos';
import { requerirPermiso } from '@/features/servidor/guardia';
import { cuerpoJson, ok, responder } from '@/features/servidor/respuestas';

/**
 * Las solicitudes de compra de una obra, OCC o Geolab (spec 036, RF-1, RF-2, RF-7 a RF-10,
 * RF-24, RF-28, RF-29). `GET /api/panel/solicitudes-compra?obraId=` o `?empresa=occ` las
 * lista; `POST` pide una nueva en ese lugar y responde su número. El valor estimado, solo a
 * quien ve los valores (RF-31).
 */
export async function GET(peticion: Request) {
  return responder(async () => {
    const sesion = await requerirPermiso(peticion, 'solicitudes', 'listar');
    if (sesion instanceof Response) return sesion;

    const lugar = await lugarDeLaSolicitud(sesion, lugarDeLaPeticion(peticion));
    if (lugar instanceof Response) return lugar;

    return ok(await solicitudesDelLugar(sesion, lugar));
  });
}

export async function POST(peticion: Request) {
  return responder(async () => {
    const sesion = await requerirPermiso(peticion, 'solicitudes', 'escribir');
    if (sesion instanceof Response) return sesion;

    const lugar = await lugarDeLaSolicitud(sesion, lugarDeLaPeticion(peticion));
    if (lugar instanceof Response) return lugar;

    const pedido = await cuerpoJson(peticion, solicitudPedida);
    const resultado = await crearSolicitud(sesion, lugar, pedido);
    return resultado instanceof Response ? resultado : ok(resultado, 201);
  });
}

function lugarDeLaPeticion(peticion: Request) {
  const parametros = new URL(peticion.url).searchParams;
  return { empresa: parametros.get('empresa'), obraId: parametros.get('obraId') };
}
