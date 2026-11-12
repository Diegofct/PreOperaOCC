/**
 * Qué dice cada celda del plan semanal en Excel (spec 044, RF-80, RF-81, RF-30, RF-102). Puro: sin
 * `exceljs` ni base. El libro lo escribe `servidor/descargas.ts` con el escritor de hojas de
 * Reportes, y estas filas se prueban en `scripts/verificar-reglas.ts`.
 *
 * Las secciones son las del Excel con que la Directora arma hoy su plan: actividades con su reparto
 * por día, control de volquetas, personal, maquinaria, materiales, supuestos, riesgos y
 * requerimientos. Van una por hoja y no varias en la misma, como en el suyo, porque el escritor
 * hace una tabla por hoja con sus encabezados fijos; el contenido es el mismo.
 *
 * Las cifras salen del mismo objeto que la pantalla (`detalleDelPlan`), y lo que aquí se calcula
 * —meta diaria y total programado— lo calcula la regla: por eso el Excel y la pantalla no pueden
 * diferir (RF-81, RF-84).
 *
 * La plata no se esconde: con la vista del Residente la columna de valor y la fila del total **no
 * existen**, porque `planSinPlata` ya las quitó del objeto y aquí se decide por lo que el objeto
 * trae (`vistaConPlata`), no por el rol. Sus textos con pesos ya llegan reemplazados (RF-102).
 */
import { vistaConPlata, type PlanSemanalDetalle } from '@/features/panel/plan-semanal';
import type { CeldaDeReporte, FormatoDeColumna, HojaDeReporte } from '@/features/reportes/exportar';
import { metaDiaria, totalProgramado, type TipoDeActividad } from '@/shared/rules/plan-semanal';

import { nombreDelDia } from './estados';

type Vista = PlanSemanalDetalle['vista'];

const TIPO: Record<TipoDeActividad, string> = { item: 'Ítem', fuera: 'Fuera de la planificación', rubro: 'Rubro' };
const VALOR = 'Valor semana ($)';
const numeros = (columnas: readonly string[]): Partial<Record<string, FormatoDeColumna>> =>
  Object.fromEntries(columnas.map((c) => [c, 'numero' as const]));

/** RF-6, RF-17 a RF-27: las actividades, con una columna por día marcado. */
function hojaDeActividades(vista: Vista): HojaDeReporte {
  const { dias, actividades } = vista.estructura;
  const conPlata = vistaConPlata(vista);
  const delDia = dias.map(nombreDelDia);
  const encabezados = [
    'Frente',
    'Ítem',
    'Actividad',
    'Und.',
    'Meta semana',
    'Meta diaria',
    ...delDia,
    'Total programado',
    ...(conPlata ? [VALOR] : []),
    'Cuadrilla',
    'Equipo principal',
    'Tipo',
  ];
  const filas: CeldaDeReporte[][] = actividades.map((a, n) => {
    const esRubro = a.tipo === 'rubro';
    return [
      a.frenteDeTrabajo,
      a.item,
      a.descripcion,
      a.unidad,
      a.metaSemana,
      esRubro ? null : metaDiaria(a.metaSemana, dias.length),
      ...dias.map((dia) => (esRubro ? null : (a.cantidades[dia] ?? null))),
      esRubro ? null : totalProgramado(a.cantidades),
      ...(conPlata ? [vista.valores.porActividad[n] ?? null] : []),
      a.cuadrilla,
      a.equipo,
      TIPO[a.tipo],
    ];
  });
  // RF-27: el total es del valor, así que sin plata no hay fila que poner.
  if (conPlata) {
    filas.push(encabezados.map((e) => (e === 'Actividad' ? 'TOTAL SEMANA' : e === VALOR ? vista.valores.total : null)));
  }
  return {
    nombre: 'Plan semanal',
    encabezados,
    formatos: numeros(['Meta semana', 'Meta diaria', ...delDia, 'Total programado', VALOR]),
    filas,
  };
}

