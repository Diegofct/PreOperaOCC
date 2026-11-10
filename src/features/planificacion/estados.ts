/**
 * Cómo se nombra y se marca cada estado de una planificación en el panel (spec 043, RF-44,
 * RF-49). Va aparte de las pantallas porque la lista de versiones y el detalle la comparten, y el
 * color nunca va solo: siempre con su nombre.
 */
import type { EstadoDePlanificacion } from '@/shared/rules/planificacion';

export const NOMBRE_DE_ESTADO: Record<EstadoDePlanificacion, string> = {
  borrador: 'Borrador',
  vigente: 'Vigente',
  reemplazada: 'Reemplazada',
  anulada: 'Anulada',
  descartada: 'Descartada',
};

export const TONO_DE_ESTADO: Record<EstadoDePlanificacion, 'bueno' | 'atencion' | 'neutro' | 'malo'> = {
  vigente: 'bueno',
  borrador: 'atencion',
  reemplazada: 'neutro',
  anulada: 'malo',
  descartada: 'neutro',
};
