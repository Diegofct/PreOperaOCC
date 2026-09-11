/**
 * Reglas del parte diario de obra. Funciones puras, sin I/O.
 *
 * Dos preguntas que hasta ahora nadie hacía en voz alta, y que la spec 006
 * obliga a responder en dos sitios distintos a la vez:
 *
 *  1. **¿Qué secciones tiene este parte y cuáles están llenas?** Lo necesita el
 *     índice lateral, que es lo único que le dice al residente por dónde va en
 *     un documento de nueve partes.
 *  2. **¿Qué impide cerrarlo?** Lo necesitaban ya el servidor —para rechazar el
 *     cierre— y ahora también el índice, para decirlo **antes** de que alguien
 *     pulse Cerrar y se lleve el rechazo.
 *
 * Esa segunda es la razón de que este archivo exista y no sea un ayudante de la
 * pantalla. La comprobación vivía escrita a mano dentro de
 * `app/api/panel/partes/[id]/cerrar+api.ts`. Si el índice la hubiera vuelto a
 * escribir para adelantarla, habría dos versiones de la misma regla, y el día
 * que discreparan el residente leería en pantalla que puede cerrar y el servidor
 * le diría que no — sin que ninguna de las dos estuviera «rota». Aquí hay una
 * sola, y las dos superficies la llaman.
 *
 * ── Por qué las entradas no son los tipos del parte ──
 *
 * `MaquinaDelParte` y compañía viven en `src/features/bitacoras/tipos.ts`, y
 * `shared/rules` no importa de `features/` —la misma disciplina que ya sigue
 * `fusion.ts`—. Se declaran aquí las formas mínimas que hacen falta; TypeScript
 * es estructural, así que los tipos del parte encajan sin convertir nada. De
 * paso queda escrito qué campos participan de verdad en cada regla.
 */
import { mensajeDeAvance, validarAvance, type ClaseDeMedidor } from './jornada';

/* ------------------------------------------------------------------------ */
/* Qué secciones tiene el parte y cuáles están llenas                        */
/* ------------------------------------------------------------------------ */

/**
 * `desconocido` no es un adorno: el conteo de fotografías llega por su cuenta y
 * tarda. Pintarlo como vacío mientras carga sería mentir durante un segundo, y
 * es justo el segundo en que alguien decide si le falta subir la foto del día.
 */
export type EstadoDeSeccion = 'lleno' | 'vacio' | 'desconocido';

export interface SeccionDelParte {
  /** Estable. Es la llave con la que el índice salta a su sección. */
  id: string;
  titulo: string;
  estado: EstadoDeSeccion;
  /** Cuántos registros tiene. `null` cuando no se cuenta o aún no se sabe. */
  cuantos: number | null;
}

/**
 * Lo que hace falta saber del parte para armar el índice.
 *
 * Son conteos y no las listas enteras a propósito: el índice no necesita leer
 * ninguna fila, solo saber cuántas hay, y pedir menos es lo que garantiza que
 * esta regla no acabe dependiendo de la forma de cada sección.
 */
export interface ConteosDelParte {
  maquinaria: number;
  personal: number;
  actividades: number;
  clima: number;
  laboratorio: number;
  /** El texto tal cual. El recorte se hace aquí, no en la pantalla. */
  notas: string;
  /** `null` mientras no hayan cargado. */
  fotos: number | null;
  /** Bitácoras del formato viejo de ese día que estén **cerradas** (006/RF-28). */
  historicoCerradas: number;
  cerrado: boolean;
  anulado: boolean;
}

/**
 * Los ids de las secciones, **en el orden en que se pintan**.
 *
 * Se exporta porque hay dos cosas que dependen de este orden y que no se pueden
 * permitir discrepar: el índice, que lleva a cada banda, y el apilado de las
 * bandas —una lista desplegable abierta en la sección de arriba tiene que
 * pintarse por encima de la de abajo, y eso se consigue con un `zIndex`
 * descendente que sale justo de aquí—.
 */
export const IDS_DE_SECCION = [
  'maquinaria',
  'personal',
  'actividades',
  'clima',
  'laboratorio',
  'notas',
  'fotografia',
  'cierre',
  'historico',
] as const;

/** El id de una sección del parte. Cerrado: no hay más que estas nueve. */
export type IdDeSeccion = (typeof IDS_DE_SECCION)[number];

function porCuantos(id: string, titulo: string, cuantos: number): SeccionDelParte {
  return { id, titulo, estado: cuantos > 0 ? 'lleno' : 'vacio', cuantos };
}

/**
 * Las secciones del parte, **en el orden en que se pintan**.
 *
 * El orden es dato de la regla y no del JSX, igual que `modulosVisibles` decide
 * el orden de la barra de navegación. Si lo decidiera la pantalla, el índice y
 * el documento podrían desalinearse y una entrada llevaría a la sección
 * equivocada sin que nada fallara a la vista.
 */
