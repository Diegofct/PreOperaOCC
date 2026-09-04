/**
 * Cuánto se desvía el reloj de este teléfono del reloj del servidor.
 *
 * Los equipos de obra son Android de gama baja, a veces sin tarjeta SIM y sin
 * sincronizar la hora por red. Un teléfono con media hora de retraso firma
 * preoperacionales con esa hora, y esa hora es la que queda en el registro: si
 * después hay que reconstruir a qué hora se inspeccionó una máquina, el dato
 * está corrido y **nada delata que lo esté**.
 *
 * La columna `desfase_reloj_ms` existe en las dos bases desde la Fase 1 y hasta
 * ahora siempre valía `0`. Esto la llena.
 *
 * No se corrige la hora ni se toca el reloj del equipo: se **anota** la
 * diferencia junto al registro. Corregirla haría que la hora guardada no
 * coincidiera con la que el operador vio en su pantalla al firmar, y esa
 * coincidencia es parte de lo que hace creíble el documento.
 */
import { eq } from 'drizzle-orm';

import { db } from '@/db/local/client';
import { appKv } from '@/db/local/schema';

const CLAVE = 'sync.desfaseRelojMs';

/**
 * Guarda la diferencia contra la hora que acaba de mandar el servidor.
 *
 * Incluye el viaje de la petición, así que sobreestima en unos milisegundos —
 * irrelevante frente a lo que se busca detectar, que son minutos u horas.
 */
export async function guardarDesfaseDeReloj(servidorAhoraMs: number): Promise<void> {
  const desfase = Date.now() - servidorAhoraMs;
  await db
    .insert(appKv)
    .values({ clave: CLAVE, valor: String(desfase) })
    .onConflictDoUpdate({ target: appKv.clave, set: { valor: String(desfase) } });
}

/**
 * El último desfase medido, en milisegundos. Positivo: el equipo va adelantado.
 *
 * Devuelve `0` si nunca se ha sincronizado, que es lo honesto: no se sabe que
 * haya desfase, no que no lo haya.
 */
export async function desfaseDeReloj(): Promise<number> {
  const [fila] = await db.select().from(appKv).where(eq(appKv.clave, CLAVE)).limit(1);
  const valor = Number(fila?.valor);
  return Number.isFinite(valor) ? valor : 0;
}
