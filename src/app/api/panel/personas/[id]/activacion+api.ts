import { and, eq, isNull } from 'drizzle-orm';
import { uuidv7 } from 'uuidv7';

import { baseServidor } from '@/db/servidor/cliente';
import { codigosActivacion, usuarios } from '@/db/servidor/esquema';
import { generarClaveTemporal, hashDeCodigo } from '@/features/auth/servidor/cripto';
import { alcanzaLaObra } from '@/features/servidor/alcance';
import { requerirSesion } from '@/features/servidor/guardia';
import { errorDePeticion, noEncontrado, ok, responder } from '@/features/servidor/respuestas';

/**
 * Los dos códigos de un operador. `POST /api/panel/personas/:id/activacion`.
 *
 * Se emiten **juntos** y se muestran **una sola vez**:
 *
 *  · **Activación** — un solo uso, caduca en 48 h. Se le dicta al operador por
 *    teléfono. Es lo que enrola su equipo.
 *  · **Respaldo** — no caduca. Se imprime y se guarda en la carpeta de la obra.
 *    Es la salida el día que el operador olvide su PIN **en un frente sin
 *    señal**: el residente se lo dicta ahí mismo y define uno nuevo.
 *
 * Juntos a propósito. Si el de respaldo se emitiera aparte, alguien tendría que
 * acordarse de emitirlo, y nadie se acuerda hasta que ya hace falta — que es
 * justo cuando no hay señal para pedirlo.
 *
 * Ninguno de los dos se guarda en claro: de ambos queda solo su hash. Si se
 * pierden, se emiten otros; recuperarlos es imposible a propósito.
 *
 * **Emitir de nuevo invalida los anteriores.** Dos códigos vivos a la vez
 * significan que uno anda suelto sin que nadie sepa dónde.
 */

const HORAS_DE_VIGENCIA = 48;

/** El de respaldo no caduca. Una fecha muy lejana evita un nulo y una rama. */
const NUNCA = new Date('2999-12-31T00:00:00Z');

export async function POST(peticion: Request, { id }: { id: string }) {
  return responder(async () => {
    const sesion = await requerirSesion(peticion);
    if (sesion instanceof Response) return sesion;

    const db = baseServidor();

    const [persona] = await db
      .select({
        id: usuarios.id,
        usuario: usuarios.usuario,
        nombreCompleto: usuarios.nombreCompleto,
        rol: usuarios.rol,
        obraId: usuarios.obraId,
        activo: usuarios.activo,
      })
      .from(usuarios)
      .where(and(eq(usuarios.id, id), isNull(usuarios.eliminadoEn)))
      .limit(1);

    if (!persona || !alcanzaLaObra(sesion, persona.obraId)) return noEncontrado('esa persona');

    // El código de activación es para la app del celular. Al personal
    // administrativo se le da contraseña web, que es otra cosa y otra ruta.
    if (persona.rol !== 'operador') {
      return errorDePeticion(
        'Los códigos de activación son para operadores. Al personal administrativo se le da ' +
          'acceso al panel con contraseña.',
        400,
      );
    }

    if (!persona.activo) {
      return errorDePeticion('Esa persona está inactiva. Actívela antes de darle un código.', 400);
    }

    const activacion = generarClaveTemporal(8);
    const respaldo = generarClaveTemporal(8);

    // Los anteriores dejan de servir. `usadoEn` es lo que los apaga, y ponerle
    // la fecha de ahora los marca como consumidos aunque nadie los usara.
    await db
      .update(codigosActivacion)
      .set({ usadoEn: new Date() })
      .where(and(eq(codigosActivacion.usuarioId, persona.id), isNull(codigosActivacion.usadoEn)));

    await db.insert(codigosActivacion).values([
      {
        id: uuidv7(),
        usuarioId: persona.id,
        tipo: 'activacion',
        hash: await hashDeCodigo(activacion),
        expiraEn: new Date(Date.now() + HORAS_DE_VIGENCIA * 60 * 60 * 1000),
      },
      {
        id: uuidv7(),
        usuarioId: persona.id,
        tipo: 'respaldo',
        hash: await hashDeCodigo(respaldo),
        expiraEn: NUNCA,
      },
    ]);

    return ok({
      usuario: persona.usuario,
      nombreCompleto: persona.nombreCompleto,
      codigoActivacion: activacion,
      codigoRespaldo: respaldo,
      horasDeVigencia: HORAS_DE_VIGENCIA,
    });
  });
}
