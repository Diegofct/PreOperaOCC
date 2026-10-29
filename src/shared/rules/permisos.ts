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
 * en ninguno de los tres. Un oficio nuevo sigue siendo un cargo, no un rol.
 *
 * El Laboratorista (spec 018) entró por la misma puerta y por el mismo motivo: ve
 * solo el laboratorio. Como residente vería la obra entera; como operador no
 * entraría al panel.
 */
export const ROLES = [
  'admin',
  'supervisor',
  'operador',
  'almacenista',
  'encargado_planta',
  'laboratorista',
  // Spec 034, RF-12 a RF-17: quien maneja los equipos de OCC. Entra solo a OCC y ahí
  // ve lo de todas las obras, como la gerencia; no es un cargo más porque cambia qué
  // puede hacer en el sistema.
  'encargado_occ',
  // Spec 035, RF-8 a RF-11: las auxiliares administrativas de Elemental que llevan Recursos
  // Humanos. Ven todo lo de Elemental (salvo el Asistente) y no dan accesos al panel.
  'auxiliar_rrhh',
] as const;
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
  laboratorista: 'Laboratorista',
  encargado_occ: 'Encargado de OCC',
  auxiliar_rrhh: 'Auxiliar de Recursos Humanos',
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
  // Spec 018. Al final por lo mismo: es el trabajo de otro oficio, y para el
  // residente es aprobar lo que el laboratorio le envía.
  'laboratorio',
  // Spec 021. Al final por lo mismo que los anteriores: no es un registro propio,
  // es la bandeja de lo que se reportó por WhatsApp para pasarlo a la bitácora.
  'whatsapp',
  // Spec 030. Al final: es consulta de lo que ya guardaron los demás módulos, más el
  // registro de los mantenimientos de las máquinas.
  'reportes',
  // Spec 031. El contrato y el presupuesto de la obra con su cliente: se arman al
  // empezar la obra y se consultan después; en el menú van en su grupo, «Cliente».
  'contrato',
  // Spec 028. Una conversación que consulta lo de los demás módulos: va junto al Inicio,
  // porque es una forma de llegar a todo lo demás.
  'asistente',
] as const;
export type Modulo = (typeof MODULOS)[number];

/**
 * Lo que tiene permiso propio sin ser un módulo del menú de siempre (spec 033): los datos
 * de una empresa o de una obra y su información financiera. Van aparte de `MODULOS`
 * porque solo existen dentro del menú de una empresa (`rules/empresas.ts`), pero se
 * deciden en la misma tabla y con el mismo `alcanza`.
 *
 * Con los menús definitivos (cambio del 2026-10-27) se suman los servicios que Elemental
 * presta al grupo: Recursos Humanos, Compras, Tesorería, Documentos y Licitaciones, y las
 * solicitudes de compra y de pago que le hacen OCC, Geolab y las obras.
 */
export const MODULOS_DE_EMPRESA = [
  'empresa',
  'finanzas',
  'rrhh',
  'compras',
  'tesoreria',
  'documentos',
  'licitaciones',
  'solicitudes',
] as const;
export type ModuloDeEmpresa = (typeof MODULOS_DE_EMPRESA)[number];

/** Todo lo que tiene una fila en la tabla de permisos. */
export type ModuloConPermiso = Modulo | ModuloDeEmpresa;

/**
 * Qué módulos lleva la obra de una persona (spec 017, RF-1).
 *
 * Los que se pueden apagar por obra: Almacén y Control Cantera (spec 017) y
 * Laboratorio (spec 018, RF-11). Quien no está adscrito a ninguna —la gerencia— los
 * tiene todos encendidos: lleva todas las obras, y lo que se le oculta son las obras
 * apagadas dentro de cada módulo, no el módulo (RF-10).
 */
export interface ModulosDeObra {
  almacen: boolean;
  cantera: boolean;
  laboratorio: boolean;
}

