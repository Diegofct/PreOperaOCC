/**
 * El Drive de la obra en el panel (spec 052, RF-8 a RF-10, RF-29 a RF-35).
 *
 * ── Quién ve qué ──
 *
 * Las rutas abren con `requerirPermiso(…, 'drive', …)` y piden la obra con `obraDelContrato`:
 * la gerencia y el director de proyectos, la que piden; el director de obra y el residente,
 * una de las suyas, y una ajena es un 404 (RF-36, RF-37). Aquí llega una obra ya autorizada.
 * Las carpetas sin obra son solo de la gerencia (RF-10), porque es quien las asocia (RF-9).
 *
 * ── La lista ──
 *
 * Se leen los archivos de la carpeta con todas sus versiones y la regla arma la lista
 * (`documentosParaLaLista`): el estado, la búsqueda y el orden están escritos una sola vez.
 * Buscar en el contenido es de Postgres: el índice de texto, sobre el texto normalizado, con
 * todas las palabras (para filtrar una lista, cada palabra que se escribe la estrecha), y
 * solo en la versión vigente.
 *
 * Solo servidor.
 */
import { and, asc, eq, isNull, sql } from 'drizzle-orm';

import { baseServidor } from '@/db/servidor/cliente';
import { driveArchivos, driveCarpetas, driveVersiones, obras } from '@/db/servidor/esquema';
import type { CarpetaDelDriveFila, ListaDelDrive } from '@/features/panel/contratos';
import type { PersonaEnSesion } from '@/features/servidor/guardia';
import { errorDePeticion, indiceUnicoViolado, noEncontrado } from '@/features/servidor/respuestas';
import { documentosParaLaLista, motivoParaNoReleer, terminosDeBusqueda } from '@/shared/rules/drive';

const aTexto = (fecha: Date | null) => (fecha ? fecha.toISOString() : null);

function filaDeCarpeta(c: {
  id: string;
  nombre: string;
  obraId: string | null;
  obraNombre: string | null;
  ultimaEntregaEn: Date | null;
  archivosEnLaUltimaEntrega: number | null;
}): CarpetaDelDriveFila {
  return { ...c, ultimaEntregaEn: aTexto(c.ultimaEntregaEn) };
}

const columnasDeCarpeta = {
  id: driveCarpetas.id,
  nombre: driveCarpetas.nombre,
  obraId: driveCarpetas.obraId,
  obraNombre: obras.nombre,
  ultimaEntregaEn: driveCarpetas.ultimaEntregaEn,
  archivosEnLaUltimaEntrega: driveCarpetas.archivosEnLaUltimaEntrega,
};

/** Los archivos de la carpeta cuyo texto vigente tiene todas las palabras de `buscar`. */
async function conContenido(carpetaId: string, buscar: string): Promise<Set<string>> {
  const terminos = terminosDeBusqueda(buscar);
  if (terminos.length === 0) return new Set();
  const resultado = await baseServidor().execute<{ archivo_id: string }>(sql`
    select distinct a.id as archivo_id
    from drive_fragmentos f
    join drive_versiones v on v.id = f.version_id
    join drive_archivos a on a.id = v.archivo_id
    where a.carpeta_id = ${carpetaId}
      and v.modificado_en_drive = (select max(v2.modificado_en_drive) from drive_versiones v2 where v2.archivo_id = a.id)
      and f.buscable @@ to_tsquery('spanish', ${terminos.join(' & ')})
  `);
  return new Set(resultado.rows.map((f) => f.archivo_id));
}

/** La lista de una carpeta: de una obra ya autorizada, o una sin obra para la gerencia. */
async function listaDe(carpeta: CarpetaDelDriveFila, buscar: string): Promise<ListaDelDrive> {
  const db = baseServidor();
  const filas = await db
    .select({
      archivoId: driveArchivos.id,
      nombre: driveArchivos.nombre,
      subcarpeta: driveArchivos.subcarpeta,
      mime: driveArchivos.mime,
      enlace: driveArchivos.enlace,
      retiradoEn: driveArchivos.retiradoEn,
      versionId: driveVersiones.id,
      modificadoEnDrive: driveVersiones.modificadoEnDrive,
      estado: driveVersiones.estado,
      motivo: driveVersiones.motivo,
      resumen: driveVersiones.resumen,
      mediaId: driveVersiones.mediaId,
      bytes: driveVersiones.bytes,
    })
    .from(driveArchivos)
    .innerJoin(driveVersiones, eq(driveVersiones.archivoId, driveArchivos.id))
    .where(eq(driveArchivos.carpetaId, carpeta.id));

  const porArchivo = new Map<
    string,
    {
      id: string;
      nombre: string;
      subcarpeta: string;
      mime: string;
      enlace: string | null;
      retirado: boolean;
      versiones: ListaDelDrive['documentos'][number]['versiones'];
    }
  >();
  for (const f of filas) {
    const archivo = porArchivo.get(f.archivoId) ?? {
      id: f.archivoId,
      nombre: f.nombre,
      subcarpeta: f.subcarpeta,
      mime: f.mime,
      enlace: f.enlace,
      retirado: f.retiradoEn !== null,
      versiones: [],
    };
    archivo.versiones.push({
      id: f.versionId,
      modificadoEnDrive: f.modificadoEnDrive.toISOString(),
      estado: f.estado,
      motivo: f.motivo,
      resumen: f.resumen,
      mediaId: f.mediaId,
      bytes: f.bytes,
      vigente: false,
    });
    porArchivo.set(f.archivoId, archivo);
  }

  const archivos = [...porArchivo.values()];
  const delArchivo = new Map(archivos.map((a) => [a.id, a]));
  const documentos = documentosParaLaLista(archivos, buscar, buscar.trim() ? await conContenido(carpeta.id, buscar) : new Set());
  return {
    carpeta,
    documentos: documentos.map((d) => ({ ...d, mime: delArchivo.get(d.id)?.mime ?? '', enlace: delArchivo.get(d.id)?.enlace ?? null })),
  };
}

