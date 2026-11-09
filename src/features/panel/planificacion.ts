/**
 * Lo que las pantallas de planificación y cumplimiento le piden al servidor, y lo que reciben
 * (spec 043), escrito una sola vez.
 *
 * Va aparte de `contratos.ts`, que ya pasa de tres mil líneas. El motivo de tener un solo sitio es
 * el mismo: de cada esquema salen la validación de la ruta y el tipo del formulario, y el servidor
 * vuelve a validar porque no confía en el navegador.
 *
 * Solo Zod y tipos de `shared/rules`: las dos mitades lo importan sin arrastrar nada de la otra.
 */
import { z } from 'zod';

import type { InformeDeCumplimiento, InformeEnCantidades } from '@/shared/rules/cumplimiento-de-obra';
import type { RechazadoPorIa } from '@/shared/rules/formulario-presupuesto-ia';
import type {
  EstadoDeLecturaDePlanificacion,
  EstadoDePlanificacion,
  EstructuraDePlanificacion,
  FrenteSinGrupo,
  HallazgoDePlanificacion,
  ResumenDeLaPlanificacion,
} from '@/shared/rules/planificacion';
import { USOS_DE_HOJA, type FaltaDeSeleccion, type PropuestaDeHojas } from '@/shared/rules/planificacion-ia';

const MES = z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/, 'El mes va como AAAA-MM.');

/** RF-6, RF-100, RF-103: las hojas que la persona confirmó y para qué sirve cada una. */
export const seleccionDeHojasPedida = z.object({
  hojas: z
    .array(z.object({ nombre: z.string().min(1).max(200), usos: z.array(z.enum(USOS_DE_HOJA)).min(1) }))
    .min(1, 'Escoja al menos una hoja.'),
  confirmoProgramacion: z.boolean().optional(),
});
export type SeleccionDeHojasPedida = z.infer<typeof seleccionDeHojasPedida>;

/** RF-107: el grupo del presupuesto que la persona escogió para cada frente del libro. */
export const gruposElegidos = z.record(z.string(), z.string().min(1));

/** RF-35, RF-99, RF-121. */
export const aprobacionDePlanificacion = z.object({
  version: z.number().int().min(0),
  /** Una sola confirmación del conjunto de hallazgos. */
  confirmarHallazgos: z.boolean().default(false),
  /** La respuesta mes por mes de la primera aprobación: los que ya se cumplieron. */
  mesesCumplidos: z.array(MES).optional(),
});
export type AprobacionDePlanificacion = z.infer<typeof aprobacionDePlanificacion>;

/** RF-47. */
export const anulacionDePlanificacion = z.object({
  motivo: z.string().trim().min(1, 'Escriba el motivo de la anulación.').max(500),
});

/** RF-58, RF-59. */
export const pedidoDeInformeDeCumplimiento = z.object({
  tipo: z.enum(['semana', 'mes']),
  fecha: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'La fecha va como AAAA-MM-DD.'),
});

export const FORMATOS_DE_DESCARGA = ['excel', 'pdf'] as const;
export type FormatoDeDescarga = (typeof FORMATOS_DE_DESCARGA)[number];

/** RF-4, RF-43: lo que responde la propuesta de hojas. */
export interface PropuestaDeHojasRespuesta {
  propuesta: PropuestaDeHojas;
  /** Las hojas visibles del libro, para poder escoger otra. */
  hojasVisibles: string[];
  /** Si ya hay borrador, subir otro pide confirmar antes de sustituirlo. */
  borrador: { id: string; numeroVersion: number; version: number } | null;
}

export interface LecturaIniciada {
  lecturaId: string;
}

/** El estado de una lectura en curso (RF-9, RF-107). */
export interface EstadoDeLectura {
  estado: EstadoDeLecturaDePlanificacion;
  planificacionId: string | null;
  error: string | null;
  candidatos: FrenteSinGrupo[] | null;
  /** RF-100, RF-103: lo que falta confirmar en las hojas. */
  faltas?: FaltaDeSeleccion[];
}

export interface PlanificacionFila {
  id: string;
  numeroVersion: number;
  estado: EstadoDePlanificacion;
  rigeDesde: string | null;
  rigeHasta: string | null;
  aprobadoEn: string | null;
  anuladoEn: string | null;
  motivoAnulacion: string | null;
  creadoEn: string;
}

export interface PlanificacionDetalle extends PlanificacionFila {
  obraId: string;
  version: number;
  estructura: EstructuraDePlanificacion;
  hallazgos: HallazgoDePlanificacion[];
  resumen: ResumenDeLaPlanificacion;
  rechazados: RechazadoPorIa[];
  mesesCumplidos: { mes: string; marcadoPor: string; marcadoEn: string }[];
  /** RF-40: se cruzó contra un presupuesto que ya no es el vigente. */
  presupuestoDesactualizado: boolean;
  /** RF-121: los meses que hay que responder al aprobar la primera. */
  mesesPorMarcar: string[];
}

/** Lo que recibe la pantalla: con plata, o solo cantidades para el Residente (RF-87, RF-88). */
export type InformeRespuesta = InformeDeCumplimiento | InformeEnCantidades;

/** ¿Este informe trae plata? Para que la pantalla no pinte columnas de más. */
export function informeConPlata(informe: InformeRespuesta): informe is InformeDeCumplimiento {
  return 'totales' in informe;
}
