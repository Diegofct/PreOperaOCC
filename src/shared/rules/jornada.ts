/**
 * Reglas de la bitácora diaria. Funciones puras, sin I/O.
 *
 * Corren igual en el dispositivo y en el servidor, y por eso se pueden
 * verificar en Node (`scripts/verificar-reglas.ts`) sin arrancar un teléfono.
 *
 * Todo se calcula en **hora local del equipo**, que es la del jefe de
 * operadores. El "día de trabajo" es el suyo, no el UTC.
 */

/** "HH:MM" en hora local, como se imprime en el formato de OCC. */
export function horaLocal(ms: number): string {
  const fecha = new Date(ms);
  return `${String(fecha.getHours()).padStart(2, '0')}:${String(fecha.getMinutes()).padStart(2, '0')}`;
}

/** "YYYY-MM-DD" en hora local. El día de trabajo, no el UTC. */
export function fechaLocalISO(ms: number): string {
  const fecha = new Date(ms);
  const mes = String(fecha.getMonth() + 1).padStart(2, '0');
  const dia = String(fecha.getDate()).padStart(2, '0');
  return `${fecha.getFullYear()}-${mes}-${dia}`;
}

/**
 * El día de trabajo en obra, `YYYY-MM-DD`, en hora de Colombia.
 *
 * Distinto de `fechaLocalISO`, y la diferencia importa: aquel usa la hora del
 * equipo, que en el celular del residente **es** la de la obra. Esta se usa
 * donde el reloj de quien mira no sirve —el navegador de alguien que puede estar
 * en otra ciudad, o un servidor que corre en UTC—, y siempre responde con el día
 * que se está trabajando en obra.
 *
 * Colombia no tiene horario de verano, así que el desfase es fijo. Si algún día
 * lo tuviera, este es el único sitio que habría que cambiar.
 */
export const DESFASE_COLOMBIA_MS = 5 * 60 * 60 * 1000;

export function fechaDeJornada(ahora: number = Date.now()): string {
  return new Date(ahora - DESFASE_COLOMBIA_MS).toISOString().slice(0, 10);
}

/**
 * Suma días a una fecha `YYYY-MM-DD`. Negativo para restar.
 *
 * ── Por qué mediodía UTC ──
 *
 * Anclar en `T00:00:00Z` y sumar parece lo natural, y es justo lo que falla: la
 * medianoche UTC es la tarde del día anterior en Colombia, así que al volver a
 * `YYYY-MM-DD` se pierde un día en cuanto interviene cualquier huso. El mediodía
 * está a doce horas de las dos fronteras, así que ningún desfase razonable lo
 * mueve de día.
 *
 * ── Por qué está aquí ──
 *
 * Estaba copiada **cuatro veces** —en `festivos.ts`, en las dos pantallas del
 * panel que navegan día a día y en el resumen del inicio—, idéntica en las
 * cuatro. Cuatro copias de una regla son cuatro sitios donde arreglar el mismo
 * fallo, y tres que se van a olvidar. Vive donde ya vivía `fechaDeJornada`.
 */
export function sumarDias(fecha: string, dias: number): string {
  const base = new Date(`${fecha}T12:00:00Z`);
  base.setUTCDate(base.getUTCDate() + dias);
  return base.toISOString().slice(0, 10);
}

/** Resta días a una fecha `YYYY-MM-DD`. Se lee mejor que `sumarDias(f, -n)`. */
export function restarDias(fecha: string, dias: number): string {
  return sumarDias(fecha, -dias);
}

/**
 * Los periodos que el panel ofrece consultar, en días **hacia atrás desde hoy**.
 *
 * El cero de `hoy` no es un descuido: el periodo incluye siempre el día de hoy,
 * así que «la última semana» son siete días contando este, no ocho. Por eso
 * `semana` es 6 y no 7.
 *
 * No se ofrece nada más largo que un mes a propósito: más allá, la pregunta ya
 * no es «cómo va la operación» sino «qué pasó tal día», y para eso está la
 * consulta por fecha.
 */
export const PERIODOS = { hoy: 0, semana: 6, mes: 29 } as const;

export type Periodo = keyof typeof PERIODOS;

