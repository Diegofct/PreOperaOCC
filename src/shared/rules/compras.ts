/**
 * Las solicitudes de compra del grupo (spec 036). Reglas puras: sin I/O, como todo
 * `shared/rules`.
 *
 * Una solicitud es de un lugar —una obra, OCC o Geolab—, no de quien la pide: la pide quien
 * está allí, la aprueba la gerencia en Compras de Elemental, se registra la compra y se
 * marca lo que llega. El servidor y la pantalla usan estas mismas reglas.
 */
import { esFechaReal, fechaDeJornada } from './jornada';
import { alcanza, motivoDeRechazo, type Accion, type ModuloConPermiso, type Rol } from './permisos';
import { normalizar } from './texto';

/**
 * Los estados de una solicitud (RF-8, RF-13 a RF-16, RF-21). `abierta`: todavía falta algo
 * (RF-24); las cerradas van al final de la lista del lugar.
 */
export const ESTADOS_DE_SOLICITUD = [
  { id: 'enviada', nombre: 'Enviada', abierta: true },
  { id: 'devuelta', nombre: 'Devuelta', abierta: true },
  { id: 'aprobada', nombre: 'Aprobada', abierta: true },
  { id: 'comprada', nombre: 'Comprada', abierta: true },
  { id: 'recibida_en_parte', nombre: 'Recibida en parte', abierta: true },
  { id: 'recibida', nombre: 'Recibida', abierta: false },
  { id: 'rechazada', nombre: 'Rechazada', abierta: false },
  { id: 'cancelada', nombre: 'Cancelada', abierta: false },
] as const;
export type EstadoDeSolicitud = (typeof ESTADOS_DE_SOLICITUD)[number]['id'];

/** Para el enum de la base: la misma lista, sin repetirla. */
export const IDS_DE_ESTADOS_DE_SOLICITUD = ESTADOS_DE_SOLICITUD.map((e) => e.id) as [
  EstadoDeSolicitud,
  ...EstadoDeSolicitud[],
];

export const nombreDeEstadoDeSolicitud = (id: string) => ESTADOS_DE_SOLICITUD.find((e) => e.id === id)?.nombre ?? id;

export const solicitudAbierta = (estado: EstadoDeSolicitud) =>
  ESTADOS_DE_SOLICITUD.find((e) => e.id === estado)?.abierta ?? false;

/** El número que ve la gente (RF-8): `SC-0001`. Pasado de 9999 sigue creciendo. */
export function numeroDeSolicitud(numero: number): string {
  return `SC-${String(numero).padStart(4, '0')}`;
}

/** Un renglón de la solicitud (RF-7). `materialId`: si salió del catálogo del Almacén. */
export interface RenglonPedido {
  descripcion: string;
  cantidad: number;
  unidad: string;
  materialId: string | null;
}

/** Lo que se escribe al pedir o al corregir (RF-7). Opcional vacío: `''` o `null`. */
export interface DatosDeLaSolicitud {
  renglones: RenglonPedido[];
  paraCuando: string;
  urgente: boolean;
  paraQue: string;
  proveedorSugerido: string;
  /** Pesos, sin decimales. */
  valorEstimado: number | null;
}

/** La cantidad cabe en `numeric(14,2)`: mayor que cero y con dos decimales a lo más. */
function cantidadValida(cantidad: number): boolean {
  return (
    Number.isFinite(cantidad) &&
    cantidad > 0 &&
    cantidad < 1e12 &&
    Math.abs(cantidad * 100 - Math.round(cantidad * 100)) < 1e-6
  );
}

/** Lo que impide enviar la solicitud, campo por campo, para mostrar cada falta junto a su campo. */
export interface FaltasPorCampo {
  /** Sin renglones. */
  renglones: string | null;
  /** Las de cada renglón, en su posición. */
  porRenglon: { descripcion: string | null; cantidad: string | null; unidad: string | null }[];
  paraCuando: string | null;
  valorEstimado: string | null;
}

