/**
 * Subir el Excel de planificación y leerlo (spec 043, RF-1 a RF-10). **Solo servidor.**
 *
 * La lectura va en dos pasos con el mismo archivo, como el presupuesto de la 031: primero se
 * proponen las hojas y la persona las confirma, y solo entonces se lee lo confirmado. Proponer es
 * barato (unas filas por hoja); leer cuesta cerca de un dólar y tres minutos, y por eso no se lanza
 * sobre hojas que nadie confirmó (RF-6).
 *
 * Las validaciones de la subida van antes de llamar a la IA y se repiten en los dos pasos: el
 * servidor no confía en que el navegador haya pasado por el primero. El orden importa: el permiso
 * y la obra los resuelve la ruta; aquí va lo que depende del archivo y del presupuesto.
 *
 * ── Una lectura a la vez por obra (RF-117) ──
 *
 * La reserva es la fila `en_curso` y la garantiza el índice único parcial, no una consulta previa:
 * dos subidas simultáneas no pueden ver las dos «no hay ninguna» y pasar. Como la lectura corre por
 * detrás y el proceso puede morir a mitad, cada fila trae su vencimiento; la siguiente subida marca
 * `fallida` la que se pasó de tiempo antes de reservar, y así una lectura muerta no bloquea la obra
 * para siempre. Sin transacciones (Neon por HTTP), vencer y reservar son dos sentencias: si otra
 * subida se cuela entre las dos, el índice la rechaza igual.
 *
 * El original se guarda antes de leer, colgado del id de la planificación que se va a crear, que se
 * reserva aquí (RF-8). Si la lectura falla, el archivo queda en el almacén sin planificación: es un
 * objeto huérfano, no un dato que falte, y nada se borra.
 *
 * ── La lectura por detrás (RF-7, RF-9, RF-10) ──
 *
 * La ruta responde 202 y la lectura sigue en el mismo proceso: el proxy del VPS corta a los 120 s y
 * la IA puede tardar 4 minutos. Todo lo que pase termina escrito en la fila de la lectura —`lista`
 * con su borrador, `falta_grupo` con los candidatos o `fallida` con el motivo—, porque nadie está
 * esperando la promesa. Lo que leyó la IA se guarda por archivo y hojas antes de comprobar nada: un
 * cruce que falla o un grupo por escoger no vuelven a pagar la lectura.
 *
 * El borrador se crea en un lote junto con el cambio de estado de la lectura y el descarte del
 * borrador sustituido, para que no quede uno sin lo otro. Sin transacciones interactivas no se puede
 * condicionar ese lote a que la lectura siga `en_curso`; se mira justo antes, y la vigencia de seis
 * minutos contra los cuatro del tope de la IA deja ese hueco en lo improbable.
 *
 * ── La propuesta del calendario (spec 045, RF-8 a RF-31) ──
 *
 * Crear un borrador desde el presupuesto usa la misma fila y el mismo índice, con `tipo =
 * 'calendario'`: así una propuesta y una lectura de Excel no pueden correr a la vez en la misma
 * obra (RF-29), sin código aparte. Todo lo que se puede rechazar se rechaza antes de reservar
 * —presupuesto, grupo, plazo, de dónde copiar los indirectos, el borrador por sustituir— y el
 * borrador entero se arma ahí mismo con la regla; por detrás solo se le pide el calendario a la IA.
 * Si la IA falla, el borrador nace igual, sin calendario y con el aviso (RF-24, RF-25), y nace
 * cuando la IA termina, no antes (RF-30).
 *
 * ── Los indirectos del Excel (spec 045, RF-32 a RF-43) ──
 *
 * La lectura de un Excel lanza dos llamadas a la IA **a la vez**: la de ítems de la 043 y la de
 * indirectos por renglón. En serie se pasarían de la reserva de la obra (cuatro minutos cada una
 * contra seis de vigencia). Las dos reciben el mismo texto, con las mismas hojas en el mismo orden,
 * para que «H1» sea la misma hoja en las dos y sus cifras descartadas se puedan mostrar juntas.
 * Cada una tiene su caché por archivo y hojas: volver a subir el mismo Excel no paga ninguna. Si la
 * de indirectos falla, el borrador entra igual con «Indirectos sin desglose».
 */
import { and, eq, gt, lt, max, ne, sql } from 'drizzle-orm';
import { uuidv7 } from 'uuidv7';

