/**
 * Cómo se arma cada fila del parte diario.
 *
 * El navegador manda qué eligió —el id del equipo, el de la persona, el ítem
 * de la actividad, el ensayo— y **el servidor pone los nombres**. Nunca al revés: si el
 * nombre llegara del cliente, bastaría con editar la petición para que el parte
 * dijera que trabajó otra persona.
 *
 * Cada fila se auto-describe: guarda el nombre además de la clave. Un parte de
 * 2026 tiene que seguir leyéndose en 2030 aunque el presupuesto o los ensayos hayan
 * cambiado, aunque a un equipo le hayan cambiado el código interno y aunque una
 * persona ya no trabaje en la empresa. Es el mismo criterio con el que se
 * guardan las respuestas del preoperacional.
 */
import { uuidv7 } from 'uuidv7';

import {
  esEnsayoAnterior,
  type ActividadDelParte,
  type EnsayoDelParte,
  type FilaDeControlDeCalidad,
  type FranjaDeClima,
  type MaquinaDelParte,
  type MaterialDelParte,
  type PersonaDelParte,
} from './tipos';
import { ENSAYOS_DE_CALIDAD, nombreDeClima } from '@/shared/catalogos/bitacora';
import { nombreDeCargo } from '@/shared/catalogos/cargos';
import {
  actividadPorItem,
  CLAVE_OTRA_ACTIVIDAD,
  etiquetaDeUnidad,
  IDS_UNIDAD_DE_ACTIVIDAD,
} from '@/shared/catalogos/presupuesto';
import { calcularDimensiones, resolverCantidad } from '@/shared/rules/dimensiones';
import {
  faltaObservacionDelEnsayo,
  faltasDeActividad,
  faltasDelEnsayo,
  type UbicacionPorValidar,
} from '@/shared/rules/parte';
import type { ClaseDeMedidor } from '@/shared/rules/jornada';

/** Lo que el navegador puede decir de una máquina. */
export interface MaquinaPedida {
  vehiculoId: string;
  medidorInicial?: number | null;
  medidorFinal?: number | null;
  observaciones?: string | null;
}

export function construirMaquina(
  pedida: MaquinaPedida,
  codigo: string,
  claseMedidor: ClaseDeMedidor,
): MaquinaDelParte {
  return {
    id: uuidv7(),
    vehiculoId: pedida.vehiculoId,
    codigo,
    claseMedidor,
    medidorInicial: pedida.medidorInicial ?? null,
    medidorFinal: pedida.medidorFinal ?? null,
    // Siempre presente en lo que se guarda desde el 2026-09-14, aunque vacío:
    // así solo los partes anteriores lo traen ausente (spec 004, RF-45).
    observaciones: pedida.observaciones?.trim() ?? '',
  };
}

export interface PersonaPedida {
  usuarioId: string;
  entrada: string;
  salida: string;
  observaciones?: string;
}

export function construirPersona(
  pedida: PersonaPedida,
  nombre: string,
  cargo: string | null,
): PersonaDelParte {
  return {
    id: uuidv7(),
    usuarioId: pedida.usuarioId,
    nombre,
    // Se guarda el rótulo y no el slug: es lo que se va a leer, y el catálogo
    // de cargos puede cambiar de nombre sin avisar a los partes viejos.
    cargo: cargo ? nombreDeCargo(cargo) : null,
    entrada: pedida.entrada,
    salida: pedida.salida,
    observaciones: pedida.observaciones?.trim() ?? '',
  };
}

export interface ActividadPedida {
  /** El de la fila que ya existía; si no viene, nace uno. */
  id?: string | null;
  /** El ítem del presupuesto («4.1.8») o «otra». */
  clave: string;
  /** Solo en «otra»: cuál fue. */
  texto?: string | null;
  /** Solo en «otra»: la clave de la unidad elegida. En las del presupuesto se ignora. */
  unidad?: string | null;
  /** La escrita a mano. Solo cuenta si no se puede tomar de una medida. */
  cantidad?: number | null;
  descripcion: string;
  observaciones: string;
  longitud: number | null;
  ancho: number | null;
  alto: number | null;
  area: number | null;
  volumen: number | null;
}

/**
 * La actividad que se guarda, o `null` si no es del presupuesto ni una «otra»
 * completa (spec 004, RF-64 a RF-70). Quien llama responde el 400.
 *
 * El nombre, el ítem y la unidad de una actividad del presupuesto los pone el
 * catálogo, no la petición: si la unidad viniera del navegador, bastaría con editar
 * la petición para medir el acero en metros cúbicos. En «otra» el nombre es lo que
 * se escribió y la unidad la elegida, porque no hay catálogo que las diga.
 *
 * Las actividades de la lista de prueba («excavacion») dan `null`: ya no se pueden
 * elegir. Las que ya estaban guardadas no pasan por aquí; se conservan tal cual
 * (tarea 004/T25).
 */
