/**
 * Las consultas que la IA del asistente puede pedir (spec 028). **Solo servidor.**
 * **Todas son de solo lectura** (RF-60): ninguna crea, cambia ni anula nada.
 *
 * ── El alcance, dos veces (RF-3 a RF-8) ──
 *
 *  1. A la IA solo se le ofrecen las consultas de los módulos que alcanza quien
 *     pregunta (`herramientasPara`). Al almacenista, la de cantera ni se le nombra.
 *  2. Cada consulta vuelve a comprobar la obra y el periodo (`ejecutarHerramienta`),
 *     porque lo que pide la IA sale de un mensaje que escribió una persona, o de un
 *     archivo: no se le cree (RF-6).
 *
 * Una obra que no se alcanza responde siempre lo mismo, exista o no (RF-8).
 *
 * ── Las cifras son las del módulo (RF-20) ──
 *
 * Cada consulta llama a la misma función que su pantalla: los reportes, a `reporteDe`
 * de Reportes (030); la bitácora, a la lectura de los partes. La IA no suma por su
 * cuenta lo que ya viene sumado (lo dicen sus instrucciones, T9).
 *
 * ── Las fuentes (RF-28 a RF-30) ──
 *
 * Cada resultado trae sus fuentes, con la ruta que abre el registro en su módulo.
 * Además dice qué obras y módulos consultó, que la conversación guarda para RF-49.
 */
import { and, between, eq, inArray, isNotNull, isNull, or, sql } from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';
import * as z from 'zod/v4';

import { baseServidor } from '@/db/servidor/cliente';
import {
  almacenMateriales,
  almacenMovimientos,
  canteraViajes,
  ensayosGranulometria,
  llantas,
  obras,
  partesDeObra,
  preoperacionales,
  presupuestos,
  usuarios,
  vehiculos,
  whatsappExcepciones,
  whatsappGrupos,
  whatsappMensajes,
} from '@/db/servidor/esquema';
import { cantidadDeLaBase, filasDeMateriales, leerMateriales, movimientosDe } from '@/features/almacen-obra/servidor/materiales';
import { condicionDePeriodo, leerViajes } from '@/features/cantera/servidor/viajes';
import { leerContrato } from '@/features/contratos/servidor/contrato';
import { leerEnsayos } from '@/features/laboratorio/servidor/ensayos';
import { detalleDe, listarPresupuestos } from '@/features/presupuestos/servidor/presupuestos';
import { TITULO_DE_PESTANA } from '@/features/reportes/exportar';
import { partesDelPeriodo, vehiculosDeLaObra } from '@/features/reportes/servidor/datos';
import { columnasParaNombrar, conNombreDelVehiculo } from '@/features/servidor/placas';
import { reporteDe, type PestanaDeReporte, type ReporteDe } from '@/features/reportes/servidor/reportes';
import { diaDelMensaje, obraDelMensaje } from '@/features/whatsapp/servidor/obra';
import { ensayosDeLosPartes, type FilaDeCalidadLeida } from '@/shared/rules/ensayos-de-obra';
import {
  faltaDelPeriodo,
  modulosDeAnulados,
  obraAlAlcance,
  resumenDeRegistrados,
  type AlcanceDelAsistente,
  type FuenteDeRespuesta,
  type ModuloConsultable,
} from '@/shared/rules/asistente';
import { diasDe, type TipoDePeriodo } from '@/shared/rules/periodos';

/* ------------------------------------------------------------------------ */
/* El marco                                                                  */
/* ------------------------------------------------------------------------ */

export interface ResultadoDeHerramienta {
  /** Lo que se le devuelve a la IA, como JSON. */
  datos: unknown;
  fuentes: FuenteDeRespuesta[];
  /** Para RF-49: lo que esta consulta leyó. */
  consulto: { obras: string[]; modulos: ModuloConsultable[] };
}

/** Un fallo explicado: la IA lo recibe y se lo dice a la persona. */
export interface FalloDeHerramienta {
  error: string;
}

interface Herramienta<E> {
  nombre: string;
  /**
   * Para la IA: qué trae y cuándo usarla. Una función si depende de lo que alcanza quien
   * pregunta, para no nombrarle lo que no alcanza (RF-83).
   */
  descripcion: string | ((alcance: AlcanceDelAsistente) => string);
  /** El módulo que tiene que alcanzar quien pregunta; `null`, siempre se ofrece. */
  modulo: ModuloConsultable | null;
  /** Si, además del módulo, hace falta algo más para ofrecerla. */
  seOfrece?: (alcance: AlcanceDelAsistente) => boolean;
  entrada: z.ZodType<E>;
  ejecutar(entrada: E, alcance: AlcanceDelAsistente): Promise<ResultadoDeHerramienta | FalloDeHerramienta>;
}

/** Ayuda de tipos: que `ejecutar` reciba la entrada ya validada con su esquema. */
function herramienta<E>(h: Herramienta<E>): Herramienta<E> {
  return h;
}

/** Más que esto no se le pasa a la IA de una vez: se le pide acotar. */
const CARACTERES_MAXIMOS_POR_RESULTADO = 80_000;

export const NO_ESTA_A_SU_ALCANCE = 'Esa información no está a su alcance.';

const FECHA = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'La fecha va como AAAA-MM-DD.');
const OBRA = z.string().describe('El id de la obra (de obras_a_mi_alcance). Si la persona alcanza una sola obra, puede ir vacío.');

/** Los módulos que una obra puede llevar apagados (spec 017 y 018). */
type ModuloDeObra = 'almacen' | 'cantera' | 'laboratorio';

interface ObraConsultada {
  id: string;
  codigo: string;
  nombre: string;
  modulos: Record<ModuloDeObra, boolean>;
}

/**
 * La obra que se consulta (RF-4, RF-15, RF-16): la pedida si se alcanza; si no se pidió
 * y la persona alcanza una sola, esa. Nunca dice si una obra ajena existe (RF-8).
 *
 * Con `modulo`, la obra además tiene que llevarlo encendido (RF-5). A los demás ya los
 * filtra su alcance; esto es para la gerencia, que alcanza todas las obras pero no ve
 * las que tienen el módulo apagado (017/RF-10).
 */
