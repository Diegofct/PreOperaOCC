/**
 * Los cargos de una obra de OCC.
 *
 * Hasta ahora el sistema solo sabía de tres cosas —gerencia, residente y
 * operador—, porque lo que la pantalla llamaba «cargo» era en realidad el nivel
 * de acceso. Eso dejaba fuera a casi toda la obra: un topógrafo o un cadenero no
 * son «operadores» en ningún sentido útil, pero era la única casilla donde
 * cabían. Y hacen falta dentro, porque la bitácora registra quién trabajó y
 * cuántas horas, y esa gente no opera ninguna máquina.
 *
 * Así que son dos cosas distintas:
 *
 * - **`cargo`** (esto) dice qué hace la persona en la obra. Veinte valores,
 *   dato de negocio, se muestra en todas partes.
 * - **`rol`** dice qué puede hacer en el sistema, y es lo que lee la tabla de
 *   `shared/rules/permisos`. Eran tres; la spec 008 añadió Almacenista y
 *   Encargado de Planta, porque ven un módulo que nadie más lleva. Un oficio
 *   nuevo sigue siendo un cargo, no un rol.
 *
 * Está en `catalogos/` y no en una de las dos bases porque los slugs son la
 * llave que une a una persona con su cargo en el panel y en el celular. Si
 * divergen, los dos hablan de cosas distintas sin que nada falle a la vista.
 *
 * Los rótulos son los que usa OCC, con sus números: «Residente 1», «Cadenero 2».
 */
import type { Rol } from '@/shared/rules/permisos';

export interface DefinicionCargo {
  /** Slug estable. Es lo que se guarda; no se renombra ni se reutiliza. */
  id: string;
  /** Como lo dice OCC. Es lo que se ve en pantalla. */
  nombre: string;
  /** El acceso que el formulario propone al elegir este cargo. */
  rolSugerido: Rol;
  /**
   * Si lleva máquina o carro. Solo estos reciben código de activación de
   * celular: es lo único que impide que un cadenero acabe con un teléfono
   * activado por un clic de más.
   */
  operaVehiculos: boolean;
}

