/**
 * La requisición de pagos de OCC (spec 047). Reglas puras: sin I/O, como todo `shared/rules`.
 *
 * ── Por qué no es la requisición de la 046 ──
 *
 * OCC no pide gasto por gasto: arma **una planilla por viernes de entrega**, con una línea por
 * cada cosa que hay que pagar (su Excel, `assets/Formato requisiciones pagos OCC.xlsx`), y la
 * Administradora o la Gerencia autoriza **línea por línea** (D2, D3). La 046 tiene un
 * beneficiario y un valor por requisición, concepto de lista cerrada y se aprueba entera; por eso
 * esta tiene reglas propias, y solo comparte con la 037 lo de pagar (pesos enteros, pagos
 * parciales, nunca de más: D11, D12).
 *
 * ── Fechas ──
 *
 * Todas son `AAAA-MM-DD` con el calendario de Colombia (`fechaDeJornada`), así que comparar el
 * texto es comparar el calendario, como en `pagos.ts`.
 */
import { alcanzaLaEmpresa } from './empresas';
import { esFechaReal, fechaDeJornada } from './jornada';
import { faltasDelPago, pagoDeLaCompra, pesosValidos, type DatosDelPago, type PagoDeLaCompra } from './pagos';
import { alcanza, type Rol } from './permisos';

/**
 * Los estados (RF-9, RF-21, RF-29, RF-30, RF-34, RF-46, RF-47). `abierta`: cuenta para «una por
 * viernes» (RF-8, RF-9); las cerradas van al final de la lista.
 */
export const ESTADOS_DE_REQUISICION_OCC = [
  { id: 'borrador', nombre: 'Borrador', abierta: true },
  { id: 'en_autorizacion', nombre: 'En autorización', abierta: true },
  { id: 'devuelta', nombre: 'Devuelta', abierta: true },
  { id: 'autorizada', nombre: 'Autorizada', abierta: true },
  { id: 'pagada_en_parte', nombre: 'Pagada en parte', abierta: true },
  { id: 'pagada', nombre: 'Pagada', abierta: false },
  { id: 'no_autorizada', nombre: 'No autorizada', abierta: false },
  { id: 'cancelada', nombre: 'Cancelada', abierta: false },
] as const;
export type EstadoDeRequisicionOcc = (typeof ESTADOS_DE_REQUISICION_OCC)[number]['id'];

/** Para el enum de la base: la misma lista, sin repetirla. */
export const IDS_DE_ESTADOS_DE_REQUISICION_OCC = ESTADOS_DE_REQUISICION_OCC.map((e) => e.id) as [
  EstadoDeRequisicionOcc,
  ...EstadoDeRequisicionOcc[],
];

/** Los cerrados: el índice único por viernes de la base los deja fuera (RF-8, RF-82). */
export const ESTADOS_CERRADOS_OCC = ESTADOS_DE_REQUISICION_OCC.filter((e) => !e.abierta).map((e) => e.id);

export const nombreDeEstadoOcc = (id: string) => ESTADOS_DE_REQUISICION_OCC.find((e) => e.id === id)?.nombre ?? id;

export const requisicionOccAbierta = (estado: EstadoDeRequisicionOcc) =>
  ESTADOS_DE_REQUISICION_OCC.find((e) => e.id === estado)?.abierta ?? false;

/** ¿Esta fecha real cae en viernes? (RF-6). Mediodía UTC: ningún huso la cambia de día. */
export function esViernes(fecha: string): boolean {
  return esFechaReal(fecha) && new Date(`${fecha}T12:00:00Z`).getUTCDay() === 5;
}

/** Lo que impide guardar el viernes de entrega, o `null` si está bien (RF-6, RF-7). */
export function faltaDelViernes(viernes: string, hoy: string = fechaDeJornada()): string | null {
  if (!esFechaReal(viernes)) return 'Diga el viernes de entrega.';
  if (!esViernes(viernes)) return 'La fecha de entrega tiene que ser un viernes.';
  if (viernes < hoy) return 'El viernes de entrega no puede ser anterior a hoy.';
  return null;
}

/** Lo que se escribe en una línea (RF-10). Opcional vacío: `''`. El valor, nulo si no se dijo. */
export interface DatosDeLineaOcc {
  fechaSolicitud: string;
  beneficiario: string;
  concepto: string;
  especificaciones: string;
  proveedor: string;
  /** Pesos enteros (D11). */
  valor: number | null;
  observaciones: string;
}

