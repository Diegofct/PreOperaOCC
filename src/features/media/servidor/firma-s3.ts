/**
 * La firma SigV4 de Amazon, escrita a mano.
 *
 * Cloudflare R2 no tiene una API propia: habla el mismo idioma que Amazon S3, y
 * ese idioma exige que **cada petición vaya firmada** con un HMAC encadenado
 * sobre la fecha, la región y el servicio. No es autenticación por cabecera
 * simple; es un cálculo sobre el método, la ruta, las cabeceras ordenadas y el
 * hash del cuerpo.
 *
 * ── Por qué a mano y no con una librería ──
 *
 * Es lo que pide `AGENTS.md`: no se añaden dependencias sin motivo, y este
 * proyecto ya escribe sus propias primitivas en `src/shared/cripto/`. Son unas
 * cien líneas de aritmética sin estado, verificables contra los **vectores
 * oficiales de AWS** — y lo son, en `scripts/verificar-reglas.ts`. Una firma mal
 * calculada no se degrada: falla entera con un 403 y un mensaje que no dice
 * dónde. Por eso la prueba es lo que permite tocar este archivo sin miedo.
 *
 * ── Por qué `crypto.subtle` ──
 *
 * Es la única primitiva criptográfica que existe **igual** en Node —el VPS,
 * donde va a correr— y en Cloudflare Workers, a donde podría mudarse sin
 * reescribir nada. La misma razón por la que las contraseñas del servidor la
 * usan y las del celular no: ver `src/shared/cripto/formato-pbkdf2.ts`.
 *
 * Módulo puro: sin I/O, sin leer configuración, sin tocar la base. Recibe unas
 * credenciales y devuelve unas cabeceras. Eso es todo lo que hace, y eso es lo
 * que permite probarlo.
 */

const ALGORITMO = 'AWS4-HMAC-SHA256';
const TERMINACION = 'aws4_request';

export interface CredencialesS3 {
  llaveId: string;
  llaveSecreta: string;
  region: string;
  servicio: string;
}

export interface PeticionAFirmar {
  metodo: string;
  url: string;
  /** Sin `host`, `x-amz-date` ni `x-amz-content-sha256`: los pone la firma. */
  cabeceras?: Record<string, string>;
  cuerpo?: Uint8Array;
  /** Inyectable para poder probar contra vectores con fecha fija. */
  instante?: Date;
}

/**
 * Devuelve las cabeceras completas —las recibidas más las tres que añade la
 * firma— listas para dárselas tal cual a `fetch`.
 */
export async function firmarPeticion(
  peticion: PeticionAFirmar,
  credenciales: CredencialesS3,
): Promise<Record<string, string>> {
  const url = new URL(peticion.url);
  const instante = peticion.instante ?? new Date();
  const marcaLarga = marcaDeTiempo(instante);
  const marcaCorta = marcaLarga.slice(0, 8);

  const hashCuerpo = await sha256Hex(peticion.cuerpo ?? new Uint8Array());

  // `host` va siempre firmada: es lo que impide reusar una firma contra otro
  // bucket. Las tres se añaden aquí, y no las pone quien llama, para que no se
  // pueda olvidar ninguna.
  const cabeceras: Record<string, string> = {
    ...peticion.cabeceras,
    host: url.host,
    'x-amz-content-sha256': hashCuerpo,
    'x-amz-date': marcaLarga,
  };

  const nombresOrdenados = Object.keys(cabeceras)
    .map((nombre) => nombre.toLowerCase())
    .sort();
  const cabecerasCanonicas = nombresOrdenados
    .map((nombre) => `${nombre}:${valorDe(cabeceras, nombre)}\n`)
    .join('');
  const cabecerasFirmadas = nombresOrdenados.join(';');

  const peticionCanonica = [
    peticion.metodo.toUpperCase(),
    rutaCanonica(url.pathname),
    consultaCanonica(url.searchParams),
    cabecerasCanonicas,
    cabecerasFirmadas,
    hashCuerpo,
  ].join('\n');

  const alcance = `${marcaCorta}/${credenciales.region}/${credenciales.servicio}/${TERMINACION}`;
  const textoAFirmar = [
    ALGORITMO,
    marcaLarga,
    alcance,
    await sha256Hex(textoABytes(peticionCanonica)),
  ].join('\n');

  const clave = await claveDeFirma(credenciales, marcaCorta);
  const firma = aHex(await hmac(clave, textoABytes(textoAFirmar)));

  return {
    ...cabeceras,
    Authorization:
      `${ALGORITMO} Credential=${credenciales.llaveId}/${alcance}, ` +
      `SignedHeaders=${cabecerasFirmadas}, Signature=${firma}`,
  };
}

