/**
 * Plantillas importadas de los formatos de OCC.
 *
 * Generadas por `npx tsx scripts/import-formatos.ts` a partir de `docs/*.xlsx`.
 * No editar los JSON a mano: se regeneran. Los ajustes que el Excel no puede
 * expresar (qué ítems exigen foto, rangos de medidores, ítems que inmovilizan
 * en la maquinaria amarilla) se aplican en `ajustes.ts`.
 */
import type { PlantillaChecklist } from '../types';

// La camioneta y la volqueta van por la v2: la spec 003 les quitó el horómetro,
// y quitar un ítem cambia la huella del formato, así que sube la versión. Los
// archivos `.v1.json` de esas dos se quedan en la carpeta como registro de lo
// que se firmó antes; no se importan aquí, pero sus filas siguen vivas en la
// base del servidor, que es de donde se resuelve un acta ya firmada.
import camioneta from './camioneta.v2.json';
import motoniveladora from './motoniveladora.v1.json';
import retrocargador from './retrocargador.v1.json';
import retroexcavadora from './retroexcavadora.v1.json';
import volqueta from './volqueta.v2.json';

export const PLANTILLAS: PlantillaChecklist[] = [
  camioneta,
  volqueta,
  retroexcavadora,
  retrocargador,
  motoniveladora,
] as PlantillaChecklist[];

export const PLANTILLAS_POR_TIPO = new Map(PLANTILLAS.map((p) => [p.tipoVehiculo, p]));
