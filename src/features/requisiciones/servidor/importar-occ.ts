/**
 * Importar con IA la planilla de requisición de pagos de OCC (spec 047, RF-59 a RF-70, RF-78, RF-79).
 * **Solo servidor.**
 *
 * ── Como la importación al Almacén (042) ──
 *
 * La planilla se revisa antes de guardar nada (solo `.xlsx`, D9; tamaño; que abra; que no pase de 200
 * filas con datos), se guarda en el almacén privado con dueño `requisicion_occ` y la importación queda
 * `en_curso`; la ruta responde 202 y la lectura sigue en el mismo proceso, porque el proxy del VPS corta
 * a los 120 s. Nadie espera esa promesa, así que no lanza: termina en la fila, `lista` con su propuesta
 * y un día para revisarla, o `fallida` con el motivo. Si el proceso muere a mitad, la vigencia de la
 * lectura deja que la siguiente consulta la dé por perdida.
 *
 * ── Confirmar ──
 *
 * Nada entra sin confirmar (RF-62). Al confirmar llegan las líneas como quedaron tras revisarlas; se
 * validan todas otra vez (las marcadas vacías tienen que venir llenas, RF-63) y se agregan al final de
 * la requisición. Si la importación no tenía requisición, se crea la del viernes escogido, con la misma
 * regla de «una por viernes» de crear a mano (RF-60): si ya hay una abierta, 409 con ella, y la pantalla
 * puede confirmar en esa.
 */
import { and, eq, inArray, lt, sql } from 'drizzle-orm';
import { uuidv7 } from 'uuidv7';

import { baseServidor } from '@/db/servidor/cliente';
import { media, requisicionOccEventos, requisicionOccImportaciones, requisicionOccLineas } from '@/db/servidor/esquema';
import { claveDeObjeto, guardar } from '@/features/media/servidor/almacen';
import type { ImportacionOccDetalle } from '@/features/panel/requisiciones-occ';
import { TIEMPO_MAXIMO_DE_LECTURA_MS } from '@/features/planificacion/servidor/leer-con-ia';
import { libroConNombres } from '@/features/presupuestos/servidor/leer-excel';
import type { PersonaEnSesion } from '@/features/servidor/guardia';
import { errorDePeticion, noEncontrado } from '@/features/servidor/respuestas';
import { aHex } from '@/shared/cripto/formato-pbkdf2';
import { textoDelExcelParaImportar } from '@/shared/rules/almacen-importacion-ia';
import { BYTES_MAXIMOS_PARA_IMPORTAR, esZip } from '@/shared/rules/archivos-subidos';
import { fechaDeJornada } from '@/shared/rules/jornada';
import { faltasDeLasLineasOcc, puedeCrearRequisicionOcc, type DatosDeLineaOcc } from '@/shared/rules/requisicion-occ';
import { esExcelParaImportarOcc, NO_ES_EXCEL_OCC, propuestaDeLaLecturaOcc } from '@/shared/rules/requisicion-occ-ia';

import { leerRequisicionOcc } from './con-ia-occ';
import { antesDeEscribir, cambio409, crearRequisicionOcc, requisicionOccAlAlcance, tomarLaVersionOcc, type ArchivoSubidoOcc } from './requisicion-occ';

/** Más que el tope de la IA: si se pasa, el proceso murió a mitad. */
const VIGENCIA_DE_UNA_LECTURA_MS = TIEMPO_MAXIMO_DE_LECTURA_MS + 2 * 60 * 1000;
/** Un día para revisarla, como la 042. */
const VIGENCIA_DE_UNA_PROPUESTA_MS = 24 * 60 * 60 * 1000;
const LECTURA_PERDIDA = 'Se pasó del tiempo y se dio por perdida. Vuelva a subir la planilla.';
const MIME_XLSX = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

type Importacion = typeof requisicionOccImportaciones.$inferSelect;

