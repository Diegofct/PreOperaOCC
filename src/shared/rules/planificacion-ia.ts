/**
 * Leer con IA un libro de planificación (spec 043). Regla pura: qué se le manda a la IA y qué hojas
 * se aceptan. La llamada vive en `planificacion/servidor/leer-con-ia.ts`.
 *
 * ── Por qué no hay nombres de hoja aquí ──
 *
 * Cada obra trae un libro distinto (RF-104): Magdalena tiene `PLANIFIC BERRIO` y `Línea base`,
 * Cartagena `Vista árbol` y `Flujo 1`. La IA propone para qué sirve cada hoja, una persona lo
 * confirma, y esta regla solo revisa que lo confirmado se pueda leer.
 *
 * ── La línea base manda ──
 *
 * La programación que se mide es la inicial; el flujo de caja lleva el control del dinero y puede
 * mezclar frentes (RF-101, RF-102). Si el libro no trae línea base, la hoja la confirma una
 * persona (RF-103). El flujo sí puede servir para el mes de inicio y el tiempo de ejecución de
 * cada ítem, que en el V5 de Magdalena solo están ahí: por eso esos dos son un uso aparte.
 *
 * ── Las hojas ocultas ──
 *
 * Nunca se proponen ni se leen (RF-5): en los libros de OCC son los análisis por insumo, que pesan
 * mucho y no son la planificación.
 *
 * ── La IA lee, la regla comprueba ──
 *
 * Cada cifra cita su hoja y su fila, y en esa fila del Excel tiene que estar (RF-20, RF-21). La que
 * no está se descarta sola: las demás del ítem siguen y el ítem queda marcado (RF-22). Se compara
 * contra los números de la fila y no contra una columna, porque cada libro las pone donde quiere.
 *
 * Un cero se acepta si la fila tiene un cero o una celda vacía: `exceljs` entrega sin resultado las
 * fórmulas que valen cero, y `hojasDelLibro` las deja vacías.
 */
import { FILAS_MAXIMAS_PARA_LA_IA, type RechazadoPorIa } from './formulario-presupuesto-ia';
import { numero, texto, type Celda } from './formulario-presupuesto';
import {
  armarItemDePlanificacion,
  notasEnTexto,
  programacionDeRubros,
  valoresPorMes,
  type EstructuraDePlanificacion,
  type HallazgoDePlanificacion,
  type ItemDeLaPlanificacion,
  type RubroLeidoDePlanificacion,
  type TipoDeHallazgo,
  type ValorDelMes,
} from './planificacion';

export interface HojaDelLibro {
  nombre: string;
  visible: boolean;
  /** `[fila][columna]`, desde 0. */
  filas: readonly (readonly Celda[])[];
}

export const USOS_DE_HOJA = ['planificacion', 'programacion', 'indirectos', 'rubros', 'supuestos', 'objetivos', 'tiempos'] as const;
export type UsoDeHoja = (typeof USOS_DE_HOJA)[number];

export const CLASES_DE_HOJA = ['linea_base', 'flujo_de_caja', 'otra'] as const;
export type ClaseDeHoja = (typeof CLASES_DE_HOJA)[number];

export interface PropuestaDeHojas {
  hojas: { nombre: string; usos: UsoDeHoja[]; clase: ClaseDeHoja }[];
}

export interface SeleccionDeHojas {
  hojas: { nombre: string; usos: UsoDeHoja[] }[];
  /** RF-103: una persona confirmó la hoja de programación de un libro sin línea base. */
  confirmoProgramacion?: boolean;
}

export type TipoDeFaltaDeSeleccion =
  | 'hoja_no_disponible'
  | 'falta_planificacion'
  | 'escoger_planificacion'
  | 'falta_programacion'
  | 'programacion_no_es_linea_base'
  | 'confirmar_programacion';

export interface FaltaDeSeleccion {
  tipo: TipoDeFaltaDeSeleccion;
  mensaje: string;
  opciones?: string[];
}

/** Cuántas filas con contenido de cada hoja bastan para saber de qué trata. */
const FILAS_DE_MUESTRA = 8;
const LARGO_DE_CELDA_EN_MUESTRA = 60;

function celdasEnTexto(fila: readonly Celda[]): string[] {
  const celdas = fila.map(texto);
  while (celdas.length > 0 && celdas[celdas.length - 1] === '') celdas.pop();
  return celdas;
}

