/**
 * Un campo de cifra del editor de la planificación (spec 045): guarda lo escrito mientras se escribe
 * («1.2» a medio camino de «1.25») y entrega el número cuando se puede leer; vacío es `null`. Lo usan
 * las pestañas de ítems, rubros e indirectos.
 */
import { useState } from 'react';

import { Campo } from '@/features/panel/componentes';
import { numero } from '@/shared/rules/formulario-presupuesto';

const aTexto = (n: number | null) => (n === null ? '' : String(n).replace('.', ','));
const numeroDe = (texto: string): number | null => (texto.trim() === '' ? null : numero(texto));

/** Un campo de cifra que guarda lo escrito y entrega el número cuando se puede leer. */
export function CampoCifra({
  etiqueta,
  valor,
  alCambiar,
  ancho,
  ayuda,
}: {
  etiqueta: string;
  valor: number | null;
  alCambiar: (n: number | null) => void;
  ancho: number;
  ayuda?: string;
}) {
  const [texto, setTexto] = useState(aTexto(valor));
  const leido = numeroDe(texto);
  return (
    <Campo
      etiqueta={etiqueta}
      valor={texto}
      onChange={(v) => {
        setTexto(v);
        const n = numeroDe(v);
        if (v.trim() === '' || n !== null) alCambiar(n);
      }}
      ancho={ancho}
      ayuda={ayuda}
      error={texto.trim() !== '' && leido === null ? 'Escriba un número.' : undefined}
    />
  );
}
