/**
 * El guardado automático de un mensaje de WhatsApp (spec 024). **Solo servidor.**
 *
 * `procesarMensaje` hace con un mensaje entregado lo que antes hacía el residente al
 * aprobarlo, sin esperar a nadie (RF-1, RF-70):
 *
 *  1. lee la propuesta contra los catálogos de la obra (`resolverPropuesta`);
 *  2. completa lo que se puede suponer sin inventar (`completarViaje`, RF-16, RF-17);
 *  3. crea lo que no existe y no se parece a nada (`creacion.ts`, RF-22 a RF-31);
 *  4. aparta a «No se pudo guardar» los renglones que siguen incompletos (RF-19, RF-20);
 *  5. guarda el resto en su módulo con el usuario de sistema (RF-2, RF-3, RF-10);
 *  6. marca el mensaje `guardado`, con lo que se guardó y dónde (RF-58).
 *
 * Control Cantera y Almacén se guardan al llegar. Lo que va a la bitácora queda
 * `en_espera` de su día (RF-5) —sus viajes sí se guardan ya (RF-52)— y lo arma
 * `dias.ts` cuando el día tiene sus reportes. Cada mensaje avisa a su día.
 *
 * ── Repetir no duplica ──
 *
 * Todo lo que escribe lleva ids fijos —los viajes, por mensaje y renglón original;
 * lo creado, por obra y nombre; los renglones apartados, por mensaje, sección y
 * renglón—, así que procesar dos veces el mismo mensaje (n8n reintenta, el pulso
 * reintenta) da lo mismo que una. Lo que no se pudo escribir lanza un error: el
 * mensaje queda `pendiente` con su error, y el siguiente intento lo retoma.
 */
import { and, eq, isNull, sql } from 'drizzle-orm';

import { baseServidor } from '@/db/servidor/cliente';
import { canteraViajes, obras, whatsappGrupos, whatsappMensajes } from '@/db/servidor/esquema';
import { eleccionesAjenas, opcionesDeLaObra } from '@/features/cantera/servidor/viajes';
import { reporteCorregido } from '@/features/panel/contratos';
import { valeLimpio } from '@/shared/rules/cantera';
import { fechaDeJornada } from '@/shared/rules/jornada';
import {
  candidatosDeVehiculo,
  candidatosEnCantera,
  claveDeMaterialNuevo,
  destinoDeCategoria,
  faltasDelReporte,
  resolverPropuesta,
  type PropuestaLeible,
  type ReporteDelDia,
  type ViajeDelReporte,
} from '@/shared/rules/whatsapp';
import {
  completarViaje,
  decisionDePersona,
  placaRegistrable,
  separarRenglones,
  tipoDeReporte,
  viajeRepetido,
  viajesQueFaltan,
  type FaltaDeRenglon,
} from '@/shared/rules/whatsapp-automatico';

import { ACTOR_SISTEMA } from './actor';
import { escribirReporteDeAlmacen, faltasDelAlmacen } from './almacen';
import { apartar } from './apartados';
import { guardarViajes, marcarMensaje } from './aprobacion';
import { catalogosDeLaObra } from './catalogos';
import {
  anotarCreado,
  crearMaterialDeCantera,
  crearPersona,
  crearSitioDeCantera,
  crearVolqueta,
} from './creacion';
import { actualizarDia } from './dias';
import { idDeterminista } from './ids';
import { obraDelMensaje } from './obra';

/** Lo que pasó con un mensaje al procesarlo. */
export type ResultadoDelProceso =
  /** Su grupo no tiene obra: espera a que la gerencia lo asocie (021/RF-11). */
  | { estado: 'sin_obra' }
  /** Ya no estaba pendiente: lo guardó otro intento, o lo decidió una persona. */
  | { estado: 'no_pendiente' }
  /** Va a la bitácora: espera a su día; sus viajes ya se guardaron (RF-5, RF-52). */
  | { estado: 'en_espera'; resultado: ResultadoGuardado }
  /** Ignorar o una categoría sin destino: no se guarda nada (RF-6). */
  | { estado: 'sin_destino' }
  | { estado: 'guardado'; resultado: ResultadoGuardado };

