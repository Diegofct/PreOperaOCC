/**
 * Las solicitudes de compra del grupo (spec 036). **Solo servidor.**
 *
 * ── Dónde ──
 *
 * Una solicitud es de un lugar —una obra, OCC o Geolab—, y cada pedido trae el suyo
 * (`?empresa=` o `?obraId=`), como en Documentos y Recursos Humanos. Quién entra lo dicen
 * las reglas del menú: `alcanzaLaEmpresa` y `alcanzaLaObraDeLaRuta` (RF-2, RF-28). Pedir
 * otro lugar es un 403 que lo dice; Elemental y Proyectos no tienen solicitudes propias.
 *
 * ── Los valores ──
 *
 * El valor estimado y el de las compras salen solo para quien `veLosValores` (RF-31). Para
 * el almacenista el campo no se manda: ni en `null`.
 */
import { and, asc, eq, gte, inArray, isNull, lte, sql, type SQL } from 'drizzle-orm';
import { uuidv7 } from 'uuidv7';

import { baseServidor } from '@/db/servidor/cliente';
import {
  almacenMateriales,
  compraRenglones,
  compras,
  obras,
  recepcionesCompra,
  solicitudCompraEventos,
  solicitudCompraRenglones,
  solicitudesCompra,
  usuarios,
} from '@/db/servidor/esquema';
import type {
  BandejaDeCompras,
  GastoDeCompras,
  SolicitudDetallada,
  SolicitudEnElLugar,
  SolicitudesDelLugar,
} from '@/features/panel/contratos';
import type { PersonaEnSesion } from '@/features/servidor/guardia';
import { errorDePeticion, noEncontrado } from '@/features/servidor/respuestas';
import {
  aprobacionDeLaSolicitud,
  camposCorregidos,
  faltaDelMotivo,
  faltasDeLaSolicitud,
  marcasDeLaSolicitud,
  numeroDeSolicitud,
  ordenDeLaBandeja,
  ordenDelLugar,
  pasaLosFiltros,
  PASOS_DE_SOLICITUD,
  porQueNoPuedeDar,
  puedeDar,
  resumenDeLaBandeja,
  veLosValores,
  type DatosDeLaSolicitud,
  type EstadoDeSolicitud,
  type FiltrosDeLaBandeja,
} from '@/shared/rules/compras';
import { alcanzaLaEmpresa, alcanzaLaObraDeLaRuta, esEmpresa, nombreDeEmpresa } from '@/shared/rules/empresas';
import { fechaDeJornada } from '@/shared/rules/jornada';
import { alcanza } from '@/shared/rules/permisos';

/** El lugar de un pedido, ya comprobado. */
export type LugarDeLaSolicitud =
  | { tipo: 'empresa'; empresaId: 'occ' | 'geolab' }
  | { tipo: 'obra'; obraId: string; activa: boolean };

const SIN_PERMISO = 'No tiene acceso a las solicitudes de compra de ese lugar.';

/**
 * El lugar que se pidió, si quien pide entra a él (RF-2, RF-28). Una empresa o una obra,
 * nunca las dos ni ninguna. Elemental no pide (D1) y Proyectos pide desde cada obra.
 */
export async function lugarDeLaSolicitud(
  sesion: PersonaEnSesion,
  pedido: { empresa: string | null; obraId: string | null },
): Promise<LugarDeLaSolicitud | Response> {
  const { empresa, obraId } = pedido;
  if (Boolean(empresa) === Boolean(obraId)) return errorDePeticion('Diga de qué empresa u obra son las solicitudes.');

  if (empresa) {
    if (empresa !== 'occ' && empresa !== 'geolab') {
      return esEmpresa(empresa) ? errorDePeticion('Esa empresa no tiene solicitudes de compra propias.') : noEncontrado('esa empresa');
    }
    if (!alcanzaLaEmpresa(sesion.rol, empresa)) return errorDePeticion(SIN_PERMISO, 403);
    return { tipo: 'empresa', empresaId: empresa };
  }

  const id = obraId as string;
  if (!alcanzaLaObraDeLaRuta(sesion, id)) return errorDePeticion(SIN_PERMISO, 403);
  const [obra] = await baseServidor()
    .select({ id: obras.id, activa: obras.activa, eliminadoEn: obras.eliminadoEn })
    .from(obras)
    .where(eq(obras.id, id))
    .limit(1);
  if (!obra) return noEncontrado('esa obra');
  return { tipo: 'obra', obraId: id, activa: obra.activa && !obra.eliminadoEn };
}

