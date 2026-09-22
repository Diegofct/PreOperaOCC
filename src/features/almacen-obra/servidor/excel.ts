/**
 * El almacén en un libro de Excel (spec 009, cambio del 2026-09-22, RF-45 a RF-50).
 * **Solo servidor.**
 *
 * **Es el único archivo que sabe que detrás está `exceljs`**, igual que
 * `media/servidor/almacen.ts` es el único que sabe de R2. Si un día hay que
 * cambiar de librería —o el servidor donde se despliega no la corre—, se
 * reescribe este archivo y nada más. Lo importa solo la ruta de descarga: una
 * cadena de imports que la trajera al panel metería en el navegador una librería
 * pesada y pensada para Node.
 *
 * Qué dice cada celda no se decide aquí sino en `../exportar.ts`, que es puro y se
 * prueba en el guion. Aquí se lee lo que toca, se le pasa y se escribe el libro.
 *
 * ── Qué se lee ──
 *
 * El alcance es el del listado de materiales: el almacenista y el residente, su
 * obra, mande lo que mande la petición; la gerencia, la obra pedida o todas. Los
 * movimientos se leen **con los de materiales dados de baja**, que siguen siendo
 * historia de la obra; las existencias, solo de los vigentes (RF-46, RF-48).
 */
import { and, eq, type SQL } from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';
import ExcelJS from 'exceljs';

import { baseServidor } from '@/db/servidor/cliente';
import { almacenMateriales, almacenMovimientos, obras, usuarios } from '@/db/servidor/esquema';
import { filtroDeModulo, filtroDeObra, veTodasLasObras } from '@/features/servidor/alcance';
import type { PersonaEnSesion } from '@/features/servidor/guardia';
import { fechaDeJornada } from '@/shared/rules/jornada';

import {
  hojasDelAlmacen,
  nombreDelArchivo,
  type HojaParaExportar,
  type MovimientoParaExportar,
} from '../exportar';
import { cantidadDeLaBase, leerMateriales } from './materiales';

export const TIPO_XLSX = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

const anulador = alias(usuarios, 'anulador');

/** Ancho y formato de cada columna, por su encabezado. Lo que no está va con el de siempre. */
const FORMATO_DE_COLUMNA: Record<string, { ancho: number; formato?: string }> = {
  Obra: { ancho: 28 },
  Fecha: { ancho: 12, formato: 'yyyy-mm-dd' },
  Tipo: { ancho: 10 },
  Material: { ancho: 36 },
  Unidad: { ancho: 16 },
  Cantidad: { ancho: 12, formato: '#,##0.00' },
  'Entregó / recibió': { ancho: 28 },
  'Para qué / observación': { ancho: 40 },
  Registró: { ancho: 24 },
  'Registrado el': { ancho: 18, formato: 'yyyy-mm-dd hh:mm' },
  Estado: { ancho: 10 },
  Anuló: { ancho: 24 },
  'Anulado el': { ancho: 18, formato: 'yyyy-mm-dd hh:mm' },
  'Motivo de la anulación': { ancho: 40 },
  Ingresado: { ancho: 12, formato: '#,##0.00' },
  Salido: { ancho: 12, formato: '#,##0.00' },
  Stock: { ancho: 12, formato: '#,##0.00' },
};

function escribirHoja(libro: ExcelJS.Workbook, nombre: string, hoja: HojaParaExportar) {
  const nueva = libro.addWorksheet(nombre);
  nueva.columns = hoja.encabezados.map((encabezado) => {
    const formato = FORMATO_DE_COLUMNA[encabezado];
    return {
      header: encabezado,
      width: formato?.ancho ?? 16,
      style: formato?.formato ? { numFmt: formato.formato } : {},
    };
  });
  nueva.getRow(1).font = { bold: true };
  // Los encabezados quedan a la vista al bajar por una hoja larga.
  nueva.views = [{ state: 'frozen', ySplit: 1 }];
  for (const fila of hoja.filas) nueva.addRow(fila);
}