/** RF-4, RF-5: nombre y primeras filas de cada hoja visible. */
export function muestraParaProponer(libro: readonly HojaDelLibro[]): string {
  return libro
    .filter((hoja) => hoja.visible)
    .map((hoja) => {
      const conContenido = hoja.filas.map(celdasEnTexto).filter((celdas) => celdas.length > 0);
      const muestra = conContenido
        .slice(0, FILAS_DE_MUESTRA)
        .map((celdas) => celdas.map((c) => c.slice(0, LARGO_DE_CELDA_EN_MUESTRA)).join(' | '));
      return [`Hoja «${hoja.nombre}» · ${conContenido.length} filas con contenido`, ...muestra].join('\n');
    })
    .join('\n\n');
}

/** RF-5: lo que propuso la IA, sin las hojas ocultas ni las que no existen. */
export function limpiarPropuesta(propuesta: PropuestaDeHojas, libro: readonly HojaDelLibro[]): PropuestaDeHojas {
  const visibles = new Set(libro.filter((hoja) => hoja.visible).map((hoja) => hoja.nombre));
  return { hojas: propuesta.hojas.filter((hoja) => visibles.has(hoja.nombre)) };
}

/** Lo que escoge la persona en la pantalla, sobre la propuesta (RF-6, RF-100, RF-103). */
export interface EleccionDeHojas {
  /** La hoja del frente que se carga: una sola (RF-100). */
  frente: string;
  /** La hoja con la programación mensual; en un libro con línea base, la línea base (RF-101). */
  programacion: string;
  /** Las demás hojas propuestas que se dejan marcadas. */
  otras: readonly string[];
  /** RF-103: confirmó la programación de un libro sin línea base. */
  confirmoProgramacion: boolean;
}

/**
 * RF-6: la selección que se manda a leer, armada aquí y no en la pantalla. El orden es el de la
 * cita («H1» es la primera) y forma parte de la llave de la lectura guardada (RF-10): el frente,
 * luego la programación y luego las demás en el orden de la propuesta. Así, volver a subir el mismo
 * libro escogiendo lo mismo da la misma selección y no paga otra lectura.
 *
 * Cada hoja lleva los usos que propuso la IA, salvo que nadie más que el frente se lleva
 * `planificacion` (las otras hojas de frente se quedan fuera aunque estén marcadas) y nadie más que
 * la elegida se lleva `programacion`.
 */
export function armarSeleccion(propuesta: PropuestaDeHojas, eleccion: EleccionDeHojas): SeleccionDeHojas {
  const usosDe = (nombre: string): UsoDeHoja[] => propuesta.hojas.find((h) => h.nombre === nombre)?.usos ?? [];
  const sinFrenteNiProgramacion = (usos: readonly UsoDeHoja[]) => usos.filter((u) => u !== 'planificacion' && u !== 'programacion');

  const hojas: SeleccionDeHojas['hojas'] = [];
  const delFrente = new Set<UsoDeHoja>(['planificacion']);
  if (eleccion.programacion === eleccion.frente) delFrente.add('programacion');
  hojas.push({ nombre: eleccion.frente, usos: [...delFrente] });
  if (eleccion.programacion && eleccion.programacion !== eleccion.frente) {
    hojas.push({ nombre: eleccion.programacion, usos: ['programacion', ...sinFrenteNiProgramacion(usosDe(eleccion.programacion))] });
  }
  for (const hoja of propuesta.hojas) {
    if (hoja.nombre === eleccion.frente || hoja.nombre === eleccion.programacion || !eleccion.otras.includes(hoja.nombre)) continue;
    const usos = sinFrenteNiProgramacion(hoja.usos);
    if (usos.length > 0) hojas.push({ nombre: hoja.nombre, usos });
  }
  return { hojas, confirmoProgramacion: eleccion.confirmoProgramacion };
}

