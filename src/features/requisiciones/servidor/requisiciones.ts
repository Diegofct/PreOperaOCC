/**
 * Las requisiciones de las obras y de GeoLab (spec 046). **Solo servidor.**
 *
 * ── Sobre lo que ya había ──
 *
 * Una requisición es una fila de `solicitudes_compra` o de `solicitudes_pago` con número RQ y paso
 * (plan, «La idea en una línea»). Por eso crear escribe en la tabla de su clase, y la lista del
 * lugar junta las dos tablas, con las SC y SP anteriores dentro (RF-6). Comprar, recibir y pagar
 * siguen por las rutas de la 036 y la 037.
 *
 * ── La cadena ──
 *
 * Quién ocupa cada paso lo dice `ocupantesDeLaCadena`; la regla (`rules/requisiciones.ts`) decide
 * dónde empieza, a dónde pasa y quién decide. Cada paso que se salta queda en la historia como un
 * evento `saltar_paso` con su motivo (RF-24).
 *
 * ── Sin transacciones interactivas ──
 *
 * Neon por HTTP no las tiene: cada cambio es un `batch` (la fila y sus eventos juntos), y lo que
 * depende de cómo estaba la requisición va en la condición del `update`, como en la 036 y la 037.
 */
import { and, asc, desc, eq, inArray, isNotNull, isNull, ne, sql, type SQL } from 'drizzle-orm';
import { uuidv7 } from 'uuidv7';

import { baseServidor } from '@/db/servidor/cliente';
import {
  obras,
  recepcionesCompra,
  solicitudCompraEventos,
  solicitudCompraRenglones,
  solicitudesCompra,
  solicitudesPago,
  solicitudPagoEventos,
  usuarios,
} from '@/db/servidor/esquema';
import { ejecutarLote, type Sentencia } from '@/features/auth/servidor/accesos';
import {
  faltasDeLosMateriales,
  lugarDeLaSolicitud,
  solicitudAlAlcance,
  tomarLaVersion,
  type LugarDeLaSolicitud,
} from '@/features/compras/servidor/solicitudes';
import type {
  BandejaDeRequisiciones,
  RequisicionCreada,
  RequisicionDeCompraPedida,
  RequisicionDePagoPedida,
  RequisicionEnLaLista,
  RequisicionesDelLugar,
} from '@/features/panel/requisiciones';
import type { PersonaEnSesion } from '@/features/servidor/guardia';
import { errorDePeticion, noEncontrado } from '@/features/servidor/respuestas';
import { solicitudDePagoAlAlcance, tomarLaVersionDelPago } from '@/features/tesoreria/servidor/solicitudes-pago';
import {
  aprobacionDeLaSolicitud,
  faltasDeLaSolicitud,
  fechaMasCercana,
  veLosValores,
  yaLaDecidioOtro,
  type DatosDeLaSolicitud,
} from '@/shared/rules/compras';
import { nombreDeEmpresa } from '@/shared/rules/empresas';
import { fechaDeJornada } from '@/shared/rules/jornada';
import { aprobacionDelPago, faltasDeLaSolicitudDePago, nombreDeConcepto, veElValorDelPago } from '@/shared/rules/pagos';
import { alcanza } from '@/shared/rules/permisos';
import {
  esperaElUltimoPaso,
  esperaMiAprobacion,
  esRequisicion,
  estadoQueSeVe,
  faltaDelMotivoDeLaDecision,
  NO_RECORTA,
  porQueNoPuedeDecidir,
  puedeRecortar,
  trasLaDecision,
  type Decision,
  type TipoDeRequisicion,
  marcasDeLaRequisicion,
  numeroQueSeVe,
  ordenDeRequisiciones,
  pasoInicial,
  reacomodar,
  resumenDeRequisiciones,
  type FilaDeRequisicion,
  type OcupantesDeLaCadena,
  type PasoDeLaCadena,
  type PasoSaltado,
} from '@/shared/rules/requisiciones';

import { ocupantesDeLaCadena, type LugarDeLaCadena } from './cadena';

/** Un lugar de requisiciones ya comprobado: una obra, GeoLab u OCC (RF-86). */
export type LugarDeRequisiciones = LugarDeLaSolicitud;

/**
 * El lugar pedido, si quien pide entra a él (RF-2, RF-3, RF-69, RF-87): las reglas del lugar de la
 * 036. OCC pide con requisiciones desde el cambio del 2026-11-17 (antes respondía 400, RF-65).
 */
export async function lugarDeRequisiciones(
  sesion: PersonaEnSesion,
  pedido: { empresa: string | null; obraId: string | null },
): Promise<LugarDeRequisiciones | Response> {
  return lugarDeLaSolicitud(sesion, pedido);
}

