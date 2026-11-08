/**
 * El acceso y las obras de una persona a lo largo del tiempo (spec 041). **Solo servidor.**
 *
 * Qué acceso tenía una persona en una fecha (RF-42, RF-52), y las sentencias que escriben esa
 * historia —la de accesos y la de obras de un Director de Obra (RF-31)— cuando las rutas de
 * personas la cambian. Las rutas no arman esas sentencias a mano: cerrar la fila vigente y abrir
 * otra es fácil de hacer al revés, y el índice parcial de «una vigente» lo rechaza.
 *
 *
 * Las historias del panel guardan **quién** aprobó o anuló, no con qué acceso, y el acceso de
 * hoy no sirve para eso: a quien aprobó un ensayo como «Residente / Director» en octubre no se
 * le puede rotular «Residente» solo porque hoy lo sea. La respuesta sale de `usuarios_accesos`,
 * que guarda cada acceso con su `desde` y su `hasta`.
 *
 * Solo servidor: la importan los `+api.ts` que arman una historia.
 */
import { and, eq, inArray, isNull, sql } from 'drizzle-orm';
import { uuidv7 } from 'uuidv7';

import { baseServidor } from '@/db/servidor/cliente';
import { obras, usuarios, usuariosAccesos, usuariosObras } from '@/db/servidor/esquema';
import { etiquetaDelAccesoEn, firmaConAcceso, type TramoDeAcceso } from '@/shared/rules/cargos-de-obra';
import type { EmpresaId } from '@/shared/rules/empresas';
import type { Rol } from '@/shared/rules/permisos';

type Base = ReturnType<typeof baseServidor>;
/** Una sentencia que puede ir en un `batch`, que Neon ejecuta como una transacción. */
export type Sentencia = Parameters<Base['batch']>[0][number];

/**
 * Lo que dice una historia sobre quién hizo algo: «nombre (acceso de esa fecha)» (RF-42, RF-52).
 *
 * Se piden de una vez todas las personas de un listado y se responde en memoria con la regla
 * pura. Preguntar a la base fila por fila serían cientos de idas por pantalla, y una subconsulta
 * dentro de cada `select` depende de cómo drizzle escriba los nombres de columna (ver la nota de
 * `personaConObras`).
 *
 * El nombre sale aunque la persona esté de baja: un registro antiguo sigue diciendo quién fue.
 */
export async function firmasConAcceso(
  usuarioIds: readonly (string | null)[],
): Promise<(usuarioId: string | null, fecha: Date | null) => string | null> {
  const ids = [...new Set(usuarioIds.filter((id): id is string => id !== null))];
  if (ids.length === 0) return () => null;

  const db = baseServidor();
  const [personas, filas] = await Promise.all([
    db.select({ id: usuarios.id, nombre: usuarios.nombreCompleto }).from(usuarios).where(inArray(usuarios.id, ids)),
    db
      .select({
        usuarioId: usuariosAccesos.usuarioId,
        rol: usuariosAccesos.rol,
        desde: usuariosAccesos.desde,
        hasta: usuariosAccesos.hasta,
      })
      .from(usuariosAccesos)
      .where(inArray(usuariosAccesos.usuarioId, ids)),
  ]);

  const nombres = new Map(personas.map((p) => [p.id, p.nombre]));
  const tramos = new Map<string, TramoDeAcceso[]>();
  for (const { usuarioId, ...tramo } of filas) {
    tramos.set(usuarioId, [...(tramos.get(usuarioId) ?? []), tramo]);
  }

  return (usuarioId, fecha) => {
    const nombre = usuarioId ? nombres.get(usuarioId) : undefined;
    if (!usuarioId || !nombre) return null;
    return firmaConAcceso(nombre, fecha ? etiquetaDelAccesoEn(tramos.get(usuarioId) ?? [], fecha) : null);
  };
}

/** Una persona con lo que deciden sus obras y su acceso. */
export interface PersonaConObras {
  id: string;
  rol: Rol;
  cargo: string | null;
  obraId: string | null;
  empresa: EmpresaId | null;
  /** Las vigentes en `usuarios_obras`: solo las tiene el Director de Obra. */
  asignadas: string[];
  /** Sus obras como las ve el sistema: las asignadas si es Director de Obra; si no, la suya. */
  obras: string[];
}

/**
 * La persona con sus obras, o `null` si no existe o está de baja. Una sola consulta: las
 * asignadas vienen en un `json_agg`, como en la sesión.
 *
 * La subconsulta lleva los nombres escritos con su tabla a propósito. En un `select` de una
 * sola tabla, drizzle escribe las columnas sin ella, y `${usuarios.id}` dentro de la subconsulta
 * salía como `"id"`: Postgres lo resolvía al `id` de `usuarios_obras` y la lista quedaba vacía,
 * sin ningún error (visto en el e2e de la T10).
 */