/**
 * Lo que impide enviar la solicitud, campo por campo (RF-9, RF-10). `hoy` es la fecha de la
 * jornada en Colombia, para poder probarlo.
 */
export function faltasPorCampo(datos: DatosDeLaSolicitud, hoy: string = fechaDeJornada()): FaltasPorCampo {
  return {
    renglones: datos.renglones.length === 0 ? 'Agregue al menos un renglón con lo que se necesita.' : null,
    porRenglon: datos.renglones.map((renglon, i) => {
      const n = i + 1;
      return {
        descripcion: renglon.descripcion.trim() ? null : `El renglón ${n} no dice qué se necesita.`,
        cantidad: cantidadValida(renglon.cantidad)
          ? null
          : `La cantidad del renglón ${n} debe ser mayor que cero, con dos decimales a lo más.`,
        unidad: renglon.unidad.trim() ? null : `El renglón ${n} no tiene unidad.`,
      };
    }),
    paraCuando: !esFechaReal(datos.paraCuando)
      ? 'Diga para cuándo se necesita.'
      : // Las dos son `YYYY-MM-DD`: el orden del texto es el del calendario.
        datos.paraCuando < hoy
        ? 'La fecha «para cuándo» no puede ser anterior a hoy.'
        : null,
    valorEstimado:
      datos.valorEstimado !== null && !(Number.isInteger(datos.valorEstimado) && datos.valorEstimado > 0)
        ? 'El valor estimado va en pesos, sin decimales y mayor que cero.'
        : null,
  };
}

/**
 * Lo que impide enviar la solicitud, en el orden del formulario; vacío si está bien (RF-9,
 * RF-10). Es `faltasPorCampo` en una lista, para el servidor.
 */
export function faltasDeLaSolicitud(datos: DatosDeLaSolicitud, hoy: string = fechaDeJornada()): string[] {
  const f = faltasPorCampo(datos, hoy);
  return [
    f.renglones,
    ...f.porRenglon.flatMap((r) => [r.descripcion, r.cantidad, r.unidad]),
    f.paraCuando,
    f.valorEstimado,
  ].filter((x): x is string => x !== null);
}

/**
 * Lo que se le puede hacer a una solicitud (RF-11, RF-13 a RF-16, RF-20; anular una compra,
 * RF-30). Corregir una devuelta la vuelve a enviar.
 */
export const PASOS_DE_SOLICITUD = [
  'corregir',
  'cancelar',
  'aprobar',
  'rechazar',
  'devolver',
  'registrar_compra',
  'anular_compra',
  'recibir',
] as const;
export type PasoDeSolicitud = (typeof PASOS_DE_SOLICITUD)[number];

/**
 * Desde qué estados se da cada paso. Las cerradas (recibida, rechazada, cancelada) no
 * admiten ninguno. Comprar sigue abierto en `recibida_en_parte`: con dos proveedores, lo del
 * primero puede llegar antes de comprarle al segundo (RF-19).
 */
const DESDE: Record<PasoDeSolicitud, readonly EstadoDeSolicitud[]> = {
  corregir: ['enviada', 'devuelta'],
  cancelar: ['enviada', 'devuelta'],
  aprobar: ['enviada'],
  rechazar: ['enviada', 'devuelta'],
  devolver: ['enviada'],
  registrar_compra: ['aprobada', 'recibida_en_parte'],
  anular_compra: ['aprobada', 'comprada', 'recibida_en_parte'],
  recibir: ['aprobada', 'comprada', 'recibida_en_parte'],
};

/** Los pasos que no se dan sin una compra vigente: no hay qué anular ni qué recibir. */
const PIDEN_COMPRA: readonly PasoDeSolicitud[] = ['anular_compra', 'recibir'];

/**
 * Qué permiso pide cada paso. Corregir y cancelar, además, son solo de quien la pidió
 * (RF-11); aprobar, rechazar, devolver y comprar, de Compras de Elemental (RF-5).
 */