function condicionDelLugar(lugar: LugarDeLaSolicitud) {
  return lugar.tipo === 'empresa'
    ? eq(solicitudesCompra.empresaId, lugar.empresaId)
    : eq(solicitudesCompra.obraId, lugar.obraId);
}

/**
 * Las solicitudes del lugar en el orden de RF-24, con sus renglones, los proveedores de sus
 * compras vigentes y las marcas de hoy (RF-25). Buscar lo hace la pantalla (RF-26): son las
 * de un lugar, y así responde mientras se escribe.
 */
export async function solicitudesDelLugar(
  sesion: PersonaEnSesion,
  lugar: LugarDeLaSolicitud,
): Promise<SolicitudesDelLugar> {
  return {
    solicitudes: ordenDelLugar(await listarSolicitudes(sesion, condicionDelLugar(lugar))),
    sePuedePedir: lugar.tipo === 'empresa' || lugar.activa,
  };
}

/**
 * Las solicitudes que cumplen la condición —las de un lugar, o todas para la bandeja—, cada
 * una con su lugar, quien la pidió, sus renglones, los proveedores de sus compras vigentes y
 * las marcas de hoy (RF-25). El valor estimado, solo para quien `veLosValores` (RF-31).
 */
async function listarSolicitudes(sesion: PersonaEnSesion, condicion?: SQL): Promise<SolicitudEnElLugar[]> {
  const db = baseServidor();
  const filas = await db
    .select({
      id: solicitudesCompra.id,
      numero: solicitudesCompra.numero,
      empresaId: solicitudesCompra.empresaId,
      obraId: solicitudesCompra.obraId,
      obraNombre: obras.nombre,
      estado: solicitudesCompra.estado,
      urgente: solicitudesCompra.urgente,
      paraCuando: solicitudesCompra.paraCuando,
      paraQue: solicitudesCompra.paraQue,
      proveedorSugerido: solicitudesCompra.proveedorSugerido,
      valorEstimado: solicitudesCompra.valorEstimado,
      pedidaPorId: solicitudesCompra.pedidaPor,
      pedidaPorNombre: usuarios.nombreCompleto,
      pedidaEn: solicitudesCompra.pedidaEn,
      version: solicitudesCompra.version,
    })
    .from(solicitudesCompra)
    .innerJoin(usuarios, eq(usuarios.id, solicitudesCompra.pedidaPor))
    .leftJoin(obras, eq(obras.id, solicitudesCompra.obraId))
    .where(condicion);

  const ids = filas.map((f) => f.id);
  const [renglones, proveedores] = ids.length
    ? await Promise.all([
        db
          .select({
            solicitudId: solicitudCompraRenglones.solicitudId,
            descripcion: solicitudCompraRenglones.descripcion,
            cantidad: solicitudCompraRenglones.cantidad,
            unidad: solicitudCompraRenglones.unidad,
          })
          .from(solicitudCompraRenglones)
          .where(inArray(solicitudCompraRenglones.solicitudId, ids))
          .orderBy(asc(solicitudCompraRenglones.orden)),
        db
          .select({ solicitudId: compras.solicitudId, proveedor: compras.proveedor })
          .from(compras)
          .where(and(inArray(compras.solicitudId, ids), isNull(compras.anuladaEn))),
      ])
    : [[], []];

  const hoy = fechaDeJornada();
  const conValores = veLosValores(sesion.rol);
  return filas.map((f): SolicitudEnElLugar => {
    const solicitud: SolicitudEnElLugar = {
      id: f.id,
      numero: f.numero,
      codigo: numeroDeSolicitud(f.numero),
      lugar: f.empresaId
        ? { tipo: 'empresa', id: f.empresaId, nombre: nombreDeEmpresa(f.empresaId) }
        : { tipo: 'obra', id: f.obraId as string, nombre: f.obraNombre ?? '' },
      estado: f.estado,
      urgente: f.urgente,
      paraCuando: f.paraCuando,
      paraQue: f.paraQue,
      proveedorSugerido: f.proveedorSugerido,
      pedidaPor: { id: f.pedidaPorId, nombre: f.pedidaPorNombre },
      pedidaEn: f.pedidaEn.toISOString(),
      pedidaEl: fechaDeJornada(f.pedidaEn.getTime()),
      renglones: renglones
        .filter((r) => r.solicitudId === f.id)
        .map((r) => ({ descripcion: r.descripcion, cantidad: Number(r.cantidad), unidad: r.unidad })),
      proveedores: [...new Set(proveedores.filter((p) => p.solicitudId === f.id).map((p) => p.proveedor))],
      marcas: marcasDeLaSolicitud(f, hoy),
      version: f.version,
    };
    // RF-31: para el almacenista el campo no existe.
    if (conValores) solicitud.valorEstimado = f.valorEstimado;
    return solicitud;
  });
}

