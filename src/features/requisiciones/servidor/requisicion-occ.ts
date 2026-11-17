/**
 * La requisición de pagos de OCC (spec 047). **Solo servidor.**
 *
 * ── Por qué tablas propias ──
 *
 * Una planilla por viernes con sus líneas, autorizada línea por línea (D2): no cabe en
 * `solicitudes_pago`, donde una fila es un beneficiario y un valor (plan, «Tablas propias»). El
 * número RQ sale de la misma secuencia de la 046 (RF-2) y los pagos van a la tabla `pagos` de
 * siempre, con la línea como dueña.
 *
 * ── Sin transacciones interactivas ──
 *
 * Neon por HTTP no las tiene. Cada cambio es un `batch` en el que **la primera sentencia sube la
 * versión con la versión vista y el estado esperado en la condición**; las demás sentencias del lote
 * se condicionan a que esa haya pasado (`where … version = vista + 1`), así una versión vieja no
 * escribe nada (RF-75). «Una abierta por viernes» la cuida el índice único parcial (RF-8, RF-82).
 *
 * ── Quién ve ──
 *
 * `veRequisicionesOcc` (RF-73): quien ve Requisiciones en OCC y quien paga en Tesorería. A los demás,
 * 404 y no 403: confirmar que el id existe ya diría algo.
 */
import { and, asc, desc, eq, inArray, isNull, sql } from 'drizzle-orm';
import { uuidv7 } from 'uuidv7';

import { baseServidor } from '@/db/servidor/cliente';
import {
  media,
  pagos,
  requisicionesOcc,
  requisicionOccEventos,
  requisicionOccImportaciones,
  requisicionOccLineas,
  usuarios,
} from '@/db/servidor/esquema';
import { ejecutarLote, type Sentencia } from '@/features/auth/servidor/accesos';
import { claveDeObjeto, guardar } from '@/features/media/servidor/almacen';
import type { PagoRegistrado } from '@/features/panel/contratos';
import type {
  LineaOccEnElDetalle,
  LineaOccPorPagar,
  RequisicionOccCreada,
  RequisicionOccDetallada,
  RequisicionOccEnLaLista,
  RequisicionOccExistente,
} from '@/features/panel/requisiciones-occ';
import type { PersonaEnSesion } from '@/features/servidor/guardia';
import { errorDePeticion, indiceUnicoViolado, noEncontrado } from '@/features/servidor/respuestas';
import { aHex } from '@/shared/cripto/formato-pbkdf2';
import { BYTES_DE_FIRMA, revisarDocumento } from '@/shared/rules/documentos';
import { fechaDeJornada } from '@/shared/rules/jornada';
import { faltaDelMotivoDePago, type DatosDelPago } from '@/shared/rules/pagos';
import { alcanza } from '@/shared/rules/permisos';
import {
  estaVencidaOcc,
  faltaDelViernes,
  faltasDeLaLineaPorCampo,
  faltasParaEnviarOcc,
  faltaDeLaRespuestaOcc,
  estadoTrasResponderOcc,
  estadoTrasPagosOcc,
  faltasDelPagoDeLineaOcc,
  faltanPorResponderOcc,
  nombreDeEstadoOcc,
  numeroDeRequisicionOcc,
  pagoDeLaLineaOcc,
  porPagarDeLaLineaOcc,
  porQueNoPuedeOcc,
  puedeCrearRequisicionOcc,
  requisicionOccAbierta,
  totalAPagarOcc,
  totalPedidoOcc,
  veRequisicionesOcc,
  type AccionOcc,
  type DatosDeLineaOcc,
  type LineaOccParaPagar,
  type EstadoDeRequisicionOcc,
  type RespuestaDeLineaOcc,
} from '@/shared/rules/requisicion-occ';

export type FilaDeRequisicionOcc = typeof requisicionesOcc.$inferSelect;
type FilaDeLinea = typeof requisicionOccLineas.$inferSelect;

/** Las acciones, para armar `puede` del detalle. */
const ACCIONES: readonly AccionOcc[] = ['armar', 'enviar', 'cancelar', 'responder', 'devolver', 'pagar', 'anular_pago'];

/** La requisición, si quien pregunta la ve (RF-73); `null` si no existe o no le toca. */
export async function requisicionOccAlAlcance(sesion: PersonaEnSesion, id: string): Promise<FilaDeRequisicionOcc | null> {
  if (!veRequisicionesOcc(sesion.rol)) return null;
  const [fila] = await baseServidor().select().from(requisicionesOcc).where(eq(requisicionesOcc.id, id)).limit(1);
  return fila ?? null;
}

/** Las líneas vigentes —ni quitadas ni reemplazadas— en su orden (RF-11, RF-20, RF-37). */
export async function lineasVigentes(requisicionId: string): Promise<FilaDeLinea[]> {
  return baseServidor()
    .select()
    .from(requisicionOccLineas)
    .where(
      and(
        eq(requisicionOccLineas.requisicionId, requisicionId),
        isNull(requisicionOccLineas.quitadaEn),
        isNull(requisicionOccLineas.reemplazadaEn),
      ),
    )
    .orderBy(asc(requisicionOccLineas.orden), asc(requisicionOccLineas.creadaEn));
}

/** Lo pagado sin anular de cada línea. */
export async function pagadoPorLinea(lineaIds: readonly string[]): Promise<Map<string, number>> {
  if (lineaIds.length === 0) return new Map();
  const filas = await baseServidor()
    .select({ lineaId: pagos.requisicionOccLineaId, pagado: sql<string>`sum(${pagos.valor})` })
    .from(pagos)
    .where(and(inArray(pagos.requisicionOccLineaId, [...lineaIds]), isNull(pagos.anuladoEn)))
    .groupBy(pagos.requisicionOccLineaId);
  return new Map(filas.map((f) => [f.lineaId as string, Number(f.pagado)]));
}

