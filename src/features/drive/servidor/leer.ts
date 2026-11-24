/**
 * La lectura de las versiones del Drive de la obra: el pulso (spec 052, RF-12 a RF-16).
 *
 * ── Quién lee qué ──
 *
 * Word, Excel y texto se leen **en el servidor, sin IA**, con los lectores que ya existen
 * (`leerWord` y `libroConNombres`): ya los leen bien, y gratis. Los PDF y las imágenes los
 * **transcribe la IA** (`leer-con-ia.ts`), también los escaneados (RF-14). Lo que no se lee
 * —video, audio, zip— queda «No se pudo leer: tipo no admitido».
 *
 * ── Dos pasos por pulso ──
 *
 *  1. **Leer**: las versiones `pendiente`, y las `leyendo` de hace más de 10 minutos, que se
 *     dan por cortadas y se retoman enteras.
 *  2. **Resumir** (RF-13): las `leido` sin resumen, a partir de su texto ya guardado. Va
 *     aparte para que un documento leído sin IA reciba su resumen cuando el freno se abra.
 *
 * Los dos se detienen al pasar unos 4 minutos: no se toma otra versión, pero la que está en
 * curso termina, porque cortarla tiraría lo que ya se pagó.
 *
 * ── El freno ──
 *
 * Sin `DRIVE_LECTURA_ACTIVA=1`, o sin `ANTHROPIC_API_KEY`, los PDF y las imágenes **se dejan
 * como están** y no se resume nada; el pulso lo dice. Word, Excel y texto se leen igual,
 * porque no cuestan (riesgo 2 del plan).
 *
 * ── Las fallas (RF-15, RF-16) ──
 *
 * Una falla **pasajera** —la red, el almacén, la IA ocupada o con un error suyo, el tiempo
 * agotado— vuelve a «pendiente» hasta el tercer intento; una **definitiva** —el archivo
 * dañado o con contraseña, la IA que se niega— queda «No se pudo leer» de una vez. Lo decide
 * `despuesDeUnaFalla`; aquí solo se escribe. Una lectura cortada cuenta como un intento.
 *
 * Un resumen que falla de forma pasajera se vuelve a pedir en el siguiente pulso; uno
 * definitivo queda vacío (`''`) para no pedirlo para siempre, y el documento sigue leído.
 *
 * ── Tomar una versión ──
 *
 * Se marca `leyendo` con un `update … where` sobre el estado que se vio: si dos pulsos se
 * cruzan, solo uno la toma. Sin transacciones (Neon por HTTP), lo que se escribe después va en
 * un orden que resiste el corte: primero se borran los fragmentos de un intento anterior,
 * luego se insertan los nuevos y **al final** la versión pasa a `leido`.
 *
 * Los fragmentos son datos derivados, no evidencia: el archivo, su copia y su versión no se
 * tocan nunca (principio 4). Los tokens **se suman** a los que ya tenía la versión: lo que se
 * gastó en un intento anterior también se pagó.
 *
 * Solo servidor.
 */
import { and, asc, eq, isNotNull, isNull, lt, or, sql } from 'drizzle-orm';
import { uuidv7 } from 'uuidv7';

import { baseServidor } from '@/db/servidor/cliente';
import { driveArchivos, driveFragmentos, driveVersiones, media } from '@/db/servidor/esquema';
import { leerWord } from '@/features/asistente/servidor/leer-word';
import { leer } from '@/features/media/servidor/almacen';
import { libroConNombres } from '@/features/presupuestos/servidor/leer-excel';
import { clienteDeIa } from '@/features/servidor/ia';
import { esOfficeViejo } from '@/shared/rules/archivos-subidos';
import {
  claseDeArchivoDelDrive,
  CORTADA_DESPUES_DE_MS,
  despuesDeUnaFalla,
  fragmentar,
  lecturaConIaActiva,
  lecturaCortada,
  MOTIVO_SIN_TEXTO,
  MOTIVO_TIPO_NO_ADMITIDO,
  paginasDelLibro,
  paginasDelTexto,
  quedaTiempoEnElPulso,
  seLeeSinIa,
  textoParaResumir,
  type ClaseDeArchivoDelDrive,
  type PaginaLeida,
} from '@/shared/rules/drive';
import { normalizar } from '@/shared/rules/texto';

import { resumir, transcribirImagen, transcribirPdf, type Tokens, type Transcripcion } from './leer-con-ia';