import { baseServidor } from '@/db/servidor/cliente';
import { media, obras, planificaciones, planificacionLecturas, planificacionLecturasIa, presupuestos } from '@/db/servidor/esquema';
import { leerContrato } from '@/features/contratos/servidor/contrato';
import { claveDeObjeto, guardar } from '@/features/media/servidor/almacen';
import type {
  EstadoDeLectura,
  LecturaIniciada,
  PedidoDesdePresupuesto,
  PropuestaDeHojasRespuesta,
} from '@/features/panel/planificacion';
import { pareceXlsx, TAMANO_MAXIMO } from '@/features/presupuestos/servidor/importar';
import { libroConNombres } from '@/features/presupuestos/servidor/leer-excel';
import { alcanzaLaObra } from '@/features/servidor/alcance';
import type { PersonaEnSesion } from '@/features/servidor/guardia';
import { errorDePeticion } from '@/features/servidor/respuestas';
import { aHex } from '@/shared/cripto/formato-pbkdf2';
import {
  cruzarConPresupuesto,
  hallazgosDelBorrador,
  resumenDeLaPlanificacion,
  type EstructuraDePlanificacion,
  type HallazgoDelBorrador,
} from '@/shared/rules/planificacion';
import { borradorDesdePresupuesto, recalcularPlanificacion } from '@/shared/rules/planificacion-borrador';
import { renglonesParaCopiar } from '@/shared/rules/planificacion-indirectos';
import { textoParaElCalendario, validarCalendario } from '@/shared/rules/planificacion-calendario-ia';
import {
  borradorDelExcel,
  estructuraDeLaLectura,
  limpiarPropuesta,
  muestraParaProponer,
  repasarSeleccion,
  textoParaLeer,
  type HojaDelLibro,
  type LecturaDeIndirectos,
  type LecturaDePlanificacion,
  type PropuestaDeHojas,
  type SeleccionDeHojas,
} from '@/shared/rules/planificacion-ia';

import {
  leerIndirectos,
  leerPlanificacion,
  proponerCalendario,
  proponerHojas,
  TIEMPO_MAXIMO_DE_LECTURA_MS,
  type RespuestaDeIa,
} from './leer-con-ia';

const MIME_XLSX = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

/**
 * Cuánto bloquea la obra una lectura: el tope de la IA más lo que tardan el cruce y el borrador.
 * Tiene que pasar del tope (notas de T16): si venciera antes, otra subida podría arrancar mientras
 * la primera sigue viva y pagar dos veces.
 */
const VIGENCIA_DE_UNA_LECTURA_MS = TIEMPO_MAXIMO_DE_LECTURA_MS + 2 * 60 * 1000;

/** El presupuesto contra el que se cruzará: el vigente de la obra (RF-2, RF-19). */
async function presupuestoVigente(obraId: string) {
  const [vigente] = await baseServidor()
    .select({ id: presupuestos.id, numeroVersion: presupuestos.numeroVersion, estructura: presupuestos.estructura })
    .from(presupuestos)
    .where(and(eq(presupuestos.obraId, obraId), eq(presupuestos.estado, 'vigente')))
    .limit(1);
  return vigente ?? null;
}

/**
 * RF-2, RF-3: el libro, si se puede leer contra un presupuesto vigente; si no, la respuesta que
 * explica por qué. El presupuesto va primero: si falta, no tiene sentido que la persona arregle el
 * archivo para luego enterarse.
 */
export async function libroDeLaSubida(obraId: string, contenido: Uint8Array<ArrayBuffer>): Promise<HojaDelLibro[] | Response> {
  if (!(await presupuestoVigente(obraId))) {
    return errorDePeticion(
      'Esta obra no tiene presupuesto vigente. Primero hay que aprobar el presupuesto en Contrato y luego subir la planificación.',
      409,
    );
  }
  if (contenido.byteLength === 0) return errorDePeticion('El archivo llegó vacío.', 422);
  if (contenido.byteLength > TAMANO_MAXIMO) return errorDePeticion('El archivo pesa más de 20 MB.', 413);
  // RF-3: lo que manda es el contenido, no el nombre. Un .xls renombrado no empieza por «PK».
  if (!pareceXlsx(contenido)) {
    return errorDePeticion(
      'Ese archivo no es un Excel (.xlsx), aunque su nombre lo diga. Ábralo en Excel y guárdelo como «Libro de Excel (.xlsx)».',
      422,
    );
  }
  try {
    return await libroConNombres(contenido.buffer);
  } catch {
    return errorDePeticion('No pude abrir el archivo como Excel. Revise que no esté dañado ni protegido.', 422);
  }
}

/** RF-43: el borrador que una subida nueva sustituiría, si lo hay. */
async function borradorDeLaObra(obraId: string) {
  const [borrador] = await baseServidor()
    .select({ id: planificaciones.id, numeroVersion: planificaciones.numeroVersion, version: planificaciones.version })
    .from(planificaciones)
    .where(and(eq(planificaciones.obraId, obraId), eq(planificaciones.estado, 'borrador')))
    .limit(1);
  return borrador ?? null;
}