/** RF-29: la lista del Drive de una obra ya autorizada. Sin carpeta conectada, `carpeta: null`. */
export async function documentosDeLaObra(obraId: string, buscar: string): Promise<ListaDelDrive> {
  const [carpeta] = await baseServidor()
    .select(columnasDeCarpeta)
    .from(driveCarpetas)
    .leftJoin(obras, eq(obras.id, driveCarpetas.obraId))
    .where(eq(driveCarpetas.obraId, obraId))
    .limit(1);
  return carpeta ? listaDe(filaDeCarpeta(carpeta), buscar) : { carpeta: null, documentos: [] };
}

/** RF-10: la lista de una carpeta **sin obra**, solo para la gerencia (la ruta lo exige). */
export async function documentosDeLaCarpetaSinObra(carpetaId: string, buscar: string): Promise<ListaDelDrive | Response> {
  const [carpeta] = await baseServidor()
    .select(columnasDeCarpeta)
    .from(driveCarpetas)
    .leftJoin(obras, eq(obras.id, driveCarpetas.obraId))
    .where(and(eq(driveCarpetas.id, carpetaId), isNull(driveCarpetas.obraId)))
    .limit(1);
  return carpeta ? listaDe(filaDeCarpeta(carpeta), buscar) : noEncontrado('esa carpeta');
}

/** RF-8 a RF-10: todas las carpetas, las que no tienen obra primero, para la gerencia. */
export async function carpetasDelDrive(): Promise<CarpetaDelDriveFila[]> {
  const carpetas = await baseServidor()
    .select(columnasDeCarpeta)
    .from(driveCarpetas)
    .leftJoin(obras, eq(obras.id, driveCarpetas.obraId))
    .orderBy(sql`${driveCarpetas.obraId} is not null`, asc(driveCarpetas.nombre));
  return carpetas.map(filaDeCarpeta);
}

/**
 * RF-8, RF-9: asocia una carpeta a una obra, o la cambia. Una obra tiene una sola carpeta:
 * si ya tiene otra, 409, y lo hace cumplir el índice único aunque dos asociaciones lleguen a
 * la vez. Quitarle la obra no se ofrece: su Drive dejaría de verse donde ya se veía.
 */
export async function asociarCarpeta(
  sesion: PersonaEnSesion,
  carpetaId: string,
  obraId: string,
): Promise<CarpetaDelDriveFila | Response> {
  const db = baseServidor();
  const [obra] = await db.select({ id: obras.id }).from(obras).where(eq(obras.id, obraId)).limit(1);
  if (!obra) return noEncontrado('esa obra');
  try {
    const cambiadas = await db
      .update(driveCarpetas)
      .set({ obraId, asociadoPor: sesion.id, asociadoEn: sql`now()` })
      .where(eq(driveCarpetas.id, carpetaId))
      .returning({ id: driveCarpetas.id });
    if (cambiadas.length === 0) return noEncontrado('esa carpeta');
  } catch (fallo) {
    if (indiceUnicoViolado(fallo) === 'ux_drive_carpeta_obra') {
      return errorDePeticion('Esa obra ya tiene otra carpeta del Drive conectada.', 409);
    }
    throw fallo;
  }
  const [carpeta] = await db
    .select(columnasDeCarpeta)
    .from(driveCarpetas)
    .leftJoin(obras, eq(obras.id, driveCarpetas.obraId))
    .where(eq(driveCarpetas.id, carpetaId))
    .limit(1);
  return filaDeCarpeta(carpeta);
}

/**
 * RF-33: una versión «No se pudo leer» vuelve a «pendiente», con los intentos en 0, para que
 * el siguiente pulso la lea. Solo de una obra que alcanza quien pide (`alcanza`), y una de una
 * carpeta sin obra, solo la gerencia. Lo demás es un 404, sin decir si existe.
 */
export async function releerVersion(
  sesion: PersonaEnSesion,
  versionId: string,
  alcanza: (obraId: string) => boolean,
): Promise<{ id: string; estado: 'pendiente' } | Response> {
  const db = baseServidor();
  const [version] = await db
    .select({ estado: driveVersiones.estado, mediaId: driveVersiones.mediaId, obraId: driveCarpetas.obraId })
    .from(driveVersiones)
    .innerJoin(driveArchivos, eq(driveArchivos.id, driveVersiones.archivoId))
    .innerJoin(driveCarpetas, eq(driveCarpetas.id, driveArchivos.carpetaId))
    .where(eq(driveVersiones.id, versionId))
    .limit(1);
  const laAlcanza = version && (version.obraId ? alcanza(version.obraId) : sesion.rol === 'admin');
  if (!version || !laAlcanza) return noEncontrado('ese documento');

  const motivo = motivoParaNoReleer(version);
  if (motivo) return errorDePeticion(motivo, 409);

  // Con `where estado = 'no_se_pudo'`: si otro lo pidió a la vez, el segundo no pisa nada.
  const cambiadas = await db
    .update(driveVersiones)
    .set({ estado: 'pendiente', intentos: 0, motivo: null, leyendoDesde: null })
    .where(and(eq(driveVersiones.id, versionId), eq(driveVersiones.estado, 'no_se_pudo')))
    .returning({ id: driveVersiones.id });
  if (cambiadas.length === 0) return errorDePeticion('Ese documento ya se está leyendo.', 409);
  return { id: versionId, estado: 'pendiente' };
}
