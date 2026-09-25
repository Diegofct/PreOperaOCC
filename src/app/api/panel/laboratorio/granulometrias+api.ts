import { and, between, count, eq, isNull, or } from 'drizzle-orm';
import { uuidv7 } from 'uuidv7';

import { baseServidor } from '@/db/servidor/cliente';
import { ensayosGranulometria } from '@/db/servidor/esquema';
import {
  calculoParaGuardar,
  leerDetalle,
  leerEnsayos,
  obraParaRegistrarEnsayo,
  rechazoConCampos,
} from '@/features/laboratorio/servidor/ensayos';
import { ensayoNuevo } from '@/features/panel/contratos';
import { filtroDeModulo, filtroDeObra, veTodasLasObras } from '@/features/servidor/alcance';
import { requerirPermiso } from '@/features/servidor/guardia';
import { cuerpoJson, errorDePeticion, ok, responder } from '@/features/servidor/respuestas';
import { franjaPorId } from '@/shared/catalogos/franjas-granulometricas';
import { claveDeInforme, validarEnsayo } from '@/shared/rules/granulometria';
import { fechaDeJornada } from '@/shared/rules/jornada';

/**
 * Los ensayos de granulometría (spec 018).
 *
 * `GET /api/panel/laboratorio/granulometrias?desde=&hasta=&obraId=` — los de un
 * periodo de ejecución, más los borradores que aún no tienen fecha, del más reciente
 * al más antiguo (RF-101, RF-102). Los filtros por material, franja, estado y
 * veredicto se aplican en la pantalla sobre lo que ya llegó (RF-103), como en
 * Control Cantera. Trae además cuántos esperan aprobación (RF-105), sin periodo: un
 * ensayo enviado hace dos meses sigue esperando.
 *
 * `POST` — registrar un ensayo en borrador (RF-23 a RF-32, RF-70). No hay `DELETE`:
 * un borrador se descarta y un aprobado se anula.
 */

const FECHA = /^\d{4}-\d{2}-\d{2}$/;

/** Con más de un año, la consulta deja de ser un listado y pasa a ser un informe. */
const DIAS_MAXIMOS = 366;

const e = ensayosGranulometria;

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

    // La gerencia puede pedir una obra; los demás ven la suya (RF-6 a RF-8). A la
    // gerencia se le esconden las obras con el módulo apagado; a los demás ya los
    // frena la guardia si la suya lo tiene apagado.
    const obraPedida = parametros.get('obraId');
    const alcance = and(
      veTodasLasObras(sesion) && obraPedida
        ? eq(e.obraId, obraPedida)
        : filtroDeObra(sesion, e.obraId),
      filtroDeModulo('laboratorio', e.obraId),
      // Un descartado no se lista (RF-91).
      isNull(e.descartadoEn),
    );

    const [ensayos, [{ pendientes }]] = await Promise.all([
      leerEnsayos(
        and(alcance, or(between(e.fechaEjecucion, desde, hasta), isNull(e.fechaEjecucion))),
      ),
      baseServidor()
        .select({ pendientes: count() })
        .from(e)
        .where(and(alcance, eq(e.estado, 'enviado'), isNull(e.anuladoEn))),
    ]);

    return ok({ ensayos, pendientes });
  });
}

export async function POST(peticion: Request) {
  return responder(async () => {
    const sesion = await requerirPermiso(peticion, 'laboratorio', 'escribir');
    if (sesion instanceof Response) return sesion;

    const datos = await cuerpoJson(peticion, ensayoNuevo);

    // Un borrador guarda lo que haya, pero lo que haya tiene que ser posible (RF-31
    // a RF-39), con el día de la obra y no el del reloj de quien pide.
    const errores = validarEnsayo(datos, fechaDeJornada(), 'borrador');
    if (errores.length > 0) return rechazoConCampos(errores);

    const obraId = await obraParaRegistrarEnsayo(sesion, datos.obraId);
    if (obraId instanceof Response) return obraId;

    // La franja se copia entera al escogerla (RF-21), y con ella se calcula (RF-42).
    const franja = datos.franjaId ? (franjaPorId(datos.franjaId) ?? null) : null;
    const { resultado, veredicto } = calculoParaGuardar(datos, franja);

    const id = uuidv7();
    await baseServidor()
      .insert(e)
      .values({
        id,
        obraId,
        material: datos.material,
        fuente: datos.fuente,
        localizacion: datos.localizacion,
        numeroInforme: datos.numeroInforme,
        // Con esta compara el índice único (RF-40); un 409 lo traduce `responder`.
        claveInforme: datos.numeroInforme ? claveDeInforme(datos.numeroInforme) : null,
        fechaRecepcion: datos.fechaRecepcion,
        fechaEjecucion: datos.fechaEjecucion,
        franjaId: franja?.id ?? null,
        franja,
        masas: datos.masas,
        retenidos: datos.retenidos,
        observaciones: datos.observaciones,
        resultado,
        veredicto,
        // RF-70: todo ensayo nace en borrador. Quien registra es quien tiene la sesión.
        registradoPor: sesion.id,
      });

    return ok(await leerDetalle(id), 201);
  });
}
