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
 * (RF-44) y no duplica lo que ya llevó (RF-54). Las fotos van a la sección «Fotografía
 * del día» por `sincronizarFotosDelDia` (spec 027): ya no se copia la primera del reporte
 * diario como foto principal (cambio del 2026-10-14, RF-40). Los viajes del reporte ya se
 * guardaron al llegar
 * (RF-52): aquí no se tocan.
 *
 * ── Esperar los archivos ──
 *
 * La integración manda el mensaje y después sus bytes. Un reporte que se guarda en ese
 * hueco queda sin foto del día (el 9-oct). Por eso un mensaje cuya imagen o documento
 * —o la de lo que ya lo complementa— no ha llegado se queda en espera hasta 30 minutos
 * (026/RF-46, RF-47); lo retoma la llegada del archivo (`archivoRecibido`) o el pulso.
 */
import { and, asc, eq, inArray, isNull, or, sql } from 'drizzle-orm';

import { baseServidor } from '@/db/servidor/cliente';
import {
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
  equiposTomados,
  reconocerMaquina,
  faltasDelReporte,
  type ReporteDelDia,
} from '@/shared/rules/whatsapp';
import {
  decisionDePersona,
  diaCompleto,
  esperaArchivo,
  placaDeLaMaquina,
  renglonesGuardados,
  separarRenglones,
  type ReporteEsperado,
} from '@/shared/rules/whatsapp-automatico';

import { ACTOR_SISTEMA, type Actor } from './actor';
import { guardarEnBitacora, marcarMensaje } from './aprobacion';
import { apartar } from './apartados';
import { catalogosDeLaObra } from './catalogos';
import { crearMaquina, crearPersona, crearVolqueta } from './creacion';
import { diaDeLaFoto, sincronizarFotosDelDia } from './fotos-del-dia';
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
 * ¿El mensaje, o algo que ya lo complementa, espera todavía su archivo? (026/RF-46,
 * RF-47). Una imagen o un documento sin su fila en `media`, de hace menos de 30 minutos.
 */
async function faltaUnArchivo(mensajeId: string, ahoraMs: number): Promise<boolean> {
  const filas = await baseServidor()
    .select({
      tipo: whatsappMensajes.tipo,
      recibidoEn: whatsappMensajes.recibidoEn,
      // Calificada a mano: en una consulta de una sola tabla, Drizzle escribe `"id"` sin
      // tabla, y dentro de la subconsulta eso sería el id de `media`.
      archivos: sql<number>`(select count(*)::int from media x
        where x.dueno_tipo = 'whatsapp' and x.dueno_id = whatsapp_mensajes.id)`,
    })
    .from(whatsappMensajes)
    .where(or(eq(whatsappMensajes.id, mensajeId), eq(whatsappMensajes.complementaA, mensajeId)));
  return filas.some((f) =>
    esperaArchivo(
      { tipo: f.tipo, tieneArchivo: Number(f.archivos) > 0, recibidoEnMs: f.recibidoEn.getTime() },
      ahoraMs,
    ),
  );
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
 * guardar» o sigue en espera (un choque, o un archivo que no ha llegado).
 */
async function llevarABitacora(mensaje: MensajeEnEspera, obraId: string, fecha: string): Promise<string | null> {
  // Su archivo todavía no llega: sigue en espera (026/RF-46).
  if (await faltaUnArchivo(mensaje.id, Date.now())) return null;

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
  // Lo que otros renglones ya tomaron no cuenta como candidato al crear (026/RF-50).
  const tomados = equiposTomados(reporte.maquinaria, catalogos.catalogos);
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
        const reconocida = reconocerMaquina(
          m.escrito,
          catalogos.catalogos.vehiculos,
          obraId,
          { marca: m.marcaEscrita },
          tomados,
        );
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

  // Sin foto principal: las fotos del mensaje entran a la sección con las demás, al final
  // del armado o al llegar su archivo (spec 027, cambio del 2026-10-14, RF-40).
  const enBitacora = await guardarEnBitacora({
    mensajeId: mensaje.id,
    reporte: guardable,
    obraId,
    actor: ACTOR_SISTEMA,
    autorNombre: mensaje.autorNombre,
    enviadoEn: mensaje.enviadoEn,
    fotos: new Map(),
    fotosElegidas: { delDia: null, porActividad: {} },
    viajesPendientes: false,
    renglonesOriginales: renglonesGuardados(reporte, excepciones),
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
  // Las fotos del día, ya con la bitácora armada (spec 027, RF-1).
  if (parteId) await sincronizarFotosDelDia(obraId, fecha);
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
  await llevarLoQueEspera(obraId, fecha);
  // Las fotos del día, también las de mensajes que no esperaban a la bitácora (spec 027,
  // RF-1), y el aviso de las que llegaron con ella cerrada (RF-21).
  await sincronizarFotosDelDia(obraId, fecha);
}

async function llevarLoQueEspera(obraId: string, fecha: string): Promise<void> {
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

/**
 * Llegó el archivo de un mensaje (`PUT …/archivo`). Dos cosas, ninguna obligatoria:
 *
 *  · si el mensaje, o el que complementa, esperaba ese archivo para ir a la
 *    bitácora, se retoma su día ya (026/RF-46);
 *  · la foto entra a la sección «Fotografía del día» de su día (spec 027, RF-1, RF-10).
 *
 * Ya no se pone como foto principal la del reporte diario que llega tarde (026/RF-48):
 * desde el cambio del 2026-10-14 no hay foto principal (027/RF-40).
 */
export async function archivoRecibido(mensajeId: string): Promise<void> {
  const db = baseServidor();
  const filas = await db
    .select({
      id: whatsappMensajes.id,
      estado: whatsappMensajes.estado,
      categoria: whatsappMensajes.categoria,
      fechaHecho: whatsappMensajes.fechaHecho,
      parteId: whatsappMensajes.parteId,
      obraId: obraDelMensaje,
      diaDeLaFoto,
    })
    .from(whatsappMensajes)
    .innerJoin(whatsappGrupos, eq(whatsappGrupos.id, whatsappMensajes.grupoId))
    .where(
      or(
        eq(whatsappMensajes.id, mensajeId),
        sql`${whatsappMensajes.id} = (select c.complementa_a from whatsapp_mensajes c where c.id = ${mensajeId})`,
      ),
    );

  for (const m of filas) {
    if (m.estado === 'en_espera' && m.obraId && m.fechaHecho) await actualizarDia(m.obraId, m.fechaHecho);
  }

  // La foto que llegó, a la sección de su día (spec 027, RF-1, RF-10).
  const dias = new Set(filas.filter((m) => m.obraId && m.diaDeLaFoto).map((m) => `${m.obraId}|${m.diaDeLaFoto}`));
  for (const dia of dias) {
    const [obraId, fecha] = dia.split('|');
    await sincronizarFotosDelDia(obraId, fecha);
  }
}
