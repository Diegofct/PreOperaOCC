/**
 * La puerta del almacén de archivos. **El único módulo que sabe que hay R2.**
 *
 * Todo lo demás —el endpoint que recibe del celular, el que sirve al panel—
 * habla con `guardar` y `leer` y no tiene ni idea de dónde acaban los bytes. Es
 * deliberado: el almacén se eligió entre tres opciones (R2, el disco del VPS de
 * Hostinger, otro proveedor S3) y la decisión podría revisarse. Con esta puerta,
 * cambiarla es reescribir este archivo; sin ella, sería buscar llamadas
 * repartidas por media docena de rutas.
 *
 * ── Por qué R2 y no el disco del servidor ──
 *
 * Las firmas y las fotos **son la evidencia**: la firma del operador es lo que
 * prueba que revisó la máquina antes de arrancarla. El resto del proyecto
 * protege esa evidencia con obsesión —nada se borra, las bajas son lógicas, un
 * preoperacional firmado se anula pero jamás se sobrescribe—, y guardarla en el
 * mismo disco de la aplicación habría sido el eslabón flojo: los respaldos del
 * VPS son semanales, restauran la máquina entera y no permiten recuperar un
 * archivo suelto. En R2 la evidencia sobrevive a que el servidor muera, se
 * reinstale o se mude.
 *
 * ── El bucket es privado, y no se negocia ──
 *
 * Aquí no hay URL pública ni enlace firmado que se le pase al navegador. Son
 * documentos con la firma de una persona: al panel se los sirve
 * `/api/panel/media/[id]`, detrás de la sesión y del filtro por obra. Un bucket
 * público dejaría el acta de cualquier operador a un id de distancia.
 */
import { ErrorDeConfiguracion } from '@/features/servidor/configuracion';

import { firmarPeticion, type CredencialesS3 } from './firma-s3';

/** R2 ignora la región, pero SigV4 la exige dentro del cálculo. */
const REGION = 'auto';
const SERVICIO = 's3';

interface ConfiguracionAlmacen {
  credenciales: CredencialesS3;
  base: string;
}

/**
 * Lee la configuración **dentro de la llamada**, nunca al importar el módulo.
 *
 * Si se leyera arriba, importar este archivo desde cualquier sitio bastaría para
 * reventar el arranque cuando falta una variable — y, peor, ataría el valor al
 * momento del import. Es la misma razón por la que el resto del servidor lo hace
 * así.
 */
function configuracion(): ConfiguracionAlmacen {
  const cuenta = process.env.R2_CUENTA_ID;
  const bucket = process.env.R2_BUCKET;
  const llaveId = process.env.R2_LLAVE_ID;
  const llaveSecreta = process.env.R2_LLAVE_SECRETA;

  const faltantes = [
    ['R2_CUENTA_ID', cuenta],
    ['R2_BUCKET', bucket],
    ['R2_LLAVE_ID', llaveId],
    ['R2_LLAVE_SECRETA', llaveSecreta],
  ]
    .filter(([, valor]) => !valor)
    .map(([nombre]) => nombre);

  if (faltantes.length > 0 || !cuenta || !bucket || !llaveId || !llaveSecreta) {
    throw new ErrorDeConfiguracion(
      `Falta configurar el almacén de imágenes en .env: ${faltantes.join(', ')}. ` +
        'Las llaves salen del panel de Cloudflare, en R2 > Manage API tokens.',
    );
  }

  return {
    credenciales: { llaveId, llaveSecreta, region: REGION, servicio: SERVICIO },
    base: `https://${cuenta}.r2.cloudflarestorage.com/${bucket}`,
  };
}

/**
 * Dónde vive un archivo dentro del bucket.
 *
 * La clave lleva el dueño delante para que el bucket **se pueda auditar a ojo**:
 * abrirlo y ver `preoperacional/<id>/` agrupado dice de un vistazo qué evidencia
 * hay de qué registro. Un bucket plano de UUIDs no se puede revisar sin cruzar
 * con la base.
 */
export function claveDeObjeto(duenoTipo: string, duenoId: string, mediaId: string, mime: string) {
  return `${duenoTipo}/${duenoId}/${mediaId}.${extensionDe(mime)}`;
}

function extensionDe(mime: string): string {
  return mime === 'image/png' ? 'png' : 'jpg';
}

/**
 * Sube un archivo. Sobrescribe si la clave ya existe.
 *
 * Que sobrescriba no contradice el "nada se borra": la clave se deriva del id
 * de la imagen, que nace en el teléfono y no se reutiliza jamás. Reescribir la
 * misma clave solo puede pasar en un reintento del **mismo** archivo, y ahí
 * repetir es exactamente lo correcto.
 */
export async function guardar(
  clave: string,
  contenido: Uint8Array<ArrayBuffer>,
  mime: string,
): Promise<void> {
  const { base, credenciales } = configuracion();
  const url = `${base}/${clave}`;

  const cabeceras = await firmarPeticion(
    {
      metodo: 'PUT',
      url,
      cabeceras: { 'content-type': mime, 'content-length': String(contenido.byteLength) },
      cuerpo: contenido,
    },
    credenciales,
  );

  const respuesta = await fetch(url, { method: 'PUT', headers: cabeceras, body: contenido });

  if (!respuesta.ok) {
    // El cuerpo de un error de S3 es XML con la causa concreta (firma mal,
    // bucket inexistente, llave sin permiso). Va al log del servidor y no a la
    // respuesta: describe la configuración de la cuenta.
    console.error('[almacen] R2 rechazó la subida:', respuesta.status, await respuesta.text());
    throw new Error(`El almacén respondió ${respuesta.status} al guardar ${clave}.`);
  }
}

export interface ArchivoLeido {
  // `Uint8Array<ArrayBuffer>` y no `Uint8Array` a secas: TypeScript 6 solo acepta
  // como cuerpo de `fetch` una vista sobre un buffer no compartido.
  contenido: Uint8Array<ArrayBuffer>;
  mime: string;
}

/** Baja un archivo. `null` si no está —no es un error: puede no haber subido aún. */
export async function leer(clave: string): Promise<ArchivoLeido | null> {
  const { base, credenciales } = configuracion();
  const url = `${base}/${clave}`;

  const cabeceras = await firmarPeticion({ metodo: 'GET', url }, credenciales);
  const respuesta = await fetch(url, { method: 'GET', headers: cabeceras });

  if (respuesta.status === 404) return null;

  if (!respuesta.ok) {
    console.error('[almacen] R2 rechazó la lectura:', respuesta.status, await respuesta.text());
    throw new Error(`El almacén respondió ${respuesta.status} al leer ${clave}.`);
  }

  return {
    contenido: new Uint8Array(await respuesta.arrayBuffer()),
    mime: respuesta.headers.get('content-type') ?? 'application/octet-stream',
  };
}
