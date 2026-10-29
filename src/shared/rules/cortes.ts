/**
 * Los cortes financieros de las empresas y de las obras (spec 033, RF-34 a RF-43).
 *
 * Un corte es lo que gerencia digita a una fecha: el saldo, lo que se debe y lo que le
 * deben. No es contabilidad (fuera de alcance): no se suman movimientos, se registran
 * fotos. Por eso un corte no se corrige; se anula con motivo y se registra otro (RF-40).
 *
 * Puro y sin I/O, como toda regla, para poder comprobarlo desde Node.
 */

import { plazoEnDias } from './contrato';
import { diaCorto } from './jornada';
import { enPesos } from './pesos';

/** Los tres valores del corte (RF-34; resuelto el 2026-10-27: no lleva más). */
export interface ValoresDelCorte {
  saldo: number;
  cuentasPorPagar: number;
  cuentasPorCobrar: number;
}

export interface CorteParaRegla extends ValoresDelCorte {
  /** `AAAA-MM-DD`. */
  fechaCorte: string;
  /** Anulado = ya no cuenta para nada salvo el historial (RF-39). */
  anuladoEn: string | null;
}

/** Más días que esto sin corte nuevo y el Consolidado lo marca (RF-43). */
export const DIAS_PARA_DESACTUALIZADO = 30;

export const SIN_INFORMACION_FINANCIERA = 'Sin información financiera';

/** `2026-10-18` → `18-oct-2026`: como se escriben las fechas en el panel, con el año. */
export function fechaDelCorte(fecha: string): string {
  return `${diaCorto(fecha)}-${fecha.slice(0, 4)}`;
}

/**
 * Lo que impide registrar un corte, o `null` (RF-35, RF-36). `hoy` es la fecha de la
 * jornada (Bogotá); `vigentes`, los cortes sin anular del mismo dueño (la empresa o la
 * obra). El saldo puede ser negativo —una empresa en rojo es un dato—; lo que se debe y
 * lo que le deben, no.
 */
export function validarCorte(
  corte: ValoresDelCorte & { fechaCorte: string },
  hoy: string,
  vigentes: readonly Pick<CorteParaRegla, 'fechaCorte'>[],
): string | null {
  if (corte.fechaCorte > hoy) return 'La fecha de corte no puede ser futura';
  if (vigentes.some((v) => v.fechaCorte === corte.fechaCorte)) {
    return `Ya hay un corte del ${fechaDelCorte(corte.fechaCorte)}; anúlalo para registrar otro`;
  }
  if (corte.cuentasPorPagar < 0) return 'Las cuentas por pagar no pueden ser negativas';
  if (corte.cuentasPorCobrar < 0) return 'Las cuentas por cobrar no pueden ser negativas';
  return null;
}

/** Los vigentes, del más reciente al más antiguo (RF-37). */
function vigentesOrdenados<C extends CorteParaRegla>(cortes: readonly C[]): C[] {
  return cortes
    .filter((c) => c.anuladoEn === null)
    .sort((a, b) => (a.fechaCorte < b.fechaCorte ? 1 : a.fechaCorte > b.fechaCorte ? -1 : 0));
}

/** El último corte vigente, o `null` si no hay ninguno (RF-3, RF-37). */
export function ultimoCorte<C extends CorteParaRegla>(cortes: readonly C[]): C | null {
  return vigentesOrdenados(cortes)[0] ?? null;
}

/**
 * Cuánto cambió cada valor del último corte frente al anterior (RF-38), sin contar los
 * anulados. `null` si no hay dos cortes vigentes: sin anterior no hay diferencia.
 */
export function diferenciaConElAnterior(cortes: readonly CorteParaRegla[]): ValoresDelCorte | null {
  const [ultimo, anterior] = vigentesOrdenados(cortes);
  if (!ultimo || !anterior) return null;
  return {
    saldo: ultimo.saldo - anterior.saldo,
    cuentasPorPagar: ultimo.cuentasPorPagar - anterior.cuentasPorPagar,
    cuentasPorCobrar: ultimo.cuentasPorCobrar - anterior.cuentasPorCobrar,
  };
}

/** ¿Pasaron más de 30 días desde el corte? (RF-43). */
export function estaDesactualizado(fechaCorte: string, hoy: string): boolean {
  return (plazoEnDias(fechaCorte, hoy) ?? 0) > DIAS_PARA_DESACTUALIZADO;
}

