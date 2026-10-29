/**
 * El grupo empresarial (spec 033): las cuatro empresas, el menú de cada una y quién
 * entra a cuál.
 *
 * El panel deja de tener un solo menú: gerencia elige una empresa en las tarjetas del
 * Inicio y ve solo lo de esa empresa. Las pantallas son las mismas de antes; lo que
 * cambia es cómo se reparten. Qué puede hacer cada rol lo sigue decidiendo
 * `rules/permisos.ts` (RF-21): aquí solo se dice qué entrada va en qué menú.
 *
 * Puro y sin I/O, como toda regla, para poder comprobarlo desde Node.
 */

import {
  alcanza,
  moduloApagado,
  TODOS_LOS_MODULOS,
  type ModuloConPermiso,
  type ModulosDeObra,
  type Rol,
} from './permisos';
import type { CategoriaDeWhatsapp } from './whatsapp';

/** Las cuatro, fijas (RF-1; crear o quitar empresas está fuera de alcance). */
export const EMPRESAS = [
  {
    id: 'elemental',
    nombre: 'Elemental Ingeniería y Arquitectura',
    funcion: 'La parte administrativa del grupo.',
  },
  { id: 'occ', nombre: 'OCC', funcion: 'Los vehículos y la maquinaria de las obras.' },
  { id: 'geolab', nombre: 'Geolab', funcion: 'El laboratorio de las obras.' },
  { id: 'proyectos', nombre: 'Proyectos', funcion: 'Las obras, cada una por consorcio.' },
] as const;

export type EmpresaId = (typeof EMPRESAS)[number]['id'];

export const IDS_DE_EMPRESA: readonly EmpresaId[] = EMPRESAS.map((e) => e.id);

/**
 * Las que llevan corte financiero propio (RF-34, cambio del 2026-10-27). Proyectos no:
 * sus cortes son los de sus obras, y con uno propio el total del Consolidado contaría
 * dos veces.
 */
export const EMPRESAS_CON_CORTE: readonly EmpresaId[] = ['elemental', 'occ', 'geolab'];

export function esEmpresa(texto: string | null | undefined): texto is EmpresaId {
  return (IDS_DE_EMPRESA as readonly string[]).includes(texto ?? '');
}

export function nombreDeEmpresa(id: EmpresaId): string {
  return EMPRESAS.find((e) => e.id === id)!.nombre;
}

/**
 * Una entrada del menú de una empresa o de una obra.
 *
 * `pagina` es el último tramo de la ruta (`/panel/occ/<pagina>`,
 * `/panel/proyectos/<obra>/<pagina>`). `permiso` es la fila de la tabla de permisos que
 * decide si el rol la ve: el menú reparte, no da permisos (RF-21).
 */
export interface EntradaDelMenu {
  pagina: string;
  titulo: string;
  permiso: ModuloConPermiso;
  /** Otra aplicación, que se abre en una pestaña nueva en vez de una página del panel. */
  externa?: string;
}

const e = (pagina: string, titulo: string, permiso: ModuloConPermiso): EntradaDelMenu => ({
  pagina,
  titulo,
  permiso,
});

/** El asistente va en todos los menús (RF-29, RF-50). */
const ASISTENTE = e('asistente', 'Asistente', 'asistente');

/** LicitApp, en el mismo VPS (RF-49). */
export const DIRECCION_DE_LICITAPP = 'https://licitapp-elementaling.cloud/';

/** Pedir compras y pagos: en OCC, en Geolab y en cada obra (RF-51). */
const SOLICITUDES = [
  e('solicitudes-compra', 'Solicitudes de compra', 'solicitudes'),
  e('solicitudes-pago', 'Solicitudes de pago', 'solicitudes'),
];

/**
 * RF-13 a RF-15, en el orden de la spec (menús definitivos, cambio del 2026-10-27).
 * Proyectos no tiene menú propio: tiene obras.
 *
 * Elemental presta los servicios administrativos del grupo: Personas y Obras van dentro
 * de su Recursos Humanos, y la información financiera, dentro de Tesorería (spec 037).
 */
