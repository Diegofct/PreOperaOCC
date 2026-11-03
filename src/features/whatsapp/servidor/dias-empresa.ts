/**
 * El estado del día de la bitácora de una empresa y sus reportes esperados (spec 038,
 * RF-16, RF-17). **Solo servidor.**
 *
 * ── Lo mismo que en una obra, sin detener nada ──
 *
 * En OCC cada mensaje se escribe en la bitácora al llegar (`empresa.ts`): aquí no se
 * espera para guardar, solo se lleva **si el día ya tiene lo que se esperaba**. La regla
 * es la misma de la obra, `diaCompleto` (024/RF-39 a RF-43): sin esperados basta el
 * primer mensaje; con esperados, cada uno tiene que haber llegado, de su autor si se dijo
 * quién lo manda. Así el día queda:
 *
 *  · `en_espera` mientras falte alguno;
 *  · `armada` cuando llegan todos;
 *  · `incompleta` si pasa la hora límite (las 12:00 m del día siguiente) sin ellos, con
 *    lo que faltó (024/RF-46, RF-47).
 *
 * La empresa no tiene horario como una obra. Se usa el horario de referencia de la obra
 * (`HORARIO_PROPUESTO`): los domingos y festivos basta el primer mensaje, como en una obra
 * que no trabaja ese día.
 *
 * El acceso es el de la Bitácora de la empresa (`bitacora_empresa`, con
 * `alcanzaLaEmpresa`): gerencia y el Encargado de OCC en OCC (RF-16, RF-29).
 */
import { and, asc, between, desc, eq, isNull, sql } from 'drizzle-orm';
import { uuidv7 } from 'uuidv7';

import { baseServidor } from '@/db/servidor/cliente';
import {
  bitacorasEmpresa,
  whatsappDiasEmpresa,
  whatsappGrupos,
  whatsappMensajes,
  whatsappReportesEsperados,
} from '@/db/servidor/esquema';
import type {
  DiaDeEmpresa,
  ReporteEsperadoFila,
  ReportesEsperadosDeLaEmpresa,
  reportesEsperadosDeEmpresaPedido,
} from '@/features/panel/contratos';
import type { PersonaEnSesion } from '@/features/servidor/guardia';
import { errorDePeticion, noEncontrado } from '@/features/servidor/respuestas';
import { alcanzaLaEmpresa, type EmpresaId } from '@/shared/rules/empresas';
import { HORARIO_PROPUESTO } from '@/shared/rules/horas';
import { fechaDeJornada } from '@/shared/rules/jornada';
import { alcanza } from '@/shared/rules/permisos';
import { EMPRESAS_CON_GRUPO, type EmpresaConGrupo } from '@/shared/rules/whatsapp';
import { diaCompleto, diaPorVenir, diaVencido, type ReporteEsperado } from '@/shared/rules/whatsapp-automatico';

import { empresaDelMensaje } from './obra';

import type { z } from 'zod';

/** Cuántos días hacia atrás muestra el estado si no se pide un rango. */
const DIAS_POR_DEFECTO = 7;

/** «280036280139944@lid» y «280036280139944» son el mismo autor. */
function autorLimpio(autor: string | null): string {
  return (autor ?? '').split('@')[0].trim();
}

/** Los reportes esperados vigentes de la empresa. */
async function esperadosDe(empresaId: EmpresaId): Promise<ReporteEsperado[]> {
  return baseServidor()
    .select({
      tipoReporte: whatsappReportesEsperados.tipoReporte,
      autorId: whatsappReportesEsperados.autorId,
      autorNombre: whatsappReportesEsperados.autorNombre,
    })
    .from(whatsappReportesEsperados)
    .where(and(eq(whatsappReportesEsperados.empresaId, empresaId), isNull(whatsappReportesEsperados.eliminadoEn)))
    .orderBy(asc(whatsappReportesEsperados.creadoEn));
}

