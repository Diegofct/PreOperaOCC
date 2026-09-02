/**
 * Conexión a la base del servidor.
 *
 * Es el espejo de `src/db/local/client.ts`, con la frontera puesta al revés:
 * aquel lanza si entra al bundle web, y este lanza si alguien lo importa sin que
 * exista `DATABASE_URL`. Las dos guardas dicen lo mismo desde cada lado — este
 * módulo es del servidor y solo del servidor.
 *
 * **Driver por HTTP, no por TCP.** El servidor correrá en Cloudflare Workers,
 * que no puede abrir sockets; `pg` y cualquier cliente de Postgres clásico
 * quedan descartados de raíz. `@neondatabase/serverless` habla el protocolo por
 * `fetch`, que es lo único que hay.
 *
 * **Consecuencia que hay que tener presente al escribir endpoints:** por HTTP no
 * existen las transacciones interactivas. No se puede abrir una transacción,
 * mirar el resultado y decidir el siguiente paso. Una operación de varios pasos
 * tiene que ser o una sola sentencia, o un lote que se pueda reintentar entero
 * sin efectos raros. En este entregable ninguna lo necesita; la primera será
 * canjear un código de activación.
 *
 * Nada de este archivo llega al navegador: `DATABASE_URL` solo se lee desde
 * rutas `+api.ts`, y Expo elimina del bundle del cliente lo que solo se importa
 * desde ellas.
 */
import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';

import { ErrorDeConfiguracion } from '@/features/servidor/configuracion';

import { esquemaServidor } from './esquema';

function cadenaDeConexion(): string {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new ErrorDeConfiguracion(
      'Falta DATABASE_URL. Crea un archivo .env en la raíz del proyecto con la cadena de ' +
        'conexión de Neon:\n\n  DATABASE_URL=postgresql://usuario:clave@host/base?sslmode=require\n\n' +
        'El archivo ya está en .gitignore, así que el secreto no llega al repositorio.',
    );
  }
  return url;
}

let instancia: ReturnType<typeof construir> | null = null;

function construir() {
  return drizzle(neon(cadenaDeConexion()), { schema: esquemaServidor });
}

/**
 * La base, construida la primera vez que alguien la pide y reutilizada después.
 *
 * Es una función y no una constante a propósito: si se construyera al importar
 * el módulo, `npx expo export` fallaría en cualquier máquina sin `.env` —una
 * máquina de CI, por ejemplo— pese a que empaquetar no necesita base ninguna.
 * Así el error aparece cuando de verdad hace falta una conexión, que es cuando
 * se puede hacer algo al respecto.
 *
 * Como el driver no mantiene conexiones abiertas —cada consulta es un `fetch`—
 * no hay pool que agotar ni nada que cerrar al terminar la petición.
 */
export function baseServidor() {
  instancia ??= construir();
  return instancia;
}

export { esquemaServidor };
