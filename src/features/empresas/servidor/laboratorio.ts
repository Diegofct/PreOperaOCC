/**
 * La Bitácora de Geolab (spec 038, RF-27, D6): el laboratorio de las bitácoras de todas las
 * obras, filtrable por obra y por fecha, mientras Geolab no tenga una bitácora propia.
 *
 * Como la pestaña «En las obras» de OCC (`maquinaria.ts`), se lee de las bitácoras y no se
 * guarda aparte: los ensayos ya están en cada una, con quién y a qué hora. Las anuladas no
 * salen: lo anulado no es lo que pasó. Los arma la misma regla que «Ensayos de obra»
 * (`ensayosDeLosPartes`), para que las dos pantallas cuenten igual.
 *
 * La ven gerencia y el laboratorista, que lleva el laboratorio de todas las obras
 * (`empresaAlAlcance`, RF-29); el Encargado de OCC no.
 */
import { and, asc, between, eq, isNull, sql } from 'drizzle-orm';

import { baseServidor } from '@/db/servidor/cliente';
import { obras, partesDeObra } from '@/db/servidor/esquema';
import { empresaAlAlcance } from '@/features/whatsapp/servidor/dias-empresa';
import { ensayosDeLosPartes, type EnsayoDeObra } from '@/shared/rules/ensayos-de-obra';
import { esFechaReal, fechaDeJornada } from '@/shared/rules/jornada';
import type { PersonaEnSesion } from '@/features/servidor/guardia';
import { errorDePeticion } from '@/features/servidor/respuestas';

/** Cuántos días hacia atrás si no se pide un rango. */
const DIAS_POR_DEFECTO = 30;

export interface EnsayoDeLasObras extends EnsayoDeObra {
  obraNombre: string;
}

export async function laboratorioDeLasObras(
  sesion: PersonaEnSesion,
  pedida: string,
  filtro: { obraId: string | null; desde: string | null; hasta: string | null },
): Promise<EnsayoDeLasObras[] | Response> {
  const empresa = empresaAlAlcance(sesion, pedida, 'listar');
  if (empresa instanceof Response) return empresa;
  if (empresa !== 'geolab') return errorDePeticion('El laboratorio de las obras es la Bitácora de Geolab.', 400);

  const hasta = filtro.hasta && esFechaReal(filtro.hasta) ? filtro.hasta : fechaDeJornada();
  const desde =
    filtro.desde && esFechaReal(filtro.desde)
      ? filtro.desde
      : new Date(Date.parse(`${hasta}T00:00:00Z`) - (DIAS_POR_DEFECTO - 1) * 86_400_000).toISOString().slice(0, 10);

  const partes = await baseServidor()
    .select({
      id: partesDeObra.id,
      obraId: partesDeObra.obraId,
      obraNombre: obras.nombre,
      fecha: partesDeObra.fecha,
      cerradoEn: partesDeObra.cerradoEn,
      laboratorio: partesDeObra.laboratorio,
    })
    .from(partesDeObra)
    .innerJoin(obras, eq(obras.id, partesDeObra.obraId))
    .where(
      and(
        isNull(partesDeObra.anuladoEn),
        between(partesDeObra.fecha, desde, hasta),
        filtro.obraId ? eq(partesDeObra.obraId, filtro.obraId) : undefined,
        sql`jsonb_array_length(${partesDeObra.laboratorio}) > 0`,
      ),
    )
    .orderBy(sql`${partesDeObra.fecha} desc`, asc(obras.nombre));

  const nombreDe = new Map(partes.map((p) => [p.obraId, p.obraNombre]));
  return ensayosDeLosPartes(
    partes.map((p) => ({
      id: p.id,
      obraId: p.obraId,
      fecha: p.fecha,
      cerrada: p.cerradoEn !== null,
      laboratorio: p.laboratorio,
    })),
  ).map((e) => ({ ...e, obraNombre: nombreDe.get(e.obraId) ?? '' }));
}
