/**
 * El informe de cumplimiento como archivo (spec 043, RF-92, RF-93, RF-96). **Solo servidor.**
 *
 * Igual que en Reportes, aquí solo se escribe el archivo: qué dice cada celda lo decide
 * `../exportar.ts`, que es puro, y las cifras salen de `informeParaLaPersona`, la misma función de
 * la pantalla. Así la descarga del Residente sale sin plata por la misma razón que su pantalla: el
 * objeto ya llegó sin ella.
 */
import ExcelJS from 'exceljs';
import { eq } from 'drizzle-orm';

import { baseServidor } from '@/db/servidor/cliente';
import { obras } from '@/db/servidor/esquema';
import { pdfDelAsistente } from '@/features/asistente/servidor/archivos/pdf';
import { textoDelPeriodo } from '@/features/reportes/exportar';
import { escribirHoja } from '@/features/reportes/servidor/excel';
import type { PersonaEnSesion } from '@/features/servidor/guardia';
import { encabezadoDelArchivo } from '@/shared/rules/archivos-del-asistente';
import type { PeriodoDeMeta } from '@/shared/rules/cumplimiento-de-obra';

import { bloquesDelInforme, hojasDelInforme, nombreDelInforme } from '../exportar';
import { informeParaLaPersona } from './cumplimiento';

/** RF-92: el libro del periodo, con la obra y cuándo se generó arriba de cada hoja. */
export async function excelDelInforme(
  sesion: PersonaEnSesion,
  obraId: string,
  tipo: PeriodoDeMeta['tipo'],
  fecha: string,
): Promise<{ archivo: ArrayBuffer; nombre: string }> {
  const [informe, [obra]] = await Promise.all([
    informeParaLaPersona(sesion, obraId, tipo, fecha),
    baseServidor().select({ nombre: obras.nombre, codigo: obras.codigo }).from(obras).where(eq(obras.id, obraId)).limit(1),
  ]);
  const titulo = `Cumplimiento de la planificación · ${obra?.nombre ?? 'Obra'}`;
  const generado = new Date().toLocaleString('es-CO', { timeZone: 'America/Bogota', dateStyle: 'medium', timeStyle: 'short' });
  const subtitulo = `${textoDelPeriodo(informe.periodo)} · generado el ${generado}`;

  const libro = new ExcelJS.Workbook();
  libro.creator = 'Control de Obra OCC';
  for (const hoja of hojasDelInforme(informe)) escribirHoja(libro, hoja, titulo, subtitulo);
  return { archivo: (await libro.xlsx.writeBuffer()) as ArrayBuffer, nombre: nombreDelInforme(obra?.codigo ?? 'obra', informe.periodo, 'xlsx') };
}

const LEYENDA_DEL_INFORME = 'Generado desde el panel con los partes diarios y la planificación aprobada. No es evidencia firmada.';

/** RF-93: el mismo informe en PDF, con el armador del asistente (spec 040) y las mismas tablas. */
export async function pdfDelInforme(
  sesion: PersonaEnSesion,
  obraId: string,
  tipo: PeriodoDeMeta['tipo'],
  fecha: string,
): Promise<{ archivo: Uint8Array<ArrayBuffer>; nombre: string }> {
  const [informe, [obra]] = await Promise.all([
    informeParaLaPersona(sesion, obraId, tipo, fecha),
    baseServidor().select({ nombre: obras.nombre, codigo: obras.codigo }).from(obras).where(eq(obras.id, obraId)).limit(1),
  ]);
  const archivo = await pdfDelAsistente({
    titulo: `Cumplimiento de la planificación · ${obra?.nombre ?? 'Obra'} · ${textoDelPeriodo(informe.periodo)}`,
    encabezado: encabezadoDelArchivo({ quien: sesion.nombreCompleto, generadoEn: new Date().toISOString(), fuentes: [] }),
    bloques: bloquesDelInforme(informe),
    leyenda: LEYENDA_DEL_INFORME,
  });
  return { archivo: new Uint8Array(archivo), nombre: nombreDelInforme(obra?.codigo ?? 'obra', informe.periodo, 'pdf') };
}
