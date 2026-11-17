/**
 * Los contratos de las requisiciones (spec 046): lo que el panel manda al crear y al decidir, y lo
 * que le responde el servidor en la lista del lugar y en la bandeja de Elemental.
 *
 * Aquí solo la forma. Lo que impide guardar —un renglón sin fecha, una fecha pasada, un valor en
 * cero— lo dicen las reglas (`faltasDeLaSolicitud`, `faltasDeLaSolicitudDePago`) con un 422 y su
 * mensaje junto al campo, como en la 036 y la 037. Lo que falta del todo, o no es de esta clase de
 * requisición, sí lo rechaza el esquema, en español.
 */
import { z } from 'zod';

import type { RequisicionOccEnLaLista } from '@/features/panel/requisiciones-occ';
import { DECISIONES, type PasoDeLaCadena, type TipoDeRequisicion } from '@/shared/rules/requisiciones';

/** Un renglón de una requisición de compra (RF-10): lo de la 036 más la fecha y el para qué. */
const renglonDeRequisicion = z.object({
  descripcion: z.string().trim().max(300),
  cantidad: z.number({ error: 'La cantidad va en números.' }),
  unidad: z.string().trim().max(40),
  materialId: z
    .string()
    .trim()
    .max(64)
    .nullish()
    .transform((v) => (v ? v : null)),
  necesitaEl: z.string({ error: 'Diga para cuándo se necesita cada renglón.' }).trim().max(20),
  paraQue: z.string({ error: 'Diga para qué es cada renglón.' }).trim().max(500),
});

/** Una requisición de compra al pedirla (RF-9, RF-10, RF-13). `nota` es la nota general opcional. */
export const requisicionDeCompraPedida = z.object({
  tipo: z.literal('compra'),
  urgente: z.boolean().default(false),
  nota: z.string().trim().max(1000).default(''),
  proveedorSugerido: z.string().trim().max(200).default(''),
  valorEstimado: z
    .number({ error: 'El valor estimado va en pesos, sin decimales y mayor que cero.' })
    .nullish()
    .transform((v) => v ?? null),
  renglones: z.array(renglonDeRequisicion, { error: 'Diga lo que se necesita, renglón por renglón.' }).max(100),
});

/** Una requisición de pago al pedirla (RF-14): lo de la 037, con una sola fecha y un solo para qué. */
export const requisicionDePagoPedida = z.object({
  tipo: z.literal('pago'),
  urgente: z.boolean().default(false),
  beneficiario: z.string().trim().max(200),
  beneficiarioDocumento: z.string().trim().max(40).default(''),
  concepto: z.string().trim().max(40),
  paraQue: z.string().trim().max(1000),
  valor: z.number({ error: 'El valor va en pesos, sin decimales y mayor que cero.' }),
  paraCuando: z.string().trim().max(20),
  // Una de pago no lleva renglones: si llegan, es que se mandó la clase equivocada.
  renglones: z.undefined({ error: 'Una requisición de pago no lleva renglones: es un beneficiario y un valor.' }).optional(),
});

/** Crear una requisición (RF-4): de compra o de pago. */
export const requisicionPedida = z.discriminatedUnion('tipo', [requisicionDeCompraPedida, requisicionDePagoPedida], {
  error: 'Diga si la requisición es de compra o de pago.',
});

export type RequisicionPedida = z.input<typeof requisicionPedida>;
export type RequisicionDeCompraPedida = z.output<typeof requisicionDeCompraPedida>;
export type RequisicionDePagoPedida = z.output<typeof requisicionDePagoPedida>;

/**
 * Decidir en un paso (RF-25 a RF-34). `version` es la que se vio (RF-68). `cantidades` (compra) y
 * `valorAprobado` (pago) solo al aprobar, y solo los acepta la Administradora o la Gerencia
 * (RF-34, RF-79, RF-80).
 */
export const decisionPedida = z.object({
  decision: z.enum(DECISIONES, { error: 'La decisión es aprobar, devolver o rechazar.' }),
  version: z.number({ error: 'Falta la versión de la requisición que vio.' }).int().min(1),
  motivo: z.string().trim().max(1000).default(''),
  cantidades: z
    .array(z.object({ renglonId: z.string().max(64), cantidad: z.number() }))
    .max(100)
    .default([]),
  valorAprobado: z
    .number({ error: 'El valor aprobado va en pesos, sin decimales.' })
    .nullish()
    .transform((v) => v ?? null),
});

