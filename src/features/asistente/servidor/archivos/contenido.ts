/**
 * Lo que reciben los tres armadores de archivos del asistente (spec 040): el título, el
 * encabezado ya armado (`encabezadoDelArchivo`) y los bloques de texto y de tabla, con las
 * tablas ya sacadas de las consultas (`aTabla`). Ninguno consulta nada: escriben lo que llega.
 */
import type { BloqueDelArchivo, EncabezadoDelArchivo } from '@/shared/rules/archivos-del-asistente';

export interface ContenidoDelArchivo {
  titulo: string;
  encabezado: EncabezadoDelArchivo;
  bloques: readonly BloqueDelArchivo[];
}
