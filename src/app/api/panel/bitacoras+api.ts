import { aliasedTable, and, asc, eq, isNull } from 'drizzle-orm';
import { uuidv7 } from 'uuidv7';

import { baseServidor } from '@/db/servidor/cliente';
import { fechaDeJornada } from '@/db/servidor/conversion';
import { bitacoras, obras, tiposVehiculo, usuarios, vehiculos } from '@/db/servidor/esquema';
import { bitacoraNueva, fechaDeJornadaZod } from '@/features/panel/contratos';
import { alcanzaLaObra, filtroDeObra } from '@/features/servidor/alcance';
import { requerirPermiso } from '@/features/servidor/guardia';
import { cuerpoJson, errorDePeticion, ok, responder } from '@/features/servidor/respuestas';

/**
 * La jornada de un día. `GET /api/panel/bitacoras?fecha=AAAA-MM-DD`.
 *
 * Devuelve dos listas, y las dos importan por igual:
 *
 *  · las bitácoras que ya existen ese día, y
 *  · **las máquinas de la obra que todavía no tienen ninguna.**
 *
 * La segunda es el motivo de que esta pantalla exista. Una lista de lo ya hecho
 * no le dice a nadie qué falta, y lo que se pierde en obra no son las bitácoras
 * mal llenadas sino las que nunca se abrieron. Es la misma idea que ya gobierna
 * el inicio del jefe en el celular (`maquinasSinBitacora` en las reglas de
 * jornada): tener a la vista lo que falta es más confiable que un recordatorio,
 * porque en los teléfonos de obra la notificación puede no sonar nunca.
 *
 * El día por defecto es hoy **en hora de Colombia**, no en la del computador que
 * pregunta: la jornada que se documenta es la de la obra.
 */

const operador = aliasedTable(usuarios, 'operador');
const llevaLaBitacora = aliasedTable(usuarios, 'lleva');

export async function GET(peticion: Request) {
  return responder(async () => {
    const sesion = await requerirPermiso(peticion, 'bitacoras', 'listar');
    if (sesion instanceof Response) return sesion;

    const parametro = new URL(peticion.url).searchParams.get('fecha');
    const fecha = parametro ? fechaDeJornadaZod.parse(parametro) : fechaDeJornada();

    const db = baseServidor();

    const filas = await db
      .select({
        id: bitacoras.id,
        vehiculoId: bitacoras.vehiculoId,
        vehiculoCodigo: vehiculos.codigoInterno,
        tipoNombre: tiposVehiculo.nombre,
        tipoVehiculoId: vehiculos.tipoVehiculoId,
        obraId: bitacoras.obraId,
        obraNombre: obras.nombre,
        fecha: bitacoras.fecha,
        operadorId: bitacoras.operadorId,
        operadorNombre: operador.nombreCompleto,
        horometroInicial: bitacoras.horometroInicial,
        horometroFinal: bitacoras.horometroFinal,
        actividades: bitacoras.actividades,
        cerradaEn: bitacoras.cerradaEn,
        anuladoEn: bitacoras.anuladoEn,
        motivoAnulacion: bitacoras.motivoAnulacion,
        usuarioNombre: llevaLaBitacora.nombreCompleto,
      })
      .from(bitacoras)
      .innerJoin(vehiculos, eq(vehiculos.id, bitacoras.vehiculoId))
      .innerJoin(tiposVehiculo, eq(tiposVehiculo.id, vehiculos.tipoVehiculoId))
      .leftJoin(obras, eq(obras.id, bitacoras.obraId))
      .leftJoin(operador, eq(operador.id, bitacoras.operadorId))
      .leftJoin(llevaLaBitacora, eq(llevaLaBitacora.id, bitacoras.usuarioId))
      .where(and(eq(bitacoras.fecha, fecha), filtroDeObra(sesion, bitacoras.obraId)))
      .orderBy(asc(vehiculos.codigoInterno));

    const flota = await db
      .select({
        vehiculoId: vehiculos.id,
        codigoInterno: vehiculos.codigoInterno,
        tipoNombre: tiposVehiculo.nombre,
        tipoVehiculoId: vehiculos.tipoVehiculoId,
        obraNombre: obras.nombre,
        horometroH: vehiculos.horometroH,
      })
      .from(vehiculos)
      .innerJoin(tiposVehiculo, eq(tiposVehiculo.id, vehiculos.tipoVehiculoId))
      .leftJoin(obras, eq(obras.id, vehiculos.obraId))
      .where(and(isNull(vehiculos.eliminadoEn), filtroDeObra(sesion, vehiculos.obraId)))
      .orderBy(asc(vehiculos.codigoInterno));

    // Una bitácora anulada no cuenta como hecha: la máquina vuelve a la lista de
    // pendientes, que es justamente para lo que sirve anular.
    const conBitacora = new Set(
      filas.filter((fila) => fila.anuladoEn === null).map((fila) => fila.vehiculoId),
    );

    return ok({
      fecha,
      bitacoras: filas,
      pendientes: flota.filter((maquina) => !conBitacora.has(maquina.vehiculoId)),
    });
  });
}

/**
 * Abre la bitácora de una máquina para un día. `POST`.
 *
 * Nace vacía: sin operador, sin lecturas y sin actividades. Abrirla y llenarla
 * son dos gestos distintos a propósito — el residente abre las del día de una
 * vez por la mañana y las va completando, igual que con el talonario de papel.
 */
export async function POST(peticion: Request) {
  return responder(async () => {
    const sesion = await requerirPermiso(peticion, 'bitacoras', 'escribir');
    if (sesion instanceof Response) return sesion;

    const { vehiculoId, fecha } = await cuerpoJson(peticion, bitacoraNueva);
    const db = baseServidor();

    const [maquina] = await db
      .select({ obraId: vehiculos.obraId })
      .from(vehiculos)
      .where(and(eq(vehiculos.id, vehiculoId), isNull(vehiculos.eliminadoEn)))
      .limit(1);

    if (!maquina || !alcanzaLaObra(sesion, maquina.obraId)) {
      return errorDePeticion('Ese vehículo no existe o está dado de baja.', 404);
    }

    const [creada] = await db
      .insert(bitacoras)
      .values({
        id: uuidv7(),
        vehiculoId,
        // Quién la llena, que no es necesariamente quién operó la máquina: eso
        // es `operadorId` y se elige aparte. La distinción es el corazón de este
        // formato — documenta el trabajo del operador aunque la escriba el
        // residente.
        usuarioId: sesion.id,
        obraId: maquina.obraId,
        fecha,
        actividades: [],
      })
      // Una bitácora viva por máquina y día: si ya existe, se devuelve la que
      // hay en vez de fallar — abrir dos veces la misma es un doble clic, no un
      // error. El `where` reproduce el predicado del índice parcial: una
      // bitácora anulada no bloquea el día, se puede levantar otra.
      .onConflictDoNothing({
        target: [bitacoras.vehiculoId, bitacoras.fecha],
        where: isNull(bitacoras.anuladoEn),
      })
      .returning({ id: bitacoras.id });

    if (creada) return ok(creada, 201);

    const [existente] = await db
      .select({ id: bitacoras.id })
      .from(bitacoras)
      .where(
        and(
          eq(bitacoras.vehiculoId, vehiculoId),
          eq(bitacoras.fecha, fecha),
          isNull(bitacoras.anuladoEn),
        ),
      )
      .limit(1);

    return ok(existente);
  });
}
