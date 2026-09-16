import { eq } from 'drizzle-orm';
import { uuidv7 } from 'uuidv7';

import { baseServidor } from '@/db/servidor/cliente';
import { canteraViajes } from '@/db/servidor/esquema';
import { obraParaRegistrar } from '@/features/cantera/servidor/catalogos';
import {
  avisoDeBitacoraCerrada,
  condicionDePeriodo,
  eleccionesAjenas,
  leerViajes,
  opcionesDeLaObra,
} from '@/features/cantera/servidor/viajes';
import { viajeNuevo } from '@/features/panel/contratos';
import { filtroDeObra, veTodasLasObras } from '@/features/servidor/alcance';
import { requerirPermiso } from '@/features/servidor/guardia';
import { cuerpoJson, errorDePeticion, ok, responder } from '@/features/servidor/respuestas';
import { DESTINO_OBRA, validarViaje } from '@/shared/rules/cantera';
import { fechaDeJornada } from '@/shared/rules/jornada';

/**
 * Los viajes de cantera (spec 010).
 *
 * `GET /api/panel/cantera/viajes?desde=&hasta=&obraId=` — los de un periodo, del más
 * reciente al más antiguo (RF-20). Los filtros por volqueta, material y sitios se
 * aplican en la pantalla con `filtrarViajes` (RF-21), sobre lo que ya llegó.
 *
 * `POST` — registrar un viaje (RF-7 a RF-19, RF-34). No hay `PATCH` ni `DELETE`: un
 * viaje no se modifica ni se borra, se anula (RF-23).
 */

const FECHA = /^\d{4}-\d{2}-\d{2}$/;

/** Con más de un año, la consulta deja de ser un listado y pasa a ser un informe. */
const DIAS_MAXIMOS = 366;

export async function GET(peticion: Request) {
  return responder(async () => {
    const sesion = await requerirPermiso(peticion, 'cantera', 'listar');
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
    const obra =
      veTodasLasObras(sesion) && obraPedida
        ? eq(canteraViajes.obraId, obraPedida)
        : filtroDeObra(sesion, canteraViajes.obraId);

    return ok(await leerViajes(condicionDePeriodo(obra, desde, hasta)));
  });
}

export async function POST(peticion: Request) {
  return responder(async () => {
    const sesion = await requerirPermiso(peticion, 'cantera', 'escribir');
    if (sesion instanceof Response) return sesion;

    const datos = await cuerpoJson(peticion, viajeNuevo);

    const conCampos = (faltas: { campo: string; mensaje: string }[]) =>
      Response.json(
        {
          error: faltas[0].mensaje,
          campos: Object.fromEntries(faltas.map((f) => [f.campo, f.mensaje])),
        },
        { status: 400 },
      );

    // RF-19 y lo demás de la regla, con el día de la obra.
    const faltas = validarViaje(datos, fechaDeJornada());
    if (faltas.length > 0) return conCampos(faltas);

    // RF-32: el encargado de planta registra en su obra; la gerencia dice cuál.
    const obraId = await obraParaRegistrar(sesion, datos.obraId);
    if (obraId instanceof Response) return obraId;

    // Lo elegido tiene que estar entre lo que esa obra ofrece hoy: vigente y suyo.
    const ajenas = eleccionesAjenas(await opcionesDeLaObra(obraId), datos);
    if (ajenas.length > 0) return conCampos(ajenas);

    const id = uuidv7();
    const aLaObra = datos.destino === DESTINO_OBRA;
    await baseServidor()
      .insert(canteraViajes)
      .values({
        id,
        obraId,
        fecha: datos.fecha,
        hora: datos.hora,
        materialId: datos.materialId,
        vehiculoId: datos.vehiculoId,
        conductorId: datos.conductorId,
        origenId: datos.origenId,
        destinoId: aLaObra ? null : datos.destino,
        destinoObra: aLaObra,
        // RF-15: con otro destino no se guarda abscisa (la regla ya la rechazó).
        pr: aLaObra ? datos.pr : null,
        metros: aLaObra ? datos.metros : null,
        // RF-22: quien registra es quien tiene la sesión.
        registradoPor: sesion.id,
      });

    const [viaje] = await leerViajes(eq(canteraViajes.id, id));
    return ok(
      { viaje, aviso: await avisoDeBitacoraCerrada(obraId, datos.fecha, 'registro') },
      201,
    );
  });
}
