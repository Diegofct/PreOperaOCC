import { and, eq, isNull } from 'drizzle-orm';

import { baseServidor } from '@/db/servidor/cliente';
import { dispositivos, usuarios } from '@/db/servidor/esquema';
import { personaEditada } from '@/features/panel/contratos';
import { alcanzaLaObra } from '@/features/servidor/alcance';
import type { PersonaEnSesion } from '@/features/servidor/guardia';
import { requerirSesion } from '@/features/servidor/guardia';
import {
  cuerpoJson,
  errorDePeticion,
  noEncontrado,
  ok,
  responder,
} from '@/features/servidor/respuestas';

/** Editar y dar de baja una persona. `PATCH` y `DELETE /api/panel/personas/:id`. */

const COLUMNAS = {
  id: usuarios.id,
  usuario: usuarios.usuario,
  nombreCompleto: usuarios.nombreCompleto,
  documento: usuarios.documento,
  rol: usuarios.rol,
  obraId: usuarios.obraId,
  activo: usuarios.activo,
};

/**
 * Comprueba que la persona existe y cae dentro del alcance de quien pregunta.
 *
 * Va antes de cada escritura, y no basta con filtrar el listado: quien conoce un
 * id puede llamar directamente a esta ruta sin haber pasado por la pantalla.
 */
async function personaAlcanzable(
  sesion: PersonaEnSesion,
  id: string,
): Promise<Response | null> {
  const [fila] = await baseServidor()
    .select({ obraId: usuarios.obraId, rol: usuarios.rol })
    .from(usuarios)
    .where(and(eq(usuarios.id, id), isNull(usuarios.eliminadoEn)))
    .limit(1);

  if (!fila) return noEncontrado('esa persona');
  if (!alcanzaLaObra(sesion, fila.obraId)) return noEncontrado('esa persona');
  if (fila.rol === 'admin' && sesion.rol !== 'admin') {
    return errorDePeticion('Solo la gerencia puede modificar a otra gerencia.', 403);
  }
  return null;
}

export async function PATCH(peticion: Request, { id }: { id: string }) {
  return responder(async () => {
    const sesion = await requerirSesion(peticion);
    if (sesion instanceof Response) return sesion;

    const fueraDeAlcance = await personaAlcanzable(sesion, id);
    if (fueraDeAlcance) return fueraDeAlcance;

    const cambios = await cuerpoJson(peticion, personaEditada);

    const [fila] = await baseServidor()
      .update(usuarios)
      .set(cambios)
      .where(and(eq(usuarios.id, id), isNull(usuarios.eliminadoEn)))
      .returning(COLUMNAS);

    return fila ? ok(fila) : noEncontrado('esa persona');
  });
}

/**
 * Baja de una persona: `activo = false` **y** lápida.
 *
 * Las dos, y no una: `activo` es lo que el celular ya sabe leer —la réplica
 * local no tiene columna de lápida— y `eliminado_en` es lo que libera el nombre
 * de usuario para que se pueda reutilizar. El índice único de `usuarios.usuario`
 * es parcial justamente por esto.
 *
 * Nunca se borra la fila: hay preoperacionales y bitácoras firmados apuntándole,
 * y un registro cuyo autor desapareció deja de ser evidencia de nada.
 */
export async function DELETE(peticion: Request, { id }: { id: string }) {
  return responder(async () => {
    const sesion = await requerirSesion(peticion);
    if (sesion instanceof Response) return sesion;

    const fueraDeAlcance = await personaAlcanzable(sesion, id);
    if (fueraDeAlcance) return fueraDeAlcance;

    // Darse de baja a uno mismo deja el sistema sin quien lo administre si
    // resulta ser el único administrador. Se corta aquí, que es barato.
    if (id === sesion.id) {
      return errorDePeticion('No puede darse de baja a usted mismo.', 400);
    }

    /**
     * Un operador con equipo activo **no se borra**: se desactiva.
     *
     * La lápida libera su nombre de usuario, y el celular resuelve el desbloqueo
     * contra su propia réplica. Si el nombre se reasignara a otra persona, ese
     * teléfono quedaría con una identidad que ya no le corresponde. Desactivarlo
     * corta el acceso igual —la guardia del móvil lo rechaza en la siguiente
     * petición— sin dejar esa puerta abierta.
     */
    const [equipo] = await baseServidor()
      .select({ id: dispositivos.id })
      .from(dispositivos)
      .where(and(eq(dispositivos.usuarioId, id), isNull(dispositivos.revocadoEn)))
      .limit(1);

    if (equipo) {
      return errorDePeticion(
        'Esa persona tiene un celular activado. Desactívela en vez de darla de baja, o revoque ' +
          'primero su equipo.',
        409,
      );
    }

    const [fila] = await baseServidor()
      .update(usuarios)
      .set({ activo: false, eliminadoEn: new Date() })
      .where(and(eq(usuarios.id, id), isNull(usuarios.eliminadoEn)))
      .returning(COLUMNAS);

    return fila ? ok(fila) : noEncontrado('esa persona');
  });
}
