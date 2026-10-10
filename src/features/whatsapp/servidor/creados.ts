/**
 * «Creado automáticamente»: lo que el sistema registró solo, para revisarlo o unirlo
 * con lo que ya existía (spec 024, RF-32 a RF-36, RF-75, RF-76). **Solo servidor.**
 *
 * ── Unir: «Es el mismo que…» ──
 *
 * Cuando lo creado resulta ser un registro que ya estaba —«Eddier Quinceno» es
 * «Eddier Alberto Quiceno Jacome»—, se pasa al bueno lo que lo usaba y lo creado se da
 * de baja (RF-36):
 *
 *  · los viajes vigentes se **anulan** con el motivo «Se unió con …» y se registra uno
 *    igual con el registro bueno, porque un viaje no se edita (RF-65, RF-75);
 *  · los renglones de las bitácoras abiertas pasan al bueno; si el bueno ya estaba en
 *    esa bitácora, el renglón repetido se quita, porque una persona o una máquina no
 *    puede ir dos veces (021/RF-19);
 *  · los movimientos de almacén vigentes pasan al material bueno;
 *  · lo que es de una bitácora cerrada **no se toca** (constitución, principio 4) y se
 *    dice cuántos quedaron así (RF-76).
 *
 * La marca guarda con quién se unió (`unido_a`): el próximo mensaje con el mismo nombre
 * mal escrito llega directo al bueno (`creacion.ts`).
 */
import { and, asc, eq, inArray, isNotNull, isNull, sql } from 'drizzle-orm';

import { baseServidor } from '@/db/servidor/cliente';
import {
  almacenMateriales,
  almacenMovimientos,
  canteraMateriales,
  canteraSitios,
  canteraViajes,
  obras,
  partesDeObra,
  usuarios,
  vehiculos,
  whatsappCreados,
  whatsappMensajes,
} from '@/db/servidor/esquema';
import type { CreadoFila } from '@/features/panel/contratos';
import { veTodasLasObras } from '@/features/servidor/alcance';
import type { PersonaEnSesion } from '@/features/servidor/guardia';
import { errorDePeticion, noEncontrado } from '@/features/servidor/respuestas';
import { TIPOS_CREADOS, type TipoCreado } from '@/shared/rules/whatsapp-automatico';

import { idDeterminista } from './ids';

export function esTipoCreado(tipo: string): tipo is TipoCreado {
  return (TIPOS_CREADOS as readonly string[]).includes(tipo);
}

/** El nombre de cada registro creado, por tipo. */
async function nombres(tipo: TipoCreado, ids: string[]): Promise<Map<string, { nombre: string; detalle: string | null }>> {
  if (ids.length === 0) return new Map();
  const db = baseServidor();
  const filas =
    tipo === 'persona'
      ? (await db.select({ id: usuarios.id, nombre: usuarios.nombreCompleto, detalle: usuarios.cargo }).from(usuarios).where(inArray(usuarios.id, ids)))
      : tipo === 'vehiculo'
        ? (await db.select({ id: vehiculos.id, nombre: vehiculos.codigoInterno, detalle: vehiculos.placa }).from(vehiculos).where(inArray(vehiculos.id, ids)))
        : tipo === 'material_cantera'
          ? (await db.select({ id: canteraMateriales.id, nombre: canteraMateriales.nombre, detalle: sql<string | null>`null` }).from(canteraMateriales).where(inArray(canteraMateriales.id, ids)))
          : tipo === 'sitio_cantera'
            ? (await db.select({ id: canteraSitios.id, nombre: canteraSitios.nombre, detalle: sql<string | null>`${canteraSitios.tipo}::text` }).from(canteraSitios).where(inArray(canteraSitios.id, ids)))
            : (await db.select({ id: almacenMateriales.id, nombre: almacenMateriales.nombre, detalle: sql<string | null>`${almacenMateriales.unidad}::text` }).from(almacenMateriales).where(inArray(almacenMateriales.id, ids)));
  return new Map(filas.map((f) => [f.id, { nombre: f.nombre, detalle: f.detalle }]));
}