const PERMISO: Record<PasoDeSolicitud, [ModuloConPermiso, Accion]> = {
  corregir: ['solicitudes', 'escribir'],
  cancelar: ['solicitudes', 'escribir'],
  aprobar: ['compras', 'aprobar'],
  rechazar: ['compras', 'aprobar'],
  devolver: ['compras', 'aprobar'],
  registrar_compra: ['compras', 'escribir'],
  anular_compra: ['compras', 'anular'],
  recibir: ['solicitudes', 'escribir'],
};

const SOLO_QUIEN_PIDIO: Partial<Record<PasoDeSolicitud, string>> = {
  corregir: 'Solo quien pidió la solicitud puede corregirla.',
  cancelar: 'Solo quien pidió la solicitud puede cancelarla.',
};

/** Cómo se dice cada paso después de «no se puede». */
const QUE_SE_INTENTABA: Record<PasoDeSolicitud, string> = {
  corregir: 'corregir',
  cancelar: 'cancelar',
  aprobar: 'aprobar',
  rechazar: 'rechazar',
  devolver: 'devolver',
  registrar_compra: 'registrar una compra',
  anular_compra: 'anular una compra',
  recibir: 'recibir',
};

export interface PersonaQueDaElPaso {
  id: string;
  rol: Rol;
}

export interface SolicitudParaPaso {
  estado: EstadoDeSolicitud;
  pedidaPor: string;
  /** ¿Tiene alguna compra sin anular? */
  tieneCompraVigente: boolean;
}

/**
 * Por qué esta persona no puede dar este paso, o `null` si puede. 403 si no le toca a ella;
 * 409 si le toca pero la solicitud no está para eso. El lugar —que la solicitud sea de una
 * obra o empresa a la que entra— lo revisa el servidor aparte, como en todo el panel.
 */
export function porQueNoPuedeDar(
  paso: PasoDeSolicitud,
  persona: PersonaQueDaElPaso,
  solicitud: SolicitudParaPaso,
): { estado: 403 | 409; mensaje: string } | null {
  const [modulo, accion] = PERMISO[paso];
  if (!alcanza(persona.rol, modulo, accion)) return { estado: 403, mensaje: motivoDeRechazo(modulo, accion) };
  const soloQuienPidio = SOLO_QUIEN_PIDIO[paso];
  if (soloQuienPidio && solicitud.pedidaPor !== persona.id) return { estado: 403, mensaje: soloQuienPidio };
  if (!DESDE[paso].includes(solicitud.estado)) {
    const estado = nombreDeEstadoDeSolicitud(solicitud.estado).toLowerCase();
    return { estado: 409, mensaje: `Esta solicitud está ${estado}: no se puede ${QUE_SE_INTENTABA[paso]}.` };
  }
  if (PIDEN_COMPRA.includes(paso) && !solicitud.tieneCompraVigente) {
    return { estado: 409, mensaje: 'Esta solicitud no tiene compras registradas.' };
  }
  return null;
}

/** Para la pantalla: el botón de un paso que no se puede dar no se muestra. */
export function puedeDar(paso: PasoDeSolicitud, persona: PersonaQueDaElPaso, solicitud: SolicitudParaPaso): boolean {
  return porQueNoPuedeDar(paso, persona, solicitud) === null;
}

/** Lo que se escribe al registrar una compra (RF-16). `renglonIds`: los renglones que cubre. */
export interface DatosDeLaCompra {
  proveedor: string;
  /** Pesos, sin decimales. */
  valor: number;
  fecha: string;
  factura: string;
  renglonIds: string[];
}

/** Un renglón de la solicitud, visto desde la compra que se quiere registrar. */
export interface RenglonParaCompra {
  id: string;
  /** El número que ve la gente: 1, 2, 3… */
  orden: number;
  /** `null` mientras no se aprueba; 0 si la gerencia lo quitó al aprobar (RF-13). */
  cantidadAprobada: number | null;
  /** ¿Ya está en una compra sin anular? Un renglón va en una sola compra vigente. */
  enCompraVigente: boolean;
}

