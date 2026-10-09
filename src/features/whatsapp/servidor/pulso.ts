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
 *  3. un mensaje que falla 5 veces deja de reintentarse y va entero a «No se pudo
 *     guardar» con el error, para que una persona lo vea (decisión del plan).
 *
 * Todo lo que hace se puede repetir: dos pulsos seguidos no duplican nada.
 */
import { and, asc, eq, isNotNull, isNull, lt, sql } from 'drizzle-orm';

import { baseServidor } from '@/db/servidor/cliente';
import { whatsappGrupos, whatsappMensajes } from '@/db/servidor/esquema';
import { diaVencido } from '@/shared/rules/whatsapp-automatico';

import { apartar } from './apartados';
import { anotarFalloDelProceso, procesarMensaje } from './automatico';
import { armarBitacora } from './dias';
import { obraDelMensaje } from './obra';

/** Cuántos mensajes pendientes procesa cada pulso: unos 30 caben en un minuto. */
const PENDIENTES_POR_PULSO = 30;

/** Después de tantos fallos, un mensaje deja de reintentarse. */
const INTENTOS_MAXIMOS = 5;

export interface ResultadoDelPulso {
  diasArmados: number;
  procesados: number;
  conError: number;
  abandonados: number;
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
    if (!fecha || !diaVencido(fecha, ahoraMs)) continue;
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
  return { diasArmados, procesados, conError, abandonados };
}
