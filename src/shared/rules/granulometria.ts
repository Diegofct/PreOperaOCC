/**
 * El ensayo de granulometría: lo que el sistema calcula a partir de las masas
 * (spec 018). Puro: sin I/O y sin dependencias fuera de los catálogos.
 *
 * ── Por qué aquí y no en la pantalla ──
 *
 * Lo ejecutan dos: la pantalla, para mostrar los resultados mientras el
 * laboratorista digita (RF-43), y el servidor, que los vuelve a calcular al guardar
 * y **nunca acepta porcentajes que lleguen hechos** (RF-42). Escrito una sola vez,
 * lo que se ve antes de guardar es lo que queda guardado.
 *
 * ── Las fórmulas son las del Excel ──
 *
 * Las del formato LAB-FR-01-2025, comprobadas celda por celda y verificadas con su
 * propio ejemplo (anexo C de la spec, en `scripts/verificar-reglas.ts`):
 *
 *  · % retenido = masa retenida ÷ (masa seca − tara) × 100 — contra la masa seca,
 *    no contra la suma de lo retenido: lo que se fue en el lavado es lo que pasó el
 *    N.º 200, y así queda contado en su «% pasa»;
 *  · % acumulado = suma corrida de arriba abajo;
 *  · % pasa = 100 − acumulado.
 *
 * Se calcula con precisión completa. Redondear es cosa de quien muestra (RF-55): un
 * redondeo en medio de la suma corrida arrastraría el error hasta el N.º 200.
 *
 * ── Lo que la hoja escribía a mano y aquí se calcula ──
 *
 * El tamaño máximo y el nominal (RF-49, RF-50). Escritos a mano podían contradecir
 * la tabla que tenían al lado. Las definiciones son las propuestas en la spec,
 * pendientes de que el laboratorio de OCC las confirme; con ellas, el ejemplo del
 * Excel da los mismos 2" y 1½" que traía escritos.
 *
 * ── Y lo que la hoja no hacía ──
 *
 *  · **Control de lavado** (RF-53, RF-54). La hoja pedía M2 y no la usaba: nada
 *    comprobaba que lo tamizado cuadrara con lo que se lavó. Aquí se compara y se
 *    avisa pasado el 0,3 % de la INV E-123. Avisa, no rechaza: la decisión de
 *    repetir el ensayo es del laboratorio.
 *  · **Veredicto** (RF-57 a RF-61). La hoja dibujaba la franja y no decía si el
 *    material cumplía. Se juzga cada tamiz que la franja controla **con el
 *    porcentaje redondeado a dos decimales**, el mismo que se ve: si se juzgara con
 *    el valor completo, un 69,996 se mostraría como 70,00 y saldría NO CUMPLE contra
 *    un mínimo de 70, y nadie entendería por qué.
 */
import type { EstadoEnsayo } from '@/shared/catalogos/estados-ensayo';
import { franjaPorId, type FranjaGranulometrica } from '@/shared/catalogos/franjas-granulometricas';
import {
  SERIE_DE_TAMICES,
  TAMICES_CON_ABERTURA,
  type IdTamiz,
  type IdTamizConAbertura,
} from '@/shared/catalogos/tamices';
import { formatearCantidad } from '@/shared/rules/almacen';

/** Las masas del ensayo, en gramos. `null` es «todavía no se digitó». */
export interface MasasDelEnsayo {
  humeda: number | null;
  seca: number | null;
  tara: number | null;
  /** Masa seca después del lavado (M2). La usa el control de lavado. */
  lavada: number | null;
}

/** La masa retenida en cada tamiz, por su id. Ausente o `null`: sin digitar. */
export type RetenidosDelEnsayo = Partial<Record<IdTamiz, number | null>>;

export interface EntradaGranulometria {
  masas: MasasDelEnsayo;
  retenidos: RetenidosDelEnsayo;
}

