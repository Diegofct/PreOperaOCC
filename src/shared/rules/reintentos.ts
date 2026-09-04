/**
 * Cuándo se vuelve a intentar un envío que falló.
 *
 * Vive aparte del `outbox` por la misma razón que `escalera.ts` vive aparte de
 * `intentos.ts`: aquí no hay I/O, así que `scripts/verificar-reglas.ts` puede
 * ejercitarla en Node sin arrancar un teléfono ni una base. La política es lo
 * que hay que poder probar; guardar el resultado es trivial.
 *
 * Dos decisiones, y las dos vienen de cómo es la señal en una obra:
 *
 *  1. **La espera crece.** La red no está caída: está intermitente. Reintentar
 *     cada segundo no adelanta el envío ni un milisegundo y sí vacía la batería
 *     de un equipo que tiene que aguantar la jornada entera.
 *
 *  2. **Los reintentos se acaban.** Un registro que falla veinte veces no falla
 *     por la señal: le pasa algo. Seguir intentándolo para siempre bloquearía la
 *     cola —el orden es estricto— y el operador nunca sabría que algo va mal. Al
 *     llegar al tope la fila se marca `fallida`, **deja de reintentarse sola** y
 *     la cifra sube a la pantalla del operador, que es lo único que hace que
 *     alguien la mire.
 *
 * Lo que **no** hace ninguna de las dos cosas es borrar nada. Un envío que no
 * sube se queda guardado en el teléfono; perder una jornada de campo por un
 * problema de red sería el peor fallo posible de este sistema.
 */

/** A partir de aquí la fila queda `fallida` y no se reintenta sola. */
export const INTENTOS_MAXIMOS = 8;

/** Tope de la espera. Más allá, esperar más no aporta nada. */
export const ESPERA_MAXIMA_MS = 60 * 60_000;

const ESPERA_BASE_MS = 5_000;

/**
 * Cuánto esperar tras `intentos` fallos seguidos.
 *
 * Duplica cada vez —5 s, 10 s, 20 s…— hasta el tope de una hora. Sin
 * aleatoriedad a propósito: los equipos de una obra no arrancan a la vez ni
 * fallan a la vez, así que no hay estampida que dispersar, y un número
 * predecible es un número que se puede probar.
 */
export function esperaDeReintento(intentos: number): number {
  if (intentos <= 0) return 0;
  const espera = ESPERA_BASE_MS * 2 ** (intentos - 1);
  return Math.min(espera, ESPERA_MAXIMA_MS);
}

/** Se agotaron los intentos: la fila deja de reintentarse sola. */
export function debeRendirse(intentos: number): boolean {
  return intentos >= INTENTOS_MAXIMOS;
}

/**
 * Qué le pasa a una fila de la cola tras un fallo.
 *
 * `definitivo` es para los errores que reintentar no arregla: el vehículo ya no
 * existe, el envío no valida contra el esquema. Ahí se agotan los intentos de
 * golpe en vez de gastar ocho reintentos en algo que va a fallar igual las ocho
 * veces.
 */
export interface ResultadoDeFallo {
  estado: 'pendiente' | 'fallida';
  intentos: number;
  proximoIntentoEn: number;
}

export function siguienteIntento(
  intentosPrevios: number,
  ahora: number,
  opciones: { definitivo?: boolean } = {},
): ResultadoDeFallo {
  const intentos = opciones.definitivo ? INTENTOS_MAXIMOS : intentosPrevios + 1;

  if (debeRendirse(intentos)) {
    // `proximoIntentoEn` se queda donde estaba: la fila ya no entra en la cola,
    // y dejar una fecha futura sugeriría que va a volver sola. No va.
    return { estado: 'fallida', intentos, proximoIntentoEn: 0 };
  }

  return { estado: 'pendiente', intentos, proximoIntentoEn: ahora + esperaDeReintento(intentos) };
}
