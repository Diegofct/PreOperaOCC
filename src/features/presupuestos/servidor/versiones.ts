/**
 * Aprobar un presupuesto y crear una nueva versión (spec 031, RF-49 a RF-55). **Solo
 * servidor.**
 *
 * ── Aprobar sin dejar la obra sin vigente ──
 *
 * Aprobar son dos cambios: el vigente pasa a reemplazado y el borrador a vigente. Van en
 * un lote, que Neon corre en una sola transacción, y en ese orden, porque el índice
 * parcial no admite dos vigentes a la vez. El primero solo se aplica si el borrador
 * sigue siendo el que se leyó (`exists … version = ?`): si otra persona lo cambió en
 * medio, ninguno de los dos entra y la obra conserva su vigente.
 *
 * ── Lo que desaparece ──
 *
 * Antes de aprobar se compara el borrador con el vigente: un ítem que se quita y ya tiene
 * cantidades en la bitácora se avisa con lo reportado y hay que confirmar (RF-54). La
 * identidad entre versiones es el ítem de pago dentro de su capítulo (RF-53).
 */
import { and, eq, isNull, sql } from 'drizzle-orm';

import { baseServidor } from '@/db/servidor/cliente';
import { partesDeObra, presupuestos } from '@/db/servidor/esquema';
import type { PresupuestoDetalle } from '@/features/panel/contratos';
import type { PersonaEnSesion } from '@/features/servidor/guardia';
import { errorDePeticion, noEncontrado } from '@/features/servidor/respuestas';
import {
  claveDeItem,
  copiarParaNuevaVersion,
  faltasParaAprobarPresupuesto,
  itemsQueDesaparecen,
} from '@/shared/rules/presupuesto';

import {
  crearBorrador,
  detalleDe,
  MENSAJE_DE_CHOQUE_DEL_PRESUPUESTO,
  presupuestoAlAlcance,
} from './presupuestos';

/**
 * Lo reportado en la bitácora de la obra por ítem y capítulo, en las bitácoras no
 * anuladas (RF-54). Las actividades sin capítulo no cuentan: no son de ningún ítem del
 * presupuesto en particular.
 */
export async function cantidadesReportadas(obraId: string): Promise<Map<string, number>> {
  const partes = await baseServidor()
    .select({ actividades: partesDeObra.actividades })
    .from(partesDeObra)
    .where(and(eq(partesDeObra.obraId, obraId), isNull(partesDeObra.anuladoEn)));
  const suma = new Map<string, number>();
  for (const { actividades } of partes) {
    for (const a of actividades) {
      if (!a.capituloId || !a.item || !a.cantidad) continue;
      const clave = claveDeItem(a.capituloId, a.item);
      suma.set(clave, (suma.get(clave) ?? 0) + a.cantidad);
    }
  }
  return suma;
}

async function vigenteDeLaObra(obraId: string) {
  const [fila] = await baseServidor()
    .select()
    .from(presupuestos)
    .where(and(eq(presupuestos.obraId, obraId), eq(presupuestos.estado, 'vigente')))
    .limit(1);
  return fila;
}

/**
 * Aprobar un borrador (RF-49 a RF-54). Solo la gerencia: lo exige la ruta (RF-3). Con
 * faltas, 400 con la lista; con ítems reportados que desaparecen y sin `confirmar`, 409
 * con la lista.
 */
export async function aprobarPresupuesto(
  sesion: PersonaEnSesion,
  id: string,
  pedido: { version: number; confirmar: boolean },
): Promise<PresupuestoDetalle | Response> {
  const fila = await presupuestoAlAlcance(sesion, id);
  if (!fila) return noEncontrado('ese presupuesto');
  if (fila.estado !== 'borrador') return errorDePeticion('Solo se aprueba un borrador.', 409);
  if (fila.version !== pedido.version) return errorDePeticion(MENSAJE_DE_CHOQUE_DEL_PRESUPUESTO, 409);

  const faltas = faltasParaAprobarPresupuesto(fila.estructura);
  if (faltas.length > 0) {
    return Response.json({ error: `No se puede aprobar todavía. ${faltas[0]}`, faltas }, { status: 400 });
  }

  const vigente = await vigenteDeLaObra(fila.obraId);
  if (vigente && !pedido.confirmar) {
    const desaparecen = itemsQueDesaparecen(vigente.estructura, fila.estructura, await cantidadesReportadas(fila.obraId));
    if (desaparecen.length > 0) {
      return Response.json(
        {
          error: `Esta versión quita ${desaparecen.length === 1 ? 'un ítem que ya tiene' : `${desaparecen.length} ítems que ya tienen`} cantidades en la bitácora. Confirme para aprobarla igual.`,
          desaparecen,
        },
        { status: 409 },
      );
    }
  }

  const db = baseServidor();
  const borradorIntacto = sql`exists (select 1 from ${presupuestos} b
    where b.id = ${id} and b.version = ${pedido.version} and b.estado = 'borrador')`;
  const [, aprobado] = await db.batch([
    db
      .update(presupuestos)
      .set({ estado: 'reemplazado', actualizadoPor: sesion.id })
      .where(and(eq(presupuestos.obraId, fila.obraId), eq(presupuestos.estado, 'vigente'), borradorIntacto)),
    db
      .update(presupuestos)
      .set({
        estado: 'vigente',
        aprobadoEn: new Date(),
        aprobadoPor: sesion.id,
        version: pedido.version + 1,
        actualizadoPor: sesion.id,
      })
      .where(and(eq(presupuestos.id, id), eq(presupuestos.version, pedido.version), eq(presupuestos.estado, 'borrador')))
      .returning(),
  ]);
  return aprobado[0] ? detalleDe(aprobado[0]) : errorDePeticion(MENSAJE_DE_CHOQUE_DEL_PRESUPUESTO, 409);
}

/**
 * Una nueva versión del vigente (RF-52): borrador con la copia exacta de su estructura,
 * con los mismos ids, y la nota del motivo. 409 si ya hay un borrador (RF-57).
 */
export async function nuevaVersion(
  sesion: PersonaEnSesion,
  id: string,
  nota: string,
): Promise<PresupuestoDetalle | Response> {
  const fila = await presupuestoAlAlcance(sesion, id);
  if (!fila) return noEncontrado('ese presupuesto');
  if (fila.estado !== 'vigente') {
    return errorDePeticion('Una nueva versión sale del presupuesto vigente.', 409);
  }
  return crearBorrador(sesion, fila.obraId, {
    nombre: fila.nombre,
    notaVersion: nota,
    estructura: copiarParaNuevaVersion(fila.estructura),
    origen: 'copia',
  });
}
