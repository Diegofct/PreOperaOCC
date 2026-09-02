import { sql } from 'drizzle-orm';

import { baseServidor } from '@/db/servidor/cliente';
import { ErrorDeConfiguracion } from '@/features/servidor/configuracion';

/**
 * Prueba de vida del servidor: `GET /api/salud`.
 *
 * Es lo más pequeño que demuestra que la mitad de servidor del repo funciona de
 * punta a punta —que Expo Router sirve rutas de API, que el driver de Neon
 * sobrevive al empaquetado de Metro y que la base responde—, y por eso fue lo
 * primero que se escribió, antes que el esquema y antes que el panel. Cuando
 * algo se rompa más arriba, esta ruta es la que dice si el problema está en la
 * conexión o en otra parte.
 *
 * No revela nada: ni la cadena de conexión, ni el host, ni la versión de
 * Postgres. Solo si hay base al otro lado.
 */
export async function GET() {
  try {
    // `execute` del driver HTTP devuelve el resultado completo, no las filas
    // sueltas: hay que entrar por `.rows`.
    const resultado = await baseServidor().execute<{ ahora: string }>(sql`select now() as ahora`);
    return Response.json({ ok: true, ahora: resultado.rows[0]?.ahora ?? null });
  } catch (error) {
    // Falta configuración y falta base son dos problemas distintos, y decirlo
    // ahorra la media hora de buscar una caída de red que no existe.
    if (error instanceof ErrorDeConfiguracion) {
      return Response.json({ ok: false, error: error.message }, { status: 503 });
    }
    console.error('[salud] la base no respondió:', error);
    return Response.json({ ok: false, error: 'La base de datos no respondió.' }, { status: 503 });
  }
}
