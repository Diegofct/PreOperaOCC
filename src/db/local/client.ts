/**
 * Cliente de la base local.
 *
 * IMPORTANTE: este módulo solo puede importarse desde código que corre en el
 * dispositivo — `src/app/(operador)`, `src/sync` y `src/features/*`. Si entra
 * al bundle web, `expo-sqlite` exige WASM y cabeceras COOP/COEP y el
 * despliegue del dashboard se rompe de una forma bastante difícil de leer.
 */
import { drizzle } from 'drizzle-orm/expo-sqlite';
import * as SQLite from 'expo-sqlite';
import { Platform } from 'react-native';

import * as esquema from './schema';

if (Platform.OS === 'web') {
  throw new Error(
    'src/db/local/client.ts se importó desde el bundle web. La base local es solo del dispositivo; ' +
      'el dashboard consulta la API. Revisa la cadena de imports de la pantalla que falló.',
  );
}

export const NOMBRE_BD = 'preoperaocc.db';

export const sqlite = SQLite.openDatabaseSync(NOMBRE_BD, { enableChangeListener: true });

/**
 * WAL evita que una lectura bloquee una escritura: el operador puede estar
 * viendo el historial mientras el motor de sincronización drena la cola.
 * Las llaves foráneas vienen apagadas por defecto en SQLite.
 */
sqlite.execSync('PRAGMA journal_mode = WAL;');
sqlite.execSync('PRAGMA foreign_keys = ON;');

export const db = drizzle(sqlite, { schema: esquema });

export type BaseLocal = typeof db;

/**
 * La base **dentro** de una transacción.
 *
 * No es el mismo tipo que `BaseLocal`: le falta `$client`, y por eso una función
 * que reciba `BaseLocal` no acepta una transacción. Se exporta con nombre propio
 * para que quien tenga que correr dentro de una lo diga en su firma — que es la
 * forma de que el compilador impida ejecutarla por fuera.
 */
export type TransaccionLocal = Parameters<Parameters<typeof db.transaction>[0]>[0];
