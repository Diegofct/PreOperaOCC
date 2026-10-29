import { eq } from 'drizzle-orm';

import { baseServidor } from '@/db/servidor/cliente';
import { empresas } from '@/db/servidor/esquema';
import { datosDeLaFila } from '@/features/empresas/servidor/empresas';
import { empresaEditada } from '@/features/panel/contratos';
import { requerirPermiso } from '@/features/servidor/guardia';
import { cuerpoJson, noEncontrado, ok, responder } from '@/features/servidor/respuestas';
import { esEmpresa } from '@/shared/rules/empresas';

/**
 * Los datos de una empresa (spec 033, RF-31, RF-32). `PATCH /api/panel/empresas/:id`.
 *
 * Solo gerencia. No hay alta ni baja: las cuatro son fijas y las sembró la migración.
 * Responde los datos como quedaron.
 */
export async function PATCH(peticion: Request, { id }: { id: string }) {
  return responder(async () => {
    const sesion = await requerirPermiso(peticion, 'empresa', 'escribir');
    if (sesion instanceof Response) return sesion;
    if (!esEmpresa(id)) return noEncontrado('esa empresa');

    const cambios = await cuerpoJson(peticion, empresaEditada);

    const [fila] = await baseServidor()
      .update(empresas)
      .set({ ...cambios, actualizadoPor: sesion.id })
      .where(eq(empresas.id, id))
      .returning();

    return fila ? ok(datosDeLaFila(fila)) : noEncontrado('esa empresa');
  });
}
