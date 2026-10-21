/**
 * Cómo se escribe un valor en pesos (spec 031, RF-70): «$ 54.441.800.920», con punto
 * de miles y sin decimales, que es como los escribe el formulario de OCC.
 *
 * A mano y no con `toLocaleString('es-CO', { style: 'currency' })`: el resultado de
 * `Intl` cambia entre motores (unos ponen espacio duro, otros «COP», otros decimales) y
 * un valor de contrato tiene que leerse igual en la pantalla, en el Excel y en las pruebas.
 */
export function enPesos(valor: number): string {
  const redondo = Math.round(valor);
  const signo = redondo < 0 ? '-' : '';
  const cifras = String(Math.abs(redondo)).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return `${signo}$ ${cifras}`;
}
