/**
 * El menú lateral del panel: qué grupos se ven y cuándo se queda fijo. Spec 022.
 *
 * Puro y sin I/O, como toda regla, para poder comprobarlo desde Node. **Quién ve
 * qué módulo no se decide aquí**: sigue saliendo de `modulosVisibles` en
 * `permisos.ts` (RF-2). Esto solo los reparte en grupos y quita los que quedan
 * vacíos, para que un almacenista no vea títulos sin nada debajo (RF-4).
 *
 * El régimen depende del ancho de la ventana y de lo que la persona eligió. La
 * elección no manda en ventana angosta: ahí el menú abierto le quitaría a las
 * tablas lo que necesitan, así que va plegado y se abre encima (RF-12, RF-13).
 */
import {
  AnchoBarraDesplazamiento,
  AnchoMinimoMenuFijo,
  MaxContentWidthPanel,
  Spacing,
} from '../../constants/medidas';
import type { Modulo } from './permisos';

export interface GrupoDelMenu {
  /** `null` para Inicio, que va suelto arriba y sin título. */
  titulo: string | null;
  modulos: readonly Modulo[];
}

/**
 * Los grupos, en el orden del menú (RF-3).
 *
 * El trabajo de cada día va arriba: es a lo que se entra todas las tardes. La
 * administración va al final porque se toca al empezar una obra y poco después.
 * Una prueba exige que cada módulo de `MODULOS` esté en exactamente un grupo.
 */
export const GRUPOS_DEL_MENU: readonly GrupoDelMenu[] = [
  { titulo: null, modulos: ['inicio'] },
  { titulo: 'El día a día', modulos: ['bitacoras', 'whatsapp', 'preoperacionales'] },
  { titulo: 'Módulos de obra', modulos: ['almacen', 'cantera', 'laboratorio'] },
  { titulo: 'Administración', modulos: ['obras', 'personas', 'vehiculos', 'asignaciones'] },
];

/** Los grupos con solo los módulos visibles; los que quedan vacíos no salen (RF-4). */
export function gruposDelMenu(visibles: readonly Modulo[]): GrupoDelMenu[] {
  return GRUPOS_DEL_MENU.map((grupo) => ({
    titulo: grupo.titulo,
    modulos: grupo.modulos.filter((modulo) => visibles.includes(modulo)),
  })).filter((grupo) => grupo.modulos.length > 0);
}

/** Lo que la persona eligió la última vez; `null` si nunca eligió (RF-8). */
export type PreferenciaDelMenu = 'abierto' | 'plegado' | null;

/**
 * Cómo se dibuja el menú.
 *
 * - `fijoAbierto` y `fijoPlegado`: ocupa su columna y empuja el contenido.
 * - `riel`: ventana angosta; se ve plegado y, al abrirlo, va encima (RF-13).
 */
export type RegimenDelMenu = 'fijoAbierto' | 'fijoPlegado' | 'riel';

export function regimenDelMenu({
  ventana,
  preferencia,
}: {
  ventana: number;
  preferencia: PreferenciaDelMenu;
}): RegimenDelMenu {
  if (ventana < AnchoMinimoMenuFijo) return 'riel';
  return preferencia === 'plegado' ? 'fijoPlegado' : 'fijoAbierto';
}

/**
 * El ancho que le queda al contenido: la ventana menos el menú, el margen de
 * página a cada lado y la barra de desplazamiento, sin pasar del tope de página.
 *
 * Es el número que cuenta para decidir el índice del parte diario y el
 * presupuesto de las tablas. El ancho de la ventana ya no sirve para eso: con el
 * menú abierto miente por 248.
 */
export function anchoDelContenido(ventana: number, anchoMenu: number): number {
  return Math.min(
    ventana - anchoMenu - 2 * Spacing.four - AnchoBarraDesplazamiento,
    MaxContentWidthPanel,
  );
}