const MENUS: Record<Exclude<EmpresaId, 'proyectos'>, readonly EntradaDelMenu[]> = {
  elemental: [
    e('recursos-humanos', 'Recursos Humanos', 'rrhh'),
    e('compras', 'Compras', 'compras'),
    e('tesoreria', 'Tesorería', 'tesoreria'),
    e('documentos', 'Documentos', 'documentos'),
    { ...e('licitaciones', 'Licitaciones', 'licitaciones'), externa: DIRECCION_DE_LICITAPP },
    ASISTENTE,
  ],
  occ: [
    e('whatsapp', 'Reportes de WhatsApp', 'whatsapp'),
    e('bitacora', 'Bitácora', 'bitacoras'),
    e('documentos', 'Documentos', 'documentos'),
    // Spec 035, RF-3: el personal de OCC, de consulta.
    e('recursos-humanos', 'Recursos Humanos', 'rrhh'),
    e('reportes', 'Reportes de vehículos y maquinaria', 'reportes'),
    e('vehiculos', 'Vehículos', 'vehiculos'),
    e('preoperacionales', 'Preoperacionales', 'preoperacionales'),
    e('asignaciones', 'Asignaciones', 'asignaciones'),
    ...SOLICITUDES,
    ASISTENTE,
  ],
  geolab: [
    e('bitacora', 'Bitácora', 'bitacoras'),
    e('whatsapp', 'Reportes de WhatsApp', 'whatsapp'),
    e('laboratorio', 'Laboratorio', 'laboratorio'),
    e('reportes', 'Reportes de laboratorio', 'reportes'),
    e('documentos', 'Documentos', 'documentos'),
    // Spec 035, RF-3: el personal de Geolab, de consulta.
    e('recursos-humanos', 'Recursos Humanos', 'rrhh'),
    ...SOLICITUDES,
    ASISTENTE,
  ],
};

/**
 * RF-17, igual para todas las obras. La portada de la obra es el resumen del día (el
 * Inicio de antes). Calidad es el Laboratorio de la obra, con su mismo interruptor.
 *
 * Preoperacionales y Asignaciones también van aquí (cambio del 2026-10-27, decisión del
 * usuario): el residente los tenía y solo entra a su obra; sin ellos en este menú los
 * perdía, y RF-21 dice que cada rol sigue viendo lo de hoy.
 */
const MENU_DE_OBRA: readonly EntradaDelMenu[] = [
  e('bitacoras', 'Bitácoras', 'bitacoras'),
  e('whatsapp', 'Reportes de WhatsApp', 'whatsapp'),
  e('reportes', 'Reportes e informes', 'reportes'),
  e('recursos-humanos', 'Recursos Humanos', 'rrhh'),
  e('calidad', 'Calidad', 'laboratorio'),
  e('almacen', 'Almacén', 'almacen'),
  e('preoperacionales', 'Preoperacionales', 'preoperacionales'),
  e('asignaciones', 'Asignaciones', 'asignaciones'),
  e('cantera', 'Control Cantera', 'cantera'),
  e('contrato', 'Contrato y Presupuesto', 'contrato'),
  // Spec 034, RF-2: los documentos de la obra, después de los del contrato, que siguen allí.
  e('documentos', 'Documentos', 'documentos'),
  ...SOLICITUDES,
  ASISTENTE,
];

/** El menú de Elemental, OCC o Geolab que ve este rol (RF-13 a RF-15, RF-21, RF-29). */
export function menuDeEmpresa(empresa: Exclude<EmpresaId, 'proyectos'>, rol: Rol): EntradaDelMenu[] {
  return MENUS[empresa].filter((entrada) => alcanza(rol, entrada.permiso, 'ver'));
}

/**
 * El menú de una obra de Proyectos (RF-17, RF-18, RF-21): lo que el rol ve, sin los
 * módulos que la obra tiene apagados (spec 017). Dentro de una obra el apagado vale
 * también para la gerencia: es esa obra la que no los lleva.
 */
