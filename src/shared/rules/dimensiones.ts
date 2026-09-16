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

/* ------------------------------------------------------------------------ */
/* Cantidad: cuánto se hizo, en la unidad de la actividad                    */
/* ------------------------------------------------------------------------ */

/**
 * De qué medida sale la cantidad según la unidad (spec 004, RF-67 a RF-69).
 *
 * Solo tres unidades se pueden leer en las medidas: un metro cúbico es un volumen,
 * un metro cuadrado un área y un metro una longitud. El acero (kg), las señales
 * (Und) y el transporte (m³-km) no: con largo, ancho y alto no se sabe cuántos
 * kilos se pusieron ni cuántos kilómetros recorrió cada metro cúbico. Esas se
 * escriben a mano, **aunque la actividad traiga medidas**.
 *
 * Las claves son las de `UNIDADES_DE_ACTIVIDAD` (`shared/catalogos/presupuesto.ts`),
 * escritas aquí para que la regla no dependa del catálogo; el guion de verificación
 * comprueba que coinciden.
 */
const MEDIDA_DE_LA_UNIDAD: Record<string, OrigenDeCantidad> = {
  m3: 'volumen',
  m2: 'area',
  m: 'longitud',
};

export type OrigenDeCantidad = 'volumen' | 'area' | 'longitud';

export interface CantidadResuelta {
  cantidad: number | null;
  /** Salió de una medida: se muestra pero no se deja escribir. */
  cantidadCalculada: boolean;
  /** De cuál, para decírselo a quien la lee («Del volumen»). */
  origen: OrigenDeCantidad | null;
}

/**
 * La cantidad de una actividad: tomada de su medida si la unidad la tiene y la
 * medida existe; si no, la escrita a mano, o nada (RF-74: no es obligatoria).
 *
 * Recibe las medidas **ya resueltas** por `calcularDimensiones`, así que el
 * volumen puede ser calculado o escrito: RF-68 dice «tenga volumen», no «volumen
 * calculado». Y como con el área y el volumen, lo escrito a mano solo se respeta
 * cuando no hay de dónde tomarla: si no, un número tecleado antes de completar las
 * medidas se quedaría como dato.
 *
 * Sin unidad —una actividad guardada antes del 2026-09-16— no se calcula nada.
 */
export function resolverCantidad(
  unidad: string | null,
  medidas: Pick<Dimensiones, 'longitud' | 'area' | 'volumen'>,
  cantidadEscrita: number | null,
): CantidadResuelta {
  const origen = unidad ? MEDIDA_DE_LA_UNIDAD[unidad] : undefined;
  const valor = origen ? medidas[origen] : null;

  if (origen && valor !== null) {
    return { cantidad: valor, cantidadCalculada: true, origen };
  }
  return { cantidad: cantidadEscrita, cantidadCalculada: false, origen: null };
}