/** ¿Tiene algún pago vigente? (RF-25). */
export async function tienePagos(requisicionId: string): Promise<boolean> {
  const [fila] = await baseServidor()
    .select({ n: sql<number>`count(*)::int` })
    .from(pagos)
    .innerJoin(requisicionOccLineas, eq(pagos.requisicionOccLineaId, requisicionOccLineas.id))
    .where(and(eq(requisicionOccLineas.requisicionId, requisicionId), isNull(pagos.anuladoEn)));
  return (fila?.n ?? 0) > 0;
}

/** Por qué no, o `null`, con lo que hace falta saber de la fila (RF-74). */
export async function porQueNo(sesion: PersonaEnSesion, accion: AccionOcc, fila: FilaDeRequisicionOcc) {
  const conPagos = accion === 'cancelar' ? await tienePagos(fila.id) : false;
  return porQueNoPuedeOcc(sesion.rol, sesion.id, accion, { estado: fila.estado, elaboradaPor: fila.elaboradaPor, tienePagos: conPagos });
}

/** El 409 de «cambió mientras la tenía abierta» (RF-75). */
export const CAMBIO_MIENTRAS_LA_TENIA = 'Esta requisición cambió mientras la tenía abierta. Vuelva a abrirla.';

async function nombresDe(ids: readonly (string | null)[]): Promise<Map<string, string>> {
  const unicos = [...new Set(ids.filter((x): x is string => Boolean(x)))];
  if (unicos.length === 0) return new Map();
  const filas = await baseServidor()
    .select({ id: usuarios.id, nombre: usuarios.nombreCompleto })
    .from(usuarios)
    .where(inArray(usuarios.id, unicos));
  return new Map(filas.map((u) => [u.id, u.nombre]));
}

/** Las marcas de una fila de la lista: vencida y, para quien la elaboró, devuelta. */
function marcasDe(fila: Pick<FilaDeRequisicionOcc, 'estado' | 'viernes' | 'elaboradaPor'>, yo: string, hoy: string): string[] {
  const marcas: string[] = [];
  if (fila.estado === 'devuelta' && fila.elaboradaPor === yo) marcas.push('Devuelta: corrígela');
  if (estaVencidaOcc(fila, hoy)) marcas.push('Vencida');
  return marcas;
}

/* ── Listar (RF-3, RF-40 a RF-42, RF-51) ── */

/**
 * Las requisiciones de pagos de OCC: abiertas primero, la del viernes más cercano arriba; luego las
 * cerradas, la más reciente arriba. Con los totales de sus líneas vigentes.
 */
export async function listarRequisicionesOcc(sesion: PersonaEnSesion): Promise<RequisicionOccEnLaLista[]> {
  if (!veRequisicionesOcc(sesion.rol)) return [];
  const db = baseServidor();
  const filas = await db.select().from(requisicionesOcc).orderBy(desc(requisicionesOcc.viernes));
  if (filas.length === 0) return [];

  const lineas = await db
    .select({ requisicionId: requisicionOccLineas.requisicionId, valor: requisicionOccLineas.valor, respuesta: requisicionOccLineas.respuesta })
    .from(requisicionOccLineas)
    .where(
      and(
        inArray(
          requisicionOccLineas.requisicionId,
          filas.map((f) => f.id),
        ),
        isNull(requisicionOccLineas.quitadaEn),
        isNull(requisicionOccLineas.reemplazadaEn),
      ),
    );
  const porRequisicion = new Map<string, { valor: number; respuesta: RespuestaDeLineaOcc | null }[]>();
  for (const l of lineas) {
    const lista = porRequisicion.get(l.requisicionId) ?? [];
    lista.push({ valor: l.valor, respuesta: l.respuesta as RespuestaDeLineaOcc | null });
    porRequisicion.set(l.requisicionId, lista);
  }
  const nombres = await nombresDe(filas.map((f) => f.elaboradaPor));
  const hoy = fechaDeJornada();

  const enLista = filas.map((f) => enLaLista(f, porRequisicion.get(f.id) ?? [], nombres, sesion.id, hoy));
  const abiertas = enLista.filter((r) => requisicionOccAbierta(r.estado)).sort((a, b) => a.viernes.localeCompare(b.viernes) || a.numero - b.numero);
  const cerradas = enLista.filter((r) => !requisicionOccAbierta(r.estado));
  return [...abiertas, ...cerradas];
}

function enLaLista(
  f: FilaDeRequisicionOcc,
  lineas: readonly { valor: number; respuesta: RespuestaDeLineaOcc | null }[],
  nombres: Map<string, string>,
  yo: string,
  hoy: string,
): RequisicionOccEnLaLista {
  return {
    id: f.id,
    codigo: numeroDeRequisicionOcc(f.numeroRequisicion),
    numero: f.numeroRequisicion,
    viernes: f.viernes,
    estado: f.estado,
    estadoQueSeVe: nombreDeEstadoOcc(f.estado),
    elaboradaPor: { id: f.elaboradaPor, nombre: nombres.get(f.elaboradaPor) ?? '' },
    lineas: lineas.length,
    totalPedido: totalPedidoOcc(lineas),
    totalAPagar: totalAPagarOcc(lineas),
    faltanPorResponder: f.estado === 'en_autorizacion' ? faltanPorResponderOcc(lineas.map((l) => l.respuesta)) : 0,
    marcas: marcasDe(f, yo, hoy),
    version: f.version,
  };
}

/* ── Crear (RF-4 a RF-8, RF-82) ── */

/** La abierta de ese viernes, si hay (RF-8). */
async function abiertaDelViernes(viernes: string): Promise<FilaDeRequisicionOcc | null> {
  const filas = await baseServidor().select().from(requisicionesOcc).where(eq(requisicionesOcc.viernes, viernes));
  return filas.find((f) => requisicionOccAbierta(f.estado)) ?? null;
}

function yaExiste(fila: FilaDeRequisicionOcc): Response {
  const cuerpo: RequisicionOccExistente = {
    error: `Ya hay una requisición de pagos abierta para el viernes ${fila.viernes}: ${numeroDeRequisicionOcc(fila.numeroRequisicion)}.`,
    existente: { id: fila.id, codigo: numeroDeRequisicionOcc(fila.numeroRequisicion), estado: fila.estado },
  };
  return Response.json(cuerpo, { status: 409 });
}