/** La obra que lo lleva todo: lo de quien no tiene obra, y el punto de partida. */
export const TODOS_LOS_MODULOS: ModulosDeObra = { almacen: true, cantera: true, laboratorio: true };

/**
 * `ver` es entrar al módulo. `listar` es que su listado responda.
 *
 * Son distintas a propósito, y es la distinción que sostiene todo esto: el
 * residente no entra a Personas ni a Vehículos, pero sus listados le siguen
 * respondiendo, porque las pantallas de Asignaciones y Bitácoras los necesitan
 * para llenar los selectores de a quién y a qué se asigna. Cerrar también el
 * listado —que parece lo coherente— deja esas dos pantallas sin datos.
 *
 * `aprobar` es aprobar o devolver un ensayo de laboratorio (spec 018). Es aparte de
 * `escribir` porque son dos personas distintas: el laboratorista escribe y no
 * aprueba, el residente aprueba y no escribe. Con las acciones que había no se
 * podían decir las dos cosas.
 */
export type Accion = 'ver' | 'listar' | 'escribir' | 'anular' | 'activar' | 'aprobar';

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
 *
 * El Encargado de OCC (spec 034, RF-16) tiene en los módulos de OCC lo mismo que la
 * gerencia hace **desde OCC**, menos anular documentos y aprobar compras o pagos; fuera
 * de OCC, nada. La bitácora y WhatsApp solo se consultan en OCC (se corrigen y se aprueban
 * dentro de cada obra), así que ahí solo `ver` y `listar`. Lista obras y personas sin
 * entrar, como el residente: sus pantallas las necesitan.
 *
 * La auxiliar de Recursos Humanos (spec 035) tiene Recursos Humanos entero y ve el resto
 * de Elemental; fuera de Elemental, nada. Personas y Obras con `ver` porque son las
 * pestañas de su Recursos Humanos.
 */
