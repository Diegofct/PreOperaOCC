import { and, eq, isNull } from 'drizzle-orm';

import { baseServidor } from '@/db/servidor/cliente';
import { llantas, vehiculos } from '@/db/servidor/esquema';
import { llantaEditada } from '@/features/panel/contratos';
import { alcanzaLaObra } from '@/features/servidor/alcance';
import { requerirPermiso, type PersonaEnSesion } from '@/features/servidor/guardia';
import {
  cuerpoJson,
  errorDePeticion,
  noEncontrado,
  ok,
  responder,
} from '@/features/servidor/respuestas';

/**
 * Editar y retirar una llanta. `PATCH` y `DELETE /api/panel/llantas/:id`.
 *
 * `DELETE` no borra: retira. Una llanta que se cambia es el histórico de lo que
 * rodó en esa posición, y es lo que permitirá saber más adelante cada cuánto hay
 * que cambiarla en ese equipo.
 */

const COLUMNAS = {
  id: llantas.id,
  vehiculoId: llantas.vehiculoId,
  posicion: llantas.posicion,
  marca: llantas.marca,
  rin: llantas.rin,
  ancho: llantas.ancho,
  alto: llantas.alto,
  porcentajeDesgaste: llantas.porcentajeDesgaste,
  retiradaEn: llantas.retiradaEn,
  motivoRetiro: llantas.motivoRetiro,
};

/** La llanta existe, no está retirada y su equipo cae dentro del alcance. */
async function llantaEditable(sesion: PersonaEnSesion, id: string): Promise<Response | null> {
  const [fila] = await baseServidor()
    .select({ obraId: vehiculos.obraId, retiradaEn: llantas.retiradaEn })
    .from(llantas)
    .innerJoin(vehiculos, eq(vehiculos.id, llantas.vehiculoId))
    .where(eq(llantas.id, id))
    .limit(1);

  if (!fila || !alcanzaLaObra(sesion, fila.obraId)) return noEncontrado('esa llanta');
  if (fila.retiradaEn) {
    return errorDePeticion('Esa llanta ya está retirada: su registro no se modifica.', 409);
  }
  return null;
}

export async function PATCH(peticion: Request, { id }: { id: string }) {
  return responder(async () => {
    const sesion = await requerirPermiso(peticion, 'vehiculos', 'escribir');
    if (sesion instanceof Response) return sesion;

    const rechazo = await llantaEditable(sesion, id);
    if (rechazo) return rechazo;

    const cambios = await cuerpoJson(peticion, llantaEditada);

    // La posición no se edita: mover una llanta de sitio es retirarla y montarla
    // en la otra posición, que es lo que de verdad pasa con la rueda.
    if (cambios.posicion !== undefined) {
      return errorDePeticion(
        'La posición no se cambia: retire la llanta y móntela en la posición nueva.',
        400,
      );
    }

    const [fila] = await baseServidor()
      .update(llantas)
      .set(cambios)
      .where(and(eq(llantas.id, id), isNull(llantas.retiradaEn)))
      .returning(COLUMNAS);

    return fila ? ok(fila) : noEncontrado('esa llanta');
  });
}

export async function DELETE(peticion: Request, { id }: { id: string }) {
  return responder(async () => {
    const sesion = await requerirPermiso(peticion, 'vehiculos', 'escribir');
    if (sesion instanceof Response) return sesion;

    const rechazo = await llantaEditable(sesion, id);
    if (rechazo) return rechazo;

    const cuerpo = (await peticion.json().catch(() => ({}))) as { motivo?: unknown };
    const motivo = typeof cuerpo.motivo === 'string' ? cuerpo.motivo.trim() : '';

    const [fila] = await baseServidor()
      .update(llantas)
      .set({ retiradaEn: new Date(), motivoRetiro: motivo.length > 0 ? motivo : null })
      .where(and(eq(llantas.id, id), isNull(llantas.retiradaEn)))
      .returning(COLUMNAS);

    return fila ? ok(fila) : noEncontrado('esa llanta');
  });
}
