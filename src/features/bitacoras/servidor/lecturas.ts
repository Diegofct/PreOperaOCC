import { and, eq, isNull, or, sql } from 'drizzle-orm';

import { baseServidor } from '@/db/servidor/cliente';
import { partesDeObra, tiposVehiculo, vehiculos } from '@/db/servidor/esquema';
import {
  fechaDeJornada,
  lecturaAnterior,
  medidorDeClase,
  type LecturaAnterior,
} from '@/shared/rules/jornada';

/**
 * La lectura con la que empieza el día `fecha` cada máquina de la obra (spec 029,
 * RF-1 a RF-3, RF-7, RF-9), por id de vehículo. Quien no tiene ninguna no sale.
 *
 * Dos consultas:
 *
 *  · la última lectura **final** de cada máquina en las bitácoras no anuladas de la
 *    obra con fecha anterior. Se lee del jsonb de la sección, y solo cuenta un número:
 *    una máquina guardada «sin lectura final» se salta y vale la del día anterior que
 *    sí la tenga;
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
  const [deBitacoras, equipos] = await Promise.all([
    db.execute(sql`
      select distinct on (m->>'vehiculoId')
        m->>'vehiculoId' as vehiculo_id,
        (m->>'medidorFinal')::float8 as valor,
        p.fecha::text as fecha
      from ${partesDeObra} p, jsonb_array_elements(p.maquinaria) m
      where p.obra_id = ${obraId}
        and p.fecha < ${fecha}
        and p.anulado_en is null
        and jsonb_typeof(m->'medidorFinal') = 'number'
      order by m->>'vehiculoId', p.fecha desc`),
    db
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
      .where(and(isNull(vehiculos.eliminadoEn), or(eq(vehiculos.obraId, obraId), isNull(vehiculos.obraId)))),
  ]);

  const porBitacora = new Map(
    (deBitacoras.rows as { vehiculo_id: string; valor: number; fecha: string }[]).map((f) => [
      f.vehiculo_id,
      { valor: Number(f.valor), fecha: f.fecha },
    ]),
  );

  const resultado: Record<string, LecturaAnterior> = {};
  const ids = new Set([...porBitacora.keys(), ...equipos.map((e) => e.id)]);
  for (const id of ids) {
    const equipo = equipos.find((e) => e.id === id);
    const clase = medidorDeClase(equipo?.clase);
    const anterior = lecturaAnterior(
      porBitacora.get(id) ?? null,
      {
        valor: (clase === 'odometro' ? equipo?.odometroKm : equipo?.horometroH) ?? null,
        // El día del reporte de la lectura (026/RF-42); lo de antes no lo tiene y se
        // toma el día en que se actualizó, como en WhatsApp.
        fecha:
          equipo?.medidorDia ??
          (equipo?.medidorActualizadoEn ? fechaDeJornada(equipo.medidorActualizadoEn.getTime()) : null),
      },
      fecha,
    );
    if (anterior) resultado[id] = anterior;
  }
  return resultado;
}
