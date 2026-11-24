/**
 * La tercera puerta: la de las integraciones de n8n, WhatsApp (spec 021, RF-2 y RF-3) y el
 * Drive de la obra (spec 052, RF-2 y RF-3).
 *
 * El panel entra con cookie (`guardia.ts`) y el celular con su token firmado
 * (`guardia-movil.ts`). n8n no es ninguno de los dos: no tiene persona detrás, no
 * inicia sesión y no tiene un equipo activado. Prestarle una de esas dos puertas
 * sería mezclar superficies (constitución 6) —con la cookie de una cuenta «robot»
 * se entraría al panel; con un token de celular, a la sincronización—. Así que
 * tiene la suya, y **solo abre las rutas de `/api/integraciones/`**.
 *
 * ── Un token por integración ──
 *
 * Cada integración tiene su variable: `TOKEN_INTEGRACION_WHATSAPP` y, desde la spec 052,
 * `TOKEN_INTEGRACION_DRIVE`. Si se filtra uno, el otro no queda abierto, y cada uno se
 * revoca por su lado. Por eso la ruta **dice** qué variable exige, sin valor por defecto:
 * una ruta nueva que olvidara decirlo heredaría en silencio la puerta de otra. La
 * verificación comprueba que cada ruta de `integraciones/<puerta>/` pide la de su puerta.
 *
 * ── El token y su hash ──
 *
 * n8n manda `Authorization: Bearer <token>`. El servidor no guarda el token sino
 * su SHA-256 en hexadecimal, en la variable de su integración: un `.env` que se
 * filtre no da el token. Un hash simple y no PBKDF2 a propósito: el token es
 * aleatorio y largo, no una contraseña que alguien pudiera adivinar con un
 * diccionario, y la guardia corre en cada mensaje.
 *
 * ── Cerrada por defecto ──
 *
 * Sin la variable, o con un valor que no es un hash, **no entra nadie**. Una
 * guardia que con la configuración incompleta dejara pasar todo es el peor fallo
 * posible, y no se notaría hasta que alguien llenara la bandeja de basura.
 *
 * Para emitir un token nuevo: `npx tsx scripts/token-integracion.ts` (WhatsApp) o
 * `npx tsx scripts/token-integracion.ts drive`. Imprime el token (va a n8n) y su hash
 * (va al `.env`). Cambiar el hash revoca el anterior.
 */
import { igualEnTiempoConstante } from '@/shared/cripto/comparar';
import { aHex } from '@/shared/cripto/formato-pbkdf2';

import { errorDePeticion } from './respuestas';

/** La variable del `.env` con el hash del token de cada integración. */
export type VariableDeIntegracion = 'TOKEN_INTEGRACION_WHATSAPP' | 'TOKEN_INTEGRACION_DRIVE';

/** SHA-256 en hexadecimal: 64 caracteres. */
const HASH = /^[0-9a-f]{64}$/;

/** El SHA-256 en hexadecimal de un token. Lo usan la guardia y el script que lo emite. */
export async function hashDeTokenDeIntegracion(token: string): Promise<string> {
  const resumen = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(token));
  return aHex(new Uint8Array(resumen));
}

/**
 * ¿La cabecera trae el token cuyo hash está configurado? Pura salvo el hash: no
 * lee el entorno, para poder probarla con cualquier valor.
 */
export async function tokenDeIntegracionValido(
  cabecera: string | null,
  hashConfigurado: string | undefined,
): Promise<boolean> {
  const esperado = hashConfigurado?.trim().toLowerCase();
  if (!esperado || !HASH.test(esperado)) return false;
  if (!cabecera?.startsWith('Bearer ')) return false;
  const token = cabecera.slice('Bearer '.length).trim();
  if (token.length === 0) return false;
  return igualEnTiempoConstante(await hashDeTokenDeIntegracion(token), esperado);
}

/**
 * Exige el token de la integración. Devuelve `null` si pasa, o la respuesta de
 * rechazo, con la misma forma de uso que las otras dos guardias:
 *
 *     const rechazo = await requerirIntegracion(peticion, 'TOKEN_INTEGRACION_DRIVE');
 *     if (rechazo) return rechazo;
 *
 * Un solo mensaje para todo rechazo: decir si faltó la cabecera o si el token no
 * coincide le ayudaría solo a quien está probando tokens.
 */
export async function requerirIntegracion(
  peticion: Request,
  variable: VariableDeIntegracion,
): Promise<Response | null> {
  const valido = await tokenDeIntegracionValido(peticion.headers.get('authorization'), process.env[variable]);
  return valido ? null : errorDePeticion('La integración no está autorizada.', 401);
}
