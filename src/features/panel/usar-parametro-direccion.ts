/**
 * Un dato de la pantalla que vive en la dirección de la página.
 *
 * Sirve para dos cosas de todos los días: **recargar sin perder lo que se estaba
 * mirando** —que es lo que pasa cuando alguien pulsa F5 por costumbre— y poder
 * pasarle a otro el enlace de lo que uno tiene delante, en vez de decirle «busca
 * "volqueta" y ponlo en la última semana».
 *
 * Estaba escrito dentro de `usar-listado-filtrado.ts` y solo sabía de la clave
 * `buscar`. Con la spec 006 el periodo de los preoperacionales necesita lo mismo
 * (RF-30), y la salida no era copiar treinta líneas cambiando una cadena: eso es
 * cómo se acaba con dos versiones que se comportan distinto cuando una de las dos
 * arregla un caso raro.
 *
 * ── Solo en el navegador ──
 *
 * En el celular no hay barra de direcciones. Si esto se ejecutara ahí, las dos
 * funciones no harían nada en vez de fallar — pero no se usa: es un ayudante del
 * panel, y el panel solo existe en la web.
 *
 * ── `replace` y no `push` ──
 *
 * Escribir en un buscador no debería llenar el historial de una entrada por letra
 * tecleada. Con `replace`, el botón de atrás del navegador sigue llevando a la
 * pantalla anterior y no a la letra anterior.
 */
import { useState } from 'react';
import { Platform } from 'react-native';

function disponible(): boolean {
  return Platform.OS === 'web' && typeof window !== 'undefined';
}

/** Lo que dice la dirección para esa clave, o el valor por defecto. */
function leer(clave: string, porDefecto: string): string {
  if (!disponible()) return porDefecto;
  return new URLSearchParams(window.location.search).get(clave) ?? porDefecto;
}

function escribir(clave: string, valor: string, porDefecto: string) {
  if (!disponible()) return;
  const url = new URL(window.location.href);
  // El valor por defecto no se escribe: una dirección limpia se comparte mejor
  // y se lee mejor que una llena de parámetros que no dicen nada.
  if (valor === porDefecto || valor.length === 0) url.searchParams.delete(clave);
  else url.searchParams.set(clave, valor);
  window.history.replaceState(null, '', url.toString());
}

/**
 * Como `useState`, pero el valor se guarda también en la dirección.
 *
 * Devuelve el valor y una función para cambiarlo, igual que `useState`, así que
 * sustituye a uno sin tocar nada más de la pantalla.
 */
export function useParametroDeDireccion(
  clave: string,
  porDefecto: string,
): [string, (valor: string) => void] {
  const [valor, setValor] = useState(() => leer(clave, porDefecto));

  return [
    valor,
    (nuevo: string) => {
      setValor(nuevo);
      escribir(clave, nuevo, porDefecto);
    },
  ];
}
