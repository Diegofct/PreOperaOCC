/**
 * Las reglas del almacén de obra (spec 009). Funciones puras, sin I/O.
 *
 * Las usan la pantalla, para avisar antes de enviar, y el servidor, para decidir
 * y redactar el rechazo. Escritas una sola vez: si la pantalla dejara pasar lo que
 * el servidor rechaza, el almacenista vería un error que no entiende.
 *
 * ── Cantidades en centésimas ──
 *
 * Una cantidad admite hasta dos decimales (medio bulto, 2,5 m de tubería). En
 * coma flotante, 0,1 + 0,2 no es 0,3, y el stock de un almacén es una suma larga
 * de movimientos: al cabo de un año de ingresos y salidas un material quedaría en
 * 69,99999999 bultos. Así que dentro de las reglas toda cantidad es un **entero de
 * centésimas** —2,5 es 250— y solo se vuelve decimal al mostrarse o al guardarse.
 */
import { abreviaturaDeUnidad } from '@/shared/catalogos/almacen';

/** Dos decimales, como la columna de la base; doce cifras enteras, como su tope. */
const CANTIDAD = /^(-?)(\d{1,12})(?:[.,](\d{1,2}))?$/;

/**
 * Una cantidad escrita, en centésimas, o `null` si no es un número con hasta dos
 * decimales.
 *
 * Acepta coma y punto como separador decimal, porque en Colombia se escriben las
 * dos. **No acepta separador de miles**: «1.000» tendría tres decimales y se
 * rechaza, en vez de leerse como uno. Un almacenista que escribe «1.000» bultos y
 * ve guardado un bulto no se entera hasta que falta cemento.
 *
 * Deja pasar el signo menos: decir que no es mayor que cero le toca a
 * `validarMovimiento`, que sabe decirlo en su campo.
 */
export function aCentesimas(valor: string | number): number | null {
  const texto = typeof valor === 'number' ? String(valor) : valor.trim();
  const partes = CANTIDAD.exec(texto);
  if (!partes) return null;

  const [, signo, enteros, decimales = ''] = partes;
  const centesimas = Number(enteros) * 100 + Number(decimales.padEnd(2, '0'));
  return signo === '-' ? -centesimas : centesimas;
}

/**
 * Una cantidad en centésimas, como la guarda la base: `numeric(14,2)` se escribe
 * como texto con punto y dos decimales («2.50»). Al leerla de vuelta, la base la
 * entrega igual, y `aCentesimas` la convierte sin pasar por coma flotante.
 */
export function aDecimal(centesimas: number): string {
  const signo = centesimas < 0 ? '-' : '';
  const absoluto = Math.abs(centesimas);
  return `${signo}${Math.floor(absoluto / 100)}.${String(absoluto % 100).padStart(2, '0')}`;
}

/**
 * Una cantidad para leer: «70 bultos», «2,5 m³», «1.250,75 kg».
 *
 * A mano y no con `toLocaleString('es-CO')`: esa salida depende de los datos de
 * idioma de cada entorno, y la misma regla corre en Node, en el navegador y en el
 * servidor. Los mensajes de rechazo se comparan en las pruebas y tienen que decir
 * lo mismo en todos. El menos es el signo tipográfico (−), no el guion.
 */
export function formatearCantidad(centesimas: number, unidad: string): string {
  const absoluto = Math.abs(centesimas);
  const enteros = Math.floor(absoluto / 100)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  const resto = absoluto % 100;
  const decimales = resto === 0 ? '' : `,${String(resto).padStart(2, '0').replace(/0$/, '')}`;
  const signo = centesimas < 0 ? '−' : '';
  return `${signo}${enteros}${decimales} ${abreviaturaDeUnidad(unidad)}`;
}

/* ── Un movimiento ──────────────────────────────────────────────────────── */

export type TipoMovimiento = 'ingreso' | 'salida';

export interface MovimientoPorValidar {
  tipo: TipoMovimiento;
  /** `YYYY-MM-DD`, el día en la obra. */
  fecha: string;
  /** En centésimas. `null` si lo escrito no era una cantidad. */
  cantidad: number | null;
  /** Para qué se usará lo que sale. Solo cuenta en las salidas. */
  paraQue?: string | null;
}

/** Una falta, con el campo del formulario donde se pinta. */
export interface FaltaDeMovimiento {
  campo: 'cantidad' | 'fecha' | 'paraQue';
  mensaje: string;
}

const FECHA = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Los textos de las faltas, con nombre. Los usan esta regla y los contratos del
 * panel (`contratos.ts`), que rechazan lo mismo antes de llegar aquí: la misma
 * falta tiene que decirse igual la detecte quien la detecte.
 */
