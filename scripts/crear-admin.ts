/**
 * Crea —o repone— una cuenta de gerencia para el panel.
 *
 *   npm run crear-admin
 *
 * Existe por un problema circular: el panel exige contraseña para entrar, y las
 * contraseñas se reparten desde el panel. Alguien tiene que estar dentro antes
 * de que haya nadie dentro.
 *
 * Se resuelve desde la terminal y no con una página de instalación a propósito.
 * Una página así, aunque solo aparezca mientras la base esté vacía, es una
 * ventana en la que quien llegue primero se queda con el sistema entero. Un
 * comando local no tiene esa ventana: hay que estar en la máquina y tener la
 * cadena de conexión.
 *
 * **Y sigue siendo útil después del primer día.** Si gerencia se queda fuera
 * —contraseña olvidada, y no hay otro administrador que se la reponga— esta es
 * la salida. Por eso, si el usuario ya existe, ofrece reponerle la contraseña en
 * vez de fallar.
 *
 * La contraseña se teclea oculta y nunca se pasa como argumento: un argumento
 * queda en el historial del shell y, mientras corre, en la lista de procesos que
 * cualquier otro usuario de la máquina puede leer.
 */
import { createInterface } from 'node:readline';
import type { Interface } from 'node:readline';

import { neon } from '@neondatabase/serverless';
import { and, eq, isNull } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/neon-http';
import { uuidv7 } from 'uuidv7';

import { credencialesWeb, usuarios } from '../src/db/servidor/esquema';
import { hashDeClave } from '../src/features/auth/servidor/cripto';
import { LONGITUD_MINIMA_CLAVE } from '../src/features/panel/contratos';

/**
 * La entrada se lee línea a línea con el iterador de `readline`, no con
 * `rl.question`.
 *
 * `question` solo funciona bien contra un terminal: si la entrada llega por una
 * tubería, el flujo termina después de la primera pregunta y el resto falla con
 * un críptico "readline was closed". Con el iterador, el comando se comporta
 * igual tecleado a mano que alimentado desde un archivo o un script.
 */
function abrirLector(rl: Interface) {
  const lineas = rl[Symbol.asyncIterator]();

  async function leerLinea(): Promise<string> {
    const { value, done } = await lineas.next();
    if (done) abortar('La entrada terminó antes de tiempo. No se cambió nada.');
    return String(value).trim();
  }

  async function preguntar(texto: string): Promise<string> {
    process.stdout.write(texto);
    return leerLinea();
  }

  /**
   * Lee sin mostrar lo tecleado.
   *
   * `readline` no trae ocultación: se silencia la salida interceptando la
   * escritura del propio stream mientras dura la lectura, que es la forma
   * estándar de hacerlo en Node. Solo tiene sentido contra un terminal — si la
   * entrada viene por tubería no hay eco que esconder.
   */
  async function preguntarOculto(texto: string): Promise<string> {
    process.stdout.write(texto);

    const salida = process.stdout;
    const escribirOriginal = salida.write.bind(salida);
    const ocultar = process.stdin.isTTY === true;

    if (ocultar) {
      salida.write = (() => true) as typeof salida.write;
    }

    try {
      return await leerLinea();
    } finally {
      salida.write = escribirOriginal;
      if (ocultar) salida.write('\n');
    }
  }

  return { preguntar, preguntarOculto };
}

function abortar(mensaje: string): never {
  console.error(`\n${mensaje}`);
  process.exit(1);
}

async function principal() {
  if (!process.env.DATABASE_URL) {
    abortar('Falta DATABASE_URL. Revise el archivo .env en la raíz del proyecto.');
  }

  const db = drizzle(neon(process.env.DATABASE_URL));
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  const { preguntar, preguntarOculto } = abrirLector(rl);

  try {
    console.log('\nCuenta de gerencia para el panel de administración.\n');

    const usuario = (await preguntar('Usuario (con esto ingresa): ')).toLowerCase();
    if (!/^[a-z0-9._-]+$/.test(usuario)) {
      abortar('El usuario solo admite letras, números, punto, guion y guion bajo.');
    }

    const [existente] = await db
      .select({ id: usuarios.id, nombreCompleto: usuarios.nombreCompleto, rol: usuarios.rol })
      .from(usuarios)
      .where(and(eq(usuarios.usuario, usuario), isNull(usuarios.eliminadoEn)))
      .limit(1);

    let nombreCompleto = existente?.nombreCompleto ?? '';

    if (existente) {
      console.log(`\n"${usuario}" ya existe: ${existente.nombreCompleto} (${existente.rol}).`);
      const respuesta = await preguntar('¿Reponerle la contraseña? (s/n): ');
      if (respuesta.toLowerCase() !== 's') abortar('Cancelado. No se cambió nada.');
    } else {
      nombreCompleto = await preguntar('Nombre completo: ');
      if (!nombreCompleto) abortar('El nombre completo es obligatorio.');
    }

    const clave = await preguntarOculto('Contraseña (no se muestra): ');
    if (clave.length < LONGITUD_MINIMA_CLAVE) {
      abortar(`La contraseña necesita al menos ${LONGITUD_MINIMA_CLAVE} caracteres.`);
    }

    const repetida = await preguntarOculto('Repítala: ');
    if (clave !== repetida) abortar('Las contraseñas no coinciden. No se cambió nada.');

    console.log('\nDerivando la contraseña…');
    const hash = await hashDeClave(clave);

    const usuarioId = existente?.id ?? uuidv7();

    if (!existente) {
      await db.insert(usuarios).values({
        id: usuarioId,
        usuario,
        nombreCompleto,
        rol: 'admin',
        activo: true,
      });
    } else if (existente.rol !== 'admin') {
      // Reponer la clave de alguien que no es gerencia no le cambia el cargo:
      // este comando repone accesos, no reparte permisos.
      console.log(`Aviso: "${usuario}" tiene el cargo "${existente.rol}", y así se queda.`);
    }

    // `debeCambiar: false` — a diferencia de las temporales que reparte el panel,
    // esta contraseña la eligió quien la va a usar. Obligarle a cambiar la que
    // acaba de inventar no protegería de nada.
    await db
      .insert(credencialesWeb)
      .values({ usuarioId, hash, debeCambiar: false })
      .onConflictDoUpdate({
        target: credencialesWeb.usuarioId,
        set: { hash, debeCambiar: false },
      });

    console.log(
      `\nListo. Entre en http://localhost:8081/panel con el usuario "${usuario}".\n` +
        'La contraseña no se guardó en ningún otro sitio: si se pierde, vuelva a correr este comando.\n',
    );
  } finally {
    rl.close();
  }
}

principal().catch((error) => {
  console.error('\nFalló:', error?.cause?.message ?? error?.message ?? error);
  process.exit(1);
});
