/**
 * Reglas de la bitácora diaria de obra. Funciones puras, sin I/O.
 *
 * Dos preguntas que hasta ahora nadie hacía en voz alta, y que la spec 006
 * obliga a responder en dos sitios distintos a la vez:
 *
 *  1. **¿Qué secciones tiene esta bitácora y cuáles están llenas?** Lo necesita el
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
 * ── Por qué las entradas no son los tipos de la bitácora ──
 *
 * `MaquinaDelParte` y compañía viven en `src/features/bitacoras/tipos.ts`, y
 * `shared/rules` no importa de `features/` —la misma disciplina que ya sigue
 * `fusion.ts`—. Se declaran aquí las formas mínimas que hacen falta; TypeScript
 * es estructural, así que los tipos de la bitácora encajan sin convertir nada. De
 * paso queda escrito qué campos participan de verdad en cada regla.
 */
import { MENSAJES_DE_VIAJE, validarAbscisa } from './cantera';
import { mensajeDePersona, minutosDeHora, validarPersonaDelParte, type PersonaConHoras } from './horas';
import { mensajeDeAvance, validarAvance, type ClaseDeMedidor } from './jornada';

/* ------------------------------------------------------------------------ */
/* Lo que se exige a una fila al guardar (cambio del 2026-09-16)             */
/* ------------------------------------------------------------------------ */

/**
 * Los textos de lo que le falta a una actividad. Los usan el contrato del servidor y
 * la pantalla, así que dicen lo mismo en los dos sitios.
 */
export const MENSAJES_DE_ACTIVIDAD = {
  sinElegir: 'Elija la actividad.',
  sinCual: 'Escriba cuál fue la actividad.',
  sinUnidad: 'Elija la unidad de la actividad.',
} as const;

export type CampoDeActividad = 'clave' | 'texto' | 'unidad';

export interface FaltaDeActividad {
  campo: CampoDeActividad;
  mensaje: string;
}

/**
 * Lo que le falta a una actividad para guardarse (spec 004, RF-24 y RF-70).
 *
 * Solo «Otra actividad» puede quedarse corta: una del presupuesto trae su nombre y
 * su unidad del catálogo. A «otra» se le pide cuál fue —sin eso no describe nada— y
 * su unidad, porque sin unidad su cantidad es un número que nadie sabe leer.
 *
 * Recibe `otra` ya decidido y no la clave: la regla no importa el catálogo del
 * presupuesto, y comparar con la clave es trabajo de quien lo tiene a mano.
 *
 * ── Sin elegir (cambio del 2026-09-22, RF-82 y RF-83) ──
 *
 * La actividad nueva nace sin elegir: una propuesta de antemano se queda puesta el
 * día que a alguien se le olvida cambiarla. Sin elegir solo se dice eso, bajo el
 * selector; lo demás depende de qué se elija. `elegida` es opcional y vale
 * verdadero para quien no lo diga: una actividad ya guardada siempre tiene clave.
 */
export function faltasDeActividad(actividad: {
  elegida?: boolean;
  otra: boolean;
  texto?: string | null;
  unidad?: string | null;
}): FaltaDeActividad[] {
  if (actividad.elegida === false) {
    return [{ campo: 'clave', mensaje: MENSAJES_DE_ACTIVIDAD.sinElegir }];
  }
  if (!actividad.otra) return [];
  const faltas: FaltaDeActividad[] = [];
  if (!actividad.texto?.trim()) {
    faltas.push({ campo: 'texto', mensaje: MENSAJES_DE_ACTIVIDAD.sinCual });
  }
  if (!actividad.unidad) {
    faltas.push({ campo: 'unidad', mensaje: MENSAJES_DE_ACTIVIDAD.sinUnidad });
  }
  return faltas;
}

/**
 * El rechazo de un ensayo sin observación, o `null` si la tiene (spec 004, RF-72).
 *
 * Obligatoria por decisión de OCC: un ensayo registrado sin decir nada no deja
 * constancia de nada. Cuando de verdad no hay nada que anotar, se escribe «Sin
 * observaciones», y el mensaje lo dice para que nadie tenga que adivinarlo. Unos
 * espacios o un salto de línea no son una observación.
 */
export function faltaObservacionDelEnsayo(observacion: string | null | undefined): string | null {
  return observacion?.trim()
    ? null
    : 'Escriba la observación del ensayo. Si no hay nada que anotar, escriba «Sin observaciones».';
}

/** Los textos de lo que le falta a un ensayo (cambio del 2026-09-22). */
export const MENSAJES_DE_ENSAYO = {
  sinInicio: 'Elija la hora de inicio del ensayo.',
  sinFin: 'Elija la hora de fin del ensayo.',
  finNoPosterior: 'La hora de fin tiene que ser posterior a la de inicio.',
  sinResponsable: 'Escriba quién es el responsable del ensayo.',
  sinUbicacion: 'Diga dónde se hizo el ensayo: PR y metros, u otro lugar.',
  sinPr: 'Elija el PR donde se hizo el ensayo.',
  sinMetros: 'Elija los metros donde se hizo el ensayo.',
  sinLugar: 'Escriba el lugar donde se hizo el ensayo.',
  metrosDelEnsayo: 'Los metros van de 0 a 999.',
} as const;

