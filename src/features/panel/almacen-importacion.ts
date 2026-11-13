/**
 * Lo que las pantallas de importar al Almacén le piden al servidor, y lo que reciben (spec 042),
 * escrito una sola vez.
 *
 * Va aparte de `contratos.ts`, como los del plan semanal: de cada esquema salen la validación de la
 * ruta y el tipo de la pantalla, y el servidor vuelve a validar porque no confía en el navegador.
 * Aquí solo se valida la **forma**. Si la cantidad es mayor que cero, si la fecha es futura en
 * Colombia o si un renglón tiene algo que lo bloquea lo decide la regla
 * (`shared/rules/almacen-importacion.ts`), con un mensaje que nombra el renglón (RF-34 a RF-37).
 *
 * El documento y el renglón se declaran campo por campo, y el compilador comprueba que coinciden con
 * los tipos de la regla: si la regla gana un campo y el esquema no, la ruta lo tiraría en silencio
 * al confirmar.
 *
 * Solo Zod y tipos de `shared/`: las dos mitades lo importan sin arrastrar nada de la otra.
 */
import { z } from 'zod';

import { IDS_UNIDAD, type UnidadAlmacen } from '@/shared/catalogos/almacen';
import {
  TIPOS_DE_DOCUMENTO,
  type DocumentoDeLaImportacion,
  type DocumentoRepetido,
  type EstadoDeImportacion,
  type FaltaParaConfirmar,
  type PropuestaDeImportacion,
  type RenglonDeLaImportacion,
} from '@/shared/rules/almacen-importacion';
import { RENGLONES_MAXIMOS_PARA_IMPORTAR } from '@/shared/rules/almacen-importacion-ia';

const DIA = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'La fecha va como AAAA-MM-DD.');
const CORTO = z.string().max(300);
const LARGO = z.string().max(2000);
const CIFRA = z.number().finite();
const UNIDAD = z.enum(IDS_UNIDAD as [UnidadAlmacen, ...UnidadAlmacen[]], { error: 'Esa unidad no está en la lista del Almacén.' });

/** RF-1, RF-56: a qué obra va el documento. El archivo viaja en el cuerpo, con su nombre en una cabecera. */
export const subidaDeImportacion = z.object({ obraId: z.string().min(1, 'Falta la obra.') });

/** RF-11, RF-30. */
const documentoPedido = z.object({
  proveedor: CORTO.nullable(),
  tipo: z.enum(TIPOS_DE_DOCUMENTO, { error: 'El documento es una factura, una remisión u otro.' }),
  numero: z.string().max(100).nullable(),
  fecha: DIA,
  entregadoPor: z.string().max(200),
});

/** RF-19 a RF-21, RF-23, RF-77, RF-84. */
const materialPedido = z
  .discriminatedUnion('tipo', [
    z.object({ tipo: z.literal('existente'), id: z.string().min(1) }),
    z.object({ tipo: z.literal('nuevo'), nombre: z.string().trim().min(1).max(200), deLaLista: z.boolean(), unidad: UNIDAD.nullable() }),
  ])
  .nullable();

/** RF-10, RF-12, RF-15, RF-16, RF-24 a RF-30, RF-69, RF-70. */
const renglonPedido = z.object({
  cita: z.string().max(50),
  nombreEnDocumento: z.string().max(500),
  material: materialPedido,
  cantidadEnDocumento: CIFRA.nullable(),
  unidadEnDocumento: z.string().max(60).nullable(),
  // Cero o negativa pasa la forma: la regla la rechaza nombrando el renglón (RF-35).
  cantidad: CIFRA.nullable(),
  conversion: z.object({ factor: CIFRA.positive('El factor de conversión tiene que ser mayor que cero.'), fuente: CORTO }).nullable(),
  valorUnitario: CIFRA.min(0, 'El valor unitario no puede ser negativo.').nullable(),
  valorUnidad: z.string().max(60).nullable(),
  valorCalculadoDelTotal: z.boolean(),
  revisar: LARGO.nullable(),
});

type Iguales<A, B> = [A] extends [B] ? ([B] extends [A] ? true : false) : false;
const documentoCoincide: Iguales<z.infer<typeof documentoPedido>, DocumentoDeLaImportacion> = true;
const renglonCoincide: Iguales<z.infer<typeof renglonPedido>, RenglonDeLaImportacion> = true;
void documentoCoincide;
void renglonCoincide;

/**
 * RF-30 a RF-46, RF-88: confirmar la propuesta corregida. `version` es la que se leyó (RF-88);
 * `confirmarRepetido`, que quien importa vio el aviso de documento repetido y sigue (RF-44).
 */
export const confirmacionDeImportacion = z.object({
  version: z.number().int().min(0),
  documento: documentoPedido,
  renglones: z.array(renglonPedido).max(RENGLONES_MAXIMOS_PARA_IMPORTAR, `Son ${RENGLONES_MAXIMOS_PARA_IMPORTAR} renglones como mucho.`),
  confirmarRepetido: z.boolean().default(false),
});
export type ConfirmacionDeImportacion = z.infer<typeof confirmacionDeImportacion>;

/* ── Respuestas ─────────────────────────────────────────────────────────── */

/** RF-7: la lectura arrancó por detrás. */
export interface ImportacionIniciada {
  importacionId: string;
}

/** RF-65, RF-98: una de las propuestas de quien pregunta en esa obra. */
export interface ImportacionPendienteFila {
  id: string;
  nombreArchivo: string;
  estado: EstadoDeImportacion;
  /** Por qué falló (RF-9, RF-67, RF-68). */
  error: string | null;
  /** ISO 8601. */
  creadoEn: string;
  /** ISO 8601; `null` mientras se lee (RF-66). */
  vencePropuestaEn: string | null;
}

/** Un material vigente de la obra, para escoger el de cada renglón y saber su unidad (RF-21, RF-24). */
export interface MaterialParaImportar {
  id: string;
  nombre: string;
  unidad: UnidadAlmacen;
}

/** RF-43, RF-90: lo que se sabe del documento repetido al momento de abrir. */
export type RevisionDelRepetido =
  | { tipo: 'repetido'; repetido: DocumentoRepetido }
  | { tipo: 'nuevo' }
  /** Sin proveedor o sin número no se puede revisar (RF-90). */
  | { tipo: 'sin_clave' };

/** RF-8, RF-10 a RF-33, RF-43, RF-65: una importación con su propuesta, para revisarla. */
export interface ImportacionDetalle extends ImportacionPendienteFila {
  obraId: string;
  version: number;
  /** `null` mientras se lee o si falló. */
  propuesta: PropuestaDeImportacion | null;
  materiales: MaterialParaImportar[];
  repetido: RevisionDelRepetido;
}

/** RF-38, RF-39: lo que entró. */
export interface ImportacionConfirmada {
  ingresos: number;
  materialesNuevos: number;
}

/** RF-40: el 400 de confirmar, con las faltas por renglón (la regla las redacta). */
export interface FaltasDeLaConfirmacion {
  error: string;
  faltas: FaltaParaConfirmar[];
}

/** RF-43, RF-44: el 409 de confirmar sin haber aceptado el aviso de repetido. */
export interface RepetidoSinConfirmar {
  error: string;
  repetido: DocumentoRepetido;
}