/**
 * Compras de Elemental (RF-3, RF-12, RF-26): las solicitudes de todo el grupo que pasan los
 * filtros, en el orden de la bandeja, y el resumen de arriba, que cuenta **todo** el grupo:
 * lo que espera a la gerencia no desaparece por filtrar.
 */
export async function bandejaDelGrupo(sesion: PersonaEnSesion, filtros: FiltrosDeLaBandeja): Promise<BandejaDeCompras> {
  const todas = await listarSolicitudes(sesion);
  return {
    solicitudes: ordenDeLaBandeja(todas.filter((s) => pasaLosFiltros(s, filtros))),
    resumen: resumenDeLaBandeja(todas),
    total: todas.length,
  };
}

/**
 * Lo comprado por lugar entre dos fechas de compra (RF-27), sin las compras anuladas. Los
 * lugares sin compras en el rango no salen.
 */
export async function gastoPorLugar(rango: { desde: string; hasta: string }): Promise<GastoDeCompras> {
  const filas = await baseServidor()
    .select({
      empresaId: solicitudesCompra.empresaId,
      obraId: solicitudesCompra.obraId,
      obraNombre: obras.nombre,
      total: sql<string>`sum(${compras.valor})`,
      compras: sql<number>`count(*)::int`,
    })
    .from(compras)
    .innerJoin(solicitudesCompra, eq(solicitudesCompra.id, compras.solicitudId))
    .leftJoin(obras, eq(obras.id, solicitudesCompra.obraId))
    .where(and(isNull(compras.anuladaEn), gte(compras.fecha, rango.desde), lte(compras.fecha, rango.hasta)))
    .groupBy(solicitudesCompra.empresaId, solicitudesCompra.obraId, obras.nombre);

  const lugares = filas
    .map((f) => ({
      lugar: f.empresaId
        ? { tipo: 'empresa' as const, id: f.empresaId, nombre: nombreDeEmpresa(f.empresaId) }
        : { tipo: 'obra' as const, id: f.obraId as string, nombre: f.obraNombre ?? '' },
      total: Number(f.total),
      compras: f.compras,
    }))
    .sort((a, b) => b.total - a.total);
  return { ...rango, lugares, total: lugares.reduce((suma, l) => suma + l.total, 0) };
}

/**
 * Los materiales del catálogo que se nombraron, si son del Almacén de esa obra y siguen
 * vivos (RF-7). Una solicitud de OCC o Geolab no lleva materiales: el catálogo es de obra.
 */
async function faltasDeLosMateriales(lugar: LugarDeLaSolicitud, datos: DatosDeLaSolicitud): Promise<string[]> {
  const pedidos = [...new Set(datos.renglones.map((r) => r.materialId).filter((m): m is string => Boolean(m)))];
  if (!pedidos.length) return [];
  if (lugar.tipo === 'empresa') return ['Los materiales del catálogo son del Almacén de una obra.'];
  const vivos = await baseServidor()
    .select({ id: almacenMateriales.id })
    .from(almacenMateriales)
    .where(
      and(
        inArray(almacenMateriales.id, pedidos),
        eq(almacenMateriales.obraId, lugar.obraId),
        isNull(almacenMateriales.eliminadoEn),
      ),
    );
  return vivos.length === pedidos.length ? [] : ['Uno de los materiales no está en el catálogo del Almacén de esta obra.'];
}

