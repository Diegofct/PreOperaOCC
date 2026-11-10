/**
 * El informe de cumplimiento de una obra (spec 043, RF-54, RF-58 a RF-91, RF-96, RF-98).
 * **Solo servidor.**
 *
 * Este módulo solo junta datos y llama a la regla: toda la cuenta vive en
 * `shared/rules/cumplimiento-de-obra.ts`. Es la única fuente de la pantalla, las descargas y el
 * asistente (RF-96): si alguno armara su propia consulta, en la siguiente revisión darían cifras
 * distintas para la misma semana sin que nada falle a la vista.
 *
 * No escribe nada (RF-98): lee planificaciones aprobadas y partes, y el informe se recalcula cada
 * vez que se abre. Un informe ya entregado puede variar si después se anula o se cierra un parte de
 * ese periodo, y eso es lo acordado (casos límite de la spec).
 *
 * Lo que se quita para el Residente se quita aquí, con `informeSegunRol`, antes de que salga del
 * servidor: la pantalla no esconde columnas, nunca las recibe (RF-88, RF-89).
 */
import { and, eq, isNotNull, lte } from 'drizzle-orm';

import { baseServidor } from '@/db/servidor/cliente';
import { partesDeObra, planificaciones } from '@/db/servidor/esquema';
import type { PersonaEnSesion } from '@/features/servidor/guardia';
import {
  informeDeCumplimiento,
  informeSegunRol,
  periodoDelInforme,
  versionMedible,
  type InformeDeCumplimiento,
  type InformeEnCantidades,
  type ParteMedido,
  type PeriodoDeMeta,
  type VersionDelInforme,
} from '@/shared/rules/cumplimiento-de-obra';
import { fechaDeJornada } from '@/shared/rules/jornada';

/** Las versiones que alguna vez se aprobaron, también las reemplazadas y anuladas (RF-52, RF-57). */
async function versionesDeLaObra(obraId: string): Promise<{ versiones: VersionDelInforme[]; mesesCumplidos: string[] }> {
  const filas = await baseServidor()
    .select()
    .from(planificaciones)
    .where(and(eq(planificaciones.obraId, obraId), isNotNull(planificaciones.aprobadoEn), isNotNull(planificaciones.rigeDesde)));

  const versiones = filas.map((p) => ({
    ...versionMedible(
      { id: p.id, numeroVersion: p.numeroVersion, rigeDesde: p.rigeDesde as string, rigeHasta: p.rigeHasta },
      p.estructura.items,
      { indirectos: p.estructura.indirectos, rubros: p.estructura.rubros, lineaDeRubros: p.estructura.lineaDeRubros },
    ),
    items: p.estructura.items,
  }));
  // RF-121 a RF-125: los meses se marcan al aprobar la primera, y siguen marcados con las demás.
  const mesesCumplidos = [...new Set(filas.flatMap((p) => p.mesesCumplidos.map((m) => m.mes)))].sort();
  return { versiones, mesesCumplidos };
}

/** Los partes de la obra hasta el fin del periodo, para lo del periodo y el acumulado (RF-129). */
async function partesHasta(obraId: string, hasta: string): Promise<ParteMedido[]> {
  const filas = await baseServidor()
    .select({ fecha: partesDeObra.fecha, cerradoEn: partesDeObra.cerradoEn, anuladoEn: partesDeObra.anuladoEn, actividades: partesDeObra.actividades })
    .from(partesDeObra)
    .where(and(eq(partesDeObra.obraId, obraId), lte(partesDeObra.fecha, hasta)));
  return filas.map((p) => ({ fecha: p.fecha, cerrado: p.cerradoEn !== null, anulado: p.anuladoEn !== null, actividades: p.actividades }));
}

/** RF-58 a RF-85: el informe completo, con plata. Lo usan la ruta, las descargas y el asistente. */
export async function informeDeLaObra(obraId: string, tipo: PeriodoDeMeta['tipo'], fecha: string): Promise<InformeDeCumplimiento> {
  const periodo = periodoDelInforme(tipo, fecha);
  const [{ versiones, mesesCumplidos }, partes] = await Promise.all([versionesDeLaObra(obraId), partesHasta(obraId, periodo.hasta)]);
  return informeDeCumplimiento({
    periodo,
    hoy: fechaDeJornada(),
    versiones,
    partesDelPeriodo: partes.filter((p) => p.fecha >= periodo.desde),
    partesAcumuladas: partes,
    mesesCumplidos,
    // Spec 044: el plan semanal aprobado mandará sobre la meta estimada (RF-64). Hasta entonces, no hay.
    planSemanal: null,
  });
}

/** RF-87 a RF-89: el informe que le toca a quien pregunta. Al Residente, sin una sola cifra de plata. */
export async function informeParaLaPersona(
  sesion: PersonaEnSesion,
  obraId: string,
  tipo: PeriodoDeMeta['tipo'],
  fecha: string,
): Promise<InformeDeCumplimiento | InformeEnCantidades> {
  return informeSegunRol(await informeDeLaObra(obraId, tipo, fecha), sesion.rol);
}
