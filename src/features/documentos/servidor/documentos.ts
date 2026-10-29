/**
 * Los documentos de Elemental, OCC, Geolab y cada obra (spec 034). **Solo servidor.**
 *
 * ── Dónde ──
 *
 * Cada pedido trae su lugar: `?empresa=` (elemental, occ, geolab) o `?obraId=`. Quién
 * entra a cada uno lo dicen las mismas reglas del menú —`alcanzaLaEmpresa` y
 * `alcanzaLaObraDeLaRuta`—, así que el residente solo llega a su obra, el laboratorista
 * a Geolab y el Encargado de OCC a OCC (RF-3 a RF-7). Pedir otro lugar es un 403 que lo
 * dice (RF-51), no una lista vacía.
 *
 * ── Subir ──
 *
 * Una sola petición con el archivo y sus datos: se revisa todo (datos, tipo real y
 * tamaño, RF-24 a RF-29), después va el archivo a R2 y, al final, el archivo en `media`
 * y el documento en una sola escritura (`batch`): o quedan los dos o ninguno. Si se
 * corta entre R2 y la base, queda un objeto huérfano en el almacén, que no molesta, y
 * ningún documento que apunte a nada.
 *
 * ── Abrir y anular ──
 *
 * Un documento suelto (su archivo, anularlo) se alcanza con las mismas reglas que su
 * lugar (`documentoAlAlcance`). Lo que no se alcanza es «no existe», como el resto del
 * panel: confirmar que el id es real ya diría qué guarda otra empresa.
 *
 * ── De una persona (spec 035) ──
 *
 * Tercer dueño: `?personaId=`. Son los papeles de Recursos Humanos, así que los mueve el
 * permiso `rrhh` y no el de Documentos (`moduloDelDueno`): suben y anulan la gerencia y
 * la auxiliar (RF-6) —anular en Documentos es solo de la gerencia—, y consulta quien
 * alcanza a la persona (`alcanzaLaPersona`, RF-32). Una persona que no se alcanza es
 * «no existe», también al pedir su lista (RF-33).
 *
 * ── De una solicitud de compra (spec 036) ──
 *
 * Cuarto dueño: `?solicitudId=`. Son los soportes de la compra (RF-7, RF-17, RF-20):
 * cotizaciones, orden de compra, factura, remisión, fotos. Los alcanza quien alcanza la
 * solicitud (`solicitudAlAlcance`): quien ve Solicitudes de compra de ese lugar y Compras de
 * Elemental. Suben los que pueden pedir; anula solo la gerencia, como en Documentos. Al
 * almacenista no le llegan las clases con precio (`llevaPrecio`, RF-31): ni en la lista, ni
 * al abrirlas, y tampoco las sube, porque después no las vería.
 */
import { and, desc, eq, inArray, isNull } from 'drizzle-orm';
import { uuidv7 } from 'uuidv7';

import { baseServidor } from '@/db/servidor/cliente';
import { documentosDelGrupo, media, obras, usuarios } from '@/db/servidor/esquema';
import { solicitudAlAlcance } from '@/features/compras/servidor/solicitudes';
import { personaAlAlcance } from '@/features/rrhh/servidor/fichas';
import { claveDeObjeto, guardar } from '@/features/media/servidor/almacen';
import type { DocumentoDelLugar, DocumentosDelLugar } from '@/features/panel/contratos';
import type { PersonaEnSesion } from '@/features/servidor/guardia';
import { errorDePeticion, noEncontrado } from '@/features/servidor/respuestas';
import { aHex } from '@/shared/cripto/formato-pbkdf2';
import {
  BYTES_DE_FIRMA,
  estadoDelVencimiento,
  faltasDelDocumento,
  llevaPrecio,
  nombreDeClase,
  resumenDeVencimientos,
  revisarDocumento,
  TAMANO_MAXIMO_DE_DOCUMENTO,
  type LugarDeDocumentos,
} from '@/shared/rules/documentos';
import { alcanzaLaEmpresa, alcanzaLaObraDeLaRuta, esEmpresa } from '@/shared/rules/empresas';
import { alcanzaLaPersona } from '@/shared/rules/ficha';
import { fechaDeJornada } from '@/shared/rules/jornada';
import { veLosValores } from '@/shared/rules/compras';
import { alcanza, motivoDeRechazo, type ModuloConPermiso, type Rol } from '@/shared/rules/permisos';