export function menuDeObra(rol: Rol, modulos: ModulosDeObra = TODOS_LOS_MODULOS): EntradaDelMenu[] {
  return MENU_DE_OBRA.filter(
    (entrada) => alcanza(rol, entrada.permiso, 'ver') && !moduloApagado(entrada.permiso, modulos),
  );
}

/**
 * A qué empresas entra cada rol (RF-12). Gerencia a todas; quien trabaja en una obra, a
 * Proyectos (y ahí solo a su obra: `alcanzaLaObraDeLaRuta`); el laboratorista, a Geolab;
 * el Encargado de OCC, a OCC (spec 034, RF-14); la auxiliar de RR. HH., a Elemental (035).
 */
const EMPRESAS_DEL_ROL: Record<Rol, readonly EmpresaId[]> = {
  admin: IDS_DE_EMPRESA,
  supervisor: ['proyectos'],
  almacenista: ['proyectos'],
  encargado_planta: ['proyectos'],
  laboratorista: ['geolab'],
  encargado_occ: ['occ'],
  auxiliar_rrhh: ['elemental'],
  operador: [],
};

export function alcanzaLaEmpresa(rol: Rol, empresa: EmpresaId): boolean {
  return EMPRESAS_DEL_ROL[rol].includes(empresa);
}

/**
 * ¿Puede abrir esta obra de Proyectos? (RF-12). Gerencia, cualquiera; los demás, solo la
 * suya. La API lo vuelve a comprobar con `alcance.ts`: esto decide qué se pinta.
 */
export function alcanzaLaObraDeLaRuta(persona: { rol: Rol; obraId: string | null }, obraId: string): boolean {
  if (!alcanzaLaEmpresa(persona.rol, 'proyectos')) return false;
  if (persona.rol === 'admin') return true;
  return persona.obraId === obraId;
}

/** Lo que se le dice a quien abre una empresa o una obra que no es suya (RF-12). */
export const SIN_ACCESO = 'No tienes acceso a esta sección';

/**
 * La empresa de una persona (RF-45, RF-46): la que se le eligió o, si no tiene, la de su
 * rol. Se calcula al leer y no se rellena en la base, porque las personas que crea
 * WhatsApp (spec 026) nacen sin ella.
 */
const EMPRESA_DEL_ROL: Record<Rol, EmpresaId> = {
  admin: 'elemental',
  operador: 'occ',
  laboratorista: 'geolab',
  encargado_occ: 'occ',
  auxiliar_rrhh: 'elemental',
  supervisor: 'proyectos',
  almacenista: 'proyectos',
  encargado_planta: 'proyectos',
};

export function empresaDeLaPersona(empresa: string | null | undefined, rol: Rol): EmpresaId {
  return esEmpresa(empresa) ? empresa : EMPRESA_DEL_ROL[rol];
}

/**
 * Los accesos que son de una empresa y no llevan obra, porque ven lo de todas: el
 * Encargado de OCC (spec 034, RF-13, RF-14) y la auxiliar de Recursos Humanos, de
 * Elemental (spec 035, RF-8).
 */
const ACCESOS_SIN_OBRA: Partial<Record<Rol, { empresa: EmpresaId; deEmpresa: string; quien: string; porque: string }>> = {
  encargado_occ: { empresa: 'occ', deEmpresa: 'OCC', quien: 'El Encargado de OCC', porque: 'en OCC ve las de todas' },
  auxiliar_rrhh: {
    empresa: 'elemental',
    deEmpresa: 'Elemental',
    quien: 'La auxiliar de Recursos Humanos',
    porque: 'en Elemental lleva el personal de todas',
  },
};

/** La empresa que le toca a un acceso sin obra, o `null` si el rol no es uno de ellos. */
export function empresaDelAccesoSinObra(rol: Rol): EmpresaId | null {
  return ACCESOS_SIN_OBRA[rol]?.empresa ?? null;
}

