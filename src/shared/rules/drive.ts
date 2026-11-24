/**
 * El Drive de la obra (spec 052). Reglas puras: sin I/O, como todo `shared/rules`.
 *
 * Aquí se decide qué se lee y cómo se muestra, para que el servidor que ingiere, el
 * pulso que lee y la pantalla que lista hablen de lo mismo:
 *
 * - **La clase sale del mime, y el nombre solo desempata.** n8n manda lo propio de
 *   Google con el mime de su exportación (Word y Excel, RF-7), pero si un día llega el
 *   mime nativo `vnd.google-apps.*` se lee igual. Solo cuando el mime no dice nada
 *   (`application/octet-stream`, vacío) se mira la extensión: un mime que dice video
 *   gana sobre un nombre `.pdf`.
 * - **Word y Excel viejos (.doc, .xls) cuentan como Word y Excel.** No se leen, pero
 *   quien lo dice es el lector, con un motivo útil («guárdelo como .docx o PDF»); como
 *   «tipo no admitido» se perdería esa salida.
 * - **Las imágenes son solo las que la IA recibe** (JPEG, PNG, WEBP, GIF). Una HEIC del
 *   iPhone es «tipo no admitido», no un fallo de lectura que se reintenta.
 * - **Pendiente y leyendo se muestran igual, «Leyendo»** (RF-30): para quien mira la
 *   lista la diferencia es de la cola, no del documento. Y **retirado gana** sobre
 *   cualquier estado de lectura, porque lo que importa es que ya no está en el Drive.
 */
import { extensionDe } from './documentos';
import { normalizar } from './texto';

/** Lo de más de 50 MB no se copia ni se lee: se abre en el Drive (RF-40, D12). */
export const TAMANO_MAXIMO_DE_LECTURA = 50 * 1024 * 1024;

/**
 * Si unos bytes pasan del tope (RF-40, D12). Justo 50 MB todavía se copia. Sin un número
 * útil (una cabecera `content-length` ausente o mal escrita) no se decide: decide el
 * cuerpo leído.
 */
export function pasaDelTopeDeLectura(bytes: number | null): boolean {
  return bytes !== null && Number.isFinite(bytes) && bytes > TAMANO_MAXIMO_DE_LECTURA;
}

/** Veces que se reintenta una lectura que falló por una causa pasajera (RF-16). */
export const INTENTOS_DE_LECTURA = 3;

/** El motivo que se escribe cuando el archivo pasa del tope (RF-40). */
export const MOTIVO_DEMASIADO_GRANDE = 'demasiado grande';

export type ClaseDeArchivoDelDrive = 'pdf' | 'imagen' | 'word' | 'excel' | 'texto' | 'no_admitido';

const POR_MIME: Record<string, ClaseDeArchivoDelDrive> = {
  'application/pdf': 'pdf',
  'image/jpeg': 'imagen',
  'image/png': 'imagen',
  'image/webp': 'imagen',
  'image/gif': 'imagen',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'word',
  'application/msword': 'word',
  'application/vnd.google-apps.document': 'word',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'excel',
  'application/vnd.ms-excel': 'excel',
  'application/vnd.google-apps.spreadsheet': 'excel',
  'text/plain': 'texto',
  'text/csv': 'texto',
};

const POR_EXTENSION: Record<string, ClaseDeArchivoDelDrive> = {
  pdf: 'pdf',
  jpg: 'imagen',
  jpeg: 'imagen',
  png: 'imagen',
  webp: 'imagen',
  gif: 'imagen',
  docx: 'word',
  doc: 'word',
  xlsx: 'excel',
  xls: 'excel',
  txt: 'texto',
  csv: 'texto',
};

/** Los mimes que no dicen qué es el archivo: ahí decide la extensión. */
const MIMES_SIN_INFORMACION = new Set(['', 'application/octet-stream', 'binary/octet-stream']);

/** Cómo se lee un archivo del Drive, por su mime y, si el mime no dice nada, por su nombre. */
export function claseDeArchivoDelDrive(mime: string, nombre: string): ClaseDeArchivoDelDrive {
  const base = mime.split(';')[0].trim().toLowerCase();
  if (!MIMES_SIN_INFORMACION.has(base)) return POR_MIME[base] ?? 'no_admitido';
  return POR_EXTENSION[extensionDe(nombre)] ?? 'no_admitido';
}

