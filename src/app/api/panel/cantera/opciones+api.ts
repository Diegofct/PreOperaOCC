import { obraParaRegistrar } from '@/features/cantera/servidor/catalogos';
import { opcionesDeLaObra } from '@/features/cantera/servidor/viajes';
import { requerirPermiso } from '@/features/servidor/guardia';
import { ok, responder } from '@/features/servidor/respuestas';

/**
 * Lo que se puede elegir al registrar un viaje. `GET /api/panel/cantera/opciones`
 * (spec 010, RF-6, RF-8 a RF-10 y RF-35).
 *
 * Ruta propia del módulo y no las de Vehículos y Personas: el encargado de planta
 * no tiene esos módulos (spec 008), y abrírselos para elegir una volqueta le
 * enseñaría la flota y el personal enteros. Aquí recibe solo lo elegible de su obra.
 *
 * Las opciones son de **una** obra: la gerencia tiene que decir cuál.
 */
export async function GET(peticion: Request) {
  return responder(async () => {
    const sesion = await requerirPermiso(peticion, 'cantera', 'listar');
    if (sesion instanceof Response) return sesion;

    const obraId = await obraParaRegistrar(
      sesion,
      new URL(peticion.url).searchParams.get('obraId'),
    );
    if (obraId instanceof Response) return obraId;

    return ok(await opcionesDeLaObra(obraId));
  });
}