/**
 * Pide una compra (RF-7 a RF-10): la deja enviada, con su número y el evento `enviada`. La
 * solicitud, sus renglones y el evento se escriben juntos.
 */
export async function crearSolicitud(
  sesion: PersonaEnSesion,
  lugar: LugarDeLaSolicitud,
  datos: DatosDeLaSolicitud,
): Promise<{ id: string; numero: number; codigo: string } | Response> {
  if (lugar.tipo === 'obra' && !lugar.activa) {
    return errorDePeticion('La obra no está activa: no recibe solicitudes nuevas.', 409);
  }
  const faltas = [...faltasDeLaSolicitud(datos), ...(await faltasDeLosMateriales(lugar, datos))];
  if (faltas.length) return Response.json({ error: faltas[0], faltas }, { status: 422 });

  const id = uuidv7();
  const db = baseServidor();
  const [[creada]] = await db.batch([
    db
      .insert(solicitudesCompra)
      .values({
        id,
        empresaId: lugar.tipo === 'empresa' ? lugar.empresaId : null,
        obraId: lugar.tipo === 'obra' ? lugar.obraId : null,
        paraCuando: datos.paraCuando,
        urgente: datos.urgente,
        paraQue: datos.paraQue.trim(),
        proveedorSugerido: datos.proveedorSugerido.trim(),
        valorEstimado: datos.valorEstimado,
        pedidaPor: sesion.id,
      })
      .returning({ numero: solicitudesCompra.numero }),
    db.insert(solicitudCompraRenglones).values(
      datos.renglones.map((r, i) => ({
        id: uuidv7(),
        solicitudId: id,
        orden: i + 1,
        descripcion: r.descripcion.trim(),
        materialId: r.materialId,
        cantidad: String(r.cantidad),
        unidad: r.unidad.trim(),
      })),
    ),
    db.insert(solicitudCompraEventos).values({ id: uuidv7(), solicitudId: id, paso: 'enviada', por: sesion.id }),
  ]);
  return { id, numero: creada.numero, codigo: numeroDeSolicitud(creada.numero) };
}

/* ── Una solicitud (T8) ─────────────────────────────────────────────────── */

export const MENSAJE_DE_SOLICITUD_CAMBIADA = 'La solicitud cambió mientras tanto; vuelva a cargarla.';

type FilaDeSolicitud = typeof solicitudesCompra.$inferSelect;

/**
 * La solicitud, si quien pregunta la alcanza (RF-28, RF-29): Compras de Elemental ve las de
 * todo el grupo (gerencia y, de consulta, la auxiliar de RR. HH., RF-3, RF-4); los demás,
 * las de su lugar, con las mismas reglas que la lista. `null` si no existe o no le toca: no
 * alcanzarla es «no existe».
 */
export async function solicitudAlAlcance(sesion: PersonaEnSesion, id: string): Promise<FilaDeSolicitud | null> {
  const [fila] = await baseServidor().select().from(solicitudesCompra).where(eq(solicitudesCompra.id, id)).limit(1);
  if (!fila) return null;
  if (alcanza(sesion.rol, 'compras', 'ver')) return fila;
  if (!alcanza(sesion.rol, 'solicitudes', 'ver')) return null;
  if (fila.empresaId) return alcanzaLaEmpresa(sesion.rol, fila.empresaId) ? fila : null;
  return fila.obraId && alcanzaLaObraDeLaRuta(sesion, fila.obraId) ? fila : null;
}

async function tieneCompraVigente(solicitudId: string): Promise<boolean> {
  const [compra] = await baseServidor()
    .select({ id: compras.id })
    .from(compras)
    .where(and(eq(compras.solicitudId, solicitudId), isNull(compras.anuladaEn)))
    .limit(1);
  return Boolean(compra);
}

const nombreDe = (ids: Map<string, string>, id: string | null) => (id ? (ids.get(id) ?? '') : '');

