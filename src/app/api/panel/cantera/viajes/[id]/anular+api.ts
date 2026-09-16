import { and, eq, isNull } from 'drizzle-orm';

import { baseServidor } from '@/db/servidor/cliente';
import { canteraViajes } from '@/db/servidor/esquema';
import { avisoDeBitacoraCerrada } from '@/features/cantera/servidor/viajes';
import { anulacion } from '@/features/panel/contratos';
import { alcanzaLaObra } from '@/features/servidor/alcance';
import { requerirPermiso } from '@/features/servidor/guardia';
import {
  cuerpoJson,
  errorDePeticion,
  noEncontrado,
  ok,
  responder,
} from '@/features/servidor/respuestas';

/**
 * Anular un viaje. `POST /api/panel/cantera/viajes/:id/anular` (spec 010, RF-24,
 * RF-25 y RF-30).
 *
 * No se borra: queda marcado con quién, cuándo y por qué, y sigue en el listado. Si
 * la bitácora de su día ya está cerrada, se anula igual y se avisa que la bitácora
 * lo sigue mostrando.
 *
 * `anulado_en is null` en la sentencia impide anular dos veces a la vez.
 */
export async function POST(peticion: Request, { id }: { id: string }) {
  return responder(async () => {
    const sesion = await requerirPermiso(peticion, 'cantera', 'anular');
    if (sesion instanceof Response) return sesion;

    const { motivo } = await cuerpoJson(peticion, anulacion);

    const [viaje] = await baseServidor()
      .select({
        obraId: canteraViajes.obraId,
        fecha: canteraViajes.fecha,
        anuladoEn: canteraViajes.anuladoEn,
      })
      .from(canteraViajes)
      .where(eq(canteraViajes.id, id))
      .limit(1);

    // Uno de otra obra responde igual que uno que no existe.
    if (!viaje || !alcanzaLaObra(sesion, viaje.obraId)) return noEncontrado('ese viaje');
    if (viaje.anuladoEn) return errorDePeticion('Este viaje ya estaba anulado.', 409);

    const [anulado] = await baseServidor()
      .update(canteraViajes)
      .set({ anuladoEn: new Date(), anuladoPor: sesion.id, motivoAnulacion: motivo })
      .where(and(eq(canteraViajes.id, id), isNull(canteraViajes.anuladoEn)))
      .returning({ id: canteraViajes.id });

    if (!anulado) return errorDePeticion('Este viaje ya estaba anulado.', 409);

    return ok({
      id,
      aviso: await avisoDeBitacoraCerrada(viaje.obraId, viaje.fecha, 'anulacion'),
    });
  });
}