/**
 * Crea la requisición del viernes en Borrador, con su número RQ y el evento `creada`. Si ya hay una
 * abierta para ese viernes —antes, o porque otra persona la creó en el mismo instante—, 409 con esa.
 */
export async function crearRequisicionOcc(sesion: PersonaEnSesion, viernes: string): Promise<RequisicionOccCreada | Response> {
  if (!puedeCrearRequisicionOcc(sesion.rol)) return errorDePeticion('Piden en OCC el Encargado de OCC y la Gerencia.', 403);
  const falta = faltaDelViernes(viernes);
  if (falta) return Response.json({ error: falta, campos: { viernes: falta } }, { status: 422 });

  const existente = await abiertaDelViernes(viernes);
  if (existente) return yaExiste(existente);

  const id = uuidv7();
  const db = baseServidor();
  try {
    const [[creada]] = await db.batch([
      db
        .insert(requisicionesOcc)
        .values({ id, numeroRequisicion: sql<number>`nextval('requisicion_numero')`, viernes, elaboradaPor: sesion.id })
        .returning({ numero: requisicionesOcc.numeroRequisicion, version: requisicionesOcc.version }),
      db.insert(requisicionOccEventos).values({ id: uuidv7(), requisicionId: id, paso: 'creada', motivo: null, cambios: [{ viernes }], por: sesion.id }),
    ]);
    return { id, codigo: numeroDeRequisicionOcc(creada.numero), version: creada.version };
  } catch (fallo) {
    // RF-82: dos a la vez; la que llegó después recibe la que ganó.
    if (indiceUnicoViolado(fallo) !== 'ux_requisicion_occ_viernes_abierta') throw fallo;
    const ganadora = await abiertaDelViernes(viernes);
    if (!ganadora) throw fallo;
    return yaExiste(ganadora);
  }
}

/* ── Ver (RF-39 a RF-42, RF-58, RF-68, RF-81) ── */

export async function detalleDeRequisicionOcc(sesion: PersonaEnSesion, id: string): Promise<RequisicionOccDetallada | Response> {
  const fila = await requisicionOccAlAlcance(sesion, id);
  if (!fila) return noEncontrado('esa requisición');
  const db = baseServidor();

  const vigentes = await lineasVigentes(id);
  const lineaIds = vigentes.map((l) => l.id);
  const [eventos, filasDePagos, planillas, conPagos] = await Promise.all([
    db.select().from(requisicionOccEventos).where(eq(requisicionOccEventos.requisicionId, id)).orderBy(asc(requisicionOccEventos.en)),
    lineaIds.length
      ? db.select().from(pagos).where(inArray(pagos.requisicionOccLineaId, lineaIds)).orderBy(asc(pagos.fecha), asc(pagos.registradoEn))
      : Promise.resolve([] as (typeof pagos.$inferSelect)[]),
    db
      .select()
      .from(requisicionOccImportaciones)
      .where(and(eq(requisicionOccImportaciones.requisicionId, id), eq(requisicionOccImportaciones.estado, 'confirmada')))
      .orderBy(asc(requisicionOccImportaciones.confirmadaEn)),
    tienePagos(id),
  ]);

  const nombres = await nombresDe([
    fila.elaboradaPor,
    ...eventos.map((e) => e.por),
    ...vigentes.map((l) => l.respondidaPor),
    ...filasDePagos.flatMap((p) => [p.registradoPor, p.anuladoPor]),
  ]);
  const nombre = (quien: string | null) => (quien ? (nombres.get(quien) ?? '') : '');

  const lineas: LineaOccEnElDetalle[] = vigentes.map((l, i) => {
    const propios = filasDePagos.filter((p) => p.requisicionOccLineaId === l.id);
    const pagado = propios.filter((p) => !p.anuladoEn).reduce((suma, p) => suma + p.valor, 0);
    const respuesta = l.respuesta as RespuestaDeLineaOcc | null;
    return {
      id: l.id,
      numero: i + 1,
      fechaSolicitud: l.fechaSolicitud,
      beneficiario: l.beneficiario,
      concepto: l.concepto,
      especificaciones: l.especificaciones,
      proveedor: l.proveedor,
      valor: l.valor,
      observaciones: l.observaciones,
      rutMediaId: l.rutMediaId,
      cuentaMediaId: l.cuentaMediaId,
      respuesta,
      motivoRespuesta: l.motivoRespuesta,
      respondida: l.respondidaEn ? { por: nombre(l.respondidaPor), en: l.respondidaEn.toISOString() } : null,
      pago: respuesta === 'autorizada' ? pagoDeLaLineaOcc({ valor: l.valor, pagado }) : null,
      pagado,
      porPagar: respuesta === 'autorizada' ? porPagarDeLaLineaOcc({ valor: l.valor, pagado }) : 0,
      pagos: propios.map(
        (p): PagoRegistrado => ({
          id: p.id,
          fecha: p.fecha,
          valor: p.valor,
          medio: p.medio,
          referencia: p.referencia,
          documentoId: p.documentoId,
          comprobanteMediaId: p.comprobanteMediaId,
          registradoPor: nombre(p.registradoPor),
          registradoEn: p.registradoEn.toISOString(),
          anulado: p.anuladoEn ? { en: p.anuladoEn.toISOString(), por: nombre(p.anuladoPor), motivo: p.motivoAnulacion ?? '' } : null,
        }),
      ),
    };
  });

  const deLaRegla = { estado: fila.estado, elaboradaPor: fila.elaboradaPor, tienePagos: conPagos };
  const puede = Object.fromEntries(ACCIONES.map((a) => [a, porQueNoPuedeOcc(sesion.rol, sesion.id, a, deLaRegla) === null])) as Record<AccionOcc, boolean>;

  return {
    ...enLaLista(fila, lineas, new Map([[fila.elaboradaPor, nombre(fila.elaboradaPor)]]), sesion.id, fechaDeJornada()),
    enviadaEn: fila.enviadaEn?.toISOString() ?? null,
    lineasVigentes: lineas,
    historia: eventos.map((e) => ({ paso: e.paso, motivo: e.motivo, cambios: e.cambios, por: nombre(e.por), en: e.en.toISOString() })),
    planillas: planillas.map((p) => ({ id: p.id, mediaId: p.mediaId, nombreArchivo: p.nombreArchivo, en: (p.confirmadaEn ?? p.creadoEn).toISOString() })),
    puede,
  };
}

