/**
 * Aplica las migraciones a la base de **producción**.
 *
 * Existe por un tropiezo del 2026-09-23: el `.env` de desarrollo apunta a la base
 * `neondb` y el contenedor del VPS usa `preoperaocc`, en el mismo host de Neon y
 * con el mismo usuario. Correr `db:migrar:servidor` a secas migra la de
 * desarrollo y deja producción intacta —sin avisar de nada, porque el comando
 * termina diciendo «Listo»—, y el panel queda roto con el contenedor sano.
 *
 * Reescribe solo el nombre de la base en la cadena que ya está en `.env`, en
 * memoria: no escribe la credencial en ningún archivo ni la imprime.
 */
const BASE_DE_PRODUCCION = 'preoperaocc';

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
console.log(`Migrando contra:        ${destino.hostname} / ${BASE_DE_PRODUCCION}`);

void import('./migrar-servidor');
