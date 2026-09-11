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
