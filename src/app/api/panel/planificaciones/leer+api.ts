import { obraDelContrato } from '@/features/contratos/servidor/contrato';
import { gruposElegidos, seleccionDeHojasPedida } from '@/features/panel/planificacion';
import { iniciarLectura } from '@/features/planificacion/servidor/lecturas';
import { requerirPermiso } from '@/features/servidor/guardia';
import { errorDePeticion, errorDeValidacion, ok, responder } from '@/features/servidor/respuestas';

/** Un parámetro en JSON: `undefined` si no vino, o el error si no es JSON. */
function jsonDe(valor: string | null): { ok: true; datos: unknown } | { ok: false } {
  if (valor === null || valor === '') return { ok: true, datos: undefined };
  try {
    return { ok: true, datos: JSON.parse(valor) };
  } catch {
    return { ok: false };
  }
}

/**
 * Leer las hojas confirmadas de un Excel de planificación (spec 043, RF-6 a RF-10, RF-43, RF-103,
 * RF-107, RF-116, RF-117).
 *
 * `POST /api/panel/planificaciones/leer?obraId=&hojas=&sustituir=1&grupos=` con los bytes del
 * .xlsx en el cuerpo. `hojas` es la selección en JSON (`{ hojas: [{ nombre, usos }],
 * confirmoProgramacion? }`) y `grupos`, el grupo escogido por frente cuando la lectura anterior
 * terminó en `falta_grupo`. Responde 202 con `{ lecturaId }`: la lectura sigue por detrás, porque
 * el proxy corta a los 120 s, y se consulta en `lecturas/:id`.
 *
 * 400 si los parámetros no tienen forma; 409 si la obra no tiene presupuesto vigente, si ya hay
 * una lectura en curso o si hay borrador y no vino `sustituir=1`; 413, 422 si el archivo no es
 * `.xlsx` o la selección no sirve (con `faltas`), y 503 si la IA falla.
 */
export async function POST(peticion: Request) {
  return responder(async () => {
    const sesion = await requerirPermiso(peticion, 'planificacion', 'escribir');
    if (sesion instanceof Response) return sesion;

    const parametros = new URL(peticion.url).searchParams;
    const obraId = await obraDelContrato(sesion, parametros.get('obraId'));
    if (obraId instanceof Response) return obraId;

    const hojas = jsonDe(parametros.get('hojas'));
    const grupos = jsonDe(parametros.get('grupos'));
    if (!hojas.ok || !grupos.ok) return errorDePeticion('Las hojas o los grupos no vinieron bien escritos.');
    const seleccion = seleccionDeHojasPedida.safeParse(hojas.datos);
    if (!seleccion.success) return errorDeValidacion(seleccion.error);
    const elegidos = gruposElegidos.safeParse(grupos.datos ?? {});
    if (!elegidos.success) return errorDeValidacion(elegidos.error);

    const iniciada = await iniciarLectura(sesion, obraId, new Uint8Array(await peticion.arrayBuffer()), seleccion.data, {
      sustituir: parametros.get('sustituir') === '1',
      grupos: elegidos.data,
    });
    return iniciada instanceof Response ? iniciada : ok(iniciada, 202);
  });
}