/**
 * Lo creado de la obra (o de todas, para la gerencia) en un rango de días en que se
 * creó, lo más antiguo primero (024/RF-33; 025/RF-47). Sin tope: el rango acota.
 */
export async function listarCreados(
  sesion: PersonaEnSesion,
  filtro: { obraId: string | null; revisados: boolean; desde: string; hasta: string },
): Promise<{ creados: CreadoFila[]; anterioresSinRevisar: number }> {
  const obraId = veTodasLasObras(sesion) ? filtro.obraId : sesion.obraId;
  if (!veTodasLasObras(sesion) && !obraId) return { creados: [], anterioresSinRevisar: 0 };
  const filas = await baseServidor()
    .select({
      tipo: whatsappCreados.tipo,
      registroId: whatsappCreados.registroId,
      obraId: whatsappCreados.obraId,
      obraNombre: obras.nombre,
      mensajeId: whatsappCreados.mensajeId,
      autorDelMensaje: whatsappMensajes.autorNombre,
      creadoEn: whatsappCreados.creadoEn,
      revisadoEn: whatsappCreados.revisadoEn,
      unidoA: whatsappCreados.unidoA,
    })
    .from(whatsappCreados)
    .innerJoin(obras, eq(obras.id, whatsappCreados.obraId))
    .innerJoin(whatsappMensajes, eq(whatsappMensajes.id, whatsappCreados.mensajeId))
    .where(
      and(
        obraId ? eq(whatsappCreados.obraId, obraId) : undefined,
        filtro.revisados ? isNotNull(whatsappCreados.revisadoEn) : isNull(whatsappCreados.revisadoEn),
        sql`(${whatsappCreados.creadoEn} at time zone 'America/Bogota')::date between ${filtro.desde} and ${filtro.hasta}`,
      ),
    )
    .orderBy(asc(whatsappCreados.creadoEn));

  const porTipo = new Map<TipoCreado, Map<string, { nombre: string; detalle: string | null }>>();
  for (const tipo of TIPOS_CREADOS) {
    porTipo.set(tipo, await nombres(tipo, filas.filter((f) => f.tipo === tipo).map((f) => f.registroId)));
  }
  const creados = filas.map((f) => {
    const n = porTipo.get(f.tipo)?.get(f.registroId);
    return {
      ...f,
      nombre: n?.nombre ?? '(dado de baja)',
      detalle: n?.detalle ?? null,
      creadoEn: f.creadoEn.toISOString(),
      revisadoEn: f.revisadoEn?.toISOString() ?? null,
    };
  });

  // Lo que quedó sin revisar antes de «Desde»: que no se olvide por estar fuera del rango.
  const [anteriores] = filtro.revisados
    ? [{ n: 0 }]
    : await baseServidor()
        .select({ n: sql<number>`count(*)::int` })
        .from(whatsappCreados)
        .where(
          and(
            obraId ? eq(whatsappCreados.obraId, obraId) : undefined,
            isNull(whatsappCreados.revisadoEn),
            sql`(${whatsappCreados.creadoEn} at time zone 'America/Bogota')::date < ${filtro.desde}`,
          ),
        );
  return { creados, anterioresSinRevisar: anteriores?.n ?? 0 };
}

/** Una marca al alcance de la sesión, o `null`. */
async function leerCreado(sesion: PersonaEnSesion, tipo: TipoCreado, registroId: string) {
  const [marca] = await baseServidor()
    .select({ obraId: whatsappCreados.obraId, revisadoEn: whatsappCreados.revisadoEn })
    .from(whatsappCreados)
    .where(and(eq(whatsappCreados.tipo, tipo), eq(whatsappCreados.registroId, registroId)))
    .limit(1);
  if (!marca) return null;
  if (!veTodasLasObras(sesion) && marca.obraId !== sesion.obraId) return null;
  return marca;
}

