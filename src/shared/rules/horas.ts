/**
 * Cuántas horas trabajó una persona y de qué clase fueron.
 *
 * La bitácora registra una entrada y una salida por persona y día. De ahí sale
 * lo que la obra necesita saber: cuánto se trabajó, cuánto se pasó de la jornada
 * y qué parte de eso cae en horario nocturno o en domingo o festivo.
 *
 * **Aquí no se calcula dinero.** Se clasifican minutos, y con eso basta para
 * llevar el control de la obra. Convertirlos a pesos exige el salario de cada
 * persona, el tope semanal y las reglas de liquidación, y eso es una nómina —
 * que está explícitamente fuera del alcance de la spec 004.
 *
 * ── Las reglas que se aplican, y de dónde salen ──
 *
 * Cada obra tiene su horario (spec 016): uno o dos tramos de lunes a viernes y el
 * sábado aparte. Hasta esa spec la jornada era una sola y fija, de 7:30 a 12:00
 * y de 13:30 a 17:00 todos los días; sigue aquí como `HORARIO_ANTERIOR`, porque es
 * con la que se leen los partes cerrados antes del cambio.
 *
 * Las extra se cuentan **por cantidad**: lo trabajado por encima de lo que el
 * horario programa ese día. No por estar fuera de los tramos: quien llega tarde y
 * compensa al salir no hace extras. Para saber si una extra es diurna o nocturna
 * hace falta decidir cuáles son, y se decidió con OCC que son **las últimas**
 * horas trabajadas del día (spec 016, RF-41).
 *
 * El recargo nocturno corre **de 7:00 p.m. a 6:00 a.m.** desde la Ley 2466 de
 * 2025, que adelantó el inicio dos horas: antes empezaba a las 9:00 p.m.
 *
 * Domingos y festivos se tratan igual entre sí. Los festivos se calculan en
 * `festivos.ts`; no hay lista escrita a mano que caduque.
 *
 * Nota que no cabe en el código pero conviene tener presente: desde el 15 de
 * julio de 2026 la jornada máxima legal en Colombia es de **42 horas
 * semanales**. Ocho horas diarias de lunes a sábado son cuarenta y ocho. Esta
 * función clasifica el día, no la semana; el tope semanal es cosa de quien
 * liquida la nómina.
 */
import { diaDeLaSemana, esDominicalOFestivo } from './festivos';

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

/** El recargo nocturno corre de 7:00 p.m. a 6:00 a.m. (Ley 2466 de 2025). */
export const NOCTURNO = { desde: 19 * HORA, hasta: 6 * HORA } as const;

export type ErrorHorario = 'falta_entrada' | 'falta_salida' | 'salida_antes' | 'jornada_imposible';

/** Nadie trabaja más de esto seguido; por encima es un dedazo al teclear. */
export const MAXIMO_MINUTOS_POR_DIA = 16 * HORA;

export interface DesgloseDeHoras {
  /** Minutos efectivamente trabajados, ya descontado el descanso entre tramos. */
  trabajados: number;
  /** Los que caben dentro de lo que el horario programa ese día. */
  ordinarios: number;
  /** Los que lo pasan. Trabajo suplementario: `extraDiurna + extraNocturna`. */
  extra: number;
  /** Las extra que no caen entre las 7:00 p.m. y las 6:00 a.m. */
  extraDiurna: number;
  /** Las extra entre las 7:00 p.m. y las 6:00 a.m. */
  extraNocturna: number;
  /** Todos los trabajados entre las 7:00 p.m. y las 6:00 a.m., ordinarios o extra. */
  nocturnos: number;
  /** Los nocturnos que son ordinarios: llevan recargo nocturno, no de hora extra. */
  nocturnosOrdinarios: number;
  /** Si el día es domingo o festivo, todo lo trabajado lleva recargo. */
  dominicalOFestivo: boolean;
  /** Más de dos horas extra en el día: se avisa, no se impide (spec 016, RF-36). */
  masDeDosExtra: boolean;
}

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

