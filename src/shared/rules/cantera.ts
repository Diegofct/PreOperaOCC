/**
 * Las reglas del control de cantera (spec 010). Funciones puras, sin I/O.
 *
 * Las usan la pantalla, para avisar antes de enviar, y el servidor, para decidir.
 * Mismo reparto que el almacén (`rules/almacen.ts`): la falta se detecta y se
 * redacta aquí una vez, y los contratos del panel usan los mismos textos.
 *
 * ── La abscisa ──
 *
 * Una vía se mide por abscisas: «PR 5 + 300» es el punto de referencia 5 más 300
 * metros. Es el dato que importa de un viaje a la obra, porque dice exactamente
 * dónde quedó el material. La obra de OCC tiene unos 25 km, y los metros se
 * anotan de 25 en 25: por eso el PR va de 0 a 25 y los metros de 0 a 975 (RF-12,
 * RF-13). Se eligen de una lista y no se escriben: un «PR 5 + 3000» tecleado
 * sería otro punto de la vía sin que nadie lo notara.
 */
import { operaVehiculos } from '@/shared/catalogos/cargos';

/** El valor con que se elige «la obra» como destino, en vez del id de un sitio. */
export const DESTINO_OBRA = 'obra';

const PR_MAXIMO = 25;
const METROS_MAXIMOS = 975;
const PASO_DE_METROS = 25;

/** 0, 1, …, 25 (RF-12). */
export const OPCIONES_DE_PR: readonly number[] = Array.from(
  { length: PR_MAXIMO + 1 },
  (_, i) => i,
);

/** 0, 25, …, 975 (RF-13). */
export const OPCIONES_DE_METROS: readonly number[] = Array.from(
  { length: METROS_MAXIMOS / PASO_DE_METROS + 1 },
  (_, i) => i * PASO_DE_METROS,
);

/**
 * La llegada a la obra como se escribe en una vía: «PR 5 + 300» (RF-17).
 *
 * Los metros van **siempre con tres cifras** —«PR 5 + 050»—, como decidió OCC el
 * 2026-09-16: es como se escribe una abscisa, y así «PR 5 + 50» no se confunde con
 * «PR 5 + 500» leyendo deprisa.
 */
export function formatearAbscisa(pr: number, metros: number): string {
  return `PR ${pr} + ${String(metros).padStart(3, '0')}`;
}

/* ── El viaje ──────────────────────────────────────────────────────────── */

/** Los textos de las faltas, con nombre: los usan esta regla y los contratos. */
export const MENSAJES_DE_VIAJE = {
  fechaMalEscrita: 'La fecha va en formato AAAA-MM-DD.',
  fechaFutura: 'La fecha no puede ser posterior a hoy.',
  horaMalEscrita: 'La hora va como HH:MM, de 00:00 a 23:59.',
  sinMaterial: 'Elija el material.',
  sinVolqueta: 'Elija la volqueta.',
  sinConductor: 'Elija el conductor.',
  sinOrigen: 'Elija el origen.',
  sinDestino: 'Elija el destino.',
  sinPr: 'Falta el PR de llegada.',
  sinMetros: 'Faltan los metros de llegada.',
  prFueraDeRango: 'El PR va de 0 a 25.',
  metrosFueraDeRango: 'Los metros van de 0 a 975, de 25 en 25.',
  abscisaSinObra: 'El PR y los metros solo se anotan cuando el destino es la obra.',
  mismoSitio: 'El origen y el destino no pueden ser el mismo sitio.',
} as const;

export type CampoDeViaje =
  | 'fecha'
  | 'hora'
  | 'materialId'
  | 'vehiculoId'
  | 'conductorId'
  | 'origenId'
  | 'destino'
  | 'pr'
  | 'metros';

/** Una falta, con el campo del formulario donde se pinta. */
export interface FaltaDeViaje {
  campo: CampoDeViaje;
  mensaje: string;
}

/**
 * ¿Es válida la abscisa de llegada? Solo tiene sentido con destino obra.
 *
 * Nombra lo que falta —el PR, los metros o los dos— en vez de un «abscisa
 * incompleta» que obliga a adivinar (RF-14), y rechaza lo que no está en las
 * listas aunque llegue por fuera del formulario (RF-16).
 */
export function validarAbscisa(pr: number | null, metros: number | null): FaltaDeViaje[] {
  const faltas: FaltaDeViaje[] = [];

  if (pr === null) {
    faltas.push({ campo: 'pr', mensaje: MENSAJES_DE_VIAJE.sinPr });
  } else if (!Number.isInteger(pr) || pr < 0 || pr > PR_MAXIMO) {
    faltas.push({ campo: 'pr', mensaje: MENSAJES_DE_VIAJE.prFueraDeRango });
  }

  if (metros === null) {
    faltas.push({ campo: 'metros', mensaje: MENSAJES_DE_VIAJE.sinMetros });
  } else if (
    !Number.isInteger(metros) ||
    metros < 0 ||
    metros > METROS_MAXIMOS ||
    metros % PASO_DE_METROS !== 0
  ) {
    faltas.push({ campo: 'metros', mensaje: MENSAJES_DE_VIAJE.metrosFueraDeRango });
  }

  return faltas;
}

