/**
 * Convierte los formatos Excel de OCC (`docs/*.xlsx`) en plantillas JSON.
 *
 *   npx tsx scripts/import-formatos.ts
 *
 * La estructura de los seis archivos es regular: una fila de encabezado con
 * UBICACIÓN · REVISION · SISTEMA AL QUE PERTENECE · INSTRUCTIVO, y debajo un
 * ítem por fila. La columna UBICACIÓN solo trae texto en la primera fila de
 * cada grupo (celdas combinadas), así que la sección se arrastra hacia abajo.
 *
 * El dato más valioso está escondido en la columna de sistema: el sufijo
 * `- AI` marca las "Actividades que Inmovilizan". Eso es la definición de ítem
 * crítico y la escribió OCC, no nosotros.
 *
 * La salida es para REVISIÓN HUMANA antes de sembrarla. El Excel no dice qué
 * ítems exigen foto ni los rangos válidos de los medidores.
 */
import ExcelJS from 'exceljs';
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';

import type {
  ItemChecklist,
  Periodicidad,
  PlantillaChecklist,
  SeccionChecklist,
  TipoItem,
} from '../src/features/checklists/types';
import { aplicarAjustes } from '../src/features/checklists/plantillas/ajustes';

const RAIZ = path.join(__dirname, '..');
const ORIGEN = path.join(RAIZ, 'docs');
const DESTINO = path.join(RAIZ, 'src', 'features', 'checklists', 'plantillas');

/** Nombre de archivo → slug del tipo de vehículo. */
const FORMATOS: { archivo: string; tipoVehiculo: string; nombre: string }[] = [
  {
    archivo: 'Preoperacionales Camionetas.xlsx',
    tipoVehiculo: 'camioneta',
    nombre: 'Preoperacional Camioneta',
  },
  {
    archivo: 'Preoperacionales Volquetas.xlsx',
    tipoVehiculo: 'volqueta',
    nombre: 'Preoperacional Volqueta',
  },
  {
    archivo: 'Preoperacionales Retroexcavadora.xlsx',
    tipoVehiculo: 'retroexcavadora',
    nombre: 'Preoperacional Retroexcavadora',
  },
  {
    archivo: 'Preoperacionales Retrocargador.xlsx',
    tipoVehiculo: 'retrocargador',
    nombre: 'Preoperacional Retrocargador',
  },
  {
    archivo: 'Preoperacionales Motoniveladora.xlsx',
    tipoVehiculo: 'motoniveladora',
    nombre: 'Preoperacional Motoniveladora',
  },
];

/** Los nombres de hoja traen erratas ("Quicenal"), así que se normalizan. */
function periodicidadDeHoja(nombreHoja: string): Periodicidad {
  const n = normalizar(nombreHoja);
  if (n.includes('quicenal') || n.includes('quincenal')) return 'quincenal';
  if (n.includes('mensual')) return 'mensual';
  return 'diaria';
}

function normalizar(texto: string): string {
  return texto
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim();
}

function slug(texto: string): string {
  return normalizar(texto)
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 48);
}

/** Columnas del formato. Iguales en los seis archivos. */
const COL_UBICACION = 'A';
const COL_REVISION = 'C';
const COL_SISTEMA = 'G';
const COL_INSTRUCTIVO = 'I';

/** `.text` revienta en celdas combinadas cuyo maestro está vacío. */
function textoDeCelda(celda: ExcelJS.Cell): string {
  try {
    return (celda.text ?? '').replace(/\s+/g, ' ').trim();
  } catch {
    return '';
  }
}

function texto(fila: ExcelJS.Row, columna: string): string {
  const celda = fila.getCell(columna);
  // En celdas combinadas solo la maestra tiene valor propio; las esclavas
  // devuelven el de la maestra vía `.master`, que aquí no queremos.
  if (celda.isMerged && celda.master?.address !== celda.address) return '';
  return textoDeCelda(celda);
}

