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
 *
 * ── La estructura de la 045 convive con la de la 043 ──
 *
 * La spec 045 hace la planificación en pantalla: plazo, meses fijados a mano y los costos
 * indirectos por renglón. Todo eso entra como campos **opcionales** del mismo jsonb, marcado con
 * `esquema: 2`, porque las planificaciones de la 043 ya están guardadas y una aprobada no se
 * reescribe (RF-146). Sin `esquema`, la estructura es de la 043 y se normaliza al leerla.
 *
 * Los meses del plazo se cuentan desde el de arranque, que es el mes 1 (RF-3): un plazo de 16
 * meses desde 2026-01 termina en 2027-04, no en 2027-05. El arranque puede estar en el pasado
 * (RF-5): una obra ya empezada se planifica igual.
 *
 * ── Hallazgo o impedimento ──
 *
 * La 043 dejaba aprobar con cualquier hallazgo (su RF-34). La 045 lo endurece solo para los huecos
 * que dejarían el resultado de la obra mal calculado: un ítem o un rubro sin costo, un ítem sin
 * medida real, algo con valor y sin programación, un renglón indirecto incompleto (RF-127 a
 * RF-131). Lo demás —programado después del plazo, marcado para revisar— sigue siendo hallazgo:
 * quien aprueba lo mira, y puede tener razón de ser. Un ítem con medida real cero no exige nada:
 * es uno que a propósito no se va a ejecutar.
 *
 * Los impedimentos y los hallazgos del borrador se leen sobre la estructura **ya recalculada**
 * (`recalcularPlanificacion`): la programación que miran es la derivada, no la que haya mandado
 * la pantalla.
 */
import type { HallazgoDeRepartoEn } from './planificacion-borrador';
import { redondearCantidad, type EstructuraDePresupuesto, type GrupoDelPresupuesto } from './presupuesto';
import { normalizar } from './texto';

export const ESTADOS_DE_PLANIFICACION = ['borrador', 'vigente', 'reemplazada', 'anulada', 'descartada'] as const;
export type EstadoDePlanificacion = (typeof ESTADOS_DE_PLANIFICACION)[number];

/** RF-147: de dónde nació la versión. */
export const ORIGENES_DE_PLANIFICACION = ['excel', 'presupuesto', 'copia'] as const;
export type OrigenDePlanificacion = (typeof ORIGENES_DE_PLANIFICACION)[number];

/** Marca las estructuras de la 045; sin ella, la estructura es de la 043. */
export const ESQUEMA_DE_PLANIFICACION = 2;

export const ESTADOS_DE_LECTURA_DE_PLANIFICACION = ['en_curso', 'lista', 'falta_grupo', 'fallida'] as const;
export type EstadoDeLecturaDePlanificacion = (typeof ESTADOS_DE_LECTURA_DE_PLANIFICACION)[number];

/**
 * Spec 045: qué hace una lectura por detrás. `excel` es la de la 043; `calendario`, la propuesta de
 * la IA para un borrador desde el presupuesto. Comparten la fila y su índice por obra, y por eso
 * no puede haber una propuesta y una lectura de Excel a la vez en la misma obra (RF-29).
 */
export const TIPOS_DE_LECTURA_DE_PLANIFICACION = ['excel', 'calendario'] as const;
export type TipoDeLecturaDePlanificacion = (typeof TIPOS_DE_LECTURA_DE_PLANIFICACION)[number];

/** Lo que pidió quien creó el borrador desde el presupuesto, para armarlo al terminar la IA. */
export interface PedidoDePropuesta {
  plazo: PlazoDeLaPlanificacion;
  /** `null` si el presupuesto tiene un solo grupo. */
  grupoId: string | null;
  /** La planificación de la cual copiar indirectos (RF-112); `null` si ninguna. */
  copiarIndirectosDe: string | null;
}

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
  /** RF-15: en orden de calendario. En la 045 la deriva el reparto, no se digita. */
  programacion: ProgramacionDelMes[];
  /** RF-98 (045): los meses que una persona o el Excel fijaron a mano. Ausente en la 043. */
  fijados?: ValorDelMes[];
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
  /** RF-96 (045): el periodo del rubro, como el de un ítem. Ausentes en la 043. */
  mesInicio?: string | null;
  tiempoEjecucion?: number | null;
  /** RF-98 (045). */
  fijados?: ValorDelMes[];
  /** RF-23 (045): la propuesta de la IA para este rubro se descartó. */
  revisar?: boolean;
}

