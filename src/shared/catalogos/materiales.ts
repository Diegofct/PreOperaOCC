/**
 * Los materiales que se pueden registrar en el almacén de una obra (spec 009,
 * RF-32 a RF-36).
 *
 * Hasta el 2026-09-17 el nombre se escribía a mano, y ahí cada almacén acababa con
 * su propio idioma: «cemento», «Cemento gris», «cto gris». La lista es la de
 * referencia del INVIAS que usa OCC, **la misma para todas las obras**, y lo que no
 * esté en ella entra por «Otro» (RF-33). Por eso no es una lista cerrada: en una
 * obra aparece material que ninguna lista previó, y un almacenista que no puede
 * registrar lo que tiene en la bodega deja de usar el almacén.
 *
 * ── Por qué un catálogo y no una tabla ──
 *
 * Es una lista de referencia igual para todas las obras, no un dato de ninguna. Lo
 * que vive en la base es el material **de una obra**, con el nombre que se eligió o
 * se escribió y su unidad. Así, actualizar la lista de OCC no toca ni una fila
 * registrada, y no cuesta una migración. Es lo mismo que se decidió para las
 * unidades (`almacen.ts`) y para los cargos (spec 002).
 *
 * ── De dónde salen los datos ──
 *
 * Del JSON que genera `npm run materiales` a partir de `docs/materiales y
 * equipos.xlsx`; ese archivo no se edita a mano. Del documento se toma **solo el
 * nombre**: el código del INVIAS, la unidad y el precio se descartan. La unidad la
 * elige el almacenista de la lista cerrada de `almacen.ts` (RF-34), porque OCC
 * compra el cemento por bultos y el documento lo trae en kilogramos.
 *
 * ── Por qué son nombres a secas y no ids ──
 *
 * Lo que se guarda de un material es su nombre, desde la 009 y para los que ya
 * están registrados (RF-37). Inventarle aquí una clave obligaría a traducirla al
 * guardar y dejaría a los materiales viejos —los escritos a mano— sin ninguna.
 * El nombre elegido de la lista y el escrito con «Otro» entran por el mismo camino
 * y el servidor no tiene que distinguirlos: RF-3 ya impide repetir un nombre
 * vigente en la misma obra, venga de donde venga.
 */
import datos from './materiales.json';

/**
 * Los nombres del documento de OCC, en orden alfabético y sin repetidos (RF-35).
 *
 * El script los ordena y los deduplica: aquí solo se les pone tipo.
 */
export const MATERIALES_DE_OCC = datos as readonly string[];

/**
 * La salida para lo que no está en la lista (RF-33).
 *
 * No choca con ningún material: ninguno se llama «otro», y el guion lo comprueba
 * cada vez que se regenera la lista.
 */
export const CLAVE_OTRO_MATERIAL = 'otro';