/** Versiones que mira cada paso del pulso. Lo que de verdad lo limita es el tope de tiempo. */
const VERSIONES_POR_PULSO = 50;

/** Fragmentos por sentencia: lejos del tope de parámetros de Postgres. */
const FRAGMENTOS_POR_SENTENCIA = 200;

const SIN_GASTO: Tokens = { tokensEntrada: 0, tokensSalida: 0 };

/** Lee un archivo sin IA. Lanza solo si algo inesperado falla: eso no es culpa del archivo. */
async function leerSinIa(clase: ClaseDeArchivoDelDrive, bytes: Uint8Array<ArrayBuffer>): Promise<Transcripcion> {
  switch (clase) {
    case 'texto':
      return { paginas: paginasDelTexto(new TextDecoder('utf-8').decode(bytes)), ...SIN_GASTO };
    case 'word': {
      const leido = await leerWord(bytes);
      return 'error' in leido ? { motivo: leido.error, ...SIN_GASTO } : { paginas: paginasDelTexto(leido.texto), ...SIN_GASTO };
    }
    case 'excel': {
      // Los .xls y los .xlsx con contraseña son un contenedor OLE, que `exceljs` no abre.
      if (esOfficeViejo(bytes)) {
        return { motivo: 'es un Excel antiguo (.xls) o tiene contraseña; guárdelo como .xlsx o PDF', ...SIN_GASTO };
      }
      try {
        const hojas = await libroConNombres(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength));
        return { paginas: paginasDelLibro(hojas), ...SIN_GASTO };
      } catch (fallo) {
        return { motivo: `no se pudo abrir (${fallo instanceof Error ? fallo.message : 'dañado'})`, ...SIN_GASTO };
      }
    }
    default:
      return { motivo: MOTIVO_TIPO_NO_ADMITIDO, ...SIN_GASTO };
  }
}

function leerVersion(clase: ClaseDeArchivoDelDrive, bytes: Uint8Array<ArrayBuffer>, mime: string, nombre: string) {
  if (clase === 'pdf') return transcribirPdf(bytes, nombre);
  if (clase === 'imagen') return transcribirImagen(bytes, mime, nombre);
  return leerSinIa(clase, bytes);
}

/** Lo gastado, sumado a lo que ya tenía la versión. */
function sumarGasto(gasto: Tokens) {
  return {
    tokensEntrada: sql`${driveVersiones.tokensEntrada} + ${gasto.tokensEntrada}`,
    tokensSalida: sql`${driveVersiones.tokensSalida} + ${gasto.tokensSalida}`,
  };
}

/**
 * Un intento fallido: vuelve a la cola o queda «No se pudo leer», según `despuesDeUnaFalla`.
 * El motivo se guarda también cuando vuelve a la cola: es el de la última falla.
 */
async function anotarFalla(
  versionId: string,
  intentos: number,
  motivo: string,
  pasajera: boolean,
  gasto: Tokens,
): Promise<'reintento' | 'fallida'> {
  const siguiente = despuesDeUnaFalla(intentos, pasajera);
  await baseServidor()
    .update(driveVersiones)
    .set({ estado: siguiente.estado, intentos: siguiente.intentos, motivo, leyendoDesde: null, ...sumarGasto(gasto) })
    .where(eq(driveVersiones.id, versionId));
  return siguiente.estado === 'pendiente' ? 'reintento' : 'fallida';
}

/** Guarda lo leído: fragmentos con su índice de búsqueda y, al final, la versión `leido`. */
async function guardarLectura(
  versionId: string,
  intentos: number,
  paginas: PaginaLeida[],
  gasto: Tokens,
): Promise<'leida' | 'fallida'> {
  const db = baseServidor();
  await db.delete(driveFragmentos).where(eq(driveFragmentos.versionId, versionId));

  const fragmentos = fragmentar(paginas);
  if (fragmentos.length === 0) {
    await anotarFalla(versionId, intentos, MOTIVO_SIN_TEXTO, false, gasto);
    return 'fallida';
  }
  for (let i = 0; i < fragmentos.length; i += FRAGMENTOS_POR_SENTENCIA) {
    await db.insert(driveFragmentos).values(
      fragmentos.slice(i, i + FRAGMENTOS_POR_SENTENCIA).map((f) => ({
        id: uuidv7(),
        versionId,
        orden: f.orden,
        pagina: f.pagina,
        texto: f.texto,
        // Sobre el texto normalizado: así «Interventoría» y «interventoria» son la misma palabra.
        buscable: sql`to_tsvector('spanish', ${normalizar(f.texto)})`,
      })),
    );
  }
  await db
    .update(driveVersiones)
    .set({
      estado: 'leido',
      motivo: null,
      paginas: paginas.length,
      leyendoDesde: null,
      leidoEn: sql`now()`,
      ...sumarGasto(gasto),
    })
    .where(eq(driveVersiones.id, versionId));
  return 'leida';
}

