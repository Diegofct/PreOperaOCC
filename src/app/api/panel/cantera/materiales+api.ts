import { eq } from 'drizzle-orm';
import { uuidv7 } from 'uuidv7';

import { baseServidor } from '@/db/servidor/cliente';
import { canteraMateriales } from '@/db/servidor/esquema';
import {
  condicionDeObra,
  leerMateriales,
  obraParaRegistrar,
} from '@/features/cantera/servidor/catalogos';
import { materialDeCanteraNuevo } from '@/features/panel/contratos';
import { requerirPermiso } from '@/features/servidor/guardia';
import { cuerpoJson, ok, responder } from '@/features/servidor/respuestas';
import { normalizar } from '@/shared/rules/texto';

/**
 * Los materiales de cantera de una obra (spec 010, RF-2).
 * `GET /api/panel/cantera/materiales`, `POST` para registrar uno.
 */

export async function GET(peticion: Request) {
  return responder(async () => {
    const sesion = await requerirPermiso(peticion, 'cantera', 'listar');
    if (sesion instanceof Response) return sesion;

    return ok(await leerMateriales(condicionDeObra(sesion, peticion, canteraMateriales.obraId)));
  });
}

export async function POST(peticion: Request) {
  return responder(async () => {
    const sesion = await requerirPermiso(peticion, 'cantera', 'escribir');
    if (sesion instanceof Response) return sesion;

    const datos = await cuerpoJson(peticion, materialDeCanteraNuevo);
    const obraId = await obraParaRegistrar(sesion, datos.obraId);
    if (obraId instanceof Response) return obraId;

    const id = uuidv7();
    // Nombre repetido: índice único parcial, bajo el campo `nombre` (RF-3).
    await baseServidor().insert(canteraMateriales).values({
      id,
      obraId,
      nombre: datos.nombre,
      nombreNormalizado: normalizar(datos.nombre),
      creadoPor: sesion.id,
    });

    const [creado] = await leerMateriales(eq(canteraMateriales.id, id));
    return ok(creado, 201);
  });
}
