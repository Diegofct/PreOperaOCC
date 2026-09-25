/**
 * El estado y el veredicto de un ensayo, como etiquetas (spec 018, RF-62).
 *
 * Aparte porque las usan el listado, la pantalla del ensayo y la sección del parte:
 * escritas en una, las otras dependerían de una pantalla para pintar una etiqueta.
 * El texto va siempre, con símbolo en el veredicto: el color nunca es la única señal.
 */
import { ETIQUETA_ESTADO_ENSAYO, type EstadoVisibleEnsayo } from '@/shared/rules/granulometria';

import { Etiqueta } from '@/features/panel/componentes';

/** El tono de cada estado. El texto va siempre: el color nunca es la única señal. */
const TONO_DE_ESTADO: Record<EstadoVisibleEnsayo, 'neutro' | 'atencion' | 'malo' | 'bueno'> = {
  borrador: 'neutro',
  enviado: 'atencion',
  devuelto: 'atencion',
  aprobado: 'bueno',
  anulado: 'malo',
  descartado: 'neutro',
};

/** El veredicto con símbolo y texto (RF-62). */
export function EtiquetaDeVeredicto({ veredicto }: { veredicto: 'cumple' | 'no_cumple' | null }) {
  if (veredicto === 'cumple') return <Etiqueta tono="bueno">✓ CUMPLE</Etiqueta>;
  if (veredicto === 'no_cumple') return <Etiqueta tono="malo">✗ NO CUMPLE</Etiqueta>;
  return <Etiqueta tono="neutro">— Sin veredicto</Etiqueta>;
}

export function EtiquetaDeEstado({ estado }: { estado: EstadoVisibleEnsayo }) {
  return <Etiqueta tono={TONO_DE_ESTADO[estado]}>{ETIQUETA_ESTADO_ENSAYO[estado]}</Etiqueta>;
}
