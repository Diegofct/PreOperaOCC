/**
 * Lo que las pantallas de planificación y cumplimiento le piden al servidor, y lo que reciben
 * (spec 043), escrito una sola vez.
 *
 * Va aparte de `contratos.ts`, que ya pasa de tres mil líneas. El motivo de tener un solo sitio es
 * el mismo: de cada esquema salen la validación de la ruta y el tipo del formulario, y el servidor
 * vuelve a validar porque no confía en el navegador.
 *
 * Solo Zod y `shared/rules`, que es puro: las dos mitades lo importan sin arrastrar nada de la otra.
 *
 * ── Spec 045: lo que la pantalla edita ──
 *
 * El esquema de edición del borrador solo tiene los campos editables (RF-46 a RF-51). No hay
 * precio ni cantidad contractual, ni descripción, ni valor de rubro, ni totales: Zod descarta lo
 * que no está en el esquema, así que aunque el navegador los mande no llegan a la regla (RF-52,
 * RF-53, RF-57). Los mensajes de plazo salen de `validarPlazo`, el mismo texto que da la regla.
 * Los meses con decimales pasan aquí, porque un Excel los trae: los rechaza la regla, y solo si
 * alguien los digitó (T8).
 */
import { z } from 'zod';

import type { InformeDeCumplimiento, InformeEnCantidades } from '@/shared/rules/cumplimiento-de-obra';
import type { RechazadoPorIa } from '@/shared/rules/formulario-presupuesto-ia';
import {
  CONCEPTOS_INDIRECTOS,
  validarPlazo,
  type EstadoDeLecturaDePlanificacion,
  type EstadoDePlanificacion,
  type EstructuraDePlanificacion,
  type FrenteSinGrupo,
  type HallazgoDelBorrador,
  type ImpedimentoParaAprobar,
  type OrigenDePlanificacion,
  type ResumenDeLaPlanificacion,
  type TipoDeLecturaDePlanificacion,
} from '@/shared/rules/planificacion';
import type { CalculoDeLaPlanificacion, EdicionDelBorrador, FijadosDescartados } from '@/shared/rules/planificacion-borrador';
import {
  USOS_DE_HOJA,
  type DiferenciaPorConcepto,
  type FaltaDeSeleccion,
  type PropuestaDeHojas,
} from '@/shared/rules/planificacion-ia';

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

/**
 * Spec 045, RF-28: la propuesta del calendario que está corriendo en la obra, para que la vea
 * cualquiera que abra la planificación, no solo quien la lanzó. `desde` es cuándo empezó (ISO).
 */
export interface PropuestaEnCurso {
  lecturaId: string;
  desde: string;
}

/** El estado de una lectura en curso (RF-9, RF-107). */
export interface EstadoDeLectura {
  estado: EstadoDeLecturaDePlanificacion;
  /** Spec 045, RF-28: la lectura de un Excel o la propuesta del calendario. */
  tipo?: TipoDeLecturaDePlanificacion;
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
  /** Spec 045: los del borrador, que incluyen los de la 043. */
  hallazgos: HallazgoDelBorrador[];
  resumen: ResumenDeLaPlanificacion;
  rechazados: RechazadoPorIa[];
  mesesCumplidos: { mes: string; marcadoPor: string; marcadoEn: string }[];
  /** RF-40: se cruzó contra un presupuesto que ya no es el vigente. */
  presupuestoDesactualizado: boolean;
  /** RF-121: los meses que hay que responder al aprobar la primera. */
  mesesPorMarcar: string[];
  /** Spec 045, RF-147: de dónde nació, y el id de la versión copiada si es una copia. */
  origen: OrigenDePlanificacion;
  copiadaDe: string | null;
  /** RF-148, RF-149: solo las nacidas de un Excel ofrecen el original. */
  tieneExcel: boolean;
  /**
   * RF-150 a RF-153: los renglones de mano de obra indirecta se quitaron de `estructura` para este
   * acceso; el total del concepto sigue en `indirectosPorConcepto`.
   */
  manoDeObraIndirectaRecortada: boolean;
}

/** Lo que recibe la pantalla: con plata, o solo cantidades para el Residente (RF-87, RF-88). */
export type InformeRespuesta = InformeDeCumplimiento | InformeEnCantidades;

/** ¿Este informe trae plata? Para que la pantalla no pinte columnas de más. */
export function informeConPlata(informe: InformeRespuesta): informe is InformeDeCumplimiento {
  return 'totales' in informe;
}

// ── Spec 045 ──

const MES_VALIDO = z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/, 'El mes tiene que ser un mes válido, como 2026-01.');

/** RF-1 a RF-5: el plazo, con los mismos mensajes que da la regla. */
const plazoPedido = z
  .object({ meses: z.number({ error: 'El plazo va en meses.' }), arranque: z.string({ error: 'Falta el mes de arranque.' }) })
  .superRefine((plazo, contexto) => {
    const motivo = validarPlazo(plazo);
    if (motivo) contexto.addIssue({ code: 'custom', message: motivo, path: motivo.includes('arranque') ? ['arranque'] : ['meses'] });
  });

/** RF-54: una cifra digitada; vacía es `null`. */
const cifra = (que: string) =>
  z.number({ error: `${que} tiene que ser un número.` }).min(0, `${que} no puede ser negativo.`).nullable();
