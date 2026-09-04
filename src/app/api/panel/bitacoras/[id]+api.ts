import { and, eq, isNull } from 'drizzle-orm';

import { baseServidor } from '@/db/servidor/cliente';
import { bitacoras, usuarios } from '@/db/servidor/esquema';
import { rechazoSiNoEsEditable } from '@/features/bitacoras/servidor/acceso';
import { construirActividad } from '@/features/bitacoras/tipos';
import { bitacoraEditada } from '@/features/panel/contratos';
import { requerirSesion } from '@/features/servidor/guardia';
import {
  cuerpoJson,
  errorDePeticion,
  noEncontrado,
  ok,
  responder,
} from '@/features/servidor/respuestas';

/**
 * Llenar una bitácora abierta. `PATCH /api/panel/bitacoras/:id`.
 *
 * Se guarda parcial y tantas veces como haga falta: el residente abre las
 * bitácoras del día por la mañana y las va completando a medida que le llegan
 * los datos. Cerrarla es un gesto aparte, y desde entonces ya no se edita — ver
 * `@/features/bitacoras/servidor/acceso`.
 */

export async function PATCH(peticion: Request, { id }: { id: string }) {
  return responder(async () => {
    const sesion = await requerirSesion(peticion);
    if (sesion instanceof Response) return sesion;

    const rechazo = await rechazoSiNoEsEditable(sesion, id);
    if (rechazo) return rechazo;

    const cambios = await cuerpoJson(peticion, bitacoraEditada);
    const db = baseServidor();

    if (cambios.operadorId) {
      // El operador tiene que existir y ser de verdad un operador: la bitácora
      // documenta quién movió la máquina, y un residente en esa casilla sería
      // un dato falso escrito sin querer.
      const [persona] = await db
        .select({ rol: usuarios.rol })
        .from(usuarios)
        .where(and(eq(usuarios.id, cambios.operadorId), isNull(usuarios.eliminadoEn)))
        .limit(1);

      if (!persona) return errorDePeticion('Esa persona no existe.', 400);
      if (persona.rol !== 'operador') {
        return errorDePeticion('Quien operó la máquina tiene que estar registrado como operador.', 400);
      }
    }

    const [fila] = await db
      .update(bitacoras)
      .set({
        ...(cambios.operadorId !== undefined ? { operadorId: cambios.operadorId } : {}),
        ...(cambios.horometroInicial !== undefined
          ? { horometroInicial: cambios.horometroInicial }
          : {}),
        ...(cambios.horometroFinal !== undefined
          ? { horometroFinal: cambios.horometroFinal }
          : {}),
        // Las actividades se reemplazan enteras. Construirlas aquí y no aceptar
        // las que mande el navegador es lo que garantiza que una bitácora
        // escrita desde el panel sea idéntica a una escrita desde el celular:
        // misma función, mismo resultado.
        ...(cambios.actividades !== undefined
          ? { actividades: cambios.actividades.map(construirActividad) }
          : {}),
      })
      .where(eq(bitacoras.id, id))
      .returning({ id: bitacoras.id, actividades: bitacoras.actividades });

    return fila ? ok(fila) : noEncontrado('esa bitácora');
  });
}