export const lugarDeLaCadena = (lugar: LugarDeRequisiciones): LugarDeLaCadena =>
  lugar.tipo === 'obra' ? { obraId: lugar.obraId } : { empresa: lugar.empresaId };

/** Los eventos de los pasos que se saltaron (RF-24). */
function eventosDeSaltos(saltos: readonly PasoSaltado[], por: string) {
  return saltos.map((s) => ({ id: uuidv7(), paso: 'saltar_paso', motivo: s.motivo, cambios: [{ paso: s.paso }], por }));
}

/* ── Crear (RF-4 a RF-15, RF-18 a RF-24, RF-72) ── */

/**
 * Pide una requisición de compra o de pago: la deja Enviada en su primer paso, con su número RQ,
 * el evento `enviada` y los saltos. La fila, sus renglones y sus eventos se escriben juntos.
 */
export async function crearRequisicion(
  sesion: PersonaEnSesion,
  lugar: LugarDeRequisiciones,
  pedido: RequisicionDeCompraPedida | RequisicionDePagoPedida,
): Promise<RequisicionCreada | Response> {
  if (lugar.tipo === 'obra' && !lugar.activa) {
    return errorDePeticion('La obra no está activa: no recibe requisiciones nuevas.', 409);
  }

  if (pedido.tipo === 'compra') {
    const datos = datosDeLaCompra(pedido);
    const faltas = [...faltasDeLaSolicitud(datos, fechaDeJornada(), { requisicion: true }), ...(await faltasDeLosMateriales(lugar, datos))];
    if (faltas.length) return Response.json({ error: faltas[0], faltas }, { status: 422 });
  } else {
    const faltas = faltasDeLaSolicitudDePago({ ...pedido, beneficiarioDocumento: pedido.beneficiarioDocumento });
    if (faltas.length) return Response.json({ error: faltas[0], faltas }, { status: 422 });
  }

  const ocupantes = await ocupantesDeLaCadena(lugarDeLaCadena(lugar));
  const { paso, saltos } = pasoInicial(sesion.rol, lugar.tipo === 'obra' ? 'obra' : lugar.empresaId, ocupantes);
  const id = uuidv7();
  const db = baseServidor();
  const donde = {
    empresaId: lugar.tipo === 'empresa' ? lugar.empresaId : null,
    obraId: lugar.tipo === 'obra' ? lugar.obraId : null,
  };
  const numero = sql<number>`nextval('requisicion_numero')`;
  const eventos = [{ id: uuidv7(), paso: 'enviada', motivo: null, cambios: [{ paso }], por: sesion.id }, ...eventosDeSaltos(saltos, sesion.id)];

  let numeroRequisicion: number;
  if (pedido.tipo === 'compra') {
    const datos = datosDeLaCompra(pedido);
    const [[creada]] = await db.batch([
      db
        .insert(solicitudesCompra)
        .values({
          id,
          ...donde,
          paraCuando: datos.paraCuando,
          urgente: datos.urgente,
          paraQue: datos.paraQue,
          proveedorSugerido: datos.proveedorSugerido,
          valorEstimado: datos.valorEstimado,
          pedidaPor: sesion.id,
          numeroRequisicion: numero,
          paso,
        })
        .returning({ numeroRequisicion: solicitudesCompra.numeroRequisicion }),
      db.insert(solicitudCompraRenglones).values(
        pedido.renglones.map((r, i) => ({
          id: uuidv7(),
          solicitudId: id,
          orden: i + 1,
          descripcion: r.descripcion.trim(),
          materialId: r.materialId,
          cantidad: String(r.cantidad),
          unidad: r.unidad.trim(),
          necesitaEl: r.necesitaEl,
          paraQue: r.paraQue.trim(),
        })),
      ),
      db.insert(solicitudCompraEventos).values(eventos.map((e) => ({ ...e, solicitudId: id }))),
    ]);
    numeroRequisicion = creada.numeroRequisicion as number;
  } else {
    const [[creada]] = await db.batch([
      db
        .insert(solicitudesPago)
        .values({
          id,
          ...donde,
          beneficiario: pedido.beneficiario.trim(),
          beneficiarioDocumento: pedido.beneficiarioDocumento.trim(),
          concepto: pedido.concepto,
          paraQue: pedido.paraQue.trim(),
          valor: pedido.valor,
          paraCuando: pedido.paraCuando,
          urgente: pedido.urgente,
          pedidaPor: sesion.id,
          numeroRequisicion: numero,
          paso,
        })
        .returning({ numeroRequisicion: solicitudesPago.numeroRequisicion }),
      db.insert(solicitudPagoEventos).values(eventos.map((e) => ({ ...e, solicitudPagoId: id }))),
    ]);
    numeroRequisicion = creada.numeroRequisicion as number;
  }

  const fila = { tipo: pedido.tipo, numero: 0, numeroRequisicion, estado: 'enviada', paso };
  return { tipo: pedido.tipo, id, codigo: numeroQueSeVe(fila), paso, estadoQueSeVe: estadoQueSeVe(fila) };
}

