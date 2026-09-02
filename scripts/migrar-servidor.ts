/**
 * Aplica las migraciones de la base del servidor.
 *
 *   npm run db:migrar:servidor
 *
 * Usa el migrador de `neon-http` en vez de `drizzle-kit migrate` por una razón
 * concreta: `drizzle-kit` necesitaría un driver de Postgres por TCP instalado
 * —`pg` o `postgres.js`— solo para esto, y el proyecto ya evita `pg` a propósito
 * porque no funciona en Cloudflare Workers. Migrar con el mismo driver con el
 * que corre el servidor evita meter una dependencia que nadie más usa.
 *
 * Después de las migraciones vuelve a aplicar los disparadores de
 * `actualizado_en`, que drizzle-kit no genera. Las sentencias son idempotentes,
 * así que correr esto dos veces no rompe nada.
 *
 * **Aviso del driver por HTTP:** el migrador no envuelve las migraciones en una
 * transacción. Si una falla a la mitad, las anteriores quedaron aplicadas. Con
 * migraciones aditivas —que son las que este proyecto genera— eso es recuperable
 * volviendo a correr el comando.
 */
import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import { migrate } from 'drizzle-orm/neon-http/migrator';

import { sentenciasDeDisparadores } from '../src/db/servidor/disparadores';

async function principal() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error(
      'Falta DATABASE_URL.\n\n' +
        'Crea un archivo .env en la raíz del proyecto con la cadena de conexión de Neon:\n' +
        '  DATABASE_URL=postgresql://usuario:clave@host/base?sslmode=require\n\n' +
        'Está en .gitignore, así que no llega al repositorio.',
    );
    process.exit(1);
  }

  const db = drizzle(neon(url));

  console.log('Aplicando migraciones de drizzle/servidor…');
  await migrate(db, { migrationsFolder: './drizzle/servidor' });

  console.log('Aplicando disparadores de actualizado_en…');
  for (const sentencia of sentenciasDeDisparadores()) {
    await db.execute(sentencia);
  }

  console.log('Listo.');
}

principal().catch((error) => {
  console.error('La migración falló:', error);
  process.exit(1);
});
