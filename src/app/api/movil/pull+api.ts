import { eq, inArray, isNull, or } from 'drizzle-orm';

import { baseServidor } from '@/db/servidor/cliente';
import { aMilisegundos } from '@/db/servidor/conversion';
import {
  asignaciones,
  obras,
  plantillas,
  tiposVehiculo,
  usuarios,
  vehiculos,
} from '@/db/servidor/esquema';
import { requerirEquipo } from '@/features/servidor/guardia-movil';
import { ok, responder } from '@/features/servidor/respuestas';

/**
 * La instantánea del operador. `GET /api/movil/pull`.
 *
 * **Es una instantánea completa de su ámbito, no un delta.** Una obra son unas
 * treinta máquinas, cuarenta personas, cinco tipos y cinco plantillas: decenas
 * de kilobytes. A ese tamaño, mandar todo cada vez elimina de raíz la clase de
 * error más cara de un pull incremental —el hueco que deja una fila que se
 * confirmó en la base fuera de orden— sin costar nada apreciable en datos.
 *
 * El `cursor` funciona entonces como un *ETag*: "¿cambió algo desde la última
 * vez?". Si no cambió, se responde `sinCambios` y el teléfono no toca su base.
 * Cuando el volumen lo pida, este mismo endpoint puede pasar a incremental sin
 * que el cliente se entere.
 *
 * **El ámbito importa tanto como el contenido**, y cada inclusión de abajo
 * responde a una consulta que ya existe en el móvil:
 *
 *  · `obras`: la suya **más las de sus asignaciones**. Sin ese "más", el
 *    `INNER JOIN` de `obraDelUsuario` se queda sin fila.
 *  · `vehiculos`: los de su obra **más los que tenga asignados aunque sean de
 *    otra**. Sin ese "más", la llave foránea de `asignaciones` revienta el pull
 *    entero al insertar.
 *  · `usuarios`: él mismo siempre, más los activos de su obra — los necesita la
 *    bitácora para escribir el nombre del operador.
 *  · `tiposVehiculo` y `plantillas`: el catálogo completo, que es pequeño y lo
 *    necesita cualquier máquina que le puedan asignar mañana.
 *
 * **Van las filas dadas de baja también.** Una fila que simplemente deja de
 * venir es indistinguible para el teléfono de una que nunca le tocó; con su
 * lápida, el pull puede apagarla en vez de borrarla.
 *
 * Los tiempos salen en milisegundos epoch, que es como los guarda SQLite. La
 * conversión vive en `@/db/servidor/conversion` y no aquí.
 */
