import { and, eq, isNull } from 'drizzle-orm';

import { baseServidor } from '@/db/servidor/cliente';
import { canteraMateriales } from '@/db/servidor/esquema';
import { materialAlAlcance } from '@/features/cantera/servidor/catalogos';
import { materialDeCanteraEditado } from '@/features/panel/contratos';
import { requerirPermiso } from '@/features/servidor/guardia';
import { cuerpoJson, noEncontrado, ok, responder } from '@/features/servidor/respuestas';
import { normalizar } from '@/shared/rules/texto';

/**
 * Corregir el nombre de un material de cantera.
 * `PATCH /api/panel/cantera/materiales/:id` (spec 010, RF-4). Los viajes lo apuntan
 * por id y no cambian.
 */
export async function PATCH(peticion: Request, { id }: { id: string }) {
  return responder(async () => {
    const sesion = await requerirPermiso(peticion, 'cantera', 'escribir');
    if (sesion instanceof Response) return sesion;

    const cambios = await cuerpoJson(peticion, materialDeCanteraEditado);
    if (!(await materialAlAlcance(sesion, id))) return noEncontrado('ese material');

    if (cambios.nombre !== undefined) {
      await baseServidor()
        .update(canteraMateriales)
        .set({
          nombre: cambios.nombre,
          nombreNormalizado: normalizar(cambios.nombre),
          actualizadoEn: new Date(),
        })
        .where(and(eq(canteraMateriales.id, id), isNull(canteraMateriales.eliminadoEn)));
    }

    const corregido = await materialAlAlcance(sesion, id);
    return corregido ? ok(corregido) : noEncontrado('ese material');
  });
}
