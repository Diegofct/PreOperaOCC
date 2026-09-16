import { and, eq, isNull } from 'drizzle-orm';

import { baseServidor } from '@/db/servidor/cliente';
import { canteraMateriales } from '@/db/servidor/esquema';
import { materialAlAlcance } from '@/features/cantera/servidor/catalogos';
import { requerirPermiso } from '@/features/servidor/guardia';
import { noEncontrado, ok, responder } from '@/features/servidor/respuestas';

/**
 * Dar de baja un material de cantera.
 * `POST /api/panel/cantera/materiales/:id/baja` (spec 010, RF-5 y RF-6). Baja lógica y
 * sin condición: sus viajes lo siguen nombrando y deja de ofrecerse para nuevos.
 */
export async function POST(peticion: Request, { id }: { id: string }) {
  return responder(async () => {
    const sesion = await requerirPermiso(peticion, 'cantera', 'escribir');
    if (sesion instanceof Response) return sesion;

    if (!(await materialAlAlcance(sesion, id))) return noEncontrado('ese material');

    const [dado] = await baseServidor()
      .update(canteraMateriales)
      .set({ eliminadoEn: new Date(), actualizadoEn: new Date() })
      .where(and(eq(canteraMateriales.id, id), isNull(canteraMateriales.eliminadoEn)))
      .returning({ id: canteraMateriales.id });

    return dado ? ok(dado) : noEncontrado('ese material');
  });
}
