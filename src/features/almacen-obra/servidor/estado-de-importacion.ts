/**
 * Las importaciones de quien pregunta: listarlas, abrir una, descartarla y vencer las que se pasaron
 * de tiempo (spec 042, RF-8, RF-43, RF-48, RF-65, RF-66, RF-90, RF-95, RF-98). **Solo servidor.**
 *
 * ── Liviano a propósito ──
 *
 * La pantalla consulta el estado de una importación muchas veces mientras se lee. Este módulo solo
 * toca la base: no importa la IA, ni el lector de Excel, ni el de Word. En la 044 (T16) una consulta
 * que arrastraba todo eso hacía crecer la memoria del servidor de desarrollo hasta tumbarlo.
 *
 * ── Cada uno ve las suyas ──
 *
 * Una propuesta la ve quien subió el documento (RF-65): es su trabajo a medio hacer. A cualquier otro,
 * aunque sea de la misma obra, se le responde «no existe», como en el resto del panel. Una persona
 * puede tener varias a la vez (D32).
 *
 * ── Vencer al consultar ──
 *
 * El servidor no tiene tareas programadas, así que el vencimiento se aplica cada vez que se lista o se
 * abre una importación de la obra: una `lista` con más de un día queda `descartada` (RF-66, RF-48) y
 * una `en_curso` que pasó su tope queda `fallida` (el proceso murió a mitad). Las dos son sentencias
 * condicionadas por estado, así que se pueden repetir sin daño. El archivo nunca se borra (RF-48); la
 * ruta de medios no entrega el de una descartada (RF-95, T15).
 */
import { and, asc, desc, eq, inArray, isNull, lt, sql } from 'drizzle-orm';

import { baseServidor } from '@/db/servidor/cliente';
import { almacenImportaciones, almacenMateriales, almacenMovimientos, usuarios } from '@/db/servidor/esquema';
import type { ImportacionDetalle, ImportacionPendienteFila, RevisionDelRepetido } from '@/features/panel/almacen-importacion';
import { alcanzaLaObra } from '@/features/servidor/alcance';
import type { PersonaEnSesion } from '@/features/servidor/guardia';
import { errorDePeticion, noEncontrado } from '@/features/servidor/respuestas';
import { claveDelDocumento, documentoRepetido } from '@/shared/rules/almacen-importacion';

export const LECTURA_PERDIDA = 'Se pasó del tiempo y se dio por perdida. Vuelva a subir el documento.';

/** Lo que se ve en la lista (RF-65): sin la propuesta, que puede ser larga. */
const columnasDeLaFila = {
  id: almacenImportaciones.id,
  obraId: almacenImportaciones.obraId,
  nombreArchivo: almacenImportaciones.nombreArchivo,
  estado: almacenImportaciones.estado,
  error: almacenImportaciones.error,
  creadoEn: almacenImportaciones.creadoEn,
  vencePropuestaEn: almacenImportaciones.vencePropuestaEn,
  creadoPor: almacenImportaciones.creadoPor,
};

function fila(f: {
  id: string;
  nombreArchivo: string;
  estado: ImportacionPendienteFila['estado'];
  error: string | null;
  creadoEn: Date;
  vencePropuestaEn: Date | null;
}): ImportacionPendienteFila {
  return {
    id: f.id,
    nombreArchivo: f.nombreArchivo,
    estado: f.estado,
    error: f.error,
    creadoEn: f.creadoEn.toISOString(),
    vencePropuestaEn: f.vencePropuestaEn?.toISOString() ?? null,
  };
}

/** RF-66, RF-48: vence lo que se pasó de tiempo en la obra. Repetirla no hace daño. */
export async function vencerImportaciones(obraId: string): Promise<void> {
  const db = baseServidor();
  const ahora = new Date();
  await db
    .update(almacenImportaciones)
    .set({ estado: 'descartada', descartadaEn: ahora, version: sql`${almacenImportaciones.version} + 1`, actualizadoEn: ahora })
    .where(and(eq(almacenImportaciones.obraId, obraId), eq(almacenImportaciones.estado, 'lista'), lt(almacenImportaciones.vencePropuestaEn, ahora)));
  await db
    .update(almacenImportaciones)
    .set({ estado: 'fallida', error: LECTURA_PERDIDA, version: sql`${almacenImportaciones.version} + 1`, actualizadoEn: ahora })
    .where(and(eq(almacenImportaciones.obraId, obraId), eq(almacenImportaciones.estado, 'en_curso'), lt(almacenImportaciones.venceLecturaEn, ahora)));
}