/** RF-78, RF-79: solo el Excel de OCC, que abra y que no sea más largo de lo que se lee. */
async function textoDeLaPlanilla(archivo: ArchivoSubidoOcc): Promise<{ texto: string; hojas: Awaited<ReturnType<typeof libroConNombres>> } | Response> {
  if (!esExcelParaImportarOcc(archivo.nombre)) return errorDePeticion(NO_ES_EXCEL_OCC, 422);
  if (archivo.contenido.byteLength === 0) return errorDePeticion('El archivo llegó vacío.', 422);
  if (archivo.contenido.byteLength > BYTES_MAXIMOS_PARA_IMPORTAR) {
    return errorDePeticion('La planilla pesa más de 20 MB. Redúzcala antes de subirla.', 413);
  }
  if (!esZip(archivo.contenido)) return errorDePeticion(`«${archivo.nombre}» no es un Excel. ${NO_ES_EXCEL_OCC}`, 422);
  let libro;
  try {
    libro = await libroConNombres(archivo.contenido.slice().buffer);
  } catch {
    return errorDePeticion(`«${archivo.nombre}» no se pudo abrir como Excel. Revise que no esté dañado ni protegido.`, 422);
  }
  const leido = textoDelExcelParaImportar(libro);
  if ('error' in leido) return errorDePeticion(leido.error, 422);
  return { texto: leido.texto, hojas: leido.hojas };
}

/** Deja la importación `fallida`, solo si sigue en curso. */
async function fallar(id: string, error: string): Promise<void> {
  await baseServidor()
    .update(requisicionOccImportaciones)
    .set({ estado: 'fallida', error, actualizadoEn: new Date() })
    .where(and(eq(requisicionOccImportaciones.id, id), eq(requisicionOccImportaciones.estado, 'en_curso')));
}

/** RF-59 a RF-67: la lectura por detrás. No lanza: todo termina en la fila. */
async function correrLectura(id: string, leido: { texto: string; hojas: Awaited<ReturnType<typeof libroConNombres>> }): Promise<void> {
  try {
    const respuesta = await leerRequisicionOcc(leido.texto);
    if (!respuesta.ok) return fallar(id, respuesta.error);
    const ahora = new Date();
    const resultado = propuestaDeLaLecturaOcc(respuesta.datos, { hoy: fechaDeJornada(ahora.getTime()), hojas: leido.hojas });
    if (!resultado.ok) return fallar(id, resultado.error);
    await baseServidor()
      .update(requisicionOccImportaciones)
      .set({
        estado: 'lista',
        propuesta: resultado.propuesta,
        vencePropuestaEn: new Date(ahora.getTime() + VIGENCIA_DE_UNA_PROPUESTA_MS),
        version: 2,
        actualizadoEn: ahora,
      })
      .where(and(eq(requisicionOccImportaciones.id, id), eq(requisicionOccImportaciones.estado, 'en_curso')));
  } catch (fallo) {
    console.error(`[requisicion-occ] la importación ${id} falló:`, fallo);
    await fallar(id, 'No se pudo leer la planilla. Vuelva a intentarlo.').catch(() => undefined);
  }
}

/**
 * RF-59, RF-60, RF-78, RF-79: sube la planilla. Con `requisicionId`, para agregar líneas a una en
 * Borrador o Devuelta, de quien puede armarla; sin él, para crear la del viernes al confirmar.
 */
