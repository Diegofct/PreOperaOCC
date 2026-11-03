/**
 * Los pagos (spec 037, RF-13 a RF-18). **Solo servidor.**
 *
 * Un pago es de una solicitud de pago o de una compra de la spec 036. Nunca se paga de más
 * (`faltasDelPago`) ni se pisan dos pagos a la vez:
 *  · en una solicitud, el pago toma la versión de la solicitud, como cada paso;
 *  · en una compra, que no tiene versión, el pago se inserta con una sola sentencia que
 *    revisa lo ya pagado, en una transacción serializable (`registrarPagoDeCompra`).
 *
 * Un pago no se edita: se anula con motivo (RF-16), y la solicitud vuelve al estado que le
 * toca (`estadoTrasPagos`).
 */
import { and, asc, eq, gte, isNull, lte, sql } from 'drizzle-orm';
import { uuidv7 } from 'uuidv7';

import { baseServidor, baseServidorSerializable } from '@/db/servidor/cliente';
import {
  compras,
  documentosDelGrupo,
  obras,
  pagos,
  solicitudesCompra,
  solicitudesPago,
  solicitudPagoEventos,
} from '@/db/servidor/esquema';
import { solicitudAlAlcance } from '@/features/compras/servidor/solicitudes';
import type { BandejaDeTesoreria, CompraPorPagar, PagosDelRango } from '@/features/panel/contratos';
import type { PersonaEnSesion } from '@/features/servidor/guardia';
import { conReintentoSiChoca, errorDePeticion, noEncontrado } from '@/features/servidor/respuestas';
import { numeroDeSolicitud } from '@/shared/rules/compras';
import { nombreDeEmpresa, type EmpresaId } from '@/shared/rules/empresas';
import {
  estadoTrasPagos,
  faltaDelMotivoDePago,
  faltasDelPago,
  numeroDePago,
  ordenDeLaBandejaDePagos,
  pagoDeLaCompra,
  pasaLosFiltrosDePago,
  porQueNoPuedeDarPaso,
  resumenDeLaBandejaDePagos,
  type DatosDelPago,
  type EstadoDePago,
  type FiltrosDeLaBandejaDePagos,
  type PagoDeLaCompra,
} from '@/shared/rules/pagos';
import { alcanza, motivoDeRechazo } from '@/shared/rules/permisos';
import { enPesos } from '@/shared/rules/pesos';

import {
  listarSolicitudesDePago,
  MENSAJE_DE_PAGO_CAMBIADO,
  solicitudDePagoAlAlcance,
  tomarLaVersionDelPago,
} from './solicitudes-pago';

/** Lo pagado sin anular de una solicitud. */
async function pagadoDeLaSolicitud(id: string): Promise<number> {
  const filas = await baseServidor()
    .select({ valor: pagos.valor })
    .from(pagos)
    .where(and(eq(pagos.solicitudPagoId, id), isNull(pagos.anuladoEn)));
  return filas.reduce((suma, p) => suma + p.valor, 0);
}

/** ¿El comprobante es un documento vigente de ese dueño? */
export async function comprobanteValido(documentoId: string, de: { solicitudPagoId: string } | { solicitudCompraId: string }) {
  const [documento] = await baseServidor()
    .select({ id: documentosDelGrupo.id })
    .from(documentosDelGrupo)
    .where(
      and(
        eq(documentosDelGrupo.id, documentoId),
        'solicitudPagoId' in de
          ? eq(documentosDelGrupo.solicitudPagoId, de.solicitudPagoId)
          : eq(documentosDelGrupo.solicitudId, de.solicitudCompraId),
        isNull(documentosDelGrupo.anuladoEn),
      ),
    )
    .limit(1);
  return Boolean(documento);
}

export interface PagoPedidoAlServidor extends DatosDelPago {
  version?: number;
  documentoId: string | null;
}

/**
 * Registra un pago de una solicitud aprobada (RF-13 a RF-15): solo la gerencia, y nunca más
 * de lo que falta. Después de tomar la versión, el pago y el evento van juntos.
 */