/**
 * Lo que impide registrar la compra; vacío si está bien (RF-16, RF-18, RF-19). Una compra
 * cubre renglones aprobados y libres de la misma solicitud: así caben dos proveedores sin
 * repartir un renglón entre los dos.
 */
export function faltasDeLaCompra(datos: DatosDeLaCompra, renglones: readonly RenglonParaCompra[]): string[] {
  const faltas: string[] = [];
  if (!datos.proveedor.trim()) faltas.push('Diga a qué proveedor se le compró.');
  if (!(Number.isInteger(datos.valor) && datos.valor > 0)) {
    faltas.push('El valor de la compra va en pesos, sin decimales y mayor que cero.');
  }
  if (!esFechaReal(datos.fecha)) faltas.push('Diga la fecha de la compra.');
  const elegidos = [...new Set(datos.renglonIds)];
  if (elegidos.length === 0) faltas.push('Elija qué renglones cubre esta compra.');
  for (const id of elegidos) {
    const renglon = renglones.find((r) => r.id === id);
    if (!renglon) faltas.push('Uno de los renglones elegidos no es de esta solicitud.');
    else if (!renglon.cantidadAprobada) faltas.push(`El renglón ${renglon.orden} no quedó aprobado.`);
    else if (renglon.enCompraVigente) faltas.push(`El renglón ${renglon.orden} ya está en otra compra.`);
  }
  return faltas;
}

/** Un renglón con lo que ya pasó después de aprobar la solicitud. */
export interface RenglonComprado {
  cantidadAprobada: number | null;
  enCompraVigente: boolean;
  /** La suma de lo recibido; puede pasar de lo aprobado (caso límite). */
  recibido: number;
}

/**
 * El estado de una solicitud aprobada después de registrar o anular una compra o de recibir
 * (RF-19, RF-21). Solo cuentan los renglones aprobados: uno que la gerencia quitó no se
 * compra ni se espera.
 *
 * - todo lo aprobado llegó completo → recibida;
 * - llegó algo → recibida en parte;
 * - todo lo aprobado tiene compra → comprada;
 * - si no, sigue aprobada (también al anular la única compra).
 */
export function estadoTrasComprasYRecibos(renglones: readonly RenglonComprado[]): EstadoDeSolicitud {
  const aprobados = renglones.filter((r) => (r.cantidadAprobada ?? 0) > 0);
  if (aprobados.length === 0) return 'aprobada';
  if (aprobados.every((r) => r.recibido >= (r.cantidadAprobada ?? 0))) return 'recibida';
  if (aprobados.some((r) => r.recibido > 0)) return 'recibida_en_parte';
  if (aprobados.every((r) => r.enCompraVigente)) return 'comprada';
  return 'aprobada';
}

/**
 * ¿Este rol ve los valores de compra? (RF-31): el valor estimado, el de cada compra y los
 * adjuntos con precio. Todos los que ven solicitudes menos el almacenista (D7).
 */
export function veLosValores(rol: Rol): boolean {
  return rol !== 'almacenista';
}

/** Lo que hace falta de una solicitud para ordenarla y marcarla en una lista. */
export interface SolicitudEnLista {
  numero: number;
  estado: EstadoDeSolicitud;
  urgente: boolean;
  paraCuando: string;
}

/**
 * ¿Pasó su fecha «para cuándo» sin recibirse? (RF-12, RF-25). El mismo día todavía no: se
 * vence al día siguiente. Las cerradas no se vencen: ya llegó, o ya no se espera.
 */
export function estaVencida(solicitud: Pick<SolicitudEnLista, 'estado' | 'paraCuando'>, hoy: string = fechaDeJornada()): boolean {
  // Las dos son `YYYY-MM-DD`: el orden del texto es el del calendario.
  return solicitudAbierta(solicitud.estado) && solicitud.paraCuando < hoy;
}

