/**
 * Las requisiciones de obra amarradas a la planificación (spec 048). Reglas puras: sin I/O, como
 * todo `shared/rules`. Las corren el servidor al guardar y al mostrar, y la pantalla al pedir.
 *
 * ── A qué se imputa ──
 *
 * Cada renglón de una requisición de compra de obra, y cada requisición de pago de obra, dice a
 * qué parte de la planificación vigente corresponde: un ítem, un rubro, un renglón indirecto, la
 * mano de obra indirecta entera, o «Fuera de lo planeado» con su explicación (RF-2 a RF-7, D2).
 * La mano de obra indirecta es una sola opción, con el total del concepto: así nadie ve salarios
 * que hoy no ve (RF-35, D10).
 *
 * ── La llave, y por qué se guarda también la etiqueta ──
 *
 * Lo comprometido sigue a la opción cuando se aprueba una versión nueva (RF-39, D5). Lo que dice
 * que es «la misma» es su llave (RF-65): para un ítem, la del cumplimiento y el plan semanal
 * (`llaveDeItemPlanificado`: frente, capítulo e ítem de pago), con el desempate de
 * `llavesDeEdicion` para los que se repiten; para un rubro, frente y nombre; para un renglón
 * indirecto, concepto, descripción y frente. La etiqueta se guarda aparte, tal como se veía al
 * imputar: si la opción desaparece, la requisición tiene que poder decir a qué estaba imputada.
 *
 * ── Una lista de planificaciones, aunque hoy haya una ──
 *
 * Hoy una obra tiene a lo sumo una planificación vigente (índice `ux_planificacion_vigente`). La
 * spec pide imputar contra todas las vigentes, una por frente (D12): las funciones reciben una
 * lista, y si un día hay más de una, no hay que tocarlas.
 *
 * ── Lo comprometido no se guarda ──
 *
 * Se calcula cada vez desde las requisiciones, sus compras y la planificación (RF-33, RF-44). Un
 * acumulado guardado se desfasaría con cada versión, compra anulada o cancelación, y con Neon por
 * HTTP no hay transacción que lo mantenga al día.
 */
import { normalizar } from './texto';
import {
  ESQUEMA_DE_PLANIFICACION,
  llavesDeEdicion,
  sinPrecioDeCosto,
  type ConceptoIndirecto,
  type EstructuraDePlanificacion,
  type ItemDeLaPlanificacion,
} from './planificacion';
import { normalizarLegada, recalcularPlanificacion } from './planificacion-borrador';

/* ── La imputación ── */

/** Las opciones de la planificación a las que se puede imputar. */
export const TIPOS_DE_OPCION = ['item', 'rubro', 'indirecto', 'mano_obra_indirecta'] as const;
export type TipoDeOpcion = (typeof TIPOS_DE_OPCION)[number];

/** Lo que puede decir un renglón: una opción, «Fuera de lo planeado» o «Sin planificación aprobada». */
export const TIPOS_DE_IMPUTACION = [...TIPOS_DE_OPCION, 'fuera', 'sin_planificacion'] as const;
export type TipoDeImputacion = (typeof TIPOS_DE_IMPUTACION)[number];

/**
 * Lo que guarda un renglón. `llave` y `planificacionId` son `null` en «Fuera de lo planeado» y
 * «Sin planificación aprobada»; `explicacion`, solo en «Fuera de lo planeado» (RF-4).
 */
export interface ImputacionDelRenglon {
  tipo: TipoDeImputacion;
  llave: string | null;
  etiqueta: string;
  frente: string;
  /** La versión contra la que se imputó, como constancia. */
  planificacionId: string | null;
  explicacion: string | null;
}

export const ETIQUETA_FUERA = 'Fuera de lo planeado';
export const ETIQUETA_SIN_PLANIFICACION = 'Sin planificación aprobada';

/** Una opción para imputar, con su costo planeado para toda la obra (RF-26, RF-27). */
export interface OpcionParaImputar {
  llave: string;
  tipo: TipoDeOpcion;
  /** El ítem de pago; vacío en rubros e indirectos. */
  numero: string;
  descripcion: string;
  /** Lo que se ve y se guarda (RF-7). */
  etiqueta: string;
  /** El capítulo del ítem, o el concepto del indirecto (RF-46). */
  capitulo: string;
  frente: string;
  planificacionId: string;
  /** `null` si no tiene precio de costo (RF-29). */
  planeado: number | null;
}

/** Una planificación vigente, tal como la lee el servidor. */
export interface PlanificacionParaImputar {
  id: string;
  estructura: EstructuraDePlanificacion;
}

/** Como los nombra el Excel de OCC (el mismo nombre que el informe de la 043). */
const NOMBRE_DEL_CONCEPTO: Record<ConceptoIndirecto, string> = {
  seguros_garantias: 'Seguros y garantías',
  impuestos: 'Impuestos',
  maquinaria_general: 'Maquinaria general de obra',
  instalaciones_generales: 'Instalaciones generales',
  varios: 'Varios',
  mano_obra_indirecta: 'Mano de obra indirecta',
  otros: 'Otros costos indirectos',
};

