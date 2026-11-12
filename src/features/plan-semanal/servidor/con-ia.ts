/**
 * Las dos llamadas a la IA del plan semanal (spec 044, RF-34, RF-44, RF-104): proponer el plan de una
 * semana y leer el Excel que trae la Directora. **Solo servidor.**
 *
 * Aquí solo van las llamadas. Qué se manda para proponer y qué se acepta de lo que vuelve lo deciden
 * las reglas puras de `shared/rules/plan-semanal-ia.ts`: la IA arma o lee, y la regla cruza las
 * llaves, comprueba cada cifra del Excel contra su fila y rehace el reparto, los totales y los valores.
 *
 * Las dos devuelven la misma forma (`PlanLeidoPorLaIa`) y por eso comparten esquema: así
 * `planDeLaLectura` es una sola para la propuesta y para el Excel. Lo que no aplica en un caso va
 * vacío —una propuesta no cita hoja ni fila, un Excel no trae llave— porque la salida estructurada no
 * admite campos opcionales.
 *
 * Las condiciones de la llamada (streaming, sin reintentos, el tope de 4 minutos) son las de la
 * lectura de la planificación y viven allá, en `llamarConEsquema`: no se repiten aquí para que no
 * haya dos topes que mantener iguales. Por ese tope, quien llame tiene que correr por detrás (T16).
 *
 * Las instrucciones de proponer están en la regla, junto al texto que arman; las de leer el Excel
 * van aquí, como en la 043, porque describen el formato «H<hoja>F<fila>» de esta llamada.
 */
import * as z from 'zod/v4';

import { llamarConEsquema, type RespuestaDeIa, type TextosDeFalloDeIa } from '@/features/planificacion/servidor/leer-con-ia';
import { INSTRUCCIONES_PARA_PROPONER, type PlanLeidoPorLaIa } from '@/shared/rules/plan-semanal-ia';

const esquemaDelPlan = z.object({
  actividades: z.array(
    z.object({
      hoja: z.number().int().describe('En un Excel, el número que va después de «H» en la línea. En una propuesta, 0.'),
      fila: z.number().int().describe('En un Excel, el número que va después de «F» en la línea. En una propuesta, 0.'),
      llave: z.string().describe('En una propuesta, la llave del ítem tal como se recibió; "" si la actividad no es un ítem de la planificación. En un Excel, "".'),
      renglon: z.string().describe('En un Excel, lo que trae la columna «Ítem» o «Nº», tal como está. En una propuesta, "".'),
      item: z.string().describe('En un Excel, lo mismo que renglon. En una propuesta, el ítem de pago.'),
      frenteDeTrabajo: z.string().describe('El frente de trabajo, como «1. Transporte»; "" si no tiene.'),
      descripcion: z.string(),
      unidad: z.string(),
      esRubro: z.boolean().describe('true si se planea por valor y no por cantidad (PMA, PMT, componentes).'),
      metaSemana: z.number().describe('La cantidad de la semana en la unidad de la actividad; 0 en un rubro.'),
      valorRubro: z.number().describe('Solo en un rubro de un Excel: su valor de la semana, tal como está en la celda. En lo demás, 0.'),
      diasConCantidad: z.array(z.string()).describe('En un Excel, los días con cantidad en esa fila: «lunes» a «sábado». En una propuesta, vacío.'),
      metaDiariaDelExcel: z.number().describe('En un Excel, la meta diaria tal como está en la celda; 0 si no la trae o en una propuesta.'),
      totalDelExcel: z.number().describe('En un Excel, el total programado tal como está en la celda; 0 si no lo trae o en una propuesta.'),
      cuadrilla: z.string(),
      equipo: z.string(),
    }),
  ),
  personal: z.array(z.object({ cargo: z.string(), porFrente: z.array(z.object({ frente: z.string(), cantidad: z.number() })) })),
  maquinaria: z.array(
    z.object({
      equipo: z.string(),
      cantidad: z.number(),
      propia: z.boolean(),
      frenteDeTrabajo: z.string(),
      vehiculoId: z.string().describe('El id de un vehículo de la obra, solo si se recibió en la lista; si no, "".'),
      referencia: z.string().describe('Placa, marca o nota; "" si no tiene.'),
    }),
  ),
  materiales: z.array(
    z.object({
      material: z.string(),
      cantidadSemana: z.number().describe('0 si no se sabe o está pendiente.'),
      unidad: z.string(),
      baseDeCalculo: z.string(),
    }),
  ),
  volquetas: z.object({
    conceptos: z.array(z.object({ concepto: z.string(), unidad: z.string(), cantidadSemana: z.number(), viajesSemana: z.number() })),
    requeridas: z.number(),
    propias: z.number(),
    externas: z.number(),
  }),
  supuestos: z.array(z.string()),
  riesgos: z.array(z.object({ riesgo: z.string(), efecto: z.string(), mitigacion: z.string() })),
  requerimientos: z.array(z.string()),
}) satisfies z.ZodType<PlanLeidoPorLaIa>;