async function obraConsultada(
  alcance: AlcanceDelAsistente,
  pedida: string,
  modulo?: ModuloDeObra,
): Promise<ObraConsultada | FalloDeHerramienta> {
  let id = pedida.trim();
  if (!id) {
    if (alcance.obras === 'todas')
      return {
        error: 'Falta la obra: pregunte a la persona de cuál obra se trata.',
      };
    if (alcance.obras.length === 0)
      return {
        error: 'La persona no tiene obra asignada, así que no tiene información a su alcance.',
      };
    id = alcance.obras[0];
  }
  if (!obraAlAlcance(alcance, id)) return { error: NO_ESTA_A_SU_ALCANCE };
  const [obra] = await baseServidor()
    .select({
      id: obras.id,
      codigo: obras.codigo,
      nombre: obras.nombre,
      almacen: obras.almacenActivo,
      cantera: obras.canteraActivo,
      laboratorio: obras.laboratorioActivo,
    })
    .from(obras)
    .where(eq(obras.id, id))
    .limit(1);
  if (!obra || (modulo && !obra[modulo])) return { error: NO_ESTA_A_SU_ALCANCE };
  return {
    id: obra.id,
    codigo: obra.codigo,
    nombre: obra.nombre,
    modulos: {
      almacen: obra.almacen,
      cantera: obra.cantera,
      laboratorio: obra.laboratorio,
    },
  };
}

/** Un presupuesto de la obra, con su resumen; la obra ya se comprobó. */
async function presupuestoDeLaObra(id: string) {
  const [fila] = await baseServidor().select().from(presupuestos).where(eq(presupuestos.id, id)).limit(1);
  return fila ? detalleDe(fila) : null;
}

/**
 * El reporte de máquinas trae cada día del periodo por máquina: un mes de 26 máquinas son
 * unos 100 000 caracteres, casi todos días sin bitácora, y pasaba del tope (T17). A la IA
 * le van solo los días con bitácora; los totales, los días trabajados y el mantenimiento
 * de cada máquina quedan igual, así que las cifras siguen siendo las del módulo (RF-20).
 */
function sinDiasSinBitacora<R extends { maquinas: { dias: { trabajo: string }[] }[] }>(reporteLeido: R): R {
  return {
    ...reporteLeido,
    maquinas: reporteLeido.maquinas.map((m) => ({ ...m, dias: m.dias.filter((d) => d.trabajo !== 'sin_bitacora') })),
    nota: 'En «dias» solo van los días con bitácora; los demás no tienen registro.',
  };
}

/** El tipo de periodo para la ruta de Reportes: un día, un mes justo o, si no, la semana. */
function tipoParaLaRuta(desde: string, hasta: string): TipoDePeriodo {
  if (desde === hasta) return 'dia';
  const finDeMes = new Date(Date.UTC(Number(hasta.slice(0, 4)), Number(hasta.slice(5, 7)), 0)).getUTCDate();
  if (desde.endsWith('-01') && desde.slice(0, 7) === hasta.slice(0, 7) && Number(hasta.slice(8)) === finDeMes) return 'mes';
  return 'semana';
}

const consulta = (obraId: string, ...modulos: ModuloConsultable[]) => ({
  obras: [obraId],
  modulos,
});

/* ------------------------------------------------------------------------ */
/* Las consultas                                                             */
/* ------------------------------------------------------------------------ */

const obrasAMiAlcance = herramienta({
  nombre: 'obras_a_mi_alcance',
  descripcion:
    'Las obras sobre las que la persona puede preguntar, con su id, código y nombre. Úsela primero cuando la pregunta no dice la obra o para saber su id.',
  modulo: null,
  entrada: z.strictObject({}),
  async ejecutar(_entrada, alcance) {
    if (alcance.obras !== 'todas' && alcance.obras.length === 0) {
      return {
        datos: { obras: [], nota: 'La persona no tiene obra asignada.' },
        fuentes: [],
        consulto: { obras: [], modulos: [] },
      };
    }
    const db = baseServidor();
    const filas = await (alcance.obras === 'todas'
      ? db
          .select({
            id: obras.id,
            codigo: obras.codigo,
            nombre: obras.nombre,
            activa: obras.activa,
          })
          .from(obras)
      : db
          .select({
            id: obras.id,
            codigo: obras.codigo,
            nombre: obras.nombre,
            activa: obras.activa,
          })
          .from(obras)
          .where(inArray(obras.id, alcance.obras)));
    return {
      datos: { obras: filas },
      fuentes: [],
      consulto: { obras: [], modulos: [] },
    };
  },
});

const PESTANAS = [
  'maquinas',
  'mantenimiento',
  'personal',
  'actividades',
  'cantera',
  'calidad',
  'clima',
] as const satisfies readonly PestanaDeReporte[];

const reporte = herramienta({
  nombre: 'reporte',
  descripcion: [
    'Los totales del módulo Reportes de una obra en un periodo, ya calculados como en la pantalla. Úselos tal cual, sin volver a sumar.',
    'maquinas: horas o km por máquina, operador y días que trabajó.',
    'mantenimiento: estado de mantenimiento de cada máquina y sus alertas.',
    'personal: horas por persona (normales y extra) por día.',
    'actividades: cantidades por ítem y capítulo, con lo contratado y el % si hay presupuesto.',
    'cantera: viajes y m³ por material, origen, destino y volqueta.',
    'calidad: ensayos de control de calidad de las bitácoras y si cumplen.',
    'clima: clima y novedades por día.',
    'Periodo de 3 meses como máximo.',
  ].join(' '),
  modulo: 'reportes',
  entrada: z.strictObject({
    obraId: OBRA,
    pestana: z.enum(PESTANAS),
    desde: FECHA,
    hasta: FECHA,
  }),
  async ejecutar({ obraId, pestana, desde, hasta }, alcance) {
    // RF-5: el reporte de cantera es lo de Control Cantera; si la obra no lo lleva, no.
    if (pestana === 'cantera' && !alcance.modulos.includes('cantera')) return { error: NO_ESTA_A_SU_ALCANCE };
    const falta = faltaDelPeriodo(desde, hasta);
    if (falta) return { error: falta };
    const obra = await obraConsultada(alcance, obraId, pestana === 'cantera' ? 'cantera' : undefined);
    if ('error' in obra) return obra;
    const tipo = tipoParaLaRuta(desde, hasta);
    const reporteLeido = await reporteDe(pestana, {
      obraId: obra.id,
      periodo: { tipo, desde, hasta },
      dias: diasDe({ desde, hasta }),
    });
    return {
      datos: pestana === 'maquinas' ? sinDiasSinBitacora(reporteLeido as ReporteDe<'maquinas'>) : reporteLeido,
      fuentes: [
        {
          modulo: 'reportes',
          etiqueta: `Reportes › ${TITULO_DE_PESTANA[pestana]}, ${obra.codigo}, del ${desde} al ${hasta}`,
          fecha: null,
          ruta: `/panel/reportes?${new URLSearchParams({ obra: obra.id, pestana, periodo: tipo, fecha: desde })}`,
        },
      ],
      consulto: consulta(obra.id, 'reportes', ...(pestana === 'cantera' ? (['cantera'] as const) : [])),
    };
  },
});

