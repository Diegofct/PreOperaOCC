/**
 * El presupuesto de una obra (spec 031, RF-31 a RF-57). Reglas puras: sin I/O, como
 * todo `shared/rules`.
 *
 * ── La forma ──
 *
 * Grupos (cada vía o tramo del formulario) → capítulos → ítems, y aparte los rubros
 * (plan de manejo ambiental, actualización de precios…). Un presupuesto sin grupos
 * tiene uno solo con nombre vacío, que la pantalla no muestra (RF-33).
 *
 * La estructura se guarda entera en un documento por versión (plan, decisiones). Los
 * ids de grupos, capítulos e ítems **se conservan al copiar una versión**: son los que
 * la bitácora guarda, y la identidad de un ítem entre versiones es su ítem de pago
 * dentro de su capítulo (RF-53).
 *
 * ── El AIU ──
 *
 * Va **incluido en los precios unitarios**, como en el formulario de OCC (RF-39, D2):
 * el valor del presupuesto es la suma de los ítems más los rubros, y los porcentajes de
 * administración, imprevistos y utilidad solo se informan. Con el Excel de OCC:
 * $49.126.056.823 de obras + $5.315.744.097 de rubros = $54.441.800.920.
 */
import type { UnidadDeActividad } from '../catalogos/presupuesto';

/** Fracciones: 0.2623 es el 26,23 %. */
export interface AiuDelPresupuesto {
  administracion: number;
  imprevistos: number;
  utilidad: number;
}

export interface ItemDelPresupuesto {
  id: string;
  /** El «Nº» del formulario. `null` en uno agregado a mano sin número. */
  renglon: number | null;
  /** El ítem de pago: «4.1.8». */
  item: string;
  icociv: string;
  especificaciones: string;
  descripcion: string;
  /** La unidad reconocida, o `null` si la escrita no es ninguna de las de la bitácora. */
  unidad: UnidadDeActividad | null;
  /** Tal como venía, para mostrarla cuando no se reconoce. */
  unidadEscrita: string;
  cantidad: number | null;
  /** Pesos. */
  valorUnitario: number | null;
  /** Pesos: cantidad × valor unitario, redondeado (RF-35). Lo calcula el sistema. */
  valorTotal: number;
  /** El que decía el Excel, solo si no cuadraba con el calculado (RF-45). */
  totalDelExcel?: number | null;
}

export interface CapituloDelPresupuesto {
  id: string;
  codigo: string;
  nombre: string;
  items: ItemDelPresupuesto[];
}

export interface GrupoDelPresupuesto {
  id: string;
  /** Vacío en un presupuesto sin grupos (RF-33). */
  nombre: string;
  capitulos: CapituloDelPresupuesto[];
}

export interface RubroDelPresupuesto {
  id: string;
  /** El grupo al que pertenece; `null` en uno de todo el presupuesto (primas, actualización). */
  grupoId: string | null;
  nombre: string;
  /** Texto libre: «estimado», «Km»… Los rubros no se registran en la bitácora. */
  unidad: string;
  cantidad: number | null;
  valorUnitario: number | null;
  /** Pesos. Con cantidad y valor unitario, su producto; si no, el escrito. */
  valor: number;
}

export interface EstructuraDePresupuesto {
  aiu: AiuDelPresupuesto;
  grupos: GrupoDelPresupuesto[];
  rubros: RubroDelPresupuesto[];
}

export const ESTADOS_DE_PRESUPUESTO = ['borrador', 'vigente', 'reemplazado', 'descartado'] as const;

export type EstadoDePresupuesto = (typeof ESTADOS_DE_PRESUPUESTO)[number];

export const NOMBRE_DE_ESTADO_DE_PRESUPUESTO: Record<EstadoDePresupuesto, string> = {
  borrador: 'Borrador',
  vigente: 'Vigente',
  reemplazado: 'Reemplazado',
  descartado: 'Descartado',
};

