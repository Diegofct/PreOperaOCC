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
  bitacorasEmpresa,
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
import {
  bandejaDelGrupo,
  lugarDeLaSolicitud,
  solicitudAlAlcance,
  solicitudDe,
  solicitudesDelLugar,
  type LugarDeLaSolicitud,
} from '@/features/compras/servidor/solicitudes';
import { leerContrato } from '@/features/contratos/servidor/contrato';
import { duenoDelPedido, documentosDelLugar } from '@/features/documentos/servidor/documentos';
import { consolidadoDelGrupo, cortesDe } from '@/features/empresas/servidor/cortes';
import { laboratorioDeLasObras } from '@/features/empresas/servidor/laboratorio';
import { leerEnsayos } from '@/features/laboratorio/servidor/ensayos';
import { informeParaLaPersona } from '@/features/planificacion/servidor/cumplimiento';
import { detalleDe, listarPresupuestos } from '@/features/presupuestos/servidor/presupuestos';
import { TITULO_DE_PESTANA } from '@/features/reportes/exportar';
import { partesDelPeriodo, vehiculosDeLaObra } from '@/features/reportes/servidor/datos';
import type { PersonaEnSesion } from '@/features/servidor/guardia';

import { generarArchivo, guardarConsulta, type TurnoDelAsistente } from './archivos/generar';
import { columnasParaNombrar, conNombreDelVehiculo } from '@/features/servidor/placas';
import { reporteDe, type PestanaDeReporte, type ReporteDe } from '@/features/reportes/servidor/reportes';
import { fichaDe } from '@/features/rrhh/servidor/fichas';
import { personalDelLugar } from '@/features/rrhh/servidor/personal';
import { bandejaDeTesoreria } from '@/features/tesoreria/servidor/pagos';
import {
  solicitudDePagoAlAlcance,
  solicitudDePagoDe,
  solicitudesDePagoDelLugar,
} from '@/features/tesoreria/servidor/solicitudes-pago';
import { diaDelMensaje, obraDelMensaje } from '@/features/whatsapp/servidor/obra';
import { IDS_DE_ESTADOS_DE_SOLICITUD, pasaLosFiltros } from '@/shared/rules/compras';
import { nombreDeCargo } from '@/shared/catalogos/cargos';
import { alcanzaLaEmpresa, alcanzaLaObraDeLaRuta, nombreDeEmpresa, rutaDeEmpresa, rutaDeObra, type EmpresaId } from '@/shared/rules/empresas';
import { normalizar } from '@/shared/rules/texto';
import { ensayosDeLosPartes, type FilaDeCalidadLeida } from '@/shared/rules/ensayos-de-obra';
import {
  aclaracionDe,
  faltaDelPeriodo,
  modulosDeAnulados,
  obraAlAlcance,
  resumenDeRegistrados,
  type AclaracionDelAsistente,
  type AlcanceDelAsistente,
  type FuenteDeRespuesta,
  type ModuloConsultable,
  type ModuloDeObraConsultable,
} from '@/shared/rules/asistente';
import { IDS_DE_ESTADOS_DE_PAGO, pasaLosFiltrosDePago } from '@/shared/rules/pagos';
import { diasDe, type TipoDePeriodo } from '@/shared/rules/periodos';
import { alcanza } from '@/shared/rules/permisos';
import { MENSAJES_DE_RANGO, rangoDeFechas } from '@/shared/rules/rango';
import { fechaDeJornada } from '@/shared/rules/jornada';

/* ------------------------------------------------------------------------ */
/* El marco                                                                  */
/* ------------------------------------------------------------------------ */

export interface ResultadoDeHerramienta {
  /** Lo que se le devuelve a la IA, como JSON. */
  datos: unknown;
  fuentes: FuenteDeRespuesta[];
  /** Para RF-49: lo que esta consulta leyó. Las empresas, desde la spec 040. */
  consulto: { obras: string[]; modulos: ModuloConsultable[]; empresas?: EmpresaId[] };
  /** Spec 040, RF-27: la aclaración lista para mostrar; con ella se cierra el turno. */
  aclaracion?: AclaracionDelAsistente;
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
  /**
   * `false`: se le ofrece a la IA sin el modo estricto. La API compila una gramática con todas
   * las consultas estrictas y rechaza la petición si pasa de su tamaño («The compiled grammar is
   * too large»). Visto en la T16: la gerencia, con 19 estrictas, fallaba en toda pregunta desde
   * la T13, y con 18 pasa. Solo para consultas cuya entrada el servidor ya valida entera (zod y
   * su regla). Una consulta nueva para la gerencia vuelve a acercarse al tope.
   */
  estricta?: false;
  entrada: z.ZodType<E>;
  /**
   * `sesion` es quien pregunta (spec 040): las consultas de lo administrativo llaman a la misma
   * función que su pantalla, que filtra por la sesión. Así el filtro de lugar está en un sitio.
   */
  ejecutar(
    entrada: E,
    alcance: AlcanceDelAsistente,
    sesion: PersonaEnSesion,
    turno: TurnoDelAsistente,
  ): Promise<ResultadoDeHerramienta | FalloDeHerramienta>;
}

/** Ayuda de tipos: que `ejecutar` reciba la entrada ya validada con su esquema. */
function herramienta<E>(h: Herramienta<E>): Herramienta<E> {
  return h;
}

/** Más que esto no se le pasa a la IA de una vez: se le pide acotar. */
const CARACTERES_MAXIMOS_POR_RESULTADO = 80_000;

export const NO_ESTA_A_SU_ALCANCE = 'Esa información no está a su alcance.';

const FECHA = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'La fecha va como AAAA-MM-DD.');
/**
 * Spec 040: lo que no aplica va **vacío**, no omitido ni en `null`. El modo estricto de la API
 * admite, sumando todas las consultas, 24 parámetros opcionales y 16 que acepten `null`; la
 * gerencia, que las recibe todas, pasaba de los dos límites y su petición se rechazaba (visto
 * en la T10). Las consultas de antes ya seguían esta convención (`OBRA` puede ir vacía).
 */
const FECHA_O_VACIA = z.string().regex(/^(\d{4}-\d{2}-\d{2})?$/, 'La fecha va como AAAA-MM-DD, o vacía si no aplica.');
const TEXTO_O_VACIO = (para: string) => z.string().describe(`${para} Vacío si no aplica.`);
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
          ruta: `${rutaDeObra(obra.id, 'reportes')}?${new URLSearchParams({ pestana, periodo: tipo, fecha: desde })}`,
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
      ruta: `${rutaDeObra(obra.id, 'bitacoras')}?${new URLSearchParams({ fecha })}`,
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
    return {
      datos: { obra: obra.codigo, bitacora: parte },
      fuentes: [fuente],
      consulto: consulta(obra.id, 'bitacoras'),
    };
  },
});