/** Lo que impide guardar una línea, campo por campo, para mostrarlo junto a su campo (RF-12 a RF-14). */
export interface FaltasDeLineaOcc {
  fechaSolicitud: string | null;
  beneficiario: string | null;
  concepto: string | null;
  valor: string | null;
}

export function faltasDeLaLineaPorCampo(datos: DatosDeLineaOcc, hoy: string = fechaDeJornada()): FaltasDeLineaOcc {
  return {
    fechaSolicitud: !esFechaReal(datos.fechaSolicitud)
      ? 'falta la fecha de solicitud'
      : datos.fechaSolicitud > hoy
        ? 'la fecha de solicitud no puede ser posterior a hoy'
        : null,
    beneficiario: datos.beneficiario.trim() ? null : 'falta el beneficiario',
    concepto: datos.concepto.trim() ? null : 'falta el concepto',
    valor:
      datos.valor === null
        ? 'falta el valor'
        : pesosValidos(datos.valor)
          ? null
          : 'el valor va en pesos, sin centavos y mayor que cero',
  };
}

/** Las faltas de una línea en el orden de la planilla; vacío si está bien. */
export function faltasDeLaLineaOcc(datos: DatosDeLineaOcc, hoy: string = fechaDeJornada()): string[] {
  const f = faltasDeLaLineaPorCampo(datos, hoy);
  return [f.fechaSolicitud, f.beneficiario, f.concepto, f.valor].filter((x): x is string => x !== null);
}

/**
 * Las faltas de todas las líneas, cada una con su número (RF-11, RF-12): «Línea 3: falta el
 * beneficiario.». El número es la posición entre las vigentes, empezando en 1.
 */
export function faltasDeLasLineasOcc(lineas: readonly DatosDeLineaOcc[], hoy: string = fechaDeJornada()): string[] {
  return lineas.flatMap((linea, i) => faltasDeLaLineaOcc(linea, hoy).map((falta) => `Línea ${i + 1}: ${falta}.`));
}

/**
 * Lo que impide enviar la requisición, o vacío (RF-12, RF-13, RF-22). Revisa todo de nuevo: una
 * línea guardada ayer con la fecha de hoy sigue valiendo, pero el servidor no confía en lo guardado.
 */
export function faltasParaEnviarOcc(lineasVigentes: readonly DatosDeLineaOcc[], hoy: string = fechaDeJornada()): string[] {
  if (lineasVigentes.length === 0) return ['Agregue al menos una línea antes de enviar.'];
  return faltasDeLasLineasOcc(lineasVigentes, hoy);
}

/* ── Quién actúa y en qué estado (T2) ── */

/**
 * Lo que se le hace a una requisición de pagos OCC. `armar` es agregar, cambiar o quitar líneas e
 * importar (RF-19, RF-36, RF-59); `pagar` y `anular_pago` son por línea, en Tesorería.
 */
export type AccionOcc = 'armar' | 'enviar' | 'cancelar' | 'responder' | 'devolver' | 'pagar' | 'anular_pago';

/** Lo que hace falta saber de la requisición para decidir. */
export interface RequisicionOccParaActuar {
  estado: EstadoDeRequisicionOcc;
  elaboradaPor: string;
  /** ¿Alguna línea tiene un pago sin anular? (RF-25). */
  tienePagos: boolean;
}

export interface NoPuedeOcc {
  estado: 403 | 409;
  mensaje: string;
}

/**
 * Crean y arman quienes piden en OCC: el Encargado de OCC y la Gerencia (RF-4). Pedir es
 * `solicitudes·escribir`, y además entrar a OCC: un Residente pide en su obra, no en OCC.
 */
export function puedeCrearRequisicionOcc(rol: Rol): boolean {
  return alcanza(rol, 'solicitudes', 'escribir') && alcanzaLaEmpresa(rol, 'occ');
}

/** Autorizan, no autorizan y devuelven la Administradora de Elemental y la Gerencia (D3, RF-26, RF-34). */
const autoriza = (rol: Rol) => alcanza(rol, 'aprobaciones', 'aprobar');

/** Cancelan cualquiera sin pagos la Administradora y la Gerencia (RF-25). */
const cancelaCualquiera = (rol: Rol) => rol === 'admin' || rol === 'administradora_elemental';

const QUE_SE_INTENTABA: Record<AccionOcc, string> = {
  armar: 'cambiar sus líneas',
  enviar: 'enviar',
  cancelar: 'cancelar',
  responder: 'autorizar sus líneas',
  devolver: 'devolver',
  pagar: 'pagar',
  anular_pago: 'anular sus pagos',
};