const limpio = (texto: string): string => normalizar(texto).replace(/\s+/g, ' ').trim();

/** El frente de un ítem: el del presupuesto si cruzó, el del libro si no. */
function frenteDelItem(item: ItemDeLaPlanificacion): string {
  return item.delPresupuesto?.grupo ?? item.grupo;
}

/**
 * El frente de una planificación: el de sus ítems si es uno solo (la 045 planifica un frente);
 * vacío si el libro traía varios, y entonces los rubros e indirectos son de toda la obra.
 */
export function frenteDeLaPlanificacion(estructura: EstructuraDePlanificacion): string {
  const frentes = [...new Set(estructura.items.map(frenteDelItem).filter((f) => f.trim() !== ''))];
  return frentes.length === 1 ? frentes[0] : '';
}

/** RF-65: las llaves de rubros e indirectos; la de un ítem es la de `llavesDeEdicion`. */
export const llaveDeRubro = (frente: string, nombre: string): string => `rubro:${limpio(frente)}|${limpio(nombre)}`;
export const llaveDeIndirecto = (frente: string, concepto: ConceptoIndirecto, descripcion: string): string =>
  `indirecto:${limpio(frente)}|${concepto}|${limpio(descripcion)}`;
export const llaveDeManoDeObraIndirecta = (frente: string): string => `mano_obra_indirecta:${limpio(frente)}`;

/** Un peso no se parte: el costo planeado va en pesos enteros, como todo lo que se muestra (RF-45). */
const pesos = (valor: number): number => Math.round(valor);

/**
 * RF-6, RF-7, RF-27, RF-29, RF-35: las opciones de las planificaciones vigentes de la obra. Los
 * ítems con su costo (medida para costo × precio de costo), los rubros con su costo, los
 * renglones indirectos con su total y la mano de obra indirecta como una sola opción con el total
 * del concepto. Las planificaciones de la 043 se normalizan para leerlas, sin cambiarlas.
 */
export function opcionesParaImputar(planificaciones: readonly PlanificacionParaImputar[]): OpcionParaImputar[] {
  return planificaciones.flatMap(({ id, estructura: guardada }) => {
    const estructura: EstructuraDePlanificacion =
      guardada.esquema === ESQUEMA_DE_PLANIFICACION ? guardada : { ...normalizarLegada(guardada), esquema: ESQUEMA_DE_PLANIFICACION };
    const { calculo } = recalcularPlanificacion(estructura);
    const frente = frenteDeLaPlanificacion(estructura);
    const llaves = llavesDeEdicion(estructura.items);

    const items: OpcionParaImputar[] = estructura.items.map((item, n) => {
      const numero = item.delPresupuesto?.item ?? item.item;
      return {
        llave: `item:${llaves[n]}`,
        tipo: 'item',
        numero,
        descripcion: item.descripcion,
        etiqueta: numero ? `${numero} · ${item.descripcion}` : item.descripcion,
        capitulo: item.delPresupuesto?.capitulo ?? item.capitulo,
        frente: frenteDelItem(item),
        planificacionId: id,
        planeado: sinPrecioDeCosto(item.precioCosto) ? null : pesos(calculo.items[n].importeCosto),
      };
    });

    const rubros: OpcionParaImputar[] = estructura.rubros.map((rubro) => ({
      llave: llaveDeRubro(frente, rubro.nombre),
      tipo: 'rubro',
      numero: '',
      descripcion: rubro.nombre,
      etiqueta: `Rubro · ${rubro.nombre}`,
      capitulo: 'Rubros',
      frente,
      planificacionId: id,
      planeado: sinPrecioDeCosto(rubro.costo) ? null : pesos(rubro.costo as number),
    }));

    const renglones = estructura.renglonesIndirectos ?? [];
    const totalDe = (renglonId: string) => calculo.renglones.find((r) => r.id === renglonId)?.total ?? 0;
    const indirectos: OpcionParaImputar[] = renglones
      .filter((r) => r.concepto !== 'mano_obra_indirecta')
      .map((renglon) => ({
        llave: llaveDeIndirecto(frente, renglon.concepto, renglon.descripcion),
        tipo: 'indirecto',
        numero: '',
        descripcion: renglon.descripcion,
        etiqueta: `${NOMBRE_DEL_CONCEPTO[renglon.concepto]} · ${renglon.descripcion}`,
        capitulo: NOMBRE_DEL_CONCEPTO[renglon.concepto],
        frente,
        planificacionId: id,
        planeado: pesos(totalDe(renglon.id)),
      }));

    const manoDeObra: OpcionParaImputar[] = renglones.some((r) => r.concepto === 'mano_obra_indirecta')
      ? [
          {
            llave: llaveDeManoDeObraIndirecta(frente),
            tipo: 'mano_obra_indirecta',
            numero: '',
            descripcion: NOMBRE_DEL_CONCEPTO.mano_obra_indirecta,
            etiqueta: NOMBRE_DEL_CONCEPTO.mano_obra_indirecta,
            capitulo: NOMBRE_DEL_CONCEPTO.mano_obra_indirecta,
            frente,
            planificacionId: id,
            planeado: pesos(calculo.indirectosPorConcepto.mano_obra_indirecta),
          },
        ]
      : [];

    return desempatar([...items, ...rubros, ...indirectos, ...manoDeObra]);
  });
}

