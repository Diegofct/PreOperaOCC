/**
 * Pedirle a la IA la lectura de un presupuesto en Excel que el lector del formulario no
 * entiende (spec 031, RF-74 a RF-87). **Solo servidor.**
 *
 * Aquí solo va la llamada: qué se le manda lo decide `textoParaLaIa` y qué se acepta de
 * lo que devuelve, `estructuraDeLaIa` (las dos en `shared/rules/formulario-presupuesto-ia.ts`).
 *
 * ── Cómo se llama ──
 *
 *  · Salida estructurada: la API garantiza un JSON con la forma de `LecturaDeIa`, y aun
 *    así se valida al llegar.
 *  · En streaming, porque la respuesta es larga (un ítem por renglón) y una petición
 *    larga sin streaming corre el riesgo de que la corte la conexión.
 *  · 3 minutos como máximo, sin reintentos (RF-87): quien importa ve el error y decide
 *    si reintenta.
 *  · Si el modelo se niega a responder, la API lo reintenta sola con otro
 *    (`fallbacks: "default"`).
 */
import { betaZodOutputFormat } from '@anthropic-ai/sdk/helpers/beta/zod';
import * as z from 'zod/v4';

import { clienteDeIa, mensajeDeFalloDeIa, MODELO_DE_IA } from '@/features/servidor/ia';
import type { LecturaDeIa } from '@/shared/rules/formulario-presupuesto-ia';

const TIEMPO_MAXIMO_MS = 3 * 60 * 1000;

const deDonde = {
  hoja: z.number().int().describe('El número que va después de «H» en la línea.'),
  fila: z.number().int().describe('El número que va después de «F» en la línea.'),
};

const esquema = z.object({
  grupos: z.array(
    z.object({
      nombre: z
        .string()
        .describe('Los títulos de arriba del capítulo unidos con « · », con la vía en corto: «VÍA 90A01 · SITIOS CRÍTICOS». "" si no hay.'),
      nombreCompleto: z.string().describe('Los mismos títulos unidos con « · » tal como están en el Excel, o "" si son iguales al nombre.'),
      capitulos: z.array(
        z.object({
          nombre: z.string().describe('El título que está justo encima de los ítems.'),
          items: z.array(
            z.object({
              ...deDonde,
              numero: z.string().describe('El «Nº» tal como está, o "".'),
              item: z.string().describe('El ítem de pago: «201.7.1».'),
              icociv: z.string(),
              especificaciones: z.string(),
              descripcion: z.string(),
              unidad: z.string(),
              cantidad: z.number(),
              valorUnitario: z.number(),
              valorTotal: z.number().describe('La columna «VALOR TOTAL» de esa fila, o 0.'),
            }),
          ),
        }),
      ),
    }),
  ),
  rubros: z.array(
    z.object({
      ...deDonde,
      grupo: z.string().describe('El nombre de uno de los grupos, escrito igual, o "" si es de todo el contrato.'),
      nombre: z.string(),
      unidad: z.string(),
      cantidad: z.number(),
      valorUnitario: z.number(),
      valor: z.number(),
    }),
  ),
  aiu: z.object({ administracion: z.number(), imprevistos: z.number(), utilidad: z.number() }),
  valorTotalDelExcel: z.number(),
}) satisfies z.ZodType<LecturaDeIa>;

