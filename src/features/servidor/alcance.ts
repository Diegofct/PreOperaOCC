/**
 * Qué le toca ver a cada quien, decidido en un solo sitio.
 *
 * `admin` —gerencia— ve todas las obras. `supervisor` —residente o director de
 * obra— ve la suya y nada más.
 *
 * Está aquí y no repartido por los endpoints a propósito. Un filtro de alcance
 * copiado en nueve rutas es un filtro que en la décima se olvida, y ese olvido
 * no se nota nunca durante el desarrollo: todo funciona, solo que el residente
 * de una obra puede leer —o dar de baja— la maquinaria de otra. El fallo aparece
 * cuando ya hay dos obras en producción y alguien se pregunta por qué le
 * desapareció una volqueta.
 *
 * Regla de uso: **ninguna consulta del panel arma su propia condición de obra.**
 * Si una necesita algo que estas funciones no dan, se amplían aquí.
 */
import { eq, isNull, or, type SQL } from 'drizzle-orm';
import type { PgColumn } from 'drizzle-orm/pg-core';

import type { PersonaEnSesion } from './guardia';

/** Puede ver y tocar todas las obras. */
export function veTodasLasObras(persona: PersonaEnSesion): boolean {
  return persona.rol === 'admin';
}

/**
 * La condición que restringe una consulta a la obra de quien pregunta.
 *
 * Devuelve `undefined` cuando no hay que filtrar, que es lo que espera el
 * `and(...)` de Drizzle para omitir la condición.
 *
 * Las filas **sin obra** entran en el alcance del supervisor a propósito: una
 * persona de gerencia no está adscrita a ninguna, y un vehículo recién dado de
 * alta puede estar todavía sin asignar. Ocultárselas al residente haría que la
 * máquina que acaba de registrar desapareciera de su pantalla.
 */
export function filtroDeObra(persona: PersonaEnSesion, columna: PgColumn): SQL | undefined {
  if (veTodasLasObras(persona)) return undefined;
  if (!persona.obraId) return undefined;
  return or(eq(columna, persona.obraId), isNull(columna));
}

/**
 * ¿Puede tocar una fila que pertenece a esta obra?
 *
 * Para editar y dar de baja, donde no hay consulta que filtrar sino una fila
 * concreta que ya se leyó.
 */
export function alcanzaLaObra(persona: PersonaEnSesion, obraId: string | null): boolean {
  if (veTodasLasObras(persona)) return true;
  if (!persona.obraId) return true;
  return obraId === null || obraId === persona.obraId;
}
