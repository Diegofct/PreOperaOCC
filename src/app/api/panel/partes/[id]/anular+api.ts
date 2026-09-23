import { and, eq, isNull } from 'drizzle-orm';

import { baseServidor } from '@/db/servidor/cliente';
import { partesDeObra } from '@/db/servidor/esquema';
import { horarioAlAnular } from '@/features/bitacoras/servidor/horario';
import { anulacion } from '@/features/panel/contratos';
import { alcanzaLaObra } from '@/features/servidor/alcance';
import { requerirPermiso } from '@/features/servidor/guardia';
import {
  cuerpoJson,
  errorDePeticion,
  noEncontrado,
  ok,
  responder,
} from '@/features/servidor/respuestas';

/**
 * Anular un parte. `POST /api/panel/partes/:id/anular`.
 *
 * Un parte cerrado no se edita: se anula con motivo escrito y se abre otro. Es
 * el mismo criterio que el preoperacional firmado, con una diferencia decidida
 * en la spec 001: **este lo puede anular el residente**, porque lo llena él
 * mismo cada día. Corregir el preoperacional es revisar el trabajo de otro.
 *
 * La fila anulada se queda donde está. El índice único es parcial sobre la
 * anulación justamente para esto: sin ese predicado, anular dejaría ese día
 * bloqueado para siempre y la obra se quedaría sin poder registrar lo que hizo.
 */
export async function POST(peticion: Request, { id }: { id: string }) {
  return responder(async () => {
    const sesion = await requerirPermiso(peticion, 'bitacoras', 'anular');
    if (sesion instanceof Response) return sesion;

    const [fila] = await baseServidor()
      .select({ obraId: partesDeObra.obraId, anuladoEn: partesDeObra.anuladoEn })
      .from(partesDeObra)
      .where(eq(partesDeObra.id, id))
      .limit(1);

    if (!fila || !alcanzaLaObra(sesion, fila.obraId)) return noEncontrado('esa bitácora');
    if (fila.anuladoEn) return errorDePeticion('Esa bitácora ya estaba anulada.', 409);

    const { motivo } = await cuerpoJson(peticion, anulacion);

    // Un parte anulado sigue a la vista, y sus horas no pueden moverse porque se
    // corrija después el horario de la obra (spec 016, RF-24): si se anula abierto,
    // se le congela el horario en la misma sentencia.
    const [anulado] = await baseServidor()
      .update(partesDeObra)
      .set({
        anuladoEn: new Date(),
        anuladoPor: sesion.id,
        motivoAnulacion: motivo,
        horario: horarioAlAnular(),
      })
      .where(and(eq(partesDeObra.id, id), isNull(partesDeObra.anuladoEn)))
      .returning({ id: partesDeObra.id, anuladoEn: partesDeObra.anuladoEn });

    return anulado ? ok(anulado) : noEncontrado('esa bitácora');
  });
}
