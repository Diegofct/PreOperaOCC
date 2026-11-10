/**
 * La planificación de una obra (spec 043). Reglas puras: sin I/O, como todo `shared/rules`.
 *
 * ── Por qué la cantidad se calcula ──
 *
 * El Excel programa en plata, no en cantidades. La meta que se compara contra los partes es una
 * cantidad, así que sale de dividir el valor del mes entre el precio contractual (RF-16). Sin
 * precio no hay cantidad: `null`, nunca cero. Un cero diría que ese mes no había nada que hacer.
 *
 * ── Por qué los costos se guardan como vinieron ──
 *
 * Los libros traen costos de relleno como 0,000000001. Aquí no se redondean ni se descartan:
 * decidir que eso no es un costo es un hallazgo (RF-32), y hay que poder ver qué decía el Excel.
 *
 * ── Los rubros en una sola línea ──
 *
 * Un libro puede programar cada rubro por su lado, o juntarlos: la línea base de Magdalena trae
 * un solo renglón mensual, «Componentes» (RF-109). En ese caso cada rubro conserva su valor total
 * y su programación queda vacía, para que el mes no se cuente dos veces.
 *
 * ── Por qué el cruce mira el grupo ──
 *
 * En Magdalena, los 38 pares de capítulo e ítem de Berrio existen igual en Yondo. Sin el grupo,
 * lo ejecutado en Yondo sumaría a las metas de Berrio y nada lo delataría (RF-19).
 *
 * El frente de un libro se asocia a un grupo por lo que coincide —capítulo, ítem y cantidad
 * contractual— y no por su título: cada libro lo escribe distinto, y las cantidades de un frente
 * no son las del otro. Si eso no decide, se le pregunta a una persona (RF-107): mejor preguntar
 * que medir contra la vía equivocada.
 *
 * ── Qué es un hallazgo ──
 *
 * Lo que quien aprueba tiene que mirar: se lista y no impide aprobar (RF-34). Por eso una medida
 * real distinta de la contractual no lo es —en Magdalena son decenas y es lo normal—, ni un ítem
 * con medida real en cero sin programación: es un ítem que a propósito no se va a ejecutar. Si
 * esas filas salieran, las que importan se perderían entre ellas.
 */
import { redondearCantidad, type EstructuraDePresupuesto, type GrupoDelPresupuesto } from './presupuesto';
import { normalizar } from './texto';

export const ESTADOS_DE_PLANIFICACION = ['borrador', 'vigente', 'reemplazada', 'anulada', 'descartada'] as const;
export type EstadoDePlanificacion = (typeof ESTADOS_DE_PLANIFICACION)[number];

export const ESTADOS_DE_LECTURA_DE_PLANIFICACION = ['en_curso', 'lista', 'falta_grupo', 'fallida'] as const;
export type EstadoDeLecturaDePlanificacion = (typeof ESTADOS_DE_LECTURA_DE_PLANIFICACION)[number];

/** Lo programado en un mes del calendario, `YYYY-MM`. Pesos, sin decimales. */
export interface ValorDelMes {
  mes: string;
  valor: number;
}

export interface ProgramacionDelMes extends ValorDelMes {
  /** RF-16: `null` si el ítem no tiene precio contractual con el cual deducirla. */
  cantidad: number | null;
}

