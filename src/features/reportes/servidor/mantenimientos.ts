/**
 * El mantenimiento de las máquinas (spec 030, RF-20, RF-22 a RF-35). **Solo servidor.**
 *
 * Qué estado tiene cada clase lo deciden las reglas puras de `rules/mantenimiento.ts`;
 * aquí se leen los intervalos, los servicios registrados y la lectura de cada máquina,
 * y se escriben los registros. Un mantenimiento no se edita: se anula con motivo
 * (RF-35), y un correctivo se marca resuelto (RF-29).
 */
import { and, desc, eq, inArray, isNull } from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';
import { uuidv7 } from 'uuidv7';

import { baseServidor } from '@/db/servidor/cliente';
import {
  mantenimientoIntervalos,
  mantenimientoIntervalosVehiculo,
  mantenimientos,
  tiposVehiculo,
  usuarios,
  vehiculos,
} from '@/db/servidor/esquema';
import { veTodasLasObras } from '@/features/servidor/alcance';
import type { PersonaEnSesion } from '@/features/servidor/guardia';
import { errorDePeticion, noEncontrado } from '@/features/servidor/respuestas';
import { fechaDeJornada, medidorDeClase } from '@/shared/rules/jornada';
import {
  avisoDeLecturaDeServicio,
  CLASES_CON_INTERVALO,
  estadoDeMantenimiento,
  intervaloEfectivo,
  rangoDeMantenimiento,
  type ClaseConIntervalo,
  type ClaseDeMantenimiento,
  type EstadoDeMantenimiento,
  type Intervalo,
} from '@/shared/rules/mantenimiento';

import { vehiculosDeLaObra } from './datos';

/** Los estados de vehículo que lo dejan fuera de servicio (RF-30). */
const FUERA_DE_SERVICIO = new Set(['en_mantenimiento', 'fuera_servicio', 'no_apto']);

/** Cuántos registros trae el historial de la obra: los más recientes. */
const TOPE_DEL_HISTORIAL = 300;

const anulador = alias(usuarios, 'anulador');
const resolvedor = alias(usuarios, 'resolvedor');

/** Todos los mantenimientos de esas máquinas, del más reciente al más antiguo, con quién. */
async function registrosDe(vehiculoIds: readonly string[]) {
  if (vehiculoIds.length === 0) return [];
  return baseServidor()
    .select({
      id: mantenimientos.id,
      vehiculoId: mantenimientos.vehiculoId,
      clase: mantenimientos.clase,
      fecha: mantenimientos.fecha,
      lectura: mantenimientos.lectura,
      nota: mantenimientos.nota,
      origen: mantenimientos.origen,
      registradoPor: usuarios.nombreCompleto,
      creadoEn: mantenimientos.creadoEn,
      resueltoEn: mantenimientos.resueltoEn,
      resueltoPor: resolvedor.nombreCompleto,
      notaResuelto: mantenimientos.notaResuelto,
      anuladoEn: mantenimientos.anuladoEn,
      anuladoPor: anulador.nombreCompleto,
      motivoAnulacion: mantenimientos.motivoAnulacion,
    })
    .from(mantenimientos)
    .innerJoin(usuarios, eq(usuarios.id, mantenimientos.registradoPor))
    .leftJoin(anulador, eq(anulador.id, mantenimientos.anuladoPor))
    .leftJoin(resolvedor, eq(resolvedor.id, mantenimientos.resueltoPor))
    .where(inArray(mantenimientos.vehiculoId, [...vehiculoIds]))
    .orderBy(desc(mantenimientos.fecha), desc(mantenimientos.creadoEn));
}

/** Los intervalos puestos a los tipos de equipo y a esas máquinas. */
async function intervalosPuestos(vehiculoIds: readonly string[]) {
  const db = baseServidor();
  const [porTipo, porVehiculo] = await Promise.all([
    db.select().from(mantenimientoIntervalos),
    vehiculoIds.length === 0
      ? Promise.resolve([])
      : db.select().from(mantenimientoIntervalosVehiculo).where(inArray(mantenimientoIntervalosVehiculo.vehiculoId, [...vehiculoIds])),
  ]);
  const clave = (id: string, clase: string) => `${id}|${clase}`;
  const tipo = new Map(porTipo.map((i) => [clave(i.tipoVehiculoId, i.clase), { cada: i.cada, avisoPorcentaje: i.avisoPorcentaje }]));
  const vehiculo = new Map(porVehiculo.map((i) => [clave(i.vehiculoId, i.clase), { cada: i.cada, avisoPorcentaje: i.avisoPorcentaje }]));
  return {
    deTipo: (tipoId: string, clase: ClaseConIntervalo): Intervalo | null => tipo.get(clave(tipoId, clase)) ?? null,
    deVehiculo: (vehiculoId: string, clase: ClaseConIntervalo): Intervalo | null =>
      vehiculo.get(clave(vehiculoId, clase)) ?? null,
  };
}

