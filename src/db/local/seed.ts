/**
 * Siembra local de arranque.
 *
 * Solo catálogo: los cinco tipos de equipo y las plantillas de los formatos de
 * OCC. Es el respaldo del primer arranque — un teléfono recién activado ya puede
 * abrir un preoperacional aunque el pull todavía no haya corrido.
 *
 * **Aquí ya no hay datos de demostración.** Los había —una obra, cuatro
 * operadores con sus PIN escritos en este archivo, seis máquinas— y sirvieron
 * para probar el flujo en obra sin servidor. Murieron con la bajada de datos: un
 * PIN escrito en el código es un PIN que cualquiera puede leer, y no se apagaba
 * solo. Lo que queda de ellos en los equipos que ya los tenían lo limpia
 * `purga-demo.ts`, dentro de la primera sincronización.
 */
import * as Crypto from 'expo-crypto';

import { PLANTILLAS } from '@/features/checklists/plantillas';
import type { PlantillaChecklist } from '@/features/checklists/types';
import { cadenaCanonicaDePlantilla, idDePlantilla } from '@/shared/catalogos/plantillas';
import { TIPOS_VEHICULO } from '@/shared/catalogos/tipos-vehiculo';

import { db } from './client';
import { plantillas, tiposVehiculo } from './schema';

/** SHA-256 del JSON canónico: detecta que una plantilla fue alterada. */
export async function hashDePlantilla(plantilla: PlantillaChecklist): Promise<string> {
  return Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    cadenaCanonicaDePlantilla(plantilla),
  );
}

async function sembrarTipos() {
  for (const tipo of TIPOS_VEHICULO) {
    await db.insert(tiposVehiculo).values(tipo).onConflictDoNothing();
  }
}

async function sembrarPlantillas() {
  for (const plantilla of PLANTILLAS) {
    const hash = await hashDePlantilla(plantilla);
    const id = idDePlantilla(plantilla);
    await db
      .insert(plantillas)
      .values({
        id,
        tipoVehiculoId: plantilla.tipoVehiculo,
        version: plantilla.version,
        hash,
        esquema: plantilla,
        publicadaEn: Date.now(),
      })
      .onConflictDoNothing();
  }
}

export async function sembrarBaseLocal() {
  await sembrarTipos();
  await sembrarPlantillas();
}
