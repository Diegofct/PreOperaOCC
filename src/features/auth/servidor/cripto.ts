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
import {
  aHex,
  deHex,
  formatearPbkdf2,
  leerPbkdf2,
} from '@/shared/cripto/formato-pbkdf2';

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

/**
 * Coste de los códigos de activación y respaldo.
 *
 * Mucho menor que el de una contraseña, y a propósito: un código de 8
 * caracteres del alfabeto legible trae ~40 bits de aleatoriedad, mientras que
 * una contraseña humana trae bastante menos. El KDF lento existe para compensar
 * esa debilidad, y aquí no hay nada que compensar.
 *
 * Además, **el del respaldo lo verifica el teléfono** —con `@noble/hashes`, en
 * JavaScript puro— el día que no hay señal. Las 600.000 vueltas del panel serían
 * varios segundos de espera en un Android de gama baja. Este número es el mismo
 * que `pin.ts` tiene calibrado contra el equipo real del cliente.
 */
export const ITERACIONES_CODIGO = 120_000;

const LONGITUD_SALT = 16;
const LONGITUD_CLAVE = 32;

/** Mínimo de una contraseña web. Corta de más es peor que corta de menos. */
export const LONGITUD_MINIMA_CLAVE = 10;

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
export async function hashDeClave(
  clave: string,
  iteraciones: number = ITERACIONES_CLAVE,
): Promise<string> {
  const salt = bytesAleatorios(LONGITUD_SALT);
  const claveHex = await derivar(clave, salt, iteraciones);
  return formatearPbkdf2({ iteraciones, saltHex: aHex(salt), claveHex });
}

/**
 * La forma canónica de un código, y **la única que se hashea o se compara**.
 *
 * Los códigos se muestran agrupados —`ELTB-PXS2`— porque así se dictan y se
 * teclean con muchos menos errores, pero esos guiones son presentación. Quien
 * los escribe puede ponerlos o no, en mayúscula o minúscula, con un espacio en
 * medio.
 *
 * Existe porque no tenerlo costó un fallo real: el panel hasheaba el código con
 * sus guiones y el móvil lo comparaba sin ellos, así que **ningún código
 * funcionaba nunca**. Normalizar en los dos extremos por separado es cómo se
 * vuelve a caer en lo mismo; normalizar aquí, una vez, no.
 */
export function normalizarCodigo(codigo: string): string {
  return codigo.trim().toUpperCase().replace(/[\s-]/g, '');
}

/** Hash de un código de activación o de respaldo. Ver `ITERACIONES_CODIGO`. */
export function hashDeCodigo(codigo: string): Promise<string> {
  return hashDeClave(normalizarCodigo(codigo), ITERACIONES_CODIGO);
}

/** Comprueba un código contra su hash, normalizando primero. */
export function verificarCodigo(codigo: string, almacenado: string): Promise<boolean> {
  return verificarClave(normalizarCodigo(codigo), almacenado);
}

/** Verifica sin confiar en las constantes de hoy: lee los parámetros del hash. */
export async function verificarClave(clave: string, almacenado: string): Promise<boolean> {
  const partes = leerPbkdf2(almacenado);
  if (!partes) return false;

  const calculada = await derivar(clave, deHex(partes.saltHex), partes.iteraciones);
  return igualEnTiempoConstante(calculada, partes.claveHex);
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
