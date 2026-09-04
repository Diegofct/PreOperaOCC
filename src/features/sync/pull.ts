/**
 * La bajada: aplica en el teléfono la instantánea del servidor.
 *
 * Cuatro reglas, y ninguna es negociable:
 *
 *  1. **Todo en una transacción.** Si algo falla a la mitad, la base queda como
 *     estaba. Una réplica a medias —vehículos nuevos sin sus tipos, asignaciones
 *     apuntando a máquinas que no llegaron— es peor que una réplica vieja.
 *
 *  2. **En orden de dependencias**: obras → tipos → usuarios → vehículos →
 *     asignaciones → plantillas. Las llaves foráneas están activas y no perdonan.
 *
 *  3. **Nunca se borra nada.** Una baja del servidor se traduce a baja lógica
 *     con las columnas que ya existen. Borrar de verdad rompería las llaves
 *     foráneas de un preoperacional que todavía no ha subido, y ese registro es
 *     una jornada de trabajo de alguien.
 *
 *  4. **`vehiculos` se fusiona, no se sobrescribe.** Es la única réplica que el
 *     teléfono muta. La decisión de qué gana está en `@/shared/rules/fusion`,
 *     que es pura y está probada; aquí solo se le da lo que necesita saber.
 *
 * Nada de esto bloquea una pantalla: corre por detrás, y si no hay señal
 * simplemente no corre.
 */
import { eq, inArray, isNull } from 'drizzle-orm';

import { db, type TransaccionLocal } from '@/db/local/client';
import { purgarDemostracion, yaSePurgo } from '@/db/local/purga-demo';
import {
  asignaciones,
  estadoSincronizacion,
  obras,
  plantillas,
  preoperacionales,
  tiposVehiculo,
  usuarios,
  vehiculos,
} from '@/db/local/schema';
import { fusionarVehiculo, type VehiculoLocal } from '@/shared/rules/fusion';

import { guardarDesfaseDeReloj } from './reloj';

import { pedirConToken } from './cliente-http';

/** La única fila de cursor: la instantánea es conjunta y no se parte por tabla. */
const ENTIDAD_CURSOR = 'replicas';

interface Instantanea {
  sinCambios: boolean;
  cursor: string;
  servidorAhoraMs?: number;
  obras?: (typeof obras.$inferInsert)[];
  tiposVehiculo?: (typeof tiposVehiculo.$inferInsert)[];
  usuarios?: (typeof usuarios.$inferInsert)[];
  vehiculos?: (VehiculoLocal & { id: string })[];
  asignaciones?: (typeof asignaciones.$inferInsert)[];
  plantillas?: (typeof plantillas.$inferInsert)[];
}

export interface ResultadoPull {
  estado: 'aplicada' | 'sin_cambios' | 'sin_conexion' | 'reactivar';
  cursor?: string;
}

async function cursorGuardado(): Promise<string | null> {
  const [fila] = await db
    .select()
    .from(estadoSincronizacion)
    .where(eq(estadoSincronizacion.entidad, ENTIDAD_CURSOR))
    .limit(1);
  return fila?.cursor ?? null;
}

/**
 * Pide la instantánea y la aplica. Nunca lanza por falta de red.
 *
 * Devuelve `reactivar` cuando el equipo dejó de estar autorizado: eso sí tiene
 * que llegar a la interfaz, porque el operador necesita un código nuevo.
 */
export async function sincronizar(): Promise<ResultadoPull> {
  const desde = await cursorGuardado();
  const ruta = desde ? `/api/movil/pull?desde=${encodeURIComponent(desde)}` : '/api/movil/pull';

  let instantanea: Instantanea;
  try {
    instantanea = await pedirConToken<Instantanea>(ruta);
  } catch (fallo) {
    if (fallo instanceof Error && 'exigeReactivar' in fallo && fallo.exigeReactivar) {
      return { estado: 'reactivar' };
    }
    // Sin red, o el servidor no está: es lo normal en obra. Se vuelve a
    // intentar solo, sin molestar a nadie.
    return { estado: 'sin_conexion' };
  }

  // El servidor manda su hora en cada respuesta. Es la única forma que tiene el
  // teléfono de saber que su reloj va corrido, y se aprovecha aunque no haya
  // datos nuevos que aplicar.
  if (instantanea.servidorAhoraMs) await guardarDesfaseDeReloj(instantanea.servidorAhoraMs);

  if (instantanea.sinCambios) {
    await marcarPull(instantanea.cursor);
    return { estado: 'sin_cambios', cursor: instantanea.cursor };
  }

  await aplicar(instantanea);
  return { estado: 'aplicada', cursor: instantanea.cursor };
}

