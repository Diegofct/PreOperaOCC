/**
 * Los planes semanales de una obra: listar, crear vacío, el detalle según quién mira y guardar el
 * borrador (spec 044, RF-5, RF-22, RF-23, RF-55, RF-64, RF-78, RF-79, RF-86, RF-87). **Solo servidor.**
 *
 * Este módulo junta datos y llama a la regla (`shared/rules/plan-semanal.ts`); las cuentas viven allí.
 *
 * ── Lo que se le cree al navegador ──
 *
 * La forma la revisa el esquema de la ruta; aquí se repite lo que decide: que la suma de cada actividad
 * cuadre con su meta (RF-23) y que cada día se pueda marcar. Y cada actividad de ítem se vuelve a cruzar
 * con la planificación del plan: una llave que no está en ella pasa a «fuera», venga de la pantalla o
 * de un envío a mano, porque lo que es un ítem es lo que mide el cumplimiento.
 *
 * ── La plata ──
 *
 * Los valores no se guardan (RF-94): se calculan aquí cada vez con el costo de la planificación vigente,
 * o con la del plan si la obra ya no tiene vigente. Al Residente le sale la proyección sin plata
 * (`planSinPlata`) antes de que la respuesta deje el servidor (RF-29, RF-30, RF-102): la pantalla no
 * esconde nada, nunca lo recibe. Es el mismo criterio de rol de `informeSegunRol` en la 043.
 *
 * Por lo mismo, lo que el Residente guarda no trae el valor de los rubros ni los textos con pesos:
 * antes de escribir se le devuelve al plan lo que él no vio (`conservarLoQueNoVeElResidente`). Sin eso,
 * su primer guardado borraría los valores y dejaría escrito el texto de reemplazo.
 *
 * ── Dos personas a la vez ──
 *
 * Guardar exige la `version` que se leyó (RF-86), y la escritura es una sola sentencia condicionada a
 * esa versión y a que siga en borrador: Neon por HTTP no da transacciones interactivas, y así un
 * segundo guardado no pisa al primero ni edita un plan que se aprobó entretanto (RF-64).
 *
 * El alcance es el de la 043: la obra con `obraDelContrato` al listar y crear, y en lo de un plan se lee
 * la fila y se mira su obra con `alcanzaLaObra`. Uno de otra obra responde 404, no 403.
 */
import { and, desc, eq, inArray, lte } from 'drizzle-orm';
import { uuidv7 } from 'uuidv7';

import { baseServidor } from '@/db/servidor/cliente';
import { partesDeObra, planesSemanales, planificaciones, usuarios } from '@/db/servidor/esquema';
import type { ItemParaElPlan, ListaDePlanesSemanales, PersonaDelPlan, PlanSemanalDetalle, PlanSemanalFila } from '@/features/panel/plan-semanal';
import { vehiculosDeLaObra } from '@/features/reportes/servidor/datos';
import { alcanzaLaObra } from '@/features/servidor/alcance';
import type { PersonaEnSesion } from '@/features/servidor/guardia';
import { errorDePeticion, noEncontrado } from '@/features/servidor/respuestas';
import { pendientesPorLlave } from '@/shared/rules/cumplimiento-de-obra';
import { fechaDeJornada } from '@/shared/rules/jornada';
import { alcanza } from '@/shared/rules/permisos';
import {
  avisosDelPlan,
  conservarLoQueNoVeElResidente,
  cruzarActividad,
  descuadreDeLaActividad,
  diasPorDefecto,
  faltaDeSemana,
  planSinPlata,
  preciosDeCosto,
  puedeAprobarPlan,
  quienApruebaElPlan,
  sePuedeMarcar,
  semanasPermitidas,
  valoresDelPlan,
  type ActividadDelPlan,
  type EstructuraDelPlan,
  type VistaDelPlan,
} from '@/shared/rules/plan-semanal';
import { llaveDeItemPlanificado } from '@/shared/rules/planificacion';

export type FilaDelPlan = typeof planesSemanales.$inferSelect;

/** RF-5, D15. */
/** RF-86: otra persona guardó después de que este lo abrió. */
const CAMBIO_ENTRETANTO = 'Otra persona guardó este plan después de que usted lo abrió. Recárguelo para ver sus cambios; los suyos no se aplicaron.';

