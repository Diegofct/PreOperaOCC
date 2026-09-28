/**
 * Los formatos prestados (spec 020). Función pura, sin I/O.
 *
 * OCC no tiene hoja propia para ocho tipos de equipo, pero indicó que la del
 * tipo más parecido sirve: los de carretera con la de la camioneta, la
 * maquinaria amarilla nueva con una de las tres amarillas. Cuál presta a cuál
 * lo dice `formatoDe` en `@/shared/catalogos/tipos-vehiculo`.
 *
 * ── Por qué una plantilla derivada y no una traducción del tipo ──
 *
 * El celular escoge el formato buscando una plantilla **de su mismo tipo**, y
 * el servidor resuelve un acta por `(tipo, versión)`. Si el camión usara la
 * plantilla de la camioneta traduciendo el tipo al buscar, habría que cambiar
 * esa búsqueda en el celular —un APK nuevo que repartir— y el acta diría
 * «camioneta» sin decir que era un camión. Con una plantilla derivada que ya
 * lleva `tipoVehiculo: 'camion'`, la app instalada la recibe con el pull y la
 * usa sin saber que es prestada.
 *
 * ── Por qué es el mismo documento ──
 *
 * Secciones, versión, medidores, periodicidades y firmas se copian **sin
 * tocar**: es el formato de OCC, no una versión editada. Solo cambian el tipo y
 * el título, y el título no entra en la huella (`cadenaCanonicaDePlantilla`
 * hashea solo las secciones), así que el prestado y su origen tienen el mismo
 * hash. Como se deriva siempre de la versión **vigente** del origen, una versión
 * nueva del formato de la camioneta produce la del camión con el mismo número.
 */
import type { TipoVehiculo } from '@/shared/catalogos/tipos-vehiculo';

import type { PlantillaChecklist } from '../types';

export function plantillaPrestada(
  origen: PlantillaChecklist,
  tipo: TipoVehiculo,
  tipoOrigen: TipoVehiculo,
): PlantillaChecklist {
  return {
    ...origen,
    tipoVehiculo: tipo.id,
    nombre: tipo.nombre,
    tituloFormato: `Preoperacional ${tipo.nombre} (formato ${tipoOrigen.nombre})`,
    prestadoDe: tipoOrigen.id,
  };
}