/** Un renglón de la tabla, ya calculado. */
export interface RenglonCalculado {
  tamiz: IdTamiz;
  /** Gramos. */
  retenido: number;
  porcentajeRetenido: number;
  retenidoAcumulado: number;
  /** `null` en el fondo: bajo el último tamiz no pasa nada (RF-52). */
  pasa: number | null;
}

/**
 * El tamiz más pequeño por el que pasa toda la muestra, o —si el primero de la
 * serie ya retiene— que el máximo queda por encima de él (RF-51).
 */
export type TamanoMaximo = { tamiz: IdTamizConAbertura } | { mayorQue: IdTamizConAbertura };

export type ResultadoGranulometria =
  | {
      completo: false;
      /** Qué falta, en palabras de quien lo tiene que digitar (RF-56). */
      faltan: string[];
    }
  | {
      completo: true;
      /** Porcentaje. `null` sin masa húmeda: es informativa y no frena nada. */
      humedad: number | null;
      masaSinTara: number;
      /** Los dieciséis, en el orden de la serie, fondo al final. */
      renglones: RenglonCalculado[];
      /** Gramos, fondo incluido. */
      sumaRetenida: number;
      tamanoMaximo: TamanoMaximo;
      /** `null` si ningún tamiz con abertura retiene nada: todo fue al fondo. */
      tamanoMaximoNominal: IdTamizConAbertura | null;
      /** `null` sin M2: no hay con qué comparar. */
      lavado: ControlDeLavado | null;
      /** `null` sin franja escogida. */
      veredicto: Veredicto | null;
    };

/**
 * Lo tamizado contra lo lavado (RF-53, RF-54).
 *
 * `diferencia` es M2 menos la suma retenida, fondo incluido: positiva si se perdió
 * material al tamizar, negativa si sobra. `porcentaje` es su valor absoluto sobre M2.
 */
export interface ControlDeLavado {
  diferencia: number;
  porcentaje: number;
  aviso: boolean;
}

/** El máximo que admite la INV E-123 entre lo lavado y lo tamizado, en porcentaje. */
export const TOLERANCIA_DE_LAVADO = 0.3;

export type PosicionEnFranja = 'dentro' | 'debajo' | 'encima';

/** Un tamiz controlado, juzgado contra su franja (RF-57, RF-61). */
export interface TamizJuzgado {
  tamiz: IdTamizConAbertura;
  /** El «% pasa» redondeado a dos decimales: el que se muestra y el que se juzga. */
  pasa: number;
  min: number;
  max: number;
  posicion: PosicionEnFranja;
}

export interface Veredicto {
  global: 'cumple' | 'no_cumple';
  /** Solo los tamices que la franja controla, en el orden de la serie. */
  tamices: TamizJuzgado[];
}

/**
 * Redondea como Excel: a la mitad, hacia arriba, y sobre el número que se ve.
 *
 * `Math.round(69.995 * 100) / 100` da 69,99, porque 69,995 no existe en binario y
 * multiplicar por cien no lo arregla. Excel muestra 70,00. Aquí se recorta primero a
 * quince cifras significativas —las que Excel conserva— y se desplaza la coma con la
 * notación exponencial, que no multiplica y por eso no arrastra el error.
 */
export function redondear(valor: number, decimales: number): number {
  const signo = valor < 0 ? -1 : 1;
  const limpio = Math.abs(Number(valor.toPrecision(15)));
  return signo * Number(`${Math.round(Number(`${limpio}e${decimales}`))}e-${decimales}`);
}

/** Cómo se nombra cada masa en los mensajes, en el orden del formato. */
const NOMBRE_DE_MASA: Record<keyof MasasDelEnsayo, string> = {
  humeda: 'la masa inicial húmeda',
  seca: 'la masa inicial seca',
  tara: 'la tara',
  lavada: 'la masa seca después del lavado',
};

function nombreDeRetenido(id: IdTamiz, nombre: string): string {
  return id === 'fondo' ? 'la masa retenida en el fondo' : `la masa retenida en el tamiz ${nombre}`;
}

