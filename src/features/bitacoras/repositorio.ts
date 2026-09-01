/**
 * Acceso a datos de la bitácora. Todo contra SQLite, como el preoperacional.
 *
 * La lleva el **jefe de operadores** (residente de obra o supervisor): un
 * registro por máquina y por día — lo garantiza `ux_bitacora_vehiculo_fecha` —
 * con horómetro inicial y final, el operador que la manejó, y normalmente una
 * actividad.
 *
 * El operador de la máquina no toca nada de esto: él solo firma el
 * preoperacional.
 */
import { and, desc, eq, inArray, isNull } from 'drizzle-orm';
import { uuidv7 } from 'uuidv7';

import { db } from '@/db/local/client';
import {
  asignaciones,
  bitacoras,
  obras,
  tiposVehiculo,
  usuarios,
  vehiculos,
  type ActividadBitacora,
  type EstadoSync,
} from '@/db/local/schema';
import { encolar } from '@/features/sync/outbox';
import { esBitacoraCompleta, fechaLocalISO } from '@/shared/rules/jornada';

import { nombreDeActividad } from './actividades';

/** Una máquina de la obra tal como la ve el jefe de operadores. */
export interface MaquinaDelDia {
  vehiculoId: string;
  codigoInterno: string;
  tipoVehiculoId: string;
  tipoNombre: string;
  placa: string | null;
  horometroConocido: number | null;
  /** El operador asignado hoy, si lo hay. Precarga el campo del formulario. */
  operadorId: string | null;
  operadorNombre: string | null;
  /** La bitácora del día, si ya se creó. */
  bitacoraId: string | null;
  completa: boolean;
}

export interface Bitacora {
  id: string;
  vehiculoId: string;
  codigoInterno: string;
  tipoVehiculoId: string;
  fecha: string;
  operadorId: string | null;
  horometroInicial: number | null;
  horometroFinal: number | null;
  actividades: ActividadBitacora[];
  cerradaEn: number | null;
}

const COLUMNAS_BITACORA = {
  id: bitacoras.id,
  vehiculoId: bitacoras.vehiculoId,
  codigoInterno: vehiculos.codigoInterno,
  tipoVehiculoId: vehiculos.tipoVehiculoId,
  fecha: bitacoras.fecha,
  operadorId: bitacoras.operadorId,
  horometroInicial: bitacoras.horometroInicial,
  horometroFinal: bitacoras.horometroFinal,
  actividades: bitacoras.actividades,
  cerradaEn: bitacoras.cerradaEn,
} as const;

/** La obra del jefe de operadores. Sin ella no sabe qué máquinas le tocan. */
export async function obraDelUsuario(usuarioId: string): Promise<{ id: string; nombre: string } | null> {
  const filas = await db
    .select({ id: obras.id, nombre: obras.nombre })
    .from(usuarios)
    .innerJoin(obras, eq(usuarios.obraId, obras.id))
    .where(eq(usuarios.id, usuarioId))
    .limit(1);

  return filas[0] ?? null;
}

/**
 * Las máquinas de la obra con el estado de su bitácora de hoy.
 *
 * Es la pantalla de inicio del jefe de operadores, así que resuelve todo en
 * tres consultas y no en una por máquina.
 */
export async function maquinasDelDia(obraId: string, ahora = Date.now()): Promise<MaquinaDelDia[]> {
  const fecha = fechaLocalISO(ahora);

  const flota = await db
    .select({
      vehiculoId: vehiculos.id,
      codigoInterno: vehiculos.codigoInterno,
      tipoVehiculoId: vehiculos.tipoVehiculoId,
      tipoNombre: tiposVehiculo.nombre,
      placa: vehiculos.placa,
      horometroConocido: vehiculos.horometroH,
    })
    .from(vehiculos)
    .innerJoin(tiposVehiculo, eq(vehiculos.tipoVehiculoId, tiposVehiculo.id))
    .where(and(eq(vehiculos.obraId, obraId), isNull(vehiculos.eliminadoEn)))
    .orderBy(vehiculos.codigoInterno);

  if (flota.length === 0) return [];
  const ids = flota.map((v) => v.vehiculoId);

  const vigentes = await db
    .select({
      vehiculoId: asignaciones.vehiculoId,
      operadorId: asignaciones.usuarioId,
      operadorNombre: usuarios.nombreCompleto,
      desde: asignaciones.desde,
    })
    .from(asignaciones)
    .innerJoin(usuarios, eq(asignaciones.usuarioId, usuarios.id))
    .where(and(inArray(asignaciones.vehiculoId, ids), isNull(asignaciones.hasta)))
    .orderBy(desc(asignaciones.desde));

  // La más reciente gana si una máquina tiene varias asignaciones vigentes.
  const operadorPorVehiculo = new Map<string, { id: string; nombre: string }>();
  for (const fila of vigentes) {
    if (!operadorPorVehiculo.has(fila.vehiculoId)) {
      operadorPorVehiculo.set(fila.vehiculoId, { id: fila.operadorId, nombre: fila.operadorNombre });
    }
  }

  const delDia = await db
    .select({
      id: bitacoras.id,
      vehiculoId: bitacoras.vehiculoId,
      operadorId: bitacoras.operadorId,
      horometroInicial: bitacoras.horometroInicial,
      horometroFinal: bitacoras.horometroFinal,
      actividades: bitacoras.actividades,
    })
    .from(bitacoras)
    .where(and(inArray(bitacoras.vehiculoId, ids), eq(bitacoras.fecha, fecha)));

  const bitacoraPorVehiculo = new Map(delDia.map((b) => [b.vehiculoId, b]));

  return flota.map((maquina) => {
    const operador = operadorPorVehiculo.get(maquina.vehiculoId) ?? null;
    const bitacora = bitacoraPorVehiculo.get(maquina.vehiculoId) ?? null;
    return {
      ...maquina,
      operadorId: operador?.id ?? null,
      operadorNombre: operador?.nombre ?? null,
      bitacoraId: bitacora?.id ?? null,
      completa: bitacora ? esBitacoraCompleta(bitacora) : false,
    };
  });
}

