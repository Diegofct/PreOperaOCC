/**
 * Las «Fotos del día» de una bitácora, desde WhatsApp (spec 027). **Solo servidor.**
 *
 * ── Por día, no por mensaje ──
 *
 * `sincronizarFotosDelDia` mira todas las fotos de la obra y el día y agrega las que
 * falten. No depende de cómo se guardó cada mensaje: una foto de un mensaje de
 * seguimiento también entra (RF-1), y la que llega antes que su mensaje se agrega la
 * próxima vez que se mire el día (RF-10). Se puede llamar desde varios sitios —el armado
 * de la bitácora, la llegada de un archivo, el pulso— sin miedo: es idempotente.
 *
 * ── Sin choque ──
 *
 * Agregar es un `insert … on conflict do nothing` en `bitacora_fotos`: no reescribe el
 * JSON de la bitácora, así que no compite con `guardarEnBitacora` ni produce el «Alguien
 * guardó la bitácora…» con que el 8-oct quedaron seis fotos en «No se pudo guardar» (RF-9).
 *
 * Qué foto entra lo decide la regla pura `fotoEntraALaBitacora` (`shared/rules/fotos-del-dia`).
 */
import {
  and,
  asc,
  eq,
  inArray,
  isNull,
  like,
  sql,
  type SQL,
} from "drizzle-orm";

import { baseServidor } from "@/db/servidor/cliente";
import {
  bitacoraFotos,
  media,
  partesDeObra,
  usuarios,
  whatsappExcepciones,
  whatsappGrupos,
  whatsappMensajes,
} from "@/db/servidor/esquema";
import type {
  FotoDelDiaFila,
  FotosDelDiaFila,
} from "@/features/panel/contratos";
import {
  fotoEntraALaBitacora,
  fotosParaAgregar,
  unificarFotosDelDia,
  type FotoCandidata,
} from "@/shared/rules/fotos-del-dia";
import { etiquetaDeCategoria } from "@/shared/rules/whatsapp";

import { apartar } from "./apartados";
import { idDeterminista } from "./ids";
import { obraDelMensaje } from "./obra";

/**
 * El día de la foto (RF-2): el del hecho que se fijó al guardar el mensaje y, si el mensaje
 * no pasa por la bitácora —un seguimiento queda `ignorado` y nunca recibe ese día—, el que
 * reconoció la IA. Nunca el día en que se mandó. Sin ninguno de los dos, la foto no tiene
 * día y no entra (RF-10).
 */
export const diaDeLaFoto: SQL<string | null> = sql<string | null>`coalesce(
  ${whatsappMensajes.fechaHecho}::text,
  case when ${whatsappMensajes.propuestaIa}->>'fecha_evento' ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$'
       then ${whatsappMensajes.propuestaIa}->>'fecha_evento' end)`;

/** El motivo con que se aparta la foto que llega a una bitácora cerrada (RF-21). */
export const MOTIVO_BITACORA_CERRADA =
  "La bitácora de ese día ya estaba cerrada";

/** Lo que hizo una sincronización: cuántas fotos agregó y cuántas apartó. */
export interface FotosSincronizadas {
  agregadas: number;
  apartadas: number;
}

/**
 * Pone en la bitácora de la obra y el día las fotos de WhatsApp que le faltan (RF-1, RF-2,
 * RF-8, RF-9, RF-12, RF-27), y aparta las que llegaron con la bitácora ya cerrada (RF-21).
 * Sin bitácora vigente no hace nada: las fotos entran cuando se arme.
 */