export async function registrarPagoDeSolicitud(
  sesion: PersonaEnSesion,
  id: string,
  pedido: PagoPedidoAlServidor,
): Promise<{ pagoId: string; estado: EstadoDePago; version: number } | Response> {
  const fila = await solicitudDePagoAlAlcance(sesion, id);
  if (!fila) return noEncontrado('esa solicitud');
  const rechazo = porQueNoPuedeDarPaso('registrar_pago', sesion, fila);
  if (rechazo) return errorDePeticion(rechazo.mensaje, rechazo.estado);
  if (pedido.version === undefined || fila.version !== pedido.version) {
    return errorDePeticion(MENSAJE_DE_PAGO_CAMBIADO, 409);
  }

  const aprobado = fila.valorAprobado ?? fila.valor;
  const pagado = await pagadoDeLaSolicitud(id);
  const faltas = faltasDelPago(pedido, aprobado - pagado);
  if (pedido.documentoId && !(await comprobanteValido(pedido.documentoId, { solicitudPagoId: id }))) {
    faltas.push('El comprobante no es de esta solicitud.');
  }
  if (faltas.length) return Response.json({ error: faltas[0], faltas }, { status: 422 });

  const estado = estadoTrasPagos(aprobado, pagado + pedido.valor);
  if (!(await tomarLaVersionDelPago(id, pedido.version, { estado }))) {
    return errorDePeticion(MENSAJE_DE_PAGO_CAMBIADO, 409);
  }
  const pagoId = uuidv7();
  const db = baseServidor();
  await db.batch([
    db.insert(pagos).values({
      id: pagoId,
      solicitudPagoId: id,
      fecha: pedido.fecha,
      valor: pedido.valor,
      medio: pedido.medio,
      referencia: pedido.referencia.trim(),
      documentoId: pedido.documentoId,
      registradoPor: sesion.id,
    }),
    db.insert(solicitudPagoEventos).values({
      id: uuidv7(),
      solicitudPagoId: id,
      paso: 'registrar_pago',
      cambios: [{ pagoId, valor: pedido.valor, medio: pedido.medio }],
      por: sesion.id,
    }),
  ]);
  return { pagoId, estado, version: pedido.version + 1 };
}

/**
 * Anula un pago con su motivo (RF-16): solo la gerencia. El pago se queda, marcado. Si es de
 * una solicitud, toma su versión y la devuelve al estado que le toca; si es de una compra, la
 * compra vuelve a Compras por pagar.
 */
export async function anularPago(
  sesion: PersonaEnSesion,
  pagoId: string,
  pedido: { version?: number; motivo: string },
): Promise<{ estado: string; version?: number } | Response> {
  const [pago] = await baseServidor().select().from(pagos).where(eq(pagos.id, pagoId)).limit(1);
  if (!pago) return noEncontrado('ese pago');
  if (pago.compraId) return anularPagoDeCompra(sesion, pago, pedido.motivo);

  const fila = await solicitudDePagoAlAlcance(sesion, pago.solicitudPagoId as string);
  if (!fila) return noEncontrado('ese pago');
  const rechazo = porQueNoPuedeDarPaso('anular_pago', sesion, fila);
  if (rechazo) return errorDePeticion(rechazo.mensaje, rechazo.estado);
  if (pago.anuladoEn) return errorDePeticion('Ese pago ya está anulado.', 409);
  if (pedido.version === undefined || fila.version !== pedido.version) {
    return errorDePeticion(MENSAJE_DE_PAGO_CAMBIADO, 409);
  }
  const faltaMotivo = faltaDelMotivoDePago('anular_pago', pedido.motivo);
  if (faltaMotivo) return errorDePeticion(faltaMotivo, 422);

  const aprobado = fila.valorAprobado ?? fila.valor;
  const estado = estadoTrasPagos(aprobado, (await pagadoDeLaSolicitud(fila.id)) - pago.valor);
  if (!(await tomarLaVersionDelPago(fila.id, pedido.version, { estado }))) {
    return errorDePeticion(MENSAJE_DE_PAGO_CAMBIADO, 409);
  }
  const motivo = pedido.motivo.trim();
  const db = baseServidor();
  await db.batch([
    db
      .update(pagos)
      .set({ anuladoEn: new Date(), anuladoPor: sesion.id, motivoAnulacion: motivo })
      .where(and(eq(pagos.id, pagoId), isNull(pagos.anuladoEn))),
    db.insert(solicitudPagoEventos).values({
      id: uuidv7(),
      solicitudPagoId: fila.id,
      paso: 'anular_pago',
      motivo,
      cambios: [{ pagoId, valor: pago.valor }],
      por: sesion.id,
    }),
  ]);
  return { estado, version: pedido.version + 1 };
}