const TABLA: Record<ModuloConPermiso, Record<Rol, readonly Accion[]>> = {
  inicio: {
    admin: ['ver'],
    supervisor: ['ver'],
    operador: NADA,
    almacenista: NADA,
    encargado_planta: NADA,
    laboratorista: NADA,
    encargado_occ: NADA,
    auxiliar_rrhh: NADA,
  },
  obras: {
    admin: ['ver', 'listar', 'escribir'],
    supervisor: NADA,
    operador: NADA,
    almacenista: NADA,
    encargado_planta: NADA,
    laboratorista: NADA,
    encargado_occ: ['listar'],
    auxiliar_rrhh: ['ver', 'listar'],
  },
  personas: {
    admin: ['ver', 'listar', 'escribir', 'activar'],
    supervisor: ['listar'],
    operador: NADA,
    almacenista: NADA,
    encargado_planta: NADA,
    laboratorista: NADA,
    encargado_occ: ['listar'],
    auxiliar_rrhh: ['ver', 'listar', 'escribir'],
  },
  vehiculos: {
    admin: ['ver', 'listar', 'escribir'],
    supervisor: ['listar'],
    operador: NADA,
    almacenista: NADA,
    encargado_planta: NADA,
    laboratorista: NADA,
    encargado_occ: ['ver', 'listar', 'escribir'],
    auxiliar_rrhh: NADA,
  },
  asignaciones: {
    admin: ['ver', 'listar', 'escribir'],
    supervisor: ['ver', 'listar', 'escribir'],
    operador: NADA,
    almacenista: NADA,
    encargado_planta: NADA,
    laboratorista: NADA,
    encargado_occ: ['ver', 'listar', 'escribir'],
    auxiliar_rrhh: NADA,
  },
  bitacoras: {
    admin: ['ver', 'listar', 'escribir', 'anular'],
    supervisor: ['ver', 'listar', 'escribir', 'anular'],
    operador: NADA,
    almacenista: NADA,
    encargado_planta: NADA,
    laboratorista: NADA,
    // En OCC la bitácora se consulta (spec 033, RF-22): se llena y se corrige en la obra.
    encargado_occ: ['ver', 'listar'],
    auxiliar_rrhh: NADA,
  },
  preoperacionales: {
    // Anular es corregir evidencia firmada por otro: se queda en gerencia. La
    // bitácora sí la anula el residente, porque la llena él mismo cada día.
    admin: ['ver', 'listar', 'anular'],
    supervisor: ['ver', 'listar'],
    operador: NADA,
    almacenista: NADA,
    encargado_planta: NADA,
    laboratorista: NADA,
    encargado_occ: ['ver', 'listar', 'anular'],
    auxiliar_rrhh: NADA,
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
    laboratorista: NADA,
    encargado_occ: NADA,
    auxiliar_rrhh: NADA,
  },
  cantera: {
    admin: ['ver', 'listar', 'escribir', 'anular'],
    supervisor: ['ver', 'listar'],
    operador: NADA,
    almacenista: NADA,
    encargado_planta: ['ver', 'listar', 'escribir', 'anular'],
    laboratorista: NADA,
    encargado_occ: NADA,
    auxiliar_rrhh: NADA,
  },
  // Spec 018. El laboratorista registra, envía y descarta —todo eso es escribir—,
  // pero no aprueba ni anula (RF-92): quien hace el ensayo no es quien lo da por
  // bueno. El residente hace de coordinador de laboratorio: aprueba, devuelve y
  // anula lo aprobado (RF-77, RF-78, RF-86), pero no registra ensayos.
  laboratorio: {
    admin: ['ver', 'listar', 'escribir', 'aprobar', 'anular'],
    supervisor: ['ver', 'listar', 'aprobar', 'anular'],
    operador: NADA,
    almacenista: NADA,
    encargado_planta: NADA,
    laboratorista: ['ver', 'listar', 'escribir'],
    encargado_occ: NADA,
    auxiliar_rrhh: NADA,
  },
  // Spec 021. La bandeja de WhatsApp es del residente y de la gerencia (RF-14,
  // RF-15): corregir es escribir, y aprobar crea registros en la bitácora y en
  // Control Cantera. **La fila `cantera` no cambia**: el residente aprueba los
  // viajes de un reporte desde aquí, pero sigue sin registrarlos a mano (RF-84,
  // RF-85). Asociar un grupo a su obra es de la gerencia y lo exige su ruta.
  whatsapp: {
    admin: ['ver', 'listar', 'escribir', 'aprobar'],
    supervisor: ['ver', 'listar', 'escribir', 'aprobar'],
    operador: NADA,
    almacenista: NADA,
    encargado_planta: NADA,
    laboratorista: NADA,
    // En OCC, WhatsApp es el historial y los grupos: aprobar se hace en la bandeja de la obra.
    encargado_occ: ['ver', 'listar'],
    auxiliar_rrhh: NADA,
  },
  // Spec 030, RF-1 y RF-2. Los reportes son de la gerencia y del residente; escribir es
  // registrar, anular o resolver un mantenimiento. Los intervalos por tipo de equipo
  // y por máquina son solo de la gerencia, y eso lo exige su ruta (RF-24, RF-25).
  reportes: {
    admin: ['ver', 'listar', 'escribir'],
    supervisor: ['ver', 'listar', 'escribir'],
    operador: NADA,
    almacenista: NADA,
    encargado_planta: NADA,
    laboratorista: NADA,
    encargado_occ: ['ver', 'listar', 'escribir'],
    auxiliar_rrhh: NADA,
  },
  // Spec 031, RF-2 y RF-3. El residente arma los borradores de su obra —contrato,
  // pólizas, documentos, presupuesto y versiones—, pero **aprobar es de la gerencia**
  // (D1): aprobar fija el valor contra el que se cobra. `aprobar` cubre también volver
  // un contrato aprobado a borrador.
  contrato: {
    admin: ['ver', 'listar', 'escribir', 'aprobar'],
    supervisor: ['ver', 'listar', 'escribir'],
    operador: NADA,
    almacenista: NADA,
    encargado_planta: NADA,
    laboratorista: NADA,
    encargado_occ: NADA,
    auxiliar_rrhh: NADA,
  },
  // Spec 028, RF-1, RF-2 y RF-59. Lo usan los cinco roles del panel; lo que alcanza cada
  // uno lo decide `alcanceDelAsistente` (rules/asistente.ts) con sus módulos y su obra.
  // `escribir` es poner los límites del día y ver el uso: solo la gerencia. El operador
  // no: el asistente no está en el celular.
  asistente: {
    admin: ['ver', 'listar', 'escribir'],
    supervisor: ['ver', 'listar'],
    operador: NADA,
    almacenista: ['ver', 'listar'],
    encargado_planta: ['ver', 'listar'],
    laboratorista: ['ver', 'listar'],
    encargado_occ: ['ver', 'listar'],
    auxiliar_rrhh: NADA,
  },
  // Spec 033, RF-32. Los datos de la empresa y de la obra: solo la gerencia, que es la que
  // los conoce y la única que ve las tarjetas. Los demás roles siguen con lo de hoy (RF-21).
  empresa: {
    admin: ['ver', 'listar', 'escribir'],
    supervisor: NADA,
    operador: NADA,
    almacenista: NADA,
    encargado_planta: NADA,
    laboratorista: NADA,
    encargado_occ: NADA,
    auxiliar_rrhh: NADA,
  },
  // Spec 033, RF-34, RF-39 y RF-44. Los cortes financieros y el consolidado: solo la
  // gerencia. `anular` es anular un corte con su motivo; no hay corregir (RF-40).
  finanzas: {
    admin: ['ver', 'listar', 'escribir', 'anular'],
    supervisor: NADA,
    operador: NADA,
    almacenista: NADA,
    encargado_planta: NADA,
    laboratorista: NADA,
    encargado_occ: NADA,
    auxiliar_rrhh: NADA,
  },
  // Cambio del 2026-10-27 (menús definitivos). Recursos Humanos lo lleva Elemental; el
  // residente consulta el de su obra (spec 035).
  // Spec 035, RF-2 a RF-7: lo llevan la gerencia y la auxiliar de RR. HH.; el residente
  // consulta el de su obra, el Encargado de OCC el de OCC y el laboratorista el de Geolab.
  // Qué personas ve cada uno lo decide el lugar (`alcanzaLaEmpresa`, la obra), no esta fila.
  rrhh: {
    admin: ['ver', 'listar', 'escribir', 'anular'],
    supervisor: ['ver', 'listar'],
    operador: NADA,
    almacenista: NADA,
    encargado_planta: NADA,
    laboratorista: ['ver', 'listar'],
    encargado_occ: ['ver', 'listar'],
    auxiliar_rrhh: ['ver', 'listar', 'escribir', 'anular'],
  },
  // Compras y Tesorería de Elemental: donde se aprueban las solicitudes del grupo (RF-51).
  // Spec 036, RF-5: la gerencia además registra y anula las compras.
  compras: {
    admin: ['ver', 'listar', 'escribir', 'anular', 'aprobar'],
    supervisor: NADA,
    operador: NADA,
    almacenista: NADA,
    encargado_planta: NADA,
    laboratorista: NADA,
    encargado_occ: NADA,
    auxiliar_rrhh: ['ver', 'listar'],
  },
  tesoreria: {
    admin: ['ver', 'listar', 'escribir', 'anular', 'aprobar'],
    supervisor: NADA,
    operador: NADA,
    almacenista: NADA,
    encargado_planta: NADA,
    laboratorista: NADA,
    encargado_occ: NADA,
    auxiliar_rrhh: ['ver', 'listar'],
  },
  // Spec 034, RF-4 a RF-10. Cada quien ve y sube los de lo suyo —el residente, los de su
  // obra; el laboratorista, los de Geolab; el Encargado de OCC, los de OCC—, y la gerencia
  // los de todo. Anular es solo de la gerencia: nada desaparece sin control. A qué lugar
  // entra cada uno lo deciden `alcanzaLaEmpresa` y la obra de la persona, no esta fila.
  documentos: {
    admin: ['ver', 'listar', 'escribir', 'anular'],
    supervisor: ['ver', 'listar', 'escribir'],
    operador: NADA,
    almacenista: NADA,
    encargado_planta: NADA,
    laboratorista: ['ver', 'listar', 'escribir'],
    encargado_occ: ['ver', 'listar', 'escribir'],
    auxiliar_rrhh: ['ver', 'listar', 'escribir'],
  },
  // El acceso directo a LicitApp (RF-49): el permiso es solo verlo en el menú.
  licitaciones: {
    admin: ['ver'],
    supervisor: NADA,
    operador: NADA,
    almacenista: NADA,
    encargado_planta: NADA,
    laboratorista: NADA,
    encargado_occ: NADA,
    auxiliar_rrhh: ['ver'],
  },
  // Pedir compras y pagos (RF-51): el residente y el almacenista en su obra, el
  // laboratorista en Geolab y la gerencia en nombre de OCC, Geolab o cualquier obra.
  solicitudes: {
    admin: ['ver', 'listar', 'escribir'],
    supervisor: ['ver', 'listar', 'escribir'],
    operador: NADA,
    almacenista: ['ver', 'listar', 'escribir'],
    encargado_planta: NADA,
    laboratorista: ['ver', 'listar', 'escribir'],
    encargado_occ: ['ver', 'listar', 'escribir'],
    auxiliar_rrhh: NADA,
  },
};

