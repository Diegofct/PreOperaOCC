import { aliasedTable, and, desc, eq, gte, isNull, lt, or } from 'drizzle-orm';

import { baseServidor } from '@/db/servidor/cliente';
import { obras, preoperacionales, tiposVehiculo, usuarios, vehiculos } from '@/db/servidor/esquema';
import { fechaDeJornadaZod } from '@/features/panel/contratos';
import { filtroDeObra, veTodasLasObras } from '@/features/servidor/alcance';
import { requerirPermiso } from '@/features/servidor/guardia';
import { ok, responder } from '@/features/servidor/respuestas';
import {
  DESFASE_COLOMBIA_MS,
  fechaDeJornada,
  PERIODOS,
  restarDias,
  type Periodo,
} from '@/shared/rules/jornada';

/**
 * Los preoperacionales firmados. `GET /api/panel/preoperacionales`.
 *
 * Es la pantalla por la que existe todo lo demás: sin esto, la administración no
 * tiene forma de saber qué se inspeccionó ni qué salió mal, que es exactamente
 * lo que OCC quería resolver.
 *
 * Se filtra por **periodo** —hoy, la última semana o el último mes— o por un día
 * concreto, y si se quiere por máquina. **Los NO APTO van primero**: un listado
 * ordenado solo por hora entierra el único registro que exige que alguien haga
 * algo hoy.
 *
 * El día se acota en **hora de Colombia**, no en la del navegador ni en UTC: la
 * jornada del 3 de marzo es la del 3 de marzo en obra, y quien mira el panel
 * puede estar en otra parte.
 *
 * ── Por qué la ventana mira dos fechas y no una ──
 *
 * Un acta tiene dos momentos: cuando el operador la empezó en obra y cuando el
 * servidor la recibió. Pueden estar a días de distancia, porque el celular sube
 * cuando agarra señal — y eso no es un fallo, es el diseño.
 *
 * Acotar solo por la de inicio esconde lo que llegó tarde. Ocurrió de verdad: un
 * preoperacional firmado el 3 de septiembre llegó el 7, y el panel —que abría en
 * el día de hoy y miraba veinticuatro horas de la fecha de inicio— no lo enseñaba
 * por ninguna parte. La administración daba por incumplido un trabajo que sí se
 * hizo. Por eso la fila entra si **cualquiera** de sus dos fechas cae dentro
 * (spec 006 / RF-20).
 */
const operador = aliasedTable(usuarios, 'operador');

export async function GET(peticion: Request) {
  return responder(async () => {
    const sesion = await requerirPermiso(peticion, 'preoperacionales', 'listar');
    if (sesion instanceof Response) return sesion;

    const parametros = new URL(peticion.url).searchParams;
    const vehiculoId = parametros.get('vehiculoId');

    // Un día concreto manda sobre el periodo: se pide a propósito, navegando.
    const diaPedido = parametros.get('fecha')
      ? fechaDeJornadaZod.parse(parametros.get('fecha'))
      : null;

    // Un periodo que no esté en la lista se trata como la última semana en vez
    // de rechazarse, igual que hace el resumen del inicio: una dirección vieja o
    // mal copiada enseña algo razonable en lugar de un error.
    const pedido = parametros.get('periodo');
    const periodo: Periodo =
      pedido === 'hoy' || pedido === 'semana' || pedido === 'mes' ? pedido : 'semana';

    const hoy = fechaDeJornada();
    // Sin día concreto, la ventana arranca por defecto en la última semana, que
    // es lo que hace visible un acta rezagada sin tener que sospechar que existe.
    const primerDia = diaPedido ?? restarDias(hoy, PERIODOS[periodo]);
    const ultimoDia = diaPedido ?? hoy;

    // Medianoche en obra, expresada como instante: el día colombiano va de las
    // 05:00 UTC a las 05:00 UTC del siguiente.
    const medianoche = (dia: string) =>
      new Date(Date.parse(`${dia}T00:00:00Z`) + DESFASE_COLOMBIA_MS);
    const UN_DIA = 24 * 60 * 60 * 1000;

    const desde = medianoche(primerDia);
    const hasta = new Date(medianoche(ultimoDia).getTime() + UN_DIA);

    // El aviso de flota se queda anclado a **hoy** con cualquier periodo
    // (RF-23): es una alerta sobre máquinas que pueden estar rodando ahora mismo
    // sin inspeccionar, y diluirla en una semana le quita el filo.
    const desdeHoy = medianoche(hoy);
    const hastaHoy = new Date(desdeHoy.getTime() + UN_DIA);

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
        recibidoEn: preoperacionales.recibidoEn,
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
          or(
            and(
              gte(preoperacionales.iniciadoEn, desde),
              lt(preoperacionales.iniciadoEn, hasta),
            ),
            and(
              gte(preoperacionales.recibidoEn, desde),
              lt(preoperacionales.recibidoEn, hasta),
            ),
          ),
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

    /**
     * Qué máquinas ya tienen preoperacional **hoy**.
     *
     * Consulta aparte y no un filtro sobre `filas`: con un periodo de una
     * semana, `filas` trae actas de otros días, y una máquina inspeccionada el
     * lunes desaparecería del aviso del viernes sin haberse revisado hoy. El
     * aviso dejaría de avisar justo de lo que existe para avisar.
     */
    const deHoy = await baseServidor()
      .select({ vehiculoId: preoperacionales.vehiculoId })
      .from(preoperacionales)
      .where(
        and(
          gte(preoperacionales.iniciadoEn, desdeHoy),
          lt(preoperacionales.iniciadoEn, hastaHoy),
          isNull(preoperacionales.anuladoEn),
          filtroDeObra(sesion, preoperacionales.obraId),
        ),
      );

    const conFormato = new Set(deHoy.map((f) => f.vehiculoId));

    return ok({
      fecha: diaPedido ?? hoy,
      periodo: diaPedido ? null : periodo,
      desde: primerDia,
      hasta: ultimoDia,
      // NO APTO primero: es el único que obliga a alguien a hacer algo hoy.
      preoperacionales: [...filas].sort(porUrgencia),
      pendientes: flota.filter((m) => !conFormato.has(m.vehiculoId)),
      /**
       * Por qué está vacío, cuando lo está.
       *
       * Lo decide el servidor y no la pantalla: es el servidor quien sabe que no
       * devolvió nada porque quien pregunta no alcanza ninguna obra. Que lo
       * dedujera la pantalla mirando si la persona tiene obra sería escribir dos
       * veces la misma regla, y ya se sabe cómo acaba eso.
       *
       * El alcance **no se relaja**: sigue sin ver nada. Solo deja de ser un
       * vacío mudo (spec 006 / RF-24).
       */
      motivoVacio:
        // «Sin obra» es de cualquiera que no sea gerencia, no solo del residente:
        // desde la spec 008 hay más roles que dependen de su obra.
        filas.length > 0 ? null : !veTodasLasObras(sesion) && !sesion.obraId
          ? 'sin_obra'
          : 'sin_datos',
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
