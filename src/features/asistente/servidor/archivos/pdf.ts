/**
 * El PDF que entrega el asistente (spec 040, RF-22). **Solo servidor**: el único archivo que sabe
 * que detrás está `pdf-lib` (aprobada el 2026-11-05).
 *
 * A4 horizontal, porque las tablas suelen ser anchas. Arriba el encabezado (el grupo, quién lo
 * pidió, cuándo y las fuentes); después los bloques en el orden en que vienen. Una tabla larga
 * pasa de página repitiendo sus títulos; cada celda se parte hasta en tres líneas y lo que no
 * cabe termina en «…». Abajo, en cada página, la leyenda y el número de página.
 *
 * La fuente es Helvetica, que viene con todo lector de PDF y no hay que incrustar; solo sabe
 * dibujar WinAnsi, así que todo texto pasa por `textoParaPdf` (plan, riesgos).
 */
import { PDFDocument, rgb, StandardFonts, type PDFFont, type PDFPage } from 'pdf-lib';

import {
  celdaEnTexto,
  LEYENDA_DEL_ARCHIVO,
  parrafosDeMarkdown,
  textoParaPdf,
  type TablaDelArchivo,
} from '@/shared/rules/archivos-del-asistente';

import type { ContenidoDelArchivo } from './contenido';

export const TIPO_PDF = 'application/pdf';

const ANCHO = 841.89;
const ALTO = 595.28;
const MARGEN = 36;
const PIE = 28;
const UTIL = ANCHO - 2 * MARGEN;
const GRIS = rgb(0.4, 0.4, 0.4);
const LINEA = rgb(0.8, 0.8, 0.8);
const FONDO_DEL_ENCABEZADO = rgb(0.93, 0.93, 0.93);
const TAMANO_TABLA = 7.5;
const LINEAS_POR_CELDA = 3;
const RELLENO = 3;

interface Fuentes {
  normal: PDFFont;
  negrita: PDFFont;
}

/** Parte un texto en líneas que caben en `ancho`; las palabras que no caben solas se cortan. */
function partir(texto: string, fuente: PDFFont, tamano: number, ancho: number): string[] {
  const lineas: string[] = [];
  for (const parrafo of texto.split('\n')) {
    let actual = '';
    for (const palabra of parrafo.split(' ')) {
      const prueba = actual ? `${actual} ${palabra}` : palabra;
      if (fuente.widthOfTextAtSize(prueba, tamano) <= ancho) {
        actual = prueba;
        continue;
      }
      if (actual) lineas.push(actual);
      actual = palabra;
      while (fuente.widthOfTextAtSize(actual, tamano) > ancho && actual.length > 1) {
        let corte = actual.length - 1;
        while (corte > 1 && fuente.widthOfTextAtSize(actual.slice(0, corte), tamano) > ancho) corte--;
        lineas.push(actual.slice(0, corte));
        actual = actual.slice(corte);
      }
    }
    lineas.push(actual);
  }
  return lineas;
}

/** Hasta `maximo` líneas; si sobra, la última termina en «…». */
function recortar(lineas: string[], maximo: number, fuente: PDFFont, tamano: number, ancho: number): string[] {
  if (lineas.length <= maximo) return lineas;
  const ultimas = lineas.slice(0, maximo);
  let ultima = `${ultimas[maximo - 1]}…`;
  while (fuente.widthOfTextAtSize(ultima, tamano) > ancho && ultima.length > 1) ultima = `${ultima.slice(0, -2)}…`;
  ultimas[maximo - 1] = ultima;
  return ultimas;
}

class Hoja {
  pagina!: PDFPage;
  y = 0;

  constructor(
    private readonly doc: PDFDocument,
    readonly fuentes: Fuentes,
  ) {
    this.nueva();
  }

  nueva() {
    this.pagina = this.doc.addPage([ANCHO, ALTO]);
    this.y = ALTO - MARGEN;
  }

  /** Si no caben `alto` puntos más, pasa de página. Devuelve si pasó. */
  asegurar(alto: number): boolean {
    if (this.y - alto >= MARGEN + PIE) return false;
    this.nueva();
    return true;
  }

  texto(texto: string, opciones: { tamano: number; negrita?: boolean; color?: ReturnType<typeof rgb>; sangria?: number }) {
    const fuente = opciones.negrita ? this.fuentes.negrita : this.fuentes.normal;
    const sangria = opciones.sangria ?? 0;
    for (const linea of partir(textoParaPdf(texto), fuente, opciones.tamano, UTIL - sangria)) {
      this.asegurar(opciones.tamano + 3);
      this.y -= opciones.tamano + 3;
      this.pagina.drawText(linea, { x: MARGEN + sangria, y: this.y, size: opciones.tamano, font: fuente, color: opciones.color });
    }
  }
}

/** Los anchos de las columnas: según lo que traen (una muestra), repartidos en el ancho útil. */
function anchosDe(tabla: TablaDelArchivo): number[] {
  const muestra = tabla.filas.slice(0, 200);
  const pesos = tabla.encabezados.map((encabezado, i) => {
    const largos = muestra.map((f) => celdaEnTexto(f[i], tabla.formatos[i]).length);
    const tipico = largos.length ? largos.sort((a, b) => a - b)[Math.floor(largos.length * 0.9)] : 0;
    // Al menos la palabra más larga del título, para que no se parta a mitad («Cantida/d»).
    const palabra = Math.max(...encabezado.split(' ').map((p) => p.length));
    return Math.min(40, Math.max(6, palabra * 1.15 + 1, encabezado.length * 0.6, tipico));
  });
  const total = pesos.reduce((a, b) => a + b, 0);
  return pesos.map((p) => (p / total) * UTIL);
}

