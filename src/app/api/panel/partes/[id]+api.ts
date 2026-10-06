import { and, eq, isNull } from 'drizzle-orm';

import { baseServidor } from '@/db/servidor/cliente';
import { partesDeObra } from '@/db/servidor/esquema';
import { parteEditable } from '@/features/bitacoras/servidor/acceso';
import {
  actividadesDelParte,
  climaDelParte,
  conservarOrigen,
  laboratorioDelParte,
  maquinariaDelParte,
  personalDelParte,
} from '@/features/bitacoras/servidor/secciones';
import { parteEditado } from '@/features/panel/contratos';
import { requerirPermiso } from '@/features/servidor/guardia';
import {
  cuerpoJson,
  errorDePeticion,
  noEncontrado,
  ok,
  responder,
} from '@/features/servidor/respuestas';
import { mensajeDeDiaSinTrabajo, resolverDiaSinTrabajo } from '@/shared/rules/parte';

/**
 * Guardado del parte. `PATCH /api/panel/partes/:id`.
 *
 * Cada sección que venga se **reemplaza entera**: el parte se edita como un
 * formulario, no como una lista viva. Una sección que no venga no se toca, que
 * es lo que permite guardar sobre la marcha sin perder lo demás.
 *
 * Los nombres los pone el servidor. Lo que el navegador manda de una máquina es
 * el id del equipo y sus lecturas; el código interno se busca aquí. Si el nombre
 * llegara del cliente, bastaría con editar la petición para que el parte dijera
 * que trabajó otra persona.
 *
 * Cómo se valida y se construye cada sección vive en
 * `bitacoras/servidor/secciones.ts` desde la spec 021: la aprobación de un reporte
 * de WhatsApp escribe las mismas secciones y tiene que pasar las mismas
 * validaciones (RF-59).
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
};

export async function PATCH(peticion: Request, { id }: { id: string }) {
  return responder(async () => {
    const sesion = await requerirPermiso(peticion, 'bitacoras', 'escribir');
    if (sesion instanceof Response) return sesion;

    const estado = await parteEditable(sesion, id);
    if (estado instanceof Response) return estado;

    const cambios = await cuerpoJson(peticion, parteEditado);
    const db = baseServidor();
    const set: Record<string, unknown> = {};

    // Lo guardado se lee una sola vez y solo si hace falta: para el día sin
    // trabajo, para conservar las filas heredadas de actividades y control de
    // calidad (RF-63, RF-71) —que no se pueden reconstruir desde ningún catálogo— y
    // para que lo que vino de WhatsApp conserve su marca (021/RF-47).
    const leeLoGuardado =
      cambios.sinTrabajo !== undefined ||
      cambios.motivoSinTrabajo !== undefined ||
      cambios.maquinaria !== undefined ||
      cambios.personal !== undefined ||
      cambios.actividades !== undefined ||
      cambios.clima !== undefined ||
      cambios.laboratorio !== undefined;
    const guardado = leeLoGuardado
      ? (
          await db
            .select({
              sinTrabajo: partesDeObra.sinTrabajo,
              motivoSinTrabajo: partesDeObra.motivoSinTrabajo,
              maquinaria: partesDeObra.maquinaria,
              personal: partesDeObra.personal,
              actividades: partesDeObra.actividades,
              clima: partesDeObra.clima,
              laboratorio: partesDeObra.laboratorio,
            })
            .from(partesDeObra)
            .where(eq(partesDeObra.id, id))
            .limit(1)
        )[0]
      : undefined;
    if (leeLoGuardado && !guardado) return noEncontrado('esa bitácora');

    if (cambios.maquinaria) {
      const seccion = await maquinariaDelParte(cambios.maquinaria, estado.obraId);
      if ('error' in seccion) return errorDePeticion(seccion.error, 400);
      set.maquinaria = conservarOrigen(
        seccion.filas,
        guardado!.maquinaria,
        (nueva, vieja) => 'vehiculoId' in vieja && vieja.vehiculoId === nueva.vehiculoId,
      );
    }

    if (cambios.personal) {
      const seccion = await personalDelParte(cambios.personal);
      if ('error' in seccion) return errorDePeticion(seccion.error, 400);
      set.personal = conservarOrigen(
        seccion.filas,
        guardado!.personal,
        (nueva, vieja) => 'usuarioId' in vieja && vieja.usuarioId === nueva.usuarioId,
      );
    }

    // Día sin trabajo (spec 004, RF-53 a RF-55). Se valida **cómo queda el
    // parte**, no solo lo que llega: el guardado es por sección, y marcar el día
    // en una petición y registrar una máquina en otra también es contradecirse.
    const tocaElDia =
      cambios.sinTrabajo !== undefined ||
      cambios.motivoSinTrabajo !== undefined ||
      cambios.maquinaria !== undefined ||
      cambios.personal !== undefined ||
      cambios.actividades !== undefined;

    // Sin transacciones (Neon por HTTP), entre esta lectura y el UPDATE otro
    // computador puede guardar lo contrario. En las filas heredadas lo peor que pasa
    // es que un guardado vuelva a dejar una que el otro quitó, tomada de lo que se
    // leyó: no se pierde nada y no se inventa nada.

    if (cambios.actividades) {
      const seccion = actividadesDelParte(cambios.actividades, guardado!.actividades);
      if ('error' in seccion) return errorDePeticion(seccion.error, 400);
      set.actividades = conservarOrigen(
        seccion.filas,
        guardado!.actividades,
        (nueva, vieja) => 'id' in vieja && vieja.id === nueva.id,
      );
    }

    if (cambios.clima) {
      const seccion = climaDelParte(cambios.clima);
      if ('error' in seccion) return errorDePeticion(seccion.error, 400);
      // Las franjas nacen con id nuevo en cada guardado: «la misma» es la del mismo renglón.
      set.clima = conservarOrigen(seccion.filas, guardado!.clima, (_, __, indice) => indice >= 0);
    }

    if (cambios.laboratorio) {
      const seccion = laboratorioDelParte(cambios.laboratorio, guardado!.laboratorio);
      if ('error' in seccion) return errorDePeticion(seccion.error, 400);
      set.laboratorio = conservarOrigen(
        seccion.filas,
        guardado!.laboratorio,
        (nueva, vieja) => 'id' in vieja && vieja.id === nueva.id,
      );
    }

    if (cambios.notas !== undefined) set.notas = cambios.notas;

    if (tocaElDia) {
      const dia = resolverDiaSinTrabajo(guardado!, cambios);
      if (dia.error) return errorDePeticion(mensajeDeDiaSinTrabajo(dia.error), 400);

      // Sin transacciones (Neon por HTTP), entre esta lectura y el UPDATE otro
      // computador puede guardar lo contrario. Es raro y no se esconde: el
      // cierre vuelve a validar el parte entero con la misma regla, así que un
      // parte contradictorio no llega a cerrarse.
      if (cambios.sinTrabajo !== undefined || cambios.motivoSinTrabajo !== undefined) {
        set.sinTrabajo = dia.sinTrabajo;
        set.motivoSinTrabajo = dia.motivoSinTrabajo;
      }
    }

    if (Object.keys(set).length === 0) return errorDePeticion('No llegó nada que guardar.', 400);

    const [fila] = await db
      .update(partesDeObra)
      .set(set)
      .where(and(eq(partesDeObra.id, id), isNull(partesDeObra.cerradoEn)))
      .returning(COLUMNAS);

    return fila ? ok(fila) : noEncontrado('esa bitácora');
  });
}