const bitacoraDelDia = herramienta({
  nombre: 'bitacora_del_dia',
  descripcion:
    'La bitácora (parte diario) de una obra en un día: maquinaria con medidores y operador, personal con horas o novedad, actividades con cantidades, clima, control de calidad, notas y si está abierta o cerrada. Las anuladas no salen.',
  modulo: 'bitacoras',
  entrada: z.strictObject({ obraId: OBRA, fecha: FECHA }),
  async ejecutar({ obraId, fecha }, alcance) {
    const obra = await obraConsultada(alcance, obraId);
    if ('error' in obra) return obra;
    const [parte] = await partesDelPeriodo({
      obraId: obra.id,
      periodo: { tipo: 'dia', desde: fecha, hasta: fecha },
      dias: [fecha],
    });
    const fuente: FuenteDeRespuesta = {
      modulo: 'bitacoras',
      etiqueta: `Bitácora del ${fecha}, ${obra.codigo}`,
      fecha,
      ruta: `/panel/bitacoras?${new URLSearchParams({ obraId: obra.id, fecha })}`,
    };
    if (!parte) {
      return {
        datos: {
          bitacora: null,
          nota: `No hay bitácora vigente de ${obra.codigo} el ${fecha}.`,
        },
        fuentes: [],
        consulto: consulta(obra.id, 'bitacoras'),
      };
    }
    const { horario: _horario, ...sinHorario } = parte;
    return {
      datos: { obra: obra.codigo, bitacora: sinHorario },
      fuentes: [fuente],
      consulto: consulta(obra.id, 'bitacoras'),
    };
  },
});

const viajesDeCantera = herramienta({
  nombre: 'viajes_de_cantera',
  descripcion:
    'Los viajes vigentes de Control Cantera de una obra en un periodo, uno por uno: fecha, hora, vale, volqueta, conductor, material, origen, destino, PR y metros. Para totales por material o volqueta use reporte con pestana cantera.',
  modulo: 'cantera',
  entrada: z.strictObject({ obraId: OBRA, desde: FECHA, hasta: FECHA }),
  async ejecutar({ obraId, desde, hasta }, alcance) {
    const falta = faltaDelPeriodo(desde, hasta);
    if (falta) return { error: falta };
    const obra = await obraConsultada(alcance, obraId, 'cantera');
    if ('error' in obra) return obra;
    const todos = (await leerViajes(condicionDePeriodo(eq(canteraViajes.obraId, obra.id), desde, hasta))).filter((v) => !v.anulado);
    // La volqueta por su placa, como en Reportes (`viajesDelPeriodo`): el listado del
    // módulo la nombra por su código interno, y con dos nombres la IA tenía que adivinar
    // que «PRUEBA-VOL-T17» y «PRT017» eran la misma (T12).
    const ids = [...new Set(todos.map((v) => v.vehiculoId))];
    const placas = new Map(
      ids.length
        ? (await baseServidor().select({ id: vehiculos.id, placa: vehiculos.placa }).from(vehiculos).where(inArray(vehiculos.id, ids))).map(
            (f) => [f.id, f.placa] as const,
          )
        : [],
    );
    const viajes = todos.map((v) => ({
      fecha: v.fecha,
      hora: v.hora,
      vale: v.vale,
      volqueta: placas.get(v.vehiculoId) || v.volqueta,
      conductor: v.conductor,
      material: v.material,
      origen: v.origen,
      destino: v.destinoObra ? 'Obra' : v.destino,
      pr: v.pr,
      metros: v.metros,
      porWhatsapp: v.mensajeWhatsappId !== null,
    }));
    return {
      datos: { obra: obra.codigo, total: viajes.length, viajes },
      fuentes: [
        {
          modulo: 'cantera',
          etiqueta: `Control Cantera, ${obra.codigo}, del ${desde} al ${hasta}`,
          fecha: desde,
          ruta: `/panel/cantera?${new URLSearchParams({ obraId: obra.id, fecha: desde })}`,
        },
      ],
      consulto: consulta(obra.id, 'cantera'),
    };
  },
});

