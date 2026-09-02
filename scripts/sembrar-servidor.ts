/**
 * Siembra el catálogo de la base del servidor.
 *
 *   npm run db:sembrar:servidor
 *
 * Siembra **solo lo que es catálogo**: los cinco tipos de equipo y las plantillas
 * de los formatos de OCC. Ni una obra, ni una persona, ni un vehículo — eso lo
 * registra la administración desde el panel, y ese es justamente el punto del
 * entregable. Una siembra de datos de trabajo aquí volvería a meter datos de
 * mentira en producción, que es lo que este trabajo vino a quitar.
 *
 * Es idempotente: correrlo dos veces no duplica nada y actualiza la plantilla si
 * el formato cambió de contenido sin cambiar de versión.
 */
import { createHash } from 'node:crypto';

import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';

import { plantillas, tiposVehiculo } from '../src/db/servidor/esquema';
import { PLANTILLAS } from '../src/features/checklists/plantillas';
import { cadenaCanonicaDePlantilla, idDePlantilla } from '../src/shared/catalogos/plantillas';
import { TIPOS_VEHICULO } from '../src/shared/catalogos/tipos-vehiculo';

/**
 * El mismo SHA-256 que calcula el teléfono con `expo-crypto`, sobre la misma
 * cadena canónica. Que las dos den lo mismo es lo que permite comparar la
 * plantilla del servidor con la del dispositivo.
 */
function hashDePlantilla(cadena: string): string {
  return createHash('sha256').update(cadena, 'utf8').digest('hex');
}

async function principal() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error('Falta DATABASE_URL. Ver el archivo .env en la raíz del proyecto.');
    process.exit(1);
  }

  const db = drizzle(neon(url));

  for (const tipo of TIPOS_VEHICULO) {
    await db
      .insert(tiposVehiculo)
      .values(tipo)
      .onConflictDoUpdate({
        target: tiposVehiculo.id,
        set: { nombre: tipo.nombre, claseMedidor: tipo.claseMedidor, eliminadoEn: null },
      });
  }
  console.log(`Tipos de equipo: ${TIPOS_VEHICULO.length}`);

  for (const plantilla of PLANTILLAS) {
    const hash = hashDePlantilla(cadenaCanonicaDePlantilla(plantilla));
    await db
      .insert(plantillas)
      .values({
        id: idDePlantilla(plantilla),
        tipoVehiculoId: plantilla.tipoVehiculo,
        version: plantilla.version,
        hash,
        esquema: plantilla,
        publicadaEn: new Date(),
      })
      .onConflictDoUpdate({
        target: plantillas.id,
        set: { hash, esquema: plantilla, eliminadoEn: null },
      });
  }
  console.log(`Plantillas: ${PLANTILLAS.length}`);

  console.log('Listo. Las obras, las personas y los vehículos se registran desde /panel.');
}

principal().catch((error) => {
  console.error('La siembra falló:', error);
  process.exit(1);
});
