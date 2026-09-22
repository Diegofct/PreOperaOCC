/**
 * La sesión del navegador.
 *
 * Tres decisiones que conviene tener escritas porque no se ven en el código:
 *
 *  1. **La cookie es `HttpOnly`.** JavaScript de la página no puede leerla. Es
 *     lo único que separa un fallo de XSS de un robo de sesión, y es la razón de
 *     que la sesión no se guarde en `localStorage` como suele hacerse.
 *
 *  2. **En la base solo vive su SHA-256.** Quien consiga leer `sesiones_web`
 *     —una copia de seguridad extraviada, una consulta de más— no obtiene nada
 *     con lo que entrar. La cookie original solo existe en el navegador.
 *
 *  3. **La ventana de 12 h es deslizante.** Se renueva mientras se trabaja y
 *     caduca sola tras medio día sin actividad. Un residente no debería tener
 *     que volver a entrar en mitad de una jornada, ni quedarse abierto para
 *     siempre en un computador compartido de obra.
 */
import { and, eq, gt, isNull } from 'drizzle-orm';
import { uuidv7 } from 'uuidv7';

import { baseServidor } from '@/db/servidor/cliente';
import { obras, sesionesWeb, usuarios } from '@/db/servidor/esquema';

import { TODOS_LOS_MODULOS, type ModulosDeObra, type Rol } from '@/shared/rules/permisos';

import { hashDeToken, tokenAleatorio } from './cripto';

export const NOMBRE_COOKIE = 'preopera_sesion';

/** Medio día. Ver la decisión 3 de la cabecera. */
const DURACION_MS = 12 * 60 * 60 * 1000;

/** Solo se reescribe la caducidad si ha pasado un rato: si no, sería un UPDATE por petición. */
const RENOVAR_TRAS_MS = 15 * 60 * 1000;

export interface PersonaEnSesion {
  id: string;
  usuario: string;
  nombreCompleto: string;
  rol: Rol;
  obraId: string | null;
  /**
   * Los módulos que lleva su obra (spec 017). Viajan con la sesión y no se
   * consultan en cada ruta: la lectura de la sesión ya va a la base en cada
   * petición y los trae en el mismo `join`. Repartir esa consulta por veinte rutas
   * es la forma de que un día falte en una.
   *
   * Los dos encendidos para quien no tiene obra (la gerencia).
   */
  modulosDeObra: ModulosDeObra;
  debeCambiarClave: boolean;
}

function atributosDeCookie(maxAgeSegundos: number): string {
  // `Secure` solo en producción: en `localhost` el navegador descartaría una
  // cookie marcada como segura servida por http y no habría forma de entrar.
  const seguro = process.env.NODE_ENV === 'production' ? '; Secure' : '';
  // `Lax` y no `Strict`: con `Strict` la cookie no viaja al llegar desde un
  // enlace externo y el panel pediría clave otra vez sin motivo aparente.
  return `Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAgeSegundos}${seguro}`;
}

/** Crea la sesión y devuelve la cabecera `Set-Cookie` que hay que emitir. */
export async function abrirSesion(usuarioId: string): Promise<string> {
  const token = tokenAleatorio();
  const ahora = new Date();

  await baseServidor()
    .insert(sesionesWeb)
    .values({
      id: uuidv7(),
      usuarioId,
      hashCookie: await hashDeToken(token),
      expiraEn: new Date(ahora.getTime() + DURACION_MS),
      ultimoUsoEn: ahora,
    });

  return `${NOMBRE_COOKIE}=${token}; ${atributosDeCookie(DURACION_MS / 1000)}`;
}

/** La cabecera que borra la cookie del navegador. */
export function cookieDeCierre(): string {
  return `${NOMBRE_COOKIE}=; ${atributosDeCookie(0)}`;
}

function leerCookie(peticion: Request, nombre: string): string | null {
  const cabecera = peticion.headers.get('cookie');
  if (!cabecera) return null;

  for (const trozo of cabecera.split(';')) {
    const [clave, ...resto] = trozo.trim().split('=');
    if (clave === nombre) return resto.join('=') || null;
  }
  return null;
}

/**
 * Quién está detrás de esta petición, o `null`.
 *
 * Devuelve los datos de la persona en el momento de preguntar, no los que tenía
 * al abrir sesión: si un administrador le cambia el cargo o la da de baja, el
 * efecto es inmediato y no espera a que caduque la cookie.
 */
export async function personaDeLaPeticion(peticion: Request): Promise<PersonaEnSesion | null> {
  const token = leerCookie(peticion, NOMBRE_COOKIE);
  if (!token) return null;

  const db = baseServidor();
  const ahora = new Date();

  const [fila] = await db
    .select({
      sesionId: sesionesWeb.id,
      expiraEn: sesionesWeb.expiraEn,
      ultimoUsoEn: sesionesWeb.ultimoUsoEn,
      id: usuarios.id,
      usuario: usuarios.usuario,
      nombreCompleto: usuarios.nombreCompleto,
      rol: usuarios.rol,
      obraId: usuarios.obraId,
      almacenActivo: obras.almacenActivo,
      canteraActivo: obras.canteraActivo,
      activo: usuarios.activo,
      eliminadoEn: usuarios.eliminadoEn,
    })
    .from(sesionesWeb)
    .innerJoin(usuarios, eq(usuarios.id, sesionesWeb.usuarioId))
    // `left`: la gerencia no está adscrita a ninguna obra.
    .leftJoin(obras, eq(obras.id, usuarios.obraId))
    .where(
      and(
        eq(sesionesWeb.hashCookie, await hashDeToken(token)),
        isNull(sesionesWeb.revocadoEn),
        gt(sesionesWeb.expiraEn, ahora),
      ),
    )
    .limit(1);

  if (!fila) return null;
  if (!fila.activo || fila.eliminadoEn) return null;

  const ultimoUso = fila.ultimoUsoEn?.getTime() ?? 0;
  if (ahora.getTime() - ultimoUso > RENOVAR_TRAS_MS) {
    await db
      .update(sesionesWeb)
      .set({ ultimoUsoEn: ahora, expiraEn: new Date(ahora.getTime() + DURACION_MS) })
      .where(eq(sesionesWeb.id, fila.sesionId));
  }

  return {
    id: fila.id,
    usuario: fila.usuario,
    nombreCompleto: fila.nombreCompleto,
    rol: fila.rol,
    obraId: fila.obraId,
    modulosDeObra: fila.obraId
      ? { almacen: fila.almacenActivo ?? true, cantera: fila.canteraActivo ?? true }
      : TODOS_LOS_MODULOS,
    // Lo rellena `guardia.ts`, que es quien consulta la credencial.
    debeCambiarClave: false,
  };
}

export async function cerrarSesion(peticion: Request): Promise<void> {
  const token = leerCookie(peticion, NOMBRE_COOKIE);
  if (!token) return;

  await baseServidor()
    .update(sesionesWeb)
    .set({ revocadoEn: new Date() })
    .where(eq(sesionesWeb.hashCookie, await hashDeToken(token)));
}

/**
 * Cierra **todas** las sesiones de una persona.
 *
 * Se llama al cambiar la contraseña: si alguien la cambia porque sospecha que se
 * la robaron, dejar vivas las sesiones abiertas en otros equipos haría inútil el
 * cambio.
 */
export async function cerrarTodasLasSesiones(usuarioId: string): Promise<void> {
  await baseServidor()
    .update(sesionesWeb)
    .set({ revocadoEn: new Date() })
    .where(and(eq(sesionesWeb.usuarioId, usuarioId), isNull(sesionesWeb.revocadoEn)));
}
