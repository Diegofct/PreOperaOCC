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
 * Como `filtroDeObra`, pero **sin dejar pasar las filas sin obra** (spec 021).
 *
 * En la bandeja de WhatsApp «sin obra» no es «de todos»: es un grupo que la
 * gerencia todavía no asoció, y sus mensajes no salen en ninguna bandeja (RF-11),
 * tampoco en la de la gerencia, que los ve en la lista de grupos pendientes de
 * asociar. Recibe una expresión y no una columna porque la obra de un mensaje se
 * calcula (`whatsapp/servidor/obra.ts`).
 */
export function filtroDeObraEstricto(persona: PersonaEnSesion, obra: SQL): SQL {
  if (veTodasLasObras(persona)) return sql`${obra} is not null`;
  if (!persona.obraId) return sql`false`;
  return sql`${obra} = ${persona.obraId}`;
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

/**
 * ¿Puede ver una imagen, sabiendo de qué registro cuelga?
 *
 * Aparte de `alcanzaLaObra` por el caso que esa no distingue: **un dueño que no se
 * encuentra**. Para `alcanzaLaObra`, «sin obra» es «de todos», y eso está bien para un
 * registro que existe y no lleva obra. Pero una imagen cuyo registro no aparece no es
 * de todos: es una imagen que no se sabe de quién es. Hasta el 2026-10-06 las fotos
 * del parte diario caían ahí —se buscaban en la tabla vieja `bitacoras`, no en
 * `partes_de_obra`— y cualquier residente podía ver la foto del día de otra obra.
 *
 * La gerencia sí la ve: lleva todas las obras, y alguien tiene que poder revisar lo
 * que quedó huérfano.
 */
export function alcanzaLaImagen(
  persona: PersonaEnSesion,
  dueno: { existe: boolean; obraId: string | null },
): boolean {
  if (veTodasLasObras(persona)) return true;
  if (!dueno.existe) return false;
  return alcanzaLaObra(persona, dueno.obraId);
}