/**
 * Dos renglones con el mismo concepto y la misma descripción (en el V8 de Magdalena hay dos de
 * maquinaria iguales) darían la misma llave, y lo comprometido en uno contaría en los dos. El que
 * se repite lleva su número de aparición (`|#2`), como `llavesDeEdicion` con los ítems: el orden
 * de la planificación se conserva al copiar una versión, así que la llave sigue siendo estable.
 */
function desempatar(opciones: OpcionParaImputar[]): OpcionParaImputar[] {
  const vistas = new Map<string, number>();
  return opciones.map((opcion) => {
    const vez = (vistas.get(opcion.llave) ?? 0) + 1;
    vistas.set(opcion.llave, vez);
    return vez === 1 ? opcion : { ...opcion, llave: `${opcion.llave}|#${vez}` };
  });
}

/** RF-46: busca por número o por descripción; sin texto, todas. */
export function buscarOpciones(opciones: readonly OpcionParaImputar[], texto: string): OpcionParaImputar[] {
  const buscado = limpio(texto);
  if (!buscado) return [...opciones];
  return opciones.filter(
    (o) => limpio(o.numero).startsWith(buscado) || limpio(o.descripcion).includes(buscado) || limpio(o.etiqueta).includes(buscado),
  );
}

/** La imputación que se guarda al escoger una opción. */
export function imputacionDeLaOpcion(opcion: OpcionParaImputar): ImputacionDelRenglon {
  return {
    tipo: opcion.tipo,
    llave: opcion.llave,
    etiqueta: opcion.etiqueta,
    frente: opcion.frente,
    planificacionId: opcion.planificacionId,
    explicacion: null,
  };
}

/* ── Validar lo que llega (RF-2 a RF-5, RF-8, RF-54, RF-55) ── */

/**
 * Lo que manda la pantalla por renglón: la llave de una opción, o `null` con la explicación de
 * por qué va «Fuera de lo planeado». El servidor no se fía de nada más: la etiqueta, el frente y
 * la versión los saca de la opción vigente.
 */
export interface ImputacionPedida {
  llave: string | null;
  explicacion: string | null;
}

/** Dónde va la falta: «del renglón 2» o, en una requisición de pago, «de la requisición». */
const deQuien = (renglon: number | null): string => (renglon === null ? 'la requisición' : `el renglón ${renglon}`);

/**
 * La imputación que se guarda, o la falta que lo impide. Sin planificación vigente se guarda
 * «Sin planificación aprobada» y no se pide nada (RF-8). Con planificación, es obligatoria (RF-2,
 * RF-3, RF-5): una opción que siga en la planificación vigente (RF-55) o «Fuera de lo planeado»
 * con su explicación (RF-4). Lo de un frente que no está planificado va por ahí (RF-54).
 */
export function resolverImputacion(
  pedida: ImputacionPedida | null,
  opciones: readonly OpcionParaImputar[],
  hayPlanificacion: boolean,
  renglon: number | null,
): { imputacion: ImputacionDelRenglon; falta: null } | { imputacion: null; falta: string } {
  if (!hayPlanificacion) {
    return {
      imputacion: { tipo: 'sin_planificacion', llave: null, etiqueta: ETIQUETA_SIN_PLANIFICACION, frente: '', planificacionId: null, explicacion: null },
      falta: null,
    };
  }
  const quien = deQuien(renglon);
  if (!pedida || (pedida.llave === null && pedida.explicacion === null)) {
    return { imputacion: null, falta: `Diga a qué parte de la planificación va ${quien}, o márquelo «${ETIQUETA_FUERA}».` };
  }
  if (pedida.llave === null) {
    const explicacion = (pedida.explicacion ?? '').trim();
    if (!explicacion) return { imputacion: null, falta: `Explique por qué ${quien} no cabe en la planificación.` };
    return {
      imputacion: { tipo: 'fuera', llave: null, etiqueta: ETIQUETA_FUERA, frente: '', planificacionId: null, explicacion },
      falta: null,
    };
  }
  const opcion = opciones.find((o) => o.llave === pedida.llave);
  if (!opcion) {
    return { imputacion: null, falta: `Lo que tenía ${quien} ya no está en la planificación vigente: escoja otra opción.` };
  }
  return { imputacion: imputacionDeLaOpcion(opcion), falta: null };
}