/** El lugar de un pedido, ya comprobado: de quién son los documentos y qué clases lleva. */
export type DuenoDeDocumentos =
  | { tipo: 'empresa'; empresaId: 'elemental' | 'occ' | 'geolab'; lugar: LugarDeDocumentos }
  | { tipo: 'obra'; obraId: string; lugar: 'obra' }
  | { tipo: 'persona'; personaId: string; lugar: 'persona' }
  /** `sinPrecio`: quien pide no ve los valores, así que no le llegan las clases con precio. */
  | { tipo: 'solicitud'; solicitudId: string; lugar: 'solicitud'; sinPrecio: boolean };

/**
 * El lugar tal como llega en la dirección: `?empresa=`, `?obraId=`, `?personaId=` o
 * `?solicitudId=`.
 */
export interface LugarPedido {
  empresa: string | null;
  obraId: string | null;
  personaId: string | null;
  solicitudId: string | null;
}

export function lugarDeLaPeticion(peticion: Request): LugarPedido {
  const parametros = new URL(peticion.url).searchParams;
  return {
    empresa: parametros.get('empresa'),
    obraId: parametros.get('obraId'),
    personaId: parametros.get('personaId'),
    solicitudId: parametros.get('solicitudId'),
  };
}

/**
 * Qué fila de permisos manda sobre los documentos de ese lugar: los de una persona son
 * de Recursos Humanos (spec 035, RF-6); los de una solicitud de compra, de Compras de
 * Elemental para quien la tiene (gerencia y, de consulta, la auxiliar) y de Solicitudes
 * de compra para los demás (spec 036); los de una empresa o una obra, de Documentos.
 */
export function moduloDelDueno(lugar: { personaId: string | null; solicitudId?: string | null }, rol: Rol): ModuloConPermiso {
  if (lugar.solicitudId) return alcanza(rol, 'compras', 'ver') ? 'compras' : 'solicitudes';
  return lugar.personaId ? 'rrhh' : 'documentos';
}

const SIN_PERMISO = 'No tiene acceso a los documentos de ese lugar.';

/**
 * El lugar que se pidió, si quien pide entra a él (RF-3 a RF-7, RF-51). Una empresa, una
 * obra o una persona (spec 035), una sola; Proyectos no tiene documentos propios.
 */
export async function duenoDelPedido(
  sesion: PersonaEnSesion,
  pedido: LugarPedido,
): Promise<DuenoDeDocumentos | Response> {
  const { empresa, obraId, personaId, solicitudId } = pedido;
  if ([empresa, obraId, personaId, solicitudId].filter(Boolean).length !== 1) {
    return errorDePeticion('Diga de qué empresa, obra, persona o solicitud son los documentos.');
  }

  if (solicitudId) {
    // Como la persona: no alcanzarla es «no existe» (036/RF-29).
    if (!(await solicitudAlAlcance(sesion, solicitudId))) return noEncontrado('esa solicitud');
    return { tipo: 'solicitud', solicitudId, lugar: 'solicitud', sinPrecio: !veLosValores(sesion.rol) };
  }

  if (personaId) {
    // No alcanzarla es «no existe» (035/RF-33): un 403 diría que el id es de alguien.
    if (!(await personaAlAlcance(sesion, personaId))) return noEncontrado('esa persona');
    return { tipo: 'persona', personaId, lugar: 'persona' };
  }

  if (empresa) {
    if (!esEmpresa(empresa) || empresa === 'proyectos') return noEncontrado('esa empresa');
    if (!alcanzaLaEmpresa(sesion.rol, empresa)) return errorDePeticion(SIN_PERMISO, 403);
    return { tipo: 'empresa', empresaId: empresa, lugar: empresa };
  }

  const id = obraId as string;
  if (!alcanzaLaObraDeLaRuta(sesion, id)) return errorDePeticion(SIN_PERMISO, 403);
  const [obra] = await baseServidor().select({ id: obras.id }).from(obras).where(eq(obras.id, id)).limit(1);
  if (!obra) return noEncontrado('esa obra');
  return { tipo: 'obra', obraId: id, lugar: 'obra' };
}

