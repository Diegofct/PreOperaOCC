/**
 * Lo que se le manda a la IA para proponer un plan semanal, y lo que se acepta de lo que devuelve
 * (spec 044, RF-34 a RF-49, RF-104, RF-105). Reglas puras: el servidor junta los datos y llama a la
 * IA (`plan-semanal/servidor/con-ia.ts`); aquí se decide qué ve la IA y qué se le cree.
 *
 * ── Qué recibe para proponer ──
 *
 * La programación del mes de la planificación vigente, la meta estimada de la semana y lo pendiente
 * de cada ítem (RF-35, RF-36), cómo fue la semana anterior (RF-37), los vehículos de la obra (RF-38)
 * y, si la obra lleva almacén, sus existencias (RF-39, RF-105). Cada ítem va con su **llave**, la
 * misma con que lo mide el cumplimiento: la IA la devuelve con cada actividad y así el cruce no
 * depende de que copie bien un nombre de capítulo. Una llave que no se le dio pasa a «fuera» (T11).
 *
 * Los días que salen marcados (lunes a sábado sin festivos, RF-96) los calcula la regla y se le dicen
 * a la IA, para que no reparta en otros. Las cuentas —meta diaria, total, valor— no se le piden:
 * las rehace la regla (RF-40). Y se le pide no poner valores en pesos en los textos (RF-104): el
 * Residente los vería, aunque a él se le reemplazan igual (RF-102).
 */
import type { RechazadoPorIa } from './formulario-presupuesto-ia';
import {
  cruzarActividad,
  diasDeLaSemana,
  diasPorDefecto,
  metaDiaria,
  repartir,
  totalProgramado,
  type DiferenciaConElExcelDelPlan,
  type EstructuraDelPlan,
  type ItemParaCruzar,
  type RiesgoDelPlan,
} from './plan-semanal';
import { estaEnLaFila, type CitaDeLectura, type HojaDelLibro } from './planificacion-ia';

export interface ItemParaProponer {
  /** La llave con que mide el cumplimiento; la IA la devuelve tal cual. */
  llave: string;
  item: string;
  grupo: string;
  capitulo: string;
  descripcion: string;
  unidad: string;
  /** RF-35: lo programado de cada mes que toca la semana, `YYYY-MM → cantidad`. */
  cantidadesDelMes: Readonly<Record<string, number>>;
  /** La meta que la 043 estimaría para esta semana sin plan. */
  metaEstimada: number | null;
  /** RF-36: lo que le falta al ítem en la obra. */
  pendiente: number | null;
}

export interface PedidoDePropuesta {
  /** El lunes de la semana. */
  semana: string;
  /** RF-96: los días que salen marcados. */
  dias: readonly string[];
  items: readonly ItemParaProponer[];
  /** RF-37: meta y ejecutado de la semana anterior, por llave. */
  semanaAnterior: readonly { llave: string; meta: number | null; ejecutado: number }[];
  /** RF-38. */
  vehiculos: readonly { id: string; placa: string; tipo: string }[];
  /** RF-39, RF-105: `null` si la obra no lleva almacén. */
  existencias: readonly { material: string; unidad: string; saldo: number }[] | null;
}

const enCantidad = (n: number | null) => (n === null ? '—' : String(n));

/** RF-35 a RF-39, RF-96, RF-105: el texto con que la IA arma la propuesta. */
export function textoParaProponer(pedido: PedidoDePropuesta): string {
  const lineas: string[] = [];
  lineas.push(`Semana del lunes ${pedido.semana}. Días de trabajo marcados: ${pedido.dias.join(', ')}.`);

  lineas.push('', 'Ítems de la planificación (llave | ítem | capítulo | frente | descripción | unidad | programado del mes | semana estimada | pendiente):');
  for (const i of pedido.items) {
    const meses = Object.entries(i.cantidadesDelMes)
      .map(([mes, c]) => `${mes}: ${c}`)
      .join(', ');
    lineas.push(
      `${i.llave} | ${i.item} | ${i.capitulo} | ${i.grupo} | ${i.descripcion} | ${i.unidad} | ${meses || 'sin programación'} | semana estimada: ${enCantidad(i.metaEstimada)} | pendiente: ${enCantidad(i.pendiente)}`,
    );
  }

  const porLlave = new Map(pedido.items.map((i) => [i.llave, i]));
  lineas.push('', 'Semana anterior (ítem | meta | ejecutado):');
  if (pedido.semanaAnterior.length === 0) lineas.push('Sin datos de la semana anterior.');
  for (const s of pedido.semanaAnterior) {
    const i = porLlave.get(s.llave);
    lineas.push(`${i ? `${i.item} ${i.descripcion}` : s.llave} | meta ${enCantidad(s.meta)} | ejecutado ${s.ejecutado}`);
  }

  lineas.push('', 'Vehículos de la obra (id | placa | tipo):');
  if (pedido.vehiculos.length === 0) lineas.push('La obra no tiene vehículos registrados.');
  for (const v of pedido.vehiculos) lineas.push(`${v.id} | ${v.placa} | ${v.tipo}`);

  lineas.push('', 'Existencias del almacén (material | saldo | unidad):');
  if (pedido.existencias === null) lineas.push('La obra no lleva almacén: proponga los materiales sin existencias.');
  else if (pedido.existencias.length === 0) lineas.push('El almacén no tiene existencias.');
  else for (const e of pedido.existencias) lineas.push(`${e.material} | ${e.saldo} | ${e.unidad}`);

  return lineas.join('\n');
}