export async function sincronizarFotosDelDia(
  obraId: string,
  fecha: string,
  opciones: {
    /** Solo cuenta lo que haría, sin escribir nada: el modo lectura de los días pasados (T10). */
    simular?: boolean;
    /** No aparta las de bitácora cerrada: los días pasados solo agregan a las abiertas (RF-31). */
    sinApartar?: boolean;
  } = {},
): Promise<FotosSincronizadas> {
  const db = baseServidor();
  const nada = { agregadas: 0, apartadas: 0 };

  const [parte] = await db
    .select({ id: partesDeObra.id, cerradoEn: partesDeObra.cerradoEn })
    .from(partesDeObra)
    .where(
      and(
        eq(partesDeObra.obraId, obraId),
        eq(partesDeObra.fecha, fecha),
        isNull(partesDeObra.anuladoEn),
      ),
    )
    .limit(1);
  if (!parte) return nada;

  // Las fotos de WhatsApp de la obra con ese día del hecho (RF-2), con lo que la regla mira.
  const candidatas: FotoCandidata[] = (
    await db
      .select({
        mediaId: media.id,
        mensajeId: whatsappMensajes.id,
        mime: media.mime,
        categoria: whatsappMensajes.categoria,
        fechaHecho: diaDeLaFoto,
        sha256: media.sha256,
        recibidaEn: media.recibidoEn,
      })
      .from(media)
      .innerJoin(whatsappMensajes, eq(whatsappMensajes.id, media.duenoId))
      .innerJoin(
        whatsappGrupos,
        eq(whatsappGrupos.id, whatsappMensajes.grupoId),
      )
      .where(
        and(
          eq(media.duenoTipo, "whatsapp"),
          sql`${media.claveR2} is not null`,
          like(media.mime, "image/%"),
          sql`${diaDeLaFoto} = ${fecha}`,
          sql`${obraDelMensaje} = ${obraId}`,
        ),
      )
      .orderBy(asc(media.recibidoEn))
  ).map(({ recibidaEn, ...f }) => ({
    ...f,
    recibidaEnMs: recibidaEn.getTime(),
  }));
  if (candidatas.length === 0) return nada;

  const bitacora = { fecha, cerradaEnMs: parte.cerradoEn?.getTime() ?? null };
  const decididas = candidatas.map((foto) => ({
    foto,
    decision: fotoEntraALaBitacora(foto, bitacora),
  }));

  // Lo que ya está: las filas de la sección —agregadas o quitadas— y la foto principal, que
  // no se repite (RF-12) aunque haya llegado por otro mensaje.
  const yaEstan = [
    ...(await db
      .select({ mediaId: bitacoraFotos.mediaId, sha256: bitacoraFotos.sha256 })
      .from(bitacoraFotos)
      .where(eq(bitacoraFotos.parteId, parte.id))),
    ...(await db
      .select({ mediaId: media.id, sha256: media.sha256 })
      .from(media)
      .where(
        and(
          eq(media.duenoTipo, "bitacora"),
          eq(media.duenoId, parte.id),
          isNull(media.itemKey),
        ),
      )),
  ];

  const nuevas = fotosParaAgregar(
    decididas.filter((d) => d.decision === "agregar").map((d) => d.foto),
    yaEstan,
    null,
  );
  const deCerrada = decididas
    .filter((d) => d.decision === "apartar_cerrada")
    .map((d) => d.foto);
  if (opciones.simular)
    return {
      agregadas: nuevas.length,
      apartadas: opciones.sinApartar ? 0 : deCerrada.length,
    };

  if (nuevas.length > 0) {
    await db
      .insert(bitacoraFotos)
      .values(
        await Promise.all(
          nuevas.map(async (f) => ({
            id: await idDeterminista(parte.id, "foto-del-dia", f.mediaId),
            parteId: parte.id,
            mediaId: f.mediaId,
            mensajeId: f.mensajeId,
            sha256: f.sha256,
          })),
        ),
      )
      .onConflictDoNothing();
  }

  const apartadas = opciones.sinApartar
    ? 0
    : await apartarLasDeBitacoraCerrada(deCerrada, candidatas);
  return { agregadas: nuevas.length, apartadas };
}

/**
 * Las fotos que llegaron con la bitácora ya cerrada, a «No se pudo guardar» (RF-21), con
 * la sección `fotos` y su lugar entre las fotos del mensaje como renglón: el id del
 * apartado sale de ahí, así que mirar el día otra vez no lo duplica.
 *
 * Si al mensaje ya se le apartó entero por la bitácora cerrada (`actualizarDia`), su foto
 * no se aparta otra vez: serían dos avisos del mismo mensaje por la misma razón.
 */