const ensayos = herramienta({
  nombre: 'ensayos',
  descripcion:
    'Los ensayos de una obra en un periodo: las granulometrías del laboratorio (con su estado: enviado, aprobado o devuelto, y si cumplen la franja) y los ensayos de obra que trae el control de calidad de cada bitácora (densidades, compresión, humedad…, con su resultado y si cumple).',
  modulo: 'laboratorio',
  entrada: z.strictObject({ obraId: OBRA, desde: FECHA, hasta: FECHA }),
  async ejecutar({ obraId, desde, hasta }, alcance) {
    const falta = faltaDelPeriodo(desde, hasta);
    if (falta) return { error: falta };
    const obra = await obraConsultada(alcance, obraId, 'laboratorio');
    if ('error' in obra) return obra;
    const g = ensayosGranulometria;
    const [granulometrias, partes] = await Promise.all([
      leerEnsayos(and(eq(g.obraId, obra.id), isNull(g.descartadoEn), isNull(g.anuladoEn), between(g.fechaEjecucion, desde, hasta))),
      baseServidor()
        .select({
          id: partesDeObra.id,
          obraId: partesDeObra.obraId,
          fecha: partesDeObra.fecha,
          cerradoEn: partesDeObra.cerradoEn,
          laboratorio: partesDeObra.laboratorio,
        })
        .from(partesDeObra)
        .where(and(eq(partesDeObra.obraId, obra.id), isNull(partesDeObra.anuladoEn), between(partesDeObra.fecha, desde, hasta))),
    ]);
    const deObra = ensayosDeLosPartes(
      partes.map((p) => ({
        id: p.id,
        obraId: p.obraId,
        fecha: p.fecha,
        cerrada: p.cerradoEn !== null,
        laboratorio: p.laboratorio as unknown as readonly FilaDeCalidadLeida[],
      })),
    );
    return {
      datos: { obra: obra.codigo, granulometrias, ensayosDeObra: deObra },
      fuentes: [
        {
          modulo: 'laboratorio',
          etiqueta: `Laboratorio, ${obra.codigo}, del ${desde} al ${hasta}`,
          fecha: desde,
          ruta: `/panel/laboratorio?${new URLSearchParams({ obraId: obra.id })}`,
        },
      ],
      consulto: consulta(obra.id, 'laboratorio'),
    };
  },
});

const almacen = herramienta({
  nombre: 'almacen',
  descripcion:
    'El almacén de una obra: cada material con su unidad y su stock de hoy, y las entradas y salidas vigentes del periodo pedido.',
  modulo: 'almacen',
  entrada: z.strictObject({ obraId: OBRA, desde: FECHA, hasta: FECHA }),
  async ejecutar({ obraId, desde, hasta }, alcance) {
    const falta = faltaDelPeriodo(desde, hasta);
    if (falta) return { error: falta };
    const obra = await obraConsultada(alcance, obraId, 'almacen');
    if ('error' in obra) return obra;
    const materiales = await leerMateriales(eq(almacenMateriales.obraId, obra.id));
    const movimientos = await movimientosDe(materiales.map((m) => m.id));
    const nombreDe = new Map(materiales.map((m) => [m.id, m.nombre]));
    return {
      datos: {
        obra: obra.codigo,
        materiales: filasDeMateriales(materiales, movimientos).map((m) => ({
          material: m.nombre,
          unidad: m.unidad,
          stock: m.stock,
        })),
        movimientos: movimientos
          .filter((m) => !m.anulado && m.fecha >= desde && m.fecha <= hasta)
          .map((m) => ({
            fecha: m.fecha,
            material: nombreDe.get(m.materialId),
            tipo: m.tipo,
            cantidad: m.cantidad,
          })),
      },
      fuentes: [
        {
          modulo: 'almacen',
          etiqueta: `Almacén, ${obra.codigo}`,
          fecha: null,
          ruta: `/panel/almacen?${new URLSearchParams({ obraId: obra.id })}`,
        },
      ],
      consulto: consulta(obra.id, 'almacen'),
    };
  },
});

const DIA_DEL_PREOPERACIONAL = sql<string>`to_char(${preoperacionales.iniciadoEn} at time zone 'America/Bogota', 'YYYY-MM-DD')`;

const preoperacionalesDelPeriodo = herramienta({
  nombre: 'preoperacionales',
  descripcion:
    'Los preoperacionales vigentes de las máquinas de una obra en un periodo: día, máquina, operador, resultado (apto o no apto), ítems que inmovilizan, medidor y observaciones.',
  modulo: 'preoperacionales',
  entrada: z.strictObject({ obraId: OBRA, desde: FECHA, hasta: FECHA }),
  async ejecutar({ obraId, desde, hasta }, alcance) {
    const falta = faltaDelPeriodo(desde, hasta);
    if (falta) return { error: falta };
    const obra = await obraConsultada(alcance, obraId);
    if ('error' in obra) return obra;
    const p = preoperacionales;
    const filas = await baseServidor()
      .select({
        dia: DIA_DEL_PREOPERACIONAL,
        nombrable: columnasParaNombrar,
        operador: usuarios.nombreCompleto,
        resultado: p.resultado,
        inmovilizantes: p.cantidadInmovilizantes,
        odometroKm: p.odometroKm,
        horometroH: p.horometroH,
        observaciones: p.observaciones,
      })
      .from(p)
      .innerJoin(usuarios, eq(usuarios.id, p.usuarioId))
      .innerJoin(vehiculos, eq(vehiculos.id, p.vehiculoId))
      .where(
        and(
          // El de la obra; uno sin obra, por la obra de su vehículo, como en Reportes.
          or(eq(p.obraId, obra.id), and(isNull(p.obraId), eq(vehiculos.obraId, obra.id))),
          isNull(p.anuladoEn),
          between(DIA_DEL_PREOPERACIONAL, desde, hasta),
        ),
      );
    return {
      datos: {
        obra: obra.codigo,
        total: filas.length,
        // Spec 032, RF-13: la máquina por su placa, o su descripción si no tiene.
        preoperacionales: conNombreDelVehiculo(filas, 'maquina'),
      },
      fuentes: [
        {
          modulo: 'preoperacionales',
          etiqueta: `Preoperacionales, ${obra.codigo}, del ${desde} al ${hasta}`,
          fecha: desde,
          ruta: '/panel/preoperacionales',
        },
      ],
      consulto: consulta(obra.id, 'preoperacionales'),
    };
  },
});