/**
 * Por qué no puede quedar así un acceso sin obra (`ACCESOS_SIN_OBRA`), o `null`: es de su
 * empresa y no lleva obra. Se mira la persona **como quedaría** —el alta, o lo que ya tenía
 * más los cambios—. Para los demás roles, nada.
 */
export function reparoDelAccesoSinObra(persona: {
  rol: Rol;
  obraId: string | null;
  empresa: string | null;
}): { campo: 'obraId' | 'empresa'; mensaje: string } | null {
  const acceso = ACCESOS_SIN_OBRA[persona.rol];
  if (!acceso) return null;
  if (persona.obraId) return { campo: 'obraId', mensaje: `${acceso.quien} no lleva obra: ${acceso.porque}.` };
  if (persona.empresa && persona.empresa !== acceso.empresa) {
    return { campo: 'empresa', mensaje: `${acceso.quien} es de ${acceso.deEmpresa}.` };
  }
  return null;
}

/* ── Rutas ─────────────────────────────────────────────────────────────── */

/** `/panel/<empresa>/<pagina>`, o la portada de la empresa sin página. */
export function rutaDeEmpresa(empresa: EmpresaId, pagina?: string): string {
  return pagina ? `/panel/${empresa}/${pagina}` : `/panel/${empresa}`;
}

/** `/panel/proyectos/<obra>/<pagina>`, o la portada de la obra sin página. */
export function rutaDeObra(obraId: string, pagina?: string): string {
  const base = `/panel/proyectos/${encodeURIComponent(obraId)}`;
  return pagina ? `${base}/${pagina}` : base;
}

/** La lista de obras de Proyectos; con `ir`, la página a la que se va al elegir una. */
export function rutaDeProyectos(ir?: string): string {
  return ir ? `/panel/proyectos?ir=${encodeURIComponent(ir)}` : '/panel/proyectos';
}

/**
 * A dónde entra cada rol al iniciar sesión (RF-6 a RF-9).
 *
 * `obras` son las obras de la persona. Hoy es una o ninguna (`usuarios.obra_id`); con
 * varias se le muestra la lista (RF-7), y sin ninguna también: allí se le dice «No
 * tienes obras asignadas; pide acceso a gerencia». `null` es que no entra al panel (el
 * operador).
 */
export function destinoAlEntrar(persona: { rol: Rol; obras: readonly string[] }): string | null {
  const unaObra = persona.obras.length === 1 ? persona.obras[0] : null;
  switch (persona.rol) {
    case 'admin':
      return '/panel';
    case 'laboratorista':
      return rutaDeEmpresa('geolab', 'laboratorio');
    case 'encargado_occ':
      // Spec 034, RF-14: sin tarjetas; su lugar es OCC, que abre en su primera página.
      return rutaDeEmpresa('occ');
    case 'auxiliar_rrhh':
      // Spec 035, RF-9: directo a Recursos Humanos de Elemental, sin tarjetas.
      return rutaDeEmpresa('elemental', 'recursos-humanos');
    case 'supervisor':
      // La portada de la obra es el resumen del día, el Inicio de antes.
      return unaObra ? rutaDeObra(unaObra) : rutaDeProyectos();
    case 'almacenista':
      return unaObra ? rutaDeObra(unaObra, 'almacen') : rutaDeProyectos();
    case 'encargado_planta':
      return unaObra ? rutaDeObra(unaObra, 'cantera') : rutaDeProyectos();
    case 'operador':
      return null;
  }
}

/**
 * Recursos Humanos de un lugar al que la persona entra: su empresa, si el menú se la da
 * (el Encargado en OCC, el laboratorista en Geolab), o su obra (el residente). `null` si no
 * la ve en ninguno.
 */