function condicionDelDueno(dueno: DuenoDeDocumentos) {
  if (dueno.tipo === 'empresa') return eq(documentosDelGrupo.empresaId, dueno.empresaId);
  if (dueno.tipo === 'obra') return eq(documentosDelGrupo.obraId, dueno.obraId);
  if (dueno.tipo === 'solicitud') return eq(documentosDelGrupo.solicitudId, dueno.solicitudId);
  return eq(documentosDelGrupo.personaId, dueno.personaId);
}

/**
 * Los documentos del lugar, del más reciente al más antiguo por fecha (RF-31), con los
 * anulados marcados (la pantalla los oculta salvo que se pidan, RF-45) y el aviso de
 * vencimiento de hoy (RF-38 a RF-42). Filtrar y buscar lo hace la pantalla: son pocos
 * y así responde mientras se escribe.
 */
export async function documentosDelLugar(dueno: DuenoDeDocumentos): Promise<DocumentosDelLugar> {
  const db = baseServidor();
  const filas = await db
    .select({
      id: documentosDelGrupo.id,
      clase: documentosDelGrupo.clase,
      claseNombre: documentosDelGrupo.claseNombre,
      nombre: documentosDelGrupo.nombre,
      proveedor: documentosDelGrupo.proveedor,
      descripcion: documentosDelGrupo.descripcion,
      fecha: documentosDelGrupo.fecha,
      vence: documentosDelGrupo.vence,
      mediaId: documentosDelGrupo.mediaId,
      mime: media.mime,
      bytes: media.bytes,
      nombreArchivo: documentosDelGrupo.nombreArchivo,
      subidoPor: documentosDelGrupo.subidoPor,
      subidoEn: documentosDelGrupo.subidoEn,
      anuladoEn: documentosDelGrupo.anuladoEn,
      anuladoPor: documentosDelGrupo.anuladoPor,
      motivoAnulacion: documentosDelGrupo.motivoAnulacion,
    })
    .from(documentosDelGrupo)
    .innerJoin(media, eq(media.id, documentosDelGrupo.mediaId))
    .where(condicionDelDueno(dueno))
    .orderBy(desc(documentosDelGrupo.fecha), desc(documentosDelGrupo.subidoEn));

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

  const hoy = fechaDeJornada();
  // 036/RF-31: al almacenista no le llegan las clases con precio, ni contadas.
  const visibles = dueno.tipo === 'solicitud' && dueno.sinPrecio ? filas.filter((f) => !llevaPrecio(f.clase)) : filas;
  const documentos: DocumentoDelLugar[] = visibles.map((f) => ({
    id: f.id,
    clase: f.clase,
    claseNombre: f.claseNombre,
    nombre: f.nombre,
    proveedor: f.proveedor,
    descripcion: f.descripcion,
    fecha: f.fecha,
    vence: f.vence,
    aviso: estadoDelVencimiento({ vence: f.vence, anulado: Boolean(f.anuladoEn) }, hoy),
    mediaId: f.mediaId,
    mime: f.mime,
    bytes: f.bytes,
    nombreArchivo: f.nombreArchivo,
    subidoPor: nombres.get(f.subidoPor) ?? '',
    subidoEn: f.subidoEn.toISOString(),
    anulado: f.anuladoEn
      ? { en: f.anuladoEn.toISOString(), por: nombres.get(f.anuladoPor ?? '') ?? '', motivo: f.motivoAnulacion ?? '' }
      : null,
  }));

  return {
    documentos,
    resumen: resumenDeVencimientos(
      documentos.map((d) => ({ vence: d.vence, anulado: d.anulado !== null })),
      hoy,
    ),
  };
}