/* ── Armar las líneas (RF-10 a RF-20, RF-36, RF-37, RF-75, RF-76) ── */

/** Lo que llega de una línea, ya pasado por el contrato. */
export type LineaOccRecibida = DatosDeLineaOcc & { version: number };

/** Los estados en que se arma: Borrador y Devuelta (RF-19, RF-36). */
const SE_ARMA: EstadoDeRequisicionOcc[] = ['borrador', 'devuelta'];

/**
 * Sube la versión si sigue siendo la vista y el estado es uno de los esperados (RF-75). Es la
 * primera escritura de cada cambio: quien la gana escribe después lo demás sin que otro se cuele.
 */
export async function tomarLaVersionOcc(
  id: string,
  version: number,
  estados: readonly EstadoDeRequisicionOcc[],
  cambios: Partial<typeof requisicionesOcc.$inferInsert> = {},
): Promise<boolean> {
  const [tomada] = await baseServidor()
    .update(requisicionesOcc)
    .set({ ...cambios, version: version + 1, actualizadaEn: new Date() })
    .where(and(eq(requisicionesOcc.id, id), eq(requisicionesOcc.version, version), inArray(requisicionesOcc.estado, [...estados])))
    .returning({ id: requisicionesOcc.id });
  return Boolean(tomada);
}

export const cambio409 = () => errorDePeticion(CAMBIO_MIENTRAS_LA_TENIA, 409);

/** Lo común antes de escribir: que la vea, que la versión sea la vista y que le toque (RF-73 a RF-75). */
export async function antesDeEscribir(
  sesion: PersonaEnSesion,
  id: string,
  version: number,
  accion: AccionOcc,
): Promise<FilaDeRequisicionOcc | Response> {
  const fila = await requisicionOccAlAlcance(sesion, id);
  if (!fila) return noEncontrado('esa requisición');
  if (fila.version !== version) return cambio409();
  const no = await porQueNo(sesion, accion, fila);
  if (no) return errorDePeticion(no.mensaje, no.estado);
  return fila;
}

const conMayuscula = (falta: string) => `${falta[0].toUpperCase()}${falta.slice(1)}.`;

/** Las faltas de la línea junto a su campo (RF-12 a RF-14), o `null` si no tiene. */
function faltasComoRespuesta(datos: DatosDeLineaOcc): Response | null {
  const campos: Record<string, string> = {};
  for (const [campo, falta] of Object.entries(faltasDeLaLineaPorCampo(datos))) {
    if (falta) campos[campo] = conMayuscula(falta);
  }
  const primera = Object.values(campos)[0];
  return primera ? Response.json({ error: primera, campos }, { status: 422 }) : null;
}

const datosDe = (p: DatosDeLineaOcc): DatosDeLineaOcc => ({
  fechaSolicitud: p.fechaSolicitud,
  beneficiario: p.beneficiario.trim(),
  concepto: p.concepto.trim(),
  especificaciones: p.especificaciones.trim(),
  proveedor: p.proveedor.trim(),
  valor: p.valor,
  observaciones: p.observaciones.trim(),
});

const datosDeLaFila = (l: FilaDeLinea): DatosDeLineaOcc => ({
  fechaSolicitud: l.fechaSolicitud,
  beneficiario: l.beneficiario,
  concepto: l.concepto,
  especificaciones: l.especificaciones,
  proveedor: l.proveedor,
  valor: l.valor,
  observaciones: l.observaciones,
});

/** La línea vigente de esta requisición, o `null`. */
export async function lineaVigente(requisicionId: string, lineaId: string): Promise<FilaDeLinea | null> {
  const [linea] = await baseServidor()
    .select()
    .from(requisicionOccLineas)
    .where(
      and(
        eq(requisicionOccLineas.id, lineaId),
        eq(requisicionOccLineas.requisicionId, requisicionId),
        isNull(requisicionOccLineas.quitadaEn),
        isNull(requisicionOccLineas.reemplazadaEn),
      ),
    )
    .limit(1);
  return linea ?? null;
}

/** RF-10, RF-19: agrega una línea al final. */
export async function agregarLineaOcc(
  sesion: PersonaEnSesion,
  id: string,
  pedido: LineaOccRecibida,
): Promise<{ lineaId: string; version: number } | Response> {
  const fila = await antesDeEscribir(sesion, id, pedido.version, 'armar');
  if (fila instanceof Response) return fila;
  const datos = datosDe(pedido);
  const faltas = faltasComoRespuesta(datos);
  if (faltas) return faltas;
  if (!(await tomarLaVersionOcc(id, pedido.version, SE_ARMA))) return cambio409();

  const lineaId = uuidv7();
  const db = baseServidor();
  await db.batch([
    db.insert(requisicionOccLineas).values({
      id: lineaId,
      requisicionId: id,
      orden: sql<number>`(select coalesce(max(${requisicionOccLineas.orden}), 0) + 1 from ${requisicionOccLineas} where ${requisicionOccLineas.requisicionId} = ${id})`,
      ...datos,
      valor: datos.valor as number,
      creadaPor: sesion.id,
    }),
    db.insert(requisicionOccEventos).values({
      id: uuidv7(),
      requisicionId: id,
      paso: 'linea_agregada',
      motivo: null,
      cambios: [{ lineaId, beneficiario: datos.beneficiario, concepto: datos.concepto, valor: datos.valor }],
      por: sesion.id,
    }),
  ]);
  return { lineaId, version: pedido.version + 1 };
}

const CAMPOS_DE_LA_LINEA: (keyof DatosDeLineaOcc)[] = [
  'fechaSolicitud',
  'beneficiario',
  'concepto',
  'especificaciones',
  'proveedor',
  'valor',
  'observaciones',
];

