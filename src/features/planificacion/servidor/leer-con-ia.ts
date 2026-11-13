/**
 * Las dos llamadas a la IA de la planificación (spec 043, RF-4, RF-20): proponer para qué sirve
 * cada hoja y leer las confirmadas. **Solo servidor.**
 *
 * Aquí solo van las llamadas. Qué se manda y qué se acepta lo deciden las reglas puras de
 * `shared/rules/planificacion-ia.ts`, que comprueban cada cifra contra la celda citada.
 *
 * Mismas condiciones que la lectura de presupuestos: salida estructurada, en streaming porque la
 * respuesta es larga, sin reintentos, y si el modelo se niega, la API lo reintenta sola con otro
 * (`fallbacks: "default"`).
 *
 * El tope es de 4 minutos y no de 3: el V5 de Magdalena tardó 178 segundos, y con 3 cualquier
 * lectura un poco más lenta se cortaría ya pagada. Corre por detrás, así que el proxy no la limita;
 * el vencimiento de la lectura en curso tiene que ser mayor que este tope.
 */
import { betaZodOutputFormat } from '@anthropic-ai/sdk/helpers/beta/zod';
import type { BetaContentBlockParam } from '@anthropic-ai/sdk/resources/beta/messages/messages';
import * as z from 'zod/v4';

import { clienteDeIa, mensajeDeFalloDeIa, MODELO_DE_IA } from '@/features/servidor/ia';
import {
  CLASES_DE_HOJA,
  USOS_DE_HOJA,
  type LecturaDePlanificacion,
  type PropuestaDeHojas,
} from '@/shared/rules/planificacion-ia';

export const TIEMPO_MAXIMO_DE_LECTURA_MS = 4 * 60 * 1000;

const esquemaDePropuesta = z.object({
  hojas: z.array(
    z.object({
      nombre: z.string().describe('El nombre de la hoja, escrito exactamente igual.'),
      usos: z.array(z.enum(USOS_DE_HOJA)),
      clase: z.enum(CLASES_DE_HOJA),
    }),
  ),
}) satisfies z.ZodType<PropuestaDeHojas>;

const cita = {
  hoja: z.number().int().describe('El número que va después de «H» en la línea; 0 si no lo trae.'),
  fila: z.number().int().describe('El número que va después de «F» en la línea; 0 si no lo trae.'),
};

const mesesCitados = z.object({
  ...cita,
  meses: z.array(z.object({ mes: z.string().describe('AAAA-MM'), valor: z.number() })),
});

const esquemaDeLectura = z.object({
  items: z.array(
    z.object({
      ...cita,
      renglon: z.string().describe('El «Nº» tal como está, o "".'),
      item: z.string().describe('El ítem de pago, como «5.1.7», o "" si la fila no lo trae.'),
      descripcion: z.string(),
      unidad: z.string(),
      grupo: z.string().describe('El título del frente o vía que está encima de sus capítulos, o "".'),
      capitulo: z.string().describe('El título que está justo encima de los ítems.'),
      precioContractual: z.number(),
      precioCosto: z.number(),
      medidaReal: z.number(),
      medidaContractual: z.number(),
      traeMedidaCoste: z.boolean().describe('Si el libro tiene una columna «Med. Coste» o equivalente para este ítem.'),
      medidaCoste: z.number().describe('La «Med. Coste», en la misma fila del ítem; 0 si no la trae.'),
      programacion: mesesCitados,
      tiempos: z.object({
        ...cita,
        mesInicioDelExcel: z.number().describe('El número de la columna de mes de inicio, tal como está; 0 si no lo trae.'),
        mesInicio: z.string().describe('El mes del calendario que representa, AAAA-MM; "" si no lo trae.'),
        tiempoEjecucion: z.number().describe('En meses, tal como está; 0 si no lo trae.'),
      }),
    }),
  ),
  rubros: z.array(z.object({ ...cita, nombre: z.string(), valor: z.number(), costo: z.number(), programacion: mesesCitados })),
  lineaDeRubros: mesesCitados.extend({ nombre: z.string().describe('"" si los rubros no vienen juntos en una línea.') }),
  indirectos: mesesCitados,
  supuestos: z.array(z.string()),
  objetivos: z.array(z.string()),
  totalesDelExcel: z.object({
    contractual: z.object({ ...cita, valor: z.number() }),
    costo: z.object({ ...cita, valor: z.number() }),
    indirectos: z.object({ ...cita, valor: z.number() }),
  }),
}) satisfies z.ZodType<LecturaDePlanificacion>;