const vehiculosYMedidores = herramienta({
  nombre: 'vehiculos_y_medidores',
  descripcion:
    'Los vehículos y máquinas de una obra: código, placa, tipo, estado, la última lectura del odómetro (km) o del horómetro (h) y las llantas montadas con su desgaste.',
  modulo: 'vehiculos',
  entrada: z.strictObject({ obraId: OBRA }),
  async ejecutar({ obraId }, alcance) {
    const obra = await obraConsultada(alcance, obraId);
    if ('error' in obra) return obra;
    const lista = await vehiculosDeLaObra(obra.id);
    const montadas = lista.length
      ? await baseServidor()
          .select({
            vehiculoId: llantas.vehiculoId,
            posicion: llantas.posicion,
            marca: llantas.marca,
            desgaste: llantas.porcentajeDesgaste,
          })
          .from(llantas)
          .where(
            and(
              inArray(
                llantas.vehiculoId,
                lista.map((v) => v.id),
              ),
              isNull(llantas.retiradaEn),
            ),
          )
      : [];
    return {
      datos: {
        obra: obra.codigo,
        vehiculos: lista.map((v) => ({
          codigo: v.codigo,
          placa: v.placa,
          tipo: v.tipo,
          estado: v.estado,
          medidor: v.claseMedidor === 'odometro' ? 'km' : 'h',
          ultimaLectura: v.lectura,
          llantas: montadas.filter((l) => l.vehiculoId === v.id).map(({ vehiculoId: _v, ...l }) => l),
        })),
      },
      fuentes: [
        {
          modulo: 'vehiculos',
          etiqueta: `Vehículos, ${obra.codigo}`,
          fecha: null,
          ruta: '/panel/vehiculos',
        },
      ],
      consulto: consulta(obra.id, 'vehiculos'),
    };
  },
});

const personasDeLaObra = herramienta({
  nombre: 'personas_de_la_obra',
  descripcion:
    'Las personas registradas en una obra: nombre, cargo, rol en el sistema y si están activas. No trae documentos ni datos de contacto.',
  modulo: 'personas',
  entrada: z.strictObject({ obraId: OBRA }),
  async ejecutar({ obraId }, alcance) {
    const obra = await obraConsultada(alcance, obraId);
    if ('error' in obra) return obra;
    const filas = await baseServidor()
      .select({
        nombre: usuarios.nombreCompleto,
        cargo: usuarios.cargo,
        rol: usuarios.rol,
        activo: usuarios.activo,
      })
      .from(usuarios)
      .where(eq(usuarios.obraId, obra.id));
    return {
      datos: { obra: obra.codigo, personas: filas },
      fuentes: [
        {
          modulo: 'personas',
          etiqueta: `Personas, ${obra.codigo}`,
          fecha: null,
          ruta: '/panel/personas',
        },
      ],
      consulto: consulta(obra.id, 'personas'),
    };
  },
});

const contratoYPresupuesto = herramienta({
  nombre: 'contrato_y_presupuesto',
  descripcion:
    'El contrato de la obra (contratante, número, objeto, valor, fechas, plazo, estado, pólizas) y su presupuesto vigente: valor, AIU, grupos y capítulos con sus subtotales, e ítems con cantidad y valor unitario.',
  modulo: 'contrato',
  entrada: z.strictObject({ obraId: OBRA }),
  async ejecutar({ obraId }, alcance) {
    const obra = await obraConsultada(alcance, obraId);
    if ('error' in obra) return obra;
    const [contrato, versiones] = await Promise.all([leerContrato(obra.id), listarPresupuestos(obra.id)]);
    const vigente = versiones.find((v) => v.estado === 'vigente');
    const detalle = vigente ? await presupuestoDeLaObra(vigente.id) : null;
    return {
      datos: {
        obra: obra.codigo,
        contrato,
        presupuestoVigente: detalle
          ? {
              nombre: detalle.nombre,
              version: detalle.numeroVersion,
              resumen: detalle.resumen,
              items: detalle.estructura.grupos.flatMap((g) =>
                g.capitulos.flatMap((c) =>
                  c.items.map((i) => ({
                    grupo: g.nombre,
                    capitulo: c.nombre,
                    item: i.item,
                    descripcion: i.descripcion,
                    unidad: i.unidadEscrita,
                    cantidad: i.cantidad,
                    valorUnitario: i.valorUnitario,
                    valorTotal: i.valorTotal,
                  })),
                ),
              ),
              rubros: detalle.estructura.rubros.map((r) => ({
                nombre: r.nombre,
                valor: r.valor,
              })),
            }
          : null,
        otrasVersiones: versiones
          .filter((v) => v.estado !== 'vigente')
          .map((v) => ({
            version: v.numeroVersion,
            estado: v.estado,
            valor: v.valor,
          })),
      },
      fuentes: [
        {
          modulo: 'contrato',
          etiqueta: `Contrato y Presupuesto, ${obra.codigo}`,
          fecha: null,
          ruta: `/panel/contrato?${new URLSearchParams({ obra: obra.id })}`,
        },
      ],
      consulto: consulta(obra.id, 'contrato'),
    };
  },
});

const anulador = alias(usuarios, 'anulador');

interface Anulado {
  modulo: ModuloConsultable;
  fecha: string;
  que: string;
  motivo: string | null;
  anuladoPor: string | null;
  anuladoEn: string | null;
}