/**
 * La Bitácora de una empresa (spec 038, RF-31; spec 040, RF-13, RF-15). Hasta la 040 era
 * `bitacora_de_occ`; ahora también la de Geolab, con los permisos de su pantalla:
 *
 *  · OCC: la bitácora de mantenimiento de un día, que OCC arma desde su grupo de WhatsApp.
 *  · Geolab: no tiene bitácora propia (038/RF-27, RF-28). Su «Bitácora» en el panel es el
 *    laboratorio de las bitácoras de todas las obras, y se lee con la misma función que esa
 *    pantalla (`laboratorioDeLasObras`), con la sesión de quien pregunta.
 *
 * A quien alcanza una sola, la otra ni se le nombra (RF-83).
 */
const NOMBRE_DE_LA_BITACORA: Record<'occ' | 'geolab', string> = {
  occ: 'OCC: la bitácora de mantenimiento de un día (pide `fecha`): qué equipos quedaron operativos o inoperativos y por qué, con sus varadas y arreglos en el día; los trabajos de mantenimiento (daños, reparaciones, preventivos, llantas, repuestos, suministros); las actividades del personal de mantenimiento; los pendientes; y si está cerrada. Las anuladas no salen.',
  geolab: 'Geolab: el laboratorio de las bitácoras de todas las obras entre dos fechas (`desde` y `hasta`; sin ellas, los últimos 30 días), y opcionalmente de una obra (`obra`): cada ensayo con su obra, su día y lo que dice la bitácora. Las bitácoras anuladas no salen.',
};

const bitacoraDeEmpresa = herramienta({
  nombre: 'bitacora_de_empresa',
  descripcion: (alcance) =>
    'La Bitácora de una empresa (no es de una obra). ' +
    alcance.bitacorasDeEmpresa
      .filter((e): e is 'occ' | 'geolab' => e === 'occ' || e === 'geolab')
      .map((e) => NOMBRE_DE_LA_BITACORA[e])
      .join(' '),
  modulo: 'bitacora_empresa',
  seOfrece: (alcance) => alcance.bitacorasDeEmpresa.length > 0,
  entrada: z.strictObject({
    empresa: z.enum(['occ', 'geolab']),
    fecha: FECHA_O_VACIA.describe('Para OCC: el día. Vacía para Geolab.'),
    desde: FECHA_O_VACIA.describe('Para Geolab: desde qué día. Vacía para OCC o para los últimos 30 días.'),
    hasta: FECHA_O_VACIA.describe('Para Geolab: hasta qué día. Vacía para OCC o para los últimos 30 días.'),
    obra: TEXTO_O_VACIO('Para Geolab: el id de una obra, si se pregunta por una sola.'),
  }),
  async ejecutar({ empresa, fecha, desde, hasta, obra }, alcance, sesion) {
    if (!alcance.bitacorasDeEmpresa.includes(empresa)) return { error: NO_ESTA_A_SU_ALCANCE };
    if (empresa === 'geolab') return laboratorioDeGeolab({ desde: desde || null, hasta: hasta || null, obra: obra || null }, sesion);
    if (!fecha) return { error: 'Para la Bitácora de OCC diga el día (fecha).' };
    return bitacoraDeOccDelDia(fecha);
  },
});

/** La Bitácora de OCC de un día (spec 038). */
async function bitacoraDeOccDelDia(fecha: string): Promise<ResultadoDeHerramienta> {
  const [dia] = await baseServidor()
    .select({
      estadoEquipos: bitacorasEmpresa.estadoEquipos,
      trabajos: bitacorasEmpresa.trabajos,
      actividades: bitacorasEmpresa.actividades,
      pendientes: bitacorasEmpresa.pendientes,
      cerradoEn: bitacorasEmpresa.cerradoEn,
      fechaDudosa: bitacorasEmpresa.fechaDudosa,
    })
    .from(bitacorasEmpresa)
    .where(and(eq(bitacorasEmpresa.empresaId, 'occ'), eq(bitacorasEmpresa.fecha, fecha), isNull(bitacorasEmpresa.anuladoEn)))
    .limit(1);
  const consulto = { obras: [], modulos: ['bitacora_empresa' as const], empresas: ['occ' as const] };
  if (!dia) return { datos: { bitacora: null, nota: `No hay bitácora de OCC vigente el ${fecha}.` }, fuentes: [], consulto };

  const ligados = [
    ...new Set(
      [...dia.estadoEquipos, ...dia.trabajos, ...dia.actividades.map((a) => a.equipo), ...dia.pendientes.map((p) => p.equipo)]
        .map((e) => e?.vehiculoId)
        .filter((id): id is string => !!id),
    ),
  ];
  const nombres = new Map(
    ligados.length > 0
      ? conNombreDelVehiculo(
          await baseServidor()
            .select({ id: vehiculos.id, nombrable: columnasParaNombrar })
            .from(vehiculos)
            .where(inArray(vehiculos.id, ligados)),
          'nombre',
        ).map((v) => [v.id, v.nombre])
      : [],
  );
  const equipo = (e: { vehiculoId: string | null; escrito: string; posiblePlaca: { placa: string } | null } | null) =>
    !e
      ? null
      : e.vehiculoId
        ? (nombres.get(e.vehiculoId) ?? e.escrito)
        : e.posiblePlaca
          ? `${e.escrito} (posiblemente ${e.posiblePlaca.placa})`
          : e.escrito;

  return {
    datos: {
      fecha,
      cerrada: dia.cerradoEn !== null,
      fechaDudosa: dia.fechaDudosa,
      estadoDeLosEquipos: dia.estadoEquipos.map((r) => ({
        equipo: equipo(r),
        segunLaLista: r.estado,
        motivo: r.motivo,
        cambiosDelDia: r.cambios.map((c) => ({ hora: c.hora, estado: c.estado, texto: c.texto })),
      })),
      trabajos: dia.trabajos.map((t) => ({ equipo: equipo(t), tipo: t.tipo, descripcion: t.descripcion, hora: t.hora, reportadoPor: t.reportadoPor })),
      actividades: dia.actividades.map((a) => ({ persona: a.persona, descripcion: a.descripcion, equipo: equipo(a.equipo) })),
      pendientes: dia.pendientes.map((p) => ({ texto: p.texto, equipo: equipo(p.equipo) })),
    },
    fuentes: [
      {
        modulo: 'bitacora_empresa',
        etiqueta: `Bitácora de OCC del ${fecha}`,
        fecha,
        ruta: `${rutaDeEmpresa('occ', 'bitacora')}?${new URLSearchParams({ fecha })}`,
      },
    ],
    consulto,
  };
}

