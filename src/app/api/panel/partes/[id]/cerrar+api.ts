import { and, eq, isNull, sql } from 'drizzle-orm';

import { baseServidor } from '@/db/servidor/cliente';
import { media, partesDeObra, vehiculos } from '@/db/servidor/esquema';
import { parteEditable } from '@/features/bitacoras/servidor/acceso';
import { horarioDeLaObraDelParte } from '@/features/bitacoras/servidor/horario';
import { viajesParaFijarAlCerrar } from '@/features/cantera/servidor/parte';
import {
  granulometriasParaFijarAlCerrar,
  granulometriasVigentes,
} from '@/features/laboratorio/servidor/parte';
import { requerirPermiso } from '@/features/servidor/guardia';
import { errorDePeticion, noEncontrado, ok, responder } from '@/features/servidor/respuestas';
import { bloqueosDelCierre, mensajeDelRechazoDeCierre } from '@/shared/rules/parte';

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
        obraId: partesDeObra.obraId,
        fecha: partesDeObra.fecha,
        maquinaria: partesDeObra.maquinaria,
        personal: partesDeObra.personal,
        actividades: partesDeObra.actividades,
        clima: partesDeObra.clima,
        laboratorio: partesDeObra.laboratorio,
        notas: partesDeObra.notas,
        // Con la marca de día sin trabajo, la regla exige menos (004/RF-54).
        sinTrabajo: partesDeObra.sinTrabajo,
        motivoSinTrabajo: partesDeObra.motivoSinTrabajo,
      })
      .from(partesDeObra)
      .where(eq(partesDeObra.id, id))
      .limit(1);

    if (!parte) return noEncontrado('esa bitácora');

    // Las fotos viven en otra tabla, así que se leen aquí y la regla las recibe
    // ya contadas: sigue siendo pura. Sin `item` son del día; con él, de la
    // actividad cuyo id lleva.
    const fotosDelParte = await db
      .select({ itemKey: media.itemKey })
      .from(media)
      .where(and(eq(media.duenoTipo, 'bitacora'), eq(media.duenoId, id)));

    const fotos = {
      delDia: fotosDelParte.filter((f) => f.itemKey === null).length,
      itemsConFoto: fotosDelParte.flatMap((f) => (f.itemKey ? [f.itemKey] : [])),
    };

    // Qué impide cerrar lo decide `shared/rules/parte`, y lo decide una sola vez
    // para los dos que preguntan: esta ruta, que rechaza, y el índice del parte
    // en el panel, que lo avisa antes de que nadie pulse Cerrar. Cuando esto
    // estaba escrito aquí dentro, el índice habría tenido que volver a
    // escribirlo, y el día que discreparan el residente leería en pantalla que
    // puede cerrar mientras el servidor le dice que no.
    //
    // El rechazo los nombra **todos** en un solo mensaje, uno por renglón
    // (spec 004, RF-50). Antes mandaba el primero, y el residente descubría lo
    // que le faltaba de uno en uno a base de pulsar Cerrar.
    // Los ensayos de granulometría vigentes del día llenan Control Calidad de Obra
    // igual que una fila a mano (spec 018, RF-110). Viven en su módulo, así que se
    // cuentan aquí y la regla los recibe contados, como las fotos.
    const ensayosDelModulo = (await granulometriasVigentes(parte.obraId, parte.fecha)).length;

    const bloqueos = bloqueosDelCierre({ ...parte, ensayosDelModulo }, fotos);
    if (bloqueos.length > 0) return errorDePeticion(mensajeDelRechazoDeCierre(bloqueos), 400);

    // Los viajes de cantera de ese día quedan fijados **en la misma sentencia** que
    // cierra (spec 010, RF-29 y RF-37): lista vacía si no hubo. Leerlos antes y
    // escribirlos aquí dejaría fuera un viaje registrado entre medias. No bloquean
    // el cierre (RF-36): `bloqueosDelCierre` no los mira.
    //
    // El horario de la obra se fija igual y por lo mismo (spec 016, RF-23): desde
    // aquí las horas del parte se leen con él aunque la gerencia lo corrija después.
    //
    // Los ensayos de granulometría, igual (spec 018, RF-111): desde aquí el parte
    // dice lo que había al cerrarlo, aunque después se aprueben o se anulen (RF-112).
    //
    // Y si lo único que llenaba Control Calidad de Obra eran esos ensayos, el cierre
    // lo vuelve a exigir en la misma sentencia: un ensayo descartado entre el conteo
    // de arriba y este `UPDATE` dejaría, si no, un parte cerrado con la sección vacía.
    const dependeDeLosEnsayos =
      !parte.sinTrabajo && parte.laboratorio.length === 0 && ensayosDelModulo > 0;

    const [fila] = await db
      .update(partesDeObra)
      .set({
        cerradoEn: new Date(),
        cantera: viajesParaFijarAlCerrar(),
        granulometrias: granulometriasParaFijarAlCerrar(),
        horario: horarioDeLaObraDelParte(),
      })
      .where(
        and(
          eq(partesDeObra.id, id),
          isNull(partesDeObra.cerradoEn),
          dependeDeLosEnsayos
            ? sql`jsonb_array_length(${granulometriasParaFijarAlCerrar()}) > 0`
            : undefined,
        ),
      )
      .returning({ id: partesDeObra.id, cerradoEn: partesDeObra.cerradoEn });

    if (!fila) {
      return dependeDeLosEnsayos
        ? errorDePeticion(
            'Los ensayos de laboratorio de este día cambiaron mientras cerraba. Vuelva a intentarlo.',
            409,
          )
        : noEncontrado('esa bitácora');
    }

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
