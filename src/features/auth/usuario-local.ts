/**
 * El usuario enrolado, leído de la réplica del propio teléfono.
 *
 * Vive aparte de `servicio.ts` desde que ese archivo dejó de hablar con SQLite y
 * pasó a hablar con el servidor. Son dos cosas distintas y conviene que se note:
 * activar necesita señal y ocurre una vez; esto se resuelve contra la base local
 * y ocurre en cada desbloqueo, en modo avión, todos los días.
 */
import { eq } from 'drizzle-orm';

import { db } from '@/db/local/client';
import { usuarios } from '@/db/local/schema';

import type { UsuarioAutenticado } from './servicio';

export async function usuarioPorId(id: string): Promise<UsuarioAutenticado | null> {
  const [fila] = await db.select().from(usuarios).where(eq(usuarios.id, id)).limit(1);
  if (!fila) return null;
  return {
    id: fila.id,
    usuario: fila.usuario,
    nombreCompleto: fila.nombreCompleto,
    rol: fila.rol,
    obraId: fila.obraId,
  };
}