/**
 * El mantenimiento de cada máquina de la obra (RF-26 a RF-31) y el historial (RF-34).
 * Las máquinas van en el orden de RF-31, y dentro de cada grupo por código.
 */
export async function mantenimientoDeLaObra(obraId: string) {
  const equipos = await vehiculosDeLaObra(obraId);
  const ids = equipos.map((v) => v.id);
  const [registros, intervalos] = await Promise.all([registrosDe(ids), intervalosPuestos(ids)]);
  const vigentes = registros.filter((r) => r.anuladoEn === null);

  const maquinas = equipos.map((v) => {
    const clases = Object.fromEntries(
      CLASES_CON_INTERVALO.map((clase) => {
        const intervalo = intervaloEfectivo(
          clase,
          v.claseMedidor,
          intervalos.deTipo(v.tipoId, clase),
          intervalos.deVehiculo(v.id, clase),
        );
        // Los registros vienen del más reciente al más antiguo: el primero es el último.
        const ultimo = vigentes.find((r) => r.vehiculoId === v.id && r.clase === clase) ?? null;
        const estado = estadoDeMantenimiento({
          clase,
          medidor: v.claseMedidor,
          lecturaActual: v.lectura,
          ultimo: ultimo ? { lectura: ultimo.lectura, fecha: ultimo.fecha } : null,
          intervalo,
        });
        return [clase, { ...estado, intervalo, ultimo: ultimo ? { fecha: ultimo.fecha, lectura: ultimo.lectura } : null }];
      }),
    ) as Record<ClaseConIntervalo, ReturnType<typeof estadoDeMantenimiento> & { intervalo: Intervalo & { origen: string }; ultimo: { fecha: string; lectura: number | null } | null }>;
    const correctivosPendientes = vigentes
      .filter((r) => r.vehiculoId === v.id && r.clase === 'correctivo' && r.resueltoEn === null)
      .map((r) => ({ id: r.id, fecha: r.fecha, nota: r.nota }));
    const estados = CLASES_CON_INTERVALO.map((c) => clases[c].estado);
    return {
      vehiculoId: v.id,
      codigo: v.codigo,
      placa: v.placa,
      tipo: v.tipo,
      tipoId: v.tipoId,
      claseMedidor: v.claseMedidor,
      lectura: v.lectura,
      estadoVehiculo: v.estado,
      fueraDeServicio: FUERA_DE_SERVICIO.has(v.estado),
      clases,
      correctivosPendientes,
      rango: rangoDeMantenimiento({ correctivoPendiente: correctivosPendientes.length > 0, estados }),
    };
  });
  maquinas.sort((a, b) => a.rango - b.rango || a.codigo.localeCompare(b.codigo, 'es'));

  const codigoDe = new Map(equipos.map((v) => [v.id, v.codigo]));
  return {
    maquinas,
    historial: registros.slice(0, TOPE_DEL_HISTORIAL).map((r) => ({ ...r, codigo: codigoDe.get(r.vehiculoId) ?? '' })),
  };
}

/**
 * Lo que la pestaña Máquinas dice del mantenimiento de cada una (RF-20) —el peor de sus
 * estados y su texto— y cuántas tienen algo vencido (RF-21).
 */
export async function resumenDeMantenimiento(obraId: string) {
  const { maquinas } = await mantenimientoDeLaObra(obraId);
  const peor: EstadoDeMantenimiento[] = ['vencido', 'proximo', 'revisar', 'sin_registro', 'al_dia'];
  const porVehiculo = new Map(
    maquinas.map((m) => {
      const clase = [...CLASES_CON_INTERVALO].sort(
        (a, b) => peor.indexOf(m.clases[a].estado) - peor.indexOf(m.clases[b].estado),
      )[0];
      return [
        m.vehiculoId,
        {
          estado: m.clases[clase].estado,
          texto: m.clases[clase].texto,
          correctivoPendiente: m.correctivosPendientes.length > 0,
          fueraDeServicio: m.fueraDeServicio,
        },
      ];
    }),
  );
  return {
    porVehiculo,
    vencidas: maquinas.filter((m) => CLASES_CON_INTERVALO.some((c) => m.clases[c].estado === 'vencido')).length,
  };
}