/** Lo que valida y guarda la 036, desde lo que llega de una RQ de compra (RF-9, RF-10, RF-13). */
function datosDeLaCompra(pedido: RequisicionDeCompraPedida): DatosDeLaSolicitud {
  return {
    renglones: pedido.renglones.map((r) => ({ ...r, necesitaEl: r.necesitaEl || null, paraQue: r.paraQue })),
    // La fecha de la cabecera es la más cercana de los renglones, para ordenar la bandeja.
    paraCuando: fechaMasCercana(pedido.renglones.map((r) => ({ necesitaEl: r.necesitaEl || null }))) ?? '',
    urgente: pedido.urgente,
    // En una RQ, la cabecera guarda la nota general en el «para qué» de la 036 (RF-9).
    paraQue: pedido.nota.trim(),
    proveedorSugerido: pedido.proveedorSugerido.trim(),
    valorEstimado: pedido.valorEstimado,
  };
}

/* ── Reacomodar (RF-71) ── */

/**
 * Mueve las requisiciones de una obra que esperan en un paso que se quedó sin nadie, y anota el
 * salto (RF-71, RF-24). Idempotente: si no hay nada que mover, no escribe. La condición del
 * `update` (que siga en ese paso) evita mover dos veces la misma si dos lo llaman a la vez.
 *
 * `por` firma el evento del salto: quien cambió a la persona que dejó el paso vacío, o quien abrió
 * la lista si fue la red de seguridad. Nadie decidió el salto; el motivo dice por qué fue.
 */
export async function reacomodarLugar(lugar: LugarDeLaCadena, por: string, ocupantesYa?: OcupantesDeLaCadena): Promise<number> {
  if (!('obraId' in lugar)) return 0;
  const db = baseServidor();
  const ocupantes = ocupantesYa ?? (await ocupantesDeLaCadena(lugar));
  const enEspera = (tabla: typeof solicitudesCompra | typeof solicitudesPago) =>
    db
      .select({ id: tabla.id, estado: tabla.estado, paso: tabla.paso })
      .from(tabla)
      .where(and(eq(tabla.obraId, lugar.obraId), eq(tabla.estado, 'enviada'), isNotNull(tabla.paso)));
  const [deCompra, dePago] = await Promise.all([enEspera(solicitudesCompra), enEspera(solicitudesPago)]);
  const mover = [
    ...reacomodar(deCompra, ocupantes).map((m) => ({ ...m, tipo: 'compra' as const })),
    ...reacomodar(dePago, ocupantes).map((m) => ({ ...m, tipo: 'pago' as const })),
  ];
  if (mover.length === 0) return 0;
  const sentencias = mover.flatMap((m): Sentencia[] => {
    const eventos = eventosDeSaltos(m.saltos, por);
    if (m.tipo === 'compra') {
      return [
        db
          .update(solicitudesCompra)
          .set({ paso: m.paso, version: sql`${solicitudesCompra.version} + 1`, actualizadaEn: new Date() })
          .where(and(eq(solicitudesCompra.id, m.id), eq(solicitudesCompra.paso, m.desde))),
        db.insert(solicitudCompraEventos).values(eventos.map((e) => ({ ...e, solicitudId: m.id }))),
      ];
    }
    return [
      db
        .update(solicitudesPago)
        .set({ paso: m.paso, version: sql`${solicitudesPago.version} + 1`, actualizadaEn: new Date() })
        .where(and(eq(solicitudesPago.id, m.id), eq(solicitudesPago.paso, m.desde))),
      db.insert(solicitudPagoEventos).values(eventos.map((e) => ({ ...e, solicitudPagoId: m.id }))),
    ];
  });
  await ejecutarLote(db, sentencias);
  return mover.length;
}

/* ── La lista del lugar (RF-1 a RF-3, RF-6, RF-45, RF-49 a RF-52, RF-82, RF-83) ── */

/**
 * Las requisiciones de una obra o de GeoLab —RQ, SC y SP— en el orden de RF-45 y RF-49. Antes,
 * reacomoda la obra (RF-71): es la red de seguridad por si un cambio de persona no lo hizo.
 */