function esFilaEncabezado(fila: ExcelJS.Row): boolean {
  return (
    normalizar(texto(fila, COL_UBICACION)) === 'ubicacion' &&
    normalizar(texto(fila, COL_REVISION)) === 'revision'
  );
}

function esFinDeItems(fila: ExcelJS.Row): boolean {
  const a = normalizar(texto(fila, COL_UBICACION));
  return a.startsWith('firma') || a.startsWith('observaciones') || a.startsWith('referencias');
}

/** El sufijo `- AI` en la columna de sistema = Actividad que Inmoviliza. */
function interpretarSistema(bruto: string): { sistema: string | null; inmoviliza: boolean } {
  if (!bruto) return { sistema: null, inmoviliza: false };
  const inmoviliza = /\bAI\b\s*$/.test(bruto.toUpperCase().replace(/[.\s]+$/, ''));
  const sistema = bruto
    .replace(/\s*-\s*AI\s*$/i, '')
    .trim()
    .toUpperCase();
  return { sistema: sistema || null, inmoviliza };
}

function tipoDeItem(label: string): { tipo: TipoItem; unidad?: string; decimales?: number } {
  const n = normalizar(label);
  if (n === 'horometro') return { tipo: 'numero', unidad: 'h', decimales: 1 };
  if (n === 'odometro') return { tipo: 'numero', unidad: 'km', decimales: 0 };
  return { tipo: 'conformidad' };
}

function tituloDelFormato(hoja: ExcelJS.Worksheet): string {
  let encontrado = '';
  hoja.eachRow({ includeEmpty: false }, (fila) => {
    if (encontrado) return;
    fila.eachCell({ includeEmpty: false }, (celda) => {
      const t = textoDeCelda(celda);
      if (!encontrado && normalizar(t).startsWith('inspeccion preoperacional')) encontrado = t;
    });
  });
  return encontrado;
}

interface Acumulado {
  secciones: Map<string, SeccionChecklist>;
  titulo: string;
  periodicidades: Periodicidad[];
  /** Claves ya usadas en toda la plantilla, para desambiguar repeticiones. */
  claves: Set<string>;
}

/**
 * La clave lleva la sección como prefijo porque "Aceite hidráulico" y
 * "Valvulina" aparecen en varias secciones de la misma volqueta.
 *
 * Aun así quedan choques legítimos: la camioneta revisa "Llantas" cada
 * quincena (presión) y otra vez cada mes (rotación). Son ítems distintos con
 * el mismo nombre, así que se desambiguan por periodicidad.
 */
function claveUnica(
  acc: Acumulado,
  seccionKey: string,
  label: string,
  periodicidad: Periodicidad,
): string {
  const base = `${seccionKey}__${slug(label)}`;
  if (!acc.claves.has(base)) {
    acc.claves.add(base);
    return base;
  }
  const conPeriodicidad = `${base}__${periodicidad}`;
  if (!acc.claves.has(conPeriodicidad)) {
    acc.claves.add(conPeriodicidad);
    return conPeriodicidad;
  }
  for (let n = 2; ; n++) {
    const candidata = `${conPeriodicidad}_${n}`;
    if (!acc.claves.has(candidata)) {
      acc.claves.add(candidata);
      return candidata;
    }
  }
}