const anulados = herramienta({
  nombre: 'anulados',
  // RF-83: solo nombra los módulos que la persona alcanza; si no alcanza ninguno, ni se ofrece.
  descripcion: (alcance) =>
    [
      `Los registros anulados de una obra en un periodo, de estos módulos y de ningún otro: ${modulosDeAnulados(alcance.modulos)
        .map((m) => NOMBRE_DEL_MODULO[m])
        .join(', ')}; con su motivo, quién los anuló y cuándo.`,
      'Si la obra tiene apagado alguno, ese no se revisa y viene en noSeRevisan: no lo mencione ni ofrezca sus anulados.',
      'Lo anulado no cuenta en ninguna cifra: muéstrelo aparte y nunca lo sume.',
    ].join(' '),
  modulo: null,
  seOfrece: (alcance) => modulosDeAnulados(alcance.modulos).length > 0,
  entrada: z.strictObject({ obraId: OBRA, desde: FECHA, hasta: FECHA }),
  async ejecutar({ obraId, desde, hasta }, alcance) {
    const falta = faltaDelPeriodo(desde, hasta);
    if (falta) return { error: falta };
    const obra = await obraConsultada(alcance, obraId);
    if ('error' in obra) return obra;
    // Solo lo de los módulos que alcanza, y los de obra solo si la obra los lleva (RF-5).
    const mira = (m: ModuloConsultable) =>
      alcance.modulos.includes(m) && (m === 'almacen' || m === 'cantera' || m === 'laboratorio' ? obra.modulos[m] : true);
    const db = baseServidor();
    const cuando = (d: Date | null) => d?.toISOString() ?? null;
    const lotes: Promise<Anulado[]>[] = [];

    if (mira('bitacoras')) {
      lotes.push(
        db
          .select({
            fecha: partesDeObra.fecha,
            motivo: partesDeObra.motivoAnulacion,
            por: anulador.nombreCompleto,
            en: partesDeObra.anuladoEn,
          })
          .from(partesDeObra)
          .leftJoin(anulador, eq(anulador.id, partesDeObra.anuladoPor))
          .where(and(eq(partesDeObra.obraId, obra.id), isNotNull(partesDeObra.anuladoEn), between(partesDeObra.fecha, desde, hasta)))
          .then((filas) =>
            filas.map((f) => ({
              modulo: 'bitacoras' as const,
              fecha: f.fecha,
              que: `Bitácora del ${f.fecha}`,
              motivo: f.motivo,
              anuladoPor: f.por,
              anuladoEn: cuando(f.en),
            })),
          ),
      );
    }
    if (mira('cantera')) {
      lotes.push(
        leerViajes(condicionDePeriodo(eq(canteraViajes.obraId, obra.id), desde, hasta)).then((viajes) =>
          viajes
            .filter((v) => v.anulado)
            .map((v) => ({
              modulo: 'cantera' as const,
              fecha: v.fecha,
              que: `Viaje de ${v.volqueta} a las ${v.hora}${v.vale ? `, vale ${v.vale}` : ''} (${v.material})`,
              motivo: v.motivoAnulacion,
              anuladoPor: v.anuladoPorNombre,
              anuladoEn: v.anuladoEn,
            })),
        ),
      );
    }
    if (mira('almacen')) {
      lotes.push(
        db
          .select({
            fecha: almacenMovimientos.fecha,
            tipo: almacenMovimientos.tipo,
            cantidad: almacenMovimientos.cantidad,
            material: almacenMateriales.nombre,
            motivo: almacenMovimientos.motivoAnulacion,
            por: anulador.nombreCompleto,
            en: almacenMovimientos.anuladoEn,
          })
          .from(almacenMovimientos)
          .innerJoin(almacenMateriales, eq(almacenMateriales.id, almacenMovimientos.materialId))
          .leftJoin(anulador, eq(anulador.id, almacenMovimientos.anuladoPor))
          .where(
            and(
              eq(almacenMateriales.obraId, obra.id),
              isNotNull(almacenMovimientos.anuladoEn),
              between(almacenMovimientos.fecha, desde, hasta),
            ),
          )
          .then((filas) =>
            filas.map((f) => ({
              modulo: 'almacen' as const,
              fecha: f.fecha,
              que: `${f.tipo === 'ingreso' ? 'Ingreso' : 'Salida'} de ${cantidadDeLaBase(f.cantidad)} de ${f.material}`,
              motivo: f.motivo,
              anuladoPor: f.por,
              anuladoEn: cuando(f.en),
            })),
          ),
      );
    }
    if (mira('preoperacionales')) {
      const p = preoperacionales;
      lotes.push(
        db
          .select({
            dia: DIA_DEL_PREOPERACIONAL,
            nombrable: columnasParaNombrar,
            motivo: p.motivoAnulacion,
            por: anulador.nombreCompleto,
            en: p.anuladoEn,
          })
          .from(p)
          .innerJoin(vehiculos, eq(vehiculos.id, p.vehiculoId))
          .leftJoin(anulador, eq(anulador.id, p.anuladoPor))
          .where(
            and(
              or(eq(p.obraId, obra.id), and(isNull(p.obraId), eq(vehiculos.obraId, obra.id))),
              isNotNull(p.anuladoEn),
              between(DIA_DEL_PREOPERACIONAL, desde, hasta),
            ),
          )
          .then((filas) =>
            conNombreDelVehiculo(filas, 'maquina').map((f) => ({
              modulo: 'preoperacionales' as const,
              fecha: f.dia,
              que: `Preoperacional de ${f.maquina}`,
              motivo: f.motivo,
              anuladoPor: f.por,
              anuladoEn: cuando(f.en),
            })),
          ),
      );
    }
    if (mira('laboratorio')) {
      const g = ensayosGranulometria;
      lotes.push(
        db
          .select({
            fecha: g.fechaEjecucion,
            informe: g.numeroInforme,
            motivo: g.motivoAnulacion,
            por: anulador.nombreCompleto,
            en: g.anuladoEn,
          })
          .from(g)
          .leftJoin(anulador, eq(anulador.id, g.anuladoPor))
          .where(and(eq(g.obraId, obra.id), isNotNull(g.anuladoEn), between(g.fechaEjecucion, desde, hasta)))
          .then((filas) =>
            filas.map((f) => ({
              modulo: 'laboratorio' as const,
              fecha: f.fecha ?? '',
              que: `Granulometría ${f.informe ?? 'sin número'}`,
              motivo: f.motivo,
              anuladoPor: f.por,
              anuladoEn: cuando(f.en),
            })),
          ),
      );
    }

    const lista = (await Promise.all(lotes)).flat().sort((a, b) => a.fecha.localeCompare(b.fecha));
    const alcanzables = modulosDeAnulados(alcance.modulos);
    const modulos = alcanzables.filter(mira);
    // RF-83: los que la persona alcanza pero esta obra tiene apagados (pasa con la gerencia).
    const noSeRevisan = alcanzables.filter((m) => !mira(m)).map((m) => `${NOMBRE_DEL_MODULO[m]} (apagado en esta obra)`);
    return {
      datos: {
        obra: obra.codigo,
        total: lista.length,
        anulados: lista,
        ...(noSeRevisan.length ? { noSeRevisan } : {}),
        nota: 'Ninguno de estos registros cuenta en las cifras.',
      },
      fuentes: lista.length
        ? [...new Set(lista.map((a) => a.modulo))].map((m) => ({
            modulo: m,
            etiqueta: `Anulados en ${NOMBRE_DEL_MODULO[m]}, ${obra.codigo}, del ${desde} al ${hasta}`,
            fecha: desde,
            ruta: RUTA_DEL_MODULO[m](obra.id, desde),
          }))
        : [],
      consulto: { obras: [obra.id], modulos },
    };
  },
});

