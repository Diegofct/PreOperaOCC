/**
 * Abre un libro de Excel y lo devuelve como filas de celdas, una matriz por hoja, para
 * `leerFormulario` (spec 031, RF-41). **Solo servidor**: es, con `reportes/servidor/
 * excel.ts`, uno de los dos sitios que importan `exceljs`.
 *
 * Aquí no se decide nada del presupuesto: solo se aplana lo que `exceljs` entrega en
 * formas distintas —un número, un texto, el resultado de una fórmula, un texto con
 * formato— a número, texto o vacío. Las fórmulas valen por su resultado guardado: es
 * lo que se ve al abrir el archivo.
 */
import ExcelJS from 'exceljs';

import type { Celda } from '@/shared/rules/formulario-presupuesto';

function celda(valor: ExcelJS.CellValue): Celda {
  if (valor === null || valor === undefined) return null;
  if (typeof valor === 'number' || typeof valor === 'string') return valor;
  if (typeof valor === 'boolean') return valor ? 'VERDADERO' : 'FALSO';
  if (valor instanceof Date) return valor.toISOString().slice(0, 10);
  if ('result' in valor) return celda((valor.result ?? null) as ExcelJS.CellValue);
  if ('richText' in valor) return valor.richText.map((t) => t.text).join('');
  if ('text' in valor) return String(valor.text);
  return null;
}

/** Las hojas del libro como matrices: `[hoja][fila][columna]`, empezando en 0. */
export async function hojasDelLibro(contenido: ArrayBuffer): Promise<Celda[][][]> {
  const libro = new ExcelJS.Workbook();
  await libro.xlsx.load(contenido);
  return libro.worksheets.map((hoja) => {
    const filas: Celda[][] = [];
    for (let r = 1; r <= hoja.rowCount; r++) {
      const fila = hoja.getRow(r);
      const celdas: Celda[] = [];
      for (let c = 1; c <= hoja.columnCount; c++) celdas.push(celda(fila.getCell(c).value));
      filas.push(celdas);
    }
    return filas;
  });
}