/** RF-117: vence las lecturas y propuestas de la obra que se pasaron de tiempo. */
async function vencerLasPasadas(obraId: string, ahora: Date): Promise<void> {
  await baseServidor()
    .update(planificacionLecturas)
    .set({ estado: 'fallida', error: 'La lectura se pasó del tiempo y se dio por perdida. Vuelva a subir el archivo.', actualizadoEn: ahora })
    .where(
      and(
        eq(planificacionLecturas.obraId, obraId),
        eq(planificacionLecturas.estado, 'en_curso'),
        lt(planificacionLecturas.venceEn, ahora),
      ),
    );
}

/**
 * Spec 045, RF-29: si ya hay una lectura o una propuesta viva en la obra, el 409, antes de gastar en
 * la IA. No es la garantía —esa es el índice al reservar—: es no pagar una llamada que va a chocar.
 */
export async function enCursoEnLaObra(obraId: string): Promise<Response | null> {
  const [viva] = await baseServidor()
    .select({ tipo: planificacionLecturas.tipo })
    .from(planificacionLecturas)
    .where(
      and(
        eq(planificacionLecturas.obraId, obraId),
        eq(planificacionLecturas.estado, 'en_curso'),
        gt(planificacionLecturas.venceEn, new Date()),
      ),
    )
    .limit(1);
  if (!viva) return null;
  return errorDePeticion(
    viva.tipo === 'calendario'
      ? 'La IA está proponiendo el calendario de un borrador en esta obra. Espere a que termine y vuelva a intentarlo.'
      : 'Ya se está leyendo un Excel de planificación en esta obra. Espere a que termine y vuelva a intentarlo.',
    409,
  );
}

/**
 * Spec 045, RF-28: la propuesta del calendario viva en la obra, para mostrarla a quien abra la
 * pantalla aunque no la haya lanzado. Una vencida no cuenta: se dio por perdida (RF-9 de la 043).
 */
export async function propuestaEnCurso(obraId: string): Promise<{ lecturaId: string; desde: string } | null> {
  const [viva] = await baseServidor()
    .select({ id: planificacionLecturas.id, creadoEn: planificacionLecturas.creadoEn })
    .from(planificacionLecturas)
    .where(
      and(
        eq(planificacionLecturas.obraId, obraId),
        eq(planificacionLecturas.estado, 'en_curso'),
        eq(planificacionLecturas.tipo, 'calendario'),
        gt(planificacionLecturas.venceEn, new Date()),
      ),
    )
    .limit(1);
  return viva ? { lecturaId: viva.id, desde: viva.creadoEn.toISOString() } : null;
}

async function huellaDe(contenido: Uint8Array<ArrayBuffer>): Promise<string> {
  return aHex(new Uint8Array(await crypto.subtle.digest('SHA-256', contenido)));
}

/**
 * La propuesta de cada archivo, en la memoria del proceso. Al leer hace falta saber si el libro
 * trae línea base (RF-102, RF-103), y eso lo dijo la propuesta del paso anterior. No se le pide al
 * navegador, que podría devolverla cambiada, ni se guarda en la base: es una ayuda del momento. Si
 * el servidor se reinició entre los dos pasos, se vuelve a pedir, que son unos segundos y centavos.
 */
const PROPUESTAS = new Map<string, { propuesta: PropuestaDeHojas; en: number }>();
const VIDA_DE_UNA_PROPUESTA_MS = 2 * 60 * 60 * 1000;
const PROPUESTAS_MAXIMAS = 50;

async function propuestaDelLibro(huella: string, libro: readonly HojaDelLibro[]): Promise<PropuestaDeHojas | Response> {
  const ahora = Date.now();
  const guardada = PROPUESTAS.get(huella);
  if (guardada && ahora - guardada.en < VIDA_DE_UNA_PROPUESTA_MS) return guardada.propuesta;

  const respuesta = await proponerHojas(muestraParaProponer(libro));
  if (!respuesta.ok) return errorDePeticion(`No se pudo leer con IA: ${respuesta.error} Puede reintentarlo.`, 503);
  const propuesta = limpiarPropuesta(respuesta.datos, libro);
  for (const [llave, { en }] of PROPUESTAS) if (ahora - en >= VIDA_DE_UNA_PROPUESTA_MS) PROPUESTAS.delete(llave);
  if (PROPUESTAS.size >= PROPUESTAS_MAXIMAS) PROPUESTAS.delete(PROPUESTAS.keys().next().value as string);
  PROPUESTAS.set(huella, { propuesta, en: ahora });
  return propuesta;
}

/** RF-4, RF-5, RF-100: qué hojas propone la IA, solo entre las visibles. No escribe nada. */
export async function propuestaDeHojas(obraId: string, contenido: Uint8Array<ArrayBuffer>): Promise<PropuestaDeHojasRespuesta | Response> {
  const libro = await libroDeLaSubida(obraId, contenido);
  if (libro instanceof Response) return libro;

  const hojasVisibles = libro.filter((hoja) => hoja.visible).map((hoja) => hoja.nombre);
  if (hojasVisibles.length === 0) return errorDePeticion('El libro no tiene ninguna hoja a la vista.', 422);

  const propuesta = await propuestaDelLibro(await huellaDe(contenido), libro);
  if (propuesta instanceof Response) return propuesta;

  return { propuesta, hojasVisibles, borrador: await borradorDeLaObra(obraId) };
}

