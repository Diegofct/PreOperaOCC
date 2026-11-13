/**
 * Leer con IA un documento que llegó al Almacén (spec 042, RF-7, RF-10 a RF-17, RF-62, RF-67).
 * **Solo servidor.**
 *
 * Una sola llamada, con la de la planificación (`llamarConEsquema`): salida estructurada, sin
 * reintentos y con el tope de 4 minutos. Lo que se le manda lo arma la regla
 * (`almacen-importacion-ia.ts`), y lo que vuelve también lo comprueba la regla: aquí solo se llama.
 *
 * ── Texto o archivo ──
 *
 * Un Excel o un Word van como **texto citado** («H1F3 | …», «L2 | …»), para poder comprobar después
 * la cifra en su fila (RF-16). Una foto o un PDF van como **bloques** que el modelo lee tal cual: un
 * PDF escaneado sin texto lo lee como imagen, sin pasos aparte (RF-62).
 *
 * ── El esquema ──
 *
 * Sin nulos ni uniones, como el de la planificación: lo vacío es `''` o `0`. El compilador comprueba
 * que coincide con `LecturaDeImportacion`; si la regla gana un campo y el esquema no, la IA no lo
 * llenaría nunca. Una respuesta cortada por largo da el mensaje de RF-67, no media propuesta.
 */
import type { BetaContentBlockParam } from '@anthropic-ai/sdk/resources/beta/messages/messages';
import * as z from 'zod/v4';

import { aBase64 } from '@/features/asistente/servidor/adjuntos';
import { llamarConEsquema, type RespuestaDeIa, type TextosDeFalloDeIa } from '@/features/planificacion/servidor/leer-con-ia';
import { TIPOS_DE_DOCUMENTO } from '@/shared/rules/almacen-importacion';
import {
  INSTRUCCIONES_PARA_IMPORTAR,
  textoParaImportar,
  type LecturaDeImportacion,
  type PedidoDeImportacion,
} from '@/shared/rules/almacen-importacion-ia';

const esquemaDeLectura = z.object({
  proveedor: z.string().describe('El proveedor tal como aparece; "" si no está.'),
  tipo: z.enum(TIPOS_DE_DOCUMENTO).describe('factura, remision u otro.'),
  numero: z.string().describe('El número del documento tal como aparece; "" si no está.'),
  fecha: z.string().describe('La fecha del documento como AAAA-MM-DD; "" si no está.'),
  destino: z.string().describe('La obra o dirección a la que va dirigido; "" si no lo dice.'),
  conductor: z.string().describe('El conductor que entregó; "" si no aparece.'),
  transportador: z.string().describe('La empresa o persona que transportó; "" si no aparece.'),
  proveedoresDistintos: z.number().int().describe('Cuántos proveedores distintos trae el archivo.'),
  numerosDistintos: z.number().int().describe('Cuántos números de documento distintos trae el archivo.'),
  renglones: z.array(
    z.object({
      cita: z.string().describe('«p. N» en un PDF o una foto; la marca «H<hoja>F<fila>» o «L<n>» de la línea, tal como viene.'),
      nombre: z.string().describe('El nombre tal como lo escribe el documento.'),
      cantidad: z.number().describe('Tal como la escribe el documento, sin convertir; negativa si es una devolución.'),
      unidad: z.string().describe('Tal como la escribe el documento; "" si no la dice.'),
      factor: z.number().describe('Cuánto de la unidad del material del almacén trae cada unidad del documento, si el documento lo dice; si no, 0.'),
      factorTexto: z.string().describe('El texto exacto del documento de donde sale el factor; "" si no hay.'),
      valorUnitario: z.number().describe('Tal como lo indica el documento, sin quitar ni sumar impuestos; 0 si no lo trae.'),
      valorTotal: z.number().describe('El total del renglón, solo si no trae el unitario; si no, 0.'),
      moneda: z.string().describe('"" si son pesos colombianos; si no, la moneda.'),
      materialId: z.string().describe('El id de un material de la lista que es el mismo; "" si ninguno lo es.'),
      nombreNuevo: z.string().describe('Si materialId es "", el nombre corto con que lo registraría; si no, "".'),
    }),
  ),
  dejadosPorFuera: z.array(
    z.object({
      cita: z.string(),
      texto: z.string().describe('Lo que dice el renglón.'),
      motivo: z.string().describe('Por qué no es un material recibido: total, impuesto, flete, servicio…'),
    }),
  ),
});

type Iguales<A, B> = [A] extends [B] ? ([B] extends [A] ? true : false) : false;
const coincide: Iguales<z.infer<typeof esquemaDeLectura>, LecturaDeImportacion> = true;
void coincide;

const FALLOS: TextosDeFalloDeIa = {
  seNego: 'La IA no quiso leer este documento.',
  // RF-67.
  muyLargo: 'El documento es demasiado largo para leerlo de una vez. Pártalo y súbalo por partes.',
};

/** Una foto o un PDF, para mandarlo tal cual. */
export interface ArchivoParaLaIa {
  nombre: string;
  clase: 'pdf' | 'imagen';
  mime: string;
  contenido: Uint8Array;
}

/**
 * RF-7: lee el documento. Con `archivo` (foto o PDF) va como bloque y el pedido sin contenido; sin
 * él, el pedido ya trae el texto citado del Excel o el Word.
 */
export function leerDocumentoDelAlmacen(pedido: PedidoDeImportacion, archivo: ArchivoParaLaIa | null): Promise<RespuestaDeIa<LecturaDeImportacion>> {
  if (!archivo) return llamarConEsquema(esquemaDeLectura, INSTRUCCIONES_PARA_IMPORTAR, textoParaImportar(pedido), 'leer documento del almacén', FALLOS);

  const datos = aBase64(archivo.contenido);
  const bloque: BetaContentBlockParam =
    archivo.clase === 'pdf'
      ? { type: 'document', title: archivo.nombre, source: { type: 'base64', media_type: 'application/pdf', data: datos } }
      : { type: 'image', source: { type: 'base64', media_type: archivo.mime as 'image/jpeg' | 'image/png', data: datos } };
  const contenido: BetaContentBlockParam[] = [{ type: 'text', text: textoParaImportar({ ...pedido, contenido: null }) }, bloque];
  return llamarConEsquema(esquemaDeLectura, INSTRUCCIONES_PARA_IMPORTAR, contenido, 'leer documento del almacén', FALLOS);
}