function recursosHumanosDe(persona: { rol: Rol; obraId: string | null }): string | null {
  for (const empresa of EMPRESAS_DEL_ROL[persona.rol]) {
    if (empresa !== 'proyectos' && menuDeEmpresa(empresa, persona.rol).some((e) => e.pagina === 'recursos-humanos')) {
      return rutaDeEmpresa(empresa, 'recursos-humanos');
    }
  }
  const enObra = persona.obraId && alcanzaLaEmpresa(persona.rol, 'proyectos');
  if (enObra && menuDeObra(persona.rol, TODOS_LOS_MODULOS).some((e) => e.pagina === 'recursos-humanos')) {
    return rutaDeObra(persona.obraId as string, 'recursos-humanos');
  }
  return null;
}

/**
 * Dónde quedó cada pantalla de antes (RF-47). `obra` es que vive dentro de una obra de
 * Proyectos; si no, la empresa y la página. Las que dependen del rol se resuelven en
 * `rutaNueva`.
 */
const PANTALLAS_DE_ANTES: Record<
  string,
  { obra: string } | { empresa: EmpresaId; pagina: string; pestana?: string }
> = {
  // Las dos, en Recursos Humanos de Elemental (cambio del 2026-10-27).
  obras: { empresa: 'elemental', pagina: 'recursos-humanos', pestana: 'obras' },
  // Spec 035: Recursos Humanos abre en «Personal»; Personas de antes, en su pestaña.
  personas: { empresa: 'elemental', pagina: 'recursos-humanos', pestana: 'personas' },
  vehiculos: { empresa: 'occ', pagina: 'vehiculos' },
  // Gerencia, a OCC (todas las obras); los demás, a su obra (ver `rutaNueva`).
  asignaciones: { obra: 'asignaciones' },
  preoperacionales: { obra: 'preoperacionales' },
  bitacoras: { obra: 'bitacoras' },
  almacen: { obra: 'almacen' },
  cantera: { obra: 'cantera' },
  whatsapp: { obra: 'whatsapp' },
  reportes: { obra: 'reportes' },
  contrato: { obra: 'contrato' },
  // En la obra se llama Calidad (cambio del 2026-10-27).
  laboratorio: { obra: 'calidad' },
  asistente: { obra: 'asistente' },
};

/** Los nombres con que las pantallas de antes llevaban la obra en la dirección. */
const PARAMETROS_DE_OBRA = ['obraId', 'obra'];

/**
 * La dirección nueva de una dirección del panel de antes del cambio (RF-47), con sus
 * demás parámetros. `null` si no es una de antes: la portada, las rutas nuevas y el
 * ensayo de laboratorio (`/panel/laboratorio/<id>`), que siguen igual.
 *
 * Lo de una obra va a esa obra: la que diga la dirección si es gerencia, o la suya si
 * no (otra no la puede ver). Gerencia sin obra en la dirección va a la lista de obras,
 * que la lleva a esa pantalla al elegir una. Laboratorio y Asistente, sin obra, van a
 * la empresa de quien los abre: Geolab para el laboratorista; Geolab o Elemental para
 * gerencia.
 */
