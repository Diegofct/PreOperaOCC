import { asc, isNull } from 'drizzle-orm';

import { baseServidor } from '@/db/servidor/cliente';
import { tiposVehiculo } from '@/db/servidor/esquema';
import { requerirSesion } from '@/features/servidor/guardia';
import { ok, responder } from '@/features/servidor/respuestas';

/**
 * El catálogo de tipos de equipo. Solo lectura: `GET /api/panel/tipos-vehiculo`.
 *
 * No hay alta ni baja a propósito. Los cinco tipos son la llave que une un
 * vehículo con su formato de preoperacional, y añadir uno sin una plantilla
 * detrás dejaría máquinas que ningún operador puede inspeccionar. Se cambian en
 * `@/shared/catalogos/tipos-vehiculo` junto con su plantilla, y entran con
 * `npm run db:sembrar:servidor`.
 */
export async function GET(peticion: Request) {
  return responder(async () => {
    // Guardia genérica a propósito: el catálogo de tipos de equipo es global
    // y lo necesitan hasta las pantallas que no tocan vehículos.
    const sesion = await requerirSesion(peticion);
    if (sesion instanceof Response) return sesion;

    const filas = await baseServidor()
      .select({
        id: tiposVehiculo.id,
        nombre: tiposVehiculo.nombre,
        claseMedidor: tiposVehiculo.claseMedidor,
      })
      .from(tiposVehiculo)
      .where(isNull(tiposVehiculo.eliminadoEn))
      .orderBy(asc(tiposVehiculo.nombre));

    return ok(filas);
  });
}
