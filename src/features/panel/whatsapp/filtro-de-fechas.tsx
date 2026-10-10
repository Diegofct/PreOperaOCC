/**
 * El filtro «Desde / Hasta» de las listas de Reportes de WhatsApp (spec 025, RF-45 a
 * RF-51, RF-54).
 *
 * Las fechas viven en la dirección de la página: al recargar o al compartir el enlace
 * se ve el mismo rango (RF-54), y como el historial, «No se pudo guardar» y «Creado
 * automáticamente» son pestañas de la misma página, las tres miran el mismo rango.
 * Sin fechas, la última semana (RF-49). Un rango mal escrito no se consulta: la lista
 * se queda con el último rango bueno y el campo dice qué falla (RF-50, RF-51), con la
 * misma regla que aplica la ruta.
 */
import { useState } from 'react';

import { fechaDeJornada } from '@/shared/rules/jornada';
import {
  MENSAJES_DE_RANGO,
  rangoDeFechas,
  rangoPorDefecto,
  type RangoDeFechas,
} from '@/shared/rules/rango';

import { CampoDeFecha } from '../componentes';
import { useParametroDeDireccion } from '../usar-parametro-direccion';

export interface FiltroDeFechas {
  desde: string;
  hasta: string;
  cambiarDesde: (v: string) => void;
  cambiarHasta: (v: string) => void;
  /** El último rango válido: el que se consulta. */
  consultado: RangoDeFechas;
  /** Qué falla en lo escrito, o `null`. */
  error: { campo: 'desde' | 'hasta'; mensaje: string } | null;
}

export function useFiltroDeFechas(): FiltroDeFechas {
  const hoy = fechaDeJornada();
  const porDefecto = rangoPorDefecto(hoy);
  const [desde, cambiarDesde] = useParametroDeDireccion('desde', porDefecto.desde);
  const [hasta, cambiarHasta] = useParametroDeDireccion('hasta', porDefecto.hasta);

  const leido = rangoDeFechas(desde, hasta, hoy);
  const [consultado, setConsultado] = useState<RangoDeFechas>(() => ('error' in leido ? porDefecto : leido));
  // Un rango nuevo y válido pasa a consultarse; uno con error deja el anterior.
  if (!('error' in leido) && (leido.desde !== consultado.desde || leido.hasta !== consultado.hasta)) {
    setConsultado(leido);
  }

  // El formato se marca en el campo que lo tiene; el orden y el largo, en «Hasta».
  const desdeMalEscrito = 'error' in leido && 'error' in rangoDeFechas(desde, desde, hoy);
  const error =
    'error' in leido
      ? { campo: desdeMalEscrito ? ('desde' as const) : ('hasta' as const), mensaje: MENSAJES_DE_RANGO[leido.error] }
      : null;

  return { desde, hasta, cambiarDesde, cambiarHasta, consultado, error };
}

/**
 * Los dos campos, con el calendario del navegador (spec 026, RF-24, RF-28): «Hasta» no
 * ofrece días anteriores a «Desde», ni «Desde» posteriores a «Hasta».
 */
export function CamposDeFechas({ filtro }: { filtro: FiltroDeFechas }) {
  return (
    <>
      <CampoDeFecha
        etiqueta="Desde"
        valor={filtro.desde}
        onChange={filtro.cambiarDesde}
        max={filtro.hasta || undefined}
        error={filtro.error?.campo === 'desde' ? filtro.error.mensaje : undefined}
      />
      <CampoDeFecha
        etiqueta="Hasta"
        valor={filtro.hasta}
        onChange={filtro.cambiarHasta}
        min={filtro.desde || undefined}
        error={filtro.error?.campo === 'hasta' ? filtro.error.mensaje : undefined}
      />
    </>
  );
}