/**
 * La clave de firma: cuatro HMAC encadenados.
 *
 * El encadenamiento es lo que hace que una firma solo valga para **un día, una
 * región y un servicio**. Quien intercepte una petición no puede reusar nada de
 * ella al día siguiente, ni contra otro servicio de la misma cuenta.
 */
async function claveDeFirma(credenciales: CredencialesS3, fecha: string): Promise<Uint8Array> {
  const porFecha = await hmac(textoABytes(`AWS4${credenciales.llaveSecreta}`), textoABytes(fecha));
  const porRegion = await hmac(porFecha, textoABytes(credenciales.region));
  const porServicio = await hmac(porRegion, textoABytes(credenciales.servicio));
  return hmac(porServicio, textoABytes(TERMINACION));
}

/** `20150830T123600Z`. Sin guiones ni dos puntos: el formato lo fija AWS. */
function marcaDeTiempo(instante: Date): string {
  return `${instante.toISOString().replace(/[-:]/g, '').slice(0, 15)}Z`;
}

/**
 * Cada segmento de la ruta se normaliza, pero las barras se conservan.
 *
 * Se **descodifica antes de codificar** a propósito. `new URL()` ya entrega el
 * `pathname` percent-encoded, así que codificarlo otra vez convertiría el `%`
 * de `test%24file.text` en `%25` y la firma saldría de una ruta que no existe.
 * Para S3 la regla es una sola pasada de codificación —al revés que en el resto
 * de servicios de AWS, que la exigen doble—, y este es exactamente el fallo que
 * cazaron los vectores de `scripts/verificar-reglas.ts`: aparece solo cuando la
 * clave lleva un carácter especial, un espacio o un acento.
 */
function rutaCanonica(ruta: string): string {
  if (ruta === '') return '/';
  return ruta.split('/').map(codificarSegmento).join('/');
}

function codificarSegmento(segmento: string): string {
  let crudo: string;
  try {
    crudo = decodeURIComponent(segmento);
  } catch {
    // Un `%` suelto no es descodificable. No debería llegar —las claves las
    // arma el servidor—, pero reventar aquí daría un error sin relación
    // aparente con la ruta.
    crudo = segmento;
  }
  return codificarRfc3986(crudo);
}

function consultaCanonica(parametros: URLSearchParams): string {
  const pares: [string, string][] = [];
  parametros.forEach((valor, clave) => pares.push([clave, valor]));

  return pares
    .map(([clave, valor]): [string, string] => [codificarRfc3986(clave), codificarRfc3986(valor)])
    .sort((a, b) => (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : a[1] < b[1] ? -1 : 1))
    .map(([clave, valor]) => `${clave}=${valor}`)
    .join('&');
}

/**
 * AWS exige RFC 3986 estricto: solo quedan sin codificar `A-Z a-z 0-9 - _ . ~`.
 * `encodeURIComponent` deja pasar cinco caracteres de más, y hay que rematarlos.
 */
function codificarRfc3986(texto: string): string {
  return encodeURIComponent(texto).replace(
    /[!'()*]/g,
    (caracter) => `%${caracter.charCodeAt(0).toString(16).toUpperCase()}`,
  );
}

/** El valor canónico de una cabecera: sin espacios en los bordes ni repetidos. */
function valorDe(cabeceras: Record<string, string>, nombre: string): string {
  for (const [clave, valor] of Object.entries(cabeceras)) {
    if (clave.toLowerCase() === nombre) return valor.trim().replace(/\s+/g, ' ');
  }
  return '';
}

async function hmac(clave: Uint8Array, datos: Uint8Array): Promise<Uint8Array> {
  const importada = await crypto.subtle.importKey(
    'raw',
    aBufferPropio(clave),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  return new Uint8Array(await crypto.subtle.sign('HMAC', importada, aBufferPropio(datos)));
}

export async function sha256Hex(datos: Uint8Array): Promise<string> {
  return aHex(new Uint8Array(await crypto.subtle.digest('SHA-256', aBufferPropio(datos))));
}

function textoABytes(texto: string): Uint8Array {
  return new TextEncoder().encode(texto);
}

function aHex(bytes: Uint8Array): string {
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
}

/**
 * Copia los bytes a un `ArrayBuffer` que empieza en cero.
 *
 * `crypto.subtle` no acepta una vista parcial sobre un buffer mayor, y un
 * `Uint8Array` que salió de `subarray` lo es. Sin esta copia la firma saldría
 * distinta según de dónde vinieran los bytes, que es de los fallos más difíciles
 * de ver: el mismo código funciona o no según quién lo llame.
 */
function aBufferPropio(bytes: Uint8Array): ArrayBuffer {
  const copia = new ArrayBuffer(bytes.byteLength);
  new Uint8Array(copia).set(bytes);
  return copia;
}
