/**
 * Las reglas del asistente (spec 028). Puras: las usan el servidor, para decidir qué
 * consultas le ofrece a la IA y qué deja ver, y la pantalla, para mostrar o no una
 * conversación.
 *
 * ── El alcance (RF-1 a RF-10, RF-34, RF-65) ──
 *
 * El asistente responde con lo mismo que la persona ve en el panel: sus obras y sus
 * módulos, con los apagados de su obra fuera (`modulosVisibles`, specs 016 y 017). Lo
 * decide quién pregunta, nunca lo que diga el mensaje (RF-6). Hay una sola ampliación,
 * acordada en la spec: el residente pregunta también por los vehículos, las máquinas y
 * las personas de su obra (RF-65), que en el panel solo ve en los selectores.
 */
import { fechaDeJornada, restarDias } from './jornada';
import { diasDe } from './periodos';
import { modulosVisibles, type Modulo, type ModulosDeObra, type Rol } from './permisos';
import { normalizar } from './texto';

/** RF-1: quiénes lo usan. El operador no (RF-2: el asistente no está en el celular). */
export const ROLES_DEL_ASISTENTE: readonly Rol[] = ['admin', 'supervisor', 'almacenista', 'encargado_planta', 'laboratorista'];

/**
 * Los módulos con registros que el asistente puede consultar. `inicio` y `asignaciones`
 * no tienen nada que contar que no esté en otro; `obras` lo cubre la lista de obras al
 * alcance.
 */
export const MODULOS_CONSULTABLES = [
  'bitacoras',
  'preoperacionales',
  'almacen',
  'cantera',
  'laboratorio',
  'whatsapp',
  'reportes',
  'contrato',
  'vehiculos',
  'personas',
] as const satisfies readonly Modulo[];

export type ModuloConsultable = (typeof MODULOS_CONSULTABLES)[number];

/** Quién pregunta, como lo trae la sesión. */
export interface QuienPregunta {
  rol: Rol;
  obraId: string | null;
  modulosDeObra: ModulosDeObra;
}

export interface AlcanceDelAsistente {
  /** Si puede usar el asistente (RF-1, RF-2). */
  usa: boolean;
  /** `'todas'` para la gerencia; si no, la obra de la persona, o ninguna (RF-4, RF-10). */
  obras: 'todas' | string[];
  /** Los módulos que alcanza, en el orden del menú (RF-3, RF-5). */
  modulos: ModuloConsultable[];
}

const NADA: AlcanceDelAsistente = { usa: false, obras: [], modulos: [] };

/** Lo que alcanza el asistente para quien pregunta. */
export function alcanceDelAsistente(quien: QuienPregunta): AlcanceDelAsistente {
  if (!ROLES_DEL_ASISTENTE.includes(quien.rol)) return NADA;
  if (quien.rol === 'admin') {
    return { usa: true, obras: 'todas', modulos: consultables(modulosVisibles('admin')) };
  }
  // RF-10: sin obra no hay nada a su alcance; puede entrar, pero el asistente se lo dice.
  if (!quien.obraId) return { usa: true, obras: [], modulos: [] };
  const visibles: Modulo[] = modulosVisibles(quien.rol, quien.modulosDeObra);
  // RF-65: el residente, también vehículos, máquinas y personas de su obra.
  if (quien.rol === 'supervisor') visibles.push('vehiculos', 'personas');
  return { usa: true, obras: [quien.obraId], modulos: consultables(visibles) };
}

function consultables(modulos: readonly Modulo[]): ModuloConsultable[] {
  return MODULOS_CONSULTABLES.filter((m) => modulos.includes(m));
}

/** ¿Alcanza esta obra? Lo usa cada consulta antes de leer (RF-4, RF-6). */
export function obraAlAlcance(alcance: AlcanceDelAsistente, obraId: string): boolean {
  return alcance.obras === 'todas' || alcance.obras.includes(obraId);
}

/** Lo que una conversación guardada consultó: para saber si se sigue alcanzando (RF-49). */
export interface LoQueConsulto {
  obras: string[];
  modulos: ModuloConsultable[];
}

/**
 * RF-49: una conversación se muestra entera solo si quien la abre sigue alcanzando todas
 * las obras y todos los módulos que consultó. Si no, solo su título y su fecha: el
 * contenido trae cifras de lo que ya no le toca ver. RF-9: se decide con el alcance de hoy.
 */
export function conversacionVisible(consulto: LoQueConsulto, alcance: AlcanceDelAsistente): boolean {
  if (!alcance.usa) return false;
  return (
    consulto.obras.every((obra) => obraAlAlcance(alcance, obra)) && consulto.modulos.every((modulo) => alcance.modulos.includes(modulo))
  );
}

