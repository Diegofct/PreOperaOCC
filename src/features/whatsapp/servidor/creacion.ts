/**
 * Crear lo que un mensaje de WhatsApp nombra y no existe (spec 024, RF-22 a RF-32).
 * **Solo servidor.**
 *
 * ── Una sola vez por obra, no una vez por mensaje ──
 *
 * La misma persona nueva sale en muchos mensajes: diez vales de Anderson Daza no
 * pueden dejar diez Anderson Daza. Por eso el id **no** sale del mensaje, como en la
 * spec 023, sino de la obra y del nombre normalizado (o de la placa): todos los
 * mensajes calculan el mismo id, y el segundo `insert … on conflict do nothing` no
 * hace nada. Materiales y sitios de cantera ya tienen un índice único por obra y
 * nombre normalizado: si choca, se vuelve a leer el que ya estaba.
 *
 * ── La marca de origen ──
 *
 * Cada cosa creada se anota en `whatsapp_creados` con el mensaje que la originó
 * (RF-32), y así sale en «Creado automáticamente» hasta que alguien la revise
 * (RF-33). Anotar también es `on conflict do nothing`: se queda el primer mensaje.
 *
 * Quien decide **si** crear —la regla `decisionDePersona`, la tolerancia de placa de
 * `reconocerVehiculo`, `placaRegistrable`— va antes y es pura. Aquí solo se escribe.
 */
import { and, eq, isNull } from 'drizzle-orm';

import { baseServidor } from '@/db/servidor/cliente';
import {
  canteraMateriales,
  canteraSitios,
  usuarios,
  vehiculos,
  whatsappCreados,
} from '@/db/servidor/esquema';
import type { Cargo } from '@/shared/catalogos/cargos';
import { normalizar } from '@/shared/rules/texto';
import { usuarioDeLaBandeja } from '@/shared/rules/whatsapp';
import type { TipoCreado } from '@/shared/rules/whatsapp-automatico';

import { ACTOR_SISTEMA } from './actor';
import { idDeterminista } from './ids';