/* ── El inventario (RF-1, RF-4, RF-6, RF-17, RF-19 a RF-21, RF-40) ─────────── */

/**
 * Cada entrega de n8n es el listado **completo** de la carpeta, no los cambios: el servidor
 * los deduce comparando con lo que tiene, y n8n no guarda estado (plan, «Decisiones
 * técnicas»). De ahí salen todas las reglas:
 *
 * - **Una versión es una fecha de modificación.** Se pide solo si es posterior a todas las
 *   que ya hay; igual o anterior no pide nada, porque la base ya la tiene o porque es un
 *   listado viejo que llegó tarde (RF-4). Las fechas se comparan como instantes, no como
 *   texto: `05:00-05:00` y `10:00Z` son la misma.
 * - **Renombrar o mover no es una versión nueva** (RF-21): el archivo es el mismo por su
 *   `driveId`, y solo cambian el nombre y la subcarpeta.
 * - **Lo de más de 50 MB no se pide** (RF-40, D12): se registra la versión sin copia.
 * - **Retirar es lo único peligroso**, porque un listado a medias de Google se vería igual
 *   que un borrado masivo. Lo frena `inventarioAceptable`, y entonces se aplican las altas
 *   y los cambios pero no los retiros (riesgo 1). Volver a estar (RF-20) no se frena: un
 *   archivo que aparece en el listado está, sin duda.
 */

/** Un archivo como lo manda n8n en cada entrega. */
export interface ArchivoDelInventario {
  driveId: string;
  nombre: string;
  /** La subcarpeta dentro de la raíz, «Oficios/2026»; vacía en la raíz. */
  ruta: string;
  mime: string;
  /** Fecha de modificación en el Drive, ISO 8601. */
  modificadoEn: string;
  tamano: number;
  /** La dirección del archivo en Drive; `null` si n8n no la mandó (RF-41). */
  enlace: string | null;
}

export interface InventarioDelDrive {
  /** Solo si n8n listó todas las subcarpetas sin error. */
  completo: boolean;
  archivos: readonly ArchivoDelInventario[];
}

/** Un archivo como ya está en la base. */
export interface ArchivoRegistrado {
  driveId: string;
  nombre: string;
  subcarpeta: string;
  retirado: boolean;
  /** La fecha de Drive más reciente de sus versiones; `null` si todavía no tiene ninguna. */
  ultimaModificacion: string | null;
}

export interface VersionPedida {
  driveId: string;
  modificadoEn: string;
}

export interface CambiosDelInventario {
  /** Archivos que no estaban registrados: hay que crearlos (RF-1, RF-6). */
  nuevos: ArchivoDelInventario[];
  /** Versiones que n8n tiene que subir (RF-1, RF-17). */
  pedir: VersionPedida[];
  /** Versiones de más de 50 MB: se registran sin copia, «demasiado grande» (RF-40). */
  demasiadoGrandes: VersionPedida[];
  /** Registrados con otro nombre u otra subcarpeta (RF-21). */
  renombrados: { driveId: string; nombre: string; subcarpeta: string }[];
  /** Vigentes que ya no están: se marcan retirados (RF-19). Vacío si el inventario no es aceptable. */
  retirar: string[];
  /** Retirados que volvieron (RF-20). */
  vuelven: string[];
  /** Cuántos se habrían retirado y no se retiraron porque el inventario no era aceptable. */
  retirosRetenidos: number;
}

/** A partir de cuántos retiros de una vez una caída de más de la mitad se toma por sospechosa. */
const RETIROS_SIN_SOSPECHA = 10;

/**
 * Si los retiros de una entrega se pueden aplicar (riesgo 1). No, si el listado no vino
 * completo, o si retiraría más de la mitad de los vigentes de una vez y más de 10: una
 * carpeta chica que se limpia es normal; treinta oficios que desaparecen juntos, no.
 */
export function inventarioAceptable(datos: { completo: boolean; vigentes: number; aRetirar: number }): boolean {
  if (datos.aRetirar === 0) return true;
  if (!datos.completo) return false;
  return !(datos.aRetirar > RETIROS_SIN_SOSPECHA && datos.aRetirar * 2 > datos.vigentes);
}

/** La subcarpeta sin barras en los bordes, para que «/Oficios/» y «Oficios» sean la misma. */
function subcarpetaDe(ruta: string): string {
  return ruta.trim().replace(/^\/+|\/+$/g, '');
}