/* ── Pagos de compras (T10) ─────────────────────────────────────────────── */

/** La compra vigente que se paga, con su solicitud, si quien paga la alcanza. */
async function compraParaPagar(sesion: PersonaEnSesion, compraId: string) {
  const [compra] = await baseServidor().select().from(compras).where(eq(compras.id, compraId)).limit(1);
  if (!compra || !(await solicitudAlAlcance(sesion, compra.solicitudId))) return null;
  return compra;
}

/** Lo pagado sin anular de una compra. */
async function pagadoDeLaCompra(compraId: string): Promise<number> {
  const filas = await baseServidor()
    .select({ valor: pagos.valor })
    .from(pagos)
    .where(and(eq(pagos.compraId, compraId), isNull(pagos.anuladoEn)));
  return filas.reduce((suma, p) => suma + p.valor, 0);
}

/**
 * Registra un pago de una compra de la spec 036 (RF-17, RF-18): solo la gerencia, sin
 * solicitud de pago aparte (D4), y nunca más de lo que falta.
 *
 * La compra no tiene versión, así que dos pagos a la vez se cuidan como los movimientos
 * del Almacén (009): **una sola sentencia** que suma lo ya pagado y solo inserta si cabe, en
 * una transacción serializable. Si otro pago entró al mismo tiempo, Postgres aborta una de
 * las dos, se repite una vez (`conReintentoSiChoca`), y la repetida ya ve el otro pago: si
 * no cabe, 409 con lo que falta.
 */
export async function registrarPagoDeCompra(
  sesion: PersonaEnSesion,
  compraId: string,
  pedido: PagoPedidoAlServidor,
): Promise<{ pagoId: string; pago: PagoDeLaCompra } | Response> {
  if (!alcanza(sesion.rol, 'tesoreria', 'escribir')) {
    return errorDePeticion(motivoDeRechazo('tesoreria', 'escribir'), 403);
  }
  const compra = await compraParaPagar(sesion, compraId);
  if (!compra) return noEncontrado('esa compra');
  if (compra.anuladaEn) return errorDePeticion('Esa compra está anulada: no se paga.', 409);

  const faltas = faltasDelPago(pedido, compra.valor - (await pagadoDeLaCompra(compraId)));
  if (pedido.documentoId && !(await comprobanteValido(pedido.documentoId, { solicitudCompraId: compra.solicitudId }))) {
    faltas.push('El comprobante no es de la solicitud de esta compra.');
  }
  if (faltas.length) return Response.json({ error: faltas[0], faltas }, { status: 422 });

  const pagoId = uuidv7();
  const insertado = await conReintentoSiChoca(() =>
    baseServidorSerializable().execute(sql`
      insert into pagos (id, compra_id, fecha, valor, medio, referencia, documento_id, registrado_por)
      select ${pagoId}, c.id, ${pedido.fecha}, ${pedido.valor}, ${pedido.medio}, ${pedido.referencia.trim()},
             ${pedido.documentoId}, ${sesion.id}
      from compras c
      where c.id = ${compraId} and c.anulada_en is null
        and (select coalesce(sum(p.valor), 0) from pagos p where p.compra_id = c.id and p.anulado_en is null)
            + ${pedido.valor} <= c.valor
      returning id`),
  );
  const pagado = await pagadoDeLaCompra(compraId);
  if (insertado.rows.length === 0) {
    return errorDePeticion(`Otro pago de esta compra se registró al mismo tiempo: faltan ${enPesos(compra.valor - pagado)}.`, 409);
  }
  return { pagoId, pago: pagoDeLaCompra(compra.valor, pagado) };
}