/** RF-5, RF-100 a RF-103: lo que falta para poder leer lo confirmado. Vacío si se puede. */
export function repasarSeleccion(
  seleccion: SeleccionDeHojas,
  propuesta: PropuestaDeHojas,
  libro: readonly HojaDelLibro[],
): FaltaDeSeleccion[] {
  const faltas: FaltaDeSeleccion[] = [];
  const visibles = new Set(libro.filter((hoja) => hoja.visible).map((hoja) => hoja.nombre));
  for (const hoja of seleccion.hojas) {
    if (!visibles.has(hoja.nombre)) faltas.push({ tipo: 'hoja_no_disponible', mensaje: `La hoja «${hoja.nombre}» no se puede leer.` });
  }

  const dePlanificacion = seleccion.hojas.filter((hoja) => hoja.usos.includes('planificacion')).map((hoja) => hoja.nombre);
  if (dePlanificacion.length === 0) {
    faltas.push({ tipo: 'falta_planificacion', mensaje: 'Falta escoger la hoja con la planificación por ítem.' });
  } else if (dePlanificacion.length > 1) {
    faltas.push({
      tipo: 'escoger_planificacion',
      mensaje: 'Escoja una sola hoja de planificación: cada frente se carga por separado.',
      opciones: dePlanificacion,
    });
  }

  const dePrograma = seleccion.hojas.filter((hoja) => hoja.usos.includes('programacion')).map((hoja) => hoja.nombre);
  if (dePrograma.length === 0) {
    faltas.push({ tipo: 'falta_programacion', mensaje: 'Falta escoger la hoja con la programación mensual.' });
    return faltas;
  }
  const claseDe = new Map(propuesta.hojas.map((hoja) => [hoja.nombre, hoja.clase]));
  if (propuesta.hojas.some((hoja) => hoja.clase === 'linea_base')) {
    if (dePrograma.some((nombre) => claseDe.get(nombre) !== 'linea_base')) {
      faltas.push({
        tipo: 'programacion_no_es_linea_base',
        mensaje: 'Este libro trae línea base: la programación se toma de ella, no del flujo de caja.',
      });
    }
  } else if (!seleccion.confirmoProgramacion) {
    faltas.push({
      tipo: 'confirmar_programacion',
      mensaje: 'Este libro no trae una línea base identificable. Confirme que esa hoja tiene la programación inicial.',
    });
  }
  return faltas;
}

/**
 * RF-6, RF-20: el texto para la IA, solo de las hojas confirmadas, en ese orden. Cada línea lleva
 * «H<hoja>F<fila>» con la fila real del Excel. `hojas` son las enviadas: «H1» es la primera.
 * `null` si pasa del tope.
 */
export function textoParaLeer(
  seleccion: SeleccionDeHojas,
  libro: readonly HojaDelLibro[],
): { texto: string; filas: number; hojas: HojaDelLibro[] } | null {
  const enviadas = seleccion.hojas.flatMap((elegida) => {
    const hoja = libro.find((h) => h.nombre === elegida.nombre && h.visible);
    return hoja ? [{ hoja, usos: elegida.usos }] : [];
  });

  const lineas: string[] = [];
  let filas = 0;
  enviadas.forEach(({ hoja, usos }, h) => {
    lineas.push(`Hoja ${h + 1} · «${hoja.nombre}» · ${usos.join(', ')}`);
    hoja.filas.forEach((fila, f) => {
      const celdas = celdasEnTexto(fila);
      if (celdas.length === 0) return;
      filas += 1;
      lineas.push(`H${h + 1}F${f + 1} | ${celdas.join(' | ')}`);
    });
  });
  if (filas > FILAS_MAXIMAS_PARA_LA_IA) return null;
  return { texto: lineas.join('\n'), filas, hojas: enviadas.map(({ hoja }) => hoja) };
}

/** Dónde está una cifra: hoja (la 1 es la primera enviada) y fila del Excel; `0` si no lo trae. */
export interface CitaDeLectura {
  hoja: number;
  fila: number;
}

export interface MesesCitados extends CitaDeLectura {
  meses: { mes: string; valor: number }[];
}

export interface ItemLeidoPorLaIa extends CitaDeLectura {
  renglon: string;
  item: string;
  descripcion: string;
  unidad: string;
  grupo: string;
  capitulo: string;
  precioContractual: number;
  precioCosto: number;
  medidaReal: number;
  medidaContractual: number;
  /** RF-139, RF-140: si el libro trae «Med. Coste». Sin nulos en el esquema: si es `false`, `medidaCoste` no cuenta. */
  traeMedidaCoste: boolean;
  medidaCoste: number;
  programacion: MesesCitados;
  tiempos: CitaDeLectura & {
    /** El número tal como está en la celda; `mesInicio` es el mes del calendario que representa. */
    mesInicioDelExcel: number;
    mesInicio: string;
    tiempoEjecucion: number;
  };
}

/** Lo que devuelve la IA. Sin nulos ni uniones (el esquema de la API): lo vacío es `''` o `0`. */
export interface LecturaDePlanificacion {
  items: ItemLeidoPorLaIa[];
  rubros: (CitaDeLectura & { nombre: string; valor: number; costo: number; programacion: MesesCitados })[];
  /** `nombre` vacío si el libro no junta los rubros en una sola línea. */
  lineaDeRubros: MesesCitados & { nombre: string };
  indirectos: MesesCitados;
  supuestos: string[];
  objetivos: string[];
  totalesDelExcel: Record<'contractual' | 'costo' | 'indirectos', CitaDeLectura & { valor: number }>;
}

