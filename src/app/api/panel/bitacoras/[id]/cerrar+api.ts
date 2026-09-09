import { eq } from 'drizzle-orm';

import { baseServidor } from '@/db/servidor/cliente';
import { bitacoras, vehiculos } from '@/db/servidor/esquema';
import { rechazoSiNoEsEditable } from '@/features/bitacoras/servidor/acceso';
import { requerirPermiso } from '@/features/servidor/guardia';
import { errorDePeticion, noEncontrado, ok, responder } from '@/features/servidor/respuestas';
import { esBitacoraCompleta, mensajeDeHorometros, validarHorometros } from '@/shared/rules/jornada';

/**
 * Cerrar la jornada. `POST /api/panel/bitacoras/:id/cerrar`.
 *
 * Cerrar es el gesto que convierte un borrador en documento, y por eso es aquí
 * —y no al ir guardando— donde se valida que esté completa.
 *
 * **Las reglas salen de `@/shared/rules/jornada` sin reescribir ni una.** Son
 * las mismas funciones puras que usa el celular del residente en obra: si el
 * horómetro final no puede ser menor que el inicial allá, tampoco acá. Escribir
 * "la misma" validación dos veces es como acaban siendo dos validaciones
 * distintas sin que nadie lo note.
 */
export async function POST(peticion: Request, { id }: { id: string }) {
  return responder(async () => {
    const sesion = await requerirPermiso(peticion, 'bitacoras', 'escribir');
    if (sesion instanceof Response) return sesion;

    const rechazo = await rechazoSiNoEsEditable(sesion, id);
    if (rechazo) return rechazo;

    const db = baseServidor();

    const [actual] = await db
      .select({
        vehiculoId: bitacoras.vehiculoId,
        operadorId: bitacoras.operadorId,
        horometroInicial: bitacoras.horometroInicial,
        horometroFinal: bitacoras.horometroFinal,
        actividades: bitacoras.actividades,
      })
      .from(bitacoras)
      .where(eq(bitacoras.id, id))
      .limit(1);

    if (!actual) return noEncontrado('esa bitácora');

    const fallo = validarHorometros(actual.horometroInicial, actual.horometroFinal);
    if (fallo) return errorDePeticion(mensajeDeHorometros(fallo, actual.horometroInicial), 400);

    if (!esBitacoraCompleta(actual)) {
      return errorDePeticion(
        'Falta información: la bitácora necesita quién operó la máquina, las dos lecturas del ' +
          'horómetro y al menos una actividad.',
        400,
      );
    }

    const ahora = new Date();
    await db.update(bitacoras).set({ cerradaEn: ahora }).where(eq(bitacoras.id, id));

    /**
     * Avanza el horómetro del vehículo con la lectura final.
     *
     * Es la más reciente que existe, y de ahí salen los disparadores de
     * mantenimiento preventivo. Con `Math.max` y nunca a secas: el celular puede
     * subir después una lectura más alta de un preoperacional posterior, y un
     * medidor que retrocede es siempre un error de digitación, nunca un hecho.
     */
    if (actual.horometroFinal !== null) {
      const [maquina] = await db
        .select({ horometroH: vehiculos.horometroH })
        .from(vehiculos)
        .where(eq(vehiculos.id, actual.vehiculoId))
        .limit(1);

      if (maquina) {
        await db
          .update(vehiculos)
          .set({
            horometroH: Math.max(actual.horometroFinal, maquina.horometroH ?? 0),
            medidorActualizadoEn: ahora,
          })
          .where(eq(vehiculos.id, actual.vehiculoId));
      }
    }

    return ok({ id, cerradaEn: ahora });
  });
}