export interface LecturaAbierta {
  lecturaId: string;
  /** El id que tendrá la planificación; el original ya cuelga de él. */
  planificacionId: string;
  mediaId: string;
  /** SHA-256 del archivo, para la lectura guardada (RF-10). */
  huella: string;
  libro: HojaDelLibro[];
}

/**
 * RF-8, RF-117: valida la subida, vence las lecturas pasadas de tiempo, reserva la obra y guarda el
 * original. Un choque con otra lectura en curso sube hasta `responder` como 409 (`duplicadoDe`).
 */
export async function abrirLectura(
  sesion: PersonaEnSesion,
  obraId: string,
  contenido: Uint8Array<ArrayBuffer>,
  /** El libro ya validado por `libroDeLaSubida`, para no abrirlo dos veces. */
  validado?: HojaDelLibro[],
): Promise<LecturaAbierta | Response> {
  const libro = validado ?? (await libroDeLaSubida(obraId, contenido));
  if (libro instanceof Response) return libro;

  const db = baseServidor();
  const ahora = new Date();
  await vencerLasPasadas(obraId, ahora);

  const lecturaId = uuidv7();
  const planificacionId = uuidv7();
  await db.insert(planificacionLecturas).values({
    id: lecturaId,
    obraId,
    planificacionId,
    estado: 'en_curso',
    venceEn: new Date(ahora.getTime() + VIGENCIA_DE_UNA_LECTURA_MS),
    creadoPor: sesion.id,
  });

  const mediaId = uuidv7();
  const huella = await huellaDe(contenido);
  const clave = claveDeObjeto('planificacion', planificacionId, mediaId, MIME_XLSX);
  try {
    await guardar(clave, contenido, MIME_XLSX);
    await db.insert(media).values({
      id: mediaId,
      duenoTipo: 'planificacion',
      duenoId: planificacionId,
      proposito: 'planificacion_excel',
      mime: MIME_XLSX,
      bytes: contenido.byteLength,
      sha256: huella,
      claveR2: clave,
      subidoEn: new Date(),
    });
  } catch (fallo) {
    // Sin el original no hay lectura (RF-8): se suelta la obra en vez de dejarla bloqueada.
    console.error('[planificacion] no se pudo guardar el original:', fallo);
    await db
      .update(planificacionLecturas)
      .set({ estado: 'fallida', error: 'No se pudo guardar el archivo. Vuelva a intentarlo.', actualizadoEn: new Date() })
      .where(eq(planificacionLecturas.id, lecturaId));
    return errorDePeticion('No se pudo guardar el archivo. Vuelva a intentarlo.', 503);
  }

  return { lecturaId, planificacionId, mediaId, huella, libro };
}

export interface OpcionesDeLectura {
  /** RF-43, RF-116: la persona confirmó sustituir el borrador que hay. Lo comprueba la ruta (T20). */
  sustituir: boolean;
  /** RF-107: el grupo del presupuesto escogido para cada frente del libro. */
  grupos: Record<string, string>;
}

async function cerrarLectura(
  lecturaId: string,
  cambio: Pick<typeof planificacionLecturas.$inferInsert, 'estado' | 'error' | 'candidatos'>,
): Promise<void> {
  await baseServidor()
    .update(planificacionLecturas)
    .set({ ...cambio, actualizadoEn: new Date() })
    .where(and(eq(planificacionLecturas.id, lecturaId), eq(planificacionLecturas.estado, 'en_curso')));
}

/** RF-10: la llave de lo guardado. El orden de las hojas cuenta: la cita «H1» es la primera enviada. */
async function llaveDeLaLectura(huella: string, seleccion: SeleccionDeHojas): Promise<string> {
  const bytes = new TextEncoder().encode(`${huella}|${JSON.stringify(seleccion.hojas)}`);
  return aHex(new Uint8Array(await crypto.subtle.digest('SHA-256', bytes)));
}

/**
 * RF-10: lo que ya se leyó con esta llave, o una lectura nueva que se guarda. La llave dice qué
 * lectura es: la de ítems y la de indirectos del mismo archivo no se pisan.
 */
