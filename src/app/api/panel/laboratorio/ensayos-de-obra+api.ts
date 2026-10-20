import { and, between, eq, isNull } from 'drizzle-orm';

import { baseServidor } from '@/db/servidor/cliente';
import { obras, partesDeObra } from '@/db/servidor/esquema';
import { filtroDeModulo, filtroDeObra, veTodasLasObras } from '@/features/servidor/alcance';
import { requerirPermiso } from '@/features/servidor/guardia';
import { errorDePeticion, ok, responder } from '@/features/servidor/respuestas';
import { ensayosDeLosPartes, type FilaDeCalidadLeida } from '@/shared/rules/ensayos-de-obra';

/**
 * Los ensayos de «Control Calidad de Obra» de las bitácoras (spec 029, RF-24 a RF-32).
 *
 * `GET /api/panel/laboratorio/ensayos-de-obra?desde=&hasta=&obraId=` — los de las
 * bitácoras no anuladas del periodo, abiertas o cerradas, de la fecha más reciente a
 * la más antigua. Solo lectura: se corrigen en la bitácora (RF-30), y como se leen de
 * ella cada vez, la corrección se ve al volver (RF-31).
 *
 * El alcance es el de las granulometrías (RF-32): la gerencia puede pedir una obra,
 * los demás ven la suya, y una obra con Laboratorio apagado no sale. Los filtros por
 * ensayo y por cumple se aplican en la pantalla sobre lo que ya llegó (RF-27).
 */

const FECHA = /^\d{4}-\d{2}-\d{2}$/;

/** Con más de un año, la consulta deja de ser un listado y pasa a ser un informe. */
const DIAS_MAXIMOS = 366;

export async function GET(peticion: Request) {
  return responder(async () => {
    const sesion = await requerirPermiso(peticion, 'laboratorio', 'listar');
    if (sesion instanceof Response) return sesion;

    const parametros = new URL(peticion.url).searchParams;
    const desde = parametros.get('desde') ?? '';
    const hasta = parametros.get('hasta') ?? '';
    if (!FECHA.test(desde) || !FECHA.test(hasta)) {
      return errorDePeticion('El periodo va con dos fechas en formato AAAA-MM-DD.');
    }
    if (desde > hasta) return errorDePeticion('La fecha inicial es posterior a la final.');
    const dias = (Date.parse(hasta) - Date.parse(desde)) / 86_400_000;
    if (dias > DIAS_MAXIMOS) return errorDePeticion('El periodo no puede pasar de un año.');

    const obraPedida = parametros.get('obraId');
    const filas = await baseServidor()
      .select({
        id: partesDeObra.id,
        obraId: partesDeObra.obraId,
        obraCodigo: obras.codigo,
        fecha: partesDeObra.fecha,
        cerradoEn: partesDeObra.cerradoEn,
        laboratorio: partesDeObra.laboratorio,
      })
      .from(partesDeObra)
      .innerJoin(obras, eq(obras.id, partesDeObra.obraId))
      .where(
        and(
          veTodasLasObras(sesion) && obraPedida
            ? eq(partesDeObra.obraId, obraPedida)
            : filtroDeObra(sesion, partesDeObra.obraId),
          filtroDeModulo('laboratorio', partesDeObra.obraId),
          isNull(partesDeObra.anuladoEn),
          between(partesDeObra.fecha, desde, hasta),
        ),
      );

    const codigoDe = new Map(filas.map((f) => [f.obraId, f.obraCodigo]));
    const ensayos = ensayosDeLosPartes(
      filas.map((f) => ({
        id: f.id,
        obraId: f.obraId,
        fecha: f.fecha,
        cerrada: f.cerradoEn !== null,
        laboratorio: f.laboratorio as unknown as readonly FilaDeCalidadLeida[],
      })),
    ).map((e) => ({ ...e, obraCodigo: codigoDe.get(e.obraId) ?? '' }));

    return ok({ ensayos });
  });
}
