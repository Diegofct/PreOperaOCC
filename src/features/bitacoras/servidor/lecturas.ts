import { and, eq, isNull, or, sql } from 'drizzle-orm';

import { baseServidor } from '@/db/servidor/cliente';
import { partesDeObra, tiposVehiculo, vehiculos } from '@/db/servidor/esquema';
import {
  fechaDeJornada,
  lecturaAnterior,
  medidorDeClase,
  type FinalCambiada,
  type LecturaAnterior,
} from '@/shared/rules/jornada';

/**
 * La lectura con la que empieza el día `fecha` cada máquina de la obra (spec 029,
 * RF-1 a RF-3, RF-7, RF-9), por id de vehículo. Quien no tiene ninguna no sale.
 *
 * Dos consultas:
 *
 *  · la última lectura **final** de cada máquina en las bitácoras no anuladas **de
 *    cualquier obra** con fecha anterior (spec 039, RF-19: una máquina que cambia de obra
 *    empieza donde terminó en la otra). Se lee del jsonb de la sección, y solo cuenta un
 *    número: una máquina guardada «sin lectura final» se salta y vale la del día
 *    anterior que sí la tenga;
 *  · la lectura registrada de los vehículos de la obra (o sin obra), con el día del
 *    que es, para las máquinas que no están en ninguna bitácora anterior (RF-2).
 *
 * Cuál vale lo decide la regla pura `lecturaAnterior`.
 */
export async function lecturasAnteriores(
  obraId: string,
  fecha: string,
): Promise<Record<string, LecturaAnterior>> {
  const db = baseServidor();
  // Primero los equipos de la obra: la obra decide qué máquinas se ofrecen, y la
  // búsqueda en las bitácoras se limita a ellas.
  const equipos = await db
    .select({
      id: vehiculos.id,
      clase: tiposVehiculo.claseMedidor,
      odometroKm: vehiculos.odometroKm,
      horometroH: vehiculos.horometroH,
      medidorDia: vehiculos.medidorDia,
      medidorActualizadoEn: vehiculos.medidorActualizadoEn,
    })
    .from(vehiculos)
    .innerJoin(tiposVehiculo, eq(tiposVehiculo.id, vehiculos.tipoVehiculoId))
    .where(and(isNull(vehiculos.eliminadoEn), or(eq(vehiculos.obraId, obraId), isNull(vehiculos.obraId))));
  if (equipos.length === 0) return {};

  const deBitacoras = await db.execute(sql`
    select distinct on (m->>'vehiculoId')
      m->>'vehiculoId' as vehiculo_id,
      (m->>'medidorFinal')::float8 as valor,
      p.fecha::text as fecha
    from ${partesDeObra} p, jsonb_array_elements(p.maquinaria) m
    where p.fecha < ${fecha}
      and p.anulado_en is null
      and jsonb_typeof(m->'medidorFinal') = 'number'
      and m->>'vehiculoId' in (${sql.join(
        equipos.map((e) => sql`${e.id}`),
        sql`, `,
      )})
    order by m->>'vehiculoId', p.fecha desc`);

  const porBitacora = new Map(
    (deBitacoras.rows as { vehiculo_id: string; valor: number; fecha: string }[]).map((f) => [
      f.vehiculo_id,
      { valor: Number(f.valor), fecha: f.fecha },
    ]),
  );

  const resultado: Record<string, LecturaAnterior> = {};
  for (const equipo of equipos) {
    const id = equipo.id;
    const clase = medidorDeClase(equipo.clase);
    const anterior = lecturaAnterior(
      porBitacora.get(id) ?? null,
      {
        valor: (clase === 'odometro' ? equipo.odometroKm : equipo.horometroH) ?? null,
        // El día del reporte de la lectura (026/RF-42); lo de antes no lo tiene y se
        // toma el día en que se actualizó, como en WhatsApp.
        fecha:
          equipo.medidorDia ??
          (equipo.medidorActualizadoEn ? fechaDeJornada(equipo.medidorActualizadoEn.getTime()) : null),
      },
      fecha,
    );
    if (anterior) resultado[id] = anterior;
  }
  return resultado;
}

/**
 * Lleva la final corregida de cada máquina a la inicial de su siguiente bitácora (spec
 * 039, RF-21): la del día posterior más cercano, en cualquier obra, que tenga esa
 * máquina. Solo si esa bitácora sigue abierta y su inicial está vacía o es la final
 * de antes (D3: una inicial escrita a mano se respeta). Una cerrada no se toca, y
 * tampoco se salta a la siguiente: el día cerrado ya usó esa final.
 *
 * Una sentencia por máquina, cada una atómica (Neon por HTTP no da transacciones
 * interactivas): la condición se evalúa sobre la fila al escribirla, así que no pisa
 * lo que otro guardó entre medias. El disparador mueve `actualizado_en`, y un guardado
 * de WhatsApp sobre esa bitácora lo nota y reintenta.
 */
export async function propagarFinales(
  parteId: string,
  fecha: string,
  cambios: readonly FinalCambiada[],
): Promise<number> {
  const db = baseServidor();
  let cambiadas = 0;
  for (const c of cambios) {
    const resultado = await db.execute(sql`
      with siguiente as (
        select q.id, q.cerrado_en
        from ${partesDeObra} q
        where q.anulado_en is null
          and q.fecha > ${fecha}
          and q.id <> ${parteId}
          and exists (select 1 from jsonb_array_elements(q.maquinaria) x where x->>'vehiculoId' = ${c.vehiculoId})
        order by q.fecha asc, q.id asc
        limit 1
      )
      update ${partesDeObra} p
      set maquinaria = (
        select jsonb_agg(
          case
            when e.m->>'vehiculoId' = ${c.vehiculoId}
              and (
                jsonb_typeof(e.m->'medidorInicial') is distinct from 'number'
                or (e.m->>'medidorInicial')::float8 = ${c.finalViejo}::float8
              )
            then jsonb_set(e.m, '{medidorInicial}', to_jsonb(${c.finalNuevo}::float8))
            else e.m
          end
          order by e.orden)
        from jsonb_array_elements(p.maquinaria) with ordinality as e(m, orden)
      )
      from siguiente s
      where p.id = s.id
        and s.cerrado_en is null
        and p.cerrado_en is null
        and exists (
          select 1 from jsonb_array_elements(p.maquinaria) y
          where y->>'vehiculoId' = ${c.vehiculoId}
            and (
              jsonb_typeof(y->'medidorInicial') is distinct from 'number'
              or (y->>'medidorInicial')::float8 = ${c.finalViejo}::float8
            )
            and (jsonb_typeof(y->'medidorInicial') is distinct from 'number'
              or (y->>'medidorInicial')::float8 <> ${c.finalNuevo}::float8)
        )
      returning p.id`);
    cambiadas += resultado.rows.length;
  }
  return cambiadas;
}