/** Las marcas de una solicitud en la lista de su lugar (RF-25). */
export function marcasDeLaSolicitud(
  solicitud: Pick<SolicitudEnLista, 'estado' | 'paraCuando'>,
  hoy: string = fechaDeJornada(),
): string[] {
  const marcas: string[] = [];
  if (solicitud.estado === 'devuelta') marcas.push('Devuelta: corrígela');
  if (estaVencida(solicitud, hoy)) marcas.push('Vencida');
  return marcas;
}

/**
 * Abiertas: las urgentes arriba y luego la que se necesita antes. Cerradas: la más nueva
 * arriba, que es la que alguien viene a buscar. El número desempata siempre, para que la
 * lista no baile entre una carga y otra.
 */
function compararDentroDelGrupo(a: SolicitudEnLista, b: SolicitudEnLista): number {
  if (!solicitudAbierta(a.estado)) return b.numero - a.numero;
  if (a.urgente !== b.urgente) return a.urgente ? -1 : 1;
  if (a.paraCuando !== b.paraCuando) return a.paraCuando < b.paraCuando ? -1 : 1;
  return a.numero - b.numero;
}

function ordenarPorGrupo<T extends SolicitudEnLista>(lista: readonly T[], grupo: (s: T) => number): T[] {
  return [...lista].sort((a, b) => grupo(a) - grupo(b) || compararDentroDelGrupo(a, b));
}

/**
 * El orden de Compras de Elemental (RF-12): primero las que esperan aprobación, después las
 * demás abiertas y al final las cerradas.
 */
export function ordenDeLaBandeja<T extends SolicitudEnLista>(lista: readonly T[]): T[] {
  return ordenarPorGrupo(lista, (s) => (s.estado === 'enviada' ? 0 : solicitudAbierta(s.estado) ? 1 : 2));
}

/** El orden de Solicitudes de compra de un lugar (RF-24): abiertas y después cerradas. */
export function ordenDelLugar<T extends SolicitudEnLista>(lista: readonly T[]): T[] {
  return ordenarPorGrupo(lista, (s) => (solicitudAbierta(s.estado) ? 0 : 1));
}

/**
 * Las cifras de arriba de la bandeja (RF-12). «Urgentes» cuenta las abiertas: una urgente
 * aprobada todavía espera que la gerencia la compre.
 */
export function resumenDeLaBandeja(
  lista: readonly SolicitudEnLista[],
  hoy: string = fechaDeJornada(),
): { porAprobar: number; urgentes: number; vencidas: number } {
  return {
    porAprobar: lista.filter((s) => s.estado === 'enviada').length,
    urgentes: lista.filter((s) => s.urgente && solicitudAbierta(s.estado)).length,
    vencidas: lista.filter((s) => estaVencida(s, hoy)).length,
  };
}

/** Los pasos que piden decir por qué (RF-11, RF-14, RF-15; anular una compra, RF-30). */
const MOTIVO_QUE_FALTA: Partial<Record<PasoDeSolicitud, string>> = {
  cancelar: 'Diga por qué se cancela.',
  rechazar: 'Diga por qué se rechaza.',
  devolver: 'Diga qué debe corregirse.',
  anular_compra: 'Diga por qué se anula la compra.',
};

/** Lo que falta del motivo de un paso, o `null` si no lo pide o ya lo trae. */
export function faltaDelMotivo(paso: PasoDeSolicitud, motivo: string): string | null {
  const falta = MOTIVO_QUE_FALTA[paso];
  return falta && !motivo.trim() ? falta : null;
}

/** Un renglón tal como se pidió, visto al aprobar. */
export interface RenglonParaAprobar {
  id: string;
  orden: number;
  descripcion: string;
  cantidad: number;
}

/** Lo que la gerencia cambió al aprobar (RF-13), para la historia. */
export interface CambioAlAprobar {
  renglon: number;
  descripcion: string;
  antes: number;
  despues: number;
}

