/**
 * «No se pudo guardar»: los renglones de un mensaje que el sistema no pudo guardar
 * solo (spec 024, RF-19, RF-60). **Solo servidor.**
 *
 * El id es fijo —mensaje, sección y renglón—, así que procesar otra vez el mensaje
 * no los duplica, y un renglón ya resuelto (guardado o descartado) no vuelve a
 * aparecer. Lo del mensaje entero (sin renglón: la fecha, la bitácora cerrada, el
 * abandono) es distinto: «guardarlo» es reintentar (RF-61), y si el reintento vuelve
 * a fallar tiene que reaparecer pendiente, con el motivo nuevo.
 */
import { sql } from 'drizzle-orm';

import { baseServidor } from '@/db/servidor/cliente';
import { whatsappExcepciones } from '@/db/servidor/esquema';
import type { RenglonApartado } from '@/shared/rules/whatsapp-automatico';

import { idDeterminista } from './ids';

/** Los renglones apartados, a «No se pudo guardar», con id fijo (RF-19, RF-60). */
export async function apartar(mensajeId: string, apartados: readonly RenglonApartado[]): Promise<void> {
  if (apartados.length === 0) return;
  const filas = await Promise.all(
    apartados.map(async (a) => ({
      id: await idDeterminista(mensajeId, `excepcion-${a.seccion}`, a.renglon ?? 'seccion'),
      mensajeId,
      seccion: a.seccion,
      renglon: a.renglon,
      motivo: a.motivo,
      datos: (a.datos ?? null) as Record<string, unknown> | null,
    })),
  );
  await baseServidor()
    .insert(whatsappExcepciones)
    .values(filas)
    .onConflictDoUpdate({
      target: whatsappExcepciones.id,
      set: {
        motivo: sql`excluded.motivo`,
        datos: sql`excluded.datos`,
        estado: 'pendiente',
        resueltaPor: null,
        resueltaEn: null,
      },
      where: sql`${whatsappExcepciones.renglon} is null and ${whatsappExcepciones.estado} = 'guardada'`,
    });
}
