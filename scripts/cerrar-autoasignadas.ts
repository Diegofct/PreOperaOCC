/**
 * Cierra las asignaciones que los operadores se pusieron a sí mismos.
 *
 *   npm run cerrar:autoasignadas -- --simular   (solo mira, no escribe)
 *   npm run cerrar:autoasignadas               (cierra de verdad)
 *
 * Spec 012 / RF-13 y RF-14. Hasta esta spec, un operador que llegaba a obra sin
 * asignación escogía su máquina desde el celular y la fila quedaba marcada
 * `autoasignada`, esperando que alguien la confirmara desde el panel. Eso se
 * acabó: la administración decide. Pero las que ya existen siguen vivas, y
 * mientras `hasta` sea nulo el operador sigue viendo esa máquina como suya.
 *
 * ── Por qué un guion y no una migración ──
 *
 * Es un cambio de datos de negocio, no de forma. Una migración describe cómo son
 * las tablas; esto decide qué pasa con unas filas concretas un día concreto, y
 * hay que poder mirarlo antes, correrlo cuando la obra no esté a mitad de
 * jornada, y dejar escrito qué se cerró.
 *
 * ── Lo que NO hace, y es lo importante ──
 *
 * **No toca `origen`.** Cerrarlas es una cosa; borrar el hecho de que se tomaron
 * sin que nadie las asignara es otra, y eso es evidencia de cómo se operó esa
 * máquina (RF-14). La fila queda «Cerrada» en el panel, conservando su etiqueta
 * de origen. Tampoco borra nada: escribe `hasta`, como todas las bajas de este
 * proyecto.
 *
 * ── Por qué el WHERE no mira `eliminado_en` ──
 *
 * Porque la consulta del celular tampoco lo mira: `asignacionesVigentesDe`
 * filtra por `hasta is null` y por la baja del **vehículo**, no por la de la
 * asignación. Una fila con baja lógica y `hasta` abierto le seguiría apareciendo
 * al operador, así que también hay que cerrarla.
 *
 * ── Por qué no hace falta transacción ──
 *
 * Neon habla por HTTP y no tiene transacciones interactivas, así que leer y
 * después escribir podría ver dos fotos distintas. Aquí da igual: desde la tarea
 * T1 el servidor responde 422 a cualquier autoasignación que llegue de un
 * celular, o sea que **nadie puede crear una nueva**. El conjunto solo puede
 * encoger, nunca crecer, y el `UPDATE` es una sola sentencia.
 */
import { neon } from '@neondatabase/serverless';

interface FilaAbierta {
  id: string;
  vehiculo: string | null;
  operador: string | null;
  obra: string | null;
  desde: Date | string;
}

/** Recorta a lo ancho para que la tabla quepa en una terminal. */
function corto(texto: string | null, ancho: number): string {
  const limpio = texto ?? '—';
  return limpio.length > ancho ? `${limpio.slice(0, ancho - 1)}…` : limpio.padEnd(ancho);
}

function dia(valor: Date | string): string {
  const ms = valor instanceof Date ? valor.getTime() : Date.parse(valor);
  return Number.isNaN(ms) ? '—' : new Date(ms).toISOString().slice(0, 10);
}

async function principal() {
  const simular = process.argv.includes('--simular');

  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error(
      'Falta DATABASE_URL.\n\n' +
        'Crea un archivo .env en la raíz del proyecto con la cadena de conexión de Neon.\n' +
        'Está en .gitignore, así que no llega al repositorio.',
    );
    process.exit(1);
  }

  const sql = neon(url);

  const abiertas = (await sql`
    SELECT a.id,
           v.codigo_interno  AS vehiculo,
           u.nombre_completo AS operador,
           o.nombre          AS obra,
           a.desde
    FROM asignaciones a
    LEFT JOIN vehiculos v ON v.id = a.vehiculo_id
    LEFT JOIN usuarios  u ON u.id = a.usuario_id
    LEFT JOIN obras     o ON o.id = a.obra_id
    WHERE a.origen = 'autoasignada' AND a.hasta IS NULL
    ORDER BY a.desde
  `) as FilaAbierta[];

  if (abiertas.length === 0) {
    console.log('No hay ninguna asignación autoasignada vigente. Nada que cerrar.');
    return;
  }

  console.log(`${abiertas.length} asignación(es) autoasignada(s) siguen vigentes:\n`);
  console.log(`${corto('EQUIPO', 12)} ${corto('OPERADOR', 24)} ${corto('OBRA', 20)} DESDE`);
  for (const fila of abiertas) {
    console.log(
      `${corto(fila.vehiculo, 12)} ${corto(fila.operador, 24)} ` +
        `${corto(fila.obra, 20)} ${dia(fila.desde)}`,
    );
  }

  if (simular) {
    console.log(
      '\n--simular: no se escribió nada.\n' +
        'Corra el mismo comando sin --simular para cerrarlas.',
    );
    return;
  }

  const cerradas = (await sql`
    UPDATE asignaciones
    SET hasta = now(), actualizado_en = now()
    WHERE origen = 'autoasignada' AND hasta IS NULL
    RETURNING id
  `) as { id: string }[];

  console.log(`\nCerradas ${cerradas.length} de ${abiertas.length}.`);
  console.log('`origen` se dejó como estaba: en el panel siguen diciendo «Sin confirmar».');
  console.log(
    '\nLos operadores que tuvieran una de estas verán la máquina desaparecer de su\n' +
      'lista en la próxima sincronización. Hay que asignarles la suya desde el panel.',
  );
}

principal().catch((fallo) => {
  console.error(fallo);
  process.exit(1);
});
