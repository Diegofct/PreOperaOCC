/**
 * El Word que entrega el asistente (spec 040, RF-22). **Solo servidor.**
 *
 * Un `.docx` es un zip con unos XML. Se escriben a mano y se comprimen con `jszip` (ya venía con
 * `exceljs`; se declaró el 2026-11-05): para encabezado, títulos, párrafos con negrita, viñetas y
 * tablas no hace falta la librería `docx`, que sería otra dependencia (plan, decisiones).
 *
 * Horizontal, como el PDF, porque las tablas suelen ser anchas. La fila de títulos de una tabla
 * se repite en cada página (`w:tblHeader`). Lo mínimo que Word exige: `[Content_Types].xml`,
 * `_rels/.rels` y `word/document.xml`.
 */
import JSZip from 'jszip';

import {
  celdaEnTexto,
  LEYENDA_DEL_ARCHIVO,
  parrafosDeMarkdown,
  type TablaDelArchivo,
  type TrozoDeTexto,
} from '@/shared/rules/archivos-del-asistente';

import type { ContenidoDelArchivo } from './contenido';

export const TIPO_DOCX = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

const TIPOS = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
<Default Extension="xml" ContentType="application/xml"/>
<Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
</Types>`;

const RELACIONES = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>`;

/** Lo que no puede ir crudo en XML, y los caracteres de control que Word no abre. */
function xml(texto: string): string {
  return texto
    .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** Un trozo de texto. Tamaño en medios puntos, como lo cuenta Word. */
function run(texto: string, o: { negrita?: boolean; tamano?: number; gris?: boolean } = {}): string {
  const props = [
    o.negrita ? '<w:b/>' : '',
    o.gris ? '<w:color w:val="666666"/>' : '',
    o.tamano ? `<w:sz w:val="${o.tamano}"/><w:szCs w:val="${o.tamano}"/>` : '',
  ].join('');
  return `<w:r>${props ? `<w:rPr>${props}</w:rPr>` : ''}<w:t xml:space="preserve">${xml(texto)}</w:t></w:r>`;
}

function parrafo(runs: string, o: { antes?: number; despues?: number; sangria?: number; derecha?: boolean } = {}): string {
  const props = [
    `<w:spacing w:before="${o.antes ?? 0}" w:after="${o.despues ?? 80}"/>`,
    o.sangria ? `<w:ind w:left="${o.sangria}"/>` : '',
    o.derecha ? '<w:jc w:val="right"/>' : '',
  ].join('');
  return `<w:p><w:pPr>${props}</w:pPr>${runs}</w:p>`;
}

const trozos = (lista: readonly TrozoDeTexto[], tamano: number) => lista.map((t) => run(t.texto, { negrita: t.negrita, tamano })).join('');

/** El ancho útil de la página horizontal, en veinteavos de punto: 297 mm menos 2 cm de margen a cada lado. */
const UTIL = 16838 - 2 * 1134;

function tabla(t: TablaDelArchivo): string {
  const muestra = t.filas.slice(0, 200);
  const pesos = t.encabezados.map((encabezado, i) =>
    Math.min(40, Math.max(6, Math.max(...encabezado.split(' ').map((p) => p.length)) * 1.15 + 1, encabezado.length * 0.6, ...muestra.map((f) => celdaEnTexto(f[i], t.formatos[i]).length))),
  );
  const total = pesos.reduce((a, b) => a + b, 0);
  const anchos = pesos.map((p) => Math.floor((p / total) * UTIL));
  const alDerecha = t.formatos.map((f) => f === 'pesos' || f === 'entero' || f === 'numero' || f === 'lectura');
  const celda = (texto: string, i: number, negrita: boolean, fondo: boolean) =>
    `<w:tc><w:tcPr><w:tcW w:w="${anchos[i]}" w:type="dxa"/>${fondo ? '<w:shd w:val="clear" w:color="auto" w:fill="EDEDED"/>' : ''}</w:tcPr>` +
    parrafo(run(texto, { negrita, tamano: 16 }), { despues: 0, derecha: alDerecha[i] && !negrita }) +
    '</w:tc>';
  const borde = '<w:top w:val="single" w:sz="4" w:color="BFBFBF"/><w:left w:val="single" w:sz="4" w:color="BFBFBF"/><w:bottom w:val="single" w:sz="4" w:color="BFBFBF"/><w:right w:val="single" w:sz="4" w:color="BFBFBF"/><w:insideH w:val="single" w:sz="4" w:color="BFBFBF"/><w:insideV w:val="single" w:sz="4" w:color="BFBFBF"/>';
  return (
    `<w:tbl><w:tblPr><w:tblW w:w="${UTIL}" w:type="dxa"/><w:tblBorders>${borde}</w:tblBorders><w:tblLayout w:type="fixed"/></w:tblPr>` +
    `<w:tblGrid>${anchos.map((a) => `<w:gridCol w:w="${a}"/>`).join('')}</w:tblGrid>` +
    `<w:tr><w:trPr><w:tblHeader/></w:trPr>${t.encabezados.map((e, i) => celda(e, i, true, true)).join('')}</w:tr>` +
    t.filas.map((f) => `<w:tr>${f.map((v, i) => celda(celdaEnTexto(v, t.formatos[i]), i, false, false)).join('')}</w:tr>`).join('') +
    '</w:tbl>'
  );
}

export async function wordDelAsistente(contenido: ContenidoDelArchivo): Promise<Uint8Array> {
  const { encabezado } = contenido;
  const cuerpo: string[] = [
    parrafo(run(encabezado.grupo, { tamano: 16, gris: true }), { despues: 0 }),
    parrafo(run(contenido.titulo, { negrita: true, tamano: 30 }), { despues: 60 }),
    parrafo(run(`Pedido por ${encabezado.pedidoPor} · generado el ${encabezado.generado}`, { tamano: 16, gris: true }), { despues: 0 }),
  ];
  if (encabezado.fuentes.length) cuerpo.push(parrafo(run(`Fuentes: ${encabezado.fuentes.join(' · ')}`, { tamano: 16, gris: true }), { despues: 200 }));

  for (const bloque of contenido.bloques) {
    if (bloque.tipo === 'texto') {
      for (const p of parrafosDeMarkdown(bloque.markdown)) {
        if (p.tipo === 'titulo') cuerpo.push(parrafo(p.trozos.map((t) => run(t.texto, { negrita: true, tamano: 24 })).join(''), { antes: 160 }));
        else if (p.tipo === 'vineta') cuerpo.push(parrafo(run('• ', { tamano: 20 }) + trozos(p.trozos, 20), { sangria: 284 }));
        else cuerpo.push(parrafo(trozos(p.trozos, 20)));
      }
    } else {
      cuerpo.push(parrafo(run(bloque.tabla.titulo, { negrita: true, tamano: 24 }), { antes: 200, despues: 80 }));
      cuerpo.push(tabla(bloque.tabla));
      cuerpo.push(parrafo(''));
    }
  }
  cuerpo.push(parrafo(run(LEYENDA_DEL_ARCHIVO, { tamano: 14, gris: true }), { antes: 200 }));

  const documento =
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>' +
    cuerpo.join('') +
    '<w:sectPr><w:pgSz w:w="16838" w:h="11906" w:orient="landscape"/><w:pgMar w:top="1134" w:right="1134" w:bottom="1134" w:left="1134" w:header="567" w:footer="567" w:gutter="0"/></w:sectPr>' +
    '</w:body></w:document>';

  const zip = new JSZip();
  zip.file('[Content_Types].xml', TIPOS);
  zip.file('_rels/.rels', RELACIONES);
  zip.file('word/document.xml', documento);
  return zip.generateAsync({ type: 'uint8array', compression: 'DEFLATE' });
}
