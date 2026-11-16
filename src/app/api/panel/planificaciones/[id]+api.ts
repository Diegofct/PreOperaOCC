import { edicionDeBorradorPedida } from '@/features/panel/planificacion';
import { guardarBorrador } from '@/features/planificacion/servidor/borradores';
import { detalleDePlanificacion, planificacionAlAlcance } from '@/features/planificacion/servidor/planificaciones';
import { requerirPermiso } from '@/features/servidor/guardia';
import { errorDePeticion, errorDeValidacion, noEncontrado, ok, responder } from '@/features/servidor/respuestas';

/**
 * Una versión de la planificación (spec 043, RF-25 a RF-33, RF-40, RF-49, RF-86).
 *
 * `GET /api/panel/planificaciones/:id` responde la estructura, los hallazgos, el resumen, las
 * cifras descartadas y si se cruzó contra un presupuesto que ya no es el vigente. Una de otra obra,
 * 404.
 */
export async function GET(peticion: Request, { id }: { id: string }) {
  return responder(async () => {
    const sesion = await requerirPermiso(peticion, 'planificacion', 'ver');
    if (sesion instanceof Response) return sesion;

    const fila = await planificacionAlAlcance(sesion, id);
    return fila ? ok(await detalleDePlanificacion(fila, sesion)) : noEncontrado('esa planificación');
  });
}

/**
 * Guardar el borrador editado en pantalla (spec 045, RF-44 a RF-60, RF-137). Hasta la 045 no había
 * `PUT`: un borrador se corregía volviendo a subir el Excel.
 *
 * `PUT /api/panel/planificaciones/:id` con el borrador editable completo y la `version` que se abrió
 * (`edicionDeBorradorPedida`). El servidor recalcula todo con la regla e ignora cualquier total que
 * venga (RF-57). Responde 200 con lo recalculado; 400 si el pedido no tiene forma; 409 si ya no es
 * borrador o si otra persona guardó antes (RF-58); 422 si la regla lo rechaza, con sus motivos.
 * Lo guarda quien escribe planificación: la Dirección de Proyectos y la Gerencia.
 */
export async function PUT(peticion: Request, { id }: { id: string }) {
  return responder(async () => {
    const sesion = await requerirPermiso(peticion, 'planificacion', 'escribir');
    if (sesion instanceof Response) return sesion;

    let cuerpo: unknown;
    try {
      cuerpo = await peticion.json();
    } catch {
      return errorDePeticion('El borrador no vino bien escrito.');
    }
    const pedido = edicionDeBorradorPedida.safeParse(cuerpo);
    if (!pedido.success) return errorDeValidacion(pedido.error);

    const guardado = await guardarBorrador(sesion, id, pedido.data);
    return guardado instanceof Response ? guardado : ok(guardado);
  });
}
