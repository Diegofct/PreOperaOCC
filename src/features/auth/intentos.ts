/**
 * Contador de PIN fallidos, persistido.
 *
 * Vive en `app_kv` y no en memoria: si viviera en memoria, cerrar la app y
 * volver a abrirla reiniciaría el bloqueo y la protección sería decorativa.
 *
 * REGLA QUE NO SE ROMPE: llegar al último escalón desenrola el equipo, pero
 * **jamás** borra `outbox`, `preoperacionales`, `bitacoras` ni `media`. Perder
 * una jornada de campo por un PIN mal tecleado sería el peor bug de este
 * sistema.
 */
import { eq } from 'drizzle-orm';

import { db } from '@/db/local/client';
import { appKv } from '@/db/local/schema';

import { debeOlvidarEquipo, esperaPorFallos } from './escalera';

export {
  FALLOS_PARA_OLVIDAR,
  intentosRestantes,
  mensajeDeEspera,
} from './escalera';

const CLAVE = 'auth.intentos';

export interface EstadoIntentos {
  fallidos: number;
  bloqueadoHasta: number;
}

const VACIO: EstadoIntentos = { fallidos: 0, bloqueadoHasta: 0 };

export async function leerIntentos(): Promise<EstadoIntentos> {
  const [fila] = await db.select().from(appKv).where(eq(appKv.clave, CLAVE)).limit(1);
  if (!fila) return VACIO;
  try {
    const guardado = JSON.parse(fila.valor) as Partial<EstadoIntentos>;
    return { fallidos: guardado.fallidos ?? 0, bloqueadoHasta: guardado.bloqueadoHasta ?? 0 };
  } catch {
    return VACIO;
  }
}

async function escribirIntentos(estado: EstadoIntentos): Promise<void> {
  const valor = JSON.stringify(estado);
  await db
    .insert(appKv)
    .values({ clave: CLAVE, valor })
    .onConflictDoUpdate({ target: appKv.clave, set: { valor } });
}

export interface ResultadoDeFallo extends EstadoIntentos {
  /** El equipo llegó al último escalón: hay que volver a activarlo. */
  debeOlvidarEquipo: boolean;
}

export async function registrarFallo(ahora = Date.now()): Promise<ResultadoDeFallo> {
  const previo = await leerIntentos();
  const fallidos = previo.fallidos + 1;
  const espera = esperaPorFallos(fallidos);
  const estado: EstadoIntentos = { fallidos, bloqueadoHasta: espera > 0 ? ahora + espera : 0 };
  await escribirIntentos(estado);
  return { ...estado, debeOlvidarEquipo: debeOlvidarEquipo(fallidos) };
}

export async function limpiarIntentos(): Promise<void> {
  await escribirIntentos(VACIO);
}

export function esperaRestante(estado: EstadoIntentos, ahora = Date.now()): number {
  return Math.max(0, estado.bloqueadoHasta - ahora);
}
