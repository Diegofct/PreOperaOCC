/**
 * El único punto por donde la app pregunta "¿este usuario y este PIN son
 * válidos?".
 *
 * Hoy responde la implementación local, contra los usuarios sembrados. En la
 * Fase 2 responderá el servidor (`POST /api/auth/login`) y devolverá tokens de
 * verdad. Cambia `IMPLEMENTACION` y nada más: ninguna pantalla conoce el
 * origen de la respuesta.
 *
 * Esto solo ocurre en el **enrolamiento**, una vez por equipo. El desbloqueo
 * diario no pasa por aquí: se resuelve contra el verificador guardado en el
 * propio celular, sin red.
 */
import { eq } from 'drizzle-orm';

import { db } from '@/db/local/client';
import { usuarios } from '@/db/local/schema';
import { pinDemostracionDe } from '@/db/local/seed';

export type ErrorAuth = 'usuario_desconocido' | 'pin_incorrecto' | 'inactivo' | 'sin_conexion';

export interface UsuarioAutenticado {
  id: string;
  usuario: string;
  nombreCompleto: string;
  rol: 'admin' | 'supervisor' | 'operador';
}

export type ResultadoAuth =
  | { ok: true; usuario: UsuarioAutenticado; accessToken: string | null; refreshToken: string | null }
  | { ok: false; error: ErrorAuth };

export const MENSAJES_AUTH: Record<ErrorAuth, string> = {
  usuario_desconocido: 'Ese usuario no existe. Verifíquelo con su supervisor.',
  pin_incorrecto: 'PIN incorrecto.',
  inactivo: 'Su cuenta está inactiva. Comuníquese con su supervisor.',
  sin_conexion: 'La primera vez necesita señal para activar el equipo.',
};

type Implementacion = 'local' | 'remota';

/** Cámbielo a 'remota' cuando `/api/auth/login` esté en pie (Fase 2). */
const IMPLEMENTACION: Implementacion = 'local';

async function autenticarLocal(usuario: string, pin: string): Promise<ResultadoAuth> {
  const [fila] = await db
    .select()
    .from(usuarios)
    .where(eq(usuarios.usuario, usuario.trim().toLowerCase()))
    .limit(1);

  if (!fila) return { ok: false, error: 'usuario_desconocido' };
  if (!fila.activo) return { ok: false, error: 'inactivo' };
  if (pinDemostracionDe(fila.usuario) !== pin) return { ok: false, error: 'pin_incorrecto' };

  return {
    ok: true,
    usuario: {
      id: fila.id,
      usuario: fila.usuario,
      nombreCompleto: fila.nombreCompleto,
      rol: fila.rol,
    },
    accessToken: null,
    refreshToken: null,
  };
}

export async function autenticar(usuario: string, pin: string): Promise<ResultadoAuth> {
  if (IMPLEMENTACION === 'local') return autenticarLocal(usuario, pin);
  throw new Error('La autenticación remota llega en la Fase 2.');
}

/** El usuario ya enrolado, leído de la base local. */
export async function usuarioPorId(id: string): Promise<UsuarioAutenticado | null> {
  const [fila] = await db.select().from(usuarios).where(eq(usuarios.id, id)).limit(1);
  if (!fila) return null;
  return { id: fila.id, usuario: fila.usuario, nombreCompleto: fila.nombreCompleto, rol: fila.rol };
}
