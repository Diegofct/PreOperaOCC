/**
 * Leer el presupuesto del formulario oficial de propuesta económica (spec 031, RF-41 a
 * RF-46), como `docs/preupuesto.xlsx`. Regla pura sobre una matriz de celdas: quien
 * abre el Excel (`presupuestos/servidor/leer-excel.ts`) solo convierte el libro en
 * filas; qué es cada fila se decide aquí, con su prueba.
 *
 * ── La forma del formulario de OCC ──
 *
 *  · La fila de encabezados: «Nº», «ÍTEM DE PAGO», «CODIGO ICOCIV», «ESPECIFICACIONES»
 *    (general y particular), «DESCRIPCIÓN», «UND.», «CANTIDAD», «VALOR UNITARIO» y
 *    «VALOR TOTAL». Se busca por el texto, no por la posición: si OCC agrega una columna,
 *    las demás se siguen encontrando.
 *  · Los **títulos**: una fila sin número de renglón, sin unidad y con texto en «Nº» o
 *    en «DESCRIPCIÓN». Si lo que sigue es otro título, es un **grupo** (la vía: «VIA LA
 *    YE-YONDO»); si lo que sigue es un ítem, es un **capítulo** («CONSTRUCCIÓN DE
 *    CUNETA»). No depende de palabras como «CONSTRUCCIÓN»: el formulario de otra obra
 *    tendrá otros capítulos.
 *  · Los **ítems**: número entero en «Nº» e ítem de pago.
 *  · Los «Subtotal» se ignoran: el sistema los calcula.
 *  · Después de «SUBTOTAL OBRAS» y hasta «VALOR TOTAL», los **rubros**. Un título que
 *    coincide con un grupo pone los rubros siguientes en ese grupo; una fila vacía los
 *    devuelve a todo el contrato (así quedan las primas y la actualización de precios).
 *  · El **AIU**, en celdas «A=», «I=» y «U=» con su fracción al lado.
 */
import {
  normalizarEstructura,
  redondearCantidad,
  resumenDelPresupuesto,
  totalDelItem,
  unidadDelPresupuesto,
  type CapituloDelPresupuesto,
  type EstructuraDePresupuesto,
  type GrupoDelPresupuesto,
  type RubroDelPresupuesto,
} from './presupuesto';

export type Celda = string | number | null;

export interface DiferenciaDeItem {
  renglon: number;
  item: string;
  capitulo: string;
  calculado: number;
  delExcel: number;
}

export type FormularioLeido =
  | {
      ok: true;
      estructura: EstructuraDePresupuesto;
      conteo: { grupos: number; capitulos: number; items: number; rubros: number };
      /** El valor que calcula el sistema: obras + rubros (RF-43). */
      valor: number;
      /** El «VALOR TOTAL» que dice el Excel. */
      valorDelExcel: number;
      /** RF-44: si no coinciden, se crea igual, marcado para revisar. */
      cuadra: boolean;
      /** RF-45: ítems cuyo total no es cantidad × valor unitario. */
      diferencias: DiferenciaDeItem[];
    }
  | { ok: false; error: string };

function normalizar(celda: Celda): string {
  if (celda === null) return '';
  return String(celda)
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9= ]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function texto(celda: Celda): string {
  return celda === null ? '' : String(celda).replace(/\s+/g, ' ').trim();
}

function numero(celda: Celda): number | null {
  if (celda === null || celda === '') return null;
  if (typeof celda === 'number') return Number.isFinite(celda) ? celda : null;
  const limpio = celda.replace(/\s|\$/g, '').replace(/\.(?=\d{3}(\D|$))/g, '').replace(',', '.');
  const n = Number(limpio);
  return Number.isFinite(n) && limpio !== '' ? n : null;
}

function enteroDeRenglon(celda: Celda): number | null {
  const n = numero(celda);
  return n !== null && Number.isInteger(n) && n > 0 ? n : null;
}

interface Columnas {
  n: number;
  item: number;
  icociv: number;
  especificaciones: number;
  descripcion: number;
  unidad: number;
  cantidad: number;
  valorUnitario: number;
  valorTotal: number;
}

function columnasDe(fila: readonly Celda[]): Columnas | null {
  const t = fila.map(normalizar);
  const buscar = (...nombres: string[]) => t.findIndex((x) => nombres.includes(x));
  const item = buscar('item de pago');
  const unidad = buscar('und', 'unidad', 'un');
  const cantidad = buscar('cantidad');
  const valorUnitario = buscar('valor unitario');
  if (item < 0 || unidad < 0 || cantidad < 0 || valorUnitario < 0) return null;
  const valorTotal = buscar('valor total');
  return {
    n: buscar('n', 'no', 'n o', 'numero'),
    item,
    icociv: t.findIndex((x) => x.startsWith('codigo icociv')),
    especificaciones: t.findIndex((x) => x.startsWith('especificaciones')),
    descripcion: buscar('descripcion'),
    unidad,
    cantidad,
    valorUnitario,
    valorTotal: valorTotal >= 0 ? valorTotal : valorUnitario + 1,
  };
}