async function apartarLasDeBitacoraCerrada(
  fotos: readonly FotoCandidata[],
  candidatas: readonly FotoCandidata[],
): Promise<number> {
  if (fotos.length === 0) return 0;
  const mensajes = [...new Set(fotos.map((f) => f.mensajeId))];
  const yaAvisados = new Set(
    (
      await baseServidor()
        .select({ mensajeId: whatsappExcepciones.mensajeId })
        .from(whatsappExcepciones)
        .where(
          and(
            inArray(whatsappExcepciones.mensajeId, mensajes),
            eq(whatsappExcepciones.seccion, "bitacora"),
            isNull(whatsappExcepciones.renglon),
          ),
        )
    ).map((e) => e.mensajeId),
  );

  let apartadas = 0;
  for (const mensajeId of mensajes) {
    if (yaAvisados.has(mensajeId)) continue;
    // El orden de las fotos del mensaje, por llegada: es estable entre una mirada y otra.
    const delMensaje = candidatas
      .filter((c) => c.mensajeId === mensajeId)
      .map((c) => c.mediaId);
    const suyas = fotos.filter((f) => f.mensajeId === mensajeId);
    await apartar(
      mensajeId,
      suyas.map((f) => ({
        seccion: "fotos",
        renglon: delMensaje.indexOf(f.mediaId),
        motivo: MOTIVO_BITACORA_CERRADA,
        datos: { mediaId: f.mediaId },
      })),
    );
    apartadas += suyas.length;
  }
  return apartadas;
}

/** El id con que la sección nombra una principal vieja que todavía no tiene fila en la lista. */
const PREFIJO_PRINCIPAL = "principal:";

/** Una fila de la sección con lo que necesita la regla para juntarla (hora y huella). */
type FilaDeSeccion = Omit<FotoDelDiaFila, never> & { horaMs: number; sha256: string | null };

/**
 * La sección «Fotografía del día» de una bitácora, como la muestra el panel (RF-14 a RF-17,
 * RF-19, RF-25; cambio del 2026-10-14, RF-34 a RF-38): las de la lista —por WhatsApp o
 * subidas en el panel— y las principales viejas, juntas por `unificarFotosDelDia`. Cuántas
 * quedan en `fotos` es la fotografía del día que cuenta el cierre (RF-41).
 *
 * Una principal vieja sale con los datos de su foto de WhatsApp si la hay (misma huella); si
 * no, como «Subida en el panel». El alcance por obra lo comprueba la ruta antes de llamar aquí.
 */