/** ¿Este rol puede hacer esta acción sobre este módulo? */
export function alcanza(rol: Rol, modulo: ModuloConPermiso, accion: Accion): boolean {
  return TABLA[modulo][rol].includes(accion);
}

/**
 * Los módulos a los que este rol puede entrar, en orden de menú.
 *
 * `modulos` son los de su obra (spec 017, RF-7): el cargo abre la puerta y la obra
 * tiene que llevar el módulo. Sin decir nada se asumen los dos encendidos, que es lo
 * que valía antes de la 017.
 *
 * **La gerencia no se filtra**: lleva todas las obras, así que el módulo le sirve
 * aunque alguna no lo lleve; lo que a ella se le ocultan son las obras apagadas
 * dentro del módulo (RF-10).
 */
export function modulosVisibles(rol: Rol, modulos: ModulosDeObra = TODOS_LOS_MODULOS): Modulo[] {
  const deUnaObra = rol !== 'admin';
  return MODULOS.filter(
    (modulo) => alcanza(rol, modulo, 'ver') && !(deUnaObra && moduloApagado(modulo, modulos)),
  );
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
 * (RF-17). El de laboratorista, igual (spec 018, RF-2), y el de Encargado de OCC
 * (spec 034).
 */
const PUEDE_DAR: Record<Rol, readonly Rol[]> = {
  admin: ROLES,
  supervisor: ['supervisor', 'operador'],
  operador: [],
  almacenista: [],
  encargado_planta: [],
  laboratorista: [],
  encargado_occ: [],
  // Spec 035, RF-11: registra personas sin acceso al panel; los accesos los da la gerencia.
  auxiliar_rrhh: ['operador'],
};

/** ¿Puede dar este acceso a alguien? */
export function puedeCambiarRol(rolDeQuienPide: Rol, rolDestino: Rol): boolean {
  return PUEDE_DAR[rolDeQuienPide].includes(rolDestino);
}

/**
 * Los accesos que este rol puede dar, en el orden de `ROLES`: lo que ofrece el selector de
 * Acceso al registrar o corregir a alguien (spec 035, RF-8, RF-11). Ofrecer lo que el
 * servidor va a rechazar solo sirve para que el error llegue después.
 */
export function rolesQuePuedeDar(rolDeQuienPide: Rol): Rol[] {
  return ROLES.filter((rol) => puedeCambiarRol(rolDeQuienPide, rol));
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
  aprobar: 'aprobar ni devolver este ensayo',
};

/**
 * Lo que se intentaba cuando no es lo de la tabla de arriba. «Aprobar» se escribió
 * para el laboratorio, y en la bandeja de WhatsApp no se devuelve un ensayo: se
 * aprueba o se descarta un reporte.
 */
const QUE_SE_INTENTABA_EN: Partial<Record<ModuloConPermiso, Partial<Record<Accion, string>>>> = {
  whatsapp: { aprobar: 'aprobar ni descartar este reporte' },
  contrato: { aprobar: 'aprobar el contrato ni el presupuesto' },
  asistente: { escribir: 'cambiar los límites del asistente ni ver su uso' },
  // Spec 033.
  empresa: { escribir: 'cambiar los datos de la empresa' },
  finanzas: {
    ver: 'ver la información financiera',
    listar: 'ver la información financiera',
    escribir: 'registrar cortes financieros',
    anular: 'anular cortes financieros',
  },
  compras: {
    aprobar: 'aprobar ni rechazar solicitudes de compra',
    escribir: 'registrar compras',
    anular: 'anular compras',
  },
  tesoreria: { aprobar: 'aprobar ni rechazar solicitudes de pago' },
};

/** Quién es cada rol dentro de una frase: «lo hacen la gerencia y el almacenista». */
const QUIEN_ES: Record<Rol, string> = {
  admin: 'la gerencia',
  supervisor: 'el residente o el director',
  operador: 'el operador',
  almacenista: 'el almacenista',
  encargado_planta: 'el encargado de planta',
  laboratorista: 'el laboratorista',
  encargado_occ: 'el encargado de OCC',
  auxiliar_rrhh: 'la auxiliar de recursos humanos',
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
export function motivoDeRechazo(modulo: ModuloConPermiso, accion: Accion): string {
  const quienes = ROLES.filter((rol) => alcanza(rol, modulo, accion)).map((rol) => QUIEN_ES[rol]);
  const que = `No puede ${QUE_SE_INTENTABA_EN[modulo]?.[accion] ?? QUE_SE_INTENTABA[accion]}`;
  if (quienes.length === 0) return `${que}.`;

  const ultimo = quienes[quienes.length - 1];
  const lista = quienes.length === 1 ? ultimo : `${quienes.slice(0, -1).join(', ')} y ${ultimo}`;
  return `${que}: ${quienes.length === 1 ? 'lo hace' : 'lo hacen'} ${lista}.`;
}

/**
 * ¿Este rol ve todas las obras, sin estar adscrito a ninguna? La gerencia; desde la
 * spec 034 (RF-16), el Encargado de OCC: OCC trabaja con las máquinas de todas las
 * obras; y desde la 035, la auxiliar de RR. HH.: lleva el personal de todas. Lo que el Encargado no tiene lo cierra la tabla de permisos, no esto: aquí
 * solo se dice **cuántas** obras, no **qué** módulos.
 *
 * Es la regla de `veTodasLasObras` en el servidor y de `sinObraAsignada` en la
 * pantalla; vive aquí para que las dos no se desalineen.
 */
export function rolVeTodasLasObras(rol: Rol): boolean {
  return rol === 'admin' || rol === 'encargado_occ' || rol === 'auxiliar_rrhh';
}

/**
 * ¿Es una cuenta que depende de su obra y no tiene ninguna? (spec 008, RF-6).
 *
 * La gerencia y el Encargado de OCC no cuentan: ven todas las obras y no están
 * adscritos a ninguna. Para cualquier otro rol, sin obra no hay nada que enseñar
 * —el filtro de alcance ya no deja pasar ninguna fila (001/RF-10)—, y la pantalla
 * tiene que decir por qué en lugar de parecer vacía.
 */
export function sinObraAsignada(rol: Rol, obraId: string | null): boolean {
  return !rolVeTodasLasObras(rol) && !obraId;
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
const NOMBRE_DE_MODULO: Record<ModuloConPermiso, string> = {
  inicio: 'Inicio',
  obras: 'Obras',
  personas: 'Personas',
  vehiculos: 'Vehículos',
  asignaciones: 'Asignaciones',
  bitacoras: 'Bitácoras',
  preoperacionales: 'Preoperacionales',
  almacen: 'Almacén',
  cantera: 'Control Cantera',
  laboratorio: 'Laboratorio',
  whatsapp: 'Reportes de WhatsApp',
  reportes: 'Reportes',
  contrato: 'Contrato y Presupuesto',
  asistente: 'Asistente',
  empresa: 'Información de la empresa',
  finanzas: 'Información financiera',
  rrhh: 'Recursos Humanos',
  compras: 'Compras',
  tesoreria: 'Tesorería',
  documentos: 'Documentos',
  licitaciones: 'Licitaciones',
  solicitudes: 'Solicitudes de compra y de pago',
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
/**
 * ¿Este módulo está apagado en esa obra? (spec 017, RF-7 a RF-9.)
 *
 * Solo Almacén, Control Cantera y Laboratorio se apagan por obra; los demás no
 * dependen de la obra, así que nunca están apagados, diga lo que diga lo que llegue.
 */
export function moduloApagado(modulo: ModuloConPermiso, modulos: ModulosDeObra): boolean {
  if (modulo === 'almacen') return !modulos.almacen;
  if (modulo === 'cantera') return !modulos.cantera;
  if (modulo === 'laboratorio') return !modulos.laboratorio;
  return false;
}

/** El módulo para el que existe cada acceso de oficio; `null` los que no dependen de uno. */
const MODULO_DEL_ROL: Record<Rol, Modulo | null> = {
  admin: null,
  supervisor: null,
  operador: null,
  almacenista: 'almacen',
  encargado_planta: 'cantera',
  laboratorista: 'laboratorio',
  // No depende de un interruptor de obra: no tiene obra.
  encargado_occ: null,
  auxiliar_rrhh: null,
};

/**
 * Por qué no se le puede dar ese acceso en esa obra, o `null` (spec 017, RF-11).
 *
 * El almacenista, el encargado de planta y el laboratorista existen **para** su
 * módulo: darle ese acceso a alguien en una obra que no lo lleva es dejarlo con una
 * cuenta que solo sabe decirle que su obra no tiene dónde trabajar. Los demás roles no dependen de
 * estos interruptores.
 */
export function motivoParaNoDarRolEnObra(rol: Rol, modulos: ModulosDeObra): string | null {
  const modulo = MODULO_DEL_ROL[rol];
  if (!modulo || !moduloApagado(modulo, modulos)) return null;
  return `Esa obra no lleva el módulo ${NOMBRE_DE_MODULO[modulo]}.`;
}

/**
 * Lo que ve quien entra a un módulo que su obra no lleva (RF-8).
 *
 * Distinto del aviso de módulo ajeno: aquí el cargo sí le da acceso, y lo que falta
 * es que su obra lo lleve. Decirle «este módulo no es de su cargo» sería mentirle, y
 * dejarlo con una pantalla vacía, peor.
 */
export function avisoDeModuloApagado(modulo: ModuloConPermiso): string {
  return (
    `Su obra no lleva el módulo ${NOMBRE_DE_MODULO[modulo]}. Si debería llevarlo, ` +
    'pídaselo a quien lleve la administración.'
  );
}

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
