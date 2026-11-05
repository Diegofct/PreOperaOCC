/**
 * Las solicitudes de pago del grupo y sus pagos (spec 037). Reglas puras: sin I/O, como
 * todo `shared/rules`.
 *
 * El mismo patrón de Compras (spec 036): una solicitud es de un lugar —una obra, OCC o
 * Geolab—, la pide quien está allí, la aprueba la gerencia en Tesorería de Elemental y se
 * registran sus pagos, que pueden ser varios (anticipo y saldo) pero nunca de más. El
 * servidor y la pantalla usan estas mismas reglas.
 */
import { esFechaReal, fechaDeJornada } from './jornada';
import { alcanza, motivoDeRechazo, type Accion, type ModuloConPermiso, type Rol } from './permisos';
import { enPesos } from './pesos';
import { normalizar } from './texto';

/**
 * Los estados de una solicitud de pago (RF-7, RF-11, RF-12, RF-14). `abierta`: todavía
 * falta algo (RF-21); las cerradas van al final de la lista del lugar.
 */
export const ESTADOS_DE_PAGO = [
  { id: 'enviada', nombre: 'Enviada', abierta: true },
  { id: 'devuelta', nombre: 'Devuelta', abierta: true },
  { id: 'aprobada', nombre: 'Aprobada', abierta: true },
  { id: 'pagada_en_parte', nombre: 'Pagada en parte', abierta: true },
  { id: 'pagada', nombre: 'Pagada', abierta: false },
  { id: 'rechazada', nombre: 'Rechazada', abierta: false },
  { id: 'cancelada', nombre: 'Cancelada', abierta: false },
] as const;
export type EstadoDePago = (typeof ESTADOS_DE_PAGO)[number]['id'];

/** Para el enum de la base: la misma lista, sin repetirla. */
export const IDS_DE_ESTADOS_DE_PAGO = ESTADOS_DE_PAGO.map((e) => e.id) as [EstadoDePago, ...EstadoDePago[]];

export const nombreDeEstadoDePago = (id: string) => ESTADOS_DE_PAGO.find((e) => e.id === id)?.nombre ?? id;

export const pagoAbierto = (estado: EstadoDePago) => ESTADOS_DE_PAGO.find((e) => e.id === estado)?.abierta ?? false;

/** Por qué se paga (RF-6, D2). Slug estable: es lo que se guarda. */
export const CONCEPTOS_DE_PAGO = [
  { id: 'proveedor', nombre: 'Pago a proveedor o contratista' },
  { id: 'anticipo', nombre: 'Anticipo' },
  { id: 'alquiler', nombre: 'Alquiler de equipo' },
  { id: 'transporte', nombre: 'Transporte' },
  { id: 'servicios', nombre: 'Servicios' },
  { id: 'caja_menor', nombre: 'Reembolso de caja menor' },
  { id: 'viaticos', nombre: 'Viáticos' },
  { id: 'otro', nombre: 'Otro' },
] as const;
export type ConceptoDePago = (typeof CONCEPTOS_DE_PAGO)[number]['id'];

export const nombreDeConcepto = (id: string) => CONCEPTOS_DE_PAGO.find((c) => c.id === id)?.nombre ?? id;

/** Cómo se pagó (RF-13, D6). Sin la cuenta de origen del grupo. */
export const MEDIOS_DE_PAGO = [
  { id: 'transferencia', nombre: 'Transferencia' },
  { id: 'consignacion', nombre: 'Consignación' },
  { id: 'cheque', nombre: 'Cheque' },
  { id: 'efectivo', nombre: 'Efectivo' },
] as const;
export type MedioDePago = (typeof MEDIOS_DE_PAGO)[number]['id'];

export const nombreDeMedio = (id: string) => MEDIOS_DE_PAGO.find((m) => m.id === id)?.nombre ?? id;

/** El número que ve la gente (RF-7, D10): `SP-0001`, aparte de las compras (`SC-`). */
export function numeroDePago(numero: number): string {
  return `SP-${String(numero).padStart(4, '0')}`;
}

/** Lo que se escribe al pedir o al corregir un pago (RF-6). Opcional vacío: `''`. */
export interface DatosDeLaSolicitudDePago {
  beneficiario: string;
  beneficiarioDocumento: string;
  concepto: string;
  paraQue: string;
  /** Pesos, sin decimales. */
  valor: number;
  paraCuando: string;
  urgente: boolean;
}