/** Anula el pago de una compra (RF-16, RF-18): solo la gerencia, con motivo. */
async function anularPagoDeCompra(
  sesion: PersonaEnSesion,
  pago: typeof pagos.$inferSelect,
  motivo: string,
): Promise<{ estado: PagoDeLaCompra } | Response> {
  const compra = await compraParaPagar(sesion, pago.compraId as string);
  if (!compra) return noEncontrado('ese pago');
  if (!alcanza(sesion.rol, 'tesoreria', 'anular')) return errorDePeticion(motivoDeRechazo('tesoreria', 'anular'), 403);
  if (pago.anuladoEn) return errorDePeticion('Ese pago ya está anulado.', 409);
  const faltaMotivo = faltaDelMotivoDePago('anular_pago', motivo);
  if (faltaMotivo) return errorDePeticion(faltaMotivo, 422);

  const [anulado] = await baseServidor()
    .update(pagos)
    .set({ anuladoEn: new Date(), anuladoPor: sesion.id, motivoAnulacion: motivo.trim() })
    .where(and(eq(pagos.id, pago.id), isNull(pagos.anuladoEn)))
    .returning({ id: pagos.id });
  if (!anulado) return errorDePeticion('Ese pago ya está anulado.', 409);
  return { estado: pagoDeLaCompra(compra.valor, await pagadoDeLaCompra(compra.id)) };
}

/**
 * Compras por pagar (RF-17): las compras vigentes de la 036 que no están pagadas del todo,
 * con su solicitud, su lugar, lo pagado y lo que falta; la más antigua primero.
 */
export async function comprasPorPagar(): Promise<CompraPorPagar[]> {
  const filas = await baseServidor()
    .select({
      id: compras.id,
      solicitudId: compras.solicitudId,
      numero: solicitudesCompra.numero,
      empresaId: solicitudesCompra.empresaId,
      obraId: solicitudesCompra.obraId,
      obraNombre: obras.nombre,
      proveedor: compras.proveedor,
      valor: compras.valor,
      fecha: compras.fecha,
      factura: compras.factura,
      pagado: sql<string>`coalesce((select sum(p.valor) from pagos p where p.compra_id = ${compras.id} and p.anulado_en is null), 0)`,
    })
    .from(compras)
    .innerJoin(solicitudesCompra, eq(solicitudesCompra.id, compras.solicitudId))
    .leftJoin(obras, eq(obras.id, solicitudesCompra.obraId))
    .where(isNull(compras.anuladaEn))
    .orderBy(asc(compras.fecha), asc(compras.registradaEn));
  return filas
    .map((f) => ({
      id: f.id,
      solicitudId: f.solicitudId,
      codigoSolicitud: numeroDeSolicitud(f.numero),
      lugar: f.empresaId
        ? { tipo: 'empresa' as const, id: f.empresaId, nombre: nombreDeEmpresa(f.empresaId) }
        : { tipo: 'obra' as const, id: f.obraId as string, nombre: f.obraNombre ?? '' },
      proveedor: f.proveedor,
      valor: f.valor,
      fecha: f.fecha,
      factura: f.factura,
      pagado: Number(f.pagado),
      porPagar: f.valor - Number(f.pagado),
    }))
    .filter((c) => c.porPagar > 0);
}

/* ── La bandeja y los pagos (T12) ───────────────────────────────────────── */

/**
 * Tesorería de Elemental (RF-3, RF-10, RF-22): las solicitudes de pago de todo el grupo que
 * pasan los filtros, en el orden de la bandeja, y el resumen de **todo** el grupo, que no
 * cambia al filtrar.
 */
export async function bandejaDeTesoreria(
  sesion: PersonaEnSesion,
  filtros: FiltrosDeLaBandejaDePagos,
): Promise<BandejaDeTesoreria> {
  const todas = await listarSolicitudesDePago(sesion);
  return {
    solicitudes: ordenDeLaBandejaDePagos(todas.filter((s) => pasaLosFiltrosDePago(s, filtros))),
    resumen: resumenDeLaBandejaDePagos(todas.map((s) => ({ ...s, valorAprobado: s.valorAprobado ?? null, pagado: s.pagado ?? 0 }))),
    total: todas.length,
  };
}

