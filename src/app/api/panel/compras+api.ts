import { bandejaDelGrupo } from '@/features/compras/servidor/solicitudes';
import { requerirPermiso } from '@/features/servidor/guardia';
import { errorDePeticion, ok, responder } from '@/features/servidor/respuestas';
import { IDS_DE_ESTADOS_DE_SOLICITUD, type EstadoDeSolicitud } from '@/shared/rules/compras';
import { fechaDeJornada } from '@/shared/rules/jornada';
import { MENSAJES_DE_RANGO, rangoDeFechas } from '@/shared/rules/rango';

/**
 * Compras de Elemental (spec 036, RF-3, RF-4, RF-12, RF-26): las solicitudes de todo el
 * grupo. `GET /api/panel/compras?lugar=&estado=&urgentes=1&desde=&hasta=&texto=`, todos
 * opcionales; `lugar` es `occ`, `geolab` o el id de una obra, y las fechas, las del día en
 * que se pidió. La gerencia y, de consulta, la auxiliar de RR. HH.
 */
export async function GET(peticion: Request) {
  return responder(async () => {
    const sesion = await requerirPermiso(peticion, 'compras', 'listar');
    if (sesion instanceof Response) return sesion;

    const parametros = new URL(peticion.url).searchParams;
    const estado = parametros.get('estado') || null;
    if (estado && !IDS_DE_ESTADOS_DE_SOLICITUD.includes(estado as EstadoDeSolicitud)) {
      return errorDePeticion('Ese estado no existe.', 422);
    }
    let desde = parametros.get('desde') || null;
    let hasta = parametros.get('hasta') || null;
    if (desde || hasta) {
      // Con una sola punta, la otra la completa el rango por defecto, como en los listados (spec 025).
      const rango = rangoDeFechas(desde, hasta, fechaDeJornada());
      if ('error' in rango) return errorDePeticion(MENSAJES_DE_RANGO[rango.error], 422);
      ({ desde, hasta } = rango);
    }

    return ok(
      await bandejaDelGrupo(sesion, {
        lugar: parametros.get('lugar') || null,
        estado: estado as EstadoDeSolicitud | null,
        soloUrgentes: parametros.get('urgentes') === '1',
        desde,
        hasta,
        texto: parametros.get('texto') ?? '',
      }),
    );
  });
}
