import { reportesEsperadosPedido } from '@/features/panel/contratos';
import { requerirAdmin, requerirPermiso } from '@/features/servidor/guardia';
import { cuerpoJson, ok, responder } from '@/features/servidor/respuestas';
import { guardarEsperados, leerEsperados } from '@/features/whatsapp/servidor/estado-dias';

/**
 * Los reportes que la bitácora de cada día de una obra espera (spec 024, RF-37 a
 * RF-42).
 *
 * `GET /api/panel/whatsapp/esperados?obraId=`: la lista, y quiénes escriben en los
 * grupos de la obra para elegir el autor. La ven el residente (la suya) y la gerencia.
 *
 * `PUT /api/panel/whatsapp/esperados` con `{ obraId, esperados }`: la lista entera, que
 * reemplaza a la anterior. Solo la gerencia (RF-42).
 */
export async function GET(peticion: Request) {
  return responder(async () => {
    const sesion = await requerirPermiso(peticion, 'whatsapp', 'listar');
    if (sesion instanceof Response) return sesion;

    const lista = await leerEsperados(sesion, new URL(peticion.url).searchParams.get('obraId'));
    return lista instanceof Response ? lista : ok(lista);
  });
}

export async function PUT(peticion: Request) {
  return responder(async () => {
    const sesion = await requerirAdmin(peticion);
    if (sesion instanceof Response) return sesion;

    const lista = await guardarEsperados(sesion, await cuerpoJson(peticion, reportesEsperadosPedido));
    return lista instanceof Response ? lista : ok(lista);
  });
}
