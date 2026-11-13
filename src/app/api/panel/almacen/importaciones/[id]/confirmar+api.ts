/**
 * Confirmar una importación al Almacén (spec 042, RF-18, RF-34 a RF-46, RF-81 a RF-91).
 *
 * `POST /api/panel/almacen/importaciones/:id/confirmar` con `{ version, documento, renglones,
 * confirmarRepetido }`: la propuesta como la dejó quien importa. Registra todos los ingresos y los
 * materiales nuevos, o nada.
 *  - 200 `{ ingresos, materialesNuevos }`.
 *  - 400 `{ faltas }` con lo que hay que corregir, por renglón (RF-34 a RF-37, RF-81 a RF-84).
 *  - 409 `{ repetido }` si el documento ya entró y no se aceptó el aviso (RF-43, RF-44).
 *  - 409 si ya se confirmó, con quién y cuándo (RF-89); si cambió, venció o se descartó; si un
 *    material dejó de estar vigente (RF-86) o un nuevo choca con uno vigente (RF-41).
 *  - 404 si no es de quien confirma.
 */
import { confirmarImportacion } from '@/features/almacen-obra/servidor/confirmar';
import { confirmacionDeImportacion } from '@/features/panel/almacen-importacion';
import { requerirPermiso } from '@/features/servidor/guardia';
import { cuerpoJson, ok, responder } from '@/features/servidor/respuestas';

export async function POST(peticion: Request, { id }: { id: string }) {
  return responder(async () => {
    const sesion = await requerirPermiso(peticion, 'almacen', 'importar');
    if (sesion instanceof Response) return sesion;

    const pedido = await cuerpoJson(peticion, confirmacionDeImportacion);
    const resultado = await confirmarImportacion(sesion, id, pedido);
    return resultado instanceof Response ? resultado : ok(resultado);
  });
}