const INSTRUCCIONES_PARA_PROPONER = `Clasificas las hojas de libros de Excel con la planificación de contratos de obra civil en Colombia. Cada obra trae un libro distinto: guíate por lo que contiene cada hoja y no por su nombre.

Recibes el nombre de cada hoja y sus primeras filas. Devuelve solo las hojas que sirvan para algo de esta lista, con todos sus usos:
- planificacion: la hoja por ítem, con precio contractual, precio de costo, medida real y medida contractual. Si hay una por cada frente o vía, propónlas todas.
- programacion: la programación mensual por ítem de la planificación inicial o matriz.
- indirectos: los costos indirectos programados por mes.
- rubros: lo programado por mes de los rubros (plan de manejo ambiental, de tránsito, garantías, etc.).
- supuestos y objetivos: las notas con esos nombres o ese contenido.
- tiempos: la hoja que dice, por ítem, el mes de inicio y el tiempo de ejecución.

Y su clase:
- linea_base: la programación inicial o matriz congelada, la que no se toca.
- flujo_de_caja: el control mensual del dinero: ingresos, egresos, anticipos, actas.
- otra: cualquier otra.

Si el libro trae una línea base, los usos programacion, indirectos y rubros van en ella y nunca en el flujo de caja, aunque en la muestra no los alcances a ver: solo ves las primeras filas, y el flujo de caja puede mezclar varios frentes. El flujo de caja solo puede llevar el uso tiempos. Ignora las hojas de seguimiento, actas, análisis de precios por insumo y bitácoras.`;

const INSTRUCCIONES_PARA_LEER = `Lees libros de Excel con la planificación de contratos de obra civil en Colombia y los devuelves como datos. Cada obra trae un libro distinto.

Recibes las filas con contenido de las hojas confirmadas. Cada hoja empieza con una línea que dice su número, su nombre y sus usos. Cada fila empieza por «H<hoja>F<fila>» y sigue con las celdas separadas por « | », en el orden de las columnas; las celdas vacías van vacías entre dos « | ».

Reglas generales:
- Cada cifra cita la hoja y la fila exactas donde está. Copia los números tal como están en la celda, sin redondear ni convertir.
- No inventes nada. En los textos que no estén, "". En los números que no estén, 0. Una cita que no aplica va con hoja 0 y fila 0.

Ítems (hoja de uso planificacion):
- Un ítem es una fila con número, unidad y precio. Ignora títulos, subtotales, totales, indirectos, seguros, impuestos y análisis de precios.
- El grupo es el título del frente o vía encima de sus capítulos. El capítulo es el título justo encima de los ítems.
- precioContractual es el precio con AIU, el del contrato. precioCosto es el precio de costo. medidaReal es la medida tomada en campo. medidaContractual es la del contrato.
- Si el libro tiene además una medida para calcular el costo («Med. Coste» o parecida, distinta de la real y de la contractual), copia su valor en medidaCoste y pon traeMedidaCoste en true; puede ser distinta de cero aunque la medida real esté en cero. Si no la tiene, traeMedidaCoste en false y medidaCoste en 0.
- Si la fila no trae un ítem de pago propio, deja item en "" y copia el número en renglon.

Rubros: lo que va aparte de los ítems y se cobra como valor global (plan de manejo ambiental, de tránsito, caracterización, garantías, actualización de precios). Cita su fila; valor es el precio contractual y costo su precio de costo.

Programación (hoja de uso programacion): por cada ítem, busca su fila por el número o la descripción, y en programacion cita esa fila.
- En meses van solo los meses con valor mayor que cero, con el mes del calendario en AAAA-MM. Deduce el año de los encabezados de la hoja.
- Toma la plata, nunca las cantidades: si la hoja tiene una sección en pesos y otra en cantidades, usa la de pesos.
- Si cada ítem tiene dos renglones, usa el primero, el que va a precio contractual.
- Si un ítem no tiene fila de programación, programacion va con hoja 0, fila 0 y meses vacío.

Rubros programados: si una sola línea los junta todos por mes, ponla en lineaDeRubros con su nombre, y deja vacía la programación de cada rubro. Si cada rubro tiene su fila, deja lineaDeRubros con nombre "".

Indirectos: la fila con el costo indirecto total programado por mes; en meses, solo los mayores que cero.

Tiempos (hoja de uso tiempos): por cada ítem, su fila, el número de la columna de mes de inicio, el mes del calendario que ese número representa según los encabezados de la hoja, y el tiempo de ejecución. Si no hay hoja de ese uso o el ítem no los trae, hoja 0, fila 0, mesInicioDelExcel 0, mesInicio "" y tiempoEjecucion 0.

totalesDelExcel, los que traiga la hoja de planificación, sin sumarlos tú:
- contractual: el importe total a medida real y precio contractual.
- costo: el costo total de ejecución, sin el factor de indirectos.
- indirectos: el coste indirecto total de obra.

supuestos y objetivos: cada renglón como texto, de las hojas de esos usos.`;

