/** Declaraciones para los assets que Metro resuelve pero TypeScript no conoce. */

declare module '*.css';

declare module '*.module.css' {
  const clases: Record<string, string>;
  export default clases;
}

/**
 * `drizzle-kit generate --driver expo` emite un `migrations.js` sin tipos, con
 * el SQL de cada migración ya incrustado para que viaje dentro del bundle.
 */
declare module '*/drizzle/local/migrations' {
  const migraciones: {
    journal: { entries: { idx: number; when: number; tag: string; breakpoints: boolean }[] };
    migrations: Record<string, string>;
  };
  export default migraciones;
}