/**
 * Todo lo que se calcula de un ensayo (RF-44 a RF-63), contra la franja escogida si
 * la hay.
 *
 * Primero se mira si hay con qué: sin masa seca, sin tara o con un tamiz sin
 * digitar no hay porcentajes ni veredicto (RF-63), y se dice qué falta en lugar de
 * dar números a medias.
 */
export function calcularGranulometria(
  entrada: EntradaGranulometria,
  franja: FranjaGranulometrica | null = null,
): ResultadoGranulometria {
  const { masas, retenidos } = entrada;

  const faltan: string[] = [];
  if (masas.seca === null) faltan.push(NOMBRE_DE_MASA.seca);
  if (masas.tara === null) faltan.push(NOMBRE_DE_MASA.tara);
  for (const tamiz of SERIE_DE_TAMICES) {
    const masa = retenidos[tamiz.id];
    if (masa === null || masa === undefined) faltan.push(nombreDeRetenido(tamiz.id, tamiz.nombre));
  }
  if (faltan.length > 0) return { completo: false, faltan };

  // Con lo de arriba ya se sabe que no son nulos; se repite para el tipo.
  const seca = masas.seca ?? 0;
  const masaSinTara = seca - (masas.tara ?? 0);
  if (masaSinTara <= 0) return { completo: false, faltan: ['una masa inicial seca mayor que la tara'] };

  // RF-44. La humedad no entra en nada más: sin masa húmeda, simplemente no hay.
  const humedad = masas.humeda === null || seca === 0 ? null : ((masas.humeda - seca) / seca) * 100;

  let acumulado = 0;
  let sumaRetenida = 0;
  const renglones: RenglonCalculado[] = SERIE_DE_TAMICES.map((tamiz) => {
    const retenido = retenidos[tamiz.id] ?? 0;
    const porcentajeRetenido = (retenido / masaSinTara) * 100;
    acumulado += porcentajeRetenido;
    sumaRetenida += retenido;
    return {
      tamiz: tamiz.id,
      retenido,
      porcentajeRetenido,
      retenidoAcumulado: acumulado,
      pasa: tamiz.id === 'fondo' ? null : 100 - acumulado,
    };
  });

  return {
    completo: true,
    humedad,
    masaSinTara,
    renglones,
    sumaRetenida,
    tamanoMaximo: tamanoMaximo(retenidos),
    tamanoMaximoNominal: tamanoMaximoNominal(retenidos),
    lavado: controlDeLavado(masas.lavada, sumaRetenida),
    veredicto: franja ? juzgar(renglones, franja) : null,
  };
}

/**
 * RF-53 y RF-54. El aviso se decide sobre el porcentaje redondeado a dos decimales
 * —el que se muestra—, por lo mismo que el veredicto: una suma de retenidos con
 * decimales puede dar 0,30000000004 y avisar de algo que en pantalla dice 0,30.
 */
function controlDeLavado(lavada: number | null, sumaRetenida: number): ControlDeLavado | null {
  if (lavada === null || lavada <= 0) return null;
  const diferencia = lavada - sumaRetenida;
  const porcentaje = (Math.abs(diferencia) / lavada) * 100;
  return { diferencia, porcentaje, aviso: redondear(porcentaje, 2) > TOLERANCIA_DE_LAVADO };
}

/**
 * El veredicto que se guarda en su columna, sacado del resultado (RF-42, RF-63).
 * `null` sin cálculo completo o sin franja: el listado no puede filtrar por un
 * CUMPLE que no existe.
 */
export function veredictoDe(resultado: ResultadoGranulometria): Veredicto['global'] | null {
  return resultado.completo && resultado.veredicto ? resultado.veredicto.global : null;
}