export type CampoDeEnsayo =
  | 'horaInicio'
  | 'horaFin'
  | 'responsable'
  | 'ubicacion'
  | 'pr'
  | 'metros'
  | 'lugar'
  | 'tramo'
  | 'observacion';

export interface FaltaDeEnsayo {
  campo: CampoDeEnsayo;
  mensaje: string;
}

/**
 * Dónde se hizo un ensayo: en la vía, a la altura de un PR, o en otro lugar escrito
 * (RF-87). Una sola de las dos formas; los `null` son lo que todavía no se eligió.
 */
export interface AbscisaPorValidar {
  pr: number | null;
  metros: number | null;
}
export type UbicacionPorValidar =
  | AbscisaPorValidar
  | { desde: AbscisaPorValidar; hasta: AbscisaPorValidar }
  | { lugar: string | null };

/** Los metros de una abscisa de ensayo: cualquiera de 0 a 999 (spec 025, RF-32). */
export const METROS_MAXIMOS_DEL_ENSAYO = 999;

/** Lo que se mira de un ensayo para dejarlo guardar. */
export interface EnsayoEvaluable {
  observacion?: string | null;
  horaInicio?: string | null;
  horaFin?: string | null;
  responsable?: string | null;
  ubicacion?: UbicacionPorValidar | null;
  /** Spec 025, RF-38: con resultado o con «cumple», la observación no hace falta. */
  resultado?: number | null;
  cumple?: 'si' | 'no' | null;
}

/**
 * Lo que falta en una abscisa de ensayo. El PR con la regla de cantera; los metros
 * no: un ensayo se toma donde se toma, no en los mojones de 25 en 25 por los que se
 * descarga un viaje (spec 025, RF-32).
 */
function faltasDeAbscisaDeEnsayo(abscisa: AbscisaPorValidar): FaltaDeEnsayo[] {
  const faltas: FaltaDeEnsayo[] = [];
  for (const falta of validarAbscisa(abscisa.pr, 0)) {
    faltas.push({
      campo: 'pr',
      mensaje: falta.mensaje === MENSAJES_DE_VIAJE.sinPr ? MENSAJES_DE_ENSAYO.sinPr : falta.mensaje,
    });
  }
  const { metros } = abscisa;
  if (metros === null) {
    faltas.push({ campo: 'metros', mensaje: MENSAJES_DE_ENSAYO.sinMetros });
  } else if (!Number.isInteger(metros) || metros < 0 || metros > METROS_MAXIMOS_DEL_ENSAYO) {
    faltas.push({ campo: 'metros', mensaje: MENSAJES_DE_ENSAYO.metrosDelEnsayo });
  }
  return faltas;
}

/**
 * Lo que le falta a un ensayo para guardarse, en el orden del formulario (spec 004,
 * RF-84 a RF-88, y RF-72 para la observación).
 *
 * ── A quién se le aplica ──
 *
 * A todo ensayo **nuevo**. A uno guardado antes del cambio no: no tiene horas ni
 * responsable, y exigírselos lo volvería imposible de guardar (RF-89). Decidir si
 * un ensayo es anterior es trabajo de quien tiene lo guardado —el servidor y la
 * pantalla—, no de esta regla.
 *
 * ── El PR y los metros, con la regla de cantera ──
 *
 * Los rangos (PR de 0 a 25, metros de 25 en 25) los dice `validarAbscisa`, la misma
 * regla del viaje, para que las dos listas no puedan discrepar. Solo cambian los
 * textos de lo que falta: «de llegada» es del viaje, no de un ensayo.
 */