const en = (fila: readonly Celda[], i: number): Celda => (i >= 0 && i < fila.length ? fila[i] : null);

function filaVacia(fila: readonly Celda[]): boolean {
  return fila.every((c) => texto(c) === '');
}

function contiene(fila: readonly Celda[], frase: string): boolean {
  return fila.some((c) => normalizar(c) === frase);
}

/** «INVIAS 201-22» y «N.A» → «INVIAS 201-22»; las dos con contenido van juntas. */
function especificaciones(general: Celda, particular: Celda): string {
  return [texto(general), texto(particular)].filter((x) => x && normalizar(x) !== 'n a').join(' · ');
}

type Clase = 'item' | 'titulo' | 'otra';

function claseDeFila(fila: readonly Celda[], c: Columnas): Clase {
  if (filaVacia(fila)) return 'otra';
  if (enteroDeRenglon(en(fila, c.n)) !== null && texto(en(fila, c.item))) return 'item';
  const deN = normalizar(en(fila, c.n));
  if (deN.startsWith('subtotal') || deN.startsWith('total') || normalizar(en(fila, c.item)).startsWith('total')) {
    return 'otra';
  }
  const titulo = texto(en(fila, c.n)) || texto(en(fila, c.descripcion));
  if (titulo && !texto(en(fila, c.unidad)) && numero(en(fila, c.n)) === null) return 'titulo';
  return 'otra';
}

/** El valor que acompaña a «A=», «I=» o «U=» en la misma fila, como fracción. */
function porcentajeDelAiu(filas: readonly (readonly Celda[])[], letra: 'a' | 'i' | 'u'): number {
  for (const fila of filas) {
    const i = fila.findIndex((c) => typeof c === 'string' && new RegExp(`^\\s*${letra}\\s*=\\s*$`, 'i').test(c));
    if (i < 0) continue;
    const valor = fila.slice(i + 1).map(numero).find((n) => n !== null);
    if (valor !== undefined && valor !== null) return valor > 1 ? valor / 100 : valor;
  }
  return 0;
}

/**
 * Lee la primera hoja que tenga la fila de encabezados. `nuevoId` pone los ids de
 * grupos, capítulos, ítems y rubros (el servidor usa uuidv7; las pruebas, un contador).
 */