export async function personaConObras(id: string): Promise<PersonaConObras | null> {
  const [fila] = await baseServidor()
    .select({
      id: usuarios.id,
      rol: usuarios.rol,
      cargo: usuarios.cargo,
      obraId: usuarios.obraId,
      empresa: usuarios.empresa,
      asignadas: sql<string[]>`coalesce((
        select json_agg(uo.obra_id order by uo.desde)
        from usuarios_obras uo
        where uo.usuario_id = "usuarios"."id" and uo.hasta is null
      ), '[]'::json)`,
    })
    .from(usuarios)
    .where(and(eq(usuarios.id, id), isNull(usuarios.eliminadoEn)))
    .limit(1);
  if (!fila) return null;
  const obrasSuyas = fila.rol === 'director_obra' ? fila.asignadas : fila.obraId ? [fila.obraId] : [];
  return { ...fila, obras: obrasSuyas };
}

/** Las obras de la lista que no existen o están de baja. Vacío es que todas valen. */
export async function obrasQueNoExisten(ids: readonly string[]): Promise<string[]> {
  if (ids.length === 0) return [];
  const halladas = await baseServidor()
    .select({ id: obras.id })
    .from(obras)
    .where(and(inArray(obras.id, [...ids]), isNull(obras.eliminadoEn)));
  const existen = new Set(halladas.map((o) => o.id));
  return ids.filter((id) => !existen.has(id));
}

/**
 * Asignar y retirar obras a un Director de Obra (RF-13, RF-31): retirar cierra la fila vigente
 * con `hasta` y quién la retiró; asignar abre otra con quién la asignó. Nada se borra: la historia
 * dice desde cuándo y hasta cuándo dirigió cada obra.
 *
 * Asignar una que ya tiene no hace nada (`on conflict do nothing` sobre el índice parcial de la
 * vigente). Las dos listas no comparten obras: el contrato lo exige, y así el orden entre las dos
 * sentencias no importa.
 */
export function sentenciasDeObras(
  db: Base,
  usuarioId: string,
  cambio: { asignar: readonly string[]; retirar: readonly string[] },
  quien: string,
  ahora: Date,
): Sentencia[] {
  const sentencias: Sentencia[] = [];
  if (cambio.retirar.length > 0) {
    sentencias.push(
      db
        .update(usuariosObras)
        .set({ hasta: ahora, retiradoPor: quien })
        .where(
          and(
            eq(usuariosObras.usuarioId, usuarioId),
            isNull(usuariosObras.hasta),
            inArray(usuariosObras.obraId, [...cambio.retirar]),
          ),
        ),
    );
  }
  if (cambio.asignar.length > 0) {
    sentencias.push(
      db
        .insert(usuariosObras)
        .values(cambio.asignar.map((obraId) => ({ id: uuidv7(), usuarioId, obraId, desde: ahora, asignadoPor: quien })))
        .onConflictDoNothing(),
    );
  }
  return sentencias;
}

/**
 * Deja escrito el acceso de una persona como quedó (RF-42): si la fila vigente dice otro rol u
 * otro cargo, se cierra y se abre una nueva. Si dice lo mismo, no se toca —editarle el nombre a
 * alguien no es un cambio de acceso, y la marca `revisar` (RF-51) se conserva—.
 *
 * Son dos sentencias y van en el mismo `batch`, en este orden: primero se cierra, después se
 * abre «si no queda ninguna vigente». Así también le abre su primera fila a quien no tenía
 * (las altas, y las personas que creó otro camino sin pasar por aquí).
 */
export function sentenciasDeAcceso(
  db: Base,
  usuarioId: string,
  acceso: { rol: Rol; cargo: string | null },
  quien: string,
  ahora: Date,
): Sentencia[] {
  return [
    db
      .update(usuariosAccesos)
      .set({ hasta: ahora })
      .where(
        and(
          eq(usuariosAccesos.usuarioId, usuarioId),
          isNull(usuariosAccesos.hasta),
          sql`(${usuariosAccesos.rol} <> ${acceso.rol} or ${usuariosAccesos.cargo} is distinct from ${acceso.cargo})`,
        ),
      ),
    db.execute(sql`
      insert into ${usuariosAccesos} (id, usuario_id, rol, cargo, desde, cambiado_por, revisar)
      select ${uuidv7()}, ${usuarioId}, ${acceso.rol}, ${acceso.cargo}, ${ahora.toISOString()}::timestamptz, ${quien}, false
      where not exists (
        select 1 from ${usuariosAccesos} where usuario_id = ${usuarioId} and hasta is null
      )
    `),
  ];
}

/** Apaga la marca de revisar de la fila vigente (RF-51). */
export function sentenciaDeRevisado(db: Base, usuarioId: string): Sentencia {
  return db
    .update(usuariosAccesos)
    .set({ revisar: false })
    .where(and(eq(usuariosAccesos.usuarioId, usuarioId), isNull(usuariosAccesos.hasta)));
}

/** Ejecuta un lote armado por partes. Un `batch` de drizzle pide al menos una sentencia. */
export async function ejecutarLote(db: Base, sentencias: Sentencia[]): Promise<void> {
  if (sentencias.length === 0) return;
  await db.batch(sentencias as [Sentencia, ...Sentencia[]]);
}