/** RF-57 a RF-61: cada tamiz controlado, con límites incluidos, y el global. */
function juzgar(renglones: RenglonCalculado[], franja: FranjaGranulometrica): Veredicto {
  const tamices: TamizJuzgado[] = TAMICES_CON_ABERTURA.flatMap((tamiz) => {
    const limite = franja.limites[tamiz.id];
    const pasa = renglones.find((r) => r.tamiz === tamiz.id)?.pasa;
    if (!limite || pasa === null || pasa === undefined) return [];

    const mostrado = redondear(pasa, 2);
    const posicion: PosicionEnFranja =
      mostrado < limite.min ? 'debajo' : mostrado > limite.max ? 'encima' : 'dentro';
    return [{ tamiz: tamiz.id, pasa: mostrado, min: limite.min, max: limite.max, posicion }];
  });

  return {
    global: tamices.every((t) => t.posicion === 'dentro') ? 'cumple' : 'no_cumple',
    tamices,
  };
}

/**
 * RF-49 y RF-51: el tamiz más pequeño que no tiene nada retenido ni en él ni en
 * ninguno de los de encima.
 *
 * Se decide por las **masas** y no por el «% pasa» igual a 100: con decimales, una
 * suma de porcentajes que debería dar cero puede dar 1e-15 y cambiar la respuesta.
 */
function tamanoMaximo(retenidos: RetenidosDelEnsayo): TamanoMaximo {
  let maximo: IdTamizConAbertura | null = null;
  for (const tamiz of TAMICES_CON_ABERTURA) {
    if ((retenidos[tamiz.id] ?? 0) > 0) break;
    maximo = tamiz.id;
  }
  return maximo ? { tamiz: maximo } : { mayorQue: TAMICES_CON_ABERTURA[0].id };
}

/** RF-50: el tamiz más grande que retiene material. */
function tamanoMaximoNominal(retenidos: RetenidosDelEnsayo): IdTamizConAbertura | null {
  return TAMICES_CON_ABERTURA.find((tamiz) => (retenidos[tamiz.id] ?? 0) > 0)?.id ?? null;
}

/* ── Validaciones (RF-31, RF-33 a RF-39, RF-73) ─────────────────────────── */

/** Lo que se valida de un ensayo: su encabezado, su franja y sus masas. */
export interface EnsayoAValidar extends EntradaGranulometria {
  material: string | null;
  fuente: string | null;
  localizacion: string | null;
  numeroInforme: string | null;
  /** `YYYY-MM-DD`, el día en la obra. */
  fechaRecepcion: string | null;
  fechaEjecucion: string | null;
  franjaId: string | null;
}

/**
 * Un rechazo, con el campo al que apunta.
 *
 * `campo` es la ruta que la pantalla usa para marcar la casilla: `fuente`,
 * `masas.tara`, `retenidos.n_40`, o `retenidos` a secas para la suma.
 */
export interface ErrorDeEnsayo {
  campo: string;
  mensaje: string;
}

/**
 * `borrador` guarda lo que haya (RF-31): el laboratorista recibe la muestra un día
 * y la tamiza otro, y el ensayo tiene que poder esperar a medias. Lo que sí se
 * digitó tiene que ser posible —una masa negativa no es un dato a medias, es un
 * error—. `envio` exige además todo lo obligatorio (RF-73).
 */
export type ModoDeValidacion = 'borrador' | 'envio';

const NOMBRE_DE_ENCABEZADO = {
  material: 'la descripción del material',
  fuente: 'la fuente',
  localizacion: 'la localización',
  numeroInforme: 'el número de informe',
} as const;

function conMayuscula(texto: string): string {
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}

/**
 * Gramos para leer: «6.404,8 g». Con el formateador del almacén, que es a mano y
 * no con `toLocaleString`, para que el mensaje diga lo mismo en Node, en el
 * navegador y en el servidor.
 */
function gramos(valor: number): string {
  return formatearCantidad(Math.round(redondear(valor, 2) * 100), 'g');
}

