import { and, eq, isNull } from 'drizzle-orm';

import { baseServidor } from '@/db/servidor/cliente';
import { canteraSitios } from '@/db/servidor/esquema';
import { sitioAlAlcance } from '@/features/cantera/servidor/catalogos';
import { requerirPermiso } from '@/features/servidor/guardia';
import { noEncontrado, ok, responder } from '@/features/servidor/respuestas';

/**
 * Dar de baja un sitio. `POST /api/panel/cantera/sitios/:id/baja` (spec 010, RF-5).
 *
 * Baja lógica y sin condición: los viajes que lo usaron lo siguen nombrando, y
 * desde ahora no se ofrece para viajes nuevos (RF-6). `POST` a una acción y no
 * `DELETE`, porque no se borra nada.
 */
export async function POST(peticion: Request, { id }: { id: string }) {
  return responder(async () => {
    const sesion = await requerirPermiso(peticion, 'cantera', 'escribir');
    if (sesion instanceof Response) return sesion;

    if (!(await sitioAlAlcance(sesion, id))) return noEncontrado('ese sitio');

    const [dado] = await baseServidor()
      .update(canteraSitios)
      .set({ eliminadoEn: new Date(), actualizadoEn: new Date() })
      .where(and(eq(canteraSitios.id, id), isNull(canteraSitios.eliminadoEn)))
      .returning({ id: canteraSitios.id });

    return dado ? ok(dado) : noEncontrado('ese sitio');
  });
}
