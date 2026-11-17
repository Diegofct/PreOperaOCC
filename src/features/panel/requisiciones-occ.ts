/**
 * Los contratos de la requisición de pagos de OCC (spec 047): lo que el panel manda y lo que el
 * servidor le responde.
 *
 * Aquí solo la forma. Lo que impide guardar —un viernes que no es viernes, una línea sin
 * beneficiario, un valor en cero— lo dicen las reglas (`faltaDelViernes`, `faltasDeLaLineaOcc`) con
 * un 422 y su mensaje junto al campo. Lo que falta del todo o no tiene la forma sí lo rechaza el
 * esquema, en español: sin `version` no se sabe qué vio la persona (RF-75), y un valor con centavos
 * no es un valor de este panel (D11).
 */
import { z } from 'zod';

import type { PagoRegistrado } from '@/features/panel/contratos';
import type { PagoDeLaCompra } from '@/shared/rules/pagos';
import type { AccionOcc, EstadoDeRequisicionOcc, RespuestaDeLineaOcc } from '@/shared/rules/requisicion-occ';
import type { PropuestaDeRequisicionOcc } from '@/shared/rules/requisicion-occ-ia';

const version = z.number({ error: 'Falta la versión de la requisición que vio.' }).int().min(1);

/** Crear la del viernes (RF-5). */
export const requisicionOccPedida = z.object({
  viernes: z.string({ error: 'Diga el viernes de entrega.' }).trim().max(20),
});
export type RequisicionOccPedida = z.input<typeof requisicionOccPedida>;

/** Lo de una línea (RF-10). Pesos enteros (D11): con centavos no pasa del esquema. */
export const datosDeLineaOcc = z.object({
  fechaSolicitud: z.string().trim().max(20).default(''),
  beneficiario: z.string().trim().max(200).default(''),
  concepto: z.string().trim().max(500).default(''),
  especificaciones: z.string().trim().max(500).default(''),
  proveedor: z.string().trim().max(200).default(''),
  valor: z
    .number({ error: 'El valor va en pesos, sin centavos y mayor que cero.' })
    .int({ error: 'El valor va en pesos, sin centavos y mayor que cero.' })
    .nullish()
    .transform((v) => v ?? null),
  observaciones: z.string().trim().max(1000).default(''),
});
export type DatosDeLineaOccPedidos = z.input<typeof datosDeLineaOcc>;

/** Agregar o cambiar una línea (RF-19, RF-36, RF-37), con la versión que se vio. */
export const lineaOccPedida = datosDeLineaOcc.extend({ version });
export type LineaOccPedida = z.input<typeof lineaOccPedida>;

/** Quitar una línea (RF-20). */
export const lineaOccQuitada = z.object({ version });

/** Enviar, devolver o cancelar (RF-21, RF-24, RF-25, RF-34). Devolver y cancelar piden motivo. */
export const pasoOccPedido = z.object({
  version,
  accion: z.enum(['enviar', 'devolver', 'cancelar'], { error: 'El paso es enviar, devolver o cancelar.' }),
  motivo: z.string().trim().max(1000).default(''),
});
export type PasoOccPedido = z.input<typeof pasoOccPedido>;

/** Las respuestas de una o varias líneas (RF-26 a RF-28). NO autorizada lleva motivo (RF-77, D10). */
export const respuestasOccPedidas = z.object({
  version,
  respuestas: z
    .array(
      z
        .object({
          lineaId: z.string().max(64),
          respuesta: z.enum(['autorizada', 'no_autorizada'], { error: 'Cada línea se autoriza o no se autoriza.' }),
          motivo: z.string().trim().max(1000).default(''),
        })
        .refine((r) => r.respuesta === 'autorizada' || r.motivo !== '', {
          error: 'Diga por qué no se autoriza.',
          path: ['motivo'],
        }),
    )
    .min(1, { error: 'Responda al menos una línea.' })
    .max(200),
});
export type RespuestasOccPedidas = z.input<typeof respuestasOccPedidas>;

/** Confirmar una importación (RF-61, RF-62): las líneas como quedaron tras revisarlas. */
export const importacionOccConfirmada = z.object({
  /** La de la importación, para que dos confirmaciones no entren dos veces. */
  version,
  /** Si la planilla crea una requisición nueva, su viernes (RF-60). */
  viernes: z.string().trim().max(20).optional(),
  /** O la que ya estaba abierta para ese viernes, si se escoge confirmar en ella (RF-8, RF-60). */
  requisicionId: z.string().max(64).optional(),
  lineas: z.array(datosDeLineaOcc).min(1, { error: 'Confirme al menos una línea.' }).max(200),
});
export type ImportacionOccConfirmada = z.input<typeof importacionOccConfirmada>;

