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
import { diaCorto, esFechaReal, fechaDeJornada, restarDias } from './jornada';
import { diasDe } from './periodos';
import { alcanzaLaEmpresa, esEmpresa, nombreDeEmpresa, type EmpresaId } from './empresas';
import {
  alcanza,
  modulosVisibles,
  rolVeTodasLasObras,
  type ModuloConPermiso,
  type ModulosDeObra,
  type Rol,
} from './permisos';
import { normalizar } from './texto';

/** RF-1: quiénes lo usan. El operador no (RF-2: el asistente no está en el celular). */
export const ROLES_DEL_ASISTENTE: readonly Rol[] = [
  'admin',
  'residente',
  'almacenista',
  'encargado_planta',
  'laboratorista',
  'encargado_occ',
  // Spec 040, RF-12.
  'auxiliar_administrativa',
  // Spec 041.
  'director_proyectos',
  'director_obra',
];

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
  // Spec 040, RF-13 a RF-15: lo de las empresas. No son de una obra: los alcanza quien entra a
  // la empresa (`empresas` del alcance) con el permiso de su pantalla.
  'solicitudes',
  'compras',
  'tesoreria',
  'finanzas',
  'rrhh',
  'documentos',
  'bitacora_empresa',
] as const satisfies readonly ModuloConPermiso[];

export type ModuloConsultable = (typeof MODULOS_CONSULTABLES)[number];

/** Los de la spec 040: los que no dependen de una obra sino de una empresa. */
export type ModuloDeEmpresaConsultable = Extract<
  ModuloConsultable,
  'solicitudes' | 'compras' | 'tesoreria' | 'finanzas' | 'rrhh' | 'documentos' | 'bitacora_empresa'
>;

/** Los de antes de la 040: los de una obra. */
export type ModuloDeObraConsultable = Exclude<ModuloConsultable, ModuloDeEmpresaConsultable>;

/**
 * Spec 040, RF-13 a RF-15: lo de las empresas que cada cargo consulta con el asistente. Es la
 * lista de la spec, no «todo lo que la tabla le deja listar»: el residente, por ejemplo, lista
 * Recursos Humanos y Documentos de su obra, pero RF-15 le da en el asistente solo las
 * solicitudes. Además se cruza con la tabla (`alcanza(…, 'listar')`), que sigue siendo la
 * cerradura: si una fila se cierra, el asistente lo pierde sin tocar esto.
 */
const DE_EMPRESA_DEL_ROL: Record<Rol, readonly ModuloDeEmpresaConsultable[]> = {
  admin: ['solicitudes', 'compras', 'tesoreria', 'finanzas', 'rrhh', 'documentos', 'bitacora_empresa'],
  auxiliar_administrativa: ['compras', 'tesoreria', 'finanzas', 'rrhh', 'documentos'],
  residente: ['solicitudes'],
  // Spec 041: los directores, lo mismo que el residente (RF-59).
  director_proyectos: ['solicitudes'],
  director_obra: ['solicitudes'],
  almacenista: ['solicitudes'],
  encargado_planta: [],
  laboratorista: ['solicitudes', 'bitacora_empresa'],
  encargado_occ: ['solicitudes', 'bitacora_empresa'],
  operador: [],
};

/** Las empresas con lugar propio (Proyectos no lo tiene: son sus obras). */
const EMPRESAS_CONSULTABLES = ['elemental', 'occ', 'geolab'] as const satisfies readonly EmpresaId[];
/**
 * Las que tienen Bitácora de empresa: la de OCC y la de Geolab. La de Geolab no es una bitácora
 * que se arme (038/RF-28): son sus Reportes de WhatsApp, que es lo que su pantalla muestra.
 */
const EMPRESAS_CON_BITACORA = ['occ', 'geolab'] as const satisfies readonly EmpresaId[];

/** Quién pregunta, como lo trae la sesión. */
export interface QuienPregunta {
  rol: Rol;
  /** La obra en uso (la de la pestaña). */
  obraId: string | null;
  /**
   * Spec 041: todas las obras de la persona. El asistente del Director de Obra responde solo de
   * la que tiene en uso (RF-73), pero esta lista dice si tiene otras a las que cambiar. Sin ella
   * vale la obra única, que es lo de antes.
   */
  obras?: readonly string[];
  modulosDeObra: ModulosDeObra;
}