export const SIN_PLANIFICACION = 'Esta obra no tiene una planificación aprobada vigente: primero hay que aprobar la planificación.';

/** Un plan recién empezado: los días por defecto y nada más (RF-19). */
function estructuraVacia(semana: string): EstructuraDelPlan {
  return {
    dias: diasPorDefecto(semana),
    actividades: [],
    personal: [],
    maquinaria: [],
    materiales: [],
    volquetas: { conceptos: [], requeridas: null, propias: null, externas: null },
    supuestos: '',
    riesgos: [],
    requerimientos: '',
  };
}

export async function planificacionVigente(obraId: string) {
  const [vigente] = await baseServidor()
    .select()
    .from(planificaciones)
    .where(and(eq(planificaciones.obraId, obraId), eq(planificaciones.estado, 'vigente')))
    .limit(1);
  return vigente ?? null;
}

/** Nombre y cargo de las personas que aparecen en los planes, en una sola consulta. */
async function personas(ids: (string | null)[]): Promise<Map<string, PersonaDelPlan>> {
  const unicos = [...new Set(ids.filter((id): id is string => id !== null))];
  if (unicos.length === 0) return new Map();
  const filas = await baseServidor()
    .select({ id: usuarios.id, nombre: usuarios.nombreCompleto, rol: usuarios.rol })
    .from(usuarios)
    .where(inArray(usuarios.id, unicos));
  return new Map(filas.map((u) => [u.id, u]));
}

function persona(quienes: Map<string, PersonaDelPlan>, id: string | null): PersonaDelPlan | null {
  if (id === null) return null;
  return quienes.get(id) ?? { id, nombre: 'Persona sin registro', rol: 'operador' };
}

function fila(p: FilaDelPlan, quienes: Map<string, PersonaDelPlan>): PlanSemanalFila {
  return {
    id: p.id,
    semana: p.semana,
    estado: p.estado,
    origen: p.origen,
    creadoPor: persona(quienes, p.creadoPor) as PersonaDelPlan,
    aprobadoPor: persona(quienes, p.aprobadoPor),
    aprobadoEn: p.aprobadoEn?.toISOString() ?? null,
    rigeDesde: p.rigeDesde,
    rigeHasta: p.rigeHasta,
    anuladoEn: p.anuladoEn?.toISOString() ?? null,
    motivoAnulacion: p.motivoAnulacion,
    creadoEn: p.creadoEn.toISOString(),
  };
}

/** RF-2, RF-78: las semanas que se pueden planear hoy y los planes de la obra, la semana más nueva primero. */
export async function listarPlanesSemanales(obraId: string): Promise<ListaDePlanesSemanales> {
  const [filas, vigente] = await Promise.all([
    baseServidor()
      .select()
      .from(planesSemanales)
      .where(eq(planesSemanales.obraId, obraId))
      .orderBy(desc(planesSemanales.semana), desc(planesSemanales.creadoEn)),
    planificacionVigente(obraId),
  ]);
  const quienes = await personas(filas.flatMap((p) => [p.creadoPor, p.aprobadoPor]));
  return { semanas: semanasPermitidas(fechaDeJornada()), planes: filas.map((p) => fila(p, quienes)), hayPlanificacion: vigente !== null };
}

/** RF-1 a RF-5, RF-50, RF-55: un borrador en blanco, con quien lo empezó como autor. */
export async function crearPlanVacio(sesion: PersonaEnSesion, obraId: string, semana: string): Promise<{ id: string } | Response> {
  const falta = faltaDeSemana(semana, fechaDeJornada());
  if (falta) return errorDePeticion(falta, 400);
  const vigente = await planificacionVigente(obraId);
  if (!vigente) return errorDePeticion(SIN_PLANIFICACION, 409);

  const id = uuidv7();
  // RF-50: el índice parcial deja un solo borrador por obra y semana; el segundo no entra.
  const creado = await baseServidor()
    .insert(planesSemanales)
    .values({
      id,
      obraId,
      semana,
      origen: 'manual',
      estructura: estructuraVacia(semana),
      planificacionId: vigente.id,
      creadoPor: sesion.id,
      actualizadoPor: sesion.id,
    })
    .onConflictDoNothing()
    .returning({ id: planesSemanales.id });
  if (creado.length === 0) return errorDePeticion('Ya hay un borrador de esa semana: ábralo para seguir ajustándolo.', 409);
  return { id };
}