/** Lo que queda escrito en el mensaje para el historial (RF-58, RF-59). */
export interface ResultadoGuardado {
  modulo: 'cantera' | 'almacen' | 'bitacora';
  /** Los ids de los viajes o movimientos guardados, para enlazarlos. */
  guardados: string[];
  /** Los viajes que ya estaban guardados por otro mensaje (RF-13). */
  repetidos: number;
  /** Los renglones que fueron a «No se pudo guardar» (RF-19). */
  apartados: number;
  /** Lo que se registró nuevo para este mensaje (RF-32). */
  creados: number;
}

/** El mensaje con lo que hace falta para procesarlo. */
async function leerMensaje(id: string) {
  const [fila] = await baseServidor()
    .select({
      estado: whatsappMensajes.estado,
      version: whatsappMensajes.version,
      categoria: whatsappMensajes.categoria,
      enviadoEn: whatsappMensajes.enviadoEn,
      propuestaIa: whatsappMensajes.propuestaIa,
      propuesta: whatsappMensajes.propuesta,
      obraId: sql<string | null>`${obraDelMensaje}`,
      canteraActiva: obras.canteraActivo,
      almacenActivo: obras.almacenActivo,
    })
    .from(whatsappMensajes)
    .innerJoin(whatsappGrupos, eq(whatsappGrupos.id, whatsappMensajes.grupoId))
    .leftJoin(obras, sql`${obras.id} = ${obraDelMensaje}`)
    .where(eq(whatsappMensajes.id, id))
    .limit(1);
  return fila ?? null;
}

/** El mensaje, guardado por el sistema, con su resultado para el historial. */
async function marcarGuardado(datos: {
  mensajeId: string;
  version: number;
  reporte: ReporteDelDia;
  obraId: string;
  categoria: string | null;
  resultado: ResultadoGuardado;
}): Promise<boolean> {
  const marcado = await marcarMensaje({
    mensajeId: datos.mensajeId,
    reporte: datos.reporte,
    parteId: null,
    obraId: datos.obraId,
    actor: ACTOR_SISTEMA,
    estado: 'guardado',
    desde: { estado: 'pendiente', version: datos.version },
  });
  await baseServidor()
    .update(whatsappMensajes)
    .set({
      procesadoEn: new Date(),
      fechaHecho: datos.reporte.fecha,
      tipoReporte: tipoDeReporte(datos.categoria, datos.reporte),
      resultado: datos.resultado as unknown as Record<string, unknown>,
      errorProceso: null,
    })
    .where(eq(whatsappMensajes.id, datos.mensajeId));
  return marcado;
}

/* ── Control Cantera ───────────────────────────────────────────────────── */

/**
 * Crea lo que el viaje nombra y no existe (RF-18, RF-28 a RF-31). Solo si **nada** se
 * le parece: con dos parecidos se elige en «No se pudo guardar» (021/RF-108). Devuelve
 * el viaje con lo creado, y cuántas cosas creó.
 */