/** Si `fecha` es posterior a `registrada`, como instantes. Sin registrada, siempre. */
function esPosterior(fecha: string, registrada: string | null): boolean {
  if (registrada === null) return true;
  const nueva = Date.parse(fecha);
  const vieja = Date.parse(registrada);
  if (Number.isNaN(nueva)) return false;
  return Number.isNaN(vieja) || nueva > vieja;
}

/** Lo que hay que hacer con una entrega, comparada con lo registrado. */
export function cambiosDelInventario(
  registrados: readonly ArchivoRegistrado[],
  inventario: InventarioDelDrive,
): CambiosDelInventario {
  const cambios: CambiosDelInventario = {
    nuevos: [],
    pedir: [],
    demasiadoGrandes: [],
    renombrados: [],
    retirar: [],
    vuelven: [],
    retirosRetenidos: 0,
  };
  const porId = new Map(registrados.map((r) => [r.driveId, r]));
  const vistos = new Set<string>();

  for (const entrada of inventario.archivos) {
    // Drive deja tener un archivo en dos carpetas: cuenta la primera vez que aparece.
    if (vistos.has(entrada.driveId)) continue;
    vistos.add(entrada.driveId);
    const archivo = { ...entrada, ruta: subcarpetaDe(entrada.ruta) };
    const registrado = porId.get(archivo.driveId);

    if (!registrado) {
      cambios.nuevos.push(archivo);
    } else {
      if (registrado.retirado) cambios.vuelven.push(archivo.driveId);
      if (registrado.nombre !== archivo.nombre || registrado.subcarpeta !== archivo.ruta) {
        cambios.renombrados.push({ driveId: archivo.driveId, nombre: archivo.nombre, subcarpeta: archivo.ruta });
      }
      if (!esPosterior(archivo.modificadoEn, registrado.ultimaModificacion)) continue;
    }

    const version = { driveId: archivo.driveId, modificadoEn: archivo.modificadoEn };
    if (archivo.tamano > TAMANO_MAXIMO_DE_LECTURA) cambios.demasiadoGrandes.push(version);
    else cambios.pedir.push(version);
  }

  const faltan = registrados.filter((r) => !r.retirado && !vistos.has(r.driveId)).map((r) => r.driveId);
  const vigentes = registrados.filter((r) => !r.retirado).length;
  if (inventarioAceptable({ completo: inventario.completo, vigentes, aRetirar: faltan.length })) {
    cambios.retirar = faltan;
  } else {
    cambios.retirosRetenidos = faltan.length;
  }
  return cambios;
}

/* ── La versión vigente (RF-17, RF-25) ───────────────────────────────────── */

/**
 * La que manda es la de fecha de modificación en el Drive más reciente, **no la que llegó
 * de última**: n8n puede subir tarde una versión vieja (un reintento, una entrega que se
 * demoró), y eso no la vuelve vigente. Con dos de la misma fecha, que el índice único no
 * deja, se queda la primera. `null` sin versiones.
 */
export function versionVigente<V extends { modificadoEnDrive: string }>(versiones: readonly V[]): V | null {
  let vigente: V | null = null;
  for (const version of versiones) {
    if (!vigente || Date.parse(version.modificadoEnDrive) > Date.parse(vigente.modificadoEnDrive)) vigente = version;
  }
  return vigente;
}

/* ── Los fragmentos (RF-12, RF-25) ───────────────────────────────────────── */

/**
 * Al asistente se le dan los pedazos que responden, con su página, y no un documento de
 * 80 páginas por pregunta (plan, «Decisiones técnicas»). Por eso:
 *
 * - **Un fragmento no mezcla páginas**: así la cita dice «página 12» sin dudar.
 * - **No corta renglones**: se van juntando renglones enteros hasta que el siguiente ya no
 *   cabe. Partir una frase a la mitad deja dos pedazos que no se encuentran buscando.
 * - **Un renglón que solo ya pasa del tope** (una tabla aplanada, un párrafo sin saltos) se
 *   parte entre palabras; una «palabra» más larga que el tope, en seco, porque no hay otra.
 * - **Los renglones en blanco no cuentan**: no dicen nada y gastan tope.
 */
export const TAMANO_DE_FRAGMENTO = 1500;

export interface PaginaLeida {
  pagina: number;
  texto: string;
}

