/**
 * Las compras de una solicitud (spec 036, RF-16 a RF-19, RF-30). **Solo servidor.**
 *
 * La gerencia registra a qué proveedor se le compró, por cuánto, cuándo y qué renglones
 * cubre; una solicitud puede quedar en varias compras (dos proveedores), y un renglón va en
 * una sola compra vigente. Una compra no se edita: se anula con motivo y sus renglones
 * quedan libres. Cada cosa mueve la versión de la solicitud, así que dos a la vez no se
 * pisan, y el estado lo recalcula `estadoTrasComprasYRecibos`.
 *
 * La historia guarda el proveedor y los renglones, **no el valor**: la historia la ve también
 * el almacenista, y él no ve valores (RF-31).
 */
import { and, asc, eq, isNull } from 'drizzle-orm';
import { uuidv7 } from 'uuidv7';

import { baseServidor } from '@/db/servidor/cliente';
import {
  compraRenglones,
  compras,
  documentosDelGrupo,
  recepcionesCompra,
  solicitudCompraEventos,
  solicitudCompraRenglones,
} from '@/db/servidor/esquema';
import type { PersonaEnSesion } from '@/features/servidor/guardia';
import { errorDePeticion, noEncontrado } from '@/features/servidor/respuestas';
import {
  estadoTrasComprasYRecibos,
  faltaDelMotivo,
  faltasDeLaCompra,
  faltasDelRecibo,
  porQueNoPuedeDar,
  type DatosDeLaCompra,
  type EstadoDeSolicitud,
  type ReciboPedido,
} from '@/shared/rules/compras';

import { MENSAJE_DE_SOLICITUD_CAMBIADA, solicitudAlAlcance, tomarLaVersion } from './solicitudes';

/** Cada renglón con lo que ya le pasó: su compra vigente, si la tiene, y lo recibido. */
async function renglonesConComprasYRecibos(solicitudId: string) {
  const db = baseServidor();
  const [renglones, enlaces, recibos] = await Promise.all([
    db
      .select()
      .from(solicitudCompraRenglones)
      .where(eq(solicitudCompraRenglones.solicitudId, solicitudId))
      .orderBy(asc(solicitudCompraRenglones.orden)),
    db
      .select({ renglonId: compraRenglones.renglonId, compraId: compraRenglones.compraId })
      .from(compraRenglones)
      .innerJoin(compras, eq(compras.id, compraRenglones.compraId))
      .where(and(eq(compras.solicitudId, solicitudId), isNull(compras.anuladaEn))),
    db
      .select({ renglonId: recepcionesCompra.renglonId, cantidad: recepcionesCompra.cantidad })
      .from(recepcionesCompra)
      .where(eq(recepcionesCompra.solicitudId, solicitudId)),
  ]);
  return renglones.map((r) => ({
    id: r.id,
    orden: r.orden,
    cantidadAprobada: r.cantidadAprobada === null ? null : Number(r.cantidadAprobada),
    compraId: enlaces.find((e) => e.renglonId === r.id)?.compraId ?? null,
    recibido: recibos.filter((x) => x.renglonId === r.id).reduce((suma, x) => suma + Number(x.cantidad), 0),
  }));
}

/**
 * Registra una compra de una solicitud aprobada (RF-16, RF-18, RF-19): solo la gerencia. La
 * compra, sus renglones y el evento se escriben juntos, después de tomar la versión.
 */
