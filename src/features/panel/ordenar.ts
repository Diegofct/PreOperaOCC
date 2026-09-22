/**
 * Ordenar las filas de una tabla del panel como las ordenaría una persona.
 *
 * Tres decisiones que no se ven a simple vista (spec 015):
 *
 * - **Sin tildes ni mayúsculas** (RF-12). «álvaro» escrito en minúscula va junto a
 *   «Álvarez», no al final de la lista: un orden que depende de cómo se tecleó el
 *   nombre al registrarlo no lo entiende nadie.
 * - **Los vacíos al final, en los dos sentidos** (RF-13). Quien ordena por obra
 *   quiere ver las obras; las personas sin obra delante de todo, al invertir,
 *   esconderían justo lo que buscaba.
 * - **El empate se resuelve por nombre, siempre de la A a la Z.** Dentro de los
 *   quince operadores se busca a uno por su nombre, y leerlos de la Z a la A por
 *   haber invertido el cargo no ayuda a nadie.
 *
 * Los números se comparan como números (`numeric`): los documentos «9», «10» y
 * «100» tienen que salir en ese orden y no como texto.
 *
 * Vive aparte y sin nada de `react-native` para que el guion de verificación, que
 * corre en Node, la pueda probar.
 */
import { normalizar } from '@/shared/rules/texto';

export type Sentido = 'asc' | 'desc';

/** Por qué columna y en qué sentido está ordenada una tabla. */
export interface Orden {
  clave: string;
  sentido: Sentido;
}

/**
 * El orden que queda al pulsar el título de una columna (RF-9, RF-10).
 *
 * La primera vez, de la A a la Z; la misma columna otra vez, al revés. Cambiar
 * de columna vuelve a empezar por la A: heredar el «Z→A» de la columna anterior
 * sorprendería justo cuando alguien empieza a mirar otra cosa.
 */
export function ordenTrasPulsar(actual: Orden, clave: string): Orden {
  if (actual.clave !== clave) return { clave, sentido: 'asc' };
  return { clave, sentido: actual.sentido === 'asc' ? 'desc' : 'asc' };
}

/**
 * Lee el orden que el navegador tenía guardado (RF-16, RF-17).
 *
 * Lo guardado no es de fiar: puede venir de una versión anterior del panel con
 * otras columnas, o estar roto. Cualquier cosa que no sea un orden válido para
 * esta tabla devuelve el de siempre, nunca una tabla sin orden.
 */
export function leerOrdenGuardado(
  texto: string | null,
  clavesValidas: readonly string[],
  porDefecto: Orden,
): Orden {
  if (texto === null) return porDefecto;
  let leido: unknown;
  try {
    leido = JSON.parse(texto);
  } catch {
    return porDefecto;
  }
  if (typeof leido !== 'object' || leido === null || Array.isArray(leido)) return porDefecto;
  const { clave, sentido } = leido as Record<string, unknown>;
  if (typeof clave !== 'string' || !clavesValidas.includes(clave)) return porDefecto;
  if (sentido !== 'asc' && sentido !== 'desc') return porDefecto;
  return { clave, sentido };
}

function comparar(a: string, b: string): number {
  return normalizar(a).localeCompare(normalizar(b), 'es', { numeric: true });
}

function vacio(valor: string | null | undefined): valor is null | undefined | '' {
  return valor === null || valor === undefined || valor.trim() === '';
}

/**
 * Devuelve una copia ordenada; la lista recibida no se toca.
 *
 * @param valorDe  el texto de la columna por la que se ordena
 * @param sentido  `asc` es de la A a la Z
 * @param desempate  el texto con que se decide un empate (el nombre, en Personas)
 */
export function ordenarFilas<T>(
  filas: readonly T[],
  valorDe: (fila: T) => string | null | undefined,
  sentido: Sentido,
  desempate: (fila: T) => string,
): T[] {
  const signo = sentido === 'asc' ? 1 : -1;
  return [...filas].sort((filaA, filaB) => {
    const a = valorDe(filaA);
    const b = valorDe(filaB);
    const aVacio = vacio(a);
    const bVacio = vacio(b);

    if (!aVacio && !bVacio) {
      const diferencia = comparar(a, b);
      if (diferencia !== 0) return diferencia * signo;
    } else if (aVacio !== bVacio) {
      // El vacío va detrás sin importar el sentido: no se multiplica por el signo.
      return aVacio ? 1 : -1;
    }

    return comparar(desempate(filaA), desempate(filaB));
  });
}
