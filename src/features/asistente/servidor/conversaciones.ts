/**
 * Las conversaciones del asistente (spec 028, RF-38 a RF-49). **Solo servidor.**
 *
 * Son de una sola persona: todas las lecturas filtran por su dueño, y una ajena se
 * responde igual que una que no existe (RF-40). Nadie las borra (RF-48).
 *
 * Una conversación guarda lo que consultó en todas sus respuestas (obras y módulos). Si
 * la persona ya no alcanza algo de eso, la ve solo con su título y su fecha (RF-49) y no
 * la puede retomar.
 */
import { and, asc, desc, eq, sql } from 'drizzle-orm';
import { uuidv7 } from 'uuidv7';

import { baseServidor } from '@/db/servidor/cliente';
import { asistenteConversaciones, asistenteMensajes } from '@/db/servidor/esquema';
import {
  conversacionVisible,
  tituloDeConversacion,
  type AdjuntoGuardado,
  type AlcanceDelAsistente,
  type FuenteDeRespuesta,
  type LoQueConsulto,
  type TokensUsados,
} from '@/shared/rules/asistente';

import type { MensajeDelHistorial } from './conversacion';

export interface ConversacionFila {
  id: string;
  titulo: string;
  archivada: boolean;
  /** ISO 8601: la última pregunta. */
  actualizadaEn: string;
  /** RF-49: `false` si ya no alcanza lo que consultó; entonces va sin contenido. */
  visible: boolean;
}

export interface MensajeFila {
  id: string;
  rol: 'persona' | 'asistente';
  texto: string;
  fuentes: FuenteDeRespuesta[];
  adjuntos: AdjuntoGuardado[];
  estado: 'respondido' | 'fallido';
  /** ISO 8601 (RF-42). */
  creadoEn: string;
}

type FilaDeConversacion = typeof asistenteConversaciones.$inferSelect;

function aFila(c: FilaDeConversacion, alcance: AlcanceDelAsistente): ConversacionFila {
  return {
    id: c.id,
    titulo: c.titulo,
    archivada: c.archivada,
    actualizadaEn: c.actualizadoEn.toISOString(),
    visible: conversacionVisible({ obras: c.obras, modulos: c.modulos }, alcance),
  };
}

/** La conversación si es de esta persona; si no, `null` (se responde 404, RF-40). */
export async function suConversacion(usuarioId: string, id: string): Promise<FilaDeConversacion | null> {
  const [c] = await baseServidor()
    .select()
    .from(asistenteConversaciones)
    .where(and(eq(asistenteConversaciones.id, id), eq(asistenteConversaciones.usuarioId, usuarioId)))
    .limit(1);
  return c ?? null;
}

/** RF-39, RF-46, RF-47: las suyas, de la más reciente a la más antigua. */
export async function listarConversaciones(usuarioId: string, alcance: AlcanceDelAsistente, archivadas: boolean): Promise<ConversacionFila[]> {
  const filas = await baseServidor()
    .select()
    .from(asistenteConversaciones)
    .where(and(eq(asistenteConversaciones.usuarioId, usuarioId), eq(asistenteConversaciones.archivada, archivadas)))
    .orderBy(desc(asistenteConversaciones.actualizadoEn));
  return filas.map((c) => aFila(c, alcance));
}

/**
 * RF-41, RF-42, RF-49: una conversación con sus mensajes tal como se dieron, o solo su
 * fila si ya no alcanza lo que consultó. `null` si no es suya.
 */
export async function abrirConversacion(
  usuarioId: string,
  id: string,
  alcance: AlcanceDelAsistente,
): Promise<{ conversacion: ConversacionFila; mensajes: MensajeFila[] } | null> {
  const c = await suConversacion(usuarioId, id);
  if (!c) return null;
  const conversacion = aFila(c, alcance);
  if (!conversacion.visible) return { conversacion, mensajes: [] };
  const mensajes = await baseServidor()
    .select()
    .from(asistenteMensajes)
    .where(eq(asistenteMensajes.conversacionId, id))
    .orderBy(asc(asistenteMensajes.creadoEn), asc(asistenteMensajes.id));
  return {
    conversacion,
    mensajes: mensajes.map((m) => ({
      id: m.id,
      rol: m.rol,
      texto: m.texto,
      fuentes: m.fuentes,
      adjuntos: m.adjuntos,
      estado: m.estado,
      creadoEn: m.creadoEn.toISOString(),
    })),
  };
}

