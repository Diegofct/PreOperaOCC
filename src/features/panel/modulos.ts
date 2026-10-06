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
  laboratorio: { ruta: '/panel/laboratorio', titulo: 'Laboratorio' },
  whatsapp: { ruta: '/panel/whatsapp', titulo: 'Reportes de WhatsApp' },
  // `as const` conserva las rutas como literales, que es lo que exigen las
  // rutas tipadas de Expo Router; `satisfies` obliga a que estén todos.
} as const satisfies Record<Modulo, { ruta: string; titulo: string }>;

/** La ruta de un módulo, como literal que acepta `Link` y `Redirect`. */
export type RutaDeModulo = (typeof ENLACES_DE_MODULO)[Modulo]['ruta'];

/**
 * El módulo al que pertenece una dirección, para resaltarlo en el menú (spec 022,
 * RF-6).
 *
 * Por prefijo y no por igualdad: el informe de un ensayo vive en
 * `/panel/laboratorio/<id>/informe` y tiene que marcar Laboratorio. El prefijo se
 * corta en una barra, para que una ruta como `/panel/obrasx` no pase por Obras.
 * Inicio es la única que se compara entera: todas empiezan por `/panel`.
 */
export function moduloDeLaRuta(ruta: string): Modulo | null {
  const limpia = ruta.length > 1 ? ruta.replace(/\/+$/, '') : ruta;
  if (limpia === ENLACES_DE_MODULO.inicio.ruta) return 'inicio';
  for (const [modulo, enlace] of Object.entries(ENLACES_DE_MODULO) as [Modulo, { ruta: string }][]) {
    if (modulo === 'inicio') continue;
    if (limpia === enlace.ruta || limpia.startsWith(`${enlace.ruta}/`)) return modulo;
  }
  return null;
}

const SISTEMA = 'Control de Obra OCC';

/**
 * El título de la pestaña del navegador para una dirección del panel.
 *
 * Existe porque Expo Router 57 no copia el `title` de cada pantalla del `Stack` a la
 * pestaña: su `NavigationContainer` lleva `documentTitle` apagado. Los títulos que
 * declaraba el layout nunca se vieron —todas las pestañas del panel quedaban en
 * blanco— y era difícil distinguir cinco pestañas abiertas (defecto corregido el
 * 2026-10-06). Sale de la ruta, igual que el módulo resaltado del menú.
 */
export function tituloDeLaPestana(ruta: string): string {
  if (/^\/panel\/laboratorio\/[^/]+\/informe\/?$/.test(ruta)) {
    return `Informe de granulometría · ${SISTEMA}`;
  }
  if (/^\/panel\/laboratorio\/[^/]+\/?$/.test(ruta)) {
    return `Ensayo de granulometría · ${SISTEMA}`;
  }
  const modulo = moduloDeLaRuta(ruta);
  if (!modulo || modulo === 'inicio') return SISTEMA;
  return `${ENLACES_DE_MODULO[modulo].titulo} · ${SISTEMA}`;
}
