import { eq } from 'drizzle-orm';
import { uuidv7 } from 'uuidv7';

import { baseServidor } from '@/db/servidor/cliente';
import { canteraSitios } from '@/db/servidor/esquema';
import {
  condicionDeObra,
  leerSitios,
  obraParaRegistrar,
} from '@/features/cantera/servidor/catalogos';
import { sitioNuevo } from '@/features/panel/contratos';
import { requerirPermiso } from '@/features/servidor/guardia';
import { cuerpoJson, ok, responder } from '@/features/servidor/respuestas';
import { normalizar } from '@/shared/rules/texto';

/**
 * Los sitios de origen y destino de los viajes de una obra (spec 010, RF-1).
 * `GET /api/panel/cantera/sitios`, `POST` para registrar uno.
 */

export async function GET(peticion: Request) {
  return responder(async () => {
    const sesion = await requerirPermiso(peticion, 'cantera', 'listar');
    if (sesion instanceof Response) return sesion;

    return ok(await leerSitios(condicionDeObra(sesion, peticion, canteraSitios.obraId)));
  });
}

export async function POST(peticion: Request) {
  return responder(async () => {
    const sesion = await requerirPermiso(peticion, 'cantera', 'escribir');
    if (sesion instanceof Response) return sesion;

    const datos = await cuerpoJson(peticion, sitioNuevo);
    const obraId = await obraParaRegistrar(sesion, datos.obraId);
    if (obraId instanceof Response) return obraId;

    const id = uuidv7();
    // El nombre repetido lo detiene el índice único parcial, también si llegan dos
    // a la vez; `responder` lo pone bajo el campo `nombre` (RF-3).
    await baseServidor().insert(canteraSitios).values({
      id,
      obraId,
      nombre: datos.nombre,
      nombreNormalizado: normalizar(datos.nombre),
      tipo: datos.tipo,
      creadoPor: sesion.id,
    });

    const [creado] = await leerSitios(eq(canteraSitios.id, id));
    return ok(creado, 201);
  });
}
