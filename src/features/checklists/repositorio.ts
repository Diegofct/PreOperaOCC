/**
 * Acceso a datos del preoperacional. Todo contra SQLite: ninguna de estas
 * funciones toca la red ni puede fallar por falta de señal.
 */
import { and, desc, eq, isNull } from 'drizzle-orm';
import { uuidv7 } from 'uuidv7';

import { db } from '@/db/local/client';
import {
  asignaciones,
  media,
  obras,
  plantillas,
  preoperacionales,
  tiposVehiculo,
  vehiculos,
  type EstadoSync,
} from '@/db/local/schema';
import { drenarEnSegundoPlano } from '@/features/sync/motor';
import { encolar } from '@/features/sync/outbox';
import { desfaseDeReloj } from '@/features/sync/reloj';
import { borradorCaduco, periodicidadesAplicables } from '@/shared/rules/inspeccion';

import type {
  Periodicidad,
  PlantillaChecklist,
  RespuestaItem,
  ResultadoPreoperacional,
} from './types';

export interface VehiculoAsignado {
  id: string;
  codigoInterno: string;
  placa: string | null;
  marca: string | null;
  modelo: string | null;
  tipoVehiculoId: string;
  tipoNombre: string;
  obraId: string | null;
  obraNombre: string | null;
  odometroKm: number | null;
  horometroH: number | null;
  estado: string;
}

const COLUMNAS_VEHICULO = {
  id: vehiculos.id,
  codigoInterno: vehiculos.codigoInterno,
  placa: vehiculos.placa,
  marca: vehiculos.marca,
  modelo: vehiculos.modelo,
  tipoVehiculoId: vehiculos.tipoVehiculoId,
  tipoNombre: tiposVehiculo.nombre,
  obraId: vehiculos.obraId,
  obraNombre: obras.nombre,
  odometroKm: vehiculos.odometroKm,
  horometroH: vehiculos.horometroH,
  estado: vehiculos.estado,
} as const;

export interface VehiculoDelOperador extends VehiculoAsignado {
  asignacionId: string;
  origen: 'supervisor' | 'autoasignada';
  desde: number;
}

/**
 * Los vehículos que el operador tiene asignados hoy. Es la consulta del
 * arranque de la app, resuelta por `ix_asignaciones_usuario`.
 *
 * Devuelve una lista y no un solo vehículo porque la realidad de OCC es que un
 * operador cambia de máquina: puede tener varias vigentes a la vez.
 */
export async function asignacionesVigentesDe(usuarioId: string): Promise<VehiculoDelOperador[]> {
  return db
    .select({
      ...COLUMNAS_VEHICULO,
      asignacionId: asignaciones.id,
      origen: asignaciones.origen,
      desde: asignaciones.desde,
    })
    .from(asignaciones)
    .innerJoin(vehiculos, eq(asignaciones.vehiculoId, vehiculos.id))
    .innerJoin(tiposVehiculo, eq(vehiculos.tipoVehiculoId, tiposVehiculo.id))
    .leftJoin(obras, eq(vehiculos.obraId, obras.id))
    .where(
      and(
        eq(asignaciones.usuarioId, usuarioId),
        isNull(asignaciones.hasta),
        // Un vehículo dado de baja no le aparece al operador aunque la
        // asignación siga abierta. Sin este filtro, una máquina que la
        // administración retiró seguiría ofreciéndose para inspeccionar.
        isNull(vehiculos.eliminadoEn),
      ),
    )
    .orderBy(desc(asignaciones.desde));
}

export async function vehiculoPorId(vehiculoId: string): Promise<VehiculoAsignado | null> {
  const filas = await db
    .select(COLUMNAS_VEHICULO)
    .from(vehiculos)
    .innerJoin(tiposVehiculo, eq(vehiculos.tipoVehiculoId, tiposVehiculo.id))
    .leftJoin(obras, eq(vehiculos.obraId, obras.id))
    .where(eq(vehiculos.id, vehiculoId))
    .limit(1);

  return filas[0] ?? null;
}

export async function plantillaDeTipo(
  tipoVehiculoId: string,
): Promise<{ plantilla: PlantillaChecklist; hash: string } | null> {
  const filas = await db
    .select({ esquema: plantillas.esquema, hash: plantillas.hash })
    .from(plantillas)
    .where(eq(plantillas.tipoVehiculoId, tipoVehiculoId))
    .orderBy(desc(plantillas.version))
    .limit(1);

  const fila = filas[0];
  return fila ? { plantilla: fila.esquema, hash: fila.hash } : null;
}