export function seccionesDelParte(conteos: ConteosDelParte): SeccionDelParte[] {
  const secciones: SeccionDelParte[] = [
    porCuantos('maquinaria', 'Maquinaria', conteos.maquinaria),
    porCuantos('personal', 'Personal', conteos.personal),
    porCuantos('actividades', 'Actividades', conteos.actividades),
    porCuantos('clima', 'Clima', conteos.clima),
    porCuantos('laboratorio', 'Laboratorio', conteos.laboratorio),
    {
      id: 'notas',
      titulo: 'Notas',
      // Tres espacios es lo que queda cuando alguien escribió algo y lo borró.
      estado: conteos.notas.trim().length > 0 ? 'lleno' : 'vacio',
      cuantos: null,
    },
    conteos.fotos === null
      ? { id: 'fotografia', titulo: 'Fotografía del día', estado: 'desconocido', cuantos: null }
      : porCuantos('fotografia', 'Fotografía del día', conteos.fotos),
    {
      id: 'cierre',
      titulo: 'Cerrar la jornada',
      // Anulado cuenta como resuelto: un parte anulado ya no se llena, y decir
      // que le falta cerrarse sería pedir algo que nadie puede hacer.
      estado: conteos.cerrado || conteos.anulado ? 'lleno' : 'vacio',
      cuantos: null,
    },
  ];

  // Va al final y solo si hay algo que enseñar: es un documento de otro formato,
  // no una sección que se pueda llenar.
  if (conteos.historicoCerradas > 0) {
    secciones.push(
      porCuantos('historico', 'Bitácoras por máquina', conteos.historicoCerradas),
    );
  }

  return secciones;
}

/* ------------------------------------------------------------------------ */
/* Qué impide cerrar el parte                                                */
/* ------------------------------------------------------------------------ */

/** Lo que se mira de una máquina para dejar cerrar. */
export interface MaquinaEvaluable {
  codigo: string;
  claseMedidor: ClaseDeMedidor;
  medidorInicial: number | null;
  medidorFinal: number | null;
}

/** Lo que se mira de una persona. Su horario completo, nada más. */
export interface PersonaEvaluable {
  nombre: string;
  entrada: string | null;
  salida: string | null;
}

export interface ParteEvaluable {
  maquinaria: MaquinaEvaluable[];
  personal: PersonaEvaluable[];
  /** Solo se cuenta cuántas hay: una actividad basta para que el parte no esté vacío. */
  actividades: unknown[];
}

/**
 * Lo que impide cerrar, ya redactado y en español. Lista vacía = se puede cerrar.
 *
 * ── Por qué una lista y no el primero ──
 *
 * La ruta devolvía el primer problema y paraba, porque un rechazo HTTP lleva un
 * mensaje y no siete. El índice, en cambio, quiere enseñarlos todos: el residente
 * está mirando el documento entero y le sirve saber que le faltan dos cosas, no
 * descubrirlas de una en una a base de pulsar Cerrar.
 *
 * Devolver la lista entera es compatible con lo anterior **solo si el primer
 * elemento es el mismo que devolvía la ruta**, así que el orden de estas tres
 * comprobaciones no es estético: es el contrato. Vacío, luego máquinas, luego
 * personas, cada grupo en el orden en que están registradas.
 *
 * ── Qué exige el cierre ──
 *
 * Basta **una** de las tres —una máquina, una persona o una actividad—, no las
 * tres: hay días de solo maquinaria y días de solo cuadrilla. Lo que no se
 * perdona es una fila a medias, porque una máquina sin lectura final no dice
 * cuánto trabajó y una persona sin hora de salida no dice cuántas horas hizo.
 *
 * A cada máquina se le exigen **las dos** lecturas, y cada una se valida con el
 * tope de su propio medidor —24 horas de motor u 800 kilómetros en un día—,
 * porque desde la spec 003 la camioneta se mide en kilómetros y la retro en
 * horas. Ese tope vive en `validarAvance`, que es quien sabe de medidores.
 */
export function bloqueosDelCierre(parte: ParteEvaluable): string[] {
  const bloqueos: string[] = [];

  if (
    parte.maquinaria.length === 0 &&
    parte.personal.length === 0 &&
    parte.actividades.length === 0
  ) {
    bloqueos.push(
      'El parte está vacío. Registre al menos una máquina, una persona o una actividad antes ' +
        'de cerrarlo.',
    );
  }

  for (const maquina of parte.maquinaria) {
    const error = validarAvance(maquina.claseMedidor, maquina.medidorInicial, maquina.medidorFinal);
    if (error) {
      bloqueos.push(
        `${maquina.codigo}: ${mensajeDeAvance(maquina.claseMedidor, error, maquina.medidorInicial)}`,
      );
    }
  }

  for (const persona of parte.personal) {
    if (!persona.entrada || !persona.salida) {
      bloqueos.push(`A ${persona.nombre} le falta la hora de entrada o de salida.`);
    }
  }

  return bloqueos;
}
