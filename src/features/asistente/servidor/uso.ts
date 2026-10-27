/**
 * El uso del asistente y sus límites (spec 028, RF-50 a RF-59). **Solo servidor.**
 *
 *  · Cada persona tiene un cupo por día de Colombia (`diaDelConteo`): el que puso la
 *    gerencia para ella, o el de todos, o 30 (`limiteDelDia`).
 *  · Solo cuenta lo que se respondió bien (RF-55): `sumarUso` se llama al terminar.
 *    Dos pestañas a la vez pueden pasarse en una pregunta; se acepta (plan).
 *  · La gerencia ve cuántas preguntas y cuánto costaron, por persona y obra, nunca el
 *    contenido (RF-56 a RF-58).
 */
import { and, between, eq, isNotNull, sql, sum } from 'drizzle-orm';

import { baseServidor } from '@/db/servidor/cliente';
import { asistenteLimites, asistenteUso, obras, usuarios } from '@/db/servidor/esquema';
import {
  costoEstimado,
  diaDelConteo,
  limiteDelDia,
  preguntasQueQuedan,
  type LimitePuesto,
  type TokensUsados,
} from '@/shared/rules/asistente';

export interface CupoDelDia {
  limite: number;
  hechas: number;
  quedan: number;
}

async function limitesPuestos(): Promise<LimitePuesto[]> {
  return baseServidor().select({ usuarioId: asistenteLimites.usuarioId, limite: asistenteLimites.limite }).from(asistenteLimites);
}

/** RF-51: cuántas le quedan hoy. */
export async function cupoDelDia(usuarioId: string, ahora = Date.now()): Promise<CupoDelDia> {
  const dia = diaDelConteo(ahora);
  const [[{ hechas }], puestos] = await Promise.all([
    baseServidor()
      .select({ hechas: sql<number>`coalesce(${sum(asistenteUso.preguntas)}, 0)::int` })
      .from(asistenteUso)
      .where(and(eq(asistenteUso.usuarioId, usuarioId), eq(asistenteUso.dia, dia))),
    limitesPuestos(),
  ]);
  const limite = limiteDelDia(usuarioId, puestos);
  return { limite, hechas, quedan: preguntasQueQuedan(limite, hechas) };
}

/**
 * Cuenta una pregunta respondida (RF-52, RF-55, RF-57). La obra es la que consultó, si
 * fue una sola; si fueron varias o ninguna, va sin obra.
 */
export async function sumarUso(usuarioId: string, obrasConsultadas: readonly string[], tokens: TokensUsados, ahora = Date.now()) {
  const dia = diaDelConteo(ahora);
  const obraId = obrasConsultadas.length === 1 ? obrasConsultadas[0] : null;
  const entrada = tokens.entrada + (tokens.cacheLeida ?? 0) + (tokens.cacheEscrita ?? 0);
  const costo = costoEstimado(tokens);
  await baseServidor()
    .insert(asistenteUso)
    .values({ id: `${usuarioId}|${dia}|${obraId ?? '-'}`, usuarioId, dia, obraId, preguntas: 1, tokensEntrada: entrada, tokensSalida: tokens.salida, costo })
    .onConflictDoUpdate({
      target: asistenteUso.id,
      set: {
        preguntas: sql`${asistenteUso.preguntas} + 1`,
        tokensEntrada: sql`${asistenteUso.tokensEntrada} + ${entrada}`,
        tokensSalida: sql`${asistenteUso.tokensSalida} + ${tokens.salida}`,
        costo: sql`${asistenteUso.costo} + ${costo}`,
      },
    });
}

export interface FilaDeUso {
  usuarioId: string;
  persona: string;
  obraId: string | null;
  obra: string | null;
  preguntas: number;
  /** Microdólares. */
  costo: number;
}

/** RF-56 a RF-58: el uso de un periodo por persona y obra, sin el contenido. */
export async function usoDelPeriodo(desde: string, hasta: string): Promise<FilaDeUso[]> {
  const filas = await baseServidor()
    .select({
      usuarioId: asistenteUso.usuarioId,
      persona: usuarios.nombreCompleto,
      obraId: asistenteUso.obraId,
      obra: obras.codigo,
      preguntas: sql<number>`sum(${asistenteUso.preguntas})::int`,
      costo: sql<number>`sum(${asistenteUso.costo})::bigint`,
    })
    .from(asistenteUso)
    .innerJoin(usuarios, eq(usuarios.id, asistenteUso.usuarioId))
    .leftJoin(obras, eq(obras.id, asistenteUso.obraId))
    .where(between(asistenteUso.dia, desde, hasta))
    .groupBy(asistenteUso.usuarioId, usuarios.nombreCompleto, asistenteUso.obraId, obras.codigo);
  return filas
    .map((f) => ({ ...f, costo: Number(f.costo) }))
    .sort((a, b) => b.preguntas - a.preguntas || a.persona.localeCompare(b.persona));
}

export interface LimitesDelAsistente {
  /** El de todos, o `null` si vale el de la spec (30). */
  todos: number | null;
  porPersona: { usuarioId: string; persona: string; limite: number }[];
}

/** RF-59: los límites puestos. */
export async function limitesDelAsistente(): Promise<LimitesDelAsistente> {
  const [filas, deTodos] = await Promise.all([
    baseServidor()
      .select({ usuarioId: asistenteLimites.usuarioId, persona: usuarios.nombreCompleto, limite: asistenteLimites.limite })
      .from(asistenteLimites)
      .innerJoin(usuarios, eq(usuarios.id, asistenteLimites.usuarioId))
      .where(isNotNull(asistenteLimites.usuarioId)),
    baseServidor().select({ limite: asistenteLimites.limite }).from(asistenteLimites).where(eq(asistenteLimites.clave, 'todos')),
  ]);
  return {
    todos: deTodos[0]?.limite ?? null,
    porPersona: filas.map((f) => ({ usuarioId: f.usuarioId!, persona: f.persona, limite: f.limite })).sort((a, b) => a.persona.localeCompare(b.persona)),
  };
}

/**
 * RF-59: pone el límite de todos (`usuarioId` nulo) o el de una persona. `limite` nulo
 * lo quita: vuelve a valer el de todos, o 30.
 */
export async function ponerLimite(usuarioId: string | null, limite: number | null, puestoPor: string) {
  const clave = usuarioId ?? 'todos';
  if (limite === null) {
    await baseServidor().delete(asistenteLimites).where(eq(asistenteLimites.clave, clave));
    return;
  }
  await baseServidor()
    .insert(asistenteLimites)
    .values({ clave, usuarioId, limite, actualizadoPor: puestoPor })
    .onConflictDoUpdate({ target: asistenteLimites.clave, set: { limite, actualizadoPor: puestoPor } });
}
