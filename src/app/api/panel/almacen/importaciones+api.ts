/**
 * Importar un documento al Almacén (spec 042, RF-1 a RF-9, RF-56, RF-59 a RF-64, RF-94).
 *
 * `POST /api/panel/almacen/importaciones?obraId=…` con los bytes del archivo en el cuerpo, su tipo en
 * `Content-Type` y su nombre en `X-Nombre-Archivo` (codificado con `encodeURIComponent`, porque una
 * cabecera solo admite ASCII y los nombres traen tildes). Responde 202 con el id de la importación y
 * la lectura sigue por detrás. 403 a quien no importa (Residente y demás, RF-2); 404 si la obra no
 * está al alcance o no tiene el Almacén activo (RF-56, RF-63); 413 y 422 con el motivo si el archivo
 * no sirve (RF-3 a RF-6, RF-59 a RF-61).
 *
 * `GET /api/panel/almacen/importaciones?obraId=…` lista las importaciones abiertas de quien pregunta en
 * esa obra —leyéndose, listas o fallidas—, la más nueva primero, y antes vence las que se pasaron de
 * tiempo (RF-65, RF-66, RF-98). Se pide al abrir el Almacén; lo que la pantalla consulta seguido
 * mientras se lee es el detalle (`[id]`), que no arrastra la IA ni los lectores de archivos.
 */
import { pendientesDe } from '@/features/almacen-obra/servidor/estado-de-importacion';
import { iniciarImportacion } from '@/features/almacen-obra/servidor/importaciones';
import { obraDelContrato } from '@/features/contratos/servidor/contrato';
import { subidaDeImportacion } from '@/features/panel/almacen-importacion';
import { requerirPermiso } from '@/features/servidor/guardia';
import { ok, responder } from '@/features/servidor/respuestas';

/** El nombre del archivo, de su cabecera; si llega mal codificado, tal cual. */
function nombreDelArchivo(peticion: Request): string {
  const crudo = peticion.headers.get('x-nombre-archivo')?.trim() || 'documento';
  try {
    return decodeURIComponent(crudo);
  } catch {
    return crudo;
  }
}

export async function GET(peticion: Request) {
  return responder(async () => {
    const sesion = await requerirPermiso(peticion, 'almacen', 'importar');
    if (sesion instanceof Response) return sesion;

    const { obraId: pedida } = subidaDeImportacion.parse(Object.fromEntries(new URL(peticion.url).searchParams));
    const obraId = await obraDelContrato(sesion, pedida);
    if (obraId instanceof Response) return obraId;

    return ok(await pendientesDe(sesion, obraId));
  });
}

export async function POST(peticion: Request) {
  return responder(async () => {
    const sesion = await requerirPermiso(peticion, 'almacen', 'importar');
    if (sesion instanceof Response) return sesion;

    const { obraId: pedida } = subidaDeImportacion.parse(Object.fromEntries(new URL(peticion.url).searchParams));
    const obraId = await obraDelContrato(sesion, pedida);
    if (obraId instanceof Response) return obraId;

    const iniciada = await iniciarImportacion(sesion, obraId, {
      nombre: nombreDelArchivo(peticion),
      tipo: peticion.headers.get('content-type') ?? '',
      contenido: new Uint8Array(await peticion.arrayBuffer()),
    });
    return iniciada instanceof Response ? iniciada : ok(iniciada, 202);
  });
}
