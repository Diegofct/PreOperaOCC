import { and, desc, eq, gt, isNull } from 'drizzle-orm';
import { uuidv7 } from 'uuidv7';
import { z } from 'zod';

import { baseServidor } from '@/db/servidor/cliente';
import { codigosActivacion, dispositivos, usuarios } from '@/db/servidor/esquema';
import {
  gastarTiempoDeVerificacion,
  hashDeToken,
  tokenAleatorio,
  verificarCodigo,
} from '@/features/auth/servidor/cripto';
import { emitirAccessToken } from '@/features/auth/servidor/tokens';
import { cuerpoJson, errorDePeticion, ok, responder } from '@/features/servidor/respuestas';

/**
 * Enrola un equipo. `POST /api/movil/activar`.
 *
 * **Es el único momento en toda la vida de la app en que el celular necesita
 * señal.** De aquí en adelante el operador desbloquea con su PIN contra su
 * propio equipo, en modo avión, todos los días.
 *
 * Devuelve tres cosas:
 *
 *  · el usuario, para saludarlo y para saber si lleva bitácoras;
 *  · los tokens, que el teléfono guarda cifrados;
 *  · **el hash del código de respaldo**, que viaja aquí y solo aquí. No el
 *    código: ese no lo tiene ni el servidor. Con el hash, el teléfono puede
 *    comprobar sin red el código que el residente le dicte de la carpeta de la
 *    obra el día que el operador olvide su PIN — que es el único caso en que
 *    esto hace falta y justo cuando no hay señal para preguntar.
 *
 * **El PIN no aparece por ninguna parte.** Lo elige el operador después, en su
 * equipo, y no viaja nunca. Este servidor no tiene dónde guardarlo ni forma de
 * consultarlo.
 */

const activacion = z.object({
  usuario: z.string().trim().toLowerCase().min(1, 'Escriba su usuario.'),
  // Los guiones y las mayúsculas los resuelve `verificarCodigo`, que es también
  // quien los resolvió al hashearlo. Aquí no se toca: normalizar en dos sitios
  // es cómo dejaron de coincidir la primera vez.
  codigo: z.string().trim().min(1, 'Escriba el código.'),
  /** `idDelDispositivo()` del móvil. Permite revocar este equipo y no otro. */
  equipo: z.string().trim().min(1).max(120),
  etiqueta: z.string().trim().max(120).optional(),
});

const MENSAJE_GENERICO = 'El usuario o el código no son correctos.';

/** Tantos intentos fallidos sobre el mismo código y deja de servir. */
const INTENTOS_MAXIMOS = 5;

export async function POST(peticion: Request) {
  return responder(async () => {
    const { usuario, codigo, equipo, etiqueta } = await cuerpoJson(peticion, activacion);
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
      .where(and(eq(usuarios.usuario, usuario), isNull(usuarios.eliminadoEn)))
      .limit(1);

    if (!persona) {
      // Cuesta lo mismo que un usuario real: la diferencia de tiempo delataría
      // qué nombres de usuario existen.
      await gastarTiempoDeVerificacion();
      return errorDePeticion(MENSAJE_GENERICO, 401);
    }

    const [vivo] = await db
      .select({
        id: codigosActivacion.id,
        hash: codigosActivacion.hash,
        intentos: codigosActivacion.intentos,
      })
      .from(codigosActivacion)
      .where(
        and(
          eq(codigosActivacion.usuarioId, persona.id),
          eq(codigosActivacion.tipo, 'activacion'),
          isNull(codigosActivacion.usadoEn),
          gt(codigosActivacion.expiraEn, new Date()),
        ),
      )
      .orderBy(desc(codigosActivacion.creadoEn))
      .limit(1);

    if (!vivo) {
      await gastarTiempoDeVerificacion();
      return errorDePeticion(
        'No hay ningún código de activación vigente para ese usuario. Pida uno nuevo a la ' +
          'administración.',
        401,
      );
    }

    if (vivo.intentos >= INTENTOS_MAXIMOS) {
      return errorDePeticion(
        'Ese código se bloqueó por demasiados intentos. Pida uno nuevo a la administración.',
        429,
      );
    }

    if (!(await verificarCodigo(codigo, vivo.hash))) {
      await db
        .update(codigosActivacion)
        .set({ intentos: vivo.intentos + 1 })
        .where(eq(codigosActivacion.id, vivo.id));
      return errorDePeticion(MENSAJE_GENERICO, 401);
    }

    if (!persona.activo) {
      return errorDePeticion('Su cuenta está inactiva. Comuníquese con su supervisor.', 403);
    }

    // El código de respaldo se le entrega al teléfono ahora, que es la única
    // ocasión en que hay red garantizada. Se busca el vivo, emitido junto al de
    // activación por el panel.
    const [respaldo] = await db
      .select({ hash: codigosActivacion.hash })
      .from(codigosActivacion)
      .where(
        and(
          eq(codigosActivacion.usuarioId, persona.id),
          eq(codigosActivacion.tipo, 'respaldo'),
          isNull(codigosActivacion.usadoEn),
        ),
      )
      .orderBy(desc(codigosActivacion.creadoEn))
      .limit(1);

    await db
      .update(codigosActivacion)
      .set({ usadoEn: new Date() })
      .where(eq(codigosActivacion.id, vivo.id));

    /**
     * Un equipo por activación.
     *
     * Si el mismo aparato se vuelve a activar —porque el operador olvidó el PIN
     * y pidió otro código— se revoca la fila anterior en vez de acumular. Un
     * listado de equipos con cinco entradas del mismo teléfono no le sirve a
     * nadie para decidir cuál revocar.
     */
    await db
      .update(dispositivos)
      .set({ revocadoEn: new Date() })
      .where(
        and(
          eq(dispositivos.usuarioId, persona.id),
          eq(dispositivos.identificadorEquipo, equipo),
          isNull(dispositivos.revocadoEn),
        ),
      );

    const refresh = tokenAleatorio();
    const dispositivoId = uuidv7();

    await db.insert(dispositivos).values({
      id: dispositivoId,
      usuarioId: persona.id,
      identificadorEquipo: equipo,
      etiqueta: etiqueta ?? null,
      hashRefresh: await hashDeToken(refresh),
      ultimaVistaEn: new Date(),
    });

    return ok({
      usuario: {
        id: persona.id,
        usuario: persona.usuario,
        nombreCompleto: persona.nombreCompleto,
        rol: persona.rol,
        obraId: persona.obraId,
      },
      accessToken: await emitirAccessToken(persona.id, dispositivoId),
      refreshToken: refresh,
      /**
       * El **hash** del código de respaldo, no el código.
       *
       * El servidor no guarda el código en claro —de eso se trata— así que no
       * puede reenviarlo. Le manda el hash, que es todo lo que el teléfono
       * necesita para comprobarlo sin red el día que haga falta. El código en
       * claro solo existió una vez, en la pantalla del panel, y de ahí salió al
       * papel de la carpeta de la obra.
       *
       * `null` si el panel emitió una activación sin respaldo (hoy no puede
       * pasar). El teléfono lo trata como "sin recuperación sin señal" y lo
       * dice, en vez de fingir que la tiene.
       */
      hashRespaldo: respaldo?.hash ?? null,
    });
  });
}
