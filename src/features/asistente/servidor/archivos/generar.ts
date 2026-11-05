/**
 * Generar un archivo del asistente (spec 040, RF-18 a RF-23). **Solo servidor.** Lo llama la
 * consulta `generar_archivo` (`herramientas.ts`).
 *
 * ── Las tablas salen de las consultas del turno (RF-20) ──
 *
 * Cada consulta que la IA hace en una respuesta queda guardada en el turno con un número
 * (`c1`, `c2`…), que la IA ve junto con los datos. Para un archivo, la IA dice de qué consulta,
 * qué lista y qué columnas; las filas se sacan de lo guardado (`tablaDe` + `aTabla`). La IA no
 * copia cifras, y un archivo puede llevar 5 000 filas aunque ella no las haya leído (un
 * resultado grande le llega resumido). Una consulta que no está en el turno no existe: lo que
 * no se consultó en esta respuesta, con el alcance de esta persona, no entra en un archivo.
 *
 * ── Dónde queda (RF-19, RF-24, D7) ──
 *
 * En el almacén privado (R2), como los adjuntos: `media` con dueño `asistente`, la conversación
 * como dueña y propósito `archivo_generado`. La respuesta guarda su `ArchivoDelAsistente`; la
 * ruta `media/[id]` lo entrega 30 días a quien lo pidió, mientras la conversación siga a su
 * alcance.
 */
import { uuidv7 } from 'uuidv7';

import { baseServidor } from '@/db/servidor/cliente';
import { media } from '@/db/servidor/esquema';
import { claveDeObjeto, guardar } from '@/features/media/servidor/almacen';
import { aHex } from '@/shared/cripto/formato-pbkdf2';
import {
  aTabla,
  encabezadoDelArchivo,
  faltasDelPedido,
  nombreDelArchivoDelAsistente,
  tablaDe,
  type BloqueDelArchivo,
} from '@/shared/rules/archivos-del-asistente';
import type { ArchivoDelAsistente, FormatoDeArchivo, FuenteDeRespuesta } from '@/shared/rules/asistente';
import { fechaDeJornada } from '@/shared/rules/jornada';

import { libroDelAsistente, TIPO_XLSX } from './excel';
import { pdfDelAsistente, TIPO_PDF } from './pdf';
import { TIPO_DOCX, wordDelAsistente } from './word';

/** Lo que una respuesta lleva consultado y generado hasta ahora. Vive lo que dura la respuesta. */
export interface TurnoDelAsistente {
  conversacionId: string;
  /** «Natalia Riaño, residente»: va en el encabezado del archivo. */
  quien: string;
  consultas: Map<string, { nombre: string; datos: unknown; fuentes: FuenteDeRespuesta[] }>;
  archivos: ArchivoDelAsistente[];
  /** Para avisar a la pantalla en cuanto el archivo está listo (RF-19). */
  alArchivo?: (archivo: ArchivoDelAsistente) => void;
}

export function turnoNuevo(conversacionId: string, quien: string, alArchivo?: TurnoDelAsistente['alArchivo']): TurnoDelAsistente {
  return { conversacionId, quien, consultas: new Map(), archivos: [], alArchivo };
}

/** Guarda el resultado de una consulta en el turno y devuelve su número («c1»). */
export function guardarConsulta(turno: TurnoDelAsistente, nombre: string, datos: unknown, fuentes: FuenteDeRespuesta[]): string {
  const id = `c${turno.consultas.size + 1}`;
  turno.consultas.set(id, { nombre, datos, fuentes });
  return id;
}

/** Los bloques de un archivo. Va aquí y no en el esquema: el modo estricto no admite `maxItems`. */
const BLOQUES_MAXIMOS = 12;

/** Lo que pide la IA, ya validado por el esquema de la consulta. */
export interface PedidoDeGenerar {
  formato: FormatoDeArchivo;
  titulo: string;
  bloques: {
    tipo: 'texto' | 'tabla';
    texto: string;
    consulta: string;
    lista: string;
    titulo_de_la_tabla: string;
    columnas: { clave: string; titulo: string }[];
  }[];
}

const ARMADOR: Record<FormatoDeArchivo, { armar: typeof pdfDelAsistente; mime: string }> = {
  pdf: { armar: pdfDelAsistente, mime: TIPO_PDF },
  xlsx: { armar: libroDelAsistente, mime: TIPO_XLSX },
  docx: { armar: wordDelAsistente, mime: TIPO_DOCX },
};