export async function requisicionesDelLugar(sesion: PersonaEnSesion, lugar: LugarDeRequisiciones): Promise<RequisicionesDelLugar> {
  const cadena = lugarDeLaCadena(lugar);
  const ocupantes = await ocupantesDeLaCadena(cadena);
  await reacomodarLugar(cadena, sesion.id, ocupantes);
  const condicionCompra = lugar.tipo === 'obra' ? eq(solicitudesCompra.obraId, lugar.obraId) : eq(solicitudesCompra.empresaId, lugar.empresaId);
  const condicionPago = lugar.tipo === 'obra' ? eq(solicitudesPago.obraId, lugar.obraId) : eq(solicitudesPago.empresaId, lugar.empresaId);
  const filas = await filasDeRequisiciones(sesion, condicionCompra, condicionPago);
  const persona = { id: sesion.id, rol: sesion.rol };
  const conMarca = filas.map((f) => ({ ...f.lista, esperaMiAprobacion: esperaMiAprobacion(f.regla, persona, ocupantes) }));
  return {
    requisiciones: ordenDeRequisiciones(
      filas.map((f, i) => ({ ...f.regla, lista: conMarca[i] })),
      (f) => f.lista.esperaMiAprobacion,
    ).map((f) => f.lista),
    sePuedePedir: alcanza(sesion.rol, 'solicitudes', 'escribir') && (lugar.tipo === 'empresa' || lugar.activa),
  };
}

/**
 * Las filas de las dos tablas que cumplen las condiciones, en las dos formas que hacen falta: la
 * de la regla (`FilaDeRequisicion`, para ordenar, marcar y decidir) y la de la respuesta. El valor,
 * solo a quien lo ve (RF-52): el estimado de una compra con `veLosValores`; el de un pago con
 * `veElValorDelPago` (el Almacenista ve el de los pagos que pidió él).
 */