/** Los mensajes guardados de la empresa en un rango de días, con su reporte y autor. */
async function recibidosEn(empresaId: EmpresaId, desde: string, hasta: string) {
  return baseServidor()
    .select({
      fecha: whatsappMensajes.fechaHecho,
      tipoReporte: whatsappMensajes.tipoReporte,
      autorId: whatsappMensajes.autorId,
      autorNombre: whatsappMensajes.autorNombre,
      enviadoEn: whatsappMensajes.enviadoEn,
    })
    .from(whatsappMensajes)
    .innerJoin(whatsappGrupos, eq(whatsappGrupos.id, whatsappMensajes.grupoId))
    .where(
      and(
        between(whatsappMensajes.fechaHecho, desde, hasta),
        eq(whatsappMensajes.estado, 'guardado'),
        sql`${empresaDelMensaje} = ${empresaId}`,
      ),
    )
    .orderBy(asc(whatsappMensajes.enviadoEn));
}

/**
 * Pone al día el estado del día de la empresa después de guardar un mensaje (RF-17).
 * Idempotente: se puede llamar cuantas veces haga falta. Un día que todavía no llega no
 * se cuenta (029/RF-33).
 */
export async function actualizarDiaDeEmpresa(empresaId: EmpresaId, fecha: string): Promise<void> {
  if (diaPorVenir(fecha, fechaDeJornada())) return;
  const db = baseServidor();
  const [esperados, recibidos, [bitacora]] = await Promise.all([
    esperadosDe(empresaId),
    recibidosEn(empresaId, fecha, fecha),
    db
      .select({ id: bitacorasEmpresa.id })
      .from(bitacorasEmpresa)
      .where(and(eq(bitacorasEmpresa.empresaId, empresaId), eq(bitacorasEmpresa.fecha, fecha), isNull(bitacorasEmpresa.anuladoEn)))
      .limit(1),
  ]);
  if (recibidos.length === 0) return;
  const { completo } = diaCompleto({ esperados, recibidos, horario: HORARIO_PROPUESTO, fecha });

  await db
    .insert(whatsappDiasEmpresa)
    .values({
      empresaId,
      fecha,
      estado: completo ? 'armada' : 'en_espera',
      bitacoraEmpresaId: bitacora?.id ?? null,
      armadaEn: completo ? new Date() : null,
    })
    .onConflictDoUpdate({
      target: [whatsappDiasEmpresa.empresaId, whatsappDiasEmpresa.fecha],
      set: {
        bitacoraEmpresaId: sql`coalesce(excluded.bitacora_empresa_id, ${whatsappDiasEmpresa.bitacoraEmpresaId})`,
        // Completo pasa a armada (también una incompleta a la que le llegó lo que faltaba);
        // lo demás se queda como estaba: un día armado no vuelve a esperar.
        ...(completo
          ? { estado: 'armada' as const, faltaron: null, armadaEn: sql`coalesce(${whatsappDiasEmpresa.armadaEn}, now())` }
          : {}),
      },
    });
}

/**
 * Los días de empresa que pasaron la hora límite sin todos sus reportes quedan
 * `incompleta`, con lo que faltó (RF-17, como 024/RF-46, RF-47). Lo llama el pulso.
 */
export async function vencerDiasDeEmpresa(ahoraMs = Date.now()): Promise<number> {
  const db = baseServidor();
  const enEspera = await db
    .select({ empresaId: whatsappDiasEmpresa.empresaId, fecha: whatsappDiasEmpresa.fecha })
    .from(whatsappDiasEmpresa)
    .where(eq(whatsappDiasEmpresa.estado, 'en_espera'));
  let vencidos = 0;
  for (const dia of enEspera) {
    if (!diaVencido(dia.fecha, ahoraMs)) continue;
    const [esperados, recibidos] = await Promise.all([
      esperadosDe(dia.empresaId),
      recibidosEn(dia.empresaId, dia.fecha, dia.fecha),
    ]);
    const { completo, faltan } = diaCompleto({ esperados, recibidos, horario: HORARIO_PROPUESTO, fecha: dia.fecha });
    await db
      .update(whatsappDiasEmpresa)
      .set({
        estado: completo ? 'armada' : 'incompleta',
        faltaron: completo ? null : faltan.map((f) => ({ tipoReporte: f.tipoReporte, autorNombre: f.autorNombre })),
        armadaEn: new Date(),
      })
      .where(
        and(
          eq(whatsappDiasEmpresa.empresaId, dia.empresaId),
          eq(whatsappDiasEmpresa.fecha, dia.fecha),
          eq(whatsappDiasEmpresa.estado, 'en_espera'),
        ),
      );
    vencidos++;
  }
  return vencidos;
}

