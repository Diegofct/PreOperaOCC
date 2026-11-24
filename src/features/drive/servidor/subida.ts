/**
 * La copia de una versión de un archivo del Drive (spec 052, RF-1, RF-4, RF-5, RF-17, RF-18).
 *
 * ── Primero lo que se sabe, después R2, al final las filas ──
 *
 * Antes de tocar el almacén se comprueba que el archivo vino en un inventario y que la
 * versión no está ya guardada: así un reintento de n8n no sube nada (RF-4). Luego va
 * **primero R2 y después la fila**, como en el resto del proyecto: un corte entre las dos
 * deja un objeto huérfano en el bucket, que no se ve en ninguna parte; al revés quedaría
 * una versión que apunta a una copia que no existe.
 *
 * Las filas van en dos sentencias: `media` y luego la versión, con `on conflict do nothing`
 * sobre (`archivo_id`, `modificado_en_drive`). Si dos subidas de la misma versión se cruzan,
 * la segunda no crea otra versión y responde `ya_estaba`; su fila de `media` queda sin
 * versión que la use, y no sale por ninguna parte, porque una copia del Drive se entrega
 * solo a través de su versión.
 *
 * El dueño de la copia es **la versión** (`dueno_id` = su id). Así una versión vieja
 * conserva su copia cuando llega otra (RF-18): nada se sobrescribe.
 *
 * Solo servidor.
 */
import { and, eq } from 'drizzle-orm';
import { uuidv7 } from 'uuidv7';

import { baseServidor } from '@/db/servidor/cliente';
import { driveArchivos, driveVersiones, media } from '@/db/servidor/esquema';
import { claveDeObjeto, guardar } from '@/features/media/servidor/almacen';
import type { subidaAlDrive } from '@/features/panel/contratos';
import { aHex } from '@/shared/cripto/formato-pbkdf2';

import type { z } from 'zod';

export type ResultadoDeSubida =
  | { estado: 'guardado'; versionId: string }
  | { estado: 'ya_estaba'; versionId: string }
  | { estado: 'sin_archivo' };

/** El tipo de la copia: el de la petición, o el del inventario si n8n no lo mandó. */
function tipoDeLaCopia(cabecera: string | null, delInventario: string): string {
  const base = cabecera?.split(';')[0].trim().toLowerCase();
  return base && base !== 'application/octet-stream' ? base : delInventario;
}

export async function guardarVersion(
  subida: z.output<typeof subidaAlDrive>,
  contenido: Uint8Array<ArrayBuffer>,
  tipoDeLaPeticion: string | null,
): Promise<ResultadoDeSubida> {
  const db = baseServidor();
  const modificado = new Date(subida.modificado);

  const [archivo] = await db
    .select({ id: driveArchivos.id, mime: driveArchivos.mime })
    .from(driveArchivos)
    .where(and(eq(driveArchivos.carpetaId, subida.carpeta), eq(driveArchivos.driveId, subida.archivo)))
    .limit(1);
  // Un archivo que nunca vino en un inventario no tiene de qué carpeta ni de qué obra ser.
  if (!archivo) return { estado: 'sin_archivo' };

  const versionDe = async () =>
    (
      await db
        .select({ id: driveVersiones.id })
        .from(driveVersiones)
        .where(and(eq(driveVersiones.archivoId, archivo.id), eq(driveVersiones.modificadoEnDrive, modificado)))
        .limit(1)
    )[0];

  const yaEstaba = await versionDe();
  if (yaEstaba) return { estado: 'ya_estaba', versionId: yaEstaba.id };

  const versionId = uuidv7();
  const mediaId = uuidv7();
  const tipo = tipoDeLaCopia(tipoDeLaPeticion, archivo.mime);
  const clave = claveDeObjeto('drive', versionId, mediaId, tipo);
  await guardar(clave, contenido, tipo);

  await db.insert(media).values({
    id: mediaId,
    duenoTipo: 'drive',
    duenoId: versionId,
    proposito: 'evidencia',
    mime: tipo,
    bytes: contenido.byteLength,
    sha256: aHex(new Uint8Array(await crypto.subtle.digest('SHA-256', contenido))),
    claveR2: clave,
    subidoEn: new Date(),
  });

  const insertadas = await db
    .insert(driveVersiones)
    .values({
      id: versionId,
      archivoId: archivo.id,
      modificadoEnDrive: modificado,
      mediaId,
      bytes: contenido.byteLength,
    })
    .onConflictDoNothing({ target: [driveVersiones.archivoId, driveVersiones.modificadoEnDrive] })
    .returning({ id: driveVersiones.id });
  if (insertadas.length > 0) return { estado: 'guardado', versionId };

  // Otra subida de la misma versión ganó por poco.
  const ganadora = await versionDe();
  return { estado: 'ya_estaba', versionId: ganadora?.id ?? versionId };
}