/** RF-79: el plan, si su obra está al alcance de quien pregunta. */
export async function planAlAlcance(sesion: PersonaEnSesion, id: string): Promise<FilaDelPlan | null> {
  const [encontrado] = await baseServidor().select().from(planesSemanales).where(eq(planesSemanales.id, id)).limit(1);
  return encontrado && alcanzaLaObra(sesion, encontrado.obraId) ? encontrado : null;
}

/**
 * RF-26 a RF-33, RF-48, RF-93, RF-100: valores y avisos del plan, calculados ahora. Lo pendiente es
 * al día de hoy, con los partes de la obra hasta hoy: el mismo «pendiente total» del informe.
 */
async function datosDelPlan(p: FilaDelPlan): Promise<{ vista: VistaDelPlan; items: ItemParaElPlan[] }> {
  const db = baseServidor();
  const [vigente, [delPlan], partes] = await Promise.all([
    planificacionVigente(p.obraId),
    db.select().from(planificaciones).where(eq(planificaciones.id, p.planificacionId)).limit(1),
    db
      .select({ fecha: partesDeObra.fecha, cerradoEn: partesDeObra.cerradoEn, anuladoEn: partesDeObra.anuladoEn, actividades: partesDeObra.actividades })
      .from(partesDeObra)
      .where(and(eq(partesDeObra.obraId, p.obraId), lte(partesDeObra.fecha, fechaDeJornada()))),
  ]);
  const items = (vigente ?? delPlan)?.estructura.items ?? [];
  const valores = valoresDelPlan(p.estructura.actividades, preciosDeCosto(items));
  const pendientes = pendientesPorLlave(
    items,
    partes.map((x) => ({ fecha: x.fecha, cerrado: x.cerradoEn !== null, anulado: x.anuladoEn !== null, actividades: x.actividades })),
  );
  const avisos = avisosDelPlan({
    actividades: p.estructura.actividades,
    pendientes,
    sinCosto: valores.sinCosto,
    diferenciasConElExcel: p.diferenciasExcel,
    planificacion: vigente ? { usada: p.planificacionId, vigente: vigente.id, numeroVigente: vigente.numeroVersion } : null,
  });
  // RF-31, RF-93: los ítems entre los que se escoge son los de la planificación con que se cruza al
  // guardar (la del plan), cada uno con lo que le falta hoy.
  // Dos renglones con la misma llave (pasa con los que no traen ítem de pago) son uno solo para el
  // cumplimiento, y aquí también: se ofrece el primero.
  const vistas = new Set<string>();
  const paraEscoger = (delPlan?.estructura.items ?? items).flatMap((i) => {
    const llave = llaveDeItemPlanificado(i);
    if (vistas.has(llave)) return [];
    vistas.add(llave);
    return {
      llave,
      item: i.delPresupuesto?.item ?? i.item,
      renglon: i.renglon,
      descripcion: i.descripcion,
      unidad: i.unidad,
      capitulo: i.delPresupuesto?.capitulo ?? i.capitulo,
      pendiente: pendientes.get(llave) ?? null,
    };
  });
  return { vista: { estructura: p.estructura, valores, avisos }, items: paraEscoger };
}

/** Los valores y avisos del plan, calculados ahora. Los vuelve a pedir la aprobación (RF-60). */
export async function vistaDelPlan(p: FilaDelPlan): Promise<VistaDelPlan> {
  return (await datosDelPlan(p)).vista;
}

