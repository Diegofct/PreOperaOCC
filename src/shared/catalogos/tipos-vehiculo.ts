/**
 * Los tipos de equipo de OCC, en un solo sitio.
 *
 * Vivían dentro de `src/db/local/seed.ts`, que es donde nacieron. Salieron de
 * ahí porque ahora los siembran dos bases distintas —la SQLite del teléfono y
 * la Postgres del servidor— y **los slugs tienen que ser idénticos en las dos**:
 * son la llave foránea de `vehiculos.tipo_vehiculo_id` y de `plantillas`, y el
 * pull cruza filas por ese identificador. Si divergieran, el `onConflictDoNothing`
 * local y el snapshot del servidor estarían hablando de tablas distintas sin que
 * nada fallara a la vista. Con una sola fuente no pueden divergir.
 *
 * Los slugs son identificadores estables: no se renombran. Ya hay plantillas y
 * preoperacionales firmados apuntando a ellos.
 *
 * Módulo puro: sin I/O y sin dependencias, para que lo puedan importar tanto el
 * bundle de Hermes como los scripts de Node.
 */

/** Qué medidor lleva el equipo. Decide qué se le pide al operador en obra. */
export type ClaseMedidor = 'odometro' | 'horometro' | 'ambos';

export interface TipoVehiculo {
  /** Slug estable. Es la llave primaria en las dos bases. */
  id: string;
  nombre: string;
  claseMedidor: ClaseMedidor;
  /**
   * OCC todavía no ha entregado el formato de preoperacional de este tipo.
   * Se pueden registrar equipos, pero no inspeccionarlos: el panel lo avisa y
   * la app del operador lo explica en vez de quedarse en blanco.
   *
   * `scripts/verificar-reglas.ts` comprueba que esta marca y las plantillas que
   * existen de verdad no se separen.
   */
  sinFormato?: boolean;
  /**
   * Slug del tipo cuyo formato de preoperacional se usa para este (spec 020).
   *
   * OCC no tiene hoja propia para estas máquinas, pero indicó que la del tipo
   * más parecido sirve. El formato prestado es **el mismo documento**: mismas
   * preguntas y misma versión, con el título de este tipo. El origen tiene que
   * tener formato propio y medir con el mismo medidor; `verificar-reglas.ts` lo
   * comprueba.
   */
  formatoDe?: string;
}

export const TIPOS_VEHICULO: TipoVehiculo[] = [
  // Camioneta y volqueta se controlan por kilómetros recorridos, no por horas
  // de motor. Hasta la spec 003 pedían las dos lecturas porque el Excel de OCC
  // trae una casilla de horómetro; el horómetro se retira del formato en la v2
  // de sus plantillas. Las actas ya firmadas con la v1 conservan su lectura.
  { id: 'camioneta', nombre: 'Camioneta', claseMedidor: 'odometro' },
  { id: 'volqueta', nombre: 'Volqueta', claseMedidor: 'odometro' },
  { id: 'retroexcavadora', nombre: 'Retroexcavadora', claseMedidor: 'horometro' },
  { id: 'retrocargador', nombre: 'Retrocargador', claseMedidor: 'horometro' },
  { id: 'motoniveladora', nombre: 'Motoniveladora', claseMedidor: 'horometro' },
  // Añadidas en la spec 003 sin formato de preoperacional, porque OCC no había
  // entregado su hoja. Desde la spec 020 se revisan con uno prestado (`formatoDe`).
  // Spec 020: las dos toman prestado el de la motoniveladora (ruedas, sin brazo).
  {
    id: 'vibrocompactadora',
    nombre: 'Vibro Compactadora',
    claseMedidor: 'horometro',
    formatoDe: 'motoniveladora',
  },
  {
    id: 'recicladora',
    nombre: 'Recicladora',
    claseMedidor: 'horometro',
    formatoDe: 'motoniveladora',
  },
  // Añadidas en la spec 019, también sin formato al principio, por el mismo motivo. Los de
  // carretera van por kilómetros y la maquinaria por horas, como los anteriores.
  // El tipo es el oficio de la máquina, no su marca: el camión Ford es un
  // `camion` con «Ford» en la marca. El carrotanque va aparte del camión porque
  // OCC los controla por separado; la excavadora es la de llantas, y la de oruga
  // es otro tipo porque no rueda (no lleva posiciones de llanta).
  //
  // Spec 020: cada una se revisa con el formato de OCC más parecido. Los de
  // carretera, con el de la camioneta; la excavadora de llantas, con el del
  // retrocargador (ruedas, brazo y balde); la de oruga, con el de la
  // retroexcavadora (tren de rodaje); el montacargas, con el de la motoniveladora.
  {
    id: 'camion',
    nombre: 'Camión',
    claseMedidor: 'odometro',
    formatoDe: 'camioneta',
  },
  {
    id: 'carrotanque',
    nombre: 'Carrotanque',
    claseMedidor: 'odometro',
    formatoDe: 'camioneta',
  },
  {
    id: 'excavadora',
    nombre: 'Excavadora',
    claseMedidor: 'horometro',
    formatoDe: 'retrocargador',
  },
  {
    id: 'excavadora_oruga',
    nombre: 'Excavadora de oruga',
    claseMedidor: 'horometro',
    formatoDe: 'retroexcavadora',
  },
  {
    id: 'montacargas',
    nombre: 'Montacargas',
    claseMedidor: 'horometro',
    formatoDe: 'motoniveladora',
  },
  {
    id: 'carro_taller',
    nombre: 'Carro taller',
    claseMedidor: 'odometro',
    formatoDe: 'camioneta',
  },
];

export const TIPOS_VEHICULO_POR_ID = new Map(TIPOS_VEHICULO.map((t) => [t.id, t]));

/** ¿Este tipo de equipo todavía no tiene formato de preoperacional? */
export function formatoPendiente(tipoVehiculoId: string | null | undefined): boolean {
  return tipoVehiculoId ? (TIPOS_VEHICULO_POR_ID.get(tipoVehiculoId)?.sinFormato ?? false) : false;
}

/**
 * El nombre del tipo cuyo formato usa este, o `null` si su formato es propio o
 * no tiene ninguno (spec 020). Es lo que dice el panel: «Formato Camioneta».
 */
export function formatoPrestadoDe(tipoVehiculoId: string | null | undefined): string | null {
  const origen = tipoVehiculoId ? TIPOS_VEHICULO_POR_ID.get(tipoVehiculoId)?.formatoDe : undefined;
  return origen ? (TIPOS_VEHICULO_POR_ID.get(origen)?.nombre ?? null) : null;
}
