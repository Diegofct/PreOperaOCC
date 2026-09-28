/**
 * Apunta el proceso a la base de **producción**, en memoria.
 *
 * Existe por un tropiezo del 2026-09-23: el `.env` de desarrollo apunta a la base
 * `neondb` y el contenedor del VPS usa `preoperaocc`, en el mismo host de Neon y
 * con el mismo usuario. Correr un comando de base a secas —migrar o sembrar— lo
 * hace contra desarrollo y deja producción intacta, sin avisar de nada, porque el
 * comando termina diciendo «Listo».
 *
 * Reescribe solo el nombre de la base en la cadena que ya está en `.env`: no
 * escribe la credencial en ningún archivo ni la imprime. Lo usan
 * `migrar-produccion.ts` y `sembrar-produccion.ts` (spec 019), y vive aquí para
 * que el nombre de la base cambie en un solo sitio.
 *
 * El script que lo llama tiene que cargar el trabajo con `import()` **después**
 * de llamarlo: un `import` estático se evaluaría antes y leería la cadena vieja.
 */
const BASE_DE_PRODUCCION = 'preoperaocc';

/** @param accion Lo que se va a hacer, para el aviso: «Migrando», «Sembrando». */
export function apuntarAProduccion(accion: string): void {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error('Falta DATABASE_URL en .env');
    process.exit(1);
  }

  const destino = new URL(url);
  const origen = destino.pathname.replace(/^\//, '');
  destino.pathname = `/${BASE_DE_PRODUCCION}`;
  process.env.DATABASE_URL = destino.toString();

  console.log(`Base de origen en .env: ${origen}`);
  console.log(`${`${accion} contra:`.padEnd(23)} ${destino.hostname} / ${BASE_DE_PRODUCCION}`);
}
