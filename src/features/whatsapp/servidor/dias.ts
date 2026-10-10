/**
 * La bitácora de cada día, armada desde WhatsApp (spec 024, RF-5, RF-43 a RF-57).
 * **Solo servidor.**
 *
 * ── En espera hasta que llega todo ──
 *
 * Lo que va a la bitácora (reporte diario, personal, control de calidad, notas) no
 * se guarda al llegar: queda `en_espera` en su obra y su día (RF-5). Cada mensaje que
 * llega avisa al día (`actualizarDia`), y cuando ya están todos los reportes que la
 * obra espera, la bitácora se arma sola (RF-43) y queda **abierta** (RF-45). Lo que
 * llega después a un día armado entra en ese momento (RF-50). A un día cerrado no
 * entra: va a «No se pudo guardar» con el camino de anular y abrir otra (RF-51).
 *
 * ── Llevar un mensaje ──
 *
 * Es lo mismo que aprobarlo desde la bandeja, con el usuario de sistema: crear lo que
 * falte (personas de la sección de personal y operadores, volquetas con placa —RF-22,
 * RF-30—), apartar los renglones incompletos (RF-19), y escribir el resto con
 * `guardarEnBitacora`, que junta los reportes del mismo día con las reglas de la 021
 * (RF-44) y no duplica lo que ya llevó (RF-54). La foto del día la pone el sistema si
 * la bitácora no tiene una (RF-53). Los viajes del reporte ya se guardaron al llegar
 * (RF-52): aquí no se tocan.
 */
import { and, asc, eq, inArray, isNull, like, sql } from 'drizzle-orm';

import { baseServidor } from '@/db/servidor/cliente';
import {
  media,
  obras,
  partesDeObra,
  whatsappDias,
  whatsappGrupos,
  whatsappMensajes,
  whatsappReportesEsperados,
} from '@/db/servidor/esquema';
import { reporteCorregido } from '@/features/panel/contratos';
import { fechaDeJornada } from '@/shared/rules/jornada';
import {
  candidatosDeVehiculo,
  reconocerMaquina,
  faltasDelReporte,
  type ReporteDelDia,
} from '@/shared/rules/whatsapp';
import {
  decisionDePersona,
  diaCompleto,
  placaDeLaMaquina,
  separarRenglones,
  type ReporteEsperado,
} from '@/shared/rules/whatsapp-automatico';

import { ACTOR_SISTEMA, type Actor } from './actor';
import { fotosElegidas, guardarEnBitacora, marcarMensaje } from './aprobacion';
import { apartar } from './apartados';
import { catalogosDeLaObra } from './catalogos';
import { crearMaquina, crearPersona, crearVolqueta } from './creacion';
import { obraDelMensaje } from './obra';

/** Cómo se armó la bitácora: con todo, por la hora límite, o con «Guardar con lo que hay». */
export type MotivoDelArmado = 'completo' | 'vencido' | 'a_mano';

/** Lo que dice la bitácora vigente de un día, o `null` si no hay. */
async function bitacoraDelDia(obraId: string, fecha: string) {
  const [parte] = await baseServidor()
    .select({ id: partesDeObra.id, cerradoEn: partesDeObra.cerradoEn })
    .from(partesDeObra)
    .where(and(eq(partesDeObra.obraId, obraId), eq(partesDeObra.fecha, fecha), isNull(partesDeObra.anuladoEn)))
    .limit(1);
  return parte ?? null;
}

/** Los mensajes de una obra y un día que esperan a la bitácora, en orden de llegada. */
async function mensajesEnEspera(obraId: string, fecha: string) {
  return baseServidor()
    .select({
      id: whatsappMensajes.id,
      version: whatsappMensajes.version,
      categoria: whatsappMensajes.categoria,
      autorNombre: whatsappMensajes.autorNombre,
      enviadoEn: whatsappMensajes.enviadoEn,
      propuesta: whatsappMensajes.propuesta,
      resultado: whatsappMensajes.resultado,
    })
    .from(whatsappMensajes)
    .innerJoin(whatsappGrupos, eq(whatsappGrupos.id, whatsappMensajes.grupoId))
    .where(
      and(
        eq(whatsappMensajes.estado, 'en_espera'),
        eq(whatsappMensajes.fechaHecho, fecha),
        sql`${obraDelMensaje} = ${obraId}`,
      ),
    )
    .orderBy(asc(whatsappMensajes.enviadoEn));
}