export async function filasDeRequisiciones(
  sesion: PersonaEnSesion,
  condicionCompra?: SQL,
  condicionPago?: SQL,
): Promise<{ regla: FilaDeRequisicion; lista: Omit<RequisicionEnLaLista, 'esperaMiAprobacion'> & { esperaMiAprobacion: boolean } }[]> {
  const db = baseServidor();
  const [compras, pagos] = await Promise.all([
    db
      .select({
        id: solicitudesCompra.id,
        numero: solicitudesCompra.numero,
        numeroRequisicion: solicitudesCompra.numeroRequisicion,
        paso: solicitudesCompra.paso,
        empresaId: solicitudesCompra.empresaId,
        obraId: solicitudesCompra.obraId,
        obraNombre: obras.nombre,
        estado: solicitudesCompra.estado,
        urgente: solicitudesCompra.urgente,
        paraCuando: solicitudesCompra.paraCuando,
        valorEstimado: solicitudesCompra.valorEstimado,
        pedidaPorId: solicitudesCompra.pedidaPor,
        pedidaPorNombre: usuarios.nombreCompleto,
        pedidaEn: solicitudesCompra.pedidaEn,
        version: solicitudesCompra.version,
      })
      .from(solicitudesCompra)
      .innerJoin(usuarios, eq(usuarios.id, solicitudesCompra.pedidaPor))
      .leftJoin(obras, eq(obras.id, solicitudesCompra.obraId))
      .where(condicionCompra),
    db
      .select({
        id: solicitudesPago.id,
        numero: solicitudesPago.numero,
        numeroRequisicion: solicitudesPago.numeroRequisicion,
        paso: solicitudesPago.paso,
        empresaId: solicitudesPago.empresaId,
        obraId: solicitudesPago.obraId,
        obraNombre: obras.nombre,
        estado: solicitudesPago.estado,
        urgente: solicitudesPago.urgente,
        paraCuando: solicitudesPago.paraCuando,
        beneficiario: solicitudesPago.beneficiario,
        concepto: solicitudesPago.concepto,
        valor: solicitudesPago.valor,
        pedidaPorId: solicitudesPago.pedidaPor,
        pedidaPorNombre: usuarios.nombreCompleto,
        pedidaEn: solicitudesPago.pedidaEn,
        version: solicitudesPago.version,
      })
      .from(solicitudesPago)
      .innerJoin(usuarios, eq(usuarios.id, solicitudesPago.pedidaPor))
      .leftJoin(obras, eq(obras.id, solicitudesPago.obraId))
      .where(condicionPago),
  ]);

  const ids = compras.map((c) => c.id);
  const [renglones, recibidos] = ids.length
    ? await Promise.all([
        db
          .select({
            id: solicitudCompraRenglones.id,
            solicitudId: solicitudCompraRenglones.solicitudId,
            descripcion: solicitudCompraRenglones.descripcion,
            cantidad: solicitudCompraRenglones.cantidad,
            cantidadAprobada: solicitudCompraRenglones.cantidadAprobada,
            unidad: solicitudCompraRenglones.unidad,
            necesitaEl: solicitudCompraRenglones.necesitaEl,
          })
          .from(solicitudCompraRenglones)
          .where(and(inArray(solicitudCompraRenglones.solicitudId, ids), isNull(solicitudCompraRenglones.reemplazadoEn)))
          .orderBy(asc(solicitudCompraRenglones.orden)),
        db
          .select({ renglonId: recepcionesCompra.renglonId, total: sql<string>`sum(${recepcionesCompra.cantidad})` })
          .from(recepcionesCompra)
          .where(inArray(recepcionesCompra.solicitudId, ids))
          .groupBy(recepcionesCompra.renglonId),
      ])
    : [[], []];
  const recibidoDe = new Map(recibidos.map((r) => [r.renglonId, Number(r.total)]));

  const hoy = fechaDeJornada();
  const lugarDe = (f: { empresaId: string | null; obraId: string | null; obraNombre: string | null }) =>
    f.empresaId
      ? { tipo: 'empresa' as const, id: f.empresaId, nombre: nombreDeEmpresa(f.empresaId as 'geolab' | 'occ') }
      : { tipo: 'obra' as const, id: f.obraId as string, nombre: f.obraNombre ?? '' };

  const deCompra = compras.map((c) => {
    const suyos = renglones.filter((r) => r.solicitudId === c.id);
    const regla: FilaDeRequisicion = {
      tipo: 'compra',
      numero: c.numero,
      numeroRequisicion: c.numeroRequisicion,
      estado: c.estado,
      paso: c.paso as PasoDeLaCadena | null,
      urgente: c.urgente,
      paraCuando: c.paraCuando,
      pedidaPor: c.pedidaPorId,
      renglones: suyos.map((r) => ({
        necesitaEl: r.necesitaEl,
        cantidad: Number(r.cantidad),
        cantidadAprobada: r.cantidadAprobada === null ? null : Number(r.cantidadAprobada),
        recibido: recibidoDe.get(r.id) ?? 0,
      })),
    };
    const lista: Omit<RequisicionEnLaLista, 'esperaMiAprobacion'> & { esperaMiAprobacion: boolean } = {
      tipo: 'compra',
      id: c.id,
      codigo: numeroQueSeVe(regla),
      numero: c.numero,
      numeroRequisicion: c.numeroRequisicion,
      estado: c.estado,
      estadoQueSeVe: estadoQueSeVe(regla),
      paso: regla.paso,
      lugar: lugarDe(c),
      urgente: c.urgente,
      paraCuando: c.paraCuando,
      resumen: suyos.map((r) => `${Number(r.cantidad).toLocaleString('es-CO')} ${r.unidad} ${r.descripcion}`).join(' · '),
      pedidaPor: { id: c.pedidaPorId, nombre: c.pedidaPorNombre },
      pedidaEn: c.pedidaEn.toISOString(),
      pedidaEl: fechaDeJornada(c.pedidaEn.getTime()),
      marcas: marcasDeLaRequisicion(regla, hoy),
      esperaMiAprobacion: false,
      version: c.version,
    };
    // RF-52: para el Almacenista el campo no existe.
    if (veLosValores(sesion.rol)) lista.valor = c.valorEstimado;
    return { regla, lista };
  });

  const dePago = pagos.map((p) => {
    const regla: FilaDeRequisicion = {
      tipo: 'pago',
      numero: p.numero,
      numeroRequisicion: p.numeroRequisicion,
      estado: p.estado,
      paso: p.paso as PasoDeLaCadena | null,
      urgente: p.urgente,
      paraCuando: p.paraCuando,
      pedidaPor: p.pedidaPorId,
    };
    const lista: Omit<RequisicionEnLaLista, 'esperaMiAprobacion'> & { esperaMiAprobacion: boolean } = {
      tipo: 'pago',
      id: p.id,
      codigo: numeroQueSeVe(regla),
      numero: p.numero,
      numeroRequisicion: p.numeroRequisicion,
      estado: p.estado,
      estadoQueSeVe: estadoQueSeVe(regla),
      paso: regla.paso,
      lugar: lugarDe(p),
      urgente: p.urgente,
      paraCuando: p.paraCuando,
      resumen: `${p.beneficiario} · ${nombreDeConcepto(p.concepto)}`,
      pedidaPor: { id: p.pedidaPorId, nombre: p.pedidaPorNombre },
      pedidaEn: p.pedidaEn.toISOString(),
      pedidaEl: fechaDeJornada(p.pedidaEn.getTime()),
      marcas: marcasDeLaRequisicion(regla, hoy),
      esperaMiAprobacion: false,
      version: p.version,
    };
    // RF-52: el Almacenista ve el valor de los pagos que pidió él (037, RF-5a).
    if (veElValorDelPago(sesion.rol, p.pedidaPorId, sesion.id)) lista.valor = p.valor;
    return { regla, lista };
  });

  return [...deCompra, ...dePago];
}

