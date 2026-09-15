import { and, eq, isNull } from 'drizzle-orm';

import { baseServidorSerializable } from '@/db/servidor/cliente';
import { almacenMateriales } from '@/db/servidor/esquema';
import {
  filaDeMaterial,
  leerMaterialAlAlcance,
  movimientosDe,
  sinMovimientosEnSql,
} from '@/features/almacen-obra/servidor/materiales';
import { materialEditado } from '@/features/panel/contratos';
import { requerirPermiso } from '@/features/servidor/guardia';
import {
  conReintentoSiChoca,
  cuerpoJson,
  noEncontrado,
  ok,
  responder,
} from '@/features/servidor/respuestas';
import { rechazoDeCambioDeUnidad } from '@/shared/rules/almacen';
import { normalizar } from '@/shared/rules/texto';

/**
 * Corregir un material. `PATCH /api/panel/almacen/materiales/:id` (spec 009).
 *
 * El nombre se corrige sin tocar sus movimientos, que apuntan al material por su
 * id (RF-4). La unidad solo cambia si no tiene ningún movimiento (RF-5).
 */
export async function PATCH(peticion: Request, { id }: { id: string }) {
  return responder(async () => {
    const sesion = await requerirPermiso(peticion, 'almacen', 'escribir');
    if (sesion instanceof Response) return sesion;

    const cambios = await cuerpoJson(peticion, materialEditado);

    return conReintentoSiChoca(async () => {
      const material = await leerMaterialAlAlcance(sesion, id);
      if (!material) return noEncontrado('ese material');

      const cambiaUnidad = cambios.unidad !== undefined && cambios.unidad !== material.unidad;
      if (cambiaUnidad) {
        const movimientos = await movimientosDe([id]);
        const rechazo = rechazoDeCambioDeUnidad(
          movimientos.length,
          material.unidad,
          cambios.unidad ?? material.unidad,
        );
        if (rechazo) return Response.json({ error: rechazo, campos: { unidad: rechazo } }, { status: 409 });
      }

      // Si cambia la unidad, la guarda repite en la base que sigue sin movimientos:
      // un ingreso registrado entre la lectura de arriba y esta sentencia no se
      // quedaría con su cantidad en una unidad que ya no es la suya.
      const [actualizado] = await baseServidorSerializable().batch([
        baseServidorSerializable()
          .update(almacenMateriales)
          .set({
            ...(cambios.nombre !== undefined
              ? { nombre: cambios.nombre, nombreNormalizado: normalizar(cambios.nombre) }
              : {}),
            ...(cambiaUnidad ? { unidad: cambios.unidad } : {}),
            actualizadoEn: new Date(),
          })
          .where(
            and(
              eq(almacenMateriales.id, id),
              isNull(almacenMateriales.eliminadoEn),
              cambiaUnidad ? sinMovimientosEnSql(id) : undefined,
            ),
          )
          .returning({ id: almacenMateriales.id }),
      ]);

      if (actualizado.length === 0) {
        // Otro movimiento o una baja entraron en medio: se responde lo que diga
        // la regla con lo que hay ahora.
        const ahora = await leerMaterialAlAlcance(sesion, id);
        if (!ahora) return noEncontrado('ese material');
        const rechazo = rechazoDeCambioDeUnidad(
          (await movimientosDe([id])).length,
          ahora.unidad,
          cambios.unidad ?? ahora.unidad,
        );
        return Response.json(
          { error: rechazo ?? 'El material cambió mientras se corregía. Vuelva a intentarlo.' },
          { status: 409 },
        );
      }

      const corregido = await leerMaterialAlAlcance(sesion, id);
      return corregido ? ok(await filaDeMaterial(corregido)) : noEncontrado('ese material');
    });
  });
}
