/**
 * Las actividades que ofrece la bitácora de una obra (spec 031, RF-58 a RF-60 y RF-64 a
 * RF-66). Reglas puras: sin I/O, como todo `shared/rules`.
 *
 * ── Dos fuentes, un catálogo ──
 *
 * Una obra sin presupuesto vigente sigue con la lista fija de 31 ítems de hoy, sin
 * capítulo (RF-58). Con presupuesto vigente, cada actividad es un ítem **dentro de su
 * capítulo** (RF-59): el 4.1.8 de las alcantarillas de una vía no es el de la cuneta de
 * la otra, y cada uno lleva su cantidad contratada.
 *
 * Las reglas no leen el presupuesto: reciben el catálogo ya armado (plan, decisiones).
 * La pantalla y el servidor lo arman con las mismas funciones de aquí, así que ofrecen
 * y aceptan lo mismo.
 */
import {
  ACTIVIDADES_DEL_PRESUPUESTO,
  etiquetaDeActividad,
  type UnidadDeActividad,
} from '../catalogos/presupuesto';
import { claveDeItem, type EstructuraDePresupuesto } from './presupuesto';
import { filtrarOpciones, normalizar } from './texto';

export interface ActividadDelCatalogo {
  /** Lo que identifica la opción: el ítem en el catálogo fijo, ítem + capítulo con presupuesto. */
  clave: string;
  item: string;
  descripcion: string;
  unidad: UnidadDeActividad;
  /** `null` en el catálogo fijo. */
  capituloId: string | null;
  capitulo: string | null;
  /** `null` también en un presupuesto sin grupos (RF-33). */
  grupo: string | null;
}

export interface CatalogoDeActividades {
  origen: 'fijo' | 'presupuesto';
  actividades: ActividadDelCatalogo[];
}

/** La lista fija de hoy (RF-58). */
export function catalogoFijo(): CatalogoDeActividades {
  return {
    origen: 'fijo',
    actividades: ACTIVIDADES_DEL_PRESUPUESTO.map((a) => ({
      clave: a.item,
      item: a.item,
      descripcion: a.descripcion,
      unidad: a.unidad,
      capituloId: null,
      capitulo: null,
      grupo: null,
    })),
  };
}

/**
 * Los ítems del presupuesto vigente, en su orden, con su capítulo y su grupo (RF-59).
 * Un ítem sin unidad reconocida no se ofrece: no se pudo aprobar con él (RF-50), y si
 * llegara, la bitácora no sabría en qué medirlo.
 */
export function catalogoDelPresupuesto(e: EstructuraDePresupuesto): CatalogoDeActividades {
  return {
    origen: 'presupuesto',
    actividades: e.grupos.flatMap((g) =>
      g.capitulos.flatMap((c) =>
        c.items.flatMap((i) =>
          i.unidad
            ? [
                {
                  clave: claveDeItem(c.id, i.item),
                  item: i.item,
                  descripcion: i.descripcion,
                  unidad: i.unidad,
                  capituloId: c.id,
                  capitulo: c.nombre,
                  grupo: g.nombre.trim() || null,
                },
              ]
            : [],
        ),
      ),
    ),
  };
}

/**
 * Lo que se lee en el selector. Con presupuesto, «4.1.8 · Construcción de alcantarillas
 * · Vía La Ye–Yondo», y la descripción como detalle; sin él, como hoy: «4.1.8 ·
 * Excavación…». Sin precios en ninguno de los dos (RF-61).
 */
export function opcionDeActividad(a: ActividadDelCatalogo): { clave: string; etiqueta: string; detalle: string } {
  if (!a.capituloId) return { clave: a.clave, etiqueta: etiquetaDeActividad(a), detalle: '' };
  return {
    clave: a.clave,
    etiqueta: [a.item, a.capitulo, a.grupo].filter(Boolean).join(' · '),
    detalle: a.descripcion,
  };
}

/** Las que casan con lo escrito, sin tildes ni mayúsculas, por ítem, capítulo o descripción (RF-59). */
export function buscarActividad(catalogo: CatalogoDeActividades, texto: string): ActividadDelCatalogo[] {
  const porClave = new Map(catalogo.actividades.map((a) => [a.clave, a]));
  return filtrarOpciones(catalogo.actividades.map(opcionDeActividad), texto).map((o) => porClave.get(o.clave)!);
}

/** La actividad de ese ítem en ese capítulo, o en el catálogo fijo si `capituloId` es nulo. */
export function actividadDelCatalogo(
  catalogo: CatalogoDeActividades,
  item: string,
  capituloId: string | null,
): ActividadDelCatalogo | undefined {
  return catalogo.actividades.find((a) => a.item === item.trim() && a.capituloId === capituloId);
}

/** En qué capítulos está un ítem de pago (RF-65, RF-66). */
export function capitulosDelItem(catalogo: CatalogoDeActividades, item: string): ActividadDelCatalogo[] {
  return catalogo.actividades.filter((a) => a.item === item.trim());
}

/** Palabras que no distinguen un capítulo de otro. */
const PALABRAS_VACIAS = new Set(['de', 'del', 'la', 'las', 'el', 'los', 'y', 'en', 'con', 'para', 'por', 'al']);

function palabras(texto: string): string[] {
  return normalizar(texto)
    .split(/[^a-z0-9]+/)
    .filter((p) => p.length >= 3 && !PALABRAS_VACIAS.has(p));
}

/** «alcantarilla» casa con «alcantarillas»: la una empieza por la otra, con 4 letras o más. */
function casan(a: string, b: string): boolean {
  if (a === b) return true;
  const [corta, larga] = a.length <= b.length ? [a, b] : [b, a];
  return corta.length >= 4 && larga.startsWith(corta);
}

/**
 * Entre los capítulos posibles de un ítem, el que nombra lo escrito (RF-66): gana el de
 * más palabras en común con su capítulo y su grupo («alcantarilla vía Ye-Yondo» → las
 * alcantarillas de la Ye–Yondo). Si nada casa o hay empate, `null`: mejor preguntarle a
 * una persona que poner la cantidad en la vía equivocada.
 */
export function reconocerCapitulo(
  texto: string,
  opciones: readonly ActividadDelCatalogo[],
): ActividadDelCatalogo | null {
  const escritas = palabras(texto);
  if (escritas.length === 0 || opciones.length === 0) return null;
  const puntajes = opciones.map((o) => {
    const propias = new Set(palabras(`${o.capitulo ?? ''} ${o.grupo ?? ''}`));
    return [...propias].filter((p) => escritas.some((e) => casan(p, e))).length;
  });
  const mejor = Math.max(...puntajes);
  if (mejor === 0 || puntajes.filter((p) => p === mejor).length > 1) return null;
  return opciones[puntajes.indexOf(mejor)];
}
