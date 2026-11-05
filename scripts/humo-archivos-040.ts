/**
 * Prueba de humo de los archivos del asistente (spec 040, T12; RNF de 5 000 filas en menos de
 * 20 s). Sin base ni IA: arma un PDF, un Excel y un Word de 5 000 filas con tildes, ñ, «m³»,
 * «°», «±» y pesos, mide cuánto tarda cada uno, los vuelve a abrir para revisar lo que llevan y
 * los deja en la carpeta que se le pase, para abrirlos con su programa.
 *
 *   npx tsx scripts/humo-archivos-040.ts <carpeta>
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import ExcelJS from 'exceljs';
import JSZip from 'jszip';
import { PDFDocument } from 'pdf-lib';

import { libroDelAsistente } from '../src/features/asistente/servidor/archivos/excel';
import { pdfDelAsistente } from '../src/features/asistente/servidor/archivos/pdf';
import { wordDelAsistente } from '../src/features/asistente/servidor/archivos/word';
import type { ContenidoDelArchivo } from '../src/features/asistente/servidor/archivos/contenido';
import {
  aTabla,
  encabezadoDelArchivo,
  faltasDelPedido,
  FILAS_MAXIMAS_POR_ARCHIVO,
  nombreDelArchivoDelAsistente,
} from '../src/shared/rules/archivos-del-asistente';

const SEGUNDOS_MAXIMOS = 20;
const carpeta = process.argv[2];
if (!carpeta) {
  console.error('Diga en qué carpeta dejar los archivos.');
  process.exit(1);
}
mkdirSync(carpeta, { recursive: true });

let fallos = 0;
function comprobar(nombre: string, ok: boolean, detalle = '') {
  console.log(`${ok ? '✓' : '✗'} ${nombre}${detalle ? ` — ${detalle}` : ''}`);
  if (!ok) fallos++;
}

const materiales = ['Cemento gris', 'Arena de río', 'Gravilla ¾"', 'Señalización vial', 'Tubería Ø 12"', 'Concreto 3000 psi (m³)'];
const obras = ['Vía Santa Bárbara – El Peñol', 'Puente quebrada La Ñuñuma', 'Consorcio Antioquia'];
const filas = Array.from({ length: FILAS_MAXIMAS_POR_ARCHIVO }, (_, i) => ({
  codigo: `SC-${String(i + 1).padStart(4, '0')}`,
  obra: obras[i % obras.length],
  queSePide: `${materiales[i % materiales.length]} · ${(i % 40) + 1} unidades, ±2 % de tolerancia, a 18 °C`,
  pedidaEl: `2026-${String((i % 12) + 1).padStart(2, '0')}-${String((i % 28) + 1).padStart(2, '0')}`,
  valorEstimado: 125_000 + i * 1_337,
  cantidad: (i % 40) + 1,
  volumen: Math.round(((i % 97) + 0.25) * 100) / 100,
  urgente: i % 7 === 0,
  pidio: i % 2 ? 'Ana María Peñaloza' : 'José Ñustes Güiza',
}));

const tabla = aTabla('Solicitudes de compra', filas);
const contenido: ContenidoDelArchivo = {
  titulo: 'Solicitudes de compra del año — prueba de 5 000 filas',
  encabezado: encabezadoDelArchivo({
    quien: 'Auxiliar de prueba, auxiliar administrativa',
    generadoEn: new Date().toISOString(),
    fuentes: [{ modulo: 'compras', etiqueta: 'Compras de Elemental', fecha: null, ruta: '/panel/elemental/compras' }],
  }),
  bloques: [
    { tipo: 'texto', markdown: '## Resumen\n\nHay **5 000** solicitudes: año, señal, m³, ±, °C, «comillas» y “otras”.\n- Ñandú y pingüino 👍 (el emoji no se dibuja en el PDF)' },
    { tipo: 'tabla', tabla },
  ],
};
comprobar('el pedido no tiene faltas', faltasDelPedido({ formato: 'xlsx', titulo: contenido.titulo, bloques: contenido.bloques }).length === 0);
comprobar('formatos de la tabla', tabla.formatos.join(',') === 'texto,texto,texto,fecha,pesos,entero,numero,texto,texto', tabla.formatos.join(','));

async function medir(nombre: string, armar: () => Promise<Uint8Array>, formato: 'pdf' | 'xlsx' | 'docx') {
  const inicio = performance.now();
  const bytes = await armar();
  const segundos = (performance.now() - inicio) / 1000;
  const archivo = join(carpeta, nombreDelArchivoDelAsistente(`Humo ${nombre}`, '2026-11-05', formato));
  writeFileSync(archivo, bytes);
  comprobar(`${nombre}: en menos de ${SEGUNDOS_MAXIMOS} s`, segundos < SEGUNDOS_MAXIMOS, `${segundos.toFixed(2)} s, ${(bytes.length / 1024).toFixed(0)} KB → ${archivo}`);
  return bytes;
}

async function principal() {
  const xlsx = await medir('Excel', () => libroDelAsistente(contenido), 'xlsx');
  const libro = new ExcelJS.Workbook();
  await libro.xlsx.load(xlsx.buffer as ArrayBuffer);
  const hoja = libro.worksheets.find((h) => h.name.startsWith('Solicitudes'));
  comprobar('Excel: una hoja de notas y una por tabla', libro.worksheets.map((h) => h.name).join(' | ') === 'Notas | Solicitudes de compra');
  comprobar('Excel: 5 000 filas más título, subtítulo, vacía y encabezados', hoja?.rowCount === FILAS_MAXIMAS_POR_ARCHIVO + 4, String(hoja?.rowCount));
  const primera = hoja?.getRow(5);
  comprobar('Excel: los pesos son números con formato de pesos', typeof primera?.getCell(5).value === 'number' && hoja?.getColumn(5).numFmt === '"$" #,##0');
  comprobar('Excel: las fechas son fechas', primera?.getCell(4).value instanceof Date);
  comprobar('Excel: los decimales siguen siendo decimales', primera?.getCell(7).value === 0.25);
  comprobar('Excel: las tildes y la ñ llegan', String(primera?.getCell(2).value).includes('Bárbara') && String(hoja?.getRow(6).getCell(9).value).includes('Peñaloza'));

  const pdf = await medir('PDF', () => pdfDelAsistente(contenido), 'pdf');
  const leido = await PDFDocument.load(pdf);
  comprobar('PDF: se abre y pasa de página', leido.getPageCount() > 10, `${leido.getPageCount()} páginas`);

  const docx = await medir('Word', () => wordDelAsistente(contenido), 'docx');
  const zip = await JSZip.loadAsync(docx);
  const documento = (await zip.file('word/document.xml')?.async('string')) ?? '';
  comprobar('Word: tiene sus tres partes', ['[Content_Types].xml', '_rels/.rels', 'word/document.xml'].every((p) => zip.file(p)));
  comprobar('Word: 5 000 filas más la de títulos', (documento.match(/<w:tr>/g) ?? []).length === FILAS_MAXIMAS_POR_ARCHIVO + 1 && (documento.match(/<w:tblHeader\/>/g) ?? []).length === 1);
  comprobar('Word: tildes, ñ, m³, ° y ± sin tocar', ['Peñaloza', 'Güiza', 'm³', '18 °C', '±2', '$ 125.000', 'señal'].every((t) => documento.includes(t)));
}

principal()
  .catch((e) => {
    fallos++;
    console.error(e);
  })
  .finally(() => process.exit(fallos ? 1 : 0));
