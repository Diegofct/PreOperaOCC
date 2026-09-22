/**
 * El horario que un parte se queda al cerrarlo o al anularlo (spec 016, RF-23 y
 * RF-24).
 *
 * Es una subconsulta y no un valor leído antes, por la misma razón que los
 * viajes de cantera: sin transacciones (Neon por HTTP), leer el horario de la obra
 * y escribirlo después dejaría ganar a una corrección hecha entre las dos
 * sentencias, y el parte guardaría un horario con el que nunca se vieron sus
 * cifras. Dentro del mismo `UPDATE`, lo que se congela es lo que había al cerrar.
 *
 * Lo comparten `cerrar` y `anular`, y vive aquí porque una ruta no importa a otra.
 */
import { sql, type SQL } from 'drizzle-orm';

import { obras, partesDeObra } from '@/db/servidor/esquema';
import type { HorarioDeObra } from '@/shared/rules/horas';

/** El horario vigente de la obra **del propio parte**, para el `set` del cierre. */
export function horarioDeLaObraDelParte(): SQL<HorarioDeObra> {
  return sql<HorarioDeObra>`(select ${obras.horario} from ${obras} where ${obras.id} = ${partesDeObra.obraId})`;
}

/**
 * Para la anulación: congela el horario **solo si el parte seguía abierto**.
 *
 * Uno cerrado ya tiene el suyo. Y uno cerrado antes de la spec tiene `null` a
 * propósito —así se sabe que se lee con la jornada anterior (RF-25)—: ponerle
 * ahora el horario vigente de la obra le cambiaría las cifras al anularlo.
 */
export function horarioAlAnular(): SQL<HorarioDeObra | null> {
  return sql<HorarioDeObra | null>`case when ${partesDeObra.cerradoEn} is null then ${horarioDeLaObraDelParte()} else ${partesDeObra.horario} end`;
}
