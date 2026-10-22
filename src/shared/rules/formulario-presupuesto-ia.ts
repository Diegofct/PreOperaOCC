/**
 * Leer con IA un presupuesto en Excel que el lector del formulario no entiende (spec 031,
 * cambio del 2026-10-21, RF-74 a RF-87). Regla pura: qué se le manda a la IA y qué se
 * acepta de lo que devuelve. La llamada vive en `presupuestos/servidor/leer-con-ia.ts`.
 *
 * ── Lo que va a la IA (RF-76, RF-77) ──
 *
 * Solo las hojas con la fila de encabezados del presupuesto, y de ellas solo las filas
 * con contenido, cada una con su hoja y su número de fila real: «H1F17 | 1 | 201.7.1 |
 * … ». Con eso la IA puede citar de dónde sacó cada ítem.
 *
 * ── Lo que se acepta (RF-80, RF-81) ──
 *
 * La IA no inventa ítems: cada uno cita su hoja y su fila, y en esa fila del Excel tienen
 * que estar su cantidad y su valor unitario. Si no están, el ítem no se crea y queda en
 * `rechazados`. Lo mismo con el valor de cada rubro. Un ítem que la IA se salte no se
 * puede comprobar así, pero se nota en que el valor no cuadra con el del Excel (RF-44).
 *
 * ── Tres niveles en dos (RF-78) ──
 *
 * La IA devuelve los grupos con el nombre ya unido y la vía en corto («VÍA 90A01 · SITIOS
 * CRÍTICOS»), y aparte la frase completa del Excel, que solo se muestra (RF-88). Un
 * rubro dice su grupo por ese nombre. Un rubro de un nivel que no es un grupo (las
 * provisiones de toda una vía) queda en todo el contrato.
 */
import {
  hojasDelPresupuesto,
  numero,
  texto,
  type Celda,
  type DiferenciaDeItem,
  type FormularioLeido,
} from './formulario-presupuesto';
import {
  normalizarEstructura,
  redondearCantidad,
  resumenDelPresupuesto,
  totalDelItem,
  unidadDelPresupuesto,
  type CapituloDelPresupuesto,
  type GrupoDelPresupuesto,
  type RubroDelPresupuesto,
} from './presupuesto';

/** RF-77: más filas que esto no se mandan; el formulario de OCC tiene unas 150. */
export const FILAS_MAXIMAS_PARA_LA_IA = 1500;

/** Lo que devuelve la IA. Sin nulos ni uniones (el esquema de la API): lo vacío es `''` o `0`. */
export interface ItemLeidoPorIa {
  /** La hoja (1 = la primera de las que se mandaron) y la fila del Excel de donde salió. */
  hoja: number;
  fila: number;
  /** El «Nº» tal como está, o `''`. */
  numero: string;
  item: string;
  icociv: string;
  especificaciones: string;
  descripcion: string;
  unidad: string;
  cantidad: number;
  valorUnitario: number;
  /** El valor total que dice el Excel en esa fila, o `0`. */
  valorTotal: number;
}

export interface CapituloLeidoPorIa {
  nombre: string;
  items: ItemLeidoPorIa[];
}

export interface GrupoLeidoPorIa {
  /**
   * Los niveles de arriba unidos con « · », con la vía en corto (RF-88): «VÍA 90A01 ·
   * SITIOS CRÍTICOS», o `''` si el presupuesto no tiene grupos.
   */
  nombre: string;
  /** Los mismos niveles como están en el Excel, o `''` si son iguales al nombre. */
  nombreCompleto: string;
  capitulos: CapituloLeidoPorIa[];
}

export interface RubroLeidoPorIa {
  hoja: number;
  fila: number;
  /** El nombre de uno de los grupos, o `''` si es de todo el contrato. */
  grupo: string;
  nombre: string;
  unidad: string;
  cantidad: number;
  valorUnitario: number;
  valor: number;
}

export interface LecturaDeIa {
  grupos: GrupoLeidoPorIa[];
  rubros: RubroLeidoPorIa[];
  /** En fracción (0.2623), o `0` si el Excel no lo dice. */
  aiu: { administracion: number; imprevistos: number; utilidad: number };
  /** El valor total del contrato que dice el Excel. */
  valorTotalDelExcel: number;
}

