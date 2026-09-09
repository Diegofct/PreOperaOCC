import { and, asc, eq, isNull } from 'drizzle-orm';
import { uuidv7 } from 'uuidv7';

import { baseServidor } from '@/db/servidor/cliente';
import { llantas, vehiculos } from '@/db/servidor/esquema';
import { llantaNueva } from '@/features/panel/contratos';
import { alcanzaLaObra } from '@/features/servidor/alcance';
import { requerirPermiso, type PersonaEnSesion } from '@/features/servidor/guardia';
import {
  cuerpoJson,
  errorDePeticion,
  noEncontrado,
  ok,
  responder,
} from '@/features/servidor/respuestas';
import { posicionesDe } from '@/shared/catalogos/llantas';

/** Las llantas de un equipo. `GET` y `POST /api/panel/vehiculos/:id/llantas`. */

const COLUMNAS = {
  id: llantas.id,
  vehiculoId: llantas.vehiculoId,
  posicion: llantas.posicion,
  marca: llantas.marca,
  rin: llantas.rin,
  ancho: llantas.ancho,
  alto: llantas.alto,
  porcentajeDesgaste: llantas.porcentajeDesgaste,
  retiradaEn: llantas.retiradaEn,
  motivoRetiro: llantas.motivoRetiro,
};

/** El vehículo, si quien pregunta lo alcanza. Devuelve también su tipo. */
async function vehiculoAlcanzable(sesion: PersonaEnSesion, id: string) {
  const [fila] = await baseServidor()
    .select({ obraId: vehiculos.obraId, tipoVehiculoId: vehiculos.tipoVehiculoId })
    .from(vehiculos)
    .where(and(eq(vehiculos.id, id), isNull(vehiculos.eliminadoEn)))
    .limit(1);

  if (!fila || !alcanzaLaObra(sesion, fila.obraId)) return null;
  return fila;
}

export async function GET(peticion: Request, { id }: { id: string }) {
  return responder(async () => {
    const sesion = await requerirPermiso(peticion, 'vehiculos', 'listar');
    if (sesion instanceof Response) return sesion;

    const vehiculo = await vehiculoAlcanzable(sesion, id);
    if (!vehiculo) return noEncontrado('ese vehículo');

    // Las puestas primero y las retiradas después, cada grupo por posición: la
    // ficha se lee de arriba abajo como se recorre el equipo.
    const filas = await baseServidor()
      .select(COLUMNAS)
      .from(llantas)
      .where(eq(llantas.vehiculoId, id))
      .orderBy(asc(llantas.retiradaEn), asc(llantas.posicion));

    return ok(filas);
  });
}

export async function POST(peticion: Request, { id }: { id: string }) {
  return responder(async () => {
    const sesion = await requerirPermiso(peticion, 'vehiculos', 'escribir');
    if (sesion instanceof Response) return sesion;

    const vehiculo = await vehiculoAlcanzable(sesion, id);
    if (!vehiculo) return noEncontrado('ese vehículo');

    const datos = await cuerpoJson(peticion, llantaNueva);

    // La posición tiene que ser una de las de **este** tipo de equipo. Sin esto,
    // una volqueta podría acabar con una llanta en «tándem izquierda trasera»,
    // que es una posición de motoniveladora y no existe en ese camión.
    const posiciones = posicionesDe(vehiculo.tipoVehiculoId);
    if (!posiciones.some((p) => p.id === datos.posicion)) {
      return errorDePeticion('Esa posición no existe en este tipo de equipo.', 400);
    }

    // El índice único parcial ya lo impide, pero un choque de índice llega como
    // un error de base sin nada legible dentro. Comprobarlo aquí permite decir
    // qué pasó y qué hacer.
    const [ocupada] = await baseServidor()
      .select({ id: llantas.id })
      .from(llantas)
      .where(
        and(
          eq(llantas.vehiculoId, id),
          eq(llantas.posicion, datos.posicion),
          isNull(llantas.retiradaEn),
        ),
      )
      .limit(1);

    if (ocupada) {
      return errorDePeticion(
        'Ya hay una llanta puesta en esa posición. Retire la anterior antes de montar otra.',
        409,
      );
    }

    const [creada] = await baseServidor()
      .insert(llantas)
      .values({ id: uuidv7(), vehiculoId: id, ...datos })
      .returning(COLUMNAS);

    return ok(creada, 201);
  });
}
