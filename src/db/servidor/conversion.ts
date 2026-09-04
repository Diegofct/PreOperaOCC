/**
 * La frontera de tiempos entre las dos bases, en un solo sitio.
 *
 * El teléfono guarda **enteros epoch en milisegundos** (`src/db/local/schema.ts`)
 * y el servidor guarda `timestamptz`. La conversión es de dos líneas, y por eso
 * mismo es peligrosa: repartida por los endpoints, tarde o temprano uno divide
 * entre mil donde no debía y el registro queda fechado en 1970 sin que falle
 * nada. Aquí está una vez y se prueba una vez.
 *
 * La excepción deliberada es `bitacoras.fecha`, que **no pasa por aquí**: es
 * `YYYY-MM-DD` en hora local de Colombia y viaja como texto de punta a punta. La
 * jornada del 3 de marzo es el 3 de marzo en obra; convertirla a un instante la
 * correría de día en la frontera de la medianoche.
 */

/** Epoch en milisegundos → instante. `null` y `undefined` sobreviven como `null`. */
export function aInstante(ms: number | null | undefined): Date | null {
  if (ms === null || ms === undefined) return null;
  if (!Number.isFinite(ms)) {
    throw new RangeError(`Marca de tiempo no finita: ${ms}`);
  }
  return new Date(ms);
}

/** Instante → epoch en milisegundos, que es lo que espera el teléfono. */
export function aMilisegundos(instante: Date | null | undefined): number | null {
  if (instante === null || instante === undefined) return null;
  const ms = instante.getTime();
  if (Number.isNaN(ms)) {
    throw new RangeError('Instante inválido');
  }
  return ms;
}

/** Igual que `aInstante`, para columnas `NOT NULL`. */
export function aInstanteObligatorio(ms: number): Date {
  const instante = aInstante(ms);
  if (instante === null) {
    throw new RangeError('Se esperaba una marca de tiempo y llegó vacía');
  }
  return instante;
}

/**
 * El día de trabajo en obra.
 *
 * Se reexporta desde las reglas de jornada en vez de calcularlo aquí: es una
 * regla del negocio —qué cuenta como "hoy" para una obra en Colombia— y ya vivía
 * allí, donde la prueban las verificaciones.
 */
export { fechaDeJornada } from '@/shared/rules/jornada';
