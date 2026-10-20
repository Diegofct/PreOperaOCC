import { intervaloEditado } from '@/features/panel/contratos';
import { guardarIntervalo, intervalosDeLosTipos } from '@/features/reportes/servidor/mantenimientos';
import { requerirAdmin, requerirPermiso } from '@/features/servidor/guardia';
import { cuerpoJson, ok, responder } from '@/features/servidor/respuestas';

/**
 * Los intervalos de mantenimiento (spec 030, RF-23 a RF-25).
 *
 * `GET` — el de cada tipo de equipo: el puesto, o el de arranque de su medidor. Lo ven
 * quienes ven Reportes. `PUT` — poner o quitar el de un tipo o el de una máquina: solo
 * la gerencia (RF-24, RF-25).
 */
export async function GET(peticion: Request) {
  return responder(async () => {
    const sesion = await requerirPermiso(peticion, 'reportes', 'listar');
    if (sesion instanceof Response) return sesion;
    return ok({ tipos: await intervalosDeLosTipos() });
  });
}

export async function PUT(peticion: Request) {
  return responder(async () => {
    const sesion = await requerirAdmin(peticion);
    if (sesion instanceof Response) return sesion;
    const datos = await cuerpoJson(peticion, intervaloEditado);
    const hecho = await guardarIntervalo(sesion, datos);
    return hecho instanceof Response ? hecho : ok(hecho);
  });
}