/* ── Decidir en un paso (RF-25 a RF-34, RF-67, RF-68, RF-76 a RF-81) ── */

export const MENSAJE_DE_REQUISICION_CAMBIADA = 'La requisición cambió mientras tanto; vuelva a cargarla.';

/**
 * Aprueba, devuelve o rechaza una requisición en su paso. Quién puede lo dice
 * `porQueNoPuedeDecidir` con los ocupantes del lugar; qué pasa después, `trasLaDecision`. Cambiar
 * lo pedido al aprobar solo lo acepta de la Administradora en su paso o de la Gerencia (RF-34,
 * RF-79, RF-80), y solo cuando la aprobación es la última: la cantidad aprobada y el valor aprobado
 * son de la 036 y la 037, y valen desde que la requisición queda Aprobada.
 *
 * La versión es la condición del `update` (`tomarLaVersion`): si dos deciden a la vez, la segunda
 * recibe 409 con quién decidió antes (RF-68, 040/RF-9).
 */
export async function decidirRequisicion(
  sesion: PersonaEnSesion,
  tipo: TipoDeRequisicion,
  id: string,
  pedido: DecisionDeRequisicion,
): Promise<{ estado: string; paso: PasoDeLaCadena | null; version: number } | Response> {
  const fila = tipo === 'compra' ? await solicitudAlAlcance(sesion, id) : await solicitudDePagoAlAlcance(sesion, id);
  if (!fila) return noEncontrado('esa requisición');
  if (fila.numeroRequisicion === null) {
    return errorDePeticion('Esta es una solicitud anterior: se aprueba con sus pasos de siempre, desde la bandeja de Elemental.', 409);
  }
  const lugar: LugarDeLaCadena = fila.obraId ? { obraId: fila.obraId } : { empresa: fila.empresaId === 'occ' ? 'occ' : 'geolab' };
  const ocupantes = await ocupantesDeLaCadena(lugar);
  const paso = fila.paso as PasoDeLaCadena | null;
  const conflicto = (mensaje: string) =>
    tipo === 'compra'
      ? conflictoDeSolicitudDeCompra(id, pedido.decision, sesion.id, mensaje)
      : conflictoDeSolicitudDePago(id, pedido.decision, sesion.id, mensaje);

  // Si cambió desde que se vio, eso primero: quien llega tarde a un paso que ya pasó tiene que
  // saber que otro decidió, no que «no es su paso» (RF-68).
  if (fila.version !== pedido.version) return conflicto(MENSAJE_DE_REQUISICION_CAMBIADA);
  const rechazo = porQueNoPuedeDecidir(sesion, { estado: fila.estado, paso, pedidaPor: fila.pedidaPor }, ocupantes);
  if (rechazo?.estado === 409) return conflicto(rechazo.mensaje);
  if (rechazo) return errorDePeticion(rechazo.mensaje, rechazo.estado);
  const faltaMotivo = faltaDelMotivoDeLaDecision(pedido.decision, pedido.motivo);
  if (faltaMotivo) return errorDePeticion(faltaMotivo, 422);

  const pasoActual = paso as PasoDeLaCadena;
  const despues = trasLaDecision(pedido.decision, sesion, pasoActual, ocupantes);
  const queda = despues.estado === 'aprobada';
  const db = baseServidor();
  const eventoDeLaDecision = {
    id: uuidv7(),
    // En un paso intermedio aprobar es pasar al siguiente: se anota aparte de la aprobación final.
    paso: pedido.decision === 'aprobar' && !queda ? 'aprobar_paso' : pedido.decision,
    motivo: pedido.motivo.trim() || null,
    por: sesion.id,
  };
  const saltos = eventosDeSaltos(despues.saltos, sesion.id);

  if (tipo === 'compra') {
    // RF-34, RF-80: solo la Administradora en su paso o la Gerencia cambian lo pedido.
    const renglones = await db
      .select()
      .from(solicitudCompraRenglones)
      .where(and(eq(solicitudCompraRenglones.solicitudId, id), isNull(solicitudCompraRenglones.reemplazadoEn)));
    const recorta = pedido.cantidades.some((c) => {
      const r = renglones.find((x) => x.id === c.renglonId);
      return !r || Number(r.cantidad) !== c.cantidad;
    });
    if (recorta && !puedeRecortar(sesion, pasoActual)) return errorDePeticion(NO_RECORTA, 422);
    let aprobacion: ReturnType<typeof aprobacionDeLaSolicitud> | null = null;
    if (queda) {
      aprobacion = aprobacionDeLaSolicitud(
        renglones.map((r) => ({ id: r.id, orden: r.orden, descripcion: r.descripcion, cantidad: Number(r.cantidad) })),
        pedido.cantidades,
      );
      // RF-81: quitarlo todo no vale; para eso se rechaza.
      if (aprobacion.faltas.length) return Response.json({ error: aprobacion.faltas[0], faltas: aprobacion.faltas }, { status: 422 });
    }
    if (!(await tomarLaVersion(id, pedido.version, { estado: despues.estado, paso: despues.paso }))) {
      return conflicto(MENSAJE_DE_REQUISICION_CAMBIADA);
    }
    const aprobadas = aprobacion
      ? Object.entries(aprobacion.aprobadas).map(([renglonId, cantidad]) =>
          db.update(solicitudCompraRenglones).set({ cantidadAprobada: String(cantidad) }).where(eq(solicitudCompraRenglones.id, renglonId)),
        )
      : [];
    await ejecutarLote(db, [
      db.insert(solicitudCompraEventos).values([
        { ...eventoDeLaDecision, solicitudId: id, cambios: [{ paso: pasoActual, siguiente: despues.paso }, ...(aprobacion?.cambios ?? [])] },
        ...saltos.map((e) => ({ ...e, solicitudId: id })),
      ]),
      ...aprobadas,
    ]);
  } else {
    const filaDePago = fila as typeof solicitudesPago.$inferSelect;
    const recorta = pedido.valorAprobado !== null && pedido.valorAprobado !== filaDePago.valor;
    if (recorta && !puedeRecortar(sesion, pasoActual)) return errorDePeticion(NO_RECORTA, 422);
    let valorAprobado: number | null = null;
    let cambios: unknown[] = [];
    if (queda) {
      const aprobacion = aprobacionDelPago(filaDePago.valor, pedido.valorAprobado);
      if (aprobacion.falta) return errorDePeticion(aprobacion.falta, 422);
      valorAprobado = aprobacion.aprobado;
      if (valorAprobado !== filaDePago.valor) cambios = [{ antes: filaDePago.valor, despues: valorAprobado }];
    }
    if (
      !(await tomarLaVersionDelPago(id, pedido.version, {
        estado: despues.estado,
        paso: despues.paso,
        ...(valorAprobado !== null ? { valorAprobado } : {}),
      }))
    ) {
      return conflicto(MENSAJE_DE_REQUISICION_CAMBIADA);
    }
    await db.insert(solicitudPagoEventos).values([
      { ...eventoDeLaDecision, solicitudPagoId: id, cambios: [{ paso: pasoActual, siguiente: despues.paso }, ...cambios] },
      ...saltos.map((e) => ({ ...e, solicitudPagoId: id })),
    ]);
  }
  return { estado: despues.estado, paso: despues.paso, version: pedido.version + 1 };
}

