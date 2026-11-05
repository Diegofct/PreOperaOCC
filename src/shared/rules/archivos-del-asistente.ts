/**
 * Los archivos que entrega el asistente (spec 040, RF-18 a RF-24). Puras: qué lleva el archivo
 * y qué lo impide, sin `exceljs`, `pdf-lib` ni `jszip`. Quienes escriben los bytes están en
 * `features/asistente/servidor/archivos/`, y reciben lo que sale de aquí. Así se prueba en el
 * guion qué sale, sin abrir un archivo, como los Excel de Reportes (`reportes/exportar.ts`).
 *
 * ── Las cifras son las de la consulta (RF-20) ──
 *
 * Una tabla del archivo no la escribe la IA: sale del resultado de una consulta del mismo turno
 * (`tablaDe` + `aTabla`). La IA solo dice qué consulta, qué lista y qué columnas. Así una cifra
 * no se copia mal y caben 5 000 filas, que la IA no alcanzaría a escribir.
 *
 * ── Números como números (RF-21) ──
 *
 * Una columna de números va como números, y el que la escribe le da formato de pesos, entero o
 * decimal; una de fechas `AAAA-MM-DD`, como fecha. Así se suman y se filtran en Excel.
 */
import { FORMATOS_DE_ARCHIVO, type FormatoDeArchivo, type FuenteDeRespuesta } from './asistente';
import { plazoEnDias } from './contrato';
import { fechaDelCorte } from './cortes';
import { fechaDeJornada, sumarDias } from './jornada';
import { mostrarLectura } from './lecturas';
import { enPesos } from './pesos';

/** RF-23, RNF: más filas que esto, sumando todas las tablas, y se pide acotar. */
export const FILAS_MAXIMAS_POR_ARCHIVO = 5000;

/** D7: cuántos días se puede volver a descargar. El día 30 todavía; el 31, ya no. */
export const DIAS_DE_DESCARGA = 30;

/** La leyenda de todo lo que genera el asistente (028/RF-26), en el PDF y en el Word. */
export const LEYENDA_DEL_ARCHIVO = 'Generado por el asistente a partir de los registros del sistema. No es evidencia firmada.';

export type CeldaDelArchivo = string | number | null;

/** Cómo se escribe una columna. `pesos` y `entero` sin decimales; `numero`, con los que traiga. */
/**
 * `lectura`: un horómetro u odómetro, con punto decimal y sin miles, como en el panel y en los
 * Excel de Reportes (039/RF-17; RNF de la 040, añadido en la T18).
 */
export type FormatoDeColumna = 'texto' | 'numero' | 'entero' | 'pesos' | 'fecha' | 'lectura';

export interface TablaDelArchivo {
  titulo: string;
  encabezados: string[];
  formatos: FormatoDeColumna[];
  filas: CeldaDelArchivo[][];
}

export type BloqueDelArchivo = { tipo: 'texto'; markdown: string } | { tipo: 'tabla'; tabla: TablaDelArchivo };

export interface PedidoDeArchivo {
  formato: string;
  titulo: string;
  bloques: readonly BloqueDelArchivo[];
}

const NOMBRE_DEL_FORMATO: Record<FormatoDeArchivo, string> = { pdf: 'PDF', xlsx: 'Excel', docx: 'Word' };

export function esFormatoDeArchivo(formato: string): formato is FormatoDeArchivo {
  return (FORMATOS_DE_ARCHIVO as readonly string[]).includes(formato);
}

export function nombreDelFormato(formato: FormatoDeArchivo): string {
  return NOMBRE_DEL_FORMATO[formato];
}

/** Lo que impide generar el archivo, para decírselo a la persona (RF-18, RF-23, caso límite). */
export function faltasDelPedido(pedido: PedidoDeArchivo): string[] {
  if (!esFormatoDeArchivo(pedido.formato)) return ['El asistente entrega archivos en PDF, Excel o Word.'];
  const faltas: string[] = [];
  if (!pedido.titulo.trim()) faltas.push('El archivo necesita un título.');
  if (pedido.bloques.length === 0) return [...faltas, 'El archivo no tiene contenido.'];
  const tablas = pedido.bloques.filter((b): b is Extract<BloqueDelArchivo, { tipo: 'tabla' }> => b.tipo === 'tabla');
  // T18: en todo formato, al menos una tabla de una consulta. Un PDF o un Word solo de texto lo
  // escribía la IA: dejaba pasar un archivo vacío («casi vacío», caso límite) y cifras que no
  // salen de una consulta (RF-20). El texto queda para resumir y anotar.
  if (tablas.length === 0) {
    faltas.push(
      'El archivo necesita al menos una tabla de una consulta: los datos no se escriben a mano. Si las consultas no traen datos, dígaselo a la persona y no genere el archivo.',
    );
  }
  for (const { tabla } of tablas) {
    if (tabla.filas.length === 0) faltas.push(`La tabla «${tabla.titulo}» no tiene filas: no se genera un archivo vacío.`);
  }
  const filas = tablas.reduce((n, { tabla }) => n + tabla.filas.length, 0);
  if (filas > FILAS_MAXIMAS_POR_ARCHIVO) {
    faltas.push(
      `Son ${filas} filas y un archivo lleva hasta ${FILAS_MAXIMAS_POR_ARCHIVO}. Hay que acotar el periodo o el lugar y pedirlo de nuevo.`,
    );
  }
  return faltas;
}