async function crearLoDelViaje(
  viaje: ViajeDelReporte,
  contexto: {
    obraId: string;
    mensajeId: string;
    catalogos: Awaited<ReturnType<typeof catalogosDeLaObra>>;
  },
): Promise<{ viaje: ViajeDelReporte; creados: number }> {
  const { obraId, mensajeId, catalogos } = contexto;
  const v = { ...viaje };
  let creados = 0;

  if (!v.vehiculoId && v.placaEscrita) {
    const placa = placaRegistrable(v.placaEscrita);
    if (placa && candidatosDeVehiculo(v.placaEscrita, catalogos.catalogos.vehiculos, obraId).length === 0) {
      v.vehiculoId = await crearVolqueta({ obraId, placa, mensajeId });
      creados++;
    }
  }
  if (!v.materialId && v.materialEscrito && candidatosEnCantera(v.materialEscrito, catalogos.catalogos.materiales).length === 0) {
    v.materialId = await crearMaterialDeCantera({ obraId, nombre: v.materialEscrito, mensajeId });
    creados++;
  }
  if (!v.origenId && v.origenEscrito && candidatosEnCantera(v.origenEscrito, catalogos.catalogos.sitios).length === 0) {
    v.origenId = await crearSitioDeCantera({ obraId, nombre: v.origenEscrito, tipo: 'cantera', mensajeId });
    creados++;
  }
  if (v.destino === null && v.destinoEscrito && candidatosEnCantera(v.destinoEscrito, catalogos.catalogos.sitios).length === 0) {
    v.destino = await crearSitioDeCantera({ obraId, nombre: v.destinoEscrito, tipo: 'otro', mensajeId });
    creados++;
  }
  // El conductor que ningún camino propuso: el nombre escrito, reconocido, parecido o
  // nuevo (RF-18, RF-22 a RF-25). Ambiguo se queda vacío y se elige.
  if (!v.conductorId && v.conductorEscrito) {
    const decision = decisionDePersona(v.conductorEscrito, catalogos.personasDeLaObra, { seccion: 'viajes' });
    if (decision?.tipo === 'reconocida' || decision?.tipo === 'coincidencia') {
      v.conductorId = decision.usuarioId;
      v.conductorPor = 'escrito';
    } else if (decision?.tipo === 'crear') {
      v.conductorId = await crearPersona({ obraId, nombre: decision.nombre, cargo: decision.cargo, mensajeId });
      v.conductorPor = 'escrito';
      creados++;
    }
  }
  return { viaje: v, creados };
}

/**
 * Qué viajes guardar, sin repetir los que otros mensajes ya guardaron ese día (RF-11
 * a RF-14). `renglones` son los que pasaron las faltas, en orden.
 *
 * Un renglón agregado («TFO420 – 4 viajes») llega como varios viajes iguales sin
 * vale: se guardan solo los que faltan contando los de esa volqueta ese día (RF-14).
 * Los demás se comparan uno a uno, y cada guardado que coincide se consume: dos
 * viajes de este mensaje no pueden ser el mismo guardado.
 */
function viajesParaGuardar(
  viajes: readonly ViajeDelReporte[],
  renglones: readonly number[],
  guardados: { id: string; vale: string | null; vehiculoId: string; hora: string }[],
): { renglones: number[]; repetidos: number } {
  let disponibles = [...guardados];
  const clave = (v: ViajeDelReporte) => `${v.vehiculoId}|${v.hora}`;
  const agregados = new Map<string, number[]>();
  for (const r of renglones) {
    if (valeLimpio(viajes[r].vale) !== null) continue;
    agregados.set(clave(viajes[r]), [...(agregados.get(clave(viajes[r])) ?? []), r]);
  }

  const aGuardar: number[] = [];
  const vistos = new Set<string>();
  let repetidos = 0;
  for (const r of renglones) {
    const v = viajes[r];
    const grupo = valeLimpio(v.vale) === null ? agregados.get(clave(v)) : undefined;
    if (grupo && grupo.length > 1) {
      if (vistos.has(clave(v))) continue;
      vistos.add(clave(v));
      const ya = disponibles.filter((g) => g.vehiculoId === v.vehiculoId).length;
      const faltan = viajesQueFaltan(grupo.length, ya);
      aGuardar.push(...grupo.slice(0, faltan));
      repetidos += grupo.length - faltan;
      continue;
    }
    const repetido = viajeRepetido(v, disponibles.map((g) => ({ ...g, anulado: false })));
    if (repetido) {
      repetidos++;
      disponibles = disponibles.filter((g) => g.id !== repetido);
      continue;
    }
    aGuardar.push(r);
  }
  return { renglones: aGuardar.sort((a, b) => a - b), repetidos };
}