export interface ItemDeLaPlanificacion {
  /** El «Nº» del libro; `null` si no lo trae. */
  renglon: number | null;
  /** El ítem de pago: «5.1.7». */
  item: string;
  descripcion: string;
  unidad: string;
  /** El título del frente o vía en el libro; vacío si no tiene. */
  grupo: string;
  capitulo: string;
  precioContractual: number | null;
  /** RF-11: tal como vino en el libro. */
  precioCosto: number | null;
  /** RF-12: la cantidad planeada, la «medida real» del Excel. */
  medidaReal: number | null;
  /**
   * RF-139, RF-140: la «Med. Coste» del Excel, con la que el libro calcula el costo; `null` si no la
   * trae, y entonces cuenta la medida real. Es aparte de la real porque en el V5 difieren en 7 ítems,
   * y con la real el costo no cuadra con el del Excel (D31). Los borradores leídos antes de la D31 no
   * la tienen: por eso se lee siempre con `?? null`.
   */
  medidaCoste: number | null;
  medidaContractual: number | null;
  /** RF-13: `YYYY-MM`. */
  mesInicio: string | null;
  /** RF-14: en meses. */
  tiempoEjecucion: number | null;
  /** RF-15: en orden de calendario. */
  programacion: ProgramacionDelMes[];
  /** RF-22: se descartó alguna cifra leída de este ítem. */
  revisar: boolean;
  /** RF-19: su renglón del presupuesto; `null` si no existe ahí o aún no se ha cruzado. */
  delPresupuesto: CruceDelItem | null;
}

/** Lo que el ítem encontró en el presupuesto, con sus nombres tal como están allá. */
export interface CruceDelItem {
  grupoId: string;
  grupo: string;
  capituloId: string;
  capitulo: string;
  item: string;
  unidad: string;
  cantidad: number | null;
  valorUnitario: number | null;
}

export type ItemLeidoDePlanificacion = Omit<ItemDeLaPlanificacion, 'programacion' | 'revisar' | 'delPresupuesto' | 'medidaCoste'> & {
  programacion: readonly ValorDelMes[];
  revisar?: boolean;
  medidaCoste?: number | null;
};

export interface RubroDeLaPlanificacion {
  nombre: string;
  /** Pesos, a precio contractual. */
  valor: number;
  costo: number | null;
  /** Vacía si el libro los programa juntos en una sola línea (RF-109). */
  programacion: ValorDelMes[];
  /** RF-110: el id del rubro del presupuesto; `null` si no tiene par. */
  delPresupuesto?: string | null;
}

export type RubroLeidoDePlanificacion = Omit<RubroDeLaPlanificacion, 'programacion'> & {
  programacion: readonly ValorDelMes[];
};

export interface LineaDeRubros {
  nombre: string;
  valores: ValorDelMes[];
}

export interface ProgramacionDeRubros {
  rubros: RubroDeLaPlanificacion[];
  lineaDeRubros: LineaDeRubros | null;
}

export interface EstructuraDePlanificacion extends ProgramacionDeRubros {
  items: ItemDeLaPlanificacion[];
  /** RF-17. */
  indirectos: ValorDelMes[];
  /** RF-18. */
  supuestos: string;
  objetivos: string;
}

/** RF-16: el valor del mes entre el precio contractual, a tres decimales. */
export function cantidadDelMes(valor: number, precioContractual: number | null): number | null {
  if (!Number.isFinite(valor) || precioContractual === null || !Number.isFinite(precioContractual) || precioContractual <= 0) {
    return null;
  }
  return redondearCantidad(valor / precioContractual);
}

/** Los valores en pesos y en orden de calendario (`YYYY-MM` ordena como texto). */
export function valoresPorMes(valores: readonly ValorDelMes[]): ValorDelMes[] {
  return valores
    .map(({ mes, valor }) => ({ mes, valor: Math.round(valor) }))
    .sort((a, b) => a.mes.localeCompare(b.mes));
}

/** RF-11 a RF-16: el ítem como se guarda. La cantidad sale del valor sin redondear. */
export function armarItemDePlanificacion(leido: ItemLeidoDePlanificacion): ItemDeLaPlanificacion {
  return {
    ...leido,
    item: leido.item.trim(),
    medidaCoste: leido.medidaCoste ?? null,
    revisar: leido.revisar ?? false,
    delPresupuesto: null,
    programacion: [...leido.programacion]
      .sort((a, b) => a.mes.localeCompare(b.mes))
      .map(({ mes, valor }) => ({ mes, valor: Math.round(valor), cantidad: cantidadDelMes(valor, leido.precioContractual) })),
  };
}