export type RubroLeidoDePlanificacion = Omit<RubroDeLaPlanificacion, 'programacion'> & {
  programacion: readonly ValorDelMes[];
};

export interface LineaDeRubros {
  nombre: string;
  valores: ValorDelMes[];
  /** RF-164 (045): los meses de la línea, fijados. Ausente en la 043. */
  fijados?: ValorDelMes[];
}

export interface ProgramacionDeRubros {
  rubros: RubroDeLaPlanificacion[];
  lineaDeRubros: LineaDeRubros | null;
}

/** RF-80 (045): los siete conceptos de costos indirectos, en el orden del Excel. */
export const CONCEPTOS_INDIRECTOS = [
  'seguros_garantias',
  'impuestos',
  'maquinaria_general',
  'instalaciones_generales',
  'varios',
  'mano_obra_indirecta',
  'otros',
] as const;
export type ConceptoIndirecto = (typeof CONCEPTOS_INDIRECTOS)[number];

/** RF-74 a RF-77 (045): las cuatro formas de calcular un renglón. */
export const FORMAS_DE_INDIRECTO = ['fijo', 'porcentaje', 'mensual', 'personal'] as const;
export type FormaDeIndirecto = (typeof FORMAS_DE_INDIRECTO)[number];

/**
 * Lo común a todo renglón. Las cifras admiten `null`: un renglón al que le falta un valor existe
 * mientras se digita, y es un impedimento para aprobar, no un renglón inválido.
 */
interface RenglonIndirectoBase {
  id: string;
  concepto: ConceptoIndirecto;
  /** RF-78: obligatoria. */
  descripcion: string;
  /** Alguna cifra leída o copiada no cuadró, o se recortó al copiarlo a otro plazo. */
  revisar: boolean;
  /** RF-140, RF-145: el único renglón que se arma de una planificación de la 043. */
  sinDesglose?: boolean;
  /**
   * RF-168 a RF-171: leído de un Excel que no traía sus meses, así que su periodo lo puso la regla.
   * Es un aviso, no una marca para revisar: sus cifras sí cuadran con el libro. Se quita al cambiarle
   * el periodo, y solo la pone la lectura del Excel, nunca un pedido.
   */
  periodoDeducido?: boolean;
}

/** RF-85: todos salvo los de porcentaje tienen periodo y se reparten mes a mes. */
interface ConPeriodo {
  mesInicio: string | null;
  tiempoEjecucion: number | null;
  fijados: ValorDelMes[];
}

/** RF-74. */
export interface RenglonIndirectoFijo extends RenglonIndirectoBase, ConPeriodo {
  forma: 'fijo';
  valor: number | null;
}

/** RF-75: un porcentaje del importe real total, en fracción (0,02 es 2 %). */
export interface RenglonIndirectoPorcentaje extends RenglonIndirectoBase {
  forma: 'porcentaje';
  porcentaje: number | null;
}

/** RF-76: cantidad × (valor mensual + adicional) × meses. Los meses son `tiempoEjecucion`. */
export interface RenglonIndirectoMensual extends RenglonIndirectoBase, ConPeriodo {
  forma: 'mensual';
  cantidad: number | null;
  valorMensual: number | null;
  valorMensualAdicional: number | null;
}

/** RF-77, RF-92: (salario × factor + acomodación + viáticos) × dedicación × meses. */
export interface RenglonIndirectoPersonal extends RenglonIndirectoBase, ConPeriodo {
  forma: 'personal';
  salario: number | null;
  acomodacion: number | null;
  viaticos: number | null;
  /** Fracción del tiempo: 1 es tiempo completo. */
  dedicacion: number | null;
  /** RF-93: con el recargo de horas extras sumado al factor. */
  operativo: boolean;
}

export type RenglonIndirecto =
  | RenglonIndirectoFijo
  | RenglonIndirectoPorcentaje
  | RenglonIndirectoMensual
  | RenglonIndirectoPersonal;

