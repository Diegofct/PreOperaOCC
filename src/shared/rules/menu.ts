/**
 * El menú lateral del panel: cuándo se queda fijo y cuánto mide el contenido. Spec 022.
 *
 * Puro y sin I/O, como toda regla, para poder comprobarlo desde Node. Qué lleva el menú
 * ya no se decide aquí: desde la spec 033 cada empresa y cada obra tienen el suyo
 * (`menuDelLugar`, en `empresas.ts`), y los grupos de antes se quitaron.
 *
 * El régimen depende del ancho de la ventana y de lo que la persona eligió. La
 * elección no manda en ventana angosta: ahí el menú abierto le quitaría a las
 * tablas lo que necesitan, así que va plegado y se abre encima (RF-12, RF-13).
 */
import {
  AnchoBarraDesplazamiento,
  AnchoCelular,
  AnchoMinimoMenuFijo,
  MaxContentWidthPanel,
  Spacing,
} from '../../constants/medidas';

/** Lo que la persona eligió la última vez; `null` si nunca eligió (RF-8). */
export type PreferenciaDelMenu = 'abierto' | 'plegado' | null;

/**
 * Cómo se dibuja el menú.
 *
 * - `fijoAbierto` y `fijoPlegado`: ocupa su columna y empuja el contenido.
 * - `riel`: ventana angosta; se ve plegado y, al abrirlo, va encima (RF-13).
 */
/** `oculto`: en el celular, ni siquiera el riel; se abre con ☰ encima (spec 026, RF-33). */
export type RegimenDelMenu = 'fijoAbierto' | 'fijoPlegado' | 'riel' | 'oculto';

export function regimenDelMenu({
  ventana,
  preferencia,
}: {
  ventana: number;
  preferencia: PreferenciaDelMenu;
}): RegimenDelMenu {
  if (ventana < AnchoCelular) return 'oculto';
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