/** RF-42 a RF-48, RF-104: lo que se le pide a la IA al leer el Excel de un plan. */
const INSTRUCCIONES_PARA_LEER = `Lees libros de Excel con el plan de trabajo semanal de una obra civil en Colombia y los devuelves como datos. Cada persona arma su libro distinto: guíate por lo que contiene cada hoja y no por su nombre.

Recibes las filas con contenido de las hojas a la vista. Cada hoja empieza con una línea que dice su número y su nombre. Cada fila empieza por «H<hoja>F<fila>» y sigue con las celdas separadas por « | », en el orden de las columnas; las celdas vacías van vacías entre dos « | ».

Reglas generales:
- Copia los números tal como están en la celda, sin redondear, convertir ni recalcular. No sumes ni corrijas nada, aunque veas que no cuadra.
- No inventes nada. En los textos que no estén, "". En los números que no estén o no sean un número (como «PENDIENTE»), 0.
- No pongas valores en pesos en ningún texto: ni en supuestos, ni en riesgos, ni en requerimientos, ni en la maquinaria. Si un texto del libro trae una cifra en pesos, escríbelo sin la cifra.
- La llave de cada actividad va siempre en "".

Actividades (la tabla con frente, ítem, actividad, unidad, meta de la semana y los días):
- Una actividad es una fila con descripción y meta de la semana, o con un valor si es un rubro. Ignora títulos, encabezados y totales.
- Cita la hoja y la fila exactas de cada actividad.
- renglon e item: lo que trae la columna del ítem o del número, tal como está («16», «38.6»); "" si no trae o es un guion.
- metaSemana: la meta de la semana. metaDiariaDelExcel y totalDelExcel: la meta diaria y el total programado de esa fila, si el libro los trae.
- diasConCantidad: los días de esa fila que tienen una cantidad mayor que cero, por su nombre completo en minúsculas: lunes, martes, miércoles, jueves, viernes, sábado. No copies las cantidades de cada día.
- Un rubro es una fila sin meta en cantidades que solo trae un valor (plan de manejo ambiental, de tránsito, componentes): esRubro en true, metaSemana en 0, valorRubro con su valor y diasConCantidad vacío. En las demás, esRubro en false y valorRubro en 0: el valor de la semana de un ítem no se copia.

Personal: cada cargo con su cantidad por frente; solo los frentes con cantidad mayor que cero. Ignora las filas y columnas de totales y los cargos que no traen cantidad.

Maquinaria: cada equipo con su cantidad, su frente y su referencia. propia en true si es de la empresa; en false si es alquilada, externa o por contratar. vehiculoId siempre en "". Ignora los totales.

Materiales: cada material con su cantidad de la semana, su unidad y su base de cálculo.

Control de volquetas: cada concepto con su unidad, su cantidad y sus viajes de la semana, sin la fila de totales; y las volquetas requeridas, propias y externas.

Supuestos, riesgos y requerimientos a gerencia: cada renglón como texto. Cada riesgo, con su efecto en la meta y su mitigación.`;

const FALLOS_AL_PROPONER: TextosDeFalloDeIa = {
  seNego: 'La IA no quiso proponer el plan de esta semana.',
  muyLargo: 'La propuesta salió demasiado larga. Arme el plan a mano o inténtelo de nuevo.',
};

const FALLOS_AL_LEER: TextosDeFalloDeIa = {
  seNego: 'La IA no quiso leer este archivo.',
  muyLargo: 'El plan es demasiado largo para leerlo con IA.',
};

/** RF-34, RF-104: el plan de la semana, a partir del texto de `textoParaProponer`. */
export function proponerPlan(texto: string): Promise<RespuestaDeIa<PlanLeidoPorLaIa>> {
  return llamarConEsquema(esquemaDelPlan, INSTRUCCIONES_PARA_PROPONER, texto, 'propuesta del plan semanal', FALLOS_AL_PROPONER);
}

/** RF-44, RF-104: lo que dice el Excel, con la hoja y la fila de cada actividad (`textoParaLeer`). */
export function leerPlanDelExcel(texto: string): Promise<RespuestaDeIa<PlanLeidoPorLaIa>> {
  return llamarConEsquema(esquemaDelPlan, INSTRUCCIONES_PARA_LEER, texto, 'lectura del plan semanal', FALLOS_AL_LEER);
}