/** RF-81: lo que la IA leyó y no está en la fila que citó. */
export interface RechazadoPorIa {
  hoja: number;
  fila: number;
  que: string;
  motivo: string;
}

export type FormularioLeidoConIa =
  | (Extract<FormularioLeido, { ok: true }> & { rechazados: RechazadoPorIa[] })
  | Extract<FormularioLeido, { ok: false }>;

type Hoja = readonly (readonly Celda[])[];

/**
 * El texto para la IA (RF-76): una línea por fila con contenido, «H<hoja>F<fila>» y las
 * celdas separadas por « | », sin las vacías del final. `null` si pasa del tope (RF-77) o
 * si no hay hoja del presupuesto.
 */
export function textoParaLaIa(hojas: readonly Hoja[]): { texto: string; filas: number } | null {
  const delPresupuesto = hojasDelPresupuesto(hojas);
  if (delPresupuesto.length === 0) return null;
  const lineas: string[] = [];
  delPresupuesto.forEach((hoja, h) => {
    hoja.forEach((fila, f) => {
      const celdas = fila.map(texto);
      while (celdas.length > 0 && celdas[celdas.length - 1] === '') celdas.pop();
      if (celdas.length === 0) return;
      lineas.push(`H${h + 1}F${f + 1} | ${celdas.join(' | ')}`);
    });
  });
  if (lineas.length > FILAS_MAXIMAS_PARA_LA_IA) return null;
  return { texto: lineas.join('\n'), filas: lineas.length };
}

/** Los números de una fila del Excel; `null` si la hoja o la fila no existen. */
function numerosDeLaFila(hojas: readonly Hoja[], hoja: number, fila: number): number[] | null {
  const f = hojas[hoja - 1]?.[fila - 1];
  if (!f) return null;
  return f.map(numero).filter((n): n is number => n !== null);
}

/** Una cantidad, a 3 decimales; un valor en pesos, al peso. */
const estaLaCantidad = (numeros: number[], x: number) => numeros.some((n) => Math.abs(n - x) <= 0.0005 + Math.abs(n) * 1e-9);
const estaElValor = (numeros: number[], x: number) => numeros.some((n) => Math.abs(n - x) <= 1);

/**
 * La estructura del presupuesto con lo que la IA leyó y se pudo comprobar (RF-80, RF-81),
 * con la misma forma que `leerFormulario` para que la vista previa y el borrador no
 * distingan de dónde vino, más los `rechazados`. `hojas` son las del libro entero; las
 * hojas que cita la IA se cuentan entre las del presupuesto, como en `textoParaLaIa`.
 */
