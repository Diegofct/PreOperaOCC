import { and, asc, count, eq, gte, isNull } from 'drizzle-orm';
import { uuidv7 } from 'uuidv7';

import { baseServidor } from '@/db/servidor/cliente';
import { llantas, obras, tiposVehiculo, vehiculos } from '@/db/servidor/esquema';
import { vehiculoNuevo } from '@/features/panel/contratos';
import { filtroDeObra, veTodasLasObras } from '@/features/servidor/alcance';
import { DESGASTE_PARA_CAMBIO } from '@/shared/catalogos/llantas';
import { requerirPermiso } from '@/features/servidor/guardia';
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
    const sesion = await requerirPermiso(peticion, 'vehiculos', 'listar');
    if (sesion instanceof Response) return sesion;

    const filas = await baseServidor()
      .select({
        id: vehiculos.id,
        codigoInterno: vehiculos.codigoInterno,
        placa: vehiculos.placa,
        tipoVehiculoId: vehiculos.tipoVehiculoId,
        tipoNombre: tiposVehiculo.nombre,
        // Lo necesita el parte diario para pedir el medidor que corresponde.
        claseMedidor: tiposVehiculo.claseMedidor,
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

    // Cuántas llantas puestas le quedan al 30% de vida o menos. Va en una
    // consulta aparte y no en un join con la de arriba: un join contra una tabla
    // hija multiplica las filas del padre, y arreglarlo con `group by` obligaría
    // a agrupar por las once columnas del vehículo. Son dos consultas cortas.
    const gastadas = await baseServidor()
      .select({ vehiculoId: llantas.vehiculoId, cuantas: count() })
      .from(llantas)
      .where(
        and(
          isNull(llantas.retiradaEn),
          gte(llantas.porcentajeDesgaste, DESGASTE_PARA_CAMBIO),
        ),
      )
      .groupBy(llantas.vehiculoId);

    const porVehiculo = new Map(gastadas.map((f) => [f.vehiculoId, Number(f.cuantas)]));

    return ok(filas.map((f) => ({ ...f, llantasPorCambiar: porVehiculo.get(f.id) ?? 0 })));
  });
}

export async function POST(peticion: Request) {
  return responder(async () => {
    const sesion = await requerirPermiso(peticion, 'vehiculos', 'escribir');
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
