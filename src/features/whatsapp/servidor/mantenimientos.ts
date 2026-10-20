/**
 * Los mantenimientos que dice un mensaje de WhatsApp (spec 030, RF-36 a RF-43).
 * **Solo servidor.**
 *
 * Se guardan al procesar el mensaje, como sus viajes, sin esperar a que se arme el
 * día: un cambio de aceite no depende de la bitácora. Lo que no se reconoce (la
 * máquina o la clase) va a «No se pudo guardar» (RF-40). El texto del mensaje sigue
 * yendo a las notas de la bitácora como siempre (RF-43): eso lo hace `dias.ts`.
 *
 * ── Repetir no duplica (RF-42) ──
 *
 * El id sale de la máquina, la clase y el día, no del mensaje: el mismo cambio de
 * aceite contado en dos mensajes, o el mismo mensaje procesado dos veces, es un solo
 * registro (`on conflict do nothing`). Marcar resuelto solo toca los correctivos que
 * siguen pendientes.
 */
import { and, eq, isNull, lte } from 'drizzle-orm';

import { baseServidor } from '@/db/servidor/cliente';
import { mantenimientos } from '@/db/servidor/esquema';
import { lecturasAnteriores } from '@/features/bitacoras/servidor/lecturas';
import { fechaDeJornada, sumarDias } from '@/shared/rules/jornada';
import { faltasDelReporte, type ReporteDelDia } from '@/shared/rules/whatsapp';
import { separarRenglones } from '@/shared/rules/whatsapp-automatico';

import { ACTOR_SISTEMA, type Actor } from './actor';
import { apartar } from './apartados';
import { idDeterminista } from './ids';

/** Lo que pasó con los mantenimientos de un mensaje. */
export interface MantenimientosGuardados {
  /** Los ids de los registros nuevos. */
  guardados: string[];
  /** Los que ya estaban registrados: la misma máquina, clase y día (RF-42). */
  repetidos: number;
  /** Los correctivos que quedaron resueltos (RF-41). */
  resueltos: number;
  /** Los renglones que fueron a «No se pudo guardar» (RF-40). */
  apartados: number;
}

const NADA: MantenimientosGuardados = { guardados: [], repetidos: 0, resueltos: 0, apartados: 0 };

/** El id fijo del mantenimiento de esa máquina, clase y día (RF-42). */
export function idDeMantenimiento(vehiculoId: string, clase: string, fecha: string): Promise<string> {
  return idDeterminista(vehiculoId, `mantenimiento-${clase}`, fecha);
}

/**
 * Guarda los mantenimientos del reporte (RF-36 a RF-42). Sin fecha válida no se sabe
 * de qué día son: no se guarda nada aquí, y el mensaje entero se aparta por la fecha
 * cuando se arma su día.
 *
 * `actor` es quien queda como autor: el sistema al procesar el mensaje, o la persona
 * que completa el renglón en «No se pudo guardar» (RF-40). El origen sigue siendo
 * WhatsApp: el dato salió del mensaje.
 */
export async function guardarMantenimientos(datos: {
  mensajeId: string;
  obraId: string;
  reporte: ReporteDelDia;
  actor?: Actor;
}): Promise<MantenimientosGuardados> {
  const { mensajeId, obraId, reporte } = datos;
  const actor = datos.actor ?? ACTOR_SISTEMA;
  const lista = reporte.mantenimientos ?? [];
  const fecha = reporte.fecha;
  if (lista.length === 0 || !fecha || fecha > fechaDeJornada()) return NADA;

  // Solo las faltas de esta sección: las demás las aparta el día al armarse.
  const faltas = faltasDelReporte(reporte, { hoy: fechaDeJornada(), claseDeMedidor: () => 'horometro' }).filter(
    (f) => f.seccion === 'mantenimientos',
  );
  const { excepciones } = separarRenglones(reporte, faltas);
  await apartar(mensajeId, excepciones);
  const fuera = new Set(excepciones.map((e) => e.renglon));

  // La lectura que no dijo el mensaje es la última registrada hasta ese día (RF-38).
  const lecturas = await lecturasAnteriores(obraId, sumarDias(fecha, 1));

  const db = baseServidor();
  const resultado: MantenimientosGuardados = { ...NADA, guardados: [], apartados: excepciones.length };
  for (const [renglon, m] of lista.entries()) {
    if (fuera.has(renglon) || !m.vehiculoId) continue;

    if (m.clase) {
      const [nuevo] = await db
        .insert(mantenimientos)
        .values({
          id: await idDeMantenimiento(m.vehiculoId, m.clase, fecha),
          vehiculoId: m.vehiculoId,
          obraId,
          clase: m.clase,
          fecha,
          lectura: m.lectura ?? lecturas[m.vehiculoId]?.valor ?? null,
          nota: m.descripcion,
          origen: 'whatsapp',
          mensajeId,
          registradoPor: actor.id,
        })
        .onConflictDoNothing()
        .returning({ id: mantenimientos.id });
      if (nuevo) resultado.guardados.push(nuevo.id);
      else resultado.repetidos++;
    }

    // «Ya quedó reparada»: cierra lo que esté pendiente de esa máquina hasta ese día,
    // incluido el correctivo que acaba de registrar el mismo mensaje (RF-41). Si no hay
    // ninguno, no hay nada que hacer: no se aparta.
    if (m.resuelto) {
      const resueltos = await db
        .update(mantenimientos)
        .set({
          resueltoEn: fecha,
          resueltoPor: actor.id,
          notaResuelto: m.descripcion || 'Resuelto por WhatsApp.',
        })
        .where(
          and(
            eq(mantenimientos.vehiculoId, m.vehiculoId),
            eq(mantenimientos.clase, 'correctivo'),
            lte(mantenimientos.fecha, fecha),
            isNull(mantenimientos.resueltoEn),
            isNull(mantenimientos.anuladoEn),
          ),
        )
        .returning({ id: mantenimientos.id });
      resultado.resueltos += resueltos.length;
    }
  }
  return resultado;
}