export async function iniciarImportacionOcc(
  sesion: PersonaEnSesion,
  requisicionId: string | null,
  archivo: ArchivoSubidoOcc,
): Promise<{ importacionId: string } | Response> {
  if (!puedeCrearRequisicionOcc(sesion.rol)) return errorDePeticion('Importan en OCC el Encargado de OCC y la Gerencia.', 403);
  if (requisicionId) {
    const fila = await requisicionOccAlAlcance(sesion, requisicionId);
    if (!fila) return noEncontrado('esa requisición');
    const puede = await antesDeEscribir(sesion, requisicionId, fila.version, 'armar');
    if (puede instanceof Response) return puede;
  }

  const leido = await textoDeLaPlanilla(archivo);
  if (leido instanceof Response) return leido;

  const id = uuidv7();
  const mediaId = uuidv7();
  const clave = claveDeObjeto('requisicion_occ', id, mediaId, MIME_XLSX);
  await guardar(clave, archivo.contenido, MIME_XLSX);
  const ahora = new Date();
  const db = baseServidor();
  // RF-68: el archivo y su importación, juntos.
  await db.batch([
    db.insert(media).values({
      id: mediaId,
      duenoTipo: 'requisicion_occ',
      duenoId: id,
      proposito: 'evidencia',
      mime: MIME_XLSX,
      bytes: archivo.contenido.byteLength,
      sha256: aHex(new Uint8Array(await crypto.subtle.digest('SHA-256', archivo.contenido))),
      claveR2: clave,
      subidoEn: ahora,
    }),
    db.insert(requisicionOccImportaciones).values({
      id,
      requisicionId,
      mediaId,
      nombreArchivo: archivo.nombre,
      estado: 'en_curso',
      venceLecturaEn: new Date(ahora.getTime() + VIGENCIA_DE_UNA_LECTURA_MS),
      creadoPor: sesion.id,
    }),
  ]);

  void correrLectura(id, leido);
  return { importacionId: id };
}

/** La importación, si es de quien pregunta; antes vence la lectura que se pasó de tiempo. */
async function importacionDeQuienPregunta(sesion: PersonaEnSesion, id: string): Promise<Importacion | null> {
  const db = baseServidor();
  await db
    .update(requisicionOccImportaciones)
    .set({ estado: 'fallida', error: LECTURA_PERDIDA, actualizadoEn: new Date() })
    .where(
      and(
        eq(requisicionOccImportaciones.id, id),
        eq(requisicionOccImportaciones.estado, 'en_curso'),
        lt(requisicionOccImportaciones.venceLecturaEn, new Date()),
      ),
    );
  const [fila] = await db.select().from(requisicionOccImportaciones).where(eq(requisicionOccImportaciones.id, id)).limit(1);
  return fila && fila.creadoPor === sesion.id ? fila : null;
}

/** RF-61: en qué va y, si está lista, su propuesta. */
export async function detalleDeImportacionOcc(sesion: PersonaEnSesion, id: string): Promise<ImportacionOccDetalle | Response> {
  const fila = await importacionDeQuienPregunta(sesion, id);
  if (!fila) return noEncontrado('esa importación');
  const vencida = fila.estado === 'lista' && fila.vencePropuestaEn !== null && fila.vencePropuestaEn < new Date();
  return {
    id: fila.id,
    requisicionId: fila.requisicionId,
    nombreArchivo: fila.nombreArchivo,
    estado: vencida ? 'fallida' : fila.estado,
    error: vencida ? 'La propuesta venció: pasó más de un día. Vuelva a subir la planilla.' : fila.error,
    propuesta: vencida ? null : fila.propuesta,
    version: fila.version,
  };
}

/** Lo que llega al confirmar, ya pasado por el contrato. */
export interface ImportacionOccConfirmadaRecibida {
  version: number;
  viernes?: string;
  requisicionId?: string;
  lineas: DatosDeLineaOcc[];
}

/**
 * RF-60 a RF-63, RF-68: agrega las líneas revisadas al final de la requisición (la de la importación,
 * la que se escoge, o la que se crea para el viernes) y deja la importación confirmada, con su archivo.
 */