export async function registrarCompra(
  sesion: PersonaEnSesion,
  solicitudId: string,
  pedido: DatosDeLaCompra & { version: number },
): Promise<{ compraId: string; estado: EstadoDeSolicitud; version: number } | Response> {
  const fila = await solicitudAlAlcance(sesion, solicitudId);
  if (!fila) return noEncontrado('esa solicitud');
  const renglones = await renglonesConComprasYRecibos(solicitudId);
  const rechazo = porQueNoPuedeDar('registrar_compra', sesion, {
    ...fila,
    tieneCompraVigente: renglones.some((r) => r.compraId),
  });
  if (rechazo) return errorDePeticion(rechazo.mensaje, rechazo.estado);
  if (fila.version !== pedido.version) return errorDePeticion(MENSAJE_DE_SOLICITUD_CAMBIADA, 409);

  const faltas = faltasDeLaCompra(
    pedido,
    renglones.map((r) => ({ id: r.id, orden: r.orden, cantidadAprobada: r.cantidadAprobada, enCompraVigente: Boolean(r.compraId) })),
  );
  if (faltas.length) return Response.json({ error: faltas[0], faltas }, { status: 422 });

  const elegidos = new Set(pedido.renglonIds);
  const estado = estadoTrasComprasYRecibos(
    renglones.map((r) => ({ ...r, enCompraVigente: Boolean(r.compraId) || elegidos.has(r.id) })),
  );
  if (!(await tomarLaVersion(solicitudId, pedido.version, { estado }))) {
    return errorDePeticion(MENSAJE_DE_SOLICITUD_CAMBIADA, 409);
  }

  const compraId = uuidv7();
  const proveedor = pedido.proveedor.trim();
  const db = baseServidor();
  await db.batch([
    db.insert(compras).values({
      id: compraId,
      solicitudId,
      proveedor,
      valor: pedido.valor,
      fecha: pedido.fecha,
      factura: pedido.factura.trim(),
      registradaPor: sesion.id,
    }),
    db.insert(compraRenglones).values([...elegidos].map((renglonId) => ({ compraId, renglonId }))),
    db.insert(solicitudCompraEventos).values({
      id: uuidv7(),
      solicitudId,
      paso: 'registrar_compra',
      cambios: [{ compraId, proveedor, renglones: renglones.filter((r) => elegidos.has(r.id)).map((r) => r.orden) }],
      por: sesion.id,
    }),
  ]);
  return { compraId, estado, version: pedido.version + 1 };
}

/**
 * Anula una compra con su motivo (RF-30): solo la gerencia. La compra se queda, marcada;
 * sus renglones quedan libres para otra compra, y la solicitud vuelve al estado que le toca.
 */
export async function anularCompra(
  sesion: PersonaEnSesion,
  compraId: string,
  pedido: { version: number; motivo: string },
): Promise<{ estado: EstadoDeSolicitud; version: number } | Response> {
  const [compra] = await baseServidor().select().from(compras).where(eq(compras.id, compraId)).limit(1);
  const fila = compra ? await solicitudAlAlcance(sesion, compra.solicitudId) : null;
  if (!compra || !fila) return noEncontrado('esa compra');

  const rechazo = porQueNoPuedeDar('anular_compra', sesion, { ...fila, tieneCompraVigente: true });
  if (rechazo) return errorDePeticion(rechazo.mensaje, rechazo.estado);
  if (compra.anuladaEn) return errorDePeticion('Esa compra ya está anulada.', 409);
  if (fila.version !== pedido.version) return errorDePeticion(MENSAJE_DE_SOLICITUD_CAMBIADA, 409);
  const faltaMotivo = faltaDelMotivo('anular_compra', pedido.motivo);
  if (faltaMotivo) return errorDePeticion(faltaMotivo, 422);

  const renglones = await renglonesConComprasYRecibos(fila.id);
  const estado = estadoTrasComprasYRecibos(
    renglones.map((r) => ({ ...r, enCompraVigente: Boolean(r.compraId) && r.compraId !== compraId })),
  );
  if (!(await tomarLaVersion(fila.id, pedido.version, { estado }))) {
    return errorDePeticion(MENSAJE_DE_SOLICITUD_CAMBIADA, 409);
  }

  const motivo = pedido.motivo.trim();
  const db = baseServidor();
  await db.batch([
    db
      .update(compras)
      .set({ anuladaEn: new Date(), anuladaPor: sesion.id, motivoAnulacion: motivo })
      .where(and(eq(compras.id, compraId), isNull(compras.anuladaEn))),
    db.insert(solicitudCompraEventos).values({
      id: uuidv7(),
      solicitudId: fila.id,
      paso: 'anular_compra',
      motivo,
      cambios: [{ compraId, proveedor: compra.proveedor }],
      por: sesion.id,
    }),
  ]);
  return { estado, version: pedido.version + 1 };
}

