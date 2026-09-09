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
  // Añadidas en la spec 003. Todavía **sin formato de preoperacional**: OCC no
  // ha entregado su hoja de cálculo, así que se pueden registrar equipos de
  // estos tipos pero no levantarles un preoperacional. El panel lo avisa.
  { id: 'vibrocompactadora', nombre: 'Vibro Compactadora', claseMedidor: 'horometro', sinFormato: true },
  { id: 'recicladora', nombre: 'Recicladora', claseMedidor: 'horometro', sinFormato: true },
];

export const TIPOS_VEHICULO_POR_ID = new Map(TIPOS_VEHICULO.map((t) => [t.id, t]));

/** ¿Este tipo de equipo todavía no tiene formato de preoperacional? */
export function formatoPendiente(tipoVehiculoId: string | null | undefined): boolean {
  return tipoVehiculoId ? (TIPOS_VEHICULO_POR_ID.get(tipoVehiculoId)?.sinFormato ?? false) : false;
}