/** La solicitud con su historia, compras y recibos, y los pasos que puede dar quien mira (RF-23). */
export async function solicitudDe(sesion: PersonaEnSesion, fila: FilaDeSolicitud): Promise<SolicitudDetallada> {
  const db = baseServidor();
  const [renglones, filasDeCompras, enlaces, recepciones, eventos, [obra]] = await Promise.all([
    db
      .select()
      .from(solicitudCompraRenglones)
      .where(eq(solicitudCompraRenglones.solicitudId, fila.id))
      .orderBy(asc(solicitudCompraRenglones.orden)),
    db.select().from(compras).where(eq(compras.solicitudId, fila.id)).orderBy(asc(compras.registradaEn)),
    db
      .select({ compraId: compraRenglones.compraId, renglonId: compraRenglones.renglonId })
      .from(compraRenglones)
      .innerJoin(compras, eq(compras.id, compraRenglones.compraId))
      .where(eq(compras.solicitudId, fila.id)),
    db
      .select()
      .from(recepcionesCompra)
      .where(eq(recepcionesCompra.solicitudId, fila.id))
      .orderBy(asc(recepcionesCompra.en)),
    db
      .select()
      .from(solicitudCompraEventos)
      .where(eq(solicitudCompraEventos.solicitudId, fila.id))
      .orderBy(asc(solicitudCompraEventos.en)),
    fila.obraId
      ? db.select({ nombre: obras.nombre }).from(obras).where(eq(obras.id, fila.obraId)).limit(1)
      : Promise.resolve([]),
  ]);

  const quienes = [
    fila.pedidaPor,
    ...filasDeCompras.flatMap((c) => [c.registradaPor, c.anuladaPor]),
    ...recepciones.map((r) => r.por),
    ...eventos.map((e) => e.por),
  ].filter((id): id is string => Boolean(id));
  const nombres = new Map(
    (
      await db
        .select({ id: usuarios.id, nombre: usuarios.nombreCompleto })
        .from(usuarios)
        .where(inArray(usuarios.id, [...new Set(quienes)]))
    ).map((u) => [u.id, u.nombre]),
  );

  const conValores = veLosValores(sesion.rol);
  const compraVigente = filasDeCompras.some((c) => !c.anuladaEn);
  const detalle: SolicitudDetallada = {
    id: fila.id,
    numero: fila.numero,
    codigo: numeroDeSolicitud(fila.numero),
    lugar: fila.empresaId
      ? { tipo: 'empresa', id: fila.empresaId, nombre: nombreDeEmpresa(fila.empresaId) }
      : { tipo: 'obra', id: fila.obraId as string, nombre: obra?.nombre ?? '' },
    estado: fila.estado,
    urgente: fila.urgente,
    paraCuando: fila.paraCuando,
    paraQue: fila.paraQue,
    proveedorSugerido: fila.proveedorSugerido,
    pedidaPor: { id: fila.pedidaPor, nombre: nombreDe(nombres, fila.pedidaPor) },
    pedidaEn: fila.pedidaEn.toISOString(),
    marcas: marcasDeLaSolicitud(fila),
    version: fila.version,
    renglones: renglones.map((r) => ({
      id: r.id,
      orden: r.orden,
      descripcion: r.descripcion,
      materialId: r.materialId,
      cantidad: Number(r.cantidad),
      cantidadAprobada: r.cantidadAprobada === null ? null : Number(r.cantidadAprobada),
      unidad: r.unidad,
      recibido: recepciones.filter((x) => x.renglonId === r.id).reduce((suma, x) => suma + Number(x.cantidad), 0),
    })),
    compras: filasDeCompras.map((c) => {
      const compra: SolicitudDetallada['compras'][number] = {
        id: c.id,
        proveedor: c.proveedor,
        fecha: c.fecha,
        factura: c.factura,
        renglonIds: enlaces.filter((e) => e.compraId === c.id).map((e) => e.renglonId),
        registradaPor: nombreDe(nombres, c.registradaPor),
        registradaEn: c.registradaEn.toISOString(),
        anulada: c.anuladaEn
          ? { en: c.anuladaEn.toISOString(), por: nombreDe(nombres, c.anuladaPor), motivo: c.motivoAnulacion ?? '' }
          : null,
      };
      // RF-31: para el almacenista el campo no existe.
      if (conValores) compra.valor = c.valor;
      return compra;
    }),
    recepciones: recepciones.map((r) => ({
      id: r.id,
      renglonId: r.renglonId,
      cantidad: Number(r.cantidad),
      fecha: r.fecha,
      nota: r.nota,
      documentoId: r.documentoId,
      por: nombreDe(nombres, r.por),
      en: r.en.toISOString(),
    })),
    historia: eventos.map((e) => ({
      paso: e.paso,
      motivo: e.motivo,
      // Al aprobar, lo que cambió lleva cantidades, no valores: se muestra a todos.
      cambios: e.cambios,
      por: nombreDe(nombres, e.por),
      en: e.en.toISOString(),
    })),
    pasos: PASOS_DE_SOLICITUD.filter((paso) =>
      puedeDar(paso, sesion, { estado: fila.estado, pedidaPor: fila.pedidaPor, tieneCompraVigente: compraVigente }),
    ),
  };
  if (conValores) detalle.valorEstimado = fila.valorEstimado;
  return detalle;
}