/**
 * Todos los rechazos de un ensayo, en el orden del formato: encabezado, franja,
 * masas, tamices y la suma. Vacío si se puede guardar (o enviar, según el modo).
 *
 * Se devuelven **todos** y no el primero, por lo mismo que el cierre del parte: quien
 * digita dieciséis masas no debería descubrir sus errores de uno en uno.
 *
 * `hoy` es el día en la obra (`fechaDeJornada`), no el del reloj de quien pregunta.
 * La unicidad del número de informe (RF-40) no está aquí: la decide la base.
 */
export function validarEnsayo(
  ensayo: EnsayoAValidar,
  hoy: string,
  modo: ModoDeValidacion,
): ErrorDeEnsayo[] {
  const errores: ErrorDeEnsayo[] = [];
  const exigir = modo === 'envio';
  const falta = (campo: string, nombre: string) => errores.push({ campo, mensaje: `Falta ${nombre}.` });

  for (const [campo, nombre] of Object.entries(NOMBRE_DE_ENCABEZADO) as [
    keyof typeof NOMBRE_DE_ENCABEZADO,
    string,
  ][]) {
    if (exigir && !(ensayo[campo] ?? '').trim()) falta(campo, nombre);
  }

  // RF-38 y RF-39. Un error por fecha: si es futura, que vaya o no en orden da igual.
  const { fechaRecepcion: recepcion, fechaEjecucion: ejecucion } = ensayo;
  if (recepcion === null) {
    if (exigir) falta('fechaRecepcion', 'la fecha de recepción');
  } else if (recepcion > hoy) {
    errores.push({ campo: 'fechaRecepcion', mensaje: 'La fecha de recepción no puede ser posterior a hoy.' });
  }
  if (ejecucion === null) {
    if (exigir) falta('fechaEjecucion', 'la fecha de ejecución');
  } else if (ejecucion > hoy) {
    errores.push({ campo: 'fechaEjecucion', mensaje: 'La fecha de ejecución no puede ser posterior a hoy.' });
  } else if (recepcion !== null && ejecucion < recepcion) {
    errores.push({
      campo: 'fechaEjecucion',
      mensaje: 'La fecha de ejecución no puede ser anterior a la de recepción.',
    });
  }

  if (ensayo.franjaId === null) {
    if (exigir) errores.push({ campo: 'franja', mensaje: 'Falta escoger la franja.' });
  } else if (!franjaPorId(ensayo.franjaId)) {
    errores.push({ campo: 'franja', mensaje: 'Esa franja no está en el catálogo.' });
  }

  // RF-33, masa por masa.
  const { masas } = ensayo;
  for (const [clave, nombre] of Object.entries(NOMBRE_DE_MASA) as [keyof MasasDelEnsayo, string][]) {
    const valor = masas[clave];
    if (valor === null) {
      if (exigir) falta(`masas.${clave}`, nombre);
    } else if (valor < 0) {
      errores.push({ campo: `masas.${clave}`, mensaje: `${conMayuscula(nombre)} no puede ser negativa.` });
    }
  }

  // RF-34 a RF-36: solo entre masas presentes y no negativas, para no apilar dos
  // rechazos sobre la misma casilla.
  const valida = (valor: number | null): valor is number => valor !== null && valor >= 0;
  if (valida(masas.seca) && valida(masas.humeda) && masas.seca > masas.humeda) {
    errores.push({ campo: 'masas.seca', mensaje: 'La masa inicial seca no puede ser mayor que la húmeda.' });
  }
  if (valida(masas.seca) && valida(masas.tara) && masas.tara >= masas.seca) {
    errores.push({ campo: 'masas.tara', mensaje: 'La tara tiene que ser menor que la masa inicial seca.' });
  }
  if (valida(masas.seca) && valida(masas.lavada) && masas.lavada > masas.seca) {
    errores.push({
      campo: 'masas.lavada',
      mensaje: 'La masa seca después del lavado no puede ser mayor que la masa inicial seca.',
    });
  }

  let suma = 0;
  for (const tamiz of SERIE_DE_TAMICES) {
    const valor = ensayo.retenidos[tamiz.id];
    const nombre = nombreDeRetenido(tamiz.id, tamiz.nombre);
    if (valor === null || valor === undefined) {
      if (exigir) falta(`retenidos.${tamiz.id}`, nombre);
    } else if (valor < 0) {
      errores.push({
        campo: `retenidos.${tamiz.id}`,
        mensaje: `${conMayuscula(nombre)} no puede ser negativa.`,
      });
    } else {
      suma += valor;
    }
  }

  // RF-37. Solo si la masa sin tara tiene sentido: con la tara mal, ya hay rechazo.
  if (valida(masas.seca) && valida(masas.tara) && masas.tara < masas.seca) {
    const sinTara = masas.seca - masas.tara;
    if (redondear(suma, 2) > redondear(sinTara, 2)) {
      errores.push({
        campo: 'retenidos',
        mensaje: `Lo retenido suma ${gramos(suma)} y la masa seca sin tara es ${gramos(sinTara)}: no puede ser mayor.`,
      });
    }
  }

  return errores;
}

