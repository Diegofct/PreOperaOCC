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

import { fechaDeJornada } from './jornada';

const DIAS_QUINCENAL = 15;
const DIAS_MENSUAL = 30;
const MS_POR_DIA = 86_400_000;

/**
 * ¿Este borrador se empezó con un formato que ya no es el vigente?
 *
 * Un preoperacional a medio llenar guarda la versión del formato con el que
 * empezó. Si entre medias se publicó otro —la spec 011 recortó los cinco—, lo
 * guardado tiene respuestas de ítems que ya no existen y le faltan los que
 * entraron. Seguir llenándolo produciría un acta que mezcla dos formatos, y eso
 * no hay forma de verificarlo después: la huella firmada no cuadraría con
 * ninguna plantilla.
 *
 * Se descarta y se empieza de nuevo (spec 011, RF-27). Se pierde lo tecleado,
 * que es el mal menor: un borrador nunca se ha subido y nada firmado se toca.
 *
 * Cualquier diferencia cuenta, no solo «la vigente es mayor»: un equipo que se
 * quedó con una plantilla que el catálogo ya no trae tampoco puede seguir,
 * porque el formulario que se le pintaría no sería el de su borrador.
 */
export function borradorCaduco(versionDelBorrador: number, versionVigente: number): boolean {
  return versionDelBorrador !== versionVigente;
}

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

/**
 * Un preoperacional **ya firmado**, visto por la regla del día.
 *
 * Solo lo firmado cuenta: un borrador a medio llenar no ha revisado nada, y por
 * eso `enviadoEn` no es opcional aquí. Lo que el servidor haya recibido o no da
 * igual — la regla mira lo que el operador firmó en este teléfono, que es la
 * única información que siempre está disponible sin señal.
 */
export interface FirmaDelDia {
  usuarioId: string;
  vehiculoId: string;
  /** Cuándo se firmó, en milisegundos. */
  enviadoEn: number;
  resultado: ResultadoPreoperacional;
}

export type EstadoDelDia =
  | { toca: true }
  | { toca: false; hechoEn: number; resultado: ResultadoPreoperacional };

/**
 * ¿Le toca preoperacional hoy a esta máquina, con este operador?
 *
 * El preoperacional es la revisión de antes de arrancar, una por jornada. El
 * sistema nunca lo había dicho: se podía levantar el mismo formato de la misma
 * volqueta cuatro veces el mismo día y cada una quedaba como un registro aparte
 * (spec 013).
 *
 * ── Por qué por operador y máquina, y no solo por máquina ──
 *
 * Porque cada quien responde por la máquina que va a manejar, y porque es lo
 * único que funciona sin señal: un teléfono no puede saber lo que hizo otro. Que
 * dos operadores revisen hoy la misma máquina está permitido a propósito
 * (RF-5).
 *
 * ── Por qué manda el último y no el peor ──
 *
 * Una máquina que salió NO APTO a las 7, se reparó y salió APTO a las 9 ya está
 * revisada. Al revés —APTO primero y NO APTO después— sí vuelve a tocar, porque
 * la máquina volvió a quedar parada. Y mientras siga saliendo NO APTO se puede
 * repetir sin tope: ese segundo preoperacional es justamente la constancia de
 * que la máquina volvió a servir.
 *
 * Todo lo que no es `no_apto` cuenta como hecho, sin caso especial. Escrito así,
 * un resultado que se añadiera mañana bloquearía por omisión, que es el lado
 * seguro: el error caro es dejar repetir de más, no de menos.
 */
export function estadoDelDia(
  quien: { usuarioId: string; vehiculoId: string; hoy: string },
  firmados: readonly FirmaDelDia[],
): EstadoDelDia {
  let ultimo: FirmaDelDia | null = null;

  for (const firma of firmados) {
    if (firma.usuarioId !== quien.usuarioId) continue;
    if (firma.vehiculoId !== quien.vehiculoId) continue;
    // El día de trabajo es el del parte diario, no una ventana de 24 horas.
    if (fechaDeJornada(firma.enviadoEn) !== quien.hoy) continue;
    if (ultimo === null || firma.enviadoEn > ultimo.enviadoEn) ultimo = firma;
  }

  if (ultimo === null) return { toca: true };
  if (ultimo.resultado === 'no_apto') return { toca: true };
  return { toca: false, hechoEn: ultimo.enviadoEn, resultado: ultimo.resultado };
}

