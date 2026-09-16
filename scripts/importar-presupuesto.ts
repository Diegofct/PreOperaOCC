/**
 * Convierte el presupuesto de obra de OCC (`docs/preupuesto.xlsx`) en la lista de
 * actividades del parte diario.
 *
 *   npm run presupuesto                  (lee docs/preupuesto.xlsx)
 *   npm run presupuesto -- otra-ruta.xlsx
 *
 * Escribe `src/shared/catalogos/presupuesto.json`, que **no se edita a mano**: cuando
 * OCC cambie el presupuesto, se reemplaza el Excel y se corre esto otra vez (spec 004,
 * RF-64; editar la lista desde el panel está fuera de alcance).
 *
 * ── Por qué un script y no la lista escrita a mano ──
 *
 * Las descripciones tienen hasta 350 caracteres, con comillas de pulgadas y
 * resistencias en MPa. Copiadas a mano, una errata pasaría sin que nadie la note, y
 * una descripción del parte que no coincide con la del presupuesto es justo lo que
 * impide cruzarlos después.
 *
 * ── Lo que se lee y lo que no ──
 *
 * El formulario trae las mismas actividades varias veces: una por capítulo
 * (alcantarillas, cunetas…) y otra vez por cada vía. Una actividad del parte es el
 * ítem de pago, no el capítulo, así que se deja **una por ítem**. Solo cuentan las
 * filas con número entero en la columna C: los títulos de capítulo, los subtotales,
 * los rubros del final (planes de manejo, caracterización vial, primas,
 * actualización de precios) y las notas no lo tienen.
 *
 * ── Falla en voz alta ──
 *
 * Si el Excel cambia de forma, lo peor sería generar una lista vacía, corrida de
 * columna o con dos unidades para el mismo ítem, y que nadie se diera cuenta hasta
 * ver un parte con el acero medido en metros cúbicos. Por eso el script se detiene,
 * nombrando la fila, ante un encabezado que no está donde se espera, un ítem que no
 * parece un ítem, una unidad desconocida o un ítem repetido que no dice lo mismo. Y
 * si falla, no escribe nada.
 */
import ExcelJS from 'exceljs';
import { writeFileSync } from 'node:fs';
import path from 'node:path';

const RAIZ = path.join(__dirname, '..');
const ORIGEN = path.join(RAIZ, 'docs', 'preupuesto.xlsx');
const DESTINO = path.join(RAIZ, 'src', 'shared', 'catalogos', 'presupuesto.json');

/** Columnas del formulario 1 (propuesta económica). */
const COL_NUMERO = 'C';
const COL_ITEM = 'D';
const COL_DESCRIPCION = 'H';
const COL_UNIDAD = 'I';

/**
 * Cómo escribe el presupuesto cada unidad → su clave.
 *
 * Se compara en minúsculas y sin espacios: el mismo Excel escribe «m3-Km» y «m3-km»
 * para lo mismo. Lo que no esté aquí detiene el script en vez de adivinarse.
 */
const UNIDADES: Record<string, string> = {
  m3: 'm3',
  m2: 'm2',
  m: 'm',
  kg: 'kg',
  und: 'und',
  'm3-km': 'm3_km',
};

export interface ActividadImportada {
  item: string;
  descripcion: string;
  unidad: string;
}

class ErrorDelPresupuesto extends Error {}

/** `.text` es lo que muestra la celda: «8.10» sigue siendo «8.10» y no 8.1. */
function texto(fila: ExcelJS.Row, columna: string): string {
  try {
    return (fila.getCell(columna).text ?? '').replace(/\s+/g, ' ').trim();
  } catch {
    return '';
  }
}

function normalizar(valor: string): string {
  return valor
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/\s+/g, '');
}

/** 2.8 antes que 2.14.1, y 10.1 después de 8.27: por tramos numéricos, no por texto. */
function compararItems(a: string, b: string): number {
  const pa = a.split('.').map(Number);
  const pb = b.split('.').map(Number);
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const diferencia = (pa[i] ?? -1) - (pb[i] ?? -1);
    if (diferencia !== 0) return diferencia;
  }
  return 0;
}

