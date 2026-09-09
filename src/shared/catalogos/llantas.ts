/**
 * Las posiciones de llanta de cada tipo de equipo.
 *
 * Una lista fija y no texto libre: el desgaste se sigue llanta por llanta a lo
 * largo de meses, y si la posición se escribe a mano, la misma rueda acaba
 * registrada como «delantera izq», «del. izquierda» y «DI» según quién la
 * anotara. A partir de ahí no hay seguimiento posible.
 *
 * El precio de la lista fija es que hay que mantenerla: un equipo con una
 * configuración distinta a la de su tipo no cabe. Se asume a propósito, porque
 * el caso raro es más barato de resolver añadiendo una posición aquí que el
 * desorden de dejarlo abierto.
 *
 * ── PENDIENTE DE VALIDACIÓN POR OCC ──
 *
 * Las configuraciones de abajo son las habituales de cada máquina, no las de la
 * flota concreta de OCC: nadie ha confirmado todavía si sus volquetas son de
 * doble troque, ni si sus vibrocompactadoras llevan llantas atrás o van sobre
 * rodillo. Igual que el catálogo de actividades de la bitácora, esto es una
 * propuesta que hay que contrastar en obra antes de darla por buena.
 */

export interface PosicionLlanta {
  /** Slug estable. Es lo que se guarda; no se renombra ni se reutiliza. */
  id: string;
  /** Como se dice en obra. */
  nombre: string;
}

const DELANTERAS: PosicionLlanta[] = [
  { id: 'delantera_izquierda', nombre: 'Delantera izquierda' },
  { id: 'delantera_derecha', nombre: 'Delantera derecha' },
];

const TRASERAS_SIMPLES: PosicionLlanta[] = [
  { id: 'trasera_izquierda', nombre: 'Trasera izquierda' },
  { id: 'trasera_derecha', nombre: 'Trasera derecha' },
];

const REPUESTO: PosicionLlanta = { id: 'repuesto', nombre: 'Repuesto' };

/** Rueda doble: dos llantas por punta, una por fuera y otra por dentro. */
function dobles(eje: number): PosicionLlanta[] {
  return [
    { id: `eje${eje}_izquierda_externa`, nombre: `Eje ${eje} izquierda externa` },
    { id: `eje${eje}_izquierda_interna`, nombre: `Eje ${eje} izquierda interna` },
    { id: `eje${eje}_derecha_interna`, nombre: `Eje ${eje} derecha interna` },
    { id: `eje${eje}_derecha_externa`, nombre: `Eje ${eje} derecha externa` },
  ];
}

const POSICIONES: Record<string, PosicionLlanta[]> = {
  camioneta: [...DELANTERAS, ...TRASERAS_SIMPLES, REPUESTO],
  // Doble troque: dirección sencilla y dos ejes traseros de rueda doble.
  volqueta: [...DELANTERAS, ...dobles(2), ...dobles(3), REPUESTO],
  // Las delanteras son pequeñas y las traseras de tracción; el desgaste no se
  // parece en nada de un extremo al otro, y por eso interesa seguirlas aparte.
  retroexcavadora: [...DELANTERAS, ...TRASERAS_SIMPLES],
  retrocargador: [...DELANTERAS, ...TRASERAS_SIMPLES],
  // Tándem trasero: dos ruedas por lado, una detrás de otra.
  motoniveladora: [
    ...DELANTERAS,
    { id: 'tandem_izquierda_delantera', nombre: 'Tándem izquierda delantera' },
    { id: 'tandem_izquierda_trasera', nombre: 'Tándem izquierda trasera' },
    { id: 'tandem_derecha_delantera', nombre: 'Tándem derecha delantera' },
    { id: 'tandem_derecha_trasera', nombre: 'Tándem derecha trasera' },
  ],
  // Rodillo delante, llantas atrás. Si la de OCC es de doble rodillo, esta fila
  // se queda vacía y no pasa nada: el equipo sencillamente no lleva llantas.
  vibrocompactadora: [...TRASERAS_SIMPLES],
  recicladora: [...DELANTERAS, ...TRASERAS_SIMPLES],
};

/** Las posiciones de este tipo de equipo, en orden de delante hacia atrás. */
export function posicionesDe(tipoVehiculoId: string | null | undefined): PosicionLlanta[] {
  return tipoVehiculoId ? (POSICIONES[tipoVehiculoId] ?? []) : [];
}

/** El rótulo de una posición. Si el slug no existe, se muestra tal cual. */
export function nombreDePosicion(
  tipoVehiculoId: string | null | undefined,
  posicionId: string,
): string {
  return posicionesDe(tipoVehiculoId).find((p) => p.id === posicionId)?.nombre ?? posicionId;
}

/**
 * A partir de aquí hay que cambiar la llanta.
 *
 * El número se acordó como «cuando llegue al 30%», que en obra significa **30%
 * de vida útil restante**: la llanta está gastada al 70%. Se guarda el desgaste
 * y no la vida que queda porque así lo pide la ficha, pero los dos números son
 * el mismo dato visto al revés, y confundirlos es la diferencia entre marcar la
 * flota entera y marcar lo que de verdad hay que cambiar.
 *
 * 0 = llanta nueva · 100 = lisa.
 */
export const DESGASTE_PARA_CAMBIO = 70;

/** Lo que le queda de vida a una llanta, en porcentaje. */
export function vidaUtilRestante(porcentajeDesgaste: number): number {
  return 100 - porcentajeDesgaste;
}

/**
 * ¿Hay que cambiar esta llanta?
 *
 * Sin lectura de desgaste la respuesta es **no**: que nadie la haya medido no es
 * lo mismo que saber que está gastada, y marcar en rojo lo que no se sabe hace
 * que se deje de mirar el rojo.
 */
export function hayQueCambiar(porcentajeDesgaste: number | null | undefined): boolean {
  return typeof porcentajeDesgaste === 'number' && porcentajeDesgaste >= DESGASTE_PARA_CAMBIO;
}
