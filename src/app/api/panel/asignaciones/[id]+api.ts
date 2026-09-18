import { and, eq, isNull } from 'drizzle-orm';

import { baseServidor } from '@/db/servidor/cliente';
import { asignaciones } from '@/db/servidor/esquema';
import { asignacionEditada } from '@/features/panel/contratos';
import { alcanzaLaObra } from '@/features/servidor/alcance';
import { requerirPermiso } from '@/features/servidor/guardia';
import { cuerpoJson, noEncontrado, ok, responder } from '@/features/servidor/respuestas';

/**
 * Lo que se le hace a una asignación viva: cerrarla.
 * `PATCH /api/panel/asignaciones/:id`.
 *
 * Va con un campo `accion` en vez de aceptar cambios libres de columnas porque
 * no es una edición: es un hecho del negocio, y dejar que el cliente ponga
 * `hasta` u `origen` a mano permitiría reabrir una asignación cerrada o
 * cambiarle a posteriori cómo se tomó esa máquina.
 *
 * Hasta la spec 012 había una segunda acción, `confirmar`, para aceptar lo que
 * un operador se hubiera autoasignado desde el celular. Ya no se puede tomar
 * ninguna máquina desde el celular, así que no hay nada que confirmar; las
 * columnas `origen` y `confirmadaEn` se quedan porque las filas de antes las
 * tienen llenas y eso es evidencia de cómo se operó esa máquina.
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
    const sesion = await requerirPermiso(peticion, 'asignaciones', 'escribir');
    if (sesion instanceof Response) return sesion;

    const [existente] = await baseServidor()
      .select({ obraId: asignaciones.obraId })
      .from(asignaciones)
      .where(and(eq(asignaciones.id, id), isNull(asignaciones.eliminadoEn)))
      .limit(1);

    if (!existente || !alcanzaLaObra(sesion, existente.obraId)) {
      return noEncontrado('esa asignación');
    }

    // Se valida aunque solo quede un valor: es lo que rechaza el `confirmar` de
    // un panel viejo abierto en otra pestaña, con un 400 en vez de un cierre.
    await cuerpoJson(peticion, asignacionEditada);

    const [fila] = await baseServidor()
      .update(asignaciones)
      .set({ hasta: new Date() })
      .where(and(eq(asignaciones.id, id), isNull(asignaciones.eliminadoEn)))
      .returning(COLUMNAS);

    return fila ? ok(fila) : noEncontrado('esa asignación');
  });
}
