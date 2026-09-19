/**
 * El arranque del servidor en producción.
 *
 * `npx expo export --platform web` deja dos carpetas y **ninguna de las dos es
 * un servidor**: `dist/server` es el manifiesto de rutas más el código de cada
 * `+api.ts`, y `dist/client` son los archivos que el navegador descarga. Este
 * archivo es lo que las convierte en algo que escucha en un puerto.
 *
 * ── Por qué CommonJS y no un módulo ──
 *
 * Porque el build ESM de `expo-server` no carga en Node: sus imports internos
 * van sin extensión (`./abstract`) y el resolvedor de módulos de Node los
 * rechaza con `ERR_MODULE_NOT_FOUND`. El build CommonJS del mismo paquete sí
 * carga, y es además el que el propio adaptador usa para cargar las rutas de
 * `dist/server`. No es una preferencia de estilo: es la única vía que funciona.
 *
 * ── Por qué sirve los estáticos a mano ──
 *
 * El adaptador de Expo **solo lee dentro de `dist/server`**: resuelve rutas,
 * ejecuta los `+api.ts` y devuelve el HTML. De `dist/client` no sabe nada. Si
 * este archivo no los sirviera, el panel cargaría su HTML y se quedaría en
 * blanco, porque su JavaScript respondería 404 — un fallo que no se ve hasta
 * abrir el navegador y que no dice qué pasa.
 *
 * Se hace con `node:fs` y no con una librería porque son treinta líneas y
 * añadir una dependencia al servidor de producción para esto no se sostiene.
 *
 * ── Lo que este archivo NO hace ──
 *
 * No termina TLS, no redirige de http a https y no sabe qué dominio lo llama.
 * De eso se encarga el proxy que ya está instalado en el VPS. Aquí se escucha
 * en el bucle local y nada más: ver `compose.yaml`.
 *
 * Tampoco lee ningún secreto. Las credenciales las leen las rutas de API en el
 * momento de cada petición, con `process.env`.
 */
const fs = require('node:fs');
const http = require('node:http');
const path = require('node:path');

const { createRequestHandler } = require('expo-server/adapter/http');

const RAIZ = path.resolve(process.env.DIST ?? 'dist');
const CLIENTE = path.join(RAIZ, 'client');
const SERVIDOR = path.join(RAIZ, 'server');
const PUERTO = Number(process.env.PORT ?? 3000);

/**
 * Arrancar sin el bundle es el error más fácil de cometer —olvidar el export,
 * copiar mal la carpeta— y el más confuso de diagnosticar: el servidor levanta
 * y responde 404 a todo. Mejor no levantar y decir por qué.
 */
for (const carpeta of [CLIENTE, SERVIDOR]) {
  if (!fs.existsSync(carpeta)) {
    console.error(
      `No encuentro ${carpeta}.\n` +
        'Hay que correr `npx expo export --platform web` antes de arrancar, ' +
        'o apuntar la variable DIST a donde esté el bundle.',
    );
    process.exit(1);
  }
}

const TIPOS = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.ico': 'image/x-icon',
  '.jpeg': 'image/jpeg',
  '.jpg': 'image/jpeg',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.map': 'application/json; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.otf': 'font/otf',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.ttf': 'font/ttf',
  '.txt': 'text/plain; charset=utf-8',
  '.webp': 'image/webp',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
};

/**
 * El archivo de `dist/client` que corresponde a esta petición, o `null`.
 *
 * El `resolve` más la comprobación de prefijo es lo que impide que un
 * `..%2f..%2fetc%2fpasswd` salga de la carpeta. No es teórico: es la primera
 * cosa que prueba cualquiera contra un servidor que sirve archivos.
 */
function archivoDelCliente(url) {
  let ruta;
  try {
    ruta = decodeURIComponent(new URL(url, 'http://localhost').pathname);
  } catch {
    return null;
  }

  const destino = path.resolve(CLIENTE, `.${ruta}`);
  if (destino !== CLIENTE && !destino.startsWith(CLIENTE + path.sep)) return null;

  return fs.existsSync(destino) && fs.statSync(destino).isFile() ? destino : null;
}

/**
 * Todo lo que Metro emite lleva el hash del contenido en el nombre, así que un
 * archivo nunca cambia: se puede guardar para siempre. El favicon no lo lleva,
 * y por eso se revalida.
 */
function cacheDe(archivo) {
  const relativo = path.relative(CLIENTE, archivo);
  const conHuella = relativo.startsWith('_expo') || relativo.startsWith('assets');
  return conHuella ? 'public, max-age=31536000, immutable' : 'public, max-age=0, must-revalidate';
}

const manejarRuta = createRequestHandler({ build: SERVIDOR });

http
  .createServer((peticion, respuesta) => {
    // Los estáticos van primero: son coincidencias exactas de archivo y salen
    // sin tocar el manifiesto de rutas.
    if (peticion.method === 'GET' || peticion.method === 'HEAD') {
      const archivo = archivoDelCliente(peticion.url ?? '/');
      if (archivo) {
        respuesta.writeHead(200, {
          'Content-Type': TIPOS[path.extname(archivo).toLowerCase()] ?? 'application/octet-stream',
          'Content-Length': fs.statSync(archivo).size,
          'Cache-Control': cacheDe(archivo),
        });
        if (peticion.method === 'HEAD') {
          respuesta.end();
          return;
        }
        fs.createReadStream(archivo).pipe(respuesta);
        return;
      }
    }

    void manejarRuta(peticion, respuesta, (error) => {
      // El adaptador no puede propagar un fallo hacia arriba —`http` no espera
      // funciones asíncronas—, así que lo entrega aquí. Se registra entero en
      // el servidor y hacia fuera solo sale que algo falló: un rastro de pila
      // en el navegador dice más de la cuenta.
      if (error) console.error(error);
      if (respuesta.headersSent) {
        respuesta.end();
        return;
      }
      respuesta.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
      respuesta.end('Error interno del servidor.');
    });
  })
  .listen(PUERTO, () => {
    console.log(`Servidor escuchando en el puerto ${PUERTO}. Bundle: ${RAIZ}`);
  });