/**
 * Los pagos vigentes del grupo entre dos fechas de pago (RF-23): de solicitudes y de
 * compras, cada uno con su lugar y su origen, del más reciente al más antiguo, con el total
 * por lugar y el del rango. Un pago de una compra que después se anuló sigue contando y se
 * marca (caso límite: el reintegro se gestiona fuera).
 */
export async function pagosDelRango(rango: { desde: string; hasta: string }): Promise<PagosDelRango> {
  const db = baseServidor();
  const dentro = and(isNull(pagos.anuladoEn), gte(pagos.fecha, rango.desde), lte(pagos.fecha, rango.hasta));
  const [deSolicitudes, deCompras] = await Promise.all([
    db
      .select({
        id: pagos.id,
        fecha: pagos.fecha,
        valor: pagos.valor,
        medio: pagos.medio,
        referencia: pagos.referencia,
        solicitudId: solicitudesPago.id,
        numero: solicitudesPago.numero,
        quien: solicitudesPago.beneficiario,
        empresaId: solicitudesPago.empresaId,
        obraId: solicitudesPago.obraId,
        obraNombre: obras.nombre,
      })
      .from(pagos)
      .innerJoin(solicitudesPago, eq(solicitudesPago.id, pagos.solicitudPagoId))
      .leftJoin(obras, eq(obras.id, solicitudesPago.obraId))
      .where(dentro),
    db
      .select({
        id: pagos.id,
        fecha: pagos.fecha,
        valor: pagos.valor,
        medio: pagos.medio,
        referencia: pagos.referencia,
        solicitudId: compras.solicitudId,
        numero: solicitudesCompra.numero,
        quien: compras.proveedor,
        compraAnulada: compras.anuladaEn,
        empresaId: solicitudesCompra.empresaId,
        obraId: solicitudesCompra.obraId,
        obraNombre: obras.nombre,
      })
      .from(pagos)
      .innerJoin(compras, eq(compras.id, pagos.compraId))
      .innerJoin(solicitudesCompra, eq(solicitudesCompra.id, compras.solicitudId))
      .leftJoin(obras, eq(obras.id, solicitudesCompra.obraId))
      .where(dentro),
  ]);

  const lugarDe = (f: { empresaId: string | null; obraId: string | null; obraNombre: string | null }) =>
    f.empresaId
      ? { tipo: 'empresa' as const, id: f.empresaId, nombre: nombreDeEmpresa(f.empresaId as EmpresaId) }
      : { tipo: 'obra' as const, id: f.obraId as string, nombre: f.obraNombre ?? '' };
  const lista: PagosDelRango['pagos'] = [
    ...deSolicitudes.map((f) => ({
      id: f.id,
      fecha: f.fecha,
      valor: f.valor,
      medio: f.medio,
      referencia: f.referencia,
      lugar: lugarDe(f),
      origen: { tipo: 'solicitud' as const, id: f.solicitudId, codigo: numeroDePago(f.numero), quien: f.quien, compraAnulada: false },
    })),
    ...deCompras.map((f) => ({
      id: f.id,
      fecha: f.fecha,
      valor: f.valor,
      medio: f.medio,
      referencia: f.referencia,
      lugar: lugarDe(f),
      origen: { tipo: 'compra' as const, id: f.solicitudId, codigo: numeroDeSolicitud(f.numero), quien: f.quien, compraAnulada: f.compraAnulada !== null },
    })),
  ].sort((a, b) => (a.fecha === b.fecha ? 0 : a.fecha < b.fecha ? 1 : -1));

  const porLugar = new Map<string, PagosDelRango['lugares'][number]>();
  for (const p of lista) {
    const fila = porLugar.get(p.lugar.id) ?? { lugar: p.lugar, total: 0, pagos: 0 };
    fila.total += p.valor;
    fila.pagos += 1;
    porLugar.set(p.lugar.id, fila);
  }
  return {
    ...rango,
    pagos: lista,
    lugares: [...porLugar.values()].sort((a, b) => b.total - a.total),
    total: lista.reduce((suma, p) => suma + p.valor, 0),
  };
}