async function guardarEnCantera(datos: {
  mensajeId: string;
  obraId: string;
  canteraActiva: boolean;
  reporte: ReporteDelDia;
  horaFoto: string | null;
  enviadoEn: Date;
  catalogos: Awaited<ReturnType<typeof catalogosDeLaObra>>;
}): Promise<{ reporte: ReporteDelDia; resultado: ResultadoGuardado }> {
  const { mensajeId, obraId, catalogos } = datos;

  // Completar y crear, viaje por viaje.
  let creados = 0;
  const viajes: ViajeDelReporte[] = [];
  for (const original of datos.reporte.viajes) {
    const completo = completarViaje(original, { horaFoto: datos.horaFoto, enviadoEn: datos.enviadoEn.getTime() });
    const conLoCreado = datos.canteraActiva
      ? await crearLoDelViaje(completo, { obraId, mensajeId, catalogos })
      : { viaje: completo, creados: 0 };
    creados += conLoCreado.creados;
    viajes.push(conLoCreado.viaje);
  }
  const reporte: ReporteDelDia = { ...datos.reporte, viajes };

  // Las faltas, contra las opciones de la obra de ahora, que ya incluyen lo creado.
  const faltas: FaltaDeRenglon[] = faltasDelReporte(reporte, {
    hoy: fechaDeJornada(),
    claseDeMedidor: () => 'horometro',
  }).filter((f) => f.seccion === 'fecha' || f.seccion === 'viajes');
  if (!datos.canteraActiva) {
    // RF-7: sin Control Cantera en la obra no hay dónde guardarlos.
    viajes.forEach((_, renglon) =>
      faltas.push({ seccion: 'viajes', renglon, mensaje: 'Esta obra no lleva Control Cantera.' }),
    );
  } else {
    const opciones = await opcionesDeLaObra(obraId);
    viajes.forEach((v, renglon) => {
      if (!v.materialId || !v.vehiculoId || !v.conductorId || !v.origenId || !v.destino) return;
      for (const a of eleccionesAjenas(opciones, {
        materialId: v.materialId,
        vehiculoId: v.vehiculoId,
        conductorId: v.conductorId,
        origenId: v.origenId,
        destino: v.destino,
      })) {
        faltas.push({ seccion: 'viajes', renglon, mensaje: a.mensaje });
      }
    });
  }
  const { guardable, excepciones } = separarRenglones(reporte, faltas);
  await apartar(mensajeId, excepciones);

  // Los que pasaron, sin repetir lo que ya guardaron otros mensajes ese día.
  const apartados = new Set(excepciones.filter((e) => e.seccion === 'viajes').map((e) => e.renglon));
  const candidatos = guardable ? viajes.map((_, i) => i).filter((i) => !apartados.has(i)) : [];
  let renglones: number[] = [];
  let repetidos = 0;
  if (candidatos.length > 0) {
    const guardados = await baseServidor()
      .select({
        id: canteraViajes.id,
        vale: canteraViajes.vale,
        vehiculoId: canteraViajes.vehiculoId,
        hora: canteraViajes.hora,
      })
      .from(canteraViajes)
      .where(
        and(
          eq(canteraViajes.obraId, obraId),
          eq(canteraViajes.fecha, reporte.fecha!),
          isNull(canteraViajes.anuladoEn),
          sql`${canteraViajes.mensajeWhatsappId} is distinct from ${mensajeId}`,
        ),
      );
    ({ renglones, repetidos } = viajesParaGuardar(viajes, candidatos, guardados));
    await guardarViajes(
      mensajeId,
      { ...reporte, viajes: renglones.map((r) => viajes[r]) },
      obraId,
      ACTOR_SISTEMA,
      renglones,
    );
  }

  return {
    reporte,
    resultado: {
      modulo: 'cantera',
      guardados: await Promise.all(renglones.map((r) => idDeterminista(mensajeId, 'viajes', r))),
      repetidos,
      apartados: excepciones.length,
      creados,
    },
  };
}

/* ── Almacén ───────────────────────────────────────────────────────────── */

