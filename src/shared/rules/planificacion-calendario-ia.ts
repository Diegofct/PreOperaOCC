/**
 * El calendario que propone la IA para un borrador hecho desde el presupuesto (spec 045). Reglas
 * puras: lo que se le manda y cómo se valida lo que devuelve. La llamada vive en el servidor.
 *
 * ── Por qué meses relativos ──
 *
 * A la IA se le pide, por cada renglón de una lista numerada, en qué mes empieza (1 a plazo) y
 * cuántos meses dura, nunca un `AAAA-MM`. La lectura de la 043 ya mostró que la IA se equivoca de
 * año («MAYO… MES 1» supuso 2024). Con números relativos, validar es una resta, y traducirlos al
 * calendario lo hace esta regla desde el mes de arranque. El mes 1 se le nombra (enero de 2026)
 * porque el orden de una obra depende de la temporada de lluvias, pero la lista no lleva fechas.
 *
 * ── De la IA solo se toma el calendario ──
 *
 * Cantidades, medidas, precios y costos son del presupuesto y de quien planifica (RF-27). De cada
 * renglón de la respuesta se leen `indice`, `inicio` y `meses`, y nada más; cualquier otro campo
 * se ignora aunque venga. Lo que no cabe en el plazo, o no es un número entero, se descarta para
 * ese renglón: queda sin programación y marcado para revisión (RF-20 a RF-23). Lo mismo un renglón
 * que la IA no mencionó: no hay propuesta para él. La explicación se corta a 1 000 caracteres
 * (RF-26).
 */
import { sumarMeses, type EstructuraDePlanificacion } from './planificacion';
import { recalcularPlanificacion } from './planificacion-borrador';
import { enPesos } from './pesos';

/** RF-26. */
export const LARGO_DE_LA_EXPLICACION = 1000;

const NOMBRES_DE_MES = [
  'enero',
  'febrero',
  'marzo',
  'abril',
  'mayo',
  'junio',
  'julio',
  'agosto',
  'septiembre',
  'octubre',
  'noviembre',
  'diciembre',
];

/** Lo que se espera de la IA; lo que traiga de más se ignora. */
export interface RespuestaDelCalendario {
  renglones: readonly { indice: number; inicio: number; meses: number }[];
  explicacion: string;
}

const cifra = (valor: number | null): number => (valor !== null && Number.isFinite(valor) ? valor : 0);

/** RF-19: el plazo y la lista numerada, primero los ítems y después los rubros. */
export function textoParaElCalendario(estructura: EstructuraDePlanificacion): string {
  const plazo = estructura.plazo;
  const encabezado: string[] = [];
  if (plazo) {
    const [anio, mes] = plazo.arranque.split('-').map(Number);
    encabezado.push(`Plazo: ${plazo.meses} meses. El mes 1 es ${NOMBRES_DE_MES[mes - 1]} de ${anio}.`);
  }
  const items = estructura.items.map((item) => {
    const cantidad = item.medidaReal ?? item.medidaContractual;
    const importe = cifra(item.medidaReal) * cifra(item.precioContractual);
    return [
      `Ítem ${item.item}`,
      item.capitulo,
      item.descripcion || '(sin descripción)',
      `${cantidad ?? 'sin cantidad'} ${item.unidad}`.trim(),
      enPesos(importe),
    ].join(' · ');
  });
  const rubros = estructura.rubros.map((rubro) => `Rubro ${rubro.nombre} · ${enPesos(rubro.valor)}`);
  return [...encabezado, ...[...items, ...rubros].map((renglon, i) => `${i + 1}. ${renglon}`)].join('\n');
}

const esEntero = (valor: unknown): valor is number => typeof valor === 'number' && Number.isInteger(valor);

/**
 * RF-19 a RF-23, RF-26, RF-27: el borrador con el calendario propuesto, recalculado. `descartados`
 * son los índices (de 1 en adelante) que quedaron sin programación.
 */
export function validarCalendario(
  borrador: EstructuraDePlanificacion,
  respuesta: RespuestaDelCalendario,
): { estructura: EstructuraDePlanificacion; descartados: number[] } {
  const plazo = borrador.plazo;
  const propuestos = new Map<number, { mesInicio: string; tiempoEjecucion: number }>();
  for (const renglon of Array.isArray(respuesta.renglones) ? respuesta.renglones : []) {
    const { indice, inicio, meses } = renglon;
    if (!esEntero(indice) || propuestos.has(indice) || !plazo) continue;
    // RF-20, RF-21: empieza en el mes 1 o después, y termina a más tardar en el último.
    if (!esEntero(inicio) || !esEntero(meses) || inicio < 1 || meses < 1 || inicio + meses - 1 > plazo.meses) continue;
    propuestos.set(indice, { mesInicio: sumarMeses(plazo.arranque, inicio - 1), tiempoEjecucion: meses });
  }

  const descartados: number[] = [];
  const calendario = (indice: number) => {
    const propuesto = propuestos.get(indice);
    if (!propuesto) descartados.push(indice);
    return propuesto
      ? { ...propuesto, fijados: [], revisar: false }
      : { mesInicio: null, tiempoEjecucion: null, fijados: [], revisar: true };
  };
  const items = borrador.items.map((item, i) => ({ ...item, ...calendario(i + 1) }));
  const rubros = borrador.rubros.map((rubro, i) => ({ ...rubro, ...calendario(borrador.items.length + i + 1) }));
  const explicacion = typeof respuesta.explicacion === 'string' ? respuesta.explicacion.trim().slice(0, LARGO_DE_LA_EXPLICACION) : '';

  const { estructura } = recalcularPlanificacion({ ...borrador, items, rubros, propuesta: { explicacion, fallida: false } });
  return { estructura, descartados };
}
