import { cortesDe, obraVigente, registrarCorte } from '@/features/empresas/servidor/cortes';
import { corteNuevo } from '@/features/panel/contratos';
import { requerirPermiso } from '@/features/servidor/guardia';
import { cuerpoJson, errorDePeticion, noEncontrado, ok, responder } from '@/features/servidor/respuestas';
import { EMPRESAS_CON_CORTE, type EmpresaId } from '@/shared/rules/empresas';

/**
 * Los cortes de una empresa (`?empresa=occ`) o de una obra (`?obraId=…`), del más
 * reciente al más antiguo, con los anulados y la diferencia del último con el anterior
 * (spec 033, RF-37 a RF-39). `GET /api/panel/cortes`. Solo gerencia (RF-44).
 */
export async function GET(peticion: Request) {
  return responder(async () => {
    const sesion = await requerirPermiso(peticion, 'finanzas', 'listar');
    if (sesion instanceof Response) return sesion;

    const parametros = new URL(peticion.url).searchParams;
    const empresa = parametros.get('empresa');
    const obraId = parametros.get('obraId');
    if (Boolean(empresa) === Boolean(obraId)) {
      return errorDePeticion('Diga de qué empresa o de qué obra son los cortes.');
    }
    if (empresa) {
      // Proyectos no tiene corte propio: sus cortes son los de sus obras (cambio del 2026-10-27).
      if (!(EMPRESAS_CON_CORTE as readonly string[]).includes(empresa)) {
        return noEncontrado('información financiera propia de esa empresa');
      }
      return ok(await cortesDe({ empresaId: empresa as EmpresaId }));
    }
    return ok(await cortesDe({ obraId: obraId! }));
  });
}

/**
 * Registrar un corte (RF-34 a RF-36). `POST /api/panel/cortes`. 201 con el id; 400 si
 * la fecha es futura o un valor no vale; 409 si ya hay uno vigente con esa fecha.
 */
export async function POST(peticion: Request) {
  return responder(async () => {
    const sesion = await requerirPermiso(peticion, 'finanzas', 'escribir');
    if (sesion instanceof Response) return sesion;

    const corte = await cuerpoJson(peticion, corteNuevo);
    if (corte.obraId && !(await obraVigente(corte.obraId))) return noEncontrado('esa obra');

    const resultado = await registrarCorte(corte, sesion.id);
    if (resultado.tipo === 'rechazado') return errorDePeticion(resultado.mensaje, resultado.estado);
    return ok({ id: resultado.id }, 201);
  });
}
