/**
 * Qué dice cada celda del informe de cumplimiento en Excel (spec 043, RF-92, RF-96). Puro: sin
 * `exceljs` ni base. El libro lo escribe `servidor/descargas.ts` con el mismo escritor de hojas de
 * Reportes, y estas filas se prueban en `scripts/verificar-reglas.ts`.
 *
 * Las cifras salen del mismo objeto que la pantalla (`informeDeLaObra`): aquí no se calcula nada,
 * solo se acomoda. Por eso el Excel y la pantalla no pueden diferir (RF-96).
 *
 * La plata no se esconde: con el informe del Residente las columnas y hojas de plata **no existen**,
 * porque `sinPlata` ya las quitó del objeto y aquí se decide por lo que el objeto trae
 * (`informeConPlata`), no por el rol. Una hoja vacía de plata diría que la hay (RF-89).
 */
import { informeConPlata, type InformeRespuesta } from '@/features/panel/planificacion';
import type { FormatoDeColumna, HojaDeReporte } from '@/features/reportes/exportar';
import type {
  BloqueDelArchivo,
  FormatoDeColumna as FormatoDeColumnaDelArchivo,
  TablaDelArchivo,
} from '@/shared/rules/archivos-del-asistente';
import { etiquetaDeEstimada, type EstadoDeFila } from '@/shared/rules/cumplimiento-de-obra';

const ESTADO: Record<EstadoDeFila, string> = { normal: '', sin_programacion: 'Sin programación', meta_cumplida: 'Meta cumplida' };

const COLUMNAS_EN_CANTIDADES = [
  'Grupo',
  'Capítulo',
  'Ítem',
  'Descripción',
  'Unidad',
  'Meta',
  'Estimada',
  'Ejecutado',
  '% cumplido',
  'Pendiente del periodo',
  'Cantidad planeada',
  'Acumulado',
  'Pendiente total',
  'Estado',
];
const COLUMNAS_DE_PLATA = ['Valor programado', 'Valor ejecutado', 'A cobrar'];

const CANTIDADES = ['Meta', 'Ejecutado', 'Pendiente del periodo', 'Cantidad planeada', 'Acumulado', 'Pendiente total'] as const;

/**
 * La columna «Estimada»: «Sí», «No» o, con días del plan y días estimados, la misma
 * «Parcialmente estimada (n días del plan)» de la pantalla (spec 044, RF-95). Sin meta, vacía.
 */
function columnaEstimada(fila: InformeRespuesta['filas'][number]): string {
  if (fila.meta === null) return '';
  const etiqueta = etiquetaDeEstimada(fila);
  return etiqueta === null ? 'No' : etiqueta === 'Estimada' ? 'Sí' : etiqueta;
}

function hojaDeCumplimiento(informe: InformeRespuesta): HojaDeReporte {
  const conPlata = informeConPlata(informe);
  const formatos: HojaDeReporte['formatos'] = { '% cumplido': 'entero' };
  for (const nombre of CANTIDADES) formatos[nombre] = 'numero';
  if (conPlata) for (const nombre of COLUMNAS_DE_PLATA) formatos[nombre] = 'numero';

  return {
    nombre: 'Cumplimiento',
    encabezados: conPlata ? [...COLUMNAS_EN_CANTIDADES, ...COLUMNAS_DE_PLATA] : COLUMNAS_EN_CANTIDADES,
    formatos,
    filas: informe.filas.map((fila) => {
      const cantidades = [
        fila.grupo,
        fila.capitulo,
        fila.item,
        fila.descripcion,
        fila.unidad,
        fila.meta,
        columnaEstimada(fila),
        fila.ejecutado,
        fila.porcentaje,
        fila.pendientePeriodo,
        fila.planeada,
        fila.acumulado,
        fila.pendienteTotal,
        ESTADO[fila.estado],
      ];
      return 'valores' in fila ? [...cantidades, fila.valores.programado, fila.valores.ejecutado, fila.valores.aCobrar] : cantidades;
    }),
  };
}