/** Lo marca revisado: sale de la lista y conserva su marca de origen (RF-34). */
export async function marcarRevisado(
  sesion: PersonaEnSesion,
  tipo: TipoCreado,
  registroId: string,
): Promise<{ revisado: true } | Response> {
  const marca = await leerCreado(sesion, tipo, registroId);
  if (!marca) return noEncontrado('ese registro');
  const [hecha] = await baseServidor()
    .update(whatsappCreados)
    .set({ revisadoPor: sesion.id, revisadoEn: new Date() })
    .where(and(eq(whatsappCreados.tipo, tipo), eq(whatsappCreados.registroId, registroId), isNull(whatsappCreados.revisadoEn)))
    .returning({ registroId: whatsappCreados.registroId });
  return hecha ? { revisado: true } : errorDePeticion('Ese registro ya se revisó.', 409);
}

/** ¿El otro registro existe, está vigente, es del mismo tipo y de la misma obra? */
async function otroValido(tipo: TipoCreado, otroId: string, obraId: string): Promise<string | null> {
  const db = baseServidor();
  const [fila] =
    tipo === 'persona'
      ? await db.select({ nombre: usuarios.nombreCompleto }).from(usuarios).where(and(eq(usuarios.id, otroId), eq(usuarios.obraId, obraId), isNull(usuarios.eliminadoEn)))
      : tipo === 'vehiculo'
        ? await db.select({ nombre: vehiculos.codigoInterno }).from(vehiculos).where(and(eq(vehiculos.id, otroId), eq(vehiculos.obraId, obraId), isNull(vehiculos.eliminadoEn)))
        : tipo === 'material_cantera'
          ? await db.select({ nombre: canteraMateriales.nombre }).from(canteraMateriales).where(and(eq(canteraMateriales.id, otroId), eq(canteraMateriales.obraId, obraId), isNull(canteraMateriales.eliminadoEn)))
          : tipo === 'sitio_cantera'
            ? await db.select({ nombre: canteraSitios.nombre }).from(canteraSitios).where(and(eq(canteraSitios.id, otroId), eq(canteraSitios.obraId, obraId), isNull(canteraSitios.eliminadoEn)))
            : await db.select({ nombre: almacenMateriales.nombre }).from(almacenMateriales).where(and(eq(almacenMateriales.id, otroId), eq(almacenMateriales.obraId, obraId), isNull(almacenMateriales.eliminadoEn)));
  return fila?.nombre ?? null;
}

/** Las fechas de la obra con la bitácora cerrada: ahí no se toca nada (RF-76). */
async function fechasCerradas(obraId: string): Promise<Set<string>> {
  const filas = await baseServidor()
    .select({ fecha: partesDeObra.fecha })
    .from(partesDeObra)
    .where(and(eq(partesDeObra.obraId, obraId), isNotNull(partesDeObra.cerradoEn), isNull(partesDeObra.anuladoEn)));
  return new Set(filas.map((f) => f.fecha));
}

