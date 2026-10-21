/**
 * Las pólizas, los documentos y los archivos del contrato de una obra (spec 031, RF-23
 * a RF-30). **Solo servidor.**
 *
 * ── Los archivos, aparte ──
 *
 * Un archivo se sube solo (`POST contrato/archivos`) y devuelve su id; la póliza o el
 * documento lo citan después. Así una sola ruta recibe bytes, valida el tipo y el
 * tamaño, y los dos registros se crean con JSON como el resto del panel. Antes de
 * citarlo se comprueba que el archivo sea **de este contrato** y que no lo use ya otro
 * registro: si no, bastaría con conocer un id para colgar el archivo de otra obra.
 *
 * Primero R2, después la fila, como las fotos del parte: si se corta entre las dos,
 * queda un objeto huérfano en el almacén, que no molesta; al revés quedaría una fila
 * que apunta a nada.
 *
 * Nada se borra (RF-26, RF-29): se anula con motivo, o la póliza se reemplaza.
 */
import { and, desc, eq, inArray, isNull } from 'drizzle-orm';
import { uuidv7 } from 'uuidv7';

import { baseServidor } from '@/db/servidor/cliente';
import { contratoDocumentos, contratoPolizas, contratos, media, obras, usuarios } from '@/db/servidor/esquema';
import { claveDeObjeto, guardar } from '@/features/media/servidor/almacen';
import type {
  DocumentoDelContrato,
  DocumentoNuevo,
  PolizaDelContrato,
  PolizaNueva,
} from '@/features/panel/contratos';
import { alcanzaLaObra, filtroDeObra } from '@/features/servidor/alcance';
import type { PersonaEnSesion } from '@/features/servidor/guardia';
import { errorDePeticion, noEncontrado } from '@/features/servidor/respuestas';
import { aHex } from '@/shared/cripto/formato-pbkdf2';
import { rechazoDeArchivo, type ClaseDeDocumento } from '@/shared/rules/contrato';
import { fechaDeJornada } from '@/shared/rules/jornada';
import { alcanza } from '@/shared/rules/permisos';
import { polizasConAviso, vigenciaDePoliza, type Amparo } from '@/shared/rules/polizas';

/** El contrato de la obra, o la respuesta que explica que primero hay que guardarlo. */
async function contratoDeLaObra(obraId: string): Promise<string | Response> {
  const [fila] = await baseServidor()
    .select({ id: contratos.id })
    .from(contratos)
    .where(eq(contratos.obraId, obraId))
    .limit(1);
  return fila ? fila.id : errorDePeticion('Guarde primero el contrato de la obra.', 409);
}

/** Sube un archivo del contrato (RF-30) y devuelve su id para citarlo. */
export async function subirArchivo(
  obraId: string,
  mime: string,
  contenido: Uint8Array<ArrayBuffer>,
): Promise<{ mediaId: string } | Response> {
  const rechazo = rechazoDeArchivo(mime, contenido.byteLength);
  if (rechazo) return errorDePeticion(rechazo.mensaje, rechazo.estado);
  const contratoId = await contratoDeLaObra(obraId);
  if (contratoId instanceof Response) return contratoId;

  const mediaId = uuidv7();
  const clave = claveDeObjeto('contrato', contratoId, mediaId, mime);
  await guardar(clave, contenido, mime);
  const huella = aHex(new Uint8Array(await crypto.subtle.digest('SHA-256', contenido)));
  await baseServidor().insert(media).values({
    id: mediaId,
    duenoTipo: 'contrato',
    duenoId: contratoId,
    proposito: 'evidencia',
    mime,
    bytes: contenido.byteLength,
    sha256: huella,
    claveR2: clave,
    subidoEn: new Date(),
  });
  return { mediaId };
}

/**
 * ¿Puede este registro citar este archivo? Tiene que ser del mismo contrato y no estar
 * citado por otra póliza ni por otro documento.
 */
