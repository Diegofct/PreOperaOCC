/**
 * Dónde se guarda si el menú lateral quedó abierto o plegado. Spec 022, RF-11.
 *
 * En el navegador y no en la base: es una comodidad de quien usa ese computador,
 * no un dato de la obra, y la spec la deja ahí. Sin React ni `window` directo, para
 * poder probarla desde Node con un almacén falso.
 *
 * **Nada de aquí lanza.** En incógnito estricto o con el almacenamiento bloqueado,
 * hasta *leer* `localStorage` lanza una excepción, y el menú no puede romper la
 * página por eso: se comporta como la primera vez (RF-8) y listo.
 */
import type { PreferenciaDelMenu } from '@/shared/rules/menu';

export const CLAVE_PREFERENCIA_MENU = 'preoperaocc.menu';

/** Lo único que se usa de `localStorage`. Un falso lo cumple en las pruebas. */
export interface Almacen {
  getItem(clave: string): string | null;
  setItem(clave: string, valor: string): void;
}

/** El `localStorage` del navegador, o nada si no hay navegador o no deja tocarlo. */
export function almacenDelNavegador(): Almacen | null {
  try {
    return (globalThis as { localStorage?: Almacen }).localStorage ?? null;
  } catch {
    return null;
  }
}

/** Lo guardado, o `null` si no hay nada, no se puede leer o no es un valor nuestro. */
export function leerPreferencia(almacen: Almacen | null): PreferenciaDelMenu {
  try {
    const valor = almacen?.getItem(CLAVE_PREFERENCIA_MENU);
    return valor === 'abierto' || valor === 'plegado' ? valor : null;
  } catch {
    return null;
  }
}

/** Guarda la elección. Devuelve si se pudo; si no, solo dura esta visita. */
export function guardarPreferencia(
  almacen: Almacen | null,
  valor: Exclude<PreferenciaDelMenu, null>,
): boolean {
  if (!almacen) return false;
  try {
    almacen.setItem(CLAVE_PREFERENCIA_MENU, valor);
    return true;
  } catch {
    return false;
  }
}