export function faltasDelEnsayo(ensayo: EnsayoEvaluable): FaltaDeEnsayo[] {
  const faltas: FaltaDeEnsayo[] = [];

  // La hora de fin es opcional (spec 025, RF-29); si está, va después del inicio (RF-30).
  const inicio = minutosDeHora(ensayo.horaInicio);
  const fin = minutosDeHora(ensayo.horaFin);
  if (inicio === null) faltas.push({ campo: 'horaInicio', mensaje: MENSAJES_DE_ENSAYO.sinInicio });
  if (fin !== null && inicio !== null && fin <= inicio) {
    // Sin cruzar la medianoche: un ensayo que la pasa se registra en dos filas.
    faltas.push({ campo: 'horaFin', mensaje: MENSAJES_DE_ENSAYO.finNoPosterior });
  }

  if (!ensayo.responsable?.trim()) {
    faltas.push({ campo: 'responsable', mensaje: MENSAJES_DE_ENSAYO.sinResponsable });
  }

  const ubicacion = ensayo.ubicacion;
  if (!ubicacion) {
    faltas.push({ campo: 'ubicacion', mensaje: MENSAJES_DE_ENSAYO.sinUbicacion });
  } else if ('lugar' in ubicacion) {
    if (!ubicacion.lugar?.trim()) {
      faltas.push({ campo: 'lugar', mensaje: MENSAJES_DE_ENSAYO.sinLugar });
    }
  } else if ('desde' in ubicacion) {
    // Un tramo, en el orden en que se escribió (RF-31, RF-33).
    for (const [extremo, abscisa] of [['Inicio', ubicacion.desde], ['Fin', ubicacion.hasta]] as const) {
      for (const falta of faltasDeAbscisaDeEnsayo(abscisa)) {
        faltas.push({ campo: 'tramo', mensaje: `${extremo} del tramo: ${falta.mensaje}` });
      }
    }
  } else {
    faltas.push(...faltasDeAbscisaDeEnsayo(ubicacion));
  }

  const conResultado =
    (typeof ensayo.resultado === 'number' && !Number.isNaN(ensayo.resultado)) ||
    ensayo.cumple === 'si' ||
    ensayo.cumple === 'no';
  const sinObservacion = conResultado ? null : faltaObservacionDelEnsayo(ensayo.observacion);
  if (sinObservacion) faltas.push({ campo: 'observacion', mensaje: sinObservacion });

  return faltas;
}

/* ------------------------------------------------------------------------ */
/* Qué secciones tiene la bitácora y cuáles están llenas                    */
/* ------------------------------------------------------------------------ */

/**
 * `desconocido` no es un adorno: el conteo de fotografías llega por su cuenta y
 * tarda. Pintarlo como vacío mientras carga sería mentir durante un segundo, y
 * es justo el segundo en que alguien decide si le falta subir la foto del día.
 */
export type EstadoDeSeccion = 'lleno' | 'vacio' | 'desconocido' | 'no_aplica';

/**
 * Cómo se llama cada sección, en el índice y en los mensajes del cierre.
 *
 * Una sola tabla para los dos, porque «falta llenar Control Calidad de Obra» y
 * una entrada del índice que dijera «Laboratorio» serían dos nombres para la
 * misma cosa. El id `laboratorio` se conserva: es la llave con la que el índice
 * salta a su banda, y renombrarlo no le aporta nada a quien lee (004/RF-49).
 */
export const TITULO_DE_SECCION = {
  maquinaria: 'Maquinaria',
  personal: 'Personal',
  actividades: 'Actividades',
  clima: 'Clima',
  laboratorio: 'Control Calidad de Obra',
  cantera: 'Control Cantera',
  notas: 'Notas',
  fotografia: 'Fotografía del día',
} as const;

export interface SeccionDelParte {
  /** Estable. Es la llave con la que el índice salta a su sección. */
  id: string;
  titulo: string;
  estado: EstadoDeSeccion;
  /** Cuántos registros tiene. `null` cuando no se cuenta o aún no se sabe. */
  cuantos: number | null;
  /**
   * Lo que dice el índice en vez de la cifra, cuando la cifra sola engañaría.
   * Hoy solo lo usa Control Cantera con cero viajes: «sin viajes» y no «sin
   * registrar», porque no hay nada pendiente de llenar (010/RF-36).
   */
  detalle?: string;
}

/**
 * Lo que hace falta saber de la bitácora para armar el índice.
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
  /**
   * Ensayos de granulometría del módulo Laboratorio de ese día (018/RF-110): cuentan
   * como filas de Control Calidad de Obra. Ausente es cero, como antes de la spec.
   */
  ensayosDelModulo?: number;
  /** El texto tal cual. El recorte se hace aquí, no en la pantalla. */
  notas: string;
  /** `null` mientras no hayan cargado. */
  fotos: number | null;
  /** Bitácoras del formato viejo de ese día que estén **cerradas** (006/RF-28). */
  historicoCerradas: number;
  cerrado: boolean;
  anulado: boolean;
  /**
   * Marcado como día sin trabajo (004/RF-53). Ausente es no marcado, que es lo
   * que son todos los partes anteriores al cambio.
   */
  sinTrabajo?: boolean;
  /**
   * «Hoy no se realizaron actividades / ensayos» **con su motivo** (spec 032): la
   * sección vacía sale «no aplica», como en el día sin trabajo. Sin motivo no: el
   * cierre todavía la pide, y el índice no puede decir que está resuelta.
   */
  actividadesNoAplican?: boolean;
  ensayosNoAplican?: boolean;
  /**
   * Cuántos viajes de cantera tiene ese día (010/RF-28): `null` mientras cargan.
   * **Ausente es que la pantalla todavía no los pide**, y entonces la sección no
   * sale en el índice: una entrada «comprobando» que nunca termina sería peor que
   * no tenerla.
   */
  cantera?: number | null;
}

