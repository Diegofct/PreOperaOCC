import { and, asc, eq, isNull } from 'drizzle-orm';
import { uuidv7 } from 'uuidv7';

import { baseServidor } from '@/db/servidor/cliente';
import { obras, partesDeObra, usuarios } from '@/db/servidor/esquema';
import { fechaDeJornadaZod } from '@/features/panel/contratos';
import { filtroDeObra, veTodasLasObras } from '@/features/servidor/alcance';
import { requerirPermiso } from '@/features/servidor/guardia';
import { errorDePeticion, ok, responder } from '@/features/servidor/respuestas';
import { horarioEfectivo, type HorarioDeObra } from '@/shared/rules/horas';
import { fechaDeJornada } from '@/shared/rules/jornada';

/**
 * El parte diario de obra. `GET` y `POST /api/panel/partes`.
 *
 * El `GET` responde por día y no por rango: el parte se llena y se lee un día a
 * la vez, y la pantalla se organiza alrededor de una fecha. La gerencia ve el de
 * todas las obras de ese día; el residente, el de la suya.
 *
 * Cada parte sale con **el horario con que se calculan sus horas** (spec 016), ya
 * decidido aquí con `horarioEfectivo`: el que se guardó al cerrarlo, la jornada
 * anterior si se cerró antes de la spec, o el vigente de su obra si sigue
 * abierto. Lo decide el servidor y no la pantalla para que el panel y el Inicio
 * no puedan discrepar sobre las horas extra de un mismo parte.
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
  cerradoEn: partesDeObra.cerradoEn,
  anuladoEn: partesDeObra.anuladoEn,
  motivoAnulacion: partesDeObra.motivoAnulacion,
  horario: partesDeObra.horario,
  obraNombre: obras.nombre,
  horarioDeLaObra: obras.horario,
  usuarioNombre: usuarios.nombreCompleto,
};

/** Cambia el horario guardado (o su ausencia) y el de la obra por el efectivo. */
function conHorarioEfectivo<
  F extends {
    horario: HorarioDeObra | null;
    horarioDeLaObra: HorarioDeObra;
    cerradoEn: Date | null;
    anuladoEn: Date | null;
  },
>({ horarioDeLaObra, ...fila }: F) {
  return { ...fila, horario: horarioEfectivo(fila, horarioDeLaObra) };
}

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

    return ok({ fecha, partes: filas.map(conHorarioEfectivo) });
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
      ? ok(conHorarioEfectivo(fila), fila.id === id ? 201 : 200)
      : errorDePeticion('No se pudo abrir la bitácora.', 500);
  });
}