export const MENSAJES_DE_MOVIMIENTO = {
  cantidadIlegible: 'Escriba la cantidad, con hasta dos decimales.',
  cantidadNoPositiva: 'La cantidad tiene que ser mayor que cero.',
  fechaMalEscrita: 'La fecha va en formato AAAA-MM-DD.',
  fechaFutura: 'La fecha no puede ser posterior a hoy.',
  sinParaQue: 'Escriba para qué se usará lo que sale.',
} as const;

/**
 * Lo que le falta a un movimiento para poder registrarse, o una lista vacía.
 *
 * Devuelve **todas** las faltas y no la primera, cada una con su campo: quien
 * llena el formulario las corrige de una vez, en vez de enviar tres veces para
 * descubrirlas una a una (la misma idea que el cierre del parte, 004/RF-50).
 *
 * `hoy` llega de fuera —`fechaDeJornada()`— para que la regla siga siendo pura y
 * se pueda probar con cualquier día. Se compara como texto: en `YYYY-MM-DD` el
 * orden alfabético es el del calendario.
 *
 * Que la cantidad quepa en el stock no se mira aquí: eso depende de los demás
 * movimientos y es otra regla (RF-15).
 */
export function validarMovimiento(
  movimiento: MovimientoPorValidar,
  hoy: string,
): FaltaDeMovimiento[] {
  const faltas: FaltaDeMovimiento[] = [];

  if (movimiento.cantidad === null) {
    faltas.push({ campo: 'cantidad', mensaje: MENSAJES_DE_MOVIMIENTO.cantidadIlegible });
  } else if (movimiento.cantidad <= 0) {
    // RF-9.
    faltas.push({ campo: 'cantidad', mensaje: MENSAJES_DE_MOVIMIENTO.cantidadNoPositiva });
  }

  if (!FECHA.test(movimiento.fecha)) {
    faltas.push({ campo: 'fecha', mensaje: MENSAJES_DE_MOVIMIENTO.fechaMalEscrita });
  } else if (movimiento.fecha > hoy) {
    // RF-10. Un movimiento de mañana haría que el stock de hoy contara algo que
    // todavía no ha pasado.
    faltas.push({ campo: 'fecha', mensaje: MENSAJES_DE_MOVIMIENTO.fechaFutura });
  }

  if (movimiento.tipo === 'salida' && (movimiento.paraQue ?? '').trim().length === 0) {
    // RF-13. Es lo único que dice a dónde fue el material: sin esto, una salida
    // es solo un número que baja.
    faltas.push({ campo: 'paraQue', mensaje: MENSAJES_DE_MOVIMIENTO.sinParaQue });
  }

  return faltas;
}

/* ── Stock ──────────────────────────────────────────────────────────────── */

/** Lo que las reglas necesitan saber de un movimiento ya registrado. */
export interface MovimientoRegistrado {
  id: string;
  tipo: TipoMovimiento;
  /** `YYYY-MM-DD`, el día en la obra. */
  fecha: string;
  /** En centésimas. */
  cantidad: number;
  /** Cuándo se registró, en ISO 8601. Es el orden del historial. */
  registradoEn: string;
  anulado: boolean;
}

export interface TotalesDelMaterial {
  ingresado: number;
  salido: number;
  stock: number;
}

/**
 * Cuánto entró, cuánto salió y cuánto queda, en centésimas.
 *
 * Sale **solo** de los movimientos que no están anulados (RF-18, RF-25): no hay un
 * stock guardado que se pueda escribir, y anular un movimiento es dejar de
 * contarlo, no restar a mano.
 */
export function totalesDelMaterial(
  movimientos: readonly Pick<MovimientoRegistrado, 'tipo' | 'cantidad' | 'anulado'>[],
): TotalesDelMaterial {
  let ingresado = 0;
  let salido = 0;
  for (const m of movimientos) {
    if (m.anulado) continue;
    if (m.tipo === 'ingreso') ingresado += m.cantidad;
    else salido += m.cantidad;
  }
  return { ingresado, salido, stock: ingresado - salido };
}

/**
 * Por qué no puede salir esa cantidad, o `null` si alcanza (RF-15).
 *
 * Una salida por **exactamente** lo que queda se acepta: el material se queda en
 * cero, que es un estado normal y se señala en la tabla (RF-19).
 */
export function rechazoDeSalida(stock: number, cantidad: number, unidad: string): string | null {
  if (cantidad <= stock) return null;
  return (
    `No alcanza: quedan ${formatearCantidad(stock, unidad)} y la salida es de ` +
    `${formatearCantidad(cantidad, unidad)}.`
  );
}