export interface ResultadoDelPulso {
  leidas: number;
  fallidas: number;
  /** Las que fallaron de forma pasajera y volvieron a la cola. */
  reintentos: number;
  resumidas: number;
  /** Las que siguen en «pendiente»: las que esperan a la IA y las que vuelven a intentarse. */
  pendientes: number;
  /** Por qué no se leyeron los PDF y las imágenes ni se resumió, si el freno está puesto o falta la llave. */
  sinIa?: string;
}

/** Por qué no se puede usar la IA ahora, o `null` si se puede. */
function motivoSinIa(): string | null {
  if (!lecturaConIaActiva(process.env.DRIVE_LECTURA_ACTIVA)) {
    return 'La lectura con IA del Drive está apagada (DRIVE_LECTURA_ACTIVA): los PDF y las imágenes esperan en «pendiente», y no se resume.';
  }
  if (!clienteDeIa()) return 'Falta ANTHROPIC_API_KEY: los PDF y las imágenes esperan en «pendiente», y no se resume.';
  return null;
}

/** Paso 1: leer lo pendiente y retomar lo cortado. */
async function leerLoPendiente(inicio: number, sinIa: string | null, cuenta: ResultadoDelPulso) {
  const db = baseServidor();
  const hace10Minutos = sql`now() - make_interval(secs => ${CORTADA_DESPUES_DE_MS / 1000})`;
  const candidatas = await db
    .select({
      id: driveVersiones.id,
      estado: driveVersiones.estado,
      intentos: driveVersiones.intentos,
      leyendoDesde: driveVersiones.leyendoDesde,
      mime: driveArchivos.mime,
      nombre: driveArchivos.nombre,
      clave: media.claveR2,
      mimeDeLaCopia: media.mime,
    })
    .from(driveVersiones)
    .innerJoin(driveArchivos, eq(driveArchivos.id, driveVersiones.archivoId))
    .innerJoin(media, eq(media.id, driveVersiones.mediaId))
    .where(
      and(
        isNotNull(media.claveR2),
        or(
          eq(driveVersiones.estado, 'pendiente'),
          and(
            eq(driveVersiones.estado, 'leyendo'),
            or(isNull(driveVersiones.leyendoDesde), lt(driveVersiones.leyendoDesde, hace10Minutos)),
          ),
        ),
      ),
    )
    .orderBy(asc(driveVersiones.creadoEn))
    .limit(VERSIONES_POR_PULSO);

  for (const version of candidatas) {
    if (!quedaTiempoEnElPulso(inicio, Date.now())) break;
    const clase = claseDeArchivoDelDrive(version.mime, version.nombre);
    if (sinIa && !seLeeSinIa(clase)) continue;

    // Una lectura cortada cuenta como un intento pasajero: si ya era el tercero, no se retoma.
    let intentos = version.intentos;
    if (version.estado === 'leyendo') {
      if (!lecturaCortada(version.leyendoDesde, Date.now())) continue;
      const siguiente = despuesDeUnaFalla(intentos, true);
      if (siguiente.estado === 'no_se_pudo') {
        const cerradas = await db
          .update(driveVersiones)
          .set({ estado: 'no_se_pudo', intentos: siguiente.intentos, motivo: 'la lectura se cortó varias veces', leyendoDesde: null })
          .where(and(eq(driveVersiones.id, version.id), eq(driveVersiones.estado, 'leyendo')))
          .returning({ id: driveVersiones.id });
        if (cerradas.length > 0) cuenta.fallidas++;
        continue;
      }
      intentos = siguiente.intentos;
    }

    const loQueSeVio =
      version.estado === 'pendiente'
        ? eq(driveVersiones.estado, 'pendiente')
        : and(
            eq(driveVersiones.estado, 'leyendo'),
            or(isNull(driveVersiones.leyendoDesde), lt(driveVersiones.leyendoDesde, hace10Minutos)),
          );
    const tomada = await db
      .update(driveVersiones)
      .set({ estado: 'leyendo', leyendoDesde: sql`now()`, intentos })
      .where(and(eq(driveVersiones.id, version.id), loQueSeVio))
      .returning({ id: driveVersiones.id });
    if (tomada.length === 0) continue; // Otro pulso la tomó.

    try {
      const archivo = version.clave ? await leer(version.clave) : null;
      if (!archivo) throw new Error('la copia no está en el almacén');
      const lectura = await leerVersion(clase, archivo.contenido, version.mimeDeLaCopia, version.nombre);
      const gasto = { tokensEntrada: lectura.tokensEntrada, tokensSalida: lectura.tokensSalida };
      const resultado =
        'motivo' in lectura
          ? await anotarFalla(version.id, intentos, lectura.motivo, lectura.pasajera ?? false, gasto)
          : await guardarLectura(version.id, intentos, lectura.paginas, gasto);
      if (resultado === 'leida') cuenta.leidas++;
      else if (resultado === 'reintento') cuenta.reintentos++;
      else cuenta.fallidas++;
    } catch (fallo) {
      // Lo que no es del archivo ni de la IA (la red, el almacén) es pasajero.
      console.error('[drive] No se pudo leer la versión', version.id, fallo);
      const motivo = `falla del servidor (${fallo instanceof Error ? fallo.message : 'desconocida'})`;
      const resultado = await anotarFalla(version.id, intentos, motivo, true, SIN_GASTO);
      if (resultado === 'reintento') cuenta.reintentos++;
      else cuenta.fallidas++;
    }
  }
}