async function conCacheDeIa<T extends LecturaDePlanificacion | LecturaDeIndirectos>(
  sesion: PersonaEnSesion,
  llave: string,
  leer: () => Promise<RespuestaDeIa<T>>,
): Promise<{ ok: true; lectura: T; guardada: boolean } | { ok: false; error: string }> {
  const db = baseServidor();
  const [guardada] = await db
    .select({ lectura: planificacionLecturasIa.lectura })
    .from(planificacionLecturasIa)
    .where(eq(planificacionLecturasIa.llave, llave))
    .limit(1);
  if (guardada) return { ok: true, lectura: guardada.lectura as T, guardada: true };

  const respuesta = await leer();
  if (!respuesta.ok) return { ok: false, error: `No se pudo leer con IA: ${respuesta.error}` };
  await db
    .insert(planificacionLecturasIa)
    .values({
      llave,
      lectura: respuesta.datos,
      modelo: respuesta.modelo,
      tokensEntrada: respuesta.tokensEntrada,
      tokensSalida: respuesta.tokensSalida,
      creadoPor: sesion.id,
    })
    .onConflictDoNothing();
  return { ok: true, lectura: respuesta.datos, guardada: false };
}

/**
 * RF-7, RF-9, RF-10: lee lo confirmado y deja el borrador, o la lectura en `falta_grupo` o
 * `fallida`. No lanza: lo que falle queda escrito en la lectura, porque nadie espera esta promesa.
 * Devuelve si la IA se llamó para cada lectura, para que una prueba lo pueda ver.
 */
export async function correrLectura(
  sesion: PersonaEnSesion,
  obraId: string,
  abierta: LecturaAbierta,
  seleccion: SeleccionDeHojas,
  opciones: OpcionesDeLectura,
): Promise<{ llamoALaIa: boolean; llamoALaIaDeIndirectos: boolean }> {
  let llamoALaIa = false;
  let llamoALaIaDeIndirectos = false;
  const fallar = (error: string) => cerrarLectura(abierta.lecturaId, { estado: 'fallida', error });
  try {
    const enviado = textoParaLeer(seleccion, abierta.libro);
    if (!enviado) {
      await fallar('Las hojas escogidas son demasiado largas para leerlas de una vez. Escoja menos hojas.');
      return { llamoALaIa, llamoALaIaDeIndirectos };
    }

    const llave = await llaveDeLaLectura(abierta.huella, seleccion);
    // Spec 045, RF-36: las dos a la vez, con el mismo texto.
    const [leida, indirectos] = await Promise.all([
      conCacheDeIa(sesion, llave, () => leerPlanificacion(enviado.texto)),
      conCacheDeIa(sesion, `indirectos|${llave}`, () => leerIndirectos(enviado.texto)),
    ]);
    llamoALaIa = !leida.ok || !leida.guardada;
    llamoALaIaDeIndirectos = !indirectos.ok || !indirectos.guardada;
    if (!indirectos.ok) console.error('[planificacion] la lectura de indirectos falló; entra sin desglose:', indirectos.error);
    if (!leida.ok) {
      await fallar(`${leida.error} Puede volver a subir el archivo.`);
      return { llamoALaIa, llamoALaIaDeIndirectos };
    }

    const comprobada = estructuraDeLaLectura(leida.lectura, enviado.hojas);
    if (!comprobada.ok) {
      await fallar(comprobada.error);
      return { llamoALaIa, llamoALaIaDeIndirectos };
    }

    const presupuesto = await presupuestoVigente(obraId);
    if (!presupuesto) {
      await fallar('La obra se quedó sin presupuesto vigente mientras se leía. Apruebe el presupuesto y vuelva a subir el archivo.');
      return { llamoALaIa, llamoALaIaDeIndirectos };
    }

    const { estructura } = comprobada;
    const cruce = cruzarConPresupuesto(estructura.items, estructura.rubros, presupuesto.estructura, opciones.grupos);
    if (!cruce.ok) {
      await cerrarLectura(abierta.lecturaId, { estado: 'falta_grupo', candidatos: cruce.faltaGrupo });
      return { llamoALaIa, llamoALaIaDeIndirectos };
    }

    const cruzada = { ...estructura, items: cruce.items, rubros: cruce.rubros };
    // Spec 045, RF-32 a RF-43: meses del Excel como fijados, plazo deducido e indirectos por renglón.
    const delExcel = borradorDelExcel(cruzada, indirectos.ok ? indirectos.lectura : null, enviado.hojas);
    const { contrato } = await leerContrato(obraId);
    await escribirBorrador(sesion, obraId, abierta.lecturaId, opciones.sustituir, {
      id: abierta.planificacionId,
      estructura: delExcel.estructura,
      hallazgos: hallazgosDelBorrador(delExcel.estructura, contrato?.fechaFin ?? null, delExcel.calculo.hallazgosDeReparto),
      resumen: resumenDeLaPlanificacion(delExcel.estructura, comprobada.totalesDelExcel),
      rechazados: [...comprobada.rechazados, ...delExcel.rechazados],
      huella: abierta.huella,
      hojas: seleccion,
      mediaId: abierta.mediaId,
      origen: 'excel',
      presupuestoId: presupuesto.id,
      presupuestoVersion: presupuesto.numeroVersion,
    });
  } catch (fallo) {
    console.error('[planificacion] la lectura falló:', fallo);
    // Un borrador que no se pidió sustituir choca con el índice: la ruta lo comprueba antes (T20),
    // y esto es el respaldo si otro se creó mientras tanto.
    await fallar(
      'No se pudo crear el borrador. Si ya hay uno en la obra, confirme que quiere sustituirlo y vuelva a subir el archivo.',
    ).catch((otro) => console.error('[planificacion] tampoco se pudo cerrar la lectura:', otro));
  }
  return { llamoALaIa, llamoALaIaDeIndirectos };
}