export const ESTRUCTURA_VACIA: EstructuraDePresupuesto = {
  aiu: { administracion: 0, imprevistos: 0, utilidad: 0 },
  grupos: [],
  rubros: [],
};

/* ------------------------------------------------------------------------ */
/* Cifras                                                                   */
/* ------------------------------------------------------------------------ */

/** Hasta tres decimales (RF-69). */
export function redondearCantidad(cantidad: number): number {
  return Math.round(cantidad * 1000) / 1000;
}

/** Cantidad por valor unitario, al peso (RF-35). Sin uno de los dos, 0. */
export function totalDelItem(cantidad: number | null, valorUnitario: number | null): number {
  if (cantidad === null || valorUnitario === null) return 0;
  return Math.round(cantidad * valorUnitario);
}

function valorDelRubro(r: RubroDelPresupuesto): number {
  if (r.cantidad !== null && r.valorUnitario !== null) return Math.round(r.cantidad * r.valorUnitario);
  return Math.round(r.valor);
}

/**
 * La estructura con los totales que calcula el sistema, no los que llegaron (RF-35):
 * el servidor la pasa por aquí antes de guardar, para que una petición con un total
 * inventado no se quede así. Redondea cantidades a 3 decimales y valores al peso.
 */
export function normalizarEstructura(e: EstructuraDePresupuesto): EstructuraDePresupuesto {
  return {
    aiu: { ...e.aiu },
    grupos: e.grupos.map((g) => ({
      ...g,
      capitulos: g.capitulos.map((c) => ({
        ...c,
        items: c.items.map((i) => {
          const cantidad = i.cantidad === null ? null : redondearCantidad(i.cantidad);
          const valorUnitario = i.valorUnitario === null ? null : Math.round(i.valorUnitario);
          return { ...i, cantidad, valorUnitario, valorTotal: totalDelItem(cantidad, valorUnitario) };
        }),
      })),
    })),
    rubros: e.rubros.map((r) => {
      const cantidad = r.cantidad === null ? null : redondearCantidad(r.cantidad);
      const valorUnitario = r.valorUnitario === null ? null : Math.round(r.valorUnitario);
      const rubro = { ...r, cantidad, valorUnitario };
      return { ...rubro, valor: valorDelRubro(rubro) };
    }),
  };
}

export interface ResumenDelPresupuesto {
  grupos: {
    id: string;
    nombre: string;
    subtotal: number;
    capitulos: { id: string; codigo: string; nombre: string; subtotal: number; items: number }[];
    rubros: number;
  }[];
  /** Σ de los ítems: el «SUBTOTAL OBRAS» del formulario. */
  obras: number;
  /** Σ de los rubros. */
  rubros: number;
  /** Obras + rubros (RF-39). */
  valor: number;
  items: number;
  /** En por ciento, para mostrar: 26.23, 1, 5 y su total, 32.23 (RF-38). */
  aiu: { administracion: number; imprevistos: number; utilidad: number; total: number };
}

const porciento = (fraccion: number) => Math.round(fraccion * 10_000) / 100;

/** Los subtotales y el valor (RF-40), sobre los totales ya calculados. */
export function resumenDelPresupuesto(e: EstructuraDePresupuesto): ResumenDelPresupuesto {
  const grupos = e.grupos.map((g) => {
    const capitulos = g.capitulos.map((c) => ({
      id: c.id,
      codigo: c.codigo,
      nombre: c.nombre,
      subtotal: c.items.reduce((s, i) => s + i.valorTotal, 0),
      items: c.items.length,
    }));
    return {
      id: g.id,
      nombre: g.nombre,
      subtotal: capitulos.reduce((s, c) => s + c.subtotal, 0),
      capitulos,
      rubros: e.rubros.filter((r) => r.grupoId === g.id).reduce((s, r) => s + r.valor, 0),
    };
  });
  const obras = grupos.reduce((s, g) => s + g.subtotal, 0);
  const rubros = e.rubros.reduce((s, r) => s + r.valor, 0);
  const { administracion, imprevistos, utilidad } = e.aiu;
  return {
    grupos,
    obras,
    rubros,
    valor: obras + rubros,
    items: grupos.reduce((s, g) => s + g.capitulos.reduce((t, c) => t + c.items, 0), 0),
    aiu: {
      administracion: porciento(administracion),
      imprevistos: porciento(imprevistos),
      utilidad: porciento(utilidad),
      total: porciento(administracion + imprevistos + utilidad),
    },
  };
}