function enEstado(req: RequisicionOccParaActuar, accion: AccionOcc): NoPuedeOcc {
  return {
    estado: 409,
    mensaje: `Esta requisición está ${nombreDeEstadoOcc(req.estado).toLowerCase()}: no se puede ${QUE_SE_INTENTABA[accion]}.`,
  };
}

const noLeToca = (mensaje: string): NoPuedeOcc => ({ estado: 403, mensaje });

/**
 * Por qué esta persona no puede hacer esto, o `null` si puede (RF-19 a RF-38, RF-44, RF-48, RF-74).
 * 403 si no le toca a ella; 409 si le toca pero la requisición no está para eso. Que sea de OCC y que
 * la persona entre a OCC lo revisa el servidor aparte, como en todo el panel.
 */
export function porQueNoPuedeOcc(rol: Rol, yo: string, accion: AccionOcc, req: RequisicionOccParaActuar): NoPuedeOcc | null {
  const laElaboro = req.elaboradaPor === yo;
  switch (accion) {
    case 'armar':
      // RF-19: en Borrador, quien la elaboró o la Gerencia; RF-36: Devuelta, quien la elaboró.
      if (!puedeCrearRequisicionOcc(rol) || (!laElaboro && rol !== 'admin')) {
        return noLeToca('Solo quien la elaboró, o la Gerencia, cambia las líneas.');
      }
      if (req.estado === 'borrador') return null;
      if (req.estado === 'devuelta') return laElaboro ? null : noLeToca('Una devuelta la corrige quien la elaboró.');
      return enEstado(req, accion);
    case 'enviar':
      if (!laElaboro) return noLeToca('La envía quien la elaboró.');
      return req.estado === 'borrador' || req.estado === 'devuelta' ? null : enEstado(req, accion);
    case 'cancelar':
      if (!requisicionOccAbierta(req.estado)) return enEstado(req, accion);
      if (cancelaCualquiera(rol)) {
        return req.tienePagos ? { estado: 409, mensaje: 'Tiene pagos registrados: anúlelos antes de cancelarla.' } : null;
      }
      // RF-24: quien la elaboró, antes de que se autorice.
      if (!laElaboro) return noLeToca('La cancela quien la elaboró, la Administradora o la Gerencia.');
      return req.estado === 'borrador' || req.estado === 'en_autorizacion' || req.estado === 'devuelta'
        ? null
        : enEstado(req, accion);
    case 'responder':
      if (!autoriza(rol)) return noLeToca('Autorizan la Administradora de Elemental o la Gerencia.');
      // RF-32: nadie se autoriza a sí mismo (D12 de la 046).
      if (laElaboro) return noLeToca('Usted la elaboró: la autoriza otra persona.');
      return req.estado === 'en_autorizacion' ? null : enEstado(req, accion);
    case 'devolver':
      if (!autoriza(rol)) return noLeToca('Devuelven la Administradora de Elemental o la Gerencia.');
      return req.estado === 'en_autorizacion' ? null : enEstado(req, accion);
    case 'pagar':
      if (!alcanza(rol, 'tesoreria', 'escribir')) return noLeToca('Registran pagos la Auxiliar Administrativa, la Administradora o la Gerencia.');
      return req.estado === 'autorizada' || req.estado === 'pagada_en_parte' ? null : enEstado(req, accion);
    case 'anular_pago':
      return alcanza(rol, 'tesoreria', 'anular') ? null : noLeToca('Anulan pagos la Administradora de Elemental o la Gerencia.');
  }
}

/** La respuesta de una línea (RF-26). Nula mientras espera. */
export type RespuestaDeLineaOcc = 'autorizada' | 'no_autorizada';

/** Lo que impide guardar una respuesta, o `null` (RF-27, RF-77, D10). */
export function faltaDeLaRespuestaOcc(respuesta: RespuestaDeLineaOcc, motivo: string): string | null {
  return respuesta === 'no_autorizada' && !motivo.trim() ? 'Diga por qué no se autoriza.' : null;
}

/**
 * El estado tras guardar respuestas, con las de todas las líneas vigentes (RF-28 a RF-30): con
 * alguna sin respuesta sigue en autorización; si no, autorizada si hay al menos una autorizada.
 */
export function estadoTrasResponderOcc(respuestas: readonly (RespuestaDeLineaOcc | null)[]): EstadoDeRequisicionOcc {
  if (respuestas.length === 0 || respuestas.some((r) => r === null)) return 'en_autorizacion';
  return respuestas.includes('autorizada') ? 'autorizada' : 'no_autorizada';
}

