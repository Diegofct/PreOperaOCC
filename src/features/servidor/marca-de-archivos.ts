/**
 * La marca de Kontrola en los Excel que genera el servidor (spec 049).
 *
 * Todo Excel que sale del sistema lleva a Kontrola como autor (RF-30) y la línea
 * «Generado con Kontrola · Grupo HS» al pie (RF-29, RF-33). La línea va en el **pie de
 * página de impresión** de cada hoja y nunca en una celda (RF-46): varias de estas hojas
 * se vuelven a subir —la planificación, el plan semanal, las planillas del almacén— y quien
 * las lee recorre filas y celdas. Una fila más al final se leería como un renglón de datos,
 * y además estorbaría las sumas por columna que la gente hace sobre la hoja (RF-47).
 *
 * Se llama justo antes de escribir el archivo, cuando ya están todas las hojas: una hoja
 * añadida después quedaría sin pie. Cada `new ExcelJS.Workbook()` que se descarga pasa por
 * aquí; antes cada uno ponía su propio autor, y ya había tres nombres distintos.
 */
import type ExcelJS from 'exceljs';

import { MARCA } from '@/shared/catalogos/marca';

/** `&C` centra el texto en el pie de página de Excel. */
const PIE_CENTRADO = `&C${MARCA.pie}`;

export function marcarLibro(libro: ExcelJS.Workbook): void {
  libro.creator = MARCA.autor;
  libro.lastModifiedBy = MARCA.autor;
  for (const hoja of libro.worksheets) {
    hoja.headerFooter.oddFooter = PIE_CENTRADO;
    hoja.headerFooter.evenFooter = PIE_CENTRADO;
  }
}
