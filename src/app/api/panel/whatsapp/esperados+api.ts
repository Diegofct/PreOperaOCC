import { reportesEsperadosDeEmpresaPedido, reportesEsperadosPedido } from '@/features/panel/contratos';
import { requerirAdmin, requerirPermiso, requerirSesion } from '@/features/servidor/guardia';
import { cuerpoJson, ok, responder } from '@/features/servidor/respuestas';
import { guardarEsperadosDeEmpresa, leerEsperadosDeEmpresa } from '@/features/whatsapp/servidor/dias-empresa';
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
 *
 * Spec 038 (RF-16): con `?empresa=occ` (o `{ empresaId, esperados }` en el `PUT`), los de
 * la bitácora de la empresa. Los leen y los cambian gerencia y el Encargado de OCC, con el
 * permiso de la Bitácora de la empresa (`dias-empresa.ts`).
 */
export async function GET(peticion: Request) {
  return responder(async () => {
    const empresa = new URL(peticion.url).searchParams.get('empresa');
    if (empresa) {
      const deEmpresa = await requerirSesion(peticion);
      if (deEmpresa instanceof Response) return deEmpresa;
      const lista = await leerEsperadosDeEmpresa(deEmpresa, empresa);
      return lista instanceof Response ? lista : ok(lista);
    }

    const sesion = await requerirPermiso(peticion, 'whatsapp', 'listar');
    if (sesion instanceof Response) return sesion;

    const lista = await leerEsperados(sesion, new URL(peticion.url).searchParams.get('obraId'));
    return lista instanceof Response ? lista : ok(lista);
  });
}

export async function PUT(peticion: Request) {
  return responder(async () => {
    const cuerpo = (await peticion.clone().json().catch(() => null)) as { empresaId?: unknown } | null;
    if (cuerpo && typeof cuerpo === 'object' && 'empresaId' in cuerpo) {
      const deEmpresa = await requerirSesion(peticion);
      if (deEmpresa instanceof Response) return deEmpresa;
      const lista = await guardarEsperadosDeEmpresa(deEmpresa, await cuerpoJson(peticion, reportesEsperadosDeEmpresaPedido));
      return lista instanceof Response ? lista : ok(lista);
    }

    const sesion = await requerirAdmin(peticion);
    if (sesion instanceof Response) return sesion;

    const lista = await guardarEsperados(sesion, await cuerpoJson(peticion, reportesEsperadosPedido));
    return lista instanceof Response ? lista : ok(lista);
  });
}