/** RF-34, RF-40, RF-41, RF-96, RF-104: lo que se le pide a la IA al proponer. */
export const INSTRUCCIONES_PARA_PROPONER = `Propones el plan de trabajo de una semana para una obra civil en Colombia, a partir de su planificación aprobada.

Recibes los ítems de la planificación con su llave, lo programado del mes, la meta estimada de la semana y lo pendiente; cómo fue la semana anterior; los vehículos de la obra y, si tiene, las existencias del almacén.

Reglas:
- Usa solo las llaves de los ítems que recibes. Si propones una actividad que no es un ítem de la planificación, deja su llave vacía.
- La meta de la semana de cada actividad es una cantidad en su unidad. No la pongas por encima de lo pendiente salvo que la semana anterior se haya quedado corta y lo justifique.
- Los días de trabajo son los marcados, de lunes a sábado, sin festivos. No calcules la meta diaria ni totales ni valores: los calcula el sistema.
- Para la maquinaria propia usa los vehículos de la obra por su id; la externa, descríbela como texto.
- Personal por cargo y por frente de trabajo; materiales y control de volquetas como renglones con su base de cálculo; supuestos, riesgos (con su efecto en la meta y su mitigación) y requerimientos a gerencia.
- No pongas valores en pesos en ningún texto: ni en supuestos, ni en riesgos, ni en requerimientos, ni en la maquinaria.
- Escribe en español, corto y concreto.`;

/** Una actividad como la devuelve la IA. Sin nulos (el esquema de la API): lo vacío es `''` o `0`. */
export interface ActividadLeidaPorLaIa extends CitaDeLectura {
  /** En una propuesta, la llave que se le dio; vacía si no es un ítem de la planificación. */
  llave: string;
  /** En un Excel, el «Nº» o el ítem como lo escribe el libro. */
  renglon: string;
  item: string;
  frenteDeTrabajo: string;
  descripcion: string;
  unidad: string;
  esRubro: boolean;
  metaSemana: number;
  valorRubro: number;
  /** RF-46: los días de la semana con cantidad, por su nombre («lunes» … «sábado»). */
  diasConCantidad: string[];
  /** RF-48: lo que traía el Excel; `0` si no lo trae. */
  metaDiariaDelExcel: number;
  totalDelExcel: number;
  cuadrilla: string;
  equipo: string;
}

/** El plan como lo devuelve la IA, de una propuesta o de un Excel. */
export interface PlanLeidoPorLaIa {
  actividades: ActividadLeidaPorLaIa[];
  personal: { cargo: string; porFrente: { frente: string; cantidad: number }[] }[];
  /** `vehiculoId` vacío si el equipo es externo o no es de la obra. */
  maquinaria: { equipo: string; cantidad: number; propia: boolean; frenteDeTrabajo: string; vehiculoId: string; referencia: string }[];
  materiales: { material: string; cantidadSemana: number; unidad: string; baseDeCalculo: string }[];
  volquetas: {
    conceptos: { concepto: string; unidad: string; cantidadSemana: number; viajesSemana: number }[];
    requeridas: number;
    propias: number;
    externas: number;
  };
  supuestos: string[];
  riesgos: RiesgoDelPlan[];
  requerimientos: string[];
}

export interface ContextoDeLaLectura {
  /** Los ítems de la planificación vigente, para cruzar. */
  items: readonly ItemParaCruzar[];
  /** El lunes de la semana. */
  semana: string;
  /** Las hojas enviadas si se leyó un Excel; `null` si es una propuesta. */
  hojas: readonly HojaDelLibro[] | null;
}