export async function fotosDeLaBitacora(
  parteId: string,
): Promise<FotosDelDiaFila> {
  const db = baseServidor();

  const deLaLista = await db
    .select({
      id: bitacoraFotos.id,
      mediaId: bitacoraFotos.mediaId,
      sha256: sql<string | null>`coalesce(${bitacoraFotos.sha256}, ${media.sha256})`,
      subidaEn: media.subidoEn,
      recibidaEn: media.recibidoEn,
      mensajeId: bitacoraFotos.mensajeId,
      autorNombre: whatsappMensajes.autorNombre,
      enviadoEn: whatsappMensajes.enviadoEn,
      categoria: whatsappMensajes.categoria,
      descripcion: sql<string | null>`${whatsappMensajes.propuestaIa}->>'resumen'`,
      quitadaEn: bitacoraFotos.quitadaEn,
      quitadaPor: usuarios.nombreCompleto,
      motivoQuitada: bitacoraFotos.motivoQuitada,
    })
    .from(bitacoraFotos)
    .innerJoin(media, eq(media.id, bitacoraFotos.mediaId))
    .leftJoin(whatsappMensajes, eq(whatsappMensajes.id, bitacoraFotos.mensajeId))
    .leftJoin(usuarios, eq(usuarios.id, bitacoraFotos.quitadaPor))
    .where(eq(bitacoraFotos.parteId, parteId));

  const principales = await db
    .select({
      mediaId: media.id,
      sha256: media.sha256,
      subidaEn: media.subidoEn,
      recibidaEn: media.recibidoEn,
    })
    .from(media)
    .where(
      and(
        eq(media.duenoTipo, "bitacora"),
        eq(media.duenoId, parteId),
        isNull(media.itemKey),
      ),
    );

  // De dónde salió cada principal vieja: la foto de WhatsApp con su misma huella, si la hay.
  const huellas = principales
    .map((p) => p.sha256)
    .filter((h): h is string => h !== null);
  const origenes = new Map(
    (huellas.length === 0
      ? []
      : await db
          .select({
            sha256: media.sha256,
            autorNombre: whatsappMensajes.autorNombre,
            enviadoEn: whatsappMensajes.enviadoEn,
            categoria: whatsappMensajes.categoria,
            descripcion: sql<string | null>`${whatsappMensajes.propuestaIa}->>'resumen'`,
          })
          .from(media)
          .innerJoin(whatsappMensajes, eq(whatsappMensajes.id, media.duenoId))
          .where(and(eq(media.duenoTipo, "whatsapp"), inArray(media.sha256, huellas)))
    ).map((o) => [o.sha256, o] as const),
  );

  /** Los datos de una foto que llegó por WhatsApp, del mensaje que la trajo (RF-14 a RF-17). */
  const deWhatsapp = (m: {
    autorNombre: string | null;
    enviadoEn: Date;
    categoria: string | null;
    descripcion: string | null;
  }) => ({
    origen: "whatsapp" as const,
    autorNombre: m.autorNombre,
    enviadoEn: m.enviadoEn.toISOString(),
    tipo: etiquetaDeCategoria(m.categoria),
    descripcion: m.descripcion,
    horaMs: m.enviadoEn.getTime(),
  });
  /** Los de una subida en el panel: sin autor ni descripción, con su hora de subida (RF-38). */
  const delPanel = (subidaEn: Date) => ({
    origen: "panel" as const,
    autorNombre: null,
    enviadoEn: subidaEn.toISOString(),
    tipo: "Subida en el panel",
    descripcion: null,
    horaMs: subidaEn.getTime(),
  });

  const lista: FilaDeSeccion[] = deLaLista.map((f) => ({
    id: f.id,
    mediaId: f.mediaId,
    sha256: f.sha256,
    quitada: f.quitadaEn
      ? {
          por: f.quitadaPor,
          en: f.quitadaEn.toISOString(),
          motivo: f.motivoQuitada ?? "",
        }
      : null,
    ...(f.mensajeId && f.enviadoEn
      ? deWhatsapp({ ...f, enviadoEn: f.enviadoEn })
      : delPanel(f.subidaEn ?? f.recibidaEn)),
  }));

  const viejas: FilaDeSeccion[] = principales.map((p) => {
    const origen = p.sha256 ? origenes.get(p.sha256) : undefined;
    return {
      id: `${PREFIJO_PRINCIPAL}${p.mediaId}`,
      mediaId: p.mediaId,
      sha256: p.sha256,
      quitada: null,
      ...(origen ? deWhatsapp(origen) : delPanel(p.subidaEn ?? p.recibidaEn)),
    };
  });

  // La regla quiere `quitada` booleano; la pantalla, el objeto. Se cruzan por id.
  const porId = new Map([...lista, ...viejas].map((f) => [f.id, f]));
  const paraLaRegla = (f: FilaDeSeccion) => ({ ...f, quitada: f.quitada !== null });
  const { fotos, quitadas } = unificarFotosDelDia(
    lista.map(paraLaRegla),
    viejas.map(paraLaRegla),
  );
  const aFila = ({ id }: { id: string }): FotoDelDiaFila => {
    const { horaMs, sha256, ...fila } = porId.get(id)!;
    void horaMs;
    void sha256;
    return fila;
  };
  return { fotos: fotos.map(aFila), quitadas: quitadas.map(aFila) };
}

/**
 * Pone en la lista una foto del día subida en el panel (cambio del 2026-10-14, RF-34, RF-39):
 * así se ve, se cuenta y se quita como las de WhatsApp. Sin mensaje: su hora es la de subida.
 */