export async function GET(peticion: Request) {
  return responder(async () => {
    const equipo = await requerirEquipo(peticion);
    if (equipo instanceof Response) return equipo;

    const db = baseServidor();

    /**
     * El cursor es la marca de tiempo más alta de todo el ámbito.
     *
     * Se calcula con las mismas condiciones que las consultas de abajo. Si no
     * subió desde la última vez, nada de lo que le toca a este operador cambió.
     */
    const misAsignaciones = await db
      .select({
        id: asignaciones.id,
        vehiculoId: asignaciones.vehiculoId,
        usuarioId: asignaciones.usuarioId,
        obraId: asignaciones.obraId,
        desde: asignaciones.desde,
        hasta: asignaciones.hasta,
        origen: asignaciones.origen,
        eliminadoEn: asignaciones.eliminadoEn,
        actualizadoEn: asignaciones.actualizadoEn,
      })
      .from(asignaciones)
      .where(eq(asignaciones.usuarioId, equipo.id));

    const obrasDelAmbito = new Set<string>();
    if (equipo.obraId) obrasDelAmbito.add(equipo.obraId);
    for (const a of misAsignaciones) if (a.obraId) obrasDelAmbito.add(a.obraId);

    const vehiculosAsignados = misAsignaciones.map((a) => a.vehiculoId);
    const listaObras = [...obrasDelAmbito];

    const [filasObras, filasTipos, filasUsuarios, filasVehiculos, filasPlantillas] =
      await Promise.all([
        listaObras.length === 0
          ? []
          : db
              .select({
                id: obras.id,
                codigo: obras.codigo,
                nombre: obras.nombre,
                municipio: obras.municipio,
                activa: obras.activa,
                eliminadoEn: obras.eliminadoEn,
                actualizadoEn: obras.actualizadoEn,
              })
              .from(obras)
              .where(inArray(obras.id, listaObras)),

        db
          .select({
            id: tiposVehiculo.id,
            nombre: tiposVehiculo.nombre,
            claseMedidor: tiposVehiculo.claseMedidor,
            actualizadoEn: tiposVehiculo.actualizadoEn,
          })
          .from(tiposVehiculo)
          .where(isNull(tiposVehiculo.eliminadoEn)),

        db
          .select({
            id: usuarios.id,
            usuario: usuarios.usuario,
            nombreCompleto: usuarios.nombreCompleto,
            documento: usuarios.documento,
            rol: usuarios.rol,
            obraId: usuarios.obraId,
            activo: usuarios.activo,
            eliminadoEn: usuarios.eliminadoEn,
            actualizadoEn: usuarios.actualizadoEn,
          })
          .from(usuarios)
          .where(
            or(
              eq(usuarios.id, equipo.id),
              listaObras.length > 0 ? inArray(usuarios.obraId, listaObras) : undefined,
            ),
          ),

        db
          .select({
            id: vehiculos.id,
            codigoInterno: vehiculos.codigoInterno,
            placa: vehiculos.placa,
            tipoVehiculoId: vehiculos.tipoVehiculoId,
            marca: vehiculos.marca,
            modelo: vehiculos.modelo,
            obraId: vehiculos.obraId,
            odometroKm: vehiculos.odometroKm,
            horometroH: vehiculos.horometroH,
            medidorActualizadoEn: vehiculos.medidorActualizadoEn,
            estado: vehiculos.estado,
            eliminadoEn: vehiculos.eliminadoEn,
            actualizadoEn: vehiculos.actualizadoEn,
          })
          .from(vehiculos)
          .where(
            or(
              listaObras.length > 0 ? inArray(vehiculos.obraId, listaObras) : undefined,
              vehiculosAsignados.length > 0 ? inArray(vehiculos.id, vehiculosAsignados) : undefined,
            ),
          ),

        db
          .select({
            id: plantillas.id,
            tipoVehiculoId: plantillas.tipoVehiculoId,
            version: plantillas.version,
            hash: plantillas.hash,
            esquema: plantillas.esquema,
            publicadaEn: plantillas.publicadaEn,
            actualizadoEn: plantillas.actualizadoEn,
          })
          .from(plantillas)
          .where(isNull(plantillas.eliminadoEn)),
      ]);

    const marcas = [
      ...filasObras.map((f) => f.actualizadoEn),
      ...filasTipos.map((f) => f.actualizadoEn),
      ...filasUsuarios.map((f) => f.actualizadoEn),
      ...filasVehiculos.map((f) => f.actualizadoEn),
      ...misAsignaciones.map((f) => f.actualizadoEn),
      ...filasPlantillas.map((f) => f.actualizadoEn),
    ];
    const cursor = marcas.reduce((maximo, m) => (m > maximo ? m : maximo), new Date(0)).toISOString();

    const desde = new URL(peticion.url).searchParams.get('desde');
    if (desde && desde === cursor) {
      return ok({ sinCambios: true, cursor });
    }

    // La marca del servidor viaja para que el teléfono pueda medir su desfase de
    // reloj sin una petición aparte. El operador captura sin señal y con la hora
    // que tenga el equipo, que puede estar corrida.
    return ok({
      sinCambios: false,
      cursor,
      servidorAhoraMs: Date.now(),
      obras: filasObras.map((f) => ({
        ...f,
        eliminadoEn: aMilisegundos(f.eliminadoEn),
        actualizadoEn: undefined,
      })),
      tiposVehiculo: filasTipos.map(({ actualizadoEn, ...f }) => f),
      usuarios: filasUsuarios.map((f) => ({
        ...f,
        eliminadoEn: aMilisegundos(f.eliminadoEn),
        actualizadoEn: undefined,
      })),
      vehiculos: filasVehiculos.map((f) => ({
        ...f,
        medidorActualizadoEn: aMilisegundos(f.medidorActualizadoEn),
        eliminadoEn: aMilisegundos(f.eliminadoEn),
        actualizadoEn: undefined,
      })),
      asignaciones: misAsignaciones
        .filter((f) => f.eliminadoEn === null)
        .map((f) => ({
          id: f.id,
          vehiculoId: f.vehiculoId,
          usuarioId: f.usuarioId,
          obraId: f.obraId,
          desde: aMilisegundos(f.desde),
          hasta: aMilisegundos(f.hasta),
          origen: f.origen,
        })),
      plantillas: filasPlantillas.map((f) => ({
        id: f.id,
        tipoVehiculoId: f.tipoVehiculoId,
        version: f.version,
        hash: f.hash,
        esquema: f.esquema,
        publicadaEn: aMilisegundos(f.publicadaEn),
      })),
    });
  });
}
