/**
 * Descargar un presupuesto en Excel (spec 031, RF-73). **Solo servidor**: con
 * `leer-excel.ts`, los dos archivos de presupuestos que importan `exceljs`.
 *
 * La hoja sigue la forma del formulario oficial, para que quien la abra la reconozca:
 * grupos y capítulos como títulos, los ítems con su renglón, ítem de pago, código,
 * especificaciones, descripción, unidad, cantidad, valor unitario y total, el subtotal de
 * cada capítulo, el de obras, los rubros, el valor del presupuesto y el AIU. Los números
 * van como números, para que se puedan sumar en Excel.
 */
import ExcelJS from 'exceljs';

import { NOMBRE_DE_ESTADO_DE_PRESUPUESTO, resumenDelPresupuesto, type EstructuraDePresupuesto } from '@/shared/rules/presupuesto';
import { etiquetaDeUnidad } from '@/shared/catalogos/presupuesto';

const ENCABEZADOS = [
  'Nº',
  'Ítem de pago',
  'Código ICOCIV',
  'Especificaciones',
  'Descripción',
  'Und.',
  'Cantidad',
  'Valor unitario',
  'Valor total',
];

const PESOS = '"$" #,##0';
const CANTIDAD = '#,##0.###';

export interface PresupuestoParaExportar {
  nombre: string;
  numeroVersion: number;
  estado: keyof typeof NOMBRE_DE_ESTADO_DE_PRESUPUESTO;
  estructura: EstructuraDePresupuesto;
  obra: { codigo: string; nombre: string };
}

/** El nombre del archivo: «presupuesto-<código de obra>-v2.xlsx», sin espacios ni tildes. */
export function nombreDelArchivoDelPresupuesto(codigoDeObra: string, version: number): string {
  const limpio = codigoDeObra
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^A-Za-z0-9-]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return `presupuesto-${limpio || 'obra'}-v${version}.xlsx`;
}

/** El libro del presupuesto. */
export async function libroDelPresupuesto(p: PresupuestoParaExportar): Promise<ArrayBuffer> {
  const resumen = resumenDelPresupuesto(p.estructura);
  const libro = new ExcelJS.Workbook();
  libro.creator = 'Control de Obra OCC';
  const hoja = libro.addWorksheet('Presupuesto');

  hoja.addRow([`${p.nombre} · v${p.numeroVersion} (${NOMBRE_DE_ESTADO_DE_PRESUPUESTO[p.estado]})`]).font = {
    bold: true,
    size: 13,
  };
  hoja.addRow([`${p.obra.codigo} · ${p.obra.nombre}`]);
  hoja.addRow([]);
  const encabezado = hoja.addRow(ENCABEZADOS);
  encabezado.font = { bold: true };
  hoja.views = [{ state: 'frozen', ySplit: 4 }];

  const subtotal = (texto: string, valor: number, negrilla = true) => {
    const fila = hoja.addRow([null, null, null, null, texto, null, null, null, valor]);
    fila.font = { bold: negrilla };
  };

  for (const g of p.estructura.grupos) {
    if (g.nombre) hoja.addRow([g.nombre]).font = { bold: true, size: 12 };
    for (const c of g.capitulos) {
      hoja.addRow([null, null, null, null, `${c.codigo} ${c.nombre}`.trim()]).font = { bold: true };
      for (const i of c.items) {
        hoja.addRow([
          i.renglon,
          i.item,
          i.icociv,
          i.especificaciones,
          i.descripcion,
          i.unidad ? etiquetaDeUnidad(i.unidad) : i.unidadEscrita,
          i.cantidad,
          i.valorUnitario,
          i.valorTotal,
        ]);
      }
      subtotal(`Subtotal ${c.nombre}`, c.items.reduce((s, i) => s + i.valorTotal, 0), false);
    }
    if (g.nombre && g.capitulos.length > 1) {
      subtotal(`Subtotal ${g.nombre}`, resumen.grupos.find((x) => x.id === g.id)?.subtotal ?? 0);
    }
  }
  hoja.addRow([]);
  subtotal('SUBTOTAL OBRAS', resumen.obras);

  if (p.estructura.rubros.length > 0) {
    hoja.addRow([]);
    hoja.addRow([null, null, null, null, 'RUBROS']).font = { bold: true };
    for (const r of p.estructura.rubros) {
      const grupo = p.estructura.grupos.find((g) => g.id === r.grupoId)?.nombre;
      hoja.addRow([null, null, null, null, grupo ? `${r.nombre} (${grupo})` : r.nombre, r.unidad, r.cantidad, r.valorUnitario, r.valor]);
    }
    subtotal('Total rubros', resumen.rubros);
  }

  hoja.addRow([]);
  const total = hoja.addRow([null, null, null, null, 'VALOR DEL PRESUPUESTO', null, null, null, resumen.valor]);
  total.font = { bold: true, size: 12 };

  hoja.addRow([]);
  hoja.addRow([null, null, null, null, 'AIU (incluido en los precios unitarios)']).font = { bold: true };
  hoja.addRow([null, null, null, null, 'Administración', null, null, null, resumen.aiu.administracion / 100]);
  hoja.addRow([null, null, null, null, 'Imprevistos', null, null, null, resumen.aiu.imprevistos / 100]);
  hoja.addRow([null, null, null, null, 'Utilidad', null, null, null, resumen.aiu.utilidad / 100]);
  hoja.addRow([null, null, null, null, 'Total AIU', null, null, null, resumen.aiu.total / 100]);

  // Formatos por columna, y el del AIU como porcentaje en sus cuatro filas.
  hoja.getColumn(7).numFmt = CANTIDAD;
  hoja.getColumn(8).numFmt = PESOS;
  hoja.getColumn(9).numFmt = PESOS;
  for (let n = hoja.rowCount - 3; n <= hoja.rowCount; n++) hoja.getRow(n).getCell(9).numFmt = '0.00%';
  const anchos = [6, 12, 14, 22, 70, 8, 14, 16, 20];
  anchos.forEach((ancho, i) => (hoja.getColumn(i + 1).width = ancho));
  hoja.getColumn(5).alignment = { wrapText: true, vertical: 'top' };

  return (await libro.xlsx.writeBuffer()) as ArrayBuffer;
}
