/**
 * Cómo se leen y se muestran los horómetros y odómetros (spec 039, RF-15 a RF-17).
 *
 * En obra se reportan con coma («4250,32 km») o con punto («4250.32»), y el panel
 * los mostraba con formato colombiano («4.250,3»). Desde la 039 una lectura se lee
 * así y se muestra siempre con **punto decimal y sin separador de miles**:
 *
 *  · «4250,32» y «4250.32» son 4250.32;
 *  · el punto siempre es decimal: «5.830» es 5.83 (decisión del usuario, 3-nov);
 *  · si vienen los dos signos, el último es el decimal y el otro se ignora:
 *    «4.250,32» y «4,250.32» son 4250.32;
 *  · se guarda con hasta dos decimales.
 *
 * Las demás cifras del panel (pesos, cantidades) siguen en formato colombiano: esto
 * es solo para las lecturas de los medidores.
 */

/** Los decimales con que se guarda y se muestra una lectura. */
export const DECIMALES_DE_LECTURA = 2;

/** Redondea a dos decimales sin arrastrar el error de coma flotante (4250.325 → 4250.33). */
export function redondearLectura(valor: number): number {
  const factor = 10 ** DECIMALES_DE_LECTURA;
  return Math.round((valor + Number.EPSILON) * factor) / factor;
}

/** ¿Tiene a lo sumo dos decimales? Para los contratos: 4250.32 sí, 4250.321 no. */
export function tieneDecimalesDeLectura(valor: number): boolean {
  return Math.abs(redondearLectura(valor) - valor) < 1e-9;
}

/**
 * Lee una lectura escrita como llega: con coma o con punto, con espacios o con la
 * unidad pegada («812 h», «4250,32 km»). `null` si no es un número o es negativo.
 * Un número ya numérico se redondea y se devuelve tal cual.
 */
export function leerLectura(entrada: string | number | null | undefined): number | null {
  if (entrada === null || entrada === undefined) return null;
  if (typeof entrada === 'number') {
    return Number.isFinite(entrada) && entrada >= 0 ? redondearLectura(entrada) : null;
  }
  let texto = entrada
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '')
    .replace(/(km|kms|horas|hora|hrs|hr|h)\.?$/, '');
  if (texto === '' || !/^[0-9.,]+$/.test(texto)) return null;

  const ultimaComa = texto.lastIndexOf(',');
  const ultimoPunto = texto.lastIndexOf('.');
  const decimal = Math.max(ultimaComa, ultimoPunto);
  if (decimal >= 0) {
    // El último signo es el decimal; los demás, de cualquier clase, se ignoran.
    texto = `${texto.slice(0, decimal).replace(/[.,]/g, '')}.${texto.slice(decimal + 1).replace(/[.,]/g, '')}`;
  }
  if (texto === '.') return null;
  const valor = Number(texto);
  return Number.isFinite(valor) && valor >= 0 ? redondearLectura(valor) : null;
}

/**
 * Una lectura como se lee en pantalla: «4250.32», «812.5», «1200» (sin ceros de
 * más ni separador de miles). Con unidad: «4250.32 km». Vacío si no hay lectura.
 */
export function mostrarLectura(valor: number | null | undefined, unidad?: string): string {
  if (valor === null || valor === undefined || !Number.isFinite(valor)) return '';
  const texto = String(redondearLectura(valor));
  return unidad ? `${texto} ${unidad}` : texto;
}