export interface Fragmento {
  /** Su lugar en el documento, de cero en adelante. */
  orden: number;
  pagina: number;
  texto: string;
}

/** Un renglón de más del tope, en pedazos que caben: entre palabras, o en seco. */
function partirRenglon(renglon: string): string[] {
  const pedazos: string[] = [];
  let actual = '';
  for (const palabra of renglon.split(/ +/)) {
    if (!palabra) continue;
    if (actual && actual.length + 1 + palabra.length <= TAMANO_DE_FRAGMENTO) {
      actual += ` ${palabra}`;
      continue;
    }
    if (actual) pedazos.push(actual);
    actual = palabra;
    while (actual.length > TAMANO_DE_FRAGMENTO) {
      pedazos.push(actual.slice(0, TAMANO_DE_FRAGMENTO));
      actual = actual.slice(TAMANO_DE_FRAGMENTO);
    }
  }
  if (actual) pedazos.push(actual);
  return pedazos;
}

/** El texto leído, en trozos de hasta `TAMANO_DE_FRAGMENTO` caracteres, cada uno con su página. */
export function fragmentar(paginas: readonly PaginaLeida[]): Fragmento[] {
  const fragmentos: Fragmento[] = [];
  for (const { pagina, texto } of paginas) {
    let actual = '';
    const cerrar = () => {
      if (actual) fragmentos.push({ orden: fragmentos.length, pagina, texto: actual });
      actual = '';
    };
    for (const crudo of texto.split(/\r?\n/)) {
      const renglon = crudo.trim();
      if (!renglon) continue;
      if (renglon.length > TAMANO_DE_FRAGMENTO) {
        // Cada pedazo va solo; el último queda abierto para juntarse con lo que sigue.
        cerrar();
        const pedazos = partirRenglon(renglon);
        for (const pedazo of pedazos.slice(0, -1)) fragmentos.push({ orden: fragmentos.length, pagina, texto: pedazo });
        actual = pedazos.at(-1) ?? '';
        continue;
      }
      if (actual && actual.length + 1 + renglon.length > TAMANO_DE_FRAGMENTO) cerrar();
      actual = actual ? `${actual}\n${renglon}` : renglon;
    }
    cerrar();
  }
  return fragmentos;
}

/* ── Lo leído, en páginas (RF-12, RF-15) ─────────────────────────────────── */

/**
 * Word, Excel y texto se leen **sin IA**, con los lectores que ya existen (plan, «Decisiones
 * técnicas»): ya los leen bien, y gratis. Lo que sale de ellos se pasa aquí a páginas, la misma
 * forma que devolverá la IA para un PDF, para que `fragmentar` y la búsqueda no distingan de
 * dónde salió el texto.
 *
 * - **Una hoja del Excel es una página**, con su nombre arriba: la cita dice «hoja Cantidades»
 *   y no «página 2». Una hoja vacía no deja página, pero tampoco corre el número de las demás:
 *   la página es la posición de la hoja en el libro.
 * - **Un Word o un texto es una sola página**: no tienen páginas propias que citar.
 */

/** Por qué no se pudo leer, con los textos que muestra la lista (RF-15). */
export const MOTIVO_TIPO_NO_ADMITIDO = 'tipo no admitido';
export const MOTIVO_SIN_TEXTO = 'sin texto';

/** Las clases que se leen en el servidor, sin IA. PDF e imágenes las transcribe la IA. */
export function seLeeSinIa(clase: ClaseDeArchivoDelDrive): boolean {
  return clase !== 'pdf' && clase !== 'imagen';
}

type CeldaDelLibro = string | number | null;

export interface HojaParaLeer {
  nombre: string;
  filas: readonly (readonly CeldaDelLibro[])[];
}

/** Un libro de Excel como páginas: una por hoja con contenido, con su nombre arriba. */
export function paginasDelLibro(hojas: readonly HojaParaLeer[]): PaginaLeida[] {
  const paginas: PaginaLeida[] = [];
  hojas.forEach((hoja, i) => {
    const renglones = hoja.filas
      .map((fila) => fila.map((c) => (c === null ? '' : String(c).trim())))
      .filter((celdas) => celdas.some((c) => c !== ''))
      .map((celdas) => {
        // Sin las celdas vacías del final: no dicen nada y gastan tope.
        let fin = celdas.length;
        while (fin > 0 && celdas[fin - 1] === '') fin--;
        return celdas.slice(0, fin).join(' | ');
      });
    if (renglones.length > 0) paginas.push({ pagina: i + 1, texto: [`Hoja «${hoja.nombre}»`, ...renglones].join('\n') });
  });
  return paginas;
}

