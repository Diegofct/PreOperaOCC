/**
 * ¿Es un celular? (spec 026, RF-33 a RF-41). Por debajo de `AnchoCelular` los
 * componentes del panel cambian su estilo —una columna, tablas que se desplazan,
 * ventanas a pantalla completa— y las pantallas no se enteran. En escritorio todo
 * queda como estaba (RF-41).
 */
import { useWindowDimensions } from 'react-native';

import { AnchoCelular } from '@/constants/medidas';

export function useEsAngosto(): boolean {
  const { width } = useWindowDimensions();
  // Sin medida todavía (el primer pintado), se supone escritorio, como el menú.
  return width > 0 && width < AnchoCelular;
}
