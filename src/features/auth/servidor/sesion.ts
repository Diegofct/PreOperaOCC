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
 *
 *  4. **La obra en uso es de la petición, no de la sesión** (spec 041). El Director de
 *     Obra lleva varias obras, y cada pestaña trabaja en la suya: la obra viaja en la
 *     cabecera `x-obra-en-uso` (o en `?obraId=`, para los enlaces directos) y se acepta
 *     solo si es de la persona. Guardarla en la fila de la sesión haría que cambiar de
 *     obra en una pestaña moviera la otra, y un parte se guardaría en la obra equivocada.
 */
import { and, eq, gt, isNull, sql } from 'drizzle-orm';
import { uuidv7 } from 'uuidv7';

import { baseServidor } from '@/db/servidor/cliente';
import { sesionesWeb, usuarios } from '@/db/servidor/esquema';

import { obraEnUso } from '@/shared/rules/cargos-de-obra';
import { rolDeVariasObras, TODOS_LOS_MODULOS, type ModulosDeObra, type Rol } from '@/shared/rules/permisos';

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
  /** El cargo (`shared/catalogos/cargos`), o `null` si se registró sin él. */
  cargo: string | null;
  /**
   * La obra **en uso** de esta petición (spec 041, RF-22, RF-23): la de la pestaña si es de
   * la persona; si no, la única que tenga; si tiene varias y no pidió ninguna, `null`. Para
   * quien lleva una sola obra es siempre esa, como antes de la 041, y por eso los sitios que
   * leen `obraId` siguen bien sin tocarlos.
   */
  obraId: string | null;
  /**
   * Todas sus obras (spec 041, RF-19): las asignadas al Director de Obra, o la única de los
   * demás cargos de obra. Vacía para quien ve todas las obras sin estar en ninguna, y para
   * quien todavía no tiene. Lo que pregunta por **una fila concreta** mira esta lista; lo que
   * filtra un listado mira `obraId`.
   */
  obras: string[];
  /**
   * Sus obras con nombre y módulos (spec 041, RF-22, RF-24, RF-67), en el orden de `obras`. El
   * panel arma con esto la lista de sus obras, el nombre de la obra en uso y su menú, sin
   * pedir la lista de obras, que el Director de Obra no puede listar. Sale de la misma
   * consulta que `obras`: no cuesta otra ida a la base.
   */
  obrasConNombre: { id: string; nombre: string; modulos: ModulosDeObra }[];
  /** El nombre de la obra en uso, para la cabecera del menú (spec 033, RF-10). */
  obraNombre: string | null;
  /**
   * Los módulos que lleva su obra en uso (spec 017). Viajan con la sesión y no se
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

/** Una obra de la persona, como la trae la consulta de la sesión. */
interface ObraDeLaPersona {
  id: string;
  nombre: string;
  almacen: boolean | null;
  cantera: boolean | null;
  laboratorio: boolean | null;
  /** Es su `usuarios.obra_id`: la obra de los cargos de una sola obra. */
  propia: boolean;
  /** Está vigente en `usuarios_obras`: las obras del Director de Obra. */
  asignada: boolean;
}

/** La obra que pide la pestaña: la cabecera, o `?obraId=` en un enlace directo. */
function obraPedida(peticion: Request): string | null {
  const cabecera = peticion.headers.get('x-obra-en-uso');
  if (cabecera) return cabecera;
  try {
    return new URL(peticion.url).searchParams.get('obraId');
  } catch {
    return null;
  }
}

/**
 * Quién está detrás de esta petición, o `null`.
 *
 * Devuelve los datos de la persona en el momento de preguntar, no los que tenía
 * al abrir sesión: si un administrador le cambia el cargo o la da de baja, el
 * efecto es inmediato y no espera a que caduque la cookie. Lo mismo con sus obras:
 * retirarle una a un Director de Obra vale desde su siguiente petición, sin cerrarle
 * la sesión (041/RF-29, RF-56).
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
      cargo: usuarios.cargo,
      activo: usuarios.activo,
      eliminadoEn: usuarios.eliminadoEn,
      // Todas sus obras con lo que la sesión necesita de cada una, en la misma ida a la base:
      // la de `obra_id` y las vigentes de `usuarios_obras`. Cuál de las dos fuentes vale lo
      // decide el rol, abajo; aquí no se mezcla nada.
      susObras: sql<ObraDeLaPersona[]>`coalesce((
        select json_agg(json_build_object(
          'id', o.id, 'nombre', o.nombre,
          'almacen', o.almacen_activo, 'cantera', o.cantera_activo, 'laboratorio', o.laboratorio_activo,
          'propia', o.id = ${usuarios.obraId},
          'asignada', exists (
            select 1 from usuarios_obras ua
            where ua.usuario_id = ${usuarios.id} and ua.obra_id = o.id and ua.hasta is null
          )
        ) order by o.nombre)
        from obras o
        where o.id = ${usuarios.obraId}
           or exists (
             select 1 from usuarios_obras uo
             where uo.usuario_id = ${usuarios.id} and uo.obra_id = o.id and uo.hasta is null
           )
      ), '[]'::json)`,
    })
    .from(sesionesWeb)
    .innerJoin(usuarios, eq(usuarios.id, sesionesWeb.usuarioId))
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

  // El Director de Obra, las de `usuarios_obras`; los demás, la de `obra_id` (plan 041, Datos).
  const varias = rolDeVariasObras(fila.rol);
  const suyas = fila.susObras.filter((o) => (varias ? o.asignada : o.propia));
  const obraId = obraEnUso(obraPedida(peticion), suyas.map((o) => o.id));
  const enUso = suyas.find((o) => o.id === obraId) ?? null;
  const modulosDe = (o: ObraDeLaPersona): ModulosDeObra => ({
    almacen: o.almacen ?? true,
    cantera: o.cantera ?? true,
    // Apagado si no se sabe, como el default de la columna (018/RF-12).
    laboratorio: o.laboratorio ?? false,
  });

  return {
    id: fila.id,
    usuario: fila.usuario,
    nombreCompleto: fila.nombreCompleto,
    rol: fila.rol,
    cargo: fila.cargo ?? null,
    obraId,
    obras: suyas.map((o) => o.id),
    obrasConNombre: suyas.map((o) => ({ id: o.id, nombre: o.nombre, modulos: modulosDe(o) })),
    obraNombre: enUso?.nombre ?? null,
    modulosDeObra: enUso ? modulosDe(enUso) : TODOS_LOS_MODULOS,
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