async function archivoLibre(contratoId: string, mediaId: string): Promise<Response | null> {
  const db = baseServidor();
  const [archivo] = await db
    .select({ id: media.id })
    .from(media)
    .where(and(eq(media.id, mediaId), eq(media.duenoTipo, 'contrato'), eq(media.duenoId, contratoId)))
    .limit(1);
  if (!archivo) return noEncontrado('ese archivo');
  const [enPoliza, enDocumento] = await Promise.all([
    db.select({ id: contratoPolizas.id }).from(contratoPolizas).where(eq(contratoPolizas.mediaId, mediaId)).limit(1),
    db.select({ id: contratoDocumentos.id }).from(contratoDocumentos).where(eq(contratoDocumentos.mediaId, mediaId)).limit(1),
  ]);
  if (enPoliza.length || enDocumento.length) return errorDePeticion('Ese archivo ya está en otro registro.', 409);
  return null;
}

function revisarVigencia(desde: string, hasta: string): Response | null {
  return hasta < desde ? errorDePeticion('La póliza no puede terminar antes de empezar.') : null;
}

/** Una póliza nueva (RF-23). */
export async function crearPoliza(
  sesion: PersonaEnSesion,
  obraId: string,
  pedido: PolizaNueva,
): Promise<{ id: string } | Response> {
  const contratoId = await contratoDeLaObra(obraId);
  if (contratoId instanceof Response) return contratoId;
  const fechas = revisarVigencia(pedido.desde, pedido.hasta);
  if (fechas) return fechas;
  if (pedido.mediaId) {
    const ocupado = await archivoLibre(contratoId, pedido.mediaId);
    if (ocupado) return ocupado;
  }
  const id = uuidv7();
  await baseServidor()
    .insert(contratoPolizas)
    .values({
      id,
      contratoId,
      amparo: pedido.amparo,
      aseguradora: pedido.aseguradora,
      numero: pedido.numero,
      valor: pedido.valor ?? null,
      desde: pedido.desde,
      hasta: pedido.hasta,
      mediaId: pedido.mediaId ?? null,
      creadaPor: sesion.id,
    });
  return { id };
}

/** La póliza con la obra de su contrato, si la sesión la alcanza; si no, 404. */
async function polizaAlAlcance(sesion: PersonaEnSesion, id: string) {
  const [fila] = await baseServidor()
    .select({ id: contratoPolizas.id, estado: contratoPolizas.estado, contratoId: contratoPolizas.contratoId, obraId: contratos.obraId })
    .from(contratoPolizas)
    .innerJoin(contratos, eq(contratos.id, contratoPolizas.contratoId))
    .where(eq(contratoPolizas.id, id))
    .limit(1);
  return fila && alcanzaLaObra(sesion, fila.obraId) ? fila : null;
}

/** Anular una póliza activa, con motivo (RF-26). */
export async function anularPoliza(
  sesion: PersonaEnSesion,
  id: string,
  motivo: string,
): Promise<{ id: string } | Response> {
  const poliza = await polizaAlAlcance(sesion, id);
  if (!poliza) return noEncontrado('esa póliza');
  const [anulada] = await baseServidor()
    .update(contratoPolizas)
    .set({ estado: 'anulada', anuladaEn: new Date(), anuladaPor: sesion.id, motivoAnulacion: motivo })
    .where(and(eq(contratoPolizas.id, id), eq(contratoPolizas.estado, 'activa')))
    .returning({ id: contratoPolizas.id });
  return anulada ?? errorDePeticion('Esa póliza ya no está activa.', 409);
}

/**
 * Reemplazar una póliza (RF-26): la nueva nace activa y la vieja queda `reemplazada`
 * apuntando a ella. Las dos sentencias van en un lote, que Neon corre en una sola
 * transacción; la vieja se comprobó activa justo antes.
 */
