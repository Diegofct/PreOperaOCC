import { eq } from 'drizzle-orm';

import { baseServidor } from '@/db/servidor/cliente';
import { bitacoras, media, partesDeObra, preoperacionales } from '@/db/servidor/esquema';
import { leer } from '@/features/media/servidor/almacen';
import { alcanzaLaImagen, veTodasLasObras } from '@/features/servidor/alcance';
import { requerirSesion, type PersonaEnSesion } from '@/features/servidor/guardia';
import { noEncontrado, responder } from '@/features/servidor/respuestas';
import { obraDeUnMensaje } from '@/features/whatsapp/servidor/obra';
import { alcanza } from '@/shared/rules/permisos';

/**
 * Sirve una imagen al panel. `GET /api/panel/media/:id`.
 *
 * **Los bytes pasan por aquí y no por una URL del bucket.** Es la decisión
 * importante de este archivo: el bucket de R2 es privado y no se expone jamás,
 * ni siquiera con un enlace temporal. Son actas con la firma de una persona y
 * fotos del estado de la maquinaria; con un bucket público, adivinar un id
 * bastaría para leer la evidencia de cualquier obra.
 *
 * Pasando por el servidor, cada imagen atraviesa las dos puertas que ya protegen
 * al resto del panel: la sesión y el filtro por obra. Un residente no puede ver
 * la evidencia de una obra que no es la suya, igual que no puede ver sus
 * preoperacionales.
 */
export async function GET(peticion: Request, { id }: { id: string }) {
  return responder(async () => {
    // Guardia genérica a propósito: una imagen puede colgar de un
    // preoperacional o de una bitácora, así que el módulo no se sabe hasta
    // haber leído la fila. El control real es el alcance por obra de más
    // abajo, que sí mira de quién es la imagen.
    const sesion = await requerirSesion(peticion);
    if (sesion instanceof Response) return sesion;

    const db = baseServidor();

    const [fila] = await db
      .select({
        duenoTipo: media.duenoTipo,
        duenoId: media.duenoId,
        claveR2: media.claveR2,
        mime: media.mime,
      })
      .from(media)
      .where(eq(media.id, id))
      .limit(1);

    // Sin `claveR2` la fila existe pero el archivo todavía no ha subido: el
    // teléfono lo tiene en la cola esperando una WiFi. No es un error.
    if (!fila?.claveR2) return noEncontrado('esa imagen');

    // "No existe" y no "no puede", igual que en el resto del panel: confirmar
    // que el id es real ya le diría a un residente qué se registra en las obras
    // que no le tocan.
    if (fila.duenoTipo === 'whatsapp') {
      if (!(await alcanzaElMensaje(sesion, fila.duenoId))) return noEncontrado('esa imagen');
    } else if (!alcanzaLaImagen(sesion, await duenoDeLaImagen(fila.duenoTipo, fila.duenoId))) {
      return noEncontrado('esa imagen');
    }

    const archivo = await leer(fila.claveR2);
    if (!archivo) return noEncontrado('esa imagen');

    return new Response(archivo.contenido, {
      headers: {
        'Content-Type': archivo.mime || fila.mime,
        'Content-Length': String(archivo.contenido.byteLength),
        // La imagen no cambia nunca: su clave sale de un id que no se reutiliza.
        // `private` importa tanto como el tiempo — sin él, un proxy compartido
        // podría guardar el acta de un operador y servírsela a otro.
        'Cache-Control': 'private, max-age=86400',
      },
    });
  });
}

/**
 * El registro al que cuelga la imagen —si existe— y su obra, para filtrar por alcance.
 *
 * `existe` importa tanto como la obra: un dueño que no aparece no es «de todos»
 * (`alcanzaLaImagen`). Las fotos del día del **parte diario** (spec 004) cuelgan de
 * `partes_de_obra` con tipo `bitacora`; antes de la spec 004 colgaban de `bitacoras`,
 * así que se busca en las dos, primero en la nueva. Buscar solo en la vieja era el
 * defecto corregido el 2026-10-06.
 */
async function duenoDeLaImagen(
  tipo: 'preoperacional' | 'bitacora' | 'documento',
  duenoId: string,
): Promise<{ existe: boolean; obraId: string | null }> {
  const db = baseServidor();

  if (tipo === 'preoperacional') {
    const [fila] = await db
      .select({ obraId: preoperacionales.obraId })
      .from(preoperacionales)
      .where(eq(preoperacionales.id, duenoId))
      .limit(1);
    return { existe: Boolean(fila), obraId: fila?.obraId ?? null };
  }

  if (tipo === 'bitacora') {
    const [parte] = await db
      .select({ obraId: partesDeObra.obraId })
      .from(partesDeObra)
      .where(eq(partesDeObra.id, duenoId))
      .limit(1);
    if (parte) return { existe: true, obraId: parte.obraId };

    const [vieja] = await db
      .select({ obraId: bitacoras.obraId })
      .from(bitacoras)
      .where(eq(bitacoras.id, duenoId))
      .limit(1);
    return { existe: Boolean(vieja), obraId: vieja?.obraId ?? null };
  }

  // Los documentos todavía no tienen dueño con obra: solo los ve la gerencia.
  return { existe: false, obraId: null };
}

/**
 * ¿Puede ver los archivos de este mensaje de WhatsApp? (spec 021, RF-53.)
 *
 * Aparte de `obraDeLaImagen` porque aquí «sin obra» no puede significar «de
 * todos»: un grupo que la gerencia todavía no asoció no es de ninguna bandeja
 * (RF-11), y sus fotos son de la gerencia y de nadie más. Y hace falta además el
 * permiso de la bandeja: un almacenista de esa obra no ve lo que se habló en el
 * grupo.
 */
async function alcanzaElMensaje(sesion: PersonaEnSesion, mensajeId: string): Promise<boolean> {
  if (!alcanza(sesion.rol, 'whatsapp', 'ver')) return false;
  if (veTodasLasObras(sesion)) return true;

  // La misma regla que la bandeja (`whatsapp/servidor/obra.ts`): lo decidido, en
  // la obra donde se decidió; lo demás, en la de su grupo.
  const obraId = await obraDeUnMensaje(mensajeId);
  return Boolean(obraId && sesion.obraId && obraId === sesion.obraId);
}