export function rutaNueva(direccion: string, persona: { rol: Rol; obraId: string | null }): string | null {
  const [camino, consulta = ''] = direccion.split('?');
  const partes = camino.replace(/\/+$/, '').split('/');
  // '', 'panel', '<pantalla>' y nada más: el ensayo (`/panel/laboratorio/<id>`) sigue igual.
  if (partes.length !== 3 || partes[0] !== '' || partes[1] !== 'panel') return null;
  const destino = PANTALLAS_DE_ANTES[partes[2]];
  if (!destino) return null;

  const parametros = new URLSearchParams(consulta);
  const pedida = PARAMETROS_DE_OBRA.map((p) => parametros.get(p)).find((v) => v) ?? null;
  for (const p of PARAMETROS_DE_OBRA) parametros.delete(p);
  const conParametros = (ruta: string) => {
    const resto = parametros.toString();
    if (!resto) return ruta;
    return `${ruta}${ruta.includes('?') ? '&' : '?'}${resto}`;
  };

  if ('empresa' in destino) {
    if (alcanzaLaEmpresa(persona.rol, destino.empresa)) {
      if (destino.pestana) parametros.set('pestana', destino.pestana);
      return conParametros(rutaDeEmpresa(destino.empresa, destino.pagina));
    }
    // Quien no entra a esa empresa (visto en la demo de la T22: Personas de antes llevaba a
    // la residente a Recursos Humanos de Elemental): la misma pantalla en un lugar suyo, y
    // si no la tiene en ninguno, su Inicio.
    const propia = recursosHumanosDe(persona);
    // Obras de antes (la pestaña Obras) no tiene equivalente fuera de Elemental.
    if (destino.pagina === 'recursos-humanos' && destino.pestana !== 'obras' && propia) return conParametros(propia);
    return destinoAlEntrar({ rol: persona.rol, obras: persona.obraId ? [persona.obraId] : [] }) ?? '/panel';
  }

  const pagina = destino.obra;
  if (persona.rol === 'laboratorista' && (pagina === 'calidad' || pagina === 'asistente')) {
    return conParametros(rutaDeEmpresa('geolab', pagina === 'calidad' ? 'laboratorio' : pagina));
  }
  // El Encargado de OCC no entra a las obras: lo de antes que era de una obra lo lleva a
  // OCC, a la misma página si OCC la tiene.
  // La auxiliar de RR. HH. tampoco entra a las obras: lo de antes la lleva a su Recursos Humanos.
  if (persona.rol === 'auxiliar_rrhh') return conParametros(rutaDeEmpresa('elemental', 'recursos-humanos'));
  if (persona.rol === 'encargado_occ') {
    const enOcc = pagina === 'preoperacionales' || pagina === 'asignaciones';
    return conParametros(rutaDeEmpresa('occ', enOcc ? pagina : undefined));
  }
  if (persona.rol === 'admin') {
    if (pedida) return conParametros(rutaDeObra(pedida, pagina));
    if (pagina === 'preoperacionales' || pagina === 'asignaciones') return conParametros(rutaDeEmpresa('occ', pagina));
    if (pagina === 'calidad') return conParametros(rutaDeEmpresa('geolab', 'laboratorio'));
    if (pagina === 'asistente') return conParametros(rutaDeEmpresa('elemental', 'asistente'));
    return conParametros(rutaDeProyectos(pagina));
  }
  return conParametros(persona.obraId ? rutaDeObra(persona.obraId, pagina) : rutaDeProyectos());
}

/* ── Reportes de WhatsApp por empresa ──────────────────────────────────── */

/**
 * Qué reportes de WhatsApp ve cada empresa (RF-23, decisión del usuario del
 * 2026-10-27): OCC, los de vehículos y maquinaria y los de suministro o cantera, que son
 * los viajes de sus volquetas. `null` es «todos»: dentro de una obra se ven todos los de
 * esa obra (RF-24).
 */
export function categoriasDeWhatsappDe(empresa: EmpresaId | null): readonly CategoriaDeWhatsapp[] | null {
  return empresa === 'occ' ? ['vehiculo_maquinaria', 'suministro_cantera'] : null;
}

/* ── Dónde se está ─────────────────────────────────────────────────────── */

/**
 * En qué empresa, obra y página está una dirección del panel (RF-10, RF-19). El menú y
 * las pantallas lo leen de la dirección y no de un estado aparte: un enlace copiado o
 * recargado abre lo mismo. `null` es fuera de una empresa (la portada de tarjetas y las
 * direcciones de antes).
 */
export type LugarDelPanel =
  | { tipo: 'empresa'; empresa: Exclude<EmpresaId, 'proyectos'>; pagina: string | null }
  | { tipo: 'proyectos' }
  | { tipo: 'obra'; obraId: string; pagina: string | null };

export function lugarDeLaRuta(ruta: string): LugarDelPanel | null {
  const partes = ruta.split('?')[0].replace(/\/+$/, '').split('/').slice(1);
  if (partes[0] !== 'panel') return null;
  const [, empresa, segundo, tercero] = partes;
  if (empresa === 'proyectos') {
    if (!segundo) return { tipo: 'proyectos' };
    return { tipo: 'obra', obraId: decodeURIComponent(segundo), pagina: tercero ?? null };
  }
  if (empresa === 'elemental' || empresa === 'occ' || empresa === 'geolab') {
    return { tipo: 'empresa', empresa, pagina: segundo ?? null };
  }
  return null;
}

