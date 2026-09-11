import { and, eq, isNull, sql } from 'drizzle-orm';

import { baseServidor } from '@/db/servidor/cliente';
import { partesDeObra, vehiculos } from '@/db/servidor/esquema';
import { parteEditable } from '@/features/bitacoras/servidor/acceso';
import { requerirPermiso } from '@/features/servidor/guardia';
import { errorDePeticion, noEncontrado, ok, responder } from '@/features/servidor/respuestas';
import { bloqueosDelCierre } from '@/shared/rules/parte';

/**
 * Cerrar el parte del día. `POST /api/panel/partes/:id/cerrar`.
 *
 * Cerrar es lo que lo convierte en registro definitivo, y por eso es al cerrar
 * cuando se exige que esté completo: mientras se llena, a lo largo de la tarde,
 * hacen falta lecturas a medias y personas sin hora de salida. **Qué cuenta como
 * completo lo decide `shared/rules/parte`**, no esta ruta — porque el panel
 * necesita la misma respuesta para avisarlo antes de que nadie pulse Cerrar.
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

    // Qué impide cerrar lo decide `shared/rules/parte`, y lo decide una sola vez
    // para los dos que preguntan: esta ruta, que rechaza, y el índice del parte
    // en el panel, que lo avisa antes de que nadie pulse Cerrar. Cuando esto
    // estaba escrito aquí dentro, el índice habría tenido que volver a
    // escribirlo, y el día que discreparan el residente leería en pantalla que
    // puede cerrar mientras el servidor le dice que no.
    //
    // La regla devuelve todos los problemas; un rechazo HTTP lleva uno, y es el
    // primero — el mismo que devolvía esta ruta cuando comprobaba en línea,
    // porque el orden de la lista es justo el que tenían las comprobaciones.
    const bloqueos = bloqueosDelCierre(parte);
    if (bloqueos.length > 0) return errorDePeticion(bloqueos[0], 400);

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
