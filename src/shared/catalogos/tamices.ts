/**
 * La serie de tamices del ensayo de granulometría (spec 018, RF-26, anexo B).
 *
 * Es la del formato de laboratorio LAB-FR-01-2025 (INV E-123-13): quince tamices
 * y el fondo, **en el orden en que se apilan**, de la abertura mayor a la menor. El
 * orden no es cosmético: el porcentaje retenido acumulado se suma de arriba abajo,
 * así que quien recorra esta lista recorre la pila.
 *
 * ── Los id son la llave, no los milímetros ──
 *
 * Un ensayo guarda la masa retenida de cada tamiz por su `id`, y una franja dice sus
 * límites por el mismo `id`. Por eso los id **no se renombran ni se reutilizan**: ya
 * habrá ensayos aprobados apuntándoles. Y por eso los milímetros se pueden corregir
 * sin tocar un solo ensayo — que es justo lo que puede pasar con el ½" (ver abajo).
 *
 * ── El ½" a 12,7 mm ──
 *
 * Así lo trae el Excel de laboratorio, aunque la serie de INVÍAS lo da como 12,5 mm.
 * Se deja como el formato mientras OCC no diga otra cosa (duda abierta de la spec
 * 018). La diferencia apenas mueve el punto en la curva y no cambia ningún cálculo:
 * los porcentajes salen de las masas, no de las aberturas.
 *
 * Está en `catalogos/` y no dentro del módulo porque la usan la regla pura, la
 * pantalla y el informe, y los tres tienen que hablar de los mismos tamices.
 */

export const SERIE_DE_TAMICES = [
  { id: 't_2', nombre: '2"', mm: 50 },
  { id: 't_1_1_2', nombre: '1½"', mm: 37.5 },
  { id: 't_1', nombre: '1"', mm: 25 },
  { id: 't_3_4', nombre: '¾"', mm: 19 },
  { id: 't_1_2', nombre: '½"', mm: 12.7 },
  { id: 't_3_8', nombre: '⅜"', mm: 9.5 },
  { id: 'n_4', nombre: 'N.º 4', mm: 4.75 },
  { id: 'n_8', nombre: 'N.º 8', mm: 2.36 },
  { id: 'n_10', nombre: 'N.º 10', mm: 2 },
  { id: 'n_16', nombre: 'N.º 16', mm: 1.18 },
  { id: 'n_30', nombre: 'N.º 30', mm: 0.6 },
  { id: 'n_40', nombre: 'N.º 40', mm: 0.425 },
  { id: 'n_50', nombre: 'N.º 50', mm: 0.3 },
  { id: 'n_100', nombre: 'N.º 100', mm: 0.15 },
  { id: 'n_200', nombre: 'N.º 200', mm: 0.075 },
  // Bajo el último tamiz no pasa nada: el fondo recoge, pero no tiene abertura ni
  // «% pasa» (RF-52).
  { id: 'fondo', nombre: 'Fondo', mm: null },
] as const;

/** Un tamiz de la serie, fondo incluido. */
export type Tamiz = (typeof SERIE_DE_TAMICES)[number];
export type IdTamiz = Tamiz['id'];

/** Un tamiz con abertura: todos menos el fondo. */
export type TamizConAbertura = Exclude<Tamiz, { id: 'fondo' }>;
export type IdTamizConAbertura = TamizConAbertura['id'];

/**
 * Los quince tamices con abertura, en el mismo orden. Son los que tienen «% pasa»,
 * los que dibuja la curva y los únicos que una franja puede controlar.
 */
export const TAMICES_CON_ABERTURA: readonly TamizConAbertura[] = SERIE_DE_TAMICES.filter(
  (t): t is TamizConAbertura => t.id !== 'fondo',
);

/** El tamiz de ese id, o `undefined` si no es de la serie. */
export function tamizPorId(id: string): Tamiz | undefined {
  return SERIE_DE_TAMICES.find((t) => t.id === id);
}
