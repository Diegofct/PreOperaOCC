import { and, eq, isNull } from 'drizzle-orm';

import { baseServidor } from '@/db/servidor/cliente';
import { obras, whatsappGrupos } from '@/db/servidor/esquema';
import { grupoAsociado } from '@/features/panel/contratos';
import { requerirAdmin } from '@/features/servidor/guardia';
import {
  cuerpoJson,
  errorDePeticion,
  noEncontrado,
  ok,
  responder,
} from '@/features/servidor/respuestas';
import { idDeLaRuta } from '@/features/whatsapp/servidor/obra';

/**
 * Asociar un grupo de WhatsApp a una obra, o cambiarla. `PATCH
 * /api/panel/whatsapp/grupos/:id` con `{ obraId }` (spec 021, RF-8, RF-9, RF-12,
 * RF-13).
 *
 * Solo la gerencia (RF-9). Es una sola sentencia y no mueve ningún mensaje: la
 * obra de un mensaje sin decidir **es** la de su grupo (`whatsapp/servidor/obra.ts`),
 * así que al asociarlo aparecen en esa bandeja los pendientes que ya había mandado
 * (RF-12), y al cambiarla se van con él a la nueva (RF-13). Lo ya aprobado o
 * descartado guarda la obra en que se decidió y no se mueve.
 *
 * Quitarle la obra a un grupo no se ofrece: la spec habla de asociar y de cambiar,
 * no de dejar un grupo huérfano con mensajes que ya se veían en una bandeja.
 */
export async function PATCH(peticion: Request, { id }: { id: string }) {
  return responder(async () => {
    const sesion = await requerirAdmin(peticion);
    if (sesion instanceof Response) return sesion;

    const { obraId } = await cuerpoJson(peticion, grupoAsociado);
    const db = baseServidor();

    // Una obra activa: asociar un grupo a una obra cerrada mandaría sus reportes a
    // una bandeja que ya nadie mira.
    const [obra] = await db
      .select({ id: obras.id, nombre: obras.nombre })
      .from(obras)
      .where(and(eq(obras.id, obraId), eq(obras.activa, true), isNull(obras.eliminadoEn)))
      .limit(1);
    if (!obra) return errorDePeticion('Esa obra no existe o no está activa.', 400);

    const [grupo] = await db
      .update(whatsappGrupos)
      .set({ obraId: obra.id, asociadoPor: sesion.id, asociadoEn: new Date() })
      .where(eq(whatsappGrupos.id, idDeLaRuta(id)))
      .returning({
        id: whatsappGrupos.id,
        nombre: whatsappGrupos.nombre,
        obraId: whatsappGrupos.obraId,
        asociadoEn: whatsappGrupos.asociadoEn,
      });
    if (!grupo) return noEncontrado('ese grupo');

    return ok({ ...grupo, obraNombre: obra.nombre });
  });
}