/**
 * Registra lo que llegó (RF-20, RF-21): quien ve Solicitudes de compra de ese lugar, por
 * renglón, todo o una parte, con fecha, nota y, si se quiere, la remisión o una foto ya
 * subida a la solicitud. No toca el Almacén (RF-22): el almacenista registra el ingreso
 * allí, como hoy.
 */
export async function recibir(
  sesion: PersonaEnSesion,
  solicitudId: string,
  pedido: { version: number; fecha: string; nota: string; documentoId: string | null; recibos: ReciboPedido[] },
): Promise<{ estado: EstadoDeSolicitud; version: number } | Response> {
  const fila = await solicitudAlAlcance(sesion, solicitudId);
  if (!fila) return noEncontrado('esa solicitud');
  const renglones = await renglonesConComprasYRecibos(solicitudId);
  const rechazo = porQueNoPuedeDar('recibir', sesion, { ...fila, tieneCompraVigente: renglones.some((r) => r.compraId) });
  if (rechazo) return errorDePeticion(rechazo.mensaje, rechazo.estado);
  if (fila.version !== pedido.version) return errorDePeticion(MENSAJE_DE_SOLICITUD_CAMBIADA, 409);

  const faltas = faltasDelRecibo(
    pedido,
    renglones.map((r) => ({ id: r.id, orden: r.orden, cantidadAprobada: r.cantidadAprobada, enCompraVigente: Boolean(r.compraId) })),
  );
  if (pedido.documentoId) {
    // El soporte tiene que ser de esta solicitud, y vigente.
    const [documento] = await baseServidor()
      .select({ id: documentosDelGrupo.id })
      .from(documentosDelGrupo)
      .where(
        and(
          eq(documentosDelGrupo.id, pedido.documentoId),
          eq(documentosDelGrupo.solicitudId, solicitudId),
          isNull(documentosDelGrupo.anuladoEn),
        ),
      )
      .limit(1);
    if (!documento) faltas.push('El soporte no es de esta solicitud.');
  }
  if (faltas.length) return Response.json({ error: faltas[0], faltas }, { status: 422 });

  const estado = estadoTrasComprasYRecibos(
    renglones.map((r) => ({
      ...r,
      enCompraVigente: Boolean(r.compraId),
      recibido: r.recibido + (pedido.recibos.find((x) => x.renglonId === r.id)?.cantidad ?? 0),
    })),
  );
  if (!(await tomarLaVersion(solicitudId, pedido.version, { estado }))) {
    return errorDePeticion(MENSAJE_DE_SOLICITUD_CAMBIADA, 409);
  }

  const db = baseServidor();
  await db.batch([
    db.insert(recepcionesCompra).values(
      pedido.recibos.map((x) => ({
        id: uuidv7(),
        solicitudId,
        renglonId: x.renglonId,
        cantidad: String(x.cantidad),
        fecha: pedido.fecha,
        nota: pedido.nota.trim(),
        documentoId: pedido.documentoId,
        por: sesion.id,
      })),
    ),
    db.insert(solicitudCompraEventos).values({
      id: uuidv7(),
      solicitudId,
      paso: 'recibir',
      cambios: pedido.recibos.map((x) => ({
        renglon: renglones.find((r) => r.id === x.renglonId)?.orden,
        cantidad: x.cantidad,
      })),
      por: sesion.id,
    }),
  ]);
  return { estado, version: pedido.version + 1 };
}