export type ResultadoDelPlanLeido =
  | { ok: true; estructura: EstructuraDelPlan; rechazados: RechazadoPorIa[]; diferencias: DiferenciaConElExcelDelPlan[] }
  | { ok: false; error: string };

/** Un peso de holgura en la plata; en cantidades, lo que se pierde a tres decimales. */
const tolPesos = () => 1;
const tolCantidad = (n: number) => 0.0005 + Math.abs(n) * 1e-9;
/** Lo que se pierde a tres decimales no es una diferencia con el Excel. */
const TOLERANCIA = 0.0005;

const NOMBRES_DE_DIA = ['lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado'];
const sinTildes = (s: string) =>
  s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .trim()
    .toLowerCase();

/** RF-46: «miércoles» → el miércoles de esa semana. El domingo y lo que no es un día no cuentan. */
function fechasDe(nombres: readonly string[], semana: string): string[] {
  const posiciones = new Set(nombres.map((d) => NOMBRES_DE_DIA.indexOf(sinTildes(d))).filter((i) => i >= 0));
  return diasDeLaSemana(semana).filter((_, i) => posiciones.has(i));
}

const positivo = (n: number) => (Number.isFinite(n) && n > 0 ? n : null);
const enLineas = (textos: readonly string[]) =>
  textos
    .map((t) => t.trim())
    .filter(Boolean)
    .join('\n');

/**
 * RF-40, RF-41, RF-44 a RF-49, RF-96, RF-97: el borrador que sale de lo que devolvió la IA.
 *
 * De una propuesta se le cree la llave solo si es una de las que se le dieron; si no, «fuera»
 * (RF-41). De un Excel, cada cifra de una actividad tiene que estar en la fila que cita (RF-44): la
 * que no está se descarta y la actividad queda para revisar (RF-45). En los dos casos el reparto
 * por día lo rehace la regla (RF-40, RF-47): del Excel se toman la meta y los días con cantidad
 * (RF-46), nunca sus cantidades diarias, y lo que no cuadraba se avisa con las dos cifras (RF-48).
 * Un festivo al que el Excel le pone cantidad queda marcado: es un día que esa obra trabaja (RF-20).
 *
 * Los renglones de personal, maquinaria, materiales y volquetas pasan como propuestos y ajustables
 * (RF-16): no miden nada ni suman plata, así que no se comprueban contra la fila.
 */