export interface AlcanceDelAsistente {
  /** Si puede usar el asistente (RF-1, RF-2). */
  usa: boolean;
  /** `'todas'` para la gerencia; si no, las obras de la persona, o ninguna (RF-4, RF-10). */
  obras: 'todas' | string[];
  /**
   * 041/RF-73: es un Director de Obra con varias obras, limitado a la que tiene en uso. Con
   * `obras` vacía, no ha abierto ninguna. Con una sola obra no hace falta: no hay a cuál cambiar.
   */
  soloObraEnUso?: boolean;
  /** Los módulos que alcanza, en el orden del menú (RF-3, RF-5). */
  modulos: ModuloConsultable[];
  /**
   * Spec 040 (RF-13 a RF-15): las empresas a las que entra, como en el panel
   * (`alcanzaLaEmpresa`). Lo de una empresa —sus solicitudes, sus cortes, su personal— se
   * consulta solo de estas.
   */
  empresas: EmpresaId[];
  /**
   * Las Bitácoras de empresa que alcanza (spec 038, RF-31; 040, RF-13, RF-15): la de OCC para
   * la gerencia y el Encargado de OCC; la de Geolab para la gerencia y el laboratorista.
   * Antes de la 040 era `bitacoraDeOcc`, solo la de OCC.
   */
  bitacorasDeEmpresa: EmpresaId[];
}

const NADA: AlcanceDelAsistente = { usa: false, obras: [], modulos: [], empresas: [], bitacorasDeEmpresa: [] };

/** Lo de las empresas que alcanza este rol (spec 040), con la tabla como cerradura. */
function deEmpresa(rol: Rol): {
  empresas: EmpresaId[];
  modulos: ModuloDeEmpresaConsultable[];
  bitacorasDeEmpresa: EmpresaId[];
} {
  const empresas: EmpresaId[] = EMPRESAS_CONSULTABLES.filter((e) => alcanzaLaEmpresa(rol, e));
  const modulos = DE_EMPRESA_DEL_ROL[rol].filter((m) => alcanza(rol, m, 'listar'));
  const bitacorasDeEmpresa: EmpresaId[] = modulos.includes('bitacora_empresa')
    ? EMPRESAS_CON_BITACORA.filter((e) => empresas.includes(e))
    : [];
  return { empresas, modulos, bitacorasDeEmpresa };
}

/** Lo que alcanza el asistente para quien pregunta. */
export function alcanceDelAsistente(quien: QuienPregunta): AlcanceDelAsistente {
  if (!ROLES_DEL_ASISTENTE.includes(quien.rol)) return NADA;
  const empresa = deEmpresa(quien.rol);
  // La gerencia, el Encargado de OCC (spec 034, RF-15) y la Auxiliar Administrativa (040) no
  // tienen obra y ven todas, como en sus pantallas; los módulos de obra, los que alcanzan.
  if (rolVeTodasLasObras(quien.rol)) {
    return {
      usa: true,
      obras: 'todas',
      modulos: consultables([...modulosVisibles(quien.rol), ...empresa.modulos]),
      empresas: empresa.empresas,
      bitacorasDeEmpresa: empresa.bitacorasDeEmpresa,
    };
  }
  // RF-10: sin obra no hay nada de una obra a su alcance; lo de su empresa (el laboratorista
  // en Geolab) sí, porque no depende de la obra. El residente sin obra se queda sin nada.
  const todasLasSuyas = quien.obras ?? (quien.obraId ? [quien.obraId] : []);
  // 041/RF-73, RF-74: el Director de Obra pregunta desde una obra y se le responde de esa. Sus
  // módulos son los de esa obra, así que responder de la otra daría módulos que no le tocan allí.
  const esDirectorDeObra = quien.rol === 'director_obra';
  const suyas = esDirectorDeObra ? (quien.obraId ? [quien.obraId] : []) : todasLasSuyas;
  const limite = esDirectorDeObra && todasLasSuyas.length > 1 ? { soloObraEnUso: true } : {};
  if (suyas.length === 0) {
    const conEmpresa = empresa.empresas.length > 0;
    return {
      usa: true,
      obras: [],
      modulos: conEmpresa ? consultables(empresa.modulos) : [],
      empresas: empresa.empresas,
      bitacorasDeEmpresa: empresa.bitacorasDeEmpresa,
      ...limite,
    };
  }
  const visibles: ModuloConPermiso[] = [...modulosVisibles(quien.rol, quien.modulosDeObra), ...empresa.modulos];
  // RF-65: el residente, también vehículos, máquinas y personas de su obra. Desde la 041, el
  // Residente y el Director de Obra, que se repartieron el acceso de antes (RF-55, RF-73); el
  // Director de Proyectos los tiene por la tabla, en la rama de quien ve todas.
  if (quien.rol === 'residente' || esDirectorDeObra) visibles.push('vehiculos', 'personas');
  return {
    usa: true,
    obras: [...suyas],
    modulos: consultables(visibles),
    empresas: empresa.empresas,
    bitacorasDeEmpresa: empresa.bitacorasDeEmpresa,
    ...limite,
  };
}