/** Los movimientos del alcance, con los de materiales dados de baja. */
async function leerMovimientos(condicion: SQL | undefined): Promise<MovimientoParaExportar[]> {
  const filas = await baseServidor()
    .select({
      id: almacenMovimientos.id,
      obraNombre: obras.nombre,
      materialId: almacenMovimientos.materialId,
      materialNombre: almacenMateriales.nombre,
      unidad: almacenMateriales.unidad,
      tipo: almacenMovimientos.tipo,
      fecha: almacenMovimientos.fecha,
      cantidad: almacenMovimientos.cantidad,
      responsable: almacenMovimientos.responsable,
      paraQue: almacenMovimientos.paraQue,
      observacion: almacenMovimientos.observacion,
      registradoPorNombre: usuarios.nombreCompleto,
      registradoEn: almacenMovimientos.creadoEn,
      anuladoEn: almacenMovimientos.anuladoEn,
      anuladoPorNombre: anulador.nombreCompleto,
      motivoAnulacion: almacenMovimientos.motivoAnulacion,
    })
    .from(almacenMovimientos)
    // Sin filtrar los dados de baja: sus movimientos siguen siendo de la obra.
    .innerJoin(almacenMateriales, eq(almacenMateriales.id, almacenMovimientos.materialId))
    .leftJoin(obras, eq(obras.id, almacenMovimientos.obraId))
    .leftJoin(usuarios, eq(usuarios.id, almacenMovimientos.registradoPor))
    .leftJoin(anulador, eq(anulador.id, almacenMovimientos.anuladoPor))
    // Igual que el listado: una obra sin almacén no sale en el archivo (RF-10).
    .where(and(filtroDeModulo('almacen', almacenMovimientos.obraId), condicion));

  return filas.map((f) => ({
    ...f,
    obraNombre: f.obraNombre ?? '—',
    cantidad: cantidadDeLaBase(f.cantidad),
  }));
}

/**
 * El libro del almacén al alcance de quien lo pide, con el nombre con que se guarda.
 * `obraPedida` solo cuenta para la gerencia (ver el comentario de arriba).
 */
export async function libroDelAlmacen(
  sesion: PersonaEnSesion,
  obraPedida: string | null,
): Promise<{ archivo: ArrayBuffer; nombre: string }> {
  const todas = veTodasLasObras(sesion);
  const obraId = todas ? obraPedida : sesion.obraId;

  const [movimientos, materiales] = await Promise.all([
    leerMovimientos(
      todas && obraPedida
        ? eq(almacenMovimientos.obraId, obraPedida)
        : filtroDeObra(sesion, almacenMovimientos.obraId),
    ),
    leerMateriales(
      todas && obraPedida
        ? eq(almacenMateriales.obraId, obraPedida)
        : filtroDeObra(sesion, almacenMateriales.obraId),
    ),
  ]);

  // El código va en el nombre del archivo (RF-50); sin obra, es el de todas.
  const [obra] = obraId
    ? await baseServidor()
        .select({ codigo: obras.codigo })
        .from(obras)
        .where(eq(obras.id, obraId))
        .limit(1)
    : [];

  const hojas = hojasDelAlmacen(
    movimientos,
    materiales.map((m) => ({ id: m.id, obraNombre: m.obraNombre ?? '—', nombre: m.nombre, unidad: m.unidad })),
  );

  const libro = new ExcelJS.Workbook();
  libro.creator = 'PreOperaOCC';
  escribirHoja(libro, 'Movimientos', hojas.movimientos);
  escribirHoja(libro, 'Existencias', hojas.existencias);

  return {
    archivo: await libro.xlsx.writeBuffer(),
    nombre: nombreDelArchivo(obra?.codigo ?? null, fechaDeJornada()),
  };
}
