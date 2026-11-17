/**
 * Las requisiciones de una obra frente a su planificación (spec 048). **Solo servidor.**
 *
 * Lee de una vez lo que la regla necesita —la planificación vigente de la obra y todas sus
 * requisiciones con sus renglones vigentes y sus compras— y le deja el cálculo a
 * `rules/requisicion-planificacion.ts`. Lo comprometido no se guarda en ninguna parte: se calcula
 * aquí en cada lectura (RF-33, RF-44), así que un cambio de versión, una compra anulada o una
 * cancelación se ven en la siguiente sin recalcular nada.
 *
 * Son cinco lecturas en paralelo por obra, no una por requisición: el detalle, la lista, la bandeja
 * y el resumen las piden una sola vez cada uno.
 */
import { and, eq, inArray, isNotNull, isNull } from 'drizzle-orm';

import { baseServidor } from '@/db/servidor/cliente';
import { compraRenglones, compras, planificaciones, solicitudCompraRenglones, solicitudesCompra, solicitudesPago } from '@/db/servidor/esquema';
import type { PlanificacionDelRenglon } from '@/features/panel/requisiciones';
import {
  aportesDeLasRequisiciones,
  avisosParaLaHistoria,
  cifrasDeLaRequisicion,
  marcaDeLaRequisicion,
  opcionesParaImputar,
  resolverImputacion,
  type Aporte,
  type AvisoEnLaHistoria,
  type ImputacionDelRenglon,
  type ImputacionPedida,
  type MarcaDePlanificacion,
  type OpcionParaImputar,
  type PlanificacionParaImputar,
  type RequisicionParaComprometer,
} from '@/shared/rules/requisicion-planificacion';
import { numeroQueSeVe, type TipoDeRequisicion } from '@/shared/rules/requisiciones';

/** Lo que una obra tiene para imputar y lo que ya está comprometido. */
export interface PlanificacionDeLaObra {
  planificaciones: PlanificacionParaImputar[];
  opciones: OpcionParaImputar[];
  aportes: Aporte[];
}

/** RF-6, D12: las planificaciones vigentes de la obra. Hoy, a lo sumo una (`ux_planificacion_vigente`). */
export async function planificacionesVigentes(obraId: string): Promise<PlanificacionParaImputar[]> {
  return baseServidor()
    .select({ id: planificaciones.id, estructura: planificaciones.estructura })
    .from(planificaciones)
    .where(and(eq(planificaciones.obraId, obraId), eq(planificaciones.estado, 'vigente')));
}

/** Las opciones para imputar en la obra (RF-6, RF-7, RF-35). */
export async function opcionesDeLaObra(obraId: string): Promise<{ planificaciones: PlanificacionParaImputar[]; opciones: OpcionParaImputar[] }> {
  const vigentes = await planificacionesVigentes(obraId);
  return { planificaciones: vigentes, opciones: opcionesParaImputar(vigentes) };
}

/**
 * Lo que aporta cada requisición de la obra a lo comprometido (RF-19 a RF-25, RF-56 a RF-60). Solo
 * las RQ: las SC y SP anteriores no se imputan (RF-25), y sus renglones ni se leen.
 */
export async function aportesDeLaObra(obraId: string): Promise<Aporte[]> {
  return aportesDeLasRequisiciones(await requisicionesDeLaObra(obraId));
}

