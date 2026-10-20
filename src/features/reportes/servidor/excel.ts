/**
 * Un reporte en un libro de Excel (spec 030, RF-9). **Solo servidor.**
 *
 * **Es el único archivo del módulo que sabe que detrás está `exceljs`**, como
 * `almacen-obra/servidor/excel.ts`: lo importa solo la ruta de descarga, para que la
 * librería no llegue al navegador. Qué dice cada celda lo decide `../exportar.ts`,
 * que es puro; aquí se escribe el libro.
 *
 * Cada hoja lleva arriba la obra, el reporte, el periodo y cuándo se generó, para
 * que el archivo se entienda solo cuando se reenvía.
 */
import ExcelJS from 'exceljs';

import {
  hojasDelReporte,
  nombreDelArchivo,
  textoDelPeriodo,
  TITULO_DE_PESTANA,
  type HojaDeReporte,
} from '../exportar';
import type { PedidoDeReporte } from './datos';
import { reporteDe, type PestanaDeReporte } from './reportes';

export const TIPO_XLSX = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

/** Las filas de arriba antes de los encabezados: título, periodo y una vacía. */
const FILAS_DEL_TITULO = 3;

const FORMATO: Record<string, string> = { numero: '#,##0.##', entero: '0' };

function escribirHoja(libro: ExcelJS.Workbook, hoja: HojaDeReporte, titulo: string, subtitulo: string) {
  // Excel no deja más de 31 caracteres ni algunos signos en el nombre de una hoja.
  const nueva = libro.addWorksheet(hoja.nombre.replace(/[\/?*[\]:]/g, ' ').slice(0, 31));
  nueva.addRow([titulo]).font = { bold: true, size: 13 };
  nueva.addRow([subtitulo]);
  nueva.addRow([]);
  const encabezado = nueva.addRow(hoja.encabezados);
  encabezado.font = { bold: true };
  hoja.encabezados.forEach((nombre, i) => {
    const columna = nueva.getColumn(i + 1);
    const formato = hoja.formatos?.[nombre];
    if (formato) columna.numFmt = FORMATO[formato];
    // El ancho del dato más largo de la columna, entre 10 y 50.
    const largo = Math.max(nombre.length, ...hoja.filas.map((f) => String(f[i] ?? '').length));
    columna.width = Math.min(50, Math.max(10, largo + 2));
  });
  // Los encabezados quedan a la vista al bajar por una hoja larga.
  nueva.views = [{ state: 'frozen', ySplit: FILAS_DEL_TITULO + 1 }];
  for (const fila of hoja.filas) nueva.addRow(fila);
}

/** El libro de una pestaña para la obra y el periodo pedidos, con el nombre del archivo. */
export async function libroDelReporte(
  pestana: PestanaDeReporte,
  pedido: PedidoDeReporte,
): Promise<{ archivo: ArrayBuffer; nombre: string }> {
  const datos = await reporteDe(pestana, pedido);
  const obra = datos.obra;
  const titulo = `${TITULO_DE_PESTANA[pestana]} · ${obra?.nombre ?? 'Obra'}`;
  const generado = new Date().toLocaleString('es-CO', { timeZone: 'America/Bogota', dateStyle: 'medium', timeStyle: 'short' });
  const subtitulo = `${textoDelPeriodo(pedido.periodo)} · generado el ${generado}`;

  const libro = new ExcelJS.Workbook();
  libro.creator = 'Control de Obra OCC';
  for (const hoja of hojasDelReporte(pestana, datos)) escribirHoja(libro, hoja, titulo, subtitulo);

  return {
    archivo: (await libro.xlsx.writeBuffer()) as ArrayBuffer,
    nombre: nombreDelArchivo(pestana, obra?.codigo ?? 'obra', pedido.periodo),
  };
}