/** Paso 2: resumir lo leído que todavía no tiene resumen (RF-13). */
async function resumirLoLeido(inicio: number, cuenta: ResultadoDelPulso) {
  const db = baseServidor();
  const sinResumen = await db
    .select({ id: driveVersiones.id, nombre: driveArchivos.nombre, subcarpeta: driveArchivos.subcarpeta })
    .from(driveVersiones)
    .innerJoin(driveArchivos, eq(driveArchivos.id, driveVersiones.archivoId))
    .where(and(eq(driveVersiones.estado, 'leido'), isNull(driveVersiones.resumen)))
    .orderBy(asc(driveVersiones.leidoEn))
    .limit(VERSIONES_POR_PULSO);

  for (const version of sinResumen) {
    if (!quedaTiempoEnElPulso(inicio, Date.now())) break;
    const fragmentos = await db
      .select({ pagina: driveFragmentos.pagina, texto: driveFragmentos.texto })
      .from(driveFragmentos)
      .where(eq(driveFragmentos.versionId, version.id))
      .orderBy(asc(driveFragmentos.orden));
    const resumen = await resumir(textoParaResumir(fragmentos), version.nombre, version.subcarpeta);
    if ('motivo' in resumen && resumen.pasajera) continue; // El siguiente pulso lo vuelve a pedir.
    if ('motivo' in resumen) console.error('[drive] No se pudo resumir la versión', version.id, resumen.motivo);
    // Con `where resumen is null`: si otro pulso lo escribió primero, no se pisa.
    await db
      .update(driveVersiones)
      .set({ resumen: 'resumen' in resumen ? resumen.resumen : '', ...sumarGasto(resumen) })
      .where(and(eq(driveVersiones.id, version.id), isNull(driveVersiones.resumen)));
    if ('resumen' in resumen) cuenta.resumidas++;
  }
}

/** El pulso: lee lo pendiente, retoma lo cortado y resume lo leído, durante unos 4 minutos. */
export async function pulsoDelDrive(): Promise<ResultadoDelPulso> {
  const inicio = Date.now();
  const sinIa = motivoSinIa();
  const cuenta: ResultadoDelPulso = { leidas: 0, fallidas: 0, reintentos: 0, resumidas: 0, pendientes: 0 };

  await leerLoPendiente(inicio, sinIa, cuenta);
  if (!sinIa) await resumirLoLeido(inicio, cuenta);

  const [{ pendientes }] = await baseServidor()
    .select({ pendientes: sql<number>`count(*)::int` })
    .from(driveVersiones)
    .where(eq(driveVersiones.estado, 'pendiente'));
  return { ...cuenta, pendientes, ...(sinIa ? { sinIa } : {}) };
}
