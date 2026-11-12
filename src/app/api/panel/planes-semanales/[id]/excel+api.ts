import { disposicionDelArchivo } from '@/features/documentos/servidor/documentos';
import { excelDelPlan } from '@/features/plan-semanal/servidor/descargas';
import { planAlAlcance } from '@/features/plan-semanal/servidor/planes';
import { TIPO_XLSX } from '@/features/reportes/servidor/excel';
import { requerirPermiso } from '@/features/servidor/guardia';
import { noEncontrado, responder } from '@/features/servidor/respuestas';

/**
 * Bajar un plan semanal en Excel (spec 044, RF-80, RF-81, RF-30, RF-102).
 *
 * `GET /api/panel/planes-semanales/:id/excel` entrega el plan con las secciones del Excel de la
 * Directora y las mismas cifras de la pantalla, en cualquier estado. Al Residente le sale sin
 * columnas de plata y con sus textos con pesos reemplazados. De otra obra, 404.
 */
export async function GET(peticion: Request, { id }: { id: string }) {
  return responder(async () => {
    const sesion = await requerirPermiso(peticion, 'plan_semanal', 'ver');
    if (sesion instanceof Response) return sesion;

    const plan = await planAlAlcance(sesion, id);
    if (!plan) return noEncontrado('ese plan semanal');
    const { archivo, nombre } = await excelDelPlan(sesion, plan);

    return new Response(archivo, {
      headers: {
        'Content-Type': TIPO_XLSX,
        'Content-Length': String(archivo.byteLength),
        // Puede llevar valores: ningún proxy compartido lo guarda.
        'Cache-Control': 'private, no-store',
        'Content-Disposition': disposicionDelArchivo(nombre, true),
      },
    });
  });
}
