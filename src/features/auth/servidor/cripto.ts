/**
 * Criptografía de las contraseñas web.
 *
 * **Aquí no se usa `@noble/hashes`, y esa es la única diferencia importante con
 * `src/features/auth/pin.ts`.** Ese archivo usa JavaScript puro porque Hermes no
 * trae `crypto.subtle` completo; aquí sí lo hay, nativo, tanto en Node como en
 * Cloudflare Workers, y derivar en nativo cuesta una fracción de lo que cuesta
 * en JS. Con 30 s de CPU por petición en Workers, esa diferencia decide.
 *
 * `pin.ts` **no se toca**: sus 120.000 iteraciones están calibradas contra el
 * Android real del cliente y responden a otro presupuesto (400 ms en un equipo
 * de gama baja, con la animación del teclado corriendo al lado).
 *
 * Lo único que comparten las dos mitades es `igualEnTiempoConstante`, que vive
 * en `@/shared/cripto/comparar` precisamente para no estar escrito dos veces.
 */
import { igualEnTiempoConstante } from '@/shared/cripto/comparar';

/**
 * Coste de derivación de una contraseña web.
 *
 * Punto de partida: la recomendación de OWASP para PBKDF2-SHA256. Es un número
 * que hay que **medir**, no heredar: si un ingreso pasa de ~500 ms en el
 * despliegue real, se baja y se anota aquí en cuánto quedó y contra qué se
 * midió, igual que hace `pin.ts`. `medirCostoDeClave()` da la cifra.
 *
 * **Medido:** 313 ms de mediana sobre 5 derivaciones (Node 22 en el portátil de
 * desarrollo, Windows). Dentro del presupuesto, así que se deja en la
 * recomendación. Falta comprobarlo en Cloudflare Workers cuando se despliegue;
 * `npm run verificar` imprime la cifra de la máquina donde corra.
 */
export const ITERACIONES_CLAVE = 600_000;

const LONGITUD_SALT = 16;
const LONGITUD_CLAVE = 32;

/** Mínimo de una contraseña web. Corta de más es peor que corta de menos. */
export const LONGITUD_MINIMA_CLAVE = 10;

function aHex(bytes: Uint8Array): string {
  let salida = '';
  for (const byte of bytes) salida += byte.toString(16).padStart(2, '0');
  return salida;
}

function deHex(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < bytes.length; i++) bytes[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  return bytes;
}

function bytesAleatorios(cuantos: number): Uint8Array {
  return crypto.getRandomValues(new Uint8Array(cuantos));
}

async function derivar(clave: string, salt: Uint8Array, iteraciones: number): Promise<string> {
  const material = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(clave),
    'PBKDF2',
    false,
    ['deriveBits'],
  );
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', hash: 'SHA-256', salt: salt as BufferSource, iterations: iteraciones },
    material,
    LONGITUD_CLAVE * 8,
  );
  return aHex(new Uint8Array(bits));
}

/**
 * Hash almacenable de una contraseña.
 *
 * El formato lleva dentro sus propios parámetros —`pbkdf2$sha256$<it>$<salt>$<dk>`—
 * y no es adorno: permite subir las iteraciones el día que haga falta sin migrar
 * ni una fila. Las credenciales viejas se siguen verificando con su coste
 * original, y se rehashean solas cuando su dueño entra.
 */
export async function hashDeClave(clave: string): Promise<string> {
  const salt = bytesAleatorios(LONGITUD_SALT);
  const dk = await derivar(clave, salt, ITERACIONES_CLAVE);
  return `pbkdf2$sha256$${ITERACIONES_CLAVE}$${aHex(salt)}$${dk}`;
}

/** Verifica sin confiar en las constantes de hoy: lee los parámetros del hash. */
export async function verificarClave(clave: string, almacenado: string): Promise<boolean> {
  const partes = almacenado.split('$');
  if (partes.length !== 5) return false;

  const [algoritmo, digest, iteracionesTexto, saltHex, dkEsperada] = partes;
  if (algoritmo !== 'pbkdf2' || digest !== 'sha256') return false;

  const iteraciones = Number(iteracionesTexto);
  if (!Number.isInteger(iteraciones) || iteraciones <= 0) return false;

  const calculada = await derivar(clave, deHex(saltHex), iteraciones);
  return igualEnTiempoConstante(calculada, dkEsperada);
}

/**
 * Consume el mismo tiempo que una verificación real.
 *
 * Se usa cuando el usuario **no existe**. Sin esto, un nombre inexistente
 * responde de inmediato y uno real tarda lo que tarda derivar: la diferencia se
 * mide desde fuera y delata qué nombres de usuario son válidos, que es justo el
 * primer paso de cualquier ataque serio.
 */
export async function gastarTiempoDeVerificacion(): Promise<void> {
  await derivar('descarte', new Uint8Array(LONGITUD_SALT), ITERACIONES_CLAVE);
}

/**
 * Un token opaco de 32 bytes: cookie de sesión, refresh token.
 *
 * No pasa por PBKDF2 ni falta que le hace. Un KDF lento existe para compensar
 * que las contraseñas humanas tienen poca entropía; esto ya trae 256 bits de
 * aleatoriedad, así que estirarlo solo añadiría latencia.
 */
export function tokenAleatorio(): string {
  return aHex(bytesAleatorios(32));
}

/** Lo que se guarda en la base de un token. El original nunca toca Postgres. */
export async function hashDeToken(token: string): Promise<string> {
  const bits = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(token));
  return aHex(new Uint8Array(bits));
}

/**
 * Alfabeto sin los cuatro caracteres que se confunden al dictar: `O`, `0`, `I`, `1`.
 *
 * Estas contraseñas se leen por teléfono o se apuntan en un papel, y un cero
 * confundido con una O es una llamada de vuelta.
 *
 * La `L` **sí** está, y es deliberado: la que se confunde con un uno es la ele
 * minúscula, y aquí todo es mayúscula. Quitarla también no ganaría nada y
 * acortaría el alfabeto.
 */
const ALFABETO_LEGIBLE = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

/** Contraseña temporal de 12 caracteres (~60 bits). Se muestra una sola vez. */
export function generarClaveTemporal(longitud = 12): string {
  const bytes = bytesAleatorios(longitud);
  let salida = '';
  for (const byte of bytes) salida += ALFABETO_LEGIBLE[byte % ALFABETO_LEGIBLE.length];
  // En grupos de cuatro: se dicta y se teclea con muchos menos errores.
  return (salida.match(/.{1,4}/g) ?? [salida]).join('-');
}

/** Cuánto tarda derivar una contraseña en este equipo, en ms. Para calibrar. */
export async function medirCostoDeClave(): Promise<number> {
  const inicio = Date.now();
  await derivar('medicion', bytesAleatorios(LONGITUD_SALT), ITERACIONES_CLAVE);
  return Date.now() - inicio;
}