/**
 * Abre la bitácora del día para esa máquina, o devuelve la que ya estaba.
 *
 * Idempotente: entrar dos veces al formulario no crea dos registros. El
 * operador y el preoperacional del día se precargan, pero el jefe los puede
 * corregir — el asignado no siempre es quien terminó operando.
 */
export async function abrirBitacora(datos: {
  usuarioId: string;
  vehiculoId: string;
  obraId: string | null;
  operadorId: string | null;
  ahora?: number;
}): Promise<string> {
  const ahora = datos.ahora ?? Date.now();
  const fecha = fechaLocalISO(ahora);

  const [existente] = await db
    .select({ id: bitacoras.id })
    .from(bitacoras)
    .where(and(eq(bitacoras.vehiculoId, datos.vehiculoId), eq(bitacoras.fecha, fecha)))
    .limit(1);

  if (existente) return existente.id;

  const id = uuidv7();
  await db.insert(bitacoras).values({
    id,
    vehiculoId: datos.vehiculoId,
    usuarioId: datos.usuarioId,
    obraId: datos.obraId,
    operadorId: datos.operadorId,
    preoperacionalId: null,
    fecha,
    horometroInicial: null,
    horometroFinal: null,
    actividades: [],
    cerradaEn: null,
    estadoSync: 'borrador',
  });
  return id;
}

export async function bitacoraPorId(id: string): Promise<Bitacora | null> {
  const filas = await db
    .select(COLUMNAS_BITACORA)
    .from(bitacoras)
    .innerJoin(vehiculos, eq(bitacoras.vehiculoId, vehiculos.id))
    .where(eq(bitacoras.id, id))
    .limit(1);

  return filas[0] ?? null;
}

export interface ActividadNueva {
  clave: string;
  /** Solo cuando la clave es 'otra'. */
  texto?: string;
  descripcion: string;
  observaciones: string;
}

export function construirActividad(nueva: ActividadNueva): ActividadBitacora {
  return {
    id: uuidv7(),
    clave: nueva.clave,
    // Se guarda el nombre además de la clave: el registro se sigue leyendo
    // aunque el catálogo de actividades cambie más adelante.
    nombre: nueva.texto?.trim() || nombreDeActividad(nueva.clave),
    descripcion: nueva.descripcion.trim(),
    observaciones: nueva.observaciones.trim(),
  };
}

/**
 * Guarda el estado del formulario. Se llama en cada cambio: escribir en SQLite
 * es barato y así cerrar la app a mitad no cuesta nada.
 */
export async function guardarBitacora(
  id: string,
  cambios: {
    operadorId?: string | null;
    horometroInicial?: number | null;
    horometroFinal?: number | null;
    actividades?: ActividadBitacora[];
  },
): Promise<void> {
  await db.update(bitacoras).set({ ...cambios, actualizadoEn: Date.now() }).where(eq(bitacoras.id, id));
}

/**
 * Cierra la bitácora del día y la pone en la cola de salida.
 *
 * Avanza también el horómetro del vehículo con la lectura final: es la más
 * reciente que existe, y de ahí salen los disparadores de mantenimiento.
 */
export async function cerrarBitacora(id: string, ahora = Date.now()): Promise<void> {
  await db
    .update(bitacoras)
    .set({ cerradaEn: ahora, estadoSync: 'pendiente' satisfies EstadoSync, actualizadoEn: ahora })
    .where(eq(bitacoras.id, id));

  const [completa] = await db.select().from(bitacoras).where(eq(bitacoras.id, id)).limit(1);
  if (!completa) return;

  // A la cola con `refrescar`: la bitácora se edita durante el día, así que lo
  // que debe subir es la última versión — conservando su lugar en la fila.
  await encolar('bitacora', id, completa, { refrescar: true });

  if (completa.horometroFinal == null) return;

  const [vehiculo] = await db
    .select({ horometroH: vehiculos.horometroH })
    .from(vehiculos)
    .where(eq(vehiculos.id, completa.vehiculoId))
    .limit(1);
  if (!vehiculo) return;

  await db
    .update(vehiculos)
    .set({
      horometroH: Math.max(completa.horometroFinal, vehiculo.horometroH ?? 0),
      medidorActualizadoEn: ahora,
    })
    .where(eq(vehiculos.id, completa.vehiculoId));
}

export async function historialDeBitacoras(usuarioId: string, limite = 20) {
  return db
    .select({
      id: bitacoras.id,
      fecha: bitacoras.fecha,
      codigoInterno: vehiculos.codigoInterno,
      horometroInicial: bitacoras.horometroInicial,
      horometroFinal: bitacoras.horometroFinal,
      cerradaEn: bitacoras.cerradaEn,
      estadoSync: bitacoras.estadoSync,
    })
    .from(bitacoras)
    .innerJoin(vehiculos, eq(bitacoras.vehiculoId, vehiculos.id))
    .where(eq(bitacoras.usuarioId, usuarioId))
    .orderBy(desc(bitacoras.fecha))
    .limit(limite);
}