export interface DocumentoPedido {
  clase: string;
  nombre: string;
  proveedor: string;
  descripcion: string;
  fecha: string;
  vence: string | null;
}

/**
 * Sube un documento (RF-24 a RF-30): revisa los datos y el archivo, lo guarda en R2 y
 * escribe el archivo y el documento juntos.
 */
export async function subirDocumento(
  sesion: PersonaEnSesion,
  dueno: DuenoDeDocumentos,
  datos: DocumentoPedido,
  archivo: { nombre: string; contenido: Uint8Array<ArrayBuffer> },
): Promise<{ id: string } | Response> {
  const faltas = faltasDelDocumento(dueno.lugar, datos);
  if (dueno.tipo === 'solicitud' && dueno.sinPrecio && llevaPrecio(datos.clase)) {
    faltas.push('Esa clase lleva precios: la sube quien ve los valores de la compra.');
  }
  if (faltas.length) return errorDePeticion(faltas.join(' '), 422);

  const revision = revisarDocumento(
    archivo.nombre,
    archivo.contenido.byteLength,
    archivo.contenido.subarray(0, BYTES_DE_FIRMA),
  );
  if (!revision.ok) return errorDePeticion(revision.mensaje, revision.estado);

  const id = uuidv7();
  const mediaId = uuidv7();
  const clave = claveDeObjeto('repositorio', id, mediaId, revision.mime);
  await guardar(clave, archivo.contenido, revision.mime);
  const huella = aHex(new Uint8Array(await crypto.subtle.digest('SHA-256', archivo.contenido)));

  const db = baseServidor();
  await db.batch([
    db.insert(media).values({
      id: mediaId,
      duenoTipo: 'repositorio',
      duenoId: id,
      proposito: 'evidencia',
      mime: revision.mime,
      bytes: archivo.contenido.byteLength,
      sha256: huella,
      claveR2: clave,
      subidoEn: new Date(),
    }),
    db.insert(documentosDelGrupo).values({
      id,
      empresaId: dueno.tipo === 'empresa' ? dueno.empresaId : null,
      obraId: dueno.tipo === 'obra' ? dueno.obraId : null,
      personaId: dueno.tipo === 'persona' ? dueno.personaId : null,
      solicitudId: dueno.tipo === 'solicitud' ? dueno.solicitudId : null,
      clase: datos.clase,
      claseNombre: nombreDeClase(dueno.lugar, datos.clase) ?? datos.clase,
      nombre: datos.nombre.trim(),
      proveedor: datos.proveedor.trim(),
      descripcion: datos.descripcion.trim(),
      fecha: datos.fecha,
      vence: datos.vence,
      mediaId,
      nombreArchivo: archivo.nombre.trim(),
      subidoPor: sesion.id,
    }),
  ]);
  return { id };
}

/** Lo más que puede pesar el cuerpo de una subida: el archivo y unos pocos datos. */
export const CUERPO_MAXIMO_DE_SUBIDA = TAMANO_MAXIMO_DE_DOCUMENTO + 64 * 1024;

/** Para no leer en memoria lo que ya se sabe que se va a rechazar. */
export function cuerpoDemasiadoGrande(peticion: Request): boolean {
  const largo = Number(peticion.headers.get('content-length') ?? 0);
  return largo > CUERPO_MAXIMO_DE_SUBIDA;
}

/**
 * Un documento, si quien pregunta lo alcanza: puede ver Documentos y entra a su empresa
 * o a su obra (RF-3 a RF-7, RF-51); o, si es de una persona, alcanza a esa persona en
 * Recursos Humanos (035/RF-32). `null` si no existe o no le toca. `modulo` es la fila de
 * permisos que manda sobre él, para anularlo.
 */