/** Los campos que cambiaron, para la historia. */
function camposCambiados(antes: DatosDeLineaOcc, despues: DatosDeLineaOcc) {
  return CAMPOS_DE_LA_LINEA.filter((c) => antes[c] !== despues[c]).map((c) => ({ campo: c, antes: antes[c], despues: despues[c] }));
}

/**
 * Reemplaza una línea por otra con el mismo `orden` (RF-37): la nueva hereda los adjuntos que no se
 * cambian, y la vieja queda marcada con la que la reemplazó. Primero la nueva, por la llave; si llega
 * `archivo`, su fila de `media` va antes que todo, por la otra llave.
 */
async function reemplazarLinea(
  sesion: PersonaEnSesion,
  id: string,
  vieja: FilaDeLinea,
  datos: DatosDeLineaOcc,
  adjuntos: { rutMediaId: string | null; cuentaMediaId: string | null },
  evento: { paso: string; cambios: Record<string, unknown> },
  archivo?: typeof media.$inferInsert,
): Promise<string> {
  const lineaId = uuidv7();
  const db = baseServidor();
  const sentencias: Sentencia[] = [
    ...(archivo ? [db.insert(media).values(archivo)] : []),
    db.insert(requisicionOccLineas).values({
      id: lineaId,
      requisicionId: id,
      orden: vieja.orden,
      ...datos,
      valor: datos.valor as number,
      ...adjuntos,
      creadaPor: sesion.id,
    }),
    db.update(requisicionOccLineas).set({ reemplazadaEn: new Date(), reemplazadaPorLinea: lineaId }).where(eq(requisicionOccLineas.id, vieja.id)),
    db.insert(requisicionOccEventos).values({
      id: uuidv7(),
      requisicionId: id,
      paso: evento.paso,
      motivo: null,
      cambios: [{ ...evento.cambios, lineaAnterior: vieja.id, linea: lineaId }],
      por: sesion.id,
    }),
  ];
  await ejecutarLote(db, sentencias);
  return lineaId;
}

/** RF-19, RF-36, RF-37: cambia una línea vigente; la de antes queda marcada, no se sobrescribe. */
export async function cambiarLineaOcc(
  sesion: PersonaEnSesion,
  id: string,
  lineaId: string,
  pedido: LineaOccRecibida,
): Promise<{ lineaId: string; version: number } | Response> {
  const fila = await antesDeEscribir(sesion, id, pedido.version, 'armar');
  if (fila instanceof Response) return fila;
  const vieja = await lineaVigente(id, lineaId);
  if (!vieja) return noEncontrado('esa línea');
  const datos = datosDe(pedido);
  const faltas = faltasComoRespuesta(datos);
  if (faltas) return faltas;
  const cambiados = camposCambiados(datosDeLaFila(vieja), datos);
  // Sin cambios no se toca nada: ni versión ni historia.
  if (cambiados.length === 0) return { lineaId, version: fila.version };
  if (!(await tomarLaVersionOcc(id, pedido.version, SE_ARMA))) return cambio409();

  const nueva = await reemplazarLinea(
    sesion,
    id,
    vieja,
    datos,
    { rutMediaId: vieja.rutMediaId, cuentaMediaId: vieja.cuentaMediaId },
    { paso: 'linea_cambiada', cambios: { campos: cambiados } },
  );
  return { lineaId: nueva, version: pedido.version + 1 };
}

/** RF-20: quita una línea vigente; queda marcada con quién y cuándo, no se borra. */
export async function quitarLineaOcc(sesion: PersonaEnSesion, id: string, lineaId: string, version: number): Promise<{ version: number } | Response> {
  const fila = await antesDeEscribir(sesion, id, version, 'armar');
  if (fila instanceof Response) return fila;
  const linea = await lineaVigente(id, lineaId);
  if (!linea) return noEncontrado('esa línea');
  if (!(await tomarLaVersionOcc(id, version, SE_ARMA))) return cambio409();

  const db = baseServidor();
  await db.batch([
    db.update(requisicionOccLineas).set({ quitadaEn: new Date(), quitadaPor: sesion.id }).where(eq(requisicionOccLineas.id, lineaId)),
    db.insert(requisicionOccEventos).values({
      id: uuidv7(),
      requisicionId: id,
      paso: 'linea_quitada',
      motivo: null,
      cambios: [{ lineaId, beneficiario: linea.beneficiario, concepto: linea.concepto, valor: linea.valor }],
      por: sesion.id,
    }),
  ]);
  return { version: version + 1 };
}

/** Un archivo subido: su nombre y sus bytes. */
export interface ArchivoSubidoOcc {
  nombre: string;
  contenido: Uint8Array<ArrayBuffer>;
}

/**
 * RF-15, RF-16: adjunta el RUT o la cuenta bancaria a una línea. Cambiar un adjunto también es
 * cambiar la línea: se reemplaza (RF-37), así un RUT anterior no se pierde de la historia.
 */
export async function adjuntarALineaOcc(
  sesion: PersonaEnSesion,
  id: string,
  lineaId: string,
  clase: 'rut' | 'cuenta',
  version: number,
  archivo: ArchivoSubidoOcc,
): Promise<{ lineaId: string; version: number } | Response> {
  const revision = revisarDocumento(archivo.nombre, archivo.contenido.byteLength, archivo.contenido.subarray(0, BYTES_DE_FIRMA));
  if (!revision.ok) return errorDePeticion(revision.mensaje, revision.estado);
  const fila = await antesDeEscribir(sesion, id, version, 'armar');
  if (fila instanceof Response) return fila;
  const vieja = await lineaVigente(id, lineaId);
  if (!vieja) return noEncontrado('esa línea');
  if (!(await tomarLaVersionOcc(id, version, SE_ARMA))) return cambio409();

  const mediaId = uuidv7();
  const clave = claveDeObjeto('requisicion_occ', id, mediaId, revision.mime);
  await guardar(clave, archivo.contenido, revision.mime);
  const nueva = await reemplazarLinea(
    sesion,
    id,
    vieja,
    datosDeLaFila(vieja),
    clase === 'rut' ? { rutMediaId: mediaId, cuentaMediaId: vieja.cuentaMediaId } : { rutMediaId: vieja.rutMediaId, cuentaMediaId: mediaId },
    { paso: 'adjunto', cambios: { clase, nombreArchivo: archivo.nombre, mediaId } },
    {
      id: mediaId,
      duenoTipo: 'requisicion_occ',
      duenoId: id,
      proposito: 'evidencia',
      mime: revision.mime,
      bytes: archivo.contenido.byteLength,
      sha256: aHex(new Uint8Array(await crypto.subtle.digest('SHA-256', archivo.contenido))),
      claveR2: clave,
      subidoEn: new Date(),
    },
  );
  return { lineaId: nueva, version: version + 1 };
}