/** La Bitácora de Geolab: el laboratorio de las obras, como su pantalla (038/RF-27). */
async function laboratorioDeGeolab(
  pedido: { desde: string | null; hasta: string | null; obra: string | null },
  sesion: PersonaEnSesion,
): Promise<ResultadoDeHerramienta | FalloDeHerramienta> {
  if (pedido.desde && pedido.hasta) {
    const falta = faltaDelPeriodo(pedido.desde, pedido.hasta);
    if (falta) return { error: falta };
  }
  const ensayos = await laboratorioDeLasObras(sesion, 'geolab', {
    obraId: pedido.obra || null,
    desde: pedido.desde ?? null,
    hasta: pedido.hasta ?? null,
  });
  if (ensayos instanceof Response) return { error: NO_ESTA_A_SU_ALCANCE };
  const parametros = new URLSearchParams({ ...(pedido.desde ? { desde: pedido.desde } : {}), ...(pedido.hasta ? { hasta: pedido.hasta } : {}) });
  return {
    datos: { total: ensayos.length, ensayos },
    fuentes: [
      {
        modulo: 'bitacora_empresa',
        etiqueta: 'Bitácora de Geolab (el laboratorio de las obras)',
        fecha: pedido.desde ?? null,
        ruta: `${rutaDeEmpresa('geolab', 'bitacora')}${parametros.size ? `?${parametros}` : ''}`,
      },
    ],
    // Las obras de los ensayos no se guardan como consultadas: la pantalla de Geolab las muestra
    // todas al laboratorista, y guardarlas le escondería la conversación (RF-49).
    consulto: { obras: [], modulos: ['bitacora_empresa'], empresas: ['geolab'] },
  };
}

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
          ruta: `${rutaDeObra(obra.id, 'cantera')}?${new URLSearchParams({ fecha: desde })}`,
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
          ruta: rutaDeObra(obra.id, 'calidad'),
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
          ruta: rutaDeObra(obra.id, 'almacen'),
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
          ruta: rutaDeObra(obra.id, 'preoperacionales'),
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
          ruta: rutaDeEmpresa('occ', 'vehiculos'),
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
          ruta: rutaDeObra(obra.id, 'recursos-humanos'),
        },
      ],
      consulto: consulta(obra.id, 'personas'),
    };
  },
});

/**
 * Spec 043, RF-94 a RF-96: el informe de cumplimiento de una semana o un mes, el mismo de la
 * pantalla y las descargas (`informeParaLaPersona`). Al Residente le llega ya sin plata: no es la
 * IA la que la calla, es que no la recibe (RF-89). No estricta: la gerencia ya está en el tope de
 * la gramática (ver `estricta`), y la entrada la valida entera su esquema.
 */
const cumplimientoDeObra = herramienta({
  nombre: 'cumplimiento_de_obra',
  descripcion:
    'Cómo va la obra frente a su planificación aprobada en una semana (de lunes a domingo) o un mes: por ítem, la meta, lo ejecutado, el % cumplido y lo pendiente, más lo ejecutado fuera de la planificación y los avisos (partes abiertos, días sin parte, días sin planificación). Si trae «totales», también los valores programado, ejecutado y a cobrar, el faltó o sobró y el margen; en el mes, además los indirectos y el resultado. Los rubros van aparte, como programado: no son parte de los indirectos ni entran al margen. Si no los trae, la persona no ve plata: no la mencione ni la estime. La meta de la semana es «estimada» cuando sale de repartir el mes. Si la persona alcanza todas las obras y no dice cuál, pregúntele la obra antes de consultar.',
  modulo: 'cumplimiento',
  estricta: false,
  entrada: z.strictObject({
    obraId: OBRA,
    tipo: z.enum(['semana', 'mes']).describe('semana: la de lunes a domingo que contiene la fecha; mes: el del calendario.'),
    fecha: FECHA.describe('Un día del periodo, AAAA-MM-DD.'),
  }),
  async ejecutar({ obraId, tipo, fecha }, alcance, sesion) {
    const obra = await obraConsultada(alcance, obraId);
    if ('error' in obra) return obra;
    const informe = await informeParaLaPersona(sesion, obra.id, tipo, fecha);
    const que = tipo === 'semana' ? `semana del ${informe.periodo.desde} al ${informe.periodo.hasta}` : `mes de ${informe.periodo.desde.slice(0, 7)}`;
    return {
      datos: informe,
      fuentes: [
        {
          modulo: 'cumplimiento',
          etiqueta: `Cumplimiento, ${obra.codigo}, ${que}`,
          fecha: null,
          ruta: `${rutaDeObra(obra.id, 'cumplimiento')}?${new URLSearchParams({ tipo, fecha })}`,
        },
      ],
      consulto: consulta(obra.id, 'cumplimiento'),
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
          ruta: rutaDeObra(obra.id, 'contrato'),
        },
      ],
      consulto: consulta(obra.id, 'contrato'),
    };
  },
});

const anulador = alias(usuarios, 'anulador');