/**
 * Por qué no se puede anular ese movimiento, o `null` si se puede.
 *
 * Anular una **salida** siempre se puede: devuelve al stock lo que no salió.
 * Anular un **ingreso** resta lo que entró, y si parte de eso ya salió el stock
 * quedaría negativo —el almacén diría que tiene menos que nada—, así que se
 * rechaza diciendo en cuánto quedaría (RF-26). La salida se tiene que anular antes.
 */
export function rechazoDeAnulacion(
  movimiento: Pick<MovimientoRegistrado, 'tipo' | 'cantidad' | 'anulado'>,
  stock: number,
  unidad: string,
): string | null {
  if (movimiento.anulado) return 'Este movimiento ya estaba anulado.';
  if (movimiento.tipo === 'salida') return null;

  const quedaria = stock - movimiento.cantidad;
  if (quedaria >= 0) return null;
  return (
    `No se puede anular este ingreso: el stock quedaría en ${formatearCantidad(quedaria, unidad)}, ` +
    'porque parte de lo que entró ya salió. Anule antes las salidas que correspondan.'
  );
}

/**
 * Por qué no se puede dar de baja el material, o `null` si se puede (RF-6, RF-7).
 *
 * Con stock, darlo de baja haría desaparecer de la tabla un material que sigue en
 * el almacén.
 */
export function rechazoDeBaja(stock: number, unidad: string): string | null {
  if (stock === 0) return null;
  return (
    `No se puede dar de baja: todavía quedan ${formatearCantidad(stock, unidad)}. ` +
    'Registre la salida de lo que queda antes.'
  );
}

/**
 * Por qué no se puede cambiar la unidad, o `null` si se puede (RF-5).
 *
 * Cuentan también los movimientos **anulados**: siguen a la vista con su cantidad,
 * y cambiar la unidad cambiaría lo que dicen —«100 bultos» pasaría a «100 kg»—.
 * Dejar la misma unidad no es un cambio.
 */
export function rechazoDeCambioDeUnidad(
  cuantosMovimientos: number,
  unidadActual: string,
  unidadNueva: string,
): string | null {
  if (unidadActual === unidadNueva || cuantosMovimientos === 0) return null;
  return (
    'No se puede cambiar la unidad: este material ya tiene movimientos registrados en ' +
    `${abreviaturaDeUnidad(unidadActual)}. Si la unidad estaba mal, dé de baja el material y ` +
    'regístrelo de nuevo.'
  );
}

/* ── Historial ──────────────────────────────────────────────────────────── */

/**
 * Los movimientos en el orden en que se registraron, cada uno con el stock que
 * dejó (RF-20). Los anulados siguen en la lista, pero sin saldo (RF-25): no
 * dejaron nada, porque no cuentan.
 *
 * El orden es el de registro y no el de la fecha del movimiento. Es el orden en
 * que el servidor comprobó cada salida contra el stock, y por eso el único en que
 * el saldo cuenta lo que de verdad pasó. Una salida registrada hoy con fecha de
 * ayer se comprobó contra el stock de hoy. El empate se resuelve por `id`, que es
 * UUID v7 y también sigue el orden de creación.
 *
 * Devuelve del más antiguo al más reciente; la pantalla decide si lo invierte.
 */
export function historialConSaldo<M extends MovimientoRegistrado>(
  movimientos: readonly M[],
): (M & { saldo: number | null })[] {
  const ordenados = [...movimientos].sort(
    (a, b) =>
      a.registradoEn.localeCompare(b.registradoEn) || a.id.localeCompare(b.id),
  );

  let saldo = 0;
  return ordenados.map((m) => {
    if (m.anulado) return { ...m, saldo: null };
    saldo += m.tipo === 'ingreso' ? m.cantidad : -m.cantidad;
    return { ...m, saldo };
  });
}

export interface FiltroDeMovimientos {
  /** `YYYY-MM-DD`, incluido. */
  desde?: string | null;
  /** `YYYY-MM-DD`, incluido. */
  hasta?: string | null;
  tipo?: TipoMovimiento | null;
}

/**
 * Los movimientos de un periodo y un tipo (RF-21). Sin un criterio, no filtra por
 * él. Los anulados no se esconden: el filtro es de periodo y tipo, y un anulado
 * sigue siendo parte del historial.
 *
 * El periodo mira la **fecha del movimiento**, que es la que el almacenista
 * busca («¿qué salió la semana pasada?»), no el día en que se tecleó.
 */
export function filtrarMovimientos<M extends Pick<MovimientoRegistrado, 'fecha' | 'tipo'>>(
  movimientos: readonly M[],
  filtro: FiltroDeMovimientos,
): M[] {
  return movimientos.filter(
    (m) =>
      (!filtro.desde || m.fecha >= filtro.desde) &&
      (!filtro.hasta || m.fecha <= filtro.hasta) &&
      (!filtro.tipo || m.tipo === filtro.tipo),
  );
}