export async function reemplazarPoliza(
  sesion: PersonaEnSesion,
  id: string,
  pedido: PolizaNueva,
): Promise<{ id: string } | Response> {
  const vieja = await polizaAlAlcance(sesion, id);
  if (!vieja) return noEncontrado('esa póliza');
  if (vieja.estado !== 'activa') return errorDePeticion('Esa póliza ya no está activa.', 409);
  const fechas = revisarVigencia(pedido.desde, pedido.hasta);
  if (fechas) return fechas;
  if (pedido.mediaId) {
    const ocupado = await archivoLibre(vieja.contratoId, pedido.mediaId);
    if (ocupado) return ocupado;
  }
  const nueva = uuidv7();
  const db = baseServidor();
  await db.batch([
    db.insert(contratoPolizas).values({
      id: nueva,
      contratoId: vieja.contratoId,
      amparo: pedido.amparo,
      aseguradora: pedido.aseguradora,
      numero: pedido.numero,
      valor: pedido.valor ?? null,
      desde: pedido.desde,
      hasta: pedido.hasta,
      mediaId: pedido.mediaId ?? null,
      creadaPor: sesion.id,
    }),
    db
      .update(contratoPolizas)
      .set({ estado: 'reemplazada', reemplazadaPor: nueva })
      .where(and(eq(contratoPolizas.id, id), eq(contratoPolizas.estado, 'activa'))),
  ]);
  return { id: nueva };
}

/** Un documento del contrato (RF-27). */
export async function crearDocumento(
  sesion: PersonaEnSesion,
  obraId: string,
  pedido: DocumentoNuevo,
): Promise<{ id: string } | Response> {
  const contratoId = await contratoDeLaObra(obraId);
  if (contratoId instanceof Response) return contratoId;
  const ocupado = await archivoLibre(contratoId, pedido.mediaId);
  if (ocupado) return ocupado;
  const id = uuidv7();
  await baseServidor()
    .insert(contratoDocumentos)
    .values({
      id,
      contratoId,
      clase: pedido.clase,
      fecha: pedido.fecha,
      descripcion: pedido.descripcion ?? '',
      mediaId: pedido.mediaId,
      subidoPor: sesion.id,
    });
  return { id };
}

/** Anular un documento, con motivo (RF-29). Sigue en la lista, marcado. */
export async function anularDocumento(
  sesion: PersonaEnSesion,
  id: string,
  motivo: string,
): Promise<{ id: string } | Response> {
  const [fila] = await baseServidor()
    .select({ obraId: contratos.obraId, anuladoEn: contratoDocumentos.anuladoEn })
    .from(contratoDocumentos)
    .innerJoin(contratos, eq(contratos.id, contratoDocumentos.contratoId))
    .where(eq(contratoDocumentos.id, id))
    .limit(1);
  if (!fila || !alcanzaLaObra(sesion, fila.obraId)) return noEncontrado('ese documento');
  if (fila.anuladoEn) return errorDePeticion('Ese documento ya está anulado.', 409);
  const [anulado] = await baseServidor()
    .update(contratoDocumentos)
    .set({ anuladoEn: new Date(), anuladoPor: sesion.id, motivoAnulacion: motivo })
    .where(and(eq(contratoDocumentos.id, id), isNull(contratoDocumentos.anuladoEn)))
    .returning({ id: contratoDocumentos.id });
  return anulado ?? errorDePeticion('Ese documento ya está anulado.', 409);
}

/** Las pólizas del contrato con su vigencia de hoy (RF-24): primero las activas, por fin. */
export async function polizasDelContrato(contratoId: string): Promise<PolizaDelContrato[]> {
  const filas = await baseServidor()
    .select()
    .from(contratoPolizas)
    .where(eq(contratoPolizas.contratoId, contratoId));
  const hoy = fechaDeJornada();
  return filas
    .map((p) => {
      const vigencia = p.estado === 'activa' ? vigenciaDePoliza(p.hasta, hoy) : null;
      return {
        id: p.id,
        amparo: p.amparo as Amparo,
        aseguradora: p.aseguradora,
        numero: p.numero,
        valor: p.valor,
        desde: p.desde,
        hasta: p.hasta,
        mediaId: p.mediaId,
        estado: p.estado,
        vigencia: vigencia?.vigencia ?? null,
        texto: vigencia?.texto ?? null,
        reemplazadaPor: p.reemplazadaPor,
        motivoAnulacion: p.motivoAnulacion,
      };
    })
    .sort((a, b) => Number(a.estado !== 'activa') - Number(b.estado !== 'activa') || a.hasta.localeCompare(b.hasta));
}