/** RF-65, RF-98: las de quien pregunta en esa obra que siguen abiertas, la más nueva primero. */
export async function pendientesDe(sesion: PersonaEnSesion, obraId: string): Promise<ImportacionPendienteFila[]> {
  await vencerImportaciones(obraId);
  const filas = await baseServidor()
    .select(columnasDeLaFila)
    .from(almacenImportaciones)
    .where(
      and(
        eq(almacenImportaciones.obraId, obraId),
        eq(almacenImportaciones.creadoPor, sesion.id),
        inArray(almacenImportaciones.estado, ['en_curso', 'lista', 'fallida']),
      ),
    )
    .orderBy(desc(almacenImportaciones.creadoEn));
  return filas.map(fila);
}

/**
 * Una importación de quien pregunta, con su obra al alcance, ya vencida si tocaba; `null` si no es
 * suya o no la alcanza (la ruta responde «no existe»).
 */
export async function importacionDe(sesion: PersonaEnSesion, id: string) {
  const db = baseServidor();
  const [antes] = await db.select({ obraId: almacenImportaciones.obraId }).from(almacenImportaciones).where(eq(almacenImportaciones.id, id)).limit(1);
  if (!antes || !alcanzaLaObra(sesion, antes.obraId)) return null;
  await vencerImportaciones(antes.obraId);
  const [f] = await db.select().from(almacenImportaciones).where(eq(almacenImportaciones.id, id)).limit(1);
  return f && f.creadoPor === sesion.id ? f : null;
}

/** RF-43, RF-90, RF-91: si el documento ya entró a la obra, mirado ahora. La usa también confirmar. */
export async function revisionDelRepetido(obraId: string, proveedor: string | null, numero: string | null): Promise<RevisionDelRepetido> {
  const clave = claveDelDocumento(proveedor, numero);
  if (!clave) return { tipo: 'sin_clave' };
  const ingresos = await baseServidor()
    .select({
      documentoClave: almacenMovimientos.documentoClave,
      anuladoEn: almacenMovimientos.anuladoEn,
      creadoEn: almacenMovimientos.creadoEn,
      registradoPorNombre: usuarios.nombreCompleto,
    })
    .from(almacenMovimientos)
    .leftJoin(usuarios, eq(usuarios.id, almacenMovimientos.registradoPor))
    .where(and(eq(almacenMovimientos.obraId, obraId), eq(almacenMovimientos.documentoClave, clave)));
  const repetido = documentoRepetido(
    clave,
    ingresos.map((i) => ({
      documentoClave: i.documentoClave,
      anulado: i.anuladoEn !== null,
      registradoEn: i.creadoEn.toISOString(),
      registradoPorNombre: i.registradoPorNombre,
    })),
  );
  return repetido ? { tipo: 'repetido', repetido } : { tipo: 'nuevo' };
}

/** RF-8, RF-10 a RF-33, RF-43, RF-65: la importación para revisarla, con los materiales vigentes de la obra. */
export async function detalleDeImportacion(sesion: PersonaEnSesion, id: string): Promise<ImportacionDetalle | Response> {
  const f = await importacionDe(sesion, id);
  if (!f) return noEncontrado('esa importación');
  const materiales = await baseServidor()
    .select({ id: almacenMateriales.id, nombre: almacenMateriales.nombre, unidad: almacenMateriales.unidad })
    .from(almacenMateriales)
    .where(and(eq(almacenMateriales.obraId, f.obraId), isNull(almacenMateriales.eliminadoEn)))
    .orderBy(asc(almacenMateriales.nombre));
  const documento = f.propuesta?.documento;
  return {
    ...fila(f),
    obraId: f.obraId,
    version: f.version,
    propuesta: f.estado === 'lista' ? f.propuesta : null,
    materiales,
    repetido: documento ? await revisionDelRepetido(f.obraId, documento.proveedor, documento.numero) : { tipo: 'sin_clave' },
  };
}

/**
 * RF-48: descartar una propuesta que no se va a confirmar, también una que se está leyendo o que
 * falló. El archivo no se borra. Una confirmada no se descarta: sus ingresos se anulan uno a uno.
 */
export async function descartarImportacion(sesion: PersonaEnSesion, id: string): Promise<ImportacionPendienteFila | Response> {
  const f = await importacionDe(sesion, id);
  if (!f) return noEncontrado('esa importación');
  if (f.estado === 'confirmada') return errorDePeticion('Esta importación ya se confirmó: sus ingresos se anulan desde el historial de cada material.', 409);
  if (f.estado === 'descartada') return fila(f);
  const ahora = new Date();
  const [descartada] = await baseServidor()
    .update(almacenImportaciones)
    .set({ estado: 'descartada', descartadaEn: ahora, version: sql`${almacenImportaciones.version} + 1`, actualizadoEn: ahora })
    .where(and(eq(almacenImportaciones.id, id), inArray(almacenImportaciones.estado, ['en_curso', 'lista', 'fallida'])))
    .returning();
  // Otra petición la confirmó entre la lectura y la escritura.
  if (!descartada) return errorDePeticion('Esta importación cambió mientras tanto. Vuelva a abrirla.', 409);
  return fila(descartada);
}