/** Lanza la lectura sin esperarla: la ruta responde 202 y el estado se consulta aparte (RF-9). */
export function lanzarLectura(...argumentos: Parameters<typeof correrLectura>): void {
  void correrLectura(...argumentos);
}

/**
 * RF-6, RF-43, RF-100 a RF-103, RF-107, RF-117: todo lo que se puede rechazar se rechaza aquí, antes
 * de reservar la obra y pagar la lectura; lo demás corre por detrás. Escoger el grupo de un frente
 * es volver a subir el mismo archivo con `grupos`: la lectura guardada hace que no cueste otra vez.
 * Spec 045, RF-29: con una propuesta o una lectura viva en la obra, 409 antes de pedir las hojas.
 */
export async function iniciarLectura(
  sesion: PersonaEnSesion,
  obraId: string,
  contenido: Uint8Array<ArrayBuffer>,
  seleccion: SeleccionDeHojas,
  opciones: OpcionesDeLectura,
): Promise<LecturaIniciada | Response> {
  // RF-29: lo más barato primero; para decir «espere a que termine» no hace falta abrir el archivo.
  const enCurso = await enCursoEnLaObra(obraId);
  if (enCurso) return enCurso;
  const libro = await libroDeLaSubida(obraId, contenido);
  if (libro instanceof Response) return libro;

  const choque = await choqueConElBorrador(obraId, opciones.sustituir);
  if (choque) return choque;

  const propuesta = await propuestaDelLibro(await huellaDe(contenido), libro);
  if (propuesta instanceof Response) return propuesta;
  const faltas = repasarSeleccion(seleccion, propuesta, libro);
  if (faltas.length > 0) return Response.json({ error: faltas[0].mensaje, faltas }, { status: 422 });

  const abierta = await abrirLectura(sesion, obraId, contenido, libro);
  if (abierta instanceof Response) return abierta;
  lanzarLectura(sesion, obraId, abierta, seleccion, opciones);
  return { lecturaId: abierta.lecturaId };
}

/** RF-9, RF-107: en qué va una lectura de una obra al alcance; `null` si no existe o no le toca. */
export async function estadoDeLectura(sesion: PersonaEnSesion, lecturaId: string): Promise<EstadoDeLectura | null> {
  const [fila] = await baseServidor().select().from(planificacionLecturas).where(eq(planificacionLecturas.id, lecturaId)).limit(1);
  if (!fila || !alcanzaLaObra(sesion, fila.obraId)) return null;
  // Una lectura muerta se ve como lo que es aunque nadie la haya vencido todavía: la vence la
  // siguiente subida, y consultar no escribe.
  if (fila.estado === 'en_curso' && fila.venceEn.getTime() < Date.now()) {
    return { estado: 'fallida', planificacionId: null, error: 'La lectura se pasó del tiempo y se dio por perdida. Vuelva a subir el archivo.', candidatos: null };
  }
  return {
    estado: fila.estado,
    tipo: fila.tipo,
    planificacionId: fila.estado === 'lista' ? fila.planificacionId : null,
    error: fila.error,
    candidatos: fila.estado === 'falta_grupo' ? fila.candidatos : null,
  };
}

// ── Lo que comparten la lectura de un Excel y la propuesta del calendario ──

/** RF-43, RF-142: con borrador y sin confirmar que se sustituye, el 409 que lo explica. */
export async function choqueConElBorrador(obraId: string, sustituir: boolean): Promise<Response | null> {
  const borrador = await borradorDeLaObra(obraId);
  if (!borrador || sustituir) return null;
  return Response.json(
    {
      error: `Esta obra ya tiene un borrador de planificación (v${borrador.numeroVersion}). Confirme que quiere sustituirlo; el anterior queda descartado.`,
      borrador,
    },
    { status: 409 },
  );
}

export type BorradorNuevo = Pick<
  typeof planificaciones.$inferInsert,
  | 'id'
  | 'estructura'
  | 'hallazgos'
  | 'resumen'
  | 'rechazados'
  | 'huella'
  | 'hojas'
  | 'mediaId'
  | 'origen'
  | 'copiadaDe'
  | 'presupuestoId'
  | 'presupuestoVersion'
