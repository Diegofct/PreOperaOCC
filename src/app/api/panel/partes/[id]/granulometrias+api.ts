import { granulometriasDeUnParte } from '@/features/laboratorio/servidor/parte';
import { requerirPermiso } from '@/features/servidor/guardia';
import { noEncontrado, ok, responder } from '@/features/servidor/respuestas';

/**
 * Los ensayos de granulometría de un parte.
 * `GET /api/panel/partes/:id/granulometrias` (spec 018, RF-106 a RF-112).
 *
 * Con el permiso de la **bitácora** y no el de laboratorio, como la sección de
 * cantera: es parte del parte y la lee quien lee el parte. Es de solo lectura
 * (RF-108): los ensayos se corrigen en su módulo, no desde aquí.
 */
export async function GET(peticion: Request, { id }: { id: string }) {
  return responder(async () => {
    const sesion = await requerirPermiso(peticion, 'bitacoras', 'listar');
    if (sesion instanceof Response) return sesion;

    const seccion = await granulometriasDeUnParte(sesion, id);
    return seccion ? ok(seccion) : noEncontrado('esa bitácora');
  });
}
