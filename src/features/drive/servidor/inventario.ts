/**
 * Lo que hace el servidor con cada inventario de la carpeta del Drive (spec 052, RF-1, RF-4,
 * RF-6, RF-8, RF-10, RF-19 a RF-21, RF-34, RF-40).
 *
 * ── Qué decide y quién lo decide ──
 *
 * Qué pedir, qué retirar, qué volvió y qué se renombró lo decide `cambiosDelInventario`, la
 * regla pura (`shared/rules/drive.ts`). Este módulo solo lee lo registrado y escribe lo
 * decidido. Si una decisión aparece escrita aquí, está en el sitio equivocado.
 *
 * ── Sin transacciones, y con reintentos ──
 *
 * Neon por HTTP no da transacciones interactivas, y n8n reintenta si no le respondimos. Así
 * que cada paso es **una sola sentencia que se puede repetir sin duplicar nada**, y van en
 * orden de dependencia:
 *
 *  1. la carpeta, `on conflict` del nombre: si no existía, nace **sin obra** (RF-10);
 *  2. los archivos nuevos, `on conflict do nothing` sobre (`carpeta_id`, `drive_id`);
 *  3. los renombrados y movidos, los que vuelven y los retirados: `update` que llegan al
 *     mismo estado aunque se repitan;
 *  4. las versiones de más de 50 MB, sin copia y «demasiado grande», `on conflict do nothing`
 *     sobre (`archivo_id`, `modificado_en_drive`) (RF-40);
 *  5. la última entrega (RF-34), **al final**: una entrega que se cortó a la mitad no cuenta
 *     como recibida.
 *
 * Si el corte cae entre dos pasos, el reintento encuentra lo ya hecho y sigue: un archivo
 * creado sin versión vuelve a pedirse, porque `cambiosDelInventario` pide todo registrado
 * que no tenga ninguna.
 *
 * Una carpeta sin obra se trata igual: sus archivos se piden y se leen, y solo la gerencia
 * los ve hasta que la asocie (RF-10, RF-39). Eso lo decide quien lista, no quien recibe.
 *
 * Solo servidor.
 */
import { eq, sql, type SQL } from 'drizzle-orm';
import { uuidv7 } from 'uuidv7';

import { baseServidor } from '@/db/servidor/cliente';
import { driveArchivos, driveCarpetas, driveVersiones } from '@/db/servidor/esquema';
import type { inventarioDelDrive, RespuestaDelInventario } from '@/features/panel/contratos';
import { cambiosDelInventario, MOTIVO_DEMASIADO_GRANDE, type ArchivoRegistrado } from '@/shared/rules/drive';

import type { z } from 'zod';

/** Filas por sentencia: lejos del tope de parámetros de Postgres, y del tamaño de una petición. */
const FILAS_POR_SENTENCIA = 500;

function enLotes<T>(filas: readonly T[]): T[][] {
  const lotes: T[][] = [];
  for (let i = 0; i < filas.length; i += FILAS_POR_SENTENCIA) lotes.push(filas.slice(i, i + FILAS_POR_SENTENCIA));
  return lotes;
}

/** `(a, b, c), (d, e, f)` para un `from (values …)`. */
function valores(filas: readonly (readonly unknown[])[]): SQL {
  return sql.join(
    filas.map((fila) => sql`(${sql.join(fila.map((v) => sql`${v}`), sql`, `)})`),
    sql`, `,
  );
}

/** Lo registrado de la carpeta: cada archivo con la fecha de Drive más reciente de sus versiones. */
async function registradosDe(carpetaId: string): Promise<ArchivoRegistrado[]> {
  const filas = await baseServidor()
    .select({
      driveId: driveArchivos.driveId,
      nombre: driveArchivos.nombre,
      subcarpeta: driveArchivos.subcarpeta,
      retiradoEn: driveArchivos.retiradoEn,
      ultima: sql<string | null>`max(${driveVersiones.modificadoEnDrive})`,
    })
    .from(driveArchivos)
    .leftJoin(driveVersiones, eq(driveVersiones.archivoId, driveArchivos.id))
    .where(eq(driveArchivos.carpetaId, carpetaId))
    .groupBy(driveArchivos.id);
  return filas.map((f) => ({
    driveId: f.driveId,
    nombre: f.nombre,
    subcarpeta: f.subcarpeta,
    retirado: f.retiradoEn !== null,
    // El agregado llega como texto de Postgres («2026-11-20 10:00:00+00»): se pasa a ISO.
    ultimaModificacion: f.ultima === null ? null : new Date(f.ultima).toISOString(),
  }));
}