export interface DuenoDelCorte {
  id: string;
  nombre: string;
  cortes: readonly CorteParaRegla[];
}

export interface FilaDelConsolidado {
  tipo: 'empresa' | 'obra';
  id: string;
  nombre: string;
  /** Su último corte vigente, o `null`: «Sin información financiera». */
  corte: CorteParaRegla | null;
  desactualizado: boolean;
}

/**
 * El Consolidado del grupo (RF-41 a RF-43, cambio del 2026-10-27): una fila por empresa
 * con corte propio (Elemental, OCC, Geolab) y una por obra, con su último corte; y el
 * total de las filas que tienen uno. Proyectos no tiene fila: sus obras son su
 * información, y con una fila propia el total contaría dos veces.
 *
 * Las obras dadas de baja solo salen si tienen corte (caso límite): su último corte
 * sigue siendo parte del grupo.
 */
export function consolidado(
  datos: {
    empresas: readonly DuenoDelCorte[];
    obras: readonly (DuenoDelCorte & { dadaDeBaja: boolean })[];
  },
  hoy: string,
): { filas: FilaDelConsolidado[]; total: ValoresDelCorte; conCorte: number } {
  const fila = (tipo: FilaDelConsolidado['tipo'], d: DuenoDelCorte): FilaDelConsolidado => {
    const corte = ultimoCorte(d.cortes);
    return {
      tipo,
      id: d.id,
      nombre: d.nombre,
      corte,
      desactualizado: corte !== null && estaDesactualizado(corte.fechaCorte, hoy),
    };
  };
  const filas = [
    ...datos.empresas.map((e) => fila('empresa', e)),
    ...datos.obras.filter((o) => !o.dadaDeBaja || ultimoCorte(o.cortes) !== null).map((o) => fila('obra', o)),
  ];
  const conCorte = filas.filter((f) => f.corte !== null);
  const total = conCorte.reduce<ValoresDelCorte>(
    (suma, f) => ({
      saldo: suma.saldo + f.corte!.saldo,
      cuentasPorPagar: suma.cuentasPorPagar + f.corte!.cuentasPorPagar,
      cuentasPorCobrar: suma.cuentasPorCobrar + f.corte!.cuentasPorCobrar,
    }),
    { saldo: 0, cuentasPorPagar: 0, cuentasPorCobrar: 0 },
  );
  return { filas, total, conCorte: conCorte.length };
}

/**
 * Lo que dice la tarjeta de Proyectos (RF-2, RF-3, cambio del 2026-10-27): la suma de
 * los saldos del último corte de cada obra activa, con la fecha del más antiguo —la
 * suma vale a esa fecha como mucho—. `null` si ninguna obra tiene corte.
 */
export function resumenDeProyectos(
  obras: readonly { cortes: readonly CorteParaRegla[] }[],
): { saldo: number; fechaCorte: string } | null {
  const ultimos = obras.map((o) => ultimoCorte(o.cortes)).filter((c): c is CorteParaRegla => c !== null);
  if (ultimos.length === 0) return null;
  return {
    saldo: ultimos.reduce((s, c) => s + c.saldo, 0),
    fechaCorte: ultimos.map((c) => c.fechaCorte).sort()[0],
  };
}

/**
 * Lo que se escribe en un campo de pesos, como número entero (RF-34): «1.534.500.000»,
 * «$ 1534500000» o «-45.000.000» —el saldo puede ser negativo—. Los puntos son de miles,
 * como se escriben los pesos en Colombia; los decimales no van (pesos enteros). `null`
 * si está vacío o no es un valor.
 */
export function pesosDeTexto(texto: string): number | null {
  const limpio = texto.replace(/[\s$]/g, '').replace(/\./g, '');
  if (!/^-?\d+$/.test(limpio)) return null;
  const valor = Number(limpio);
  return Number.isSafeInteger(valor) ? valor : null;
}

/**
 * Cómo se lee la diferencia de un valor con el corte anterior (RF-38): con su signo,
 * para que se vea si subió o bajó sin depender del color.
 */
export function textoDeDiferencia(diferencia: number): string {
  if (diferencia === 0) return 'Sin cambio';
  return diferencia > 0 ? `+${enPesos(diferencia)}` : enPesos(diferencia);
}
