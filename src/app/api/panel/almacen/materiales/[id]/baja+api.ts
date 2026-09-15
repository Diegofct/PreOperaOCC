import { and, eq, isNull, sql } from 'drizzle-orm';

import { baseServidorSerializable } from '@/db/servidor/cliente';
import { almacenMateriales } from '@/db/servidor/esquema';
import {
  filaDeMaterial,
  leerMaterialAlAlcance,
  stockEnSql,
} from '@/features/almacen-obra/servidor/materiales';
import { requerirPermiso } from '@/features/servidor/guardia';
import {
  conReintentoSiChoca,
  errorDePeticion,
  noEncontrado,
  ok,
  responder,
} from '@/features/servidor/respuestas';
import { rechazoDeBaja } from '@/shared/rules/almacen';

/**
 * Dar de baja un material. `POST /api/panel/almacen/materiales/:id/baja` (spec 009).
 *
 * Baja lógica: se escribe `eliminado_en` y el material y su historial siguen en
 * la base (RF-6). Solo sin stock (RF-7): con stock, desaparecería de la tabla un
 * material que sigue en el almacén.
 *
 * `POST` a una ruta de acción y no `DELETE`, como las anulaciones: el verbo
 * `DELETE` promete borrar, y aquí no se borra nada.
 */
export async function POST(peticion: Request, { id }: { id: string }) {
  return responder(async () => {
    const sesion = await requerirPermiso(peticion, 'almacen', 'escribir');
    if (sesion instanceof Response) return sesion;

    return conReintentoSiChoca(async () => {
      const material = await leerMaterialAlAlcance(sesion, id);
      if (!material) return noEncontrado('ese material');

      const { stock } = await filaDeMaterial(material);
      const rechazo = rechazoDeBaja(stock, material.unidad);
      if (rechazo) return errorDePeticion(rechazo, 409);

      // La guarda repite en la base que el stock sigue en cero: un ingreso que
      // entre justo ahora no deja dado de baja un material con existencias.
      const [dado] = await baseServidorSerializable().batch([
        baseServidorSerializable()
          .update(almacenMateriales)
          .set({ eliminadoEn: new Date(), actualizadoEn: new Date() })
          .where(
            and(
              eq(almacenMateriales.id, id),
              isNull(almacenMateriales.eliminadoEn),
              sql`${stockEnSql(id)} = 0`,
            ),
          )
          .returning({ id: almacenMateriales.id }),
      ]);

      if (dado.length === 0) {
        const ahora = await leerMaterialAlAlcance(sesion, id);
        if (!ahora) return noEncontrado('ese material');
        const { stock: stockAhora } = await filaDeMaterial(ahora);
        return errorDePeticion(
          rechazoDeBaja(stockAhora, ahora.unidad) ??
            'El material cambió mientras se daba de baja. Vuelva a intentarlo.',
          409,
        );
      }

      return ok({ id });
    });
  });
}
