import { requerirSesion } from '@/features/servidor/guardia';
import { alcanza } from '@/shared/rules/permisos';
import { errorDePeticion, ok, responder } from '@/features/servidor/respuestas';
import { leerBandeja } from '@/features/whatsapp/servidor/bandeja';
import {
  EMPRESAS_CON_GRUPO,
  ESTADOS_MENSAJE_WHATSAPP,
  origenDeLaBandeja,
  type EmpresaConGrupo,
  type EstadoMensajeWhatsapp,
} from '@/shared/rules/whatsapp';
import { categoriasDeWhatsappDe, esEmpresa } from '@/shared/rules/empresas';
import { fechaDeJornada } from '@/shared/rules/jornada';
import { MENSAJES_DE_RANGO, rangoDeFechas } from '@/shared/rules/rango';

/**
 * La bandeja. `GET /api/panel/whatsapp/propuestas?estado=&obraId=&desde=&hasta=` (spec
 * 021, RF-14 a RF-24; spec 025, RF-45 a RF-53: sin fechas, la última semana).
 *
 * Sin `estado`, los pendientes: es lo que la bandeja muestra al abrir. Con él, los
 * ignorados, los aprobados o los descartados (RF-24). `obraId` solo lo usa la
 * gerencia; al residente se le ignora y ve la suya (RF-14).
 *
 * Spec 038 (RF-25): con `?empresa=occ`, también el grupo de la empresa, y `?origen=` lo
 * filtra: `grupo` (su grupo), `obras` (lo de vehículos y maquinaria de las obras, 033) o
 * `todos` (por defecto).
 */
export async function GET(peticion: Request) {
  return responder(async () => {
    // Spec 038 (RF-28, RF-29): quien no tiene el permiso de WhatsApp —el laboratorista— entra
    // al grupo de su empresa con el de la Bitácora de la empresa, y a nada más.
    const sesion = await requerirSesion(peticion);
    if (sesion instanceof Response) return sesion;
    const parametros = new URL(peticion.url).searchParams;
    const soloElGrupo = !alcanza(sesion.rol, 'whatsapp', 'listar');
    if (
      soloElGrupo &&
      !(
        (EMPRESAS_CON_GRUPO as readonly string[]).includes(parametros.get('empresa') ?? '') &&
        alcanza(sesion.rol, 'bitacora_empresa', 'listar')
      )
    ) {
      return errorDePeticion('No tiene permiso para ver los reportes de WhatsApp.', 403);
    }

    const estado = parametros.get('estado') ?? 'pendiente';
    if (!ESTADOS_MENSAJE_WHATSAPP.includes(estado as EstadoMensajeWhatsapp)) {
      return errorDePeticion('Ese estado no existe en la bandeja.', 400);
    }

    const rango = rangoDeFechas(parametros.get('desde'), parametros.get('hasta'), fechaDeJornada());
    if ('error' in rango) return errorDePeticion(MENSAJES_DE_RANGO[rango.error], 400);

    // Spec 033, RF-23: `?empresa=occ` deja solo lo de vehículos y maquinaria.
    const empresa = parametros.get('empresa');
    if (empresa !== null && !esEmpresa(empresa)) return errorDePeticion('Esa empresa no existe.', 400);

    const propuestas = await leerBandeja(sesion, {
      estado: estado as EstadoMensajeWhatsapp,
      obraId: parametros.get('obraId'),
      ...rango,
      categorias: categoriasDeWhatsappDe(empresa),
      empresa:
        empresa && (EMPRESAS_CON_GRUPO as readonly string[]).includes(empresa)
          ? {
              id: empresa as EmpresaConGrupo,
              // Sin el permiso de WhatsApp, solo el grupo de la empresa (spec 038, RF-28).
              origen: soloElGrupo ? 'grupo' : origenDeLaBandeja(parametros.get('origen')),
            }
          : null,
    });
    return ok({ propuestas });
  });
}