/** Lo que propone la corrección de un renglón: lo que tenía el renglón que reemplaza (RF-10). */
export function imputacionPropuesta(anterior: ImputacionDelRenglon | null): ImputacionPedida | null {
  if (!anterior || anterior.tipo === 'sin_planificacion') return null;
  return { llave: anterior.llave, explicacion: anterior.explicacion };
}

/* ── Lo comprometido (RF-19 a RF-25, RF-40, RF-49, RF-56 a RF-60, D14) ── */

/** Una compra de la requisición, con el valor por renglón si se digitó (RF-47). */
export interface CompraParaComprometer {
  id: string;
  valor: number;
  anulada: boolean;
  renglones: { renglonId: string; valor: number | null }[];
}

/** Un renglón de compra, con lo que hace falta para saber cuánto compromete. */
export interface RenglonParaComprometer {
  id: string;
  imputacion: ImputacionDelRenglon | null;
  cantidad: number;
  /** `0` si se quitó al aprobar (RF-24); `null` mientras no se aprueba. */
  cantidadAprobada: number | null;
  valorEstimado: number | null;
}

/** Una requisición de obra con sus renglones vigentes (los no reemplazados) y sus compras. */
export type RequisicionParaComprometer =
  | {
      tipo: 'compra';
      id: string;
      estado: string;
      renglones: RenglonParaComprometer[];
      compras: CompraParaComprometer[];
    }
  | {
      tipo: 'pago';
      id: string;
      estado: string;
      imputacion: ImputacionDelRenglon | null;
      valor: number;
      valorAprobado: number | null;
    };

/** Lo que aporta un renglón (o una requisición de pago) a lo comprometido. */
export interface Aporte {
  requisicionId: string;
  /** `null` en una requisición de pago. */
  renglonId: string | null;
  /** La llave de la opción, o `null` si va «Fuera de lo planeado». */
  llave: string | null;
  valor: number;
}

/** RF-19: no cuentan las devueltas; las canceladas y rechazadas, solo por lo ya comprado (RF-56). */
const CERRADAS_SIN_COMPROMISO = ['cancelada', 'rechazada'];

/**
 * El valor real que una compra pone en cada uno de sus renglones. Con valor por renglón, ese
 * (RF-47); sin él, la compra entera repartida según los estimados, que en una compra de una sola
 * opción da el total de la compra contra esa opción (RF-49). Sin estimados, en partes iguales.
 * Lo que sobra al redondear va al último, para que la suma sea la de la compra.
 */
export function valorRealPorRenglon(compra: CompraParaComprometer, estimados: ReadonlyMap<string, number | null>): Map<string, number> {
  const resultado = new Map<string, number>();
  if (compra.renglones.length === 0) return resultado;
  if (compra.renglones.every((r) => r.valor !== null)) {
    for (const r of compra.renglones) resultado.set(r.renglonId, r.valor as number);
    return resultado;
  }
  const pesosDe = compra.renglones.map((r) => estimados.get(r.renglonId) ?? 0);
  const totalPesos = pesosDe.reduce((a, b) => a + b, 0);
  let repartido = 0;
  compra.renglones.forEach((r, i) => {
    const ultimo = i === compra.renglones.length - 1;
    const parte = ultimo
      ? compra.valor - repartido
      : Math.round(totalPesos > 0 ? (compra.valor * pesosDe[i]) / totalPesos : compra.valor / compra.renglones.length);
    repartido += parte;
    resultado.set(r.renglonId, parte);
  });
  return resultado;
}

/** Una imputación que cuenta: las de antes de la 048 y las pedidas sin planificación no (RF-25, D11). */
const cuenta = (imputacion: ImputacionDelRenglon | null): imputacion is ImputacionDelRenglon =>
  imputacion !== null && imputacion.tipo !== 'sin_planificacion';

/**
 * Lo que aporta cada renglón de cada requisición de obra a lo comprometido (RF-19 a RF-25,
 * RF-56 a RF-60). Un renglón con compra vigente aporta su valor real (RF-21); sin ella, su valor
 * estimado, en proporción a la cantidad aprobada si se rebajó (RF-20, RF-60), o nada si se quitó
 * (RF-24). Un pago aporta lo pedido mientras recorre la cadena y lo aprobado desde que se aprueba
 * (RF-23, RF-59). Las devueltas no aportan; las canceladas y rechazadas, solo lo comprado (RF-56).
 * Una compra anulada deja de contar, y el renglón vuelve a su estimado si la requisición sigue
 * viva (RF-22, RF-58).
 */