/* ------------------------------------------------------------------------ */
/* Límite del día (RF-50 a RF-55, RF-59)                                     */
/* ------------------------------------------------------------------------ */

/** RF-50: lo que puede preguntar cada persona en un día, si la gerencia no puso otro. */
export const LIMITE_DEL_DIA = 30;

/** Un límite puesto por la gerencia: el de todos (`usuarioId` nulo) o el de una persona. */
export interface LimitePuesto {
  usuarioId: string | null;
  limite: number;
}

/** RF-59: el de la persona manda sobre el de todos, y el de todos sobre el de la spec. */
export function limiteDelDia(usuarioId: string, puestos: readonly LimitePuesto[]): number {
  return puestos.find((l) => l.usuarioId === usuarioId)?.limite ?? puestos.find((l) => l.usuarioId === null)?.limite ?? LIMITE_DEL_DIA;
}

/** RF-51: lo que le queda hoy; nunca negativo, aunque dos pestañas se hayan pasado por una. */
export function preguntasQueQuedan(limite: number, hechasHoy: number): number {
  return Math.max(0, limite - hechasHoy);
}

/**
 * RF-54: el día de una pregunta, en Colombia. Es el de la jornada (`fechaDeJornada`): a
 * las 00:00 de Bogotá empieza otro día y el conteo vuelve a cero.
 */
export const diaDelConteo = fechaDeJornada;

/* ------------------------------------------------------------------------ */
/* Periodo (RF-64)                                                           */
/* ------------------------------------------------------------------------ */

/** 3 meses: el trimestre más largo tiene 92 días. */
export const DIAS_MAXIMOS_POR_PREGUNTA = 92;

/** `null` si el periodo se puede consultar; si no, qué decirle a la persona. */
export function faltaDelPeriodo(desde: string, hasta: string): string | null {
  if (hasta < desde) return `El periodo está al revés: ${desde} es después de ${hasta}.`;
  const dias = diasDe({ desde, hasta }).length;
  if (dias > DIAS_MAXIMOS_POR_PREGUNTA) {
    return `El periodo tiene ${dias} días. Pregunte por 3 meses o menos a la vez (por ejemplo, un trimestre o un mes).`;
  }
  return null;
}

/* ------------------------------------------------------------------------ */
/* Adjuntos (RF-66 a RF-68)                                                  */
/* ------------------------------------------------------------------------ */

export const ADJUNTOS_MAXIMOS = 5;
export const BYTES_MAXIMOS_POR_ADJUNTO = 10 * 1024 * 1024;
export const PAGINAS_MAXIMAS_DE_PDF = 100;

export type ClaseDeAdjunto = 'imagen' | 'pdf' | 'excel' | 'word';

const CLASE_POR_TIPO: Record<string, ClaseDeAdjunto> = {
  'image/jpeg': 'imagen',
  'image/png': 'imagen',
  'image/webp': 'imagen',
  'application/pdf': 'pdf',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'excel',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'word',
};

const CLASE_POR_EXTENSION: Record<string, ClaseDeAdjunto> = {
  jpg: 'imagen',
  jpeg: 'imagen',
  png: 'imagen',
  webp: 'imagen',
  pdf: 'pdf',
  xlsx: 'excel',
  docx: 'word',
};

/**
 * La clase de un archivo por su tipo, o por su extensión si el navegador no dice el tipo
 * (pasa con algunos .xlsx en Windows). `null` si no se acepta: .xls, .doc, videos…
 */
export function claseDeAdjunto(nombre: string, tipo: string): ClaseDeAdjunto | null {
  const porTipo = CLASE_POR_TIPO[tipo.toLowerCase()];
  if (porTipo) return porTipo;
  const extension = nombre.toLowerCase().split('.').pop() ?? '';
  return CLASE_POR_EXTENSION[extension] ?? null;
}

export interface ArchivoAdjunto {
  nombre: string;
  tipo: string;
  bytes: number;
}

/** RF-68: qué archivo no cabe y por qué. Vacía si se puede enviar. */
export function faltasDeLosAdjuntos(archivos: readonly ArchivoAdjunto[]): string[] {
  const faltas: string[] = [];
  if (archivos.length > ADJUNTOS_MAXIMOS) {
    faltas.push(`Se pueden adjuntar hasta ${ADJUNTOS_MAXIMOS} archivos por pregunta; hay ${archivos.length}.`);
  }
  for (const a of archivos) {
    if (!claseDeAdjunto(a.nombre, a.tipo)) {
      faltas.push(`«${a.nombre}»: solo se aceptan fotos (JPG, PNG o WEBP), PDF, Excel (.xlsx) y Word (.docx).`);
    } else if (a.bytes > BYTES_MAXIMOS_POR_ADJUNTO) {
      faltas.push(`«${a.nombre}» pesa ${(a.bytes / 1024 / 1024).toFixed(1).replace('.', ',')} MB; el máximo es 10 MB.`);
    } else if (a.bytes === 0) {
      faltas.push(`«${a.nombre}» llegó vacío.`);
    }
  }
  return faltas;
}

