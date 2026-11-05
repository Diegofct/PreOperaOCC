/**
 * Las solicitudes de pago del grupo (spec 037). **Solo servidor.**
 *
 * El mismo patrón de Compras (spec 036): cada pedido trae su lugar (`?empresa=` u
 * `?obraId=`), y quién entra lo dicen las reglas del menú (`lugarDeLaSolicitud`, compartido
 * con Compras). Elemental y Proyectos no tienen solicitudes propias.
 *
 * ── Los valores ──
 *
 * El valor pedido, el aprobado y lo pagado salen solo para quien `veElValorDelPago`: todos
 * menos el almacenista en las que no pidió él (RF-5a, D1). Para él, en las ajenas, los
 * campos no se mandan: ni en `null`.
 */
import { and, asc, desc, eq, inArray, isNull, sql, type SQL } from 'drizzle-orm';
import { uuidv7 } from 'uuidv7';

import { baseServidor } from '@/db/servidor/cliente';
import { obras, pagos, solicitudesPago, solicitudPagoEventos, usuarios } from '@/db/servidor/esquema';
import { lugarDeLaSolicitud, type LugarDeLaSolicitud } from '@/features/compras/servidor/solicitudes';
import type {
  SolicitudDePagoDetallada,
  SolicitudDePagoEnElLugar,
  SolicitudesDePagoDelLugar,
} from '@/features/panel/contratos';
import type { PersonaEnSesion } from '@/features/servidor/guardia';
import { errorDePeticion, noEncontrado } from '@/features/servidor/respuestas';
import { yaLaDecidioOtro } from '@/shared/rules/compras';
import { alcanzaLaEmpresa, alcanzaLaObraDeLaRuta, nombreDeEmpresa } from '@/shared/rules/empresas';
import { fechaDeJornada } from '@/shared/rules/jornada';
import {
  aprobacionDelPago,
  camposDelPagoCorregidos,
  faltaDelMotivoDePago,
  faltasDeLaSolicitudDePago,
  marcasDelPago,
  numeroDePago,
  ordenDelLugarDePagos,
  PASOS_DE_PAGO,
  porQueNoPuedeDarPaso,
  puedeDarPaso,
  veElValorDelPago,
  type DatosDeLaSolicitudDePago,
  type EstadoDePago,
} from '@/shared/rules/pagos';
import { alcanza } from '@/shared/rules/permisos';

/** El lugar de un pedido de pagos, ya comprobado: las mismas reglas que Compras (RF-2, RF-27). */
export function lugarDeLosPagos(sesion: PersonaEnSesion, pedido: { empresa: string | null; obraId: string | null }) {
  return lugarDeLaSolicitud(sesion, pedido, 'de pago');
}

function condicionDelLugar(lugar: LugarDeLaSolicitud) {
  return lugar.tipo === 'empresa' ? eq(solicitudesPago.empresaId, lugar.empresaId) : eq(solicitudesPago.obraId, lugar.obraId);
}

/** Lo pagado sin anular de cada solicitud. */
async function pagadoDe(ids: string[]): Promise<Map<string, number>> {
  if (!ids.length) return new Map();
  const filas = await baseServidor()
    .select({ id: pagos.solicitudPagoId, pagado: sql<string>`sum(${pagos.valor})` })
    .from(pagos)
    .where(and(inArray(pagos.solicitudPagoId, ids), isNull(pagos.anuladoEn)))
    .groupBy(pagos.solicitudPagoId);
  return new Map(filas.map((f) => [f.id as string, Number(f.pagado)]));
}

/**
 * Las solicitudes de pago que cumplen la condición —las de un lugar, o todas para la bandeja
 * de Tesorería—, cada una con su lugar, quien la pidió, lo pagado y las marcas de hoy.
 */
