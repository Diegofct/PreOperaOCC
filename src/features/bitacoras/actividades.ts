/**
 * Catálogo de actividades de la bitácora.
 *
 * El formato en papel deja "Actividad" como texto libre, y por eso hoy nadie
 * puede sumar cuántas horas excavó una retroexcavadora en marzo: cada operador
 * escribe distinto — "excavando", "excavacion", "exc.". Con una lista corta el
 * operador da un toque en vez de teclear con guantes, y el dashboard puede
 * agrupar de verdad.
 *
 * PENDIENTE DE OCC: esta lista es un punto de partida sacado de lo que hacen
 * estas cinco máquinas. El área de SST y el residente de obra tienen que
 * validarla y decir qué falta o qué sobra. Mientras tanto, 'otra' recoge lo que
 * no encaje, y el dashboard mostrará qué escriben ahí — que es exactamente el
 * insumo para completar el catálogo.
 */

export interface Actividad {
  clave: string;
  nombre: string;
  /** Tipos de vehículo a los que aplica. Vacío = a todos. */
  tipos?: string[];
}

/** No es tiempo productivo. El dashboard las separa al calcular rendimiento. */
export const CLAVES_IMPRODUCTIVAS = ['espera', 'varado', 'mantenimiento', 'combustible'] as const;

export const ACTIVIDADES: Actividad[] = [
  { clave: 'excavacion', nombre: 'Excavación', tipos: ['retroexcavadora', 'retrocargador'] },
  { clave: 'cargue', nombre: 'Cargue de material', tipos: ['retroexcavadora', 'retrocargador'] },
  { clave: 'transporte', nombre: 'Transporte de material', tipos: ['volqueta', 'camioneta'] },
  { clave: 'descargue', nombre: 'Descargue de material', tipos: ['volqueta'] },
  { clave: 'nivelacion', nombre: 'Nivelación', tipos: ['motoniveladora'] },
  { clave: 'extendido', nombre: 'Extendido de material', tipos: ['motoniveladora', 'retrocargador'] },
  { clave: 'conformacion', nombre: 'Conformación de vía', tipos: ['motoniveladora'] },
  { clave: 'retiro_escombros', nombre: 'Retiro de escombros' },
  { clave: 'limpieza', nombre: 'Limpieza de zona' },
  { clave: 'traslado', nombre: 'Traslado del equipo' },
  { clave: 'combustible', nombre: 'Tanqueo de combustible' },
  { clave: 'mantenimiento', nombre: 'Mantenimiento' },
  { clave: 'espera', nombre: 'En espera / disponible' },
  { clave: 'varado', nombre: 'Varado / fuera de servicio' },
  { clave: 'otra', nombre: 'Otra actividad' },
];

export const CLAVE_OTRA = 'otra';

/**
 * Las actividades que se le muestran al operador de esta máquina.
 *
 * Se filtran por tipo de vehículo para que la lista quepa en una pantalla: no
 * tiene sentido ofrecerle "nivelación" al conductor de una camioneta.
 */
export function actividadesDe(tipoVehiculo: string): Actividad[] {
  return ACTIVIDADES.filter((a) => !a.tipos || a.tipos.includes(tipoVehiculo));
}

export function nombreDeActividad(clave: string): string {
  return ACTIVIDADES.find((a) => a.clave === clave)?.nombre ?? clave;
}

export function esImproductiva(clave: string): boolean {
  return (CLAVES_IMPRODUCTIVAS as readonly string[]).includes(clave);
}
