/**
 * El área y el volumen de una actividad del parte. Funciones puras, sin I/O.
 *
 * Hasta el 2026-09-15 se escribían a mano, porque faltaba decidir en qué unidad
 * se mide cada actividad y un cálculo sin eso habría sido correcto unas veces y
 * absurdo otras. OCC lo decidió: **se multiplica lo que se escribe, en la unidad
 * en que se escriba** (spec 004, RF-58 a RF-60).
 *
 * ── Por qué aquí y no en la pantalla ──
 *
 * La pantalla lo necesita para enseñar el resultado mientras se teclea, y el
 * servidor para guardarlo. Si solo lo calculara la pantalla, una petición hecha
 * por fuera guardaría un área que no cuadra con su largo y su ancho; si cada uno
 * lo escribiera por su lado, el día que discreparan no sabríamos cuál vale. Hay
 * una sola regla y la llaman los dos, y cuando difieren, manda el servidor.
 *
 * ── Calculado cuando se puede, a mano cuando no ──
 *
 * Las medidas siguen siendo opcionales (RF-25): no todo se mide en largo, ancho
 * y alto. Una limpieza de zona puede traer solo su área. Así que:
 *
 *  · Con largo y ancho, el área **se calcula** y lo escrito a mano no cuenta.
 *    Si contara, un 99 tecleado por error se quedaría como dato.
 *  · Sin alguno de los dos, el área es la que se escribió, o nada.
 *  · Lo mismo con el volumen y sus tres factores.
 *
 * Los flags `areaCalculada` y `volumenCalculado` existen para la pantalla: un
 * campo calculado se muestra pero no se deja escribir, porque escribir en él no
 * serviría de nada.
 */

export interface Dimensiones {
  longitud: number | null;
  ancho: number | null;
  alto: number | null;
  /** Lo que se escribió a mano. Solo se respeta si no se puede calcular. */
  area: number | null;
  /** Ídem. */
  volumen: number | null;
}

export interface DimensionesResueltas extends Dimensiones {
  /** El área salió de multiplicar largo por ancho. */
  areaCalculada: boolean;
  /** El volumen salió de multiplicar largo por ancho por alto. */
  volumenCalculado: boolean;
}

/**
 * Dos decimales, que es lo que se mide en obra.
 *
 * El `EPSILON` corrige lo que la coma flotante hace con los productos:
 * 1,15 × 1,15 da 1,3224999…, y sin él redondearía hacia abajo lo que en papel
 * es 1,3225.
 */
function redondear(valor: number): number {
  return Math.round((valor + Number.EPSILON) * 100) / 100;
}

/** Área y volumen de una actividad: calculados si están sus factores, a mano si no. */
export function calcularDimensiones(medidas: Dimensiones): DimensionesResueltas {
  const { longitud, ancho, alto } = medidas;

  const areaCalculada = longitud !== null && ancho !== null;
  const volumenCalculado = areaCalculada && alto !== null;

  return {
    longitud,
    ancho,
    alto,
    area: areaCalculada ? redondear(longitud * ancho) : medidas.area,
    volumen: volumenCalculado ? redondear(longitud * ancho * alto) : medidas.volumen,
    areaCalculada,
    volumenCalculado,
  };
}
