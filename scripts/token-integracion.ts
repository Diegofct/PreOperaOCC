/**
 * Emite un token para una integración de n8n: WhatsApp (spec 021) o el Drive de la obra
 * (spec 052). Cada una tiene el suyo: el de una no abre la otra.
 *
 *   npx tsx scripts/token-integracion.ts          # WhatsApp
 *   npx tsx scripts/token-integracion.ts drive    # el Drive de la obra
 *
 * Imprime dos líneas:
 *
 *  · `TOKEN=…` — va en n8n, en la credencial que manda `Authorization: Bearer …`.
 *    **No se guarda en ningún otro sitio**: si se pierde, se emite otro.
 *  · `TOKEN_INTEGRACION_WHATSAPP=…` (o `TOKEN_INTEGRACION_DRIVE=…`) — el hash; va en el `.env` del servidor
 *    (el de desarrollo o el del VPS). Es lo único que el servidor conoce.
 *
 * Emitir uno nuevo y cambiar el hash en el `.env` revoca el anterior: n8n deja de
 * entrar hasta que se le ponga el token nuevo. Es la forma de rotarlo si se filtra.
 *
 * El token son 32 bytes aleatorios en hexadecimal, del generador del sistema: no
 * es una contraseña que alguien elija, y por eso basta un SHA-256 para guardarlo
 * (ver `guardia-integracion.ts`).
 */
import { hashDeTokenDeIntegracion, type VariableDeIntegracion } from '../src/features/servidor/guardia-integracion';
import { aHex } from '../src/shared/cripto/formato-pbkdf2';

const VARIABLES: Record<string, VariableDeIntegracion> = {
  whatsapp: 'TOKEN_INTEGRACION_WHATSAPP',
  drive: 'TOKEN_INTEGRACION_DRIVE',
};

async function principal() {
  const cual = (process.argv[2] ?? 'whatsapp').toLowerCase();
  const variable = VARIABLES[cual];
  if (!variable) throw new Error(`No hay una integración «${cual}». Son: ${Object.keys(VARIABLES).join(', ')}.`);
  const token = aHex(crypto.getRandomValues(new Uint8Array(32)));
  const hash = await hashDeTokenDeIntegracion(token);
  console.log(`TOKEN=${token}`);
  console.log(`${variable}=${hash}`);
}

principal().catch((error) => {
  console.error('No se pudo emitir el token:', error);
  process.exit(1);
});