/**
 * La lista de una consulta que va como tabla: `ruta` es el nombre de la lista dentro de los
 * datos («solicitudes», «personas»), o una ruta con punto si está anidada («bitacora.actividades»,
 * T18). Vacía: los datos mismos si son una lista, o la única lista que tengan. `null` si no hay
 * una lista ahí, o si hay varias y no se dijo cuál.
 */
export function tablaDe(datos: unknown, ruta: string): unknown[] | null {
  if (Array.isArray(datos)) return ruta ? null : datos;
  if (!datos || typeof datos !== 'object') return null;
  const campos = datos as Record<string, unknown>;
  if (ruta) {
    let valor: unknown = datos;
    for (const parte of ruta.split('.')) {
      valor = valor && typeof valor === 'object' && !Array.isArray(valor) ? (valor as Record<string, unknown>)[parte] : undefined;
    }
    return Array.isArray(valor) ? valor : null;
  }
  const listas = Object.values(campos).filter(Array.isArray);
  return listas.length === 1 ? listas[0] : null;
}

/** «valorEstimado» → «Valor estimado»; «solo_urgentes» → «Solo urgentes». */
function encabezadoDe(clave: string): string {
  const palabras = (clave.split('.')[0] ?? clave)
    .replace(/_/g, ' ')
    .replace(/([a-záéíóúñ])([A-ZÁÉÍÓÚÑ])/g, '$1 $2')
    .toLowerCase()
    .trim();
  return palabras.charAt(0).toUpperCase() + palabras.slice(1);
}

const esPrimitivo = (v: unknown): v is string | number | boolean => ['string', 'number', 'boolean'].includes(typeof v);

/** Un valor que no es número ni texto, en una celda: un objeto por su nombre, una lista unida. */
function aTexto(valor: unknown): string {
  if (valor === null || valor === undefined) return '';
  if (typeof valor === 'boolean') return valor ? 'Sí' : 'No';
  if (esPrimitivo(valor)) return String(valor);
  if (Array.isArray(valor)) return valor.map(aTexto).filter(Boolean).join('; ');
  const campos = valor as Record<string, unknown>;
  if (typeof campos.nombre === 'string') return campos.nombre;
  const valores = Object.values(campos).filter(esPrimitivo).map(String);
  const principal = Object.values(campos).find((v): v is string => typeof v === 'string');
  if (!principal) return valores.join(' ');
  const resto = valores.filter((v) => v !== principal);
  return resto.length ? `${principal} (${resto.join(' ')})` : principal;
}

const ES_FECHA = /^\d{4}-\d{2}-\d{2}$/;
// Sin «total» (T18): el total de Reportes › Máquinas son horas o km y salía «$ 0». Los totales
// de plata ya caen por otra palabra («valorTotal», «totalPagado»).
const ES_PLATA = /valor|saldo|cuentas|pagad|salario|precio|costo|monto/i;
/**
 * Las lecturas de medidor y lo que avanzan (T18): las claves de Reportes › Máquinas y
 * Mantenimiento y de la bitácora. Se miran después de la plata: «valorFinal» es plata.
 */
const ES_LECTURA = /medidor|lectura|inicial|final|avance|horometro|odometro|kilometraje|^total$|promedio/i;

function formatoDe(clave: string, valores: readonly unknown[]): FormatoDeColumna {
  const presentes = valores.filter((v) => v !== null && v !== undefined);
  if (presentes.length === 0) return 'texto';
  if (presentes.every((v) => typeof v === 'number')) {
    const enteros = (presentes as number[]).every(Number.isInteger);
    if (enteros && ES_PLATA.test(clave)) return 'pesos';
    if (ES_LECTURA.test(clave.split('.').pop() ?? clave)) return 'lectura';
    return enteros ? 'entero' : 'numero';
  }
  if (presentes.every((v) => typeof v === 'string' && ES_FECHA.test(v))) return 'fecha';
  return 'texto';
}