async function leerPresupuesto(archivo: string): Promise<ActividadImportada[]> {
  const libro = new ExcelJS.Workbook();
  await libro.xlsx.readFile(archivo);
  const hoja = libro.worksheets[0];
  if (!hoja) throw new ErrorDelPresupuesto('El archivo no tiene hojas.');

  // El encabezado confirma que las columnas son las que este script cree que son.
  let filaEncabezado = 0;
  hoja.eachRow((fila, numero) => {
    if (
      filaEncabezado === 0 &&
      normalizar(texto(fila, COL_DESCRIPCION)) === 'descripcion' &&
      normalizar(texto(fila, COL_UNIDAD)) === 'und.'
    ) {
      filaEncabezado = numero;
    }
  });
  if (filaEncabezado === 0) {
    throw new ErrorDelPresupuesto(
      `No encontré el encabezado «DESCRIPCIÓN» en la columna ${COL_DESCRIPCION} y «UND.» en ` +
        `la ${COL_UNIDAD}. ¿Cambió la forma del Excel?`,
    );
  }

  const porItem = new Map<string, ActividadImportada & { fila: number }>();

  hoja.eachRow((fila, numero) => {
    if (numero <= filaEncabezado) return;
    if (!/^\d+$/.test(texto(fila, COL_NUMERO))) return;

    const item = texto(fila, COL_ITEM);
    const descripcion = texto(fila, COL_DESCRIPCION);
    const unidadEscrita = texto(fila, COL_UNIDAD);

    if (!/^\d+(\.\d+)*$/.test(item)) {
      throw new ErrorDelPresupuesto(`Fila ${numero}: «${item}» no parece un ítem de pago.`);
    }
    if (descripcion === '') {
      throw new ErrorDelPresupuesto(`Fila ${numero}: el ítem ${item} no tiene descripción.`);
    }
    const unidad = UNIDADES[normalizar(unidadEscrita)];
    if (!unidad) {
      throw new ErrorDelPresupuesto(
        `Fila ${numero}: la unidad «${unidadEscrita}» del ítem ${item} no es ninguna de ` +
          `${Object.keys(UNIDADES).join(', ')}.`,
      );
    }

    const anterior = porItem.get(item);
    if (!anterior) {
      porItem.set(item, { item, descripcion, unidad, fila: numero });
      return;
    }
    if (anterior.descripcion !== descripcion || anterior.unidad !== unidad) {
      throw new ErrorDelPresupuesto(
        `Fila ${numero}: el ítem ${item} no dice lo mismo que en la fila ${anterior.fila} ` +
          `(descripción o unidad distinta). Hay que decidir cuál vale antes de importar.`,
      );
    }
  });

  if (porItem.size === 0) {
    throw new ErrorDelPresupuesto('No encontré ninguna actividad con número en la columna C.');
  }

  return [...porItem.values()]
    .sort((a, b) => compararItems(a.item, b.item))
    .map(({ item, descripcion, unidad }) => ({ item, descripcion, unidad }));
}

async function main() {
  const archivo = process.argv[2] ? path.resolve(process.argv[2]) : ORIGEN;
  console.log(`Importando el presupuesto de ${path.relative(RAIZ, archivo)}\n`);

  const actividades = await leerPresupuesto(archivo);
  writeFileSync(DESTINO, `${JSON.stringify(actividades, null, 2)}\n`, 'utf8');

  const porUnidad = Object.values(UNIDADES)
    .map((u) => `${u} ${actividades.filter((a) => a.unidad === u).length}`)
    .join(' · ');
  console.log(`  ${actividades.length} actividades · ${porUnidad}`);
  console.log(`  → ${path.relative(RAIZ, DESTINO)}`);
}

main().catch((error: unknown) => {
  console.error(error instanceof ErrorDelPresupuesto ? `\n${error.message}` : error);
  process.exit(1);
});