export function aportesDeLasRequisiciones(requisiciones: readonly RequisicionParaComprometer[]): Aporte[] {
  return requisiciones.flatMap((r): Aporte[] => {
    if (r.tipo === 'pago') {
      if (!cuenta(r.imputacion) || r.estado === 'devuelta' || CERRADAS_SIN_COMPROMISO.includes(r.estado)) return [];
      const valor = r.estado === 'enviada' ? r.valor : (r.valorAprobado ?? r.valor);
      return [{ requisicionId: r.id, renglonId: null, llave: r.imputacion.tipo === 'fuera' ? null : r.imputacion.llave, valor }];
    }
    const estimados = new Map(r.renglones.map((x) => [x.id, x.valorEstimado]));
    const reales = new Map<string, number>();
    for (const compra of r.compras) {
      if (compra.anulada) continue;
      for (const [renglonId, valor] of valorRealPorRenglon(compra, estimados)) reales.set(renglonId, valor);
    }
    const soloLoComprado = r.estado === 'devuelta' || CERRADAS_SIN_COMPROMISO.includes(r.estado);
    return r.renglones.flatMap((renglon): Aporte[] => {
      if (!cuenta(renglon.imputacion)) return [];
      const real = reales.get(renglon.id);
      let valor: number;
      if (real !== undefined) valor = real;
      else if (soloLoComprado || renglon.cantidadAprobada === 0 || renglon.valorEstimado === null) valor = 0;
      else if (renglon.cantidadAprobada === null || renglon.cantidad <= 0) valor = renglon.valorEstimado;
      else valor = Math.round((renglon.valorEstimado * renglon.cantidadAprobada) / renglon.cantidad);
      if (valor === 0) return [];
      return [
        {
          requisicionId: r.id,
          renglonId: renglon.id,
          llave: renglon.imputacion.tipo === 'fuera' ? null : renglon.imputacion.llave,
          valor,
        },
      ];
    });
  });
}

/** Lo comprometido, sumado: por opción, lo «Fuera de lo planeado» y lo de opciones que ya no están (RF-40, RF-51). */
export interface Comprometido {
  porLlave: Record<string, number>;
  fuera: number;
  sinOpcion: number;
}

/** Suma los aportes contra las opciones vigentes. Lo que no está entre ellas va a «Sin ítem» (RF-40). */
export function comprometidoPorOpcion(aportes: readonly Aporte[], opciones: readonly OpcionParaImputar[]): Comprometido {
  const vigentes = new Set(opciones.map((o) => o.llave));
  const resultado: Comprometido = { porLlave: {}, fuera: 0, sinOpcion: 0 };
  for (const a of aportes) {
    if (a.llave === null) resultado.fuera += a.valor;
    else if (!vigentes.has(a.llave)) resultado.sinOpcion += a.valor;
    else resultado.porLlave[a.llave] = (resultado.porLlave[a.llave] ?? 0) + a.valor;
  }
  return resultado;
}

/* ── Lo que se ve al pedir y al aprobar (RF-26 a RF-31, RF-61, RF-62) ── */

/** Las tres cifras de una opción para una requisición, y en cuánto se pasa. */
export interface CifrasDeLaOpcion {
  llave: string;
  /** RF-26; `null` si la opción no tiene precio de costo (RF-29). */
  planeado: number | null;
  /** RF-61: lo comprometido en esa opción por las demás requisiciones. */
  yaComprometido: number;
  /** Lo que esta requisición pone en esa opción, sumando sus renglones. */
  pide: number;
  /** RF-62: planeado − ya comprometido − lo que pide; `null` sin precio de costo. */
  queda: number | null;
  /** RF-28: en cuánto se pasa esa opción; `null` si no se pasa o no tiene precio de costo. */
  exceso: number | null;
}

/** RF-28, RF-29: las cifras de una opción, sin aviso de exceso si no tiene precio de costo. */
export function cifrasDeLaOpcion(llave: string, planeado: number | null, yaComprometido: number, pide: number): CifrasDeLaOpcion {
  const queda = planeado === null ? null : planeado - yaComprometido - pide;
  return { llave, planeado, yaComprometido, pide, queda, exceso: queda !== null && queda < 0 ? -queda : null };
}

/** El aviso de un renglón. Ninguno bloquea (RF-32). */
export type AvisoDelRenglon =
  | { tipo: 'se_pasa'; exceso: number }
  | { tipo: 'fuera'; explicacion: string }
  | { tipo: 'sin_opcion' }
  | { tipo: 'sin_planificacion' };

export const TEXTO_SE_PASA = 'Se pasa de lo planeado';
export const TEXTO_SIN_OPCION = 'Sin ítem en la versión vigente';

/** Un renglón de la requisición (o la requisición de pago, con `renglonId` nulo) con sus cifras y su aviso. */
export interface RenglonConCifras {
  renglonId: string | null;
  imputacion: ImputacionDelRenglon | null;
  cifras: CifrasDeLaOpcion | null;
  aviso: AvisoDelRenglon | null;
}