export interface ViajePorValidar {
  /** `YYYY-MM-DD`, el día en la obra. */
  fecha: string;
  /** `HH:MM`, en la obra. */
  hora: string;
  materialId: string | null;
  vehiculoId: string | null;
  conductorId: string | null;
  origenId: string | null;
  /** El id de un sitio, `DESTINO_OBRA`, o `null` si no se eligió. */
  destino: string | null;
  pr: number | null;
  metros: number | null;
}

const FECHA = /^\d{4}-\d{2}-\d{2}$/;
const HORA = /^([01]\d|2[0-3]):[0-5]\d$/;

/**
 * Lo que le falta a un viaje para poder registrarse, o una lista vacía.
 *
 * Devuelve **todas** las faltas, cada una con su campo, como `validarMovimiento`
 * del almacén: quien registra corrige de una vez.
 *
 * `hoy` llega de fuera (`fechaDeJornada()`) para que la regla siga siendo pura. La
 * fecha se compara como texto: en `YYYY-MM-DD` el orden alfabético es el del
 * calendario. Solo se mira el día (RF-19): una hora posterior a la de ahora, hoy
 * mismo, se acepta, porque un viaje se registra a veces antes de que la volqueta
 * llegue.
 *
 * Que el material, la volqueta, el conductor o los sitios existan, sigan vigentes y
 * sean de la obra lo comprueba el servidor con la base: aquí solo se sabe si se
 * eligieron.
 */
export function validarViaje(viaje: ViajePorValidar, hoy: string): FaltaDeViaje[] {
  const faltas: FaltaDeViaje[] = [];
  const falta = (campo: CampoDeViaje, mensaje: string) => faltas.push({ campo, mensaje });

  if (!FECHA.test(viaje.fecha)) falta('fecha', MENSAJES_DE_VIAJE.fechaMalEscrita);
  else if (viaje.fecha > hoy) falta('fecha', MENSAJES_DE_VIAJE.fechaFutura);

  if (!HORA.test(viaje.hora)) falta('hora', MENSAJES_DE_VIAJE.horaMalEscrita);

  if (!viaje.materialId) falta('materialId', MENSAJES_DE_VIAJE.sinMaterial);
  if (!viaje.vehiculoId) falta('vehiculoId', MENSAJES_DE_VIAJE.sinVolqueta);
  // RF-34: el conductor es parte del viaje, no un dato opcional.
  if (!viaje.conductorId) falta('conductorId', MENSAJES_DE_VIAJE.sinConductor);
  if (!viaje.origenId) falta('origenId', MENSAJES_DE_VIAJE.sinOrigen);

  faltas.push(...faltasDelDestino(viaje));
  return faltas;
}

/**
 * Lo que le falta al destino de un viaje y a su abscisa. Aparte de `validarViaje`
 * porque el contrato del panel lo necesita solo —el resto de campos ya los exige
 * Zod— y no puede llamar a la regla entera: esa pide «hoy», y un contrato que
 * cambia de veredicto con el reloj no se puede probar.
 */
export function faltasDelDestino(
  viaje: Pick<ViajePorValidar, 'origenId' | 'destino' | 'pr' | 'metros'>,
): FaltaDeViaje[] {
  if (!viaje.destino) return [{ campo: 'destino', mensaje: MENSAJES_DE_VIAJE.sinDestino }];

  // RF-11, RF-14, RF-16.
  if (viaje.destino === DESTINO_OBRA) return validarAbscisa(viaje.pr, viaje.metros);

  const faltas: FaltaDeViaje[] = [];
  // RF-18. Solo entre sitios: la obra nunca es origen (fuera de alcance).
  if (viaje.origenId && viaje.origenId === viaje.destino) {
    faltas.push({ campo: 'destino', mensaje: MENSAJES_DE_VIAJE.mismoSitio });
  }
  // RF-15: con otro destino no se guarda abscisa. Se rechaza en vez de descartarla
  // en silencio, porque llegar con ella es señal de un formulario que se quedó con
  // los datos de la obra.
  if (viaje.pr !== null) faltas.push({ campo: 'pr', mensaje: MENSAJES_DE_VIAJE.abscisaSinObra });
  if (viaje.metros !== null) {
    faltas.push({ campo: 'metros', mensaje: MENSAJES_DE_VIAJE.abscisaSinObra });
  }
  return faltas;
}

/* ── Quién puede ir en un viaje ────────────────────────────────────────── */

/** Lo que hace falta saber de un vehículo para ofrecerlo como volqueta. */
export interface VehiculoCandidato {
  obraId: string | null;
  tipoVehiculoId: string;
  estado: string;
  dadoDeBaja: boolean;
}

