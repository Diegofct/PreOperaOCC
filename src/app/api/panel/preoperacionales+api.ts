import { aliasedTable, and, desc, eq, gte, isNull, lt } from 'drizzle-orm';

import { baseServidor } from '@/db/servidor/cliente';
import { obras, preoperacionales, tiposVehiculo, usuarios, vehiculos } from '@/db/servidor/esquema';
import { fechaDeJornadaZod } from '@/features/panel/contratos';
import { filtroDeObra } from '@/features/servidor/alcance';
import { requerirPermiso } from '@/features/servidor/guardia';
import { ok, responder } from '@/features/servidor/respuestas';
import { DESFASE_COLOMBIA_MS, fechaDeJornada } from '@/shared/rules/jornada';

/**
 * Los preoperacionales firmados. `GET /api/panel/preoperacionales`.
 *
 * Es la pantalla por la que existe todo lo demás: sin esto, la administración no
 * tiene forma de saber qué se inspeccionó ni qué salió mal, que es exactamente
 * lo que OCC quería resolver.
 *
 * Se filtra por día y, si se quiere, por máquina. **Los NO APTO van primero**:
 * un listado ordenado solo por hora entierra el único registro que exige que
 * alguien haga algo hoy.
 *
 * El día se acota en **hora de Colombia**, no en la del navegador ni en UTC: la
 * jornada del 3 de marzo es la del 3 de marzo en obra, y quien mira el panel
 * puede estar en otra parte.
 */
const operador = aliasedTable(usuarios, 'operador');

export async function GET(peticion: Request) {
  return responder(async () => {
    const sesion = await requerirPermiso(peticion, 'preoperacionales', 'listar');
    if (sesion instanceof Response) return sesion;

    const parametros = new URL(peticion.url).searchParams;
    const fecha = parametros.get('fecha')
      ? fechaDeJornadaZod.parse(parametros.get('fecha'))
      : fechaDeJornada();
    const vehiculoId = parametros.get('vehiculoId');

    // Medianoche en obra, expresada como instante: el día colombiano va de las
    // 05:00 UTC a las 05:00 UTC del siguiente.
    const desde = new Date(Date.parse(`${fecha}T00:00:00Z`) + DESFASE_COLOMBIA_MS);
    const hasta = new Date(desde.getTime() + 24 * 60 * 60 * 1000);

    const filas = await baseServidor()
      .select({
        id: preoperacionales.id,
        vehiculoId: preoperacionales.vehiculoId,
        vehiculoCodigo: vehiculos.codigoInterno,
        tipoNombre: tiposVehiculo.nombre,
        obraNombre: obras.nombre,
        operadorNombre: operador.nombreCompleto,
        iniciadoEn: preoperacionales.iniciadoEn,
        enviadoEn: preoperacionales.enviadoEn,
        odometroKm: preoperacionales.odometroKm,
        horometroH: preoperacionales.horometroH,
        resultado: preoperacionales.resultado,
        cantidadInmovilizantes: preoperacionales.cantidadInmovilizantes,
        anuladoEn: preoperacionales.anuladoEn,
      })
      .from(preoperacionales)
      .innerJoin(vehiculos, eq(vehiculos.id, preoperacionales.vehiculoId))
      .innerJoin(tiposVehiculo, eq(tiposVehiculo.id, vehiculos.tipoVehiculoId))
      .innerJoin(operador, eq(operador.id, preoperacionales.usuarioId))
      .leftJoin(obras, eq(obras.id, preoperacionales.obraId))
      .where(
        and(
          gte(preoperacionales.iniciadoEn, desde),
          lt(preoperacionales.iniciadoEn, hasta),
          vehiculoId ? eq(preoperacionales.vehiculoId, vehiculoId) : undefined,
          filtroDeObra(sesion, preoperacionales.obraId),
        ),
      )
      .orderBy(desc(preoperacionales.iniciadoEn));

    /**
     * Las máquinas de la obra que **hoy no tienen preoperacional**.
     *
     * La misma idea que gobierna la pantalla de bitácoras: lo que se pierde en
     * obra no son los formatos mal llenados, son los que nadie levantó. Una
     * lista de lo hecho no los hace visibles nunca.
     */
    const flota = await baseServidor()
      .select({
        vehiculoId: vehiculos.id,
        codigoInterno: vehiculos.codigoInterno,
        tipoNombre: tiposVehiculo.nombre,
      })
      .from(vehiculos)
      .innerJoin(tiposVehiculo, eq(tiposVehiculo.id, vehiculos.tipoVehiculoId))
      .where(and(isNull(vehiculos.eliminadoEn), filtroDeObra(sesion, vehiculos.obraId)));

    const conFormato = new Set(
      filas.filter((f) => f.anuladoEn === null).map((f) => f.vehiculoId),
    );

    return ok({
      fecha,
      // NO APTO primero: es el único que obliga a alguien a hacer algo hoy.
      preoperacionales: [...filas].sort(porUrgencia),
      pendientes: flota.filter((m) => !conFormato.has(m.vehiculoId)),
    });
  });
}

function porUrgencia(
  a: { resultado: string | null; anuladoEn: Date | null; iniciadoEn: Date },
  b: { resultado: string | null; anuladoEn: Date | null; iniciadoEn: Date },
): number {
  const peso = (f: typeof a) => (f.anuladoEn ? 2 : f.resultado === 'no_apto' ? 0 : 1);
  const diferencia = peso(a) - peso(b);
  return diferencia !== 0 ? diferencia : b.iniciadoEn.getTime() - a.iniciadoEn.getTime();
}