const NOMBRE_DEL_MODULO: Record<ModuloConsultable, string> = {
  bitacoras: 'Bitácoras',
  preoperacionales: 'Preoperacionales',
  almacen: 'Almacén',
  cantera: 'Control Cantera',
  laboratorio: 'Laboratorio',
  whatsapp: 'Reportes de WhatsApp',
  reportes: 'Reportes',
  contrato: 'Contrato y Presupuesto',
  vehiculos: 'Vehículos',
  personas: 'Personas',
};

const RUTA_DEL_MODULO: Record<ModuloConsultable, (obraId: string, fecha: string) => string> = {
  bitacoras: (obraId, fecha) => `/panel/bitacoras?${new URLSearchParams({ obraId, fecha })}`,
  preoperacionales: () => '/panel/preoperacionales',
  almacen: (obraId) => `/panel/almacen?${new URLSearchParams({ obraId })}`,
  cantera: (obraId, fecha) => `/panel/cantera?${new URLSearchParams({ obraId, fecha })}`,
  laboratorio: (obraId) => `/panel/laboratorio?${new URLSearchParams({ obraId })}`,
  whatsapp: (_obraId, fecha) => `/panel/whatsapp?${new URLSearchParams({ desde: fecha })}`,
  reportes: (obra, fecha) => `/panel/reportes?${new URLSearchParams({ obra, fecha })}`,
  contrato: (obra) => `/panel/contrato?${new URLSearchParams({ obra })}`,
  vehiculos: () => '/panel/vehiculos',
  personas: () => '/panel/personas',
};

/** Lo que se le pasa a la IA de cada mensaje: suficiente para leerlo, no el reporte entero. */
const CARACTERES_POR_MENSAJE = 1_500;

const ESTADOS_REGISTRADOS = new Set(['guardado', 'aprobado']);

const mensajesDeWhatsapp = herramienta({
  nombre: 'mensajes_de_whatsapp',
  descripcion: [
    'Lo que llegó por WhatsApp de una obra en un periodo: cada mensaje con quién lo mandó, cuándo, su texto, y si quedó registrado en un módulo o no;',
    'y lo que «No se pudo guardar» (sección, motivo y el renglón como llegó).',
    'Todo lo que no quedó registrado márquelo como «reportado por WhatsApp, sin registrar» y nunca lo sume a las cifras (RF-35, RF-36).',
    'Úsela para comparar lo reportado con lo registrado, señalando cada diferencia con la fecha del mensaje y la del registro.',
    'Con comparar en false (lo normal), de lo registrado trae solo cuántos mensajes hubo por día y por tipo, y el detalle solo de lo no registrado;',
    'ponga comparar en true solo si piden comparar lo reportado con lo registrado.',
  ].join(' '),
  modulo: 'whatsapp',
  entrada: z.strictObject({
    obraId: OBRA,
    desde: FECHA,
    hasta: FECHA,
    comparar: z.boolean().describe('true solo si piden comparar lo reportado por WhatsApp con lo registrado.'),
  }),
  async ejecutar({ obraId, desde, hasta, comparar }, alcance) {
    const falta = faltaDelPeriodo(desde, hasta);
    if (falta) return { error: falta };
    const obra = await obraConsultada(alcance, obraId);
    if ('error' in obra) return obra;
    const m = whatsappMensajes;
    const filas = await baseServidor()
      .select({
        id: m.id,
        dia: diaDelMensaje,
        enviadoEn: m.enviadoEn,
        autor: m.autorNombre,
        tipo: m.tipo,
        categoria: m.categoria,
        texto: m.texto,
        estado: m.estado,
        motivoDescarte: m.motivoDescarte,
      })
      .from(m)
      .innerJoin(whatsappGrupos, eq(whatsappGrupos.id, m.grupoId))
      .where(and(eq(obraDelMensaje, obra.id), between(diaDelMensaje, desde, hasta)));
    const ids = filas.map((f) => f.id);
    const excepciones = ids.length
      ? await baseServidor()
          .select({
            mensajeId: whatsappExcepciones.mensajeId,
            seccion: whatsappExcepciones.seccion,
            motivo: whatsappExcepciones.motivo,
            datos: whatsappExcepciones.datos,
          })
          .from(whatsappExcepciones)
          .where(and(inArray(whatsappExcepciones.mensajeId, ids), isNull(whatsappExcepciones.resueltaEn)))
      : [];
    const diaDe = new Map(filas.map((f) => [f.id, f.dia]));
    const detalle = (f: (typeof filas)[number]) => ({
      dia: f.dia,
      enviadoEn: f.enviadoEn.toISOString(),
      autor: f.autor,
      tipo: f.tipo,
      categoria: f.categoria,
      texto: f.texto && f.texto.length > CARACTERES_POR_MENSAJE ? `${f.texto.slice(0, CARACTERES_POR_MENSAJE)}…` : f.texto,
      estado: f.estado,
      registrado: ESTADOS_REGISTRADOS.has(f.estado),
      marca: ESTADOS_REGISTRADOS.has(f.estado) ? 'registrado en su módulo' : 'reportado por WhatsApp, sin registrar',
      motivoDescarte: f.motivoDescarte,
    });
    const fuentes = [
      {
        modulo: 'whatsapp' as const,
        etiqueta: `Reportes de WhatsApp, ${obra.codigo}, del ${desde} al ${hasta}`,
        fecha: desde,
        ruta: `/panel/whatsapp?${new URLSearchParams({ desde, hasta })}`,
      },
    ];
    if (comparar) {
      return {
        datos: {
          obra: obra.codigo,
          mensajes: filas.map(detalle),
          noSePudoGuardar: excepciones.map((e) => ({
            dia: diaDe.get(e.mensajeId),
            seccion: e.seccion,
            motivo: e.motivo,
            renglon: e.datos,
            marca: 'reportado por WhatsApp, sin registrar',
          })),
        },
        fuentes,
        consulto: consulta(obra.id, 'whatsapp'),
      };
    }
    // RF-84: sin comparar, lo registrado va contado, y lo de «No se pudo guardar» agrupado
    // por mensaje, sección y motivo, con cada renglón en corto.
    const grupos = new Map<string, { dia: string | undefined; seccion: string; motivo: string; renglones: string[] }>();
    for (const e of excepciones) {
      const clave = `${e.mensajeId}|${e.seccion}|${e.motivo}`;
      const grupo = grupos.get(clave) ?? { dia: diaDe.get(e.mensajeId), seccion: e.seccion, motivo: e.motivo, renglones: [] };
      grupo.renglones.push(renglonCorto(e.datos));
      grupos.set(clave, grupo);
    }
    return {
      datos: {
        obra: obra.codigo,
        registrados: resumenDeRegistrados(filas.filter((f) => ESTADOS_REGISTRADOS.has(f.estado))),
        sinRegistrar: filas.filter((f) => !ESTADOS_REGISTRADOS.has(f.estado)).map(detalle),
        noSePudoGuardar: [...grupos.values()].sort((a, b) => (a.dia ?? '').localeCompare(b.dia ?? '')),
        marca: 'Todo lo de sinRegistrar y noSePudoGuardar es «reportado por WhatsApp, sin registrar».',
      },
      fuentes,
      consulto: consulta(obra.id, 'whatsapp'),
    };
  },
});

