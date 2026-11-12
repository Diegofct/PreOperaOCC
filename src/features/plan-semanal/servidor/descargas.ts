/**
 * El plan semanal como archivo de Excel (spec 044, RF-80, RF-81, RF-30, RF-102). **Solo servidor.**
 *
 * Igual que en el cumplimiento, aquí solo se escribe el archivo: qué dice cada celda lo decide
 * `../exportar.ts`, que es puro, y el plan sale de `detalleDelPlan`, la misma función de la
 * pantalla. Así la descarga del Residente sale sin plata y sin textos con pesos por la misma razón
 * que su pantalla: el objeto ya llegó sin ellos. Los valores se calculan en ese momento (RF-94).
 *
 * Se descarga cualquier plan al alcance, también uno anulado o descartado (RF-79): el estado va en
 * el subtítulo de cada hoja, para que un borrador reenviado no se lea como un plan aprobado.
 */
import ExcelJS from 'exceljs';
import { eq } from 'drizzle-orm';

import { baseServidor } from '@/db/servidor/cliente';
import { obras } from '@/db/servidor/esquema';
import { textoDelPeriodo } from '@/features/reportes/exportar';
import { vehiculosDeLaObra } from '@/features/reportes/servidor/datos';
import { escribirHoja } from '@/features/reportes/servidor/excel';
import type { PersonaEnSesion } from '@/features/servidor/guardia';
import { sumarDias } from '@/shared/rules/jornada';
import type { EstadoDePlanSemanal } from '@/shared/rules/plan-semanal';

import { hojasDelPlan, nombreDelPlan } from '../exportar';
import { detalleDelPlan, type FilaDelPlan } from './planes';

const ESTADO: Record<EstadoDePlanSemanal, string> = {
  borrador: 'Borrador, sin aprobar',
  vigente: 'Aprobado',
  anulado: 'Anulado',
  descartado: 'Descartado',
};

/** RF-80: el libro del plan, con la obra, la semana, el estado y cuándo se generó arriba de cada hoja. */
export async function excelDelPlan(sesion: PersonaEnSesion, plan: FilaDelPlan): Promise<{ archivo: ArrayBuffer; nombre: string }> {
  const [detalle, [obra], flota] = await Promise.all([
    detalleDelPlan(sesion, plan),
    baseServidor().select({ nombre: obras.nombre, codigo: obras.codigo }).from(obras).where(eq(obras.id, plan.obraId)).limit(1),
    vehiculosDeLaObra(plan.obraId),
  ]);
  const titulo = `Plan de trabajo semanal · ${obra?.nombre ?? 'Obra'}`;
  const generado = new Date().toLocaleString('es-CO', { timeZone: 'America/Bogota', dateStyle: 'medium', timeStyle: 'short' });
  const semana = textoDelPeriodo({ tipo: 'semana', desde: plan.semana, hasta: sumarDias(plan.semana, 6) });
  const subtitulo = `${semana} · ${ESTADO[plan.estado]} · generado el ${generado}`;

  const libro = new ExcelJS.Workbook();
  libro.creator = 'Control de Obra OCC';
  const vehiculos = new Map(flota.map((v) => [v.id, v.codigo]));
  for (const hoja of hojasDelPlan(detalle.vista, vehiculos)) escribirHoja(libro, hoja, titulo, subtitulo);
  return { archivo: (await libro.xlsx.writeBuffer()) as ArrayBuffer, nombre: nombreDelPlan(obra?.codigo ?? 'obra', plan.semana) };
}
