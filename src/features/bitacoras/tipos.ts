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
  /**
   * Lo que explica sus horas ese día (spec 016, RF-26). Opcional: no impide
   * cerrar. Ausente en los partes anteriores, que se leen como sin observaciones.
   */
  observaciones?: string;
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
  /**
   * El ítem del presupuesto («4.1.8»), o `null` en «Otra actividad» (spec 004,
   * RF-64). Los tres campos que siguen **faltan** en las actividades guardadas
   * antes del 2026-09-16: su ausencia es lo que las distingue como heredadas, así
   * que no se rellenan al leer.
   */
  item?: string | null;
  /** La etiqueta de la unidad, congelada con el parte: «m³» (RF-66, RF-70). */
  unidad?: string;
  /** Cuánto se hizo, en esa unidad; `null` si no se anotó (RF-67 a RF-69, RF-74). */
  cantidad?: number | null;
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

/**
 * Un material del laboratorio consumido ese día.
 *
 * **Solo en partes guardados antes del 2026-09-16.** Desde entonces Control
 * Calidad de Obra registra ensayos (`EnsayoDelParte`); estas filas se siguen
 * leyendo y conservando tal como se guardaron (spec 004, RF-63).
 */
export interface MaterialDelParte {
  id: string;
  material: string;
  nombre: string;
  cantidad: number;
  /** La unidad del catálogo, congelada el día del parte. */
  unidad: string;
}

/** Un ensayo o control de Control Calidad de Obra (spec 004, RF-61, RF-72). */
export interface EnsayoDelParte {
  id: string;
  /** El id del catálogo: `densidad_en_campo`. */
  ensayo: string;
  /** Su nombre, congelado con el parte. */
  nombre: string;
  /** Obligatoria: «Sin observaciones» si no hay nada que anotar. */
  observacion: string;
  /**
   * Cuándo, quién y dónde (cambio del 2026-09-22, RF-84 a RF-87). Obligatorios en
   * todo ensayo nuevo, pero **opcionales en el tipo**: los ensayos guardados antes
   * no los traen, y se conservan así (RF-89).
   */
  horaInicio?: string;
  horaFin?: string;
  responsable?: string;
  ubicacion?: UbicacionDelEnsayo;
}

/** En la vía, a la altura de un PR, u otro lugar escrito (RF-87). Nunca las dos. */
export type UbicacionDelEnsayo = { pr: number; metros: number } | { lugar: string };

/**
 * Un ensayo guardado antes del 2026-09-22: todo ensayo nuevo lleva sus horas.
 *
 * Por la forma y no por la fecha del parte: un parte de antes del cambio puede
 * seguir abierto y recibir ensayos nuevos, que sí piden los datos. Es el mismo
 * criterio que `esActividadHeredada` y `esMaterialHeredado`.
 */
export function esEnsayoAnterior(ensayo: EnsayoDelParte): boolean {
  return !('horaInicio' in ensayo);
}

/**
 * Lo que guarda la sección Control Calidad de Obra: ensayos, y en los partes
 * anteriores al cambio, los materiales que ya tenían.
 *
 * Las dos formas conviven en la misma columna en vez de abrir una nueva: el id de
 * la sección sigue siendo `laboratorio` (RF-49) y el cierre la cuenta como una
 * sola. Se distinguen por su forma, sin marca añadida.
 */
export type FilaDeControlDeCalidad = MaterialDelParte | EnsayoDelParte;

export function esEnsayo(fila: FilaDeControlDeCalidad): fila is EnsayoDelParte {
  return 'ensayo' in fila;
}

/**
 * Un viaje de cantera tal como queda fijado en el parte al cerrarlo (spec 010,
 * RF-29).
 *
 * Lleva **nombres y no ids**: si después se corrige el nombre de un sitio o de un
 * material, la bitácora cerrada tiene que seguir diciendo lo que decía ese día. Lo
 * arma la sentencia de cierre en la base, no el navegador.
 */
export interface ViajeDelParte {
  id: string;
  /** "HH:MM", en la obra. */
  hora: string;
  material: string;
  /** El código interno de la volqueta: «VOL-01». */
  volqueta: string;
  conductor: string;
  origen: string;
  /** El nombre del sitio de destino, o `null` si el destino fue la obra. */
  destino: string | null;
  destinoObra: boolean;
  /** Solo con destino obra. */
  pr: number | null;
  metros: number | null;
}

/** Un identificador nuevo para una fila de sección. */
export function idDeFila(): string {
  return uuidv7();
}