/** RF-1, RF-2: el plazo, con el mes de arranque como mes 1 (RF-3). */
export interface PlazoDeLaPlanificacion {
  meses: number;
  /** `YYYY-MM`. */
  arranque: string;
}

/** RF-25, RF-26: lo que dijo la IA al proponer el calendario. */
export interface PropuestaDeLaIA {
  /** A lo sumo 1 000 caracteres. */
  explicacion: string;
  fallida: boolean;
}

export interface EstructuraDePlanificacion extends ProgramacionDeRubros {
  items: ItemDeLaPlanificacion[];
  /** RF-17 de la 043. En la 045 se deriva: la suma de los siete conceptos por mes. */
  indirectos: ValorDelMes[];
  /** RF-18. */
  supuestos: string;
  objetivos: string;

  // ── Lo de la 045: todo opcional, para que las estructuras de la 043 sigan siendo válidas ──

  esquema?: typeof ESQUEMA_DE_PLANIFICACION;
  plazo?: PlazoDeLaPlanificacion;
  /** RF-86. */
  factorPrestacional?: number;
  /** RF-87. */
  recargoHorasExtras?: number;
  renglonesIndirectos?: RenglonIndirecto[];
  /** Derivado, como `indirectos` (RF-94, RF-158). */
  indirectosPorConcepto?: Record<ConceptoIndirecto, ValorDelMes[]>;
  propuesta?: PropuestaDeLaIA;
  /** RF-121. */
  indirectosCopiadosDe?: { id: string; obra: string; version: number } | null;
  /** RF-45: un borrador del Excel que ya se tocó en pantalla. */
  editadoEnPantalla?: boolean;
  /** RF-43: lo que el libro dice por concepto, para comparar. */
  totalesPorConceptoDelExcel?: Partial<Record<ConceptoIndirecto, number>>;
}

/** RF-4. */
export const PLAZO_MAXIMO_EN_MESES = 120;

const MES = /^\d{4}-(0[1-9]|1[0-2])$/;

/** `YYYY-MM` con un mes del 01 al 12. */
export function esMesValido(mes: string): boolean {
  return MES.test(mes);
}

/** El mes `n` meses después (o antes, si es negativo). */
export function sumarMeses(mes: string, n: number): string {
  const [anio, numero] = mes.split('-').map(Number);
  const total = anio * 12 + (numero - 1) + n;
  const nuevoAnio = Math.floor(total / 12);
  return `${nuevoAnio}-${String(total - nuevoAnio * 12 + 1).padStart(2, '0')}`;
}

/** RF-3: los meses del plazo, del de arranque (mes 1) al último. */
export function mesesDelPlazo(plazo: PlazoDeLaPlanificacion): string[] {
  return Array.from({ length: plazo.meses }, (_, i) => sumarMeses(plazo.arranque, i));
}

/** RF-3: el mes número `meses`, contando el de arranque como el 1. */
export function ultimoMesDelPlazo(plazo: PlazoDeLaPlanificacion): string {
  return sumarMeses(plazo.arranque, plazo.meses - 1);
}

/** RF-4, RF-5: el motivo del rechazo, o `null`. Un arranque pasado es válido. */
export function validarPlazo(plazo: PlazoDeLaPlanificacion): string | null {
  const { meses, arranque } = plazo;
  if (!Number.isInteger(meses) || meses < 1 || meses > PLAZO_MAXIMO_EN_MESES) {
    return `El plazo tiene que ser un número entero entre 1 y ${PLAZO_MAXIMO_EN_MESES} meses.`;
  }
  if (!esMesValido(arranque)) return 'El mes de arranque tiene que ser un mes válido, como 2026-01.';
  return null;
}