/**
 * ¿Se ofrece este vehículo como volqueta de un viaje de esa obra? (RF-8)
 *
 * De esa obra, de tipo volqueta, **operativa** y sin baja. «Operativa» lo precisó
 * OCC el 2026-09-16: una volqueta NO APTO, en mantenimiento o fuera de servicio no
 * puede trabajar, así que tampoco puede tener viajes. Una volqueta trasladada deja
 * de ofrecerse en la obra que dejó, y sus viajes anteriores se quedan donde se
 * registraron (caso límite de la spec): eso lo da mirar la obra de hoy.
 */
export function volquetaElegible(vehiculo: VehiculoCandidato, obraId: string): boolean {
  return (
    vehiculo.obraId === obraId &&
    vehiculo.tipoVehiculoId === 'volqueta' &&
    vehiculo.estado === 'operativo' &&
    !vehiculo.dadoDeBaja
  );
}

/** Lo que hace falta saber de una persona para ofrecerla como conductor. */
export interface PersonaCandidata {
  obraId: string | null;
  cargo: string | null;
  activo: boolean;
  dadoDeBaja: boolean;
}

/**
 * ¿Se ofrece esta persona como conductor de un viaje de esa obra? (RF-35)
 *
 * De esa obra, activa, sin baja y con un cargo que conduce u opera vehículos. El
 * cargo lo decide el catálogo (`operaVehiculos`), el mismo que decide quién recibe
 * celular: una lista escrita aquí aparte acabaría ofreciendo a un cadenero.
 */
export function conductorElegible(persona: PersonaCandidata, obraId: string): boolean {
  return (
    persona.obraId === obraId &&
    persona.activo &&
    !persona.dadoDeBaja &&
    operaVehiculos(persona.cargo)
  );
}

/* ── El listado ────────────────────────────────────────────────────────── */

/** Lo que el filtro necesita de un viaje. */
export interface ViajeFiltrable {
  vehiculoId: string;
  materialId: string;
  origenId: string;
  /** `null` cuando el destino es la obra. */
  destinoId: string | null;
  destinoObra: boolean;
}

export interface FiltroDeViajes {
  vehiculoId?: string | null;
  materialId?: string | null;
  origenId?: string | null;
  /** El id de un sitio o `DESTINO_OBRA`. */
  destino?: string | null;
}

/**
 * Los viajes que cumplen todos los criterios elegidos (RF-21). Sin un criterio,
 * no filtra por él. Los anulados **no se esconden** (RF-25): el filtro es de
 * volqueta, material y sitios, y un viaje anulado sigue siendo parte del listado.
 */
export function filtrarViajes<V extends ViajeFiltrable>(
  viajes: readonly V[],
  filtro: FiltroDeViajes,
): V[] {
  return viajes.filter(
    (v) =>
      (!filtro.vehiculoId || v.vehiculoId === filtro.vehiculoId) &&
      (!filtro.materialId || v.materialId === filtro.materialId) &&
      (!filtro.origenId || v.origenId === filtro.origenId) &&
      (!filtro.destino ||
        (filtro.destino === DESTINO_OBRA ? v.destinoObra : v.destinoId === filtro.destino)),
  );
}

/* ── En la bitácora ────────────────────────────────────────────────────── */

export type EstadoCanteraDelParte =
  /** Parte abierto: se muestran los viajes vigentes, que todavía pueden cambiar. */
  | 'vigentes'
  /** Parte cerrado: se muestran los que quedaron fijados al cerrar (RF-29). */
  | 'fijados'
  /** Parte cerrado antes de que existiera este módulo: no hay nada fijado. */
  | 'antes_del_control';

export interface CanteraDelParte<V> {
  estado: EstadoCanteraDelParte;
  viajes: V[];
  /** Lo que dice la sección en vez de una tabla vacía, o `null` si hay viajes. */
  aviso: string | null;
}

/**
 * Qué muestra la sección «Control Cantera» de un parte (RF-26 a RF-31, RF-37).
 *
 * `fijados` es lo guardado en el parte: `null` si nunca se fijó nada —el parte está
 * abierto, o se cerró antes de esta spec— y una lista, quizá vacía, si se cerró
 * después. Esa diferencia es la que evita decir «no hubo viajes» de un día que
 * nadie contó.
 *
 * Una lista vacía **se dice** (RF-31): una sección en blanco no distingue «no hubo
 * viajes» de «no cargó».
 */
export function canteraDelParte<V>(parte: {
  cerrado: boolean;
  fijados: readonly V[] | null;
  vigentes: readonly V[];
}): CanteraDelParte<V> {
  if (!parte.cerrado) {
    return {
      estado: 'vigentes',
      viajes: [...parte.vigentes],
      aviso:
        parte.vigentes.length === 0
          ? 'Todavía no hay viajes de cantera registrados para este día.'
          : null,
    };
  }

  if (parte.fijados === null) {
    return {
      estado: 'antes_del_control',
      viajes: [],
      aviso: 'Esta bitácora se cerró antes de que existiera el control de cantera.',
    };
  }

  return {
    estado: 'fijados',
    viajes: [...parte.fijados],
    aviso: parte.fijados.length === 0 ? 'Ese día no se registraron viajes de cantera.' : null,
  };
}
