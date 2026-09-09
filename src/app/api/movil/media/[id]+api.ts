import { eq } from 'drizzle-orm';
import { z } from 'zod';

import { baseServidor } from '@/db/servidor/cliente';
import { bitacoras, media, preoperacionales } from '@/db/servidor/esquema';
import { claveDeObjeto, guardar } from '@/features/media/servidor/almacen';
import { sha256Hex } from '@/features/media/servidor/firma-s3';
import { requerirEquipo } from '@/features/servidor/guardia-movil';
import { marcarProcesada, vehiculoAlcanzable, yaProcesada } from '@/features/servidor/ingesta';
import { errorDePeticion, ok, responder } from '@/features/servidor/respuestas';

/**
 * Recibe una imagen del celular. `POST /api/movil/media/:id`.
 *
 * Es la firma del operador o la foto de un hallazgo — lo último que le faltaba
 * al ciclo para estar completo. Hasta ahora se quedaban en el teléfono, y la
 * firma es justamente lo que prueba que alguien revisó la máquina.
 *
 * ── Por qué el cuerpo es binario y los datos van en cabeceras ──
 *
 * Es la única ruta del proyecto que no recibe JSON. Meter la foto en un campo
 * de texto obligaría a base64, que **infla un tercio** lo que hay que subir
 * desde una obra con media raya de señal; y `multipart` añadiría un formato que
 * parsear en los dos lados para transportar un solo archivo. Los bytes van
 * crudos y los metadatos en cabeceras.
 *
 * ── Lo que se comprueba, y por qué ──
 *
 *  1. **Que el dueño exista y sea alcanzable por este equipo.** Un token dice
 *     qué teléfono es, no legitima lo que manda: sin esto, un token copiado
 *     podría colgarle fotos a los registros de la flota entera.
 *  2. **Que los bytes sean los que el teléfono dice.** Se recalcula el SHA-256
 *     y se compara con el declarado. Una foto que llegó corrupta es peor que
 *     una que no llegó: la primera se da por buena y tapa el hueco.
 *  3. **Que no se pise una imagen ya subida.** La evidencia no se sobrescribe,
 *     igual que un preoperacional firmado.
 */

/** 8 MB. El celular sube ~250 KB; este tope es para lo que venga mal formado. */
const TAMANO_MAXIMO = 8 * 1024 * 1024;

const MIMES = ['image/jpeg', 'image/png'] as const;

const metadatos = z.object({
  duenoTipo: z.enum(['preoperacional', 'bitacora']),
  duenoId: z.string().trim().min(1).max(64),
  proposito: z.enum(['hallazgo', 'firma_operador', 'foto_horometro', 'evidencia']),
  itemKey: z.string().trim().max(80).nullable(),
  sha256: z
    .string()
    .trim()
    .regex(/^[0-9a-f]{64}$/, 'El SHA-256 declarado no tiene el formato esperado.'),
  mime: z.enum(MIMES),
  claveIdempotencia: z.string().trim().min(1).max(200),
});

export async function POST(peticion: Request, { id }: { id: string }) {
  return responder(async () => {
    const equipo = await requerirEquipo(peticion);
    if (equipo instanceof Response) return equipo;

    const cabecera = (nombre: string) => peticion.headers.get(nombre)?.trim() || null;

    const datos = metadatos.parse({
      duenoTipo: cabecera('x-media-dueno-tipo'),
      duenoId: cabecera('x-media-dueno-id'),
      proposito: cabecera('x-media-proposito'),
      itemKey: cabecera('x-media-item-key'),
      sha256: cabecera('x-media-sha256'),
      mime: cabecera('content-type'),
      claveIdempotencia: cabecera('x-idempotencia'),
    });

    const duplicado = await yaProcesada(datos.claveIdempotencia);
    if (duplicado) return ok({ duplicado: true, id: duplicado });

    const db = baseServidor();

    // Ya está arriba: se responde como duplicado en vez de volver a escribir.
    // Pasa cuando la red se cae después de guardar y antes de que el teléfono
    // se entere, y repetir la subida solo gastaría datos del operador.
    const [existente] = await db
      .select({ claveR2: media.claveR2 })
      .from(media)
      .where(eq(media.id, id))
      .limit(1);

    if (existente?.claveR2) {
      await marcarProcesada(datos.claveIdempotencia, 'media', id);
      return ok({ duplicado: true, id });
    }

    // El dueño tiene que existir **ya**: la cola del teléfono sube en orden de
    // dependencia, así que el preoperacional pasó por aquí antes que su foto.
    // Que no esté significa que fue rechazado definitivamente, y entonces esta
    // imagen tampoco tiene a qué pertenecer: 422 y que la cola siga.
    const vehiculoId = await duenoDeLaImagen(datos.duenoTipo, datos.duenoId);
    if (!vehiculoId) {
      return errorDePeticion(`No existe el ${datos.duenoTipo} al que pertenece esta imagen.`, 422);
    }

    if (!(await vehiculoAlcanzable(equipo, vehiculoId))) {
      return errorDePeticion('Este equipo no tiene acceso a esa máquina.', 403);
    }

    const contenido = new Uint8Array(await peticion.arrayBuffer());

    if (contenido.byteLength === 0) return errorDePeticion('La imagen llegó vacía.', 422);
    if (contenido.byteLength > TAMANO_MAXIMO) {
      return errorDePeticion('La imagen supera el tamaño máximo permitido.', 422);
    }

    const calculado = await sha256Hex(contenido);
    if (calculado !== datos.sha256) {
      return errorDePeticion('La imagen no coincide con su huella: llegó incompleta.', 422);
    }

    const clave = claveDeObjeto(datos.duenoTipo, datos.duenoId, id, datos.mime);
    await guardar(clave, contenido, datos.mime);

    // Después de R2, nunca antes. Si el corte ocurre entre las dos, la fila
    // queda sin `claveR2` y el reintento la resuelve; al revés quedaría una fila
    // apuntando a un archivo que no existe.
    await db
      .insert(media)
      .values({
        id,
        duenoTipo: datos.duenoTipo,
        duenoId: datos.duenoId,
        proposito: datos.proposito,
        itemKey: datos.itemKey,
        mime: datos.mime,
        bytes: contenido.byteLength,
        sha256: calculado,
        claveR2: clave,
        subidoEn: new Date(),
      })
      .onConflictDoUpdate({
        target: media.id,
        set: {
          claveR2: clave,
          sha256: calculado,
          bytes: contenido.byteLength,
          mime: datos.mime,
          subidoEn: new Date(),
        },
      });

    await marcarProcesada(datos.claveIdempotencia, 'media', id);

    return ok({ duplicado: false, id }, 201);
  });
}

/** El vehículo del registro al que cuelga la imagen, o `null` si no existe. */
async function duenoDeLaImagen(tipo: 'preoperacional' | 'bitacora', duenoId: string) {
  const db = baseServidor();

  if (tipo === 'preoperacional') {
    const [fila] = await db
      .select({ vehiculoId: preoperacionales.vehiculoId })
      .from(preoperacionales)
      .where(eq(preoperacionales.id, duenoId))
      .limit(1);
    return fila?.vehiculoId ?? null;
  }

  const [fila] = await db
    .select({ vehiculoId: bitacoras.vehiculoId })
    .from(bitacoras)
    .where(eq(bitacoras.id, duenoId))
    .limit(1);
  return fila?.vehiculoId ?? null;
}
