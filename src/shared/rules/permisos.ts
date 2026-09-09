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

/** Los tres niveles de acceso. No se amplía: los cargos reales van aparte. */
export const ROLES = ['admin', 'supervisor', 'operador'] as const;
export type Rol = (typeof ROLES)[number];

/** Los módulos del panel, en el orden en que se muestran. */
export const MODULOS = [
  'inicio',
  'obras',
  'personas',
  'vehiculos',
  'asignaciones',
  'bitacoras',
  'preoperacionales',
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
 */
const TABLA: Record<Modulo, Record<Rol, readonly Accion[]>> = {
  inicio: {
    admin: ['ver'],
    supervisor: ['ver'],
    operador: NADA,
  },
  obras: {
    admin: ['ver', 'listar', 'escribir'],
    supervisor: NADA,
    operador: NADA,
  },
  personas: {
    admin: ['ver', 'listar', 'escribir', 'activar'],
    supervisor: ['listar'],
    operador: NADA,
  },
  vehiculos: {
    admin: ['ver', 'listar', 'escribir'],
    supervisor: ['listar'],
    operador: NADA,
  },
  asignaciones: {
    admin: ['ver', 'listar', 'escribir'],
    supervisor: ['ver', 'listar', 'escribir'],
    operador: NADA,
  },
  bitacoras: {
    admin: ['ver', 'listar', 'escribir', 'anular'],
    supervisor: ['ver', 'listar', 'escribir', 'anular'],
    operador: NADA,
  },
  preoperacionales: {
    // Anular es corregir evidencia firmada por otro: se queda en gerencia. La
    // bitácora sí la anula el residente, porque la llena él mismo cada día.
    admin: ['ver', 'listar', 'anular'],
    supervisor: ['ver', 'listar'],
    operador: NADA,
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
 * De más a menos permisos. Solo sirve para comparar, nunca para decidir por sí
 * solo: quién puede tocar el módulo de personas lo dice la tabla de arriba.
 */
const RANGO: Record<Rol, number> = { admin: 3, supervisor: 2, operador: 1 };

/**
 * ¿Puede ascender a alguien a este rol?
 *
 * Nadie reparte más de lo que tiene. Con la tabla actual el residente ni siquiera
 * puede escribir en personas, así que esta es la segunda cerradura de la misma
 * puerta; se escribe aparte para que siga en pie el día que la primera se relaje.
 */
export function puedeCambiarRol(rolDeQuienPide: Rol, rolDestino: Rol): boolean {
  return RANGO[rolDestino] <= RANGO[rolDeQuienPide];
}