/** Un nombre comparable: sin tildes, mayúsculas, signos ni espacios de más. */
function claveDeNombre(nombre: string): string {
  return normalizar(nombre)
    .replace(/[^a-z0-9ñ ]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Un nombre como se guarda: como se escribió, sin espacios de más. */
function nombreLimpio(nombre: string): string {
  return nombre.replace(/\s+/g, ' ').trim();
}

/**
 * Deja la marca «creado desde WhatsApp» (RF-32). Si ya estaba —otro mensaje la
 * creó antes—, se queda la primera.
 */
export async function anotarCreado(datos: {
  tipo: TipoCreado;
  registroId: string;
  obraId: string;
  mensajeId: string;
}): Promise<void> {
  await baseServidor()
    .insert(whatsappCreados)
    .values(datos)
    .onConflictDoNothing({ target: [whatsappCreados.tipo, whatsappCreados.registroId] });
}

/**
 * El registro con el que se unió lo creado (RF-36), o el mismo si no se unió. El id
 * de lo creado sale del nombre: el próximo mensaje con el mismo nombre mal escrito
 * calcula el mismo id, y tiene que llegar a la persona buena y no a la dada de baja.
 */
async function siSeUnio(tipo: TipoCreado, registroId: string): Promise<string> {
  const [marca] = await baseServidor()
    .select({ unidoA: whatsappCreados.unidoA })
    .from(whatsappCreados)
    .where(and(eq(whatsappCreados.tipo, tipo), eq(whatsappCreados.registroId, registroId)))
    .limit(1);
  return marca?.unidoA ?? registroId;
}

/**
 * Registra a una persona en la obra, sin acceso: rol operador, sin contraseña ni
 * código de celular (RF-22, como 023/RF-64), con el cargo que decidió la regla
 * (RF-25, RF-26). Devuelve su id.
 */
export async function crearPersona(datos: {
  obraId: string;
  nombre: string;
  cargo: Cargo | null;
  mensajeId: string;
}): Promise<string> {
  const id = await idDeterminista(datos.obraId, 'persona', claveDeNombre(datos.nombre));
  const nombre = nombreLimpio(datos.nombre);
  await baseServidor()
    .insert(usuarios)
    .values({
      id,
      usuario: usuarioDeLaBandeja(nombre, id),
      nombreCompleto: nombre,
      rol: 'operador',
      cargo: datos.cargo,
      obraId: datos.obraId,
      activo: true,
      registradoPor: ACTOR_SISTEMA.id,
      mensajeWhatsappId: datos.mensajeId,
    })
    .onConflictDoNothing({ target: usuarios.id });
  await anotarCreado({ tipo: 'persona', registroId: id, obraId: datos.obraId, mensajeId: datos.mensajeId });
  return siSeUnio('persona', id);
}

/**
 * Registra una volqueta en la obra con una placa que no se parece a ninguna (RF-30):
 * tipo volqueta, operativa, y con el código interno «WA-» + placa para que se note
 * de dónde salió. `placa` ya viene de `placaRegistrable`. Devuelve su id.
 *
 * Si el código ya lo tiene otra volqueta vigente —la misma placa creada antes en
 * otra obra—, se usa esa: el código es único en toda la flota.
 */
export async function crearVolqueta(datos: {
  obraId: string;
  placa: string;
  mensajeId: string;
}): Promise<string> {
  const db = baseServidor();
  const id = await idDeterminista(datos.obraId, 'vehiculo', datos.placa);
  const codigoInterno = `WA-${datos.placa}`;
  await db
    .insert(vehiculos)
    .values({
      id,
      codigoInterno,
      placa: datos.placa,
      tipoVehiculoId: 'volqueta',
      obraId: datos.obraId,
      estado: 'operativo',
    })
    .onConflictDoNothing();

  const [creada] = await db
    .select({ id: vehiculos.id })
    .from(vehiculos)
    .where(and(eq(vehiculos.codigoInterno, codigoInterno), isNull(vehiculos.eliminadoEn)))
    .limit(1);
  const vehiculoId = creada?.id ?? id;
  if (vehiculoId === id) {
    await anotarCreado({ tipo: 'vehiculo', registroId: id, obraId: datos.obraId, mensajeId: datos.mensajeId });
  }
  return siSeUnio('vehiculo', vehiculoId);
}

/** Registra un material de Control Cantera en la obra con el nombre escrito (RF-28). */
export async function crearMaterialDeCantera(datos: {
  obraId: string;
  nombre: string;
  mensajeId: string;
}): Promise<string> {
  const db = baseServidor();
  const nombre = nombreLimpio(datos.nombre);
  const nombreNormalizado = normalizar(nombre);
  const id = await idDeterminista(datos.obraId, 'material_cantera', claveDeNombre(nombre));
  await db
    .insert(canteraMateriales)
    .values({ id, obraId: datos.obraId, nombre, nombreNormalizado, creadoPor: ACTOR_SISTEMA.id })
    .onConflictDoNothing();

  const [vigente] = await db
    .select({ id: canteraMateriales.id })
    .from(canteraMateriales)
    .where(
      and(
        eq(canteraMateriales.obraId, datos.obraId),
        eq(canteraMateriales.nombreNormalizado, nombreNormalizado),
        isNull(canteraMateriales.eliminadoEn),
      ),
    )
    .limit(1);
  const materialId = vigente?.id ?? id;
  if (materialId === id) {
    await anotarCreado({ tipo: 'material_cantera', registroId: id, obraId: datos.obraId, mensajeId: datos.mensajeId });
  }
  return siSeUnio('material_cantera', materialId);
}

/**
 * Registra un sitio de Control Cantera en la obra con el nombre escrito (RF-29): de
 * tipo cantera si es el origen de un viaje, y «otro» si es el destino.
 */
export async function crearSitioDeCantera(datos: {
  obraId: string;
  nombre: string;
  tipo: 'cantera' | 'otro';
  mensajeId: string;
}): Promise<string> {
  const db = baseServidor();
  const nombre = nombreLimpio(datos.nombre);
  const nombreNormalizado = normalizar(nombre);
  const id = await idDeterminista(datos.obraId, 'sitio_cantera', claveDeNombre(nombre));
  await db
    .insert(canteraSitios)
    .values({ id, obraId: datos.obraId, nombre, nombreNormalizado, tipo: datos.tipo, creadoPor: ACTOR_SISTEMA.id })
    .onConflictDoNothing();

  const [vigente] = await db
    .select({ id: canteraSitios.id })
    .from(canteraSitios)
    .where(
      and(
        eq(canteraSitios.obraId, datos.obraId),
        eq(canteraSitios.nombreNormalizado, nombreNormalizado),
        isNull(canteraSitios.eliminadoEn),
      ),
    )
    .limit(1);
  const sitioId = vigente?.id ?? id;
  if (sitioId === id) {
    await anotarCreado({ tipo: 'sitio_cantera', registroId: id, obraId: datos.obraId, mensajeId: datos.mensajeId });
  }
  return siSeUnio('sitio_cantera', sitioId);
}