/**
 * Los ids de las secciones, **en el orden en que se pintan**.
 *
 * El índice lleva a cada banda por su id, y el orden de esta lista es el orden
 * del documento. Hasta la spec 007 también salía de aquí el `zIndex`
 * descendente de las bandas, para que una lista abierta arriba no quedara bajo
 * la sección de abajo; desde que las listas se pintan en la capa flotante, ese
 * uso se retiró.
 */
export const IDS_DE_SECCION = [
  'maquinaria',
  'personal',
  'actividades',
  'clima',
  'laboratorio',
  'cantera',
  'notas',
  'fotografia',
  'cierre',
  'historico',
] as const;

/** El id de una sección de la bitácora. Cerrado: no hay más que estas diez. */
export type IdDeSeccion = (typeof IDS_DE_SECCION)[number];

function porCuantos(id: string, titulo: string, cuantos: number): SeccionDelParte {
  return { id, titulo, estado: cuantos > 0 ? 'lleno' : 'vacio', cuantos };
}

/** Algo escrito de verdad: los espacios y saltos que quedan al borrar no cuentan. */
function hayTexto(texto: string | null | undefined): boolean {
  return (texto ?? '').trim().length > 0;
}

/**
 * Control Cantera en el índice (010/RF-28), o nada si la pantalla no la pide.
 *
 * **No es exigible** (RF-36): los viajes no se llenan en la bitácora sino en su
 * módulo, y un día sin viajes es un día normal. Con cero, «–» y «sin viajes», que
 * no invitan a registrar nada; nunca «○ sin registrar».
 */
function seccionDeCantera(cuantos: number | null | undefined): SeccionDelParte[] {
  if (cuantos === undefined) return [];
  const titulo = TITULO_DE_SECCION.cantera;
  if (cuantos === null) return [{ id: 'cantera', titulo, estado: 'desconocido', cuantos: null }];
  if (cuantos === 0) {
    return [{ id: 'cantera', titulo, estado: 'no_aplica', cuantos: 0, detalle: 'sin viajes' }];
  }
  return [{ id: 'cantera', titulo, estado: 'lleno', cuantos }];
}

/**
 * Las secciones de la bitácora, **en el orden en que se pintan**.
 *
 * El orden es dato de la regla y no del JSX, igual que `modulosVisibles` decide
 * el orden de la barra de navegación. Si lo decidiera la pantalla, el índice y
 * el documento podrían desalinearse y una entrada llevaría a la sección
 * equivocada sin que nada fallara a la vista.
 */
