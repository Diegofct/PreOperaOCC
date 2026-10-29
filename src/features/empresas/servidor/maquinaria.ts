/**
 * La Bitácora de maquinaria de OCC (spec 033, RF-22): la sección Maquinaria de las
 * bitácoras de todas las obras en un rango de días, una fila por máquina y día.
 *
 * Se lee de las bitácoras y no se guarda aparte: la máquina, sus lecturas y su operador
 * ya están en cada bitácora, congelados al cerrarla. Las anuladas no salen: lo anulado no
 * es lo que pasó.
 */

import { and, asc, eq, isNull, sql } from 'drizzle-orm';

import { baseServidor } from '@/db/servidor/cliente';
import { obras, partesDeObra } from '@/db/servidor/esquema';
import type { MaquinaDeLasObrasFila } from '@/features/panel/contratos';
import { filtroDeObraEstricto, veTodasLasObras } from '@/features/servidor/alcance';
import type { PersonaEnSesion } from '@/features/servidor/guardia';
import { avanceDeMedidor } from '@/shared/rules/jornada';

export async function maquinariaDeLasObras(
  sesion: PersonaEnSesion,
  filtro: { obraId: string | null; desde: string; hasta: string },
): Promise<MaquinaDeLasObrasFila[]> {
  const partes = await baseServidor()
    .select({
      id: partesDeObra.id,
      fecha: partesDeObra.fecha,
      obraId: partesDeObra.obraId,
      obraNombre: obras.nombre,
      cerradoEn: partesDeObra.cerradoEn,
      maquinaria: partesDeObra.maquinaria,
    })
    .from(partesDeObra)
    .innerJoin(obras, eq(obras.id, partesDeObra.obraId))
    .where(
      and(
        // Quien no es gerencia ve su obra y nada más, pida lo que pida.
        filtroDeObraEstricto(sesion, sql`${partesDeObra.obraId}`),
        veTodasLasObras(sesion) && filtro.obraId ? eq(partesDeObra.obraId, filtro.obraId) : undefined,
        isNull(partesDeObra.anuladoEn),
        sql`${partesDeObra.fecha} between ${filtro.desde} and ${filtro.hasta}`,
      ),
    )
    // Lo más reciente arriba; en un mismo día, por obra.
    .orderBy(sql`${partesDeObra.fecha} desc`, asc(obras.nombre));

  return partes.flatMap((parte) =>
    [...parte.maquinaria]
      .sort((a, b) => a.codigo.localeCompare(b.codigo, 'es'))
      .map((m) => ({
        parteId: parte.id,
        id: m.id,
        fecha: parte.fecha,
        obraId: parte.obraId,
        obraNombre: parte.obraNombre,
        cerrada: parte.cerradoEn !== null,
        vehiculoId: m.vehiculoId,
        equipo: m.codigo,
        claseMedidor: m.claseMedidor,
        medidorInicial: m.medidorInicial,
        medidorFinal: m.medidorFinal,
        avance: avanceDeMedidor(m.medidorInicial, m.medidorFinal),
        // Ausente en las de antes del 2026-10-05 (spec 021, RF-77).
        operador: m.operadorNombre ?? null,
        observaciones: m.observaciones ?? '',
      })),
  );
}