async function guardarEnAlmacen(datos: {
  mensajeId: string;
  obraId: string;
  almacenActivo: boolean;
  reporte: ReporteDelDia;
}): Promise<{ reporte: ReporteDelDia; resultado: ResultadoGuardado }> {
  const { mensajeId, obraId } = datos;
  const vacio: ResultadoGuardado = { modulo: 'almacen', guardados: [], repetidos: 0, apartados: 0, creados: 0 };

  // RF-8: sin Almacén en la obra, el reporte entero va a «No se pudo guardar».
  if (!datos.almacenActivo) {
    await apartar(mensajeId, [
      { seccion: 'almacen', renglon: null, motivo: 'Esta obra no lleva Almacén.', datos: { renglones: datos.reporte.almacen } },
    ]);
    return { reporte: datos.reporte, resultado: { ...vacio, apartados: 1 } };
  }

  // Un material que no se reconoce se registra nuevo con su unidad (RF-27).
  const reporte: ReporteDelDia = {
    ...datos.reporte,
    almacen: datos.reporte.almacen.map((m) =>
      m.materialId || m.materialNuevo || !m.escrito.trim()
        ? m
        : { ...m, materialNuevo: { nombre: m.escrito.trim(), unidad: m.unidad } },
    ),
  };
  const { guardable, excepciones } = separarRenglones(reporte, await faltasDelAlmacen(reporte, obraId));
  await apartar(mensajeId, excepciones);
  if (!guardable || guardable.almacen.length === 0) {
    return { reporte, resultado: { ...vacio, apartados: excepciones.length } };
  }

  const escrito = await escribirReporteDeAlmacen({
    mensajeId,
    obraId,
    aprobadoPor: ACTOR_SISTEMA.id,
    reporte: guardable,
  });
  // El stock o un material cambiaron entre leer y escribir: se reintenta después.
  if (escrito.resultado !== null) {
    throw new Error(`No se pudo escribir el reporte de almacén (${escrito.resultado}).`);
  }

  // Los materiales nuevos, con su marca de origen (RF-32). El id es el del lote.
  const nuevos = [
    ...new Set(
      guardable.almacen
        .filter((m) => !m.materialId && m.materialNuevo)
        .map((m) => claveDeMaterialNuevo(m.materialNuevo!.nombre)),
    ),
  ];
  for (const clave of nuevos) {
    await anotarCreado({
      tipo: 'material_almacen',
      registroId: await idDeterminista(mensajeId, 'material', clave),
      obraId,
      mensajeId,
    });
  }

  return {
    reporte,
    resultado: {
      ...vacio,
      guardados: await Promise.all(guardable.almacen.map((_, i) => idDeterminista(mensajeId, 'almacen', i))),
      apartados: excepciones.length,
      creados: nuevos.length,
    },
  };
}

/* ── El mensaje ────────────────────────────────────────────────────────── */

/** Procesa un mensaje entregado por la integración (RF-1 a RF-10). */
export async function procesarMensaje(id: string): Promise<ResultadoDelProceso> {
  const mensaje = await leerMensaje(id);
  if (!mensaje || mensaje.estado !== 'pendiente') return { estado: 'no_pendiente' };
  if (!mensaje.obraId) return { estado: 'sin_obra' };
  const obraId = mensaje.obraId;

  const destino = destinoDeCategoria(mensaje.categoria);
  if (destino === 'ninguno') {
    // Queda pendiente en la bandeja, pero procesado: el pulso no lo vuelve a tomar.
    await baseServidor().update(whatsappMensajes).set({ procesadoEn: new Date() }).where(eq(whatsappMensajes.id, id));
    return { estado: 'sin_destino' };
  }

  // Lo corregido por una persona antes de la 024 gana a lo que dijo la IA.
  const propuestaIa = mensaje.propuestaIa as PropuestaLeible & { hora_foto?: string | null };
  const diaDelMensaje = fechaDeJornada(mensaje.enviadoEn.getTime());
  const catalogos = await catalogosDeLaObra(obraId, [diaDelMensaje, propuestaIa.fecha_evento ?? '']);
  const leido: ReporteDelDia = mensaje.propuesta
    ? (reporteCorregido.parse(mensaje.propuesta) as ReporteDelDia)
    : resolverPropuesta(propuestaIa, catalogos.catalogos, { diaDelMensaje, destino }).reporte;

  if (destino !== 'cantera' && destino !== 'almacen') {
    return dejarEnEspera({ mensajeId: id, mensaje, obraId, reporte: leido, propuestaIa, catalogos });
  }

  const { reporte, resultado } =
    destino === 'cantera'
      ? await guardarEnCantera({
          mensajeId: id,
          obraId,
          canteraActiva: mensaje.canteraActiva ?? false,
          reporte: leido,
          horaFoto: propuestaIa.hora_foto ?? null,
          enviadoEn: mensaje.enviadoEn,
          catalogos,
        })
      : await guardarEnAlmacen({
          mensajeId: id,
          obraId,
          almacenActivo: mensaje.almacenActivo ?? false,
          reporte: leido,
        });

  const marcado = await marcarGuardado({
    mensajeId: id,
    version: mensaje.version,
    reporte,
    obraId,
    categoria: mensaje.categoria,
    resultado,
  });
  if (!marcado) return { estado: 'no_pendiente' };
  // Un vale cuenta como «viajes» para la lista del día, y puede completarlo (RF-38, RF-43).
  if (destino === 'cantera' && reporte.fecha) await actualizarDia(obraId, reporte.fecha);
  return { estado: 'guardado', resultado };
}

