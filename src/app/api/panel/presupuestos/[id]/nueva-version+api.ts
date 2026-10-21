import { nuevaVersionDePresupuesto } from '@/features/panel/contratos';
import { nuevaVersion } from '@/features/presupuestos/servidor/versiones';
import { requerirPermiso } from '@/features/servidor/guardia';
import { cuerpoJson, ok, responder } from '@/features/servidor/respuestas';

/**
 * Crear una nueva versión del vigente. `POST /api/panel/presupuestos/:id/nueva-version`
 * con `{ nota }` (spec 031, RF-52): un borrador que es copia exacta del vigente, con los
 * mismos ids. 409 si ya hay un borrador o si no es el vigente.
 */
export async function POST(peticion: Request, { id }: { id: string }) {
  return responder(async () => {
    const sesion = await requerirPermiso(peticion, 'contrato', 'escribir');
    if (sesion instanceof Response) return sesion;

    const { nota } = await cuerpoJson(peticion, nuevaVersionDePresupuesto);
    const resultado = await nuevaVersion(sesion, id, nota);
    return resultado instanceof Response ? resultado : ok(resultado, 201);
  });
}
