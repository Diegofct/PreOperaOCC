/**
 * Los tokens del móvil.
 *
 * Dos piezas con vidas muy distintas, y la diferencia es deliberada:
 *
 *  · **Access token** — un JWT firmado, de una hora. **No se guarda en la base.**
 *    El servidor lo verifica con su propia firma, así que cada petición del
 *    celular se resuelve sin un viaje a Neon. Con decenas de equipos sincronizando
 *    a la vez, esa consulta que no se hace es la diferencia entre un pull rápido
 *    y uno que se arrastra.
 *
 *  · **Refresh token** — 32 bytes opacos que viven meses en el teléfono y de los
 *    que la base solo guarda el SHA-256. Es lo que permite revocar un equipo
 *    perdido: se borra su fila y el siguiente refresco falla.
 *
 * El precio de no consultar la base en cada petición es que **un access token ya
 * emitido sigue valiendo hasta que caduque**, aunque se revoque el equipo. Una
 * hora de ventana, a cambio de no golpear Postgres en cada llamada de cada
 * celular de la obra. Con un secreto rotable si hiciera falta cortar en seco.
 */
import { ErrorDeConfiguracion } from '@/features/servidor/configuracion';
import { igualEnTiempoConstante } from '@/shared/cripto/comparar';

export const VIDA_ACCESS_MS = 60 * 60 * 1000;

export interface ContenidoDelToken {
  /** Id del usuario. */
  sub: string;
  /** Id del dispositivo, para poder revocar uno sin tocar a los demás. */
  dis: string;
  /** Caducidad, en segundos epoch (la convención de JWT). */
  exp: number;
}

function secreto(): Uint8Array {
  const valor = process.env.SECRETO_TOKENS;
  if (!valor || valor.length < 32) {
    throw new ErrorDeConfiguracion(
      'Falta SECRETO_TOKENS en el archivo .env (mínimo 32 caracteres). Es lo que firma los ' +
        'tokens de los celulares. Genere uno con: node -e "console.log(require(\'crypto\').randomBytes(48).toString(\'hex\'))"',
    );
  }
  return new TextEncoder().encode(valor);
}

/* Base64url sin relleno, que es lo que exige el formato JWT. */

function aBase64Url(bytes: Uint8Array): string {
  let binario = '';
  for (const byte of bytes) binario += String.fromCharCode(byte);
  return btoa(binario).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function deBase64Url(texto: string): Uint8Array {
  const relleno = texto.replace(/-/g, '+').replace(/_/g, '/');
  const binario = atob(relleno + '='.repeat((4 - (relleno.length % 4)) % 4));
  const bytes = new Uint8Array(binario.length);
  for (let i = 0; i < binario.length; i++) bytes[i] = binario.charCodeAt(i);
  return bytes;
}

const textoA = (valor: string) => new TextEncoder().encode(valor);

async function firmar(datos: string): Promise<string> {
  const clave = await crypto.subtle.importKey(
    'raw',
    secreto() as BufferSource,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const firma = await crypto.subtle.sign('HMAC', clave, textoA(datos) as BufferSource);
  return aBase64Url(new Uint8Array(firma));
}

export async function emitirAccessToken(usuarioId: string, dispositivoId: string): Promise<string> {
  const cabecera = aBase64Url(textoA(JSON.stringify({ alg: 'HS256', typ: 'JWT' })));
  const contenido: ContenidoDelToken = {
    sub: usuarioId,
    dis: dispositivoId,
    exp: Math.floor((Date.now() + VIDA_ACCESS_MS) / 1000),
  };
  const cuerpo = aBase64Url(textoA(JSON.stringify(contenido)));
  const datos = `${cabecera}.${cuerpo}`;
  return `${datos}.${await firmar(datos)}`;
}

/**
 * Verifica y devuelve el contenido, o `null`.
 *
 * Devuelve `null` para todo lo que no sea un token válido y vigente —firma mala,
 * formato roto, caducado— sin distinguir el motivo hacia afuera: al cliente le
 * sirve lo mismo, y el detalle solo le serviría a quien esté probando firmas.
 */
export async function leerAccessToken(token: string): Promise<ContenidoDelToken | null> {
  const partes = token.split('.');
  if (partes.length !== 3) return null;

  const [cabecera, cuerpo, firma] = partes;

  const esperada = await firmar(`${cabecera}.${cuerpo}`);
  if (!igualEnTiempoConstante(firma, esperada)) return null;

  try {
    const contenido = JSON.parse(new TextDecoder().decode(deBase64Url(cuerpo))) as ContenidoDelToken;
    if (typeof contenido.sub !== 'string' || typeof contenido.dis !== 'string') return null;
    if (typeof contenido.exp !== 'number' || contenido.exp * 1000 <= Date.now()) return null;
    return contenido;
  } catch {
    return null;
  }
}

/** Lee el `Authorization: Bearer …` de la petición. */
export function tokenDeLaPeticion(peticion: Request): string | null {
  const cabecera = peticion.headers.get('authorization');
  if (!cabecera?.startsWith('Bearer ')) return null;
  const token = cabecera.slice('Bearer '.length).trim();
  return token.length > 0 ? token : null;
}
