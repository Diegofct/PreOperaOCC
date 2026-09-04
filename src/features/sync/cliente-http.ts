/**
 * Las llamadas del teléfono al servidor.
 *
 * Dos reglas gobiernan este archivo, y las dos vienen de que el operador trabaja
 * sin señal:
 *
 *  1. **Nada de aquí puede bloquear una pantalla.** Todo lo que llama a esto
 *     corre por detrás; si falla, falla en silencio y se reintenta luego. La
 *     interfaz no espera nunca a una respuesta del servidor — esa es la razón de
 *     ser de toda la arquitectura local-first.
 *
 *  2. **Un 401 se resuelve solo, una vez.** El access token dura una hora, así
 *     que caduca constantemente entre sincronizaciones. Refrescarlo y reintentar
 *     es lo normal, no un caso de error; si el refresco también falla, entonces
 *     sí hay que volver a activar el equipo y eso lo decide quien llamó.
 */
import {
  guardarTokens,
  leerAccessToken,
  leerRefreshToken,
} from '@/features/auth/almacen';

import { urlDelServidor } from './servidor';

/** Un fallo que quien llama puede distinguir de "no había red". */
export class ErrorDelServidor extends Error {
  readonly estado: number;
  /** El equipo tiene que volver a activarse: ni el refresco sirvió. */
  readonly exigeReactivar: boolean;

  constructor(mensaje: string, estado: number, exigeReactivar = false) {
    super(mensaje);
    this.name = 'ErrorDelServidor';
    this.estado = estado;
    this.exigeReactivar = exigeReactivar;
    // Sin esto, `instanceof` falla al rebajar la clase a ES5.
    Object.setPrototypeOf(this, ErrorDelServidor.prototype);
  }
}

/** Sin red. Es lo normal en obra, no un error que haya que enseñar. */
export class SinConexion extends Error {
  constructor() {
    super('Sin conexión.');
    this.name = 'SinConexion';
    Object.setPrototypeOf(this, SinConexion.prototype);
  }
}

/**
 * Corta a los 20 segundos.
 *
 * En obra la red no suele estar caída del todo: está tan mal que una petición
 * puede quedarse colgada minutos. Un corte explícito devuelve el control y deja
 * reintentar cuando la señal mejore.
 */
const TIEMPO_LIMITE_MS = 20_000;

async function llamar(ruta: string, opciones: RequestInit, token: string | null): Promise<Response> {
  const control = new AbortController();
  const corte = setTimeout(() => control.abort(), TIEMPO_LIMITE_MS);

  try {
    return await fetch(`${urlDelServidor()}${ruta}`, {
      ...opciones,
      signal: control.signal,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...opciones.headers,
      },
    });
  } catch {
    throw new SinConexion();
  } finally {
    clearTimeout(corte);
  }
}

async function leerCuerpo<T>(respuesta: Response): Promise<T> {
  const cuerpo: unknown = await respuesta.json().catch(() => null);

  if (!respuesta.ok) {
    const detalle = cuerpo as { error?: string } | null;
    throw new ErrorDelServidor(
      detalle?.error ?? `El servidor respondió ${respuesta.status}.`,
      respuesta.status,
    );
  }
  return cuerpo as T;
}

/** Una llamada que no necesita token: activar el equipo. */
export async function pedirSinToken<T>(ruta: string, datos: unknown): Promise<T> {
  return leerCuerpo<T>(await llamar(ruta, { method: 'POST', body: JSON.stringify(datos) }, null));
}

/**
 * Una llamada autenticada, con refresco automático si el token caducó.
 *
 * El reintento es **uno solo**: si tras refrescar sigue dando 401, el problema
 * no es el token y volver a intentar solo alargaría la espera.
 */
export async function pedirConToken<T>(ruta: string, opciones: RequestInit = {}): Promise<T> {
  const token = await leerAccessToken();
  if (!token) throw new ErrorDelServidor('Este equipo no está activado.', 401, true);

  const primera = await llamar(ruta, opciones, token);
  if (primera.status !== 401) return leerCuerpo<T>(primera);

  const nuevo = await refrescar();
  return leerCuerpo<T>(await llamar(ruta, opciones, nuevo));
}

async function refrescar(): Promise<string> {
  const refreshToken = await leerRefreshToken();
  if (!refreshToken) throw new ErrorDelServidor('Este equipo no está activado.', 401, true);

  const respuesta = await llamar(
    '/api/movil/refrescar',
    { method: 'POST', body: JSON.stringify({ refreshToken }) },
    null,
  );

  if (!respuesta.ok) {
    // El refresh token ya no vale: lo revocaron, o alguien más lo usó. Hay que
    // volver a activar el equipo, y eso lo decide la pantalla, no este archivo.
    throw new ErrorDelServidor(
      'Este equipo tiene que volver a activarse con un código.',
      respuesta.status,
      true,
    );
  }

  const { accessToken, refreshToken: rotado } = await respuesta.json();
  await guardarTokens(accessToken, rotado);
  return accessToken;
}
