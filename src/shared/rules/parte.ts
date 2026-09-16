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
/* Lo que se exige a una fila al guardar (cambio del 2026-09-16)             */
/* ------------------------------------------------------------------------ */

/**
 * Los textos de lo que le falta a una actividad. Los usan el contrato del servidor y
 * la pantalla, así que dicen lo mismo en los dos sitios.
 */
export const MENSAJES_DE_ACTIVIDAD = {
  sinCual: 'Escriba cuál fue la actividad.',
  sinUnidad: 'Elija la unidad de la actividad.',
} as const;

export type CampoDeActividad = 'texto' | 'unidad';

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
 */
export function faltasDeActividad(actividad: {
  otra: boolean;
  texto?: string | null;
  unidad?: string | null;
}): FaltaDeActividad[] {
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

/* ------------------------------------------------------------------------ */
/* Qué secciones tiene el parte y cuáles están llenas                        */
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
  /**
   * Marcado como día sin trabajo (004/RF-53). Ausente es no marcado, que es lo
   * que son todos los partes anteriores al cambio.
   */
  sinTrabajo?: boolean;
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

/** El id de una sección del parte. Cerrado: no hay más que estas diez. */
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
 * Las secciones del parte, **en el orden en que se pintan**.
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
   * algo, se enseña lo que tiene — el parte no esconde datos por una marca, y es
   * el cierre quien rechaza la contradicción (004/RF-55).
   */
  const exigible = (id: string, titulo: string, cuantos: number): SeccionDelParte =>
    conteos.sinTrabajo && cuantos === 0
      ? { id, titulo, estado: 'no_aplica', cuantos: null }
      : porCuantos(id, titulo, cuantos);

  const secciones: SeccionDelParte[] = [
    exigible('maquinaria', TITULO_DE_SECCION.maquinaria, conteos.maquinaria),
    exigible('personal', TITULO_DE_SECCION.personal, conteos.personal),
    exigible('actividades', TITULO_DE_SECCION.actividades, conteos.actividades),
    porCuantos('clima', TITULO_DE_SECCION.clima, conteos.clima),
    exigible('laboratorio', TITULO_DE_SECCION.laboratorio, conteos.laboratorio),
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
  /**
   * Opcional en el tipo porque los partes anteriores al 2026-09-14 no las
   * traen. Ausente se lee como vacío, y vacío no deja cerrar (004/RF-51).
   */
  observaciones?: string;
}

/** Lo que se mira de una persona. Su horario completo, nada más. */
export interface PersonaEvaluable {
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
  notas: string | null;
  /** Ausente es no marcado, como en todos los partes anteriores al cambio. */
  sinTrabajo?: boolean;
  motivoSinTrabajo?: string | null;
}

/**
 * Las fotografías del parte, ya contadas por quien pregunta.
 *
 * Llegan aparte y contadas porque viven en otro sitio que el parte —el almacén
 * de imágenes y su tabla— y leerlas es I/O. La ruta de cierre las consulta y la
 * pantalla ya las tiene cargadas; la regla solo decide con lo que le dan.
 */
export interface FotosDelParte {
  /** Cuántas fotografías del día tiene el parte. */
  delDia: number;
  /**
   * El id de actividad al que apunta cada foto de actividad. Puede traer ids de
   * actividades que ya no están en el parte: se subió la foto y la actividad se
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

/** Lo que ya está guardado del parte, en lo que toca al día sin trabajo. */
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
 * queda el parte** mezclando lo que llega con lo guardado. Sin eso, marcar un
 * domingo que ya tiene una máquina pasaría porque la petición no trae máquinas,
 * y registrar una máquina en un día marcado pasaría porque la petición no trae la
 * marca — y el parte quedaría contradiciéndose (004/RF-55).
 *
 * Quitar la marca borra el motivo: un motivo sin marca haría creer a quien lea
 * el parte que ese día no se trabajó.
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
 * no se cierre un parte sin haberlo diligenciado entero, así que ahora hacen
 * falta **las siete secciones** (RF-50), y además:
 *
 *  · cada máquina con sus dos lecturas —cada una contra el tope de su propio
 *    medidor, que vive en `validarAvance`— y con sus observaciones (RF-51);
 *  · cada persona con su hora de entrada y de salida;
 *  · **al menos una** actividad con fotografía, no todas (RF-52, corregido el
 *    2026-09-15).
 *
 * Un **día sin trabajo** —un domingo, un paro por lluvia— no tiene máquinas ni
 * actividades que registrar; con la marca y su motivo se exigen solo el clima,
 * las notas y la foto del día (RF-53, RF-54).
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
 * esta regla solo corre al cerrar, y un parte cerrado no se vuelve a cerrar.
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

  const faltan: string[] = [];
  if (parte.maquinaria.length === 0) faltan.push(TITULO_DE_SECCION.maquinaria);
  if (parte.personal.length === 0) faltan.push(TITULO_DE_SECCION.personal);
  if (parte.actividades.length === 0) faltan.push(TITULO_DE_SECCION.actividades);
  if (parte.clima.length === 0) faltan.push(TITULO_DE_SECCION.clima);
  if (parte.laboratorio.length === 0) faltan.push(TITULO_DE_SECCION.laboratorio);
  if (!hayTexto(parte.notas)) faltan.push(TITULO_DE_SECCION.notas);
  if (fotos.delDia === 0) faltan.push(TITULO_DE_SECCION.fotografia);
  if (faltan.length > 0) bloqueos.push(faltaLlenar(faltan));

  for (const maquina of parte.maquinaria) {
    const error = validarAvance(maquina.claseMedidor, maquina.medidorInicial, maquina.medidorFinal);
    if (error) {
      bloqueos.push(
        `${maquina.codigo}: ${mensajeDeAvance(maquina.claseMedidor, error, maquina.medidorInicial)}`,
      );
    }
    if (!hayTexto(maquina.observaciones)) {
      bloqueos.push(`${maquina.codigo}: faltan las observaciones del día.`);
    }
  }

  for (const persona of parte.personal) {
    if (!persona.entrada || !persona.salida) {
      bloqueos.push(`A ${persona.nombre} le falta la hora de entrada o de salida.`);
    }
  }

  // Sin actividades ya lo dice «Falta llenar»; pedirle además la foto a una
  // actividad que no existe sería decir lo mismo dos veces.
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
  return ['No se puede cerrar el parte todavía:', ...bloqueos.map((b) => `• ${b}`)].join('\n');
}
