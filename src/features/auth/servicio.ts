/**
 * El único punto por donde la app pide activar un equipo.
 *
 * Ocurre **una vez por teléfono**, y es el único momento en toda la vida de la
 * aplicación en que hace falta señal. El desbloqueo diario no pasa por aquí: se
 * resuelve contra el verificador guardado en el propio celular, sin red, que es
 * lo que permite trabajar en un frente sin cobertura.
 *
 * Antes esto validaba usuario + PIN contra los datos de demostración sembrados
 * en el bundle. Esos datos ya no existen: ahora el servidor entrega un código de
 * un solo uso, y el PIN lo elige el operador después, en su equipo. **El PIN no
 * viaja nunca** — ni al activar, ni al desbloquear, ni al sincronizar.
 */
import { ErrorDelServidor, pedirSinToken, SinConexion } from '@/features/sync/cliente-http';

import { idDelDispositivo } from './almacen';

export type ErrorAuth =
  | 'usuario_desconocido'
  | 'codigo_incorrecto'
  | 'inactivo'
  | 'sin_conexion'
  | 'servidor';

export interface UsuarioAutenticado {
  id: string;
  usuario: string;
  nombreCompleto: string;
  rol: 'admin' | 'supervisor' | 'operador';
  obraId?: string | null;
}

export interface ActivacionExitosa {
  ok: true;
  usuario: UsuarioAutenticado;
  accessToken: string;
  refreshToken: string;
  /** Hash del código de respaldo. `null` si este equipo no tendrá recuperación offline. */
  hashRespaldo: string | null;
}

export type ResultadoAuth = ActivacionExitosa | { ok: false; error: ErrorAuth; mensaje?: string };

export const MENSAJES_AUTH: Record<ErrorAuth, string> = {
  usuario_desconocido: 'Ese usuario no existe. Verifíquelo con su supervisor.',
  codigo_incorrecto: 'El usuario o el código no son correctos.',
  inactivo: 'Su cuenta está inactiva. Comuníquese con su supervisor.',
  sin_conexion:
    'La activación es lo único que necesita señal. Acérquese a donde haya cobertura e intente de nuevo.',
  servidor: 'No se pudo activar el equipo. Intente de nuevo en un momento.',
};

interface RespuestaActivacion {
  usuario: UsuarioAutenticado;
  accessToken: string;
  refreshToken: string;
  hashRespaldo: string | null;
}

/**
 * Canjea el código de activación que le dio la administración.
 *
 * El error no distingue entre usuario inexistente y código malo: es lo mismo
 * que hace el servidor, y por la misma razón — la diferencia delataría qué
 * nombres de usuario existen.
 */
export async function canjearActivacion(usuario: string, codigo: string): Promise<ResultadoAuth> {
  try {
    const respuesta = await pedirSinToken<RespuestaActivacion>('/api/movil/activar', {
      usuario: usuario.trim().toLowerCase(),
      codigo: codigo.trim(),
      equipo: idDelDispositivo(),
    });

    return {
      ok: true,
      usuario: respuesta.usuario,
      accessToken: respuesta.accessToken,
      refreshToken: respuesta.refreshToken,
      hashRespaldo: respuesta.hashRespaldo,
    };
  } catch (fallo) {
    if (fallo instanceof SinConexion) return { ok: false, error: 'sin_conexion' };

    if (fallo instanceof ErrorDelServidor) {
      if (fallo.estado === 403) return { ok: false, error: 'inactivo', mensaje: fallo.message };
      if (fallo.estado === 401 || fallo.estado === 429) {
        // El servidor ya redactó el mensaje pensando en el operador: si el
        // código caducó o se bloqueó, decírselo tal cual le ahorra una llamada.
        return { ok: false, error: 'codigo_incorrecto', mensaje: fallo.message };
      }
      return { ok: false, error: 'servidor', mensaje: fallo.message };
    }

    return { ok: false, error: 'servidor' };
  }
}