export function construirActividadDelParte(pedida: ActividadPedida): ActividadDelParte | null {
  const otra = pedida.clave === CLAVE_OTRA_ACTIVIDAD;
  const delPresupuesto = otra ? undefined : actividadPorItem(pedida.clave);
  if (!otra && !delPresupuesto) return null;

  if (otra) {
    if (faltasDeActividad({ otra, texto: pedida.texto, unidad: pedida.unidad }).length > 0) {
      return null;
    }
    if (!IDS_UNIDAD_DE_ACTIVIDAD.includes(pedida.unidad!)) return null;
  }
  const unidad = delPresupuesto ? delPresupuesto.unidad : pedida.unidad!;

  // El área y el volumen los recalcula el servidor con la misma regla que usa la
  // pantalla, y manda él: una petición hecha por fuera con un área que no
  // cuadra con su largo y su ancho no se guarda así (spec 004, RF-58 a RF-60).
  // La cantidad, igual, sobre esas medidas ya resueltas (RF-68).
  const medidas = calcularDimensiones(pedida);
  const { cantidad } = resolverCantidad(unidad, medidas, pedida.cantidad ?? null);

  return {
    // Se conserva el id que traía: es a lo que apuntan sus fotografías. Generar
    // uno nuevo en cada guardado las dejaba huérfanas en silencio.
    id: pedida.id ?? uuidv7(),
    clave: pedida.clave,
    nombre: delPresupuesto ? delPresupuesto.descripcion : pedida.texto!.trim(),
    descripcion: pedida.descripcion,
    observaciones: pedida.observaciones,
    longitud: medidas.longitud,
    ancho: medidas.ancho,
    alto: medidas.alto,
    area: medidas.area,
    volumen: medidas.volumen,
    item: delPresupuesto ? delPresupuesto.item : null,
    // La etiqueta y no la clave, congelada con el parte: si el catálogo cambiara
    // cómo se escribe, el parte viejo seguiría diciendo lo que decía.
    unidad: etiquetaDeUnidad(unidad),
    cantidad,
  };
}

export interface FranjaPedida {
  condicion: string;
  desde: string;
  hasta: string;
}

export function construirFranja(pedida: FranjaPedida): FranjaDeClima {
  return {
    id: uuidv7(),
    condicion: pedida.condicion,
    nombre: nombreDeClima(pedida.condicion),
    desde: pedida.desde,
    hasta: pedida.hasta,
  };
}

/* ------------------------------------------------------------------------ */
/* Control Calidad de Obra y filas heredadas (cambio del 2026-09-16)          */
/* ------------------------------------------------------------------------ */

/** Lo que el navegador puede decir de una fila de Control Calidad de Obra. */
export interface EnsayoPedido {
  /** El de la fila guardada, si ya existía: el de un material heredado, o el del ensayo. */
  id?: string | null;
  ensayo?: string | null;
  observacion?: string | null;
  /** Cuándo, quién y dónde (cambio del 2026-09-22, RF-84 a RF-87). */
  horaInicio?: string | null;
  horaFin?: string | null;
  responsable?: string | null;
  ubicacion?: UbicacionPorValidar | null;
}

/**
 * El ensayo que se guarda, o `null` si no es de la lista o le falta algo (spec
 * 004, RF-61, RF-72 y, desde el 2026-09-22, RF-84 a RF-89). El nombre lo pone el
 * catálogo.
 *
 * El mismo ensayo puede venir varias veces (RF-73): cada fila es su propia muestra.
 *
 * ── `guardado`: el ensayo anterior se conserva sin los datos nuevos ──
 *
 * Un ensayo guardado antes del cambio no tiene horas, responsable ni ubicación, y la
 * sección se guarda entera: sin esta salida, guardar Control Calidad de Obra en un
 * parte que ya tenía ensayos sería imposible (RF-89). Si el que llega trae el id de
 * un ensayo **anterior** de ese parte y no trae datos nuevos, se construye como
 * antes, con su ensayo y su observación. Completarlo queda fuera de alcance; si
 * alguien lo intenta con datos a medias, se le exigen todos.
 *
 * Quien llama pasa el guardado con ese id: esta función no lee la base. Un id que no
 * es de un ensayo anterior no abre la salida, así que inventarlo no sirve para
 * guardar un ensayo nuevo sin sus datos.
 */