function leerHoja(hoja: ExcelJS.Worksheet, acc: Acumulado) {
  const periodicidad = periodicidadDeHoja(hoja.name);
  if (!acc.periodicidades.includes(periodicidad)) acc.periodicidades.push(periodicidad);
  if (!acc.titulo) acc.titulo = tituloDelFormato(hoja);

  let dentroDeItems = false;
  let seccionActual: SeccionChecklist | null = null;

  hoja.eachRow({ includeEmpty: false }, (fila) => {
    if (!dentroDeItems) {
      if (esFilaEncabezado(fila)) dentroDeItems = true;
      return;
    }
    if (esFinDeItems(fila)) {
      dentroDeItems = false;
      return;
    }

    const ubicacion = texto(fila, COL_UBICACION);
    if (ubicacion) {
      const key = slug(ubicacion);
      // Algunos formatos repiten la ubicación al pasar de página
      // ("CAPOT O CARETA" aparece dos veces). Se fusionan.
      seccionActual = acc.secciones.get(key) ?? { key, titulo: ubicacion, items: [] };
      acc.secciones.set(key, seccionActual);
    }

    const label = texto(fila, COL_REVISION);
    if (!label || !seccionActual) return;

    const { sistema, inmoviliza } = interpretarSistema(texto(fila, COL_SISTEMA));
    const { tipo, unidad, decimales } = tipoDeItem(label);
    const ayuda = texto(fila, COL_INSTRUCTIVO);

    const key = claveUnica(acc, seccionActual.key, label, periodicidad);

    const item: ItemChecklist = {
      key,
      label,
      sistema,
      tipo,
      periodicidad,
      inmoviliza,
      exigirFoto: tipo === 'conformidad' ? 'no_conforme' : 'nunca',
      ...(ayuda ? { ayuda } : {}),
      ...(unidad ? { unidad } : {}),
      ...(decimales !== undefined ? { decimales } : {}),
    };
    seccionActual.items.push(item);
  });
}

async function importar(formato: (typeof FORMATOS)[number]): Promise<PlantillaChecklist> {
  const libro = new ExcelJS.Workbook();
  await libro.xlsx.readFile(path.join(ORIGEN, formato.archivo));

  const acc: Acumulado = {
    secciones: new Map(),
    titulo: '',
    periodicidades: [],
    claves: new Set(),
  };
  libro.eachSheet((hoja) => leerHoja(hoja, acc));

  const secciones = [...acc.secciones.values()].filter((s) => s.items.length > 0);
  const items = secciones.flatMap((s) => s.items);
  const tiene = (unidad: string) => items.some((i) => i.tipo === 'numero' && i.unidad === unidad);

  return {
    tipoVehiculo: formato.tipoVehiculo,
    nombre: formato.nombre,
    tituloFormato: acc.titulo,
    version: 1,
    medidores: {
      horometro: tiene('h') ? 'requerido' : 'oculto',
      odometro: tiene('km') ? 'requerido' : 'oculto',
    },
    exigeFirmaOperador: true,
    exigeFirmaJefe: true,
    periodicidades: acc.periodicidades,
    secciones,
    origen: formato.archivo,
  };
}

async function main() {
  mkdirSync(DESTINO, { recursive: true });
  console.log('Importando formatos de OCC\n');

  for (const formato of FORMATOS) {
    // Lo que el Excel no sabe decir se aplica aquí, no editando el JSON: el
    // JSON se regenera y el ajuste se perdería. Ver `ajustes.ts`.
    const plantilla = aplicarAjustes(await importar(formato));
    const destino = path.join(DESTINO, `${plantilla.tipoVehiculo}.v${plantilla.version}.json`);
    writeFileSync(destino, `${JSON.stringify(plantilla, null, 2)}\n`, 'utf8');

    const items = plantilla.secciones.flatMap((s) => s.items);
    const inmovilizan = items.filter((i) => i.inmoviliza);
    const porPeriodicidad = plantilla.periodicidades
      .map((p) => `${items.filter((i) => i.periodicidad === p).length} ${p}`)
      .join(', ');

    console.log(`  ${plantilla.tipoVehiculo.padEnd(16)} ${String(items.length).padStart(3)} ítems`);
    console.log(`  ${''.padEnd(16)} ${plantilla.secciones.length} secciones · ${porPeriodicidad}`);
    console.log(
      `  ${''.padEnd(16)} ${inmovilizan.length} inmovilizan` +
        (inmovilizan.length === 0 ? '  ← revisar con SST' : ''),
    );
    console.log(`  ${''.padEnd(16)} → ${path.relative(RAIZ, destino)}\n`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
