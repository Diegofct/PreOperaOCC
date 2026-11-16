/**
 * Guardar el borrador de planificación editado en pantalla (spec 045, RF-44 a RF-60, RF-137).
 * **Solo servidor.**
 *
 * ── El servidor recalcula, no copia ──
 *
 * La pantalla manda el borrador editable completo y nada más: `edicionDeBorradorPedida` descarta lo
 * contractual y cualquier total, y aquí se vuelve a correr la misma regla que corrió la pantalla
 * (`aplicarEdicion`, que termina en `recalcularPlanificacion`). Lo que se guarda —importes, reparto,
 * indirectos, hallazgos, resumen— sale de esa regla (RF-57, RF-160). Un navegador que mande otros
 * totales no cambia nada.
 *
 * ── Bloqueo optimista ──
 *
 * Como el plan semanal (044) y aprobar (043): el pedido trae la `version` que vio la persona, y la
 * actualización solo toca la fila si sigue siendo borrador y con esa versión. Si otra persona guardó
 * antes, ninguna fila cambia y se responde 409 (RF-58); la pantalla ofrece volver a cargar (RF-59).
 * Sin transacciones interactivas (Neon por HTTP) esa condición en el `where` es la garantía, no la
 * comprobación previa, que solo da un mensaje más claro.
 *
 * ── Nueva versión desde la vigente (RF-138 a RF-144) ──
 *
 * Se copia todo lo decidido (`copiarVersion`) en un borrador nuevo, con `origen = 'copia'` y la
 * versión de la que salió. No pasa por la IA ni por una lectura: se escribe en el mismo lote que
 * descarta el borrador sustituido. Una vigente de la 043 se copia normalizada, con «Indirectos sin
 * desglose» marcado (RF-140, RF-141).
 */
import { and, eq, inArray } from 'drizzle-orm';
import { uuidv7 } from 'uuidv7';

import { baseServidor } from '@/db/servidor/cliente';
import { obras, planificaciones } from '@/db/servidor/esquema';
import { leerContrato } from '@/features/contratos/servidor/contrato';
import {
  edicionDelPedido,
  type BorradorGuardado,
  type EdicionDeBorradorPedida,
  type FuenteDeIndirectosFila,
  type PlanificacionDetalle,
} from '@/features/panel/planificacion';
import { filtroDeObra } from '@/features/servidor/alcance';
import type { PersonaEnSesion } from '@/features/servidor/guardia';
import { errorDePeticion, noEncontrado } from '@/features/servidor/respuestas';
import {
  hallazgosDelBorrador,
  impedimentosParaAprobar,
  resumenDeLaPlanificacion,
  type ResumenDeLaPlanificacion,
  type TotalesDelExcel,
} from '@/shared/rules/planificacion';
import { aplicarEdicion, copiarVersion, recalcularPlanificacion } from '@/shared/rules/planificacion-borrador';
import { renglonesParaCopiar } from '@/shared/rules/planificacion-indirectos';
import { diferenciasPorConcepto } from '@/shared/rules/planificacion-ia';

import { choqueConElBorrador, enCursoEnLaObra, escribirBorrador } from './lecturas';
import { detalleDePlanificacion, planificacionAlAlcance } from './planificaciones';

export const MENSAJE_DE_CHOQUE_AL_GUARDAR =
  'Otra persona guardó este borrador después de que usted lo abrió. Vuelva a cargarlo para ver sus cambios antes de seguir.';

/**
 * Los totales del Excel con que se comparó al leerlo. Solo quedaron guardados los que no cuadraban
 * (`diferenciasConElExcel`); los que cuadraban no hace falta volver a compararlos.
 */
function totalesDelExcelDe(resumen: ResumenDeLaPlanificacion): TotalesDelExcel {
  return Object.fromEntries(resumen.diferenciasConElExcel.map((d) => [d.concepto, d.delExcel]));
}

