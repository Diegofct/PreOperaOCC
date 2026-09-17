/**
 * Qué puede hacer cada rol, escrito una sola vez.
 *
 * Antes esto estaba repartido en frases sueltas dentro de cada ruta: cuatro
 * exigían gerencia, dos hacían comprobaciones a mano dentro de personas, y el
 * resto se conformaba con que hubiera sesión abierta. Así se llegó a que un
 * residente pudiera registrar una obra o dar de baja un vehículo de otra: nadie
 * decidió que pudiera, simplemente nadie escribió que no.
 *
 * Está aquí, en `shared/rules`, y no dentro de la guardia, por dos razones:
 *
 * 1. Es puro, así que `scripts/verificar-reglas.ts` comprueba la tabla entera
 *    sin levantar el servidor. Un permiso que solo se puede probar pinchando la
 *    interfaz es un permiso que nadie vuelve a probar.
 * 2. La barra de navegación necesita exactamente la misma tabla para decidir qué
 *    enlaces pinta. Estando en un solo sitio, el menú y el servidor responden lo
 *    mismo por construcción, y no porque alguien se acordara de actualizar los
 *    dos.
 *
 * El menú es cortesía; la cerradura está en el servidor. Ninguna ruta confía en
 * que la interfaz haya escondido el botón.
 */

/**
 * Los niveles de acceso. Los cargos reales van aparte (`shared/catalogos/cargos`).
 *
 * Fueron tres hasta la spec 008, y la regla decía que no se ampliaban: se temía
 * que cada oficio de la obra acabara pidiendo su propio permiso. Almacenista y
 * Encargado de Planta no son eso. No son un cargo más dentro de un acceso que ya
 * existe: ven un módulo que nadie más lleva y **nada** de lo demás, y eso no cabe
 * en ninguno de los tres. Se añadieron esos dos y ninguno más; un oficio nuevo
 * sigue siendo un cargo, no un rol.
 */
export const ROLES = ['admin', 'supervisor', 'operador', 'almacenista', 'encargado_planta'] as const;
export type Rol = (typeof ROLES)[number];

/**
 * Cómo se llama cada acceso en pantalla y en los mensajes.
 *
 * Vivía en los contratos del panel y se trajo aquí en la spec 008: los rechazos
 * del servidor lo necesitan para decir qué acceso no se puede dar, y
 * `shared/rules` no importa del panel. Los contratos lo reexportan igual.
 */
export const ETIQUETA_ROL: Record<Rol, string> = {
  admin: 'Gerencia',
  supervisor: 'Residente / Director',
  operador: 'Operador',
  almacenista: 'Almacenista',
  encargado_planta: 'Encargado de Planta',
};

/** Los módulos del panel, en el orden en que se muestran. */
export const MODULOS = [
  'inicio',
  'obras',
  'personas',
  'vehiculos',
  'asignaciones',
  'bitacoras',
  'preoperacionales',
  // Spec 008. Van al final del menú: son de otros oficios, y para la gerencia y el
  // residente son consulta, no el trabajo de todos los días.
  'almacen',
  'cantera',
] as const;
export type Modulo = (typeof MODULOS)[number];

/**
 * `ver` es entrar al módulo. `listar` es que su listado responda.
 *
 * Son distintas a propósito, y es la distinción que sostiene todo esto: el
 * residente no entra a Personas ni a Vehículos, pero sus listados le siguen
 * respondiendo, porque las pantallas de Asignaciones y Bitácoras los necesitan
 * para llenar los selectores de a quién y a qué se asigna. Cerrar también el
 * listado —que parece lo coherente— deja esas dos pantallas sin datos.
 */
export type Accion = 'ver' | 'listar' | 'escribir' | 'anular' | 'activar';

const NADA: readonly Accion[] = [];

/**
 * La tabla, por módulo. Lo que no está escrito, no se puede.
 *
 * El operador no aparece en ninguna fila: su superficie es el celular, y la
 * guardia lo rechaza antes de llegar aquí.
 *
 * Almacenista y encargado de planta no tienen **nada** fuera de su módulo, ni
 * siquiera el inicio (spec 008, RF-2, RF-3 y H3). Si la spec 010 necesita que el
 * encargado de planta liste volquetas o conductores, esa fila se abre en su plan,
 * con su motivo, y no antes.
 */