/** Pesos enteros mayores que cero, que caben en un `bigint` sin perder precisión. */
export function pesosValidos(valor: number): boolean {
  return Number.isSafeInteger(valor) && valor > 0;
}

/** Lo que impide enviar la solicitud, campo por campo, para mostrar cada falta junto a su campo. */
export interface FaltasDelPagoPorCampo {
  beneficiario: string | null;
  concepto: string | null;
  paraQue: string | null;
  valor: string | null;
  paraCuando: string | null;
}

/**
 * Lo que impide enviar la solicitud de pago, campo por campo (RF-8). `hoy` es la fecha de
 * la jornada en Colombia, para poder probarlo.
 */
export function faltasDelPagoPorCampo(
  datos: DatosDeLaSolicitudDePago,
  hoy: string = fechaDeJornada(),
): FaltasDelPagoPorCampo {
  return {
    beneficiario: datos.beneficiario.trim() ? null : 'Diga a quién se le paga.',
    concepto: !datos.concepto
      ? 'Elija el concepto.'
      : CONCEPTOS_DE_PAGO.some((c) => c.id === datos.concepto)
        ? null
        : 'Ese concepto no existe.',
    paraQue: datos.paraQue.trim() ? null : 'Diga para qué es el pago.',
    valor: pesosValidos(datos.valor) ? null : 'El valor va en pesos, sin decimales y mayor que cero.',
    paraCuando: !esFechaReal(datos.paraCuando)
      ? 'Diga para cuándo se necesita.'
      : // Las dos son `YYYY-MM-DD`: el orden del texto es el del calendario.
        datos.paraCuando < hoy
        ? 'La fecha «para cuándo» no puede ser anterior a hoy.'
        : null,
  };
}

/**
 * Lo que impide enviar la solicitud de pago, en el orden del formulario; vacío si está
 * bien (RF-8). Es `faltasDelPagoPorCampo` en una lista, para el servidor.
 */
export function faltasDeLaSolicitudDePago(datos: DatosDeLaSolicitudDePago, hoy: string = fechaDeJornada()): string[] {
  const f = faltasDelPagoPorCampo(datos, hoy);
  return [f.beneficiario, f.concepto, f.paraQue, f.valor, f.paraCuando].filter((x): x is string => x !== null);
}

/**
 * Lo que se le puede hacer a una solicitud de pago (RF-9, RF-11 a RF-16). Corregir una
 * devuelta la vuelve a enviar.
 */
export const PASOS_DE_PAGO = [
  'corregir',
  'cancelar',
  'aprobar',
  'rechazar',
  'devolver',
  'registrar_pago',
  'anular_pago',
] as const;
export type PasoDePago = (typeof PASOS_DE_PAGO)[number];

/**
 * Desde qué estados se da cada paso. Rechazada y cancelada no admiten ninguno; una pagada
 * solo admite anular un pago (RF-16), que la devuelve a pagada en parte o a aprobada.
 */
const DESDE: Record<PasoDePago, readonly EstadoDePago[]> = {
  corregir: ['enviada', 'devuelta'],
  cancelar: ['enviada', 'devuelta'],
  aprobar: ['enviada'],
  rechazar: ['enviada', 'devuelta'],
  devolver: ['enviada'],
  registrar_pago: ['aprobada', 'pagada_en_parte'],
  anular_pago: ['pagada_en_parte', 'pagada'],
};

/**
 * Qué permiso pide cada paso. Corregir y cancelar son, además, solo de quien la pidió
 * (RF-9); lo demás, de Tesorería de Elemental (RF-5).
 */
const PERMISO: Record<PasoDePago, [ModuloConPermiso, Accion]> = {
  corregir: ['solicitudes', 'escribir'],
  cancelar: ['solicitudes', 'escribir'],
  aprobar: ['tesoreria', 'aprobar'],
  rechazar: ['tesoreria', 'aprobar'],
  devolver: ['tesoreria', 'aprobar'],
  registrar_pago: ['tesoreria', 'escribir'],
  anular_pago: ['tesoreria', 'anular'],
};

const SOLO_QUIEN_PIDIO: Partial<Record<PasoDePago, string>> = {
  corregir: 'Solo quien pidió la solicitud puede corregirla.',
  cancelar: 'Solo quien pidió la solicitud puede cancelarla.',
};

const QUE_SE_INTENTABA: Record<PasoDePago, string> = {
  corregir: 'corregir',
  cancelar: 'cancelar',
  aprobar: 'aprobar',
  rechazar: 'rechazar',
  devolver: 'devolver',
  registrar_pago: 'registrar un pago',
  anular_pago: 'anular un pago',
};

