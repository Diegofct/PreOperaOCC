import { and, eq, isNull } from 'drizzle-orm';

import { baseServidor } from '@/db/servidor/cliente';
import { obras } from '@/db/servidor/esquema';
import { obraEditada } from '@/features/panel/contratos';
import { requerirPermiso } from '@/features/servidor/guardia';
import { cuerpoJson, noEncontrado, ok, responder } from '@/features/servidor/respuestas';

/** Editar y dar de baja una obra. `PATCH` y `DELETE /api/panel/obras/:id`. */

const COLUMNAS = {
  id: obras.id,
  codigo: obras.codigo,
  nombre: obras.nombre,
  municipio: obras.municipio,
  activa: obras.activa,
  horario: obras.horario,
  almacenActivo: obras.almacenActivo,
  canteraActivo: obras.canteraActivo,
  laboratorioActivo: obras.laboratorioActivo,
};

export async function PATCH(peticion: Request, { id }: { id: string }) {
  return responder(async () => {
    // Editar y dar de baja obras es de gerencia, igual que crearlas.
    const sesion = await requerirPermiso(peticion, 'obras', 'escribir');
    if (sesion instanceof Response) return sesion;

    const cambios = await cuerpoJson(peticion, obraEditada);

    const [fila] = await baseServidor()
      .update(obras)
      .set(cambios)
      .where(and(eq(obras.id, id), isNull(obras.eliminadoEn)))
      .returning(COLUMNAS);

    return fila ? ok(fila) : noEncontrado('esa obra');
  });
}

/**
 * Baja lógica, nunca `DELETE`.
 *
 * De una obra cuelgan vehículos, personas y —cuando llegue el push—
 * preoperacionales firmados, que son evidencia. Borrar la fila rompería esas
 * referencias o, peor, obligaría a borrar en cascada registros que hay que
 * conservar. La lápida además es lo que le permite al celular enterarse de la
 * baja: una fila que simplemente deja de venir en el snapshot es indistinguible
 * de una que nunca le tocó.
 */
export async function DELETE(peticion: Request, { id }: { id: string }) {
  return responder(async () => {
    // Editar y dar de baja obras es de gerencia, igual que crearlas.
    const sesion = await requerirPermiso(peticion, 'obras', 'escribir');
    if (sesion instanceof Response) return sesion;

    const [fila] = await baseServidor()
      .update(obras)
      .set({ eliminadoEn: new Date(), activa: false })
      .where(and(eq(obras.id, id), isNull(obras.eliminadoEn)))
      .returning(COLUMNAS);

    return fila ? ok(fila) : noEncontrado('esa obra');
  });
}
