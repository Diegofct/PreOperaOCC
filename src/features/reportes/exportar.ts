/**
 * Qué dice cada celda del Excel de un reporte (spec 030, RF-9).
 *
 * **Puro, sin `exceljs` y sin base**, como `almacen-obra/exportar.ts`: recibe lo mismo
 * que la pantalla y devuelve las hojas con sus encabezados y sus filas. Quien escribe
 * el libro es `servidor/excel.ts`. Así se prueba en el guion qué sale, sin abrir un
 * archivo.
 *
 * Los números van como números —horas con decimales, no «8 h 30 min»— para que en
 * Excel se puedan sumar y filtrar. Las horas del personal vienen en minutos y salen en
 * horas.
 */
import type { PeriodoDeReporte } from '@/shared/rules/periodos';
import { nombreDeNovedad } from '@/shared/catalogos/bitacora';
import { NOMBRE_DE_CLASE, type ClaseDeMantenimiento } from '@/shared/rules/mantenimiento';
import { UNIDAD_DE_MEDIDOR, diaCorto } from '@/shared/rules/jornada';

import type { PestanaDeReporte, ReporteDe } from './servidor/reportes';

export type CeldaDeReporte = string | number | null;

/** Cómo se escribe una columna: número con decimales o texto. Lo que no se dice, texto. */
export type FormatoDeColumna = 'numero' | 'entero';

export interface HojaDeReporte {
  nombre: string;
  encabezados: string[];
  formatos?: Partial<Record<string, FormatoDeColumna>>;
  filas: CeldaDeReporte[][];
}

export const TITULO_DE_PESTANA: Record<PestanaDeReporte, string> = {
  maquinas: 'Máquinas',
  mantenimiento: 'Mantenimiento',
  personal: 'Personal',
  actividades: 'Actividades',
  cantera: 'Cantera',
  calidad: 'Control de calidad',
  clima: 'Clima y novedades',
};

const horas = (minutos: number) => Math.round((minutos / 60) * 100) / 100;

const TRABAJO: Record<string, string> = { si: 'Sí', no: 'No', sin_bitacora: 'Sin bitácora' };
const ESTADO_PERSONA: Record<string, string> = { registrada: 'En la bitácora', ausente: 'No está', sin_bitacora: 'Sin bitácora' };

/** «Semana del 5-oct al 11-oct de 2026», como se escribe arriba de la hoja. */
export function textoDelPeriodo(periodo: Pick<PeriodoDeReporte, 'tipo' | 'desde' | 'hasta'>): string {
  const anio = periodo.hasta.slice(0, 4);
  if (periodo.tipo === 'dia') return `Día ${diaCorto(periodo.desde)} de ${anio}`;
  if (periodo.tipo === 'mes') {
    const mes = new Date(`${periodo.desde}T12:00:00Z`).toLocaleDateString('es-CO', { month: 'long', timeZone: 'UTC' });
    return `Mes de ${mes} de ${anio}`;
  }
  return `Semana del ${diaCorto(periodo.desde)} al ${diaCorto(periodo.hasta)} de ${anio}`;
}

/** `reporte-maquinas-OBR-001-2026-10-05-2026-10-11.xlsx` (plan, RF-9). */
export function nombreDelArchivo(pestana: PestanaDeReporte, codigoDeObra: string, periodo: { desde: string; hasta: string }) {
  const obra = codigoDeObra.trim().replace(/[^A-Za-z0-9-]+/g, '-') || 'obra';
  return `reporte-${pestana}-${obra}-${periodo.desde}-${periodo.hasta}.xlsx`;
}

/** Las hojas del Excel de cada pestaña. */
export function hojasDelReporte<P extends PestanaDeReporte>(pestana: P, datos: ReporteDe<P>): HojaDeReporte[] {
  switch (pestana) {
    case 'maquinas':
      return hojasDeMaquinas(datos as ReporteDe<'maquinas'>);
    case 'mantenimiento':
      return hojasDeMantenimiento(datos as ReporteDe<'mantenimiento'>);
    case 'personal':
      return hojasDePersonal(datos as ReporteDe<'personal'>);
    case 'actividades':
      return hojasDeActividades(datos as ReporteDe<'actividades'>);
    case 'cantera':
      return hojasDeCantera(datos as ReporteDe<'cantera'>);
    case 'calidad':
      return hojasDeCalidad(datos as ReporteDe<'calidad'>);
    default:
      return hojasDeClima(datos as ReporteDe<'clima'>);
  }
}