/**
 * Las cantidades que quedan aprobadas (RF-13). Sin decir nada, cada renglón se aprueba
 * entero; la gerencia puede bajar una cantidad o quitar el renglón con 0, pero no subirla.
 * Aprobar todo en cero no se deja: para no aprobar nada, se rechaza (RF-14).
 */
export function aprobacionDeLaSolicitud(
  renglones: readonly RenglonParaAprobar[],
  cantidades: readonly { renglonId: string; cantidad: number }[],
): { faltas: string[]; aprobadas: Record<string, number>; cambios: CambioAlAprobar[] } {
  const faltas: string[] = [];
  const aprobadas: Record<string, number> = Object.fromEntries(renglones.map((r) => [r.id, r.cantidad]));
  for (const { renglonId, cantidad } of cantidades) {
    const renglon = renglones.find((r) => r.id === renglonId);
    if (!renglon) {
      faltas.push('Uno de los renglones no es de esta solicitud.');
      continue;
    }
    if (!(cantidad === 0 || cantidadValida(cantidad)) || cantidad > renglon.cantidad) {
      faltas.push(`La cantidad aprobada del renglón ${renglon.orden} va de 0 a ${renglon.cantidad.toLocaleString('es-CO')}.`);
      continue;
    }
    aprobadas[renglonId] = cantidad;
  }
  if (!faltas.length && Object.values(aprobadas).every((c) => c === 0)) {
    faltas.push('Para no aprobar nada, recházala.');
  }
  const cambios = renglones
    .filter((r) => aprobadas[r.id] !== r.cantidad)
    .map((r) => ({ renglon: r.orden, descripcion: r.descripcion, antes: r.cantidad, despues: aprobadas[r.id] }));
  return { faltas, aprobadas, cambios };
}

/** Los campos de una solicitud, en el orden del formulario, con cómo se dicen. */
const CAMPOS_DE_LA_SOLICITUD = [
  ['renglones', 'lo que se pide'],
  ['paraCuando', 'para cuándo'],
  ['urgente', 'urgencia'],
  ['paraQue', 'para qué'],
  ['proveedorSugerido', 'proveedor sugerido'],
  ['valorEstimado', 'valor estimado'],
] as const;

const renglonesComparables = (renglones: readonly RenglonPedido[]) =>
  JSON.stringify(
    renglones.map((r) => [r.descripcion.trim(), r.cantidad, r.unidad.trim(), r.materialId ?? null]),
  );

/**
 * Qué cambió al corregir una solicitud (RF-11, RF-23), en el orden del formulario y con
 * cómo se dice: «lo que se pide», «para cuándo»…
 */
export function camposCorregidos(antes: DatosDeLaSolicitud, despues: DatosDeLaSolicitud): string[] {
  return CAMPOS_DE_LA_SOLICITUD.filter(([campo]) => {
    if (campo === 'renglones') return renglonesComparables(antes.renglones) !== renglonesComparables(despues.renglones);
    const a = antes[campo];
    const d = despues[campo];
    return (typeof a === 'string' ? a.trim() : a) !== (typeof d === 'string' ? d.trim() : d);
  }).map(([, nombre]) => nombre);
}

/** Lo que llegó de un renglón (RF-20). */
export interface ReciboPedido {
  renglonId: string;
  cantidad: number;
}

/** Un renglón de la solicitud, visto al recibir. */
export interface RenglonParaRecibir {
  id: string;
  orden: number;
  cantidadAprobada: number | null;
  /** ¿Tiene compra sin anular? Lo que no se ha comprado no puede llegar. */
  enCompraVigente: boolean;
}

/**
 * Lo que impide registrar lo que llegó; vacío si está bien (RF-20). Se recibe por renglón,
 * todo o una parte, y solo de lo comprado. Pasar de lo aprobado sí se deja: se guarda lo
 * que llegó y la pantalla marca la diferencia (caso límite).
 */
