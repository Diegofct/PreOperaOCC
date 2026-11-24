/**
 * La IA transcribe los PDF y las imágenes del Drive de la obra (spec 052, RF-12, RF-14, RF-15).
 * **Solo servidor.**
 *
 * Una llamada por pieza, con `llamarConEsquema` (planificación), como la importación al Almacén:
 * salida estructurada, streaming, sin reintentos y con el tope de 4 minutos. Aquí solo se arma
 * lo que se manda y se suma lo que vuelve; cómo se parte el PDF y cómo se numeran las páginas lo
 * decide la regla (`piezasDelPdf`, `paginasDeLaPieza`).
 *
 * ── Transcribir, no resumir ──
 *
 * Lo leído es lo que después busca el asistente y cita la respuesta de un correo (RF-22, RF-38):
 * si aquí se resume, allá se cita un resumen. Por eso la instrucción es copiar tal cual, página
 * por página, y el esfuerzo es `low`: es una tarea larga y mecánica, como la lectura del
 * calendario de la spec 045. Un escaneado o una foto se leen igual (RF-14): el modelo ve la página.
 *
 * ── El resumen ──
 *
 * Aparte de la transcripción, y del texto ya guardado (RF-13): así un Word leído sin IA, con el
 * freno puesto, recibe su resumen cuando el freno se abre. Unas 3 a 5 frases, con lo que sirve
 * para decidir si abrir el documento: qué es, quién lo manda, fechas, plazos y cifras.
 *
 * ── Los tokens ──
 *
 * Se suman los de todas las piezas, también los de las que salieron bien antes de una que
 * falló: se pagaron. Con ellos se estima el costo de la primera carpeta de Magdalena (riesgo 2).
 */
import type { BetaContentBlockParam } from '@anthropic-ai/sdk/resources/beta/messages/messages';
import { PDFDocument } from 'pdf-lib';
import * as z from 'zod/v4';

import { aBase64 } from '@/features/asistente/servidor/adjuntos';
import { llamarConEsquema, type TextosDeFalloDeIa } from '@/features/planificacion/servidor/leer-con-ia';
import { pdfCifrado } from '@/shared/rules/archivos-subidos';
import { paginasDeLaPieza, piezasDelPdf, type PaginaLeida, type PiezaDelPdf } from '@/shared/rules/drive';

export interface Tokens {
  tokensEntrada: number;
  tokensSalida: number;
}

/**
 * Lo que sale de transcribir: las páginas, o por qué no se pudo; siempre con lo que costó.
 * `pasajera`: la red, la IA ocupada o el tiempo agotado; reintentar puede arreglarlo (RF-16).
 */
export type Transcripcion = ({ paginas: PaginaLeida[] } | { motivo: string; pasajera?: boolean }) & Tokens;

const esquemaDeTranscripcion = z.object({
  paginas: z.array(
    z.object({
      pagina: z.number().int().describe('El número de la página dentro de lo que recibiste, desde 1.'),
      texto: z.string().describe('Todo el texto de la página, tal cual; "" si no tiene texto.'),
    }),
  ),
});

const INSTRUCCIONES = `Transcribes documentos de una obra civil en Colombia (oficios, actas, informes, planos, cuadros de cantidades) para que después se puedan buscar.

Copia todo el texto de cada página tal cual, en su orden de lectura, sin resumir, sin corregir y sin agregar nada tuyo. Respeta los saltos de renglón. Una tabla va una fila por renglón, con « | » entre celdas. Los sellos, las firmas y las notas a mano se transcriben si se pueden leer; si no, se omiten.

Devuelve cada página con su número, contado desde 1 dentro de lo que recibiste. Una página sin texto va con texto "".`;

const FALLOS: TextosDeFalloDeIa = {
  seNego: 'la IA no quiso leerlo',
  muyLargo: 'el texto de una pieza no cabe en una respuesta',
};

/** Una pieza del PDF como documento propio, para mandarla sola. */
async function pdfDeLaPieza(original: PDFDocument, pieza: PiezaDelPdf): Promise<Uint8Array> {
  const nuevo = await PDFDocument.create();
  const indices = Array.from({ length: pieza.hasta - pieza.desde + 1 }, (_, i) => pieza.desde - 1 + i);
  for (const pagina of await nuevo.copyPages(original, indices)) nuevo.addPage(pagina);
  return nuevo.save();
}

async function transcribirBloque(bloque: BetaContentBlockParam, pedido: string) {
  return llamarConEsquema(
    esquemaDeTranscripcion,
    INSTRUCCIONES,
    [{ type: 'text', text: pedido }, bloque],
    'transcribir del Drive',
    FALLOS,
    'low',
  );
}

