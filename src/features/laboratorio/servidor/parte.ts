/**
 * Los ensayos de granulometría dentro del parte diario (spec 018, RF-106 a RF-112).
 * **Solo servidor.**
 *
 * ── Una sola consulta para fijar y para mostrar ──
 *
 * Copia del patrón de Control Cantera (`cantera/servidor/parte.ts`), por la misma
 * razón: `granulometriasDelDiaEnSql` arma en la base la lista de ensayos vigentes de
 * una obra y un día, y la usan dos:
 *
 *  · el **cierre** del parte, dentro de la misma sentencia que lo cierra, para
 *    fijarlos (RF-111). Por HTTP no hay transacción: si se leyeran en la ruta y se
 *    escribieran después, un ensayo enviado entre medias quedaría fuera;
 *  · la **sección** de un parte abierto, para mostrarlos.
 *
 * Así, lo que el residente ve antes de cerrar es exactamente lo que queda fijado.
 *
 * ── Qué entra ──
 *
 * Los de esa obra con **fecha de ejecución** ese día, en cualquier estado salvo
 * descartados y anulados (RF-106): el residente ve lo que el laboratorio hizo aunque
 * falte aprobarlo. Con el módulo apagado en la obra, ninguno (RF-15).
 *
 * Guarda **nombres, no ids**: si después se corrige el catálogo de franjas, el parte
 * cerrado sigue diciendo lo que decía ese día.
 */
import { eq, sql, type SQL } from 'drizzle-orm';

import { baseServidor } from '@/db/servidor/cliente';
import { partesDeObra } from '@/db/servidor/esquema';
import type { GranulometriaDelParte } from '@/features/laboratorio/tipos';
import type { GranulometriaDelParteFila } from '@/features/panel/contratos';
import { alcanzaLaObra } from '@/features/servidor/alcance';
import type { PersonaEnSesion } from '@/features/servidor/guardia';
import { granulometriasDelParte } from '@/shared/rules/granulometria';

/**
 * Los ensayos vigentes de esa obra y ese día, como `jsonb` (`[]` si no hay).
 *
 * `obra` y `fecha` son expresiones SQL: en el cierre, las columnas del propio parte;
 * en la sección, los valores leídos. Tablas escritas con alias cortos para que dentro
 * de un `update partes_de_obra` no se confundan con las columnas del parte.
 */
export function granulometriasDelDiaEnSql(obra: SQL, fecha: SQL): SQL<GranulometriaDelParte[]> {
  return sql<GranulometriaDelParte[]>`(
    select coalesce(
      jsonb_agg(
        jsonb_build_object(
          'id', g.id,
          'numeroInforme', g.numero_informe,
          'material', g.material,
          'franja', g.franja->>'nombre',
          'veredicto', g.veredicto,
          'estado', g.estado
        )
        order by g.creado_en
      ),
      '[]'::jsonb
    )
    from ensayos_granulometria g
    where g.obra_id = ${obra}
      and g.fecha_ejecucion = ${fecha}
      and g.anulado_en is null
      and g.descartado_en is null
      -- Solo si la obra lleva laboratorio (RF-15), dentro de la misma consulta: en el
      -- cierre corre dentro del UPDATE, así que un parte de una obra sin el módulo se
      -- cierra con la lista vacía sin que nadie tenga que acordarse de comprobarlo.
      and exists (select 1 from obras ob where ob.id = g.obra_id and ob.laboratorio_activo)
  )`;
}

/** Para la sentencia de cierre: los ensayos de la obra y el día **del propio parte**. */
export function granulometriasParaFijarAlCerrar(): SQL<GranulometriaDelParte[]> {
  return granulometriasDelDiaEnSql(sql`${partesDeObra.obraId}`, sql`${partesDeObra.fecha}`);
}

/** Los vigentes de esa obra y ese día, leídos. Los usan la sección y el cierre. */
export async function granulometriasVigentes(
  obraId: string,
  fecha: string,
): Promise<GranulometriaDelParte[]> {
  const [fila] = await baseServidor()
    .execute<{ ensayos: GranulometriaDelParte[] }>(
      sql`select ${granulometriasDelDiaEnSql(sql`${obraId}`, sql`${fecha}::date`)} as ensayos`,
    )
    .then((resultado) => resultado.rows);
  return fila?.ensayos ?? [];
}

/**
 * La parte de Control Calidad de Obra que viene del módulo, o `null` si el parte no
 * existe o no es de la obra de quien pregunta (uno ajeno responde igual que uno que
 * no existe). Con el parte cerrado manda lo fijado (RF-112): los vigentes ni se
 * consultan.
 */
export async function granulometriasDeUnParte(
  sesion: PersonaEnSesion,
  parteId: string,
): Promise<GranulometriaDelParteFila | null> {
  const [parte] = await baseServidor()
    .select({
      obraId: partesDeObra.obraId,
      fecha: partesDeObra.fecha,
      cerradoEn: partesDeObra.cerradoEn,
      granulometrias: partesDeObra.granulometrias,
    })
    .from(partesDeObra)
    .where(eq(partesDeObra.id, parteId))
    .limit(1);

  if (!parte || !alcanzaLaObra(sesion, parte.obraId)) return null;

  const cerrado = parte.cerradoEn !== null;
  return granulometriasDelParte({
    cerrado,
    fijados: parte.granulometrias,
    vigentes: cerrado ? [] : await granulometriasVigentes(parte.obraId, parte.fecha),
  });
}
