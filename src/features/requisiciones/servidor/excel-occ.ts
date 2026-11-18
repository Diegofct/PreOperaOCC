/**
 * La requisición de pagos de OCC en un libro de Excel (spec 047, RF-52 a RF-58). **Solo servidor.**
 *
 * Como `almacen-obra/servidor/excel.ts`, es el único archivo de esta parte que sabe que detrás está
 * `exceljs`; lo importa solo la ruta de descarga. Qué dice cada celda lo decide `../exportar-occ.ts`,
 * que es puro y se prueba en el guion. Lo que se lee es el mismo detalle que ve la pantalla, con su
 * mismo alcance (RF-58, RF-73): quien no ve la requisición recibe 404, no un archivo.
 */
import ExcelJS from 'exceljs';

import type { PersonaEnSesion } from '@/features/servidor/guardia';
import { marcarLibro } from '@/features/servidor/marca-de-archivos';

import { nombreDelArchivoOcc, planillaOcc } from '../exportar-occ';
import { detalleDeRequisicionOcc } from './requisicion-occ';

export const TIPO_XLSX = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

/** Anchos de las once columnas, como la hoja de OCC. */
const ANCHOS = [6, 14, 30, 40, 30, 28, 14, 10, 12, 40, 30];
const PESOS = '"$" #,##0';

export async function libroDeLaRequisicionOcc(sesion: PersonaEnSesion, id: string): Promise<{ archivo: ArrayBuffer; nombre: string } | Response> {
  const detalle = await detalleDeRequisicionOcc(sesion, id);
  if (detalle instanceof Response) return detalle;

  const planilla = planillaOcc({
    codigo: detalle.codigo,
    viernes: detalle.viernes,
    estado: detalle.estado,
    elaboradaPor: detalle.elaboradaPor.nombre,
    lineas: detalle.lineasVigentes.map((l) => ({
      numero: l.numero,
      fechaSolicitud: l.fechaSolicitud,
      beneficiario: l.beneficiario,
      concepto: l.concepto,
      especificaciones: l.especificaciones,
      proveedor: l.proveedor,
      valor: l.valor,
      observaciones: l.observaciones,
      tieneRut: l.rutMediaId !== null,
      tieneCuenta: l.cuentaMediaId !== null,
      respuesta: l.respuesta,
      motivoRespuesta: l.motivoRespuesta,
      respondida: l.respondida,
    })),
  });

  const libro = new ExcelJS.Workbook();
  const hoja = libro.addWorksheet('REQUISICIONES');
  ANCHOS.forEach((ancho, i) => (hoja.getColumn(i + 1).width = ancho));

  hoja.getCell('A1').value = planilla.titulo;
  hoja.getCell('A1').font = { bold: true, size: 14 };
  hoja.getCell('A3').value = 'Fecha viernes de entrega:';
  hoja.getCell('C3').value = planilla.viernes;
  hoja.getCell('G3').value = 'TOTAL A PAGAR';
  hoja.getCell('G3').font = { bold: true };
  hoja.getCell('A4').value = 'Elaborado por:';
  hoja.getCell('C4').value = planilla.elaboradaPor;
  hoja.getCell('G4').value = planilla.totalAPagar;
  hoja.getCell('G4').numFmt = PESOS;
  hoja.getCell('G4').font = { bold: true };
  if (planilla.aviso) {
    hoja.getCell('A5').value = planilla.aviso;
    hoja.getCell('A5').font = { bold: true };
  }

  const encabezado = hoja.getRow(7);
  planilla.columnas.forEach((columna, i) => {
    const celda = encabezado.getCell(i + 1);
    celda.value = columna;
    celda.font = { bold: true };
    celda.alignment = { wrapText: true, vertical: 'middle' };
  });
  planilla.filas.forEach((fila, i) => {
    const renglon = hoja.getRow(8 + i);
    fila.forEach((valor, c) => (renglon.getCell(c + 1).value = valor));
    renglon.getCell(7).numFmt = PESOS;
    renglon.getCell(10).alignment = { wrapText: true, vertical: 'top' };
  });

  marcarLibro(libro);
  return { archivo: await libro.xlsx.writeBuffer(), nombre: nombreDelArchivoOcc(detalle.codigo, detalle.viernes) };
}
