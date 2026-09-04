import { and, desc, eq } from 'drizzle-orm';
import { z } from 'zod';

import { baseServidor } from '@/db/servidor/cliente';
import { aInstante, aInstanteObligatorio } from '@/db/servidor/conversion';
import { plantillas, preoperacionales } from '@/db/servidor/esquema';
import { requerirEquipo } from '@/features/servidor/guardia-movil';
import {
  avanzarMedidores,
  marcarProcesada,
  vehiculoAlcanzable,
  yaProcesada,
} from '@/features/servidor/ingesta';
import { cuerpoJson, errorDePeticion, ok, responder } from '@/features/servidor/respuestas';
import { evaluarPreoperacional } from '@/shared/rules/inspeccion';
import type {
  PlantillaChecklist,
  RespuestaItem,
  ResultadoPreoperacional,
} from '@/features/checklists/types';

/**
 * Recibe un preoperacional firmado. `POST /api/movil/preoperacionales`.
 *
 * Lo importante de esta ruta no es guardar —eso es un `insert`— sino lo que
 * comprueba antes:
 *
 *  1. **Que el equipo tenga derecho a esa máquina.** Un token autentica al
 *     teléfono, no legitima lo que manda.
 *  2. **Que el veredicto sea el correcto.** El servidor **reevalúa** el
 *     preoperacional con las mismas reglas puras que corrieron en el celular, y
 *     guarda su propio resultado. Es lo que prescribe `AGENTS.md`: *"el servidor
 *     ejecutará las mismas al ingerir. Si difieren, gana el servidor."*
 *
 * En la práctica no deberían diferir nunca, porque la regla está escrita una
 * sola vez en `@/shared/rules/inspeccion`. Que difieran significa una de dos
 * cosas, y las dos hay que saberlas: la plantilla cambió entre que el operador
 * la bajó y firmó, o alguien manipuló el envío. Se guarda el veredicto del
 * servidor y la discrepancia queda anotada en las observaciones.
 *
 * **Un preoperacional recibido no se sobrescribe nunca.** Es evidencia firmada;
 * se corrige anulándolo desde el panel y levantando otro.
 */

const respuesta = z.object({
  itemKey: z.string().min(1),
  seccionKey: z.string().min(1),
  label: z.string(),
  sistema: z.string().nullish(),
  tipo: z.string(),
  inmoviliza: z.boolean(),
  valor: z.string(),
  observacion: z.string().nullish(),
  respondidoEn: z.number().int().nonnegative().nullish(),
});