/**
 * ¿Hay algo escrito en este formulario, o sigue en blanco?
 *
 * Es la frontera de cuándo nace el registro (spec 013, RF-13 a RF-15). Hasta
 * esta spec la fila del preoperacional se insertaba **al abrir la pantalla**, así
 * que un operador que entraba a mirar y salía dejaba un «Sin terminar» en su
 * historial sobre una máquina que a lo mejor ya estaba revisada y firmada: un
 * trabajo pendiente que no existe y que él no tenía forma de quitar.
 *
 * Los cuatro campos cuentan por igual y ninguno es el que "empieza" el
 * preoperacional. Las fotos cuentan porque una foto **es** un dato que el
 * operador capturó: si el registro naciera solo con la primera respuesta, una
 * foto tomada antes quedaría colgando de una fila que no existe —`media.dueno_id`
 * es texto suelto, sin llave foránea, así que nada la detendría—.
 *
 * Las observaciones se miran con `trim`: lo que se ve en blanco está en blanco.
 * Es el mismo criterio con el que el parte de obra decide si sus notas están
 * vacías (006/RF-9).
 */
export function borradorTieneContenido(borrador: {
  respuestas: readonly RespuestaItem[];
  odometroKm: number | null;
  horometroH: number | null;
  observaciones: string;
  /** Cuántas evidencias se han capturado ya para este borrador. */
  fotos: number;
}): boolean {
  if (borrador.respuestas.length > 0) return true;
  // `null` es "no lo escribió"; un cero es una lectura de verdad, y una máquina
  // nueva marca cero. Por eso se compara contra null y no por falsedad.
  if (borrador.odometroKm !== null || borrador.horometroH !== null) return true;
  if (borrador.observaciones.trim() !== '') return true;
  return borrador.fotos > 0;
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
 * Las lecturas de los medidores, convertidas en respuestas del formato.
 *
 * El horómetro y el odómetro son **ítems del formato** —están en el Excel, en su
 * sección, con su `key`— pero no se responden en la lista: se capturan arriba,
 * con el teclado grande, porque escribir un número con guantes en una fila de
 * checklist no funciona. Esa separación de interfaz no puede convertirse en una
 * separación de datos: si no vuelven aquí, `evaluarPreoperacional` los cuenta
 * como sin responder y **el operador no puede firmar nunca** — que es
 * exactamente lo que pasaba con la volqueta, 85 ítems llenos y dos fantasmas.
 *
 * El vínculo entre lectura e ítem es la **unidad**, no la `key`: es el mismo
 * criterio con el que `scripts/import-formatos.ts` deduce el bloque `medidores`
 * de la plantilla (`tiene('h')`, `tiene('km')`), así que los dos lados no pueden
 * discrepar sin que el formato entero esté mal importado.
 */
export function respuestasDeMedidores(
  plantilla: PlantillaChecklist,
  periodicidades: Periodicidad[],
  lecturas: { horometro?: number | null; odometro?: number | null },
  respondidoEn: number,
): RespuestaItem[] {
  const activas = new Set(periodicidades);
  const respuestas: RespuestaItem[] = [];

  for (const seccion of plantilla.secciones) {
    for (const item of seccion.items) {
      if (item.tipo !== 'numero' || !activas.has(item.periodicidad)) continue;

      const valor =
        item.unidad === 'h'
          ? lecturas.horometro
          : item.unidad === 'km'
            ? lecturas.odometro
            : null;
      if (valor == null) continue;

      respuestas.push({
        itemKey: item.key,
        seccionKey: seccion.key,
        label: item.label,
        sistema: item.sistema,
        tipo: item.tipo,
        inmoviliza: item.inmoviliza,
        valor,
        respondidoEn,
      });
    }
  }

  return respuestas;
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