/** Los viajes: anular y registrar uno igual con el bueno (RF-75). Devuelve cuántos y cuántos se dejaron. */
async function unirViajes(
  sesion: PersonaEnSesion,
  datos: { tipo: TipoCreado; viejo: string; nuevo: string; nombreNuevo: string; obraId: string; cerradas: Set<string> },
): Promise<{ movidos: number; sinTocar: number }> {
  const columna =
    datos.tipo === 'persona'
      ? canteraViajes.conductorId
      : datos.tipo === 'vehiculo'
        ? canteraViajes.vehiculoId
        : datos.tipo === 'material_cantera'
          ? canteraViajes.materialId
          : null;
  const db = baseServidor();
  const condicion =
    datos.tipo === 'sitio_cantera'
      ? sql`(${canteraViajes.origenId} = ${datos.viejo} or ${canteraViajes.destinoId} = ${datos.viejo})`
      : columna
        ? eq(columna, datos.viejo)
        : undefined;
  if (!condicion) return { movidos: 0, sinTocar: 0 };

  const viajes = await db
    .select()
    .from(canteraViajes)
    .where(and(eq(canteraViajes.obraId, datos.obraId), isNull(canteraViajes.anuladoEn), condicion));
  let movidos = 0;
  let sinTocar = 0;
  for (const v of viajes) {
    if (datos.cerradas.has(v.fecha)) {
      sinTocar++;
      continue;
    }
    const cambio =
      datos.tipo === 'persona'
        ? { conductorId: datos.nuevo }
        : datos.tipo === 'vehiculo'
          ? { vehiculoId: datos.nuevo }
          : datos.tipo === 'material_cantera'
            ? { materialId: datos.nuevo }
            : {
                origenId: v.origenId === datos.viejo ? datos.nuevo : v.origenId,
                destinoId: v.destinoId === datos.viejo ? datos.nuevo : v.destinoId,
              };
    // Primero el nuevo, con id fijo (repetir no duplica); después se anula el viejo.
    await db
      .insert(canteraViajes)
      .values({
        ...v,
        ...cambio,
        id: await idDeterminista(v.id, 'unido', datos.nuevo),
        registradoPor: sesion.id,
        creadoEn: new Date(),
        anuladoEn: null,
        anuladoPor: null,
        motivoAnulacion: null,
      })
      .onConflictDoNothing({ target: canteraViajes.id });
    await db
      .update(canteraViajes)
      .set({ anuladoEn: new Date(), anuladoPor: sesion.id, motivoAnulacion: `Se unió con ${datos.nombreNuevo}.` })
      .where(and(eq(canteraViajes.id, v.id), isNull(canteraViajes.anuladoEn)));
    movidos++;
  }
  return { movidos, sinTocar };
}

/** Los renglones de las bitácoras abiertas (personal y maquinaria). Devuelve cuántas cambió y cuántas dejó. */
async function unirEnBitacoras(datos: {
  tipo: 'persona' | 'vehiculo';
  viejo: string;
  nuevo: string;
  nombreNuevo: string;
  obraId: string;
}): Promise<{ movidos: number; sinTocar: number }> {
  const db = baseServidor();
  const partes = await db
    .select({ id: partesDeObra.id, cerradoEn: partesDeObra.cerradoEn, personal: partesDeObra.personal, maquinaria: partesDeObra.maquinaria })
    .from(partesDeObra)
    .where(and(eq(partesDeObra.obraId, datos.obraId), isNull(partesDeObra.anuladoEn)));
  let movidos = 0;
  let sinTocar = 0;
  for (const parte of partes) {
    const usa =
      datos.tipo === 'persona'
        ? parte.personal.some((p) => p.usuarioId === datos.viejo) || parte.maquinaria.some((m) => m.operadorId === datos.viejo)
        : parte.maquinaria.some((m) => m.vehiculoId === datos.viejo);
    if (!usa) continue;
    if (parte.cerradoEn) {
      sinTocar++;
      continue;
    }
    let personal = parte.personal;
    let maquinaria = parte.maquinaria;
    if (datos.tipo === 'persona') {
      const yaEsta = personal.some((p) => p.usuarioId === datos.nuevo);
      personal = yaEsta
        ? personal.filter((p) => p.usuarioId !== datos.viejo)
        : personal.map((p) => (p.usuarioId === datos.viejo ? { ...p, usuarioId: datos.nuevo, nombre: datos.nombreNuevo } : p));
      maquinaria = maquinaria.map((m) =>
        m.operadorId === datos.viejo ? { ...m, operadorId: datos.nuevo, operadorNombre: datos.nombreNuevo } : m,
      );
    } else {
      const yaEsta = maquinaria.some((m) => m.vehiculoId === datos.nuevo);
      maquinaria = yaEsta
        ? maquinaria.filter((m) => m.vehiculoId !== datos.viejo)
        : maquinaria.map((m) => (m.vehiculoId === datos.viejo ? { ...m, vehiculoId: datos.nuevo, codigo: datos.nombreNuevo } : m));
    }
    const [escrita] = await db
      .update(partesDeObra)
      .set({ personal, maquinaria })
      .where(and(eq(partesDeObra.id, parte.id), isNull(partesDeObra.cerradoEn)))
      .returning({ id: partesDeObra.id });
    if (escrita) movidos++;
    else sinTocar++;
  }
  return { movidos, sinTocar };
}