/** RF-29, RF-30, RF-55 a RF-60, RF-79, RF-87, RF-102: el detalle, sin plata para el Residente. */
export async function detalleDelPlan(sesion: PersonaEnSesion, p: FilaDelPlan): Promise<PlanSemanalDetalle> {
  const [{ vista, items }, quienes, flota] = await Promise.all([
    datosDelPlan(p),
    personas([p.creadoPor, p.aprobadoPor, p.actualizadoPor]),
    vehiculosDeLaObra(p.obraId),
  ]);
  const autor = persona(quienes, p.creadoPor) as PersonaDelPlan;
  return {
    ...fila(p, quienes),
    obraId: p.obraId,
    version: p.version,
    actualizadoPor: persona(quienes, p.actualizadoPor),
    actualizadoEn: p.actualizadoEn.toISOString(),
    vista: sesion.rol === 'residente' ? planSinPlata(vista) : vista,
    rechazados: p.rechazados,
    items,
    // RF-9: la maquinaria propia se escoge entre estos.
    vehiculos: flota.map((v) => ({ id: v.id, codigo: v.codigo, tipo: v.tipo })),
    puedeAprobar: p.estado === 'borrador' && alcanza(sesion.rol, 'plan_semanal', 'aprobar') && puedeAprobarPlan(sesion.rol, autor.rol),
    // RF-65: anula el vigente quien podría aprobarlo; la ruta lo vuelve a mirar.
    puedeAnular: p.estado === 'vigente' && alcanza(sesion.rol, 'plan_semanal', 'anular') && puedeAprobarPlan(sesion.rol, autor.rol),
    quienAprueba: quienApruebaElPlan(autor.rol),
  };
}

/** RF-6, RF-17, RF-18, RF-23: por qué no se guarda, señalando la actividad; `null` si cuadra. */
function faltaParaGuardar(estructura: EstructuraDelPlan, semana: string): string | null {
  const diaRaro = estructura.dias.find((dia) => !sePuedeMarcar(dia, semana));
  if (diaRaro) return `El ${diaRaro} no es un día de lunes a sábado de esta semana.`;
  for (const [n, actividad] of estructura.actividades.entries()) {
    const descuadre = descuadreDeLaActividad(actividad, estructura.dias);
    if (descuadre) {
      const nombre = [actividad.item, actividad.descripcion].filter(Boolean).join(' ') || `la actividad ${n + 1}`;
      return `${nombre}: ${descuadre}`;
    }
  }
  return null;
}

/** RF-31, RF-41, RF-88: lo que dice ser un ítem se vuelve a cruzar; si no cruza, queda «fuera». */
function recruzar(actividad: ActividadDelPlan, items: Parameters<typeof cruzarActividad>[1]): ActividadDelPlan {
  if (actividad.tipo !== 'item') return actividad;
  const cruzada = cruzarActividad({ ...actividad, llave: actividad.llave ?? '' }, items);
  return actividad.revisar ? { ...cruzada, revisar: true } : cruzada;
}

/** RF-22, RF-23, RF-64, RF-86, RF-87: guarda el borrador si nadie lo cambió desde que se abrió. */
export async function guardarPlan(
  sesion: PersonaEnSesion,
  p: FilaDelPlan,
  pedido: { version: number; estructura: EstructuraDelPlan },
): Promise<{ version: number } | Response> {
  if (p.estado !== 'borrador') return errorDePeticion('Un plan aprobado, anulado o descartado no se edita.', 409);
  // RF-29, RF-102: el Residente no recibió el valor de los rubros ni los textos con pesos; lo que
  // manda no los trae, y se le devuelven al plan antes de guardar.
  const pedida = sesion.rol === 'residente' ? conservarLoQueNoVeElResidente(p.estructura, pedido.estructura) : pedido.estructura;
  const falta = faltaParaGuardar(pedida, p.semana);
  if (falta) return errorDePeticion(falta, 400);

  const db = baseServidor();
  const [delPlan] = await db.select().from(planificaciones).where(eq(planificaciones.id, p.planificacionId)).limit(1);
  if (!delPlan) return noEncontrado('la planificación de este plan');
  const estructura = { ...pedida, actividades: pedida.actividades.map((a) => recruzar(a, delPlan.estructura.items)) };

  const [guardado] = await db
    .update(planesSemanales)
    .set({ estructura, actualizadoPor: sesion.id, version: pedido.version + 1 })
    .where(and(eq(planesSemanales.id, p.id), eq(planesSemanales.version, pedido.version), eq(planesSemanales.estado, 'borrador')))
    .returning({ version: planesSemanales.version });
  if (guardado) return guardado;

  // Por qué no entró: se aprobó o descartó entretanto, o alguien guardó antes (RF-86).
  const [ahora] = await db.select({ estado: planesSemanales.estado }).from(planesSemanales).where(eq(planesSemanales.id, p.id)).limit(1);
  if (ahora && ahora.estado !== 'borrador') return errorDePeticion('El plan ya no es un borrador: se aprobó o se sustituyó mientras lo ajustaba.', 409);
  return errorDePeticion(CAMBIO_ENTRETANTO, 409);
}