/* ------------------------------------------------------------------------ */
/* Aprobar                                                                  */
/* ------------------------------------------------------------------------ */

/**
 * Lo que impide guardar incluso un borrador: ids repetidos —la bitácora cita grupos,
 * capítulos e ítems por su id, y dos iguales harían que una cantidad cayera en el
 * renglón equivocado— y cantidades o valores negativos. Vacía si se puede guardar.
 */
export function faltasParaGuardarPresupuesto(e: EstructuraDePresupuesto): string[] {
  const faltas: string[] = [];
  const vistos = new Set<string>();
  const repetido = (id: string) => {
    if (vistos.has(id)) return true;
    vistos.add(id);
    return false;
  };
  const enAiu = [e.aiu.administracion, e.aiu.imprevistos, e.aiu.utilidad];
  if (enAiu.some((x) => !Number.isFinite(x) || x < 0 || x > 1)) faltas.push('Los porcentajes del AIU van entre 0 % y 100 %.');
  for (const g of e.grupos) {
    if (repetido(g.id)) faltas.push(`Hay dos grupos o capítulos con el mismo identificador (${g.id}).`);
    for (const c of g.capitulos) {
      if (repetido(c.id)) faltas.push(`Hay dos grupos o capítulos con el mismo identificador (${c.id}).`);
      for (const i of c.items) {
        if (repetido(i.id)) faltas.push(`Hay dos ítems con el mismo identificador (${i.id}).`);
        if ((i.cantidad ?? 0) < 0) faltas.push(`Ítem ${i.item || 'sin número'}: la cantidad no puede ser negativa.`);
        if ((i.valorUnitario ?? 0) < 0) faltas.push(`Ítem ${i.item || 'sin número'}: el valor unitario no puede ser negativo.`);
      }
    }
  }
  for (const r of e.rubros) {
    if (repetido(r.id)) faltas.push(`Hay dos rubros con el mismo identificador (${r.id}).`);
    if (r.grupoId !== null && !e.grupos.some((g) => g.id === r.grupoId)) {
      faltas.push(`El rubro «${r.nombre}» es de un grupo que ya no está.`);
    }
    if (r.valor < 0 || (r.cantidad ?? 0) < 0 || (r.valorUnitario ?? 0) < 0) {
      faltas.push(`El rubro «${r.nombre}» no puede tener valores negativos.`);
    }
  }
  return faltas;
}

/**
 * Lo que impide aprobar (RF-50): ningún ítem, o un ítem sin ítem de pago, sin unidad
 * reconocida, sin cantidad o sin valor unitario. Una cantidad o un valor de cero
 * cuentan como faltantes: un ítem contratado en cero no es un ítem.
 */