export interface SolicitudDePagoParaPaso {
  estado: EstadoDePago;
  pedidaPor: string;
}

/**
 * Por qué esta persona no puede dar este paso, o `null` si puede. 403 si no le toca a ella;
 * 409 si le toca pero la solicitud no está para eso. El lugar lo revisa el servidor aparte.
 */
export function porQueNoPuedeDarPaso(
  paso: PasoDePago,
  persona: { id: string; rol: Rol },
  solicitud: SolicitudDePagoParaPaso,
): { estado: 403 | 409; mensaje: string } | null {
  const [modulo, accion] = PERMISO[paso];
  if (!alcanza(persona.rol, modulo, accion)) return { estado: 403, mensaje: motivoDeRechazo(modulo, accion) };
  const soloQuienPidio = SOLO_QUIEN_PIDIO[paso];
  if (soloQuienPidio && solicitud.pedidaPor !== persona.id) return { estado: 403, mensaje: soloQuienPidio };
  if (!DESDE[paso].includes(solicitud.estado)) {
    const estado = nombreDeEstadoDePago(solicitud.estado).toLowerCase();
    return { estado: 409, mensaje: `Esta solicitud está ${estado}: no se puede ${QUE_SE_INTENTABA[paso]}.` };
  }
  return null;
}

/** Para la pantalla: el botón de un paso que no se puede dar no se muestra. */
export function puedeDarPaso(
  paso: PasoDePago,
  persona: { id: string; rol: Rol },
  solicitud: SolicitudDePagoParaPaso,
): boolean {
  return porQueNoPuedeDarPaso(paso, persona, solicitud) === null;
}

/** Los pasos que piden decir por qué (RF-9, RF-12, RF-16). */
const MOTIVO_QUE_FALTA: Partial<Record<PasoDePago, string>> = {
  cancelar: 'Diga por qué se cancela.',
  rechazar: 'Diga por qué se rechaza.',
  devolver: 'Diga qué debe corregirse.',
  anular_pago: 'Diga por qué se anula el pago.',
};

/** Lo que falta del motivo de un paso, o `null` si no lo pide o ya lo trae. */
export function faltaDelMotivoDePago(paso: PasoDePago, motivo: string): string | null {
  const falta = MOTIVO_QUE_FALTA[paso];
  return falta && !motivo.trim() ? falta : null;
}

/**
 * Lo que queda aprobado (RF-11): sin decir nada, lo pedido; la gerencia puede aprobar
 * menos, pero no más ni cero —para no aprobar nada, se rechaza—.
 */
export function aprobacionDelPago(
  valorPedido: number,
  valorAprobado: number | null,
): { falta: string | null; aprobado: number } {
  if (valorAprobado === null) return { falta: null, aprobado: valorPedido };
  if (!pesosValidos(valorAprobado) || valorAprobado > valorPedido) {
    return { falta: `El valor aprobado va de $ 1 a ${enPesos(valorPedido)}.`, aprobado: valorPedido };
  }
  return { falta: null, aprobado: valorAprobado };
}

/** Lo que se escribe al registrar un pago (RF-13), de una solicitud o de una compra. */
export interface DatosDelPago {
  fecha: string;
  /** Pesos, sin decimales. */
  valor: number;
  medio: string;
  referencia: string;
}

/**
 * Lo que impide registrar un pago; vacío si está bien (RF-13, RF-15). `porPagar` es lo que
 * falta: lo aprobado (o el valor de la compra) menos lo ya pagado sin anular. Nunca se paga
 * de más (D3), y el mensaje dice cuánto falta.
 */
export function faltasDelPago(datos: DatosDelPago, porPagar: number): string[] {
  const faltas: string[] = [];
  if (!esFechaReal(datos.fecha)) faltas.push('Diga la fecha del pago.');
  if (!datos.medio) faltas.push('Elija el medio de pago.');
  else if (!MEDIOS_DE_PAGO.some((m) => m.id === datos.medio)) faltas.push('Ese medio de pago no existe.');
  if (!pesosValidos(datos.valor)) faltas.push('El valor del pago va en pesos, sin decimales y mayor que cero.');
  else if (porPagar <= 0) faltas.push('Ya está pagado todo.');
  else if (datos.valor > porPagar) faltas.push(`Ese pago pasa de lo que falta: faltan ${enPesos(porPagar)}.`);
  return faltas;
}

