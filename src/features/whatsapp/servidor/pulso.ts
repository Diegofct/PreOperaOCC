/**
 * El pulso del guardado automático (spec 024, RF-46, RF-68). **Solo servidor.**
 *
 * PreOperaOCC no tiene trabajos de fondo: n8n lo llama cada 15 minutos (flujo «OCC -
 * Pulso PreOperaOCC», T26), y en cada llamada:
 *
 *  1. arma las bitácoras de los días que llegaron a su hora límite —las 12:00 m del
 *     día siguiente— sin todos sus reportes; quedan `incompletas` (RF-46, RF-47);
 *  2. procesa, del más antiguo al más nuevo, hasta 30 mensajes que siguen
 *     `pendientes`: los de la bandeja de antes de la 024 al activarla (RF-68), y los
 *     que fallaron al llegar;
 *     (y a los días no vencidos les da otra vuelta, por lo que esperaba un archivo,
 *     026/RF-46);
 *  3. un mensaje que falla 5 veces deja de reintentarse y va entero a «No se pudo
 *     guardar» con el error, para que una persona lo vea (decisión del plan);
 *  4. mira otra vez las fotos de los días que recibieron alguna en las últimas 48 horas
 *     (spec 027, RF-1, RF-10): la que llegó antes que su mensaje, o la de un mensaje que
 *     no pasa por la bitácora, entra aquí si nadie más la agregó.
 *
 * Todo lo que hace se puede repetir: dos pulsos seguidos no duplican nada.
 */
import { and, asc, eq, isNotNull, isNull, lt, sql } from 'drizzle-orm';

import { baseServidor } from '@/db/servidor/cliente';
import { media, whatsappGrupos, whatsappMensajes } from '@/db/servidor/esquema';
import { diaVencido } from '@/shared/rules/whatsapp-automatico';

import { apartar } from './apartados';
import { anotarFalloDelProceso, procesarMensaje } from './automatico';
import { actualizarDia, armarBitacora } from './dias';
import { diaDeLaFoto, sincronizarFotosDelDia } from './fotos-del-dia';
import { obraDelMensaje } from './obra';

/** Cuántos mensajes pendientes procesa cada pulso: unos 30 caben en un minuto. */
const PENDIENTES_POR_PULSO = 30;

/** Después de tantos fallos, un mensaje deja de reintentarse. */
const INTENTOS_MAXIMOS = 5;

/** Hasta cuándo atrás el pulso vuelve a mirar las fotos de un día (spec 027). */
const HORAS_DE_FOTOS = 48;

export interface ResultadoDelPulso {
  diasArmados: number;
  procesados: number;
  conError: number;
  abandonados: number;
  fotosAgregadas: number;
}

/**
 * Un pulso. `soloObra` limita el pulso a una obra: es para probarlo sin tocar las
 * demás, y la ruta no lo usa.
 */
export async function pulso(ahoraMs = Date.now(), soloObra?: string): Promise<ResultadoDelPulso> {
  const db = baseServidor();
  const deLaObra = soloObra ? sql`${obraDelMensaje} = ${soloObra}` : sql`${obraDelMensaje} is not null`;

  // 1. Los días con mensajes en espera que ya llegaron a su hora límite (RF-46).
  const dias = await db
    .selectDistinct({ obraId: sql<string>`${obraDelMensaje}`, fecha: whatsappMensajes.fechaHecho })
    .from(whatsappMensajes)
    .innerJoin(whatsappGrupos, eq(whatsappGrupos.id, whatsappMensajes.grupoId))
    .where(and(eq(whatsappMensajes.estado, 'en_espera'), isNotNull(whatsappMensajes.fechaHecho), deLaObra));
  let diasArmados = 0;
  for (const { obraId, fecha } of dias) {
    if (!fecha) continue;
    if (!diaVencido(fecha, ahoraMs)) {
      // Lo que quedó esperando un archivo en un día ya armado (026/RF-46, RF-47): si el
      // archivo no llega, nadie más lo retomaría antes de la hora límite.
      await actualizarDia(obraId, fecha);
      continue;
    }
    await armarBitacora(obraId, fecha, 'vencido');
    diasArmados++;
  }

  // 2. Los pendientes, los más antiguos primero (RF-68).
  const pendientes = await db
    .select({ id: whatsappMensajes.id })
    .from(whatsappMensajes)
    .innerJoin(whatsappGrupos, eq(whatsappGrupos.id, whatsappMensajes.grupoId))
    .where(
      and(
        eq(whatsappMensajes.estado, 'pendiente'),
        isNull(whatsappMensajes.procesadoEn),
        lt(whatsappMensajes.intentos, INTENTOS_MAXIMOS),
        deLaObra,
      ),
    )
    .orderBy(asc(whatsappMensajes.enviadoEn))
    .limit(PENDIENTES_POR_PULSO);

  let procesados = 0;
  let conError = 0;
  let abandonados = 0;
  for (const { id } of pendientes) {
    try {
      await procesarMensaje(id);
      procesados++;
    } catch (fallo) {
      conError++;
      await anotarFalloDelProceso(id, fallo);
      // 3. El que ya no se va a reintentar, a «No se pudo guardar» con su error.
      const [mensaje] = await db
        .select({ intentos: whatsappMensajes.intentos, error: whatsappMensajes.errorProceso })
        .from(whatsappMensajes)
        .where(eq(whatsappMensajes.id, id));
      if (mensaje && mensaje.intentos >= INTENTOS_MAXIMOS) {
        await apartar(id, [
          {
            seccion: 'mensaje',
            renglon: null,
            motivo:
              `No se pudo procesar después de ${INTENTOS_MAXIMOS} intentos. ` +
              `Detalle técnico: ${(mensaje.error ?? 'error desconocido').split(/\r?\n/)[0].slice(0, 300)}`,
            datos: null,
          },
        ]);
        abandonados++;
      }
    }
  }
  // 4. Las fotos de los días que recibieron alguna hace poco (spec 027).
  const diasConFotos = await db
    .selectDistinct({ obraId: sql<string>`${obraDelMensaje}`, fecha: diaDeLaFoto })
    .from(media)
    .innerJoin(whatsappMensajes, eq(whatsappMensajes.id, media.duenoId))
    .innerJoin(whatsappGrupos, eq(whatsappGrupos.id, whatsappMensajes.grupoId))
    .where(
      and(
        eq(media.duenoTipo, 'whatsapp'),
        sql`${media.recibidoEn} > ${new Date(ahoraMs - HORAS_DE_FOTOS * 3_600_000).toISOString()}::timestamptz`,
        sql`${diaDeLaFoto} is not null`,
        deLaObra,
      ),
    );
  let fotosAgregadas = 0;
  for (const { obraId, fecha } of diasConFotos) {
    if (fecha) fotosAgregadas += (await sincronizarFotosDelDia(obraId, fecha)).agregadas;
  }

  return { diasArmados, procesados, conError, abandonados, fotosAgregadas };
}
