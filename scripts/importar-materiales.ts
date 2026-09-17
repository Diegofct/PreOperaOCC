/**
 * Convierte la lista de materiales de OCC (`docs/materiales y equipos.xlsx`) en el
 * catálogo que se ofrece al registrar un material del almacén.
 *
 *   npm run materiales                   (lee docs/materiales y equipos.xlsx)
 *   npm run materiales -- otra-ruta.xlsx
 *
 * Escribe `src/shared/catalogos/materiales.json`, que **no se edita a mano**: cuando
 * OCC cambie la lista, se reemplaza el Excel y se corre esto otra vez (spec 009,
 * RF-32; editar la lista desde el panel está fuera de alcance).
 *
 * ── Por qué un script y no la lista escrita a mano ──
 *
 * Son 351 nombres con tildes, calibres, comillas de pulgadas y resistencias en MPa.
 * Copiados a mano, una errata pasaría sin que nadie la note, y un «Adoquin» sin
 * tilde en la lista es un material que nadie encuentra al buscarlo.
 *
 * ── Lo que se lee y lo que no ──
 *
 * **Solo la columna C**, el nombre. La hoja trae además el código del INVIAS
 * (columna A), la unidad (B) y el precio (D), y los tres se descartan a propósito:
 * el precio está fuera de alcance y la unidad la elige el almacenista de su propia
 * lista (RF-34), porque OCC compra el cemento por bultos y el documento lo trae en
 * kilogramos. Cuentan las filas con código de material en la columna A; los
 * encabezados y las franjas de título no lo tienen.
 *
 * El documento trae el mismo nombre en varias filas —otro código, otro precio—, y
 * se ofrece una sola vez (RF-35). Se comparan sin tildes ni mayúsculas, con la
 * misma función que usa el buscador del panel: dos nombres que el buscador no
 * puede distinguir no tienen por qué aparecer dos veces.
 *
 * ── Falla en voz alta ──
 *
 * Si el Excel cambia de forma, lo peor sería generar una lista vacía, corrida de
 * columna o a medias, y que nadie se diera cuenta hasta que un almacenista no
 * encuentre lo que busca. Por eso el script se detiene, nombrando la fila, ante una
 * hoja que no está, un encabezado que no aparece, una fila con código y sin nombre
 * o una lista sospechosamente corta. Y si falla, no escribe nada.
 */
import ExcelJS from 'exceljs';
import { writeFileSync } from 'node:fs';
import path from 'node:path';

import { normalizar } from '../src/shared/rules/texto';

const RAIZ = path.join(__dirname, '..');
const ORIGEN = path.join(RAIZ, 'docs', 'materiales y equipos.xlsx');
const DESTINO = path.join(RAIZ, 'src', 'shared', 'catalogos', 'materiales.json');

/** La hoja de materiales; la otra, EQUIPOS, no entra (spec 009, fuera de alcance). */
const HOJA = 'MATERIALES';

const COL_CODIGO = 'A';
const COL_NOMBRE = 'C';

/** El código del INVIAS: «B0020001». Es lo que separa un material de un título. */
const CODIGO = /^[A-Z]\d+$/;

/**
 * Menos que esto es una lista rota, no una lista corta.
 *
 * El documento de 2026 trae 351 nombres. Si mañana trae 40, lo que pasó no es que
 * OCC recortara su catálogo: es que el script está leyendo la columna equivocada.
 */
const MINIMO = 300;

class ErrorDeMateriales extends Error {}

/** `.text` es lo que muestra la celda, con los saltos de línea del Excel aplanados. */
function texto(fila: ExcelJS.Row, columna: string): string {
  try {
    return (fila.getCell(columna).text ?? '').replace(/\s+/g, ' ').trim();
  } catch {
    return '';
  }
}

async function leerMateriales(archivo: string): Promise<string[]> {
  const libro = new ExcelJS.Workbook();
  await libro.xlsx.readFile(archivo);
  const hoja = libro.getWorksheet(HOJA);
  if (!hoja) {
    throw new ErrorDeMateriales(
      `El archivo no tiene la hoja «${HOJA}». Trae: ${libro.worksheets
        .map((h) => h.name)
        .join(', ')}.`,
    );
  }

  // El encabezado confirma que la columna C es la que este script cree que es. El
  // título de la hoja también dice «MATERIALES», pero ese ocupa la fila entera:
  // el encabezado de la columna es el que la tiene sola, con la A vacía.
  let filaEncabezado = 0;
  hoja.eachRow((fila, numero) => {
    if (
      filaEncabezado === 0 &&
      normalizar(texto(fila, COL_NOMBRE)) === 'materiales' &&
      texto(fila, COL_CODIGO) === ''
    ) {
      filaEncabezado = numero;
    }
  });
  if (filaEncabezado === 0) {
    throw new ErrorDeMateriales(
      `No encontré el encabezado «MATERIALES» en la columna ${COL_NOMBRE} de la hoja ` +
        `«${HOJA}». ¿Cambió la forma del Excel?`,
    );
  }

  const porNombre = new Map<string, { nombre: string; fila: number }>();
  let repetidos = 0;

  hoja.eachRow((fila, numero) => {
    if (numero <= filaEncabezado) return;
    const codigo = texto(fila, COL_CODIGO);
    if (!CODIGO.test(codigo)) return;

    const nombre = texto(fila, COL_NOMBRE);
    if (nombre === '') {
      throw new ErrorDeMateriales(`Fila ${numero}: el material ${codigo} no tiene nombre.`);
    }

    const clave = normalizar(nombre);
    if (porNombre.has(clave)) {
      repetidos++;
      return;
    }
    porNombre.set(clave, { nombre, fila: numero });
  });

  if (porNombre.size < MINIMO) {
    throw new ErrorDeMateriales(
      `Solo encontré ${porNombre.size} materiales con código en la columna ${COL_CODIGO}, ` +
        `y se esperan al menos ${MINIMO}. Reviso la hoja antes de escribir nada.`,
    );
  }

  console.log(`  ${repetidos} filas repetidas, ofrecidas una sola vez`);

  // En orden alfabético y no en el del documento: el almacenista recorre la lista
  // con la vista antes de escribir en el buscador, y el Excel no está ordenado del
  // todo. Se compara sin tildes para que «Ácido» no quede al final.
  return [...porNombre.values()]
    .map((m) => m.nombre)
    .sort((a, b) => normalizar(a).localeCompare(normalizar(b), 'es'));
}

async function main() {
  const archivo = process.argv[2] ? path.resolve(process.argv[2]) : ORIGEN;
  console.log(`Importando los materiales de ${path.relative(RAIZ, archivo)}\n`);

  const materiales = await leerMateriales(archivo);
  writeFileSync(DESTINO, `${JSON.stringify(materiales, null, 2)}\n`, 'utf8');

  console.log(`  ${materiales.length} materiales`);
  console.log(`  → ${path.relative(RAIZ, DESTINO)}`);
}

main().catch((error: unknown) => {
  if (error instanceof ErrorDeMateriales) {
    console.error(`\nNo importé nada: ${error.message}`);
    process.exit(1);
  }
  throw error;
});