export async function agregarSubidaALaLista(datos: {
  parteId: string;
  mediaId: string;
  sha256: string;
}): Promise<void> {
  await baseServidor()
    .insert(bitacoraFotos)
    .values({
      id: await idDeterminista(datos.parteId, "foto-del-dia", datos.mediaId),
      parteId: datos.parteId,
      mediaId: datos.mediaId,
      mensajeId: null,
      sha256: datos.sha256,
    })
    .onConflictDoNothing();
}

/** Lo que pasó al quitar una foto. */
export type FotoQuitadaResultado =
  "quitada" | "no_existe" | "ya_quitada" | "cerrada";

/**
 * Quita una foto de la sección (RF-22 a RF-28, RF-39). Un solo `update` condicional —Neon por
 * HTTP no da transacciones interactivas—: solo si la foto es de esa bitácora, no estaba quitada
 * y la bitácora sigue abierta. Si no cambió nada, se lee por qué, para que dos personas a la vez
 * reciban «ya estaba quitada» y no un error genérico.
 *
 * Una principal vieja sin fila (`principal:<mediaId>`) se quita creando su fila ya quitada, con
 * un solo `insert` condicional: así queda el quién, cuándo y por qué como cualquier otra.
 */
export async function quitarFoto(datos: {
  parteId: string;
  fotoId: string;
  motivo: string;
  quien: string;
}): Promise<FotoQuitadaResultado> {
  const db = baseServidor();
  const abierta = sql`exists (select 1 from ${partesDeObra} p where p.id = ${datos.parteId}
                    and p.cerrado_en is null and p.anulado_en is null)`;

  if (datos.fotoId.startsWith(PREFIJO_PRINCIPAL)) {
    const mediaId = datos.fotoId.slice(PREFIJO_PRINCIPAL.length);
    const id = await idDeterminista(datos.parteId, "foto-del-dia", mediaId);
    const creada = await db.execute(sql`
      insert into ${bitacoraFotos} (id, parte_id, media_id, mensaje_id, sha256, quitada_en, quitada_por, motivo_quitada)
      select ${id}, ${datos.parteId}, m.id, null, m.sha256, now(), ${datos.quien}, ${datos.motivo}
      from ${media} m
      where m.id = ${mediaId} and m.dueno_tipo = 'bitacora' and m.dueno_id = ${datos.parteId}
        and m.item_key is null and ${abierta}
      on conflict do nothing
      returning id`);
    if (creada.rows.length > 0) return "quitada";
    const [fila] = await db
      .select({ quitadaEn: bitacoraFotos.quitadaEn })
      .from(bitacoraFotos)
      .where(eq(bitacoraFotos.id, id))
      .limit(1);
    if (fila?.quitadaEn) return "ya_quitada";
    const [principal] = await db
      .select({ id: media.id })
      .from(media)
      .where(
        and(
          eq(media.id, mediaId),
          eq(media.duenoTipo, "bitacora"),
          eq(media.duenoId, datos.parteId),
          isNull(media.itemKey),
        ),
      )
      .limit(1);
    return principal ? "cerrada" : "no_existe";
  }

  const [quitada] = await db
    .update(bitacoraFotos)
    .set({
      quitadaEn: new Date(),
      quitadaPor: datos.quien,
      motivoQuitada: datos.motivo,
    })
    .where(
      and(
        eq(bitacoraFotos.id, datos.fotoId),
        eq(bitacoraFotos.parteId, datos.parteId),
        isNull(bitacoraFotos.quitadaEn),
        abierta,
      ),
    )
    .returning({ id: bitacoraFotos.id });
  if (quitada) return "quitada";

  const [foto] = await db
    .select({ quitadaEn: bitacoraFotos.quitadaEn })
    .from(bitacoraFotos)
    .where(
      and(
        eq(bitacoraFotos.id, datos.fotoId),
        eq(bitacoraFotos.parteId, datos.parteId),
      ),
    )
    .limit(1);
  if (!foto) return "no_existe";
  return foto.quitadaEn ? "ya_quitada" : "cerrada";
}