/** Los datos de la solicitud como se pidieron, para comparar al corregir. */
async function datosGuardados(fila: FilaDeSolicitud): Promise<DatosDeLaSolicitud> {
  const renglones = await baseServidor()
    .select()
    .from(solicitudCompraRenglones)
    .where(eq(solicitudCompraRenglones.solicitudId, fila.id))
    .orderBy(asc(solicitudCompraRenglones.orden));
  return {
    renglones: renglones.map((r) => ({
      descripcion: r.descripcion,
      cantidad: Number(r.cantidad),
      unidad: r.unidad,
      materialId: r.materialId,
    })),
    paraCuando: fila.paraCuando,
    urgente: fila.urgente,
    paraQue: fila.paraQue,
    proveedorSugerido: fila.proveedorSugerido,
    valorEstimado: fila.valorEstimado,
  };
}

/**
 * Sube la versión si nadie la cambió antes (no funcional: dos pasos a la vez no se pisan).
 * Es la primera escritura de cada paso: quien la gana es dueño de esa versión, y lo demás
 * se escribe después sin que otro paso pueda colarse.
 */
export async function tomarLaVersion(
  id: string,
  version: number,
  cambios: Partial<typeof solicitudesCompra.$inferInsert>,
): Promise<boolean> {
  const [tomada] = await baseServidor()
    .update(solicitudesCompra)
    .set({ ...cambios, version: version + 1, actualizadaEn: new Date() })
    .where(and(eq(solicitudesCompra.id, id), eq(solicitudesCompra.version, version)))
    .returning({ id: solicitudesCompra.id });
  return Boolean(tomada);
}

/**
 * Corrige una solicitud enviada o devuelta (RF-11): solo quien la pidió. Una devuelta vuelve
 * a enviada. Los renglones se reemplazan —todavía no hay compras que los nombren— y la
 * historia guarda qué campos cambiaron y los renglones de antes.
 */
export async function corregirSolicitud(
  sesion: PersonaEnSesion,
  id: string,
  pedido: DatosDeLaSolicitud & { version: number },
): Promise<{ version: number } | Response> {
  const fila = await solicitudAlAlcance(sesion, id);
  if (!fila) return noEncontrado('esa solicitud');
  const rechazo = porQueNoPuedeDar('corregir', sesion, { ...fila, tieneCompraVigente: false });
  if (rechazo) return errorDePeticion(rechazo.mensaje, rechazo.estado);
  if (fila.version !== pedido.version) return errorDePeticion(MENSAJE_DE_SOLICITUD_CAMBIADA, 409);

  const lugar: LugarDeLaSolicitud = fila.empresaId
    ? { tipo: 'empresa', empresaId: fila.empresaId as 'occ' | 'geolab' }
    : { tipo: 'obra', obraId: fila.obraId as string, activa: true };
  const faltas = [...faltasDeLaSolicitud(pedido), ...(await faltasDeLosMateriales(lugar, pedido))];
  if (faltas.length) return Response.json({ error: faltas[0], faltas }, { status: 422 });

  const antes = await datosGuardados(fila);
  const campos = camposCorregidos(antes, pedido);
  const tomada = await tomarLaVersion(id, pedido.version, {
    estado: 'enviada',
    paraCuando: pedido.paraCuando,
    urgente: pedido.urgente,
    paraQue: pedido.paraQue.trim(),
    proveedorSugerido: pedido.proveedorSugerido.trim(),
    valorEstimado: pedido.valorEstimado,
  });
  if (!tomada) return errorDePeticion(MENSAJE_DE_SOLICITUD_CAMBIADA, 409);

  const db = baseServidor();
  await db.batch([
    db.delete(solicitudCompraRenglones).where(eq(solicitudCompraRenglones.solicitudId, id)),
    db.insert(solicitudCompraRenglones).values(
      pedido.renglones.map((r, i) => ({
        id: uuidv7(),
        solicitudId: id,
        orden: i + 1,
        descripcion: r.descripcion.trim(),
        materialId: r.materialId,
        cantidad: String(r.cantidad),
        unidad: r.unidad.trim(),
      })),
    ),
    db.insert(solicitudCompraEventos).values({
      id: uuidv7(),
      solicitudId: id,
      paso: 'corregir',
      cambios: [{ campos, renglonesAntes: campos.includes('lo que se pide') ? antes.renglones : undefined }],
      por: sesion.id,
    }),
  ]);
  return { version: pedido.version + 1 };
}

