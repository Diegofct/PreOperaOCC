import { eq } from 'drizzle-orm';

import { baseServidor } from '@/db/servidor/cliente';
import { bitacoras } from '@/db/servidor/esquema';
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
 * Anular una bitácora. `POST /api/panel/bitacoras/:id/anular`.
 *
 * Es la única forma de corregir una bitácora cerrada, y no borra nada: deja la
 * fila con quién la anuló, cuándo y por qué. Una bitácora es evidencia del
 * trabajo de un día; reescribirla haría imposible saber después qué se
 * documentó realmente en su momento.
 *
 * Al anularla, la máquina vuelve a aparecer como pendiente de ese día, que es
 * exactamente lo que se quiere: hay que volver a levantarla bien.
 *
 * Exige un motivo escrito. Sin él, dentro de seis meses una bitácora anulada es
 * indistinguible de un error de manejo del panel.
 */
export async function POST(peticion: Request, { id }: { id: string }) {
  return responder(async () => {
    const sesion = await requerirSesion(peticion);
    if (sesion instanceof Response) return sesion;

    const { motivo } = await cuerpoJson(peticion, anulacion);
    const db = baseServidor();

    const [fila] = await db
      .select({ obraId: bitacoras.obraId, anuladoEn: bitacoras.anuladoEn })
      .from(bitacoras)
      .where(eq(bitacoras.id, id))
      .limit(1);

    if (!fila || !alcanzaLaObra(sesion, fila.obraId)) return noEncontrado('esa bitácora');
    if (fila.anuladoEn) return errorDePeticion('Esa bitácora ya estaba anulada.', 409);

    await db
      .update(bitacoras)
      .set({ anuladoEn: new Date(), anuladoPor: sesion.id, motivoAnulacion: motivo })
      .where(eq(bitacoras.id, id));

    return ok({ id, anulada: true });
  });
}