export async function listarSolicitudesDePago(sesion: PersonaEnSesion, condicion?: SQL): Promise<SolicitudDePagoEnElLugar[]> {
  const filas = await baseServidor()
    .select({
      id: solicitudesPago.id,
      numero: solicitudesPago.numero,
      empresaId: solicitudesPago.empresaId,
      obraId: solicitudesPago.obraId,
      obraNombre: obras.nombre,
      estado: solicitudesPago.estado,
      beneficiario: solicitudesPago.beneficiario,
      beneficiarioDocumento: solicitudesPago.beneficiarioDocumento,
      concepto: solicitudesPago.concepto,
      paraQue: solicitudesPago.paraQue,
      valor: solicitudesPago.valor,
      valorAprobado: solicitudesPago.valorAprobado,
      paraCuando: solicitudesPago.paraCuando,
      urgente: solicitudesPago.urgente,
      pedidaPorId: solicitudesPago.pedidaPor,
      pedidaPorNombre: usuarios.nombreCompleto,
      pedidaEn: solicitudesPago.pedidaEn,
      version: solicitudesPago.version,
    })
    .from(solicitudesPago)
    .innerJoin(usuarios, eq(usuarios.id, solicitudesPago.pedidaPor))
    .leftJoin(obras, eq(obras.id, solicitudesPago.obraId))
    .where(condicion);

  const pagado = await pagadoDe(filas.map((f) => f.id));
  const hoy = fechaDeJornada();
  return filas.map((f): SolicitudDePagoEnElLugar => {
    const solicitud: SolicitudDePagoEnElLugar = {
      id: f.id,
      numero: f.numero,
      codigo: numeroDePago(f.numero),
      lugar: f.empresaId
        ? { tipo: 'empresa', id: f.empresaId, nombre: nombreDeEmpresa(f.empresaId) }
        : { tipo: 'obra', id: f.obraId as string, nombre: f.obraNombre ?? '' },
      estado: f.estado,
      beneficiario: f.beneficiario,
      beneficiarioDocumento: f.beneficiarioDocumento,
      concepto: f.concepto,
      paraQue: f.paraQue,
      paraCuando: f.paraCuando,
      urgente: f.urgente,
      pedidaPor: { id: f.pedidaPorId, nombre: f.pedidaPorNombre },
      pedidaEn: f.pedidaEn.toISOString(),
      pedidaEl: fechaDeJornada(f.pedidaEn.getTime()),
      marcas: marcasDelPago(f, hoy),
      version: f.version,
    };
    // RF-5a: para el almacenista, en las que no pidió, los valores no existen.
    if (veElValorDelPago(sesion.rol, f.pedidaPorId, sesion.id)) {
      solicitud.valor = f.valor;
      solicitud.valorAprobado = f.valorAprobado;
      solicitud.pagado = pagado.get(f.id) ?? 0;
    }
    return solicitud;
  });
}

/** Las solicitudes de pago del lugar, en el orden de RF-21. */
export async function solicitudesDePagoDelLugar(
  sesion: PersonaEnSesion,
  lugar: LugarDeLaSolicitud,
): Promise<SolicitudesDePagoDelLugar> {
  return {
    solicitudes: ordenDelLugarDePagos(await listarSolicitudesDePago(sesion, condicionDelLugar(lugar))),
    sePuedePedir: lugar.tipo === 'empresa' || lugar.activa,
  };
}