const CARACTERES_POR_RENGLON = 300;

/**
 * Un renglón de «No se pudo guardar» en corto: «clave: valor; …», sin los campos vacíos ni
 * los ids internos, que a la IA no le dicen nada.
 */
function renglonCorto(datos: unknown): string {
  const texto =
    datos && typeof datos === 'object'
      ? Object.entries(datos)
          .filter(([clave, v]) => v !== null && v !== '' && typeof v !== 'object' && clave !== 'id' && !clave.endsWith('Id'))
          .map(([clave, v]) => `${clave}: ${String(v)}`)
          .join('; ')
      : String(datos);
  return texto.length > CARACTERES_POR_RENGLON ? `${texto.slice(0, CARACTERES_POR_RENGLON)}…` : texto;
}

/* ------------------------------------------------------------------------ */
/* Las que se ofrecen y su ejecución                                         */
/* ------------------------------------------------------------------------ */

// `unknown` en la lista: cada una valida su propia entrada antes de ejecutar.
const TODAS: Herramienta<never>[] = [
  obrasAMiAlcance,
  reporte,
  bitacoraDelDia,
  viajesDeCantera,
  ensayos,
  almacen,
  preoperacionalesDelPeriodo,
  vehiculosYMedidores,
  personasDeLaObra,
  contratoYPresupuesto,
  anulados,
  mensajesDeWhatsapp,
] as unknown as Herramienta<never>[];

const seOfreceA = (h: Herramienta<never>, alcance: AlcanceDelAsistente) =>
  (h.modulo === null || alcance.modulos.includes(h.modulo)) && (h.seOfrece?.(alcance) ?? true);

/** RF-3: las que se le ofrecen a la IA para quien pregunta. */
export function herramientasPara(alcance: AlcanceDelAsistente) {
  if (!alcance.usa) return [];
  return TODAS.filter((h) => seOfreceA(h, alcance)).map((h) => {
    // `$schema` sobra para la API: la entrada de una herramienta es un objeto JSON Schema simple.
    const { $schema: _version, ...esquema } = z.toJSONSchema(h.entrada) as Record<string, unknown>;
    return { nombre: h.nombre, descripcion: typeof h.descripcion === 'string' ? h.descripcion : h.descripcion(alcance), esquema };
  });
}

/**
 * Ejecuta una consulta pedida por la IA. Vuelve a comprobar que se ofrece a quien
 * pregunta (RF-6), valida la entrada y no deja pasar un resultado enorme.
 */
export async function ejecutarHerramienta(
  nombre: string,
  entrada: unknown,
  alcance: AlcanceDelAsistente,
): Promise<ResultadoDeHerramienta | FalloDeHerramienta> {
  const h = TODAS.find((x) => x.nombre === nombre);
  if (!h || !alcance.usa || !seOfreceA(h, alcance)) return { error: NO_ESTA_A_SU_ALCANCE };
  const validada = (h.entrada as z.ZodType).safeParse(entrada);
  if (!validada.success) return { error: `La consulta ${nombre} vino mal formada: ${z.prettifyError(validada.error)}` };
  const resultado = await (h as Herramienta<unknown>).ejecutar(validada.data, alcance);
  if ('error' in resultado) return resultado;
  if (JSON.stringify(resultado.datos).length > CARACTERES_MAXIMOS_POR_RESULTADO) {
    return {
      error: 'El resultado es demasiado grande. Pida un periodo más corto o algo más concreto (una máquina, una persona, una semana).',
    };
  }
  return { ...resultado, fuentes: await conObraYPeriodo(resultado, validada.data as PeriodoPedido) };
}

interface PeriodoPedido {
  desde?: string;
  hasta?: string;
  fecha?: string;
}

/**
 * RF-25, RF-27: cada fuente lleva la obra y el periodo que se consultaron, para que el PDF
 * los diga tal como fueron, sin volver a consultar.
 */
async function conObraYPeriodo(resultado: ResultadoDeHerramienta, pedido: PeriodoPedido): Promise<FuenteDeRespuesta[]> {
  const desde = pedido.desde ?? pedido.fecha;
  const hasta = pedido.hasta ?? pedido.fecha;
  const [obraId] = resultado.consulto.obras;
  const [obra] = obraId
    ? await baseServidor().select({ codigo: obras.codigo, nombre: obras.nombre }).from(obras).where(eq(obras.id, obraId)).limit(1)
    : [];
  return resultado.fuentes.map((f) => ({
    ...f,
    ...(obra ? { obra: `${obra.codigo} · ${obra.nombre}` } : {}),
    ...(desde && hasta ? { desde, hasta } : {}),
  }));
}