/** La máquina, si está en el alcance de quien pide: el residente, solo las de su obra. */
async function vehiculoDelAlcance(sesion: PersonaEnSesion, vehiculoId: string) {
  const [v] = await baseServidor()
    .select({
      id: vehiculos.id,
      obraId: vehiculos.obraId,
      clase: tiposVehiculo.claseMedidor,
      odometroKm: vehiculos.odometroKm,
      horometroH: vehiculos.horometroH,
    })
    .from(vehiculos)
    .innerJoin(tiposVehiculo, eq(tiposVehiculo.id, vehiculos.tipoVehiculoId))
    .where(and(eq(vehiculos.id, vehiculoId), isNull(vehiculos.eliminadoEn)))
    .limit(1);
  if (!v) return null;
  if (!veTodasLasObras(sesion) && v.obraId !== sesion.obraId) return null;
  const claseMedidor = medidorDeClase(v.clase);
  return { ...v, claseMedidor, lectura: (claseMedidor === 'odometro' ? v.odometroKm : v.horometroH) ?? null };
}

/**
 * Registra un mantenimiento hecho (RF-32, RF-33). La lectura que no se diga es la
 * registrada de la máquina. Una mayor que la registrada se guarda y se avisa.
 */
export async function registrarMantenimiento(
  sesion: PersonaEnSesion,
  datos: { vehiculoId: string; clase: ClaseDeMantenimiento; fecha: string; lectura: number | null; nota: string },
): Promise<{ id: string; avisoLectura: string | null } | Response> {
  const vehiculo = await vehiculoDelAlcance(sesion, datos.vehiculoId);
  if (!vehiculo) return noEncontrado('esa máquina');
  if (datos.fecha > fechaDeJornada()) return errorDePeticion('La fecha no puede ser posterior a hoy.');

  const lectura = datos.lectura ?? vehiculo.lectura;
  const id = uuidv7();
  await baseServidor().insert(mantenimientos).values({
    id,
    vehiculoId: vehiculo.id,
    obraId: vehiculo.obraId,
    clase: datos.clase,
    fecha: datos.fecha,
    lectura,
    nota: datos.nota,
    origen: 'panel',
    registradoPor: sesion.id,
  });
  return { id, avisoLectura: avisoDeLecturaDeServicio(datos.lectura, vehiculo.lectura, vehiculo.claseMedidor) };
}

/** El registro, si está en el alcance de quien pide. */
async function registroDelAlcance(sesion: PersonaEnSesion, id: string) {
  const [r] = await baseServidor()
    .select({ id: mantenimientos.id, vehiculoId: mantenimientos.vehiculoId, clase: mantenimientos.clase })
    .from(mantenimientos)
    .where(eq(mantenimientos.id, id))
    .limit(1);
  if (!r) return null;
  return (await vehiculoDelAlcance(sesion, r.vehiculoId)) ? r : null;
}

/** Anula un registro con su motivo (RF-35). 409 si ya estaba anulado. */
export async function anularMantenimiento(
  sesion: PersonaEnSesion,
  id: string,
  motivo: string,
): Promise<{ anulado: true } | Response> {
  if (!(await registroDelAlcance(sesion, id))) return noEncontrado('ese mantenimiento');
  const [hecho] = await baseServidor()
    .update(mantenimientos)
    .set({ anuladoEn: new Date(), anuladoPor: sesion.id, motivoAnulacion: motivo })
    .where(and(eq(mantenimientos.id, id), isNull(mantenimientos.anuladoEn)))
    .returning({ id: mantenimientos.id });
  if (!hecho) return errorDePeticion('Ese mantenimiento ya estaba anulado.', 409);
  return { anulado: true };
}