interface Anulado {
  modulo: ModuloDeObraConsultable;
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

/** Los de una obra: los de una empresa (spec 040) no tienen anulados que revisar aquí. */
const NOMBRE_DEL_MODULO: Record<ModuloDeObraConsultable, string> = {
  bitacoras: 'Bitácoras',
  preoperacionales: 'Preoperacionales',
  almacen: 'Almacén',
  cantera: 'Control Cantera',
  laboratorio: 'Laboratorio',
  whatsapp: 'Reportes de WhatsApp',
  reportes: 'Reportes',
  contrato: 'Contrato y Presupuesto',
  cumplimiento: 'Cumplimiento',
  vehiculos: 'Vehículos',
  personas: 'Personas',
};

const RUTA_DEL_MODULO: Record<ModuloDeObraConsultable, (obraId: string, fecha: string) => string> = {
  // Spec 033: cada módulo en su lugar nuevo, dentro de la obra (los de antes redirigen igual).
  // En la obra, el laboratorio es Calidad y las personas, Recursos Humanos (cambio del 2026-10-27).
  bitacoras: (obraId, fecha) => `${rutaDeObra(obraId, 'bitacoras')}?${new URLSearchParams({ fecha })}`,
  preoperacionales: (obraId) => rutaDeObra(obraId, 'preoperacionales'),
  almacen: (obraId) => rutaDeObra(obraId, 'almacen'),
  cantera: (obraId, fecha) => `${rutaDeObra(obraId, 'cantera')}?${new URLSearchParams({ fecha })}`,
  laboratorio: (obraId) => rutaDeObra(obraId, 'calidad'),
  whatsapp: (obraId, fecha) => `${rutaDeObra(obraId, 'whatsapp')}?${new URLSearchParams({ desde: fecha })}`,
  reportes: (obraId, fecha) => `${rutaDeObra(obraId, 'reportes')}?${new URLSearchParams({ fecha })}`,
  contrato: (obraId) => rutaDeObra(obraId, 'contrato'),
  cumplimiento: (obraId, fecha) => `${rutaDeObra(obraId, 'cumplimiento')}?${new URLSearchParams({ fecha })}`,
  vehiculos: () => rutaDeEmpresa('occ', 'vehiculos'),
  personas: (obraId) => rutaDeObra(obraId, 'recursos-humanos'),
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
        ruta: `${rutaDeObra(obra.id, 'whatsapp')}?${new URLSearchParams({ desde, hasta })}`,
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
/* ------------------------------------------------------------------------ */
/* Solicitudes de compra y de pago (spec 040, RF-13 a RF-15, RF-20)          */
/* ------------------------------------------------------------------------ */

/**
 * Las dos consultas leen con **las mismas funciones que sus bandejas**, con la sesión de quien
 * pregunta, y por eso responden lo mismo que la pantalla (RF-20) y esconden lo mismo: el valor
 * al almacenista en lo que no pidió él (036/RF-31, 037/D1) lo quitan esas funciones, no esto.
 *
 *  · Quien lleva Compras o Tesorería de Elemental (gerencia, Auxiliar Administrativa) consulta la
 *    bandeja de todo el grupo, con el resumen de arriba.
 *  · Los demás, las de su lugar: el residente y el almacenista, su obra; el laboratorista,
 *    Geolab; el Encargado, OCC. El lugar lo decide `lugarDeLaSolicitud`, como en su pantalla;
 *    uno ajeno responde «no está a su alcance», exista o no (RF-16).
 */
/**
 * Los campos que no aplican van en `null` y no se omiten: con el modo estricto, la API admite
 * pocos parámetros opcionales sumando todas las consultas (24), y la gerencia, que las recibe
 * todas, pasaba de ese límite (visto en la T10 de la spec 040: 27, y la petición se rechazaba).
 */
const DESCRIPCION_DEL_LUGAR = "'occ', 'geolab' o el id de una obra (de obras_a_mi_alcance).";
const SOLICITUD = z.strictObject({
  lugar: TEXTO_O_VACIO(`De qué lugar: ${DESCRIPCION_DEL_LUGAR} Vacío: el de la persona, o todo el grupo para quien lleva la bandeja.`),
  estado: TEXTO_O_VACIO('Un estado, por su id.'),
  solo_urgentes: z.boolean(),
  desde: FECHA_O_VACIA.describe('Pedidas desde este día; vacía si no aplica.'),
  hasta: FECHA_O_VACIA.describe('Pedidas hasta este día; vacía si no aplica.'),
  texto: TEXTO_O_VACIO('Busca en lo que se pide, el para qué, quién la pidió y el proveedor.'),
  numero: TEXTO_O_VACIO('El número de una solicitud («SC-0549», «SP-0521» o «549») para traer su detalle.'),
});
type PedidoDeSolicitudes = z.infer<typeof SOLICITUD>;

/**
 * Los lugares que pide por sí misma una persona sin bandeja del grupo, en orden. De sus
 * obras, solo la que tiene en uso (041/RF-73): el Director de Obra no consulta su otra obra
 * desde aquí.
 */
function lugaresPropios(alcance: AlcanceDelAsistente, sesion: PersonaEnSesion): string[] {
  const empresas = alcance.empresas.filter((e) => e === 'occ' || e === 'geolab');
  const obras = sesion.obras.filter((o) => o === sesion.obraId && alcanzaLaObraDeLaRuta(sesion, o));
  return [...empresas, ...obras];
}

/** El lugar pedido —o el único de la persona— ya comprobado como en su pantalla. */
async function lugarPedido(
  pedido: PedidoDeSolicitudes,
  alcance: AlcanceDelAsistente,
  sesion: PersonaEnSesion,
  de: 'de compra' | 'de pago',
): Promise<LugarDeLaSolicitud | FalloDeHerramienta> {
  const propios = lugaresPropios(alcance, sesion);
  const lugar = pedido.lugar || (propios.length === 1 ? propios[0] : null);
  if (!lugar) {
    return propios.length === 0
      ? { error: NO_ESTA_A_SU_ALCANCE }
      : { error: `Diga de qué lugar son las solicitudes: ${propios.join(' o ')}.` };
  }
  const esEmpresa = lugar === 'occ' || lugar === 'geolab';
  // `lugarDeLaSolicitud` mira todas las obras de la persona, como su pantalla; aquí vale el
  // alcance del asistente: la otra obra del Director de Obra tampoco (041/RF-74).
  if (!esEmpresa && !obraAlAlcance(alcance, lugar)) return { error: NO_ESTA_A_SU_ALCANCE };
  const resuelto = await lugarDeLaSolicitud(sesion, { empresa: esEmpresa ? lugar : null, obraId: esEmpresa ? null : lugar }, de);
  return resuelto instanceof Response ? { error: NO_ESTA_A_SU_ALCANCE } : resuelto;
}

interface FiltrosPedidos {
  estado: string | null;
  soloUrgentes: boolean;
  desde: string | null;
  hasta: string | null;
  texto: string;
}

/** Los filtros de la bandeja, con el rango completado como en la ruta. */
function filtrosDe(pedido: PedidoDeSolicitudes, estados: readonly string[]): FiltrosPedidos | FalloDeHerramienta {
  if (pedido.estado && !estados.includes(pedido.estado)) {
    return { error: `Ese estado no existe. Son: ${estados.join(', ')}.` };
  }
  let desde: string | null = pedido.desde || null;
  let hasta: string | null = pedido.hasta || null;
  if (desde || hasta) {
    const rango = rangoDeFechas(desde, hasta, fechaDeJornada());
    if ('error' in rango) return { error: MENSAJES_DE_RANGO[rango.error] };
    ({ desde, hasta } = rango);
  }
  return { estado: pedido.estado || null, soloUrgentes: pedido.solo_urgentes, desde, hasta, texto: pedido.texto };
}

const numeroPedido = (numero: string) => Number(/\d+/.exec(numero)?.[0] ?? NaN);

/** Lo de una solicitud en lista, sin lo que es de la pantalla (id, versión, marca de tiempo). */
function enLista<T extends { id: string; version: number; pedidaEn: string; pedidaPor: { id: string; nombre: string } }>(s: T) {
  const { id: _id, version: _version, pedidaEn: _pedidaEn, pedidaPor, ...resto } = s;
  return { ...resto, pedidaPor: pedidaPor.nombre };
}

/**
 * El detalle de una solicitud sin lo que es de la pantalla: `pasos` son los botones que la
 * persona puede pulsar, y el asistente no da pasos (RF-17); `version` es el control de cambios.
 */
function detalleSinPantalla<T extends { pasos: unknown; version: number }>(detalle: T): Omit<T, 'pasos' | 'version'> {
  const { pasos: _pasos, version: _version, ...resto } = detalle;
  return resto;
}

/** De dónde salió una consulta de solicitudes: la ruta y lo que guarda la conversación. */
function origenDe(lugar: LugarDeLaSolicitud | 'grupo', pagina: 'solicitudes-compra' | 'solicitudes-pago', bandeja: 'compras' | 'tesoreria') {
  if (lugar === 'grupo') {
    return { ruta: rutaDeEmpresa('elemental', bandeja), consulto: { obras: [], modulos: [bandeja], empresas: ['elemental' as const] } };
  }
  return lugar.tipo === 'empresa'
    ? { ruta: rutaDeEmpresa(lugar.empresaId, pagina), consulto: { obras: [], modulos: ['solicitudes' as const], empresas: [lugar.empresaId] } }
    : { ruta: rutaDeObra(lugar.obraId, pagina), consulto: { obras: [lugar.obraId], modulos: ['solicitudes' as const] } };
}

const descripcionDeSolicitudes = (cuales: 'compra' | 'pago', delGrupo: boolean) =>
  `Las solicitudes de ${cuales} ${delGrupo ? 'de todo el grupo (la bandeja de ' + (cuales === 'compra' ? 'Compras' : 'Tesorería') + ' de Elemental), con el resumen de lo que espera aprobación, lo urgente y lo vencido' : 'de su lugar'}: ` +
  (cuales === 'compra'
    ? 'número, lugar, estado, qué se pide, para qué y para cuándo, quién la pidió y cuándo, los proveedores de sus compras y el valor estimado si lo puede ver. '
    : 'número, lugar, estado, a quién se le paga y por qué concepto, el valor pedido, aprobado y pagado si los puede ver, para cuándo y quién la pidió. ') +
  `Filtros: lugar, estado (${(cuales === 'compra' ? IDS_DE_ESTADOS_DE_SOLICITUD : IDS_DE_ESTADOS_DE_PAGO).join(', ')}), solo urgentes, pedidas desde/hasta y texto. ` +
  (cuales === 'compra'
    ? 'Con `numero` trae el detalle de una: sus renglones con lo aprobado, comprado y recibido, sus compras, lo que ha llegado y su historia.'
    : 'Con `numero` trae el detalle de una: sus pagos y su historia.');

const solicitudesDeCompra = herramienta({
  nombre: 'solicitudes_de_compra',
  descripcion: (alcance) => descripcionDeSolicitudes('compra', alcance.modulos.includes('compras')),
  modulo: null,
  seOfrece: (alcance) => alcance.modulos.includes('compras') || alcance.modulos.includes('solicitudes'),
  entrada: SOLICITUD,
  async ejecutar(pedido, alcance, sesion) {
    const filtros = filtrosDe(pedido, IDS_DE_ESTADOS_DE_SOLICITUD);
    if ('error' in filtros) return filtros;
    const delGrupo = alcance.modulos.includes('compras') && alcanza(sesion.rol, 'compras', 'listar');

    let lista;
    let resumen: unknown = null;
    let origen;
    if (delGrupo) {
      const bandeja = await bandejaDelGrupo(sesion, { ...filtros, estado: filtros.estado as never, lugar: pedido.lugar || null });
      lista = bandeja.solicitudes;
      resumen = bandeja.resumen;
      origen = origenDe('grupo', 'solicitudes-compra', 'compras');
    } else {
      if (!alcance.modulos.includes('solicitudes')) return { error: NO_ESTA_A_SU_ALCANCE };
      const lugar = await lugarPedido(pedido, alcance, sesion, 'de compra');
      if ('error' in lugar) return lugar;
      lista = (await solicitudesDelLugar(sesion, lugar)).solicitudes.filter((s) =>
        pasaLosFiltros(s, { ...filtros, estado: filtros.estado as never, lugar: null }),
      );
      origen = origenDe(lugar, 'solicitudes-compra', 'compras');
    }

    if (pedido.numero) {
      const numero = numeroPedido(pedido.numero);
      const encontrada = lista.find((s) => s.numero === numero);
      const fila = encontrada ? await solicitudAlAlcance(sesion, encontrada.id) : null;
      if (!encontrada || !fila) return { error: 'No hay una solicitud de compra con ese número a su alcance con esos filtros.' };
      const detalle = await solicitudDe(sesion, fila);
      return {
        datos: { solicitud: detalleSinPantalla(detalle) },
        fuentes: [{ modulo: origen.consulto.modulos[0], etiqueta: `Solicitud ${encontrada.codigo}`, fecha: encontrada.pedidaEl, ruta: `${origen.ruta}?${new URLSearchParams({ solicitud: encontrada.id })}` }],
        consulto: origen.consulto,
      };
    }
    return {
      datos: { total: lista.length, ...(resumen ? { resumen } : {}), solicitudes: lista.map(enLista) },
      fuentes: [{ modulo: origen.consulto.modulos[0], etiqueta: delGrupo ? 'Compras de Elemental' : 'Solicitudes de compra', fecha: filtros.desde, ruta: origen.ruta }],
      consulto: origen.consulto,
    };
  },
});

const solicitudesDePago = herramienta({
  nombre: 'solicitudes_de_pago',
  descripcion: (alcance) => descripcionDeSolicitudes('pago', alcance.modulos.includes('tesoreria')),
  modulo: null,
  seOfrece: (alcance) => alcance.modulos.includes('tesoreria') || alcance.modulos.includes('solicitudes'),
  entrada: SOLICITUD,
  async ejecutar(pedido, alcance, sesion) {
    const filtros = filtrosDe(pedido, IDS_DE_ESTADOS_DE_PAGO);
    if ('error' in filtros) return filtros;
    const delGrupo = alcance.modulos.includes('tesoreria') && alcanza(sesion.rol, 'tesoreria', 'listar');

    let lista;
    let resumen: unknown = null;
    let origen;
    if (delGrupo) {
      const bandeja = await bandejaDeTesoreria(sesion, { ...filtros, estado: filtros.estado as never, lugar: pedido.lugar || null });
      lista = bandeja.solicitudes;
      resumen = bandeja.resumen;
      origen = origenDe('grupo', 'solicitudes-pago', 'tesoreria');
    } else {
      if (!alcance.modulos.includes('solicitudes')) return { error: NO_ESTA_A_SU_ALCANCE };
      const lugar = await lugarPedido(pedido, alcance, sesion, 'de pago');
      if ('error' in lugar) return lugar;
      lista = (await solicitudesDePagoDelLugar(sesion, lugar)).solicitudes.filter((s) =>
        pasaLosFiltrosDePago(s, { ...filtros, estado: filtros.estado as never, lugar: null }),
      );
      origen = origenDe(lugar, 'solicitudes-pago', 'tesoreria');
    }

    if (pedido.numero) {
      const numero = numeroPedido(pedido.numero);
      const encontrada = lista.find((s) => s.numero === numero);
      const fila = encontrada ? await solicitudDePagoAlAlcance(sesion, encontrada.id) : null;
      if (!encontrada || !fila) return { error: 'No hay una solicitud de pago con ese número a su alcance con esos filtros.' };
      const detalle = await solicitudDePagoDe(sesion, fila);
      return {
        datos: { solicitud: detalleSinPantalla(detalle) },
        fuentes: [{ modulo: origen.consulto.modulos[0], etiqueta: `Solicitud ${encontrada.codigo}`, fecha: encontrada.pedidaEl, ruta: `${origen.ruta}?${new URLSearchParams({ solicitud: encontrada.id })}` }],
        consulto: origen.consulto,
      };
    }
    return {
      datos: { total: lista.length, ...(resumen ? { resumen } : {}), solicitudes: lista.map(enLista) },
      fuentes: [{ modulo: origen.consulto.modulos[0], etiqueta: delGrupo ? 'Tesorería de Elemental' : 'Solicitudes de pago', fecha: filtros.desde, ruta: origen.ruta }],
      consulto: origen.consulto,
    };
  },
});

/* ------------------------------------------------------------------------ */
/* Cortes, Recursos Humanos y Documentos (spec 040, RF-13, RF-14, RF-20)     */
/* ------------------------------------------------------------------------ */

const LUGAR_DE_EMPRESA = TEXTO_O_VACIO("'elemental', 'occ', 'geolab' o el id de una obra (de obras_a_mi_alcance).");
const esEmpresaConLugar = (lugar: string): lugar is 'elemental' | 'occ' | 'geolab' =>
  lugar === 'elemental' || lugar === 'occ' || lugar === 'geolab';

/**
 * Los cortes financieros (033, 037/RF-24): sin lugar, el consolidado del grupo; con lugar, el
 * historial de esa empresa u obra con la diferencia del último. Los consultan la gerencia y la
 * Auxiliar Administrativa, que los ve todos aunque solo registre los de Elemental (040/D3).
 * Leen con las mismas funciones que la pestaña Cortes de Tesorería de Elemental, y por eso lo
 * consultado es de Elemental.
 */
const cortesFinancieros = herramienta({
  nombre: 'cortes_financieros',
  descripcion:
    'Los cortes financieros (saldo, cuentas por pagar y por cobrar a una fecha; no es contabilidad). Sin `lugar`, el consolidado del grupo: el último corte de cada empresa y obra, si está desactualizado (más de 30 días) y el total. Con `lugar`, todos los cortes de ese lugar, del más reciente al más antiguo, con los anulados marcados y la diferencia del último con el anterior. Los valores van en pesos.',
  modulo: 'finanzas',
  entrada: z.strictObject({ lugar: LUGAR_DE_EMPRESA }),
  async ejecutar({ lugar }, _alcance, sesion) {
    if (!alcanza(sesion.rol, 'finanzas', 'listar')) return { error: NO_ESTA_A_SU_ALCANCE };
    const consulto = { obras: [], modulos: ['finanzas' as const], empresas: ['elemental' as const] };
    const ruta = `${rutaDeEmpresa('elemental', 'tesoreria')}?${new URLSearchParams({ pestana: 'cortes' })}`;
    if (!lugar) {
      const consolidado = await consolidadoDelGrupo();
      return { datos: consolidado, fuentes: [{ modulo: 'finanzas', etiqueta: 'Consolidado del grupo', fecha: consolidado.hoy, ruta }], consulto };
    }
    if (lugar === 'proyectos') return { error: 'Proyectos no tiene corte propio: sus cortes son los de sus obras.' };
    const dueno = esEmpresaConLugar(lugar) ? { empresaId: lugar } : { obraId: lugar };
    const { cortes, diferencia } = await cortesDe(dueno);
    const nombre = esEmpresaConLugar(lugar) ? nombreDeEmpresa(lugar) : (await obraConNombre(lugar)) ?? 'esa obra';
    return {
      datos: {
        lugar: nombre,
        cortes: cortes.map(({ id: _id, empresaId: _e, obraId: _o, ...corte }) => corte),
        diferenciaDelUltimoConElAnterior: diferencia,
        ...(cortes.length === 0 ? { nota: `No hay cortes registrados de ${nombre}.` } : {}),
      },
      fuentes: [{ modulo: 'finanzas', etiqueta: `Cortes de ${nombre}`, fecha: cortes[0]?.fechaCorte ?? null, ruta }],
      consulto,
    };
  },
});

async function obraConNombre(id: string): Promise<string | null> {
  const [obra] = await baseServidor().select({ nombre: obras.nombre }).from(obras).where(eq(obras.id, id)).limit(1);
  return obra?.nombre ?? null;
}

/**
 * Recursos Humanos (035; 040/RF-13, RF-14, D4): el personal con su contrato, sus avisos de hoy
 * (contrato por terminar, documentos por vencer, ficha incompleta) y el resumen; con `persona`,
 * la ficha de esa persona. Lo consultan la gerencia y la Auxiliar Administrativa desde el
 * Recursos Humanos de Elemental, que tiene el personal de todo el grupo: un lugar es un filtro
 * sobre esa lista, con la misma regla que la pantalla de cada lugar. El salario lo quitan
 * `personalDelLugar` y `fichaDe` a quien no lo ve (`veElSalario`).
 */
const recursosHumanos = herramienta({
  nombre: 'recursos_humanos',
  descripcion:
    'El personal del grupo (Recursos Humanos de Elemental): nombre, documento, cargo, empresa, obra, si está activo, el estado de su ficha, el tipo de contrato, la fecha de ingreso y de fin de contrato, el salario si lo puede ver, y los avisos de hoy (contrato por terminar, documentos por vencer o vencidos, ficha incompleta), con el resumen de cuántos tienen cada aviso. Filtros: `lugar` (una empresa o una obra), `solo_con_avisos` y `texto` (nombre, documento o cargo). Con `persona` (nombre o documento de una sola persona) trae su ficha completa.',
  modulo: 'rrhh',
  entrada: z.strictObject({
    lugar: LUGAR_DE_EMPRESA,
    solo_con_avisos: z.boolean(),
    texto: TEXTO_O_VACIO('Nombre, documento o cargo.'),
    persona: TEXTO_O_VACIO('El nombre o el documento de una sola persona, para su ficha.'),
  }),
  async ejecutar({ lugar, solo_con_avisos, texto, persona }, _alcance, sesion) {
    if (!alcanza(sesion.rol, 'rrhh', 'listar') || !alcanzaLaEmpresa(sesion.rol, 'elemental')) return { error: NO_ESTA_A_SU_ALCANCE };
    const { personas, resumen } = await personalDelLugar(sesion, { tipo: 'empresa', empresaId: 'elemental' });
    const consulto = { obras: [], modulos: ['rrhh' as const], empresas: ['elemental' as const] };
    const ruta = rutaDeEmpresa('elemental', 'recursos-humanos');

    const delLugar = !lugar || lugar === 'elemental'
      ? personas
      : personas.filter((p) => (esEmpresaConLugar(lugar) ? p.empresa === lugar : p.obraId === lugar));
    const busca = (t: string) => {
      const n = normalizar(t);
      return (p: (typeof personas)[number]) =>
        normalizar(`${p.nombreCompleto} ${p.documento ?? ''} ${nombreDeCargo(p.cargo)}`).includes(n);
    };

    if (persona) {
      const coinciden = delLugar.filter(busca(persona));
      if (coinciden.length !== 1) {
        return coinciden.length === 0
          ? { error: 'No hay nadie con ese nombre o documento en el personal a su alcance.' }
          : { error: `Hay ${coinciden.length} personas que coinciden: ${coinciden.slice(0, 10).map((p) => p.nombreCompleto).join(', ')}. Diga cuál.` };
      }
      const ficha = await fichaDe(sesion, coinciden[0].id);
      if (!ficha) return { error: NO_ESTA_A_SU_ALCANCE };
      return {
        datos: { persona: { ...ficha.persona, cargo: nombreDeCargo(ficha.persona.cargo) }, ficha: { ...ficha.ficha, version: undefined }, avisos: coinciden[0].avisos },
        fuentes: [{ modulo: 'rrhh', etiqueta: `Ficha de ${coinciden[0].nombreCompleto}`, fecha: null, ruta: `${ruta}?${new URLSearchParams({ persona: coinciden[0].id })}` }],
        consulto,
      };
    }

    const lista = delLugar
      .filter((p) => !solo_con_avisos || p.avisos.length > 0)
      .filter(texto ? busca(texto) : () => true)
      .map(({ id: _id, usuario: _usuario, obraId: _obraId, rol: _rol, ...p }) => ({
        ...p,
        cargo: nombreDeCargo(p.cargo),
        empresa: nombreDeEmpresa(p.empresa),
      }));
    return {
      datos: { total: lista.length, resumenDelGrupo: resumen, personas: lista },
      fuentes: [{ modulo: 'rrhh', etiqueta: 'Recursos Humanos de Elemental', fecha: null, ruta }],
      consulto,
    };
  },
});

/**
 * Los documentos de una empresa o de una obra (034; 040/RF-13, RF-14), con el aviso de
 * vencimiento de hoy. El lugar lo comprueba `duenoDelPedido`, como su pantalla: la Auxiliar
 * Administrativa, solo los de Elemental. Los de una persona salen en Recursos Humanos, y los de
 * una solicitud, en su detalle.
 */
const documentosDelGrupoConsulta = herramienta({
  nombre: 'documentos_del_grupo',
  descripcion: (alcance) =>
    `Los documentos de ${alcance.empresas.length === 1 ? nombreDeEmpresa(alcance.empresas[0]) : 'una empresa o una obra'}: clase, nombre, proveedor, descripción, fecha, vencimiento con su aviso de hoy (vence en N días o vencido), quién lo subió y cuándo. Los anulados no salen salvo que se pidan (\`ver_anulados\`). Filtros: \`solo_por_vencer\` (vencidos y por vencer) y \`texto\`.`,
  modulo: 'documentos',
  entrada: z.strictObject({
    lugar: LUGAR_DE_EMPRESA,
    solo_por_vencer: z.boolean(),
    texto: TEXTO_O_VACIO('Busca en la clase, el nombre, el proveedor y la descripción.'),
    ver_anulados: z.boolean(),
  }),
  async ejecutar({ lugar, solo_por_vencer, texto, ver_anulados }, alcance, sesion) {
    const propio = alcance.empresas.length === 1 ? alcance.empresas[0] : null;
    const pedido = lugar || propio;
    if (!pedido) return { error: "Diga de qué lugar son los documentos: 'elemental', 'occ', 'geolab' o el id de una obra." };
    const esEmpresa = esEmpresaConLugar(pedido);
    const dueno = await duenoDelPedido(sesion, {
      empresa: esEmpresa ? pedido : null,
      obraId: esEmpresa ? null : pedido,
      personaId: null,
      solicitudId: null,
    });
    if (dueno instanceof Response || (dueno.tipo !== 'empresa' && dueno.tipo !== 'obra')) return { error: NO_ESTA_A_SU_ALCANCE };
    const { documentos, resumen } = await documentosDelLugar(dueno);
    const n = texto ? normalizar(texto) : '';
    const lista = documentos
      .filter((d) => ver_anulados || !d.anulado)
      .filter((d) => !solo_por_vencer || d.aviso !== null)
      .filter((d) => !n || normalizar(`${d.claseNombre} ${d.nombre} ${d.proveedor} ${d.descripcion}`).includes(n))
      .map(({ id: _id, mediaId: _mediaId, mime: _mime, bytes: _bytes, clase: _clase, ...d }) => d);
    const nombre = dueno.tipo === 'empresa' ? nombreDeEmpresa(dueno.empresaId) : ((await obraConNombre(dueno.obraId)) ?? 'la obra');
    return {
      datos: { lugar: nombre, total: lista.length, resumen, documentos: lista },
      fuentes: [
        {
          modulo: 'documentos',
          etiqueta: `Documentos de ${nombre}`,
          fecha: null,
          ruta: dueno.tipo === 'empresa' ? rutaDeEmpresa(dueno.empresaId, 'documentos') : rutaDeObra(dueno.obraId, 'documentos'),
        },
      ],
      consulto:
        dueno.tipo === 'empresa'
          ? { obras: [], modulos: ['documentos'], empresas: [dueno.empresaId] }
          : { obras: [dueno.obraId], modulos: ['documentos'] },
    };
  },
});

/**
 * Spec 040, RF-18 a RF-23: un PDF, un Excel o un Word con lo que se consultó en esta respuesta.
 * Se ofrece a todos los que usan el asistente. Las tablas salen de las consultas guardadas en el
 * turno (`archivos/generar.ts`), nunca de lo que escriba la IA. Sin campos opcionales: lo que no
 * aplica va vacío (ver `FECHA_O_VACIA`).
 */
const generarArchivoConsulta = herramienta({
  nombre: 'generar_archivo',
  descripcion:
    'Genera un archivo PDF, Excel (xlsx) o Word (docx) con lo consultado en esta respuesta, para descargarlo desde la conversación. Primero haga las consultas; cada resultado trae su número de consulta («c1», «c2»). Cada bloque es un texto (Markdown corto: un resumen, notas) o una tabla: la tabla dice de qué `consulta` sale, qué `lista` de esos datos («solicitudes», «personas», o con punto si está anidada: «bitacora.actividades», «bitacora.personal»; vacía si los datos son una sola lista) y qué `columnas` lleva, con la `clave` del dato y el `titulo` bien escrito para el archivo («valorEstimado» → «Valor estimado»); sin columnas, van todas. Las filas salen de la consulta: no las escriba. Los datos van siempre en tablas (al menos una, con filas); el texto solo resume y anota. Si las consultas no traen datos del periodo, no genere el archivo: dígaselo a la persona. Hasta 5 000 filas. No genere un archivo si la persona no lo pidió. Cuando esté listo, dígalo en una frase: el archivo aparece en la conversación con su botón; no ponga enlaces.',
  modulo: null,
  // Fuera del modo estricto (T16): con ella, la gerencia pasaba de 18 consultas estrictas y la API
  // rechazaba toda pregunta («The compiled grammar is too large»). La entrada la revisan zod y
  // `generarArchivo`, y un error vuelve a la IA.
  estricta: false,
  entrada: z.strictObject({
    formato: z.enum(['pdf', 'xlsx', 'docx']),
    titulo: z.string().describe('El título del archivo: «Compras por aprobar», «Bitácora de la semana».'),
    bloques: z
      .array(
        z.strictObject({
          tipo: z.enum(['texto', 'tabla']),
          texto: TEXTO_O_VACIO('El texto, si el bloque es de texto.'),
          consulta: TEXTO_O_VACIO('El número de la consulta («c1»), si el bloque es una tabla.'),
          lista: TEXTO_O_VACIO('El nombre de la lista dentro de los datos de esa consulta.'),
          titulo_de_la_tabla: TEXTO_O_VACIO('El título de la tabla.'),
          columnas: z.array(z.strictObject({ clave: z.string(), titulo: z.string() })),
        }),
      )
      // Sin `.min()` ni `.max()`: el modo estricto de la API rechaza `maxItems` (visto en la
      // T14). Cuántos bloques caben lo revisa `generarArchivo`.
      .describe('De 1 a 12 bloques, en el orden en que van en el archivo.'),
  }),
  async ejecutar(pedido, _alcance, _sesion, turno) {
    const r = await generarArchivo(pedido, turno);
    if ('error' in r) return r;
    return {
      datos: {
        listo: true,
        archivo: { nombre: r.archivo.nombre, formato: r.archivo.formato, filas: r.archivo.filas },
        nota: 'El archivo ya está en la conversación con su botón para descargarlo. Dígalo en una frase, sin enlaces.',
      },
      fuentes: [],
      consulto: { obras: [], modulos: [] },
    };
  },
});

/**
 * Spec 040, RF-27: cuando falta un dato que cambia la respuesta (la obra, el lugar), la IA
 * pregunta con opciones para tocar. No lee nada: limpia la aclaración (`aclaracionDe`) y
 * `responderPregunta` cierra el turno con ella, sin otra vuelta. Sin `minItems` ni `maxItems`
 * (el modo estricto no los admite): cuántas opciones caben lo revisa la regla.
 */
export const PEDIR_ACLARACION = 'pedir_aclaracion';

const pedirAclaracion = herramienta({
  nombre: PEDIR_ACLARACION,
  descripcion:
    'Le pregunta a la persona un dato que falta y cambia la respuesta (de qué obra o lugar, de cuál máquina o persona), con opciones para tocar. Las opciones salen de una consulta hecha antes (las obras, de obras_a_mi_alcance), con su nombre corto; de 2 a 6. Con una sola posible, úsela sin preguntar; con más de 6, pregunte en texto. No la use para el periodo: elija el razonable y dígalo. Al llamarla termina su respuesta: no escriba nada más; la persona responde tocando una opción.',
  modulo: null,
  // Fuera del modo estricto: con ella, la gramática de la gerencia pasaba del tamaño que la API
  // admite. La entrada la revisan zod y `aclaracionDe`, y un error vuelve a la IA.
  estricta: false,
  entrada: z.strictObject({
    pregunta: z.string().describe('La pregunta, corta: «¿De qué obra?».'),
    opciones: z.array(z.string()).describe('De 2 a 6 opciones, cada una como la persona la diría.'),
  }),
  async ejecutar(pedida) {
    const r = aclaracionDe(pedida);
    if (!r.ok) return { error: r.error };
    return { datos: { mostrada: true }, fuentes: [], consulto: { obras: [], modulos: [] }, aclaracion: r.aclaracion };
  },
});

const TODAS: Herramienta<never>[] = [
  obrasAMiAlcance,
  // Spec 040.
  solicitudesDeCompra,
  solicitudesDePago,
  cortesFinancieros,
  recursosHumanos,
  documentosDelGrupoConsulta,
  generarArchivoConsulta,
  pedirAclaracion,
  reporte,
  bitacoraDelDia,
  bitacoraDeEmpresa,
  viajesDeCantera,
  ensayos,
  almacen,
  preoperacionalesDelPeriodo,
  vehiculosYMedidores,
  personasDeLaObra,
  contratoYPresupuesto,
  cumplimientoDeObra,
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
    return {
      nombre: h.nombre,
      descripcion: typeof h.descripcion === 'string' ? h.descripcion : h.descripcion(alcance),
      esquema,
      estricta: h.estricta ?? true,
    };
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
  sesion: PersonaEnSesion,
  turno: TurnoDelAsistente,
): Promise<ResultadoDeHerramienta | FalloDeHerramienta> {
  const h = TODAS.find((x) => x.nombre === nombre);
  if (!h || !alcance.usa || !seOfreceA(h, alcance)) return { error: NO_ESTA_A_SU_ALCANCE };
  const validada = (h.entrada as z.ZodType).safeParse(entrada);
  if (!validada.success) return { error: `La consulta ${nombre} vino mal formada: ${z.prettifyError(validada.error)}` };
  const resultado = await (h as Herramienta<unknown>).ejecutar(validada.data, alcance, sesion, turno);
  if ('error' in resultado || h === generarArchivoConsulta || h === pedirAclaracion) return resultado;

  // Spec 040 (RF-20, RF-23): cada consulta queda en el turno con su número, para un archivo.
  const fuentes = await conObraYPeriodo(resultado, validada.data as PeriodoPedido);
  const consulta = guardarConsulta(turno, nombre, resultado.datos, fuentes);
  // Un resultado enorme ya no es un error: la IA no lo lee entero, pero sirve para un archivo.
  if (JSON.stringify(resultado.datos).length > CARACTERES_MAXIMOS_POR_RESULTADO) {
    return {
      ...resultado,
      fuentes,
      datos: {
        consulta,
        demasiadoGrande: true,
        listas: Object.fromEntries(
          Object.entries(Array.isArray(resultado.datos) ? { '': resultado.datos } : ((resultado.datos ?? {}) as Record<string, unknown>))
            .filter(([, v]) => Array.isArray(v))
            .map(([k, v]) => [k || '(los datos son la lista)', (v as unknown[]).length]),
        ),
        nota: `El resultado es demasiado grande para leerlo aquí: no responda con sus cifras. Si la persona pidió un archivo, genérelo con la consulta ${consulta}; si no, pídale un periodo más corto o algo más concreto (una máquina, una persona, una semana).`,
      },
    };
  }
  return { ...resultado, fuentes, datos: { consulta, datos: resultado.datos } };
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