/** RF-18: los renglones de supuestos u objetivos como un solo texto. */
export function notasEnTexto(renglones: readonly string[]): string {
  return renglones
    .map((renglon) => renglon.trim())
    .filter(Boolean)
    .join('\n');
}

/** RF-108, RF-109: con una línea única, los rubros no llevan programación propia. */
export function programacionDeRubros(
  rubros: readonly RubroLeidoDePlanificacion[],
  linea: { nombre: string; valores: readonly ValorDelMes[] } | null,
): ProgramacionDeRubros {
  return {
    rubros: rubros.map((rubro) => ({ ...rubro, programacion: linea ? [] : valoresPorMes(rubro.programacion) })),
    lineaDeRubros: linea ? { nombre: linea.nombre, valores: valoresPorMes(linea.valores) } : null,
  };
}

/** Lo programado de rubros en un mes. Un mes en cero no es programado. */
export function rubrosDelMes(programacion: ProgramacionDeRubros, mes: string): { nombre: string; valor: number }[] {
  const filas = programacion.lineaDeRubros
    ? [{ nombre: programacion.lineaDeRubros.nombre, valores: programacion.lineaDeRubros.valores }]
    : programacion.rubros.map((rubro) => ({ nombre: rubro.nombre, valores: rubro.programacion }));
  return filas.flatMap(({ nombre, valores }) => {
    const valor = valores.find((v) => v.mes === mes)?.valor ?? 0;
    return valor === 0 ? [] : [{ nombre, valor }];
  });
}

const TOLERANCIA_DE_CANTIDAD = 0.0005;

function limpio(texto: string): string {
  return normalizar(texto).replace(/\s+/g, ' ');
}

/** La identidad de un ítem: grupo, capítulo e ítem de pago, como los lee una persona (RF-19, RF-126). */
export function llaveDelItem(grupo: string, capitulo: string, item: string): string {
  return [grupo, capitulo, item].map(limpio).join('|');
}

/** El libro solo trae el «Nº»: su columna de ítem está vacía o repite el renglón. */
function sinItemDePago(item: ItemDeLaPlanificacion): boolean {
  return item.item === '' || item.item === String(item.renglon);
}

/** El renglón de ese grupo que corresponde al ítem, o `null`. */
function buscarEnGrupo(item: ItemDeLaPlanificacion, grupo: GrupoDelPresupuesto): CruceDelItem | null {
  const porRenglon = sinItemDePago(item) && item.renglon !== null;
  for (const capitulo of grupo.capitulos) {
    if (!porRenglon && limpio(capitulo.nombre) !== limpio(item.capitulo)) continue;
    const encontrado = capitulo.items.find((i) =>
      porRenglon ? i.renglon === item.renglon : limpio(i.item) === limpio(item.item),
    );
    if (encontrado) {
      return {
        grupoId: grupo.id,
        grupo: grupo.nombre,
        capituloId: capitulo.id,
        capitulo: capitulo.nombre,
        item: encontrado.item,
        unidad: encontrado.unidadEscrita,
        cantidad: encontrado.cantidad,
        valorUnitario: encontrado.valorUnitario,
      };
    }
  }
  return null;
}

/** Cuántos ítems del frente coinciden con ese grupo en capítulo, ítem y cantidad contractual. */
function coincidencias(items: readonly ItemDeLaPlanificacion[], grupo: GrupoDelPresupuesto): number {
  return items.filter((item) => {
    const cruce = buscarEnGrupo(item, grupo);
    return (
      cruce !== null &&
      cruce.cantidad !== null &&
      item.medidaContractual !== null &&
      Math.abs(cruce.cantidad - item.medidaContractual) <= TOLERANCIA_DE_CANTIDAD
    );
  }).length;
}