/* ── Enviar, devolver y cancelar (RF-21 a RF-25, RF-34, RF-35, RF-39) ── */

/** Lo que llega para dar un paso, ya pasado por el contrato. */
export interface PasoOccRecibido {
  version: number;
  accion: 'enviar' | 'devolver' | 'cancelar';
  motivo: string;
}

/** Los motivos que se exigen (RF-24, RF-25, RF-34). */
const FALTA_EL_MOTIVO: Record<Exclude<PasoOccRecibido['accion'], 'enviar'>, string> = {
  devolver: 'Diga qué debe corregirse.',
  cancelar: 'Diga por qué se cancela.',
};

/** Los estados desde los que se puede cancelar: los abiertos (RF-24, RF-25). */
const ABIERTAS: EstadoDeRequisicionOcc[] = ['borrador', 'en_autorizacion', 'devuelta', 'autorizada', 'pagada_en_parte'];

export async function darPasoOcc(sesion: PersonaEnSesion, id: string, pedido: PasoOccRecibido): Promise<{ estado: EstadoDeRequisicionOcc; version: number } | Response> {
  const fila = await antesDeEscribir(sesion, id, pedido.version, pedido.accion);
  if (fila instanceof Response) return fila;
  const motivo = pedido.motivo.trim();
  if (pedido.accion !== 'enviar' && !motivo) {
    const falta = FALTA_EL_MOTIVO[pedido.accion];
    return Response.json({ error: falta, campos: { motivo: falta } }, { status: 422 });
  }
  const db = baseServidor();
  const vigentes = await lineasVigentes(id);

  if (pedido.accion === 'enviar') {
    // RF-12, RF-13, RF-22: todo de nuevo, con la fecha de hoy; el servidor no confía en lo guardado.
    const faltas = faltasParaEnviarOcc(vigentes.map(datosDeLaFila));
    if (faltas.length) return Response.json({ error: faltas[0], faltas }, { status: 422 });
    const ronda = fila.ronda + 1;
    if (!(await tomarLaVersionOcc(id, pedido.version, SE_ARMA, { estado: 'en_autorizacion', enviadaEn: new Date(), ronda }))) return cambio409();
    await db.batch([
      // RF-35: al reenviarse, todas las líneas vuelven a esperar respuesta. Las que tenían quedaron en
      // el evento de la devolución.
      db
        .update(requisicionOccLineas)
        .set({ respuesta: null, motivoRespuesta: null, respondidaPor: null, respondidaEn: null })
        .where(
          and(
            eq(requisicionOccLineas.requisicionId, id),
            isNull(requisicionOccLineas.quitadaEn),
            isNull(requisicionOccLineas.reemplazadaEn),
          ),
        ),
      db.insert(requisicionOccEventos).values({
        id: uuidv7(),
        requisicionId: id,
        paso: 'enviada',
        motivo: null,
        cambios: [{ ronda, lineas: vigentes.length, total: totalPedidoOcc(vigentes) }],
        por: sesion.id,
      }),
    ]);
    return { estado: 'en_autorizacion', version: pedido.version + 1 };
  }

  if (pedido.accion === 'devolver') {
    if (!(await tomarLaVersionOcc(id, pedido.version, ['en_autorizacion'], { estado: 'devuelta' }))) return cambio409();
    // RF-35: las respuestas que ya tenían quedan en la historia.
    const respuestas = vigentes
      .map((l, i) => ({ numero: i + 1, lineaId: l.id, respuesta: l.respuesta, motivo: l.motivoRespuesta }))
      .filter((r) => r.respuesta !== null);
    await db.insert(requisicionOccEventos).values({
      id: uuidv7(),
      requisicionId: id,
      paso: 'devuelta',
      motivo,
      cambios: [{ respuestas }],
      por: sesion.id,
    });
    return { estado: 'devuelta', version: pedido.version + 1 };
  }

  if (!(await tomarLaVersionOcc(id, pedido.version, ABIERTAS, { estado: 'cancelada' }))) return cambio409();
  await db.insert(requisicionOccEventos).values({ id: uuidv7(), requisicionId: id, paso: 'cancelada', motivo, cambios: [], por: sesion.id });
  return { estado: 'cancelada', version: pedido.version + 1 };
}

/* ── Autorizar línea por línea (RF-26 a RF-33, RF-38, RF-75, RF-77) ── */

/** Lo que llega al responder, ya pasado por el contrato. */
export interface RespuestasOccRecibidas {
  version: number;
  respuestas: { lineaId: string; respuesta: RespuestaDeLineaOcc; motivo: string }[];
}

/**
 * Guarda las respuestas de una o varias líneas. Se puede guardar una parte y dejar el resto para
 * después (RF-28); cuando ya no queda ninguna vigente sin respuesta, la requisición se cierra en
 * Autorizada o No autorizada (RF-29, RF-30) y lo autorizado pasa a Tesorería. Mientras siga en
 * autorización, una respuesta se puede cambiar; cada cambio queda en la historia (RF-39).
 */
