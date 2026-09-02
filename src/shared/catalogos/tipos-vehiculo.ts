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
}

export const TIPOS_VEHICULO: TipoVehiculo[] = [
  { id: 'camioneta', nombre: 'Camioneta', claseMedidor: 'ambos' },
  { id: 'volqueta', nombre: 'Volqueta', claseMedidor: 'ambos' },
  { id: 'retroexcavadora', nombre: 'Retroexcavadora', claseMedidor: 'horometro' },
  { id: 'retrocargador', nombre: 'Retrocargador', claseMedidor: 'horometro' },
  { id: 'motoniveladora', nombre: 'Motoniveladora', claseMedidor: 'horometro' },
];

export const TIPOS_VEHICULO_POR_ID = new Map(TIPOS_VEHICULO.map((t) => [t.id, t]));