/** RF-12: los conceptos y, debajo, cuántas volquetas hacen falta. */
function hojaDeVolquetas(vista: Vista): HojaDeReporte {
  const { conceptos, requeridas, propias, externas } = vista.estructura.volquetas;
  return {
    nombre: 'Control de volquetas',
    encabezados: ['Concepto', 'Und.', 'Cantidad semana', 'Viajes semana'],
    formatos: numeros(['Cantidad semana', 'Viajes semana']),
    filas: [
      ...conceptos.map((c): CeldaDeReporte[] => [c.concepto, c.unidad, c.cantidadSemana, c.viajesSemana]),
      ['Volquetas requeridas', '', requeridas, null],
      ['Volquetas propias', '', propias, null],
      ['Volquetas externas', '', externas, null],
    ],
  };
}

/** RF-7: cada cargo con su gente por frente de trabajo, en el orden en que aparecen los frentes. */
function hojaDePersonal(vista: Vista): HojaDeReporte {
  const { personal } = vista.estructura;
  const frentes = [...new Set(personal.flatMap((p) => Object.keys(p.porFrente)))];
  const suma = (cantidades: readonly number[]) => cantidades.reduce((total, c) => total + c, 0);
  const filas: CeldaDeReporte[][] = personal.map((p) => [p.cargo, ...frentes.map((f) => p.porFrente[f] ?? 0), suma(Object.values(p.porFrente))]);
  if (personal.length > 1) {
    filas.push(['TOTAL CAMPO', ...frentes.map((f) => suma(personal.map((p) => p.porFrente[f] ?? 0))), suma(personal.flatMap((p) => Object.values(p.porFrente)))]);
  }
  return { nombre: 'Personal', encabezados: ['Cargo', ...frentes, 'Total'], formatos: numeros([...frentes, 'Total']), filas };
}

/** RF-8 a RF-10: la máquina propia, con la placa de su vehículo de la obra. */
function hojaDeMaquinaria(vista: Vista, vehiculos: ReadonlyMap<string, string>): HojaDeReporte {
  return {
    nombre: 'Maquinaria',
    encabezados: ['Equipo', 'Cant.', 'Propiedad', 'Frente', 'Placa / referencia'],
    formatos: numeros(['Cant.']),
    filas: vista.estructura.maquinaria.map((m) => [
      m.equipo,
      m.cantidad,
      m.propia ? 'Propia' : 'Externa',
      m.frenteDeTrabajo,
      [m.vehiculoId ? vehiculos.get(m.vehiculoId) : null, m.referencia].filter(Boolean).join(' · '),
    ]),
  };
}

function hojaDeMateriales(vista: Vista): HojaDeReporte {
  return {
    nombre: 'Materiales',
    encabezados: ['Material', 'Cantidad semana', 'Und.', 'Base de cálculo'],
    formatos: numeros(['Cantidad semana']),
    filas: vista.estructura.materiales.map((m) => [m.material, m.cantidadSemana, m.unidad, m.baseDeCalculo]),
  };
}

/** Un texto libre, un renglón por línea. */
function hojaDeTexto(nombre: string, encabezado: string, texto: string): HojaDeReporte {
  const lineas = texto
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean);
  return { nombre, encabezados: [encabezado], filas: lineas.map((l) => [l]) };
}

/**
 * RF-80: el libro del plan. `vehiculos` son los de la obra, `id → placa`, para nombrar la maquinaria
 * propia; un id que ya no está sale solo con su referencia.
 */
export function hojasDelPlan(vista: Vista, vehiculos: ReadonlyMap<string, string>): HojaDeReporte[] {
  return [
    hojaDeActividades(vista),
    hojaDeVolquetas(vista),
    hojaDePersonal(vista),
    hojaDeMaquinaria(vista, vehiculos),
    hojaDeMateriales(vista),
    hojaDeTexto('Supuestos', 'Supuesto', vista.estructura.supuestos),
    {
      nombre: 'Riesgos',
      encabezados: ['Riesgo', 'Efecto en la meta', 'Mitigación'],
      filas: vista.estructura.riesgos.map((r) => [r.riesgo, r.efecto, r.mitigacion]),
    },
    hojaDeTexto('Requerimientos', 'Requerimiento a gerencia', vista.estructura.requerimientos),
  ];
}

/** `plan-semanal-OBR-001-2026-11-16.xlsx`: la obra y el lunes de la semana. */
export function nombreDelPlan(codigoDeObra: string, semana: string): string {
  const obra = codigoDeObra.trim().replace(/[^A-Za-z0-9-]+/g, '-') || 'obra';
  return `plan-semanal-${obra}-${semana}.xlsx`;
}
