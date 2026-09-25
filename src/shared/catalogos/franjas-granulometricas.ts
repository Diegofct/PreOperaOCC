/**
 * Las franjas granulométricas contra las que se juzga un ensayo (spec 018, RF-17 a
 * RF-19, anexo A).
 *
 * Una franja es lo que la especificación de un material exige: entre qué porcentaje
 * y qué porcentaje de la muestra tiene que pasar cada tamiz. En el Excel del
 * laboratorio estaba escrita a mano dentro de la hoja, fija para un solo material;
 * aquí es una lista de la que el laboratorista escoge, y el ensayo **copia la franja
 * entera** al escogerla (RF-21), así que corregir este archivo no altera ningún
 * ensayo ya hecho.
 *
 * ── Por qué solo hay una ──
 *
 * SBG-50 es la única franja que sale de un documento de OCC: son las columnas de
 * límites del propio formato LAB-FR-01-2025. Las demás que use la obra (bases,
 * otras subbases, afirmado) **no se escriben de memoria**: un límite equivocado da
 * un CUMPLE falso, y eso es peor que no tener la franja. Se añaden cuando el
 * laboratorio las confirme (duda abierta de RF-19), cada una con su caso en
 * `scripts/verificar-reglas.ts`.
 *
 * Vive en código y no en una tabla editable: editar franjas desde el panel está
 * fuera del alcance de la spec, y aquí cada franja pasa por la verificación.
 *
 * Los id son estables: un ensayo guarda el id de su franja para poder filtrar, y
 * no se renombra ni se reutiliza.
 */
import type { IdTamizConAbertura } from './tamices';

/** El porcentaje que pasa, mínimo y máximo, límites incluidos (RF-57). */
export interface LimiteDeFranja {
  min: number;
  max: number;
}

export interface FranjaGranulometrica {
  id: string;
  nombre: string;
  /** De dónde sale: se imprime en el informe junto al nombre. */
  norma: string;
  /** Solo los tamices que la franja controla; los demás no entran al veredicto. */
  limites: Partial<Record<IdTamizConAbertura, LimiteDeFranja>>;
}

export const FRANJAS_GRANULOMETRICAS: readonly FranjaGranulometrica[] = [
  {
    id: 'sbg_50',
    nombre: 'Subbase granular SBG-50',
    norma: 'INVÍAS, Art. 320 — Subbase granular',
    limites: {
      t_2: { min: 100, max: 100 },
      t_1_1_2: { min: 70, max: 95 },
      t_1: { min: 60, max: 90 },
      t_1_2: { min: 45, max: 75 },
      t_3_8: { min: 40, max: 70 },
      n_4: { min: 25, max: 55 },
      n_10: { min: 15, max: 40 },
      n_40: { min: 6, max: 25 },
      n_100: { min: 3, max: 18 },
      n_200: { min: 2, max: 15 },
    },
  },
];

/** La franja de ese id, o `undefined` si no está en el catálogo. */
export function franjaPorId(id: string): FranjaGranulometrica | undefined {
  return FRANJAS_GRANULOMETRICAS.find((f) => f.id === id);
}
