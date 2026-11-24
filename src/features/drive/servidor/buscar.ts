/**
 * Buscar en el Drive de una obra (spec 052, RF-22 a RF-27, RF-38). La usan el asistente
 * (`drive_de_la_obra`, T13) y, después, los borradores de correo de la spec 053.
 *
 * ── Qué decide quién ──
 *
 * Las palabras de la consulta y cuántos resultados vuelven los decide la regla
 * (`consultaDeBusqueda`, `recortarResultados`). **Quién puede buscar en qué obra no se decide
 * aquí**: lo comprueba quien llama, con el alcance y el permiso `drive` (RF-28, RF-37). Esta
 * función recibe una obra ya autorizada y nunca devuelve nada de otra. Una carpeta sin obra no
 * aparece en ninguna búsqueda (RF-39): el filtro es por la obra de la carpeta.
 *
 * ── Qué versión ──
 *
 * La vigente de cada archivo es la de fecha de modificación en Drive más reciente
 * (`versionVigente`), **aunque todavía no esté leída**: mientras se lee la nueva, el asistente
 * no responde con lo que decía la vieja como si fuera lo de hoy. Con `conVersiones` entran
 * también las viejas, y con `conRetirados` los archivos retirados del Drive; cada resultado
 * dice si es vigente y si está retirado, para que la respuesta lo marque (RF-25, RF-26).
 *
 * ── La búsqueda ──
 *
 * Texto completo de Postgres en español sobre el texto normalizado (plan, «Decisiones
 * técnicas»), con cualquiera de las palabras y ordenado por `ts_rank`. Se piden más filas de
 * las que vuelven, y `recortarResultados` deja las que caben.
 *
 * Solo servidor.
 */
import { sql } from 'drizzle-orm';

import { baseServidor } from '@/db/servidor/cliente';
import { consultaDeBusqueda, FRAGMENTOS_POR_BUSQUEDA, recortarResultados } from '@/shared/rules/drive';

export interface OpcionesDeBusqueda {
  /** Incluir las versiones viejas, no solo la vigente (RF-25). */
  conVersiones?: boolean;
  /** Incluir los archivos retirados del Drive (RF-26). */
  conRetirados?: boolean;
}

export interface FragmentoEncontrado {
  id: string;
  texto: string;
  pagina: number;
  documento: string;
  subcarpeta: string;
  /** La copia que se abre desde la cita (RF-24). */
  mediaId: string | null;
  versionId: string;
  /** Fecha de modificación en el Drive de esa versión, ISO. */
  modificadoEnDrive: string;
  vigente: boolean;
  retirado: boolean;
}

interface FilaEncontrada extends Record<string, unknown> {
  id: string;
  texto: string;
  pagina: number;
  documento: string;
  subcarpeta: string;
  media_id: string | null;
  version_id: string;
  modificado_en_drive: string;
  vigente: boolean;
  retirado: boolean;
}

/** Los fragmentos del Drive de la obra que mejor responden `texto`. Vacío si nada coincide. */
export async function buscarEnElDrive(
  obraId: string,
  texto: string,
  opciones: OpcionesDeBusqueda = {},
): Promise<FragmentoEncontrado[]> {
  const consulta = consultaDeBusqueda(texto);
  if (!consulta) return [];

  const resultado = await baseServidor().execute<FilaEncontrada>(sql`
    with q as (select to_tsquery('spanish', ${consulta}) as consulta)
    select f.id, f.texto, f.pagina, a.nombre as documento, a.subcarpeta, v.media_id, v.id as version_id,
           v.modificado_en_drive,
           v.modificado_en_drive = (
             select max(v2.modificado_en_drive) from drive_versiones v2 where v2.archivo_id = a.id
           ) as vigente,
           a.retirado_en is not null as retirado
    from q, drive_fragmentos f
    join drive_versiones v on v.id = f.version_id
    join drive_archivos a on a.id = v.archivo_id
    join drive_carpetas c on c.id = a.carpeta_id
    where c.obra_id = ${obraId}
      and v.estado = 'leido'
      and f.buscable @@ q.consulta
      and (${opciones.conRetirados === true}::boolean or a.retirado_en is null)
      and (${opciones.conVersiones === true}::boolean or v.modificado_en_drive = (
        select max(v2.modificado_en_drive) from drive_versiones v2 where v2.archivo_id = a.id
      ))
    order by ts_rank(f.buscable, q.consulta) desc, v.modificado_en_drive desc, f.orden
    limit ${FRAGMENTOS_POR_BUSQUEDA * 4}
  `);

  return recortarResultados(
    resultado.rows.map((f) => ({
      id: f.id,
      texto: f.texto,
      pagina: f.pagina,
      documento: f.documento,
      subcarpeta: f.subcarpeta,
      mediaId: f.media_id,
      versionId: f.version_id,
      modificadoEnDrive: new Date(f.modificado_en_drive).toISOString(),
      vigente: f.vigente,
      retirado: f.retirado,
    })),
  );
}
