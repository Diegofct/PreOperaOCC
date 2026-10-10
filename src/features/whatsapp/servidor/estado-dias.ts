/**
 * Lo que el panel ve y hace con el guardado automático por día (spec 024, RF-37 a
 * RF-42, RF-48, RF-55 a RF-57). **Solo servidor.**
 *
 *  · El estado de cada día: qué reportes esperados llegaron, de quién y a qué hora, y
 *    si la bitácora está en espera, armada, incompleta o cerrada.
 *  · «Guardar con lo que hay»: armar la bitácora de un día antes de la hora límite.
 *  · La lista de reportes esperados de una obra: la lee el residente, la cambia la
 *    gerencia.
 *
 * El alcance por obra es el de siempre: la gerencia ve todas; el residente, la suya,
 * y otra obra «no existe» para él (404), como en el resto del panel.
 */
import { and, asc, between, desc, eq, inArray, isNull, sql } from 'drizzle-orm';
import { uuidv7 } from 'uuidv7';

import { baseServidor } from '@/db/servidor/cliente';
import {
  obras,
  partesDeObra,
  whatsappDias,
  whatsappGrupos,
  whatsappMensajes,
  whatsappReportesEsperados,
} from '@/db/servidor/esquema';
import type {
  DiaDeWhatsapp,
  ReporteEsperadoFila,
  ReportesEsperadosDeLaObra,
  reportesEsperadosPedido,
} from '@/features/panel/contratos';
import { veTodasLasObras } from '@/features/servidor/alcance';
import type { PersonaEnSesion } from '@/features/servidor/guardia';
import { errorDePeticion, noEncontrado } from '@/features/servidor/respuestas';
import { fechaDeJornada } from '@/shared/rules/jornada';

import { armarBitacora } from './dias';
import { obraDelMensaje } from './obra';

import type { z } from 'zod';

/** Cuántos días hacia atrás muestra el estado si no se pide un rango. */
const DIAS_POR_DEFECTO = 7;

/**
 * La obra que puede consultar la sesión: la pedida si es gerencia, la suya si es
 * residente. `Response` 404 si el residente pide otra; `null` si la gerencia no pidió
 * ninguna (todas).
 */
function obraAlAlcance(sesion: PersonaEnSesion, pedida: string | null): string | null | Response {
  if (veTodasLasObras(sesion)) return pedida;
  if (!sesion.obraId) return noEncontrado('esa obra');
  if (pedida && pedida !== sesion.obraId) return noEncontrado('esa obra');
  return sesion.obraId;
}

/** «280036280139944@lid» y «280036280139944» son el mismo autor. */
function autorLimpio(autor: string | null): string {
  return (autor ?? '').split('@')[0].trim();
}

