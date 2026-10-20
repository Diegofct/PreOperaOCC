import { mantenimientoNuevo } from '@/features/panel/contratos';
import { registrarMantenimiento } from '@/features/reportes/servidor/mantenimientos';
import { requerirPermiso } from '@/features/servidor/guardia';
import { cuerpoJson, ok, responder } from '@/features/servidor/respuestas';

/**
 * Registrar un mantenimiento hecho (spec 030, RF-32, RF-33).
 * `POST /api/panel/reportes/mantenimientos` → 201 `{ id, avisoLectura }`.
 *
 * Lo hacen la gerencia y el residente, este solo en las máquinas de su obra. No hay
 * `PATCH` ni `DELETE`: un registro equivocado se anula con motivo (RF-35).
 */
export async function POST(peticion: Request) {
  return responder(async () => {
    const sesion = await requerirPermiso(peticion, 'reportes', 'escribir');
    if (sesion instanceof Response) return sesion;
    const datos = await cuerpoJson(peticion, mantenimientoNuevo);
    const hecho = await registrarMantenimiento(sesion, datos);
    return hecho instanceof Response ? hecho : ok(hecho, 201);
  });
}
