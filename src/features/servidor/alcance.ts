/**
 * Qué le toca ver a cada quien, decidido en un solo sitio.
 *
 * `admin` —gerencia— ve todas las obras, y desde la spec 041 también el Director de
 * Proyectos. El residente ve la suya y nada más; el Director de Obra, las suyas, una
 * o varias. El Encargado de OCC (spec 034) también ve todas, pero solo dentro de los
 * módulos que le da la tabla de permisos: cada ruta exige su permiso antes de llegar
 * aquí (`requerirPermiso`).
 *
 * Desde la 041 hay dos preguntas distintas, y cada función responde una:
 *
 * - **Un listado** se filtra por la obra **en uso** (`persona.obraId`, la de la pestaña):
 *   `filtroDeObra`, `filtroDeObraEstricto`, `filtroDeObraPedida`. Así el Director de Obra
 *   no ve mezclados los partes de dos obras en la pantalla de una.
 * - **Una fila concreta** que ya se leyó se compara contra **todas** sus obras
 *   (`persona.obras`): `alcanzaLaObra`, `alcanzaLaImagen`. Un enlace a la foto de su otra
 *   obra no tiene por qué fallar porque la pestaña esté en esta.
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
import { and, eq, isNull, or, sql, type SQL } from 'drizzle-orm';
import type { PgColumn } from 'drizzle-orm/pg-core';

import { obras } from '@/db/servidor/esquema';
import { alcanza, rolVeTodasLasObras, type ModuloConPermiso } from '@/shared/rules/permisos';

import type { PersonaEnSesion } from './guardia';

/** Puede ver y tocar todas las obras (en los módulos que alcance su rol). */
export function veTodasLasObras(persona: PersonaEnSesion): boolean {
  return rolVeTodasLasObras(persona.rol);
}

/**
 * La condición que restringe una consulta a la obra de quien pregunta.
 *
 * Devuelve `undefined` cuando no hay que filtrar, que es lo que espera el
 * `and(...)` de Drizzle para omitir la condición.
 *
 * Las filas **sin obra** entran en el alcance de quien tiene obra a propósito: una
 * persona de gerencia no está adscrita a ninguna, y un vehículo recién dado de
 * alta puede estar todavía sin asignar. Ocultárselas al residente haría que la
 * máquina que acaba de registrar desapareciera de su pantalla.
 *
 * Quien **no tiene obra en uso** no alcanza nada, y esto cambió con la
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
 * concreta que ya se leyó. Desde la 041 se compara contra **todas** sus obras, no
 * solo la que tiene en uso (RF-19); sin ninguna, no alcanza nada (RF-65).
 */
export function alcanzaLaObra(persona: PersonaEnSesion, obraId: string | null): boolean {
  if (veTodasLasObras(persona)) return true;
  if (persona.obras.length === 0) return false;
  return obraId === null || persona.obras.includes(obraId);
}

/**
 * ¿Esta fila, que trae su obra, es de una de sus obras? (041/RF-19)
 *
 * Como `alcanzaLaObra`, pero una fila **sin obra no alcanza** a quien no ve todas. Es
 * para los lectores que antes de la 041 comparaban `fila.obraId !== persona.obraId`:
 * con esa comparación, lo que no tenía obra quedaba fuera, y cambiarla por
 * `alcanzaLaObra` le habría abierto al residente las marcas y las máquinas sueltas.
 */
export function esDeSusObras(persona: PersonaEnSesion, obraId: string | null): boolean {
  if (veTodasLasObras(persona)) return true;
  return obraId !== null && persona.obras.includes(obraId);
}

/**
 * La obra en la que se guarda lo que registra (041/RF-23).
 *
 * Quien ve todas escribe en la que pide, como hasta ahora la gerencia. Los demás, en la
 * pedida si es una de las suyas —el Director de Obra que manda la obra en el cuerpo—, y si
 * no, en su obra en uso. Una obra ajena no da error: se ignora, igual que en la lectura
 * (RF-20). `null` es que no hay dónde, y la ruta lo rechaza.
 */
export function obraParaEscribir(persona: PersonaEnSesion, pedida: string | null | undefined): string | null {
  if (veTodasLasObras(persona)) return pedida ?? null;
  if (pedida && persona.obras.includes(pedida)) return pedida;
  return persona.obraId;
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
 *
 * `modulo` es el del registro dueño (spec 034). La ruta de archivos solo pide sesión,
 * así que el Encargado de OCC —que ve todas las obras sin ser gerencia— necesita además
 * el permiso de ese módulo: sin esto abriría, foto por foto, el contrato de cualquier
 * obra. Sin módulo, no la alcanza.
 *
 * Spec 041: el Director de Proyectos entra por `veTodasLasObras`, con el permiso del módulo
 * como el Encargado de OCC. Lo huérfano sigue siendo **solo de la gerencia**: aquí
 * `rol === 'admin'` quiere decir «es la gerencia», no «ve todas las obras», y revisar lo
 * que quedó sin dueño es un trabajo suyo.
 */
export function alcanzaLaImagen(
  persona: PersonaEnSesion,
  dueno: { existe: boolean; obraId: string | null },
  modulo: ModuloConPermiso | null = null,
): boolean {
  if (persona.rol === 'admin') return true;
  if (!dueno.existe) return false;
  if (veTodasLasObras(persona)) return modulo !== null && alcanza(persona.rol, modulo, 'ver');
  return alcanzaLaObra(persona, dueno.obraId);
}

/**
 * `filtroDeObra` más la obra que se pidió (`?obraId=`), para las pantallas que se abren
 * dentro de una obra de Proyectos (spec 033, RF-19). Quien no es gerencia ya está
 * limitado a la suya: pedir otra le deja el listado vacío, no le abre la ajena.
 */
export function filtroDeObraPedida(persona: PersonaEnSesion, columna: PgColumn, obraId: string | null): SQL | undefined {
  return obraId ? and(filtroDeObra(persona, columna), eq(columna, obraId)) : filtroDeObra(persona, columna);
}