export function seccionesDelParte(conteos: ConteosDelParte): SeccionDelParte[] {
  /**
   * En un día sin trabajo, lo que no se exige y está vacío «no aplica»: decir
   * «sin registrar» invitaría a llenar la maquinaria de un domingo. Si tiene
   * algo, se enseña lo que tiene — la bitácora no esconde datos por una marca, y es
   * el cierre quien rechaza la contradicción (004/RF-55).
   */
  const exigible = (id: string, titulo: string, cuantos: number, noAplica = false): SeccionDelParte =>
    (conteos.sinTrabajo || noAplica) && cuantos === 0
      ? { id, titulo, estado: 'no_aplica', cuantos: null }
      : porCuantos(id, titulo, cuantos);

  const secciones: SeccionDelParte[] = [
    exigible('maquinaria', TITULO_DE_SECCION.maquinaria, conteos.maquinaria),
    exigible('personal', TITULO_DE_SECCION.personal, conteos.personal),
    exigible('actividades', TITULO_DE_SECCION.actividades, conteos.actividades, conteos.actividadesNoAplican),
    porCuantos('clima', TITULO_DE_SECCION.clima, conteos.clima),
    exigible(
      'laboratorio',
      TITULO_DE_SECCION.laboratorio,
      conteos.laboratorio + (conteos.ensayosDelModulo ?? 0),
      conteos.ensayosNoAplican,
    ),
    ...seccionDeCantera(conteos.cantera),
    {
      id: 'notas',
      titulo: TITULO_DE_SECCION.notas,
      // Tres espacios es lo que queda cuando alguien escribió algo y lo borró.
      estado: hayTexto(conteos.notas) ? 'lleno' : 'vacio',
      cuantos: null,
    },
    conteos.fotos === null
      ? {
          id: 'fotografia',
          titulo: TITULO_DE_SECCION.fotografia,
          estado: 'desconocido',
          cuantos: null,
        }
      : porCuantos('fotografia', TITULO_DE_SECCION.fotografia, conteos.fotos),
    {
      id: 'cierre',
      titulo: 'Cerrar la jornada',
      // Anulado cuenta como resuelto: una bitácora anulada ya no se llena, y decir
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
/* Qué impide cerrar la bitácora                                            */
/* ------------------------------------------------------------------------ */

/** Lo que se mira de una máquina para dejar cerrar. */
export interface MaquinaEvaluable {
  codigo: string;
  claseMedidor: ClaseDeMedidor;
  medidorInicial: number | null;
  medidorFinal: number | null;
  /**
   * Opcional en el tipo porque los partes anteriores al 2026-09-14 no las
   * traen. Ausente se lee como vacío, y vacío no deja cerrar (004/RF-51).
   */
  observaciones?: string;
}

/**
 * Lo que se mira de una persona: su horario completo, o sus horas laboradas, o su
 * novedad (spec 025, RF-6, RF-19).
 */
export interface PersonaEvaluable extends PersonaConHoras {
  nombre: string;
  entrada: string | null;
  salida: string | null;
}

/** De una actividad solo importa su id: es a lo que apuntan sus fotografías. */
export interface ActividadEvaluable {
  id: string;
}

export interface ParteEvaluable {
  maquinaria: MaquinaEvaluable[];
  personal: PersonaEvaluable[];
  actividades: ActividadEvaluable[];
  /** Solo se cuenta si hay: el contenido de cada franja lo valida quien la guarda. */
  clima: unknown[];
  /** La sección de Control Calidad de Obra. Ídem. */
  laboratorio: unknown[];
  /**
   * Los ensayos de granulometría vigentes del día, ya contados por quien pregunta
   * (018/RF-110): llenan Control Calidad de Obra igual que una fila a mano. Viven en
   * su módulo, no en el parte, así que la regla los recibe contados y sigue pura.
   */
  ensayosDelModulo?: number;
  notas: string | null;
  /** Ausente es no marcado, como en todos los partes anteriores al cambio. */
  sinTrabajo?: boolean;
  motivoSinTrabajo?: string | null;
  /** «Hoy no se realizaron actividades / ensayos» (spec 032). Ausente es no marcado. */
  sinActividades?: boolean;
  motivoSinActividades?: string | null;
  sinEnsayos?: boolean;
  motivoSinEnsayos?: string | null;
}

/**
 * Las fotografías de la bitácora, ya contadas por quien pregunta.
 *
 * Llegan aparte y contadas porque viven en otro sitio que la bitácora —el almacén
 * de imágenes y su tabla— y leerlas es I/O. La ruta de cierre las consulta y la
 * pantalla ya las tiene cargadas; la regla solo decide con lo que le dan.
 */
export interface FotosDelParte {
  /** Cuántas fotografías del día tiene la bitácora. */
  delDia: number;
  /**
   * El id de actividad al que apunta cada foto de actividad. Puede traer ids de
   * actividades que ya no están en la bitácora: se subió la foto y la actividad se
   * quitó sin guardar (004/RF-48). La regla los descarta al cruzarlos.
   */
  itemsConFoto: readonly string[];
}

/* ── El día sin trabajo ─────────────────────────────────────────────────── */

export type ErrorDeDiaSinTrabajo = 'con_trabajo' | 'sin_motivo';

/**
 * ¿Es válida la marca de día sin trabajo?
 *
 * La usan dos: el cierre, y la ruta de guardado, que no deja ni siquiera marcar
 * un día que ya tiene trabajo registrado. `con_trabajo` va primero porque es el
 * error de fondo: escribir un motivo no arregla que ese día sí se trabajó.
 *
 * Un día en que se trabajó la mañana y llovió la tarde **no** es día sin trabajo:
 * se cierra completo y la lluvia queda en el clima (004/RF-55).
 */
export function validarDiaSinTrabajo(parte: {
  sinTrabajo?: boolean;
  motivoSinTrabajo?: string | null;
  maquinaria: readonly unknown[];
  personal: readonly unknown[];
  actividades: readonly unknown[];
}): ErrorDeDiaSinTrabajo | null {
  if (!parte.sinTrabajo) return null;
  if (parte.maquinaria.length > 0 || parte.personal.length > 0 || parte.actividades.length > 0) {
    return 'con_trabajo';
  }
  if (!hayTexto(parte.motivoSinTrabajo)) return 'sin_motivo';
  return null;
}

/** Lo que ya está guardado de la bitácora, en lo que toca al día sin trabajo. */
export interface DiaGuardado {
  sinTrabajo: boolean;
  motivoSinTrabajo: string | null;
  maquinaria: readonly unknown[];
  personal: readonly unknown[];
  actividades: readonly unknown[];
}

/** Lo que trae un guardado parcial. Ausente es «no se toca». */
export interface CambiosDelDia {
  sinTrabajo?: boolean;
  motivoSinTrabajo?: string | null;
  maquinaria?: readonly unknown[];
  personal?: readonly unknown[];
  actividades?: readonly unknown[];
}

/**
 * Cómo queda la marca de día sin trabajo después de un guardado, y si es válida.
 *
 * El guardado es parcial: una petición puede traer solo la marca, o solo la
 * maquinaria. Así que no basta con validar lo que llega; hay que validar **cómo
 * queda la bitácora** mezclando lo que llega con lo guardado. Sin eso, marcar un
 * domingo que ya tiene una máquina pasaría porque la petición no trae máquinas,
 * y registrar una máquina en un día marcado pasaría porque la petición no trae la
 * marca — y la bitácora quedaría contradiciéndose (004/RF-55).
 *
 * Quitar la marca borra el motivo: un motivo sin marca haría creer a quien lea
 * la bitácora que ese día no se trabajó.
 */
export function resolverDiaSinTrabajo(
  guardado: DiaGuardado,
  cambios: CambiosDelDia,
): { sinTrabajo: boolean; motivoSinTrabajo: string | null; error: ErrorDeDiaSinTrabajo | null } {
  const sinTrabajo = cambios.sinTrabajo ?? guardado.sinTrabajo;
  const motivoSinTrabajo = sinTrabajo
    ? cambios.motivoSinTrabajo !== undefined
      ? cambios.motivoSinTrabajo
      : guardado.motivoSinTrabajo
    : null;

  const error = validarDiaSinTrabajo({
    sinTrabajo,
    motivoSinTrabajo,
    maquinaria: cambios.maquinaria ?? guardado.maquinaria,
    personal: cambios.personal ?? guardado.personal,
    actividades: cambios.actividades ?? guardado.actividades,
  });

  return { sinTrabajo, motivoSinTrabajo, error };
}

export function mensajeDeDiaSinTrabajo(error: ErrorDeDiaSinTrabajo): string {
  return error === 'con_trabajo'
    ? 'Ese día tiene máquinas, personas o actividades registradas: un día con trabajo se ' +
        'cierra completo, no como día sin trabajo.'
    : 'Escriba por qué no se trabajó ese día.';
}

/* ── Una sección sin registro (spec 032) ─────────────────────────────── */

/**
 * Las dos secciones que un día **con** trabajo puede dejar sin filas, con su marca y
 * su motivo: un día en que hubo máquinas y personal pero no se ejecutó ninguna
 * actividad del contrato, o no se hizo ningún ensayo (RF-21 a RF-35).
 *
 * Es distinto del día sin trabajo (004/RF-53), que no exige maquinaria, personal ni
 * actividades: aquí el resto de la bitácora se exige igual, y solo esa sección se da
 * por llena. Con el día sin trabajo marcado, estas marcas no cuentan (RF-37).
 */
export type SeccionSinRegistro = 'actividades' | 'ensayos';

/** El motivo es un renglón (RF-22, RF-30). */
export const LARGO_DEL_MOTIVO_SIN_REGISTRO = 200;

const NOMBRE_SIN_REGISTRO: Record<SeccionSinRegistro, { seccion: string; marca: string }> = {
  actividades: { seccion: 'Actividades', marca: 'Hoy no se realizaron actividades' },
  ensayos: { seccion: 'Control de calidad', marca: 'Hoy no se realizaron ensayos' },
};

/** El rótulo de la casilla: «Hoy no se realizaron actividades». */
export function rotuloSinRegistro(seccion: SeccionSinRegistro): string {
  return NOMBRE_SIN_REGISTRO[seccion].marca;
}

/**
 * Lo que se lee de una sección vacía a propósito en la bitácora que ya no se edita y
 * en Reportes (RF-36): «No se realizaron actividades — Lluvia toda la tarde».
 */
export function textoSinRegistro(seccion: SeccionSinRegistro, motivo: string | null | undefined): string {
  const que = seccion === 'actividades' ? 'actividades' : 'ensayos';
  return `No se realizaron ${que} — ${hayTexto(motivo) ? motivo!.trim() : 'sin motivo escrito'}`;
}

/**
 * Los textos de RF-36 de una bitácora, en el orden de sus secciones. Vacío si no
 * tiene marcas o si es día sin trabajo, que ya lo dice todo (RF-37).
 */
export function textosSinRegistro(parte: {
  sinTrabajo?: boolean;
  sinActividades?: boolean;
  motivoSinActividades?: string | null;
  sinEnsayos?: boolean;
  motivoSinEnsayos?: string | null;
}): string[] {
  if (parte.sinTrabajo) return [];
  const textos: string[] = [];
  if (parte.sinActividades) textos.push(textoSinRegistro('actividades', parte.motivoSinActividades));
  if (parte.sinEnsayos) textos.push(textoSinRegistro('ensayos', parte.motivoSinEnsayos));
  return textos;
}

/** El bloqueo del cierre con la marca puesta y sin motivo (RF-23, RF-31). */
export function faltaElMotivoSinRegistro(seccion: SeccionSinRegistro): string {
  return `${NOMBRE_SIN_REGISTRO[seccion].seccion}: falta el motivo de por qué no se realizaron.`;
}

/** El rechazo al guardar una marca en una sección que tiene filas. */
export function mensajeDeSeccionConRegistros(seccion: SeccionSinRegistro): string {
  return seccion === 'actividades'
    ? 'Esa bitácora tiene actividades registradas: quítelas antes de marcar que no se realizaron.'
    : 'Esa bitácora tiene ensayos registrados: quítelos antes de marcar que no se realizaron.';
}

/** Una marca de la bitácora tal como se guarda. */
export interface MarcaSinRegistro {
  marcada: boolean;
  motivo: string | null;
}

/**
 * Cómo queda la marca de una sección después de un guardado parcial, y si es válida.
 *
 * Como `resolverDiaSinTrabajo`: se valida **cómo queda la bitácora**, mezclando lo que
 * llega con lo guardado, porque la marca y las filas pueden llegar en peticiones
 * distintas.
 *
 *  · Desmarcar borra el motivo (RF-28, RF-35).
 *  · Marcar una sección que tiene filas es contradecirse: `con_registros`.
 *  · Agregar filas a una sección marcada, sin tocar la marca, la quita: es lo que
 *    pasa cuando llega la actividad por WhatsApp (RF-27, RF-34); a mano no se llega,
 *    porque la casilla oculta el botón de agregar (RF-26, RF-33).
 *  · Marcada y sin motivo **se deja guardar**: el motivo se puede escribir después;
 *    lo que no se deja es cerrar así (RF-23, RF-31).
 *
 * `filas` es cuántas tiene la sección después del guardado; en ensayos, contando los
 * del módulo de Laboratorio, que llenan la sección igual que una fila (018/RF-110).
 */
export function resolverSeccionSinRegistro(
  guardada: MarcaSinRegistro,
  cambios: { marcada?: boolean; motivo?: string | null },
  filas: number,
): MarcaSinRegistro & { error: 'con_registros' | null } {
  if (cambios.marcada === true && filas > 0) return { ...guardada, error: 'con_registros' };

  const marcada = filas > 0 ? false : (cambios.marcada ?? guardada.marcada);
  if (!marcada) return { marcada: false, motivo: null, error: null };

  const motivo = cambios.motivo !== undefined ? cambios.motivo : guardada.motivo;
  return { marcada: true, motivo: hayTexto(motivo) ? motivo!.trim() : null, error: null };
}

/* ── El cierre ──────────────────────────────────────────────────────────── */

/** «A, B y C», que es como se lee una lista en español. */
function enumerar(partes: readonly string[]): string {
  if (partes.length <= 1) return partes.join('');
  return `${partes.slice(0, -1).join(', ')} y ${partes.at(-1)}`;
}

function faltaLlenar(titulos: readonly string[]): string {
  return `Falta llenar: ${enumerar(titulos)}.`;
}

/**
 * Lo que impide cerrar, ya redactado y en español. Lista vacía = se puede cerrar.
 *
 * ── Qué exige el cierre (spec 004, cambio del 2026-09-14) ──
 *
 * Hasta entonces bastaba una máquina, una persona o una actividad. OCC pidió que
 * no se cierre una bitácora sin haberla diligenciado entera, así que ahora hacen
 * falta **las siete secciones** (RF-50), y además:
 *
 *  · cada máquina con sus dos lecturas —cada una contra el tope de su propio
 *    medidor, que vive en `validarAvance`—. Las observaciones también se pedían
 *    (RF-51) hasta la spec 029 (RF-15), que las volvió opcionales;
 *  · cada persona con su hora de entrada y de salida;
 *  · **al menos una** actividad con fotografía, no todas (RF-52, corregido el
 *    2026-09-15).
 *
 * Un **día sin trabajo** —un domingo, un paro por lluvia— no tiene máquinas ni
 * actividades que registrar; con la marca y su motivo se exigen solo el clima,
 * las notas y la foto del día (RF-53, RF-54).
 *
 * Un día **con** trabajo puede quedar sin actividades o sin ensayos: con su marca
 * y su motivo esa sección cuenta como llena (spec 032, RF-24, RF-32). En el día
 * sin trabajo esas marcas no se miran (RF-37): esa rama ya no pide esas secciones.
 *
 * ── Por qué una lista, y en este orden ──
 *
 * El residente está mirando el documento entero en el índice y le sirve saber
 * todo lo que falta de una vez, no descubrirlo de uno en uno a base de pulsar
 * Cerrar. Las secciones vacías van juntas en un solo mensaje, porque siete
 * renglones de «falta X» taparían los que de verdad nombran algo concreto. Luego
 * máquinas, personas y fotos, cada grupo en el orden en que está registrado.
 *
 * Los partes **ya cerrados** antes del cambio no se vuelven a evaluar (RF-56):
 * esta regla solo corre al cerrar, y una bitácora cerrada no se vuelve a cerrar.
 */
export function bloqueosDelCierre(parte: ParteEvaluable, fotos: FotosDelParte): string[] {
  const bloqueos: string[] = [];

  if (parte.sinTrabajo) {
    const error = validarDiaSinTrabajo(parte);
    if (error) bloqueos.push(mensajeDeDiaSinTrabajo(error));

    const faltan: string[] = [];
    if (parte.clima.length === 0) faltan.push(TITULO_DE_SECCION.clima);
    if (!hayTexto(parte.notas)) faltan.push(TITULO_DE_SECCION.notas);
    if (fotos.delDia === 0) faltan.push(TITULO_DE_SECCION.fotografia);
    if (faltan.length > 0) bloqueos.push(faltaLlenar(faltan));

    return bloqueos;
  }

  // Spec 032: una sección vacía con su marca y su motivo cuenta como llena (RF-24,
  // RF-32). Con la marca y sin motivo, el bloqueo nombra el motivo y no la sección:
  // «Falta llenar: Actividades» invitaría a agregar una, que es lo contrario.
  const sinMotivo: string[] = [];
  const vaciaSinMarca = (
    seccion: SeccionSinRegistro,
    filas: number,
    marcada: boolean | undefined,
    motivo: string | null | undefined,
  ) => {
    if (filas > 0) return false;
    if (!marcada) return true;
    if (!hayTexto(motivo)) sinMotivo.push(faltaElMotivoSinRegistro(seccion));
    return false;
  };

  const faltan: string[] = [];
  if (parte.maquinaria.length === 0) faltan.push(TITULO_DE_SECCION.maquinaria);
  if (parte.personal.length === 0) faltan.push(TITULO_DE_SECCION.personal);
  if (vaciaSinMarca('actividades', parte.actividades.length, parte.sinActividades, parte.motivoSinActividades)) {
    faltan.push(TITULO_DE_SECCION.actividades);
  }
  if (parte.clima.length === 0) faltan.push(TITULO_DE_SECCION.clima);
  const ensayos = parte.laboratorio.length + (parte.ensayosDelModulo ?? 0);
  if (vaciaSinMarca('ensayos', ensayos, parte.sinEnsayos, parte.motivoSinEnsayos)) {
    faltan.push(TITULO_DE_SECCION.laboratorio);
  }
  if (!hayTexto(parte.notas)) faltan.push(TITULO_DE_SECCION.notas);
  if (fotos.delDia === 0) faltan.push(TITULO_DE_SECCION.fotografia);
  if (faltan.length > 0) bloqueos.push(faltaLlenar(faltan));
  bloqueos.push(...sinMotivo);

  for (const maquina of parte.maquinaria) {
    const error = validarAvance(maquina.claseMedidor, maquina.medidorInicial, maquina.medidorFinal);
    if (error) {
      bloqueos.push(
        `${maquina.codigo}: ${mensajeDeAvance(maquina.claseMedidor, error, maquina.medidorInicial)}`,
      );
    }
    // Las observaciones ya no se exigen (spec 029, RF-15): «Sin observación» es una
    // respuesta, y la casilla del panel la deja dicha.
  }

  // La misma regla que al guardar (025/RF-61): lo que se dejó guardar se deja cerrar.
  for (const persona of parte.personal) {
    const error = validarPersonaDelParte(persona);
    if (error === 'falta_entrada' || error === 'falta_salida') {
      bloqueos.push(`A ${persona.nombre} le falta la hora de entrada o de salida.`);
    } else if (error) {
      bloqueos.push(`${persona.nombre}: ${mensajeDePersona(error)}`);
    }
  }

  // Sin actividades ya lo dice «Falta llenar»; pedirle además la foto a una
  // actividad que no existe sería decir lo mismo dos veces. Y marcado «Hoy no se
  // realizaron actividades», no hay actividad a la que pedirle foto (032/RF-25).
  if (parte.actividades.length > 0) {
    const conFoto = new Set(fotos.itemsConFoto);
    if (!parte.actividades.some((actividad) => conFoto.has(actividad.id))) {
      bloqueos.push('Falta la fotografía de al menos una actividad.');
    }
  }

  return bloqueos;
}

/**
 * El texto con el que el servidor rechaza un cierre: **todos** los bloqueos, uno
 * por renglón (004/RF-50).
 *
 * La ruta mandaba solo el primero, porque un rechazo lleva un mensaje. Pero así
 * el residente descubría lo que faltaba de uno en uno, pulsando Cerrar una y otra
 * vez. No se recorta la lista: si hay veinte máquinas sin observaciones, son
 * veinte cosas que hacer, y esconder quince no las hace desaparecer.
 */
export function mensajeDelRechazoDeCierre(bloqueos: readonly string[]): string {
  return ['No se puede cerrar la bitácora todavía:', ...bloqueos.map((b) => `• ${b}`)].join('\n');
}
