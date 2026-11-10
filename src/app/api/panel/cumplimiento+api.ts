import { obraDelContrato } from '@/features/contratos/servidor/contrato';
import { pedidoDeInformeDeCumplimiento } from '@/features/panel/planificacion';
import { informeParaLaPersona } from '@/features/planificacion/servidor/cumplimiento';
import { requerirPermiso } from '@/features/servidor/guardia';
import { errorDeValidacion, ok, responder } from '@/features/servidor/respuestas';
import { fechaDeJornada } from '@/shared/rules/jornada';

/**
 * El informe de cumplimiento de una obra (spec 043, RF-54, RF-58 a RF-91, RF-96).
 *
 * `GET /api/panel/cumplimiento?obraId=&tipo=semana|mes&fecha=AAAA-MM-DD` responde la meta, lo
 * ejecutado, los porcentajes, los pendientes y los avisos del periodo que contiene la fecha (hoy si
 * no viene). Gerencia, Director de Proyectos y Director de Obra lo reciben con plata; el Residente,
 * solo en cantidades, sin ninguna clave de plata en la respuesta (RF-88, RF-89). Los demás, 403.
 */
export async function GET(peticion: Request) {
  return responder(async () => {
    const sesion = await requerirPermiso(peticion, 'cumplimiento', 'listar');
    if (sesion instanceof Response) return sesion;

    const parametros = new URL(peticion.url).searchParams;
    const obraId = await obraDelContrato(sesion, parametros.get('obraId'));
    if (obraId instanceof Response) return obraId;

    const pedido = pedidoDeInformeDeCumplimiento.safeParse({
      tipo: parametros.get('tipo') ?? 'semana',
      fecha: parametros.get('fecha') ?? fechaDeJornada(),
    });
    if (!pedido.success) return errorDeValidacion(pedido.error);

    return ok(await informeParaLaPersona(sesion, obraId, pedido.data.tipo, pedido.data.fecha));
  });
}