export interface TotalesLeidosDelExcel {
  contractual: number | null;
  costo: number | null;
  indirectos: number | null;
}

export type ResultadoDeLaLectura =
  | { ok: true; estructura: EstructuraDePlanificacion; rechazados: RechazadoPorIa[]; totalesDelExcel: TotalesLeidosDelExcel }
  | { ok: false; error: string };

export interface ObservacionDeLaIa {
  tipo: TipoDeHallazgo;
  item: string;
  capitulo: string;
  texto: string;
}

const MES = /^\d{4}-(0[1-9]|1[0-2])$/;

/** Un peso de holgura en la plata; en cantidades, lo que se pierde a tres decimales. */
const tolPesos = () => 1;
const tolCantidad = (n: number) => 0.0005 + Math.abs(n) * 1e-9;

type Hojas = readonly HojaDelLibro[];

function filaCitada(hojas: Hojas, cita: CitaDeLectura): readonly Celda[] | null {
  return hojas[cita.hoja - 1]?.filas[cita.fila - 1] ?? null;
}

/** RF-20, RF-21 de la 043; RF-44, RF-45 de la 044: la cifra está entre los números de esa fila. */
export function estaEnLaFila(fila: readonly Celda[] | null, cifra: number, tolerancia: (n: number) => number): boolean {
  if (!fila || !Number.isFinite(cifra)) return false;
  const numeros = fila.map(numero).filter((n): n is number => n !== null);
  if (cifra === 0 && fila.some((celda) => celda === null)) return true;
  return numeros.some((n) => Math.abs(n - cifra) <= tolerancia(n));
}

/**
 * RF-20 a RF-22. Devuelve las cifras comprobadas y anota lo descartado.
 */
function mesesComprobados(
  hojas: Hojas,
  citados: MesesCitados,
  que: string,
  rechazados: RechazadoPorIa[],
): { valores: ValorDelMes[]; descarto: boolean } {
  const fila = filaCitada(hojas, citados);
  const valores: ValorDelMes[] = [];
  for (const { mes, valor } of citados.meses) {
    if (MES.test(mes) && estaEnLaFila(fila, valor, tolPesos)) valores.push({ mes, valor });
    else rechazados.push({ hoja: citados.hoja, fila: citados.fila, que: `${que} · ${mes}`, motivo: `no encontrado en la fila ${citados.fila}` });
  }
  return { valores, descarto: valores.length < citados.meses.length };
}

function renglonDe(escrito: string): number | null {
  const n = Number(texto(escrito));
  return Number.isInteger(n) && n > 0 ? n : null;
}

function itemComprobado(leido: ItemLeidoPorLaIa, hojas: Hojas, rechazados: RechazadoPorIa[]): ItemDeLaPlanificacion | null {
  const item = texto(leido.item);
  const descripcion = texto(leido.descripcion);
  const renglon = texto(leido.renglon);
  const que = [item || renglon, descripcion].filter(Boolean).join(' · ');
  if (!que) {
    rechazados.push({ hoja: leido.hoja, fila: leido.fila, que: 'Ítem sin nombre', motivo: 'no dice qué ítem es' });
    return null;
  }

  let descarto = false;
  const fila = filaCitada(hojas, leido);
  const comprobar = (cifra: number, nombre: string, tolerancia: (n: number) => number): number | null => {
    if (estaEnLaFila(fila, cifra, tolerancia)) return cifra;
    descarto = true;
    rechazados.push({ hoja: leido.hoja, fila: leido.fila, que: `${que} · ${nombre}`, motivo: `no encontrado en la fila ${leido.fila}` });
    return null;
  };
  const precioContractual = comprobar(leido.precioContractual, 'precio contractual', tolPesos);
  const precioCosto = comprobar(leido.precioCosto, 'precio de costo', tolPesos);
  const medidaReal = comprobar(leido.medidaReal, 'medida real', tolCantidad);
  const medidaContractual = comprobar(leido.medidaContractual, 'medida contractual', tolCantidad);
  // RF-140: si no la trae no se comprueba nada; el resumen usará la medida real.
  const medidaCoste = leido.traeMedidaCoste ? comprobar(leido.medidaCoste, 'Med. Coste', tolCantidad) : null;

  const programacion = mesesComprobados(hojas, leido.programacion, que, rechazados);
  descarto ||= programacion.descarto;

  let mesInicio: string | null = null;
  let tiempoEjecucion: number | null = null;
  const { tiempos } = leido;
  if (tiempos.hoja !== 0 || tiempos.fila !== 0) {
    const filaDeTiempos = filaCitada(hojas, tiempos);
    if (MES.test(tiempos.mesInicio) && tiempos.mesInicioDelExcel > 0 && estaEnLaFila(filaDeTiempos, tiempos.mesInicioDelExcel, tolCantidad)) {
      mesInicio = tiempos.mesInicio;
    } else {
      descarto = true;
      rechazados.push({ hoja: tiempos.hoja, fila: tiempos.fila, que: `${que} · mes de inicio`, motivo: `no encontrado en la fila ${tiempos.fila}` });
    }
    if (tiempos.tiempoEjecucion > 0 && estaEnLaFila(filaDeTiempos, tiempos.tiempoEjecucion, tolCantidad)) {
      tiempoEjecucion = tiempos.tiempoEjecucion;
    } else {
      descarto = true;
      rechazados.push({ hoja: tiempos.hoja, fila: tiempos.fila, que: `${que} · tiempo de ejecución`, motivo: `no encontrado en la fila ${tiempos.fila}` });
    }
  }

  return armarItemDePlanificacion({
    renglon: renglonDe(leido.renglon),
    item,
    descripcion,
    unidad: texto(leido.unidad),
    grupo: texto(leido.grupo),
    capitulo: texto(leido.capitulo),
    precioContractual,
    precioCosto,
    medidaReal,
    medidaCoste,
    medidaContractual,
    mesInicio,
    tiempoEjecucion,
    programacion: programacion.valores,
    revisar: descarto,
  });
}