export async function responderLineasOcc(
  sesion: PersonaEnSesion,
  id: string,
  pedido: RespuestasOccRecibidas,
): Promise<{ estado: EstadoDeRequisicionOcc; version: number; faltan: number } | Response> {
  const fila = await antesDeEscribir(sesion, id, pedido.version, 'responder');
  if (fila instanceof Response) return fila;

  const vigentes = await lineasVigentes(id);
  const porId = new Map(vigentes.map((l, i) => [l.id, { linea: l, numero: i + 1 }]));
  for (const r of pedido.respuestas) {
    const encontrada = porId.get(r.lineaId);
    if (!encontrada) return noEncontrado('esa línea');
    const falta = faltaDeLaRespuestaOcc(r.respuesta, r.motivo);
    if (falta) return Response.json({ error: `Línea ${encontrada.numero}: ${falta}`, lineas: { [r.lineaId]: falta } }, { status: 422 });
  }

  const nuevas = new Map(pedido.respuestas.map((r) => [r.lineaId, r]));
  const despues = vigentes.map((l) => nuevas.get(l.id)?.respuesta ?? (l.respuesta as RespuestaDeLineaOcc | null));
  const estado = estadoTrasResponderOcc(despues);
  if (!(await tomarLaVersionOcc(id, pedido.version, ['en_autorizacion'], { estado }))) return cambio409();

  const ahora = new Date();
  const db = baseServidor();
  const sentencias: Sentencia[] = pedido.respuestas.map((r) =>
    db
      .update(requisicionOccLineas)
      .set({
        respuesta: r.respuesta,
        motivoRespuesta: r.respuesta === 'no_autorizada' ? r.motivo.trim() : null,
        respondidaPor: sesion.id,
        respondidaEn: ahora,
      })
      .where(eq(requisicionOccLineas.id, r.lineaId)),
  );
  sentencias.push(
    db.insert(requisicionOccEventos).values({
      id: uuidv7(),
      requisicionId: id,
      paso: 'respuestas',
      motivo: null,
      cambios: pedido.respuestas.map((r) => ({
        numero: porId.get(r.lineaId)?.numero,
        lineaId: r.lineaId,
        respuesta: r.respuesta,
        motivo: r.respuesta === 'no_autorizada' ? r.motivo.trim() : null,
      })),
      por: sesion.id,
    }),
  );
  if (estado !== 'en_autorizacion') {
    const conRespuesta = vigentes.map((l, i) => ({ valor: l.valor, respuesta: despues[i] }));
    sentencias.push(
      db.insert(requisicionOccEventos).values({
        id: uuidv7(),
        requisicionId: id,
        paso: estado,
        motivo: null,
        cambios: [{ totalAPagar: totalAPagarOcc(conRespuesta), autorizadas: despues.filter((r) => r === 'autorizada').length, lineas: vigentes.length }],
        por: sesion.id,
      }),
    );
  }
  await ejecutarLote(db, sentencias);
  return { estado, version: pedido.version + 1, faltan: faltanPorResponderOcc(despues) };
}

/* ── Pagar y anular (RF-43 a RF-48, RF-80, RF-81) ── */

/** Un pago pedido, ya pasado por su contrato (`pagoDeLineaOccPedido`). */
export interface PagoDeLineaRecibido extends DatosDelPago {
  version: number;
  comprobanteMediaId: string | null;
}

/** El comprobante tiene que ser un archivo de esta misma requisición (plan, cambio de la T16). */
async function comprobanteDeLaRequisicion(mediaId: string, requisicionId: string): Promise<boolean> {
  const [archivo] = await baseServidor()
    .select({ id: media.id })
    .from(media)
    .where(and(eq(media.id, mediaId), eq(media.duenoTipo, 'requisicion_occ'), eq(media.duenoId, requisicionId)))
    .limit(1);
  return Boolean(archivo);
}

/**
 * Sube el comprobante de un pago antes de registrarlo (RF-44): quien puede pagar esa requisición. El
 * archivo queda de la requisición; si el pago no llega a registrarse, queda sin pago que lo nombre.
 */
export async function subirComprobanteOcc(sesion: PersonaEnSesion, id: string, archivo: ArchivoSubidoOcc): Promise<{ mediaId: string } | Response> {
  const revision = revisarDocumento(archivo.nombre, archivo.contenido.byteLength, archivo.contenido.subarray(0, BYTES_DE_FIRMA));
  if (!revision.ok) return errorDePeticion(revision.mensaje, revision.estado);
  const fila = await requisicionOccAlAlcance(sesion, id);
  if (!fila) return noEncontrado('esa requisición');
  const no = await porQueNo(sesion, 'pagar', fila);
  if (no) return errorDePeticion(no.mensaje, no.estado);

  const mediaId = uuidv7();
  const clave = claveDeObjeto('requisicion_occ', id, mediaId, revision.mime);
  await guardar(clave, archivo.contenido, revision.mime);
  await baseServidor()
    .insert(media)
    .values({
      id: mediaId,
      duenoTipo: 'requisicion_occ',
      duenoId: id,
      proposito: 'evidencia',
      mime: revision.mime,
      bytes: archivo.contenido.byteLength,
      sha256: aHex(new Uint8Array(await crypto.subtle.digest('SHA-256', archivo.contenido))),
      claveR2: clave,
      subidoEn: new Date(),
    });
  return { mediaId };
}

/** Cada línea vigente con su respuesta y lo pagado, para la regla del estado tras pagar. */
async function lineasParaPagar(id: string): Promise<(LineaOccParaPagar & { id: string })[]> {
  const vigentes = await lineasVigentes(id);
  const pagado = await pagadoPorLinea(vigentes.map((l) => l.id));
  return vigentes.map((l) => ({ id: l.id, valor: l.valor, respuesta: l.respuesta as RespuestaDeLineaOcc | null, pagado: pagado.get(l.id) ?? 0 }));
}

/**
 * Registra un pago de una línea autorizada (RF-44, RF-45, RF-80): con las reglas del pago de la 037 y
 * nunca más de lo que le falta. La versión de la requisición, tomada con su estado nuevo, es lo que
 * impide que dos pagos a la vez se pasen del valor.
 */