/** Lo que llega a decidir, ya leído por el contrato (`decisionPedida`). */
export interface DecisionDeRequisicion {
  decision: Decision;
  version: number;
  motivo: string;
  cantidades: { renglonId: string; cantidad: number }[];
  valorAprobado: number | null;
}

/** El 409 de quien llega tarde: si otra persona ya decidió, quién fue (040/RF-9). */
async function conflictoDeSolicitudDeCompra(id: string, paso: string, yo: string, mensaje: string): Promise<Response> {
  const [ultimo] = await baseServidor()
    .select({ paso: solicitudCompraEventos.paso, porId: solicitudCompraEventos.por, nombre: usuarios.nombreCompleto })
    .from(solicitudCompraEventos)
    .innerJoin(usuarios, eq(usuarios.id, solicitudCompraEventos.por))
    .where(eq(solicitudCompraEventos.solicitudId, id))
    .orderBy(desc(solicitudCompraEventos.en))
    .limit(1);
  return errorDePeticion(yaLaDecidioOtro(paso, ultimoComoDecision(ultimo), yo) ?? mensaje, 409);
}

async function conflictoDeSolicitudDePago(id: string, paso: string, yo: string, mensaje: string): Promise<Response> {
  const [ultimo] = await baseServidor()
    .select({ paso: solicitudPagoEventos.paso, porId: solicitudPagoEventos.por, nombre: usuarios.nombreCompleto })
    .from(solicitudPagoEventos)
    .innerJoin(usuarios, eq(usuarios.id, solicitudPagoEventos.por))
    .where(eq(solicitudPagoEventos.solicitudPagoId, id))
    .orderBy(desc(solicitudPagoEventos.en))
    .limit(1);
  return errorDePeticion(yaLaDecidioOtro(paso, ultimoComoDecision(ultimo), yo) ?? mensaje, 409);
}