const TABLA: Record<Modulo, Record<Rol, readonly Accion[]>> = {
  inicio: {
    admin: ['ver'],
    supervisor: ['ver'],
    operador: NADA,
    almacenista: NADA,
    encargado_planta: NADA,
  },
  obras: {
    admin: ['ver', 'listar', 'escribir'],
    supervisor: NADA,
    operador: NADA,
    almacenista: NADA,
    encargado_planta: NADA,
  },
  personas: {
    admin: ['ver', 'listar', 'escribir', 'activar'],
    supervisor: ['listar'],
    operador: NADA,
    almacenista: NADA,
    encargado_planta: NADA,
  },
  vehiculos: {
    admin: ['ver', 'listar', 'escribir'],
    supervisor: ['listar'],
    operador: NADA,
    almacenista: NADA,
    encargado_planta: NADA,
  },
  asignaciones: {
    admin: ['ver', 'listar', 'escribir'],
    supervisor: ['ver', 'listar', 'escribir'],
    operador: NADA,
    almacenista: NADA,
    encargado_planta: NADA,
  },
  bitacoras: {
    admin: ['ver', 'listar', 'escribir', 'anular'],
    supervisor: ['ver', 'listar', 'escribir', 'anular'],
    operador: NADA,
    almacenista: NADA,
    encargado_planta: NADA,
  },
  preoperacionales: {
    // Anular es corregir evidencia firmada por otro: se queda en gerencia. La
    // bitácora sí la anula el residente, porque la llena él mismo cada día.
    admin: ['ver', 'listar', 'anular'],
    supervisor: ['ver', 'listar'],
    operador: NADA,
    almacenista: NADA,
    encargado_planta: NADA,
  },
  // El residente consulta el almacén y la cantera de su obra, pero no registra ni
  // anula (spec 008, RF-12 y RF-13): es el trabajo de otro oficio.
  //
  // **En el almacén, anular es solo de la gerencia** desde el 2026-09-17 (spec
  // 009, RF-38), y lo pidió ella: un movimiento anulado cambia el stock, y quien
  // se equivoca al teclearlo no es quien decide borrarlo de la cuenta. El
  // almacenista sigue registrando; si hay un error, se lo pide a gerencia. En
  // cantera no se tocó: el encargado de planta sigue anulando sus viajes, que no
  // mueven inventario.
  almacen: {
    admin: ['ver', 'listar', 'escribir', 'anular'],
    supervisor: ['ver', 'listar'],
    operador: NADA,
    almacenista: ['ver', 'listar', 'escribir'],
    encargado_planta: NADA,
  },
  cantera: {
    admin: ['ver', 'listar', 'escribir', 'anular'],
    supervisor: ['ver', 'listar'],
    operador: NADA,
    almacenista: NADA,
    encargado_planta: ['ver', 'listar', 'escribir', 'anular'],
  },
};

/** ¿Este rol puede hacer esta acción sobre este módulo? */
export function alcanza(rol: Rol, modulo: Modulo, accion: Accion): boolean {
  return TABLA[modulo][rol].includes(accion);
}

/** Los módulos a los que este rol puede entrar, en orden de menú. */
export function modulosVisibles(rol: Rol): Modulo[] {
  return MODULOS.filter((modulo) => alcanza(rol, modulo, 'ver'));
}

/**
 * Qué accesos puede dar cada rol.
 *
 * Nadie reparte más de lo que tiene. Con la tabla actual el residente ni siquiera
 * puede escribir en personas, así que esta es la segunda cerradura de la misma
 * puerta; se escribe aparte para que siga en pie el día que la primera se relaje.
 *
 * Hasta la spec 008 era un rango numérico —gerencia 3, residente 2, operador 1— y
 * se podía dar todo lo que estuviera por debajo del propio. Con almacenista y
 * encargado de planta el rango deja de servir: no están ni por encima ni por
 * debajo del residente, son otra cosa, y con cualquier número que se les pusiera
 * o el residente podría darlos o figurarían como más que él. Así que se dice
 * explícito: los dos accesos nuevos, como la gerencia, solo los da la gerencia
 * (RF-17).
 */
const PUEDE_DAR: Record<Rol, readonly Rol[]> = {
  admin: ROLES,
  supervisor: ['supervisor', 'operador'],
  operador: [],
  almacenista: [],
  encargado_planta: [],
};

/** ¿Puede dar este acceso a alguien? */
export function puedeCambiarRol(rolDeQuienPide: Rol, rolDestino: Rol): boolean {
  return PUEDE_DAR[rolDeQuienPide].includes(rolDestino);
}

/**
 * Por qué no puede dar ese acceso, redactado para quien lo intentó, o `null` si
 * sí puede.
 *
 * Lo usan el alta y la corrección de personas, que antes decían cosas distintas
 * —«Solo la gerencia puede registrar a otra gerencia» y «No puede dar más
 * permisos de los que usted tiene»—. Hoy todos los accesos que se reservan los da
 * solo la gerencia, así que el mensaje lo dice así: qué no se puede y quién sí.
 */
