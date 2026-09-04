import { and, eq, isNull } from 'drizzle-orm';
import { z } from 'zod';

import { baseServidor } from '@/db/servidor/cliente';
import { dispositivos, usuarios } from '@/db/servidor/esquema';
import { hashDeToken, tokenAleatorio } from '@/features/auth/servidor/cripto';
import { emitirAccessToken } from '@/features/auth/servidor/tokens';
import { cuerpoJson, errorDePeticion, ok, responder } from '@/features/servidor/respuestas';

/**
 * Renueva el token de un equipo. `POST /api/movil/refrescar`.
 *
 * El access token dura una hora para que el servidor no tenga que consultar la
 * base en cada petición; esta ruta es la que evita que el operador tenga que
 * volver a activar el equipo cada hora.
 *
 * **El refresh token se rota en cada uso.** El anterior deja de servir en el
 * acto. Si dos equipos presentan el mismo, es que alguien copió el del teléfono,
 * y el segundo en llegar se encuentra con que ya no vale — que es la señal, y el
 * corte, a la vez.
 *
 * No exige que la app tenga señal en ningún momento fijo: si el refresco falla,
 * el operador sigue trabajando sin red y ya se sincronizará. Lo único que se
 * pierde entre tanto es la bajada de datos, nunca la captura.
 */
const refresco = z.object({
  refreshToken: z.string().trim().min(1, 'Falta el token.'),
});

export async function POST(peticion: Request) {
  return responder(async () => {
    const { refreshToken } = await cuerpoJson(peticion, refresco);
    const db = baseServidor();

    const [fila] = await db
      .select({
        id: dispositivos.id,
        usuarioId: dispositivos.usuarioId,
        activo: usuarios.activo,
        eliminadoEn: usuarios.eliminadoEn,
      })
      .from(dispositivos)
      .innerJoin(usuarios, eq(usuarios.id, dispositivos.usuarioId))
      .where(
        and(
          eq(dispositivos.hashRefresh, await hashDeToken(refreshToken)),
          isNull(dispositivos.revocadoEn),
        ),
      )
      .limit(1);

    if (!fila) {
      return errorDePeticion('Este equipo tiene que volver a activarse.', 401);
    }
    if (!fila.activo || fila.eliminadoEn) {
      return errorDePeticion('Su cuenta está inactiva. Comuníquese con su supervisor.', 403);
    }

    const nuevo = tokenAleatorio();
    await db
      .update(dispositivos)
      .set({ hashRefresh: await hashDeToken(nuevo), ultimaVistaEn: new Date() })
      .where(eq(dispositivos.id, fila.id));

    return ok({
      accessToken: await emitirAccessToken(fila.usuarioId, fila.id),
      refreshToken: nuevo,
    });
  });
}
