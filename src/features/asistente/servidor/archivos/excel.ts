/**
 * El Excel que entrega el asistente (spec 040, RF-21). **Solo servidor**: es el único archivo del
 * asistente que sabe que detrás está `exceljs`.
 *
 * Una hoja por tabla, como los Excel de Reportes (030): arriba el título, quién lo pidió y
 * cuándo, y una fila vacía; después los encabezados, que quedan a la vista al bajar. Los números
 * van como números con su formato (pesos, entero o decimal) y las fechas como fechas, para que
 * se puedan sumar y filtrar. El texto de la respuesta, si lo hay, va en una hoja «Notas».
 *
 * No reutiliza `reportes/servidor/excel.ts`: aquel escribe lecturas de medidor y no tiene pesos
 * ni fechas, y adaptarlo cambiaba los Excel de Reportes, que ya están validados.
 */
import ExcelJS from 'exceljs';

import { celdaEnTexto, parrafosDeMarkdown, type FormatoDeColumna } from '@/shared/rules/archivos-del-asistente';

import type { ContenidoDelArchivo } from './contenido';

export const TIPO_XLSX = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

const FORMATO: Partial<Record<FormatoDeColumna, string>> = {
  pesos: '"$" #,##0',
  entero: '#,##0',
  numero: '#,##0.##',
  fecha: 'dd/mm/yyyy',
  // Como en los Excel de Reportes: sin separador de miles (039/RF-17).
  lectura: 'General',
};

/** Excel no deja más de 31 caracteres ni algunos signos en el nombre de una hoja, ni repetirlo. */
function nombreDeHoja(titulo: string, usados: Set<string>): string {
  const base = titulo.replace(/[/?*[\]:\\]/g, ' ').trim().slice(0, 28) || 'Tabla';
  let nombre = base;
  for (let i = 2; usados.has(nombre.toLowerCase()); i++) nombre = `${base} ${i}`;
  usados.add(nombre.toLowerCase());
  return nombre;
}

export async function libroDelAsistente(contenido: ContenidoDelArchivo): Promise<Uint8Array> {
  const libro = new ExcelJS.Workbook();
  libro.creator = 'Asistente · Control de Obra';
  const subtitulo = `Pedido por ${contenido.encabezado.pedidoPor} · generado el ${contenido.encabezado.generado}`;
  const usados = new Set<string>();

  const textos = contenido.bloques.flatMap((b) => (b.tipo === 'texto' ? parrafosDeMarkdown(b.markdown) : []));
  if (textos.length) {
    const notas = libro.addWorksheet(nombreDeHoja('Notas', usados));
    notas.addRow([contenido.titulo]).font = { bold: true, size: 13 };
    notas.addRow([subtitulo]);
    notas.addRow([]);
    for (const p of textos) {
      const fila = notas.addRow([`${p.tipo === 'vineta' ? '• ' : ''}${p.trozos.map((t) => t.texto).join('')}`]);
      if (p.tipo === 'titulo') fila.font = { bold: true };
    }
    notas.getColumn(1).width = 100;
  }

  for (const bloque of contenido.bloques) {
    if (bloque.tipo !== 'tabla') continue;
    const { tabla } = bloque;
    const hoja = libro.addWorksheet(nombreDeHoja(tabla.titulo, usados));
    hoja.addRow([`${contenido.titulo} · ${tabla.titulo}`]).font = { bold: true, size: 13 };
    hoja.addRow([subtitulo]);
    hoja.addRow([]);
    hoja.addRow(tabla.encabezados).font = { bold: true };
    tabla.encabezados.forEach((nombre, i) => {
      const columna = hoja.getColumn(i + 1);
      const formato = FORMATO[tabla.formatos[i]];
      if (formato) columna.numFmt = formato;
      // El ancho del dato más largo, como se ve, entre 10 y 50; con 5 000 filas basta una muestra.
      const muestra = tabla.filas.slice(0, 300).map((f) => celdaEnTexto(f[i], tabla.formatos[i]).length);
      columna.width = Math.min(50, Math.max(10, nombre.length + 2, ...muestra.map((l) => l + 2)));
    });
    hoja.views = [{ state: 'frozen', ySplit: 4 }];
    for (const fila of tabla.filas) {
      hoja.addRow(
        fila.map((valor, i) =>
          tabla.formatos[i] === 'fecha' && typeof valor === 'string' ? new Date(`${valor}T00:00:00Z`) : valor,
        ),
      );
    }
  }
  return new Uint8Array((await libro.xlsx.writeBuffer()) as ArrayBuffer);
}