export const CARGOS = [
  /**
   * Va primero porque es el único cargo de empresa: los demás son de obra.
   *
   * Hasta la spec 002/RF-13 no existía, y la gerencia era el único nivel de
   * acceso real sin un oficio que lo nombrara — había que registrarla sin cargo
   * o ponerle «Director», que dirige **una** obra y es otra cosa.
   */
  { id: 'gerente', nombre: 'Gerente', rolSugerido: 'admin', operaVehiculos: false },
  { id: 'director', nombre: 'Director', rolSugerido: 'supervisor', operaVehiculos: false },
  { id: 'residente_1', nombre: 'Residente 1', rolSugerido: 'supervisor', operaVehiculos: false },
  { id: 'residente_2', nombre: 'Residente 2', rolSugerido: 'supervisor', operaVehiculos: false },
  /**
   * El slug se queda en `auxiliar` aunque el rótulo diga «de obra»: ya hay
   * personas registradas apuntando a él y los slugs no se renombran. Que el
   * rótulo se pueda corregir sin tocar el slug es justamente para lo que sirve
   * tenerlos separados.
   *
   * OCC pidió además «Tecnólogo en obra» y al revisarlo resultó ser **este
   * mismo oficio con otro nombre**, así que no se añadió un cargo aparte: dos
   * rótulos para el mismo trabajo parten en dos el listado de personal de la
   * bitácora sin que nadie lo note.
   */
  { id: 'auxiliar', nombre: 'Auxiliar de obra', rolSugerido: 'operador', operaVehiculos: false },
  { id: 'topografo', nombre: 'Topógrafo', rolSugerido: 'operador', operaVehiculos: false },
  { id: 'cadenero_1', nombre: 'Cadenero 1', rolSugerido: 'operador', operaVehiculos: false },
  { id: 'cadenero_2', nombre: 'Cadenero 2', rolSugerido: 'operador', operaVehiculos: false },
  { id: 'siso', nombre: 'SISO (SST)', rolSugerido: 'operador', operaVehiculos: false },
  {
    id: 'residente_ambiental',
    nombre: 'Residente Ambiental',
    rolSugerido: 'operador',
    operaVehiculos: false,
  },
  {
    id: 'auxiliar_ambiental',
    nombre: 'Auxiliar Ambiental',
    rolSugerido: 'operador',
    operaVehiculos: false,
  },
  { id: 'social', nombre: 'Social', rolSugerido: 'operador', operaVehiculos: false },
  // Pedidos por OCC el 2026-09-23. Ninguno lleva máquina —el controlador vial
  // dirige el tránsito y control de calidad trabaja sobre el material—, así que
  // ninguno recibe código de activación de celular.
  {
    id: 'controlador_vial',
    nombre: 'Controlador(a) Vial',
    rolSugerido: 'operador',
    operaVehiculos: false,
  },
  {
    id: 'control_calidad',
    nombre: 'Control de Calidad',
    rolSugerido: 'operador',
    operaVehiculos: false,
  },
  { id: 'conductor', nombre: 'Conductor', rolSugerido: 'operador', operaVehiculos: true },
  { id: 'operador', nombre: 'Operador', rolSugerido: 'operador', operaVehiculos: true },
  { id: 'ayudante', nombre: 'Ayudante', rolSugerido: 'operador', operaVehiculos: false },
  { id: 'maestro', nombre: 'Maestro de obra', rolSugerido: 'operador', operaVehiculos: false },
  // Spec 008. Son los dos únicos cargos con acceso propio: entran al panel solo a
  // su módulo, y ninguno lleva máquina, así que no reciben celular (RF-10).
  { id: 'almacenista', nombre: 'Almacenista', rolSugerido: 'almacenista', operaVehiculos: false },
  {
    id: 'encargado_planta',
    nombre: 'Encargado de Planta',
    rolSugerido: 'encargado_planta',
    operaVehiculos: false,
  },
  // Spec 018, RF-3. Registra los ensayos de laboratorio de su obra y entra solo a
  // ese módulo. Distinto de «Control de Calidad», que es personal de obra sin acceso
  // al panel.
  { id: 'laboratorista', nombre: 'Laboratorista', rolSugerido: 'laboratorista', operaVehiculos: false },
] as const satisfies readonly DefinicionCargo[];

export type Cargo = (typeof CARGOS)[number]['id'];

export const IDS_CARGO = CARGOS.map((c) => c.id) as readonly Cargo[];

const POR_ID = new Map<string, DefinicionCargo>(CARGOS.map((c) => [c.id, c]));

/** La definición, o `undefined` si el slug no existe. */
export function cargoPorId(id: string | null | undefined): DefinicionCargo | undefined {
  return id ? POR_ID.get(id) : undefined;
}

/** El rótulo que se muestra. Sin cargo, «Sin definir»: es un estado real. */
export function nombreDeCargo(id: string | null | undefined): string {
  return cargoPorId(id)?.nombre ?? 'Sin definir';
}

/**
 * El acceso que le corresponde a este cargo.
 *
 * Es una **propuesta**: gerencia puede cambiarla. Deducir el rol sin poder
 * corregirlo dejaría sin salida el caso raro —un auxiliar que sí debe entrar al
 * panel— y obligaría a inventarle un cargo falso para resolverlo.
 */
export function rolSugerido(id: string | null | undefined): Rol {
  return cargoPorId(id)?.rolSugerido ?? 'operador';
}

/** ¿Este cargo lleva máquina? Solo a estos se les emite código de activación. */
export function operaVehiculos(id: string | null | undefined): boolean {
  return cargoPorId(id)?.operaVehiculos ?? false;
}
