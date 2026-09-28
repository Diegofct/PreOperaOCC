/**
 * El cumplimiento del preoperacional del día. Función pura, sin I/O.
 *
 * Hasta la spec 019 el inicio del panel contaba contra **toda** la flota, y un
 * equipo de un tipo sin formato —la vibrocompactadora y la recicladora desde la
 * spec 003, seis tipos más desde la 019— salía todos los días como «máquina sin
 * preoperacional», bajando el porcentaje por algo que nadie puede hacer. Una
 * alarma que no se puede apagar es una alarma que se deja de mirar.
 *
 * Recibe la marca de formato ya resuelta y no el tipo de equipo: quién decide
 * qué tipo tiene formato es el catálogo, y las reglas no tienen dependencias.
 *
 * Los inspeccionados se cuentan **dentro de la flota**, no por el tamaño del
 * conjunto de preoperacionales del día: un equipo inspeccionado y dado de baja
 * después contaba en el numerador y no en el denominador, y el porcentaje podía
 * pasar de 100.
 */

export interface EquipoDelDia {
  id: string;
  /** Su tipo tiene formato de preoperacional. */
  conFormato: boolean;
}

export interface CumplimientoDelDia {
  /** Equipos a los que se les puede levantar preoperacional. */
  inspeccionables: number;
  inspeccionados: number;
  sinInspeccionar: number;
  /**
   * De 0 a 100, o `null` si no hay ningún equipo inspeccionable: sin nada que
   * inspeccionar no se cumple ni se incumple (RF-23).
   */
  cumplimiento: number | null;
}

export function cumplimientoDelDia(
  flota: readonly EquipoDelDia[],
  inspeccionadosHoy: ReadonlySet<string>,
): CumplimientoDelDia {
  const inspeccionables = flota.filter((equipo) => equipo.conFormato);
  const inspeccionados = inspeccionables.filter((equipo) => inspeccionadosHoy.has(equipo.id)).length;
  return {
    inspeccionables: inspeccionables.length,
    inspeccionados,
    sinInspeccionar: inspeccionables.length - inspeccionados,
    cumplimiento:
      inspeccionables.length === 0
        ? null
        : Math.round((inspeccionados / inspeccionables.length) * 100),
  };
}
