/**
 * Qué foto de WhatsApp entra a las «Fotos del día» de una bitácora (spec 027).
 *
 * Pura: quien la usa (`sincronizarFotosDelDia`, el script de los días pasados) lee las
 * fotos y la bitácora, y aquí solo se decide.
 *
 * ── Qué entra ──
 *
 * Toda foto de la obra de ese día (RF-1), salvo los vales —de cantera y de almacén, que
 * ya son el soporte de su módulo (RF-3, RF-4)—, lo que la IA marcó como «Ignorar» (RF-5)
 * y lo que no es una imagen: los videos se quedan en el historial (RF-6). La foto cuyo
 * mensaje aún no tiene categoría o día no se descarta: espera (RF-10), y la próxima vez
 * que se mire el día ya lo tendrá.
 *
 * ── La bitácora cerrada ──
 *
 * Es evidencia firmada y no se toca (RF-20). La foto que llega **después** del cierre se
 * aparta en «No se pudo guardar» para que alguien la vea (RF-21); la que ya estaba antes
 * del cierre y no entró —una bitácora cerrada antes de esta spec— no se agrega ni se
 * avisa (RF-31): avisar de cada foto vieja llenaría la lista de ruido.
 */

/** Una foto de WhatsApp que podría ir a la bitácora, con lo que hace falta para decidir. */
export interface FotoCandidata {
  mediaId: string;
  mensajeId: string;
  mime: string;
  /** La categoría que puso la IA; `null` si el mensaje aún no se clasificó. */
  categoria: string | null;
  /** El día del hecho que se reconoció en el mensaje; `null` si aún no se sabe. */
  fechaHecho: string | null;
  /** La huella del archivo: la misma foto mandada dos veces tiene la misma (RF-8). */
  sha256: string | null;
  /** Cuándo llegó el archivo al servidor. */
  recibidaEnMs: number;
}

/** La bitácora a la que se le busca fotos. */
export interface BitacoraParaFotos {
  fecha: string;
  /** Cuándo se cerró, o `null` si sigue abierta. */
  cerradaEnMs: number | null;
}

/** Lo que se hace con una foto: agregarla, avisar que su bitácora ya cerró, o nada. */
export type DecisionDeFoto = 'agregar' | 'apartar_cerrada' | 'no';

/**
 * El primer día que recibe fotos (RF-29, RF-31): el primero que se reportó por WhatsApp
 * con la bitácora armada sola. Las bitácoras anteriores se quedan con su foto del día.
 */
export const PRIMER_DIA_CON_FOTOS = '2026-10-07';

/** Las categorías cuyas fotos nunca van a las «Fotos del día» (RF-3 a RF-5). */
const CATEGORIAS_SIN_FOTOS: readonly string[] = ['suministro_cantera', 'reporte_almacen', 'ignorar'];

/** Qué se hace con `foto` en la bitácora de su día (RF-1 a RF-6, RF-10, RF-20, RF-21, RF-31). */
export function fotoEntraALaBitacora(foto: FotoCandidata, bitacora: BitacoraParaFotos): DecisionDeFoto {
  if (!foto.mime.startsWith('image/')) return 'no';
  if (foto.categoria === null || CATEGORIAS_SIN_FOTOS.includes(foto.categoria)) return 'no';
  if (foto.fechaHecho === null || foto.fechaHecho !== bitacora.fecha) return 'no';
  if (bitacora.fecha < PRIMER_DIA_CON_FOTOS) return 'no';
  if (bitacora.cerradaEnMs !== null) {
    return foto.recibidaEnMs > bitacora.cerradaEnMs ? 'apartar_cerrada' : 'no';
  }
  return 'agregar';
}

/**
 * De las fotos que pueden entrar, las que faltan por agregar (RF-8, RF-12, RF-27): ni las
 * que ya tienen su fila en la bitácora —agregadas **o quitadas**: una foto quitada no
 * vuelve—, ni otra copia del mismo archivo, ni la foto principal. De cada archivo queda la
 * que llegó primero. Una foto sin huella solo se compara por su id.
 */
export function fotosParaAgregar<F extends FotoCandidata>(
  candidatas: readonly F[],
  yaEstan: readonly { mediaId: string; sha256: string | null }[],
  huellaDeLaPrincipal: string | null,
): F[] {
  const ids = new Set(yaEstan.map((f) => f.mediaId));
  const huellas = new Set(yaEstan.map((f) => f.sha256).filter((h): h is string => h !== null));
  if (huellaDeLaPrincipal) huellas.add(huellaDeLaPrincipal);

  const elegidas: F[] = [];
  for (const foto of [...candidatas].sort((a, b) => a.recibidaEnMs - b.recibidaEnMs)) {
    if (ids.has(foto.mediaId)) continue;
    if (foto.sha256 !== null && huellas.has(foto.sha256)) continue;
    elegidas.push(foto);
    ids.add(foto.mediaId);
    if (foto.sha256 !== null) huellas.add(foto.sha256);
  }
  return elegidas;
}

/* ── Una sola sección (cambio del 2026-10-14, RF-34 a RF-41) ─────────────── */

/**
 * Una foto de la sección «Fotografía del día», con lo que hace falta para juntarla con las
 * demás. `horaMs` es la hora de envío si llegó por WhatsApp y la de subida si se subió en el
 * panel (RF-37).
 */
export interface FotoDeLaSeccion {
  mediaId: string;
  sha256: string | null;
  horaMs: number;
  quitada: boolean;
}

/**
 * Junta las fotos de la lista de la bitácora con las **principales viejas** —la foto del día
 * que el sistema copiaba antes del cambio, que sigue en las bitácoras cerradas— en una sola
 * sección (RF-34), sin principal (RF-35):
 *
 *  · la misma foto por dos caminos se muestra una vez (RF-36): una principal que es la misma
 *    fila o el mismo archivo que una de la lista no se agrega, ni siquiera si esa está quitada
 *    —quitar la original no puede hacer reaparecer su copia—;
 *  · las quitadas van aparte (RF-25, RF-39);
 *  · todas por hora, de la más temprana a la más tarde (RF-37).
 *
 * Cuántas quedan en `fotos` es lo que el cierre cuenta como fotografía del día (RF-41).
 */
export function unificarFotosDelDia<F extends FotoDeLaSeccion>(
  deLaLista: readonly F[],
  principalesViejas: readonly F[],
): { fotos: F[]; quitadas: F[] } {
  const ids = new Set(deLaLista.map((f) => f.mediaId));
  const huellas = new Set(deLaLista.map((f) => f.sha256).filter((h): h is string => h !== null));
  const principales = principalesViejas.filter((p) => !ids.has(p.mediaId) && !(p.sha256 && huellas.has(p.sha256)));

  const porHora = (a: F, b: F) => a.horaMs - b.horaMs || a.mediaId.localeCompare(b.mediaId);
  const fotos: F[] = [];
  const vistas = new Set<string>();
  for (const foto of [...deLaLista.filter((f) => !f.quitada), ...principales].sort(porHora)) {
    if (foto.sha256 !== null) {
      if (vistas.has(foto.sha256)) continue;
      vistas.add(foto.sha256);
    }
    fotos.push(foto);
  }
  return { fotos, quitadas: deLaLista.filter((f) => f.quitada).sort(porHora) };
}
