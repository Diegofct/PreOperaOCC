/**
 * Las horas de una persona y el horario de cada obra.
 *
 * Desde la spec 039 las horas son **las que reporta la obra**: laboradas (L),
 * extra diurnas (HED) y extra nocturnas (HEN). Ya no se calculan con la entrada,
 * la salida y el horario: una fila que solo trae entrada y salida queda «Horas no
 * reportadas» (RF-6 a RF-9).
 *
 * **Aquí no se calcula dinero.** Convertir horas a pesos exige el salario, el
 * tope semanal y las reglas de liquidación, y eso es una nómina.
 *
 * El horario de la obra (spec 016) se conserva: lo usan los avisos de WhatsApp
 * (qué días se esperan reportes) y la configuración de la obra.
 */

/** Minutos desde la medianoche. */
const HORA = 60;

/**
 * La jornada fija de antes de la spec 016, en minutos. Ya no decide las extras
 * (eso es `HORARIO_ANTERIOR` o el horario de la obra); queda para `cubrenLaJornada`.
 */
export const JORNADA = {
  mananaDesde: 7 * HORA + 30,
  mananaHasta: 12 * HORA,
  tardeDesde: 13 * HORA + 30,
  tardeHasta: 17 * HORA,
} as const;

export type ErrorHorario = 'falta_entrada' | 'falta_salida' | 'salida_antes' | 'jornada_imposible';

/** Nadie trabaja más de esto seguido; por encima es un dedazo al teclear. */
export const MAXIMO_MINUTOS_POR_DIA = 16 * HORA;

/** Dos horas extra al día: lo que permite la ley. Pasarlo se avisa (RF-36). */
export const MAXIMO_MINUTOS_EXTRA_POR_DIA = 2 * HORA;

/** "HH:MM" → minutos desde medianoche. `null` si no se puede leer. */
export function minutosDeHora(hora: string | null | undefined): number | null {
  if (!hora) return null;
  const coincide = /^(\d{1,2}):(\d{2})$/.exec(hora.trim());
  if (!coincide) return null;
  const h = Number(coincide[1]);
  const m = Number(coincide[2]);
  if (h > 23 || m > 59) return null;
  return h * HORA + m;
}

