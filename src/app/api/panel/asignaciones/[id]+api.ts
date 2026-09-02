import { and, eq, isNull } from 'drizzle-orm';

import { baseServidor } from '@/db/servidor/cliente';
import { asignaciones } from '@/db/servidor/esquema';
import { asignacionEditada } from '@/features/panel/contratos';
import { alcanzaLaObra } from '@/features/servidor/alcance';
import { requerirSesion } from '@/features/servidor/guardia';
import { cuerpoJson, noEncontrado, ok, responder } from '@/features/servidor/respuestas';

/**
 * Las dos cosas que se le hacen a una asignación viva: confirmarla o cerrarla.
 * `PATCH /api/panel/asignaciones/:id`.
 *
 * Van juntas en un solo endpoint con un campo `accion` en vez de aceptar cambios
 * libres de columnas, porque no son ediciones: son dos hechos del negocio con
 * efectos distintos, y dejar que el cliente ponga `origen` o `hasta` a mano
 * permitiría reabrir una asignación cerrada o marcar como confirmada una que
 * nadie miró.
 */

const COLUMNAS = {
  id: asignaciones.id,
  vehiculoId: asignaciones.vehiculoId,
  usuarioId: asignaciones.usuarioId,
  desde: asignaciones.desde,
  hasta: asignaciones.hasta,
  origen: asignaciones.origen,
  confirmadaEn: asignaciones.confirmadaEn,
};

export async function PATCH(peticion: Request, { id }: { id: string }) {
  return responder(async () => {
    const sesion = await requerirSesion(peticion);
    if (sesion instanceof Response) return sesion;

    const [existente] = await baseServidor()
      .select({ obraId: asignaciones.obraId })
      .from(asignaciones)
      .where(and(eq(asignaciones.id, id), isNull(asignaciones.eliminadoEn)))
      .limit(1);

    if (!existente || !alcanzaLaObra(sesion, existente.obraId)) {
      return noEncontrado('esa asignación');
    }

    const { accion } = await cuerpoJson(peticion, asignacionEditada);

    /**
     * Confirmar pasa `origen` a 'supervisor', que es lo que apaga el aviso en
     * el celular, y deja fecha en `confirmadaEn` para no perder el hecho de que
     * la máquina se tomó sin asignación previa. `confirmadaPor` se queda vacío
     * hasta que exista el ingreso: es mejor no saber quién confirmó que
     * atribuírselo a alguien inventado.
     */
    const cambios =
      accion === 'confirmar'
        ? { origen: 'supervisor' as const, confirmadaEn: new Date() }
        : { hasta: new Date() };

    const [fila] = await baseServidor()
      .update(asignaciones)
      .set(cambios)
      .where(and(eq(asignaciones.id, id), isNull(asignaciones.eliminadoEn)))
      .returning(COLUMNAS);

    return fila ? ok(fila) : noEncontrado('esa asignación');
  });
}