/** Cuándo se hizo por última vez cada revisión periódica de este vehículo. */
async function ultimasRevisiones(vehiculoId: string) {
  const filas = await db
    .select({ periodicidades: preoperacionales.periodicidades, enviadoEn: preoperacionales.enviadoEn })
    .from(preoperacionales)
    .where(eq(preoperacionales.vehiculoId, vehiculoId))
    .orderBy(desc(preoperacionales.iniciadoEn))
    .limit(60);

  let quincenal: number | null = null;
  let mensual: number | null = null;
  for (const fila of filas) {
    if (!fila.enviadoEn) continue;
    const p = fila.periodicidades as Periodicidad[];
    if (quincenal === null && p.includes('quincenal')) quincenal = fila.enviadoEn;
    if (mensual === null && p.includes('mensual')) mensual = fila.enviadoEn;
    if (quincenal !== null && mensual !== null) break;
  }
  return { quincenal, mensual };
}

export interface Borrador {
  id: string;
  vehiculo: VehiculoAsignado;
  plantilla: PlantillaChecklist;
  plantillaHash: string;
  periodicidades: Periodicidad[];
  respuestas: RespuestaItem[];
  odometroKm: number | null;
  horometroH: number | null;
  observaciones: string;
  /**
   * Se descartó un borrador anterior porque su formato ya no es el vigente, y
   * este es uno nuevo (spec 011, RF-27). La pantalla lo dice: si no, el operador
   * ve su formulario en blanco y cree que la app le perdió el trabajo.
   */
  formatoCambio?: boolean;
}

/**
 * Devuelve el borrador del día para ese vehículo, o crea uno nuevo.
 *
 * Retomar el borrador es lo que hace que Android pueda matar la app a mitad
 * del formulario sin que el operador pierda nada.
 */
export async function abrirBorrador(
  usuarioId: string,
  vehiculo: VehiculoAsignado,
): Promise<Borrador | null> {
  const encontrada = await plantillaDeTipo(vehiculo.tipoVehiculoId);
  if (!encontrada) return null;

  const existentes = await db
    .select()
    .from(preoperacionales)
    .where(
      and(
        eq(preoperacionales.vehiculoId, vehiculo.id),
        eq(preoperacionales.usuarioId, usuarioId),
        eq(preoperacionales.estadoSync, 'borrador' satisfies EstadoSync),
      ),
    )
    .orderBy(desc(preoperacionales.iniciadoEn))
    .limit(1);

  const existente = existentes[0];
  // Un borrador empezado con otro formato no se retoma: se descarta y se abre
  // uno nuevo, porque seguir llenándolo daría un acta que mezcla dos formatos
  // (spec 011, RF-27 y RF-28). Baja lógica: aquí no se borra nada.
  const caduco =
    existente !== undefined &&
    borradorCaduco(existente.plantillaVersion, encontrada.plantilla.version);

  if (caduco) {
    await db
      .update(preoperacionales)
      .set({ estadoSync: 'descartado' satisfies EstadoSync, actualizadoEn: Date.now() })
      .where(eq(preoperacionales.id, existente.id));
  }

  if (existente && !caduco) {
    return {
      id: existente.id,
      vehiculo,
      plantilla: encontrada.plantilla,
      plantillaHash: existente.plantillaHash,
      periodicidades: existente.periodicidades as Periodicidad[],
      respuestas: existente.respuestas,
      odometroKm: existente.odometroKm,
      horometroH: existente.horometroH,
      observaciones: existente.observaciones ?? '',
    };
  }

  const ultimas = await ultimasRevisiones(vehiculo.id);
  const periodicidades = periodicidadesAplicables(Date.now(), encontrada.plantilla, ultimas);
  const id = uuidv7();

  await db.insert(preoperacionales).values({
    id,
    vehiculoId: vehiculo.id,
    usuarioId,
    obraId: vehiculo.obraId,
    plantillaTipoVehiculo: encontrada.plantilla.tipoVehiculo,
    plantillaVersion: encontrada.plantilla.version,
    plantillaHash: encontrada.hash,
    periodicidades,
    iniciadoEn: Date.now(),
    respuestas: [],
    estadoSync: 'borrador',
  });

  return {
    formatoCambio: caduco,
    id,
    vehiculo,
    plantilla: encontrada.plantilla,
    plantillaHash: encontrada.hash,
    periodicidades,
    respuestas: [],
    odometroKm: null,
    horometroH: null,
    observaciones: '',
  };
}