const ESTADO_TRAS_EL_PASO = {
  cancelar: 'cancelada',
  aprobar: 'aprobada',
  rechazar: 'rechazada',
  devolver: 'devuelta',
} as const;

/**
 * Cancela, aprueba, rechaza o devuelve una solicitud (RF-11, RF-13 a RF-15). Quién y desde
 * qué estado lo dice `porQueNoPuedeDar`; el motivo, `faltaDelMotivo`; al aprobar, las
 * cantidades las revisa `aprobacionDeLaSolicitud` y la historia guarda qué se bajó.
 */
export async function darPaso(
  sesion: PersonaEnSesion,
  id: string,
  pedido: { paso: keyof typeof ESTADO_TRAS_EL_PASO; version: number; motivo: string; cantidades: { renglonId: string; cantidad: number }[] },
): Promise<{ estado: EstadoDeSolicitud; version: number } | Response> {
  const fila = await solicitudAlAlcance(sesion, id);
  if (!fila) return noEncontrado('esa solicitud');
  const rechazo = porQueNoPuedeDar(pedido.paso, sesion, {
    ...fila,
    tieneCompraVigente: await tieneCompraVigente(id),
  });
  if (rechazo) return errorDePeticion(rechazo.mensaje, rechazo.estado);
  if (fila.version !== pedido.version) return errorDePeticion(MENSAJE_DE_SOLICITUD_CAMBIADA, 409);
  const faltaMotivo = faltaDelMotivo(pedido.paso, pedido.motivo);
  if (faltaMotivo) return errorDePeticion(faltaMotivo, 422);

  const db = baseServidor();
  let aprobacion: ReturnType<typeof aprobacionDeLaSolicitud> | null = null;
  if (pedido.paso === 'aprobar') {
    const renglones = await db
      .select()
      .from(solicitudCompraRenglones)
      .where(eq(solicitudCompraRenglones.solicitudId, id));
    aprobacion = aprobacionDeLaSolicitud(
      renglones.map((r) => ({ id: r.id, orden: r.orden, descripcion: r.descripcion, cantidad: Number(r.cantidad) })),
      pedido.cantidades,
    );
    if (aprobacion.faltas.length) {
      return Response.json({ error: aprobacion.faltas[0], faltas: aprobacion.faltas }, { status: 422 });
    }
  }

  const estado = ESTADO_TRAS_EL_PASO[pedido.paso];
  if (!(await tomarLaVersion(id, pedido.version, { estado }))) {
    return errorDePeticion(MENSAJE_DE_SOLICITUD_CAMBIADA, 409);
  }

  const evento = db.insert(solicitudCompraEventos).values({
    id: uuidv7(),
    solicitudId: id,
    paso: pedido.paso,
    motivo: pedido.motivo.trim() || null,
    cambios: aprobacion?.cambios ?? [],
    por: sesion.id,
  });
  if (aprobacion) {
    const aprobadas = Object.entries(aprobacion.aprobadas).map(([renglonId, cantidad]) =>
      db
        .update(solicitudCompraRenglones)
        .set({ cantidadAprobada: String(cantidad) })
        .where(eq(solicitudCompraRenglones.id, renglonId)),
    );
    await db.batch([evento, ...aprobadas]);
  } else {
    await evento;
  }
  return { estado, version: pedido.version + 1 };
}
