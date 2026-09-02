/**
 * Criptografía del PIN del operador.
 *
 * PBKDF2-SHA256 de `@noble/hashes`: JavaScript puro, que es lo que permite que
 * corra dentro de Hermes. Eso descarta bcrypt y argon2, que son binarios
 * nativos y no entran en el bundle.
 *
 * El salt es **propio de este dispositivo**. Comprometer un celular no expone
 * un verificador reutilizable contra el servidor ni contra otro equipo.
 */
import { pbkdf2Async } from '@noble/hashes/pbkdf2.js';
import { sha256 } from '@noble/hashes/sha2.js';
import * as Crypto from 'expo-crypto';

import { igualEnTiempoConstante } from '@/shared/cripto/comparar';

export const LONGITUD_PIN = 6;

/**
 * Presupuesto: 400 ms en el Android de gama baja del cliente.
 *
 * Si en el equipo real tarda más, bajar este número y anotar aquí en cuánto
 * quedó y en qué equipo se midió. `medirCostoDelPin()` da la cifra.
 */
export const ITERACIONES = 120_000;

const LONGITUD_CLAVE = 32;
const LONGITUD_SALT = 32;

/** Cede el hilo cada 4 ms para que la animación del teclado no se congele. */
const CEDER_CADA_MS = 4;

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

/** Salt nuevo para este dispositivo. Se genera una sola vez, al enrolar. */
export function generarSalt(): string {
  return aHex(Crypto.getRandomBytes(LONGITUD_SALT));
}

export async function derivarVerificador(pin: string, saltHex: string): Promise<string> {
  const bytes = await pbkdf2Async(sha256, pin, deHex(saltHex), {
    c: ITERACIONES,
    dkLen: LONGITUD_CLAVE,
    asyncTick: CEDER_CADA_MS,
  });
  return aHex(bytes);
}

export async function verificarPin(
  pin: string,
  saltHex: string,
  verificadorHex: string,
): Promise<boolean> {
  const calculado = await derivarVerificador(pin, saltHex);
  return igualEnTiempoConstante(calculado, verificadorHex);
}

export function esPinValido(pin: string): boolean {
  return pin.length === LONGITUD_PIN && /^\d+$/.test(pin);
}

/** Cuánto tarda una validación en este equipo, en ms. Para calibrar. */
export async function medirCostoDelPin(): Promise<number> {
  const salt = generarSalt();
  const inicio = Date.now();
  await derivarVerificador('000000', salt);
  return Date.now() - inicio;
}
