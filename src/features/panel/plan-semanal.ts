/**
 * Lo que las pantallas del plan semanal le piden al servidor, y lo que reciben (spec 044), escrito
 * una sola vez.
 *
 * Va aparte de `planificacion.ts` por lo mismo que esa fue aparte de `contratos.ts`: de cada esquema
 * salen la validación de la ruta y el tipo del formulario, y el servidor vuelve a validar porque no
 * confía en el navegador. Aquí solo se valida la **forma**; si la suma de los días cuadra con la meta
 * o si la semana está en el rango lo decide la regla (`shared/rules/plan-semanal.ts`), con un
 * mensaje que dice qué actividad no cuadra.
 *
 * La estructura del plan se declara campo por campo, y el compilador comprueba que coincide con
 * `EstructuraDelPlan`: si la regla gana un campo y el esquema no, la ruta lo tiraría en silencio al
 * guardar.
 *
 * Solo Zod y tipos de `shared/rules`: las dos mitades lo importan sin arrastrar nada de la otra.
 */
import { z } from 'zod';

import type { RechazadoPorIa } from '@/shared/rules/formulario-presupuesto-ia';
import {
  ESTADOS_DE_LECTURA_DE_PLAN,
  TIPOS_DE_ACTIVIDAD,
  type EstadoDePlanSemanal,
  type EstructuraDelPlan,
  type OrigenDePlanSemanal,
  type VistaDelPlan,
  type VistaDelPlanSinPlata,
} from '@/shared/rules/plan-semanal';
import type { Rol } from '@/shared/rules/permisos';

const DIA = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'La fecha va como AAAA-MM-DD.');
const TEXTO = z.string().max(2000);
const CORTO = z.string().max(300);
const CANTIDAD = z.number().finite().min(0);

/** RF-6, RF-18 a RF-23, RF-31, RF-32, RF-91, RF-97. */
const actividadPedida = z.object({
  tipo: z.enum(TIPOS_DE_ACTIVIDAD),
  frenteDeTrabajo: CORTO,
  llave: z.string().max(600).nullable(),
  item: CORTO,
  renglon: z.number().int().positive().nullable(),
  descripcion: TEXTO,
  unidad: z.string().max(40),
  metaSemana: CANTIDAD.nullable(),
  cantidades: z.record(DIA, CANTIDAD),
  valorRubro: CANTIDAD.nullable(),
  cuadrilla: CORTO,
  equipo: CORTO,
  revisar: z.boolean().optional(),
});

/** RF-6 a RF-17: el plan entero, como se guarda. */
export const estructuraDelPlanPedida = z.object({
  dias: z.array(DIA).max(6),
  actividades: z.array(actividadPedida).max(300),
  personal: z.array(z.object({ cargo: CORTO, porFrente: z.record(z.string().max(300), CANTIDAD) })).max(200),
  maquinaria: z
    .array(
      z.object({
        equipo: CORTO,
        cantidad: CANTIDAD,
        propia: z.boolean(),
        frenteDeTrabajo: CORTO,
        vehiculoId: z.string().max(100).nullable(),
        referencia: CORTO,
      }),
    )
    .max(200),
  materiales: z.array(z.object({ material: CORTO, cantidadSemana: CANTIDAD.nullable(), unidad: z.string().max(40), baseDeCalculo: CORTO })).max(200),
  volquetas: z.object({
    conceptos: z
      .array(z.object({ concepto: CORTO, unidad: z.string().max(40), cantidadSemana: CANTIDAD.nullable(), viajesSemana: CANTIDAD.nullable() }))
      .max(100),
    requeridas: CANTIDAD.nullable(),
    propias: CANTIDAD.nullable(),
    externas: CANTIDAD.nullable(),
  }),
  supuestos: z.string().max(5000),
  riesgos: z.array(z.object({ riesgo: CORTO, efecto: TEXTO, mitigacion: TEXTO })).max(100),
  requerimientos: z.string().max(5000),
});

// Si la regla y el esquema dejan de coincidir, esto no compila (ver el bloque de arriba).
type Iguales<A, B> = [A] extends [B] ? ([B] extends [A] ? true : false) : false;
const coinciden: Iguales<z.infer<typeof estructuraDelPlanPedida>, EstructuraDelPlan> = true;
void coinciden;

/** RF-1 a RF-5: el borrador vacío de una semana, que se nombra por su lunes. */
export const creacionDePlanSemanal = z.object({
  obraId: z.string().min(1),
  semana: DIA,
});
export type CreacionDePlanSemanal = z.infer<typeof creacionDePlanSemanal>;