/** Un mes de inicio o vacío. */
const mesOpcional = MES_VALIDO.nullable();
/** La cantidad de meses; que sea entera lo decide la regla (RF-55). */
const tiempo = z.number().positive('La cantidad de meses tiene que ser mayor que cero.').nullable();
const fijados = z
  .array(z.object({ mes: MES_VALIDO, valor: z.number().min(0, 'Un mes fijado no puede ser negativo.') }))
  .max(240);

/** RF-8 a RF-13, RF-112, RF-142. */
export const pedidoDesdePresupuesto = z.object({
  plazo: plazoPedido,
  /** RF-13: obligatorio si el presupuesto tiene varios grupos; eso lo comprueba la regla. */
  grupoId: z.string().min(1).nullable().default(null),
  /** RF-112: la planificación de la cual copiar los indirectos. */
  copiarIndirectosDe: z.string().min(1).nullable().default(null),
  /** RF-142: confirma que se sustituye el borrador que hay. */
  sustituir: z.boolean().default(false),
});
export type PedidoDesdePresupuesto = z.infer<typeof pedidoDesdePresupuesto>;

const base = {
  id: z.string().min(1).max(100),
  concepto: z.enum(CONCEPTOS_INDIRECTOS, { error: 'Ese concepto de costo indirecto no existe.' }),
  descripcion: z.string().trim().min(1, 'Cada renglón indirecto necesita una descripción.').max(300),
  revisar: z.boolean().default(false),
  sinDesglose: z.boolean().optional(),
  // RF-171: viaja para que el renglón se pinte igual, pero `aplicarEdicion` no la toma del pedido.
  periodoDeducido: z.boolean().optional(),
};
const conPeriodo = { mesInicio: mesOpcional, tiempoEjecucion: tiempo, fijados };

/** RF-74 a RF-79, RF-81 a RF-85, RF-92: un renglón con los campos de su forma, y nada más. */
export const renglonIndirectoPedido = z.discriminatedUnion(
  'forma',
  [
    z.object({ ...base, ...conPeriodo, forma: z.literal('fijo'), valor: cifra('El valor') }),
    z.object({ ...base, forma: z.literal('porcentaje'), porcentaje: cifra('El porcentaje') }),
    z.object({
      ...base,
      ...conPeriodo,
      forma: z.literal('mensual'),
      cantidad: cifra('La cantidad'),
      valorMensual: cifra('El valor mensual'),
      valorMensualAdicional: cifra('El valor mensual adicional'),
    }),
    z.object({
      ...base,
      ...conPeriodo,
      forma: z.literal('personal'),
      salario: cifra('El salario'),
      acomodacion: cifra('La acomodación'),
      viaticos: cifra('Los viáticos'),
      dedicacion: cifra('La dedicación'),
      operativo: z.boolean().default(false),
    }),
  ],
  { error: 'Cada renglón indirecto necesita una forma de cálculo: valor fijo, porcentaje, mensual o personal.' },
);

/** RF-44 a RF-60, RF-81 a RF-91, RF-165 a RF-167: el borrador editable completo, con su versión. */
export const edicionDeBorradorPedida = z.object({
  /** RF-58: el bloqueo optimista. */
  version: z.number().int().min(0),
  plazo: plazoPedido,
  factorPrestacional: z.number().min(0, 'El factor prestacional no puede ser negativo.'),
  recargoHorasExtras: z.number().min(0, 'El recargo de horas extras no puede ser negativo.'),
  items: z
    .array(
      z.object({
        llave: z.string().min(1).max(600),
        medidaReal: cifra('La medida real'),
        medidaCoste: cifra('La medida para costo'),
        precioCosto: cifra('El precio de costo'),
        mesInicio: mesOpcional,
        tiempoEjecucion: tiempo,
        fijados,
      }),
    )
    .max(3000),
  rubros: z
    .array(
      z.object({
        nombre: z.string().min(1).max(300),
        costo: cifra('El costo'),
        mesInicio: mesOpcional,
        tiempoEjecucion: tiempo,
        fijados,
      }),
    )
    .max(500),
  lineaDeRubros: z.object({ fijados }).nullable(),
  renglonesIndirectos: z.array(renglonIndirectoPedido).max(1000),
});
export type EdicionDeBorradorPedida = z.infer<typeof edicionDeBorradorPedida>;

/** La edición que entiende la regla, sin la versión, que es del bloqueo. */
export function edicionDelPedido(pedido: EdicionDeBorradorPedida): EdicionDelBorrador {
  const { version: _version, ...edicion } = pedido;
  return edicion;
}

/** RF-138, RF-142. */
export const copiaDePlanificacion = z.object({ sustituir: z.boolean().default(false) });

/** Lo que responde guardar el borrador: todo recalculado por el servidor (RF-57). */
export interface BorradorGuardado {
  version: number;
  estructura: EstructuraDePlanificacion;
  calculo: CalculoDeLaPlanificacion;
  hallazgos: HallazgoDelBorrador[];
  impedimentos: ImpedimentoParaAprobar[];
  /** RF-104. */
  descartados: FijadosDescartados[];
  /** RF-43. */
  diferenciasPorConcepto: DiferenciaPorConcepto[];
}

/** RF-112, RF-113: una planificación de la cual se pueden copiar indirectos. */
export interface FuenteDeIndirectosFila {
  id: string;
  obraId: string;
  obra: string;
  numeroVersion: number;
  estado: Extract<EstadoDePlanificacion, 'vigente' | 'reemplazada'>;
  renglones: number;
}
