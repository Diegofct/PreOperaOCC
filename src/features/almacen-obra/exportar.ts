/**
 * Qué dice cada fila del Excel del almacén (spec 009, cambio del 2026-09-22, RF-46 a
 * RF-50).
 *
 * **Puro, sin `exceljs` y sin base.** Lo lee `servidor/excel.ts`, que es quien escribe
 * el libro. Está aparte para poder probar en el guion qué sale en cada celda sin abrir
 * un `.xlsx`, y para que las existencias salgan de `totalesDelMaterial`, la misma regla
 * con que la pantalla dice cuánto queda: si el archivo sumara por su cuenta, un día
 * diría otro stock.
 *
 * ── Números y fechas de verdad (RF-49) ──
 *
 * Las cantidades van como número (2.5, no «2,5») para que Excel las sume. Las fechas
 * van como `Date`: la del movimiento es un día, a medianoche UTC; la de registro y la
 * de anulación se corren a la hora de la obra antes de escribirse, porque Excel no
 * guarda zona horaria y lee el `Date` como si fuera UTC. Sin ese corrimiento, lo que
 * se registró a las 8 p. m. aparecería al día siguiente.
 */
import { nombreDeUnidad } from '@/shared/catalogos/almacen';
import { totalesDelMaterial, type TipoMovimiento } from '@/shared/rules/almacen';
import { DESFASE_COLOMBIA_MS } from '@/shared/rules/jornada';

/** Lo que el archivo necesita saber de un movimiento. Cantidad en centésimas. */
export interface MovimientoParaExportar {
  id: string;
  obraNombre: string;
  materialId: string;
  materialNombre: string;
  /** El id de la unidad del material (`bulto`). */
  unidad: string;
  tipo: TipoMovimiento;
  /** `YYYY-MM-DD`, el día en la obra. */
  fecha: string;
  cantidad: number;
  /** Quién entregó o recibió; `null` en los anteriores al 2026-09-22 (RF-44). */
  responsable: string | null;
  paraQue: string | null;
  observacion: string | null;
  registradoPorNombre: string | null;
  registradoEn: Date;
  anuladoEn: Date | null;
  anuladoPorNombre: string | null;
  motivoAnulacion: string | null;
}

/** Un material vigente, para la hoja de existencias. */
export interface MaterialParaExportar {
  id: string;
  obraNombre: string;
  nombre: string;
  unidad: string;
}

export type CeldaDeExcel = string | number | Date | null;

export interface HojaParaExportar {
  encabezados: string[];
  filas: CeldaDeExcel[][];
}

export interface HojasDelAlmacen {
  movimientos: HojaParaExportar;
  existencias: HojaParaExportar;
}

export const ENCABEZADOS_MOVIMIENTOS = [
  'Obra',
  'Fecha',
  'Tipo',
  'Material',
  'Unidad',
  'Cantidad',
  'Entregó / recibió',
  'Para qué / observación',
  'Registró',
  'Registrado el',
  'Estado',
  'Anuló',
  'Anulado el',
  'Motivo de la anulación',
];

export const ENCABEZADOS_EXISTENCIAS = ['Obra', 'Material', 'Unidad', 'Ingresado', 'Salido', 'Stock'];

/** Centésimas a número: 250 → 2.5. */
function cantidad(centesimas: number): number {
  return centesimas / 100;
}

/** `YYYY-MM-DD` a un `Date` de ese día, a medianoche UTC. */
function dia(fecha: string): Date {
  const [anio, mes, diaDelMes] = fecha.split('-').map(Number);
  return new Date(Date.UTC(anio, mes - 1, diaDelMes));
}

/** Un instante corrido a la hora de la obra, para que Excel lo muestre como allá. */
function horaDeLaObra(instante: Date): Date {
  return new Date(instante.getTime() - DESFASE_COLOMBIA_MS);
}

export function hojasDelAlmacen(
  movimientos: readonly MovimientoParaExportar[],
  materiales: readonly MaterialParaExportar[],
): HojasDelAlmacen {
  // Por obra y, dentro de cada una, en el orden en que se registraron: el del
  // historial en pantalla.
  const ordenados = [...movimientos].sort(
    (a, b) =>
      a.obraNombre.localeCompare(b.obraNombre, 'es') ||
      a.registradoEn.getTime() - b.registradoEn.getTime(),
  );

  const filasDeMovimientos = ordenados.map((m): CeldaDeExcel[] => [
    m.obraNombre,
    dia(m.fecha),
    m.tipo === 'ingreso' ? 'Ingreso' : 'Salida',
    m.materialNombre,
    nombreDeUnidad(m.unidad),
    cantidad(m.cantidad),
    m.responsable ?? '—',
    (m.tipo === 'salida' ? m.paraQue : m.observacion) ?? null,
    m.registradoPorNombre,
    horaDeLaObra(m.registradoEn),
    m.anuladoEn ? 'Anulado' : 'Vigente',
    m.anuladoEn ? m.anuladoPorNombre : null,
    m.anuladoEn ? horaDeLaObra(m.anuladoEn) : null,
    m.anuladoEn ? m.motivoAnulacion : null,
  ]);

  const porMaterial = new Map<string, MovimientoParaExportar[]>();
  for (const m of movimientos) {
    porMaterial.set(m.materialId, [...(porMaterial.get(m.materialId) ?? []), m]);
  }

  const filasDeExistencias = [...materiales]
    .sort(
      (a, b) =>
        a.obraNombre.localeCompare(b.obraNombre, 'es') || a.nombre.localeCompare(b.nombre, 'es'),
    )
    .map((material): CeldaDeExcel[] => {
      const totales = totalesDelMaterial(
        (porMaterial.get(material.id) ?? []).map((m) => ({
          tipo: m.tipo,
          cantidad: m.cantidad,
          anulado: m.anuladoEn !== null,
        })),
      );
      return [
        material.obraNombre,
        material.nombre,
        nombreDeUnidad(material.unidad),
        cantidad(totales.ingresado),
        cantidad(totales.salido),
        cantidad(totales.stock),
      ];
    });

  return {
    movimientos: { encabezados: ENCABEZADOS_MOVIMIENTOS, filas: filasDeMovimientos },
    existencias: { encabezados: ENCABEZADOS_EXISTENCIAS, filas: filasDeExistencias },
  };
}

/**
 * «almacen-OBR-001-2026-09-22.xlsx», o «almacen-todas-las-obras-…» para la gerencia sin
 * obra elegida (RF-50). Lo que no sea letra, número o guion pasa a guion: un código con
 * espacios o una barra no puede romper el nombre del archivo.
 */
export function nombreDelArchivo(codigoDeObra: string | null, hoy: string): string {
  const almacen = codigoDeObra
    ? codigoDeObra.trim().replace(/[^A-Za-z0-9-]+/g, '-')
    : 'todas-las-obras';
  return `almacen-${almacen}-${hoy}.xlsx`;
}