type MensajeEnEspera = Awaited<ReturnType<typeof mensajesEnEspera>>[number];

/**
 * La primera foto del mensaje o de lo que lo complementa, para la foto del día
 * (RF-53). Solo de un reporte diario: la foto de un incidente no es la del día.
 */
async function primeraFoto(mensajeId: string): Promise<string | null> {
  const [foto] = await baseServidor()
    .select({ id: media.id })
    .from(media)
    .where(
      and(
        eq(media.duenoTipo, 'whatsapp'),
        sql`(${media.duenoId} = ${mensajeId}
             or ${media.duenoId} in (select c.id from whatsapp_mensajes c where c.complementa_a = ${mensajeId}))`,
        like(media.mime, 'image/%'),
        sql`${media.claveR2} is not null`,
      ),
    )
    .orderBy(asc(media.recibidoEn))
    .limit(1);
  return foto?.id ?? null;
}

/** El mensaje, guardado: con la bitácora a la que fue y lo que quedó (RF-58). */
async function marcarLlevado(
  mensaje: MensajeEnEspera,
  datos: { obraId: string; reporte: ReporteDelDia; parteId: string | null; apartados: number },
): Promise<void> {
  await marcarMensaje({
    mensajeId: mensaje.id,
    reporte: datos.reporte,
    parteId: datos.parteId,
    obraId: datos.obraId,
    actor: ACTOR_SISTEMA,
    estado: 'guardado',
    desde: { estado: 'en_espera', version: mensaje.version },
  });
  const antes = (mensaje.resultado ?? {}) as Record<string, unknown>;
  await baseServidor()
    .update(whatsappMensajes)
    .set({
      procesadoEn: new Date(),
      resultado: {
        ...antes,
        modulo: 'bitacora',
        parteId: datos.parteId,
        apartados: Number(antes.apartados ?? 0) + datos.apartados,
      },
    })
    .where(eq(whatsappMensajes.id, mensaje.id));
}

/**
 * Lleva un mensaje en espera a la bitácora de su día (RF-44, RF-50, RF-53, RF-54).
 * Devuelve el id de la bitácora, o `null` si el mensaje entero fue a «No se pudo
 * guardar».
 */