const envio = z.object({
  claveIdempotencia: z.string().trim().min(1).max(200),
  id: z.string().trim().min(1).max(64),
  vehiculoId: z.string().trim().min(1).max(64),
  obraId: z.string().trim().min(1).max(64).nullish(),

  plantillaTipoVehiculo: z.string().trim().min(1).max(40),
  plantillaVersion: z.number().int().positive(),
  plantillaHash: z.string().trim().min(1).max(128),
  periodicidades: z.array(z.string()).min(1),

  iniciadoEn: z.number().int().positive(),
  enviadoEn: z.number().int().positive().nullish(),

  odometroKm: z.number().int().nonnegative().nullish(),
  horometroH: z.number().int().nonnegative().nullish(),

  respuestas: z.array(respuesta),
  // Conjunto cerrado: un resultado inventado no entra ni siquiera para
  // compararlo con el del servidor.
  resultado: z.enum(['apto', 'apto_con_observaciones', 'no_apto']).nullish(),
  observaciones: z.string().max(2000).nullish(),

  firmaOperadorMediaId: z.string().nullish(),
  fotoHorometroMediaId: z.string().nullish(),
  desfaseRelojMs: z.number().int().nullish(),
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
      // Definitivo: reintentar esto mil veces no lo arregla, y el teléfono tiene
      // que dejar de intentarlo y decírselo al operador.
      return errorDePeticion(
        'Ese vehículo no existe, está dado de baja, o no le corresponde a este equipo.',
        422,
      );
    }

    const db = baseServidor();

    /**
     * La plantilla **de la versión que el operador tenía**, no la última.
     *
     * Un formato se puede publicar de nuevo mientras un equipo lleva días sin
     * señal. Evaluar su preoperacional contra una versión que él nunca vio daría
     * un veredicto sobre ítems que no le aparecieron.
     */
    const [plantillaFila] = await db
      .select({ esquema: plantillas.esquema, hash: plantillas.hash })
      .from(plantillas)
      .where(
        and(
          eq(plantillas.tipoVehiculoId, datos.plantillaTipoVehiculo),
          eq(plantillas.version, datos.plantillaVersion),
        ),
      )
      .orderBy(desc(plantillas.version))
      .limit(1);

    const veredicto = reevaluar(plantillaFila?.esquema ?? null, datos);

    const observaciones = [datos.observaciones?.trim(), veredicto.nota]
      .filter((linea): linea is string => Boolean(linea))
      .join('\n\n');

    const recibidoEn = new Date();

    await db
      .insert(preoperacionales)
      .values({
        id: datos.id,
        vehiculoId: datos.vehiculoId,
        usuarioId: equipo.id,
        obraId: maquina.obraId,
        plantillaTipoVehiculo: datos.plantillaTipoVehiculo,
        plantillaVersion: datos.plantillaVersion,
        plantillaHash: datos.plantillaHash,
        periodicidades: datos.periodicidades,
        iniciadoEn: aInstanteObligatorio(datos.iniciadoEn),
        enviadoEn: aInstante(datos.enviadoEn) ?? recibidoEn,
        odometroKm: datos.odometroKm ?? null,
        horometroH: datos.horometroH ?? null,
        respuestas: datos.respuestas as RespuestaItem[],
        resultado: veredicto.resultado,
        cantidadInmovilizantes: veredicto.inmovilizantes,
        observaciones: observaciones || null,
        firmaOperadorMediaId: datos.firmaOperadorMediaId ?? null,
        fotoHorometroMediaId: datos.fotoHorometroMediaId ?? null,
        desfaseRelojMs: datos.desfaseRelojMs ?? 0,
        recibidoEn,
      })
      // El id lo generó el teléfono con UUID v7 y llega definitivo. Un reenvío
      // que se cruzó con el original encuentra la fila ya puesta y no la pisa:
      // lo firmado no se reescribe.
      .onConflictDoNothing({ target: preoperacionales.id });

    await avanzarMedidores(maquina, datos, recibidoEn);
    await marcarProcesada(datos.claveIdempotencia, 'preoperacional', datos.id);

    return ok(
      {
        duplicado: false,
        id: datos.id,
        resultado: veredicto.resultado,
        /** El teléfono lo registra: es la señal de que su copia quedó distinta. */
        discrepancia: veredicto.nota !== null,
      },
      201,
    );
  });
}

interface Veredicto {
  resultado: ResultadoPreoperacional | null;
  inmovilizantes: number;
  /** Qué anotar en las observaciones cuando el servidor corrigió al teléfono. */
  nota: string | null;
}

/**
 * Recalcula el resultado con las reglas del proyecto.
 *
 * Si no hay plantilla de esa versión en el servidor, no se puede reevaluar: se
 * acepta lo que dijo el teléfono y **se anota**, en vez de rechazar el envío. Un
 * preoperacional legítimo no se pierde porque al servidor le falte un catálogo.
 */
function reevaluar(
  esquema: PlantillaChecklist | null,
  datos: {
    resultado?: ResultadoPreoperacional | null;
    respuestas: unknown[];
    periodicidades: string[];
  },
): Veredicto {
  if (!esquema) {
    return {
      resultado: datos.resultado ?? null,
      inmovilizantes: 0,
      nota: 'El servidor no tiene esa versión del formato y no pudo verificar el resultado.',
    };
  }

  const evaluacion = evaluarPreoperacional(
    esquema,
    datos.periodicidades as never,
    datos.respuestas as RespuestaItem[],
  );

  const nota =
    datos.resultado && datos.resultado !== evaluacion.resultado
      ? `El equipo reportó "${datos.resultado}" y la verificación del servidor dio ` +
        `"${evaluacion.resultado}". Vale el del servidor.`
      : null;

  return {
    resultado: evaluacion.resultado,
    inmovilizantes: evaluacion.inmovilizantes.length,
    nota,
  };
}