export interface FrenteSinGrupo {
  frente: string;
  candidatos: { id: string; nombre: string; coincidencias: number }[];
}

export type CruceConElPresupuesto =
  | {
      ok: true;
      items: ItemDeLaPlanificacion[];
      rubros: RubroDeLaPlanificacion[];
      /** El id del grupo de cada frente del libro (RF-105). */
      frentes: Record<string, string>;
    }
  | { ok: false; faltaGrupo: FrenteSinGrupo[] };

/**
 * Cruza la planificación con el presupuesto (RF-19, RF-105 a RF-107, RF-110). `elegidos` son los
 * grupos que una persona escogió, por frente. Un ítem sin par queda con `delPresupuesto` nulo: es
 * un hallazgo y no impide crear el borrador.
 */
export function cruzarConPresupuesto(
  items: readonly ItemDeLaPlanificacion[],
  rubros: readonly RubroDeLaPlanificacion[],
  presupuesto: EstructuraDePresupuesto,
  elegidos: Readonly<Record<string, string>> = {},
): CruceConElPresupuesto {
  const nombresDeFrente = [...new Set(items.map((item) => item.grupo))];
  const frentes = new Map<string, GrupoDelPresupuesto>();
  const faltaGrupo: FrenteSinGrupo[] = [];

  for (const frente of nombresDeFrente) {
    // RF-106: con un solo grupo no hay entre qué escoger.
    const unico = presupuesto.grupos.length === 1 ? presupuesto.grupos[0] : undefined;
    const elegido = presupuesto.grupos.find((g) => g.id === elegidos[frente]);
    if (unico ?? elegido) {
      frentes.set(frente, (unico ?? elegido) as GrupoDelPresupuesto);
      continue;
    }
    const delFrente = items.filter((item) => item.grupo === frente);
    const candidatos = presupuesto.grupos
      .map((g) => ({ id: g.id, nombre: g.nombre, coincidencias: coincidencias(delFrente, g) }))
      .sort((a, b) => b.coincidencias - a.coincidencias);
    const [primero, segundo] = candidatos;
    if (primero && primero.coincidencias > 0 && primero.coincidencias > (segundo?.coincidencias ?? 0)) {
      frentes.set(frente, presupuesto.grupos.find((g) => g.id === primero.id) as GrupoDelPresupuesto);
    } else {
      faltaGrupo.push({ frente, candidatos });
    }
  }
  if (faltaGrupo.length > 0) return { ok: false, faltaGrupo };

  const idsDeGrupo = new Set([...frentes.values()].map((g) => g.id));
  return {
    ok: true,
    items: items.map((item) => ({ ...item, delPresupuesto: buscarEnGrupo(item, frentes.get(item.grupo) as GrupoDelPresupuesto) })),
    // El mismo nombre puede existir en otro frente: solo valen los de sus grupos y los de todo el contrato.
    rubros: rubros.map((rubro) => ({
      ...rubro,
      delPresupuesto:
        presupuesto.rubros.find(
          (r) => limpio(r.nombre) === limpio(rubro.nombre) && (r.grupoId === null || idsDeGrupo.has(r.grupoId)),
        )?.id ?? null,
    })),
    frentes: Object.fromEntries([...frentes].map(([frente, grupo]) => [frente, grupo.id])),
  };
}

export type TipoDeHallazgo =
  | 'no_existe'
  | 'unidad_distinta'
  | 'cantidad_distinta'
  | 'costo_mayor'
  | 'sin_programacion'
  | 'despues_del_plazo'
  | 'sin_costo'
  | 'para_revisar'
  | 'rubro_sin_par';

export interface HallazgoDePlanificacion {
  tipo: TipoDeHallazgo;
  renglon: number | null;
  /** El ítem de pago; vacío en un rubro. */
  item: string;
  /** El capítulo; en un rubro, vacío. */
  capitulo: string;
  detalle: string;
}

/** Por debajo de un peso no es un costo: es relleno del Excel (RF-32). */
const COSTO_MINIMO = 1;