export async function confirmarImportacionOcc(
  sesion: PersonaEnSesion,
  id: string,
  pedido: ImportacionOccConfirmadaRecibida,
): Promise<{ requisicionId: string; version: number } | Response> {
  const importacion = await importacionDeQuienPregunta(sesion, id);
  if (!importacion) return noEncontrado('esa importación');
  if (importacion.estado !== 'lista' || importacion.version !== pedido.version) {
    return errorDePeticion('Esta importación ya no está para confirmar: ya entró, se descartó o cambió.', 409);
  }
  if (importacion.vencePropuestaEn && importacion.vencePropuestaEn < new Date()) {
    return errorDePeticion('La propuesta venció: pasó más de un día. Vuelva a subir la planilla.', 409);
  }

  const lineas = pedido.lineas.map((l) => ({ ...l, beneficiario: l.beneficiario.trim(), concepto: l.concepto.trim() }));
  const faltas = faltasDeLasLineasOcc(lineas);
  if (faltas.length) return Response.json({ error: faltas[0], faltas }, { status: 422 });

  // La requisición: la de la importación, la escogida o la nueva del viernes (RF-60).
  let requisicionId = importacion.requisicionId ?? pedido.requisicionId ?? null;
  if (!requisicionId) {
    const creada = await crearRequisicionOcc(sesion, pedido.viernes ?? '');
    if (creada instanceof Response) return creada;
    requisicionId = creada.id;
  }
  const fila = await requisicionOccAlAlcance(sesion, requisicionId);
  if (!fila) return noEncontrado('esa requisición');
  const puede = await antesDeEscribir(sesion, requisicionId, fila.version, 'armar');
  if (puede instanceof Response) return puede;
  if (!(await tomarLaVersionOcc(requisicionId, fila.version, ['borrador', 'devuelta']))) return cambio409();

  const db = baseServidor();
  const [tomada] = await db
    .update(requisicionOccImportaciones)
    .set({ estado: 'confirmada', requisicionId, version: pedido.version + 1, confirmadaEn: new Date(), confirmadaPor: sesion.id, actualizadoEn: new Date() })
    .where(and(eq(requisicionOccImportaciones.id, id), eq(requisicionOccImportaciones.version, pedido.version), eq(requisicionOccImportaciones.estado, 'lista')))
    .returning({ id: requisicionOccImportaciones.id });
  if (!tomada) return errorDePeticion('Esta importación ya no está para confirmar: ya entró, se descartó o cambió.', 409);

  const base = sql<number>`(select coalesce(max(${requisicionOccLineas.orden}), 0) from ${requisicionOccLineas} where ${requisicionOccLineas.requisicionId} = ${requisicionId})`;
  await db.batch([
    db.insert(requisicionOccLineas).values(
      lineas.map((l, i) => ({
        id: uuidv7(),
        requisicionId: requisicionId as string,
        orden: sql<number>`${base} + ${i + 1}`,
        fechaSolicitud: l.fechaSolicitud,
        beneficiario: l.beneficiario,
        concepto: l.concepto,
        especificaciones: l.especificaciones.trim(),
        proveedor: l.proveedor.trim(),
        valor: l.valor as number,
        observaciones: l.observaciones.trim(),
        creadaPor: sesion.id,
      })),
    ),
    db.insert(requisicionOccEventos).values({
      id: uuidv7(),
      requisicionId,
      paso: 'importada',
      motivo: null,
      cambios: [{ importacionId: id, nombreArchivo: importacion.nombreArchivo, mediaId: importacion.mediaId, lineas: lineas.length }],
      por: sesion.id,
    }),
  ]);
  return { requisicionId, version: fila.version + 1 };
}

/** RF-62: la deja descartada; el archivo no se borra. */
export async function descartarImportacionOcc(sesion: PersonaEnSesion, id: string): Promise<{ id: string } | Response> {
  const importacion = await importacionDeQuienPregunta(sesion, id);
  if (!importacion) return noEncontrado('esa importación');
  const yaNo = errorDePeticion('Esta importación ya entró, ya se descartó o cambió: no se descarta.', 409);
  if (importacion.estado === 'confirmada' || importacion.estado === 'descartada') return yaNo;
  const [descartada] = await baseServidor()
    .update(requisicionOccImportaciones)
    .set({ estado: 'descartada', descartadaEn: new Date(), version: importacion.version + 1, actualizadoEn: new Date() })
    .where(
      and(
        eq(requisicionOccImportaciones.id, id),
        eq(requisicionOccImportaciones.version, importacion.version),
        inArray(requisicionOccImportaciones.estado, ['en_curso', 'lista', 'fallida']),
      ),
    )
    .returning({ id: requisicionOccImportaciones.id });
  return descartada ? { id } : yaNo;
}