/** RF-22, RF-23, RF-86: guardar exige la versión que se leyó, para no pisar al otro. */
export const guardadoDePlanSemanal = z.object({
  version: z.number({ error: 'Falta la versión del plan que abrió: recárguelo y vuelva a guardar.' }).int().min(0),
  estructura: estructuraDelPlanPedida,
});
export type GuardadoDePlanSemanal = z.infer<typeof guardadoDePlanSemanal>;

/** RF-34, RF-42, RF-52: proponer o leer; `sustituir` llega en la consulta, como texto. */
export const pedidoDeLecturaDePlan = z.object({
  obraId: z.string().min(1),
  semana: DIA,
  sustituir: z
    .enum(['true', 'false'])
    .optional()
    .transform((v) => v === 'true'),
});

/** RF-60: los avisos se confirman una sola vez, todos juntos. */
export const aprobacionDePlanSemanal = z.object({
  version: z.number().int().min(0),
  confirmarAvisos: z.boolean().default(false),
});
export type AprobacionDePlanSemanal = z.infer<typeof aprobacionDePlanSemanal>;

/** RF-64. */
export const anulacionDePlanSemanal = z.object({
  motivo: z.string().trim().min(1, 'Escriba el motivo de la anulación.').max(500),
});

/** Una persona como la muestra el plan: autor, último ajuste, aprobación, anulación. */
export interface PersonaDelPlan {
  id: string;
  nombre: string;
  rol: Rol;
}

/** RF-55, RF-78, RF-79: una fila de la lista de planes de la obra. */
export interface PlanSemanalFila {
  id: string;
  semana: string;
  estado: EstadoDePlanSemanal;
  origen: OrigenDePlanSemanal;
  creadoPor: PersonaDelPlan;
  aprobadoPor: PersonaDelPlan | null;
  aprobadoEn: string | null;
  rigeDesde: string | null;
  rigeHasta: string | null;
  anuladoEn: string | null;
  motivoAnulacion: string | null;
  creadoEn: string;
}

/** RF-2: lo que responde la lista. */
export interface ListaDePlanesSemanales {
  /** Los lunes de las semanas que se pueden planear hoy. */
  semanas: string[];
  planes: PlanSemanalFila[];
  /** RF-5, D15: sin planificación vigente no se arma ningún plan. */
  hayPlanificacion: boolean;
}

/** RF-31, RF-93: un ítem de la planificación entre los que se escoge, con lo que le falta hoy. */
export interface ItemParaElPlan {
  /** La misma llave con que mide el cumplimiento. */
  llave: string;
  item: string;
  renglon: number | null;
  descripcion: string;
  unidad: string;
  capitulo: string;
  /** `null` si el ítem no tiene medida planeada. */
  pendiente: number | null;
}

/** RF-29, RF-30, RF-55 a RF-60, RF-86, RF-87: el detalle, con plata o sin ella según el rol. */
export interface PlanSemanalDetalle extends PlanSemanalFila {
  obraId: string;
  version: number;
  actualizadoPor: PersonaDelPlan | null;
  actualizadoEn: string;
  vista: VistaDelPlan | VistaDelPlanSinPlata;
  /** RF-45: las cifras del Excel que no estaban en su fila. */
  rechazados: RechazadoPorIa[];
  /** RF-31, RF-93: los ítems de la planificación con que se cruza este plan. */
  items: ItemParaElPlan[];
  /** RF-9: los vehículos de la obra, para la maquinaria propia. */
  vehiculos: { id: string; codigo: string; tipo: string }[];
  /** RF-56 a RF-59: si quien mira puede aprobarlo, y si no, a quién le toca. */
  puedeAprobar: boolean;
  /** RF-65: si quien mira puede anularlo; solo un plan vigente. */
  puedeAnular: boolean;
  quienAprueba: string;
}

/** ¿Este detalle trae plata? Para que la pantalla no pinte columnas de más. */
export function vistaConPlata(vista: PlanSemanalDetalle['vista']): vista is VistaDelPlan {
  return 'valores' in vista;
}

export interface LecturaDePlanIniciada {
  lecturaId: string;
}

/** RF-49, RF-101: el estado de una propuesta o lectura que corre por detrás. */
export interface EstadoDeLecturaDePlanRespuesta {
  estado: (typeof ESTADOS_DE_LECTURA_DE_PLAN)[number];
  planId: string | null;
  error: string | null;
}