/** RF-55: el motivo del rechazo de una cantidad de meses, o `null`. */
export function validarCantidadDeMeses(meses: number): string | null {
  return Number.isInteger(meses) && meses > 0 ? null : 'La cantidad de meses tiene que ser un número entero mayor que cero.';
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

/**
 * La identidad con que se mide un ítem: la del presupuesto; si no cruzó, la del libro. La usan el
 * cumplimiento (043) y el plan semanal (044), que tienen que hablar del mismo ítem.
 */
export function llaveDeItemPlanificado(item: Pick<ItemDeLaPlanificacion, 'delPresupuesto' | 'grupo' | 'capitulo' | 'item'>): string {
  const cruce = item.delPresupuesto;
  return cruce ? llaveDelItem(cruce.grupo, cruce.capitulo, cruce.item) : llaveDelItem(item.grupo, item.capitulo, item.item);
}

/** El libro solo trae el «Nº»: su columna de ítem está vacía o repite el renglón. */
function sinItemDePago(item: ItemDeLaPlanificacion): boolean {
  return item.item === '' || item.item === String(item.renglon);
}

/**
 * Spec 045 (RF-57): las llaves con que el editor busca los ítems del borrador, una por ítem y en su
 * orden. Es la del cruce; la que se repite lleva además su número de aparición (`|#2`, `|#3`). En el
 * V2, los «Transporte de material por terceros» no están en el presupuesto, no traen ítem de pago ni
 * renglón y comparten capítulo: con una sola llave, abrir el borrador les ponía a todos las cifras
 * del último. El orden sirve de desempate porque el editor no añade, quita ni reordena ítems, y la
 * versión del borrador garantiza que el pedido se hizo sobre la misma lista.
 */
export function llavesDeEdicion(items: readonly Pick<ItemDeLaPlanificacion, 'delPresupuesto' | 'grupo' | 'capitulo' | 'item'>[]): string[] {
  const vistas = new Map<string, number>();
  return items.map((item) => {
    const llave = llaveDeItemPlanificado(item);
    const vez = (vistas.get(llave) ?? 0) + 1;
    vistas.set(llave, vez);
    return vez === 1 ? llave : `${llave}|#${vez}`;
  });
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
  | 'periodo_deducido'
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

/** Los hallazgos de la 045, además de los de la 043 (RF-124 a RF-126). */
export type TipoDeHallazgoDelBorrador =
  | TipoDeHallazgo
  | 'rubro_sin_costo'
  | 'fuera_del_plazo'
  | 'reparto_no_cuadra'
  | 'porcentajes_sin_programacion';

export interface HallazgoDelBorrador extends Omit<HallazgoDePlanificacion, 'tipo'> {
  tipo: TipoDeHallazgoDelBorrador;
}

/** De qué es un impedimento: lo que la pantalla tiene que señalar (RF-132). */
export type ReferenciaDelBorrador =
  | { en: 'item'; renglon: number | null; item: string; capitulo: string; descripcion: string }
  | { en: 'rubro'; nombre: string }
  | { en: 'renglon'; id: string; descripcion: string };

export interface ImpedimentoParaAprobar {
  tipo: 'sin_costo' | 'rubro_sin_costo' | 'sin_medida_real' | 'sin_programacion' | 'rubro_sin_programacion' | 'renglon_incompleto';
  de: ReferenciaDelBorrador;
  detalle: string;
}

const tieneValor = (valor: number | null | undefined): boolean => valor !== null && valor !== undefined && Number.isFinite(valor);

/** Algún mes con obra; sin precio contractual el reparto va en cero y basta con que tenga meses. */
function itemProgramado(item: ItemDeLaPlanificacion): boolean {
  if (item.programacion.some((m) => m.valor > 0)) return true;
  return (item.precioContractual === null || item.precioContractual <= 0) && item.programacion.length > 0;
}

/** RF-131: le falta una cifra que su fórmula multiplica, o el periodo en que se reparte. */
function renglonIncompleto(renglon: RenglonIndirecto): boolean {
  if (renglon.forma === 'porcentaje') return !tieneValor(renglon.porcentaje);
  const sinPeriodo = renglon.mesInicio === null || !tieneValor(renglon.tiempoEjecucion);
  switch (renglon.forma) {
    case 'fijo':
      return sinPeriodo || !tieneValor(renglon.valor);
    case 'mensual':
      return sinPeriodo || !tieneValor(renglon.cantidad) || !tieneValor(renglon.valorMensual);
    case 'personal':
      return sinPeriodo || !tieneValor(renglon.salario) || !tieneValor(renglon.dedicacion);
  }
}

function deItem(item: ItemDeLaPlanificacion): ReferenciaDelBorrador {
  return { en: 'item', renglon: item.renglon, item: item.item, capitulo: item.capitulo, descripcion: item.descripcion };
}

/** RF-127 a RF-133: lo que impide aprobar, con su ítem, rubro o renglón. Vacío si se puede. */
export function impedimentosParaAprobar(estructura: EstructuraDePlanificacion): ImpedimentoParaAprobar[] {
  const impedimentos: ImpedimentoParaAprobar[] = [];
  for (const item of estructura.items) {
    if (!tieneValor(item.medidaReal)) {
      impedimentos.push({ tipo: 'sin_medida_real', de: deItem(item), detalle: 'No tiene medida real.' });
      continue;
    }
    if ((item.medidaReal as number) <= 0) continue;
    if (sinPrecioDeCosto(item.precioCosto)) {
      impedimentos.push({ tipo: 'sin_costo', de: deItem(item), detalle: 'Tiene medida real y no tiene precio de costo.' });
    }
    if (!itemProgramado(item)) {
      impedimentos.push({ tipo: 'sin_programacion', de: deItem(item), detalle: 'Tiene medida real y ningún mes programado.' });
    }
  }
  const lineaProgramada = (estructura.lineaDeRubros?.valores ?? []).some((m) => m.valor > 0);
  for (const rubro of estructura.rubros) {
    if (rubro.valor <= 0) continue;
    const de: ReferenciaDelBorrador = { en: 'rubro', nombre: rubro.nombre };
    if (sinPrecioDeCosto(rubro.costo)) impedimentos.push({ tipo: 'rubro_sin_costo', de, detalle: 'Tiene valor y no tiene costo.' });
    const programado = estructura.lineaDeRubros ? lineaProgramada : rubro.programacion.some((m) => m.valor > 0);
    if (!programado) impedimentos.push({ tipo: 'rubro_sin_programacion', de, detalle: 'Tiene valor y ningún mes programado.' });
  }
  for (const renglon of estructura.renglonesIndirectos ?? []) {
    if (renglonIncompleto(renglon)) {
      impedimentos.push({
        tipo: 'renglon_incompleto',
        de: { en: 'renglon', id: renglon.id, descripcion: renglon.descripcion },
        detalle: 'Le falta un valor para calcular su total.',
      });
    }
  }
  return impedimentos;
}

/** El último mes de un renglón con periodo; `null` sin él. Los meses con decimales cuentan enteros. */
function ultimoMesDelRenglon(renglon: RenglonIndirecto): string | null {
  if (renglon.forma === 'porcentaje' || renglon.mesInicio === null || !esMesValido(renglon.mesInicio)) return null;
  if (!tieneValor(renglon.tiempoEjecucion) || (renglon.tiempoEjecucion as number) < 1) return null;
  return sumarMeses(renglon.mesInicio, Math.ceil(renglon.tiempoEjecucion as number) - 1);
}

const DETALLE_DEL_REPARTO: Record<HallazgoDeRepartoEn['tipo'], string> = {
  fijados_exceden_total: 'Los meses fijados suman más que el total.',
  fijados_no_suman_total: 'Todos los meses están fijados y no suman el total.',
  sin_programacion: 'Nada tiene programación: los porcentajes se repartieron en partes iguales en el plazo.',
};

/**
 * RF-124 a RF-126: los hallazgos de la 043 más los de la 045. `deReparto` son los que devuelve
 * `recalcularPlanificacion` en su cálculo (RF-100, RF-101, RF-107).
 */
export function hallazgosDelBorrador(
  estructura: EstructuraDePlanificacion,
  fechaFinContrato: string | null,
  deReparto: readonly HallazgoDeRepartoEn[] = [],
): HallazgoDelBorrador[] {
  const hallazgos: HallazgoDelBorrador[] = hallazgosDe(estructura, fechaFinContrato);
  const sinItem = { renglon: null, item: '', capitulo: '' };
  const ultimo = estructura.plazo ? ultimoMesDelPlazo(estructura.plazo) : null;

  if (ultimo) {
    for (const item of estructura.items) {
      const despues = item.programacion.filter((m) => m.valor !== 0 && m.mes > ultimo);
      if (despues.length > 0) {
        hallazgos.push({
          tipo: 'fuera_del_plazo',
          renglon: item.renglon,
          item: item.item,
          capitulo: item.capitulo,
          detalle: `Tiene programación hasta ${despues[despues.length - 1].mes} y el plazo termina en ${ultimo}.`,
        });
      }
    }
    const rubrosFuera = [
      ...estructura.rubros.map((r) => ({ nombre: r.nombre, meses: r.programacion })),
      ...(estructura.lineaDeRubros ? [{ nombre: estructura.lineaDeRubros.nombre, meses: estructura.lineaDeRubros.valores }] : []),
    ];
    for (const { nombre, meses } of rubrosFuera) {
      const despues = meses.filter((m) => m.valor !== 0 && m.mes > ultimo);
      if (despues.length > 0) {
        hallazgos.push({
          ...sinItem,
          tipo: 'fuera_del_plazo',
          detalle: `El rubro «${nombre}» tiene programación hasta ${despues[despues.length - 1].mes} y el plazo termina en ${ultimo}.`,
        });
      }
    }
    for (const renglon of estructura.renglonesIndirectos ?? []) {
      const suUltimo = ultimoMesDelRenglon(renglon);
      if (suUltimo && suUltimo > ultimo) {
        hallazgos.push({
          ...sinItem,
          tipo: 'fuera_del_plazo',
          detalle: `El renglón «${renglon.descripcion}» llega hasta ${suUltimo} y el plazo termina en ${ultimo}.`,
        });
      }
    }
  }

  for (const rubro of estructura.rubros) {
    if (rubro.valor > 0 && sinPrecioDeCosto(rubro.costo)) {
      hallazgos.push({ ...sinItem, tipo: 'rubro_sin_costo', detalle: `El rubro «${rubro.nombre}» no tiene costo.` });
    }
    if (rubro.revisar) hallazgos.push({ ...sinItem, tipo: 'para_revisar', detalle: `El rubro «${rubro.nombre}» está marcado para revisar.` });
  }
  for (const renglon of estructura.renglonesIndirectos ?? []) {
    // RF-170: aparte de los marcados, y sin impedir aprobar.
    if (renglon.periodoDeducido && renglon.forma !== 'porcentaje') {
      hallazgos.push({
        ...sinItem,
        tipo: 'periodo_deducido',
        detalle: `El renglón «${renglon.descripcion}» no trae sus meses en el Excel: el periodo (desde ${renglon.mesInicio ?? '—'}, ${renglon.tiempoEjecucion ?? '—'} meses) lo puso la regla.`,
      });
    }
    if (renglon.revisar) {
      hallazgos.push({ ...sinItem, tipo: 'para_revisar', detalle: `El renglón «${renglon.descripcion}» está marcado para revisar.` });
    }
  }
  // Un ítem se nombra por su ítem de pago y capítulo, como los demás hallazgos; su llave es interna.
  const llaves = llavesDeEdicion(estructura.items);
  const itemPorLlave = new Map(estructura.items.map((i, n) => [llaves[n], i]));
  const renglonPorId = new Map((estructura.renglonesIndirectos ?? []).map((r) => [r.id, r]));
  for (const reparto of deReparto) {
    const tipo = reparto.tipo === 'sin_programacion' ? 'porcentajes_sin_programacion' : 'reparto_no_cuadra';
    if (reparto.en === 'porcentajes') {
      hallazgos.push({ ...sinItem, tipo, detalle: DETALLE_DEL_REPARTO[reparto.tipo] });
      continue;
    }
    const item = reparto.en === 'item' ? itemPorLlave.get(reparto.referencia) : undefined;
    if (item) {
      hallazgos.push({ tipo, renglon: item.renglon, item: item.item, capitulo: item.capitulo, detalle: DETALLE_DEL_REPARTO[reparto.tipo] });
      continue;
    }
    const nombre = reparto.en === 'renglon' ? (renglonPorId.get(reparto.referencia)?.descripcion ?? reparto.referencia) : reparto.referencia;
    const de = reparto.en === 'renglon' ? 'renglón' : 'rubro';
    hallazgos.push({ ...sinItem, tipo, detalle: `${DETALLE_DEL_REPARTO[reparto.tipo]} (${de} «${nombre}»)` });
  }
  return hallazgos;
}