/**
 * RF-26 a RF-30, RF-40, RF-61, RF-62: las cifras y el aviso de cada renglón de una requisición,
 * calculadas con lo comprometido de ahora (RF-33). `aportes` son los de todas las requisiciones
 * de la obra, incluida esta: lo que esta pone se separa de lo de las demás.
 */
export function cifrasDeLaRequisicion(
  requisicionId: string,
  renglones: readonly { renglonId: string | null; imputacion: ImputacionDelRenglon | null }[],
  aportes: readonly Aporte[],
  opciones: readonly OpcionParaImputar[],
): RenglonConCifras[] {
  const porLlave = new Map(opciones.map((o) => [o.llave, o]));
  const suma = (filtro: (a: Aporte) => boolean) => aportes.filter(filtro).reduce((t, a) => t + a.valor, 0);
  return renglones.map(({ renglonId, imputacion }) => {
    if (!imputacion) return { renglonId, imputacion, cifras: null, aviso: null };
    if (imputacion.tipo === 'sin_planificacion') return { renglonId, imputacion, cifras: null, aviso: { tipo: 'sin_planificacion' } };
    if (imputacion.tipo === 'fuera') {
      return { renglonId, imputacion, cifras: null, aviso: { tipo: 'fuera', explicacion: imputacion.explicacion ?? '' } };
    }
    const opcion = imputacion.llave ? porLlave.get(imputacion.llave) : undefined;
    if (!opcion) return { renglonId, imputacion, cifras: null, aviso: { tipo: 'sin_opcion' } };
    const cifras = cifrasDeLaOpcion(
      opcion.llave,
      opcion.planeado,
      suma((a) => a.llave === opcion.llave && a.requisicionId !== requisicionId),
      suma((a) => a.llave === opcion.llave && a.requisicionId === requisicionId),
    );
    return { renglonId, imputacion, cifras, aviso: cifras.exceso !== null ? { tipo: 'se_pasa', exceso: cifras.exceso } : null };
  });
}

/** El texto de un aviso, como se ve junto al renglón y en la historia. */
export function textoDelAviso(aviso: AvisoDelRenglon, enPesos: (valor: number) => string): string {
  switch (aviso.tipo) {
    case 'se_pasa':
      return `${TEXTO_SE_PASA} por ${enPesos(aviso.exceso)}`;
    case 'fuera':
      return aviso.explicacion ? `${ETIQUETA_FUERA}: ${aviso.explicacion}` : ETIQUETA_FUERA;
    case 'sin_opcion':
      return TEXTO_SIN_OPCION;
    case 'sin_planificacion':
      return ETIQUETA_SIN_PLANIFICACION;
  }
}

/** La marca de la requisición en la lista y en la bandeja (RF-31). */
export type MarcaDePlanificacion = 'se_pasa' | 'fuera' | null;

/** RF-31: «Se pasa» manda sobre «Fuera de lo planeado»; sin ninguno de los dos, sin marca. */
export function marcaDeLaRequisicion(renglones: readonly Pick<RenglonConCifras, 'aviso'>[]): MarcaDePlanificacion {
  if (renglones.some((r) => r.aviso?.tipo === 'se_pasa')) return 'se_pasa';
  if (renglones.some((r) => r.aviso?.tipo === 'fuera')) return 'fuera';
  return null;
}

export const TEXTO_DE_LA_MARCA: Record<Exclude<MarcaDePlanificacion, null>, string> = {
  se_pasa: TEXTO_SE_PASA,
  fuera: ETIQUETA_FUERA,
};

/* ── Al aprobar (RF-14 a RF-17, RF-36 a RF-38, RF-63, RF-64) ── */

/** Un renglón de compra tal como está al decidir. */
export interface RenglonAlAprobar {
  id: string;
  orden: number;
  imputacion: ImputacionDelRenglon | null;
  valorEstimado: number | null;
}

/**
 * RF-14, RF-15, RF-17: los valores estimados que escribe quien aprueba, y lo que falta. Solo se
 * completan los que faltan: cambiar uno que ya estaba no se deja, porque eso es recortar (046,
 * RF-80). Al aprobar no puede quedar ningún renglón sin valor. Los renglones de antes de la 048
 * (sin imputación) no llevan valor por renglón y no se piden.
 */
export function valoresAlAprobar(
  renglones: readonly RenglonAlAprobar[],
  pedidos: readonly { renglonId: string; valor: number }[],
  aprueba: boolean,
): { faltas: string[]; escritos: { renglonId: string; orden: number; valor: number }[] } {
  const faltas: string[] = [];
  const escritos: { renglonId: string; orden: number; valor: number }[] = [];
  for (const pedido of pedidos) {
    const renglon = renglones.find((r) => r.id === pedido.renglonId);
    if (!renglon) {
      faltas.push('Uno de los valores es de un renglón que ya no está en la requisición.');
    } else if (renglon.valorEstimado !== null) {
      faltas.push(`El renglón ${renglon.orden} ya tenía valor estimado: al aprobar no se cambia. Si no cuadra, devuélvala.`);
    } else if (!Number.isInteger(pedido.valor) || pedido.valor <= 0) {
      faltas.push(`El valor estimado del renglón ${renglon.orden} va en pesos y mayor que cero.`);
    } else {
      escritos.push({ renglonId: renglon.id, orden: renglon.orden, valor: pedido.valor });
    }
  }
  if (aprueba) {
    for (const r of renglones) {
      if (r.imputacion !== null && r.valorEstimado === null && !escritos.some((e) => e.renglonId === r.id)) {
        faltas.push(`Diga el valor estimado del renglón ${r.orden} antes de aprobar.`);
      }
    }
  }
  return { faltas, escritos };
}