/* ------------------------------------------------------------------------ */
/* Conversación y costo                                                      */
/* ------------------------------------------------------------------------ */

const LARGO_DEL_TITULO = 60;

/** RF-44: el título, de la primera pregunta: hasta 60 caracteres, cortado en una palabra. */
export function tituloDeConversacion(pregunta: string, conAdjuntos = false): string {
  const limpia = pregunta.replace(/\s+/g, ' ').trim();
  if (!limpia) return conAdjuntos ? 'Archivo adjunto' : 'Conversación';
  if (limpia.length <= LARGO_DEL_TITULO) return limpia;
  const corte = limpia.slice(0, LARGO_DEL_TITULO);
  const espacio = corte.lastIndexOf(' ');
  return `${(espacio > LARGO_DEL_TITULO / 2 ? corte.slice(0, espacio) : corte).replace(/[\s,.;:]+$/, '')}…`;
}

/** Los tokens que reporta la API por respuesta. */
export interface TokensUsados {
  entrada: number;
  salida: number;
  /** Leídos de la caché (a una décima de precio, más o menos). */
  cacheLeida?: number;
  /** Escritos en la caché (un 25 % más caros que la entrada normal). */
  cacheEscrita?: number;
}

/**
 * RF-57: el costo estimado en **microdólares** (1 USD = 1 000 000), con los precios de
 * Claude Opus 5.5 por millón de tokens: entrada 4, salida 20, caché leída 0,20, caché
 * escrita 5. Si se cambia de modelo, se cambian aquí.
 */
export const PRECIO_POR_TOKEN_EN_MICRODOLARES = { entrada: 4, salida: 20, cacheLeida: 0.2, cacheEscrita: 5 } as const;

export function costoEstimado(t: TokensUsados): number {
  const p = PRECIO_POR_TOKEN_EN_MICRODOLARES;
  return Math.round(
    t.entrada * p.entrada + t.salida * p.salida + (t.cacheLeida ?? 0) * p.cacheLeida + (t.cacheEscrita ?? 0) * p.cacheEscrita,
  );
}

/* ------------------------------------------------------------------------ */
/* Lo que se guarda con cada respuesta                                       */
/* ------------------------------------------------------------------------ */

/**
 * RF-28 a RF-30: de dónde sale una cifra. `ruta` abre el registro en su módulo del
 * panel («/panel/cantera?fecha=2026-10-14&obraId=…»).
 */
export interface FuenteDeRespuesta {
  modulo: ModuloConsultable;
  /** Cómo se nombra el registro en el módulo: «Bitácora del 14-oct», «Vale F-0458». */
  etiqueta: string;
  /** `YYYY-MM-DD`, si el registro tiene fecha. */
  fecha: string | null;
  ruta: string;
  /** RF-25: la obra consultada, «PRUEBA-018 · Pruebas spec 018», para el PDF. */
  obra?: string;
  /** RF-25: el periodo consultado, si la consulta lo tuvo. */
  desde?: string;
  hasta?: string;
}

/** RF-71: un archivo adjunto a una pregunta, guardado en el almacén privado. */
export interface AdjuntoGuardado {
  mediaId: string;
  nombre: string;
  clase: ClaseDeAdjunto;
  bytes: number;
}

/* ------------------------------------------------------------------------ */
/* Lo anulado y WhatsApp de varios días (cambio del 2026-10-22)              */
/* ------------------------------------------------------------------------ */

/** Los módulos que tienen registros que se anulan, en el orden en que se revisan. */
export const MODULOS_CON_ANULADOS = [
  'bitacoras',
  'cantera',
  'almacen',
  'preoperacionales',
  'laboratorio',
] as const satisfies readonly ModuloConsultable[];

/**
 * RF-83: de los módulos con anulados, los que alcanza la persona. Con esto se le describe
 * a la IA la consulta de anulados: lo que no alcanza, ni lo nombra.
 */
export function modulosDeAnulados(modulos: readonly ModuloConsultable[]): ModuloConsultable[] {
  return MODULOS_CON_ANULADOS.filter((m) => modulos.includes(m));
}

/** Un mensaje de WhatsApp que quedó registrado en su módulo. */
export interface MensajeRegistrado {
  dia: string;
  categoria: string | null;
}