/** Los documentos del contrato, del más reciente al más antiguo, con los anulados (RF-28, RF-29). */
export async function documentosDelContrato(contratoId: string): Promise<DocumentoDelContrato[]> {
  const db = baseServidor();
  const filas = await db
    .select({
      id: contratoDocumentos.id,
      clase: contratoDocumentos.clase,
      fecha: contratoDocumentos.fecha,
      descripcion: contratoDocumentos.descripcion,
      mediaId: contratoDocumentos.mediaId,
      mime: media.mime,
      subidoPor: contratoDocumentos.subidoPor,
      subidoEn: contratoDocumentos.subidoEn,
      anuladoEn: contratoDocumentos.anuladoEn,
      anuladoPor: contratoDocumentos.anuladoPor,
      motivoAnulacion: contratoDocumentos.motivoAnulacion,
    })
    .from(contratoDocumentos)
    .innerJoin(media, eq(media.id, contratoDocumentos.mediaId))
    .where(eq(contratoDocumentos.contratoId, contratoId))
    .orderBy(desc(contratoDocumentos.fecha), desc(contratoDocumentos.subidoEn));
  const ids = [...new Set(filas.flatMap((f) => [f.subidoPor, f.anuladoPor].filter((x): x is string => Boolean(x))))];
  const nombres = new Map(
    ids.length
      ? (
          await db
            .select({ id: usuarios.id, nombre: usuarios.nombreCompleto })
            .from(usuarios)
            .where(inArray(usuarios.id, ids))
        ).map((u) => [u.id, u.nombre])
      : [],
  );
  return filas.map((f) => ({
    id: f.id,
    clase: f.clase as ClaseDeDocumento,
    fecha: f.fecha,
    descripcion: f.descripcion,
    mediaId: f.mediaId,
    mime: f.mime,
    subidoPor: nombres.get(f.subidoPor) ?? '',
    subidoEn: f.subidoEn.toISOString(),
    anulado: f.anuladoEn
      ? { en: f.anuladoEn.toISOString(), por: nombres.get(f.anuladoPor ?? '') ?? '', motivo: f.motivoAnulacion ?? '' }
      : null,
  }));
}

export interface AvisoDePoliza {
  id: string;
  obraId: string;
  obra: string;
  amparo: Amparo;
  aseguradora: string;
  numero: string;
  hasta: string;
  vigencia: 'por_vencer' | 'vencida';
  texto: string;
}

/**
 * Las pólizas que avisan en el Inicio (RF-25): las activas por vencer o vencidas de las
 * obras que la sesión alcanza, de la que vence antes a la que vence después. Solo para
 * quien ve el módulo de contrato; a los demás, ninguna.
 */
export async function avisosDePolizas(sesion: PersonaEnSesion): Promise<AvisoDePoliza[]> {
  if (!alcanza(sesion.rol, 'contrato', 'ver')) return [];
  const filas = await baseServidor()
    .select({
      id: contratoPolizas.id,
      obraId: contratos.obraId,
      codigo: obras.codigo,
      nombre: obras.nombre,
      amparo: contratoPolizas.amparo,
      aseguradora: contratoPolizas.aseguradora,
      numero: contratoPolizas.numero,
      hasta: contratoPolizas.hasta,
      estado: contratoPolizas.estado,
    })
    .from(contratoPolizas)
    .innerJoin(contratos, eq(contratos.id, contratoPolizas.contratoId))
    .innerJoin(obras, eq(obras.id, contratos.obraId))
    .where(and(eq(contratoPolizas.estado, 'activa'), isNull(obras.eliminadoEn), filtroDeObra(sesion, contratos.obraId)));
  return polizasConAviso(
    filas.map((f) => ({ ...f, amparo: f.amparo as Amparo })),
    fechaDeJornada(),
  ).map((p) => ({
    id: p.id,
    obraId: p.obraId,
    obra: `${p.codigo} · ${p.nombre}`,
    amparo: p.amparo,
    aseguradora: p.aseguradora,
    numero: p.numero,
    hasta: p.hasta,
    vigencia: p.vigencia as 'por_vencer' | 'vencida',
    texto: p.texto,
  }));
}
