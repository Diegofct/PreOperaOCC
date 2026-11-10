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
  /**
   * La línea del pie de cada página. Sin ella, la del asistente. La spec 043 arma con este mismo
   * armador el informe de cumplimiento, que sale del panel y no del asistente, y decir lo contrario
   * en el pie sería mentirle a quien lo recibe reenviado.
   */
  leyenda?: string;
}