/** RF-32: vacío, en cero o por debajo de un peso. */
export function sinPrecioDeCosto(costo: number | null): boolean {
  return costo === null || !Number.isFinite(costo) || costo < COSTO_MINIMO;
}

function hallazgosDelItem(item: ItemDeLaPlanificacion, fechaFinContrato: string | null): HallazgoDePlanificacion[] {
  const hallazgos: { tipo: TipoDeHallazgo; detalle: string }[] = [];
  const cruce = item.delPresupuesto;

  if (!cruce) hallazgos.push({ tipo: 'no_existe', detalle: 'No existe en el presupuesto vigente.' });
  if (cruce && limpio(cruce.unidad) !== limpio(item.unidad)) {
    hallazgos.push({ tipo: 'unidad_distinta', detalle: `La unidad es «${item.unidad}» y en el presupuesto, «${cruce.unidad}».` });
  }
  if (
    cruce &&
    cruce.cantidad !== null &&
    item.medidaContractual !== null &&
    Math.abs(cruce.cantidad - item.medidaContractual) > TOLERANCIA_DE_CANTIDAD
  ) {
    hallazgos.push({
      tipo: 'cantidad_distinta',
      detalle: `La cantidad contractual es ${item.medidaContractual} y en el presupuesto, ${cruce.cantidad}.`,
    });
  }
  // RF-28, D31: sin precio contractual (35.1 y 35.2 del V5) no hay con qué comparar.
  if (
    !sinPrecioDeCosto(item.precioCosto) &&
    item.precioContractual !== null &&
    item.precioContractual > 0 &&
    (item.precioCosto as number) > item.precioContractual
  ) {
    hallazgos.push({
      tipo: 'costo_mayor',
      detalle: `El precio de costo (${item.precioCosto}) supera el contractual (${item.precioContractual}).`,
    });
  }

  const programados = item.programacion.filter((p) => p.valor > 0);
  if (programados.length === 0 && (item.medidaReal ?? 0) > 0) {
    hallazgos.push({ tipo: 'sin_programacion', detalle: 'Tiene medida real y ningún mes programado.' });
  }
  if (fechaFinContrato) {
    const ultimoDelContrato = fechaFinContrato.slice(0, 7);
    const despues = programados.filter((p) => p.mes > ultimoDelContrato);
    if (despues.length > 0) {
      hallazgos.push({
        tipo: 'despues_del_plazo',
        detalle: `Tiene programación hasta ${despues[despues.length - 1].mes} y el contrato termina en ${ultimoDelContrato}.`,
      });
    }
  }

  if (sinPrecioDeCosto(item.precioCosto)) hallazgos.push({ tipo: 'sin_costo', detalle: 'No tiene precio de costo.' });
  if (item.revisar) hallazgos.push({ tipo: 'para_revisar', detalle: 'Alguna cifra leída no estaba en la celda citada.' });

  return hallazgos.map((h) => ({ ...h, renglon: item.renglon, item: item.item, capitulo: item.capitulo }));
}

/** RF-25 a RF-32, RF-110, RF-115. Un ítem puede tener varios. */
export function hallazgosDe(
  estructura: Pick<EstructuraDePlanificacion, 'items' | 'rubros'>,
  fechaFinContrato: string | null,
): HallazgoDePlanificacion[] {
  return [
    ...estructura.items.flatMap((item) => hallazgosDelItem(item, fechaFinContrato)),
    ...estructura.rubros
      .filter((rubro) => !rubro.delPresupuesto)
      .map((rubro) => ({
        tipo: 'rubro_sin_par' as const,
        renglon: null,
        item: '',
        capitulo: '',
        detalle: `El rubro «${rubro.nombre}» no está en el presupuesto vigente.`,
      })),
  ];
}

