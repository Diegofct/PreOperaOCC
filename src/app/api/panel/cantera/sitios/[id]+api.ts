import { and, eq, isNull } from 'drizzle-orm';

import { baseServidor } from '@/db/servidor/cliente';
import { canteraSitios } from '@/db/servidor/esquema';
import { sitioAlAlcance } from '@/features/cantera/servidor/catalogos';
import { sitioEditado } from '@/features/panel/contratos';
import { requerirPermiso } from '@/features/servidor/guardia';
import { cuerpoJson, noEncontrado, ok, responder } from '@/features/servidor/respuestas';
import { normalizar } from '@/shared/rules/texto';

/**
 * Corregir un sitio. `PATCH /api/panel/cantera/sitios/:id` (spec 010, RF-4).
 *
 * Los viajes apuntan al sitio por su id, así que corregir el nombre o el tipo no
 * los altera; y las bitácoras cerradas guardaron el nombre de ese día, así que
 * tampoco cambian (RF-29).
 */
export async function PATCH(peticion: Request, { id }: { id: string }) {
  return responder(async () => {
    const sesion = await requerirPermiso(peticion, 'cantera', 'escribir');
    if (sesion instanceof Response) return sesion;

    const cambios = await cuerpoJson(peticion, sitioEditado);
    if (!(await sitioAlAlcance(sesion, id))) return noEncontrado('ese sitio');

    await baseServidor()
      .update(canteraSitios)
      .set({
        ...(cambios.nombre !== undefined
          ? { nombre: cambios.nombre, nombreNormalizado: normalizar(cambios.nombre) }
          : {}),
        ...(cambios.tipo !== undefined ? { tipo: cambios.tipo } : {}),
        actualizadoEn: new Date(),
      })
      .where(and(eq(canteraSitios.id, id), isNull(canteraSitios.eliminadoEn)));

    const corregido = await sitioAlAlcance(sesion, id);
    return corregido ? ok(corregido) : noEncontrado('ese sitio');
  });
}