export function faltasParaAprobarPresupuesto(e: EstructuraDePresupuesto): string[] {
  const faltas: string[] = [];
  let items = 0;
  for (const g of e.grupos) {
    for (const c of g.capitulos) {
      const donde = [c.nombre.trim(), g.nombre.trim()].filter(Boolean).join(' · ') || 'sin capítulo';
      for (const i of c.items) {
        items++;
        const cual = `Ítem ${i.item.trim() || 'sin número'} (${donde})`;
        if (!i.item.trim()) faltas.push(`${cual}: falta el ítem de pago.`);
        if (!i.unidad) {
          faltas.push(
            i.unidadEscrita.trim()
              ? `${cual}: la unidad «${i.unidadEscrita.trim()}» no es una de las de la bitácora.`
              : `${cual}: falta la unidad.`,
          );
        }
        if (!(i.cantidad !== null && i.cantidad > 0)) faltas.push(`${cual}: falta la cantidad.`);
        if (!(i.valorUnitario !== null && i.valorUnitario > 0)) faltas.push(`${cual}: falta el valor unitario.`);
      }
    }
  }
  if (items === 0) faltas.unshift('El presupuesto no tiene ítems.');
  return faltas;
}

/* ------------------------------------------------------------------------ */
/* Versiones                                                                */
/* ------------------------------------------------------------------------ */

/**
 * La copia para una nueva versión (RF-52): exacta y **con los mismos ids**, para que
 * lo reportado en la bitácora contra un capítulo siga apuntando a él (RF-53).
 */
export function copiarParaNuevaVersion(e: EstructuraDePresupuesto): EstructuraDePresupuesto {
  return JSON.parse(JSON.stringify(e)) as EstructuraDePresupuesto;
}

/** La identidad de un ítem entre versiones (RF-53): su ítem de pago dentro de su capítulo. */
export function claveDeItem(capituloId: string, item: string): string {
  return `${capituloId}|${item.trim()}`;
}

export interface ItemQueDesaparece {
  item: string;
  capituloId: string;
  capitulo: string;
  grupo: string;
  /** Lo reportado en la bitácora contra él. */
  reportado: number;
}

/**
 * Los ítems del vigente que no siguen en el borrador y tienen algo reportado (RF-54).
 * `reportado` va por `claveDeItem`. Uno que no tenía nada reportado puede irse sin aviso.
 */
export function itemsQueDesaparecen(
  vigente: EstructuraDePresupuesto,
  borrador: EstructuraDePresupuesto,
  reportado: ReadonlyMap<string, number>,
): ItemQueDesaparece[] {
  const siguen = new Set<string>();
  for (const g of borrador.grupos) {
    for (const c of g.capitulos) for (const i of c.items) siguen.add(claveDeItem(c.id, i.item));
  }
  const desaparecen: ItemQueDesaparece[] = [];
  for (const g of vigente.grupos) {
    for (const c of g.capitulos) {
      for (const i of c.items) {
        const clave = claveDeItem(c.id, i.item);
        const cantidad = reportado.get(clave) ?? 0;
        if (!siguen.has(clave) && cantidad > 0) {
          desaparecen.push({ item: i.item, capituloId: c.id, capitulo: c.nombre, grupo: g.nombre, reportado: cantidad });
        }
      }
    }
  }
  return desaparecen;
}

/* ------------------------------------------------------------------------ */
/* Unidades                                                                 */
/* ------------------------------------------------------------------------ */

function sinTildes(texto: string): string {
  return texto.normalize('NFD').replace(/[̀-ͯ]/g, '');
}

/**
 * La unidad de la bitácora que corresponde a la escrita en el formulario, o `null`.
 * El Excel de OCC escribe «m3», «m2», «m», «kg», «Und», «m3-Km» y «m3-km»; también se
 * aceptan «m³», «un», «unidad» y «m3km».
 */
export function unidadDelPresupuesto(escrita: string): UnidadDeActividad | null {
  const u = sinTildes(escrita).toLowerCase().replace(/³/g, '3').replace(/²/g, '2').replace(/[\s.]/g, '');
  if (u === 'm3') return 'm3';
  if (u === 'm2') return 'm2';
  if (u === 'm' || u === 'ml') return 'm';
  if (u === 'kg') return 'kg';
  if (u === 'und' || u === 'un' || u === 'unidad' || u === 'u') return 'und';
  if (u === 'm3-km' || u === 'm3km' || u === 'm3xkm') return 'm3_km';
  return null;
}