export function estructuraDeLaIa(lectura: LecturaDeIa, hojas: readonly Hoja[], nuevoId: () => string): FormularioLeidoConIa {
  const delPresupuesto = hojasDelPresupuesto(hojas);
  const rechazados: RechazadoPorIa[] = [];
  const diferencias: DiferenciaDeItem[] = [];

  const grupos: GrupoDelPresupuesto[] = [];
  for (const g of lectura.grupos) {
    const nombre = texto(g.nombre);
    // Una lectura guardada antes del RF-88 no trae el nombre completo.
    const nombreCompleto = texto(g.nombreCompleto ?? '');
    const grupo: GrupoDelPresupuesto = {
      id: nuevoId(),
      nombre,
      ...(nombreCompleto && nombreCompleto !== nombre ? { nombreCompleto } : {}),
      capitulos: [],
    };
    for (const c of g.capitulos) {
      const capitulo: CapituloDelPresupuesto = {
        id: nuevoId(),
        codigo: String(grupo.capitulos.length + 1).padStart(2, '0'),
        nombre: texto(c.nombre) || 'Sin capítulo',
        items: [],
      };
      for (const i of c.items) {
        const que = [texto(i.item), texto(i.descripcion)].filter(Boolean).join(' · ') || 'Ítem sin nombre';
        const numeros = numerosDeLaFila(delPresupuesto, i.hoja, i.fila);
        if (numeros === null || !estaLaCantidad(numeros, i.cantidad) || !estaElValor(numeros, i.valorUnitario)) {
          rechazados.push({ hoja: i.hoja, fila: i.fila, que, motivo: `no encontrado en la fila ${i.fila}` });
          continue;
        }
        const cantidad = redondearCantidad(i.cantidad);
        const valorUnitario = Math.round(i.valorUnitario);
        const calculado = totalDelItem(cantidad, valorUnitario);
        // El total del Excel solo cuenta si de verdad está en la fila (RF-45).
        const delExcel = i.valorTotal > 0 && estaElValor(numeros, i.valorTotal) ? Math.round(i.valorTotal) : null;
        const n = Number(texto(i.numero));
        const renglon = Number.isInteger(n) && n > 0 ? n : null;
        if (delExcel !== null && Math.abs(delExcel - calculado) > 1) {
          diferencias.push({ renglon: renglon ?? i.fila, item: texto(i.item), capitulo: capitulo.nombre, calculado, delExcel });
        }
        const unidadEscrita = texto(i.unidad);
        capitulo.items.push({
          id: nuevoId(),
          renglon,
          item: texto(i.item),
          icociv: texto(i.icociv),
          especificaciones: texto(i.especificaciones),
          descripcion: texto(i.descripcion),
          unidad: unidadDelPresupuesto(unidadEscrita),
          unidadEscrita,
          cantidad,
          valorUnitario,
          valorTotal: calculado,
          ...(delExcel !== null && Math.abs(delExcel - calculado) > 1 ? { totalDelExcel: delExcel } : {}),
        });
      }
      if (capitulo.items.length > 0) grupo.capitulos.push(capitulo);
    }
    if (grupo.capitulos.length > 0) grupos.push(grupo);
  }

  const rubros: RubroDelPresupuesto[] = [];
  for (const r of lectura.rubros) {
    const nombre = texto(r.nombre) || 'Rubro sin nombre';
    const numeros = numerosDeLaFila(delPresupuesto, r.hoja, r.fila);
    if (numeros === null || !estaElValor(numeros, r.valor)) {
      rechazados.push({ hoja: r.hoja, fila: r.fila, que: nombre, motivo: `no encontrado en la fila ${r.fila}` });
      continue;
    }
    const conPrecio = r.cantidad > 0 && r.valorUnitario > 0;
    const grupo = texto(r.grupo);
    rubros.push({
      id: nuevoId(),
      grupoId: grupo ? (grupos.find((g) => g.nombre === grupo)?.id ?? null) : null,
      nombre,
      unidad: texto(r.unidad),
      cantidad: conPrecio ? r.cantidad : null,
      valorUnitario: conPrecio ? r.valorUnitario : null,
      valor: Math.round(r.valor),
    });
  }

  const items = grupos.reduce((s, g) => s + g.capitulos.reduce((t, c) => t + c.items.length, 0), 0);
  if (items === 0) {
    return { ok: false, error: 'La IA no encontró ítems que se puedan comprobar en el Excel.' };
  }
  const aiu = (x: number) => (Number.isFinite(x) && x > 0 ? (x > 1 ? x / 100 : x) : 0);
  const estructura = normalizarEstructura({
    aiu: {
      administracion: aiu(lectura.aiu.administracion),
      imprevistos: aiu(lectura.aiu.imprevistos),
      utilidad: aiu(lectura.aiu.utilidad),
    },
    grupos,
    rubros,
  });
  const valor = resumenDelPresupuesto(estructura).valor;
  const valorDelExcel = Math.round(lectura.valorTotalDelExcel);
  return {
    ok: true,
    estructura,
    conteo: {
      grupos: grupos.filter((g) => g.nombre).length,
      capitulos: grupos.reduce((s, g) => s + g.capitulos.length, 0),
      items,
      rubros: rubros.length,
    },
    valor,
    valorDelExcel,
    cuadra: Math.abs(valor - valorDelExcel) <= 1,
    diferencias,
    rechazados,
  };
}
