import { requerirSesion } from '@/features/servidor/guardia';
import { ok, responder } from '@/features/servidor/respuestas';

/**
 * `GET /api/auth/yo` — quién está dentro.
 *
 * Es lo primero que consulta el panel al cargar, y de su respuesta salen las tres
 * pantallas posibles: el ingreso, el cambio de contraseña obligatorio, o el panel.
 *
 * **No exige la contraseña definitiva** (`exigirClaveDefinitiva: false`). Es
 * deliberado y sin ello el panel se quedaría trabado: quien tiene una clave
 * temporal necesita que alguien le diga que la tiene, y esa respuesta solo puede
 * venir de aquí. Todas las demás rutas sí la exigen.
 */
export async function GET(peticion: Request) {
  return responder(async () => {
    const sesion = await requerirSesion(peticion, { exigirClaveDefinitiva: false });
    if (sesion instanceof Response) return sesion;

    return ok({
      id: sesion.id,
      usuario: sesion.usuario,
      nombreCompleto: sesion.nombreCompleto,
      rol: sesion.rol,
      obraId: sesion.obraId,
      // El panel arma su menú con esto (spec 017, RF-7).
      modulosDeObra: sesion.modulosDeObra,
      debeCambiarClave: sesion.debeCambiarClave,
    });
  });
}