async function llevarABitacora(mensaje: MensajeEnEspera, obraId: string, fecha: string): Promise<string | null> {
  const enEspera = reporteCorregido.parse(mensaje.propuesta) as ReporteDelDia;
  // Los viajes se guardaron al llegar (RF-52).
  let reporte: ReporteDelDia = { ...enEspera, viajes: [] };

  // Crear las personas y las volquetas que faltan (RF-22 a RF-26, RF-30).
  const catalogos = await catalogosDeLaObra(obraId, [fecha]);
  const personal = [];
  for (const p of reporte.personal) {
    if (p.usuarioId || !p.escrito) {
      personal.push(p);
      continue;
    }
    const decision = decisionDePersona(p.escrito, catalogos.personasDeLaObra, { seccion: 'personal', hoja: p.hoja });
    if (decision?.tipo === 'reconocida' || decision?.tipo === 'coincidencia') {
      personal.push({ ...p, usuarioId: decision.usuarioId });
    } else if (decision?.tipo === 'crear') {
      personal.push({
        ...p,
        usuarioId: await crearPersona({ obraId, nombre: decision.nombre, cargo: decision.cargo, mensajeId: mensaje.id }),
      });
    } else {
      personal.push(p);
    }
  }
  const maquinaria = [];
  for (const m of reporte.maquinaria) {
    let { vehiculoId, operadorId } = m;
    if (!vehiculoId && m.escrito && !m.conflicto) {
      const placa = placaDeLaMaquina(m.escrito);
      if (placa && candidatosDeVehiculo(m.escrito, catalogos.catalogos.vehiculos, obraId).length === 0) {
        vehiculoId = await crearVolqueta({
          obraId,
          placa,
          mensajeId: mensaje.id,
          tipoId: m.tipoId,
          marca: m.marcaEscrita,
        });
      } else if (!placa && m.tipoId) {
        // Sin placa, con tipo y sin ningún candidato: la máquina se registra (026/RF-8, RF-13).
        const reconocida = reconocerMaquina(m.escrito, catalogos.catalogos.vehiculos, obraId, {
          marca: m.marcaEscrita,
        });
        if (reconocida.candidatos.length === 0) {
          vehiculoId = await crearMaquina({
            obraId,
            tipoId: m.tipoId,
            marca: m.marcaEscrita ?? null,
            escrito: m.escrito,
            mensajeId: mensaje.id,
          });
        }
      }
    }
    if (!operadorId && m.operadorEscrito) {
      const decision = decisionDePersona(m.operadorEscrito, catalogos.personasDeLaObra, { seccion: 'maquinaria' });
      if (decision?.tipo === 'reconocida' || decision?.tipo === 'coincidencia') operadorId = decision.usuarioId;
      else if (decision?.tipo === 'crear') {
        operadorId = await crearPersona({ obraId, nombre: decision.nombre, cargo: decision.cargo, mensajeId: mensaje.id });
      }
    }
    maquinaria.push({ ...m, vehiculoId, operadorId });
  }
  reporte = { ...reporte, personal, maquinaria };

  // Lo que sigue incompleto, a «No se pudo guardar»; el resto, a la bitácora (RF-19, RF-20).
  const faltas = faltasDelReporte(reporte, {
    hoy: fechaDeJornada(),
    claseDeMedidor: (vehiculoId) => catalogos.claseDe.get(vehiculoId) ?? 'horometro',
    lecturaDe: catalogos.lecturaDe,
  }).filter((f) => f.seccion !== 'viajes' && f.seccion !== 'almacen');
  const { guardable, excepciones } = separarRenglones(reporte, faltas);
  await apartar(mensaje.id, excepciones);
  if (!guardable) {
    await marcarLlevado(mensaje, { obraId, reporte, parteId: null, apartados: excepciones.length });
    return null;
  }

  // La foto del día, si es un reporte diario (RF-53, RF-73).
  const delDia = mensaje.categoria === 'reporte_diario' ? await primeraFoto(mensaje.id) : null;
  const elegidas = { delDia, porActividad: {} };
  const fotos = await fotosElegidas(mensaje.id, elegidas, guardable.actividades.length);
  const enBitacora = await guardarEnBitacora({
    mensajeId: mensaje.id,
    reporte: guardable,
    obraId,
    actor: ACTOR_SISTEMA,
    autorNombre: mensaje.autorNombre,
    enviadoEn: mensaje.enviadoEn,
    fotos: Array.isArray(fotos) ? new Map() : fotos,
    fotosElegidas: Array.isArray(fotos) ? { delDia: null, porActividad: {} } : elegidas,
    viajesPendientes: false,
  });

  if (enBitacora instanceof Response) {
    const { error, choque } = (await enBitacora.json()) as { error?: string; choque?: boolean };
    // Otro guardó la misma bitácora a la vez (el pulso y la entrega, el 8-oct): no es
    // un problema del reporte. Se queda en espera y lo retoma el próximo pulso; lo que
    // ya se escribió no se duplica porque los ids son deterministas (spec 025, T12).
    if (choque) return null;
    // Cerrada entre medias, o una validación de la bitácora: el mensaje entero se aparta.
    await apartar(mensaje.id, [
      { seccion: 'bitacora', renglon: null, motivo: error ?? 'No se pudo llevar a la bitácora.', datos: null },
    ]);
    await marcarLlevado(mensaje, { obraId, reporte, parteId: null, apartados: excepciones.length + 1 });
    return null;
  }
  await marcarLlevado(mensaje, { obraId, reporte: guardable, parteId: enBitacora.parteId, apartados: excepciones.length });
  return enBitacora.parteId;
}

/** Los reportes que la obra espera, vigentes (RF-37). */
async function esperadosDeLaObra(obraId: string): Promise<ReporteEsperado[]> {
  return baseServidor()
    .select({
      tipoReporte: whatsappReportesEsperados.tipoReporte,
      autorId: whatsappReportesEsperados.autorId,
      autorNombre: whatsappReportesEsperados.autorNombre,
    })
    .from(whatsappReportesEsperados)
    .where(and(eq(whatsappReportesEsperados.obraId, obraId), isNull(whatsappReportesEsperados.eliminadoEn)));
}

/** Los mensajes de la obra y el día que cuentan como reporte recibido (RF-39, RF-55). */
async function recibidosDelDia(obraId: string, fecha: string) {
  return baseServidor()
    .select({ tipoReporte: whatsappMensajes.tipoReporte, autorId: whatsappMensajes.autorId })
    .from(whatsappMensajes)
    .innerJoin(whatsappGrupos, eq(whatsappGrupos.id, whatsappMensajes.grupoId))
    .where(
      and(
        eq(whatsappMensajes.fechaHecho, fecha),
        inArray(whatsappMensajes.estado, ['en_espera', 'guardado']),
        sql`${obraDelMensaje} = ${obraId}`,
      ),
    );
}