/** La empresa del lugar, para el título de la pestaña y la cabecera del menú (RF-10, RF-48). */
export function empresaDelLugar(lugar: LugarDelPanel | null): EmpresaId | null {
  if (!lugar) return null;
  return lugar.tipo === 'empresa' ? lugar.empresa : 'proyectos';
}

/* ── El menú del lugar y el título de la pestaña ───────────────────────── */

/** Un enlace del menú lateral. `pagina` identifica cuál está activo. */
export interface EnlaceDelMenu {
  clave: string;
  titulo: string;
  ruta: string;
  /** La ruta es de otra aplicación: se abre en una pestaña nueva (RF-49). */
  externa?: true;
}

/**
 * El menú lateral de un lugar del panel (RF-10, RF-11, RF-13 a RF-18, RF-20):
 *  · `navegacion`: «← Empresas» dentro de una empresa y «Cambiar de obra» dentro de una
 *    obra, solo para gerencia, que es la que va y viene entre empresas y obras;
 *  · `entradas`: las páginas del menú de la empresa o de la obra; en la portada de
 *    tarjetas, las cuatro empresas.
 * `modulosDeObra` son los de la obra del lugar (spec 017), para esconder los apagados.
 */
export function menuDelLugar(
  lugar: LugarDelPanel | null,
  quien: Rol | { rol: Rol; obraId: string | null },
  modulosDeObra: ModulosDeObra = TODOS_LOS_MODULOS,
): { navegacion: EnlaceDelMenu[]; entradas: EnlaceDelMenu[] } {
  // Con la persona (y no solo el rol), el menú de un lugar al que no entra sale vacío: la
  // página dice «Sin acceso» (RF-12) y el menú no ofrece entradas que llevan a otro igual
  // (visto en la demo de la T22).
  const rol = typeof quien === 'string' ? quien : quien.rol;
  const persona = typeof quien === 'string' ? null : quien;
  const gerencia = rol === 'admin';
  const aEmpresas: EnlaceDelMenu = { clave: 'empresas', titulo: '← Empresas', ruta: '/panel' };
  if (!lugar) {
    return {
      navegacion: [],
      entradas: gerencia ? EMPRESAS.map((e) => ({ clave: e.id, titulo: e.nombre, ruta: rutaDeEmpresa(e.id) })) : [],
    };
  }
  if (lugar.tipo === 'empresa') {
    const entra = !persona || alcanzaLaEmpresa(rol, lugar.empresa);
    return {
      navegacion: gerencia ? [aEmpresas] : [],
      entradas: (entra ? menuDeEmpresa(lugar.empresa, rol) : []).map((m) =>
        m.externa
          ? { clave: m.pagina, titulo: m.titulo, ruta: m.externa, externa: true as const }
          : { clave: m.pagina, titulo: m.titulo, ruta: rutaDeEmpresa(lugar.empresa, m.pagina) },
      ),
    };
  }
  if (lugar.tipo === 'proyectos') return { navegacion: gerencia ? [aEmpresas] : [], entradas: [] };
  return {
    navegacion: gerencia
      ? [aEmpresas, { clave: 'cambiar-obra', titulo: 'Cambiar de obra', ruta: rutaDeProyectos() }]
      : [],
    entradas: (!persona || alcanzaLaObraDeLaRuta(persona, lugar.obraId) ? menuDeObra(rol, modulosDeObra) : []).map((m) => ({
      clave: m.pagina,
      titulo: m.titulo,
      ruta: rutaDeObra(lugar.obraId, m.pagina),
    })),
  };
}

