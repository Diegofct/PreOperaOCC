/**
 * El informe de cumplimiento de una obra (spec 043, RF-54, RF-58 a RF-91, RF-96, RF-98).
 * **Solo servidor.**
 *
 * Este módulo solo junta datos y llama a la regla: toda la cuenta vive en
 * `shared/rules/cumplimiento-de-obra.ts`. Es la única fuente de la pantalla, las descargas y el
 * asistente (RF-96): si alguno armara su propia consulta, en la siguiente revisión darían cifras
 * distintas para la misma semana sin que nada falle a la vista.
 *
 * ── Los planes semanales (spec 044, RF-70 a RF-77, RF-107) ──
 *
 * El informe de una semana carga los planes de esa semana que alguna vez se aprobaron, vigentes y
 * anulados: uno anulado sigue midiendo los días que rigió (044/RF-68). Qué plan mide cada día y qué
 * pasa sin planificación lo decide la regla; aquí solo se traen. El del mes no los carga, porque su
 * meta sale siempre de la planificación (044/RF-74). Sin planes, el informe es el de la 043.
 *
 * No escribe nada (RF-98): lee planificaciones aprobadas y partes, y el informe se recalcula cada
 * vez que se abre. Un informe ya entregado puede variar si después se anula o se cierra un parte de
 * ese periodo, y eso es lo acordado (casos límite de la spec).
 *
 * Lo que se quita para el Residente se quita aquí, con `informeSegunRol`, antes de que salga del
 * servidor: la pantalla no esconde columnas, nunca las recibe (RF-88, RF-89).
 */
import { and, eq, gte, inArray, isNotNull, lte } from 'drizzle-orm';

import { baseServidor } from '@/db/servidor/cliente';
import { partesDeObra, planesSemanales, planificaciones } from '@/db/servidor/esquema';
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
  type PlanSemanalParaMedir,
  type VersionDelInforme,
} from '@/shared/rules/cumplimiento-de-obra';
import { fechaDeJornada } from '@/shared/rules/jornada';
import { lunesDe, metasPorDiaDelPlan } from '@/shared/rules/plan-semanal';

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

/**
 * Spec 044, RF-68, RF-70: los planes de las semanas del periodo que alguna vez se aprobaron. Un
 * borrador o un descartado nunca rigió; un anulado sí, hasta el día anterior a anularlo.
 */
async function planesAprobados(obraId: string, periodo: PeriodoDeMeta): Promise<PlanSemanalParaMedir[]> {
  // 044/RF-74: la meta del mes no sale de los planes, así que no se consultan.
  if (periodo.tipo !== 'semana') return [];
  const filas = await baseServidor()
    .select({
      id: planesSemanales.id,
      semana: planesSemanales.semana,
      rigeDesde: planesSemanales.rigeDesde,
      rigeHasta: planesSemanales.rigeHasta,
      estructura: planesSemanales.estructura,
    })
    .from(planesSemanales)
    .where(
      and(
        eq(planesSemanales.obraId, obraId),
        inArray(planesSemanales.estado, ['vigente', 'anulado']),
        isNotNull(planesSemanales.rigeDesde),
        gte(planesSemanales.semana, lunesDe(periodo.desde)),
        lte(planesSemanales.semana, periodo.hasta),
      ),
    );
  return filas.map((p) => ({
    id: p.id,
    semana: p.semana,
    rigeDesde: p.rigeDesde as string,
    rigeHasta: p.rigeHasta,
    metasPorDia: metasPorDiaDelPlan(p.estructura),
  }));
}

export interface OpcionesDelInforme {
  /**
   * Spec 044, RF-35: el informe como si no hubiera planes semanales. Lo pide la propuesta de la IA
   * para la semana que va a planear: su punto de partida es lo que la planificación estimaría, no
   * lo que ya decía un plan anterior de esa misma semana.
   */
  sinPlanes?: boolean;
}

/** RF-58 a RF-85: el informe completo, con plata. Lo usan la ruta, las descargas y el asistente. */
export async function informeDeLaObra(
  obraId: string,
  tipo: PeriodoDeMeta['tipo'],
  fecha: string,
  opciones: OpcionesDelInforme = {},
): Promise<InformeDeCumplimiento> {
  const periodo = periodoDelInforme(tipo, fecha);
  const [{ versiones, mesesCumplidos }, partes, planes] = await Promise.all([
    versionesDeLaObra(obraId),
    partesHasta(obraId, periodo.hasta),
    opciones.sinPlanes ? [] : planesAprobados(obraId, periodo),
  ]);
  return informeDeCumplimiento({
    periodo,
    hoy: fechaDeJornada(),
    versiones,
    partesDelPeriodo: partes.filter((p) => p.fecha >= periodo.desde),
    partesAcumuladas: partes,
    mesesCumplidos,
    planesSemanales: planes,
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