/**
 * Arma la bitácora de un día con los mensajes que esperan (RF-43 a RF-48). La deja
 * abierta. `incompleta` si faltó algún reporte esperado, con cuáles (RF-47).
 */
export async function armarBitacora(
  obraId: string,
  fecha: string,
  motivo: MotivoDelArmado,
  actor: Actor = ACTOR_SISTEMA,
): Promise<{ parteId: string | null; llevados: number }> {
  const db = baseServidor();
  await db.insert(whatsappDias).values({ obraId, fecha }).onConflictDoNothing();

  let parteId: string | null = (await bitacoraDelDia(obraId, fecha))?.id ?? null;
  const mensajes = await mensajesEnEspera(obraId, fecha);
  for (const mensaje of mensajes) {
    parteId = (await llevarABitacora(mensaje, obraId, fecha)) ?? parteId;
  }

  const [obra] = await db.select({ horario: obras.horario }).from(obras).where(eq(obras.id, obraId)).limit(1);
  const { faltan } = diaCompleto({
    esperados: await esperadosDeLaObra(obraId),
    recibidos: await recibidosDelDia(obraId, fecha),
    horario: obra.horario,
    fecha,
  });
  const incompleta = motivo !== 'completo' && faltan.length > 0;
  await db
    .update(whatsappDias)
    .set({
      estado: incompleta ? 'incompleta' : 'armada',
      faltaron: incompleta ? faltan.map((f) => ({ tipoReporte: f.tipoReporte, autorNombre: f.autorNombre })) : null,
      parteId,
      armadaEn: new Date(),
      armadaPor: motivo === 'a_mano' ? actor.id : null,
    })
    .where(and(eq(whatsappDias.obraId, obraId), eq(whatsappDias.fecha, fecha)));
  return { parteId, llevados: mensajes.length };
}

/**
 * Lo que pasa con el día de una obra cuando le llega un mensaje (RF-43, RF-50, RF-51):
 *
 *  · bitácora cerrada → lo que espera va a «No se pudo guardar»;
 *  · día ya armado y bitácora abierta → lo que espera entra ya;
 *  · si no, se arma si ya están todos los reportes esperados.
 *
 * Sin mensajes en espera no se abre ninguna bitácora (RF-49): un día con solo vales
 * de cantera los tiene en Control Cantera, que la bitácora muestra al abrirla.
 */
export async function actualizarDia(obraId: string, fecha: string): Promise<void> {
  const db = baseServidor();
  await db.insert(whatsappDias).values({ obraId, fecha }).onConflictDoNothing();
  const mensajes = await mensajesEnEspera(obraId, fecha);
  if (mensajes.length === 0) return;

  const parte = await bitacoraDelDia(obraId, fecha);
  if (parte?.cerradoEn) {
    for (const mensaje of mensajes) {
      await apartar(mensaje.id, [
        {
          seccion: 'bitacora',
          renglon: null,
          motivo: `La bitácora del ${fecha} ya está cerrada. Para incluir este reporte hay que anularla con un motivo y abrir otra.`,
          datos: null,
        },
      ]);
      await marcarLlevado(mensaje, {
        obraId,
        reporte: reporteCorregido.parse(mensaje.propuesta) as ReporteDelDia,
        parteId: null,
        apartados: 1,
      });
    }
    return;
  }

  const [dia] = await db
    .select({ estado: whatsappDias.estado })
    .from(whatsappDias)
    .where(and(eq(whatsappDias.obraId, obraId), eq(whatsappDias.fecha, fecha)))
    .limit(1);
  if (dia && dia.estado !== 'en_espera' && parte) {
    for (const mensaje of mensajes) await llevarABitacora(mensaje, obraId, fecha);
    return;
  }

  const [obra] = await db.select({ horario: obras.horario }).from(obras).where(eq(obras.id, obraId)).limit(1);
  const { completo } = diaCompleto({
    esperados: await esperadosDeLaObra(obraId),
    recibidos: await recibidosDelDia(obraId, fecha),
    horario: obra.horario,
    fecha,
  });
  if (completo) await armarBitacora(obraId, fecha, 'completo');
}
