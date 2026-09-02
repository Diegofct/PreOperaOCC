import { and, eq, isNull } from 'drizzle-orm';

import { baseServidor } from '@/db/servidor/cliente';
import { vehiculos } from '@/db/servidor/esquema';
import { vehiculoEditado } from '@/features/panel/contratos';
import { alcanzaLaObra } from '@/features/servidor/alcance';
import { requerirSesion, type PersonaEnSesion } from '@/features/servidor/guardia';
import { cuerpoJson, noEncontrado, ok, responder } from '@/features/servidor/respuestas';

/** Editar y dar de baja un vehículo. `PATCH` y `DELETE /api/panel/vehiculos/:id`. */

const COLUMNAS = {
  id: vehiculos.id,
  codigoInterno: vehiculos.codigoInterno,
  placa: vehiculos.placa,
  tipoVehiculoId: vehiculos.tipoVehiculoId,
  marca: vehiculos.marca,
  modelo: vehiculos.modelo,
  obraId: vehiculos.obraId,
  odometroKm: vehiculos.odometroKm,
  horometroH: vehiculos.horometroH,
  estado: vehiculos.estado,
};

/**
 * ¿Está este vehículo dentro del alcance de quien pregunta?
 *
 * Filtrar el listado no basta: quien conozca un id puede llamar a esta ruta
 * directamente sin haber pasado nunca por la pantalla.
 */
async function fueraDeAlcance(sesion: PersonaEnSesion, id: string): Promise<Response | null> {
  const [fila] = await baseServidor()
    .select({ obraId: vehiculos.obraId })
    .from(vehiculos)
    .where(and(eq(vehiculos.id, id), isNull(vehiculos.eliminadoEn)))
    .limit(1);

  // Un vehículo de otra obra se responde "no existe" y no "no puede": decir
  // "no puede" confirma que ese id es real, que es información que quien
  // pregunta no tenía.
  if (!fila || !alcanzaLaObra(sesion, fila.obraId)) return noEncontrado('ese vehículo');
  return null;
}

export async function PATCH(peticion: Request, { id }: { id: string }) {
  return responder(async () => {
    const sesion = await requerirSesion(peticion);
    if (sesion instanceof Response) return sesion;

    const rechazo = await fueraDeAlcance(sesion, id);
    if (rechazo) return rechazo;

    const cambios = await cuerpoJson(peticion, vehiculoEditado);

    const tocaMedidor = cambios.odometroKm !== undefined || cambios.horometroH !== undefined;

    const [fila] = await baseServidor()
      .update(vehiculos)
      .set(tocaMedidor ? { ...cambios, medidorActualizadoEn: new Date() } : cambios)
      .where(and(eq(vehiculos.id, id), isNull(vehiculos.eliminadoEn)))
      .returning(COLUMNAS);

    return fila ? ok(fila) : noEncontrado('ese vehículo');
  });
}

/**
 * Baja lógica de un vehículo.
 *
 * Aquí la lápida es especialmente importante: un vehículo dado de baja tiene
 * detrás preoperacionales firmados y bitácoras cerradas. Además, mientras la
 * baja no llegue al celular por el pull, el operador que lo tuviera asignado
 * seguiría viéndolo — y esa es la razón de que el pull nunca haga `DELETE` sino
 * baja lógica también en el teléfono.
 */
export async function DELETE(peticion: Request, { id }: { id: string }) {
  return responder(async () => {
    const sesion = await requerirSesion(peticion);
    if (sesion instanceof Response) return sesion;

    const rechazo = await fueraDeAlcance(sesion, id);
    if (rechazo) return rechazo;

    const [fila] = await baseServidor()
      .update(vehiculos)
      .set({ eliminadoEn: new Date(), estado: 'fuera_servicio' })
      .where(and(eq(vehiculos.id, id), isNull(vehiculos.eliminadoEn)))
      .returning(COLUMNAS);

    return fila ? ok(fila) : noEncontrado('ese vehículo');
  });
}
