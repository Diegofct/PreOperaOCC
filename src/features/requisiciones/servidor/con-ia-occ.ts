/**
 * Leer con IA la planilla de requisición de pagos de OCC (spec 047, RF-59 a RF-67, D7 a D9).
 * **Solo servidor.**
 *
 * Una sola llamada, con la de la planificación y la del Almacén (`llamarConEsquema`): salida
 * estructurada, sin reintentos y con su tope de tiempo. Es una extracción mecánica, así que va con
 * esfuerzo `low`, como la 045 para no pasarse del tope. Lo que se le manda y lo que vuelve lo decide
 * la regla (`requisicion-occ-ia.ts`): aquí solo se llama.
 *
 * El esquema no tiene nulos ni uniones —lo vacío es `''` o `0`— y el compilador comprueba que coincide
 * con `LecturaDeRequisicionOcc`: si la regla gana un campo y el esquema no, la IA no lo llenaría nunca.
 */
import * as z from 'zod/v4';

import { llamarConEsquema, type RespuestaDeIa } from '@/features/planificacion/servidor/leer-con-ia';
import {
  FALLOS_DE_LA_REQUISICION_OCC,
  INSTRUCCIONES_PARA_IMPORTAR_OCC,
  type LecturaDeRequisicionOcc,
} from '@/shared/rules/requisicion-occ-ia';

const esquemaDeLectura = z.object({
  viernes: z.string().describe('La fecha del viernes de entrega como AAAA-MM-DD, tal como la trae la planilla; "" si no la trae.'),
  lineas: z.array(
    z.object({
      cita: z.string().describe('La marca «H<hoja>F<fila>» de la fila, tal como viene.'),
      fechaSolicitud: z.string().describe('AAAA-MM-DD; "" si no la trae o no es clara.'),
      beneficiario: z.string().describe('Tal como viene; "" si está vacío.'),
      concepto: z.string().describe('Tal como viene; "" si está vacío.'),
      especificaciones: z.string().describe('Tal como viene, casi siempre la placa del equipo; "" si está vacío.'),
      proveedor: z.string().describe('Tal como viene; "" si está vacío.'),
      valor: z.number().describe('El valor en pesos tal como está en la celda, sin redondear; 0 si no lo trae.'),
      observaciones: z.string().describe('Sin «Autorizado» ni «NO Autorizado»; "" si no queda nada.'),
    }),
  ),
});

type Iguales<A, B> = [A] extends [B] ? ([B] extends [A] ? true : false) : false;
const coincide: Iguales<z.infer<typeof esquemaDeLectura>, LecturaDeRequisicionOcc> = true;
void coincide;

/** RF-59: lee el texto citado de la planilla. */
export function leerRequisicionOcc(texto: string): Promise<RespuestaDeIa<LecturaDeRequisicionOcc>> {
  return llamarConEsquema(esquemaDeLectura, INSTRUCCIONES_PARA_IMPORTAR_OCC, texto, 'leer requisición de OCC', FALLOS_DE_LA_REQUISICION_OCC, 'low');
}