/**
 * La empresa pedida, si la sesión puede hacer `accion` en su Bitácora; 404 si la empresa no
 * es suya o no tiene grupo, y 403 si es suya pero no tiene ese permiso (RF-29). La usan
 * también las rutas de la Bitácora de la empresa (`empresas/servidor/bitacora-occ.ts`).
 */
export function empresaAlAlcance(
  sesion: PersonaEnSesion,
  pedida: string | null,
  accion: 'listar' | 'escribir' | 'anular',
): EmpresaConGrupo | Response {
  if (!pedida || !(EMPRESAS_CON_GRUPO as readonly string[]).includes(pedida)) return noEncontrado('esa empresa');
  const empresaId = pedida as EmpresaConGrupo;
  if (!alcanzaLaEmpresa(sesion.rol, empresaId)) return noEncontrado('esa empresa');
  if (!alcanza(sesion.rol, 'bitacora_empresa', accion)) {
    return errorDePeticion('No tiene permiso para esto en la Bitácora de la empresa.', 403);
  }
  return empresaId;
}

/** El estado de los días de la empresa en un rango (RF-17, como 024/RF-55 a RF-57). */
export async function leerDiasDeEmpresa(
  sesion: PersonaEnSesion,
  filtro: { empresaId: string | null; desde: string | null; hasta: string | null },
): Promise<DiaDeEmpresa[] | Response> {
  const empresaId = empresaAlAlcance(sesion, filtro.empresaId, 'listar');
  if (empresaId instanceof Response) return empresaId;

  const hasta = filtro.hasta ?? fechaDeJornada();
  const desde =
    filtro.desde ??
    new Date(Date.parse(`${hasta}T00:00:00Z`) - (DIAS_POR_DEFECTO - 1) * 86_400_000).toISOString().slice(0, 10);
  const db = baseServidor();
  const dias = await db
    .select({
      fecha: whatsappDiasEmpresa.fecha,
      estado: whatsappDiasEmpresa.estado,
      faltaron: whatsappDiasEmpresa.faltaron,
      bitacoraEmpresaId: whatsappDiasEmpresa.bitacoraEmpresaId,
      cerradoEn: bitacorasEmpresa.cerradoEn,
    })
    .from(whatsappDiasEmpresa)
    .leftJoin(
      bitacorasEmpresa,
      and(
        eq(bitacorasEmpresa.empresaId, whatsappDiasEmpresa.empresaId),
        eq(bitacorasEmpresa.fecha, whatsappDiasEmpresa.fecha),
        isNull(bitacorasEmpresa.anuladoEn),
      ),
    )
    .where(and(eq(whatsappDiasEmpresa.empresaId, empresaId), between(whatsappDiasEmpresa.fecha, desde, hasta)))
    .orderBy(desc(whatsappDiasEmpresa.fecha));
  if (dias.length === 0) return [];

  const [esperados, recibidos] = await Promise.all([esperadosDe(empresaId), recibidosEn(empresaId, desde, hasta)]);
  return dias.map((dia) => {
    const delDia = recibidos.filter((r) => r.fecha === dia.fecha);
    return {
      empresaId,
      fecha: dia.fecha,
      estado: dia.cerradoEn ? 'cerrada' : dia.estado,
      bitacoraEmpresaId: dia.bitacoraEmpresaId,
      faltaron: dia.faltaron ?? [],
      reportes: esperados.map((e) => {
        const llego = delDia.find(
          (r) => r.tipoReporte === e.tipoReporte && (e.autorId === null || autorLimpio(r.autorId) === autorLimpio(e.autorId)),
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
    } satisfies DiaDeEmpresa;
  });
}

/** La lista de reportes esperados de la empresa, y quiénes escriben en su grupo (RF-16). */
export async function leerEsperadosDeEmpresa(
  sesion: PersonaEnSesion,
  pedida: string | null,
): Promise<ReportesEsperadosDeLaEmpresa | Response> {
  const empresaId = empresaAlAlcance(sesion, pedida, 'listar');
  if (empresaId instanceof Response) return empresaId;

  const [esperados, autores] = await Promise.all([
    esperadosDe(empresaId),
    baseServidor()
      .selectDistinctOn([whatsappMensajes.autorId], {
        autorId: whatsappMensajes.autorId,
        autorNombre: whatsappMensajes.autorNombre,
      })
      .from(whatsappMensajes)
      .innerJoin(whatsappGrupos, eq(whatsappGrupos.id, whatsappMensajes.grupoId))
      .where(eq(whatsappGrupos.empresaId, empresaId))
      .orderBy(whatsappMensajes.autorId, desc(whatsappMensajes.enviadoEn)),
  ]);
  return {
    empresaId,
    esperados,
    autores: autores
      .map((a) => ({ autorId: autorLimpio(a.autorId), autorNombre: a.autorNombre }))
      .sort((a, b) => (a.autorNombre ?? a.autorId).localeCompare(b.autorNombre ?? b.autorId, 'es')),
  };
}

/**
 * Cambia la lista de reportes esperados de la empresa por la pedida (RF-16): gerencia y el
 * Encargado de OCC. Lo que ya no está se da de baja —nada se borra—, y lo nuevo se agrega.
 */
export async function guardarEsperadosDeEmpresa(
  sesion: PersonaEnSesion,
  pedido: z.output<typeof reportesEsperadosDeEmpresaPedido>,
): Promise<ReportesEsperadosDeLaEmpresa | Response> {
  const empresaId = empresaAlAlcance(sesion, pedido.empresaId, 'escribir');
  if (empresaId instanceof Response) return empresaId;

  const clave = (e: ReporteEsperadoFila) => `${e.tipoReporte}|${autorLimpio(e.autorId)}`;
  const pedidos = pedido.esperados.map((e) => ({ ...e, autorId: e.autorId ? autorLimpio(e.autorId) : null }));
  if (new Set(pedidos.map(clave)).size !== pedidos.length) {
    return errorDePeticion('Hay un reporte repetido en la lista.', 400);
  }

  const db = baseServidor();
  const vigentes = await db
    .select({
      id: whatsappReportesEsperados.id,
      tipoReporte: whatsappReportesEsperados.tipoReporte,
      autorId: whatsappReportesEsperados.autorId,
      autorNombre: whatsappReportesEsperados.autorNombre,
    })
    .from(whatsappReportesEsperados)
    .where(and(eq(whatsappReportesEsperados.empresaId, empresaId), isNull(whatsappReportesEsperados.eliminadoEn)));

  const quedan = new Set(pedidos.map(clave));
  for (const v of vigentes.filter((v) => !quedan.has(clave(v)))) {
    await db.update(whatsappReportesEsperados).set({ eliminadoEn: new Date() }).where(eq(whatsappReportesEsperados.id, v.id));
  }
  const yaEstan = new Set(vigentes.map(clave));
  const nuevos = pedidos.filter((p) => !yaEstan.has(clave(p)));
  if (nuevos.length > 0) {
    await db.insert(whatsappReportesEsperados).values(
      nuevos.map((n) => ({
        id: uuidv7(),
        empresaId,
        tipoReporte: n.tipoReporte,
        autorId: n.autorId,
        autorNombre: n.autorNombre,
        creadoPor: sesion.id,
      })),
    );
  }
  return leerEsperadosDeEmpresa(sesion, empresaId);
}