function hojasDeMaquinas(datos: ReporteDe<'maquinas'>): HojaDeReporte[] {
  return [
    {
      nombre: 'Máquinas',
      encabezados: ['Máquina', 'Tipo', 'Unidad', 'Total', 'Días trabajados', 'Días sin trabajar', 'Promedio por día', 'Mantenimiento'],
      formatos: { Total: 'numero', 'Días trabajados': 'entero', 'Días sin trabajar': 'entero', 'Promedio por día': 'numero' },
      filas: datos.maquinas.map((m) => [
        m.codigo,
        m.tipo,
        UNIDAD_DE_MEDIDOR[m.claseMedidor],
        m.total,
        m.diasTrabajados,
        m.diasSinTrabajar,
        m.promedio,
        m.mantenimiento ? m.mantenimiento.texto + (m.mantenimiento.correctivoPendiente ? ' · correctivo pendiente' : '') : null,
      ]),
    },
    {
      nombre: 'Por día',
      encabezados: ['Fecha', 'Máquina', 'Trabajó', 'Operador', 'Lectura inicial', 'Lectura final', 'Horas o km'],
      formatos: { 'Lectura inicial': 'numero', 'Lectura final': 'numero', 'Horas o km': 'numero' },
      filas: datos.maquinas.flatMap((m) =>
        m.dias.map((d) => [d.fecha, m.codigo, TRABAJO[d.trabajo], d.operador, d.inicial, d.final, d.avance]),
      ),
    },
  ];
}

function hojasDeMantenimiento(datos: ReporteDe<'mantenimiento'>): HojaDeReporte[] {
  const estado = (h: { anuladoEn: unknown; resueltoEn: string | null; clase: string }) =>
    h.anuladoEn ? 'Anulado' : h.clase === 'correctivo' ? (h.resueltoEn ? `Resuelto el ${h.resueltoEn}` : 'Pendiente') : 'Vigente';
  return [
    {
      nombre: 'Estado',
      encabezados: ['Máquina', 'Tipo', 'Lectura actual', 'Unidad', 'Aceite', 'Preventivo', 'Correctivo pendiente', 'Fuera de servicio'],
      formatos: { 'Lectura actual': 'numero' },
      filas: datos.maquinas.map((m) => [
        m.codigo,
        m.tipo,
        m.lectura,
        UNIDAD_DE_MEDIDOR[m.claseMedidor],
        m.clases.aceite.texto,
        m.clases.preventivo.texto,
        m.correctivosPendientes.length > 0 ? m.correctivosPendientes.map((c) => `${c.fecha}: ${c.nota}`).join(' · ') : 'No',
        m.fueraDeServicio ? 'Sí' : 'No',
      ]),
    },
    {
      nombre: 'Historial',
      encabezados: ['Fecha', 'Máquina', 'Clase', 'Lectura', 'Nota', 'Origen', 'Registró', 'Estado', 'Motivo de la anulación'],
      formatos: { Lectura: 'numero' },
      filas: datos.historial.map((h) => [
        h.fecha,
        h.codigo,
        NOMBRE_DE_CLASE[h.clase as ClaseDeMantenimiento],
        h.lectura,
        h.nota,
        h.origen === 'whatsapp' ? 'WhatsApp' : 'Panel',
        h.registradoPor,
        estado(h),
        h.motivoAnulacion,
      ]),
    },
  ];
}