/**
 * Un pago de una línea autorizada (RF-44): lo del pago de la 037, con la versión de la requisición
 * obligatoria y el comprobante como archivo de la requisición, subido antes (`…/comprobante`).
 */
export const pagoDeLineaOccPedido = z.object({
  version,
  fecha: z.string().trim().max(20),
  valor: z.number({ error: 'El valor del pago va en pesos, sin decimales y mayor que cero.' }),
  medio: z.string().trim().max(40),
  referencia: z.string().trim().max(100).default(''),
  comprobanteMediaId: z
    .string()
    .max(64)
    .nullish()
    .transform((v) => v || null),
});
export type PagoDeLineaOccPedido = z.input<typeof pagoDeLineaOccPedido>;

/* ── Respuestas ── */

/** Una requisición de pagos OCC en una lista (RF-3, RF-49 a RF-51). */
export interface RequisicionOccEnLaLista {
  id: string;
  /** `RQ-0001` (RF-2). */
  codigo: string;
  numero: number;
  viernes: string;
  estado: EstadoDeRequisicionOcc;
  estadoQueSeVe: string;
  elaboradaPor: { id: string; nombre: string };
  lineas: number;
  totalPedido: number;
  totalAPagar: number;
  faltanPorResponder: number;
  /** «Vencida», «Devuelta: corrígela». */
  marcas: string[];
  version: number;
}

/** Lo que responde crear (RF-5); o, con 409, la que ya estaba abierta para ese viernes (RF-8). */
export interface RequisicionOccCreada {
  id: string;
  codigo: string;
  version: number;
}

export interface RequisicionOccExistente {
  error: string;
  existente: { id: string; codigo: string; estado: EstadoDeRequisicionOcc };
}

/** Una línea vigente en el detalle (RF-10, RF-15, RF-16, RF-26, RF-31, RF-81). */
export interface LineaOccEnElDetalle {
  id: string;
  /** 1, 2, 3… entre las vigentes (RF-11). */
  numero: number;
  fechaSolicitud: string;
  beneficiario: string;
  concepto: string;
  especificaciones: string;
  proveedor: string;
  valor: number;
  observaciones: string;
  rutMediaId: string | null;
  cuentaMediaId: string | null;
  respuesta: RespuestaDeLineaOcc | null;
  motivoRespuesta: string | null;
  respondida: { por: string; en: string } | null;
  /** Solo en las autorizadas (RF-81). */
  pago: PagoDeLaCompra | null;
  pagado: number;
  porPagar: number;
  pagos: PagoRegistrado[];
}

/** Una requisición de pagos OCC con todo lo que le pasó (RF-39, RF-40 a RF-42). */
export interface RequisicionOccDetallada extends RequisicionOccEnLaLista {
  enviadaEn: string | null;
  lineasVigentes: LineaOccEnElDetalle[];
  historia: { paso: string; motivo: string | null; cambios: unknown[]; por: string; en: string }[];
  /** Las planillas importadas y confirmadas, con su archivo (RF-68). */
  planillas: { id: string; mediaId: string; nombreArchivo: string; en: string }[];
  /** Lo que puede hacer quien la mira. */
  puede: Record<AccionOcc, boolean>;
}

/** Una línea autorizada por pagar, en Tesorería (RF-43). */
export interface LineaOccPorPagar {
  requisicionId: string;
  codigo: string;
  viernes: string;
  /** La de la requisición: se manda al pagar (RF-75). */
  version: number;
  lineaId: string;
  numero: number;
  beneficiario: string;
  concepto: string;
  especificaciones: string;
  valor: number;
  pagado: number;
  porPagar: number;
  rutMediaId: string | null;
  cuentaMediaId: string | null;
}

/** Lo que responde subir una planilla (RF-59): la lectura sigue por detrás. */
export interface ImportacionOccIniciada {
  importacionId: string;
}

/** En qué va una importación y, si está lista, su propuesta (RF-61). */
export interface ImportacionOccDetalle {
  id: string;
  requisicionId: string | null;
  nombreArchivo: string;
  estado: 'en_curso' | 'lista' | 'fallida' | 'confirmada' | 'descartada';
  error: string | null;
  propuesta: PropuestaDeRequisicionOcc | null;
  version: number;
}
