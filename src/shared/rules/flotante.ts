/**
 * Dónde se abre la lista de un selector. Funciones puras, sin I/O.
 *
 * Hasta la spec 007 la lista caía siempre hacia abajo, pegada al botón y dentro
 * de su tarjeta. Al fondo de la pantalla se abría fuera de la vista —el filtro
 * de estado de Vehículos, visto en el navegador el 2026-09-15— y dentro de una
 * tarjeta la tapaba lo que venía después. La lista pasa a pintarse en una capa
 * por encima de la página, y entonces alguien tiene que decidir dónde ponerla:
 * eso es esto (RF-3).
 *
 * Está aquí y no en el componente por lo mismo que `texto.ts`: el guion de
 * verificación corre en Node, y la cuenta de «¿cabe abajo?» es la clase de
 * aritmética que se rompe en un borde sin que nadie lo vea hasta que pasa.
 *
 * Todas las medidas llegan de fuera, en píxeles de la ventana del navegador. La
 * regla no conoce el tema: se las pasa quien la llama.
 */

export interface MedidasDeLista {
  /** Borde superior del botón del selector, medido en la ventana. */
  botonY: number;
  botonAlto: number;
  /** Lo que mediría la lista si cupiera entera. */
  altoLista: number;
  altoPantalla: number;
  /** Aire entre el botón y la lista. */
  separacion: number;
  /** Lo mínimo que se deja libre contra el borde de la pantalla. */
  margen: number;
  /**
   * Por debajo de esto, abajo «no cabe»: una lista de dos renglones con barra de
   * desplazamiento no sirve para elegir, aunque técnicamente quepa.
   */
  altoMinimo: number;
}

export interface ColocacionDeLista {
  hacia: 'abajo' | 'arriba';
  /** Borde superior de la lista, en la ventana. */
  top: number;
  /** Alto que se le da: el suyo, o el que quepa. */
  alto: number;
}

/**
 * Abajo si cabe; arriba si abajo no cabe y arriba hay más sitio; y si en ninguno
 * de los dos llega al mínimo, donde quepa más. En cualquier caso, recortada al
 * espacio que tiene y nunca con alto negativo.
 */
export function colocarLista(m: MedidasDeLista): ColocacionDeLista {
  const espacioAbajo = Math.max(
    0,
    m.altoPantalla - (m.botonY + m.botonAlto) - m.separacion - m.margen,
  );
  const espacioArriba = Math.max(0, m.botonY - m.separacion - m.margen);

  const cabeAbajo = espacioAbajo >= Math.min(m.altoLista, m.altoMinimo);

  if (cabeAbajo || espacioAbajo >= espacioArriba) {
    return {
      hacia: 'abajo',
      top: m.botonY + m.botonAlto + m.separacion,
      alto: Math.min(m.altoLista, espacioAbajo),
    };
  }

  const alto = Math.min(m.altoLista, espacioArriba);
  return { hacia: 'arriba', top: m.botonY - m.separacion - alto, alto };
}
