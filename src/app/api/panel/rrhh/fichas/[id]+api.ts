import { fichaEditada } from '@/features/panel/contratos';
import { fichaDe, guardarFicha } from '@/features/rrhh/servidor/fichas';
import { requerirPermiso } from '@/features/servidor/guardia';
import { cuerpoJson, noEncontrado, ok, responder } from '@/features/servidor/respuestas';

/**
 * La ficha laboral de una persona (spec 035, RF-12 a RF-17, RF-32, RF-33).
 * `GET /api/panel/rrhh/fichas/:id` la da a quien ve RR. HH. y alcanza a esa persona; el
 * salario, solo a quien lo ve. `PUT` la guarda entera con su `version`: solo gerencia y la
 * auxiliar (RF-6); versión vieja, 409; datos mal, 422 con lo que falla.
 */
export async function GET(peticion: Request, { id }: { id: string }) {
  return responder(async () => {
    const sesion = await requerirPermiso(peticion, 'rrhh', 'ver');
    if (sesion instanceof Response) return sesion;

    const ficha = await fichaDe(sesion, id);
    return ficha ? ok(ficha) : noEncontrado('esa persona');
  });
}

export async function PUT(peticion: Request, { id }: { id: string }) {
  return responder(async () => {
    const sesion = await requerirPermiso(peticion, 'rrhh', 'escribir');
    if (sesion instanceof Response) return sesion;

    const pedido = await cuerpoJson(peticion, fichaEditada);
    const resultado = await guardarFicha(sesion, id, pedido);
    return resultado instanceof Response ? resultado : ok(resultado);
  });
}
