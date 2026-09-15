import { and, eq, isNull } from 'drizzle-orm';
import { uuidv7 } from 'uuidv7';

import { baseServidor } from '@/db/servidor/cliente';
import { almacenMateriales, obras } from '@/db/servidor/esquema';
import {
  filaDeMaterial,
  filasDeMateriales,
  leerMateriales,
  movimientosDe,
} from '@/features/almacen-obra/servidor/materiales';
import { materialNuevo } from '@/features/panel/contratos';
import { filtroDeObra, veTodasLasObras } from '@/features/servidor/alcance';
import { requerirPermiso } from '@/features/servidor/guardia';
import { cuerpoJson, ok, responder } from '@/features/servidor/respuestas';
import { normalizar } from '@/shared/rules/texto';

/**
 * Los materiales del almacén de una obra. `GET /api/panel/almacen/materiales`,
 * `POST` para registrar uno (spec 009).
 *
 * El listado trae cada material con lo que entró, lo que salió y lo que queda. No
 * hay stock guardado: se suma cada vez con la regla (RF-17, RF-18).
 */

export async function GET(peticion: Request) {
  return responder(async () => {
    const sesion = await requerirPermiso(peticion, 'almacen', 'listar');
    if (sesion instanceof Response) return sesion;

    // La gerencia lleva todas las obras y elige una en la pantalla; sin elegir,
    // ve todas. A los demás, la suya la decide `alcance.ts` y el parámetro no
    // cuenta: si contara, un almacenista podría leer el almacén de otra obra.
    const obraPedida = new URL(peticion.url).searchParams.get('obraId');
    const condicion =
      veTodasLasObras(sesion) && obraPedida
        ? eq(almacenMateriales.obraId, obraPedida)
        : filtroDeObra(sesion, almacenMateriales.obraId);

    const materiales = await leerMateriales(condicion);
    const movimientos = await movimientosDe(materiales.map((m) => m.id));

    return ok(filasDeMateriales(materiales, movimientos));
  });
}

export async function POST(peticion: Request) {
  return responder(async () => {
    const sesion = await requerirPermiso(peticion, 'almacen', 'escribir');
    if (sesion instanceof Response) return sesion;

    const datos = await cuerpoJson(peticion, materialNuevo);

    // RF-1 y RF-28: el almacén es de una obra. La gerencia dice cuál; el
    // almacenista registra siempre en la suya, mande lo que mande.
    const obraId = veTodasLasObras(sesion) ? datos.obraId : sesion.obraId;
    if (!obraId) {
      return Response.json(
        veTodasLasObras(sesion)
          ? { error: 'Elija la obra del almacén.', campos: { obraId: 'Elija la obra del almacén.' } }
          : { error: 'Su cuenta no tiene obra asignada. Pídale a la gerencia que le asigne su obra.' },
        { status: 400 },
      );
    }

    const [obra] = await baseServidor()
      .select({ id: obras.id })
      .from(obras)
      .where(and(eq(obras.id, obraId), isNull(obras.eliminadoEn)))
      .limit(1);
    if (!obra) {
      return Response.json(
        { error: 'Esa obra no existe.', campos: { obraId: 'Esa obra no existe.' } },
        { status: 400 },
      );
    }

    const id = uuidv7();
    // Un nombre repetido lo detiene el índice único sobre el nombre normalizado,
    // también si llegan dos a la vez; `responder` lo convierte en un 409 bajo el
    // campo `nombre` (RF-3).
    await baseServidor().insert(almacenMateriales).values({
      id,
      obraId,
      nombre: datos.nombre,
      nombreNormalizado: normalizar(datos.nombre),
      unidad: datos.unidad,
      creadoPor: sesion.id,
    });

    const [creado] = await leerMateriales(eq(almacenMateriales.id, id));
    return ok(await filaDeMaterial(creado), 201);
  });
}
