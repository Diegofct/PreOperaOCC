/**
 * Las actividades de la bitácora: su forma y cómo se construyen.
 *
 * Módulo puro, y ese es todo su motivo de existir. Las dos piezas que hay aquí
 * llegaron desde sitios que el navegador no puede tocar:
 *
 *  · `ActividadBitacora` estaba en `src/db/local/schema.ts`, y el esquema del
 *    servidor la necesita. Ese no puede importar nada de `src/db/local/*` **ni
 *    siquiera como tipo**: la regla existe para que ninguna cadena de imports
 *    arrastre la base del teléfono, y una excepción "solo de tipos" es
 *    exactamente como se empiezan a colar.
 *  · `construirActividad` estaba en el repositorio del móvil, que habla con
 *    SQLite. Ahora la bitácora se llena desde dos sitios —el celular del
 *    residente en obra y el panel desde el computador— y las dos tienen que
 *    producir exactamente la misma fila.
 */
import { uuidv7 } from 'uuidv7';

import { nombreDeActividad } from './actividades';

/**
 * Una actividad del día. Una actividad = una fila del formato en papel.
 *
 * Se auto-describe igual que las respuestas del preoperacional: guarda el
 * nombre además de la clave, para que un registro de 2026 se siga leyendo
 * aunque el catálogo de actividades cambie.
 */
export interface ActividadBitacora {
  id: string;
  clave: string;
  nombre: string;
  descripcion: string;
  observaciones: string;
}

/** Lo que llega de un formulario, antes de convertirse en una actividad. */
export interface ActividadNueva {
  clave: string;
  /** Solo cuando la clave es 'otra'. */
  texto?: string;
  descripcion: string;
  observaciones: string;
}

/**
 * Construye la actividad que se guarda.
 *
 * Vivía en el repositorio del móvil. Salió de ahí porque ahora la bitácora se
 * llena desde dos sitios —el celular del residente en obra y el panel desde el
 * computador— y las dos tienen que producir exactamente la misma fila. Si
 * divergieran, una bitácora se leería distinto según dónde se hubiera escrito,
 * que es justo lo que este formato existe para evitar.
 */
export function construirActividad(nueva: ActividadNueva): ActividadBitacora {
  return {
    id: uuidv7(),
    clave: nueva.clave,
    // Se guarda el nombre además de la clave: el registro se sigue leyendo
    // aunque el catálogo de actividades cambie más adelante.
    nombre: nueva.texto?.trim() || nombreDeActividad(nueva.clave),
    descripcion: nueva.descripcion.trim(),
    observaciones: nueva.observaciones.trim(),
  };
}

/* ------------------------------------------------------------------------ */
/* El parte diario de obra (spec 004)                                        */
/* ------------------------------------------------------------------------ */

/**
 * Las secciones del parte van como listas dentro de la misma fila, y no en
 * tablas hijas, por una razón concreta del proyecto: el driver de Postgres habla
 * por HTTP y **no da transacciones interactivas**. Guardar el parte en cinco
 * tablas serían cinco sentencias que pueden quedarse a medias; en una sola fila
 * es un `UPDATE` que ocurre entero o no ocurre. La bitácora ya guardaba así sus
 * actividades desde la Fase 2, y esto solo extiende esa decisión.
 *
 * El precio es que sumar horas de máquina de todo un mes obliga a desplegar el
 * JSON. Se asume: el parte se escribe y se lee entero todos los días, y las
 * cuentas del mes son una consulta ocasional.
 *
 * Todas las filas se auto-describen —guardan el nombre además de la clave—
 * porque un parte de 2026 tiene que seguir leyéndose aunque el catálogo cambie.
 */

/** Una máquina que trabajó ese día. */
export interface MaquinaDelParte {
  id: string;
  vehiculoId: string;
  /** Código interno tal como estaba el día del parte: VOL-01. */
  codigo: string;
  /**
   * En qué se mide este equipo. Se congela con el parte: si mañana un tipo de
   * equipo cambia de medidor —como les pasó a la camioneta y la volqueta en la
   * spec 003—, los partes viejos siguen diciendo en qué se midieron de verdad.
   */
  claseMedidor: 'horometro' | 'odometro';
  medidorInicial: number | null;
  medidorFinal: number | null;
  /**
   * Lo que pasó con la máquina ese día (spec 004, RF-45).
   *
   * Opcional en el tipo porque va dentro del JSON y los partes guardados antes
   * del 2026-09-14 no lo traen: decir que siempre está sería mentirle a quien lo
   * lea. Ausente se lee como vacío.
   */
  observaciones?: string;
}

/** Una persona que trabajó ese día, con su horario. */
export interface PersonaDelParte {
  id: string;
  usuarioId: string;
  nombre: string;
  /** El cargo del día del parte, no el de hoy. */
  cargo: string | null;
  /** "HH:MM". */
  entrada: string | null;
  salida: string | null;
}

/** Una actividad ejecutada, con sus dimensiones. */
export interface ActividadDelParte {
  id: string;
  clave: string;
  nombre: string;
  descripcion: string;
  /**
   * Longitud, ancho y alto se escriben a mano, y el área y el volumen también.
   * Calcularlos exige saber en qué unidad se mide cada actividad, y esa decisión
   * está pendiente: mientras tanto, un cálculo automático sería correcto unas
   * veces y absurdo otras.
   */
  longitud: number | null;
  ancho: number | null;
  alto: number | null;
  area: number | null;
  volumen: number | null;
  observaciones: string;
}

/** Un tramo del día con su clima. */
export interface FranjaDeClima {
  id: string;
  condicion: string;
  nombre: string;
  /** "HH:MM". */
  desde: string;
  hasta: string;
}

/** Un material del laboratorio consumido ese día. */
export interface MaterialDelParte {
  id: string;
  material: string;
  nombre: string;
  cantidad: number;
  /** La unidad del catálogo, congelada el día del parte. */
  unidad: string;
}

/** Un identificador nuevo para una fila de sección. */
export function idDeFila(): string {
  return uuidv7();
}
