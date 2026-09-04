/**
 * El formato de un hash PBKDF2, leído y escrito en un solo sitio.
 *
 * `pbkdf2$sha256$<iteraciones>$<salt hex>$<clave derivada hex>`
 *
 * Existe porque **las dos mitades del sistema tienen que entender el mismo
 * texto, pero no pueden compartir el cálculo.** El servidor deriva con
 * `crypto.subtle`, que es nativo y rápido; el teléfono con `@noble/hashes`,
 * porque Hermes no trae `crypto.subtle` completo. Lo único que sí puede ser
 * común es el formato — y tiene que serlo, o un hash escrito por el servidor
 * sería ilegible para el celular.
 *
 * Eso es exactamente lo que hace posible el código de respaldo: el servidor lo
 * hashea al emitirlo, el teléfono se guarda ese texto al activarse, y el día que
 * el operador olvida su PIN **en un frente sin señal**, el celular puede
 * comprobar el código contra ese hash sin preguntarle a nadie.
 *
 * Los parámetros van dentro del texto a propósito: permite subir el coste sin
 * migrar ni una fila, y que cada tipo de secreto tenga el suyo —una contraseña
 * humana necesita muchas más vueltas que un código de 8 caracteres aleatorios.
 *
 * Módulo puro: sin I/O y sin criptografía. Solo lee y escribe la cadena.
 */

export interface HashPbkdf2 {
  iteraciones: number;
  saltHex: string;
  claveHex: string;
}

export function formatearPbkdf2({ iteraciones, saltHex, claveHex }: HashPbkdf2): string {
  return `pbkdf2$sha256$${iteraciones}$${saltHex}$${claveHex}`;
}

/** Devuelve `null` ante cualquier cosa que no sea el formato exacto. */
export function leerPbkdf2(almacenado: string): HashPbkdf2 | null {
  const partes = almacenado.split('$');
  if (partes.length !== 5) return null;

  const [algoritmo, digest, iteracionesTexto, saltHex, claveHex] = partes;
  if (algoritmo !== 'pbkdf2' || digest !== 'sha256') return null;

  const iteraciones = Number(iteracionesTexto);
  if (!Number.isInteger(iteraciones) || iteraciones <= 0) return null;
  if (!esHex(saltHex) || !esHex(claveHex)) return null;

  return { iteraciones, saltHex, claveHex };
}

function esHex(texto: string): boolean {
  return texto.length > 0 && texto.length % 2 === 0 && /^[0-9a-f]+$/i.test(texto);
}

export function aHex(bytes: Uint8Array): string {
  let salida = '';
  for (const byte of bytes) salida += byte.toString(16).padStart(2, '0');
  return salida;
}

export function deHex(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < bytes.length; i++) bytes[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  return bytes;
}