export function motivoParaNoDarRol(rolDeQuienPide: Rol, rolDestino: Rol): string | null {
  if (puedeCambiarRol(rolDeQuienPide, rolDestino)) return null;
  return `Solo la gerencia puede dar el acceso de ${ETIQUETA_ROL[rolDestino]}.`;
}

/** Lo que se intentaba, para el rechazo. */
const QUE_SE_INTENTABA: Record<Accion, string> = {
  ver: 'entrar a este módulo',
  listar: 'consultar este listado',
  escribir: 'crear o modificar este registro',
  anular: 'anular este registro',
  activar: 'emitir códigos de activación',
};

/** Quién es cada rol dentro de una frase: «lo hacen la gerencia y el almacenista». */
const QUIEN_ES: Record<Rol, string> = {
  admin: 'la gerencia',
  supervisor: 'el residente o el director',
  operador: 'el operador',
  almacenista: 'el almacenista',
  encargado_planta: 'el encargado de planta',
};

/**
 * El rechazo de la guardia del servidor: qué no se puede y quién sí (spec 008,
 * RF-13, y el requisito no funcional de 001).
 *
 * Hasta la 008 decía siempre «es una acción de la gerencia», que era verdad
 * mientras solo la gerencia escribía. Con Almacén y Control Cantera ya no: al
 * residente que intenta registrar un ingreso hay que decirle que eso lo hace el
 * almacenista, o irá a pedírselo a quien no lo lleva. Por eso quién puede sale de
 * la misma tabla que decide, y no de un texto fijo que se desalinea con ella.
 */
export function motivoDeRechazo(modulo: Modulo, accion: Accion): string {
  const quienes = ROLES.filter((rol) => alcanza(rol, modulo, accion)).map((rol) => QUIEN_ES[rol]);
  const que = `No puede ${QUE_SE_INTENTABA[accion]}`;
  if (quienes.length === 0) return `${que}.`;

  const ultimo = quienes[quienes.length - 1];
  const lista = quienes.length === 1 ? ultimo : `${quienes.slice(0, -1).join(', ')} y ${ultimo}`;
  return `${que}: ${quienes.length === 1 ? 'lo hace' : 'lo hacen'} ${lista}.`;
}

/**
 * ¿Es una cuenta que depende de su obra y no tiene ninguna? (spec 008, RF-6).
 *
 * La gerencia no cuenta: ve todas las obras y no está adscrita a ninguna. Para
 * cualquier otro rol, sin obra no hay nada que enseñar —el filtro de alcance ya
 * no deja pasar ninguna fila (001/RF-10)—, y la pantalla tiene que decir por qué
 * en lugar de parecer vacía. Es la misma regla que `veTodasLasObras` usa en el
 * servidor, dicha para la pantalla.
 */
export function sinObraAsignada(rol: Rol, obraId: string | null): boolean {
  return rol !== 'admin' && !obraId;
}

/**
 * Por dónde entra cada rol al panel: su primer módulo visible (spec 008, RF-4).
 *
 * «inicio» para gerencia y residente, que es el resumen del día. El almacenista y
 * el encargado de planta no ven el inicio, así que entran directo a su módulo en
 * vez de toparse con un aviso. `null` para quien no entra al panel.
 */
export function moduloDeEntrada(rol: Rol): Modulo | null {
  return modulosVisibles(rol)[0] ?? null;
}

/** Cómo se llama cada módulo en los avisos. El menú tiene su propia lista con las rutas. */
const NOMBRE_DE_MODULO: Record<Modulo, string> = {
  inicio: 'Inicio',
  obras: 'Obras',
  personas: 'Personas',
  vehiculos: 'Vehículos',
  asignaciones: 'Asignaciones',
  bitacoras: 'Bitácoras',
  preoperacionales: 'Preoperacionales',
  almacen: 'Almacén',
  cantera: 'Control Cantera',
};

/**
 * Qué decirle a quien abre por dirección un módulo que no le toca (RF-7), o
 * `null` si sí le toca.
 *
 * Al residente se le sigue diciendo lo de siempre (001/RF-3): lo que no ve es el
 * maestro de la empresa, y es verdad que es de la gerencia. A un almacenista eso
 * sería mentira —Bitácoras no es de la gerencia— y además no le dice nada útil;
 * se le dice que no es de su cargo y dónde está su trabajo.
 */
export function avisoDeModuloAjeno(rol: Rol, modulo: Modulo): string | null {
  if (alcanza(rol, modulo, 'ver')) return null;

  const propio = moduloDeEntrada(rol);
  if (propio && propio !== 'inicio') {
    return `Este módulo no es de su cargo. Su trabajo está en ${NOMBRE_DE_MODULO[propio]}.`;
  }

  return (
    'Este módulo es de la gerencia. Si necesita registrar o corregir algo aquí, ' +
    'pídaselo a quien lleve la administración.'
  );
}
