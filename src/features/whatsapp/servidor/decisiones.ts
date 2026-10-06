/**
 * Corregir, descartar y devolver una propuesta de la bandeja (spec 021, RF-25 a
 * RF-29, RF-54 a RF-56).
 *
 * ── Una sentencia, condicionada a la versión ──
 *
 * Quien corrige o decide manda la versión que leyó, y cada escritura es un solo
 * `update … where estado = … and version = :leida` que sube la versión. Si otra
 * persona se adelantó, la sentencia no encuentra la fila y se responde 409 (RF-29):
 * solo cuenta la primera decisión. Sin transacciones (Neon por HTTP), es la única
 * forma de que dos residentes no se pisen.
 *
 * ── Nada se borra ──
 *
 * Corregir escribe `propuesta` y no toca `propuesta_ia` (RF-27). Descartar es un
 * estado, con motivo, quién, cuándo y **en qué obra** (`obra_decidida_id`, la de su
 * grupo en ese momento): así un descartado no se muda si después el grupo cambia
 * de obra (RF-13).
 *
 * Solo servidor.
 */
import { and, eq, sql } from 'drizzle-orm';

import { baseServidor } from '@/db/servidor/cliente';
import { whatsappGrupos, whatsappMensajes } from '@/db/servidor/esquema';
import { filtroDeObraEstricto } from '@/features/servidor/alcance';
import type { PersonaEnSesion } from '@/features/servidor/guardia';
import { errorDePeticion, noEncontrado } from '@/features/servidor/respuestas';
import type { EstadoMensajeWhatsapp, ReporteDelDia } from '@/shared/rules/whatsapp';

import { obraDelMensaje } from './obra';

/** Lo que hay que saber de un mensaje antes de decidir sobre él. */
interface MensajeAlAlcance {
  estado: EstadoMensajeWhatsapp;
  version: number;
  obraId: string;
}

/** El mensaje si existe y es de una obra al alcance; si no, `null` («no existe»). */
async function mensajeAlAlcance(
  sesion: PersonaEnSesion,
  id: string,
): Promise<MensajeAlAlcance | null> {
  const [fila] = await baseServidor()
    .select({
      estado: whatsappMensajes.estado,
      version: whatsappMensajes.version,
      obraId: sql<string>`${obraDelMensaje}`,
    })
    .from(whatsappMensajes)
    .innerJoin(whatsappGrupos, eq(whatsappGrupos.id, whatsappMensajes.grupoId))
    .where(and(eq(whatsappMensajes.id, id), filtroDeObraEstricto(sesion, obraDelMensaje)))
    .limit(1);
  return fila ?? null;
}

const ETIQUETA_DEL_ESTADO: Record<EstadoMensajeWhatsapp, string> = {
  pendiente: 'pendiente',
  ignorado: 'ignorada',
  aprobado: 'aprobada',
  descartado: 'descartada',
};

/**
 * Por qué no se pudo: la propuesta no está en el estado que hace falta (otra
 * persona ya decidió, RF-28), o está pero cambió desde que se leyó (RF-29).
 */
function rechazoDelCambio(
  mensaje: MensajeAlAlcance,
  estadoNecesario: EstadoMensajeWhatsapp,
): Response {
  if (mensaje.estado !== estadoNecesario) {
    return errorDePeticion(
      `Esta propuesta ya está ${ETIQUETA_DEL_ESTADO[mensaje.estado]}. Vuelva a abrirla para ver cómo quedó.`,
      409,
    );
  }
  return errorDePeticion(
    'Otra persona cambió esta propuesta mientras usted la tenía abierta. Vuelva a abrirla.',
    409,
  );
}

/** Corrige una propuesta pendiente (RF-26 a RF-29). Devuelve la versión nueva. */
export async function corregirPropuesta(
  sesion: PersonaEnSesion,
  id: string,
  pedido: { version: number; propuesta: ReporteDelDia },
): Promise<Response | { version: number }> {
  const mensaje = await mensajeAlAlcance(sesion, id);
  if (!mensaje) return noEncontrado('esa propuesta');

  const [fila] = await baseServidor()
    .update(whatsappMensajes)
    .set({
      propuesta: pedido.propuesta as unknown as Record<string, unknown>,
      version: sql`${whatsappMensajes.version} + 1`,
    })
    .where(
      and(
        eq(whatsappMensajes.id, id),
        eq(whatsappMensajes.estado, 'pendiente'),
        eq(whatsappMensajes.version, pedido.version),
      ),
    )
    .returning({ version: whatsappMensajes.version });

  return fila ?? rechazoDelCambio(mensaje, 'pendiente');
}

/** Descarta una propuesta pendiente, con su motivo (RF-54 a RF-56). */
export async function descartarPropuesta(
  sesion: PersonaEnSesion,
  id: string,
  pedido: { version: number; motivo: string },
): Promise<Response | { version: number }> {
  const mensaje = await mensajeAlAlcance(sesion, id);
  if (!mensaje) return noEncontrado('esa propuesta');

  const [fila] = await baseServidor()
    .update(whatsappMensajes)
    .set({
      estado: 'descartado',
      motivoDescarte: pedido.motivo,
      descartadoPor: sesion.id,
      descartadoEn: new Date(),
      // La obra de su grupo en este momento, en la misma sentencia (RF-13).
      obraDecididaId: sql`(select ${whatsappGrupos.obraId} from ${whatsappGrupos}
                            where ${whatsappGrupos.id} = ${whatsappMensajes.grupoId})`,
      version: sql`${whatsappMensajes.version} + 1`,
    })
    .where(
      and(
        eq(whatsappMensajes.id, id),
        eq(whatsappMensajes.estado, 'pendiente'),
        eq(whatsappMensajes.version, pedido.version),
      ),
    )
    .returning({ version: whatsappMensajes.version });

  return fila ?? rechazoDelCambio(mensaje, 'pendiente');
}

/** Devuelve a la bandeja un mensaje que la IA marcó «ignorar» (RF-25). */
export async function devolverAPendiente(
  sesion: PersonaEnSesion,
  id: string,
  pedido: { version: number },
): Promise<Response | { version: number }> {
  const mensaje = await mensajeAlAlcance(sesion, id);
  if (!mensaje) return noEncontrado('esa propuesta');

  const [fila] = await baseServidor()
    .update(whatsappMensajes)
    .set({ estado: 'pendiente', version: sql`${whatsappMensajes.version} + 1` })
    .where(
      and(
        eq(whatsappMensajes.id, id),
        eq(whatsappMensajes.estado, 'ignorado'),
        eq(whatsappMensajes.version, pedido.version),
      ),
    )
    .returning({ version: whatsappMensajes.version });

  return fila ?? rechazoDelCambio(mensaje, 'ignorado');
}
