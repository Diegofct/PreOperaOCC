/**
 * Cuánto puede encogerse una columna de tabla. Spec 022, RF-27.
 *
 * Aparte de `componentes.tsx` y sin React, para que `verificar-reglas.ts` haga la
 * misma cuenta que la tabla al comprobar que todas caben: dos cuentas escritas en
 * dos sitios acaban diciendo cosas distintas.
 */
import { AnchoCrecenColumnas, EncogimientoColumna } from '@/constants/medidas';

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

/** Lo que una columna dice de sí misma para pintarse como tarjeta (spec 050). */
export interface MarcasDeColumna {
  clave: string;
  principal?: boolean;
  acciones?: boolean;
}

/**
 * Cómo se reparte una fila en su tarjeta (spec 050, RF-33 a RF-37): el dato principal arriba, los demás
 * en medio y los botones al pie.
 *
 * Sin marcas, lo principal es la primera columna y los botones son la de clave `acciones`, que es como
 * están escritas casi todas las tablas del panel. Una tabla donde no es así lo dice con `principal` (una
 * fecha primero) o con `acciones` (botones con otra clave). Sin columna de botones no hay pie (RF-37).
 */
export function partesDeLaTarjeta(columnas: readonly MarcasDeColumna[]): {
  principal: string | null;
  datos: string[];
  acciones: string[];
} {
  const esAccion = (c: MarcasDeColumna) => c.acciones === true || (c.acciones === undefined && c.clave === 'acciones');
  const acciones = columnas.filter(esAccion).map((c) => c.clave);
  const marcada = columnas.find((c) => c.principal && !esAccion(c));
  const principal = (marcada ?? columnas.find((c) => !esAccion(c)))?.clave ?? null;
  const datos = columnas.filter((c) => !esAccion(c) && c.clave !== principal).map((c) => c.clave);
  return { principal, datos, acciones };
}

/**
 * Si una tabla se pinta como tarjetas (spec 050, RF-33, RF-41, RF-70, RF-71, D6): una lista, en el celular
 * siempre, y desde 768 px cuando su marco es más angosto que la tabla con todas sus columnas encogidas del
 * todo. Una cuadrícula, nunca: se desplaza dentro de su marco (RF-72).
 *
 * Con `marco = 0` —el primer pintado, antes de medir— se supone que cabe, igual que `useEsAngosto` supone
 * escritorio: así la tabla no parpadea a tarjetas y vuelta en cada pantalla de escritorio.
 */
export function seMuestraEnTarjetas({
  tipo,
  angosto,
  marco,
  minimo,
}: {
  tipo: 'lista' | 'cuadricula';
  angosto: boolean;
  marco: number;
  minimo: number;
}): boolean {
  if (tipo === 'cuadricula') return false;
  return angosto || (marco > 0 && marco < minimo);
}

/**
 * Cuánto crece una columna con sitio de sobra (spec 050, RF-74). Hasta `AnchoCrecenColumnas`, nada: la tabla
 * se ve como se midió. Por encima, en proporción a su ancho —`flexGrow` igual al ancho—, para que el sitio
 * ganado se reparta como estaban repartidas las columnas: la del nombre crece más que la de la fecha, y la de
 * los botones, que tiene su mínimo igual a su ancho, crece lo suyo sin que sus botones se estiren.
 */
export function crecimientoDeColumna(ancho: number, anchoDeVentana: number): number {
  return anchoDeVentana > AnchoCrecenColumnas ? ancho : 0;
}