/** Las RQ de la obra con sus renglones imputados vigentes y sus compras, como las lee la regla. */
async function requisicionesDeLaObra(obraId: string): Promise<RequisicionParaComprometer[]> {
  const db = baseServidor();
  const [deCompra, dePago] = await Promise.all([
    db
      .select({ id: solicitudesCompra.id, estado: solicitudesCompra.estado })
      .from(solicitudesCompra)
      .where(and(eq(solicitudesCompra.obraId, obraId), isNotNull(solicitudesCompra.numeroRequisicion))),
    db
      .select({
        id: solicitudesPago.id,
        estado: solicitudesPago.estado,
        imputacion: solicitudesPago.imputacion,
        valor: solicitudesPago.valor,
        valorAprobado: solicitudesPago.valorAprobado,
      })
      .from(solicitudesPago)
      .where(and(eq(solicitudesPago.obraId, obraId), isNotNull(solicitudesPago.numeroRequisicion), isNotNull(solicitudesPago.imputacion))),
  ]);

  const ids = deCompra.map((s) => s.id);
  const [renglones, comprasDeLaObra, enlaces] =
    ids.length === 0
      ? [[], [], []]
      : await Promise.all([
          db
            .select({
              id: solicitudCompraRenglones.id,
              solicitudId: solicitudCompraRenglones.solicitudId,
              imputacion: solicitudCompraRenglones.imputacion,
              cantidad: solicitudCompraRenglones.cantidad,
              cantidadAprobada: solicitudCompraRenglones.cantidadAprobada,
              valorEstimado: solicitudCompraRenglones.valorEstimado,
            })
            .from(solicitudCompraRenglones)
            .where(
              and(
                inArray(solicitudCompraRenglones.solicitudId, ids),
                isNull(solicitudCompraRenglones.reemplazadoEn),
                isNotNull(solicitudCompraRenglones.imputacion),
              ),
            ),
          db
            .select({ id: compras.id, solicitudId: compras.solicitudId, valor: compras.valor, anuladaEn: compras.anuladaEn })
            .from(compras)
            .where(inArray(compras.solicitudId, ids)),
          db
            .select({ compraId: compraRenglones.compraId, renglonId: compraRenglones.renglonId, valor: compraRenglones.valor })
            .from(compraRenglones)
            .innerJoin(compras, eq(compras.id, compraRenglones.compraId))
            .where(inArray(compras.solicitudId, ids)),
        ]);

  const requisiciones: RequisicionParaComprometer[] = [
    ...deCompra.map(
      (s): RequisicionParaComprometer => ({
        tipo: 'compra',
        id: s.id,
        estado: s.estado,
        renglones: renglones
          .filter((r) => r.solicitudId === s.id)
          .map((r) => ({
            id: r.id,
            imputacion: r.imputacion,
            cantidad: Number(r.cantidad),
            cantidadAprobada: r.cantidadAprobada === null ? null : Number(r.cantidadAprobada),
            valorEstimado: r.valorEstimado,
          })),
        compras: comprasDeLaObra
          .filter((c) => c.solicitudId === s.id)
          .map((c) => ({
            id: c.id,
            valor: c.valor,
            anulada: c.anuladaEn !== null,
            renglones: enlaces.filter((e) => e.compraId === c.id).map((e) => ({ renglonId: e.renglonId, valor: e.valor })),
          })),
      }),
    ),
    ...dePago.map(
      (p): RequisicionParaComprometer => ({
        tipo: 'pago',
        id: p.id,
        estado: p.estado,
        imputacion: p.imputacion,
        valor: p.valor,
        valorAprobado: p.valorAprobado,
      }),
    ),
  ];
  return requisiciones;
}

/** Todo lo de la obra de una vez: opciones y aportes. */
export async function planificacionDeLaObra(obraId: string): Promise<PlanificacionDeLaObra> {
  const [{ planificaciones: vigentes, opciones }, aportes] = await Promise.all([opcionesDeLaObra(obraId), aportesDeLaObra(obraId)]);
  return { planificaciones: vigentes, opciones, aportes };
}

/* ── Al pedir y al corregir (RF-2 a RF-13, RF-18, RF-54, RF-55) ── */

/** Lo que se guarda en cada renglón de una RQ de compra de obra. */
export interface RenglonImputado {
  imputacion: ImputacionDelRenglon;
  valorEstimado: number | null;
}

/**
 * Las imputaciones y los valores de los renglones de una RQ de compra de obra, o lo que falta. Con
 * planificación vigente cada renglón va a una opción o «Fuera de lo planeado» (RF-2, RF-4, RF-55);
 * sin ella, «Sin planificación aprobada» (RF-8). Lo que manda el Almacenista no lleva valores: él
 * no los ve, y los completa el primer paso (RF-13, RF-14).
 */
export async function imputarLaCompra(
  obraId: string,
  renglones: readonly { imputacion?: ImputacionPedida | null; valorEstimado?: number | null }[],
  delAlmacenista: boolean,
): Promise<{ faltas: string[]; renglones: RenglonImputado[] }> {
  const { planificaciones: vigentes, opciones } = await opcionesDeLaObra(obraId);
  const faltas: string[] = [];
  const imputados = renglones.map((r, i): RenglonImputado => {
    const resuelta = resolverImputacion(r.imputacion ?? null, opciones, vigentes.length > 0, i + 1);
    if (resuelta.falta) faltas.push(resuelta.falta);
    return {
      imputacion: resuelta.imputacion as ImputacionDelRenglon,
      valorEstimado: delAlmacenista ? null : (r.valorEstimado ?? null),
    };
  });
  return { faltas, renglones: imputados };
}

/** La imputación de una RQ de pago de obra (RF-3), o lo que falta. */
export async function imputarElPago(
  obraId: string,
  pedida: ImputacionPedida | null,
): Promise<{ falta: string; imputacion: null } | { falta: null; imputacion: ImputacionDelRenglon }> {
  const { planificaciones: vigentes, opciones } = await opcionesDeLaObra(obraId);
  return resolverImputacion(pedida, opciones, vigentes.length > 0, null);
}