>;

/**
 * RF-30, RF-44, RF-116, RF-143: el borrador en un lote con el cierre de la lectura y el descarte del
 * sustituido. Si la lectura ya no está en curso —venció y otra la reemplazó—, no escribe nada.
 * Spec 045: copiar una versión no tiene lectura (`lecturaId` nulo); entonces devuelve si lo escribió.
 */
export async function escribirBorrador(
  sesion: PersonaEnSesion,
  obraId: string,
  lecturaId: string | null,
  sustituir: boolean,
  nuevo: BorradorNuevo,
): Promise<boolean> {
  const db = baseServidor();
  const [borrador] = await db
    .select({ id: planificaciones.id })
    .from(planificaciones)
    .where(and(eq(planificaciones.obraId, obraId), eq(planificaciones.estado, 'borrador')))
    .limit(1);
  // RF-44, RF-116: el sustituido sale de la cuenta, y así el nuevo conserva su número.
  const sustituido = sustituir ? borrador : undefined;
  const [ultima] = await db
    .select({ numero: max(planificaciones.numeroVersion) })
    .from(planificaciones)
    .where(
      and(
        eq(planificaciones.obraId, obraId),
        ne(planificaciones.estado, 'descartada'),
        sustituido ? ne(planificaciones.id, sustituido.id) : sql`true`,
      ),
    );

  if (lecturaId) {
    const [lectura] = await db
      .select({ estado: planificacionLecturas.estado })
      .from(planificacionLecturas)
      .where(eq(planificacionLecturas.id, lecturaId));
    if (lectura?.estado !== 'en_curso') return false;
  }

  const ahora = new Date();
  const crear = db.insert(planificaciones).values({
    ...nuevo,
    obraId,
    numeroVersion: (ultima?.numero ?? 0) + 1,
    estado: 'borrador',
    creadoPor: sesion.id,
  });
  const marcarLista = lecturaId
    ? db
        .update(planificacionLecturas)
        .set({ estado: 'lista', error: null, candidatos: null, actualizadoEn: ahora })
        .where(eq(planificacionLecturas.id, lecturaId))
    : null;
  const descartar = sustituido
    ? db
        .update(planificaciones)
        .set({ estado: 'descartada', descartadoEn: ahora, descartadoPor: sesion.id, actualizadoPor: sesion.id, actualizadoEn: ahora })
        .where(and(eq(planificaciones.id, sustituido.id), eq(planificaciones.estado, 'borrador')))
    : null;
  if (descartar && marcarLista) await db.batch([descartar, crear, marcarLista]);
  else if (descartar) await db.batch([descartar, crear]);
  else if (marcarLista) await db.batch([crear, marcarLista]);
  else await crear;
  return true;
}

// ── Spec 045: crear el borrador desde el presupuesto (RF-8 a RF-31, RF-112, RF-113, RF-142, RF-143) ──

/** RF-112, RF-113: los indirectos de otra planificación, si se puede copiar de ella. */
async function fuenteDeIndirectos(sesion: PersonaEnSesion, id: string) {
  const [fila] = await baseServidor()
    .select({
      id: planificaciones.id,
      obraId: planificaciones.obraId,
      estado: planificaciones.estado,
      numeroVersion: planificaciones.numeroVersion,
      estructura: planificaciones.estructura,
      obra: obras.nombre,
    })
    .from(planificaciones)
    .innerJoin(obras, eq(obras.id, planificaciones.obraId))
    .where(eq(planificaciones.id, id))
    .limit(1);
  if (!fila || !alcanzaLaObra(sesion, fila.obraId)) {
    return errorDePeticion('No se encontró la planificación de la cual copiar los indirectos.', 422);
  }
  // P10: vigentes o reemplazadas; ni anuladas ni descartadas, ni borradores sin aprobar.
  if (fila.estado !== 'vigente' && fila.estado !== 'reemplazada') {
    return errorDePeticion('Los indirectos solo se copian de una planificación vigente o reemplazada.', 422);
  }
  // RF-113: una de la 043 solo tiene «Indirectos sin desglose». La misma regla que la lista.
  const desglosados = renglonesParaCopiar(fila.estado, fila.estructura);
  if (!desglosados) {
    return errorDePeticion('Esa planificación no tiene los indirectos desglosados por renglón: no hay de dónde copiarlos.', 422);
  }
  return {
    id: fila.id,
    obra: fila.obra,
    version: fila.numeroVersion,
    estructura: { ...fila.estructura, renglonesIndirectos: desglosados },
  };
}

/** Lo que la propuesta necesita para terminar el borrador por detrás. */
export interface PropuestaAbierta {
  lecturaId: string;
  planificacionId: string;
  borrador: EstructuraDePlanificacion;
  presupuestoId: string;
  presupuestoVersion: number;
  sustituir: boolean;
}