/** Un cambio de imputación, como queda en la historia (RF-37): de qué etiqueta a cuál. */
export interface CambioDeImputacion {
  /** `null` en una requisición de pago. */
  orden: number | null;
  antes: string;
  despues: string;
}

/** RF-63: los avisos que había al aprobar, por renglón, para la historia. */
export interface AvisoEnLaHistoria {
  orden: number | null;
  aviso: AvisoDelRenglon;
}

export function avisosParaLaHistoria(
  filas: readonly RenglonConCifras[],
  ordenDe: (renglonId: string | null) => number | null,
): AvisoEnLaHistoria[] {
  return filas.flatMap((f) => (f.aviso && f.aviso.tipo !== 'sin_planificacion' ? [{ orden: ordenDe(f.renglonId), aviso: f.aviso }] : []));
}

/**
 * Lo que la 048 escribe en `cambios` de un evento de la historia. Un evento puede traer los
 * valores que completó quien aprobó (RF-16), las imputaciones que cambió (RF-37) y los avisos que
 * había al aprobar (RF-63).
 */
export interface CambiosDeLaPlanificacion {
  valoresEstimados?: { orden: number; valor: number }[];
  imputaciones?: CambioDeImputacion[];
  avisos?: AvisoEnLaHistoria[];
}

const esObjeto = (x: unknown): x is Record<string, unknown> => typeof x === 'object' && x !== null;

/**
 * RF-9: la historia que ve quien no ve valores. Sin las cifras de los valores escritos ni los
 * avisos de exceso; queda que se escribió un valor y en qué renglón, y lo «Fuera de lo planeado».
 */
export function cambiosSinValores(cambios: readonly unknown[]): unknown[] {
  return cambios.map((c) => {
    if (!esObjeto(c)) return c;
    const copia: Record<string, unknown> = { ...c };
    if (Array.isArray(copia.valoresEstimados)) {
      copia.valoresEstimados = (copia.valoresEstimados as { orden: number }[]).map(({ orden }) => ({ orden }));
    }
    if (Array.isArray(copia.avisos)) {
      copia.avisos = (copia.avisos as AvisoEnLaHistoria[]).filter((a) => a.aviso.tipo !== 'se_pasa');
    }
    return copia;
  });
}

/** Los renglones de texto que la 048 añade a un evento de la historia. */
export function textosDeLaPlanificacion(cambios: readonly unknown[], enPesos: (valor: number) => string): string[] {
  const deQuien = (orden: number | null) => (orden === null ? 'La requisición' : `Renglón ${orden}`);
  return cambios.flatMap((c): string[] => {
    if (!esObjeto(c)) return [];
    const textos: string[] = [];
    for (const v of (c.valoresEstimados as { orden: number; valor?: number }[] | undefined) ?? []) {
      textos.push(v.valor === undefined ? `Escribió el valor estimado del renglón ${v.orden}.` : `Valor estimado del renglón ${v.orden}: ${enPesos(v.valor)}.`);
    }
    for (const i of (c.imputaciones as CambioDeImputacion[] | undefined) ?? []) {
      textos.push(`${deQuien(i.orden)}: cambió de «${i.antes}» a «${i.despues}».`);
    }
    for (const a of (c.avisos as AvisoEnLaHistoria[] | undefined) ?? []) {
      textos.push(`Aprobada con aviso. ${deQuien(a.orden)}: ${textoDelAviso(a.aviso, enPesos)}.`);
    }
    return textos;
  });
}

/* ── Registrar la compra por renglón (RF-47 a RF-49) ── */

/** Un renglón que entra en la compra, con su opción (o `fuera`, o `null` si no cuenta). */
export interface RenglonDeLaCompra {
  renglonId: string;
  orden: number;
  imputacion: ImputacionDelRenglon | null;
}

/** La opción de un renglón para agrupar la compra: su llave, «fuera», o nada si no cuenta. */
function grupoDeLaCompra(imputacion: ImputacionDelRenglon | null): string | null {
  if (!cuenta(imputacion)) return null;
  return imputacion.tipo === 'fuera' ? 'fuera' : imputacion.llave;
}

