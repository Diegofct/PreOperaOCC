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
 * La jornada de OCC es de 7:30 a 12:00 y de 13:30 a 17:00: ocho horas de trabajo
 * con hora y media de almuerzo. Lo que pase de ahí es trabajo suplementario.
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
import { esDominicalOFestivo } from './festivos';

/** Minutos desde la medianoche. */
const HORA = 60;

/** La jornada acordada con OCC, en minutos desde medianoche. */
export const JORNADA = {
  mananaDesde: 7 * HORA + 30,
  mananaHasta: 12 * HORA,
  tardeDesde: 13 * HORA + 30,
  tardeHasta: 17 * HORA,
} as const;

/** Ocho horas: lo que suman los dos tramos de la jornada. */
export const MINUTOS_ORDINARIOS =
  JORNADA.mananaHasta - JORNADA.mananaDesde + (JORNADA.tardeHasta - JORNADA.tardeDesde);

/** El almuerzo. No se trabaja, así que no se cuenta ni como ordinario ni como extra. */
const ALMUERZO = { desde: JORNADA.mananaHasta, hasta: JORNADA.tardeDesde } as const;

/** El recargo nocturno corre de 7:00 p.m. a 6:00 a.m. (Ley 2466 de 2025). */
export const NOCTURNO = { desde: 19 * HORA, hasta: 6 * HORA } as const;

export type ErrorHorario = 'falta_entrada' | 'falta_salida' | 'salida_antes' | 'jornada_imposible';

/** Nadie trabaja más de esto seguido; por encima es un dedazo al teclear. */
export const MAXIMO_MINUTOS_POR_DIA = 16 * HORA;

export interface DesgloseDeHoras {
  /** Minutos efectivamente trabajados, ya descontado el almuerzo. */
  trabajados: number;
  /** Los que caben dentro de la jornada ordinaria. */
  ordinarios: number;
  /** Los que la pasan. Trabajo suplementario. */
  extra: number;
  /** Los trabajados entre las 7:00 p.m. y las 6:00 a.m. Van dentro de los de arriba. */
  nocturnos: number;
  /** Si el día es domingo o festivo, todo lo trabajado lleva recargo. */
  dominicalOFestivo: boolean;
}

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

/**
 * Clasifica lo que trabajó una persona ese día.
 *
 * `fecha` es la del día de la bitácora, en `YYYY-MM-DD`: es lo que decide si hay
 * recargo dominical o festivo.
 */
export function desglosarJornada(
  fecha: string,
  entrada: string | null,
  salida: string | null,
): DesgloseDeHoras | null {
  if (validarHorario(entrada, salida) !== null) return null;

  const desde = minutosDeHora(entrada)!;
  const hastaCrudo = minutosDeHora(salida)!;
  const hasta = hastaCrudo < desde ? hastaCrudo + 24 * HORA : hastaCrudo;

  // El almuerzo se descuenta solo si la persona estuvo a caballo de él. Quien
  // entra a las 13:30 no almorzó dentro de su jornada.
  const enAlmuerzo = solape(desde, hasta, ALMUERZO.desde, ALMUERZO.hasta);
  const trabajados = hasta - desde - enAlmuerzo;

  // Lo nocturno se mide sobre el tiempo de presencia, en dos tramos: el de la
  // noche de este día y el de la madrugada del siguiente. Con la jornada que
  // cruza la medianoche los dos pueden aportar.
  const nocturnos =
    solape(desde, hasta, NOCTURNO.desde, 24 * HORA) +
    solape(desde, hasta, 24 * HORA, 24 * HORA + NOCTURNO.hasta) +
    solape(desde, hasta, 0, NOCTURNO.hasta);

  return {
    trabajados,
    ordinarios: Math.min(trabajados, MINUTOS_ORDINARIOS),
    extra: Math.max(0, trabajados - MINUTOS_ORDINARIOS),
    nocturnos: Math.min(nocturnos, trabajados),
    dominicalOFestivo: esDominicalOFestivo(fecha),
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