export async function registrarPagoDeLineaOcc(
  sesion: PersonaEnSesion,
  id: string,
  lineaId: string,
  pedido: PagoDeLineaRecibido,
): Promise<{ pagoId: string; estado: EstadoDeRequisicionOcc; version: number } | Response> {
  const fila = await antesDeEscribir(sesion, id, pedido.version, 'pagar');
  if (fila instanceof Response) return fila;
  const lineas = await lineasParaPagar(id);
  const linea = lineas.find((l) => l.id === lineaId);
  if (!linea) return noEncontrado('esa línea');

  const faltas = faltasDelPagoDeLineaOcc(pedido, linea);
  if (pedido.comprobanteMediaId && !(await comprobanteDeLaRequisicion(pedido.comprobanteMediaId, id))) {
    faltas.push('El comprobante no es de esta requisición.');
  }
  if (faltas.length) return Response.json({ error: faltas[0], faltas }, { status: 422 });

  const estado = estadoTrasPagosOcc(lineas.map((l) => (l.id === lineaId ? { ...l, pagado: l.pagado + pedido.valor } : l)));
  if (!(await tomarLaVersionOcc(id, pedido.version, ['autorizada', 'pagada_en_parte'], { estado }))) return cambio409();

  const pagoId = uuidv7();
  const db = baseServidor();
  await db.batch([
    db.insert(pagos).values({
      id: pagoId,
      requisicionOccLineaId: lineaId,
      fecha: pedido.fecha,
      valor: pedido.valor,
      medio: pedido.medio,
      referencia: pedido.referencia.trim(),
      comprobanteMediaId: pedido.comprobanteMediaId,
      registradoPor: sesion.id,
    }),
    db.insert(requisicionOccEventos).values({
      id: uuidv7(),
      requisicionId: id,
      paso: 'pago',
      motivo: null,
      cambios: [{ pagoId, lineaId, numero: lineas.findIndex((l) => l.id === lineaId) + 1, valor: pedido.valor, medio: pedido.medio }],
      por: sesion.id,
    }),
  ]);
  return { pagoId, estado, version: pedido.version + 1 };
}

/**
 * Anula el pago de una línea (RF-48): la Administradora o la Gerencia, con motivo. El pago se queda,
 * marcado; la línea y la requisición vuelven al estado que les toca. Lo llama `anularPago` de
 * Tesorería cuando el pago es de una línea de OCC, con la versión de la requisición.
 */
export async function anularPagoDeLineaOcc(
  sesion: PersonaEnSesion,
  pago: typeof pagos.$inferSelect,
  pedido: { version?: number; motivo: string },
): Promise<{ estado: EstadoDeRequisicionOcc; version: number } | Response> {
  const [linea] = await baseServidor()
    .select({ requisicionId: requisicionOccLineas.requisicionId })
    .from(requisicionOccLineas)
    .where(eq(requisicionOccLineas.id, pago.requisicionOccLineaId as string))
    .limit(1);
  if (!linea) return noEncontrado('ese pago');
  if (pedido.version === undefined) return cambio409();
  const fila = await antesDeEscribir(sesion, linea.requisicionId, pedido.version, 'anular_pago');
  if (fila instanceof Response) return fila;
  if (pago.anuladoEn) return errorDePeticion('Ese pago ya está anulado.', 409);
  const faltaMotivo = faltaDelMotivoDePago('anular_pago', pedido.motivo);
  if (faltaMotivo) return Response.json({ error: faltaMotivo, campos: { motivo: faltaMotivo } }, { status: 422 });

  const lineas = await lineasParaPagar(fila.id);
  const estado = estadoTrasPagosOcc(lineas.map((l) => (l.id === pago.requisicionOccLineaId ? { ...l, pagado: l.pagado - pago.valor } : l)));
  if (!(await tomarLaVersionOcc(fila.id, pedido.version, ['autorizada', 'pagada_en_parte', 'pagada'], { estado }))) return cambio409();

  const motivo = pedido.motivo.trim();
  const db = baseServidor();
  await db.batch([
    db
      .update(pagos)
      .set({ anuladoEn: new Date(), anuladoPor: sesion.id, motivoAnulacion: motivo })
      .where(and(eq(pagos.id, pago.id), isNull(pagos.anuladoEn))),
    db.insert(requisicionOccEventos).values({
      id: uuidv7(),
      requisicionId: fila.id,
      paso: 'anular_pago',
      motivo,
      cambios: [{ pagoId: pago.id, lineaId: pago.requisicionOccLineaId, valor: pago.valor }],
      por: sesion.id,
    }),
  ]);
  return { estado, version: pedido.version + 1 };
}

/**
 * Lo autorizado por pagar de todas las requisiciones de OCC (RF-43): cada línea autorizada con algo
 * por pagar, agrupadas por viernes —el más antiguo primero— y en el orden de su requisición.
 */
export async function lineasOccPorPagar(sesion: PersonaEnSesion): Promise<LineaOccPorPagar[]> {
  if (!alcanza(sesion.rol, 'tesoreria', 'ver')) return [];
  const db = baseServidor();
  const abiertas = await db
    .select()
    .from(requisicionesOcc)
    .where(inArray(requisicionesOcc.estado, ['autorizada', 'pagada_en_parte']))
    .orderBy(asc(requisicionesOcc.viernes), asc(requisicionesOcc.numeroRequisicion));
  const lista: LineaOccPorPagar[] = [];
  for (const r of abiertas) {
    const vigentes = await lineasVigentes(r.id);
    const pagado = await pagadoPorLinea(vigentes.map((l) => l.id));
    vigentes.forEach((l, i) => {
      if (l.respuesta !== 'autorizada') return;
      const yaPagado = pagado.get(l.id) ?? 0;
      const porPagar = porPagarDeLaLineaOcc({ valor: l.valor, pagado: yaPagado });
      if (porPagar <= 0) return;
      lista.push({
        requisicionId: r.id,
        codigo: numeroDeRequisicionOcc(r.numeroRequisicion),
        viernes: r.viernes,
        version: r.version,
        lineaId: l.id,
        numero: i + 1,
        beneficiario: l.beneficiario,
        concepto: l.concepto,
        especificaciones: l.especificaciones,
        valor: l.valor,
        pagado: yaPagado,
        porPagar,
        rutMediaId: l.rutMediaId,
        cuentaMediaId: l.cuentaMediaId,
      });
    });
  }
  return lista;
}