/** Las listas que hay en los datos de una consulta, para decirle a la IA cuál puede pedir. */
function listasDe(datos: unknown): string[] {
  if (Array.isArray(datos)) return ['(los datos son una lista: deje «lista» vacío)'];
  if (!datos || typeof datos !== 'object') return [];
  return Object.entries(datos as Record<string, unknown>)
    .filter(([, v]) => Array.isArray(v))
    .map(([k]) => k);
}

/**
 * Arma el archivo, lo guarda y lo deja en el turno. Devuelve qué decirle a la IA: el archivo
 * listo, o por qué no se pudo (sin consulta, sin lista, sin filas, demasiadas filas).
 */
export async function generarArchivo(pedido: PedidoDeGenerar, turno: TurnoDelAsistente): Promise<{ archivo: ArchivoDelAsistente } | { error: string }> {
  if (pedido.bloques.length > BLOQUES_MAXIMOS) return { error: `Un archivo lleva hasta ${BLOQUES_MAXIMOS} bloques: júntelos o haga dos archivos.` };
  const bloques: BloqueDelArchivo[] = [];
  const fuentes: FuenteDeRespuesta[] = [];
  for (const b of pedido.bloques) {
    if (b.tipo === 'texto') {
      if (b.texto.trim()) bloques.push({ tipo: 'texto', markdown: b.texto });
      continue;
    }
    const consulta = turno.consultas.get(b.consulta.trim());
    if (!consulta) {
      const hay = [...turno.consultas.keys()];
      return {
        error: `Primero consulte esos datos en esta respuesta: la consulta «${b.consulta}» no está${hay.length ? ` (las de esta respuesta son ${hay.join(', ')})` : ''}.`,
      };
    }
    const lista = tablaDe(consulta.datos, b.lista.trim());
    if (!lista) {
      return { error: `En la consulta ${b.consulta} (${consulta.nombre}) no hay una lista «${b.lista}». Las que hay: ${listasDe(consulta.datos).join(', ') || 'ninguna'}.` };
    }
    const columnas = b.columnas.filter((c) => c.clave.trim());
    const tabla = aTabla(b.titulo_de_la_tabla.trim() || consulta.nombre, lista, columnas.map((c) => c.clave.trim()));
    // Los títulos que diga la IA («Código», «Qué se pide»); sin título, el de la clave.
    columnas.forEach((c, i) => {
      if (c.titulo.trim()) tabla.encabezados[i] = c.titulo.trim();
    });
    bloques.push({ tipo: 'tabla', tabla });
    fuentes.push(...consulta.fuentes);
  }

  const faltas = faltasDelPedido({ formato: pedido.formato, titulo: pedido.titulo, bloques });
  if (faltas.length) return { error: faltas.join(' ') };

  const creadoEn = new Date().toISOString();
  const encabezado = encabezadoDelArchivo({ quien: turno.quien, generadoEn: creadoEn, fuentes });
  const { armar, mime } = ARMADOR[pedido.formato];
  // Copia en un `ArrayBuffer` propio: es lo que piden el almacén y el resumen SHA-256.
  const bytes = new Uint8Array(await armar({ titulo: pedido.titulo.trim(), encabezado, bloques }));

  const mediaId = uuidv7();
  const clave = claveDeObjeto('asistente', turno.conversacionId, mediaId, mime);
  await guardar(clave, bytes, mime);
  await baseServidor()
    .insert(media)
    .values({
      id: mediaId,
      duenoTipo: 'asistente',
      duenoId: turno.conversacionId,
      proposito: 'archivo_generado',
      mime,
      bytes: bytes.byteLength,
      sha256: aHex(new Uint8Array(await crypto.subtle.digest('SHA-256', bytes))),
      claveR2: clave,
      subidoEn: new Date(creadoEn),
    });

  const archivo: ArchivoDelAsistente = {
    mediaId,
    nombre: nombreDelArchivoDelAsistente(pedido.titulo, fechaDeJornada(Date.parse(creadoEn)), pedido.formato),
    formato: pedido.formato,
    filas: bloques.reduce((n, b) => n + (b.tipo === 'tabla' ? b.tabla.filas.length : 0), 0),
    creadoEn,
  };
  turno.archivos.push(archivo);
  turno.alArchivo?.(archivo);
  return { archivo };
}
