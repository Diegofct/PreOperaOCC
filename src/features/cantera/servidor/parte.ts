/**
 * Los viajes de cantera dentro del parte diario (spec 010, RF-26 a RF-31, RF-37).
 * **Solo servidor.**
 *
 * ── Una sola consulta para fijar y para mostrar ──
 *
 * `viajesDelDiaEnSql` arma, en la base, la lista de viajes vigentes de una obra y un
 * día con la forma de `ViajeDelParte`. La usan dos:
 *
 *  · el **cierre** del parte, dentro de la misma sentencia que lo cierra, para
 *    fijarlos (RF-29). Por HTTP no hay transacción interactiva: si se leyeran en la
 *    ruta y se escribieran después, un viaje registrado entre medias quedaría fuera
 *    sin que nadie lo notara;
 *  · la **sección** de un parte abierto, para mostrar los vigentes.
 *
 * Siendo la misma consulta, lo que el residente ve antes de cerrar es exactamente lo
 * que queda fijado al cerrar.
 *
 * Guarda **nombres**, no ids: si después se corrige el nombre de un sitio, la
 * bitácora cerrada sigue diciendo lo que decía ese día.
 */
import { eq, sql, type SQL } from 'drizzle-orm';

import { baseServidor } from '@/db/servidor/cliente';
import { partesDeObra } from '@/db/servidor/esquema';
import type { ViajeDelParte } from '@/features/bitacoras/tipos';
import type { CanteraDelParteFila } from '@/features/panel/contratos';
import { alcanzaLaObra } from '@/features/servidor/alcance';
import type { PersonaEnSesion } from '@/features/servidor/guardia';
import { canteraDelParte } from '@/shared/rules/cantera';

/**
 * La lista de viajes vigentes de esa obra y ese día, como `jsonb` (`[]` si no hay).
 *
 * `obra` y `fecha` son expresiones SQL y no valores: en el cierre son las columnas
 * del propio parte que se está actualizando; en la sección, los valores leídos. Los
 * nombres de tabla van escritos y con alias cortos a propósito, para que dentro de
 * un `update partes_de_obra` no se confundan con las columnas del parte.
 *
 * En el orden en que se hicieron: por hora, y a igual hora, por registro.
 */
export function viajesDelDiaEnSql(obra: SQL, fecha: SQL): SQL<ViajeDelParte[]> {
  return sql<ViajeDelParte[]>`(
    select coalesce(
      jsonb_agg(
        jsonb_build_object(
          'id', v.id,
          'hora', v.hora,
          'material', m.nombre,
          'volqueta', ve.codigo_interno,
          'conductor', c.nombre_completo,
          'origen', o.nombre,
          'destino', d.nombre,
          'destinoObra', v.destino_obra,
          'pr', v.pr,
          'metros', v.metros
        )
        order by v.hora, v.creado_en
      ),
      '[]'::jsonb
    )
    from cantera_viajes v
    join cantera_materiales m on m.id = v.material_id
    join vehiculos ve on ve.id = v.vehiculo_id
    join usuarios c on c.id = v.conductor_id
    join cantera_sitios o on o.id = v.origen_id
    left join cantera_sitios d on d.id = v.destino_id
    where v.obra_id = ${obra}
      and v.fecha = ${fecha}
      and v.anulado_en is null
  )`;
}

/** Para la sentencia de cierre: los viajes de la obra y el día **del propio parte**. */
export function viajesParaFijarAlCerrar(): SQL<ViajeDelParte[]> {
  return viajesDelDiaEnSql(sql`${partesDeObra.obraId}`, sql`${partesDeObra.fecha}`);
}

/**
 * La sección «Control Cantera» de un parte, o `null` si no existe o no es de la
 * obra de quien pregunta (un parte ajeno responde igual que uno que no existe).
 *
 * Lo que se muestra —vigentes, fijados o el aviso— lo decide `canteraDelParte`.
 * Los vigentes solo se consultan si hacen falta: con el parte cerrado manda lo
 * fijado, aunque hoy haya otros viajes de ese día (RF-30).
 */
export async function canteraDeUnParte(
  sesion: PersonaEnSesion,
  parteId: string,
): Promise<CanteraDelParteFila | null> {
  const [parte] = await baseServidor()
    .select({
      obraId: partesDeObra.obraId,
      fecha: partesDeObra.fecha,
      cerradoEn: partesDeObra.cerradoEn,
      cantera: partesDeObra.cantera,
    })
    .from(partesDeObra)
    .where(eq(partesDeObra.id, parteId))
    .limit(1);

  if (!parte || !alcanzaLaObra(sesion, parte.obraId)) return null;

  const cerrado = parte.cerradoEn !== null;
  let vigentes: ViajeDelParte[] = [];
  if (!cerrado) {
    const [fila] = await baseServidor().execute<{ viajes: ViajeDelParte[] }>(
      sql`select ${viajesDelDiaEnSql(sql`${parte.obraId}`, sql`${parte.fecha}::date`)} as viajes`,
    ).then((resultado) => resultado.rows);
    vigentes = fila?.viajes ?? [];
  }

  return canteraDelParte({ cerrado, fijados: parte.cantera, vigentes });
}