function hojaDeFuera(informe: InformeRespuesta): HojaDeReporte {
  return {
    nombre: 'Fuera de la planificación',
    encabezados: ['Fecha', 'Ítem', 'Actividad', 'Descripción', 'Unidad', 'Cantidad', 'Marca'],
    formatos: { Cantidad: 'numero' },
    filas: informe.fuera.map((a) => [a.fecha, a.item ?? '', a.nombre, a.descripcion, a.unidad ?? '', a.cantidad, a.marca === 'sin_capitulo' ? 'Sin capítulo' : '']),
  };
}

function hojaDeAvisos(informe: InformeRespuesta): HojaDeReporte {
  const filas: (string | number)[][] = [
    ...informe.versiones.map((v) => ['Versión de la planificación', `v${v.numeroVersion}, del ${v.desde} al ${v.hasta}`]),
    ['Días con el parte abierto', informe.avisos.diasAbiertos],
    ['Días de trabajo sin parte', informe.avisos.diasSinParte],
  ];
  if (informe.sinPlanificacion) filas.push(['Sin planificación aprobada', 'Algún día del periodo no tiene planificación aprobada.']);
  if (informe.avisos.cifrasPuedenCambiar) filas.push(['Cifras', 'Pueden cambiar: hay partes abiertos en el periodo.']);
  if (informeConPlata(informe) && informe.avisoSinCosto) {
    filas.push(['Ítems sin precio de costo', 'Los totales de plata no los incluyen.']);
  }
  return { nombre: 'Avisos', encabezados: ['Aviso', 'Detalle'], filas };
}

/** RF-92: las hojas del informe. Con plata, además los totales y lo que no tiene precio de costo. */
export function hojasDelInforme(informe: InformeRespuesta): HojaDeReporte[] {
  const hojas = [hojaDeCumplimiento(informe), hojaDeFuera(informe)];
  if (informeConPlata(informe)) {
    const { totales } = informe;
    const faltoSobro = totales.faltoSobro.tipo === 'falto' ? 'Faltó' : totales.faltoSobro.tipo === 'sobro' ? 'Sobró' : 'Faltó o sobró';
    const filas: (string | number)[][] = [
      ['Valor programado', totales.programado],
      ['Valor ejecutado', totales.ejecutado],
      ['A cobrar', totales.aCobrar],
      [faltoSobro, totales.faltoSobro.valor],
      ['Margen', totales.margen],
    ];
    if (informe.indirectos !== null) filas.push(['Indirectos programados', informe.indirectos]);
    if (totales.resultado !== null) filas.push(['Resultado', totales.resultado]);
    for (const rubro of informe.rubros) filas.push([`Rubro: ${rubro.nombre}`, rubro.valor]);
    hojas.push({ nombre: 'Totales', encabezados: ['Concepto', 'Valor'], formatos: { Valor: 'numero' }, filas });
    hojas.push({
      nombre: 'Sin precio de costo',
      encabezados: ['Ítem', 'Cantidad ejecutada'],
      formatos: { 'Cantidad ejecutada': 'numero' },
      filas: informe.sinPrecioDeCosto.map((s) => [s.item, s.cantidad]),
    });
  }
  hojas.push(hojaDeAvisos(informe));
  return hojas;
}

/** Las columnas que son plata: en el PDF salen en pesos, con signo y sin decimales. */
const EN_PESOS = new Set([...COLUMNAS_DE_PLATA, 'Valor']);

const FORMATO_EN_PDF: Record<FormatoDeColumna, FormatoDeColumnaDelArchivo> = { numero: 'numero', entero: 'entero', lectura: 'lectura' };

function tablaDe(hoja: HojaDeReporte, conPlata: boolean): TablaDelArchivo {
  return {
    titulo: hoja.nombre,
    encabezados: hoja.encabezados,
    formatos: hoja.encabezados.map((nombre): FormatoDeColumnaDelArchivo => {
      if (EN_PESOS.has(nombre) && conPlata) return 'pesos';
      const formato = hoja.formatos?.[nombre];
      return formato ? FORMATO_EN_PDF[formato] : 'texto';
    }),
    filas: hoja.filas,
  };
}