/**
 * El estado de una solicitud aprobada después de registrar o anular un pago (RF-14, RF-16):
 * sin pagos vigentes, aprobada; con algo pagado, pagada en parte; con todo lo aprobado
 * pagado, pagada.
 */
export function estadoTrasPagos(aprobado: number, pagado: number): EstadoDePago {
  if (pagado <= 0) return 'aprobada';
  return pagado >= aprobado ? 'pagada' : 'pagada_en_parte';
}

/** Cómo va el pago de una compra de la spec 036 (RF-17, RF-19). No se guarda: sale de sus pagos. */
export type PagoDeLaCompra = 'sin_pagar' | 'en_parte' | 'pagada';

export function pagoDeLaCompra(valor: number, pagado: number): PagoDeLaCompra {
  if (pagado <= 0) return 'sin_pagar';
  return pagado >= valor ? 'pagada' : 'en_parte';
}

export const NOMBRE_DEL_PAGO_DE_LA_COMPRA: Record<PagoDeLaCompra, string> = {
  sin_pagar: 'Sin pagar',
  en_parte: 'Pagada en parte',
  pagada: 'Pagada',
};

/**
 * ¿Ve el valor de esta solicitud de pago, sus pagos y sus adjuntos? (RF-5a, D1): todos los
 * que ven solicitudes, menos el almacenista en las que no pidió él. En un pago el valor es
 * lo que se pide, así que el suyo sí lo ve.
 */
export function veElValorDelPago(rol: Rol, pedidaPor: string, yo: string): boolean {
  return rol !== 'almacenista' || pedidaPor === yo;
}

/**
 * ¿Ve la pestaña Pagos de Tesorería? (RF-23, D9): la gerencia y, desde la spec 040 (RF-6), la
 * Auxiliar Administrativa, que registra y anula pagos: sin la pestaña no tendría dónde anularlos.
 */
export function veLosPagos(rol: Rol): boolean {
  return rol === 'admin' || rol === 'auxiliar_administrativa';
}

/** Lo que hace falta de una solicitud de pago para ordenarla y marcarla en una lista. */
export interface PagoEnLista {
  numero: number;
  estado: EstadoDePago;
  urgente: boolean;
  paraCuando: string;
}

/**
 * ¿Pasó su fecha «para cuándo» sin pagarse del todo? (RF-10, RF-21). El mismo día todavía
 * no. Las cerradas no se vencen: ya se pagó, o ya no se paga.
 */
export function estaVencidoElPago(s: Pick<PagoEnLista, 'estado' | 'paraCuando'>, hoy: string = fechaDeJornada()): boolean {
  return pagoAbierto(s.estado) && s.paraCuando < hoy;
}

/** Las marcas de una solicitud de pago en la lista de su lugar (RF-21). */
export function marcasDelPago(s: Pick<PagoEnLista, 'estado' | 'paraCuando'>, hoy: string = fechaDeJornada()): string[] {
  const marcas: string[] = [];
  if (s.estado === 'devuelta') marcas.push('Devuelta: corrígela');
  if (estaVencidoElPago(s, hoy)) marcas.push('Vencida');
  return marcas;
}

/** Abiertas: urgentes arriba y luego la que se necesita antes. Cerradas: la más nueva arriba. */
function compararDentroDelGrupo(a: PagoEnLista, b: PagoEnLista): number {
  if (!pagoAbierto(a.estado)) return b.numero - a.numero;
  if (a.urgente !== b.urgente) return a.urgente ? -1 : 1;
  if (a.paraCuando !== b.paraCuando) return a.paraCuando < b.paraCuando ? -1 : 1;
  return a.numero - b.numero;
}

function ordenarPorGrupo<T extends PagoEnLista>(lista: readonly T[], grupo: (s: T) => number): T[] {
  return [...lista].sort((a, b) => grupo(a) - grupo(b) || compararDentroDelGrupo(a, b));
}

/**
 * El orden de Tesorería (RF-10): primero las que esperan aprobación, después las aprobadas
 * sin pagar del todo, al final las cerradas.
 */
export function ordenDeLaBandejaDePagos<T extends PagoEnLista>(lista: readonly T[]): T[] {
  return ordenarPorGrupo(lista, (s) => (s.estado === 'enviada' ? 0 : pagoAbierto(s.estado) ? 1 : 2));
}

