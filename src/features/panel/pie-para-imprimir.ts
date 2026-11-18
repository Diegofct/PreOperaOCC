/**
 * La línea de Kontrola en las páginas que el panel arma para imprimir (spec 049, RF-48):
 * los reportes y la respuesta del Asistente. Son HTML suelto que el navegador imprime o
 * guarda como PDF.
 *
 * Va en la **caja de margen** de `@page` (`@bottom-center`) y no como un bloque fijo al
 * fondo: un `position: fixed` se repite en cada página, pero dentro del área del contenido,
 * y tapa la última línea de la página. En el margen no estorba a nada. Chrome y Edge la
 * imprimen; un navegador que no conozca las cajas de margen simplemente no la pone.
 *
 * En pantalla se ve una sola vez, al final; al imprimir esa se oculta, porque ya va en
 * cada página. Sin dependencias de React Native: lo arma también la verificación en Node.
 */
import { Panel } from '@/constants/paleta';
import { MARCA } from '@/shared/catalogos/marca';

export const PIE_PARA_IMPRIMIR = {
  css: `
  @page { @bottom-center { content: "${MARCA.pie}"; font-family: system-ui, sans-serif; font-size: 9px; color: ${Panel.textoApoyo}; } }
  .pie-kontrola { margin-top: 18px; text-align: center; color: ${Panel.textoApoyo}; font-size: 10px; }
  @media print { .pie-kontrola { display: none; } }`,
  html: `<p class="pie-kontrola">${MARCA.pie}</p>`,
} as const;
