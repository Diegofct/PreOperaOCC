/**
 * Cómo responde el servidor, decidido una vez.
 *
 * Sin esto, cada endpoint inventa su propia forma de error y el panel acaba con
 * un `catch` distinto por pantalla. Aquí el contrato es uno solo: todo error
 * lleva `{ error: string }` con un mensaje que se le puede mostrar tal cual a
 * una persona, y los de validación añaden `campos` para poder señalar el campo
 * exacto del formulario.
 *
 * **Los errores inesperados no cuentan lo que pasó.** Se registran completos en
 * el log del servidor y hacia afuera dicen una frase genérica: el detalle de un
 * fallo de base de datos describe la estructura de la base a quien esté mirando.
 */
import { ZodError } from 'zod';

import { ErrorDeConfiguracion } from './configuracion';

export interface ErrorConCampos {
  error: string;
  campos?: Record<string, string>;
}

/** `cabeceras` existe para la cookie de sesión, que es lo único que las usa. */
export function ok<T>(datos: T, estado = 200, cabeceras?: Record<string, string>): Response {
  return Response.json(datos, { status: estado, headers: cabeceras });
}

export function errorDePeticion(mensaje: string, estado = 400): Response {
  return Response.json({ error: mensaje } satisfies ErrorConCampos, { status: estado });
}

export function noEncontrado(que: string): Response {
  return errorDePeticion(`No existe ${que}.`, 404);
}

/** Traduce el fallo de Zod a algo que el formulario pueda pintar campo por campo. */
export function errorDeValidacion(fallo: ZodError): Response {
  const campos: Record<string, string> = {};
  for (const problema of fallo.issues) {
    const campo = problema.path.join('.') || '_';
    campos[campo] ??= problema.message;
  }
  const primero = Object.values(campos)[0] ?? 'Los datos enviados no son válidos.';
  return Response.json({ error: primero, campos } satisfies ErrorConCampos, { status: 400 });
}

/**
 * Envuelve el cuerpo de un endpoint.
 *
 * Un `throw` sin capturar dentro de una ruta `+api.ts` se convierte en una
 * respuesta vacía sin tipo, que en el navegador aparece como "error de red" y
 * manda a buscar el problema donde no está. Con esto siempre sale JSON.
 */
export async function responder(cuerpo: () => Promise<Response>): Promise<Response> {
  try {
    return await cuerpo();
  } catch (fallo) {
    if (fallo instanceof ZodError) return errorDeValidacion(fallo);

    if (esViolacionDeUnicidad(fallo)) {
      const { mensaje, campo } = duplicadoDe(detallePostgres(fallo)?.constraint);
      return Response.json(
        { error: mensaje, ...(campo ? { campos: { [campo]: mensaje } } : {}) } satisfies ErrorConCampos,
        { status: 409 },
      );
    }

    // Los dos errores cuyo detalle sí sale hacia afuera, porque los dos dicen
    // qué falta hacer y esconderlos solo consigue que se busque el problema en
    // otra parte.
    if (fallo instanceof ErrorDeConfiguracion) {
      return errorDePeticion(fallo.message, 503);
    }

    if (esTablaInexistente(fallo)) {
      return errorDePeticion(
        'La base de datos está conectada pero todavía no tiene las tablas. ' +
          'Créalas con: npm run db:migrar:servidor y luego npm run db:sembrar:servidor',
        503,
      );
    }

    console.error('[api] error no controlado:', fallo);
    return errorDePeticion('Algo falló en el servidor. Vuelve a intentarlo.', 500);
  }
}

/** Postgres 23505: índice único violado. Es un choque de datos, no un fallo. */
function esViolacionDeUnicidad(fallo: unknown): boolean {
  return codigoPostgres(fallo) === '23505';
}

/**
 * Postgres 42P01: la tabla no existe.
 *
 * Es lo que responde una base recién creada a la que todavía no se le aplicaron
 * las migraciones, y sin este caso aparte se presenta como un fallo interno
 * genérico — que manda a revisar la cadena de conexión, que es justo lo único
 * que sí estaba bien.
 */
function esTablaInexistente(fallo: unknown): boolean {
  return codigoPostgres(fallo) === '42P01';
}

/**
 * Qué índice único se violó: el mensaje y **el campo del formulario** culpable.
 *
 * El campo va con el nombre del contrato del panel (`codigo`, `usuario`,
 * `codigoInterno`), no con el del índice, para que la pantalla pinte el mensaje
 * debajo de ese campo sin traducir nada (spec 007, RF-18). Hasta el 2026-09-15
 * solo devolvía el mensaje, y un código repetido se leía arriba de la página,
 * lejos del campo que había que corregir.
 *
 * Un índice que no está aquí no inventa campo: el mensaje sale arriba.
 */
export function duplicadoDe(indice: string | undefined): { mensaje: string; campo?: string } {
  switch (indice) {
    case 'ux_obras_codigo':
      return { mensaje: 'Ya existe una obra con ese código.', campo: 'codigo' };
    case 'ux_usuarios_usuario':
      return { mensaje: 'Ese nombre de usuario ya está en uso.', campo: 'usuario' };
    case 'ux_vehiculos_codigo':
      return { mensaje: 'Ya existe un vehículo con ese código interno.', campo: 'codigoInterno' };
    default:
      return { mensaje: 'Ya existe un registro con esos datos.' };
  }
}

/**
 * El error de Postgres, buscándolo también dentro de `cause`.
 *
 * Drizzle no propaga el error del driver: lo envuelve en un `DrizzleQueryError`
 * cuyo `message` es "Failed query: …" y que **no** lleva `code` propio. El error
 * real de Neon —con su código SQLSTATE y el nombre del índice— queda un nivel
 * más abajo. Mirar solo el nivel de arriba hace que todo choque de datos se
 * presente como un fallo interno, que es exactamente lo que pasaba.
 */
function detallePostgres(fallo: unknown): { code?: string; constraint?: string } | null {
  let actual: unknown = fallo;

  // Tope de saltos: una cadena de causas cíclica colgaría la respuesta.
  for (let salto = 0; salto < 5 && typeof actual === 'object' && actual !== null; salto += 1) {
    const posible = actual as { code?: unknown; constraint?: unknown; cause?: unknown };
    if (typeof posible.code === 'string') {
      return {
        code: posible.code,
        constraint: typeof posible.constraint === 'string' ? posible.constraint : undefined,
      };
    }
    actual = posible.cause;
  }

  return null;
}

function codigoPostgres(fallo: unknown): string | null {
  return detallePostgres(fallo)?.code ?? null;
}

/** Lee y valida el cuerpo JSON de la petición. Lanza `ZodError` si no cuadra. */
export async function cuerpoJson<T>(
  peticion: Request,
  esquema: { parse: (dato: unknown) => T },
): Promise<T> {
  let crudo: unknown;
  try {
    crudo = await peticion.json();
  } catch {
    throw new SyntaxError('El cuerpo de la petición no es JSON válido.');
  }
  return esquema.parse(crudo);
}
