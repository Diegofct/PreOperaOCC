import { asc, eq, sql } from 'drizzle-orm';

import { baseServidor } from '@/db/servidor/cliente';
import { obras, whatsappGrupos, whatsappMensajes } from '@/db/servidor/esquema';
import { requerirAdmin } from '@/features/servidor/guardia';
import { ok, responder } from '@/features/servidor/respuestas';

/**
 * Los grupos de WhatsApp que han mandado mensajes. `GET /api/panel/whatsapp/grupos`
 * (spec 021, RF-8 a RF-10).
 *
 * Solo la gerencia: asociar un grupo a una obra es decidir de quién son sus
 * reportes, y eso es de quien ve todas las obras (RF-9). Los que no tienen obra
 * van primero, porque son lo que hay que resolver (RF-10): sus mensajes no salen
 * en ninguna bandeja hasta entonces (RF-11).
 *
 * Con cada grupo va cuántos mensajes tiene pendientes, para que la gerencia vea
 * qué pesa dejar un grupo sin asociar.
 */
export async function GET(peticion: Request) {
  return responder(async () => {
    const sesion = await requerirAdmin(peticion);
    if (sesion instanceof Response) return sesion;

    const grupos = await baseServidor()
      .select({
        id: whatsappGrupos.id,
        nombre: whatsappGrupos.nombre,
        obraId: whatsappGrupos.obraId,
        obraNombre: obras.nombre,
        asociadoEn: whatsappGrupos.asociadoEn,
        // Con la misma regla que la bandeja: lo que complementa a un mensaje que
        // existe —la foto de un reporte— va dentro de él y no cuenta aparte (RF-20).
        pendientes: sql<number>`(
          select count(*)::int from ${whatsappMensajes}
           where ${whatsappMensajes.grupoId} = ${whatsappGrupos.id}
             and ${whatsappMensajes.estado} = 'pendiente'
             and not exists (select 1 from whatsapp_mensajes p
                              where p.id = ${whatsappMensajes.complementaA}))`,
        ultimoMensajeEn: sql<string | null>`(
          select max(${whatsappMensajes.enviadoEn}) from ${whatsappMensajes}
           where ${whatsappMensajes.grupoId} = ${whatsappGrupos.id})`,
      })
      .from(whatsappGrupos)
      .leftJoin(obras, eq(obras.id, whatsappGrupos.obraId))
      .orderBy(sql`${whatsappGrupos.obraId} is not null`, asc(whatsappGrupos.nombre));

    return ok({ grupos });
  });
}