export function planDeLaLectura(leido: PlanLeidoPorLaIa, contexto: ContextoDeLaLectura): ResultadoDelPlanLeido {
  if (leido.actividades.length === 0) {
    return { ok: false, error: 'La IA no encontró ninguna actividad para la semana. Revise el archivo o arme el plan a mano.' };
  }
  const { hojas, semana } = contexto;
  const rechazados: RechazadoPorIa[] = [];

  // RF-96: la propuesta, de lunes a sábado sin festivos. RF-46: el Excel, los días a los que les pone cantidad.
  const diasDelExcel = hojas ? fechasDe(leido.actividades.flatMap((a) => (a.esRubro ? [] : a.diasConCantidad)), semana) : [];
  const dias = diasDelExcel.length > 0 ? diasDelExcel : diasPorDefecto(semana);

  const comprobadas = leido.actividades.map((a) => {
    let revisar = false;
    const que =
      [a.item || a.renglon, a.descripcion]
        .map((t) => t.trim())
        .filter(Boolean)
        .join(' · ') || 'Actividad sin nombre';
    const fila = hojas ? (hojas[a.hoja - 1]?.filas[a.fila - 1] ?? null) : null;
    /** RF-44, RF-45: en un Excel, la cifra vale si está en su fila; en una propuesta no hay fila. */
    const comprobar = (cifra: number, nombre: string, tolerancia: (n: number) => number): number | null => {
      if (!hojas || estaEnLaFila(fila, cifra, tolerancia)) return cifra;
      revisar = true;
      rechazados.push({ hoja: a.hoja, fila: a.fila, que: `${que} · ${nombre}`, motivo: `no encontrado en la fila ${a.fila}` });
      return null;
    };
    /** Lo que el Excel no trae (`0`) no se busca ni se compara. */
    const siLoTrae = (cifra: number, nombre: string) => (positivo(cifra) === null ? null : comprobar(cifra, nombre, tolCantidad));

    const metaSemana = a.esRubro ? null : comprobar(a.metaSemana, 'meta de la semana', tolCantidad);
    const valorRubro = a.esRubro ? comprobar(a.valorRubro, 'valor', tolPesos) : null;
    const metaDiariaDelExcel = hojas && !a.esRubro ? siLoTrae(a.metaDiariaDelExcel, 'meta diaria') : null;
    const totalDelExcel = hojas && !a.esRubro ? siLoTrae(a.totalDelExcel, 'total programado') : null;

    // RF-40, RF-47: el reparto lo da la regla, en los días de la actividad que el plan trabaja.
    const suyos = hojas ? fechasDe(a.diasConCantidad, semana).filter((d) => dias.includes(d)) : [];
    const diasDeLaActividad = suyos.length > 0 ? suyos : dias;
    const renglon = Number(a.renglon.trim());
    const actividad = cruzarActividad(
      {
        frenteDeTrabajo: a.frenteDeTrabajo,
        descripcion: a.descripcion,
        unidad: a.unidad,
        metaSemana,
        cuadrilla: a.cuadrilla,
        equipo: a.equipo,
        cantidades: metaSemana === null ? {} : repartir(metaSemana, diasDeLaActividad),
        // RF-41: en una propuesta manda la llave, y una vacía o inventada no cruza con nada.
        // Un Excel no trae llave: cruza por el renglón (RF-89).
        llave: hojas ? null : a.llave.trim(),
        item: a.item,
        renglon: hojas && Number.isInteger(renglon) && renglon > 0 ? renglon : null,
        esRubro: a.esRubro,
        valorRubro,
      },
      contexto.items,
    );
    return { actividad: revisar ? { ...actividad, revisar: true } : actividad, metaDiariaDelExcel, totalDelExcel, diasDeLaActividad };
  });

  // RF-48: lo que traía el Excel y lo que da la regla, cuando no coinciden.
  const diferencias: DiferenciaConElExcelDelPlan[] = [];
  comprobadas.forEach(({ actividad, metaDiariaDelExcel, totalDelExcel, diasDeLaActividad }, n) => {
    if (actividad.metaSemana === null) return;
    const diaria = metaDiaria(actividad.metaSemana, diasDeLaActividad.length);
    if (metaDiariaDelExcel !== null && diaria !== null && Math.abs(diaria - metaDiariaDelExcel) > TOLERANCIA) {
      diferencias.push({ actividad: n, que: 'meta_diaria', delExcel: metaDiariaDelExcel, calculado: diaria });
    }
    const total = totalProgramado(actividad.cantidades);
    if (totalDelExcel !== null && Math.abs(total - totalDelExcel) > TOLERANCIA) {
      diferencias.push({ actividad: n, que: 'total', delExcel: totalDelExcel, calculado: total });
    }
  });

  const estructura: EstructuraDelPlan = {
    dias,
    actividades: comprobadas.map((c) => c.actividad),
    personal: leido.personal.map((p) => ({
      cargo: p.cargo.trim(),
      porFrente: Object.fromEntries(p.porFrente.filter((f) => positivo(f.cantidad) !== null).map((f) => [f.frente.trim(), f.cantidad])),
    })),
    maquinaria: leido.maquinaria.map((m) => ({
      equipo: m.equipo.trim(),
      cantidad: m.cantidad,
      propia: m.propia,
      frenteDeTrabajo: m.frenteDeTrabajo.trim(),
      vehiculoId: m.vehiculoId.trim() || null,
      referencia: m.referencia.trim(),
    })),
    materiales: leido.materiales.map((m) => ({
      material: m.material.trim(),
      cantidadSemana: positivo(m.cantidadSemana),
      unidad: m.unidad.trim(),
      baseDeCalculo: m.baseDeCalculo.trim(),
    })),
    volquetas: {
      conceptos: leido.volquetas.conceptos.map((c) => ({
        concepto: c.concepto.trim(),
        unidad: c.unidad.trim(),
        cantidadSemana: positivo(c.cantidadSemana),
        viajesSemana: positivo(c.viajesSemana),
      })),
      requeridas: positivo(leido.volquetas.requeridas),
      propias: positivo(leido.volquetas.propias),
      externas: positivo(leido.volquetas.externas),
    },
    supuestos: enLineas(leido.supuestos),
    riesgos: leido.riesgos.map((r) => ({ riesgo: r.riesgo.trim(), efecto: r.efecto.trim(), mitigacion: r.mitigacion.trim() })),
    requerimientos: enLineas(leido.requerimientos),
  };
  return { ok: true, estructura, rechazados, diferencias };
}