/**
 * Las páginas que cambiaron de nombre o de lugar con los menús definitivos (RF-52,
 * cambio del 2026-10-27), con la ruta a la que se va ahora; `null` si la página sigue
 * igual. La información de la empresa, la financiera y el consolidado se quitaron: lo
 * financiero vive en Tesorería de Elemental.
 */
export function rutaRenombrada(lugar: LugarDelPanel): string | null {
  if (lugar.tipo === 'proyectos' || lugar.pagina === null) return null;
  const tesoreria = rutaDeEmpresa('elemental', 'tesoreria');
  if (lugar.tipo === 'empresa') {
    const { empresa, pagina } = lugar;
    if (pagina === 'empresa' || pagina === 'finanzas' || pagina === 'consolidado') return tesoreria;
    if (pagina === 'personas') return `${rutaDeEmpresa('elemental', 'recursos-humanos')}?pestana=personas`;
    if (pagina === 'obras') return `${rutaDeEmpresa('elemental', 'recursos-humanos')}?pestana=obras`;
    if (empresa === 'occ' && pagina === 'maquinaria') return rutaDeEmpresa('occ', 'bitacora');
    return null;
  }
  if (lugar.pagina === 'obra' || lugar.pagina === 'finanzas') return tesoreria;
  if (lugar.pagina === 'laboratorio') return rutaDeObra(lugar.obraId, 'calidad');
  if (lugar.pagina === 'personas') return rutaDeObra(lugar.obraId, 'recursos-humanos');
  return null;
}

/**
 * `rutaRenombrada`, para quien entra (RF-52): si la página nueva es de una empresa a la que
 * su rol no entra —Tesorería o Recursos Humanos de Elemental para un residente—, al Inicio
 * de su rol y no a un «Sin acceso». Gerencia llega siempre a la nueva.
 */
export function rutaRenombradaPara(
  lugar: LugarDelPanel,
  persona: { rol: Rol; obraId: string | null },
): string | null {
  const nueva = rutaRenombrada(lugar);
  if (!nueva) return null;
  const destino = lugarDeLaRuta(nueva.split('?')[0]);
  const entra =
    destino?.tipo !== 'empresa' ||
    (alcanzaLaEmpresa(persona.rol, destino.empresa) &&
      (destino.pagina === null || menuDeEmpresa(destino.empresa, persona.rol).some((e) => e.pagina === destino.pagina)));
  if (entra) return nueva;
  return destinoAlEntrar({ rol: persona.rol, obras: persona.obraId ? [persona.obraId] : [] }) ?? '/panel';
}

/**
 * El título de la pestaña dentro de una empresa (RF-48): «<Módulo> · <Empresa>». `null`
 * fuera de una empresa, donde vale el título de siempre.
 */
export function tituloDelLugar(lugar: LugarDelPanel | null): string | null {
  if (!lugar) return null;
  if (lugar.tipo === 'proyectos') return 'Proyectos';
  if (lugar.tipo === 'empresa') {
    const nombre = nombreDeEmpresa(lugar.empresa);
    const pagina = MENUS[lugar.empresa].find((m) => m.pagina === lugar.pagina);
    return pagina ? `${pagina.titulo} · ${nombre}` : nombre;
  }
  const pagina = MENU_DE_OBRA.find((m) => m.pagina === lugar.pagina);
  return `${pagina?.titulo ?? 'Resumen del día'} · Proyectos`;
}

/* ── Lo que muestra cada empresa en pantallas compartidas ──────────────── */

/**
 * Las pestañas de Reportes en cada empresa (RF-25, RF-27; decisión del usuario del
 * 2026-10-27: las mismas pestañas de siempre, con el selector de obra). OCC, las de los
 * equipos; Geolab, la de los ensayos. `null` es «todas»: dentro de una obra.
 */
export function pestanasDeReportes(
  empresa: EmpresaId | null,
): readonly ('maquinas' | 'mantenimiento' | 'calidad')[] | null {
  if (empresa === 'occ') return ['maquinas', 'mantenimiento'];
  if (empresa === 'geolab') return ['calidad'];
  return null;
}