export interface TotalesDelResumen {
  contractual: number;
  costo: number;
  /** RF-111: antes de indirectos. */
  margen: number;
  /** RF-112: después de indirectos. */
  resultado: number;
}

/** Los totales que trae el propio libro, para compararlos; lo que no trae no se compara. */
export interface TotalesDelExcel {
  contractual?: number | null;
  costo?: number | null;
  indirectos?: number | null;
}

export interface DiferenciaConElExcel {
  concepto: 'contractual' | 'costo' | 'indirectos';
  leido: number;
  delExcel: number;
  /** Lo leído menos lo del Excel. */
  diferencia: number;
}

export interface ResumenDeLaPlanificacion {
  medidaReal: TotalesDelResumen;
  medidaContractual: TotalesDelResumen;
  indirectos: number;
  diferenciasConElExcel: DiferenciaConElExcel[];
  /** El rango programado, para notar un mes o un año mal leídos antes de aprobar. */
  programacionDesde: string | null;
  programacionHasta: string | null;
}

/** Los totales redondean hasta el peso: una diferencia menor no es una diferencia. */
const TOLERANCIA_DE_TOTAL = 1;

function costoReal(costo: number | null): number {
  return sinPrecioDeCosto(costo) ? 0 : (costo as number);
}

/**
 * RF-23, RF-33, RF-111 a RF-114, RF-141. Los ítems sin costo real no suman al costo, igual que en el
 * libro, donde su relleno da casi cero. La comparación con el Excel es a medida real: sus totales son
 * esos, y por eso el costo a medida real va con la «Med. Coste» del ítem, que es la que usa el libro
 * (D31). Con la medida contractual, los dos totales van con la del contrato.
 */
export function resumenDeLaPlanificacion(
  estructura: Pick<EstructuraDePlanificacion, 'items' | 'rubros' | 'indirectos'>,
  delExcel: TotalesDelExcel = {},
): ResumenDeLaPlanificacion {
  const indirectos = estructura.indirectos.reduce((suma, i) => suma + i.valor, 0);
  const rubrosContractual = estructura.rubros.reduce((suma, r) => suma + r.valor, 0);
  const rubrosCosto = estructura.rubros.reduce((suma, r) => suma + costoReal(r.costo), 0);

  type Medida = (item: ItemDeLaPlanificacion) => number | null;
  const totales = (medida: Medida, medidaDelCosto: Medida = medida): TotalesDelResumen => {
    const contractual = Math.round(
      estructura.items.reduce((suma, i) => suma + (medida(i) ?? 0) * (i.precioContractual ?? 0), rubrosContractual),
    );
    const costo = Math.round(
      estructura.items.reduce((suma, i) => suma + (medidaDelCosto(i) ?? 0) * costoReal(i.precioCosto), rubrosCosto),
    );
    const margen = contractual - costo;
    return { contractual, costo, margen, resultado: margen - indirectos };
  };
  const medidaReal = totales(
    (i) => i.medidaReal,
    (i) => i.medidaCoste ?? i.medidaReal,
  );

  const leidos = { contractual: medidaReal.contractual, costo: medidaReal.costo, indirectos };
  const diferenciasConElExcel = (['contractual', 'costo', 'indirectos'] as const).flatMap((concepto) => {
    const delLibro = delExcel[concepto];
    if (delLibro === null || delLibro === undefined) return [];
    const diferencia = leidos[concepto] - delLibro;
    return Math.abs(diferencia) <= TOLERANCIA_DE_TOTAL ? [] : [{ concepto, leido: leidos[concepto], delExcel: delLibro, diferencia }];
  });

  const meses = estructura.items.flatMap((i) => i.programacion.filter((p) => p.valor > 0).map((p) => p.mes)).sort();
  return {
    medidaReal,
    medidaContractual: totales((i) => i.medidaContractual),
    indirectos,
    diferenciasConElExcel,
    programacionDesde: meses[0] ?? null,
    programacionHasta: meses[meses.length - 1] ?? null,
  };
}
