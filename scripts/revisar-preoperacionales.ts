/**
 * Por qué un preoperacional firmado en el celular no aparece en el panel.
 *
 *   npm run revisar:preoperacionales
 *
 * **Solo lee.** No escribe, no borra y no corrige nada: son actas firmadas, y
 * lo que aquí se busca es entender, no arreglar sobre la marcha.
 *
 * ── Qué separa este guion ──
 *
 * Las causas posibles son muchas, pero se parten en tres familias y **una sola
 * consulta decide cuál es**: ¿la fila llegó a la base del servidor?
 *
 * - **No llegó** → el acta se quedó en la cola del teléfono. Es del móvil, y
 *   desde aquí no se puede ver nada más: la cola vive en el SQLite del equipo.
 * - **Llegó** → el problema es del panel, y lo deciden tres columnas:
 *   `obra_id` (a quién se lo muestra), `iniciado_en` (en qué día lo coloca) y
 *   `anulado_en` (si alguien lo anuló).
 *
 * ── Por qué `iniciado_en` es la sospechosa principal ──
 *
 * El listado del panel acota a 24 horas sobre `iniciado_en`, que es el reloj del
 * teléfono en el momento de **abrir el borrador** — no cuando se firmó ni cuando
 * el servidor lo recibió. Un celular con la fecha corrida, un borrador abierto un
 * día y firmado otro, o un acta que viajó días sin señal, dejan el registro
 * guardado y fuera del día que se está mirando. Por eso la tabla de abajo pone
 * los tres instantes uno al lado del otro: el desfase se ve de un vistazo.
 */
import { neon } from '@neondatabase/serverless';

import { fechaDeJornada } from '../src/shared/rules/jornada';

/** El día de obra de un instante cualquiera, o un guion si no hay instante. */
function dia(valor: string | Date | null): string {
  if (valor === null) return '—';
  const ms = valor instanceof Date ? valor.getTime() : Date.parse(valor);
  return Number.isNaN(ms) ? '—' : fechaDeJornada(ms);
}

/** Recorta a lo ancho para que la tabla quepa en una terminal. */
function corto(texto: string | null, ancho: number): string {
  const limpio = texto ?? '—';
  return limpio.length > ancho ? `${limpio.slice(0, ancho - 1)}…` : limpio.padEnd(ancho);
}

function titulo(texto: string): void {
  console.log(`\n${texto}`);
  console.log('─'.repeat(texto.length));
}