/** RF-9, RF-20 a RF-22: la estructura con lo que se pudo comprobar. `hojas` son las enviadas. */
export function estructuraDeLaLectura(lectura: LecturaDePlanificacion, hojas: Hojas): ResultadoDeLaLectura {
  const rechazados: RechazadoPorIa[] = [];
  const items = lectura.items.flatMap((leido) => {
    const item = itemComprobado(leido, hojas, rechazados);
    return item ? [item] : [];
  });
  if (items.length === 0) return { ok: false, error: 'No se encontró ningún ítem en las hojas escogidas.' };

  const rubros = lectura.rubros.flatMap((leido): RubroLeidoDePlanificacion[] => {
    const nombre = texto(leido.nombre);
    const fila = filaCitada(hojas, leido);
    if (!estaEnLaFila(fila, leido.valor, tolPesos)) {
      rechazados.push({ hoja: leido.hoja, fila: leido.fila, que: `Rubro ${nombre}`, motivo: `no encontrado en la fila ${leido.fila}` });
      return [];
    }
    const costo = estaEnLaFila(fila, leido.costo, tolPesos) ? leido.costo : null;
    return [{ nombre, valor: leido.valor, costo, programacion: mesesComprobados(hojas, leido.programacion, `Rubro ${nombre}`, rechazados).valores }];
  });

  const nombreDeLinea = texto(lectura.lineaDeRubros.nombre);
  const linea = nombreDeLinea
    ? { nombre: nombreDeLinea, valores: mesesComprobados(hojas, lectura.lineaDeRubros, nombreDeLinea, rechazados).valores }
    : null;

  const total = (concepto: keyof LecturaDePlanificacion['totalesDelExcel']): number | null => {
    const cifra = lectura.totalesDelExcel[concepto];
    if (cifra.hoja === 0 || cifra.fila === 0) return null;
    if (estaEnLaFila(filaCitada(hojas, cifra), cifra.valor, tolPesos)) return cifra.valor;
    rechazados.push({ hoja: cifra.hoja, fila: cifra.fila, que: `Total ${concepto} del Excel`, motivo: `no encontrado en la fila ${cifra.fila}` });
    return null;
  };

  return {
    ok: true,
    estructura: {
      items,
      ...programacionDeRubros(rubros, linea),
      indirectos: valoresPorMes(mesesComprobados(hojas, lectura.indirectos, 'Indirectos', rechazados).valores),
      supuestos: notasEnTexto(lectura.supuestos),
      objetivos: notasEnTexto(lectura.objetivos),
    },
    rechazados,
    totalesDelExcel: { contractual: total('contractual'), costo: total('costo'), indirectos: total('indirectos') },
  };
}

/** RF-24: solo sobreviven las observaciones sobre un hallazgo que la regla sí listó. */
export function observacionesValidas(
  observaciones: readonly ObservacionDeLaIa[],
  hallazgos: readonly HallazgoDePlanificacion[],
): ObservacionDeLaIa[] {
  return observaciones.filter((o) => hallazgos.some((h) => h.tipo === o.tipo && h.item === o.item && h.capitulo === o.capitulo));
}
