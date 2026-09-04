import { eq } from 'drizzle-orm';

import { baseServidor } from '@/db/servidor/cliente';
import { preoperacionales } from '@/db/servidor/esquema';
import { anulacion } from '@/features/panel/contratos';
import { alcanzaLaObra } from '@/features/servidor/alcance';
import { requerirSesion } from '@/features/servidor/guardia';
import {
  cuerpoJson,
  errorDePeticion,
  noEncontrado,
  ok,
  responder,
} from '@/features/servidor/respuestas';

/**
 * Anular un preoperacional. `POST /api/panel/preoperacionales/:id/anular`.
 *
 * **La única forma de corregir uno.** Un preoperacional firmado es evidencia del
 * estado de una máquina en un momento concreto; reescribirlo haría imposible
 * saber después qué se documentó realmente. Se anula, con quién y por qué, y se
 * levanta otro.
 *
 * Anularlo devuelve la máquina a la lista de pendientes del día, que es
 * exactamente lo que se quiere: hay que volver a inspeccionarla bien.
 *
 * Exige motivo escrito. Sin él, dentro de seis meses un preoperacional anulado
 * es indistinguible de un error de manejo del panel.
 */
export async function POST(peticion: Request, { id }: { id: string }) {
  return responder(async () => {
    const sesion = await requerirSesion(peticion);
    if (sesion instanceof Response) return sesion;

    const { motivo } = await cuerpoJson(peticion, anulacion);
    const db = baseServidor();

    const [fila] = await db
      .select({ obraId: preoperacionales.obraId, anuladoEn: preoperacionales.anuladoEn })
      .from(preoperacionales)
      .where(eq(preoperacionales.id, id))
      .limit(1);

    if (!fila || !alcanzaLaObra(sesion, fila.obraId)) return noEncontrado('ese preoperacional');
    if (fila.anuladoEn) return errorDePeticion('Ese preoperacional ya estaba anulado.', 409);

    await db
      .update(preoperacionales)
      .set({ anuladoEn: new Date(), anuladoPor: sesion.id, motivoAnulacion: motivo })
      .where(eq(preoperacionales.id, id));

    return ok({ id, anulado: true });
  });
}