/** Un texto plano o el de un Word, como una sola página. Sin texto, ninguna. */
export function paginasDelTexto(texto: string): PaginaLeida[] {
  const limpio = texto.replace(/^﻿/, '');
  return limpio.trim() ? [{ pagina: 1, texto: limpio }] : [];
}

/* ── Lo que lee la IA: PDF e imágenes (RF-12, RF-14) ──────────────────────── */

/**
 * La IA transcribe los PDF y las imágenes, también los escaneados (RF-14), en vez de un
 * extractor de texto: un extractor sería una dependencia nueva y no lee los escaneados (plan,
 * «Decisiones técnicas»). Lo que se paga es el costo por página, y por eso:
 *
 * - **Un PDF va en piezas de 20 páginas**: cada pieza es una llamada que cabe en el tope de
 *   tiempo y de salida, y una pieza que falla no se lleva el documento entero sin aviso.
 * - **La IA numera las páginas de su pieza desde 1**, que es lo que ve; aquí se devuelven al
 *   número del documento, para que la cita diga la página que tiene el PDF. Lo que la IA diga
 *   fuera de la pieza se descarta: no puede inventar páginas.
 * - **El freno**: sin `DRIVE_LECTURA_ACTIVA=1` el pulso no llama a la IA (riesgo 2 del plan).
 *   Es la forma de cortar el gasto sin desplegar, y la de no gastar hasta que Diego vea el
 *   estimado de la primera carpeta.
 */
export const PAGINAS_POR_PIEZA = 20;

export interface PiezaDelPdf {
  /** Primera y última página de la pieza, contadas desde 1 en el documento. */
  desde: number;
  hasta: number;
}

/** Las piezas de un PDF de `totalPaginas` páginas. */
export function piezasDelPdf(totalPaginas: number): PiezaDelPdf[] {
  const piezas: PiezaDelPdf[] = [];
  for (let desde = 1; desde <= totalPaginas; desde += PAGINAS_POR_PIEZA) {
    piezas.push({ desde, hasta: Math.min(desde + PAGINAS_POR_PIEZA - 1, totalPaginas) });
  }
  return piezas;
}

/** Lo que transcribió la IA de una pieza, con el número de página del documento. */
export function paginasDeLaPieza(pieza: PiezaDelPdf, leidas: readonly PaginaLeida[]): PaginaLeida[] {
  const largo = pieza.hasta - pieza.desde + 1;
  const porPagina = new Map<number, string[]>();
  for (const { pagina, texto } of leidas) {
    if (!Number.isInteger(pagina) || pagina < 1 || pagina > largo || !texto.trim()) continue;
    const textos = porPagina.get(pagina) ?? [];
    textos.push(texto.trim());
    porPagina.set(pagina, textos);
  }
  return [...porPagina.entries()]
    .sort(([a], [b]) => a - b)
    .map(([pagina, textos]) => ({ pagina: pieza.desde + pagina - 1, texto: textos.join('\n') }));
}

/** El freno del gasto de IA: solo con `DRIVE_LECTURA_ACTIVA=1`. */
export function lecturaConIaActiva(valor: string | undefined): boolean {
  return valor?.trim() === '1';
}

/* ── El pulso: reintentos, tope, lecturas cortadas y resumen (RF-13, RF-16) ─── */

/**
 * - **Pasajera o definitiva** (RF-15, RF-16): una falla que se arregla sola —la red, la IA
 *   ocupada o con un error suyo, el tiempo agotado— vuelve a la cola hasta el tercer intento.
 *   Una que no —el archivo dañado o con contraseña, la IA que se niega, una petición que la API
 *   rechaza— queda «No se pudo leer» de una vez: reintentarla solo gastaría.
 * - **Cada intento cuenta**, también el definitivo y la lectura que se cortó: una versión que
 *   tumba el proceso cada vez no puede quedar dando vueltas para siempre.
 * - **El tope del pulso**: no se toma otra versión después de unos 4 minutos. La que está en
 *   curso termina, porque cortarla a la mitad tiraría lo que ya se pagó.
 * - **Una lectura de más de 10 minutos se da por cortada** (el proceso se reinició, el
 *   despliegue la interrumpió) y se retoma entera.
 * - **El resumen** recibe el texto en su orden, hasta 60 000 caracteres, cortado en un renglón.
 */
