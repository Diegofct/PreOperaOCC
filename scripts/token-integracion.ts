/**
 * Emite un token para la integración de WhatsApp (spec 021).
 *
 *   npx tsx scripts/token-integracion.ts
 *
 * Imprime dos líneas:
 *
 *  · `TOKEN=…` — va en n8n, en la credencial que manda `Authorization: Bearer …`.
 *    **No se guarda en ningún otro sitio**: si se pierde, se emite otro.
 *  · `TOKEN_INTEGRACION_WHATSAPP=…` — el hash; va en el `.env` del servidor
 *    (el de desarrollo o el del VPS). Es lo único que el servidor conoce.
 *
 * Emitir uno nuevo y cambiar el hash en el `.env` revoca el anterior: n8n deja de
 * entrar hasta que se le ponga el token nuevo. Es la forma de rotarlo si se filtra.
 *
 * El token son 32 bytes aleatorios en hexadecimal, del generador del sistema: no
 * es una contraseña que alguien elija, y por eso basta un SHA-256 para guardarlo
 * (ver `guardia-integracion.ts`).
 */
import { hashDeTokenDeIntegracion } from '../src/features/servidor/guardia-integracion';
import { aHex } from '../src/shared/cripto/formato-pbkdf2';

async function principal() {
  const token = aHex(crypto.getRandomValues(new Uint8Array(32)));
  const hash = await hashDeTokenDeIntegracion(token);
  console.log(`TOKEN=${token}`);
  console.log(`TOKEN_INTEGRACION_WHATSAPP=${hash}`);
}

principal().catch((error) => {
  console.error('No se pudo emitir el token:', error);
  process.exit(1);
});
