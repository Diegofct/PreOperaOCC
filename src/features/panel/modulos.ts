/**
 * La dirección y el rótulo de cada módulo del panel.
 *
 * Vive aparte de la barra porque no la usa solo la barra: la portada manda a su
 * módulo a quien no ve el inicio (spec 008, RF-4), y esa dirección tiene que ser
 * la misma que la del menú. Dos listas acabarían diciendo cosas distintas.
 *
 * Qué módulos ve cada rol y en qué orden lo dice la tabla de permisos, no esta
 * lista: aquí solo viven la ruta y el rótulo. Si algún día se añade un módulo a
 * la tabla y se olvida aquí, TypeScript lo dice — el `Record` obliga a que estén
 * todos.
 */
import type { Modulo } from '@/shared/rules/permisos';

export const ENLACES_DE_MODULO = {
  inicio: { ruta: '/panel', titulo: 'Inicio' },
  obras: { ruta: '/panel/obras', titulo: 'Obras' },
  personas: { ruta: '/panel/personas', titulo: 'Personas' },
  vehiculos: { ruta: '/panel/vehiculos', titulo: 'Vehículos' },
  asignaciones: { ruta: '/panel/asignaciones', titulo: 'Asignaciones' },
  bitacoras: { ruta: '/panel/bitacoras', titulo: 'Bitácoras' },
  preoperacionales: { ruta: '/panel/preoperacionales', titulo: 'Preoperacionales' },
  almacen: { ruta: '/panel/almacen', titulo: 'Almacén' },
  cantera: { ruta: '/panel/cantera', titulo: 'Control Cantera' },
  // `as const` conserva las rutas como literales, que es lo que exigen las
  // rutas tipadas de Expo Router; `satisfies` obliga a que estén todos.
} as const satisfies Record<Modulo, { ruta: string; titulo: string }>;

/** La ruta de un módulo, como literal que acepta `Link` y `Redirect`. */
export type RutaDeModulo = (typeof ENLACES_DE_MODULO)[Modulo]['ruta'];
