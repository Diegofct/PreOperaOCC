/**
 * La respuesta del asistente para imprimir o guardar como PDF (spec 028, RF-24 a RF-27).
 *
 * Como en Reportes (030, RF-10): una página HTML que el navegador imprime o guarda como
 * PDF, sin librería de PDF (constitución, principio 8). Lleva:
 *  · la obra y el periodo que se consultaron (de las fuentes, como se guardaron) y quién
 *    pidió la respuesta y cuándo se generó el PDF (RF-25);
 *  · la pregunta, la respuesta tal como se dio —sin volver a consultar nada (RF-27)— y
 *    sus fuentes;
 *  · la leyenda de RF-26.
 */
import type { MensajeDelAsistente } from '@/features/panel/contratos';

import { bloquesDe } from './markdown';

export const LEYENDA_DEL_PDF = 'Generado por el asistente a partir de los registros del sistema. No es evidencia firmada.';

function escapar(texto: string): string {
  return texto.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

/** `**negrita**` y `` `código` `` dentro de un texto ya escapado. */
const enLinea = (texto: string) =>
  escapar(texto)
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/`([^`]+)`/g, '<code>$1</code>');

/** El Markdown de la respuesta, en HTML, con las mismas reglas que la pantalla. */
export function respuestaEnHtml(markdown: string): string {
  return bloquesDe(markdown)
    .map((b) => {
      if (b.tipo === 'titulo') return `<h${Math.min(b.nivel + 1, 4)}>${enLinea(b.texto)}</h${Math.min(b.nivel + 1, 4)}>`;
      if (b.tipo === 'lista') {
        const etiqueta = b.ordenada ? 'ol' : 'ul';
        return `<${etiqueta}>${b.items.map((i) => `<li>${enLinea(i)}</li>`).join('')}</${etiqueta}>`;
      }
      if (b.tipo === 'tabla') {
        const cabeza = b.encabezado.map((c) => `<th>${enLinea(c)}</th>`).join('');
        const filas = b.filas.map((f) => `<tr>${b.encabezado.map((_, j) => `<td>${enLinea(f[j] ?? '')}</td>`).join('')}</tr>`).join('');
        return `<table><thead><tr>${cabeza}</tr></thead><tbody>${filas}</tbody></table>`;
      }
      return `<p>${enLinea(b.texto).replace(/\n/g, '<br>')}</p>`;
    })
    .join('\n');
}

const fechaCorta = (f: string) => {
  const [a, m, d] = f.split('-');
  return `${d}/${m}/${a}`;
};

/** RF-25: la obra y el periodo de las fuentes; si no consultó nada, lo dice. */
export function obraYPeriodoDe(fuentes: MensajeDelAsistente['fuentes']): { obra: string; periodo: string } {
  const obras = [...new Set(fuentes.map((f) => f.obra).filter((o): o is string => Boolean(o)))];
  const desdes = fuentes.map((f) => f.desde).filter((d): d is string => Boolean(d)).sort();
  const hastas = fuentes.map((f) => f.hasta).filter((d): d is string => Boolean(d)).sort();
  return {
    obra: obras.length ? obras.join('; ') : 'Sin obra consultada',
    periodo: desdes.length
      ? desdes[0] === hastas[hastas.length - 1]
        ? fechaCorta(desdes[0])
        : `del ${fechaCorta(desdes[0])} al ${fechaCorta(hastas[hastas.length - 1])}`
      : 'Sin periodo (consulta de datos actuales)',
  };
}

export function paginaDeLaRespuesta(datos: {
  pregunta: string;
  respuesta: MensajeDelAsistente;
  pidio: string;
  /** La hora en que se genera (RF-25); por defecto, ahora. */
  ahora?: number;
}): string {
  const generado = datos.ahora ?? Date.now();
  const { obra, periodo } = obraYPeriodoDe(datos.respuesta.fuentes);
  const hora = (ms: number) => new Date(ms).toLocaleString('es-CO', { timeZone: 'America/Bogota', dateStyle: 'long', timeStyle: 'short' });
  const fuentes = datos.respuesta.fuentes.length
    ? `<h2>Fuentes</h2><ul>${datos.respuesta.fuentes.map((f) => `<li>${escapar(f.etiqueta)}</li>`).join('')}</ul>`
    : '';
  return `<!doctype html>
<html lang="es"><head><meta charset="utf-8"><title>Asistente · ${escapar(obra)}</title>
<style>
  @page { size: letter portrait; margin: 16mm; }
  body { font-family: system-ui, sans-serif; color: #1b1b1b; font-size: 12px; line-height: 1.45; margin: 16px; }
  h1 { font-size: 18px; margin: 0 0 8px; }
  h2 { font-size: 14px; margin: 16px 0 6px; }
  h3, h4 { font-size: 13px; margin: 12px 0 4px; }
  dl.datos { display: grid; grid-template-columns: max-content 1fr; gap: 2px 12px; margin: 0 0 12px; }
  dl.datos dt { color: #555; }
  dl.datos dd { margin: 0; }
  .pregunta { background: #f0eee9; padding: 8px 10px; border-radius: 6px; }
  table { border-collapse: collapse; width: 100%; margin: 6px 0; }
  th, td { border: 1px solid #ccc; padding: 4px 6px; text-align: left; vertical-align: top; }
  th { background: #f0eee9; }
  tr { break-inside: avoid; page-break-inside: avoid; }
  thead { display: table-header-group; }
  .leyenda { margin-top: 18px; padding-top: 8px; border-top: 1px solid #ccc; color: #555; font-style: italic; }
  .acciones { margin-bottom: 12px; }
  @media print { .acciones { display: none; } }
</style></head>
<body>
<div class="acciones"><button onclick="window.print()">Imprimir o guardar como PDF</button></div>
<h1>Asistente · Control de Obra OCC</h1>
<dl class="datos">
  <dt>Obra</dt><dd>${escapar(obra)}</dd>
  <dt>Periodo</dt><dd>${escapar(periodo)}</dd>
  <dt>Pidió</dt><dd>${escapar(datos.pidio)}</dd>
  <dt>Respondido</dt><dd>${escapar(hora(Date.parse(datos.respuesta.creadoEn)))}</dd>
  <dt>Generado</dt><dd>${escapar(hora(generado))}</dd>
</dl>
<h2>Pregunta</h2>
<p class="pregunta">${escapar(datos.pregunta)}</p>
<h2>Respuesta</h2>
${respuestaEnHtml(datos.respuesta.texto)}
${fuentes}
<p class="leyenda">${escapar(LEYENDA_DEL_PDF)}</p>
</body></html>`;
}