export type DecisionPedida = z.input<typeof decisionPedida>;

/** Un lugar de requisiciones: una obra o GeoLab (RF-1). */
export type LugarDeRequisiciones = { obraId: string } | { empresa: 'geolab' | 'occ' };

/**
 * Una requisición en una lista (RF-45, RF-49 a RF-52, RF-82, RF-83): una RQ de compra o de pago, o
 * una SC o SP anterior. `valor` no existe para quien no ve valores (RF-52): ni en `null`.
 */
export interface RequisicionEnLaLista {
  tipo: TipoDeRequisicion;
  id: string;
  /** `RQ-0001`, o el SC o SP de antes (RF-5, RF-53). */
  codigo: string;
  numero: number;
  numeroRequisicion: number | null;
  estado: string;
  /** «En aprobación: Director de Obra», o el estado de siempre (RF-82). */
  estadoQueSeVe: string;
  paso: PasoDeLaCadena | null;
  lugar: { tipo: 'empresa' | 'obra'; id: string; nombre: string };
  urgente: boolean;
  paraCuando: string;
  /** Lo que se pidió en una línea: los renglones, o el beneficiario y el concepto. */
  resumen: string;
  valor?: number | null;
  pedidaPor: { id: string; nombre: string };
  pedidaEn: string;
  /** El día en que se pidió, en Colombia, para filtrar por fechas (RF-51). */
  pedidaEl: string;
  /** «Anterior», «Devuelta: corrígela», «Vencida». */
  marcas: string[];
  /** RF-45: arriba de la lista. */
  esperaMiAprobacion: boolean;
  version: number;
}

/** Requisiciones de una obra o de GeoLab (RF-1, RF-45, RF-49). */
export interface RequisicionesDelLugar {
  /** En el orden de RF-45 y RF-49. */
  requisiciones: RequisicionEnLaLista[];
  /** ¿Puede pedir aquí? No la Administradora (RF-8), ni en una obra inactiva, ni en OCC (047, RF-1). */
  sePuedePedir: boolean;
  /** Spec 047, RF-3: en OCC, las requisiciones de pagos del viernes. */
  pagosOcc?: RequisicionOccEnLaLista[];
  /** Spec 047, RF-4: ¿puede crear la de pagos del viernes? */
  sePuedePedirOcc?: boolean;
}

/** La bandeja de Elemental (RF-47, RF-48, RF-75, RF-83). */
export interface BandejaDeRequisiciones {
  requisiciones: RequisicionEnLaLista[];
  /** Spec 047, RF-49, RF-50: las de pagos de OCC en autorización, con «OCC», por viernes. */
  pagosOcc: RequisicionOccEnLaLista[];
  resumen: { esperan: number; urgentes: number; vencidas: number };
  /** RF-75: no hay ninguna Administradora activa; lo de su paso espera a la Gerencia. */
  sinAdministradora: boolean;
}

/** Lo que responde crear (RF-5). */
export interface RequisicionCreada {
  tipo: TipoDeRequisicion;
  id: string;
  codigo: string;
  paso: PasoDeLaCadena;
  estadoQueSeVe: string;
}

/**
 * La cadena de una requisición, para su detalle (RF-33, RF-46): cada paso con quién lo ocupa, si
 * ya aprobó, si está ahí, si falta o si se saltó; y si quien la mira puede decidir o recortar.
 */
export interface CadenaDeLaRequisicion {
  paso: PasoDeLaCadena | null;
  pasos: {
    paso: PasoDeLaCadena;
    nombre: string;
    quienes: string[];
    como: 'aprobado' | 'aqui' | 'falta' | 'saltado' | 'devolvio' | 'rechazo';
    /** Si aprobó, se saltó, la devolvió o la rechazó: quién lo hizo (su nombre), cuándo y por qué (T15). */
    por?: string;
    en?: string;
    motivo?: string;
  }[];
  puedeDecidir: boolean;
  puedeRecortar: boolean;
}

/** Lo de requisición que trae el detalle de una RQ de compra o de pago (RF-5, RF-46, RF-82). */
export interface RequisicionEnElDetalle {
  codigo: string;
  estadoQueSeVe: string;
  cadena: CadenaDeLaRequisicion;
}