const INSTRUCCIONES = `Lees presupuestos de contratos de obra civil en Colombia (formularios de propuesta económica tipo INVIAS) y los devuelves como datos.

Recibes las filas con contenido de la hoja del presupuesto. Cada línea empieza por «H<hoja>F<fila>» y sigue con las celdas separadas por « | », en el orden de las columnas; las celdas vacías van vacías entre dos « | ».

Cómo leerlo:
- Un ítem es una fila con número en «Nº», ítem de pago, unidad, cantidad y valor unitario. Cita su hoja y su fila exactas.
- Copia los números tal como están en la celda, sin redondear. El valor unitario es el de la columna «VALOR UNITARIO» del encabezado, no una columna de precios sin AIU ni de costos.
- El capítulo de un ítem es el título que está justo encima de sus ítems («EXPLANACIONES»). Si encima de los capítulos hay otros niveles de títulos (la vía, la sección como «SITIOS CRÍTICOS» o «REHABILITACIÓN»), únelos de arriba hacia abajo con « · » en el grupo:
  - en nombreCompleto, tal como están en el Excel: «VIA 90A01 DEL CORREDOR CARTAGENA - BARRANQUILLA EN LOS DEPARTAMENTOS DE ATLANTICO Y BOLIVAR · SITIOS CRITICOS»;
  - en nombre, el mismo pero con la vía en corto, por su código o tramo: «VÍA 90A01 · SITIOS CRÍTICOS», «VÍA 9007A · MANTENIMIENTO PERIÓDICO». Las secciones van completas. Si los títulos ya son cortos, nombre y nombreCompleto van iguales.
  Si solo hay capítulos, el grupo va con nombre "" y nombreCompleto "".
- Una sección sin capítulos propios (sus ítems van justo debajo del título de la sección, como suele pasar con «SEÑALIZACIÓN Y SEGURIDAD VIAL») usa ese título dos veces: en el grupo, «VÍA 90A01 · SEÑALIZACIÓN Y SEGURIDAD VIAL», y como capítulo, «SEÑALIZACIÓN Y SEGURIDAD VIAL». Nunca dejes un grupo con solo la vía si esa vía tiene secciones: se confundiría con la vía entera.
- El grupo de un rubro se escribe con el nombre corto.
- Ignora las filas de encabezado y las de subtotales y totales: «Subtotal», «SUBTOTAL BASICO DE OBRAS», «SUBTOTAL DE OBRAS - INCLUYENDO IVA», «SUBTOTAL OBRAS (C) = A + B», «VALOR DEL CONTRATO (F) = C + D + E», «VALOR TOTAL TRAMO…» y cualquier fila cuyo valor sea la suma de otras.
- Un rubro es un valor que se suma al presupuesto sin ser un ítem ni una suma de otros: el IVA de una sección, las provisiones (obras complementarias, ajustes, jornadas 24 horas), estudios y diseños, gestión social, ambiental o predial. Si hay un «TOTAL» que es la suma de un rubro y su IVA, toma el rubro y su IVA por separado, no el total. Cita su fila. Su grupo es el nombre de un grupo de los que devolviste, escrito igual, si es de esa sección; si es de toda una vía o de todo el contrato, "".
- valorTotalDelExcel es el valor total del contrato completo («VALOR TOTAL DEL CONTRATO»). Si el Excel no lo tiene pero sí el total de cada vía, súmalos.
- El AIU, en fracción (26,23 % → 0.2623), solo si el Excel lo dice; si no, 0.
- No inventes nada. En los textos que no estén, "". En los números que no estén, 0.`;

export type LecturaConIa =
  | { ok: true; lectura: LecturaDeIa; modelo: string; tokensEntrada: number; tokensSalida: number }
  | { ok: false; error: string };

export async function leerConIa(textoDeLaHoja: string): Promise<LecturaConIa> {
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
          system: INSTRUCCIONES,
          messages: [{ role: 'user', content: textoDeLaHoja }],
        },
        { timeout: TIEMPO_MAXIMO_MS, maxRetries: 0 },
      )
      .finalMessage();
    if (mensaje.stop_reason === 'refusal') return { ok: false, error: 'La IA no quiso leer este archivo.' };
    if (mensaje.stop_reason === 'max_tokens') return { ok: false, error: 'El presupuesto es demasiado largo para leerlo con IA.' };
    const lectura = esquema.safeParse(mensaje.parsed_output);
    if (!lectura.success) {
      console.error('[ia] la lectura del presupuesto no tiene la forma esperada:', lectura.error);
      return { ok: false, error: 'La IA devolvió una lectura incompleta.' };
    }
    return {
      ok: true,
      lectura: lectura.data,
      modelo: mensaje.model,
      tokensEntrada: mensaje.usage.input_tokens,
      tokensSalida: mensaje.usage.output_tokens,
    };
  } catch (fallo) {
    return { ok: false, error: mensajeDeFalloDeIa(fallo) };
  }
}