/** El estado de los días de una obra (o de todas, para la gerencia) en un rango (RF-55 a RF-57). */
export async function leerDias(
  sesion: PersonaEnSesion,
  filtro: { obraId: string | null; desde: string | null; hasta: string | null },
): Promise<DiaDeWhatsapp[] | Response> {
  const obraId = obraAlAlcance(sesion, filtro.obraId);
  if (obraId instanceof Response) return obraId;

  const hasta = filtro.hasta ?? fechaDeJornada();
  const desde =
    filtro.desde ??
    new Date(Date.parse(`${hasta}T00:00:00Z`) - (DIAS_POR_DEFECTO - 1) * 86_400_000).toISOString().slice(0, 10);
  const db = baseServidor();

  const dias = await db
    .select({
      obraId: whatsappDias.obraId,
      obraNombre: obras.nombre,
      fecha: whatsappDias.fecha,
      estado: whatsappDias.estado,
      parteId: whatsappDias.parteId,
    })
    .from(whatsappDias)
    .innerJoin(obras, eq(obras.id, whatsappDias.obraId))
    .where(and(between(whatsappDias.fecha, desde, hasta), obraId ? eq(whatsappDias.obraId, obraId) : undefined))
    .orderBy(desc(whatsappDias.fecha), asc(obras.nombre));
  if (dias.length === 0) return [];

  const obrasDeLosDias = [...new Set(dias.map((d) => d.obraId))];
  const [esperados, recibidos, partes] = await Promise.all([
    db
      .select({
        obraId: whatsappReportesEsperados.obraId,
        tipoReporte: whatsappReportesEsperados.tipoReporte,
        autorId: whatsappReportesEsperados.autorId,
        autorNombre: whatsappReportesEsperados.autorNombre,
      })
      .from(whatsappReportesEsperados)
      .where(and(inArray(whatsappReportesEsperados.obraId, obrasDeLosDias), isNull(whatsappReportesEsperados.eliminadoEn))),
    db
      .select({
        obraId: sql<string>`${obraDelMensaje}`,
        fecha: whatsappMensajes.fechaHecho,
        tipoReporte: whatsappMensajes.tipoReporte,
        autorId: whatsappMensajes.autorId,
        autorNombre: whatsappMensajes.autorNombre,
        enviadoEn: whatsappMensajes.enviadoEn,
        estado: whatsappMensajes.estado,
      })
      .from(whatsappMensajes)
      .innerJoin(whatsappGrupos, eq(whatsappGrupos.id, whatsappMensajes.grupoId))
      .where(
        and(
          between(whatsappMensajes.fechaHecho, desde, hasta),
          inArray(whatsappMensajes.estado, ['en_espera', 'guardado']),
          sql`${obraDelMensaje} in ${obrasDeLosDias}`,
        ),
      )
      .orderBy(asc(whatsappMensajes.enviadoEn)),
    db
      .select({ obraId: partesDeObra.obraId, fecha: partesDeObra.fecha, id: partesDeObra.id, cerradoEn: partesDeObra.cerradoEn })
      .from(partesDeObra)
      .where(
        and(
          inArray(partesDeObra.obraId, obrasDeLosDias),
          between(partesDeObra.fecha, desde, hasta),
          isNull(partesDeObra.anuladoEn),
        ),
      ),
  ]);

  return dias.map((dia) => {
    const delDia = recibidos.filter((r) => r.obraId === dia.obraId && r.fecha === dia.fecha);
    const parte = partes.find((p) => p.obraId === dia.obraId && p.fecha === dia.fecha);
    return {
      obraId: dia.obraId,
      obraNombre: dia.obraNombre,
      fecha: dia.fecha,
      estado: parte?.cerradoEn ? 'cerrada' : dia.estado,
      parteId: parte?.id ?? dia.parteId,
      reportes: esperados
        .filter((e) => e.obraId === dia.obraId)
        .map((e) => {
          const llego = delDia.find(
            (r) =>
              r.tipoReporte === e.tipoReporte &&
              (e.autorId === null || autorLimpio(r.autorId) === autorLimpio(e.autorId)),
          );
          return {
            tipoReporte: e.tipoReporte,
            autorId: e.autorId,
            autorNombre: e.autorNombre,
            recibido: !!llego,
            recibidoDe: llego?.autorNombre ?? null,
            recibidoEn: llego?.enviadoEn.toISOString() ?? null,
          };
        }),
      enEspera: delDia.filter((r) => r.estado === 'en_espera').length,
    } satisfies DiaDeWhatsapp;
  });
}

/**
 * «Guardar con lo que hay»: arma la bitácora de un día con lo que llegó, antes de la
 * hora límite (RF-48). 409 si ya está armada o cerrada, o si no hay nada esperando.
 */
export async function armarAMano(
  sesion: PersonaEnSesion,
  obraPedida: string,
  fecha: string,
): Promise<{ parteId: string | null; llevados: number } | Response> {
  const obraId = obraAlAlcance(sesion, obraPedida);
  if (obraId instanceof Response) return obraId;
  if (!obraId || !/^\d{4}-\d{2}-\d{2}$/.test(fecha)) return noEncontrado('ese día');

  const db = baseServidor();
  const [dia] = await db
    .select({ estado: whatsappDias.estado })
    .from(whatsappDias)
    .where(and(eq(whatsappDias.obraId, obraId), eq(whatsappDias.fecha, fecha)))
    .limit(1);
  if (!dia) return noEncontrado('ese día');

  const [parte] = await db
    .select({ cerradoEn: partesDeObra.cerradoEn })
    .from(partesDeObra)
    .where(and(eq(partesDeObra.obraId, obraId), eq(partesDeObra.fecha, fecha), isNull(partesDeObra.anuladoEn)))
    .limit(1);
  if (parte?.cerradoEn) {
    return errorDePeticion(`La bitácora del ${fecha} ya está cerrada.`, 409);
  }
  if (dia.estado !== 'en_espera') {
    return errorDePeticion(`La bitácora del ${fecha} ya está armada.`, 409);
  }

  const resultado = await armarBitacora(obraId, fecha, 'a_mano', sesion);
  if (resultado.llevados === 0) {
    return errorDePeticion('No hay reportes de ese día esperando la bitácora.', 409);
  }
  return resultado;
}