/** Transcribe un PDF, pieza por pieza. Una pieza que falla corta la versión (plan, «Lectura»). */
export async function transcribirPdf(bytes: Uint8Array, nombre: string): Promise<Transcripcion> {
  const gasto: Tokens = { tokensEntrada: 0, tokensSalida: 0 };
  if (pdfCifrado(bytes)) return { motivo: 'tiene contraseña', ...gasto };

  let original: PDFDocument;
  try {
    original = await PDFDocument.load(bytes);
  } catch {
    return { motivo: 'el PDF está dañado y no se pudo abrir', ...gasto };
  }

  const paginas: PaginaLeida[] = [];
  for (const pieza of piezasDelPdf(original.getPageCount())) {
    const datos = aBase64(await pdfDeLaPieza(original, pieza));
    const leido = await transcribirBloque(
      { type: 'document', title: nombre, source: { type: 'base64', media_type: 'application/pdf', data: datos } },
      `Estas son las páginas ${pieza.desde} a ${pieza.hasta} de «${nombre}». Transcríbelas.`,
    );
    if (!leido.ok) {
      return { motivo: `páginas ${pieza.desde} a ${pieza.hasta}: ${leido.error}`, pasajera: leido.pasajera, ...gasto };
    }
    gasto.tokensEntrada += leido.tokensEntrada;
    gasto.tokensSalida += leido.tokensSalida;
    paginas.push(...paginasDeLaPieza(pieza, leido.datos.paginas));
  }
  return { paginas, ...gasto };
}

const MIMES_DE_IMAGEN = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'] as const;
type MimeDeImagen = (typeof MIMES_DE_IMAGEN)[number];

/** Transcribe una imagen: una sola página. */
export async function transcribirImagen(bytes: Uint8Array, mime: string, nombre: string): Promise<Transcripcion> {
  const gasto: Tokens = { tokensEntrada: 0, tokensSalida: 0 };
  const tipo = MIMES_DE_IMAGEN.find((m) => m === mime.toLowerCase()) as MimeDeImagen | undefined;
  if (!tipo) return { motivo: 'tipo no admitido', ...gasto };
  const leido = await transcribirBloque(
    { type: 'image', source: { type: 'base64', media_type: tipo, data: aBase64(bytes) } },
    `Esta es la imagen «${nombre}». Transcríbela como una sola página.`,
  );
  if (!leido.ok) return { motivo: leido.error, pasajera: leido.pasajera, ...gasto };
  return {
    paginas: paginasDeLaPieza({ desde: 1, hasta: 1 }, leido.datos.paginas),
    tokensEntrada: leido.tokensEntrada,
    tokensSalida: leido.tokensSalida,
  };
}

const esquemaDeResumen = z.object({
  resumen: z.string().describe('De 3 a 5 frases en español.'),
});

const INSTRUCCIONES_PARA_RESUMIR = `Resumes documentos de una obra civil en Colombia (oficios, actas, informes, planos, cuadros de cantidades) para una lista donde el residente y el director deciden cuál abrir.

Escribe de 3 a 5 frases en español: qué es el documento, quién lo envía y a quién, y lo importante que dice (fechas, plazos, cifras, decisiones, lo que pide o aprueba). Solo lo que dice el texto, sin inventar ni opinar. Sin títulos, viñetas ni comillas.`;

const FALLOS_DEL_RESUMEN: TextosDeFalloDeIa = {
  seNego: 'la IA no quiso resumirlo',
  muyLargo: 'el resumen no cupo en una respuesta',
};

export type Resumen = ({ resumen: string } | { motivo: string; pasajera?: boolean }) & Tokens;

/** El resumen de un documento ya leído, a partir de su texto (RF-13). */
export async function resumir(texto: string, nombre: string, subcarpeta: string): Promise<Resumen> {
  const donde = subcarpeta ? `, en la subcarpeta «${subcarpeta}»` : '';
  const leido = await llamarConEsquema(
    esquemaDeResumen,
    INSTRUCCIONES_PARA_RESUMIR,
    `Documento «${nombre}»${donde}. Su texto:\n\n${texto}`,
    'resumir del Drive',
    FALLOS_DEL_RESUMEN,
    'low',
  );
  if (!leido.ok) return { motivo: leido.error, pasajera: leido.pasajera, tokensEntrada: 0, tokensSalida: 0 };
  return { resumen: leido.datos.resumen.trim(), tokensEntrada: leido.tokensEntrada, tokensSalida: leido.tokensSalida };
}
