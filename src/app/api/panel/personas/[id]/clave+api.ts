import { and, eq, isNull } from 'drizzle-orm';

import { baseServidor } from '@/db/servidor/cliente';
import { credencialesWeb, usuarios } from '@/db/servidor/esquema';
import { generarClaveTemporal, hashDeClave } from '@/features/auth/servidor/cripto';
import { cerrarTodasLasSesiones } from '@/features/auth/servidor/sesion';
import { requerirAdmin } from '@/features/servidor/guardia';
import { errorDePeticion, noEncontrado, ok, responder } from '@/features/servidor/respuestas';

/**
 * `POST /api/panel/personas/:id/clave` — dar acceso al panel a alguien.
 *
 * Genera una contraseña temporal y **la devuelve una sola vez**. No se guarda en
 * claro en ninguna parte, así que no hay forma de volver a consultarla: si se
 * pierde, se genera otra. Eso es lo que se quiere — una clave recuperable es una
 * clave que alguien más puede recuperar.
 *
 * Quien la reciba está obligado a cambiarla al entrar (`debeCambiar`), de modo
 * que ni siquiera la gerencia acaba conociendo la contraseña definitiva de otro.
 *
 * **Solo `admin`.** Repartir accesos es de gerencia; un residente que pudiera
 * hacerlo podría darse a sí mismo una vía a otra obra.
 */
export async function POST(peticion: Request, { id }: { id: string }) {
  return responder(async () => {
    const sesion = await requerirAdmin(peticion);
    if (sesion instanceof Response) return sesion;

    const db = baseServidor();

    const [persona] = await db
      .select({
        id: usuarios.id,
        nombreCompleto: usuarios.nombreCompleto,
        usuario: usuarios.usuario,
        rol: usuarios.rol,
        activo: usuarios.activo,
      })
      .from(usuarios)
      .where(and(eq(usuarios.id, id), isNull(usuarios.eliminadoEn)))
      .limit(1);

    if (!persona) return noEncontrado('esa persona');

    if (persona.rol === 'operador') {
      return errorDePeticion(
        'Un operador no entra al panel: su acceso es la app del celular, con su PIN. ' +
          'Cámbiele el cargo si necesita que entre a la web.',
        400,
      );
    }

    if (!persona.activo) {
      return errorDePeticion('Esa persona está inactiva. Actívela antes de darle acceso.', 400);
    }

    const temporal = generarClaveTemporal();
    const hash = await hashDeClave(temporal);

    await db
      .insert(credencialesWeb)
      .values({ usuarioId: persona.id, hash, debeCambiar: true })
      .onConflictDoUpdate({
        target: credencialesWeb.usuarioId,
        set: { hash, debeCambiar: true, ultimoIngresoEn: null },
      });

    // Reponer la contraseña invalida lo anterior: si se repone porque se
    // sospecha de un acceso ajeno, dejar la sesión de ese acceso abierta haría
    // inútil la reposición.
    await cerrarTodasLasSesiones(persona.id);

    return ok({
      usuario: persona.usuario,
      nombreCompleto: persona.nombreCompleto,
      claveTemporal: temporal,
    });
  });
}