/** Da de baja lo creado (RF-36): nada se borra. */
async function darDeBaja(tipo: TipoCreado, id: string): Promise<void> {
  const db = baseServidor();
  const ahora = new Date();
  if (tipo === 'persona') await db.update(usuarios).set({ eliminadoEn: ahora, activo: false }).where(eq(usuarios.id, id));
  else if (tipo === 'vehiculo') await db.update(vehiculos).set({ eliminadoEn: ahora }).where(eq(vehiculos.id, id));
  else if (tipo === 'material_cantera') await db.update(canteraMateriales).set({ eliminadoEn: ahora }).where(eq(canteraMateriales.id, id));
  else if (tipo === 'sitio_cantera') await db.update(canteraSitios).set({ eliminadoEn: ahora }).where(eq(canteraSitios.id, id));
  else await db.update(almacenMateriales).set({ eliminadoEn: ahora }).where(eq(almacenMateriales.id, id));
}

/** «Es el mismo que…»: une lo creado con el registro que ya existía (RF-36, RF-75, RF-76). */
export async function unirCreado(
  sesion: PersonaEnSesion,
  tipo: TipoCreado,
  registroId: string,
  conRegistroId: string,
): Promise<{ viajes: number; bitacoras: number; movimientos: number; sinTocar: number } | Response> {
  const marca = await leerCreado(sesion, tipo, registroId);
  if (!marca) return noEncontrado('ese registro');
  if (marca.revisadoEn) return errorDePeticion('Ese registro ya se revisó o se unió.', 409);
  if (conRegistroId === registroId) return errorDePeticion('Elija otro registro: es el mismo.', 400);
  const nombreNuevo = await otroValido(tipo, conRegistroId, marca.obraId);
  if (!nombreNuevo) return errorDePeticion('Ese registro no existe en la obra o está dado de baja.', 400);

  const cerradas = await fechasCerradas(marca.obraId);
  const viajes = await unirViajes(sesion, { tipo, viejo: registroId, nuevo: conRegistroId, nombreNuevo, obraId: marca.obraId, cerradas });
  const bitacoras =
    tipo === 'persona' || tipo === 'vehiculo'
      ? await unirEnBitacoras({ tipo, viejo: registroId, nuevo: conRegistroId, nombreNuevo, obraId: marca.obraId })
      : { movidos: 0, sinTocar: 0 };
  let movimientos = 0;
  if (tipo === 'material_almacen') {
    const movidos = await baseServidor()
      .update(almacenMovimientos)
      .set({ materialId: conRegistroId })
      .where(and(eq(almacenMovimientos.materialId, registroId), isNull(almacenMovimientos.anuladoEn)))
      .returning({ id: almacenMovimientos.id });
    movimientos = movidos.length;
  }

  await darDeBaja(tipo, registroId);
  await baseServidor()
    .update(whatsappCreados)
    .set({ unidoA: conRegistroId, revisadoPor: sesion.id, revisadoEn: new Date() })
    .where(and(eq(whatsappCreados.tipo, tipo), eq(whatsappCreados.registroId, registroId)));
  return {
    viajes: viajes.movidos,
    bitacoras: bitacoras.movidos,
    movimientos,
    sinTocar: viajes.sinTocar + bitacoras.sinTocar,
  };
}
