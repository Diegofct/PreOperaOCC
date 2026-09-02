import { and, desc, eq, gt, isNull } from 'drizzle-orm';
import { uuidv7 } from 'uuidv7';
import { z } from 'zod';

import { baseServidor } from '@/db/servidor/cliente';
import { credencialesWeb, intentosAcceso, usuarios } from '@/db/servidor/esquema';
import { esperaPorFallos, mensajeDeEspera } from '@/features/auth/escalera';
import { gastarTiempoDeVerificacion, verificarClave } from '@/features/auth/servidor/cripto';
import { abrirSesion } from '@/features/auth/servidor/sesion';
import { cuerpoJson, errorDePeticion, ok, responder } from '@/features/servidor/respuestas';

/**
 * `POST /api/auth/ingresar` — la puerta del panel.
 *
 * Tres cosas que hace y que no se ven leyendo por encima:
 *
 *  1. **Un usuario inexistente cuesta lo mismo que uno real.** Sin el
 *     `gastarTiempoDeVerificacion`, no encontrar la fila responde en un
 *     milisegundo y encontrarla tarda los ~300 ms de derivar la contraseña. Esa
 *     diferencia se mide desde fuera y permite averiguar qué nombres de usuario
 *     existen, que es el primer paso de cualquier ataque con paciencia.
 *
 *  2. **El error no distingue** entre usuario que no existe y contraseña mala.
 *     Por lo mismo.
 *
 *  3. **La espera por fallos es la misma escalera que la del PIN en el celular**
 *     (`@/features/auth/escalera`, que es pura y ya estaba escrita pensando en
 *     esto). Aquí solo se le añade dónde se cuentan los fallos.
 */

const credenciales = z.object({
  usuario: z.string().trim().toLowerCase().min(1, 'Escriba su usuario.'),
  clave: z.string().min(1, 'Escriba su contraseña.'),
});

/** Ventana en la que un fallo sigue contando. Más allá, se empieza de cero. */
const VENTANA_INTENTOS_MS = 60 * 60 * 1000;

const MENSAJE_GENERICO = 'Usuario o contraseña incorrectos.';

async function fallosRecientes(identidad: string): Promise<number> {
  const desde = new Date(Date.now() - VENTANA_INTENTOS_MS);

  const filas = await baseServidor()
    .select({ exito: intentosAcceso.exito })
    .from(intentosAcceso)
    .where(and(eq(intentosAcceso.identidad, identidad), gt(intentosAcceso.ocurridoEn, desde)))
    .orderBy(desc(intentosAcceso.ocurridoEn))
    .limit(20);

  // Solo los consecutivos: un ingreso correcto pone el contador a cero, igual
  // que en el celular. Si no, quien se equivoca de vez en cuando a lo largo del
  // día acabaría bloqueado sin haber fallado nunca dos veces seguidas.
  let seguidos = 0;
  for (const fila of filas) {
    if (fila.exito) break;
    seguidos += 1;
  }
  return seguidos;
}

async function anotarIntento(identidad: string, exito: boolean): Promise<void> {
  await baseServidor()
    .insert(intentosAcceso)
    .values({ id: uuidv7(), identidad, superficie: 'panel', exito });
}

export async function POST(peticion: Request) {
  return responder(async () => {
    const { usuario, clave } = await cuerpoJson(peticion, credenciales);

    const espera = esperaPorFallos(await fallosRecientes(usuario));
    if (espera > 0) {
      return errorDePeticion(`Demasiados intentos fallidos. ${mensajeDeEspera(espera)}`, 429);
    }

    const [fila] = await baseServidor()
      .select({
        id: usuarios.id,
        usuario: usuarios.usuario,
        nombreCompleto: usuarios.nombreCompleto,
        rol: usuarios.rol,
        obraId: usuarios.obraId,
        activo: usuarios.activo,
        hash: credencialesWeb.hash,
        debeCambiar: credencialesWeb.debeCambiar,
      })
      .from(usuarios)
      .innerJoin(credencialesWeb, eq(credencialesWeb.usuarioId, usuarios.id))
      .where(and(eq(usuarios.usuario, usuario), isNull(usuarios.eliminadoEn)))
      .limit(1);

    if (!fila) {
      await gastarTiempoDeVerificacion();
      await anotarIntento(usuario, false);
      return errorDePeticion(MENSAJE_GENERICO, 401);
    }

    if (!(await verificarClave(clave, fila.hash))) {
      await anotarIntento(usuario, false);
      return errorDePeticion(MENSAJE_GENERICO, 401);
    }

    if (!fila.activo) {
      await anotarIntento(usuario, false);
      return errorDePeticion('Su cuenta está inactiva. Comuníquese con la gerencia.', 403);
    }

    // La contraseña era correcta, pero el panel no es su sitio. Se distingue del
    // mensaje genérico a propósito: no es un error de quien escribe, y decirle
    // "usuario o contraseña incorrectos" lo mandaría a buscar una clave que sí
    // tiene bien.
    if (fila.rol === 'operador') {
      await anotarIntento(usuario, true);
      return errorDePeticion(
        'Esta cuenta es de operador. Su acceso es la aplicación del celular, con su PIN.',
        403,
      );
    }

    await anotarIntento(usuario, true);

    await baseServidor()
      .update(credencialesWeb)
      .set({ ultimoIngresoEn: new Date() })
      .where(eq(credencialesWeb.usuarioId, fila.id));

    const cookie = await abrirSesion(fila.id);

    return ok(
      {
        id: fila.id,
        usuario: fila.usuario,
        nombreCompleto: fila.nombreCompleto,
        rol: fila.rol,
        obraId: fila.obraId,
        debeCambiarClave: fila.debeCambiar,
      },
      200,
      { 'Set-Cookie': cookie },
    );
  });
}