/**
 * La forma del número de informe con que se compara (RF-40): sin mayúsculas y sin
 * espacios. «No. 6 » y «no.6» son el mismo informe; así lo escribe cada quien.
 * Las tildes y los signos se respetan: la spec no los iguala.
 */
export function claveDeInforme(numero: string): string {
  return numero.toLowerCase().replace(/\s+/g, '');
}

/* ── Estados (RF-70 a RF-93) ──────────────────────────────────────────────── */

// Los estados viven en su catálogo (ver allí por qué); se reexportan para que quien
// trabaja con la regla no tenga que saberlo.
export { ESTADOS_ENSAYO, type EstadoEnsayo } from '@/shared/catalogos/estados-ensayo';

/** Lo que se ve de un ensayo: su estado, salvo que esté anulado o descartado. */
export type EstadoVisibleEnsayo = EstadoEnsayo | 'anulado' | 'descartado';

export type AccionSobreEnsayo = 'editar' | 'enviar' | 'aprobar' | 'devolver' | 'anular' | 'descartar';

/** Cómo se nombra cada estado en pantalla, en el informe y en los rechazos. */
export const ETIQUETA_ESTADO_ENSAYO: Record<EstadoVisibleEnsayo, string> = {
  borrador: 'Borrador',
  enviado: 'Enviado',
  devuelto: 'Devuelto',
  aprobado: 'Aprobado',
  anulado: 'Anulado',
  descartado: 'Descartado',
};

export function estadoVisible(
  estado: EstadoEnsayo,
  anuladoEn: Date | string | null,
  descartadoEn: Date | string | null,
): EstadoVisibleEnsayo {
  if (anuladoEn) return 'anulado';
  if (descartadoEn) return 'descartado';
  return estado;
}

/**
 * Desde qué estado se puede cada cosa. Lo que no está escrito, no se puede.
 *
 * Quién puede —laboratorista, residente, gerencia— lo dice la tabla de permisos; esto
 * dice **cuándo**. Un aprobado solo se anula (RF-85, RF-86); un enviado no lo toca
 * nadie más que quien aprueba o devuelve (RF-76 a RF-78); lo anulado y lo descartado
 * ya no admiten nada.
 */
const DESDE: Record<AccionSobreEnsayo, readonly EstadoVisibleEnsayo[]> = {
  editar: ['borrador', 'devuelto'],
  enviar: ['borrador', 'devuelto'],
  aprobar: ['enviado'],
  devolver: ['enviado'],
  anular: ['aprobado'],
  descartar: ['borrador', 'devuelto'],
};

export function transicionPermitida(estado: EstadoVisibleEnsayo, accion: AccionSobreEnsayo): boolean {
  return DESDE[accion].includes(estado);
}

/* ── En el parte diario (RF-106 a RF-112) ───────────────────────────────── */