export type RespuestaDeIa<T> = { ok: true; datos: T; modelo: string; tokensEntrada: number; tokensSalida: number } | { ok: false; error: string };

/** Lo que se le dice a la persona cuando la IA se niega o la respuesta no cabe. */
export interface TextosDeFalloDeIa {
  seNego: string;
  muyLargo: string;
}

const FALLOS_DE_LA_PLANIFICACION: TextosDeFalloDeIa = {
  seNego: 'La IA no quiso leer este archivo.',
  muyLargo: 'La planificación es demasiado larga para leerla con IA.',
};

/**
 * La llamada con salida estructurada, una sola para todo lo que lee o propone con un esquema. La usa
 * también el plan semanal (spec 044, `plan-semanal/servidor/con-ia.ts`): las condiciones de arriba
 * —streaming, sin reintentos, el tope— se deciden aquí una vez.
 *
 * `contenido` es texto, o bloques cuando va un archivo que el modelo lee tal cual: la importación al
 * Almacén (spec 042) manda así sus fotos y sus PDF.
 */
export async function llamarConEsquema<T>(
  esquema: z.ZodType<T>,
  instrucciones: string,
  texto: string | BetaContentBlockParam[],
  que: string,
  fallos: TextosDeFalloDeIa = FALLOS_DE_LA_PLANIFICACION,
): Promise<RespuestaDeIa<T>> {
  const ia = clienteDeIa();
  if (!ia) return { ok: false, error: 'La lectura con IA no está configurada en este servidor.' };
  try {
    const mensaje = await ia.beta.messages
      .stream(
        {
          model: MODELO_DE_IA,
          max_tokens: 64000,
          betas: ['server-side-fallback-2026-07-01'],
          fallbacks: 'default',
          output_config: { effort: 'medium', format: betaZodOutputFormat(esquema) },
          system: instrucciones,
          messages: [{ role: 'user', content: texto }],
        },
        { timeout: TIEMPO_MAXIMO_DE_LECTURA_MS, maxRetries: 0 },
      )
      .finalMessage();
    if (mensaje.stop_reason === 'refusal') return { ok: false, error: fallos.seNego };
    if (mensaje.stop_reason === 'max_tokens') return { ok: false, error: fallos.muyLargo };
    const leido = esquema.safeParse(mensaje.parsed_output);
    if (!leido.success) {
      console.error(`[ia] ${que}: la respuesta no tiene la forma esperada:`, leido.error);
      return { ok: false, error: 'La IA devolvió una lectura incompleta.' };
    }
    return { ok: true, datos: leido.data, modelo: mensaje.model, tokensEntrada: mensaje.usage.input_tokens, tokensSalida: mensaje.usage.output_tokens };
  } catch (fallo) {
    return { ok: false, error: mensajeDeFalloDeIa(fallo) };
  }
}

/** RF-4: para qué sirve cada hoja, a partir de su muestra. */
export function proponerHojas(muestra: string): Promise<RespuestaDeIa<PropuestaDeHojas>> {
  return llamarConEsquema(esquemaDePropuesta, INSTRUCCIONES_PARA_PROPONER, muestra, 'propuesta de hojas');
}

/** RF-20: lo que dicen las hojas confirmadas, con la hoja y la fila de cada cifra. */
export function leerPlanificacion(texto: string): Promise<RespuestaDeIa<LecturaDePlanificacion>> {
  return llamarConEsquema(esquemaDeLectura, INSTRUCCIONES_PARA_LEER, texto, 'lectura de la planificación');
}