/** Cuántas líneas faltan por responder (RF-42). */
export const faltanPorResponderOcc = (respuestas: readonly (RespuestaDeLineaOcc | null)[]) =>
  respuestas.filter((r) => r === null).length;

/* ── Totales, pagos, vencida y bandeja (T3) ── */

/** Lo que hace falta de una línea vigente para sumar y pagar. `pagado`: sus pagos sin anular. */
export interface LineaOccParaPagar {
  valor: number;
  respuesta: RespuestaDeLineaOcc | null;
  pagado: number;
}

const suma = (valores: readonly number[]) => valores.reduce((a, b) => a + b, 0);

/** El total pedido: todas las líneas vigentes (RF-40). */
export const totalPedidoOcc = (lineas: readonly Pick<LineaOccParaPagar, 'valor'>[]) => suma(lineas.map((l) => l.valor));

/** El total a pagar: solo las autorizadas (RF-41, D6). */
export const totalAPagarOcc = (lineas: readonly Pick<LineaOccParaPagar, 'valor' | 'respuesta'>[]) =>
  suma(lineas.filter((l) => l.respuesta === 'autorizada').map((l) => l.valor));

/** Lo que le falta por pagar a una línea; nunca negativo. */
export const porPagarDeLaLineaOcc = (linea: Pick<LineaOccParaPagar, 'valor' | 'pagado'>) => Math.max(0, linea.valor - linea.pagado);

/** Cómo va el pago de una línea autorizada (RF-81): sale de sus pagos, no se guarda. */
export function pagoDeLaLineaOcc(linea: Pick<LineaOccParaPagar, 'valor' | 'pagado'>): PagoDeLaCompra {
  return pagoDeLaCompra(linea.valor, linea.pagado);
}

/**
 * Lo que impide registrar un pago de una línea; vacío si está bien (RF-44, RF-45, RF-80). Las reglas
 * del pago son las de la 037 (`faltasDelPago`): fecha, medio, pesos enteros, nunca de más.
 */
export function faltasDelPagoDeLineaOcc(datos: DatosDelPago, linea: LineaOccParaPagar): string[] {
  if (linea.respuesta !== 'autorizada') return ['Esta línea no está autorizada: no se paga.'];
  return faltasDelPago(datos, porPagarDeLaLineaOcc(linea));
}

/**
 * El estado de una requisición autorizada tras registrar o anular un pago (RF-46 a RF-48): sin nada
 * pagado, autorizada; con todas las autorizadas pagadas del todo, pagada; si no, pagada en parte.
 */
export function estadoTrasPagosOcc(lineas: readonly LineaOccParaPagar[]): EstadoDeRequisicionOcc {
  const autorizadas = lineas.filter((l) => l.respuesta === 'autorizada');
  if (suma(autorizadas.map((l) => l.pagado)) <= 0) return 'autorizada';
  return autorizadas.every((l) => l.pagado >= l.valor) ? 'pagada' : 'pagada_en_parte';
}

/** Vencida: su viernes ya pasó y sigue abierta (RF-51). */
export function estaVencidaOcc(req: { estado: EstadoDeRequisicionOcc; viernes: string }, hoy: string = fechaDeJornada()): boolean {
  return requisicionOccAbierta(req.estado) && req.viernes < hoy;
}

/** La bandeja de Elemental: el viernes más cercano primero, y a igual viernes, el número (RF-50). */
export function ordenDeLaBandejaOcc<T extends { viernes: string; numero: number }>(lista: readonly T[]): T[] {
  return [...lista].sort((a, b) => a.viernes.localeCompare(b.viernes) || a.numero - b.numero);
}

/** El número que se ve: el RQ de la secuencia de la 046 (RF-2). */
export const numeroDeRequisicionOcc = (numero: number) => `RQ-${String(numero).padStart(4, '0')}`;

/**
 * ¿Ve las requisiciones de pagos OCC, con sus líneas y sus archivos? (RF-73). Quien ve Requisiciones
 * en OCC —el Encargado de OCC, la Administradora y la Gerencia— y quien paga en Tesorería: la
 * Auxiliar necesita el RUT y la cuenta de lo que va a pagar.
 */
export function veRequisicionesOcc(rol: Rol): boolean {
  return (alcanzaLaEmpresa(rol, 'occ') && alcanza(rol, 'solicitudes', 'ver')) || alcanza(rol, 'tesoreria', 'ver');
}