/** Cuántos minutos comparten dos intervalos. */
function solape(desdeA: number, hastaA: number, desdeB: number, hastaB: number): number {
  return Math.max(0, Math.min(hastaA, hastaB) - Math.max(desdeA, desdeB));
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

type Intervalo = [number, number];

/**
 * Las noches que puede tocar una jornada, en minutos desde la medianoche del día
 * del parte: la madrugada de ese día y la noche que sigue, hasta las 6:00 del día
 * siguiente. Una jornada no pasa de 16 h, así que no llega a otra noche.
 */
const NOCHES: Intervalo[] = [
  [0, NOCTURNO.hasta],
  [NOCTURNO.desde, 24 * HORA + NOCTURNO.hasta],
];

function nocturnosEn(intervalos: Intervalo[]): number {
  return intervalos.reduce(
    (suma, [desde, hasta]) =>
      suma + NOCHES.reduce((s, [nd, nh]) => s + solape(desde, hasta, nd, nh), 0),
    0,
  );
}

/** Los descansos del día: los huecos entre tramos consecutivos del horario (RF-8). */
function descansosDe(tramos: Tramo[]): Intervalo[] {
  const minutos = tramos
    .map((t) => [minutosDeHora(t.desde), minutosDeHora(t.hasta)] as const)
    .filter((t): t is readonly [number, number] => t[0] !== null && t[1] !== null)
    .sort((a, b) => a[0] - b[0]);
  const huecos: Intervalo[] = [];
  for (let i = 1; i < minutos.length; i++) {
    if (minutos[i][0] > minutos[i - 1][1]) huecos.push([minutos[i - 1][1], minutos[i][0]]);
  }
  return huecos;
}

/** La presencia menos los descansos: lo que de verdad se trabajó, en orden (RF-14). */
function restarDescansos(presencia: Intervalo, descansos: Intervalo[]): Intervalo[] {
  let trozos: Intervalo[] = [presencia];
  for (const [dd, dh] of descansos) {
    trozos = trozos.flatMap(([desde, hasta]): Intervalo[] => {
      if (dh <= desde || dd >= hasta) return [[desde, hasta]];
      const quedan: Intervalo[] = [];
      if (dd > desde) quedan.push([desde, dd]);
      if (dh < hasta) quedan.push([dh, hasta]);
      return quedan;
    });
  }
  return trozos;
}

/** Los últimos `minutos` de lo trabajado, recorriendo de atrás hacia adelante (RF-41). */
function ultimos(trabajado: Intervalo[], minutos: number): Intervalo[] {
  const tomados: Intervalo[] = [];
  let faltan = minutos;
  for (let i = trabajado.length - 1; i >= 0 && faltan > 0; i--) {
    const [desde, hasta] = trabajado[i];
    const inicio = Math.max(desde, hasta - faltan);
    tomados.push([inicio, hasta]);
    faltan -= hasta - inicio;
  }
  return tomados;
}

/**
 * Clasifica lo que trabajó una persona ese día, contra el horario de su obra.
 *
 * `fecha` es la del día del parte, en `YYYY-MM-DD`: decide qué tramos rigen
 * (sábado, domingo o festivo) y si hay recargo dominical. `horario` es el que le
 * toca al parte: el de la obra si está abierto, el guardado si se cerró, o
 * `HORARIO_ANTERIOR` si se cerró antes de la spec 016 (`horarioEfectivo`).
 */
export function desglosarJornada(
  fecha: string,
  entrada: string | null,
  salida: string | null,
  horario: HorarioDeObra,
): DesgloseDeHoras | null {
  if (validarHorario(entrada, salida) !== null) return null;

  const desde = minutosDeHora(entrada)!;
  const hastaCrudo = minutosDeHora(salida)!;
  const hasta = hastaCrudo < desde ? hastaCrudo + 24 * HORA : hastaCrudo;

  const tramos = tramosDelDia(horario, fecha);
  // El descanso se descuenta solo por lo que la persona estuvo presente en él.
  // Quien entra después del almuerzo no almorzó dentro de su jornada.
  const trabajado = restarDescansos([desde, hasta], descansosDe(tramos));
  const trabajados = trabajado.reduce((suma, [d, h]) => suma + (h - d), 0);

  // Por cantidad: lo que pasa de lo programado ese día es extra (RF-15, RF-16).
  const ordinarios = Math.min(trabajados, minutosDeTramos(tramos));
  const extra = trabajados - ordinarios;

  const nocturnos = nocturnosEn(trabajado);
  const extraNocturna = nocturnosEn(ultimos(trabajado, extra));

  return {
    trabajados,
    ordinarios,
    extra,
    extraDiurna: extra - extraNocturna,
    extraNocturna,
    nocturnos,
    nocturnosOrdinarios: nocturnos - extraNocturna,
    dominicalOFestivo: esDominicalOFestivo(fecha),
    masDeDosExtra: extra > MAXIMO_MINUTOS_EXTRA_POR_DIA,
  };
}

/** Minutos → "8 h 30 min", que es como se lee una jornada. */
export function horasLegibles(minutos: number): string {
  const h = Math.floor(minutos / HORA);
  const m = minutos % HORA;
  if (h === 0) return `${m} min`;
  return m === 0 ? `${h} h` : `${h} h ${m} min`;
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

const SABADO = 6;

/**
 * Los tramos programados de un día (RF-11 a RF-13).
 *
 * El festivo manda sobre el sábado: un 1 de mayo que cae en sábado se trata como
 * festivo, con la jornada de lunes a viernes como referencia y su recargo.
 */
export function tramosDelDia(horario: HorarioDeObra, fecha: string): Tramo[] {
  if (esDominicalOFestivo(fecha)) return horario.semana;
  if (diaDeLaSemana(fecha) === SABADO) return horario.sabado;
  return horario.semana;
}

function tramosLegibles(tramos: Tramo[]): string {
  return tramos.map((t) => `de ${t.desde} a ${t.hasta}`).join(' y ');
}

/** Lo que el parte enseña encima del personal: el horario de la obra ese día (RF-10). */
export function describirHorarioDelDia(horario: HorarioDeObra, fecha: string): string {
  if (esDominicalOFestivo(fecha)) {
    return `Domingo o festivo: se toma la jornada de lunes a viernes, ${tramosLegibles(horario.semana)}.`;
  }
  const tramos = tramosDelDia(horario, fecha);
  if (tramos.length === 0) return 'Los sábados no se trabaja en esta obra.';
  const texto = tramosLegibles(tramos);
  return `${texto.charAt(0).toUpperCase()}${texto.slice(1)}.`;
}

/**
 * El horario con que se calculan las horas de un parte (RF-22, RF-24, RF-25).
 *
 * Un parte cerrado es evidencia: sus cifras no pueden cambiar porque la gerencia
 * corrija después el horario de la obra. Por eso al cerrarlo —o al anularlo— se
 * guarda el horario de ese momento, y aquí manda ese. Uno cerrado o anulado **sin**
 * horario guardado es de antes de la spec 016, y se lee con la jornada de
 * entonces. Solo un parte abierto sigue el horario vigente de su obra.
 */
export function horarioEfectivo(
  parte: {
    horario: HorarioDeObra | null;
    cerradoEn: Date | string | null;
    anuladoEn: Date | string | null;
  },
  horarioDeLaObra: HorarioDeObra,
): HorarioDeObra {
  if (parte.horario) return parte.horario;
  if (parte.cerradoEn || parte.anuladoEn) return HORARIO_ANTERIOR;
  return horarioDeLaObra;
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
