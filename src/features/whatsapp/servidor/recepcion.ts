/**
 * Lo que hace el servidor con cada mensaje que entrega la integración (spec 021,
 * RF-1 a RF-6, RF-10, RF-11, RF-23, RF-90).
 *
 * ── Una sentencia por mensaje ──
 *
 * Neon por HTTP no da transacciones interactivas, y la integración **reintenta**:
 * si el servidor no respondió, vuelve a mandar el mismo mensaje. Así que guardar
 * el mensaje es un solo `insert … on conflict do update … where`, que en una vuelta
 * decide las tres salidas:
 *
 *  · `nuevo` — no estaba: se inserta.
 *  · `reemplazado` — estaba, nadie lo ha tocado y la IA mandó otra propuesta
 *    (RF-5): se reemplaza la propuesta, y con ella la categoría y el estado.
 *  · `conservado` — estaba y alguien ya lo corrigió o lo decidió (RF-6), o llegó
 *    idéntico (RF-4): no se toca nada.
 *
 * «Nadie lo ha tocado» es `version = 0`: toda corrección o decisión de una persona
 * sube la versión. Es más estricto que mirar el estado, y a propósito: si el
 * residente devolvió a pendiente un mensaje ignorado, una entrega repetida no
 * puede volver a esconderlo.
 *
 * El grupo va antes y aparte (`on conflict do update` del nombre): si el corte
 * cae entre las dos sentencias, el reintento encuentra el grupo y guarda el
 * mensaje. Un grupo nuevo entra sin obra, y por eso sus mensajes no salen en
 * ninguna bandeja hasta que la gerencia lo asocie (RF-10, RF-11).
 *
 * Solo servidor.
 */
import { and, eq, sql } from 'drizzle-orm';

import { baseServidor } from '@/db/servidor/cliente';
import { whatsappGrupos, whatsappMensajes } from '@/db/servidor/esquema';
import type { entregaDeWhatsapp } from '@/features/panel/contratos';
import { estadoInicialDeCategoria } from '@/shared/rules/whatsapp';

import type { z } from 'zod';

export type ResultadoDeRecepcion = 'nuevo' | 'reemplazado' | 'conservado';

export async function recibirMensaje(
  entrega: z.output<typeof entregaDeWhatsapp>,
): Promise<ResultadoDeRecepcion> {
  const db = baseServidor();
  const { grupo, mensaje, propuesta } = entrega;

  await db
    .insert(whatsappGrupos)
    .values({ id: grupo.id, nombre: grupo.nombre })
    .onConflictDoUpdate({
      target: whatsappGrupos.id,
      set: { nombre: grupo.nombre },
      // Sin escribir si no cambió: así `actualizado_en` dice cuándo cambió el
      // nombre, no cuándo llegó el último mensaje.
      where: sql`${whatsappGrupos.nombre} is distinct from excluded.nombre`,
    });

  const categoria = propuesta.categoria;
  const filas = await db
    .insert(whatsappMensajes)
    .values({
      id: mensaje.id,
      grupoId: grupo.id,
      autorId: mensaje.autorId,
      autorNombre: mensaje.autorNombre,
      enviadoEn: new Date(mensaje.enviadoEn),
      tipo: mensaje.tipo,
      texto: mensaje.texto,
      categoria,
      complementaA: propuesta.complementa_a?.trim() || null,
      propuestaIa: propuesta,
      estado: estadoInicialDeCategoria(categoria),
    })
    .onConflictDoUpdate({
      target: whatsappMensajes.id,
      set: {
        propuestaIa: sql`excluded.propuesta_ia`,
        categoria: sql`excluded.categoria`,
        complementaA: sql`excluded.complementa_a`,
        estado: sql`excluded.estado`,
      },
      where: and(
        eq(whatsappMensajes.version, 0),
        sql`${whatsappMensajes.propuestaIa} is distinct from excluded.propuesta_ia`,
      ),
    })
    // `xmax = 0` solo en la fila recién insertada: distingue el alta del reemplazo
    // sin una segunda lectura. Sin fila devuelta, el `where` dejó todo como estaba.
    .returning({ insertado: sql<boolean>`(xmax = 0)` });

  if (filas.length === 0) return 'conservado';
  return filas[0].insertado ? 'nuevo' : 'reemplazado';
}
