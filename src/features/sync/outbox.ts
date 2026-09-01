/**
 * Cola de salida.
 *
 * Todo lo que nace en el dispositivo y tiene que subir pasa por aquí. Se
 * escribe en la misma operación en que se cierra el registro: si la app muere
 * un segundo después, el trabajo ya está encolado.
 *
 * `seq` es autoincremental, así que el orden de la cola es el orden en que se
 * crearon los registros — que es también su orden de dependencia.
 *
 * Nadie la drena todavía. El motor de sincronización llega en la Fase 2 y se
 * encuentra la cola llena y en orden.
 */
import { and, count, eq, lte } from 'drizzle-orm';

import { db } from '@/db/local/client';
import { outbox } from '@/db/local/schema';

export type EntidadSincronizable = 'preoperacional' | 'bitacora' | 'media';

/**
 * La clave que hace idempotente el reenvío.
 *
 * Es estable entre reintentos a propósito: el servidor la usa para reconocer
 * que ya procesó esa operación y responder `duplicate` en vez de insertar dos
 * veces el mismo preoperacional.
 */
export function claveIdempotencia(
  entidad: EntidadSincronizable,
  entidadId: string,
  operacion: 'upsert' | 'delete' = 'upsert',
): string {
  return `${entidad}:${entidadId}:${operacion}`;
}

export async function encolar(
  entidad: EntidadSincronizable,
  entidadId: string,
  payload: unknown,
  opciones: {
    operacion?: 'upsert' | 'delete';
    /**
     * Reemplaza el contenido si la operación sigue en cola.
     *
     * Lo necesita la bitácora, que crece durante el día: cada hora hay una
     * versión nueva del mismo registro y lo que debe subir es la última. Sin
     * esto subiría la foto del momento en que se encoló la primera vez.
     *
     * No cambia el `seq`, así que la bitácora conserva su lugar en la fila
     * detrás del preoperacional que la abrió.
     */
    refrescar?: boolean;
  } = {},
): Promise<void> {
  const operacion = opciones.operacion ?? 'upsert';
  const clave = claveIdempotencia(entidad, entidadId, operacion);

  const fila = {
    entidad,
    entidadId,
    operacion,
    payload,
    claveIdempotencia: clave,
    estado: 'pendiente' as const,
  };

  if (!opciones.refrescar) {
    // El índice único sobre la clave hace que reencolar lo mismo no duplique.
    await db.insert(outbox).values(fila).onConflictDoNothing();
    return;
  }

  await db
    .insert(outbox)
    .values(fila)
    .onConflictDoUpdate({
      target: outbox.claveIdempotencia,
      set: { payload },
      // Si ya salió hacia el servidor, no se toca: esa versión es la que se
      // está enviando y reescribirla a mitad de vuelo corrompe el envío.
      setWhere: eq(outbox.estado, 'pendiente'),
    });
}

/** Lo que el operador ve en la píldora del inicio. */
export async function contarPendientes(): Promise<number> {
  const [fila] = await db
    .select({ total: count() })
    .from(outbox)
    .where(eq(outbox.estado, 'pendiente'));
  return fila?.total ?? 0;
}

export async function contarFallidas(): Promise<number> {
  const [fila] = await db.select({ total: count() }).from(outbox).where(eq(outbox.estado, 'fallida'));
  return fila?.total ?? 0;
}

/** El siguiente lote a enviar. Lo usará el motor de la Fase 2. */
export async function proximoLote(limite = 50, ahora = Date.now()) {
  return db
    .select()
    .from(outbox)
    .where(and(eq(outbox.estado, 'pendiente'), lte(outbox.proximoIntentoEn, ahora)))
    .orderBy(outbox.seq)
    .limit(limite);
}
