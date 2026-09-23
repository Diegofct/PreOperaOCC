import { aliasedTable, and, desc, eq, isNull, sql } from 'drizzle-orm';
import { uuidv7 } from 'uuidv7';

import { baseServidor } from '@/db/servidor/cliente';
import { asignaciones, obras, usuarios, vehiculos } from '@/db/servidor/esquema';
import { asignacionNueva } from '@/features/panel/contratos';
import { alcanzaLaObra, filtroDeObra } from '@/features/servidor/alcance';
import { requerirPermiso } from '@/features/servidor/guardia';
import { nombreDeCargo, operaVehiculos } from '@/shared/catalogos/cargos';
import { cuerpoJson, errorDePeticion, ok, responder } from '@/features/servidor/respuestas';

/**
 * Qué operador lleva qué máquina. `GET` y `POST /api/panel/asignaciones`.
 *
 * Es la consulta con la que arranca la app del operador, y desde la spec 012
 * **esta es la única puerta por la que se decide**: el celular no puede asignar
 * nada. Un operador sin asignación no levanta ningún preoperacional hasta que
 * alguien de aquí se la registre, y esa es la contrapartida asumida —está
 * argumentada en `AGENTS.md`—.
 *
 * Las filas con `origen = 'autoasignada'` que devuelve el `GET` son de antes del
 * cambio. Se siguen mostrando con su etiqueta porque dicen la verdad sobre cómo
 * se tomó esa máquina; ya no hay nada que confirmar sobre ellas.
 */

const persona = aliasedTable(usuarios, 'persona');

export async function GET(peticion: Request) {
  return responder(async () => {
    const sesion = await requerirPermiso(peticion, 'asignaciones', 'listar');
    if (sesion instanceof Response) return sesion;

    const filas = await baseServidor()
      .select({
        id: asignaciones.id,
        vehiculoId: asignaciones.vehiculoId,
        vehiculoCodigo: vehiculos.codigoInterno,
        usuarioId: asignaciones.usuarioId,
        usuarioNombre: persona.nombreCompleto,
        obraId: asignaciones.obraId,
        obraNombre: obras.nombre,
        desde: asignaciones.desde,
        hasta: asignaciones.hasta,
        origen: asignaciones.origen,
        confirmadaEn: asignaciones.confirmadaEn,
      })
      .from(asignaciones)
      .innerJoin(vehiculos, eq(vehiculos.id, asignaciones.vehiculoId))
      .innerJoin(persona, eq(persona.id, asignaciones.usuarioId))
      .leftJoin(obras, eq(obras.id, asignaciones.obraId))
      .where(and(isNull(asignaciones.eliminadoEn), filtroDeObra(sesion, asignaciones.obraId)))
      // Las vigentes primero por ser lo que se consulta; dentro de cada grupo,
      // la más reciente arriba. El `nulls first` es explícito porque Postgres
      // pone los nulos al final en orden ascendente, que aquí es justo al revés
      // de lo que se quiere: `hasta = null` es una asignación abierta.
      .orderBy(sql`${asignaciones.hasta} asc nulls first`, desc(asignaciones.desde));

    return ok(filas);
  });
}

export async function POST(peticion: Request) {
  return responder(async () => {
    const sesion = await requerirPermiso(peticion, 'asignaciones', 'escribir');
    if (sesion instanceof Response) return sesion;

    const { vehiculoId, usuarioId } = await cuerpoJson(peticion, asignacionNueva);
    const db = baseServidor();

    // La obra sale del vehículo y no se pide en el formulario: una máquina está
    // donde está, y dejar elegir una obra distinta de la suya solo abre la
    // puerta a que no coincidan.
    const [maquina] = await db
      .select({ obraId: vehiculos.obraId })
      .from(vehiculos)
      .where(and(eq(vehiculos.id, vehiculoId), isNull(vehiculos.eliminadoEn)));

    if (!maquina) return errorDePeticion('Ese vehículo no existe o está dado de baja.', 404);

    // El vehículo tiene que caer dentro del alcance de quien asigna. Se
    // responde igual que si no existiera: confirmar que sí existe le diría a
    // un residente qué máquinas hay en las obras que no le tocan.
    if (!alcanzaLaObra(sesion, maquina.obraId)) {
      return errorDePeticion('Ese vehículo no existe o está dado de baja.', 404);
    }

    // El cargo decide quién lleva máquina, igual que decide quién recibe celular
    // (`personas/[id]/activacion`). Sin esto, la pantalla podía filtrar bien y un
    // envío directo seguir asignándole una retroexcavadora a un cadenero: una
    // asignación que nadie puede usar —no hay app sin código de activación— y que
    // deja escrito que esa persona lleva esa máquina, que es justo lo que el acta
    // no debe decir.
    const [aQuien] = await db
      .select({ cargo: usuarios.cargo })
      .from(usuarios)
      .where(and(eq(usuarios.id, usuarioId), isNull(usuarios.eliminadoEn)));

    if (!aQuien) return errorDePeticion('Esa persona no existe o está dada de baja.', 404);

    if (!operaVehiculos(aQuien.cargo)) {
      return errorDePeticion(
        `El cargo «${nombreDeCargo(aQuien.cargo)}» no lleva máquina, así que no se le ` +
          'asignan vehículos. Las asignaciones son para conductores y operadores.',
        409,
      );
    }

    const yaVigente = await db
      .select({ id: asignaciones.id })
      .from(asignaciones)
      .where(
        and(
          eq(asignaciones.vehiculoId, vehiculoId),
          eq(asignaciones.usuarioId, usuarioId),
          isNull(asignaciones.hasta),
          isNull(asignaciones.eliminadoEn),
        ),
      )
      .limit(1);

    if (yaVigente.length > 0) {
      return errorDePeticion('Esa persona ya tiene ese vehículo asignado.', 409);
    }

    const [creada] = await db
      .insert(asignaciones)
      .values({
        id: uuidv7(),
        vehiculoId,
        usuarioId,
        obraId: maquina.obraId,
        desde: new Date(),
        origen: 'supervisor',
      })
      .returning({ id: asignaciones.id, desde: asignaciones.desde });

    return ok(creada, 201);
  });
}
