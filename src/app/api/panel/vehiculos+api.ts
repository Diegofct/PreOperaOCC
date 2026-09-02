import { and, asc, eq, isNull } from 'drizzle-orm';
import { uuidv7 } from 'uuidv7';

import { baseServidor } from '@/db/servidor/cliente';
import { obras, tiposVehiculo, vehiculos } from '@/db/servidor/esquema';
import { vehiculoNuevo } from '@/features/panel/contratos';
import { filtroDeObra, veTodasLasObras } from '@/features/servidor/alcance';
import { requerirSesion } from '@/features/servidor/guardia';
import { cuerpoJson, errorDePeticion, ok, responder } from '@/features/servidor/respuestas';

/**
 * La flota. `GET` y `POST /api/panel/vehiculos`.
 *
 * Las lecturas iniciales de odómetro y horómetro se capturan aquí porque el
 * preoperacional del día valida contra la última conocida: sin un punto de
 * partida, la primera lectura que digite el operador se acepta sea cual sea, y
 * un dígito de más pasa desapercibido hasta que alguien revise el histórico.
 */

export async function GET(peticion: Request) {
  return responder(async () => {
    const sesion = await requerirSesion(peticion);
    if (sesion instanceof Response) return sesion;

    const filas = await baseServidor()
      .select({
        id: vehiculos.id,
        codigoInterno: vehiculos.codigoInterno,
        placa: vehiculos.placa,
        tipoVehiculoId: vehiculos.tipoVehiculoId,
        tipoNombre: tiposVehiculo.nombre,
        marca: vehiculos.marca,
        modelo: vehiculos.modelo,
        obraId: vehiculos.obraId,
        obraNombre: obras.nombre,
        odometroKm: vehiculos.odometroKm,
        horometroH: vehiculos.horometroH,
        estado: vehiculos.estado,
      })
      .from(vehiculos)
      .innerJoin(tiposVehiculo, eq(tiposVehiculo.id, vehiculos.tipoVehiculoId))
      .leftJoin(obras, eq(obras.id, vehiculos.obraId))
      .where(and(isNull(vehiculos.eliminadoEn), filtroDeObra(sesion, vehiculos.obraId)))
      .orderBy(asc(vehiculos.codigoInterno));

    return ok(filas);
  });
}

export async function POST(peticion: Request) {
  return responder(async () => {
    const sesion = await requerirSesion(peticion);
    if (sesion instanceof Response) return sesion;

    const datos = await cuerpoJson(peticion, vehiculoNuevo);

    // Un residente da de alta máquinas para su obra. Sin esto podría colocar
    // una en otra obra y desaparecería de su propia pantalla en cuanto la
    // guardara, que es de los errores más desconcertantes de diagnosticar.
    if (!veTodasLasObras(sesion)) {
      if (datos.obraId && datos.obraId !== sesion.obraId) {
        return errorDePeticion('Solo puede registrar vehículos en su propia obra.', 403);
      }
      datos.obraId ??= sesion.obraId;
    }

    // Si se registra un medidor de partida, queda fechado: `medidorActualizadoEn`
    // es lo que el móvil compara para decidir si una lectura es plausible.
    const traeMedidor = datos.odometroKm !== null || datos.horometroH !== null;

    const [creado] = await baseServidor()
      .insert(vehiculos)
      .values({
        id: uuidv7(),
        ...datos,
        medidorActualizadoEn: traeMedidor ? new Date() : null,
      })
      .returning({ id: vehiculos.id });

    return ok({ ...datos, id: creado.id }, 201);
  });
}