/** RF-45: archivar o sacar del archivo. `false` si no es suya. */
export async function archivarConversacion(usuarioId: string, id: string, archivada: boolean): Promise<boolean> {
  const hechas = await baseServidor()
    .update(asistenteConversaciones)
    .set({ archivada })
    .where(and(eq(asistenteConversaciones.id, id), eq(asistenteConversaciones.usuarioId, usuarioId)))
    .returning({ id: asistenteConversaciones.id });
  return hechas.length > 0;
}

/** RF-44: una conversación nueva, con el título de su primera pregunta. */
export async function crearConversacion(usuarioId: string, pregunta: string, conAdjuntos: boolean): Promise<string> {
  const id = uuidv7();
  await baseServidor().insert(asistenteConversaciones).values({ id, usuarioId, titulo: tituloDeConversacion(pregunta, conAdjuntos) });
  return id;
}

/**
 * Lo que se le manda a la IA de lo ya hablado (RF-14): las preguntas que tuvieron
 * respuesta y sus respuestas. Una pregunta que falló no va: se reintenta (RF-62).
 */
export async function historialDe(conversacionId: string): Promise<MensajeDelHistorial[]> {
  const mensajes = await baseServidor()
    .select({ rol: asistenteMensajes.rol, texto: asistenteMensajes.texto, estado: asistenteMensajes.estado })
    .from(asistenteMensajes)
    .where(eq(asistenteMensajes.conversacionId, conversacionId))
    .orderBy(asc(asistenteMensajes.creadoEn), asc(asistenteMensajes.id));
  const historial: MensajeDelHistorial[] = [];
  for (let i = 0; i < mensajes.length; i++) {
    const m = mensajes[i];
    const siguiente = mensajes[i + 1];
    if (m.rol === 'persona' && siguiente?.rol === 'asistente' && siguiente.estado === 'respondido') {
      historial.push({ rol: 'persona', texto: m.texto }, { rol: 'asistente', texto: siguiente.texto });
      i++;
    }
  }
  return historial;
}

/** RF-38: la pregunta, con sus adjuntos ya guardados. */
export async function guardarPregunta(conversacionId: string, texto: string, adjuntos: readonly AdjuntoGuardado[]): Promise<string> {
  const id = uuidv7();
  await baseServidor()
    .insert(asistenteMensajes)
    .values({ id, conversacionId, rol: 'persona', texto, adjuntos: [...adjuntos] });
  return id;
}

export type RespuestaParaGuardar =
  | { ok: true; texto: string; fuentes: FuenteDeRespuesta[]; consulto: LoQueConsulto; modelo: string; tokens: TokensUsados }
  | { ok: false; error: string; tokens: TokensUsados };

/**
 * RF-38, RF-42, RF-61: la respuesta tal como se dio, o la falla con su motivo. Suma a la
 * conversación lo que consultó (RF-49) y la sube en la lista (RF-39).
 */
export async function guardarRespuesta(conversacionId: string, r: RespuestaParaGuardar): Promise<string> {
  const id = uuidv7();
  const tokensEntrada = r.tokens.entrada + (r.tokens.cacheLeida ?? 0) + (r.tokens.cacheEscrita ?? 0);
  await baseServidor()
    .insert(asistenteMensajes)
    .values({
      id,
      conversacionId,
      rol: 'asistente',
      texto: r.ok ? r.texto : r.error,
      fuentes: r.ok ? r.fuentes : [],
      estado: r.ok ? 'respondido' : 'fallido',
      modelo: r.ok ? r.modelo : null,
      tokensEntrada,
      tokensSalida: r.tokens.salida,
    });
  const obras = r.ok ? r.consulto.obras : [];
  const modulos = r.ok ? r.consulto.modulos : [];
  // La unión, sin repetir, en una sola sentencia: dos respuestas seguidas no se pisan.
  await baseServidor()
    .update(asistenteConversaciones)
    .set({
      obras: sql`(select coalesce(jsonb_agg(distinct x), '[]'::jsonb) from jsonb_array_elements_text(${asistenteConversaciones.obras} || ${JSON.stringify(obras)}::jsonb) x)`,
      modulos: sql`(select coalesce(jsonb_agg(distinct x), '[]'::jsonb) from jsonb_array_elements_text(${asistenteConversaciones.modulos} || ${JSON.stringify(modulos)}::jsonb) x)`,
    })
    .where(eq(asistenteConversaciones.id, conversacionId));
  return id;
}
