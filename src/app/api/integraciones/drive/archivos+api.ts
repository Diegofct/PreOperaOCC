import { guardarVersion } from '@/features/drive/servidor/subida';
import { subidaAlDrive } from '@/features/panel/contratos';
import { requerirIntegracion } from '@/features/servidor/guardia-integracion';
import { errorDePeticion, errorDeValidacion, noEncontrado, ok, responder } from '@/features/servidor/respuestas';
import { pasaDelTopeDeLectura } from '@/shared/rules/drive';

/**
 * La copia de una versión. `PUT /api/integraciones/drive/archivos?carpeta=&archivo=&modificado=`
 * (spec 052, RF-1, RF-4, RF-5, RF-17, RF-18, RF-40).
 *
 * n8n la llama una vez por cada versión que el inventario le pidió, con los bytes en el cuerpo
 * y su `content-type`. Abre con **el token del Drive** (RF-2, RF-3).
 *
 * Responde:
 *  · 201 `{ estado: 'guardado', versionId }` — la copia quedó en el almacén privado y la versión
 *    en «pendiente», esperando al pulso que la lee;
 *  · 200 `{ estado: 'ya_estaba', versionId }` — esa versión ya estaba: un reintento no sube nada
 *    (RF-4). Es un éxito, para que n8n no reintente para siempre;
 *  · 404 si el archivo no vino en ningún inventario;
 *  · 413 si pasa de 50 MB, **sin guardar nada** (D12). n8n no debería mandarlo, porque el
 *    inventario no lo pide; si llega, se mira primero la cabecera para no leer 2 GB en memoria.
 */
export async function PUT(peticion: Request) {
  return responder(async () => {
    const rechazo = await requerirIntegracion(peticion, 'TOKEN_INTEGRACION_DRIVE');
    if (rechazo) return rechazo;

    const consulta = subidaAlDrive.safeParse(Object.fromEntries(new URL(peticion.url).searchParams));
    if (!consulta.success) return errorDeValidacion(consulta.error);

    const demasiadoGrande = errorDePeticion('El archivo pasa de 50 MB: no se copia, se abre en el Drive.', 413);
    const declarado = peticion.headers.get('content-length');
    if (pasaDelTopeDeLectura(declarado === null ? null : Number(declarado))) return demasiadoGrande;

    const contenido = new Uint8Array(await peticion.arrayBuffer());
    if (pasaDelTopeDeLectura(contenido.byteLength)) return demasiadoGrande;
    if (contenido.byteLength === 0) return errorDePeticion('El archivo llegó vacío.', 400);

    const resultado = await guardarVersion(consulta.data, contenido, peticion.headers.get('content-type'));
    if (resultado.estado === 'sin_archivo') return noEncontrado('ese archivo del Drive');
    return ok(resultado, resultado.estado === 'guardado' ? 201 : 200);
  });
}