/** La lista de reportes esperados de una obra, y quiénes escriben en sus grupos (RF-37, RF-42). */
export async function leerEsperados(
  sesion: PersonaEnSesion,
  obraPedida: string | null,
): Promise<ReportesEsperadosDeLaObra | Response> {
  const obraId = obraAlAlcance(sesion, obraPedida);
  if (obraId instanceof Response) return obraId;
  if (!obraId) return errorDePeticion('Elija la obra.', 400);

  const db = baseServidor();
  const [esperados, autores] = await Promise.all([
    db
      .select({
        tipoReporte: whatsappReportesEsperados.tipoReporte,
        autorId: whatsappReportesEsperados.autorId,
        autorNombre: whatsappReportesEsperados.autorNombre,
      })
      .from(whatsappReportesEsperados)
      .where(and(eq(whatsappReportesEsperados.obraId, obraId), isNull(whatsappReportesEsperados.eliminadoEn)))
      .orderBy(asc(whatsappReportesEsperados.creadoEn)),
    db
      .selectDistinctOn([whatsappMensajes.autorId], {
        autorId: whatsappMensajes.autorId,
        autorNombre: whatsappMensajes.autorNombre,
      })
      .from(whatsappMensajes)
      .innerJoin(whatsappGrupos, eq(whatsappGrupos.id, whatsappMensajes.grupoId))
      .where(eq(whatsappGrupos.obraId, obraId))
      .orderBy(whatsappMensajes.autorId, desc(whatsappMensajes.enviadoEn)),
  ]);
  return {
    obraId,
    esperados,
    autores: autores
      .map((a) => ({ autorId: autorLimpio(a.autorId), autorNombre: a.autorNombre }))
      .sort((a, b) => (a.autorNombre ?? a.autorId).localeCompare(b.autorNombre ?? b.autorId, 'es')),
  };
}

/**
 * Cambia la lista de reportes esperados de una obra por la pedida (RF-37). Solo la
 * gerencia, lo exige la ruta (RF-42). Lo que ya no está se da de baja —nada se
 * borra—, y lo nuevo se agrega; lo que sigue igual no se toca.
 */
export async function guardarEsperados(
  sesion: PersonaEnSesion,
  pedido: z.output<typeof reportesEsperadosPedido>,
): Promise<ReportesEsperadosDeLaObra | Response> {
  const db = baseServidor();
  const [obra] = await db
    .select({ id: obras.id })
    .from(obras)
    .where(and(eq(obras.id, pedido.obraId), isNull(obras.eliminadoEn)))
    .limit(1);
  if (!obra) return noEncontrado('esa obra');

  const clave = (e: ReporteEsperadoFila) => `${e.tipoReporte}|${autorLimpio(e.autorId)}`;
  const pedidos = pedido.esperados.map((e) => ({ ...e, autorId: e.autorId ? autorLimpio(e.autorId) : null }));
  if (new Set(pedidos.map(clave)).size !== pedidos.length) {
    return errorDePeticion('Hay un reporte repetido en la lista.', 400);
  }

  const vigentes = await db
    .select({
      id: whatsappReportesEsperados.id,
      tipoReporte: whatsappReportesEsperados.tipoReporte,
      autorId: whatsappReportesEsperados.autorId,
      autorNombre: whatsappReportesEsperados.autorNombre,
    })
    .from(whatsappReportesEsperados)
    .where(and(eq(whatsappReportesEsperados.obraId, obra.id), isNull(whatsappReportesEsperados.eliminadoEn)));

  const quedan = new Set(pedidos.map(clave));
  const sobran = vigentes.filter((v) => !quedan.has(clave(v))).map((v) => v.id);
  if (sobran.length > 0) {
    await db
      .update(whatsappReportesEsperados)
      .set({ eliminadoEn: new Date() })
      .where(inArray(whatsappReportesEsperados.id, sobran));
  }
  const yaEstan = new Set(vigentes.map(clave));
  const nuevos = pedidos.filter((p) => !yaEstan.has(clave(p)));
  if (nuevos.length > 0) {
    await db.insert(whatsappReportesEsperados).values(
      nuevos.map((n) => ({
        id: uuidv7(),
        obraId: obra.id,
        tipoReporte: n.tipoReporte,
        autorId: n.autorId,
        autorNombre: n.autorNombre,
        creadoPor: sesion.id,
      })),
    );
  }
  return leerEsperados(sesion, obra.id);
}
