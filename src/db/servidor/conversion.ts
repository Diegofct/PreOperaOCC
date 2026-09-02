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
 * `YYYY-MM-DD` en hora de Colombia (UTC-5, sin horario de verano).
 *
 * Lo usa el panel para poner la fecha de hoy por defecto. Se calcula desplazando
 * el instante y leyendo la parte UTC, en vez de confiar en la zona horaria del
 * computador: el residente puede estar mirando el panel desde cualquier parte, y
 * la jornada que documenta siempre es la de la obra.
 */
export function fechaDeJornada(instante: Date = new Date()): string {
  const DESFASE_COLOMBIA_MS = 5 * 60 * 60 * 1000;
  return new Date(instante.getTime() - DESFASE_COLOMBIA_MS).toISOString().slice(0, 10);
}