function hojasDePersonal(datos: ReporteDe<'personal'>): HojaDeReporte[] {
  return [
    {
      nombre: 'Personal',
      encabezados: ['Persona', 'Cargo', 'Horas laboradas', 'Extra diurnas', 'Extra nocturnas', 'Días trabajados', 'Novedades', 'Avisos'],
      formatos: { 'Horas laboradas': 'numero', 'Extra diurnas': 'numero', 'Extra nocturnas': 'numero', 'Días trabajados': 'entero' },
      filas: datos.personas.map((p) => [
        p.nombre,
        p.cargo,
        horas(p.laboradas),
        horas(p.extraDiurna),
        horas(p.extraNocturna),
        p.diasTrabajados,
        Object.entries(p.novedades).map(([n, dias]) => `${nombreDeNovedad(n)}: ${dias} ${dias === 1 ? 'día' : 'días'}`).join(' · ') || null,
        [
          p.diasConExtraDeMas.length > 0 ? `Más de 2 h extra: ${p.diasConExtraDeMas.map(diaCorto).join(', ')}` : '',
          ...p.semanasConExtraDeMas.map((s) => `Más de 12 h extra la semana del ${diaCorto(s.desde)} (${horas(s.extra)} h)`),
        ]
          .filter(Boolean)
          .join(' · ') || null,
      ]),
    },
    {
      nombre: 'Por día',
      encabezados: ['Fecha', 'Persona', 'Estado', 'Horas laboradas', 'Extra diurnas', 'Extra nocturnas', 'Novedad'],
      formatos: { 'Horas laboradas': 'numero', 'Extra diurnas': 'numero', 'Extra nocturnas': 'numero' },
      filas: datos.personas.flatMap((p) =>
        p.dias.map((d) => [
          d.fecha,
          p.nombre,
          ESTADO_PERSONA[d.estado],
          d.estado === 'registrada' ? horas(d.laboradas) : null,
          d.estado === 'registrada' ? horas(d.extraDiurna) : null,
          d.estado === 'registrada' ? horas(d.extraNocturna) : null,
          d.novedad ? nombreDeNovedad(d.novedad) : null,
        ]),
      ),
    },
  ];
}

function hojasDeActividades(datos: ReporteDe<'actividades'>): HojaDeReporte[] {
  return [
    {
      nombre: 'Por ítem',
      encabezados: ['Ítem', 'Actividad', 'Unidad', 'Cantidad', 'Días'],
      formatos: { Cantidad: 'numero', Días: 'entero' },
      filas: datos.items.map((i) => [i.item, i.nombre, i.unidad, i.cantidad, i.dias.length]),
    },
    {
      nombre: 'Por día',
      encabezados: ['Fecha', 'Ítem', 'Actividad', 'Unidad', 'Cantidad'],
      formatos: { Cantidad: 'numero' },
      filas: datos.items.flatMap((i) => i.porDia.map((d) => [d.fecha, i.item, i.nombre, i.unidad, d.cantidad])),
    },
    {
      nombre: 'Fuera del presupuesto',
      encabezados: ['Fecha', 'Actividad', 'Descripción', 'Unidad', 'Cantidad'],
      formatos: { Cantidad: 'numero' },
      filas: datos.otras.map((o) => [o.fecha, o.nombre, o.descripcion, o.unidad, o.cantidad]),
    },
  ];
}

function hojasDeCantera(datos: ReporteDe<'cantera'>): HojaDeReporte[] {
  const hoja = (nombre: string, titulo: string, conteos: { nombre: string; viajes: number }[]): HojaDeReporte => ({
    nombre,
    encabezados: [titulo, 'Viajes'],
    formatos: { Viajes: 'entero' },
    filas: conteos.map((c) => [c.nombre, c.viajes]),
  });
  return [
    hoja('Por volqueta', 'Volqueta', datos.porVolqueta),
    hoja('Por material', 'Material', datos.porMaterial),
    hoja('Por origen', 'Origen', datos.porOrigen),
    hoja('Por destino', 'Destino', datos.porDestino),
  ];
}

function hojasDeCalidad(datos: ReporteDe<'calidad'>): HojaDeReporte[] {
  return [
    {
      nombre: 'Por ensayo',
      encabezados: ['Ensayo', 'Hechos', 'Cumplen', 'No cumplen', 'Sin dato'],
      formatos: { Hechos: 'entero', Cumplen: 'entero', 'No cumplen': 'entero', 'Sin dato': 'entero' },
      filas: datos.porEnsayo.map((e) => [e.nombre, e.total, e.cumplen, e.noCumplen, e.sinDato]),
    },
    {
      nombre: 'No cumplen',
      encabezados: ['Fecha', 'Ensayo', 'Ubicación', 'Edad (días)', 'Resultado', 'Unidad', 'Responsable', 'Observación'],
      formatos: { 'Edad (días)': 'entero', Resultado: 'numero' },
      filas: datos.noCumplen.map((e) => [e.fecha, e.nombre, e.ubicacion, e.edadDias, e.resultado, e.unidad, e.responsable, e.observacion || null]),
    },
  ];
}

