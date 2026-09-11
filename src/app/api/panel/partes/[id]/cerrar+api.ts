import { and, eq, isNull, sql } from 'drizzle-orm';

import { baseServidor } from '@/db/servidor/cliente';
import { partesDeObra, vehiculos } from '@/db/servidor/esquema';
import { parteEditable } from '@/features/bitacoras/servidor/acceso';
import { requerirPermiso } from '@/features/servidor/guardia';
import { errorDePeticion, noEncontrado, ok, responder } from '@/features/servidor/respuestas';
import { mensajeDeAvance, validarAvance } from '@/shared/rules/jornada';

/**
 * Cerrar el parte del día. `POST /api/panel/partes/:id/cerrar`.
 *
 * Cerrar es lo que lo convierte en registro definitivo, y por eso es aquí donde
 * se exige que esté completo: mientras se llena, a lo largo de la tarde, hacen
 * falta lecturas a medias y personas sin hora de salida.
 *
 * Al cerrar, los horómetros de las máquinas avanzan. **Solo hacia arriba**: el
 * operador pudo haber reportado en su preoperacional una lectura más alta que la
 * que el residente apuntó de memoria, y la más alta es la que vale.
 */
export async function POST(peticion: Request, { id }: { id: string }) {
  return responder(async () => {
    const sesion = await requerirPermiso(peticion, 'bitacoras', 'escribir');
    if (sesion instanceof Response) return sesion;

    const estado = await parteEditable(sesion, id);
    if (estado instanceof Response) return estado;

    const db = baseServidor();

    const [parte] = await db
      .select({
        maquinaria: partesDeObra.maquinaria,
        personal: partesDeObra.personal,
        actividades: partesDeObra.actividades,
      })
      .from(partesDeObra)
      .where(eq(partesDeObra.id, id))
      .limit(1);

    if (!parte) return noEncontrado('ese parte');

    const vacio =
      parte.maquinaria.length === 0 &&
      parte.personal.length === 0 &&
      parte.actividades.length === 0;

    if (vacio) {
      return errorDePeticion(
        'El parte está vacío. Registre al menos una máquina, una persona o una actividad antes ' +
          'de cerrarlo.',
        400,
      );
    }

    // Al cerrar sí se exigen las dos lecturas de cada máquina: es lo que
    // convierte la fila en trabajo hecho, y sin ellas no dice nada. Cada una se
    // valida con el tope de su propio medidor: 24 horas de motor u 800
    // kilómetros.
    for (const maquina of parte.maquinaria) {
      const error = validarAvance(maquina.claseMedidor, maquina.medidorInicial, maquina.medidorFinal);
      if (error) {
        return errorDePeticion(
          `${maquina.codigo}: ${mensajeDeAvance(maquina.claseMedidor, error, maquina.medidorInicial)}`,
          400,
        );
      }
    }

    for (const persona of parte.personal) {
      if (!persona.entrada || !persona.salida) {
        return errorDePeticion(`A ${persona.nombre} le falta la hora de entrada o de salida.`, 400);
      }
    }

    const [fila] = await db
      .update(partesDeObra)
      .set({ cerradoEn: new Date() })
      .where(and(eq(partesDeObra.id, id), isNull(partesDeObra.cerradoEn)))
      .returning({ id: partesDeObra.id, cerradoEn: partesDeObra.cerradoEn });

    if (!fila) return noEncontrado('ese parte');

    // Un UPDATE por máquina, y cada uno con su propio `greatest`: el driver
    // habla por HTTP y no da transacciones interactivas, así que se escribe de
    // forma que repetir la operación no haga daño. `greatest` es lo que
    // garantiza que el medidor no retroceda aunque el parte se cierre dos veces.
    for (const maquina of parte.maquinaria) {
      if (maquina.medidorFinal === null) continue;
      // Cada equipo avanza el medidor que le corresponde: la camioneta sus
      // kilómetros, la retroexcavadora sus horas de motor.
      const columna = maquina.claseMedidor === 'odometro' ? vehiculos.odometroKm : vehiculos.horometroH;
      await db
        .update(vehiculos)
        .set({
          [maquina.claseMedidor === 'odometro' ? 'odometroKm' : 'horometroH']: sql`greatest(coalesce(${columna}, 0), ${maquina.medidorFinal})`,
          medidorActualizadoEn: new Date(),
        })
        .where(eq(vehiculos.id, maquina.vehiculoId));
    }

    return ok(fila);
  });
}