/** «Aprobó en su paso» también es haberla decidido, para decirle a quién llega tarde quién fue. */
function ultimoComoDecision(ultimo: { paso: string; porId: string; nombre: string } | undefined) {
  if (!ultimo) return null;
  return ultimo.paso === 'aprobar_paso' ? { ...ultimo, paso: 'aprobar' } : ultimo;
}

/**
 * Reacomoda todas las obras que tienen requisiciones esperando en un paso que no es el de la
 * Administradora (RF-71). Lo llaman las rutas que pueden dejar un paso sin nadie —corregir o dar
 * de baja a una persona, quitarle obras a un Director de Obra, retirarla en Recursos Humanos—,
 * después de su propio lote. Es más simple que averiguar qué obras tocó cada cambio, y es barato:
 * solo mira las obras con algo en la cadena, y cada una no escribe si no hay nada que mover.
 */
export async function reacomodarTodo(por: string): Promise<number> {
  const db = baseServidor();
  const enCadena = (tabla: typeof solicitudesCompra | typeof solicitudesPago) =>
    db
      .selectDistinct({ obraId: tabla.obraId })
      .from(tabla)
      .where(and(eq(tabla.estado, 'enviada'), isNotNull(tabla.paso), ne(tabla.paso, 'administradora'), isNotNull(tabla.obraId)));
  const [c, p] = await Promise.all([enCadena(solicitudesCompra), enCadena(solicitudesPago)]);
  const obrasEnCadena = [...new Set([...c, ...p].map((f) => f.obraId as string))];
  let movidas = 0;
  for (const obraId of obrasEnCadena) movidas += await reacomodarLugar({ obraId }, por);
  return movidas;
}

/* ── Requisiciones de Elemental (RF-47, RF-48, RF-55, RF-75, RF-83, RF-89 a RF-92) ── */

/**
 * Las requisiciones de todo el grupo, de compra y de pago: desde el cambio del 2026-11-17 este
 * módulo absorbió Compras (RF-90, RF-91), así que trae también las aprobadas por comprar, las
 * compradas y las cerradas, y no solo las que esperan el último paso. Arriba, las que esperan a
 * quien mira; luego las abiertas y al final las cerradas, como la lista de un lugar (RF-49). El
 * resumen sigue contando solo lo que espera el último paso (RF-48, `esperaElUltimoPaso`).
 * `sinAdministradora` avisa a la Gerencia que esas la esperan a ella (RF-75).
 */
export async function bandejaDeRequisiciones(sesion: PersonaEnSesion): Promise<BandejaDeRequisiciones> {
  const [filas, ocupantes] = await Promise.all([
    filasDeRequisiciones(sesion),
    // Solo cuenta el paso de la Administradora, que es el mismo en todo el grupo.
    ocupantesDeLaCadena({ empresa: 'geolab' }),
  ]);
  const persona = { id: sesion.id, rol: sesion.rol };
  const conMarca = filas.map((f) => {
    const lista = { ...f.lista, esperaMiAprobacion: esperaMiAprobacion(f.regla, persona, ocupantes) };
    // RF-83: las SC y SP de OCC anteriores al cambio llevan «OCC»; las RQ de OCC no llevan marca.
    if (f.lista.lugar.tipo === 'empresa' && f.lista.lugar.id === 'occ' && !esRequisicion(f.regla)) {
      lista.marcas = [...lista.marcas.filter((m) => m !== 'Anterior'), 'OCC'];
    }
    return { regla: f.regla, lista };
  });
  return {
    requisiciones: ordenDeRequisiciones(
      conMarca.map((f) => ({ ...f.regla, lista: f.lista })),
      (f) => f.lista.esperaMiAprobacion,
    ).map((f) => f.lista),
    resumen: resumenDeRequisiciones(conMarca.map((f) => f.regla).filter(esperaElUltimoPaso)),
    sinAdministradora: ocupantes.administradora.length === 0,
  };
}
