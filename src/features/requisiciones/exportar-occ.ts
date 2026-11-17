/**
 * Qué dice cada celda de la requisición de pagos de OCC en Excel (spec 047, RF-52 a RF-58).
 *
 * **Puro, sin `exceljs` y sin base.** Lo lee `servidor/excel-occ.ts`, que es quien escribe el libro.
 * Está aparte para probar en el guion qué sale en cada celda, y para que el total a pagar salga de
 * `totalAPagarOcc`, la misma regla de la pantalla: si el archivo sumara por su cuenta, un día diría
 * otro total.
 *
 * ── El formato es el de OCC ──
 *
 * Las columnas son las de su hoja REQUISICIONES (`assets/Formato requisiciones pagos OCC.xlsx`),
 * **sin las dos de ítem a imputar** (D1, RF-53). La respuesta va donde OCC la escribía, en
 * observaciones (RF-54), y el visto bueno con el nombre y la fecha de quien respondió (RF-55).
 * Mientras no esté autorizada, el archivo lo dice arriba, para que no circule como si lo estuviera
 * (RF-57).
 */
import { fechaDeJornada } from '@/shared/rules/jornada';
import { nombreDeEstadoOcc, totalAPagarOcc, type EstadoDeRequisicionOcc, type RespuestaDeLineaOcc } from '@/shared/rules/requisicion-occ';

/** Lo que el archivo necesita saber de una línea vigente. */
export interface LineaOccParaExportar {
  numero: number;
  fechaSolicitud: string;
  beneficiario: string;
  concepto: string;
  especificaciones: string;
  proveedor: string;
  valor: number;
  observaciones: string;
  tieneRut: boolean;
  tieneCuenta: boolean;
  respuesta: RespuestaDeLineaOcc | null;
  motivoRespuesta: string | null;
  /** Quién respondió y cuándo (ISO), o `null`. */
  respondida: { por: string; en: string } | null;
}

export interface RequisicionOccParaExportar {
  codigo: string;
  viernes: string;
  estado: EstadoDeRequisicionOcc;
  elaboradaPor: string;
  lineas: readonly LineaOccParaExportar[];
}

/** Las columnas, en el orden de la hoja de OCC, sin ítem a imputar (RF-53). */
export const COLUMNAS_OCC = [
  'N.º',
  'Fecha de solicitud',
  'Beneficiario',
  'Concepto',
  'Especificaciones',
  'Proveedor',
  'Valor (COP)',
  'RUT (Adjunto)',
  'Cuenta bancaria (Adjunta)',
  'Observaciones',
  'Firma visto bueno (Administrador OCC/Gerencia)',
] as const;

export type CeldaOcc = string | number;

export interface PlanillaOcc {
  titulo: string;
  viernes: string;
  elaboradaPor: string;
  totalAPagar: number;
  /** RF-57: el aviso de que no está autorizada, o `null` si ya lo está. */
  aviso: string | null;
  columnas: readonly string[];
  filas: CeldaOcc[][];
}

const ESTADOS_AUTORIZADOS: readonly EstadoDeRequisicionOcc[] = ['autorizada', 'pagada_en_parte', 'pagada'];

/** RF-54: la respuesta y, aparte, lo que escribió quien pidió. */
function observacionesDe(l: LineaOccParaExportar): string {
  const respuesta =
    l.respuesta === 'autorizada'
      ? 'Autorizado'
      : l.respuesta === 'no_autorizada'
        ? `NO Autorizado${l.motivoRespuesta ? `: ${l.motivoRespuesta}` : ''}`
        : '';
  return [respuesta, l.observaciones.trim()].filter(Boolean).join(' · ');
}

/** RF-55: «Nombre · AAAA-MM-DD», con la fecha de Colombia. */
function vistoBuenoDe(l: LineaOccParaExportar): string {
  return l.respondida ? `${l.respondida.por} · ${fechaDeJornada(new Date(l.respondida.en).getTime())}` : '';
}

/** La planilla de una requisición, celda por celda (RF-52 a RF-57). */
export function planillaOcc(r: RequisicionOccParaExportar): PlanillaOcc {
  return {
    titulo: `REQUISICIÓN DE PAGOS OCC · ${r.codigo}`,
    viernes: r.viernes,
    elaboradaPor: r.elaboradaPor,
    totalAPagar: totalAPagarOcc(r.lineas),
    aviso: ESTADOS_AUTORIZADOS.includes(r.estado)
      ? null
      : `Estado: ${nombreDeEstadoOcc(r.estado)}. Esta requisición todavía no está autorizada.`,
    columnas: COLUMNAS_OCC,
    filas: r.lineas.map((l) => [
      l.numero,
      l.fechaSolicitud,
      l.beneficiario,
      l.concepto,
      l.especificaciones,
      l.proveedor,
      l.valor,
      l.tieneRut ? 'Sí' : 'No',
      l.tieneCuenta ? 'Sí' : 'No',
      observacionesDe(l),
      vistoBuenoDe(l),
    ]),
  };
}

/** El nombre con que se guarda: el número y el viernes. */
export function nombreDelArchivoOcc(codigo: string, viernes: string): string {
  return `Requisicion de pagos OCC ${codigo} ${viernes}.xlsx`;
}
