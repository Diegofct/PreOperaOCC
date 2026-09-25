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
import { eq, isNull, or, sql, type SQL } from 'drizzle-orm';
import type { PgColumn } from 'drizzle-orm/pg-core';

import { obras } from '@/db/servidor/esquema';

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
 *
 * Un supervisor **sin obra asignada** no alcanza nada, y esto cambió con la
 * spec 001. Antes devolvía «sin filtro», que es lo mismo que decir «que lo vea
 * todo»: una cuenta a medio configurar tenía más alcance que una bien puesta, y
 * el fallo no se notaba porque todo funcionaba. Ahora el filtro no deja pasar
 * ninguna fila, que es lo que hay que ver cuando falta un dato.
 */
export function filtroDeObra(persona: PersonaEnSesion, columna: PgColumn): SQL | undefined {
  if (veTodasLasObras(persona)) return undefined;
  if (!persona.obraId) return sql`false`;
  return or(eq(columna, persona.obraId), isNull(columna));
}

/**
 * La condición que deja fuera las obras que no llevan ese módulo (spec 017, RF-10).
 *
 * Es lo que la gerencia deja de ver: lleva todas las obras, así que no se le apaga
 * el módulo entero, se le ocultan las obras apagadas dentro de él. A quien tiene
 * obra ya lo frena la guardia (RF-9), y esta condición no le cambia nada.
 *
 * Un `exists` y no una condición sobre un `join`: así vale igual en una consulta que
 * ya junta `obras` y en una que no, y ninguna tiene que cambiar su forma para poder
 * filtrar.
 */
export function filtroDeModulo(
  modulo: 'almacen' | 'cantera' | 'laboratorio',
  columnaObra: PgColumn,
): SQL {
  const bandera = {
    almacen: obras.almacenActivo,
    cantera: obras.canteraActivo,
    laboratorio: obras.laboratorioActivo,
  }[modulo];
  return sql`exists (select 1 from ${obras} where ${obras.id} = ${columnaObra} and ${bandera})`;
}

/**
 * ¿Puede tocar una fila que pertenece a esta obra?
 *
 * Para editar y dar de baja, donde no hay consulta que filtrar sino una fila
 * concreta que ya se leyó.
 */
export function alcanzaLaObra(persona: PersonaEnSesion, obraId: string | null): boolean {
  if (veTodasLasObras(persona)) return true;
  if (!persona.obraId) return false;
  return obraId === null || obraId === persona.obraId;
}
