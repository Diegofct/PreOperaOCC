/**
 * Cuánto puede encogerse una columna de tabla. Spec 022, RF-27.
 *
 * Aparte de `componentes.tsx` y sin React, para que `verificar-reglas.ts` haga la
 * misma cuenta que la tabla al comprobar que todas caben: dos cuentas escritas en
 * dos sitios acaban diciendo cosas distintas.
 */
import { EncogimientoColumna } from '@/constants/medidas';

/**
 * El ancho por debajo del cual la columna no baja.
 *
 * Sin `anchoMinimo` propio, el `EncogimientoColumna` de su ancho. Una columna que
 * no debe encogerse —los botones, que no se parten— declara su mínimo igual a su
 * ancho. Nunca pasa del ancho: un mínimo mayor sería una columna que crece.
 */
export function anchoMinimoDeColumna(ancho: number, anchoMinimo?: number): number {
  return Math.min(ancho, anchoMinimo ?? Math.round(ancho * EncogimientoColumna));
}
