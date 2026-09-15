import { and, eq, isNull, sql } from 'drizzle-orm';

import { baseServidorSerializable } from '@/db/servidor/cliente';
import { almacenMovimientos } from '@/db/servidor/esquema';
import {
  filaDeMaterial,
  leerMaterialAlAlcance,
  stockEnSql,
} from '@/features/almacen-obra/servidor/materiales';
import { leerMovimiento } from '@/features/almacen-obra/servidor/movimientos';
import { anulacion } from '@/features/panel/contratos';
import { alcanzaLaObra } from '@/features/servidor/alcance';
import { requerirPermiso } from '@/features/servidor/guardia';
import {
  conReintentoSiChoca,
  cuerpoJson,
  errorDePeticion,
  noEncontrado,
  ok,
  responder,
} from '@/features/servidor/respuestas';
import { aDecimal, rechazoDeAnulacion } from '@/shared/rules/almacen';

/**
 * Anular un movimiento del almacén. `POST /api/panel/almacen/movimientos/:id/anular`
 * (spec 009, RF-24 a RF-27).
 *
 * El movimiento no se borra: queda marcado con quién, cuándo y por qué, y deja de
 * contar en el stock. Anular un ingreso cuyo material ya salió dejaría el stock
 * en negativo, y se rechaza (RF-26).
 */
export async function POST(peticion: Request, { id }: { id: string }) {
  return responder(async () => {
    const sesion = await requerirPermiso(peticion, 'almacen', 'anular');
    if (sesion instanceof Response) return sesion;

    const { motivo } = await cuerpoJson(peticion, anulacion);

    return conReintentoSiChoca(async () => {
      const movimiento = await leerMovimiento(id);
      if (!movimiento || !alcanzaLaObra(sesion, movimiento.obraId)) {
        return noEncontrado('ese movimiento');
      }

      const material = await leerMaterialAlAlcance(sesion, movimiento.materialId);
      if (!material) return noEncontrado('ese movimiento');

      const { stock } = await filaDeMaterial(material);
      const rechazo = rechazoDeAnulacion(movimiento, stock, material.unidad);
      if (rechazo) return errorDePeticion(rechazo, 409);

      // Para un ingreso, la guarda repite en la base que el stock no quedará en
      // negativo; `anulado_en is null` impide anular dos veces a la vez.
      const [anulado] = await baseServidorSerializable().batch([
        baseServidorSerializable()
          .update(almacenMovimientos)
          .set({ anuladoEn: new Date(), anuladoPor: sesion.id, motivoAnulacion: motivo })
          .where(
            and(
              eq(almacenMovimientos.id, id),
              isNull(almacenMovimientos.anuladoEn),
              movimiento.tipo === 'ingreso'
                ? sql`${stockEnSql(movimiento.materialId)} - ${aDecimal(movimiento.cantidad)}::numeric >= 0`
                : undefined,
            ),
          )
          .returning({ id: almacenMovimientos.id }),
      ]);

      if (anulado.length === 0) {
        const ahora = await leerMovimiento(id);
        const materialAhora = await leerMaterialAlAlcance(sesion, movimiento.materialId);
        if (!ahora || !materialAhora) return noEncontrado('ese movimiento');
        const { stock: stockAhora } = await filaDeMaterial(materialAhora);
        return errorDePeticion(
          rechazoDeAnulacion(ahora, stockAhora, materialAhora.unidad) ??
            'El movimiento cambió mientras se anulaba. Vuelva a intentarlo.',
          409,
        );
      }

      return ok({ id });
    });
  });
}