/** El orden de Solicitudes de pago de un lugar (RF-21): abiertas y después cerradas. */
export function ordenDelLugarDePagos<T extends PagoEnLista>(lista: readonly T[]): T[] {
  return ordenarPorGrupo(lista, (s) => (pagoAbierto(s.estado) ? 0 : 1));
}

/**
 * Las cifras de arriba de Tesorería (RF-10): cuántas esperan aprobación, cuántas están
 * aprobadas sin pagar del todo y cuánto falta pagarles, y cuántas están vencidas.
 */
export function resumenDeLaBandejaDePagos(
  lista: readonly (PagoEnLista & { valorAprobado: number | null; pagado: number })[],
  hoy: string = fechaDeJornada(),
): { porAprobar: number; porPagar: number; valorPorPagar: number; vencidas: number } {
  const porPagar = lista.filter((s) => s.estado === 'aprobada' || s.estado === 'pagada_en_parte');
  return {
    porAprobar: lista.filter((s) => s.estado === 'enviada').length,
    porPagar: porPagar.length,
    valorPorPagar: porPagar.reduce((suma, s) => suma + Math.max((s.valorAprobado ?? 0) - s.pagado, 0), 0),
    vencidas: lista.filter((s) => estaVencidoElPago(s, hoy)).length,
  };
}

/** Lo que hace falta de una solicitud de pago para buscarla por texto (RF-22). */
export interface PagoParaBuscar {
  numero: number;
  beneficiario: string;
  beneficiarioDocumento: string;
  paraQue: string;
  pedidaPor: { nombre: string };
}

/**
 * ¿Responde a lo que se escribió? (RF-22): por número («SP-0005», «sp5», «5»), beneficiario,
 * NIT o cédula, para qué o quien la pidió, sin distinguir mayúsculas ni tildes.
 */
export function coincideElPago(s: PagoParaBuscar, texto: string): boolean {
  const buscado = normalizar(texto);
  if (!buscado) return true;
  const numero = /^(sp-?\s*)?0*(\d+)$/.exec(buscado);
  if (numero && Number(numero[2]) === s.numero) return true;
  return [numeroDePago(s.numero), s.beneficiario, s.beneficiarioDocumento, s.paraQue, s.pedidaPor.nombre].some((campo) =>
    normalizar(campo).includes(buscado),
  );
}

/** Los filtros de Tesorería (RF-3). Vacío o `null`: sin ese filtro. */
export interface FiltrosDeLaBandejaDePagos {
  /** `occ`, `geolab` o el id de una obra. */
  lugar: string | null;
  estado: EstadoDePago | null;
  soloUrgentes: boolean;
  /** El día en que se pidió, `YYYY-MM-DD`, las dos puntas incluidas. */
  desde: string | null;
  hasta: string | null;
  texto: string;
}

/** ¿Pasa los filtros de Tesorería? (RF-3, RF-22). */
export function pasaLosFiltrosDePago(
  s: PagoParaBuscar & { estado: EstadoDePago; urgente: boolean; lugar: { id: string }; pedidaEl: string },
  filtros: FiltrosDeLaBandejaDePagos,
): boolean {
  if (filtros.lugar && s.lugar.id !== filtros.lugar) return false;
  if (filtros.estado && s.estado !== filtros.estado) return false;
  if (filtros.soloUrgentes && !s.urgente) return false;
  if (filtros.desde && s.pedidaEl < filtros.desde) return false;
  if (filtros.hasta && s.pedidaEl > filtros.hasta) return false;
  return coincideElPago(s, filtros.texto);
}

/** Los campos de una solicitud de pago, en el orden del formulario, con cómo se dicen. */
const CAMPOS_DEL_PAGO = [
  ['beneficiario', 'beneficiario'],
  ['beneficiarioDocumento', 'NIT o cédula'],
  ['concepto', 'concepto'],
  ['paraQue', 'para qué'],
  ['valor', 'valor'],
  ['paraCuando', 'para cuándo'],
  ['urgente', 'urgencia'],
] as const;

/** Qué cambió al corregir una solicitud de pago (RF-9, RF-20), con cómo se dice. */
export function camposDelPagoCorregidos(antes: DatosDeLaSolicitudDePago, despues: DatosDeLaSolicitudDePago): string[] {
  return CAMPOS_DEL_PAGO.filter(([campo]) => {
    const a = antes[campo];
    const d = despues[campo];
    return (typeof a === 'string' ? a.trim() : a) !== (typeof d === 'string' ? d.trim() : d);
  }).map(([, nombre]) => nombre);
}