/** Pide un pago (RF-6 a RF-8): la deja enviada, con su número y el evento `enviada`, juntos. */
export async function crearSolicitudDePago(
  sesion: PersonaEnSesion,
  lugar: LugarDeLaSolicitud,
  datos: DatosDeLaSolicitudDePago,
): Promise<{ id: string; numero: number; codigo: string } | Response> {
  if (lugar.tipo === 'obra' && !lugar.activa) {
    return errorDePeticion('La obra no está activa: no recibe solicitudes nuevas.', 409);
  }
  const faltas = faltasDeLaSolicitudDePago(datos);
  if (faltas.length) return Response.json({ error: faltas[0], faltas }, { status: 422 });

  const id = uuidv7();
  const db = baseServidor();
  const [[creada]] = await db.batch([
    db
      .insert(solicitudesPago)
      .values({
        id,
        empresaId: lugar.tipo === 'empresa' ? lugar.empresaId : null,
        obraId: lugar.tipo === 'obra' ? lugar.obraId : null,
        beneficiario: datos.beneficiario.trim(),
        beneficiarioDocumento: datos.beneficiarioDocumento.trim(),
        concepto: datos.concepto,
        paraQue: datos.paraQue.trim(),
        valor: datos.valor,
        paraCuando: datos.paraCuando,
        urgente: datos.urgente,
        pedidaPor: sesion.id,
      })
      .returning({ numero: solicitudesPago.numero }),
    db.insert(solicitudPagoEventos).values({ id: uuidv7(), solicitudPagoId: id, paso: 'enviada', por: sesion.id }),
  ]);
  return { id, numero: creada.numero, codigo: numeroDePago(creada.numero) };
}

/* ── Una solicitud de pago (T8) ─────────────────────────────────────────── */

export const MENSAJE_DE_PAGO_CAMBIADO = 'La solicitud cambió mientras tanto; vuelva a cargarla.';

type FilaDeSolicitudDePago = typeof solicitudesPago.$inferSelect;

/**
 * La solicitud, si quien pregunta la alcanza (RF-27, RF-28): Tesorería de Elemental ve las
 * de todo el grupo (gerencia y Auxiliar Administrativa, 040/RF-6); los demás, las de su lugar. No
 * alcanzarla es «no existe».
 */
export async function solicitudDePagoAlAlcance(sesion: PersonaEnSesion, id: string): Promise<FilaDeSolicitudDePago | null> {
  const [fila] = await baseServidor().select().from(solicitudesPago).where(eq(solicitudesPago.id, id)).limit(1);
  if (!fila) return null;
  if (alcanza(sesion.rol, 'tesoreria', 'ver')) return fila;
  if (!alcanza(sesion.rol, 'solicitudes', 'ver')) return null;
  if (fila.empresaId) return alcanzaLaEmpresa(sesion.rol, fila.empresaId) ? fila : null;
  return fila.obraId && alcanzaLaObraDeLaRuta(sesion, fila.obraId) ? fila : null;
}

/**
 * La solicitud con su historia y sus pagos, y los pasos que puede dar quien mira (RF-20).
 * Para el almacenista, en las que no pidió, no van ni los valores ni los pagos (RF-5a).
 */