/** Marca resuelto un correctivo pendiente (RF-29). 409 si ya estaba resuelto o anulado. */
export async function resolverCorrectivo(
  sesion: PersonaEnSesion,
  id: string,
  datos: { fecha: string; nota: string },
): Promise<{ resuelto: true } | Response> {
  const registro = await registroDelAlcance(sesion, id);
  if (!registro) return noEncontrado('ese mantenimiento');
  if (registro.clase !== 'correctivo') return errorDePeticion('Solo un correctivo se marca resuelto.');
  if (datos.fecha > fechaDeJornada()) return errorDePeticion('La fecha no puede ser posterior a hoy.');
  const [hecho] = await baseServidor()
    .update(mantenimientos)
    .set({ resueltoEn: datos.fecha, resueltoPor: sesion.id, notaResuelto: datos.nota })
    .where(and(eq(mantenimientos.id, id), isNull(mantenimientos.resueltoEn), isNull(mantenimientos.anuladoEn)))
    .returning({ id: mantenimientos.id });
  if (!hecho) return errorDePeticion('Ese correctivo ya estaba resuelto o anulado.', 409);
  return { resuelto: true };
}

/** Los intervalos de cada tipo de equipo: el puesto y el que vale (RF-23, RF-24). */
export async function intervalosDeLosTipos() {
  const db = baseServidor();
  const [tipos, puestos] = await Promise.all([
    db.select({ id: tiposVehiculo.id, nombre: tiposVehiculo.nombre, clase: tiposVehiculo.claseMedidor }).from(tiposVehiculo),
    db.select().from(mantenimientoIntervalos),
  ]);
  return tipos
    .map((t) => {
      const medidor = medidorDeClase(t.clase);
      return {
        tipoVehiculoId: t.id,
        nombre: t.nombre,
        claseMedidor: medidor,
        clases: Object.fromEntries(
          CLASES_CON_INTERVALO.map((clase) => {
            const puesto = puestos.find((p) => p.tipoVehiculoId === t.id && p.clase === clase);
            return [clase, intervaloEfectivo(clase, medidor, puesto ? { cada: puesto.cada, avisoPorcentaje: puesto.avisoPorcentaje } : null)];
          }),
        ),
      };
    })
    .sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'));
}

/**
 * Pone o quita el intervalo de un tipo de equipo o de una máquina (RF-24, RF-25). Solo
 * la gerencia: lo exige la ruta. `cada` nulo lo quita.
 */
export async function guardarIntervalo(
  sesion: PersonaEnSesion,
  datos: {
    tipoVehiculoId?: string;
    vehiculoId?: string;
    clase: ClaseConIntervalo;
    cada: number | null;
    avisoPorcentaje: number;
  },
): Promise<{ guardado: true } | Response> {
  const db = baseServidor();
  if (datos.tipoVehiculoId) {
    const [tipo] = await db.select({ id: tiposVehiculo.id }).from(tiposVehiculo).where(eq(tiposVehiculo.id, datos.tipoVehiculoId)).limit(1);
    if (!tipo) return noEncontrado('ese tipo de equipo');
    const donde = and(eq(mantenimientoIntervalos.tipoVehiculoId, tipo.id), eq(mantenimientoIntervalos.clase, datos.clase));
    if (datos.cada === null) await db.delete(mantenimientoIntervalos).where(donde);
    else {
      await db
        .insert(mantenimientoIntervalos)
        .values({ tipoVehiculoId: tipo.id, clase: datos.clase, cada: datos.cada, avisoPorcentaje: datos.avisoPorcentaje, actualizadoPor: sesion.id })
        .onConflictDoUpdate({
          target: [mantenimientoIntervalos.tipoVehiculoId, mantenimientoIntervalos.clase],
          set: { cada: datos.cada, avisoPorcentaje: datos.avisoPorcentaje, actualizadoPor: sesion.id },
        });
    }
    return { guardado: true };
  }
  const vehiculo = await vehiculoDelAlcance(sesion, datos.vehiculoId!);
  if (!vehiculo) return noEncontrado('esa máquina');
  const donde = and(
    eq(mantenimientoIntervalosVehiculo.vehiculoId, vehiculo.id),
    eq(mantenimientoIntervalosVehiculo.clase, datos.clase),
  );
  if (datos.cada === null) await db.delete(mantenimientoIntervalosVehiculo).where(donde);
  else {
    await db
      .insert(mantenimientoIntervalosVehiculo)
      .values({ vehiculoId: vehiculo.id, clase: datos.clase, cada: datos.cada, avisoPorcentaje: datos.avisoPorcentaje, actualizadoPor: sesion.id })
      .onConflictDoUpdate({
        target: [mantenimientoIntervalosVehiculo.vehiculoId, mantenimientoIntervalosVehiculo.clase],
        set: { cada: datos.cada, avisoPorcentaje: datos.avisoPorcentaje, actualizadoPor: sesion.id },
      });
  }
  return { guardado: true };
}