/* ── Al aprobar (RF-63) ── */

/**
 * Los avisos que tiene una requisición en el momento en que se aprueba, para la historia (RF-63).
 * Lo que aporta ella misma se calcula con lo que queda tras la decisión —los valores que se
 * acaban de completar y las imputaciones que se acaban de cambiar—, no con lo guardado.
 */
export async function avisosAlAprobar(
  obraId: string,
  requisicion: RequisicionParaComprometer,
  renglones: readonly { renglonId: string | null; orden: number | null; imputacion: ImputacionDelRenglon | null }[],
): Promise<AvisoEnLaHistoria[]> {
  const { opciones, aportes } = await planificacionDeLaObra(obraId);
  const deLasDemas = aportes.filter((a) => a.requisicionId !== requisicion.id);
  const filas = cifrasDeLaRequisicion(
    requisicion.id,
    renglones,
    [...deLasDemas, ...aportesDeLasRequisiciones([requisicion])],
    opciones,
  );
  const orden = new Map(renglones.map((r) => [r.renglonId, r.orden]));
  return avisosParaLaHistoria(filas, (id) => orden.get(id) ?? null);
}

/* ── En el detalle (RF-9, RF-26 a RF-34, RF-40) ── */

/**
 * La imputación, las cifras y el aviso de cada renglón de una RQ de obra, con lo comprometido de
 * ahora (RF-33). Quien no ve valores (el Almacenista, RF-9, RF-34) recibe la imputación y los
 * avisos que no son cifras: ni las cifras ni «Se pasa de lo planeado».
 */
export async function planificacionDeLosRenglones(
  obraId: string,
  requisicionId: string,
  renglones: readonly { renglonId: string | null; imputacion: ImputacionDelRenglon | null }[],
  conCifras: boolean,
): Promise<Map<string | null, PlanificacionDelRenglon>> {
  const { opciones, aportes } = await planificacionDeLaObra(obraId);
  const filas = cifrasDeLaRequisicion(requisicionId, renglones, aportes, opciones);
  return new Map(
    filas.map((f) => [
      f.renglonId,
      conCifras
        ? { imputacion: f.imputacion, cifras: f.cifras, aviso: f.aviso }
        : { imputacion: f.imputacion, aviso: f.aviso?.tipo === 'se_pasa' ? null : f.aviso },
    ]),
  );
}

/* ── En la lista y la bandeja (RF-31) ── */

/**
 * La marca de cada RQ de la obra: «Se pasa de lo planeado» o «Fuera de lo planeado». Con las
 * imputaciones de los renglones y no solo con lo que aportan: un renglón «Fuera» del Almacenista
 * todavía sin valor no aporta nada, y aun así lleva la marca.
 */
export async function marcasDeLaObra(obraId: string): Promise<Map<string, MarcaDePlanificacion>> {
  const [{ opciones }, requisiciones] = await Promise.all([opcionesDeLaObra(obraId), requisicionesDeLaObra(obraId)]);
  const aportes = aportesDeLasRequisiciones(requisiciones);
  return new Map(
    requisiciones.map((r) => {
      const renglones =
        r.tipo === 'compra' ? r.renglones.map((x) => ({ renglonId: x.id, imputacion: x.imputacion })) : [{ renglonId: null, imputacion: r.imputacion }];
      return [r.id, marcaDeLaRequisicion(cifrasDeLaRequisicion(r.id, renglones, aportes, opciones))];
    }),
  );
}

/** El código que se ve (`RQ-0001`) y la clase de cada requisición, para abrirla desde el resumen (RF-52). */
export async function codigosDeRequisiciones(ids: readonly string[]): Promise<Record<string, { tipo: TipoDeRequisicion; codigo: string }>> {
  if (ids.length === 0) return {};
  const db = baseServidor();
  const [deCompra, dePago] = await Promise.all([
    db
      .select({ id: solicitudesCompra.id, numero: solicitudesCompra.numero, numeroRequisicion: solicitudesCompra.numeroRequisicion })
      .from(solicitudesCompra)
      .where(inArray(solicitudesCompra.id, [...ids])),
    db
      .select({ id: solicitudesPago.id, numero: solicitudesPago.numero, numeroRequisicion: solicitudesPago.numeroRequisicion })
      .from(solicitudesPago)
      .where(inArray(solicitudesPago.id, [...ids])),
  ]);
  return Object.fromEntries([
    ...deCompra.map((f) => [f.id, { tipo: 'compra' as const, codigo: numeroQueSeVe({ tipo: 'compra', ...f }) }]),
    ...dePago.map((f) => [f.id, { tipo: 'pago' as const, codigo: numeroQueSeVe({ tipo: 'pago', ...f }) }]),
  ]);
}
