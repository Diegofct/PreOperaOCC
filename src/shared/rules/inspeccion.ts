/**
 * Reglas del preoperacional. Funciones puras, sin I/O ni dependencias.
 *
 * Corren en dos sitios a propósito: en el dispositivo para poder bloquear un
 * vehículo sin señal, y en el servidor al ingerir, que es la versión
 * autoritativa. Si difieren, gana el servidor y queda registrado — pero al
 * estar escritas una sola vez aquí, no deberían diferir nunca.
 */
import type {
  Conformidad,
  ItemChecklist,
  Periodicidad,
  PlantillaChecklist,
  RespuestaItem,
  ResultadoPreoperacional,
} from '@/features/checklists/types';

const DIAS_QUINCENAL = 15;
const DIAS_MENSUAL = 30;
const MS_POR_DIA = 86_400_000;

/**
 * Qué periodicidades toca revisar hoy.
 *
 * El formato dice "cada 15 días" y "cada 30 días" sin anclarse a un día del
 * calendario, así que se cuenta desde la última vez que se hizo esa revisión
 * en ese vehículo. Es la lectura que funciona sin conexión y la que no
 * castiga a un equipo que estuvo parado tres semanas.
 */
export function periodicidadesAplicables(
  hoy: number,
  plantilla: PlantillaChecklist,
  ultima: { quincenal?: number | null; mensual?: number | null } = {},
): Periodicidad[] {
  const aplican: Periodicidad[] = ['diaria'];

  const vencida = (desde: number | null | undefined, dias: number) =>
    desde == null || hoy - desde >= dias * MS_POR_DIA;

  if (plantilla.periodicidades.includes('quincenal') && vencida(ultima.quincenal, DIAS_QUINCENAL)) {
    aplican.push('quincenal');
  }
  if (plantilla.periodicidades.includes('mensual') && vencida(ultima.mensual, DIAS_MENSUAL)) {
    aplican.push('mensual');
  }
  return aplican;
}

/** Los ítems que hay que mostrar hoy, ya filtrados por periodicidad. */
export function itemsAplicables(
  plantilla: PlantillaChecklist,
  periodicidades: Periodicidad[],
): ItemChecklist[] {
  const activas = new Set(periodicidades);
  return plantilla.secciones.flatMap((seccion) =>
    seccion.items.filter((item) => activas.has(item.periodicidad)),
  );
}

export function esNoConforme(respuesta: RespuestaItem): boolean {
  return respuesta.tipo === 'conformidad' && respuesta.valor === ('no_conforme' satisfies Conformidad);
}

function estaRespondido(respuesta: RespuestaItem | undefined): respuesta is RespuestaItem {
  if (!respuesta) return false;
  if (respuesta.valor === null || respuesta.valor === '') return false;
  return true;
}

export interface EvaluacionPreoperacional {
  resultado: ResultadoPreoperacional;
  /** Hallazgos en ítems marcados `- AI` en el formato. Dejan el vehículo parado. */
  inmovilizantes: RespuestaItem[];
  /** Hallazgos que no inmovilizan: se reportan pero el vehículo puede operar. */
  observaciones: RespuestaItem[];
  /** Ítems aplicables que quedaron sin responder. Impiden enviar. */
  faltantes: ItemChecklist[];
  /** Ítems no conformes a los que les falta la foto que exige la plantilla. */
  sinEvidencia: RespuestaItem[];
  completo: boolean;
}

/**
 * Un solo hallazgo en un ítem que inmoviliza deja el vehículo NO APTO.
 * Cualquier otro hallazgo lo deja apto con observaciones: se reporta, se abre
 * el correctivo, pero la máquina sigue trabajando.
 */
export function evaluarPreoperacional(
  plantilla: PlantillaChecklist,
  periodicidades: Periodicidad[],
  respuestas: RespuestaItem[],
): EvaluacionPreoperacional {
  const aplicables = itemsAplicables(plantilla, periodicidades);
  const porKey = new Map(respuestas.map((r) => [r.itemKey, r]));

  const faltantes = aplicables.filter((item) => !estaRespondido(porKey.get(item.key)));

  const hallazgos = aplicables
    .map((item) => porKey.get(item.key))
    .filter((r): r is RespuestaItem => !!r && esNoConforme(r));

  const inmovilizantes = hallazgos.filter((r) => r.inmoviliza);
  const observaciones = hallazgos.filter((r) => !r.inmoviliza);

  const exigeFoto = new Map(aplicables.map((i) => [i.key, i.exigirFoto]));
  const sinEvidencia = hallazgos.filter(
    (r) => exigeFoto.get(r.itemKey) === 'no_conforme' && !(r.mediaIds?.length ?? 0),
  );

  let resultado: ResultadoPreoperacional = 'apto';
  if (inmovilizantes.length > 0) resultado = 'no_apto';
  else if (observaciones.length > 0) resultado = 'apto_con_observaciones';

  return {
    resultado,
    inmovilizantes,
    observaciones,
    faltantes,
    sinEvidencia,
    completo: faltantes.length === 0,
  };
}

/**
 * Los ítems que inmovilizan quedan fuera de "marcar toda la sección como
 * conforme". El operador tiene que mirarlos uno por uno: son precisamente los
 * que no se pueden despachar en bloque.
 */
export function itemsMarcablesEnBloque(items: ItemChecklist[]): ItemChecklist[] {
  return items.filter((item) => item.tipo === 'conformidad' && !item.inmoviliza);
}

/* ------------------------------------------------------------------------ */
/* Medidores                                                                 */
/* ------------------------------------------------------------------------ */

/** Salto por encima del cual se pide confirmación explícita al operador. */
export const SALTO_SOSPECHOSO = { horometro: 24, odometro: 800 } as const;

export type VeredictoMedidor =
  | { estado: 'ok' }
  | { estado: 'retrocede'; anterior: number; mensaje: string }
  | { estado: 'salto_sospechoso'; anterior: number; mensaje: string };

/**
 * Un "12400" donde iba "1240" dispara de golpe todos los mantenimientos
 * preventivos y corrompe el histórico de horas. Es el error de digitación más
 * caro del sistema, así que se valida en el momento de teclearlo.
 */
export function validarMedidor(
  clase: 'horometro' | 'odometro',
  valor: number,
  anterior: number | null | undefined,
): VeredictoMedidor {
  if (anterior == null) return { estado: 'ok' };

  const unidad = clase === 'horometro' ? 'h' : 'km';
  const formatear = (n: number) => n.toLocaleString('es-CO');

  if (valor < anterior) {
    return {
      estado: 'retrocede',
      anterior,
      mensaje:
        `El ${clase} no puede ir hacia atrás. ` +
        `El último registro fue ${formatear(anterior)} ${unidad} y usted escribió ${formatear(valor)} ${unidad}.`,
    };
  }

  if (valor - anterior > SALTO_SOSPECHOSO[clase]) {
    return {
      estado: 'salto_sospechoso',
      anterior,
      mensaje:
        `¿Está seguro? El último registro fue ${formatear(anterior)} ${unidad} ` +
        `y usted escribió ${formatear(valor)} ${unidad}.`,
    };
  }

  return { estado: 'ok' };
}
