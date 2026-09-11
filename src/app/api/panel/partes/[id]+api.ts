import { and, eq, inArray, isNull } from 'drizzle-orm';

import { baseServidor } from '@/db/servidor/cliente';
import { partesDeObra, tiposVehiculo, usuarios, vehiculos } from '@/db/servidor/esquema';
import {
  construirActividadDelParte,
  construirFranja,
  construirMaquina,
  construirMaterial,
  construirPersona,
} from '@/features/bitacoras/parte';
import { parteEditable } from '@/features/bitacoras/servidor/acceso';
import { parteEditado } from '@/features/panel/contratos';
import { requerirPermiso } from '@/features/servidor/guardia';
import {
  cuerpoJson,
  errorDePeticion,
  noEncontrado,
  ok,
  responder,
} from '@/features/servidor/respuestas';
import { validarFranjas, mensajeDeFranja, validarHorario, mensajeDeHorario } from '@/shared/rules/horas';
import { medidorDeClase, mensajeDeAvance, validarAvance } from '@/shared/rules/jornada';

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

    if (cambios.maquinaria) {
      const ids = cambios.maquinaria.map((m) => m.vehiculoId);
      if (new Set(ids).size !== ids.length) {
        return errorDePeticion('Una máquina no puede estar dos veces en el mismo parte.', 400);
      }

      // El medidor sale del tipo del equipo, no de lo que diga el navegador:
      // una camioneta se controla por kilómetros y una retroexcavadora por
      // horas de motor, y pedirle a la camioneta horas de motor es pedirle un
      // dato que su tablero no da.
      const equipos = ids.length
        ? await db
            .select({
              id: vehiculos.id,
              codigo: vehiculos.codigoInterno,
              obraId: vehiculos.obraId,
              clase: tiposVehiculo.claseMedidor,
            })
            .from(vehiculos)
            .innerJoin(tiposVehiculo, eq(tiposVehiculo.id, vehiculos.tipoVehiculoId))
            .where(and(inArray(vehiculos.id, ids), isNull(vehiculos.eliminadoEn)))
        : [];

      const porId = new Map(equipos.map((v) => [v.id, v]));
      for (const vehiculoId of ids) {
        const equipo = porId.get(vehiculoId);
        // Solo las máquinas de la obra del parte: una volqueta de otra obra en
        // este parte son horas apuntadas donde no trabajó.
        if (!equipo || (equipo.obraId !== null && equipo.obraId !== estado.obraId)) {
          return errorDePeticion('Ese equipo no es de la obra de este parte.', 400);
        }
      }

      for (const maquina of cambios.maquinaria) {
        const clase = medidorDeClase(porId.get(maquina.vehiculoId)!.clase);
        const error = validarAvance(
          clase,
          maquina.medidorInicial ?? null,
          maquina.medidorFinal ?? null,
        );
        // Falta una lectura todavía no es un error mientras se llena: solo se
        // exigen completas al cerrar. Lo que sí se rechaza ya es una lectura
        // imposible, porque escrita se queda.
        if (error === 'final_menor' || error === 'salto_enorme') {
          return errorDePeticion(
            mensajeDeAvance(clase, error, maquina.medidorInicial ?? null),
            400,
          );
        }
      }

      set.maquinaria = cambios.maquinaria.map((m) => {
        const equipo = porId.get(m.vehiculoId)!;
        return construirMaquina(m, equipo.codigo, medidorDeClase(equipo.clase));
      });
    }

    if (cambios.personal) {
      const ids = cambios.personal.map((p) => p.usuarioId);
      if (new Set(ids).size !== ids.length) {
        return errorDePeticion('Una persona no puede estar dos veces en el mismo parte.', 400);
      }

      for (const persona of cambios.personal) {
        const error = validarHorario(persona.entrada, persona.salida);
        if (error) return errorDePeticion(mensajeDeHorario(error), 400);
      }

      const gente = ids.length
        ? await db
            .select({
              id: usuarios.id,
              nombre: usuarios.nombreCompleto,
              cargo: usuarios.cargo,
            })
            .from(usuarios)
            .where(and(inArray(usuarios.id, ids), isNull(usuarios.eliminadoEn)))
        : [];

      const porId = new Map(gente.map((u) => [u.id, u]));
      for (const usuarioId of ids) {
        if (!porId.has(usuarioId)) return errorDePeticion('Esa persona no existe.', 400);
      }

      set.personal = cambios.personal.map((p) => {
        const persona = porId.get(p.usuarioId)!;
        return construirPersona(p, persona.nombre, persona.cargo);
      });
    }

    if (cambios.actividades) {
      set.actividades = cambios.actividades.map((a) => construirActividadDelParte(a));
    }

    if (cambios.clima) {
      const error = validarFranjas(cambios.clima);
      if (error) return errorDePeticion(mensajeDeFranja(error), 400);
      set.clima = cambios.clima.map((c) => construirFranja(c));
    }

    if (cambios.laboratorio) {
      const filas = cambios.laboratorio.map((m) => construirMaterial(m));
      if (filas.some((f) => f === null)) {
        return errorDePeticion('Ese material no está en la lista.', 400);
      }
      set.laboratorio = filas;
    }

    if (cambios.notas !== undefined) set.notas = cambios.notas;

    if (Object.keys(set).length === 0) return errorDePeticion('No llegó nada que guardar.', 400);

    const [fila] = await db
      .update(partesDeObra)
      .set(set)
      .where(and(eq(partesDeObra.id, id), isNull(partesDeObra.cerradoEn)))
      .returning(COLUMNAS);

    return fila ? ok(fila) : noEncontrado('ese parte');
  });
}
