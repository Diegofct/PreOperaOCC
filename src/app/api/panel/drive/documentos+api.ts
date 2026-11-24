import { obraDelContrato } from '@/features/contratos/servidor/contrato';
import { documentosDeLaCarpetaSinObra, documentosDeLaObra } from '@/features/drive/servidor/lista';
import { requerirPermiso } from '@/features/servidor/guardia';
import { errorDePeticion, ok, responder } from '@/features/servidor/respuestas';
import { alcanza } from '@/shared/rules/permisos';

/**
 * Los documentos del Drive de una obra. `GET /api/panel/drive/documentos?obraId=&buscar=`
 * (spec 052, RF-29 a RF-37).
 *
 * Con el permiso `drive` → `listar`. La obra la decide `obraDelContrato`: la gerencia y el
 * director de proyectos, la pedida; los demás, una de las suyas, y una ajena es un 404 (RF-37).
 * Responde la carpeta de la obra, con su última entrega (RF-34), y sus documentos; sin carpeta
 * conectada, `carpeta: null`.
 *
 * Con `?carpeta=` en vez de la obra, la lista de una carpeta **sin obra**: solo para quien la
 * puede asociar (`activar`, la gerencia), que es quien la ve mientras no tiene obra (RF-10).
 */
export async function GET(peticion: Request) {
  return responder(async () => {
    const sesion = await requerirPermiso(peticion, 'drive', 'listar');
    if (sesion instanceof Response) return sesion;

    const parametros = new URL(peticion.url).searchParams;
    const buscar = (parametros.get('buscar') ?? '').slice(0, 200);
    const carpeta = parametros.get('carpeta')?.trim();
    if (carpeta) {
      if (!alcanza(sesion.rol, 'drive', 'activar')) return errorDePeticion('Las carpetas sin obra solo las ve la gerencia.', 403);
      const lista = await documentosDeLaCarpetaSinObra(carpeta, buscar);
      return lista instanceof Response ? lista : ok(lista);
    }

    const obraId = await obraDelContrato(sesion, parametros.get('obraId'));
    if (obraId instanceof Response) return obraId;
    return ok(await documentosDeLaObra(obraId, buscar));
  });
}