/**
 * El valor de una clave, también anidada con punto («lugar.nombre», «pedidaPor.nombre»): la IA
 * pide así lo que está dentro de un objeto (visto en la T14, donde «Lugar» salía vacío).
 */
function valorDe(fila: Record<string, unknown>, clave: string): unknown {
  if (clave in fila) return fila[clave];
  let actual: unknown = fila;
  for (const parte of clave.split('.')) {
    if (actual === null || typeof actual !== 'object') return undefined;
    actual = (actual as Record<string, unknown>)[parte];
  }
  return actual;
}

/**
 * Una lista de una consulta, como tabla (RF-20, RF-21). `columnas` son las claves que se
 * quieren, en ese orden, también anidadas con punto; sin ellas, todas las que aparezcan, en el
 * orden en que aparecen. Los números y las fechas quedan como están; lo demás, como texto.
 */
export function aTabla(titulo: string, lista: readonly unknown[], columnas: readonly string[] = []): TablaDelArchivo {
  const filasComoObjetos = lista.map((f) => (f !== null && typeof f === 'object' && !Array.isArray(f) ? (f as Record<string, unknown>) : { valor: f }));
  const claves: string[] = [];
  if (columnas.length) claves.push(...columnas);
  else for (const f of filasComoObjetos) for (const k of Object.keys(f)) if (!claves.includes(k)) claves.push(k);

  const formatos = claves.map((k) => formatoDe(k, filasComoObjetos.map((f) => valorDe(f, k))));
  const filas = filasComoObjetos.map((f) =>
    claves.map((k, i): CeldaDelArchivo => {
      const v = valorDe(f, k);
      if (v === null || v === undefined) return null;
      if (formatos[i] !== 'texto') return v as string | number;
      return aTexto(v);
    }),
  );
  return { titulo, encabezados: claves.map(encabezadoDe), formatos, filas };
}