/**
 * Horas que trabajó la máquina, según el horómetro y no según el reloj.
 *
 * Es la cifra que alimenta el mantenimiento preventivo. `null` mientras falte
 * una de las dos lecturas o si el final es menor que el inicial: un horómetro
 * no retrocede, y devolver un negativo sería peor que no devolver nada.
 */
export function horasDeMaquina(inicial: number | null, final: number | null): number | null {
  if (inicial == null || final == null) return null;
  if (final < inicial) return null;
  return final - inicial;
}

export type ErrorHorometros = 'falta_inicial' | 'falta_final' | 'final_menor' | 'salto_enorme';

/** Más de esto en un día es casi seguro un dedo de más al teclear. */
export const MAXIMO_HORAS_POR_DIA = 24;

/**
 * Valida el par de lecturas antes de guardar.
 *
 * El salto enorme se rechaza porque un "9840 → 98450" mete 88.610 horas de
 * golpe al vehículo y dispara todos sus mantenimientos preventivos. Es el mismo
 * riesgo que ya se cuida en el preoperacional.
 */
export function validarHorometros(
  inicial: number | null,
  final: number | null,
): ErrorHorometros | null {
  if (inicial == null) return 'falta_inicial';
  if (final == null) return 'falta_final';
  if (final < inicial) return 'final_menor';
  if (final - inicial > MAXIMO_HORAS_POR_DIA) return 'salto_enorme';
  return null;
}

export function mensajeDeHorometros(error: ErrorHorometros, inicial: number | null): string {
  switch (error) {
    case 'falta_inicial':
      return 'Falta el horómetro inicial.';
    case 'falta_final':
      return 'Falta el horómetro final.';
    case 'final_menor':
      return `El horómetro final no puede ser menor que el inicial (${inicial?.toLocaleString('es-CO')} h).`;
    case 'salto_enorme':
      return `Son más de ${MAXIMO_HORAS_POR_DIA} horas de máquina en un día. Revise las dos lecturas.`;
  }
}

export interface BitacoraEvaluable {
  operadorId: string | null;
  horometroInicial: number | null;
  horometroFinal: number | null;
  actividades: { clave: string; nombre: string }[];
}

/** Lo mínimo para que la bitácora sirva como documento. */
export function esBitacoraCompleta(bitacora: BitacoraEvaluable): boolean {
  return (
    bitacora.operadorId !== null &&
    validarHorometros(bitacora.horometroInicial, bitacora.horometroFinal) === null &&
    bitacora.actividades.length > 0
  );
}

/**
 * Las máquinas que todavía no tienen bitácora del día.
 *
 * Es lo que el jefe de operadores ve en ámbar al abrir la app. Que la lista
 * esté a la vista es más confiable que el recordatorio: en los Xiaomi y Huawei
 * de obra, la notificación puede no sonar nunca.
 */
export function maquinasSinBitacora(
  vehiculoIds: string[],
  completasPorVehiculo: Map<string, boolean>,
): string[] {
  return vehiculoIds.filter((id) => completasPorVehiculo.get(id) !== true);
}

/* ------------------------------------------------------------------------ */
/* El medidor de cada equipo (spec 004 / RF-10, RF-12, RF-43)                */
/* ------------------------------------------------------------------------ */

/**
 * No toda máquina se mide en horas.
 *
 * Las funciones de arriba nacieron cuando la bitácora era de maquinaria amarilla
 * y hablaban solo de horómetros. Desde la spec 003 la camioneta y la volqueta se
 * controlan por kilómetros, y pedirles horas de motor era pedir un dato que su
 * tablero no da: el residente acababa escribiendo cualquier cosa o dejándolo en
 * blanco. Se conservan como están —las usa la bitácora vieja del celular— y lo
 * genérico va aquí.
 */
export type ClaseDeMedidor = 'horometro' | 'odometro';

/** Lo máximo que puede avanzar un medidor en un día. Por encima es un dedazo. */
export const MAXIMO_AVANCE_POR_DIA: Record<ClaseDeMedidor, number> = {
  horometro: MAXIMO_HORAS_POR_DIA,
  // El mismo umbral que ya usa la validación del preoperacional para un salto
  // sospechoso de odómetro.
  odometro: 800,
};