/** Solo esas columnas de la hoja, en ese orden. */
function columnas(hoja: HojaDeReporte, nombre: string, cuales: readonly string[]): HojaDeReporte {
  const indices = cuales.map((c) => hoja.encabezados.indexOf(c));
  return { nombre, encabezados: [...cuales], formatos: hoja.formatos, filas: hoja.filas.map((fila) => indices.map((i) => fila[i])) };
}

/**
 * RF-93: las mismas cifras que el Excel, acomodadas para una página horizontal. El Excel lleva la
 * hoja de cumplimiento en 17 columnas, y en el PDF tres de texto largo dejaban las cifras tan
 * angostas que «490.102,84» salía partido en dos renglones. Por eso, solo aquí: un frente único va
 * una vez arriba, como texto, y no en cada fila; y la plata de cada ítem va en una segunda tabla,
 * «Valores por ítem», con su capítulo e ítem para cruzarla. Las demás hojas pasan iguales. La
 * plata va en pesos.
 *
 * La columna «Estimada» también es angosta: el PDF la mide por su texto típico («Sí»), y
 * «Parcialmente estimada (4 días del plan)» salía cortado en «Parcialme / nte / estimad…». Por eso
 * en el PDF va «Parcial (4 días del plan)», y debajo de la tabla una nota dice qué es (spec 044,
 * RF-95). El Excel y la pantalla llevan el texto entero.
 */
const PARCIAL = 'Parcialmente estimada';

export function bloquesDelInforme(informe: InformeRespuesta): BloqueDelArchivo[] {
  const conPlata = informeConPlata(informe);
  const [cumplimiento, ...resto] = hojasDelInforme(informe);
  const grupos = [...new Set(informe.filas.map((f) => f.grupo))];
  const unSoloFrente = grupos.length === 1;

  const enCantidades = COLUMNAS_EN_CANTIDADES.filter((c) => !(unSoloFrente && c === 'Grupo'));
  const bloques: BloqueDelArchivo[] = [];
  if (unSoloFrente) bloques.push({ tipo: 'texto', markdown: `**Frente:** ${grupos[0]}` });
  const tabla = tablaDe(columnas(cumplimiento, 'Cumplimiento', enCantidades), conPlata);
  const estimada = tabla.encabezados.indexOf('Estimada');
  let hayParciales = false;
  tabla.filas = tabla.filas.map((fila) => {
    const valor = fila[estimada];
    if (typeof valor !== 'string' || !valor.startsWith(PARCIAL)) return fila;
    hayParciales = true;
    return fila.map((celda, i) => (i === estimada ? `Parcial${valor.slice(PARCIAL.length)}` : celda));
  });
  bloques.push({ tipo: 'tabla', tabla });
  if (hayParciales) {
    bloques.push({
      tipo: 'texto',
      markdown:
        '**Parcial:** Parcialmente estimada. Esos días la meta salió del plan semanal aprobado; los demás días del periodo, de repartir la meta del mes.',
    });
  }
  if (conPlata) {
    const llave = unSoloFrente ? ['Capítulo', 'Ítem', 'Descripción'] : ['Grupo', 'Capítulo', 'Ítem', 'Descripción'];
    bloques.push({ tipo: 'tabla', tabla: tablaDe(columnas(cumplimiento, 'Valores por ítem', [...llave, ...COLUMNAS_DE_PLATA]), conPlata) });
  }
  for (const hoja of resto) bloques.push({ tipo: 'tabla', tabla: tablaDe(hoja, conPlata) });
  return bloques;
}

/** El nombre del archivo, con la obra y el periodo. */
export function nombreDelInforme(codigoDeObra: string, periodo: { desde: string; hasta: string }, extension: 'xlsx' | 'pdf'): string {
  const obra = codigoDeObra.trim().replace(/[^A-Za-z0-9-]+/g, '-') || 'obra';
  return `cumplimiento-${obra}-${periodo.desde}-${periodo.hasta}.${extension}`;
}
