/**
 * Plantillas importadas de los formatos de OCC.
 *
 * Generadas por `npx tsx scripts/import-formatos.ts` a partir de `docs/*.xlsx`.
 * No editar los JSON a mano: se regeneran. Los ajustes que el Excel no puede
 * expresar (qué ítems exigen foto, rangos de medidores, ítems que inmovilizan
 * en la maquinaria amarilla) se aplican en `ajustes.ts`.
 */
import type { PlantillaChecklist } from '../types';

import camioneta from './camioneta.v1.json';
import motoniveladora from './motoniveladora.v1.json';
import retrocargador from './retrocargador.v1.json';
import retroexcavadora from './retroexcavadora.v1.json';
import volqueta from './volqueta.v1.json';

export const PLANTILLAS: PlantillaChecklist[] = [
  camioneta,
  volqueta,
  retroexcavadora,
  retrocargador,
  motoniveladora,
] as PlantillaChecklist[];

export const PLANTILLAS_POR_TIPO = new Map(PLANTILLAS.map((p) => [p.tipoVehiculo, p]));