export const UNIDAD_DE_MEDIDOR: Record<ClaseDeMedidor, string> = {
  horometro: 'h',
  odometro: 'km',
};

export const ETIQUETA_MEDIDOR: Record<ClaseDeMedidor, string> = {
  horometro: 'Horómetro',
  odometro: 'Odómetro',
};

/** Cuánto avanzó el medidor. `null` si falta una lectura o si retrocede. */
export function avanceDeMedidor(inicial: number | null, final: number | null): number | null {
  return horasDeMaquina(inicial, final);
}

/** Las mismas comprobaciones, con el tope que corresponde a la clase. */
export function validarAvance(
  clase: ClaseDeMedidor,
  inicial: number | null,
  final: number | null,
): ErrorHorometros | null {
  if (inicial === null) return 'falta_inicial';
  if (final === null) return 'falta_final';
  if (final < inicial) return 'final_menor';
  if (final - inicial > MAXIMO_AVANCE_POR_DIA[clase]) return 'salto_enorme';
  return null;
}

export function mensajeDeAvance(
  clase: ClaseDeMedidor,
  error: ErrorHorometros,
  inicial: number | null,
): string {
  const unidad = UNIDAD_DE_MEDIDOR[clase];
  switch (error) {
    case 'falta_inicial':
      return `Falta la lectura inicial (${unidad}).`;
    case 'falta_final':
      return `Falta la lectura final (${unidad}).`;
    case 'final_menor':
      return `La lectura final no puede ser menor que la inicial${
        inicial === null ? '' : ` (${inicial} ${unidad})`
      }.`;
    case 'salto_enorme':
      return `Son más de ${MAXIMO_AVANCE_POR_DIA[clase]} ${unidad} en un día. Revise las lecturas.`;
  }
}

/**
 * La lectura que probablemente se quiso escribir, si a una de las dos le sobra el punto
 * decimal («18740.7» por 187407) y sin él el avance cuadra; `null` si no (spec 026,
 * RF-51). Es una sugerencia para el motivo: nunca corrige la lectura.
 */
export function lecturaSugerida(
  clase: ClaseDeMedidor,
  inicial: number | null,
  final: number | null,
): number | null {
  const sinPunto = (n: number | null) =>
    n !== null && !Number.isInteger(n) ? Number(String(n).replace('.', '')) : null;
  const finalSinPunto = sinPunto(final);
  if (finalSinPunto !== null && validarAvance(clase, inicial, finalSinPunto) === null) return finalSinPunto;
  const inicialSinPunto = sinPunto(inicial);
  if (inicialSinPunto !== null && validarAvance(clase, inicialSinPunto, final) === null) return inicialSinPunto;
  return null;
}

/** La última lectura registrada de un medidor del vehículo, y de qué día es. */
export interface LecturaRegistrada {
  valor: number | null;
  /**
   * `YYYY-MM-DD`, el día de la obra del que es la lectura —el del reporte, no el de
   * cuando se procesó (026/RF-42)—; `null` si nunca se registró.
   */
  fecha: string | null;
}

/**
 * Lo que falla de una lectura final contra la registrada en Vehículos, o `null`
 * (spec 026, RF-18, RF-19). Un medidor no retrocede; y entre la lectura registrada y
 * esta no puede haber más de lo que cabe en los días que pasaron, contando al menos
 * uno. Sin lectura registrada no hay contra qué comparar: la primera vale.
 *
 * Un reporte de un día **anterior** al de la lectura registrada tampoco se compara
 * (RF-43): lo normal es que su lectura sea menor, y no va a cambiar Vehículos. Los
 * días de RF-19 se cuentan entre los días de los reportes (RF-44).
 */
export function faltaContraElVehiculo(
  clase: ClaseDeMedidor,
  final: number | null,
  registrada: LecturaRegistrada,
  fechaDelReporte: string,
): string | null {
  if (final === null || registrada.valor === null) return null;
  if (registrada.fecha && fechaDelReporte < registrada.fecha) return null;
  const unidad = UNIDAD_DE_MEDIDOR[clase];
  if (final < registrada.valor) {
    return `La lectura (${final} ${unidad}) es menor que la registrada en Vehículos (${registrada.valor} ${unidad}).`;
  }
  const dias = registrada.fecha
    ? Math.max(1, Math.round((Date.parse(fechaDelReporte) - Date.parse(registrada.fecha)) / 86_400_000))
    : 1;
  const tope = MAXIMO_AVANCE_POR_DIA[clase] * dias;
  if (final - registrada.valor > tope) {
    return `Son más de ${tope} ${unidad} desde la última lectura registrada (${registrada.valor} ${unidad}). Revise las lecturas.`;
  }
  return null;
}