function hojasDeClima(datos: ReporteDe<'clima'>): HojaDeReporte[] {
  return [
    {
      nombre: 'Clima y novedades',
      encabezados: ['Fecha', 'Bitácora', 'Clima', 'Lluvia', 'Sin trabajo', 'Motivo', 'Notas'],
      filas: datos.dias.map((d) => [
        d.fecha,
        d.conBitacora ? (d.abierta ? 'Abierta' : 'Cerrada') : 'Sin bitácora',
        d.franjas.map((f) => `${f.desde}–${f.hasta} ${f.nombre}`).join(' · ') || null,
        d.conBitacora ? (d.lluvia ? 'Sí' : 'No') : null,
        d.conBitacora ? (d.sinTrabajo ? 'Sí' : 'No') : null,
        d.motivoSinTrabajo,
        d.notas || null,
      ]),
    },
  ];
}

/* ── Para imprimir (RF-10) ────────────────────────────────────────────── */

function escapar(texto: string): string {
  return texto.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function celdaImpresa(valor: CeldaDeReporte, formato: FormatoDeColumna | undefined): string {
  if (valor === null) return '<td>—</td>';
  if (typeof valor === 'number') {
    const texto = valor.toLocaleString('es-CO', { maximumFractionDigits: formato === 'entero' ? 0 : 2 });
    return `<td class="numero">${texto}</td>`;
  }
  return `<td>${escapar(valor)}</td>`;
}

/**
 * La página para imprimir o guardar como PDF (RF-10): el encabezado de la obra, el
 * periodo y la fecha de generación, y las mismas hojas que el Excel, una tabla cada
 * una. Carta horizontal y sin cortar una fila entre dos hojas (RNF).
 *
 * En un mes no van las hojas «Por día»: cuarenta personas por treinta días no caben en
 * papel, y para eso está el Excel (plan, riesgos).
 */
export function paginaParaImprimir(datos: {
  titulo: string;
  subtitulo: string;
  hojas: readonly HojaDeReporte[];
  esMes: boolean;
}): string {
  const hojas = datos.hojas.filter((h) => !(datos.esMes && h.nombre === 'Por día'));
  const tablas = hojas
    .map((h) => {
      const encabezado = h.encabezados.map((e) => `<th>${escapar(e)}</th>`).join('');
      const filas =
        h.filas.length === 0
          ? `<tr><td colspan="${h.encabezados.length}" class="vacio">Sin datos en este periodo.</td></tr>`
          : h.filas
              .map((f) => `<tr>${f.map((v, i) => celdaImpresa(v, h.formatos?.[h.encabezados[i]])).join('')}</tr>`)
              .join('');
      return `<section><h2>${escapar(h.nombre)}</h2><table><thead><tr>${encabezado}</tr></thead><tbody>${filas}</tbody></table></section>`;
    })
    .join('');
  return `<!doctype html>
<html lang="es"><head><meta charset="utf-8"><title>${escapar(datos.titulo)}</title>
<style>
  @page { size: letter landscape; margin: 12mm; }
  body { font-family: system-ui, sans-serif; color: #1b1b1b; font-size: 11px; margin: 16px; }
  h1 { font-size: 18px; margin: 0 0 4px; }
  p.subtitulo { margin: 0 0 16px; color: #555; }
  h2 { font-size: 13px; margin: 18px 0 6px; }
  table { border-collapse: collapse; width: 100%; }
  th, td { border: 1px solid #ccc; padding: 4px 6px; text-align: left; vertical-align: top; }
  th { background: #f0eee9; }
  td.numero { text-align: right; white-space: nowrap; }
  td.vacio { color: #777; text-align: center; }
  tr { break-inside: avoid; page-break-inside: avoid; }
  thead { display: table-header-group; }
  .acciones { margin-bottom: 12px; }
  @media print { .acciones { display: none; } }
</style></head>
<body>
<div class="acciones"><button onclick="window.print()">Imprimir o guardar como PDF</button></div>
<h1>${escapar(datos.titulo)}</h1>
<p class="subtitulo">${escapar(datos.subtitulo)}</p>
${tablas}
</body></html>`;
}