/** Lo que no puede ir en el nombre de un archivo en Windows ni en un navegador. */
const PROHIBIDOS = /["*/:<>?\\|]/g;

/** «Compras por aprobar 2026-11-05.xlsx» (RF-19). */
export function nombreDelArchivoDelAsistente(titulo: string, fecha: string, formato: FormatoDeArchivo): string {
  const limpio = titulo.replace(PROHIBIDOS, '').replace(/\s+/g, ' ').trim().slice(0, 80).trim() || 'Asistente';
  return `${limpio} ${fecha}.${formato}`;
}

/** «5-nov-2026, 9:10 a. m.», en Colombia. */
function fechaYHora(iso: string): string {
  const ms = Date.parse(iso);
  const dia = fechaDeJornada(ms);
  const enColombia = new Date(ms - 5 * 3600_000);
  const horas = enColombia.getUTCHours();
  const minutos = String(enColombia.getUTCMinutes()).padStart(2, '0');
  const h12 = horas % 12 === 0 ? 12 : horas % 12;
  return `${fechaDelCorte(dia)}, ${h12}:${minutos} ${horas < 12 ? 'a. m.' : 'p. m.'}`;
}

export interface EncabezadoDelArchivo {
  grupo: string;
  pedidoPor: string;
  generado: string;
  fuentes: string[];
}

/**
 * Lo que va arriba del PDF y del Word (RF-22): el grupo, quién lo pidió, cuándo se generó y las
 * fuentes que se consultaron, sin repetir, con su obra y su periodo si los tuvieron.
 */
export function encabezadoDelArchivo(datos: { quien: string; generadoEn: string; fuentes: readonly FuenteDeRespuesta[] }): EncabezadoDelArchivo {
  const fuentes = [
    ...new Set(
      datos.fuentes.map((f) => {
        const detalle = [f.obra, f.desde && f.hasta ? `${fechaDelCorte(f.desde)} a ${fechaDelCorte(f.hasta)}` : null].filter(Boolean);
        return detalle.length ? `${f.etiqueta} (${detalle.join(', ')})` : f.etiqueta;
      }),
    ),
  ];
  return { grupo: 'Grupo OCC · Control de Obra', pedidoPor: datos.quien, generado: fechaYHora(datos.generadoEn), fuentes };
}

/** D7: el último día en que se descarga, en Colombia: el mismo día de generado más 30. */
export function venceEl(creadoEn: string): string {
  return sumarDias(fechaDeJornada(Date.parse(creadoEn)), DIAS_DE_DESCARGA);
}

/** RF-24, D7: ¿se puede descargar todavía? Hasta el final del día 30 en Colombia. */
export function vigente(creadoEn: string, ahora: number = Date.now()): boolean {
  const dias = plazoEnDias(fechaDeJornada(Date.parse(creadoEn)), fechaDeJornada(ahora));
  return dias !== null && dias <= DIAS_DE_DESCARGA;
}

/**
 * Lo que la fuente del PDF (Helvetica, con la codificación WinAnsi) no sabe dibujar, cambiado
 * por un equivalente, o por «?» si no lo hay (plan, riesgos). Sin esto, `pdf-lib` lanza al
 * primer emoji. El español, los pesos, «m³», «°» y «±» están en WinAnsi y se quedan.
 */
const EQUIVALENTES: Record<string, string> = {
  '≤': '<=',
  '≥': '>=',
  '−': '-',
  '→': '->',
  '←': '<-',
  '✓': 'v',
  '✔': 'v',
  '✗': 'x',
  '✘': 'x',
  '\t': ' ',
  ' ': ' ',
};
/** Los de WinAnsi que no están en Latin-1 (0x80 a 0x9F). */
const DE_WINANSI = new Set('€‚ƒ„…†‡ˆ‰Š‹ŒŽ‘’“”•–—˜™š›œžŸ');

export function textoParaPdf(texto: string): string {
  let salida = '';
  for (const c of texto) {
    const codigo = c.codePointAt(0) ?? 0;
    if (c in EQUIVALENTES) salida += EQUIVALENTES[c];
    else if (c === '\n' || (codigo >= 0x20 && codigo <= 0x7e) || (codigo >= 0xa1 && codigo <= 0xff) || DE_WINANSI.has(c)) salida += c;
    else salida += '?';
  }
  return salida;
}

/**
 * Una celda escrita como texto, para el PDF y el Word (RF-22): pesos como «$ 1.234.567»,
 * enteros con punto de miles, decimales con coma y hasta dos, y fechas como «12-nov-2026». El
 * Excel no usa esto: guarda el número y le pone el formato.
 */
export function celdaEnTexto(valor: CeldaDelArchivo, formato: FormatoDeColumna): string {
  if (valor === null) return '';
  if (typeof valor === 'number') {
    if (formato === 'pesos') return enPesos(valor);
    if (formato === 'lectura') return mostrarLectura(valor);
    return valor.toLocaleString('es-CO', { maximumFractionDigits: 2 });
  }
  if (formato === 'fecha' && ES_FECHA.test(valor)) return fechaDelCorte(valor);
  return valor;
}

/** Un pedazo de un párrafo: en negrita o no. */
export interface TrozoDeTexto {
  texto: string;
  negrita: boolean;
}

export interface ParrafoDelArchivo {
  tipo: 'titulo' | 'parrafo' | 'vineta';
  trozos: TrozoDeTexto[];
}

/** `**negrita**` dentro de una línea, en trozos. */
function trozosDe(linea: string): TrozoDeTexto[] {
  return linea
    .split(/(\*\*[^*]+\*\*)/g)
    .filter(Boolean)
    .map((t) => (t.startsWith('**') && t.endsWith('**') ? { texto: t.slice(2, -2), negrita: true } : { texto: t.replace(/`/g, ''), negrita: false }));
}

/**
 * El texto que escribe la IA (Markdown sencillo) en párrafos para el PDF y el Word: «#» y «##»
 * son títulos, «-» y «*» viñetas, y lo demás párrafos. Las líneas vacías separan. Una tabla
 * Markdown se queda como texto: las tablas del archivo salen de las consultas, no del texto.
 */
export function parrafosDeMarkdown(markdown: string): ParrafoDelArchivo[] {
  const parrafos: ParrafoDelArchivo[] = [];
  for (const cruda of markdown.split('\n')) {
    const linea = cruda.trim();
    if (!linea) continue;
    const titulo = /^#{1,6}\s+(.*)$/.exec(linea);
    const vineta = /^[-*•]\s+(.*)$/.exec(linea);
    if (titulo) parrafos.push({ tipo: 'titulo', trozos: trozosDe(titulo[1]) });
    else if (vineta) parrafos.push({ tipo: 'vineta', trozos: trozosDe(vineta[1]) });
    else parrafos.push({ tipo: 'parrafo', trozos: trozosDe(linea) });
  }
  return parrafos;
}