export async function solicitudDePagoDe(
  sesion: PersonaEnSesion,
  fila: FilaDeSolicitudDePago,
): Promise<SolicitudDePagoDetallada> {
  const db = baseServidor();
  const [filasDePagos, eventos, [obra]] = await Promise.all([
    db.select().from(pagos).where(eq(pagos.solicitudPagoId, fila.id)).orderBy(asc(pagos.registradoEn)),
    db
      .select()
      .from(solicitudPagoEventos)
      .where(eq(solicitudPagoEventos.solicitudPagoId, fila.id))
      .orderBy(asc(solicitudPagoEventos.en)),
    fila.obraId ? db.select({ nombre: obras.nombre }).from(obras).where(eq(obras.id, fila.obraId)).limit(1) : Promise.resolve([]),
  ]);
  const quienes = [
    fila.pedidaPor,
    ...filasDePagos.flatMap((p) => [p.registradoPor, p.anuladoPor]),
    ...eventos.map((e) => e.por),
  ].filter((x): x is string => Boolean(x));
  const nombres = new Map(
    (
      await db
        .select({ id: usuarios.id, nombre: usuarios.nombreCompleto })
        .from(usuarios)
        .where(inArray(usuarios.id, [...new Set(quienes)]))
    ).map((u) => [u.id, u.nombre]),
  );
  const nombre = (id: string | null) => (id ? (nombres.get(id) ?? '') : '');

  const conValores = veElValorDelPago(sesion.rol, fila.pedidaPor, sesion.id);
  const detalle: SolicitudDePagoDetallada = {
    id: fila.id,
    numero: fila.numero,
    codigo: numeroDePago(fila.numero),
    lugar: fila.empresaId
      ? { tipo: 'empresa', id: fila.empresaId, nombre: nombreDeEmpresa(fila.empresaId) }
      : { tipo: 'obra', id: fila.obraId as string, nombre: obra?.nombre ?? '' },
    estado: fila.estado,
    beneficiario: fila.beneficiario,
    beneficiarioDocumento: fila.beneficiarioDocumento,
    concepto: fila.concepto,
    paraQue: fila.paraQue,
    paraCuando: fila.paraCuando,
    urgente: fila.urgente,
    pedidaPor: { id: fila.pedidaPor, nombre: nombre(fila.pedidaPor) },
    pedidaEn: fila.pedidaEn.toISOString(),
    marcas: marcasDelPago(fila),
    version: fila.version,
    // La historia no lleva valores: también la ve el almacenista en las ajenas.
    historia: eventos.map((e) => ({ paso: e.paso, motivo: e.motivo, cambios: conValores ? e.cambios : [], por: nombre(e.por), en: e.en.toISOString() })),
    pasos: PASOS_DE_PAGO.filter((paso) => puedeDarPaso(paso, sesion, fila)),
  };
  if (conValores) {
    detalle.valor = fila.valor;
    detalle.valorAprobado = fila.valorAprobado;
    detalle.pagado = filasDePagos.filter((p) => !p.anuladoEn).reduce((suma, p) => suma + p.valor, 0);
    detalle.pagos = filasDePagos.map((p) => ({
      id: p.id,
      fecha: p.fecha,
      valor: p.valor,
      medio: p.medio,
      referencia: p.referencia,
      documentoId: p.documentoId,
      registradoPor: nombre(p.registradoPor),
      registradoEn: p.registradoEn.toISOString(),
      anulado: p.anuladoEn ? { en: p.anuladoEn.toISOString(), por: nombre(p.anuladoPor), motivo: p.motivoAnulacion ?? '' } : null,
    }));
  }
  return detalle;
}

/**
 * Sube la versión si nadie la cambió antes (RF-30). Es la primera escritura de cada paso:
 * quien la gana escribe después lo demás sin que otro paso se cuele.
 */
export async function tomarLaVersionDelPago(
  id: string,
  version: number,
  cambios: Partial<typeof solicitudesPago.$inferInsert>,
): Promise<boolean> {
  const [tomada] = await baseServidor()
    .update(solicitudesPago)
    .set({ ...cambios, version: version + 1, actualizadaEn: new Date() })
    .where(and(eq(solicitudesPago.id, id), eq(solicitudesPago.version, version)))
    .returning({ id: solicitudesPago.id });
  return Boolean(tomada);
}

/** Corrige una solicitud enviada o devuelta (RF-9): solo quien la pidió. Una devuelta vuelve a enviada. */
export async function corregirSolicitudDePago(
  sesion: PersonaEnSesion,
  id: string,
  pedido: DatosDeLaSolicitudDePago & { version: number },
): Promise<{ version: number } | Response> {
  const fila = await solicitudDePagoAlAlcance(sesion, id);
  if (!fila) return noEncontrado('esa solicitud');
  const rechazo = porQueNoPuedeDarPaso('corregir', sesion, fila);
  if (rechazo) return errorDePeticion(rechazo.mensaje, rechazo.estado);
  if (fila.version !== pedido.version) return errorDePeticion(MENSAJE_DE_PAGO_CAMBIADO, 409);
  const faltas = faltasDeLaSolicitudDePago(pedido);
  if (faltas.length) return Response.json({ error: faltas[0], faltas }, { status: 422 });

  const campos = camposDelPagoCorregidos(fila, pedido);
  const tomada = await tomarLaVersionDelPago(id, pedido.version, {
    estado: 'enviada',
    beneficiario: pedido.beneficiario.trim(),
    beneficiarioDocumento: pedido.beneficiarioDocumento.trim(),
    concepto: pedido.concepto,
    paraQue: pedido.paraQue.trim(),
    valor: pedido.valor,
    paraCuando: pedido.paraCuando,
    urgente: pedido.urgente,
  });
  if (!tomada) return errorDePeticion(MENSAJE_DE_PAGO_CAMBIADO, 409);
  await baseServidor()
    .insert(solicitudPagoEventos)
    .values({ id: uuidv7(), solicitudPagoId: id, paso: 'corregir', cambios: [{ campos }], por: sesion.id });
  return { version: pedido.version + 1 };
}

