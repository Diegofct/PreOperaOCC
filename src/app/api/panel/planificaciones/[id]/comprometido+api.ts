import type { ResumenComprometidoRespuesta } from '@/features/panel/requisiciones';
import { planificacionAlAlcance } from '@/features/planificacion/servidor/planificaciones';
import { codigosDeRequisiciones, planificacionDeLaObra } from '@/features/requisiciones/servidor/planificacion';
import { requerirPermiso } from '@/features/servidor/guardia';
import { errorDePeticion, noEncontrado, ok, responder } from '@/features/servidor/respuestas';
import { opcionesParaImputar, resumenDeLoComprometido, veElResumenDeLoComprometido } from '@/shared/rules/requisicion-planificacion';

/**
 * Lo comprometido de una planificación vigente (spec 048, RF-42, RF-50 a RF-53, RF-66).
 *
 * `GET /api/panel/planificaciones/:id/comprometido`: una fila por ítem, rubro y renglón indirecto
 * —la mano de obra indirecta en una sola— con lo planeado, lo comprometido por las requisiciones
 * de la obra, lo que queda y el exceso; aparte lo «Fuera de lo planeado» y lo que perdió su opción;
 * y el código de cada requisición para abrirla. Lo ven la Gerencia, el Director de Proyectos y el
 * Director de Obra de esa obra (RF-53): los demás, 403. Una de otra obra, 404; una que no es la
 * vigente, 409, porque lo comprometido se cuenta contra la vigente (RF-39).
 */
export async function GET(peticion: Request, { id }: { id: string }) {
  return responder(async () => {
    const sesion = await requerirPermiso(peticion, 'planificacion', 'ver');
    if (sesion instanceof Response) return sesion;
    if (!veElResumenDeLoComprometido(sesion.rol)) {
      return errorDePeticion('Lo comprometido de la planificación lo ven la Gerencia y los directores.', 403);
    }

    const fila = await planificacionAlAlcance(sesion, id);
    if (!fila) return noEncontrado('esa planificación');
    if (fila.estado !== 'vigente') return errorDePeticion('Lo comprometido se cuenta contra la planificación vigente.', 409);

    const { aportes } = await planificacionDeLaObra(fila.obraId);
    const resumen = resumenDeLoComprometido(opcionesParaImputar([{ id: fila.id, estructura: fila.estructura }]), aportes);
    const ids = [...new Set([...resumen.filas.flatMap((f) => f.requisiciones), ...resumen.fuera.requisiciones, ...resumen.sinOpcion.requisiciones])];
    const respuesta: ResumenComprometidoRespuesta = { ...resumen, requisiciones: await codigosDeRequisiciones(ids) };
    return ok(respuesta);
  });
}
