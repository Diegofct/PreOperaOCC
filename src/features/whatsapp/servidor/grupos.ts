/**
 * De quién es un grupo de WhatsApp: asociarlo a una obra **o** a una empresa (spec 021,
 * RF-8 a RF-13; spec 038, RF-1 a RF-5). **Solo servidor.**
 *
 * ── Qué se mueve y qué no ──
 *
 * La obra o la empresa de un mensaje que nadie ha decidido **es** la de su grupo
 * (`obra.ts`), así que cambiar el dueño del grupo se lleva los pendientes sin tocarlos
 * (RF-4, 021/RF-13). Lo ya guardado o decidido guarda dónde quedó y no se mueve.
 *
 * El caso que no cubría eso es un mensaje **en espera** de su día en una obra (024/RF-5):
 * todavía no se guardó, pero ya cuenta para la bitácora de esa obra y sus viajes ya están
 * en Control Cantera. Si se fuera con el grupo a OCC, ese día de la obra perdería un
 * reporte que sí le llegó. Por eso, antes de cambiar el dueño, se le fija la obra en la
 * que está esperando.
 *
 * Solo al pasar a una empresa: entre dos obras sigue la regla de la 021 (RF-32). Son dos
 * sentencias sin transacción (Neon por HTTP): primero fijar, después cambiar. Si la
 * segunda falla, la primera dejó escrita la obra que ya tenían: nada cambió.
 */
import { and, eq, isNull, sql } from 'drizzle-orm';

import { baseServidor } from '@/db/servidor/cliente';
import { obras, whatsappGrupos, whatsappMensajes } from '@/db/servidor/esquema';
import type { GrupoFila } from '@/features/panel/contratos';
import type { PersonaEnSesion } from '@/features/servidor/guardia';
import { errorDePeticion, noEncontrado } from '@/features/servidor/respuestas';
import { nombreDeEmpresa } from '@/shared/rules/empresas';
import { duenoDelGrupo } from '@/shared/rules/whatsapp';

export async function asociarGrupo(
  sesion: PersonaEnSesion,
  grupoId: string,
  pedido: { obraId?: string | null; empresaId?: string | null },
): Promise<Omit<GrupoFila, 'pendientes' | 'ultimoMensajeEn'> | Response> {
  const dueno = duenoDelGrupo(pedido);
  if ('error' in dueno) return errorDePeticion(dueno.error, 422);
  // Quitarle el dueño a un grupo no se ofrece (021): sus mensajes dejarían de verse.
  if (dueno.tipo === 'ninguno') return errorDePeticion('Elija la obra o la empresa del grupo.', 422);

  const db = baseServidor();
  let obraNombre: string | null = null;
  if (dueno.tipo === 'obra') {
    // Una obra activa: asociar un grupo a una obra cerrada mandaría sus reportes a una
    // bandeja que ya nadie mira.
    const [obra] = await db
      .select({ nombre: obras.nombre })
      .from(obras)
      .where(and(eq(obras.id, dueno.obraId), eq(obras.activa, true), isNull(obras.eliminadoEn)))
      .limit(1);
    if (!obra) return errorDePeticion('Esa obra no existe o no está activa.', 400);
    obraNombre = obra.nombre;
  }
  const obraId = dueno.tipo === 'obra' ? dueno.obraId : null;
  const empresaId = dueno.tipo === 'empresa' ? dueno.empresaId : null;

  // Al pasar a una empresa, los que esperan su día en la obra de ahora se quedan en ella
  // (ver arriba). Entre dos obras no se toca: es lo de la 021 y la 038 no lo cambia (RF-32).
  if (dueno.tipo === 'empresa') {
    await db
      .update(whatsappMensajes)
      .set({
        obraDecididaId: sql`(select ${whatsappGrupos.obraId} from ${whatsappGrupos} where ${whatsappGrupos.id} = ${grupoId})`,
      })
      .where(
        and(
          eq(whatsappMensajes.grupoId, grupoId),
          eq(whatsappMensajes.estado, 'en_espera'),
          isNull(whatsappMensajes.obraDecididaId),
          isNull(whatsappMensajes.empresaDecididaId),
        ),
      );
  }

  const [grupo] = await db
    .update(whatsappGrupos)
    .set({ obraId, empresaId, asociadoPor: sesion.id, asociadoEn: new Date() })
    .where(eq(whatsappGrupos.id, grupoId))
    .returning({
      id: whatsappGrupos.id,
      nombre: whatsappGrupos.nombre,
      obraId: whatsappGrupos.obraId,
      empresaId: whatsappGrupos.empresaId,
      asociadoEn: whatsappGrupos.asociadoEn,
    });
  if (!grupo) return noEncontrado('ese grupo');

  return {
    ...grupo,
    asociadoEn: grupo.asociadoEn?.toISOString() ?? null,
    obraNombre,
    empresaNombre: grupo.empresaId ? nombreDeEmpresa(grupo.empresaId) : null,
  };
}
