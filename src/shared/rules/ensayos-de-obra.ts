/**
 * Los ensayos de «Control Calidad de Obra» de las bitácoras, vistos desde
 * Laboratorio (spec 029, RF-24 a RF-31). Reglas puras: sin I/O, como todo
 * `shared/rules`.
 *
 * No hay copia en otra tabla: la lista se arma cada vez con lo que dicen las
 * bitácoras, así que lo que se corrige en una se ve aquí al volver (RF-31). Los
 * tipos son los mínimos que hacen falta, por su forma, para no depender de
 * `features/`.
 */
import { formatearAbscisa } from './cantera';

/** Una abscisa de la vía: PR y metros. */
interface AbscisaLeida {
  pr: number;
  metros: number;
}

/** Dónde se hizo: un PR, un tramo o un lugar escrito (spec 025, RF-31 a RF-33). */
export type UbicacionLeida = AbscisaLeida | { desde: AbscisaLeida; hasta: AbscisaLeida } | { lugar: string };

/**
 * Una fila de la sección como viene guardada. Los ensayos se reconocen por tener
 * `ensayo`; los materiales de antes del 2026-09-16 no lo tienen y no son ensayos.
 */
export interface FilaDeCalidadLeida {
  id: string;
  ensayo?: string;
  nombre?: string;
  observacion?: string;
  horaInicio?: string;
  responsable?: string;
  ubicacion?: UbicacionLeida;
  edadDias?: number | null;
  resultado?: number | null;
  unidad?: string | null;
  cumple?: 'si' | 'no' | null;
  origen?: unknown;
}

/** Lo que se necesita de cada bitácora. */
export interface ParteConEnsayos {
  id: string;
  obraId: string;
  fecha: string;
  cerrada: boolean;
  laboratorio: readonly FilaDeCalidadLeida[];
}

/** Un renglón de «Ensayos de obra» (RF-26). */
export interface EnsayoDeObra {
  /** El id del parte y el del ensayo: un ensayo se repite en días distintos. */
  id: string;
  parteId: string;
  obraId: string;
  fecha: string;
  ensayo: string;
  nombre: string;
  ubicacion: string | null;
  horaInicio: string | null;
  edadDias: number | null;
  resultado: number | null;
  unidad: string | null;
  cumple: 'si' | 'no' | null;
  responsable: string | null;
  observacion: string;
  desdeWhatsapp: boolean;
  bitacoraCerrada: boolean;
}

/**
 * La ubicación como se lee en la obra:
 *  · un PR: «PR 1 + 460»;
 *  · un tramo, en el orden en que se escribió: «PR 0 + 070 a PR 0 + 150»;
 *  · otro lugar: tal como se escribió.
 * Sin ubicación (ensayos anteriores al 2026-09-22), `null`.
 */
export function textoDeUbicacion(ubicacion: UbicacionLeida | undefined): string | null {
  if (!ubicacion) return null;
  if ('lugar' in ubicacion) return ubicacion.lugar.trim() || null;
  if ('desde' in ubicacion) {
    return `${formatearAbscisa(ubicacion.desde.pr, ubicacion.desde.metros)} a ${formatearAbscisa(
      ubicacion.hasta.pr,
      ubicacion.hasta.metros,
    )}`;
  }
  return formatearAbscisa(ubicacion.pr, ubicacion.metros);
}

/**
 * Los ensayos de varias bitácoras en una sola lista (RF-25, RF-28): de la fecha más
 * reciente a la más antigua y, dentro del día, por hora de inicio (los que no la
 * tienen, al final, en el orden en que se anotaron).
 */
export function ensayosDeLosPartes(partes: readonly ParteConEnsayos[]): EnsayoDeObra[] {
  const ensayos: (EnsayoDeObra & { orden: number })[] = [];
  for (const parte of partes) {
    parte.laboratorio.forEach((fila, orden) => {
      if (!fila.ensayo) return;
      ensayos.push({
        id: `${parte.id}:${fila.id}`,
        parteId: parte.id,
        obraId: parte.obraId,
        fecha: parte.fecha,
        ensayo: fila.ensayo,
        nombre: fila.nombre ?? fila.ensayo,
        ubicacion: textoDeUbicacion(fila.ubicacion),
        horaInicio: fila.horaInicio || null,
        edadDias: fila.edadDias ?? null,
        resultado: fila.resultado ?? null,
        unidad: fila.unidad ?? null,
        cumple: fila.cumple ?? null,
        responsable: fila.responsable?.trim() || null,
        observacion: fila.observacion ?? '',
        desdeWhatsapp: Boolean(fila.origen),
        bitacoraCerrada: parte.cerrada,
        orden,
      });
    });
  }
  ensayos.sort(
    (a, b) =>
      b.fecha.localeCompare(a.fecha) ||
      // Sin hora va después de las que la tienen.
      (a.horaInicio ?? '99:99').localeCompare(b.horaInicio ?? '99:99') ||
      a.orden - b.orden,
  );
  return ensayos.map(({ orden: _, ...ensayo }) => ensayo);
}

/** «Cumple», «No cumple» o «Sin dato», como se filtra en la pantalla (RF-27). */
export type FiltroDeCumple = 'si' | 'no' | 'sin_dato';

/** Los filtros de la pantalla, sobre lo que ya llegó del servidor (RF-27). */
export function filtrarEnsayosDeObra<E extends EnsayoDeObra>(
  ensayos: readonly E[],
  filtros: { ensayo: string | null; cumple: FiltroDeCumple | null },
): E[] {
  return ensayos.filter(
    (e) =>
      (!filtros.ensayo || e.ensayo === filtros.ensayo) &&
      (!filtros.cumple || (filtros.cumple === 'sin_dato' ? e.cumple === null : e.cumple === filtros.cumple)),
  );
}