/**
 * RF-8 a RF-13, RF-29, RF-112, RF-113, RF-142: valida, arma el borrador con la regla y reserva la
 * obra. Lo que falla antes de reservar es un 409 o un 422 con su motivo; el choque con otra lectura
 * que se cuele entre la consulta y la reserva sube como 409 por el índice.
 */
export async function iniciarPropuesta(
  sesion: PersonaEnSesion,
  obraId: string,
  pedido: PedidoDesdePresupuesto,
): Promise<PropuestaAbierta | Response> {
  const presupuesto = await presupuestoVigente(obraId);
  if (!presupuesto) {
    return errorDePeticion(
      'Esta obra no tiene presupuesto vigente. Primero hay que aprobar el presupuesto en Contrato y luego crear la planificación.',
      422,
    );
  }
  const enCurso = await enCursoEnLaObra(obraId);
  if (enCurso) return enCurso;
  const choque = await choqueConElBorrador(obraId, pedido.sustituir);
  if (choque) return choque;

  const fuente = pedido.copiarIndirectosDe ? await fuenteDeIndirectos(sesion, pedido.copiarIndirectosDe) : null;
  if (fuente instanceof Response) return fuente;
  const armado = borradorDesdePresupuesto(presupuesto.estructura, {
    plazo: pedido.plazo,
    grupoId: pedido.grupoId,
    copiarIndirectosDe: fuente,
  });
  if (!armado.ok) return errorDePeticion(armado.error, 422);

  const ahora = new Date();
  await vencerLasPasadas(obraId, ahora);
  const lecturaId = uuidv7();
  const planificacionId = uuidv7();
  await baseServidor()
    .insert(planificacionLecturas)
    .values({
      id: lecturaId,
      obraId,
      planificacionId,
      tipo: 'calendario',
      pedido: { plazo: pedido.plazo, grupoId: pedido.grupoId, copiarIndirectosDe: pedido.copiarIndirectosDe },
      estado: 'en_curso',
      venceEn: new Date(ahora.getTime() + VIGENCIA_DE_UNA_LECTURA_MS),
      creadoPor: sesion.id,
    });
  return {
    lecturaId,
    planificacionId,
    borrador: armado.estructura,
    presupuestoId: presupuesto.id,
    presupuestoVersion: presupuesto.numeroVersion,
    sustituir: pedido.sustituir,
  };
}

/**
 * RF-19 a RF-27, RF-30, RF-31: pide el calendario y deja el borrador. Si la IA falla, el borrador
 * nace sin calendario y con el aviso. No lanza: lo que falle queda escrito en la lectura. `proponer`
 * se puede cambiar para probar el camino de la IA que falla sin gastar en ella.
 */
export async function correrPropuesta(
  sesion: PersonaEnSesion,
  obraId: string,
  abierta: PropuestaAbierta,
  proponer: typeof proponerCalendario = proponerCalendario,
): Promise<void> {
  try {
    const respuesta = await proponer(textoParaElCalendario(abierta.borrador));
    let estructura: EstructuraDePlanificacion;
    if (respuesta.ok) {
      estructura = validarCalendario(abierta.borrador, respuesta.datos).estructura;
    } else {
      console.error('[planificacion] la propuesta del calendario falló:', respuesta.error);
      estructura = { ...abierta.borrador, propuesta: { explicacion: '', fallida: true } };
    }
    const { calculo } = recalcularPlanificacion(estructura);
    const { contrato } = await leerContrato(obraId);
    const hallazgos: HallazgoDelBorrador[] = hallazgosDelBorrador(estructura, contrato?.fechaFin ?? null, calculo.hallazgosDeReparto);
    await escribirBorrador(sesion, obraId, abierta.lecturaId, abierta.sustituir, {
      id: abierta.planificacionId,
      estructura,
      hallazgos,
      resumen: resumenDeLaPlanificacion(estructura),
      rechazados: [],
      huella: null,
      hojas: null,
      mediaId: null,
      origen: 'presupuesto',
      presupuestoId: abierta.presupuestoId,
      presupuestoVersion: abierta.presupuestoVersion,
    });
  } catch (fallo) {
    console.error('[planificacion] la propuesta falló:', fallo);
    await cerrarLectura(abierta.lecturaId, {
      estado: 'fallida',
      error: 'No se pudo crear el borrador. Si ya hay uno en la obra, confirme que quiere sustituirlo y vuelva a intentarlo.',
    }).catch((otro) => console.error('[planificacion] tampoco se pudo cerrar la propuesta:', otro));
  }
}

/** RF-31: corre por detrás; la ruta responde 202 y el estado se consulta en `lecturas/:id`. */
export function lanzarPropuesta(...argumentos: Parameters<typeof correrPropuesta>): void {
  void correrPropuesta(...argumentos);
}
