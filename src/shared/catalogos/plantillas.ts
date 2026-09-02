/**
 * Qué se hashea de una plantilla, decidido en un solo sitio.
 *
 * El hash de la plantilla detecta que un formato fue alterado, y por eso lo
 * calculan dos runtimes distintos: el teléfono con `expo-crypto` y el servidor
 * con `node:crypto`. Los algoritmos son el mismo SHA-256, pero **lo que entra**
 * al algoritmo tenía que ser idéntico y estaba escrito por duplicado. Si las dos
 * cadenas divergieran, cada plantilla tendría dos hashes y el pull marcaría como
 * alteradas plantillas intactas.
 *
 * Solo se hashean las secciones: el `id` y la `version` van aparte en la fila, y
 * el nombre del formato puede corregirse sin que eso signifique que el contenido
 * cambió.
 *
 * Módulo puro: lo importan Hermes y Node por igual.
 */
import type { PlantillaChecklist } from '@/features/checklists/types';

/** La representación exacta que se le entrega al SHA-256. */
export function cadenaCanonicaDePlantilla(plantilla: PlantillaChecklist): string {
  return JSON.stringify(plantilla.secciones);
}

/** El identificador de la fila `plantillas`, igual en las dos bases. */
export function idDePlantilla(plantilla: PlantillaChecklist): string {
  return `${plantilla.tipoVehiculo}-v${plantilla.version}`;
}