/**
 * La lectura con la que empieza el día de una máquina (spec 029, RF-1 a RF-3, RF-9):
 * la final de la bitácora anterior, y si no hay, la registrada en Vehículos.
 */
export interface LecturaAnterior {
  valor: number;
  /** `YYYY-MM-DD`, el día del que es. */
  fecha: string;
  origen: 'bitacora' | 'vehiculo';
}

/**
 * Cuál de las dos lecturas anteriores vale para el día `fecha` (029/RF-1 a RF-3).
 *
 * Gana la de la bitácora: es la final que se reportó en esta obra el último día
 * que trabajó. La de Vehículos solo sirve si es de un día anterior; una del mismo
 * día o posterior no es «la de ayer», es la de hoy o la de un reporte procesado
 * después.
 */
export function lecturaAnterior(
  deBitacora: { valor: number; fecha: string } | null,
  delVehiculo: LecturaRegistrada,
  fecha: string,
): LecturaAnterior | null {
  if (deBitacora && deBitacora.fecha < fecha) return { ...deBitacora, origen: 'bitacora' };
  if (delVehiculo.valor !== null && delVehiculo.fecha && delVehiculo.fecha < fecha) {
    return { valor: delVehiculo.valor, fecha: delVehiculo.fecha, origen: 'vehiculo' };
  }
  return null;
}

const MESES_CORTOS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

/** `2026-10-18` → `18-oct`, como se escriben las fechas en la obra. */
/**
 * ¿Es una fecha `YYYY-MM-DD` que existe? `2026-02-30` no: `Date` la toma por el 2 de marzo,
 * así que se compara de vuelta. La usan Documentos (spec 034) y la ficha laboral (035).
 */
export function esFechaReal(texto: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(texto)) return false;
  const dia = new Date(`${texto}T00:00:00Z`);
  return !Number.isNaN(dia.getTime()) && dia.toISOString().startsWith(texto);
}

export function diaCorto(fecha: string): string {
  const [, mes, dia] = fecha.split('-').map(Number);
  return `${dia}-${MESES_CORTOS[mes - 1]}`;
}

/**
 * Lo que se dice junto a la lectura inicial de una máquina (029/RF-5, RF-9):
 *
 *  · `ayuda`: de dónde salió, cuando la escrita coincide con la anterior;
 *  · `aviso`: que no coincide, con el valor de ese día. Avisa y no impide.
 *
 * Sin lectura anterior o con la inicial vacía, nada.
 */
export function avisoDeLecturaInicial(
  inicial: number | null,
  anterior: LecturaAnterior | null,
): { ayuda?: string; aviso?: string } {
  if (inicial === null || !anterior) return {};
  if (inicial !== anterior.valor) {
    return {
      aviso:
        anterior.origen === 'bitacora'
          ? `No coincide con la final del día anterior (${anterior.valor}, ${diaCorto(anterior.fecha)}).`
          : `No coincide con la última lectura del vehículo (${anterior.valor}, ${diaCorto(anterior.fecha)}).`,
    };
  }
  return {
    ayuda:
      anterior.origen === 'bitacora'
        ? `Final del ${diaCorto(anterior.fecha)}`
        : `Última lectura del vehículo (${diaCorto(anterior.fecha)})`,
  };
}

/**
 * Qué medidor le corresponde a un tipo de equipo.
 *
 * `ambos` se resuelve como horómetro: hoy ningún tipo lo usa —la spec 003 pasó
 * la camioneta y la volqueta a kilometraje—, pero el enum lo admite y hay que
 * decidir algo antes que quedarse sin medidor.
 */
export function medidorDeClase(claseDelTipo: string | null | undefined): ClaseDeMedidor {
  return claseDelTipo === 'odometro' ? 'odometro' : 'horometro';
}