export const TOPE_DEL_PULSO_MS = 4 * 60_000;
export const CORTADA_DESPUES_DE_MS = 10 * 60_000;
export const CARACTERES_PARA_RESUMIR = 60_000;

/** Cómo falló un intento, sin depender de la librería que falló. */
export interface FormaDeLaFalla {
  /** El estado HTTP de la respuesta, si la hubo. */
  estado?: number;
  /** Sin conexión o tiempo agotado. */
  sinConexion: boolean;
}

/** Si reintentar puede arreglarlo (RF-16). */
export function fallaPasajera(falla: FormaDeLaFalla): boolean {
  if (falla.sinConexion) return true;
  const estado = falla.estado;
  if (estado === undefined) return false;
  return estado === 408 || estado === 409 || estado === 429 || estado >= 500;
}

/** Lo que queda después de un intento fallido. */
export function despuesDeUnaFalla(
  intentos: number,
  pasajera: boolean,
): { estado: 'pendiente' | 'no_se_pudo'; intentos: number } {
  const siguientes = intentos + 1;
  return { estado: pasajera && siguientes < INTENTOS_DE_LECTURA ? 'pendiente' : 'no_se_pudo', intentos: siguientes };
}

/** Si una lectura en curso se dio por cortada. */
export function lecturaCortada(leyendoDesde: Date | null, ahora: number): boolean {
  return leyendoDesde === null || ahora - leyendoDesde.getTime() > CORTADA_DESPUES_DE_MS;
}

/** Si el pulso puede tomar otra versión. */
export function quedaTiempoEnElPulso(inicio: number, ahora: number): boolean {
  return ahora - inicio < TOPE_DEL_PULSO_MS;
}

/** El texto que va al resumen: los fragmentos en su orden, sin pasar del tope ni cortar renglones. */
export function textoParaResumir(fragmentos: readonly PaginaLeida[]): string {
  let texto = '';
  for (const renglon of fragmentos.flatMap((f) => f.texto.split('\n'))) {
    const siguiente = texto ? `${texto}\n${renglon}` : renglon;
    if (siguiente.length > CARACTERES_PARA_RESUMIR) break;
    texto = siguiente;
  }
  return texto;
}

/* ── La búsqueda (RF-22 a RF-27) ─────────────────────────────────────────── */

/**
 * Lo que busca el asistente es una pregunta en español, no unas palabras clave: «¿cuántos días
 * de prórroga aprobó la interventoría?». Si se exigieran **todas** las palabras (lo que hace
 * `websearch_to_tsquery`, que decía el plan), «cuántos» y «aprobó» bastarían para no encontrar
 * el oficio que responde. Por eso la consulta es **cualquiera** de las palabras, y el orden lo
 * da la relevancia (`ts_rank`): primero lo que tiene más palabras de la pregunta. Una palabra
 * que no está en ningún documento sigue devolviendo vacío (RF-27).
 *
 * Las palabras van **normalizadas** —sin tildes ni mayúsculas, con `normalizar`—, igual que el
 * texto indexado, y solo letras y números: así ninguna comilla ni ningún operador del usuario
 * llega a la sintaxis de `to_tsquery`. Las palabras vacías del español («de», «la») las quita
 * el diccionario de Postgres.
 *
 * Al asistente vuelven hasta 8 fragmentos y unos 12 000 caracteres (plan, «Búsqueda»): lo que
 * responde, con su fuente, y no medio Drive en cada pregunta.
 */
export const TERMINOS_POR_BUSQUEDA = 12;
export const FRAGMENTOS_POR_BUSQUEDA = 8;
export const CARACTERES_POR_BUSQUEDA = 12_000;

/** Las palabras de una pregunta, normalizadas, sin repetir y con tope. */
export function terminosDeBusqueda(texto: string): string[] {
  const palabras = normalizar(texto).split(/[^a-z0-9]+/).filter(Boolean);
  return [...new Set(palabras)].slice(0, TERMINOS_POR_BUSQUEDA);
}