/** Minutos desde medianoche → "HH:MM", con las horas de más allá de un día. */
export function horaDeMinutos(minutos: number): string {
  const h = Math.floor(minutos / HORA) % 24;
  const m = minutos % HORA;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

/**
 * Valida un horario de entrada y salida.
 *
 * Una salida **anterior** a la entrada no es un error: es una jornada que cruzó
 * la medianoche, y en obra pasa —un vaciado de concreto que se alarga—. Se toma
 * como del día siguiente. Lo que sí se rechaza es una jornada imposiblemente
 * larga, que siempre es un dedazo.
 */
export function validarHorario(
  entrada: string | null,
  salida: string | null,
): ErrorHorario | null {
  const desde = minutosDeHora(entrada);
  const hasta = minutosDeHora(salida);
  if (desde === null) return 'falta_entrada';
  if (hasta === null) return 'falta_salida';

  // Entrar y salir en el mismo minuto no es una jornada de veinticuatro horas,
  // es un dedazo. Se comprueba antes de dar por hecho el cruce de medianoche,
  // porque si no este caso se colaba como «jornada imposible» y el mensaje
  // mandaba a revisar lo que no era.
  if (hasta === desde) return 'salida_antes';

  const fin = hasta < desde ? hasta + 24 * HORA : hasta;
  if (fin - desde > MAXIMO_MINUTOS_POR_DIA) return 'jornada_imposible';
  return null;
}

export function mensajeDeHorario(error: ErrorHorario): string {
  switch (error) {
    case 'falta_entrada':
      return 'Falta la hora de entrada.';
    case 'falta_salida':
      return 'Falta la hora de salida.';
    case 'salida_antes':
      return 'La entrada y la salida no pueden ser la misma hora.';
    case 'jornada_imposible':
      return `Son más de ${MAXIMO_MINUTOS_POR_DIA / HORA} horas seguidas. Revise las horas.`;
  }
}

/** Minutos → "8 h 30 min", que es como se lee una jornada. */
export function horasLegibles(minutos: number): string {
  const h = Math.floor(minutos / HORA);
  const m = minutos % HORA;
  if (h === 0) return `${m} min`;
  return m === 0 ? `${h} h` : `${h} h ${m} min`;
}

/* ------------------------------------------------------------------------ */
/* Las horas como las reporta la obra (spec 025)                            */
/* ------------------------------------------------------------------------ */

/** Lo que se mira de una persona del parte para dejarla guardar. */
export interface PersonaConHoras {
  entrada?: string | null;
  salida?: string | null;
  horasLaboradas?: number | null;
  extraDiurnas?: number | null;
  extraNocturnas?: number | null;
  novedad?: string | null;
}

export type ErrorPersona =
  | ErrorHorario
  | 'sin_horas'
  | 'extra_sin_laboradas'
  | 'mas_de_16'
  | 'horas_invalidas'
  | 'extra_mayor';

const hay = (n: number | null | undefined): n is number => typeof n === 'number' && !Number.isNaN(n);

/** Una cantidad de horas válida: no negativa y de media hora en media hora (RF-4). */
function horasValidas(n: number): boolean {
  return n >= 0 && Number.isInteger(n * 2);
}

/**
 * ¿Se puede guardar esta persona? (spec 025, RF-6 a RF-12, RF-19, RF-20; y spec
 * 016 cuando trae entrada y salida, RF-7).
 *
 * Vale con cualquiera de tres cosas: las horas laboradas, la entrada y la salida,
 * o una novedad. Las extra que falten se leen como 0 (RF-12); que vengan sin las
 * laboradas no, porque las laboradas son el total del que salen (RF-5, RF-11).
 * Si trae entrada o salida, se le exigen las dos como siempre: media jornada
 * escrita es un dedazo, venga o no con horas.
 */
export function validarPersonaDelParte(persona: PersonaConHoras): ErrorPersona | null {
  const { horasLaboradas: l, extraDiurnas: ed, extraNocturnas: en } = persona;
  if (!hay(l) && (hay(ed) || hay(en))) return 'extra_sin_laboradas';
  if (hay(l)) {
    if (l > MAXIMO_MINUTOS_POR_DIA / HORA) return 'mas_de_16';
    if (![l, ed ?? 0, en ?? 0].every(horasValidas)) return 'horas_invalidas';
    if ((ed ?? 0) + (en ?? 0) > l) return 'extra_mayor';
  }
  if (persona.entrada || persona.salida) return validarHorario(persona.entrada ?? null, persona.salida ?? null);
  if (!hay(l) && !persona.novedad) return 'sin_horas';
  return null;
}

export function mensajeDePersona(error: ErrorPersona): string {
  switch (error) {
    case 'sin_horas':
      // La entrada y la salida ya no se piden (spec 029, RF-20, RF-21): las filas
      // viejas que las traen no llegan aquí.
      return 'Escriba sus horas laboradas (L) o su novedad.';
    case 'extra_sin_laboradas':
      return 'Escriba primero las horas laboradas.';
    case 'mas_de_16':
      return `Son más de ${MAXIMO_MINUTOS_POR_DIA / HORA} horas. Revise las horas.`;
    case 'horas_invalidas':
      return 'Las horas van de media hora en media hora: 8, 8.5, 9.';
    case 'extra_mayor':
      return 'Las horas extra no pueden ser más que las laboradas.';
    default:
      return mensajeDeHorario(error);
  }
}

/** Las horas reportadas de una persona, en minutos (spec 039, RF-6). */
export interface HorasDeLaPersona {
  trabajados: number;
  extraDiurna: number;
  extraNocturna: number;
  extra: number;
}

/**
 * Lo que se muestra y se suma de una persona: lo reportado si tiene horas
 * laboradas, o `null` si no las tiene, que se lee «Horas no reportadas»
 * (spec 039, RF-6 a RF-8). La entrada y la salida ya no se convierten en horas.
 * Una novedad sola cuenta 0 (025/RF-22).
 */
export function horasDeLaPersona(persona: PersonaConHoras): HorasDeLaPersona | null {
  if (!hay(persona.horasLaboradas)) return null;
  const extraDiurna = Math.round((persona.extraDiurnas ?? 0) * HORA);
  const extraNocturna = Math.round((persona.extraNocturnas ?? 0) * HORA);
  return {
    trabajados: Math.round(persona.horasLaboradas * HORA),
    extraDiurna,
    extraNocturna,
    extra: extraDiurna + extraNocturna,
  };
}

/* ------------------------------------------------------------------------ */
/* El horario de cada obra (spec 016)                                        */
/* ------------------------------------------------------------------------ */

/**
 * Un tramo de trabajo programado, dentro del mismo día.
 *
 * No cruza la medianoche: un turno de noche programado quedó fuera de la spec
 * 016, y esas horas se registran en el parte como extra nocturnas.
 */
export interface Tramo {
  desde: string;
  hasta: string;
}

/**
 * El horario acordado en una obra: uno o dos tramos de lunes a viernes, y el
 * sábado aparte porque es donde más difieren las obras. `sabado: []` es «los
 * sábados no se trabaja». Domingos y festivos no tienen horario propio: se toma
 * el de lunes a viernes como referencia (spec 016, RF-13).
 */
export interface HorarioDeObra {
  semana: Tramo[];
  sabado: Tramo[];
}

/**
 * Lo que se propone al registrar una obra, y lo que recibieron las que ya
 * existían (RF-3, RF-9). Suma 44,5 h: más que el máximo legal, a propósito —es la
 * jornada con que OCC venía trabajando— y el aviso lo hace visible.
 */
export const HORARIO_PROPUESTO: HorarioDeObra = {
  semana: [
    { desde: '07:30', hasta: '12:00' },
    { desde: '13:30', hasta: '17:00' },
  ],
  sabado: [{ desde: '07:30', hasta: '12:00' }],
};

/**
 * La jornada fija de antes de la spec 016: ocho horas **todos** los días, sábado
 * incluido. Es con la que se calculan los partes cerrados antes de que la obra
 * tuviera horario (RF-25): recalcularlos con otro cambiaría evidencia cerrada.
 */
export const HORARIO_ANTERIOR: HorarioDeObra = {
  semana: [
    { desde: '07:30', hasta: '12:00' },
    { desde: '13:30', hasta: '17:00' },
  ],
  sabado: [
    { desde: '07:30', hasta: '12:00' },
    { desde: '13:30', hasta: '17:00' },
  ],
};

/**
 * 42 horas a la semana: el máximo legal en Colombia desde el 15 de julio de 2026
 * (Ley 2101 de 2021). Pasarlo no se impide, se avisa (RF-35, RF-37): el horario
 * lo acuerda la obra, y quien decide si se corrige es la gerencia.
 */
export const MAXIMO_MINUTOS_SEMANALES = 42 * HORA;

const TRAMOS_POR_DIA = 2;

export type DiaDelHorario = 'semana' | 'sabado';

export interface ErrorHorarioDeObra {
  dia: DiaDelHorario;
  /** El índice del tramo, o `null` si el error es del día entero. */
  tramo: number | null;
  tipo: 'sin_tramos' | 'demasiados' | 'hora' | 'invertido' | 'se_pisan';
}

function validarTramosDe(dia: DiaDelHorario, tramos: Tramo[]): ErrorHorarioDeObra | null {
  // El sábado puede quedar vacío («no se trabaja»); lunes a viernes, no: una obra
  // sin horario entre semana no tiene contra qué contar las extras.
  if (tramos.length === 0) return dia === 'semana' ? { dia, tramo: null, tipo: 'sin_tramos' } : null;
  if (tramos.length > TRAMOS_POR_DIA) return { dia, tramo: null, tipo: 'demasiados' };

  const minutos: { desde: number; hasta: number }[] = [];
  for (const [indice, tramo] of tramos.entries()) {
    const desde = minutosDeHora(tramo.desde);
    const hasta = minutosDeHora(tramo.hasta);
    if (desde === null || hasta === null) return { dia, tramo: indice, tipo: 'hora' };
    // Terminar a la misma hora es tan imposible como terminar antes (RF-6).
    if (hasta <= desde) return { dia, tramo: indice, tipo: 'invertido' };
    minutos.push({ desde, hasta });
  }

  // Con dos tramos, el segundo empieza cuando el primero ya terminó (RF-7).
  // Tocarse en el borde no es pisarse: 12:00–12:00 es un día sin descanso.
  if (minutos.length === TRAMOS_POR_DIA && minutos[1].desde < minutos[0].hasta) {
    return { dia, tramo: 1, tipo: 'se_pisan' };
  }
  return null;
}

/** El primer error del horario, o `null` si está bien (RF-1, RF-2, RF-6, RF-7). */
export function validarHorarioDeObra(horario: HorarioDeObra): ErrorHorarioDeObra | null {
  return validarTramosDe('semana', horario.semana) ?? validarTramosDe('sabado', horario.sabado);
}

export function mensajeDeHorarioDeObra(error: ErrorHorarioDeObra): string {
  const dia = error.dia === 'semana' ? 'lunes a viernes' : 'sábado';
  const tramo = `El tramo ${(error.tramo ?? 0) + 1} de ${dia}`;
  switch (error.tipo) {
    case 'sin_tramos':
      return 'El horario de lunes a viernes necesita al menos un tramo.';
    case 'demasiados':
      return `El horario de ${dia} admite como mucho dos tramos.`;
    case 'hora':
      // En el panel las horas salen de un desplegable: si no se entiende es que
      // falta elegirla (el desplegable deja `''` mientras falte la hora o el minuto).
      return `Al tramo ${(error.tramo ?? 0) + 1} de ${dia} le falta elegir una hora.`;
    case 'invertido':
      return `${tramo} termina antes de empezar.`;
    case 'se_pisan':
      return `Los dos tramos de ${dia} se pisan: el segundo empieza antes de que termine el primero.`;
  }
}

function minutosDeTramos(tramos: Tramo[]): number {
  return tramos.reduce((suma, tramo) => {
    const desde = minutosDeHora(tramo.desde);
    const hasta = minutosDeHora(tramo.hasta);
    return desde === null || hasta === null || hasta <= desde ? suma : suma + (hasta - desde);
  }, 0);
}

/** Cuántos minutos programa el horario en una semana: cinco días más el sábado (RF-35). */
export function minutosSemanales(horario: HorarioDeObra): number {
  return 5 * minutosDeTramos(horario.semana) + minutosDeTramos(horario.sabado);
}

/* ------------------------------------------------------------------------ */
/* Las horas en desplegables (spec 016, RF-30 a RF-34)                       */
/* ------------------------------------------------------------------------ */

/** Las horas del día, de «00» a «23». */
export const HORAS_DEL_DIA: readonly string[] = Array.from({ length: 24 }, (_, h) =>
  String(h).padStart(2, '0'),
);

/**
 * Cada cuarto de hora. Más fino no aporta en un parte de obra y alarga la lista;
 * más grueso obliga a mentir sobre una salida a las 5:15.
 */
const MINUTOS_DE_LA_REJILLA = ['00', '15', '30', '45'] as const;

/** «07:30» → hora y minuto por separado, para los dos desplegables. En blanco, nada. */
export function partirHora(valor: string | null | undefined): {
  hora: string | null;
  minuto: string | null;
} {
  const minutos = minutosDeHora(valor);
  if (minutos === null) return { hora: null, minuto: null };
  const [hora, minuto] = horaDeMinutos(minutos).split(':');
  return { hora, minuto };
}

/**
 * La hora completa, o `''` mientras falte una de las dos partes.
 *
 * No se rellena el minuto con «00»: sería un valor puesto de antemano que se queda
 * el día que a alguien se le olvide elegirlo (spec 004, RF-44; spec 016, RF-34).
 */
export function unirHora(hora: string | null, minuto: string | null): string {
  return hora && minuto ? `${hora}:${minuto}` : '';
}

/**
 * Los minutos que ofrece el desplegable: la rejilla de cuarto de hora, más el de
 * una hora guardada que no cae en ella (RF-33). Sin eso, un «07:10» de antes se
 * vería en blanco y se perdería al guardar otra cosa.
 */
export function minutosOfrecidos(valor: string | null | undefined): string[] {
  const { minuto } = partirHora(valor);
  const opciones: string[] = [...MINUTOS_DE_LA_REJILLA];
  if (minuto && !opciones.includes(minuto)) opciones.push(minuto);
  return opciones.sort();
}

/* ------------------------------------------------------------------------ */
/* Franjas del día (el clima)                                                */
/* ------------------------------------------------------------------------ */

export interface Franja {
  desde: string | null;
  hasta: string | null;
}

export type ErrorFranja =
  | { tipo: 'horario'; indice: number; error: ErrorHorario }
  | { tipo: 'invertida'; indice: number }
  | { tipo: 'solape'; primera: number; segunda: number };

/**
 * Valida los tramos de clima de un día.
 *
 * A diferencia de la jornada de una persona, aquí una hora de fin anterior a la
 * de inicio **sí** es un error y no una noche cruzada: el clima se registra
 * dentro del día de la obra, y «de 15:00 a 09:00» siempre es un dedazo.
 *
 * Los tramos no pueden solaparse —a la misma hora no hizo sol y llovió— pero sí
 * pueden dejar huecos: no hay obligación de narrar el día entero, solo la de no
 * contradecirse.
 */
export function validarFranjas(franjas: Franja[]): ErrorFranja | null {
  const minutos: { desde: number; hasta: number; indice: number }[] = [];

  for (const [indice, franja] of franjas.entries()) {
    const desde = minutosDeHora(franja.desde);
    const hasta = minutosDeHora(franja.hasta);
    if (desde === null) return { tipo: 'horario', indice, error: 'falta_entrada' };
    if (hasta === null) return { tipo: 'horario', indice, error: 'falta_salida' };
    if (hasta <= desde) return { tipo: 'invertida', indice };
    minutos.push({ desde, hasta, indice });
  }

  const ordenadas = [...minutos].sort((a, b) => a.desde - b.desde);
  for (let i = 1; i < ordenadas.length; i++) {
    const anterior = ordenadas[i - 1];
    const actual = ordenadas[i];
    if (actual.desde < anterior.hasta) {
      // Se devuelven en el orden en que están escritas, no en el ordenado: es
      // como las va a ver quien tiene que arreglarlas.
      const [primera, segunda] = [anterior.indice, actual.indice].sort((a, b) => a - b);
      return { tipo: 'solape', primera, segunda };
    }
  }

  return null;
}

export function mensajeDeFranja(error: ErrorFranja): string {
  switch (error.tipo) {
    case 'horario':
      return `Al tramo ${error.indice + 1} le falta la hora de ${
        error.error === 'falta_entrada' ? 'inicio' : 'fin'
      }.`;
    case 'invertida':
      return `El tramo ${error.indice + 1} termina antes de empezar.`;
    case 'solape':
      return `Los tramos ${error.primera + 1} y ${error.segunda + 1} se pisan: a la misma hora no pudo hacer dos climas.`;
  }
}

/** Cuántos minutos del día cubren los tramos. Presupone que ya se validaron. */
export function minutosCubiertos(franjas: Franja[]): number {
  return franjas.reduce((suma, franja) => {
    const desde = minutosDeHora(franja.desde);
    const hasta = minutosDeHora(franja.hasta);
    return desde === null || hasta === null || hasta <= desde ? suma : suma + (hasta - desde);
  }, 0);
}

/** ¿Los tramos cubren la jornada completa, de 7:30 a 17:00? */
export function cubrenLaJornada(franjas: Franja[]): boolean {
  const puntos = franjas
    .map((f) => ({ desde: minutosDeHora(f.desde), hasta: minutosDeHora(f.hasta) }))
    .filter((f): f is { desde: number; hasta: number } => f.desde !== null && f.hasta !== null)
    .sort((a, b) => a.desde - b.desde);

  let alcanzado = JORNADA.mananaDesde;
  for (const { desde, hasta } of puntos) {
    if (desde > alcanzado) return false;
    alcanzado = Math.max(alcanzado, hasta);
    if (alcanzado >= JORNADA.tardeHasta) return true;
  }
  return alcanzado >= JORNADA.tardeHasta;
}
