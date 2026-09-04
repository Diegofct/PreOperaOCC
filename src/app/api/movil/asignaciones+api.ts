import { and, eq, isNull } from 'drizzle-orm';
import { z } from 'zod';

import { baseServidor } from '@/db/servidor/cliente';
import { aInstanteObligatorio } from '@/db/servidor/conversion';
import { asignaciones, operacionesIdempotentes, vehiculos } from '@/db/servidor/esquema';
import { requerirEquipo } from '@/features/servidor/guardia-movil';
import { cuerpoJson, errorDePeticion, ok, responder } from '@/features/servidor/respuestas';

/**
 * Recibe una autoasignación. `POST /api/movil/asignaciones`.
 *
 * Es **lo único que sube** en este entregable, y sube porque sin ello el aviso
 * de "sin confirmar" del panel no se enciende nunca: un operador que llega a
 * obra sin asignación escoge su máquina en el celular, y la administración tiene
 * que enterarse.
 *
 * Que el operador pueda escoger no es una concesión, es la regla que gobierna la
 * app: **un operador bloqueado arranca la máquina sin preoperacional**, que es
 * exactamente lo que este sistema existe para evitar. Se le deja trabajar y se
 * marca la asignación para que alguien la confirme.
 *
 * **Idempotente.** La clave viene del `outbox` del teléfono con formato
 * `asignacion:<uuid>:upsert` y es estable entre reintentos: si la red se cayó
 * justo después de que el servidor grabara, el reenvío responde `duplicado` en
 * vez de crear una segunda asignación.
 */
const subida = z.object({
  claveIdempotencia: z.string().trim().min(1).max(200),
  id: z.string().trim().min(1).max(64),
  vehiculoId: z.string().trim().min(1).max(64),
  /** Epoch en milisegundos, que es como los guarda el teléfono. */
  desde: z.number().int().positive(),
});

export async function POST(peticion: Request) {
  return responder(async () => {
    const equipo = await requerirEquipo(peticion);
    if (equipo instanceof Response) return equipo;

    const datos = await cuerpoJson(peticion, subida);
    const db = baseServidor();

    const [yaProcesada] = await db
      .select({ entidadId: operacionesIdempotentes.entidadId })
      .from(operacionesIdempotentes)
      .where(eq(operacionesIdempotentes.clave, datos.claveIdempotencia))
      .limit(1);

    if (yaProcesada) return ok({ duplicado: true, id: yaProcesada.entidadId });

    const [maquina] = await db
      .select({ obraId: vehiculos.obraId })
      .from(vehiculos)
      .where(and(eq(vehiculos.id, datos.vehiculoId), isNull(vehiculos.eliminadoEn)))
      .limit(1);

    if (!maquina) return errorDePeticion('Ese vehículo ya no existe.', 404);

    // El id lo generó el teléfono con UUID v7 y llega definitivo: la fila nace
    // con su identidad final y un reenvío no puede crear un duplicado con otro
    // id. `onConflictDoNothing` cubre la carrera entre dos envíos a la vez.
    await db
      .insert(asignaciones)
      .values({
        id: datos.id,
        vehiculoId: datos.vehiculoId,
        usuarioId: equipo.id,
        obraId: maquina.obraId,
        desde: aInstanteObligatorio(datos.desde),
        origen: 'autoasignada',
      })
      .onConflictDoNothing({ target: asignaciones.id });

    await db
      .insert(operacionesIdempotentes)
      .values({
        clave: datos.claveIdempotencia,
        entidad: 'asignacion',
        entidadId: datos.id,
        operacion: 'upsert',
      })
      .onConflictDoNothing({ target: operacionesIdempotentes.clave });

    return ok({ duplicado: false, id: datos.id }, 201);
  });
}