/** La consulta para `to_tsquery('spanish', …)`: cualquiera de las palabras. `null` sin palabras. */
export function consultaDeBusqueda(texto: string): string | null {
  const terminos = terminosDeBusqueda(texto);
  return terminos.length > 0 ? terminos.join(' | ') : null;
}

/** Los resultados que caben, en su orden: hasta 8 y sin pasar del tope de caracteres. */
export function recortarResultados<F extends { texto: string }>(fragmentos: readonly F[]): F[] {
  const elegidos: F[] = [];
  let caracteres = 0;
  for (const fragmento of fragmentos) {
    if (elegidos.length === FRAGMENTOS_POR_BUSQUEDA) break;
    if (caracteres + fragmento.texto.length > CARACTERES_POR_BUSQUEDA) continue;
    elegidos.push(fragmento);
    caracteres += fragmento.texto.length;
  }
  return elegidos;
}

/* ── La lista del panel (RF-29 a RF-35) ──────────────────────────────────── */

/**
 * La lista del Drive de una obra, armada aquí y no en la ruta, para que la pantalla y el
 * servidor no difieran:
 *
 * - **Un renglón por archivo**, con su versión vigente al frente (la de fecha de Drive más
 *   reciente, como en la búsqueda) y las viejas detrás, para abrirlas también (RF-32).
 * - **El estado y la fecha son los de la vigente** (RF-30, RF-35), y el orden, del más
 *   reciente al más antiguo.
 * - **La búsqueda** (RF-31) mira el nombre y la subcarpeta, sin tildes ni mayúsculas, y el
 *   contenido por los archivos que la base encontró en su texto: buscar en el texto es trabajo
 *   del índice de Postgres, no de traer todo el texto aquí.
 * - **Un archivo sin versiones no sale**: n8n todavía no lo subió y no hay qué abrir.
 */
export interface VersionParaLaLista {
  id: string;
  modificadoEnDrive: string;
  estado: EstadoDeLecturaDelDrive;
  motivo: string | null;
  resumen: string | null;
  mediaId: string | null;
}

export interface ArchivoParaLaLista<V extends VersionParaLaLista> {
  id: string;
  nombre: string;
  subcarpeta: string;
  retirado: boolean;
  versiones: readonly V[];
}

export interface DocumentoDeLaLista<V extends VersionParaLaLista> {
  id: string;
  nombre: string;
  subcarpeta: string;
  retirado: boolean;
  /** La fecha de modificación en Drive de la versión vigente. */
  modificadoEnDrive: string;
  estado: EstadoDelDocumento;
  resumen: string | null;
  /** La vigente primero; después las viejas, de la más nueva a la más vieja. */
  versiones: (V & { vigente: boolean })[];
}

export function documentosParaLaLista<V extends VersionParaLaLista>(
  archivos: readonly ArchivoParaLaLista<V>[],
  buscar: string,
  conContenido: ReadonlySet<string>,
): DocumentoDeLaLista<V>[] {
  const n = normalizar(buscar);
  const documentos: DocumentoDeLaLista<V>[] = [];
  for (const archivo of archivos) {
    if (archivo.versiones.length === 0) continue;
    if (n && !normalizar(archivo.nombre).includes(n) && !normalizar(archivo.subcarpeta).includes(n) && !conContenido.has(archivo.id)) {
      continue;
    }
    const versiones = [...archivo.versiones]
      .sort((a, b) => Date.parse(b.modificadoEnDrive) - Date.parse(a.modificadoEnDrive))
      .map((v, i) => ({ ...v, vigente: i === 0 }));
    const vigente = versiones[0];
    documentos.push({
      id: archivo.id,
      nombre: archivo.nombre,
      subcarpeta: archivo.subcarpeta,
      retirado: archivo.retirado,
      modificadoEnDrive: vigente.modificadoEnDrive,
      estado: estadoDelDocumento({ estado: vigente.estado, motivo: vigente.motivo, retirado: archivo.retirado }),
      resumen: vigente.resumen,
      versiones,
    });
  }
  return documentos.sort((a, b) => Date.parse(b.modificadoEnDrive) - Date.parse(a.modificadoEnDrive));
}

/**
 * Por qué no se puede volver a leer una versión (RF-33), o `null` si se puede: solo la que
 * quedó «No se pudo leer» y tiene copia. Lo de más de 50 MB no tiene copia, y volver a
 * leerlo no lo arreglaría (D12).
 */