function dibujarTabla(hoja: Hoja, tabla: TablaDelArchivo) {
  const { normal, negrita } = hoja.fuentes;
  const anchos = anchosDe(tabla);
  const alDerecha = tabla.formatos.map((f) => f === 'pesos' || f === 'entero' || f === 'numero' || f === 'lectura');
  const altoDeLinea = TAMANO_TABLA + 2;

  const celdas = (valores: string[], fuente: PDFFont) =>
    valores.map((v, i) => recortar(partir(textoParaPdf(v), fuente, TAMANO_TABLA, anchos[i] - 2 * RELLENO), LINEAS_POR_CELDA, fuente, TAMANO_TABLA, anchos[i] - 2 * RELLENO));

  const fila = (lineas: string[][], fuente: PDFFont, fondo: boolean) => {
    const alto = Math.max(...lineas.map((l) => l.length)) * altoDeLinea + 2 * RELLENO;
    const arriba = hoja.y;
    if (fondo) hoja.pagina.drawRectangle({ x: MARGEN, y: arriba - alto, width: UTIL, height: alto, color: FONDO_DEL_ENCABEZADO });
    let x = MARGEN;
    lineas.forEach((celda, i) => {
      celda.forEach((linea, n) => {
        const ancho = fuente.widthOfTextAtSize(linea, TAMANO_TABLA);
        const xTexto = alDerecha[i] && !fondo ? x + anchos[i] - RELLENO - ancho : x + RELLENO;
        hoja.pagina.drawText(linea, { x: xTexto, y: arriba - RELLENO - (n + 1) * altoDeLinea + 2, size: TAMANO_TABLA, font: fuente });
      });
      x += anchos[i];
    });
    hoja.pagina.drawLine({ start: { x: MARGEN, y: arriba - alto }, end: { x: MARGEN + UTIL, y: arriba - alto }, thickness: 0.5, color: LINEA });
    hoja.y = arriba - alto;
    return alto;
  };

  const encabezado = celdas(tabla.encabezados, negrita);
  const altoDelEncabezado = Math.max(...encabezado.map((l) => l.length)) * altoDeLinea + 2 * RELLENO;
  hoja.asegurar(altoDelEncabezado + altoDeLinea * 2);
  fila(encabezado, negrita, true);
  for (const valores of tabla.filas) {
    const lineas = celdas(valores.map((v, i) => celdaEnTexto(v, tabla.formatos[i])), normal);
    const alto = Math.max(...lineas.map((l) => l.length)) * altoDeLinea + 2 * RELLENO;
    // Una tabla que pasa de página repite sus títulos.
    if (hoja.asegurar(alto)) fila(encabezado, negrita, true);
    fila(lineas, normal, false);
  }
}

export async function pdfDelAsistente(contenido: ContenidoDelArchivo): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  doc.setTitle(textoParaPdf(contenido.titulo));
  doc.setCreator('Asistente · Control de Obra');
  const fuentes = { normal: await doc.embedFont(StandardFonts.Helvetica), negrita: await doc.embedFont(StandardFonts.HelveticaBold) };
  const hoja = new Hoja(doc, fuentes);

  const { encabezado } = contenido;
  hoja.texto(encabezado.grupo, { tamano: 8, color: GRIS });
  hoja.texto(contenido.titulo, { tamano: 15, negrita: true });
  hoja.texto(`Pedido por ${encabezado.pedidoPor} · generado el ${encabezado.generado}`, { tamano: 8, color: GRIS });
  if (encabezado.fuentes.length) hoja.texto(`Fuentes: ${encabezado.fuentes.join(' · ')}`, { tamano: 8, color: GRIS });
  hoja.y -= 8;

  for (const bloque of contenido.bloques) {
    if (bloque.tipo === 'texto') {
      for (const p of parrafosDeMarkdown(bloque.markdown)) {
        const texto = p.trozos.map((t) => t.texto).join('');
        if (p.tipo === 'titulo') {
          hoja.y -= 4;
          hoja.texto(texto, { tamano: 11, negrita: true });
        } else if (p.tipo === 'vineta') hoja.texto(`• ${texto}`, { tamano: 9, sangria: 10 });
        else hoja.texto(texto, { tamano: 9 });
      }
      hoja.y -= 6;
    } else {
      hoja.y -= 4;
      hoja.texto(bloque.tabla.titulo, { tamano: 11, negrita: true });
      hoja.y -= 3;
      dibujarTabla(hoja, bloque.tabla);
      hoja.y -= 10;
    }
  }

  const paginas = doc.getPages();
  const leyenda = textoParaPdf(LEYENDA_DEL_ARCHIVO);
  paginas.forEach((pagina, i) => {
    pagina.drawText(leyenda, { x: MARGEN, y: MARGEN - 10, size: 7, font: fuentes.normal, color: GRIS });
    const numero = `Página ${i + 1} de ${paginas.length}`;
    pagina.drawText(numero, {
      x: ANCHO - MARGEN - fuentes.normal.widthOfTextAtSize(numero, 7),
      y: MARGEN - 10,
      size: 7,
      font: fuentes.normal,
      color: GRIS,
    });
  });
  return doc.save();
}
