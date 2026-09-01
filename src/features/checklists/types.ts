/**
 * Plantillas de preoperacional.
 *
 * Los formatos de OCC viven en `docs/*.xlsx` y varían por tipo de vehículo.
 * Aquí son datos, no código: `scripts/import-formatos.ts` los convierte a JSON
 * y el motor los renderiza sin saber nada de su contenido. Agregar un tipo de
 * máquina no debería tocar una sola línea de esta carpeta.
 */

/** Respuesta a un ítem de conformidad. El formato original es binario ✓/✗. */
export type Conformidad = 'conforme' | 'no_conforme' | 'na';

export type TipoItem =
  /** ✓ / ✗ / N/A — la inmensa mayoría de los ítems. */
  | 'conformidad'
  /** Horómetro, odómetro. Se captura con teclado numérico grande. */
  | 'numero'
  | 'texto';

/**
 * Cada cuánto se revisa el ítem. Es acumulativo: el formato de camionetas
 * dice "AL PREOPERACIONAL QUINCENAL SE DEBEN ADICIONAR LOS SIGUIENTES ITEMS",
 * así que un lunes quincenal se muestran los diarios *y* los quincenales.
 */
export type Periodicidad = 'diaria' | 'quincenal' | 'mensual';

/** Cuándo se exige foto de evidencia. */
export type ExigirFoto = 'nunca' | 'no_conforme' | 'siempre';

export interface ItemChecklist {
  /** Slug estable derivado del label. Nunca se reutiliza ni se renombra. */
  key: string;
  /** Texto de la columna REVISION del formato. */
  label: string;
  /**
   * Columna SISTEMA AL QUE PERTENECE (ELÉCTRICO, LUBRICACIÓN, FRENOS…).
   * Sirve para agrupar los hallazgos por sistema en los reportes.
   */
  sistema: string | null;
  tipo: TipoItem;
  periodicidad: Periodicidad;
  /**
   * "Actividad que Inmoviliza": el sufijo `- AI` de la columna de sistema.
   * Un hallazgo aquí deja el vehículo NO APTO y abre un correctivo.
   */
  inmoviliza: boolean;
  /** Columna INSTRUCTIVO, tal como la escribió OCC. */
  ayuda?: string;
  exigirFoto: ExigirFoto;
  /** Solo para `tipo: 'numero'`. */
  unidad?: string;
  decimales?: number;
}

export interface SeccionChecklist {
  /** Slug de la columna UBICACIÓN (CABINA, LUCES Y SEÑALES, RUEDAS…). */
  key: string;
  titulo: string;
  items: ItemChecklist[];
}

export interface PlantillaChecklist {
  /** Slug del tipo de vehículo: 'camioneta', 'volqueta', … */
  tipoVehiculo: string;
  nombre: string;
  /** Título literal del formato, para la impresión. */
  tituloFormato: string;
  version: number;
  /** Qué medidores pide este formato. */
  medidores: {
    horometro: 'requerido' | 'opcional' | 'oculto';
    odometro: 'requerido' | 'opcional' | 'oculto';
  };
  /** Los formatos de OCC llevan firma del operador y del jefe inmediato. */
  exigeFirmaOperador: boolean;
  exigeFirmaJefe: boolean;
  /** Periodicidades presentes en el formato, en orden. */
  periodicidades: Periodicidad[];
  secciones: SeccionChecklist[];
  /** Archivo del que se importó, para poder rastrear el origen. */
  origen: string;
}

/** Respuesta guardada. Se auto-describe: sobrevive a que la plantilla cambie. */
export interface RespuestaItem {
  itemKey: string;
  seccionKey: string;
  /** Desnormalizado a propósito — ver la nota de auto-suficiencia abajo. */
  label: string;
  sistema: string | null;
  tipo: TipoItem;
  inmoviliza: boolean;
  valor: Conformidad | number | string | null;
  comentario?: string;
  mediaIds?: string[];
  /** Se respondió con "marcar toda la sección como conforme". */
  marcadoEnBloque?: boolean;
  respondidoEn: number;
}

/**
 * Cada respuesta carga su propio `label`, `sistema` y `tipo`. Cuesta unos 2 KB
 * por preoperacional y permite imprimir un registro de hace tres años aunque
 * su plantilla ya no exista en la base. Para un documento que es evidencia
 * legal durante cinco años, es barato.
 */
export interface RespuestasPreoperacional {
  plantillaTipoVehiculo: string;
  plantillaVersion: number;
  plantillaHash: string;
  respuestas: RespuestaItem[];
}

export type ResultadoPreoperacional = 'apto' | 'apto_con_observaciones' | 'no_apto';
