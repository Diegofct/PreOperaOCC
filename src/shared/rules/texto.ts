/**
 * Comparar texto como lo compara una persona.
 *
 * Vive en `shared/rules` y no junto a la pantalla que lo usa por una razón
 * práctica: el guion de verificación corre en Node y no puede importar nada que
 * arrastre `react-native`. Una función de texto no tiene por qué depender de la
 * interfaz, y sacarla de ahí es lo que permite comprobarla.
 */

/**
 * Sin tildes, sin mayúsculas y sin espacios de sobra.
 *
 * Buscar «topografo» tiene que encontrar a «Topógrafo». En una obra nadie
 * escribe con tildes en un buscador, y un buscador que exige escribirlas es un
 * buscador que no se usa.
 */
export function normalizar(texto: string): string {
  return texto
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

/**
 * Cu\u00e1ntas opciones aguanta un selector antes de pedir un buscador (spec 007, RF-12).
 *
 * Ocho se leen de un vistazo. Con m\u00e1s \u2014los quince cargos, cincuenta veh\u00edculos\u2014 se
 * recorre la lista con la vista, y ah\u00ed escribir tres letras es m\u00e1s r\u00e1pido.
 */
const OPCIONES_SIN_BUSCADOR = 8;

export function ofreceBusqueda(cuantas: number): boolean {
  return cuantas > OPCIONES_SIN_BUSCADOR;
}

/**
 * Las opciones de un selector que casan con lo escrito (spec 007, RF-13).
 *
 * Cuenta tambi\u00e9n el detalle, no solo el r\u00f3tulo: el selector de veh\u00edculos pone el
 * tipo debajo del c\u00f3digo, y quien busca \u00abvolqueta\u00bb est\u00e1 buscando por el tipo.
 * Sin texto devuelve todas, en el orden en que llegaron.
 */
export function filtrarOpciones<T extends { etiqueta: string; detalle?: string }>(
  opciones: readonly T[],
  texto: string,
): T[] {
  const buscado = normalizar(texto);
  if (buscado === '') return [...opciones];
  return opciones.filter((opcion) =>
    normalizar(`${opcion.etiqueta} ${opcion.detalle ?? ''}`).includes(buscado),
  );
}