/**
 * Un mensaje que va a la bitácora: sus viajes a Control Cantera ya (RF-52), y el
 * resto en espera de su día, con el reporte ya leído (RF-5). Después avisa al día.
 */
async function dejarEnEspera(datos: {
  mensajeId: string;
  mensaje: NonNullable<Awaited<ReturnType<typeof leerMensaje>>>;
  obraId: string;
  reporte: ReporteDelDia;
  propuestaIa: PropuestaLeible & { hora_foto?: string | null };
  catalogos: Awaited<ReturnType<typeof catalogosDeLaObra>>;
}): Promise<ResultadoDelProceso> {
  const { mensajeId, mensaje, obraId } = datos;
  let reporte = datos.reporte;
  let resultado: ResultadoGuardado = { modulo: 'bitacora', guardados: [], repetidos: 0, apartados: 0, creados: 0 };
  if (reporte.viajes.length > 0) {
    const enCantera = await guardarEnCantera({
      mensajeId,
      obraId,
      canteraActiva: mensaje.canteraActiva ?? false,
      reporte,
      horaFoto: datos.propuestaIa.hora_foto ?? null,
      enviadoEn: mensaje.enviadoEn,
      catalogos: datos.catalogos,
    });
    reporte = enCantera.reporte;
    resultado = { ...enCantera.resultado, modulo: 'bitacora' };
  }

  const [enEspera] = await baseServidor()
    .update(whatsappMensajes)
    .set({
      estado: 'en_espera',
      propuesta: reporte as unknown as Record<string, unknown>,
      fechaHecho: reporte.fecha,
      tipoReporte: tipoDeReporte(mensaje.categoria, reporte),
      procesadoEn: new Date(),
      resultado: resultado as unknown as Record<string, unknown>,
      errorProceso: null,
      version: sql`${whatsappMensajes.version} + 1`,
    })
    .where(
      and(
        eq(whatsappMensajes.id, mensajeId),
        eq(whatsappMensajes.estado, 'pendiente'),
        eq(whatsappMensajes.version, mensaje.version),
      ),
    )
    .returning({ id: whatsappMensajes.id });
  if (!enEspera) return { estado: 'no_pendiente' };

  if (reporte.fecha) await actualizarDia(obraId, reporte.fecha);
  return { estado: 'en_espera', resultado };
}

/**
 * Deja escrito que procesar el mensaje falló, para verlo y para que el pulso lo
 * reintente (T16). No cambia su estado: sigue `pendiente`.
 */
export async function anotarFalloDelProceso(id: string, fallo: unknown): Promise<void> {
  const texto = fallo instanceof Error ? fallo.message : String(fallo);
  await baseServidor()
    .update(whatsappMensajes)
    .set({
      intentos: sql`${whatsappMensajes.intentos} + 1`,
      errorProceso: texto.slice(0, 2000),
    })
    .where(eq(whatsappMensajes.id, id));
}