/**
 * Lo que se le dice al modelo sobre las obras que alcanza quien pregunta. Con el Director de Obra
 * le da además la frase exacta (041/RF-74): la cerradura está en `obraAlAlcance`, y sin esto el
 * modelo contestaba un seco «no está a su alcance» sobre una obra que sí es de la persona (visto
 * en la demo de la T16). La frase vale para cualquier otra obra: no dice si existe ni si es suya.
 */
export function obrasAlcanzadasEnTexto(alcance: AlcanceDelAsistente): string {
  if (alcance.soloObraEnUso) {
    return alcance.obras === 'todas' || alcance.obras.length > 0
      ? 'solo la obra desde la que pregunta. Si pregunta por otra obra, aunque también sea suya, no consulte nada y responda solo: «Desde aquí solo respondo de la obra en uso. Para consultar otra de sus obras, ábrala con “Cambiar de obra” y pregunte desde allá.»'
      : 'ninguna obra por ahora: tiene varias y no ha abierto ninguna. Dígale que abra una con «Cambiar de obra» y pregunte desde allá';
  }
  if (alcance.obras === 'todas') return 'todas las obras';
  if (alcance.obras.length === 0) return 'ninguna obra (no tiene obra asignada)';
  return alcance.obras.length === 1 ? 'una sola obra' : `${alcance.obras.length} obras`;
}

function consultables(modulos: readonly ModuloConPermiso[]): ModuloConsultable[] {
  return MODULOS_CONSULTABLES.filter((m) => modulos.includes(m));
}

/** ¿Alcanza esta empresa? Lo usa cada consulta de una empresa antes de leer (spec 040, RF-16). */
export function empresaAlAlcance(alcance: AlcanceDelAsistente, empresa: EmpresaId): boolean {
  return alcance.empresas.includes(empresa);
}

/** ¿Alcanza esta obra? Lo usa cada consulta antes de leer (RF-4, RF-6). */
export function obraAlAlcance(alcance: AlcanceDelAsistente, obraId: string): boolean {
  return alcance.obras === 'todas' || alcance.obras.includes(obraId);
}

/** Lo que una conversación guardada consultó: para saber si se sigue alcanzando (RF-49). */
export interface LoQueConsulto {
  obras: string[];
  modulos: ModuloConsultable[];
  /** Spec 040: las empresas que consultó. Las conversaciones de antes no las traen. */
  empresas?: EmpresaId[];
}

/**
 * RF-49: una conversación se muestra entera solo si quien la abre sigue alcanzando todas
 * las obras y todos los módulos que consultó. Si no, solo su título y su fecha: el
 * contenido trae cifras de lo que ya no le toca ver. RF-9: se decide con el alcance de hoy.
 */
