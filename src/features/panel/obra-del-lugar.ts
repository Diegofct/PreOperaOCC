/**
 * La obra de la dirección, compartida por todo el panel (spec 050, RF-27, RF-29).
 *
 * Su nombre lo pintan el menú (049/RF-24), la ruta de arriba de cada pantalla y la puerta de las
 * páginas de obra. Para quien ve todas las obras, sale de pedir la lista de obras. Si cada uno lo
 * calculara, serían tres peticiones iguales por pantalla, así que se calcula una sola vez en el
 * layout (`ProveedorObraDelLugar`, en `empresas/contexto-empresa`) y aquí solo se lee.
 *
 * Vive aparte y sin dependencias para que `marco.tsx` lo pueda leer: el cálculo usa `useListado`,
 * que es de `marco`, y ponerlo en el mismo archivo haría un import circular.
 */
import { createContext, useContext } from 'react';

import type { ModulosDeObra } from '@/shared/rules/permisos';

export interface ObraDelLugar {
  id: string;
  nombre: string;
  /** Los módulos que lleva (spec 017): el menú esconde los apagados (RF-18). */
  modulos: ModulosDeObra;
}

export const ContextoObraDelLugar = createContext<ObraDelLugar | null>(null);

/**
 * Nombre y módulos de la obra de la dirección (RF-10, RF-18). `null` fuera de una obra,
 * mientras carga, si la obra no es de quien entra, o fuera del proveedor.
 */
export function useObraDelLugar(): ObraDelLugar | null {
  return useContext(ContextoObraDelLugar);
}