export interface RegistradosDelDia {
  dia: string;
  categoria: string;
  mensajes: number;
}

/**
 * RF-84: lo registrado de WhatsApp, contado por día y por tipo. El detalle ya está en su
 * módulo; a la IA le basta saber cuánto llegó, salvo que se pida comparar (RF-37).
 */
export function resumenDeRegistrados(mensajes: readonly MensajeRegistrado[]): RegistradosDelDia[] {
  const cuenta = new Map<string, RegistradosDelDia>();
  for (const m of mensajes) {
    const categoria = m.categoria ?? 'sin tipo';
    const clave = `${m.dia}|${categoria}`;
    const ya = cuenta.get(clave);
    if (ya) ya.mensajes += 1;
    else cuenta.set(clave, { dia: m.dia, categoria, mensajes: 1 });
  }
  return [...cuenta.values()].sort((a, b) => a.dia.localeCompare(b.dia) || a.categoria.localeCompare(b.categoria));
}

/* ------------------------------------------------------------------------ */
/* La pantalla tipo chat (cambio del 2026-10-22)                             */
/* ------------------------------------------------------------------------ */

export const GRUPOS_DE_FECHA = ['Hoy', 'Ayer', 'Últimos 7 días', 'Anteriores'] as const;
export type GrupoDeFecha = (typeof GRUPOS_DE_FECHA)[number];

/**
 * RF-81: en qué grupo de la barra lateral va una conversación, por su última actividad,
 * con el día de Colombia. «Últimos 7 días» cuenta hoy: va de hace 2 a hace 6 días.
 */
export function grupoDeFecha(iso: string, ahora: number = Date.now()): GrupoDeFecha {
  const dia = fechaDeJornada(Date.parse(iso));
  const hoy = fechaDeJornada(ahora);
  if (dia >= hoy) return 'Hoy';
  if (dia === restarDias(hoy, 1)) return 'Ayer';
  if (dia >= restarDias(hoy, 6)) return 'Últimos 7 días';
  return 'Anteriores';
}

/** RF-81: la lista agrupada, en el orden de los grupos y sin grupos vacíos. Conserva el orden de la lista. */
export function agruparPorFecha<T extends { actualizadaEn: string }>(
  lista: readonly T[],
  ahora: number = Date.now(),
): { grupo: GrupoDeFecha; conversaciones: T[] }[] {
  return GRUPOS_DE_FECHA.map((grupo) => ({
    grupo,
    conversaciones: lista.filter((c) => grupoDeFecha(c.actualizadaEn, ahora) === grupo),
  })).filter((g) => g.conversaciones.length > 0);
}

/** RF-81: el buscador de la barra lateral, por título, sin distinguir mayúsculas ni tildes. */
export function conversacionesQueCoinciden<T extends { titulo: string }>(lista: readonly T[], texto: string): T[] {
  const buscado = normalizar(texto);
  if (!buscado) return [...lista];
  return lista.filter((c) => normalizar(c.titulo).includes(buscado));
}

/**
 * RF-74: preguntas de ejemplo, cada una del módulo que consulta. Van en orden de interés
 * para la gerencia y el residente; el que alcanza un solo módulo recibe las de ese.
 */
const EJEMPLOS: readonly { modulo: ModuloConsultable; pregunta: string }[] = [
  { modulo: 'reportes', pregunta: 'Hágame un reporte de las máquinas de este mes' },
  { modulo: 'cantera', pregunta: '¿Cuántos viajes de cantera hubo la semana pasada y con qué volquetas?' },
  { modulo: 'laboratorio', pregunta: '¿Qué ensayos no cumplieron este mes?' },
  { modulo: 'bitacoras', pregunta: '¿Qué actividades se hicieron ayer en la obra?' },
  { modulo: 'almacen', pregunta: '¿Cuál es el stock de cemento hoy?' },
  { modulo: 'almacen', pregunta: '¿Qué salidas de almacén hubo esta semana y para qué?' },
  { modulo: 'cantera', pregunta: '¿Cuántos m³ salieron de la cantera ayer, por material?' },
  { modulo: 'laboratorio', pregunta: '¿Cuáles fueron las últimas granulometrías y cumplieron?' },
  { modulo: 'whatsapp', pregunta: '¿Qué se reportó ayer por WhatsApp que no quedó registrado?' },
];

export const EJEMPLOS_MAXIMOS = 3;

/** RF-74: hasta 3 ejemplos, solo de los módulos que la persona alcanza. */
export function ejemplosDePregunta(modulos: readonly ModuloConsultable[]): string[] {
  return EJEMPLOS.filter((e) => modulos.includes(e.modulo))
    .slice(0, EJEMPLOS_MAXIMOS)
    .map((e) => e.pregunta);
}
