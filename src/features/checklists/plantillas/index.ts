/**
 * Plantillas importadas de los formatos de OCC.
 *
 * Generadas por `npx tsx scripts/import-formatos.ts` a partir de `docs/*.xlsx`.
 * No editar los JSON a mano: se regeneran. Los ajustes que el Excel no puede
 * expresar (qué ítems exigen foto, rangos de medidores, ítems que inmovilizan
 * en la maquinaria amarilla) se aplican en `ajustes.ts`.
 */
import type { PlantillaChecklist } from '../types';

// Aquí se importa **solo la versión vigente** de cada formato. Las anteriores se
// quedan en la carpeta como registro de lo que se firmó antes y sus filas siguen
// vivas en la base del servidor, que es de donde se resuelve un acta ya firmada;
// no se importan porque nadie debe volver a llenar un formato viejo.
//
// La camioneta y la volqueta van por la v3 y las tres amarillas por la v2: la
// spec 003 quitó el horómetro de las dos primeras y la spec 011 podó las cinco.
// Cada poda cambia la huella del formato, y por eso sube la versión.
import camioneta from './camioneta.v3.json';
import motoniveladora from './motoniveladora.v2.json';
import retrocargador from './retrocargador.v2.json';
import retroexcavadora from './retroexcavadora.v2.json';
import volqueta from './volqueta.v3.json';

export const PLANTILLAS: PlantillaChecklist[] = [
  camioneta,
  volqueta,
  retroexcavadora,
  retrocargador,
  motoniveladora,
] as PlantillaChecklist[];

export const PLANTILLAS_POR_TIPO = new Map(PLANTILLAS.map((p) => [p.tipoVehiculo, p]));
