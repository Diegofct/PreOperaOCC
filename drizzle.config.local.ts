import type { Config } from 'drizzle-kit';

/**
 * Migraciones de la base SQLite que vive dentro del teléfono.
 *
 *   npx drizzle-kit generate --config drizzle.config.local.ts
 *
 * El driver `expo` hace que drizzle-kit emita además `drizzle/local/migrations.js`,
 * que es lo que el `migrator` de expo-sqlite consume dentro del bundle.
 */
export default {
  schema: './src/db/local/schema.ts',
  out: './drizzle/local',
  dialect: 'sqlite',
  driver: 'expo',
} satisfies Config;
