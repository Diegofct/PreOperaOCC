import { and, asc, eq, isNull } from 'drizzle-orm';
import { uuidv7 } from 'uuidv7';

import { baseServidor } from '@/db/servidor/cliente';
import { obras, partesDeObra, usuarios } from '@/db/servidor/esquema';
import { lecturasAnteriores } from '@/features/bitacoras/servidor/lecturas';
import { fechaDeJornadaZod } from '@/features/panel/contratos';
import { filtroDeObra, veTodasLasObras } from '@/features/servidor/alcance';
import { requerirPermiso } from '@/features/servidor/guardia';
import { errorDePeticion, ok, responder } from '@/features/servidor/respuestas';
import { fechaDeJornada } from '@/shared/rules/jornada';

/**
 * El parte diario de obra. `GET` y `POST /api/panel/partes`.
 *
 * El `GET` responde por día y no por rango: el parte se llena y se lee un día a
 * la vez, y la pantalla se organiza alrededor de una fecha. La gerencia ve el de
 * todas las obras de ese día; el residente, el de la suya.
 *
 * Las horas de cada persona son las reportadas (spec 039, RF-9): el parte ya no sale
 * con el horario de la obra, que solo servía para calcularlas.
 *
 * Cada parte **abierto** trae además la lectura con la que empieza el día cada
 * máquina (spec 029, RF-1 a RF-3, RF-9): la pantalla la pone al añadir la máquina y
 * avisa si se escribe otra. Viene con el día, y no en una ruta aparte, para que
 * añadir una máquina no espere a otra petición. Uno cerrado o anulado ya no recibe
 * máquinas: va vacío.
 */

const COLUMNAS = {
  id: partesDeObra.id,
  obraId: partesDeObra.obraId,
  fecha: partesDeObra.fecha,
  maquinaria: partesDeObra.maquinaria,
  personal: partesDeObra.personal,
  actividades: partesDeObra.actividades,
  clima: partesDeObra.clima,
  laboratorio: partesDeObra.laboratorio,
  notas: partesDeObra.notas,
  sinTrabajo: partesDeObra.sinTrabajo,
  motivoSinTrabajo: partesDeObra.motivoSinTrabajo,
  sinActividades: partesDeObra.sinActividades,
  motivoSinActividades: partesDeObra.motivoSinActividades,
  sinEnsayos: partesDeObra.sinEnsayos,
  motivoSinEnsayos: partesDeObra.motivoSinEnsayos,
  seccionesSinRegistro: partesDeObra.seccionesSinRegistro,
  cerradoEn: partesDeObra.cerradoEn,
  anuladoEn: partesDeObra.anuladoEn,
  motivoAnulacion: partesDeObra.motivoAnulacion,
  obraNombre: obras.nombre,
  usuarioNombre: usuarios.nombreCompleto,
};

export async function GET(peticion: Request) {
  return responder(async () => {
    const sesion = await requerirPermiso(peticion, 'bitacoras', 'listar');
    if (sesion instanceof Response) return sesion;

    const pedida = new URL(peticion.url).searchParams.get('fecha');
    // La fecha por defecto la pone el servidor y no el navegador: el
    // computador de quien mira puede estar en otro huso, y el parte es de la
    // jornada de la obra.
    const fecha = pedida ? fechaDeJornadaZod.parse(pedida) : fechaDeJornada();

    const filas = await baseServidor()
      .select(COLUMNAS)
      .from(partesDeObra)
      .innerJoin(obras, eq(obras.id, partesDeObra.obraId))
      .leftJoin(usuarios, eq(usuarios.id, partesDeObra.usuarioId))
      .where(and(eq(partesDeObra.fecha, fecha), filtroDeObra(sesion, partesDeObra.obraId)))
      .orderBy(asc(obras.nombre));

    const partes = await Promise.all(
      filas.map(async (fila) => ({
        ...fila,
        lecturasAnteriores:
          fila.cerradoEn || fila.anuladoEn ? {} : await lecturasAnteriores(fila.obraId, fila.fecha),
      })),
    );

    return ok({ fecha, partes });
  });
}

export async function POST(peticion: Request) {
  return responder(async () => {
    const sesion = await requerirPermiso(peticion, 'bitacoras', 'escribir');
    if (sesion instanceof Response) return sesion;

    const cuerpo = (await peticion.json().catch(() => ({}))) as {
      fecha?: unknown;
      obraId?: unknown;
    };

    const fecha =
      typeof cuerpo.fecha === 'string' ? fechaDeJornadaZod.parse(cuerpo.fecha) : fechaDeJornada();

    // Un parte de mañana no puede existir: nadie registra lo que todavía no ha
    // pasado, y un dedazo en la fecha bloquearía ese día cuando llegue.
    if (fecha > fechaDeJornada()) {
      return errorDePeticion('No se puede abrir la bitácora de un día que no ha llegado.', 400);
    }

    // El residente abre el de su obra y solo el de su obra. La gerencia tiene
    // que decir cuál, porque no está adscrita a ninguna.
    const obraId = veTodasLasObras(sesion)
      ? typeof cuerpo.obraId === 'string'
        ? cuerpo.obraId
        : null
      : sesion.obraId;

    if (!obraId) {
      return errorDePeticion('Falta decir de qué obra es la bitácora.', 400);
    }

    const id = uuidv7();

    // Reproduce el predicado del índice único parcial: si ya hay un parte vivo
    // de esa obra y ese día, no se crea otro. Es la misma forma que usa la
    // bitácora por máquina, y por la misma razón —dos personas abriendo el
    // parte a la vez desde dos computadores—.
    await baseServidor()
      .insert(partesDeObra)
      .values({ id, obraId, usuarioId: sesion.id, fecha })
      .onConflictDoNothing({
        target: [partesDeObra.obraId, partesDeObra.fecha],
        where: isNull(partesDeObra.anuladoEn),
      });

    const [fila] = await baseServidor()
      .select(COLUMNAS)
      .from(partesDeObra)
      .innerJoin(obras, eq(obras.id, partesDeObra.obraId))
      .leftJoin(usuarios, eq(usuarios.id, partesDeObra.usuarioId))
      .where(
        and(
          eq(partesDeObra.obraId, obraId),
          eq(partesDeObra.fecha, fecha),
          isNull(partesDeObra.anuladoEn),
        ),
      )
      .limit(1);

    return fila
      ? ok(fila, fila.id === id ? 201 : 200)
      : errorDePeticion('No se pudo abrir la bitácora.', 500);
  });
}