async function aplicar(datos: Instantanea): Promise<void> {
  const idsDelServidor = {
    vehiculos: new Set((datos.vehiculos ?? []).map((f) => f.id)),
    asignaciones: new Set((datos.asignaciones ?? []).map((f) => f.id)),
  };

  // Las capturas que todavía no subieron, por vehículo. Es lo que protege un
  // `no_apto` local de que la instantánea lo pinte de verde.
  const conCapturaSinSubir = new Set(
    (
      await db
        .select({ vehiculoId: preoperacionales.vehiculoId })
        .from(preoperacionales)
        .where(inArray(preoperacionales.estadoSync, ['borrador', 'pendiente', 'rechazado']))
    ).map((f) => f.vehiculoId),
  );

  const vehiculosLocales = new Map(
    (await db.select().from(vehiculos)).map((v) => [v.id, v as unknown as VehiculoLocal]),
  );

  await db.transaction(async (tx) => {
    // ANTES de insertar, y dentro de esta misma transacción: el índice único de
    // `usuarios.usuario` haría fallar el pull si el servidor manda un operador
    // real llamado igual que uno de demostración. O pasa todo, o no pasa nada.
    if (!(await yaSePurgo(tx))) await purgarDemostracion(tx);

    for (const fila of datos.obras ?? []) {
      await tx.insert(obras).values(fila).onConflictDoUpdate({ target: obras.id, set: fila });
    }

    for (const fila of datos.tiposVehiculo ?? []) {
      await tx
        .insert(tiposVehiculo)
        .values(fila)
        .onConflictDoUpdate({ target: tiposVehiculo.id, set: fila });
    }

    for (const fila of datos.usuarios ?? []) {
      await tx.insert(usuarios).values(fila).onConflictDoUpdate({ target: usuarios.id, set: fila });
    }

    for (const fila of datos.vehiculos ?? []) {
      const fusionado = fusionarVehiculo(fila, vehiculosLocales.get(fila.id) ?? null, {
        hayCapturaSinSubir: conCapturaSinSubir.has(fila.id),
      });
      const completo = { id: fila.id, ...fusionado };
      await tx
        .insert(vehiculos)
        .values(completo)
        .onConflictDoUpdate({ target: vehiculos.id, set: completo });
    }

    for (const fila of datos.asignaciones ?? []) {
      await tx
        .insert(asignaciones)
        .values(fila)
        .onConflictDoUpdate({ target: asignaciones.id, set: fila });
    }

    for (const fila of datos.plantillas ?? []) {
      await tx
        .insert(plantillas)
        .values(fila)
        .onConflictDoUpdate({ target: plantillas.id, set: fila });
    }

    await apagarLoQueYaNoViene(tx, idsDelServidor);

    await tx
      .insert(estadoSincronizacion)
      .values({ entidad: ENTIDAD_CURSOR, cursor: datos.cursor, ultimoPullEn: Date.now() })
      .onConflictDoUpdate({
        target: estadoSincronizacion.entidad,
        set: { cursor: datos.cursor, ultimoPullEn: Date.now() },
      });
  });
}

/**
 * Baja lógica de lo que el servidor ya no manda.
 *
 * Una fila que deja de venir en la instantánea es indistinguible de una que
 * nunca le tocó a este operador — le quitaron la asignación, dieron la máquina
 * de baja, la pasaron a otra obra. En todos los casos el efecto correcto es el
 * mismo: se apaga, **no se borra**. Borrarla rompería la llave foránea de un
 * preoperacional que todavía no ha subido.
 *
 * Solo se apagan asignaciones y vehículos: son los dos que deciden qué ve el
 * operador al abrir la app. Un usuario que deja de venir se queda como está —lo
 * necesitan las bitácoras para escribir su nombre— y su baja real llega del
 * servidor como `activo = false`.
 */
async function apagarLoQueYaNoViene(
  tx: TransaccionLocal,
  presentes: { vehiculos: Set<string>; asignaciones: Set<string> },
): Promise<void> {
  const ahora = Date.now();

  for (const fila of await tx
    .select({ id: asignaciones.id })
    .from(asignaciones)
    .where(isNull(asignaciones.hasta))) {
    if (!presentes.asignaciones.has(fila.id)) {
      await tx.update(asignaciones).set({ hasta: ahora }).where(eq(asignaciones.id, fila.id));
    }
  }

  for (const fila of await tx
    .select({ id: vehiculos.id })
    .from(vehiculos)
    .where(isNull(vehiculos.eliminadoEn))) {
    if (!presentes.vehiculos.has(fila.id)) {
      await tx.update(vehiculos).set({ eliminadoEn: ahora }).where(eq(vehiculos.id, fila.id));
    }
  }
}

async function marcarPull(cursor: string): Promise<void> {
  await db
    .insert(estadoSincronizacion)
    .values({ entidad: ENTIDAD_CURSOR, cursor, ultimoPullEn: Date.now() })
    .onConflictDoUpdate({
      target: estadoSincronizacion.entidad,
      set: { cursor, ultimoPullEn: Date.now() },
    });
}
