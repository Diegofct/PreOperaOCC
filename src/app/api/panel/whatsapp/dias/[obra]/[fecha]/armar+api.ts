import { requerirPermiso } from '@/features/servidor/guardia';
import { ok, responder } from '@/features/servidor/respuestas';
import { armarAMano } from '@/features/whatsapp/servidor/estado-dias';

/**
 * «Guardar con lo que hay». `POST /api/panel/whatsapp/dias/:obra/:fecha/armar` (spec
 * 024, RF-48).
 *
 * Arma la bitácora del día con los reportes que llegaron, antes de la hora límite. La
 * pueden pulsar el residente de la obra y la gerencia —los que atienden el módulo
 * (RF-64), con el mismo permiso con que antes se aprobaba—. Queda `incompleta` si
 * faltó algún reporte esperado (RF-47). 409 si ya está armada o cerrada.
 */
export async function POST(peticion: Request, { obra, fecha }: { obra: string; fecha: string }) {
  return responder(async () => {
    const sesion = await requerirPermiso(peticion, 'whatsapp', 'aprobar');
    if (sesion instanceof Response) return sesion;

    const resultado = await armarAMano(sesion, decodeURIComponent(obra), decodeURIComponent(fecha));
    return resultado instanceof Response ? resultado : ok(resultado);
  });
}