/** RF-47, RF-49: si los renglones de una compra van a más de una parte de la planificación. */
export function compraVaAVariasPartes(imputaciones: readonly (ImputacionDelRenglon | null)[]): boolean {
  return new Set(imputaciones.map(grupoDeLaCompra).filter((g) => g !== null)).size > 1;
}

/**
 * RF-47 a RF-49: si los renglones de la compra caen en más de una opción, hay que decir el valor
 * real de cada uno, y tienen que sumar el de la compra. Si caen en una sola, no se pide nada y la
 * compra entera va contra ella. Devuelve los valores que se guardan, o `null` si no se piden.
 */
export function valoresDeLaCompraPorRenglon(
  renglones: readonly RenglonDeLaCompra[],
  valorDeLaCompra: number,
  pedidos: readonly { renglonId: string; valor: number }[] | null,
  enPesos: (valor: number) => string,
): { faltas: string[]; valores: Map<string, number> | null } {
  if (!compraVaAVariasPartes(renglones.map((r) => r.imputacion))) return { faltas: [], valores: null };
  const faltas: string[] = [];
  const valores = new Map<string, number>();
  for (const r of renglones) {
    const pedido = pedidos?.find((p) => p.renglonId === r.renglonId);
    if (!pedido) faltas.push(`Diga cuánto de la compra es del renglón ${r.orden}: van a partes distintas de la planificación.`);
    else if (!Number.isInteger(pedido.valor) || pedido.valor <= 0) faltas.push(`El valor del renglón ${r.orden} va en pesos y mayor que cero.`);
    else valores.set(r.renglonId, pedido.valor);
  }
  if (faltas.length === 0) {
    const suma = [...valores.values()].reduce((a, b) => a + b, 0);
    if (suma < valorDeLaCompra) faltas.push(`Los valores por renglón suman ${enPesos(suma)}: faltan ${enPesos(valorDeLaCompra - suma)} para el valor de la compra.`);
    if (suma > valorDeLaCompra) faltas.push(`Los valores por renglón suman ${enPesos(suma)}: sobran ${enPesos(suma - valorDeLaCompra)} sobre el valor de la compra.`);
  }
  return faltas.length ? { faltas, valores: null } : { faltas, valores };
}

/* ── El resumen de la planificación (RF-42, RF-50 a RF-53, RF-66) ── */

export interface FilaDelResumen {
  llave: string;
  tipo: TipoDeOpcion;
  etiqueta: string;
  capitulo: string;
  frente: string;
  planeado: number | null;
  comprometido: number;
  /** `null` sin precio de costo. */
  queda: number | null;
  /** RF-50: en cuánto se pasa; `null` si no. */
  exceso: number | null;
  /** RF-52: las requisiciones que la componen. */
  requisiciones: string[];
}

export interface ResumenDeLoComprometido {
  filas: FilaDelResumen[];
  /** RF-51. */
  fuera: { valor: number; requisiciones: string[] };
  sinOpcion: { valor: number; requisiciones: string[] };
}

const unicas = (aportes: readonly Aporte[]): string[] => [...new Set(aportes.map((a) => a.requisicionId))];

/**
 * RF-42, RF-50, RF-51, RF-66: una fila por opción, en el orden de la planificación (la mano de
 * obra indirecta ya es una sola), con lo planeado, lo comprometido, lo que queda y el exceso;
 * aparte lo de fuera y lo que perdió su opción.
 */
export function resumenDeLoComprometido(opciones: readonly OpcionParaImputar[], aportes: readonly Aporte[]): ResumenDeLoComprometido {
  const vigentes = new Set(opciones.map((o) => o.llave));
  const filas = opciones.map((o): FilaDelResumen => {
    const suyos = aportes.filter((a) => a.llave === o.llave);
    const cifras = cifrasDeLaOpcion(o.llave, o.planeado, suyos.reduce((t, a) => t + a.valor, 0), 0);
    return {
      llave: o.llave,
      tipo: o.tipo,
      etiqueta: o.etiqueta,
      capitulo: o.capitulo,
      frente: o.frente,
      planeado: o.planeado,
      comprometido: cifras.yaComprometido,
      queda: cifras.queda,
      exceso: cifras.exceso,
      requisiciones: unicas(suyos),
    };
  });
  const fuera = aportes.filter((a) => a.llave === null);
  const sinOpcion = aportes.filter((a) => a.llave !== null && !vigentes.has(a.llave));
  const total = (lista: readonly Aporte[]) => lista.reduce((t, a) => t + a.valor, 0);
  return {
    filas,
    fuera: { valor: total(fuera), requisiciones: unicas(fuera) },
    sinOpcion: { valor: total(sinOpcion), requisiciones: unicas(sinOpcion) },
  };
}

/** RF-53: el resumen de lo comprometido lo ven la Gerencia, el Director de Proyectos y el Director de Obra. */
export function veElResumenDeLoComprometido(rol: string): boolean {
  return rol === 'admin' || rol === 'director_proyectos' || rol === 'director_obra';
}
