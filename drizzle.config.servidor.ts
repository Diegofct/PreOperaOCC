import type { Config } from 'drizzle-kit';

/**
 * Migraciones de la base Postgres del servidor.
 *
 *   npm run db:generate:servidor    escribe el SQL en drizzle/servidor/
 *   npm run db:migrar:servidor      lo aplica contra Neon
 *
 * Va aparte de `drizzle.config.local.ts` porque son dos bases distintas con dos
 * dialectos distintos y ciclos de vida propios: el teléfono migra al arrancar la
 * app, el servidor migra cuando se despliega.
 *
 * `dbCredentials` no lo usa `generate` —el SQL se calcula solo del esquema— pero
 * sí `drizzle-kit studio` y `push`, así que se deja apuntado.
 */
export default {
  schema: './src/db/servidor/esquema.ts',
  out: './drizzle/servidor',
  dialect: 'postgresql',
  dbCredentials: { url: process.env.DATABASE_URL ?? '' },
} satisfies Config;