export function leerFormulario(
  hojas: readonly (readonly (readonly Celda[])[])[],
  nuevoId: () => string,
): FormularioLeido {
  let filas: readonly (readonly Celda[])[] = [];
  let c: Columnas | null = null;
  let inicio = 0;
  for (const hoja of hojas) {
    const i = hoja.findIndex((f) => columnasDe(f) !== null);
    if (i >= 0) {
      filas = hoja;
      c = columnasDe(hoja[i]);
      inicio = i + 1;
      break;
    }
  }
  if (!c) {
    return {
      ok: false,
      error:
        'No encontré la fila de encabezados del formulario («ÍTEM DE PAGO», «UND.», «CANTIDAD», «VALOR UNITARIO»). ' +
        'Revise que sea el formulario de propuesta económica.',
    };
  }

  const grupos: GrupoDelPresupuesto[] = [];
  const rubros: RubroDelPresupuesto[] = [];
  const diferencias: DiferenciaDeItem[] = [];
  let grupo: GrupoDelPresupuesto | null = null;
  let capitulo: CapituloDelPresupuesto | null = null;
  let enRubros = false;
  let grupoDeRubros: string | null = null;
  let valorDelExcel: number | null = null;

  const asegurarGrupo = (): GrupoDelPresupuesto => {
    if (!grupo) {
      grupo = { id: nuevoId(), nombre: '', capitulos: [] };
      grupos.push(grupo);
    }
    return grupo;
  };
  const nuevoCapitulo = (nombre: string): CapituloDelPresupuesto => {
    const g = asegurarGrupo();
    const cap = { id: nuevoId(), codigo: String(g.capitulos.length + 1).padStart(2, '0'), nombre, items: [] };
    g.capitulos.push(cap);
    return cap;
  };
  const siguienteClase = (desde: number): Clase => {
    for (let j = desde; j < filas.length; j++) {
      if (filaVacia(filas[j])) continue;
      return claseDeFila(filas[j], c!);
    }
    return 'otra';
  };

  for (let i = inicio; i < filas.length; i++) {
    const fila = filas[i];

    // Un formulario sin rubros pasa de los ítems al «VALOR TOTAL» sin «SUBTOTAL OBRAS».
    if (!enRubros && contiene(fila, 'valor total')) {
      valorDelExcel = numero(en(fila, c.valorTotal));
      break;
    }
    if (contiene(fila, 'subtotal obras')) {
      enRubros = true;
      continue;
    }
    if (enRubros) {
      if (contiene(fila, 'valor total')) {
        valorDelExcel = numero(en(fila, c.valorTotal));
        break;
      }
      if (filaVacia(fila)) {
        grupoDeRubros = null;
        continue;
      }
      const nombre = texto(en(fila, c.descripcion)) || texto(en(fila, c.n));
      const valor = numero(en(fila, c.valorTotal));
      if (!nombre) continue;
      if (valor === null) {
        // Un título: el de una vía pone sus rubros en ese grupo; otro («PROVISIÓN PARA
        // AJUSTES…») los deja en todo el contrato.
        const n = normalizar(nombre);
        grupoDeRubros =
          grupos.find((g) => g.nombre && (normalizar(g.nombre).startsWith(n) || n.startsWith(normalizar(g.nombre))))
            ?.id ?? null;
        continue;
      }
      rubros.push({
        id: nuevoId(),
        grupoId: grupoDeRubros,
        nombre,
        unidad: texto(en(fila, c.unidad)),
        cantidad: numero(en(fila, c.cantidad)),
        valorUnitario: numero(en(fila, c.valorUnitario)),
        valor: Math.round(valor),
      });
      continue;
    }

    const clase = claseDeFila(fila, c);
    if (clase === 'titulo') {
      const nombre = texto(en(fila, c.n)) || texto(en(fila, c.descripcion));
      if (siguienteClase(i + 1) === 'titulo') {
        grupo = { id: nuevoId(), nombre, capitulos: [] };
        grupos.push(grupo);
        capitulo = null;
      } else {
        capitulo = nuevoCapitulo(nombre);
      }
      continue;
    }
    if (clase !== 'item') continue;

    const cap: CapituloDelPresupuesto = capitulo ?? (capitulo = nuevoCapitulo('Sin capítulo'));
    const renglon = enteroDeRenglon(en(fila, c.n))!;
    const unidadEscrita = texto(en(fila, c.unidad));
    const cantidadLeida = numero(en(fila, c.cantidad));
    const cantidad = cantidadLeida === null ? null : redondearCantidad(cantidadLeida);
    const valorUnitario = numero(en(fila, c.valorUnitario));
    const unitario = valorUnitario === null ? null : Math.round(valorUnitario);
    const calculado = totalDelItem(cantidad, unitario);
    const delExcelLeido = numero(en(fila, c.valorTotal));
    const delExcel = delExcelLeido === null ? null : Math.round(delExcelLeido);
    const item = texto(en(fila, c.item));
    if (delExcel !== null && Math.abs(delExcel - calculado) > 1) {
      diferencias.push({ renglon, item, capitulo: cap.nombre, calculado, delExcel });
    }
    cap.items.push({
      id: nuevoId(),
      renglon,
      item,
      icociv: texto(en(fila, c.icociv)),
      especificaciones: especificaciones(en(fila, c.especificaciones), en(fila, c.especificaciones + 1)),
      descripcion: texto(en(fila, c.descripcion)),
      unidad: unidadDelPresupuesto(unidadEscrita),
      unidadEscrita,
      cantidad,
      valorUnitario: unitario,
      valorTotal: calculado,
      ...(delExcel !== null && Math.abs(delExcel - calculado) > 1 ? { totalDelExcel: delExcel } : {}),
    });
  }

  // Un grupo o capítulo que quedó sin ítems (un título suelto) no es parte del presupuesto.
  const conItems = grupos
    .map((g) => ({ ...g, capitulos: g.capitulos.filter((cap) => cap.items.length > 0) }))
    .filter((g) => g.capitulos.length > 0);
  const items = conItems.reduce((s, g) => s + g.capitulos.reduce((t, cap) => t + cap.items.length, 0), 0);
  if (items === 0) {
    return { ok: false, error: 'No encontré ítems: filas con número de renglón en «Nº» y un ítem de pago.' };
  }
  if (valorDelExcel === null) {
    return { ok: false, error: 'No encontré el «VALOR TOTAL» del formulario.' };
  }

  const estructura = normalizarEstructura({
    aiu: {
      administracion: porcentajeDelAiu(filas, 'a'),
      imprevistos: porcentajeDelAiu(filas, 'i'),
      utilidad: porcentajeDelAiu(filas, 'u'),
    },
    grupos: conItems,
    rubros,
  });
  // Lo que normalizar recalcula no borra el total del Excel que no cuadraba (RF-45).
  const valor = resumenDelPresupuesto(estructura).valor;
  return {
    ok: true,
    estructura,
    conteo: {
      grupos: conItems.filter((g) => g.nombre).length,
      capitulos: conItems.reduce((s, g) => s + g.capitulos.length, 0),
      items,
      rubros: rubros.length,
    },
    valor,
    valorDelExcel: Math.round(valorDelExcel),
    cuadra: Math.abs(valor - valorDelExcel) <= 1,
    diferencias,
  };
}
