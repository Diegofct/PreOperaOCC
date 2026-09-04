/**
 * Lo que comparten los dos endpoints que reciben capturas del celular.
 *
 * Tres piezas, y las tres existen porque el servidor **no confía en el envío**
 * aunque venga de un equipo autenticado: un token demuestra qué teléfono es, no
 * que lo que manda sea correcto.
 */
import { and, eq, inArray, isNull } from 'drizzle-orm';

import { baseServidor } from '@/db/servidor/cliente';
import { asignaciones, operacionesIdempotentes, vehiculos } from '@/db/servidor/esquema';
import type { OperadorEnPeticion } from '@/features/servidor/guardia-movil';

/**
 * ¿Ya se procesó este envío?
 *
 * La clave llega del `outbox` del teléfono con formato `entidad:uuid:operacion`
 * y es estable entre reintentos. Sin esto, una red que se cae justo después de
 * que el servidor grabó pero antes de que el teléfono se entere produce un
 * segundo preoperacional idéntico en cada reintento.
 */
export async function yaProcesada(clave: string): Promise<string | null> {
  const [fila] = await baseServidor()
    .select({ entidadId: operacionesIdempotentes.entidadId })
    .from(operacionesIdempotentes)
    .where(eq(operacionesIdempotentes.clave, clave))
    .limit(1);
  return fila?.entidadId ?? null;
}

/**
 * Marca el envío como procesado. **Se llama al final, nunca antes.**
 *
 * Neon por HTTP no tiene transacciones interactivas, así que este registro y la
 * inserción no pueden ser atómicos. El orden importa: si el corte ocurre entre
 * los dos, el envío queda como *no* procesado y el reintento lo resuelve —
 * llegando a una fila que ya existe, que `onConflictDoNothing` absorbe. Al
 * revés, un corte dejaría el envío marcado como hecho sin haberse guardado, y
 * ese registro se perdería para siempre.
 */
export async function marcarProcesada(
  clave: string,
  entidad: string,
  entidadId: string,
): Promise<void> {
  await baseServidor()
    .insert(operacionesIdempotentes)
    .values({ clave, entidad, entidadId, operacion: 'upsert' })
    .onConflictDoNothing({ target: operacionesIdempotentes.clave });
}

export interface VehiculoDelEnvio {
  id: string;
  obraId: string | null;
  odometroKm: number | null;
  horometroH: number | null;
}

/**
 * El vehículo del envío, si el equipo tiene derecho a mandarlo.
 *
 * Un token no puede subir capturas de cualquier máquina: solo de las de su obra
 * o de las que tenga asignadas. Sin esta comprobación, un teléfono robado —o un
 * token copiado— podría escribir preoperacionales falsos sobre la flota entera
 * de la empresa.
 */
export async function vehiculoAlcanzable(
  equipo: OperadorEnPeticion,
  vehiculoId: string,
): Promise<VehiculoDelEnvio | null> {
  const db = baseServidor();

  const [maquina] = await db
    .select({
      id: vehiculos.id,
      obraId: vehiculos.obraId,
      odometroKm: vehiculos.odometroKm,
      horometroH: vehiculos.horometroH,
    })
    .from(vehiculos)
    .where(and(eq(vehiculos.id, vehiculoId), isNull(vehiculos.eliminadoEn)))
    .limit(1);

  if (!maquina) return null;
  if (equipo.obraId && maquina.obraId === equipo.obraId) return maquina;

  // Puede tener asignada una máquina de otra obra: pasa cuando lo mandan a
  // apoyar un frente distinto por unos días.
  const asignada = await db
    .select({ id: asignaciones.id })
    .from(asignaciones)
    .where(
      and(
        eq(asignaciones.usuarioId, equipo.id),
        eq(asignaciones.vehiculoId, vehiculoId),
        isNull(asignaciones.eliminadoEn),
      ),
    )
    .limit(1);

  return asignada.length > 0 ? maquina : null;
}

/**
 * Avanza los medidores del vehículo, **solo hacia arriba**.
 *
 * La misma regla que aplican las dos capturas del móvil y la fusión del pull: un
 * medidor que retrocede es un error de digitación, nunca un hecho. Aquí protege
 * el caso concreto de dos envíos que llegan fuera de orden —lo normal cuando una
 * cola de varios días se vacía de golpe al recuperar señal.
 */
export async function avanzarMedidores(
  maquina: VehiculoDelEnvio,
  lecturas: { odometroKm?: number | null; horometroH?: number | null },
  cuando: Date,
): Promise<void> {
  const odometroKm = mayor(lecturas.odometroKm, maquina.odometroKm);
  const horometroH = mayor(lecturas.horometroH, maquina.horometroH);

  if (odometroKm === maquina.odometroKm && horometroH === maquina.horometroH) return;

  await baseServidor()
    .update(vehiculos)
    .set({ odometroKm, horometroH, medidorActualizadoEn: cuando })
    .where(eq(vehiculos.id, maquina.id));
}

function mayor(a: number | null | undefined, b: number | null): number | null {
  if (a === null || a === undefined) return b;
  if (b === null) return a;
  return Math.max(a, b);
}

/** Los ids de vehículo que este equipo puede tocar. Para validar en lote. */
export async function vehiculosDelEquipo(equipo: OperadorEnPeticion): Promise<Set<string>> {
  const db = baseServidor();
  const ids = new Set<string>();

  if (equipo.obraId) {
    for (const fila of await db
      .select({ id: vehiculos.id })
      .from(vehiculos)
      .where(and(eq(vehiculos.obraId, equipo.obraId), isNull(vehiculos.eliminadoEn)))) {
      ids.add(fila.id);
    }
  }

  for (const fila of await db
    .select({ vehiculoId: asignaciones.vehiculoId })
    .from(asignaciones)
    .where(and(eq(asignaciones.usuarioId, equipo.id), isNull(asignaciones.eliminadoEn)))) {
    ids.add(fila.vehiculoId);
  }

  return ids;
}

/** Comprueba que un conjunto de ids exista y no esté dado de baja. */
export async function existenVehiculos(ids: string[]): Promise<Set<string>> {
  if (ids.length === 0) return new Set();
  const filas = await baseServidor()
    .select({ id: vehiculos.id })
    .from(vehiculos)
    .where(and(inArray(vehiculos.id, ids), isNull(vehiculos.eliminadoEn)));
  return new Set(filas.map((f) => f.id));
}