export function faltasDelRecibo(
  datos: { fecha: string; recibos: readonly ReciboPedido[] },
  renglones: readonly RenglonParaRecibir[],
): string[] {
  const faltas: string[] = [];
  if (!esFechaReal(datos.fecha)) faltas.push('Diga qué día llegó.');
  if (datos.recibos.length === 0) faltas.push('Diga qué llegó.');
  const vistos = new Set<string>();
  for (const recibo of datos.recibos) {
    const renglon = renglones.find((r) => r.id === recibo.renglonId);
    if (!renglon) {
      faltas.push('Uno de los renglones no es de esta solicitud.');
      continue;
    }
    if (vistos.has(renglon.id)) {
      faltas.push(`El renglón ${renglon.orden} está dos veces.`);
      continue;
    }
    vistos.add(renglon.id);
    if (!renglon.cantidadAprobada) faltas.push(`El renglón ${renglon.orden} no quedó aprobado.`);
    else if (!renglon.enCompraVigente) faltas.push(`El renglón ${renglon.orden} todavía no tiene compra.`);
    else if (!cantidadValida(recibo.cantidad)) {
      faltas.push(`La cantidad recibida del renglón ${renglon.orden} debe ser mayor que cero, con dos decimales a lo más.`);
    }
  }
  return faltas;
}

/** Lo que hace falta de una solicitud para buscarla por texto (RF-26). */
export interface SolicitudParaBuscar {
  numero: number;
  renglones: readonly { descripcion: string }[];
  proveedorSugerido: string;
  /** Los de sus compras vigentes. */
  proveedores: readonly string[];
  pedidaPor: { nombre: string };
}

/**
 * ¿La solicitud responde a lo que se escribió? (RF-26): por número («SC-0005», «sc5», «5»),
 * por lo que se pidió, por el proveedor —sugerido o de sus compras— o por quien la pidió,
 * sin distinguir mayúsculas ni tildes.
 */
export function coincideLaSolicitud(solicitud: SolicitudParaBuscar, texto: string): boolean {
  const buscado = normalizar(texto);
  if (!buscado) return true;
  const numero = /^(sc-?\s*)?0*(\d+)$/.exec(buscado);
  if (numero && Number(numero[2]) === solicitud.numero) return true;
  return [
    numeroDeSolicitud(solicitud.numero),
    ...solicitud.renglones.map((r) => r.descripcion),
    solicitud.proveedorSugerido,
    ...solicitud.proveedores,
    solicitud.pedidaPor.nombre,
  ].some((campo) => normalizar(campo).includes(buscado));
}

/** Los filtros de Compras de Elemental (RF-3). Vacío o `null`: sin ese filtro. */
export interface FiltrosDeLaBandeja {
  /** `occ`, `geolab` o el id de una obra. */
  lugar: string | null;
  estado: EstadoDeSolicitud | null;
  soloUrgentes: boolean;
  /** El día en que se pidió, `YYYY-MM-DD`, las dos puntas incluidas. */
  desde: string | null;
  hasta: string | null;
  texto: string;
}

/**
 * ¿Pasa los filtros de la bandeja? (RF-3, RF-26). Las fechas son las del día en que se
 * pidió, en Colombia.
 */
export function pasaLosFiltros(
  solicitud: SolicitudParaBuscar & { estado: EstadoDeSolicitud; urgente: boolean; lugar: { id: string }; pedidaEl: string },
  filtros: FiltrosDeLaBandeja,
): boolean {
  if (filtros.lugar && solicitud.lugar.id !== filtros.lugar) return false;
  if (filtros.estado && solicitud.estado !== filtros.estado) return false;
  if (filtros.soloUrgentes && !solicitud.urgente) return false;
  if (filtros.desde && solicitud.pedidaEl < filtros.desde) return false;
  if (filtros.hasta && solicitud.pedidaEl > filtros.hasta) return false;
  return coincideLaSolicitud(solicitud, filtros.texto);
}

/** ¿Este rol ve el gasto por lugar? (RF-27): solo la gerencia. La auxiliar consulta, sin él. */
export function veElGasto(rol: Rol): boolean {
  return rol === 'admin';
}