/** Autoguardado. Se llama en cada respuesta; escribir en SQLite es barato. */
export async function guardarBorrador(
  id: string,
  cambios: {
    respuestas?: RespuestaItem[];
    odometroKm?: number | null;
    horometroH?: number | null;
    observaciones?: string;
  },
) {
  await db
    .update(preoperacionales)
    .set({ ...cambios, actualizadoEn: Date.now() })
    .where(eq(preoperacionales.id, id));
}

/**
 * Cierra el preoperacional y lo pone en la cola de salida.
 *
 * A partir de aquí el registro es inmutable: corregirlo se hace desde el
 * dashboard anulándolo, nunca sobrescribiéndolo. Un preoperacional firmado es
 * evidencia, y editarlo después sería falsear un documento.
 */
export async function cerrarPreoperacional(
  id: string,
  datos: {
    resultado: ResultadoPreoperacional;
    cantidadInmovilizantes: number;
    respuestas: RespuestaItem[];
    odometroKm: number | null;
    horometroH: number | null;
    observaciones: string;
    firmaOperadorMediaId: string;
    fotoHorometroMediaId: string | null;
  },
) {
  const enviadoEn = Date.now();
  // Se anota cuánto va corrido el reloj de este equipo respecto al servidor. No
  // se corrige la hora: la que queda guardada tiene que ser la misma que el
  // operador vio en su pantalla al firmar. Ver `@/features/sync/reloj`.
  const desfaseRelojMs = await desfaseDeReloj();

  await db
    .update(preoperacionales)
    .set({ ...datos, enviadoEn, desfaseRelojMs, estadoSync: 'pendiente', actualizadoEn: enviadoEn })
    .where(eq(preoperacionales.id, id));

  const [preop] = await db
    .select()
    .from(preoperacionales)
    .where(eq(preoperacionales.id, id))
    .limit(1);

  if (!preop) return;

  // A la cola de salida antes que cualquier otra cosa. Si la app muere en el
  // siguiente milisegundo, el registro ya está encolado y no se pierde.
  await encolar('preoperacional', id, preop);

  const evidencias = await db
    .select({ id: media.id })
    .from(media)
    .where(and(eq(media.duenoTipo, 'preoperacional'), eq(media.duenoId, id)));

  for (const evidencia of evidencias) {
    await encolar('media', evidencia.id, { id: evidencia.id, duenoId: id });
  }

  // Y se intenta subir ya, sin esperar. Firmar es el momento de la jornada con
  // más probabilidad de señal —el operador acaba de terminar, mirando el
  // teléfono— y hasta ahora era el único que no disparaba nada: el registro se
  // quedaba en la cola hasta el siguiente arranque de sesión aunque hubiera
  // WiFi delante. Si no hay red no pasa nada; la cola sigue intacta.
  drenarEnSegundoPlano();

  // Los medidores del vehículo solo avanzan. Un valor menor ya se rechazó al
  // capturarlo; aquí se protege el caso de dos registros fuera de orden.
  const [vehiculo] = await db
    .select({ odometroKm: vehiculos.odometroKm, horometroH: vehiculos.horometroH })
    .from(vehiculos)
    .where(eq(vehiculos.id, preop.vehiculoId))
    .limit(1);

  if (vehiculo) {
    await db
      .update(vehiculos)
      .set({
        odometroKm: Math.max(datos.odometroKm ?? 0, vehiculo.odometroKm ?? 0) || null,
        horometroH: Math.max(datos.horometroH ?? 0, vehiculo.horometroH ?? 0) || null,
        medidorActualizadoEn: enviadoEn,
        ...(datos.resultado === 'no_apto' ? { estado: 'no_apto' as const } : {}),
      })
      .where(eq(vehiculos.id, preop.vehiculoId));
  }
}

export async function historialDe(usuarioId: string, limite = 50) {
  return db
    .select({
      id: preoperacionales.id,
      vehiculoId: preoperacionales.vehiculoId,
      codigoInterno: vehiculos.codigoInterno,
      iniciadoEn: preoperacionales.iniciadoEn,
      enviadoEn: preoperacionales.enviadoEn,
      resultado: preoperacionales.resultado,
      cantidadInmovilizantes: preoperacionales.cantidadInmovilizantes,
      estadoSync: preoperacionales.estadoSync,
    })
    .from(preoperacionales)
    .innerJoin(vehiculos, eq(preoperacionales.vehiculoId, vehiculos.id))
    .where(eq(preoperacionales.usuarioId, usuarioId))
    .orderBy(desc(preoperacionales.iniciadoEn))
    .limit(limite);
}