const ESTADO_TRAS_EL_PASO = {
  cancelar: 'cancelada',
  aprobar: 'aprobada',
  rechazar: 'rechazada',
  devolver: 'devuelta',
} as const;

/**
 * Cancela, aprueba (por lo pedido o por menos), rechaza o devuelve (RF-9, RF-11, RF-12).
 * Quién y desde qué estado lo dice `porQueNoPuedeDarPaso`; el motivo, `faltaDelMotivoDePago`.
 */
/** El 409 de un paso que llegó tarde (spec 040, RF-9), como en las solicitudes de compra. */
async function conflictoDePago(id: string, paso: string, yo: string, mensaje: string): Promise<Response> {
  const [ultimo] = await baseServidor()
    .select({ paso: solicitudPagoEventos.paso, porId: solicitudPagoEventos.por, nombre: usuarios.nombreCompleto })
    .from(solicitudPagoEventos)
    .innerJoin(usuarios, eq(usuarios.id, solicitudPagoEventos.por))
    .where(eq(solicitudPagoEventos.solicitudPagoId, id))
    .orderBy(desc(solicitudPagoEventos.en))
    .limit(1);
  return errorDePeticion(yaLaDecidioOtro(paso, ultimo ?? null, yo) ?? mensaje, 409);
}

export async function darPasoDePago(
  sesion: PersonaEnSesion,
  id: string,
  pedido: { paso: keyof typeof ESTADO_TRAS_EL_PASO; version: number; motivo: string; valorAprobado: number | null },
): Promise<{ estado: EstadoDePago; version: number } | Response> {
  const fila = await solicitudDePagoAlAlcance(sesion, id);
  if (!fila) return noEncontrado('esa solicitud');
  const rechazo = porQueNoPuedeDarPaso(pedido.paso, sesion, fila);
  if (rechazo?.estado === 409) return conflictoDePago(id, pedido.paso, sesion.id, rechazo.mensaje);
  if (rechazo) return errorDePeticion(rechazo.mensaje, rechazo.estado);
  if (fila.version !== pedido.version) return conflictoDePago(id, pedido.paso, sesion.id, MENSAJE_DE_PAGO_CAMBIADO);
  const faltaMotivo = faltaDelMotivoDePago(pedido.paso, pedido.motivo);
  if (faltaMotivo) return errorDePeticion(faltaMotivo, 422);

  const estado = ESTADO_TRAS_EL_PASO[pedido.paso];
  let cambios: unknown[] = [];
  let valorAprobado: number | undefined;
  if (pedido.paso === 'aprobar') {
    const aprobacion = aprobacionDelPago(fila.valor, pedido.valorAprobado);
    if (aprobacion.falta) return errorDePeticion(aprobacion.falta, 422);
    valorAprobado = aprobacion.aprobado;
    if (valorAprobado !== fila.valor) cambios = [{ antes: fila.valor, despues: valorAprobado }];
  }
  if (!(await tomarLaVersionDelPago(id, pedido.version, { estado, ...(valorAprobado ? { valorAprobado } : {}) }))) {
    return conflictoDePago(id, pedido.paso, sesion.id, MENSAJE_DE_PAGO_CAMBIADO);
  }
  await baseServidor()
    .insert(solicitudPagoEventos)
    .values({ id: uuidv7(), solicitudPagoId: id, paso: pedido.paso, motivo: pedido.motivo.trim() || null, cambios, por: sesion.id });
  return { estado, version: pedido.version + 1 };
}