/** RF-44 a RF-60, RF-137: valida, recalcula y guarda con bloqueo optimista. */
export async function guardarBorrador(
  sesion: PersonaEnSesion,
  id: string,
  pedido: EdicionDeBorradorPedida,
): Promise<BorradorGuardado | Response> {
  const fila = await planificacionAlAlcance(sesion, id);
  if (!fila) return noEncontrado('esa planificación');
  // RF-137, principio de la constitución: una aprobada no se edita; se hace una versión nueva.
  if (fila.estado !== 'borrador') {
    return errorDePeticion('Solo se edita un borrador. Para cambiar una planificación aprobada, cree una versión nueva.', 409);
  }
  if (fila.version !== pedido.version) return errorDePeticion(MENSAJE_DE_CHOQUE_AL_GUARDAR, 409);

  const editado = aplicarEdicion(fila.estructura, edicionDelPedido(pedido));
  if (!editado.ok) return Response.json({ error: editado.errores[0], errores: editado.errores }, { status: 422 });

  const { estructura } = editado;
  const { calculo } = recalcularPlanificacion(estructura);
  const { contrato } = await leerContrato(fila.obraId);
  const hallazgos = hallazgosDelBorrador(estructura, contrato?.fechaFin ?? null, calculo.hallazgosDeReparto);
  const resumen = resumenDeLaPlanificacion(estructura, totalesDelExcelDe(fila.resumen));

  const guardado = await baseServidor()
    .update(planificaciones)
    .set({
      estructura,
      hallazgos,
      resumen,
      version: pedido.version + 1,
      // RF-60: quién guardó y cuándo.
      actualizadoPor: sesion.id,
      actualizadoEn: new Date(),
    })
    .where(and(eq(planificaciones.id, fila.id), eq(planificaciones.estado, 'borrador'), eq(planificaciones.version, pedido.version)))
    .returning({ id: planificaciones.id });
  if (guardado.length === 0) return errorDePeticion(MENSAJE_DE_CHOQUE_AL_GUARDAR, 409);

  return {
    version: pedido.version + 1,
    estructura,
    calculo,
    hallazgos,
    impedimentos: impedimentosParaAprobar(estructura),
    descartados: editado.descartados,
    diferenciasPorConcepto: diferenciasPorConcepto(calculo.indirectosPorConcepto, estructura.totalesPorConceptoDelExcel ?? {}),
  };
}

/**
 * RF-138 a RF-144: un borrador nuevo copiando la vigente. Con un borrador en la obra pide confirmar
 * (409) y, confirmado, lo descarta en el mismo lote (RF-142, RF-143).
 */
export async function copiarVigente(
  sesion: PersonaEnSesion,
  id: string,
  pedido: { sustituir: boolean },
): Promise<PlanificacionDetalle | Response> {
  const vigente = await planificacionAlAlcance(sesion, id);
  if (!vigente) return noEncontrado('esa planificación');
  if (vigente.estado !== 'vigente') return errorDePeticion('Solo se hace una versión nueva desde la planificación vigente.', 409);

  const enCurso = await enCursoEnLaObra(vigente.obraId);
  if (enCurso) return enCurso;
  const choque = await choqueConElBorrador(vigente.obraId, pedido.sustituir);
  if (choque) return choque;

  const estructura = copiarVersion(vigente.estructura);
  const { calculo } = recalcularPlanificacion(estructura);
  const { contrato } = await leerContrato(vigente.obraId);
  const nuevoId = uuidv7();
  const escrito = await escribirBorrador(sesion, vigente.obraId, null, pedido.sustituir, {
    id: nuevoId,
    estructura,
    hallazgos: hallazgosDelBorrador(estructura, contrato?.fechaFin ?? null, calculo.hallazgosDeReparto),
    resumen: resumenDeLaPlanificacion(estructura),
    rechazados: [],
    huella: null,
    hojas: null,
    mediaId: null,
    origen: 'copia',
    copiadaDe: vigente.id,
    presupuestoId: vigente.presupuestoId,
    presupuestoVersion: vigente.presupuestoVersion,
  });
  if (!escrito) return errorDePeticion('No se pudo crear la versión nueva. Vuelva a intentarlo.', 409);

  const creada = await planificacionAlAlcance(sesion, nuevoId);
  return creada ? detalleDePlanificacion(creada, sesion) : noEncontrado('la versión nueva');
}

/**
 * RF-112, RF-113: las planificaciones de las que se pueden copiar indirectos, de esta obra o de
 * otra, dentro del alcance de quien pregunta. Vigentes y reemplazadas con renglones desglosados.
 */
export async function fuentesDeIndirectos(sesion: PersonaEnSesion): Promise<FuenteDeIndirectosFila[]> {
  const filas = await baseServidor()
    .select({
      id: planificaciones.id,
      obraId: planificaciones.obraId,
      obra: obras.nombre,
      numeroVersion: planificaciones.numeroVersion,
      estado: planificaciones.estado,
      estructura: planificaciones.estructura,
    })
    .from(planificaciones)
    .innerJoin(obras, eq(obras.id, planificaciones.obraId))
    .where(and(inArray(planificaciones.estado, ['vigente', 'reemplazada']), filtroDeObra(sesion, planificaciones.obraId)));
  return filas.flatMap((fila): FuenteDeIndirectosFila[] => {
    const renglones = renglonesParaCopiar(fila.estado, fila.estructura);
    if (!renglones || (fila.estado !== 'vigente' && fila.estado !== 'reemplazada')) return [];
    return [{ id: fila.id, obraId: fila.obraId, obra: fila.obra, numeroVersion: fila.numeroVersion, estado: fila.estado, renglones: renglones.length }];
  });
}