export function conversacionVisible(consulto: LoQueConsulto, alcance: AlcanceDelAsistente): boolean {
  if (!alcance.usa) return false;
  return (
    consulto.obras.every((obra) => obraAlAlcance(alcance, obra)) &&
    consulto.modulos.every((modulo) => alcance.modulos.includes(modulo)) &&
    (consulto.empresas ?? []).every((empresa) => empresaAlAlcance(alcance, empresa))
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

/** Spec 040 (D9): los formatos en que el asistente entrega un archivo. */
export const FORMATOS_DE_ARCHIVO = ['pdf', 'xlsx', 'docx'] as const;
export type FormatoDeArchivo = (typeof FORMATOS_DE_ARCHIVO)[number];

/**
 * Spec 040, RF-19, RF-24: un archivo que generó el asistente, guardado con la respuesta. Los
 * bytes van al almacén privado (`media` con propósito `archivo_generado`); aquí, lo que la
 * pantalla necesita para la tarjeta y para saber si ya venció (D7: 30 días).
 */
export interface ArchivoDelAsistente {
  mediaId: string;
  nombre: string;
  formato: FormatoDeArchivo;
  /** Las filas de todas sus tablas: lo que dice la tarjeta. */
  filas: number;
  /** ISO, cuando se generó: de aquí salen los 30 días. */
  creadoEn: string;
}

/**
 * Spec 040, RF-27: lo que el asistente pregunta cuando le falta un dato, con las opciones que
 * la persona puede tocar. Tocar una la envía como la siguiente pregunta.
 */
export interface AclaracionDelAsistente {
  pregunta: string;
  opciones: string[];
}

/** RF-27: entre 2 y 6 opciones para tocar; con más, se pregunta en texto. */
export const OPCIONES_DE_ACLARACION = { minimas: 2, maximas: 6 } as const;
/** Una opción es un botón: corta. La pregunta, una o dos frases. */
export const LARGO_DE_UNA_OPCION = 80;
export const LARGO_DE_LA_ACLARACION = 300;

/**
 * RF-27: la aclaración que pidió la IA, limpia (sin espacios de más, sin opciones vacías ni
 * repetidas, sin distinguir mayúsculas ni tildes), o qué le falta para mostrarse. El error va a
 * la IA, que puede corregirla o preguntar en texto.
 */
export function aclaracionDe(pedida: { pregunta: string; opciones: readonly string[] }):
  | { ok: true; aclaracion: AclaracionDelAsistente }
  | { ok: false; error: string } {
  const pregunta = pedida.pregunta.replace(/\s+/g, ' ').trim();
  if (!pregunta) return { ok: false, error: 'La aclaración no trae la pregunta.' };
  if (pregunta.length > LARGO_DE_LA_ACLARACION) {
    return { ok: false, error: `La pregunta de la aclaración pasa de ${LARGO_DE_LA_ACLARACION} caracteres: hágala más corta.` };
  }
  const vistas = new Set<string>();
  const opciones: string[] = [];
  for (const cruda of pedida.opciones) {
    const opcion = cruda.replace(/\s+/g, ' ').trim();
    const clave = normalizar(opcion);
    if (!opcion || vistas.has(clave)) continue;
    if (opcion.length > LARGO_DE_UNA_OPCION) {
      return { ok: false, error: `La opción «${opcion.slice(0, 40)}…» pasa de ${LARGO_DE_UNA_OPCION} caracteres: use el nombre corto.` };
    }
    vistas.add(clave);
    opciones.push(opcion);
  }
  const { minimas, maximas } = OPCIONES_DE_ACLARACION;
  if (opciones.length < minimas) {
    return { ok: false, error: `Una aclaración necesita al menos ${minimas} opciones distintas. Si hay una sola, úsela sin preguntar.` };
  }
  if (opciones.length > maximas) {
    return {
      ok: false,
      error: `Hay ${opciones.length} opciones y caben ${maximas}. Pregunte en texto, sin pedir_aclaracion, o agrupe las opciones.`,
    };
  }
  return { ok: true, aclaracion: { pregunta, opciones } };
}

/**
 * RF-27: lo que queda de una aclaración en el historial que se le manda a la IA en la
 * pregunta siguiente: la pregunta con sus opciones, para que entienda la que se tocó.
 */
export function aclaracionEnElHistorial(texto: string, aclaracion: AclaracionDelAsistente | null): string {
  if (!aclaracion) return texto;
  return `${texto}\n\nOpciones: ${aclaracion.opciones.map((o) => `«${o}»`).join(', ')}.`;
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
] as const satisfies readonly ModuloDeObraConsultable[];

/**
 * RF-83: de los módulos con anulados, los que alcanza la persona. Con esto se le describe
 * a la IA la consulta de anulados: lo que no alcanza, ni lo nombra.
 */
export function modulosDeAnulados(modulos: readonly ModuloConsultable[]): (typeof MODULOS_CON_ANULADOS)[number][] {
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
 * RF-74 (028) y RF-26 (040): preguntas de ejemplo, cada una de lo que consulta. Lo que el
 * asistente alcanza ya depende del cargo, así que los ejemplos salen del alcance: la gerencia y
 * la auxiliar ven las de Compras, el residente las de su obra, el Encargado de OCC la Bitácora
 * de OCC. Van en orden de interés; `archivo` marca los que piden un PDF, un Excel o un Word.
 */
interface Ejemplo {
  modulo: ModuloConsultable;
  pregunta: string;
  archivo?: true;
  /** Solo si alcanza la Bitácora de esta empresa. */
  bitacoraDe?: EmpresaId;
  /** Solo si no lleva la bandeja de Compras (las solicitudes de su lugar). */
  sinBandeja?: true;
}

const EJEMPLOS: readonly Ejemplo[] = [
  { modulo: 'compras', pregunta: '¿Qué compras están por aprobar?' },
  { modulo: 'reportes', pregunta: 'Hágame un reporte de las máquinas de este mes' },
  { modulo: 'tesoreria', pregunta: '¿Qué solicitudes de pago están aprobadas y sin pagar?' },
  { modulo: 'cantera', pregunta: '¿Cuántos viajes de cantera hubo la semana pasada y con qué volquetas?' },
  { modulo: 'laboratorio', pregunta: '¿Qué ensayos no cumplieron este mes?' },
  { modulo: 'bitacoras', pregunta: '¿Qué actividades se hicieron ayer en la obra?' },
  { modulo: 'bitacora_empresa', bitacoraDe: 'occ', pregunta: '¿Qué se hizo ayer según la Bitácora de OCC?' },
  { modulo: 'almacen', pregunta: '¿Cuál es el stock de cemento hoy?' },
  { modulo: 'almacen', pregunta: '¿Qué salidas de almacén hubo esta semana y para qué?' },
  { modulo: 'cantera', pregunta: '¿Cuántos m³ salieron de la cantera ayer, por material?' },
  { modulo: 'laboratorio', pregunta: '¿Cuáles fueron las últimas granulometrías y cumplieron?' },
  { modulo: 'whatsapp', pregunta: '¿Qué se reportó ayer por WhatsApp que no quedó registrado?' },
  { modulo: 'rrhh', pregunta: '¿Quién tiene el contrato por terminar o documentos vencidos?' },
  { modulo: 'documentos', pregunta: '¿Qué documentos están vencidos o por vencer?' },
  { modulo: 'finanzas', pregunta: '¿Cuál es el último corte financiero de cada empresa?' },
  { modulo: 'bitacora_empresa', bitacoraDe: 'geolab', pregunta: '¿Qué ensayos registró Geolab en las obras esta semana?' },
  { modulo: 'solicitudes', sinBandeja: true, pregunta: '¿En qué van las solicitudes de compra de este mes?' },
  // Los que piden un archivo (040, RF-26): va el primero que alcance.
  { modulo: 'compras', archivo: true, pregunta: 'Hágame un Excel de las compras por aprobar' },
  { modulo: 'reportes', archivo: true, pregunta: 'Hágame un Excel de las horas del personal de esta semana' },
  { modulo: 'bitacoras', archivo: true, pregunta: 'Hágame un PDF de la bitácora de esta semana' },
  { modulo: 'almacen', archivo: true, pregunta: 'Hágame un Excel de las salidas de almacén de este mes' },
  { modulo: 'cantera', archivo: true, pregunta: 'Hágame un Excel de los viajes de cantera de esta semana' },
  { modulo: 'laboratorio', archivo: true, pregunta: 'Hágame un PDF de los ensayos de este mes' },
  { modulo: 'bitacora_empresa', bitacoraDe: 'occ', archivo: true, pregunta: 'Hágame un PDF de la Bitácora de OCC de ayer' },
  { modulo: 'rrhh', archivo: true, pregunta: 'Hágame un Excel del personal con sus contratos' },
  { modulo: 'solicitudes', sinBandeja: true, archivo: true, pregunta: 'Hágame un Excel de las solicitudes de compra de este mes' },
];

export const EJEMPLOS_MAXIMOS = 3;

function ejemploAlAlcance(e: Ejemplo, alcance: AlcanceDelAsistente): boolean {
  if (!alcance.modulos.includes(e.modulo)) return false;
  if (e.bitacoraDe && !alcance.bitacorasDeEmpresa.includes(e.bitacoraDe)) return false;
  if (e.sinBandeja && alcance.modulos.includes('compras')) return false;
  return true;
}

/**
 * RF-74 y 040/RF-26: hasta 3 ejemplos de lo que la persona alcanza. Si alcanza alguno que pida
 * un archivo, el último es ese, para que se vea que el asistente también los arma.
 */
export function ejemplosDePregunta(alcance: AlcanceDelAsistente): string[] {
  const suyos = EJEMPLOS.filter((e) => ejemploAlAlcance(e, alcance));
  const archivo = suyos.find((e) => e.archivo);
  const preguntas = suyos.filter((e) => !e.archivo).slice(0, archivo ? EJEMPLOS_MAXIMOS - 1 : EJEMPLOS_MAXIMOS);
  return [...preguntas, ...(archivo ? [archivo] : [])].map((e) => e.pregunta);
}

/* ------------------------------------------------------------------------ */
/* Lo que puede consultar y lo que está consultando (spec 040)               */
/* ------------------------------------------------------------------------ */

/** Cómo se nombra cada módulo de obra en la frase «De su obra: …», en el orden del menú. */
const MODULO_DE_OBRA_EN_CORTO: Record<ModuloDeObraConsultable, string> = {
  bitacoras: 'bitácoras',
  preoperacionales: 'preoperacionales',
  almacen: 'almacén',
  cantera: 'Control Cantera',
  laboratorio: 'laboratorio',
  whatsapp: 'lo que llega por WhatsApp',
  reportes: 'reportes',
  contrato: 'contrato y presupuesto',
  vehiculos: 'vehículos',
  personas: 'personas',
};

/** «a, b y c». */
function enLista(partes: readonly string[]): string {
  if (partes.length <= 1) return partes.join('');
  return `${partes.slice(0, -1).join(', ')} y ${partes[partes.length - 1]}`;
}

/**
 * RF-25: lo que puede consultar, en frases cortas, para el inicio del asistente. Sale del
 * alcance, así que dice solo lo que de verdad responde: un módulo apagado en su obra no sale.
 * Vacía si no alcanza nada.
 */
export function loQueConsulta(alcance: AlcanceDelAsistente): string[] {
  if (!alcance.usa) return [];
  const m = (modulo: ModuloConsultable) => alcance.modulos.includes(modulo);
  const frases: string[] = [];

  const deObra = MODULOS_CONSULTABLES.filter(
    (x): x is ModuloDeObraConsultable => x in MODULO_DE_OBRA_EN_CORTO && m(x),
  );
  // A quien de las obras solo alcanza las personas (la auxiliar) no se le abre con «De las
  // obras: personas.»: lo suyo es lo del grupo, y las personas van al final, en una frase.
  const soloPersonas = deObra.length === 1 && deObra[0] === 'personas';
  if (deObra.length > 0 && !soloPersonas) {
    const cuales = enLista(deObra.map((x) => MODULO_DE_OBRA_EN_CORTO[x]));
    frases.push(`${alcance.obras === 'todas' ? 'De las obras' : 'De su obra'}: ${cuales}.`);
  }
  if (m('compras')) frases.push('Las compras del grupo: qué falta aprobar, comprar o recibir.');
  else if (m('solicitudes')) frases.push('Sus solicitudes de compra y de pago, y en qué van.');
  if (m('tesoreria')) frases.push('Las solicitudes de pago y los pagos del grupo.');
  if (m('finanzas')) frases.push('Los cortes financieros: saldos y cuentas por pagar y por cobrar.');
  if (m('rrhh')) frases.push('El personal: fichas, contratos y documentos por vencer.');
  if (m('documentos')) frases.push('Los documentos y sus vencimientos.');
  if (m('bitacora_empresa') && alcance.bitacorasDeEmpresa.length > 0) {
    const cuales = alcance.bitacorasDeEmpresa.map((e, i) => `${i === 0 ? 'La' : 'la'} Bitácora de ${nombreDeEmpresa(e)}`);
    frases.push(`${enLista(cuales)}.`);
  }
  if (soloPersonas) frases.push(`Las personas registradas en ${alcance.obras === 'todas' ? 'las obras' : 'su obra'}.`);
  return frases;
}

/**
 * RF-25: de qué responde, para el título y el saludo del asistente: «de su obra», «del grupo»,
 * «de OCC y las obras», «de Geolab y su obra». Quien entra a Elemental (la gerencia y la
 * auxiliar) responde sobre el grupo. Vacío si no alcanza nada.
 */
export function ambitoDelAsistente(alcance: AlcanceDelAsistente): string {
  if (!alcance.usa) return '';
  if (alcance.empresas.includes('elemental')) return 'del grupo';
  const partes = alcance.empresas.map(nombreDeEmpresa);
  if (alcance.obras === 'todas') partes.push('las obras');
  else if (alcance.obras.length > 0) partes.push('su obra');
  return partes.length > 0 ? `de ${enLista(partes)}` : '';
}

/** Cómo se nombra en corto lo de cada módulo de empresa, para el recuadro del Inicio. */
const MODULO_DE_EMPRESA_EN_CORTO: Record<ModuloDeEmpresaConsultable, string> = {
  solicitudes: 'solicitudes',
  compras: 'compras',
  tesoreria: 'pagos',
  finanzas: 'cortes financieros',
  rrhh: 'personal',
  documentos: 'documentos',
  bitacora_empresa: 'Bitácora',
};

/** En el recuadro, hasta estos temas; si hay más, termina en «…». */
const TEMAS_DEL_RECUADRO = 5;

/**
 * RF-25: lo mismo que `loQueConsulta`, en una frase para el recuadro del Inicio: «Pregunte en
 * español sobre su obra: bitácoras, reportes, solicitudes… La respuesta dice de dónde sale cada
 * cifra.». Lo de la empresa va primero para quien lleva el grupo, y lo de la obra para los demás.
 */
export function resumenDeLoQueConsulta(alcance: AlcanceDelAsistente): string {
  const ambito = ambitoDelAsistente(alcance);
  const m = (modulo: ModuloConsultable) => alcance.modulos.includes(modulo);
  const deObra = MODULOS_CONSULTABLES.filter((x): x is ModuloDeObraConsultable => x in MODULO_DE_OBRA_EN_CORTO && m(x)).map(
    (x) => MODULO_DE_OBRA_EN_CORTO[x],
  );
  const deEmpresa = MODULOS_CONSULTABLES.filter((x): x is ModuloDeEmpresaConsultable => x in MODULO_DE_EMPRESA_EN_CORTO && m(x))
    .filter((x) => !(x === 'solicitudes' && m('compras')))
    .map((x) => MODULO_DE_EMPRESA_EN_CORTO[x]);
  const temas = alcance.empresas.includes('elemental') ? [...deEmpresa, ...deObra] : [...deObra, ...deEmpresa];
  if (temas.length === 0) return '';
  const lista = temas.length > TEMAS_DEL_RECUADRO ? `${temas.slice(0, TEMAS_DEL_RECUADRO).join(', ')}…` : `${enLista(temas)}.`;
  // «del grupo» → «sobre el grupo»; «de su obra» → «sobre su obra».
  const sobre = ambito ? ambito.replace(/^del /, 'el ').replace(/^de /, '') : 'lo suyo';
  return `Pregunte en español sobre ${sobre}: ${lista} La respuesta dice de dónde sale cada cifra.`;
}

const NOMBRE_DEL_FORMATO: Record<FormatoDeArchivo, string> = { pdf: 'el PDF', xlsx: 'el Excel', docx: 'el Word' };

const PESTANA_DEL_REPORTE: Record<string, string> = {
  maquinas: 'el reporte de máquinas',
  mantenimiento: 'el reporte de mantenimiento',
  personal: 'el reporte del personal',
  actividades: 'el reporte de actividades',
  cantera: 'el reporte de cantera',
  calidad: 'el reporte de calidad',
  clima: 'el reporte del clima',
};

/** Lo que lee cada consulta del asistente, para la espera (RF-29). */
const LO_QUE_LEE: Record<string, string> = {
  obras_a_mi_alcance: 'Revisando sus obras',
  reporte: 'Leyendo los Reportes',
  bitacora_del_dia: 'Leyendo la bitácora',
  bitacora_de_empresa: 'Leyendo la Bitácora de la empresa',
  solicitudes_de_compra: 'Leyendo las solicitudes de compra',
  solicitudes_de_pago: 'Leyendo las solicitudes de pago',
  cortes_financieros: 'Leyendo los cortes financieros',
  recursos_humanos: 'Leyendo el personal de Recursos Humanos',
  documentos_del_grupo: 'Leyendo los documentos',
  viajes_de_cantera: 'Leyendo los viajes de cantera',
  ensayos: 'Leyendo los ensayos',
  almacen: 'Leyendo el almacén',
  preoperacionales: 'Leyendo los preoperacionales',
  vehiculos_y_medidores: 'Leyendo los vehículos y sus medidores',
  personas_de_la_obra: 'Leyendo las personas de la obra',
  contrato_y_presupuesto: 'Leyendo el contrato y el presupuesto',
  anulados: 'Buscando lo anulado',
  mensajes_de_whatsapp: 'Leyendo los mensajes de WhatsApp',
  pedir_aclaracion: 'Preparando una pregunta',
};

const MESES = [
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

/** Un texto `YYYY-MM-DD` que existe; si no, nada (texto vacío = no aplica). */
function fechaDe(valor: unknown): string | null {
  return typeof valor === 'string' && esFechaReal(valor) ? valor : null;
}

/** El último día del mes de una fecha. */
function ultimoDelMes(fecha: string): string {
  const [anio, mes] = fecha.split('-').map(Number);
  const dias = new Date(Date.UTC(anio, mes, 0)).getUTCDate();
  return `${fecha.slice(0, 8)}${String(dias).padStart(2, '0')}`;
}

/**
 * El periodo de una consulta en palabras: «de hoy», «de ayer», «del 14-oct», «de octubre»,
 * «del 1-oct al 15-oct». El año solo si no es el de hoy. Vacío sin fechas.
 */
export function periodoEnPalabras(desde: string | null, hasta: string | null, hoy: string): string {
  const inicio = desde ?? hasta;
  const fin = hasta ?? desde;
  if (!inicio || !fin) return '';
  const otroAnio = (f: string) => f.slice(0, 4) !== hoy.slice(0, 4);
  const dia = (f: string) => `${diaCorto(f)}${otroAnio(f) ? `-${f.slice(0, 4)}` : ''}`;
  if (inicio === fin) {
    if (inicio === hoy) return 'de hoy';
    if (inicio === restarDias(hoy, 1)) return 'de ayer';
    return `del ${dia(inicio)}`;
  }
  if (inicio.endsWith('-01') && fin === ultimoDelMes(inicio)) {
    const mes = MESES[Number(inicio.slice(5, 7)) - 1];
    return `de ${mes}${otroAnio(inicio) ? ` de ${inicio.slice(0, 4)}` : ''}`;
  }
  return `del ${dia(inicio)} al ${dia(fin)}`;
}

/**
 * RF-29: lo que el asistente dice mientras una consulta trabaja: «Leyendo las solicitudes de
 * compra de octubre…», «Armando el Excel «Compras por aprobar»…». Sale del nombre de la
 * consulta y de lo que pidió la IA; con una consulta que no conoce, «Consultando…».
 */
export function descripcionDeLaConsulta(
  nombre: string,
  entrada: unknown,
  hoy: string = fechaDeJornada(Date.now()),
): string {
  const e = (entrada && typeof entrada === 'object' ? entrada : {}) as Record<string, unknown>;
  const texto = (clave: string) => (typeof e[clave] === 'string' ? (e[clave] as string).trim() : '');

  if (nombre === 'generar_archivo') {
    const formato = NOMBRE_DEL_FORMATO[texto('formato') as FormatoDeArchivo] ?? 'el archivo';
    const titulo = texto('titulo');
    return `Armando ${formato}${titulo ? ` «${titulo}»` : ''}…`;
  }
  if ((nombre === 'solicitudes_de_compra' || nombre === 'solicitudes_de_pago') && texto('numero')) {
    return `Leyendo la solicitud ${texto('numero')}…`;
  }
  if (nombre === 'recursos_humanos' && texto('persona')) return `Leyendo la ficha de ${texto('persona')}…`;

  let que = LO_QUE_LEE[nombre];
  if (!que) return 'Consultando…';
  if (nombre === 'reporte' && PESTANA_DEL_REPORTE[texto('pestana')]) que = `Leyendo ${PESTANA_DEL_REPORTE[texto('pestana')]}`;
  const empresa = texto('empresa');
  if (nombre === 'bitacora_de_empresa' && esEmpresa(empresa)) que = `Leyendo la Bitácora de ${nombreDeEmpresa(empresa)}`;

  const periodo = periodoEnPalabras(fechaDe(e.desde) ?? fechaDe(e.fecha), fechaDe(e.hasta) ?? fechaDe(e.fecha), hoy);
  return `${que}${periodo ? ` ${periodo}` : ''}…`;
}

/**
 * Lo que se le dice a la IA cuando se pregunta desde una obra (spec 033, RF-30): que
 * responda sobre esa obra salvo que la pregunta nombre otra. Es una indicación y no un
 * filtro: quien alcanza varias obras puede seguir preguntando por cualquiera, y quien
 * alcanza una ya solo tiene esa (el alcance no cambia).
 */
export function indicacionDeObraPorDefecto(obra: { id: string; nombre: string } | null): string {
  if (!obra) return '';
  return (
    `Pregunta desde la obra «${obra.nombre}» (id ${obra.id}). Si la pregunta no nombra otra obra, ` +
    'responda sobre esta y consulte con su id.'
  );
}