export function construirEnsayo(
  pedido: EnsayoPedido,
  guardado?: EnsayoDelParte,
): EnsayoDelParte | null {
  if (rechazoDelEnsayo(pedido, guardado).length > 0) return null;
  const ensayo = ENSAYOS_DE_CALIDAD.find((e) => e.id === pedido.ensayo)!;

  const base = {
    id: pedido.id ?? uuidv7(),
    ensayo: ensayo.id,
    nombre: ensayo.nombre,
    observacion: pedido.observacion!.trim(),
  };
  if (vuelveComoAnterior(pedido, guardado)) return base;

  const ubicacion = pedido.ubicacion!;
  return {
    ...base,
    horaInicio: pedido.horaInicio!,
    horaFin: pedido.horaFin!,
    responsable: pedido.responsable!.trim(),
    // Se copia solo la forma elegida: un PR que viniera junto al lugar no se guarda.
    ubicacion:
      'lugar' in ubicacion
        ? { lugar: ubicacion.lugar!.trim() }
        : { pr: ubicacion.pr!, metros: ubicacion.metros! },
  };
}

/**
 * ¿Es un ensayo guardado antes del 2026-09-22 que vuelve sin datos nuevos? Entonces
 * se guarda como antes (RF-89). Ver `construirEnsayo`.
 */
function vuelveComoAnterior(pedido: EnsayoPedido, guardado?: EnsayoDelParte): boolean {
  const traeDatosNuevos =
    Boolean(pedido.horaInicio) ||
    Boolean(pedido.horaFin) ||
    Boolean(pedido.responsable?.trim()) ||
    Boolean(pedido.ubicacion);
  return (
    guardado !== undefined &&
    guardado.id === pedido.id &&
    esEnsayoAnterior(guardado) &&
    !traeDatosNuevos
  );
}

/**
 * Por qué no se puede guardar un ensayo, ya redactado: lista vacía si se puede.
 *
 * Es lo que decide `construirEnsayo` y lo que responde el guardado del parte, escrito
 * una sola vez: si la ruta volviera a calcularlo, un día diría que falta algo que la
 * construcción no pide. A un ensayo anterior que vuelve sin datos nuevos solo se le
 * mira la observación; a los demás, todo lo de `faltasDelEnsayo` (RF-88, RF-89).
 */
export function rechazoDelEnsayo(pedido: EnsayoPedido, guardado?: EnsayoDelParte): string[] {
  if (!ENSAYOS_DE_CALIDAD.some((e) => e.id === pedido.ensayo)) {
    return ['Ese ensayo no está en la lista.'];
  }
  if (vuelveComoAnterior(pedido, guardado)) {
    const falta = faltaObservacionDelEnsayo(pedido.observacion);
    return falta ? [falta] : [];
  }
  return faltasDelEnsayo(pedido).map((falta) => falta.mensaje);
}

/** Una actividad guardada antes del 2026-09-16: toda actividad nueva lleva `unidad`. */
export function esActividadHeredada(actividad: ActividadDelParte): boolean {
  return !('unidad' in actividad);
}

/** Un material de la lista de prueba, guardado antes de que la sección fuera de ensayos. */
export function esMaterialHeredado(fila: FilaDeControlDeCalidad): fila is MaterialDelParte {
  return 'material' in fila;
}

/**
 * Las filas de una sección tal como se van a guardar (spec 004, RF-63, RF-71).
 *
 * La sección llega entera y reemplaza a la guardada. Una fila que llega con el id de
 * una **fila heredada** de ese parte se queda exactamente como estaba, diga lo que
 * diga la petición: su nombre vino de una lista que ya no existe, así que no hay
 * catálogo que pueda volver a ponerlo, y aceptar el que mande el navegador es
 * justo lo que este archivo prohíbe. Traducirla a la lista nueva sería inventar el
 * dato: «Excavación» no dice si fue la 4.1.1, la 4.1.2 o la 4.1.8.
 *
 * Todas las demás se construyen de nuevo. `null` en el resultado es una fila que no
 * se pudo construir, y quien llama responde el 400: un id que no es de una heredada
 * no convierte en válida una fila que no lo es.
 */
export function conservarHeredadas<Pedida extends object, Guardada extends { id: string }>(
  pedidas: readonly Pedida[],
  guardadas: readonly Guardada[],
  esHeredada: (fila: Guardada) => boolean,
  construir: (pedida: Pedida) => Guardada | null,
): (Guardada | null)[] {
  const heredadas = new Map(guardadas.filter(esHeredada).map((fila) => [fila.id, fila]));
  return pedidas.map((pedida) => {
    // `object` y no `{ id?: string }`: mientras la pantalla mande materiales sin id
    // (hasta 004/T29), una de las formas de la sección no tiene la propiedad.
    const id = 'id' in pedida && typeof pedida.id === 'string' ? pedida.id : null;
    return (id && heredadas.get(id)) || construir(pedida);
  });
}