/**
 * Qué muestra el parte de los ensayos del módulo, como `canteraDelParte`.
 *
 * `fijados` es lo guardado en el parte al cerrarlo: `null` si nunca se fijó —abierto,
 * o cerrado antes de esta spec— y una lista, quizá vacía, si se cerró después. Esa
 * diferencia es la que evita afirmar «no hubo ensayos» de un día que nadie contó.
 * Cerrado, manda lo fijado aunque hoy haya otros ensayos de ese día (RF-112).
 */
export function granulometriasDelParte<T>(parte: {
  cerrado: boolean;
  fijados: readonly T[] | null;
  vigentes: readonly T[];
}): { estado: 'vigentes' | 'fijados' | 'antes_del_modulo'; ensayos: T[] } {
  if (!parte.cerrado) return { estado: 'vigentes', ensayos: [...parte.vigentes] };
  if (parte.fijados === null) return { estado: 'antes_del_modulo', ensayos: [] };
  return { estado: 'fijados', ensayos: [...parte.fijados] };
}

/* ── El listado (RF-103) ────────────────────────────────────────────────── */

/** `sin_veredicto`: lo que todavía no se puede juzgar (sin franja o incompleto). */
export type FiltroDeVeredicto = 'cumple' | 'no_cumple' | 'sin_veredicto';

export interface FiltrosDeEnsayos {
  material?: string | null;
  franjaId?: string | null;
  estado?: EstadoVisibleEnsayo | null;
  veredicto?: FiltroDeVeredicto | null;
}

/**
 * Los ensayos que pasan todos los filtros elegidos; un filtro vacío no filtra.
 *
 * En la pantalla, sobre lo que el servidor devolvió del periodo, como `filtrarViajes`
 * en Control Cantera: cambiar un filtro no vuelve a preguntar al servidor.
 */
export function filtrarEnsayos<
  T extends {
    material: string | null;
    franjaId: string | null;
    estado: EstadoVisibleEnsayo;
    veredicto: 'cumple' | 'no_cumple' | null;
  },
>(ensayos: readonly T[], filtros: FiltrosDeEnsayos): T[] {
  return ensayos.filter(
    (e) =>
      (!filtros.material || e.material === filtros.material) &&
      (!filtros.franjaId || e.franjaId === filtros.franjaId) &&
      (!filtros.estado || e.estado === filtros.estado) &&
      (!filtros.veredicto ||
        (filtros.veredicto === 'sin_veredicto' ? e.veredicto === null : e.veredicto === filtros.veredicto)),
  );
}

/* ── Lo que se digita y lo que se muestra (RF-25, RF-55) ────────────────── */

/**
 * Lo digitado en una casilla de masa, leído. Vacío es «sin digitar» (`null`), no
 * cero: un borrador puede quedar a medias (RF-31).
 *
 * Acepta coma o punto decimal —en Colombia se escribe «895,1», el teclado numérico da
 * «895.1»—, pero no separador de miles: «1.234,5» es ambiguo y se rechaza antes que
 * adivinarlo mal. El signo menos pasa: el rechazo de una masa negativa lo da
 * `validarEnsayo`, con su mensaje y su casilla.
 */
export function leerMasa(texto: string): { valor: number | null } | { error: string } {
  const limpio = texto.trim();
  if (limpio === '') return { valor: null };
  if (!/^-?\d+([.,]\d+)?$/.test(limpio)) return { error: 'Escriba solo el número, en gramos.' };
  return { valor: Number(limpio.replace(',', '.')) };
}

/**
 * Una cifra del ensayo para leer: «86,48». Redondea con `redondear` —el de Excel— y
 * pone la coma decimal. Toda cifra que se muestre del ensayo pasa por aquí, para que
 * la pantalla, el informe y el veredicto no difieran en el segundo decimal.
 */
export function formatearNumero(valor: number, decimales: number): string {
  return redondear(valor, decimales).toFixed(decimales).replace('.', ',');
}