export async function recibirInventario(
  inventario: z.output<typeof inventarioDelDrive>,
): Promise<RespuestaDelInventario> {
  const db = baseServidor();
  const { carpeta } = inventario;

  // 1. La carpeta. Sin escribir si el nombre no cambió: `actualizado_en` dice cuándo cambió.
  await db
    .insert(driveCarpetas)
    .values({ id: carpeta.id, nombre: carpeta.nombre })
    .onConflictDoUpdate({
      target: driveCarpetas.id,
      set: { nombre: carpeta.nombre },
      where: sql`${driveCarpetas.nombre} is distinct from excluded.nombre`,
    });

  const cambios = cambiosDelInventario(await registradosDe(carpeta.id), inventario);

  // 2. Los nuevos.
  for (const lote of enLotes(cambios.nuevos)) {
    await db
      .insert(driveArchivos)
      .values(
        lote.map((a) => ({
          id: uuidv7(),
          carpetaId: carpeta.id,
          driveId: a.driveId,
          enlace: a.enlace,
          nombre: a.nombre,
          subcarpeta: a.ruta,
          mime: a.mime,
        })),
      )
      .onConflictDoNothing({ target: [driveArchivos.carpetaId, driveArchivos.driveId] });
  }

  // 3. Renombrados y movidos (RF-21), los que vuelven (RF-20) y los retirados (RF-19).
  for (const lote of enLotes(cambios.renombrados)) {
    await db.execute(sql`
      update drive_archivos as a
      set nombre = v.nombre, subcarpeta = v.subcarpeta
      from (values ${valores(lote.map((r) => [r.driveId, r.nombre, r.subcarpeta]))}) as v(drive_id, nombre, subcarpeta)
      where a.carpeta_id = ${carpeta.id} and a.drive_id = v.drive_id
    `);
  }
  for (const lote of enLotes(cambios.vuelven)) {
    await db.execute(sql`
      update drive_archivos set retirado_en = null
      where carpeta_id = ${carpeta.id} and retirado_en is not null
        and drive_id in (${sql.join(lote.map((id) => sql`${id}`), sql`, `)})
    `);
  }
  for (const lote of enLotes(cambios.retirar)) {
    await db.execute(sql`
      update drive_archivos set retirado_en = now()
      where carpeta_id = ${carpeta.id} and retirado_en is null
        and drive_id in (${sql.join(lote.map((id) => sql`${id}`), sql`, `)})
    `);
  }
  if (cambios.retirosRetenidos > 0) {
    // Riesgo 1 del plan: un listado a medias de Google. Se deja escrito para quien revise.
    console.warn(
      `[drive] La carpeta ${carpeta.id} no retiró ${cambios.retirosRetenidos} archivo(s): ` +
        (inventario.completo ? 'faltaban más de la mitad de una vez.' : 'el inventario no vino completo.'),
    );
  }

  // 4. Lo de más de 50 MB: la versión, sin copia y «demasiado grande» (RF-40, D12).
  const tamanoDe = new Map(inventario.archivos.map((a) => [a.driveId, a.tamano]));
  for (const lote of enLotes(cambios.demasiadoGrandes)) {
    await db.execute(sql`
      insert into drive_versiones (id, archivo_id, modificado_en_drive, bytes, estado, motivo)
      select v.id, a.id, v.modificado::timestamptz, v.bytes::bigint, 'no_se_pudo', ${MOTIVO_DEMASIADO_GRANDE}
      from (values ${valores(lote.map((g) => [uuidv7(), g.driveId, g.modificadoEn, tamanoDe.get(g.driveId) ?? null]))})
        as v(id, drive_id, modificado, bytes)
      join drive_archivos a on a.carpeta_id = ${carpeta.id} and a.drive_id = v.drive_id
      on conflict (archivo_id, modificado_en_drive) do nothing
    `);
  }

  // 5. La entrega, al final (RF-34).
  await db
    .update(driveCarpetas)
    .set({ ultimaEntregaEn: sql`now()`, archivosEnLaUltimaEntrega: inventario.archivos.length })
    .where(eq(driveCarpetas.id, carpeta.id));

  return {
    pedir: cambios.pedir,
    nuevos: cambios.nuevos.length,
    renombrados: cambios.renombrados.length,
    retirados: cambios.retirar.length,
    vuelven: cambios.vuelven.length,
    demasiadoGrandes: cambios.demasiadoGrandes.length,
    ...(cambios.retirosRetenidos > 0 ? { sinRetirar: cambios.retirosRetenidos } : {}),
  };
}
