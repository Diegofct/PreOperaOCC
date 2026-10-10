/**
 * De qué obra es un mensaje de WhatsApp, dicho en un solo sitio (spec 021, RF-11,
 * RF-13, RF-14, RF-53).
 *
 * La obra en la que se decidió, si ya se aprobó o se descartó; si no, la de su
 * grupo, que es nula mientras la gerencia no lo asocie. Por esta regla, cambiar un
 * grupo de obra mueve los pendientes y los ignorados, y deja lo decidido donde se
 * decidió.
 *
 * La usan la bandeja y la ruta que sirve los archivos: si cada una armara su
 * propia condición, un día la bandeja diría que un mensaje es de una obra y su
 * foto se le mostraría a otra. Es la misma disciplina que `alcance.ts`.
 *
 * Solo servidor.
 */
import { eq, sql, type SQL } from 'drizzle-orm';

import { baseServidor } from '@/db/servidor/cliente';
import { whatsappGrupos, whatsappMensajes } from '@/db/servidor/esquema';

/**
 * La obra del mensaje como expresión SQL, para consultas que ya juntan
 * `whatsapp_mensajes` con `whatsapp_grupos`.
 */
export const obraDelMensaje: SQL<string | null> = sql<string | null>`coalesce(${whatsappMensajes.obraDecididaId}, ${whatsappGrupos.obraId})`;

/**
 * El día del reporte de un mensaje, como expresión SQL: el del hecho, o el día en
 * que se envió, en la obra, si no tiene (spec 025, RF-48). Lo usan el historial, «No
 * se pudo guardar» y sus filtros de fechas, para que los tres cuenten igual.
 */
export const diaDelMensaje: SQL<string> = sql<string>`coalesce(${whatsappMensajes.fechaHecho}, (${whatsappMensajes.enviadoEn} at time zone 'America/Bogota')::date)`;

/**
 * El id de un grupo o un mensaje tal como llega en la ruta, decodificado.
 *
 * El de un grupo lleva arroba (`…@g.us`), y el navegador y n8n la mandan como
 * `%40`; Expo Router entrega el segmento sin decodificar, y sin esto la ruta
 * buscaría `…%40g.us` y respondería que el grupo no existe. Un `%` suelto no
 * rompe la petición: se deja como vino.
 */
export function idDeLaRuta(id: string): string {
  try {
    return decodeURIComponent(id);
  } catch {
    return id;
  }
}

/** La obra de un mensaje concreto. `null` si no existe o su grupo no tiene obra. */
export async function obraDeUnMensaje(mensajeId: string): Promise<string | null> {
  const [fila] = await baseServidor()
    .select({ obraId: obraDelMensaje })
    .from(whatsappMensajes)
    .innerJoin(whatsappGrupos, eq(whatsappGrupos.id, whatsappMensajes.grupoId))
    .where(eq(whatsappMensajes.id, mensajeId))
    .limit(1);
  return fila?.obraId ?? null;
}