export function motivoParaNoReleer(version: { estado: EstadoDeLecturaDelDrive; mediaId: string | null }): string | null {
  if (version.estado === 'leido') return 'Ese documento ya se leyó.';
  if (version.estado !== 'no_se_pudo') return 'Ese documento se está leyendo.';
  if (!version.mediaId) return 'Ese documento no tiene copia porque pasa de 50 MB: se abre en el Drive.';
  return null;
}

/**
 * Cómo se abre la copia de una versión (RF-32, RF-41): el navegador muestra PDF, imágenes y
 * texto; Word, Excel y lo demás se descargan con su nombre. Lo que no tiene copia (más de 50 MB,
 * D12) se abre en el Drive, si n8n mandó su enlace; si no, no hay nada que abrir.
 */
export function comoSeAbre(version: {
  mediaId: string | null;
  mime: string;
  nombre: string;
  enlace: string | null;
}): 'abrir' | 'descargar' | 'drive' | null {
  if (!version.mediaId) return version.enlace ? 'drive' : null;
  const clase = claseDeArchivoDelDrive(version.mime, version.nombre);
  return clase === 'pdf' || clase === 'imagen' || clase === 'texto' ? 'abrir' : 'descargar';
}

/**
 * RF-34: n8n entrega cada 5 minutos, así que media hora sin entrega es que algo dejó de
 * mandar. Una carpeta que nunca recibió ninguna también se avisa.
 */
export const ENTREGA_ATRASADA_DESPUES_DE_MS = 30 * 60_000;

export function entregaAtrasada(ultimaEntregaEn: string | null, ahora: number): boolean {
  return ultimaEntregaEn === null || ahora - Date.parse(ultimaEntregaEn) > ENTREGA_ATRASADA_DESPUES_DE_MS;
}

/**
 * RF-8 a RF-10: lo que se ofrece al conectar una carpeta a una obra: solo las que todavía no
 * tienen obra (cambiar la de otra obra no se hace desde aquí), en el orden en que llegan, con
 * cuántos archivos trajo su última entrega para reconocerla.
 */
export function opcionesDeCarpetasSinObra(
  carpetas: readonly { id: string; nombre: string; obraId: string | null; archivosEnLaUltimaEntrega: number | null; ultimaEntregaEn: string | null }[],
): { valor: string; etiqueta: string; detalle: string }[] {
  return carpetas
    .filter((c) => c.obraId === null)
    .map((c) => ({
      valor: c.id,
      etiqueta: c.nombre,
      detalle:
        c.ultimaEntregaEn === null || c.archivosEnLaUltimaEntrega === null
          ? 'Todavía sin entregas de n8n'
          : `${c.archivosEnLaUltimaEntrega} ${c.archivosEnLaUltimaEntrega === 1 ? 'archivo' : 'archivos'} en la última entrega`,
    }));
}

/* ── El estado de cada documento (RF-30) ─────────────────────────────────── */

/** El estado de lectura de una versión, como se guarda. Es el enum `estado_lectura_drive` de la base. */
export const ESTADOS_DE_LECTURA_DEL_DRIVE = ['pendiente', 'leyendo', 'leido', 'no_se_pudo'] as const;
export type EstadoDeLecturaDelDrive = (typeof ESTADOS_DE_LECTURA_DEL_DRIVE)[number];

export interface DocumentoParaEstado {
  estado: EstadoDeLecturaDelDrive;
  motivo: string | null;
  /** Si el archivo ya no está en la carpeta del Drive (RF-19). */
  retirado: boolean;
}

export interface EstadoDelDocumento {
  clave: 'leido' | 'leyendo' | 'no_se_pudo' | 'retirado';
  texto: string;
}

/** Lo que dice la lista de cada documento (RF-30). */
export function estadoDelDocumento(documento: DocumentoParaEstado): EstadoDelDocumento {
  if (documento.retirado) return { clave: 'retirado', texto: 'Retirado del Drive' };
  switch (documento.estado) {
    case 'leido':
      return { clave: 'leido', texto: 'Leído' };
    case 'pendiente':
    case 'leyendo':
      return { clave: 'leyendo', texto: 'Leyendo' };
    case 'no_se_pudo': {
      const motivo = documento.motivo?.trim();
      return { clave: 'no_se_pudo', texto: motivo ? `No se pudo leer: ${motivo}` : 'No se pudo leer' };
    }
  }
}
