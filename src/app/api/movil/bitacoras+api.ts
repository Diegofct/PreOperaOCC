import { and, eq, isNull } from 'drizzle-orm';
import { z } from 'zod';

import { baseServidor } from '@/db/servidor/cliente';
import { aInstante } from '@/db/servidor/conversion';
import { bitacoras } from '@/db/servidor/esquema';
import { construirActividad } from '@/features/bitacoras/tipos';
import { requerirEquipo } from '@/features/servidor/guardia-movil';
import {
  avanzarMedidores,
  marcarProcesada,
  vehiculoAlcanzable,
  yaProcesada,
} from '@/features/servidor/ingesta';
import { cuerpoJson, errorDePeticion, ok, responder } from '@/features/servidor/respuestas';
import { esBitacoraCompleta, mensajeDeHorometros, validarHorometros } from '@/shared/rules/jornada';

/**
 * Recibe una bitácora cerrada desde el celular. `POST /api/movil/bitacoras`.
 *
 * Es el respaldo del camino principal: la bitácora se lleva desde la web, y el
 * residente que está en obra sin computador la cierra en su teléfono. **Las dos
 * escriben la misma fila y validan con las mismas funciones** de
 * `@/shared/rules/jornada` — ninguna reescribe la regla de la otra.
 *
 * El choque entre las dos vías lo resuelve el índice único parcial
 * `(vehiculo_id, fecha)` sobre las no anuladas, que ya existe: si el residente
 * ya la llevó desde la web ese día, la del celular **se rechaza con un mensaje
 * que lo explica** en vez de duplicar la jornada o pisarla. La del computador
 * llegó primero y es la que vale.
 */

const actividad = z.object({
  clave: z.string().trim().min(1).max(40),
  nombre: z.string().trim().max(120).optional(),
  descripcion: z.string().trim().max(500).default(''),
  observaciones: z.string().trim().max(500).default(''),
});

const envio = z.object({
  claveIdempotencia: z.string().trim().min(1).max(200),
  id: z.string().trim().min(1).max(64),
  vehiculoId: z.string().trim().min(1).max(64),
  operadorId: z.string().trim().min(1).max(64).nullish(),
  fecha: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'La fecha va en formato AAAA-MM-DD.'),
  horometroInicial: z.number().int().nonnegative().nullish(),
  horometroFinal: z.number().int().nonnegative().nullish(),
  actividades: z.array(actividad).max(20).default([]),
  cerradaEn: z.number().int().positive().nullish(),
});

export async function POST(peticion: Request) {
  return responder(async () => {
    const equipo = await requerirEquipo(peticion);
    if (equipo instanceof Response) return equipo;

    const datos = await cuerpoJson(peticion, envio);

    const duplicado = await yaProcesada(datos.claveIdempotencia);
    if (duplicado) return ok({ duplicado: true, id: duplicado });

    const maquina = await vehiculoAlcanzable(equipo, datos.vehiculoId);
    if (!maquina) {
      return errorDePeticion(
        'Ese vehículo no existe, está dado de baja, o no le corresponde a este equipo.',
        422,
      );
    }

    // Las mismas reglas que aplica el panel al cerrar desde la web. Se validan
    // aquí también porque el servidor no confía en el envío, no porque el
    // teléfono no las haya aplicado ya.
    const fallo = validarHorometros(
      datos.horometroInicial ?? null,
      datos.horometroFinal ?? null,
    );
    if (fallo) {
      return errorDePeticion(mensajeDeHorometros(fallo, datos.horometroInicial ?? null), 422);
    }

    const actividades = datos.actividades.map((a) =>
      construirActividad({
        clave: a.clave,
        texto: a.nombre,
        descripcion: a.descripcion,
        observaciones: a.observaciones,
      }),
    );

    const completa = esBitacoraCompleta({
      operadorId: datos.operadorId ?? null,
      horometroInicial: datos.horometroInicial ?? null,
      horometroFinal: datos.horometroFinal ?? null,
      actividades,
    });

    if (!completa) {
      return errorDePeticion(
        'La bitácora necesita quién operó la máquina, las dos lecturas del horómetro y al menos ' +
          'una actividad.',
        422,
      );
    }

    const db = baseServidor();

    const [existente] = await db
      .select({ id: bitacoras.id })
      .from(bitacoras)
      .where(
        and(
          eq(bitacoras.vehiculoId, datos.vehiculoId),
          eq(bitacoras.fecha, datos.fecha),
          isNull(bitacoras.anuladoEn),
        ),
      )
      .limit(1);

    if (existente && existente.id !== datos.id) {
      // Definitivo: reintentarlo no lo va a resolver. El teléfono deja de
      // intentarlo y el operador ve por qué.
      return errorDePeticion(
        'Ya hay una bitácora de esa máquina para ese día, llevada desde el panel. La del ' +
          'computador es la que vale; para corregirla hay que anularla allá.',
        422,
      );
    }

    const recibidoEn = new Date();

    await db
      .insert(bitacoras)
      .values({
        id: datos.id,
        vehiculoId: datos.vehiculoId,
        usuarioId: equipo.id,
        obraId: maquina.obraId,
        operadorId: datos.operadorId ?? null,
        fecha: datos.fecha,
        horometroInicial: datos.horometroInicial ?? null,
        horometroFinal: datos.horometroFinal ?? null,
        actividades,
        cerradaEn: aInstante(datos.cerradaEn) ?? recibidoEn,
        recibidoEn,
      })
      .onConflictDoNothing({ target: bitacoras.id });

    // El horómetro final es la lectura más reciente que existe de esa máquina, y
    // de ahí salen los disparadores de mantenimiento. Solo hacia arriba.
    await avanzarMedidores(maquina, { horometroH: datos.horometroFinal }, recibidoEn);
    await marcarProcesada(datos.claveIdempotencia, 'bitacora', datos.id);

    return ok({ duplicado: false, id: datos.id }, 201);
  });
}