async function principal() {
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

  /* ── 1. ¿Llegó algo, y cuándo? ────────────────────────────────────────── */

  const ultimos = (await sql`
    SELECT p.id,
           v.codigo_interno      AS vehiculo,
           u.nombre_completo     AS operador,
           o.nombre              AS obra,
           p.obra_id,
           p.iniciado_en,
           p.enviado_en,
           p.recibido_en,
           p.resultado,
           p.anulado_en
    FROM preoperacionales p
    LEFT JOIN vehiculos v ON v.id = p.vehiculo_id
    LEFT JOIN usuarios  u ON u.id = p.usuario_id
    LEFT JOIN obras     o ON o.id = p.obra_id
    ORDER BY p.recibido_en DESC
    LIMIT 20
  `) as Record<string, string | Date | null>[];

  titulo(`Últimos ${ultimos.length} preoperacionales que recibió el servidor`);

  if (ultimos.length === 0) {
    console.log(
      'Ninguno. La base del servidor no tiene ni un solo preoperacional.\n\n' +
        'Eso descarta el panel entero: no hay nada que mostrar. El acta se quedó en\n' +
        'la cola del teléfono, y esto es de la parte móvil.',
    );
  } else {
    console.log(
      `${corto('EQUIPO', 12)} ${corto('OPERADOR', 22)} ${corto('OBRA', 18)} ` +
        `${corto('INICIADO', 12)} ${corto('RECIBIDO', 12)} ${corto('RESULTADO', 22)} ESTADO`,
    );
    for (const fila of ultimos) {
      const iniciado = dia(fila.iniciado_en);
      const recibido = dia(fila.recibido_en);
      const desfasado = iniciado !== recibido && iniciado !== '—' && recibido !== '—';
      const estado = fila.anulado_en ? 'ANULADO' : desfasado ? '⚠ otro día' : 'ok';
      console.log(
        `${corto(String(fila.vehiculo ?? '—'), 12)} ${corto(String(fila.operador ?? '—'), 22)} ` +
          `${corto(fila.obra === null ? 'SIN OBRA' : String(fila.obra), 18)} ` +
          `${corto(iniciado, 12)} ${corto(recibido, 12)} ` +
          `${corto(String(fila.resultado ?? '—'), 22)} ${estado}`,
      );
    }

    const desfasados = ultimos.filter((f) => {
      const i = dia(f.iniciado_en);
      const r = dia(f.recibido_en);
      return i !== r && i !== '—' && r !== '—';
    });
    const sinObra = ultimos.filter((f) => f.obra_id === null);

    console.log(`\nDe estos ${ultimos.length}:`);
    console.log(`  · ${desfasados.length} se iniciaron en un día distinto del que se recibieron.`);
    console.log(`  · ${sinObra.length} quedaron sin obra.`);
    console.log(`  · ${ultimos.filter((f) => f.anulado_en !== null).length} están anulados.`);
    console.log(`\nHoy en obra es ${fechaDeJornada()}, que es el día que abre el panel.`);
  }

  /* ── 2. Quién no alcanza ninguna obra ─────────────────────────────────── */

  const supervisores = (await sql`
    SELECT usuario, nombre_completo, obra_id
    FROM usuarios
    WHERE rol = 'supervisor' AND eliminado_en IS NULL AND activo = true
  `) as { usuario: string; nombre_completo: string; obra_id: string | null }[];

  const huerfanos = supervisores.filter((s) => s.obra_id === null);

  titulo('Residentes sin obra asignada');
  if (huerfanos.length === 0) {
    console.log(`Ninguno. Los ${supervisores.length} residentes activos tienen su obra.`);
  } else {
    for (const s of huerfanos) console.log(`  · ${s.usuario} — ${s.nombre_completo}`);
    console.log(
      '\nEstas cuentas no alcanzan NINGUNA fila: el panel les responde vacío en todo,\n' +
        'y hoy no les dice por qué. Asígneles su obra.',
    );
  }

  /* ── 3. Vehículos sin obra: producen actas sin obra ───────────────────── */

  const vehiculosSinObra = (await sql`
    SELECT codigo_interno, placa
    FROM vehiculos
    WHERE obra_id IS NULL AND eliminado_en IS NULL
  `) as { codigo_interno: string; placa: string | null }[];

  titulo('Vehículos sin obra');
  if (vehiculosSinObra.length === 0) {
    console.log('Ninguno.');
  } else {
    for (const v of vehiculosSinObra) {
      console.log(`  · ${v.codigo_interno}${v.placa ? ` (${v.placa})` : ''}`);
    }
    console.log(
      '\nUn preoperacional de estos equipos se guarda sin obra, porque la obra del acta\n' +
        'se copia de la del vehículo en el momento de recibirla.',
    );
  }

  /* ── 4. El veredicto ──────────────────────────────────────────────────── */

  const [{ total }] = (await sql`SELECT count(*)::int AS total FROM preoperacionales`) as {
    total: number;
  }[];

  titulo('Veredicto');
  if (total === 0) {
    console.log(
      'MÓVIL. No ha llegado ningún preoperacional al servidor.\n' +
        'Hay que mirar la cola `outbox` en el teléfono; desde aquí no se ve.',
    );
  } else {
    console.log(
      `PANEL. Hay ${total} preoperacional(es) guardado(s) en el servidor.\n` +
        'Si el que se busca está en la lista de arriba, llegó bien y lo que falla es\n' +
        'cómo lo muestra el panel: mire su día de inicio y su obra.\n' +
        'Si NO está en la lista, mire más atrás en el tiempo o es de los que nunca subieron.',
    );
  }
}

principal().catch((fallo) => {
  console.error(fallo);
  process.exit(1);
});
