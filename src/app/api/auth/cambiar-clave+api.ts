import { eq } from 'drizzle-orm';

import { baseServidor } from '@/db/servidor/cliente';
import { credencialesWeb } from '@/db/servidor/esquema';
import { hashDeClave, verificarClave } from '@/features/auth/servidor/cripto';
import { abrirSesion, cerrarTodasLasSesiones } from '@/features/auth/servidor/sesion';
import { claveNueva } from '@/features/panel/contratos';
import { requerirSesion } from '@/features/servidor/guardia';
import { cuerpoJson, errorDePeticion, ok, responder } from '@/features/servidor/respuestas';

/**
 * `POST /api/auth/cambiar-clave` — cada quien cambia la suya.
 *
 * Pide la contraseña actual aunque ya haya sesión abierta. Sin eso, un
 * computador de obra que alguien dejó abierto se convierte en una cuenta
 * secuestrada de forma permanente en dos clics.
 *
 * **Al terminar se cierran todas las sesiones de esa persona y se abre una
 * nueva.** Si alguien cambia su clave porque sospecha que se la robaron, dejar
 * vivas las sesiones abiertas en otros equipos haría el cambio decorativo. La
 * nueva sesión es para que quien lo hizo no se quede fuera de su propio panel.
 */
export async function POST(peticion: Request) {
  return responder(async () => {
    // `false`: es justamente la ruta que tiene que funcionar cuando la clave es
    // temporal. Es la única salida de ese estado.
    const sesion = await requerirSesion(peticion, { exigirClaveDefinitiva: false });
    if (sesion instanceof Response) return sesion;

    const { actual, nueva } = await cuerpoJson(peticion, claveNueva);

    const db = baseServidor();
    const [credencial] = await db
      .select({ hash: credencialesWeb.hash })
      .from(credencialesWeb)
      .where(eq(credencialesWeb.usuarioId, sesion.id))
      .limit(1);

    if (!credencial || !(await verificarClave(actual, credencial.hash))) {
      return errorDePeticion('La contraseña actual no es correcta.', 401);
    }

    if (await verificarClave(nueva, credencial.hash)) {
      return errorDePeticion('La contraseña nueva tiene que ser distinta de la actual.', 400);
    }

    await db
      .update(credencialesWeb)
      .set({ hash: await hashDeClave(nueva), debeCambiar: false })
      .where(eq(credencialesWeb.usuarioId, sesion.id));

    await cerrarTodasLasSesiones(sesion.id);
    const cookie = await abrirSesion(sesion.id);

    return ok({ ok: true }, 200, { 'Set-Cookie': cookie });
  });
}