export async function documentoAlAlcance(
  sesion: PersonaEnSesion,
  id: string,
): Promise<{ id: string; nombreArchivo: string; anulado: boolean; modulo: ModuloConPermiso } | null> {
  const [fila] = await baseServidor()
    .select({
      id: documentosDelGrupo.id,
      empresaId: documentosDelGrupo.empresaId,
      obraId: documentosDelGrupo.obraId,
      personaId: documentosDelGrupo.personaId,
      solicitudId: documentosDelGrupo.solicitudId,
      clase: documentosDelGrupo.clase,
      nombreArchivo: documentosDelGrupo.nombreArchivo,
      anuladoEn: documentosDelGrupo.anuladoEn,
      // La persona dueña, si la hay: con un `left join`, nula en los demás.
      personaRol: usuarios.rol,
      personaEmpresa: usuarios.empresa,
      personaObraId: usuarios.obraId,
    })
    .from(documentosDelGrupo)
    .leftJoin(usuarios, eq(usuarios.id, documentosDelGrupo.personaId))
    .where(eq(documentosDelGrupo.id, id))
    .limit(1);
  if (!fila) return null;
  const modulo = moduloDelDueno(fila, sesion.rol);
  let entra: boolean;
  if (fila.solicitudId) {
    // 036/RF-29, RF-31: quien alcanza la solicitud; las clases con precio, solo quien ve los valores.
    entra =
      (await solicitudAlAlcance(sesion, fila.solicitudId)) !== null && (veLosValores(sesion.rol) || !llevaPrecio(fila.clase));
  } else if (fila.personaId) {
    entra =
      fila.personaRol !== null &&
      alcanzaLaPersona(sesion, { rol: fila.personaRol, empresa: fila.personaEmpresa, obraId: fila.personaObraId });
  } else {
    entra =
      alcanza(sesion.rol, 'documentos', 'ver') &&
      (fila.empresaId
        ? alcanzaLaEmpresa(sesion.rol, fila.empresaId)
        : fila.obraId !== null && alcanzaLaObraDeLaRuta(sesion, fila.obraId));
  }
  return entra ? { id: fila.id, nombreArchivo: fila.nombreArchivo, anulado: fila.anuladoEn !== null, modulo } : null;
}

/**
 * Anular un documento, con motivo (RF-43, RF-44). Exige `anular` en la fila que manda
 * sobre él: en Documentos, solo la gerencia; los de una persona, también la auxiliar
 * (035/RF-6). Sigue en la lista, marcado (RF-46). Si otra persona lo anuló primero, se
 * dice (409) en vez de pisar su motivo.
 */
export async function anularDocumento(
  sesion: PersonaEnSesion,
  id: string,
  motivo: string,
): Promise<{ id: string } | Response> {
  const documento = await documentoAlAlcance(sesion, id);
  if (!documento) return noEncontrado('ese documento');
  if (!alcanza(sesion.rol, documento.modulo, 'anular')) {
    return errorDePeticion(motivoDeRechazo(documento.modulo, 'anular'), 403);
  }
  if (documento.anulado) return errorDePeticion('Ese documento ya está anulado.', 409);
  const [anulado] = await baseServidor()
    .update(documentosDelGrupo)
    .set({ anuladoEn: new Date(), anuladoPor: sesion.id, motivoAnulacion: motivo })
    .where(and(eq(documentosDelGrupo.id, id), isNull(documentosDelGrupo.anuladoEn)))
    .returning({ id: documentosDelGrupo.id });
  return anulado ?? errorDePeticion('Ese documento ya está anulado.', 409);
}

/**
 * La cabecera que hace que el navegador lo abra (PDF e imágenes, RF-35) o lo guarde
 * (`descargar`, RF-36) con su nombre original. `filename*` lleva el nombre entero, con
 * tildes; `filename`, una versión sin ellas para los navegadores que no leen el otro.
 */
export function disposicionDelArchivo(nombreArchivo: string, descargar: boolean): string {
  const simple = nombreArchivo
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\x20-\x7e]|["\\]/g, '_');
  return `${descargar ? 'attachment' : 'inline'}; filename="${simple}"; filename*=UTF-8''${encodeURIComponent(nombreArchivo)}`;
}
