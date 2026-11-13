/**
 * Importar documentos al Almacén (spec 042): lo que se decide sobre una propuesta, sin I/O.
 *
 * La IA lee una factura, una remisión o una lista y propone sus ingresos; quien importa los revisa
 * y confirma, y entonces entran todos o ninguno. Lo que viene de la IA es una propuesta, no una
 * verdad: todo lo que decide si un renglón se puede confirmar, cómo se convierte una unidad o si
 * el documento ya entró vive aquí, para que la pantalla y el servidor digan lo mismo (principio 3).
 *
 * ── El documento repetido ──
 *
 * Un documento se reconoce por su proveedor y su número (RF-43). Escritos a mano o leídos de una
 * foto llegan de mil formas —«Ferretería Ñandú S.A.S.», «FERRETERIA NANDU SAS»; «FV-0012»,
 * «fv 0012»—, así que se comparan por una clave sin mayúsculas, tildes, espacios ni signos
 * (RF-45). Los ceros a la izquierda **sí** cuentan: «12» y «0012» pueden ser dos facturas del
 * mismo proveedor, y confundirlas callaría el aviso justo cuando hace falta.
 *
 * La clave se guarda en cada ingreso al confirmar, y lo repetido se busca entre los ingresos
 * **vigentes**: una factura cuyos ingresos se anularon todos no cuenta como importada (RF-91),
 * porque anularla es justamente la forma de corregirla. Sin proveedor o sin número no hay clave, y
 * eso no es «no está repetido» sino «no se pudo revisar» (RF-90): la pantalla lo dice así.
 *
 * Avisar no impide: una entrega parcial puede traer el mismo número (D5), y quien importa decide.
 *
 * ── Unidades distintas ──
 *
 * El Almacén lleva cada material en una unidad de su lista cerrada, y la factura trae la suya. Si
 * son la misma —«kg», «KG», «kilos»— no pasa nada (RF-79). Si no, el renglón se marca «Unidad
 * distinta» (RF-24) y la cantidad se convierte, en este orden:
 *
 *  1. con lo que diga **el documento** («bulto x 50 kg»), porque es el dato de ese proveedor
 *     (RF-25): manda aunque exista una equivalencia universal;
 *  2. con una **equivalencia universal**, la que no depende de nadie: toneladas y kilos, galones y
 *     litros, metros cúbicos y litros (RF-80);
 *  3. si no hay ninguna, la cantidad queda por escribir (RF-27). Bultos a kilos sin el peso del
 *     bulto no se adivina: un bulto de cemento pesa 50 kg y uno de cal, 25.
 *
 * La conversión dice siempre de dónde salió (RF-26), y el resultado se redondea a dos decimales,
 * como todo el Almacén (D31). El **valor unitario no se convierte** (D8): «$ 30.000 por bulto» sigue
 * siendo por bulto aunque la cantidad quede en kilos (RF-29, RF-58).
 */
import { abreviaturaDeUnidad, nombreDeUnidad, type UnidadAlmacen } from '@/shared/catalogos/almacen';
import { MENSAJES_DE_MOVIMIENTO, unidadDeTexto, validarMovimiento } from '@/shared/rules/almacen';
import { normalizar } from '@/shared/rules/texto';

/** RF-11. */
export const TIPOS_DE_DOCUMENTO = ['factura', 'remision', 'otro'] as const;
export type TipoDeDocumento = (typeof TIPOS_DE_DOCUMENTO)[number];

/**
 * Por dónde pasa una importación: se lee por detrás (`en_curso`), queda `lista` para revisar o
 * `fallida` con su motivo, y termina `confirmada` o `descartada` (RF-48, RF-64 a RF-66, RF-88). La
 * usa el enum de la base, para que los dos no puedan diferir.
 */
export const ESTADOS_DE_IMPORTACION = ['en_curso', 'lista', 'fallida', 'confirmada', 'descartada'] as const;
export type EstadoDeImportacion = (typeof ESTADOS_DE_IMPORTACION)[number];

/** Los datos de todo el documento, como se proponen y como se corrigen antes de confirmar (RF-11, RF-30). */
export interface DocumentoDeLaImportacion {
  proveedor: string | null;
  tipo: TipoDeDocumento;
  numero: string | null;
  /** `YYYY-MM-DD`: la del documento o la de hoy en Colombia (RF-32, RF-33). */
  fecha: string;
  /** Quien entregó físicamente (RF-13, RF-14, RF-72). Vacío hasta que alguien lo escriba. */
  entregadoPor: string;
}

/** El material de un renglón: uno vigente de la obra, uno nuevo, o todavía ninguno (RF-19 a RF-21, RF-84). */
export type MaterialDelRenglon =
  | { tipo: 'existente'; id: string }
  | {
      tipo: 'nuevo';
      nombre: string;
      /** De la lista de materiales de OCC (009/RF-32) o «Otro» (009/RF-33). */
      deLaLista: boolean;
      /** De la lista cerrada (RF-23); `null` hasta que se escoja (RF-77). */
      unidad: UnidadAlmacen | null;
    }
  | null;

/** De dónde sale una cantidad convertida (RF-25, RF-26, RF-80). */
export interface ConversionDelRenglon {
  /** Cuántas unidades del material trae cada unidad del documento. */
  factor: number;
  /** El texto del documento («bulto x 50 kg») o la equivalencia usada («1 t = 1.000 kg»). */
  fuente: string;
}

/** Un renglón de la propuesta (RF-10, RF-12, RF-15). */
export interface RenglonDeLaImportacion {
  /** De dónde salió: «p. 2», «H1F14», «L23» (RF-15). */
  cita: string;
  /** Como lo nombra el documento, a la vista junto al material propuesto (RF-76). */
  nombreEnDocumento: string;
  material: MaterialDelRenglon;
  /** La cantidad y la unidad tal como las trae el documento. */
  cantidadEnDocumento: number | null;
  unidadEnDocumento: string | null;
  /** En la unidad del material, con dos decimales (D31); `null` si falta escribirla (RF-27). */
  cantidad: number | null;
  conversion: ConversionDelRenglon | null;
  /** Pesos, como los trae el documento (RF-12, D7), con la unidad a la que corresponde (RF-29, RF-58). */
  valorUnitario: number | null;
  valorUnidad: string | null;
  /** RF-69, RF-70. */
  valorCalculadoDelTotal: boolean;
  /** Por qué hay que revisarlo: una cifra que no está donde se cita (RF-16). */
  revisar: string | null;
}

/** Un renglón del documento que no entra como ingreso, con su motivo (RF-17, RF-73, RF-74). */
export interface RenglonDejadoPorFuera {
  cita: string;
  texto: string;
  motivo: string;
}

/** Lo que queda en la propuesta tras la lectura, para revisar y confirmar. */
export interface PropuestaDeImportacion {
  documento: DocumentoDeLaImportacion;
  renglones: RenglonDeLaImportacion[];
  dejadosPorFuera: RenglonDejadoPorFuera[];
  /** Lo que se dice sin impedir: moneda distinta, otra obra (RF-71, RF-75). */
  avisos: string[];
}

/** Lo que cuenta para comparar: letras y números, sin tildes ni mayúsculas. */
function comparable(texto: string | null): string {
  return texto ? normalizar(texto).replace(/[^a-z0-9]/g, '') : '';
}

/**
 * RF-45: la clave de un documento por su proveedor y su número, o `null` si falta uno de los dos
 * (RF-90). La barra separa los dos para que «AB» + «C1» no choque con «A» + «BC1».
 */
export function claveDelDocumento(proveedor: string | null, numero: string | null): string | null {
  const p = comparable(proveedor);
  const n = comparable(numero);
  return p && n ? `${p}|${n}` : null;
}

/** Un ingreso ya registrado, con lo que hace falta para el aviso de repetido. */
export interface IngresoParaRepetido {
  documentoClave: string | null;
  anulado: boolean;
  /** ISO 8601. */
  registradoEn: string;
  registradoPorNombre: string | null;
}

/** RF-43: con qué fecha y por quién entró el documento la última vez. */
export interface DocumentoRepetido {
  importadoEn: string;
  importadoPor: string | null;
  ingresosVigentes: number;
}

/**
 * RF-43, RF-91: si el documento ya tiene ingresos vigentes en la obra. Se nombra la importación
 * más reciente, que es la que quien importa recordará. Sin clave no se puede saber (RF-90).
 */
export function documentoRepetido(clave: string | null, ingresos: readonly IngresoParaRepetido[]): DocumentoRepetido | null {
  if (!clave) return null;
  const vigentes = ingresos.filter((i) => i.documentoClave === clave && !i.anulado);
  if (vigentes.length === 0) return null;
  const ultimo = vigentes.reduce((a, b) => (b.registradoEn > a.registradoEn ? b : a));
  return { importadoEn: ultimo.registradoEn, importadoPor: ultimo.registradoPorNombre, ingresosVigentes: vigentes.length };
}

/* ── Unidades y conversión ──────────────────────────────────────────────── */

/**
 * D31: dos decimales, como la base del Almacén. Pasa por `toPrecision` para que 1,005 sea 1,01 y no
 * 1,00 por el error de la coma flotante (1,005 × 100 = 100,49999…).
 */
export function aDosDecimales(valor: number): number {
  return Math.round(Number((valor * 100).toPrecision(12))) / 100;
}

/** RF-80: las equivalencias que no dependen del documento, con cómo se dicen. */
const UNIVERSALES: readonly { de: UnidadAlmacen; a: UnidadAlmacen; factor: number; fuente: string }[] = [
  { de: 'tonelada', a: 'kilogramo', factor: 1000, fuente: '1 t = 1.000 kg' },
  { de: 'kilogramo', a: 'tonelada', factor: 0.001, fuente: '1.000 kg = 1 t' },
  // El galón de Colombia es el estadounidense.
  { de: 'galon', a: 'litro', factor: 3.785411784, fuente: '1 gal = 3,785 L' },
  { de: 'litro', a: 'galon', factor: 1 / 3.785411784, fuente: '3,785 L = 1 gal' },
  { de: 'metro_cubico', a: 'litro', factor: 1000, fuente: '1 m³ = 1.000 L' },
  { de: 'litro', a: 'metro_cubico', factor: 0.001, fuente: '1.000 L = 1 m³' },
];

/** La cantidad como la trae el documento, con la conversión que el documento diga, si la dice. */
export interface CantidadDelDocumento {
  cantidad: number | null;
  unidad: string | null;
  /** «bulto x 50 kg» leído por la IA: cuánto de la unidad del material trae cada una del documento. */
  factor: ConversionDelRenglon | null;
}

export interface CantidadEnElMaterial {
  /** En la unidad del material, con dos decimales; `null` si hay que escribirla (RF-27). */
  cantidad: number | null;
  conversion: ConversionDelRenglon | null;
  /** RF-24. */
  unidadDistinta: boolean;
}

/**
 * RF-24 a RF-27, RF-79, RF-80, D31: la cantidad del documento en la unidad del material. Sin unidad
 * del material —uno nuevo al que todavía no se le escoge (RF-77)— no se decide nada.
 */
export function cantidadEnElMaterial(documento: CantidadDelDocumento, unidadDelMaterial: UnidadAlmacen | null): CantidadEnElMaterial {
  if (!unidadDelMaterial) return { cantidad: null, conversion: null, unidadDistinta: false };
  const { cantidad } = documento;
  const unidad = unidadDeTexto(documento.unidad);

  if (unidad === unidadDelMaterial) {
    return { cantidad: cantidad === null ? null : aDosDecimales(cantidad), conversion: null, unidadDistinta: false };
  }

  const delDocumento = documento.factor && Number.isFinite(documento.factor.factor) && documento.factor.factor > 0 ? documento.factor : null;
  const universal = UNIVERSALES.find((u) => u.de === unidad && u.a === unidadDelMaterial);
  const conversion = delDocumento ?? (universal ? { factor: universal.factor, fuente: universal.fuente } : null);
  if (!conversion || cantidad === null) return { cantidad: null, conversion, unidadDistinta: true };
  return { cantidad: aDosDecimales(cantidad * conversion.factor), conversion, unidadDistinta: true };
}

/** Pesos con hasta dos decimales: el valor unitario puede traer centavos, y `enPesos` los redondea. */
function pesosConCentavos(valor: number): string {
  const centavos = Math.round(Number((Math.abs(valor) * 100).toPrecision(12)));
  const enteros = String(Math.floor(centavos / 100)).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  const resto = centavos % 100;
  return `${valor < 0 ? '-' : ''}$ ${enteros}${resto ? `,${String(resto).padStart(2, '0')}` : ''}`;
}

/**
 * RF-58: el valor unitario con la unidad del documento («$ 30.000 por bulto»). La unidad que está
 * en la lista sale con su nombre; la que no («viaje»), como la escribió el documento.
 */
export function valorConSuUnidad(valor: number | null, unidadDelDocumento: string | null): string | null {
  if (valor === null) return null;
  const texto = unidadDelDocumento?.trim();
  if (!texto) return pesosConCentavos(valor);
  const enLaLista = unidadDeTexto(texto);
  return `${pesosConCentavos(valor)} por ${(enLaLista ? nombreDeUnidad(enLaLista) : texto).toLowerCase()}`;
}

/* ── Las marcas de un renglón ───────────────────────────────────────────── */

/**
 * Lo que puede tener un renglón antes de confirmar (D12). Las que **bloquean** impiden confirmar
 * hasta corregir o quitar el renglón; los **avisos** se muestran y se confirma igual.
 */
export type MarcaDelRenglon =
  | 'sin_material'
  | 'unidad_sin_convertir'
  | 'sin_cantidad'
  | 'revisar'
  | 'unidad_distinta'
  | 'calculado_del_total';

export interface EstadoDeMarca {
  marca: MarcaDelRenglon;
  tipo: 'bloquea' | 'aviso';
  /** Lo que se le dice a quien importa, en el renglón. */
  texto: string;
}

/** Cómo se nombra la unidad del documento: tal cual, o «sin unidad» si no la trae. */
const unidadDicha = (unidad: string | null) => unidad?.trim() || 'sin unidad';

/**
 * RF-28, RF-37, RF-83 a RF-85: las marcas de un renglón, las que bloquean primero. La pantalla las
 * pinta y el servidor rechaza con las mismas, así que no pueden decir cosas distintas.
 *
 * `unidadDelMaterial` es la del material escogido: la de uno vigente la sabe quien llama; la de uno
 * nuevo viene en el renglón. Sin ella no se miran las unidades: lo que falta es el material.
 *
 * Un documento que no dice la unidad cuenta como «Unidad distinta»: suponer la del material dejaría
 * entrar 100 kg de lo que eran 100 bultos sin que nadie lo revise.
 */
export function estadoDelRenglon(renglon: RenglonDeLaImportacion, unidadDelMaterial: UnidadAlmacen | null): EstadoDeMarca[] {
  const marcas: EstadoDeMarca[] = [];
  const { material } = renglon;
  const unidad = material?.tipo === 'nuevo' ? material.unidad : material ? unidadDelMaterial : null;

  // RF-84, RF-77: sin material, o uno nuevo sin su unidad de la lista. Uno de la obra sin unidad es
  // uno que ya no está entre los vigentes (RF-86): se dice eso, no que le falta la unidad.
  if (!material) marcas.push({ marca: 'sin_material', tipo: 'bloquea', texto: 'Escoja el material de este renglón.' });
  else if (!unidad) {
    marcas.push({
      marca: 'sin_material',
      tipo: 'bloquea',
      texto: material.tipo === 'nuevo' ? 'Escoja la unidad del material nuevo.' : 'El material escogido ya no está vigente en la obra: escoja otro.',
    });
  }

  const distinta = unidad !== null && unidadDeTexto(renglon.unidadEnDocumento) !== unidad;
  if (distinta && renglon.cantidad === null) {
    // RF-28.
    marcas.push({
      marca: 'unidad_sin_convertir',
      tipo: 'bloquea',
      texto: `El documento trae ${unidadDicha(renglon.unidadEnDocumento)}: escriba la cantidad en ${abreviaturaDeUnidad(unidad)}.`,
    });
  } else if (renglon.cantidad === null) {
    // RF-37.
    marcas.push({ marca: 'sin_cantidad', tipo: 'bloquea', texto: 'Escriba la cantidad o quite el renglón.' });
  }

  // RF-83: una cifra que no estaba donde la IA dijo (RF-16).
  if (renglon.revisar) marcas.push({ marca: 'revisar', tipo: 'bloquea', texto: renglon.revisar });

  // RF-85: los avisos.
  if (distinta && renglon.cantidad !== null) {
    marcas.push({
      marca: 'unidad_distinta',
      tipo: 'aviso',
      texto: renglon.conversion
        ? `Convertido de ${unidadDicha(renglon.unidadEnDocumento)} a ${abreviaturaDeUnidad(unidad)}: ${renglon.conversion.fuente}.`
        : `Cantidad escrita en ${abreviaturaDeUnidad(unidad)}; el documento trae ${unidadDicha(renglon.unidadEnDocumento)}.`,
    });
  }
  if (renglon.valorCalculadoDelTotal) {
    marcas.push({ marca: 'calculado_del_total', tipo: 'aviso', texto: 'Valor unitario calculado del total del renglón.' });
  }
  return marcas;
}

/** D12: ¿alguna marca impide confirmar? */
export function renglonBloqueado(marcas: readonly EstadoDeMarca[]): boolean {
  return marcas.some((m) => m.tipo === 'bloquea');
}

/* ── Confirmar ──────────────────────────────────────────────────────────── */

/** Lo que llega a confirmar: los datos del documento y los renglones que quedaron, ya corregidos. */
export interface PropuestaPorConfirmar {
  documento: DocumentoDeLaImportacion;
  renglones: readonly RenglonDeLaImportacion[];
}

/** Una falta: de un renglón (por su posición) o de todo el documento (`null`). */
export interface FaltaParaConfirmar {
  renglon: number | null;
  texto: string;
}

/**
 * RF-34 a RF-37, RF-40, RF-81 a RF-84: todo lo que impide confirmar, o una lista vacía. Devuelve
 * **todas** las faltas, como el ingreso a mano (009), para corregirlas de una vez.
 *
 * La fecha y «Entregado por» son de todo el documento, y se miran con `validarMovimiento`, la misma
 * regla del ingreso a mano: un importado se rechaza con las mismas palabras que uno escrito (RF-34,
 * RF-36). Cada renglón aporta sus marcas que bloquean (T4) y que su cantidad sea mayor que cero
 * (RF-35). Proveedor, número y valor no se exigen (RF-82).
 *
 * `hoy` es la fecha de Colombia (`fechaDeJornada`), y llega de fuera para que la regla siga pura.
 */
export function faltasParaConfirmar(
  propuesta: PropuestaPorConfirmar,
  unidadDe: (renglon: RenglonDeLaImportacion) => UnidadAlmacen | null,
  hoy: string,
): FaltaParaConfirmar[] {
  if (propuesta.renglones.length === 0) {
    return [{ renglon: null, texto: 'No queda ningún renglón: agregue uno o descarte la propuesta.' }];
  }
  const { documento } = propuesta;
  // La cantidad de prueba (1) es para que la regla del ingreso mire solo la fecha y quién entregó.
  const delDocumento = validarMovimiento({ tipo: 'ingreso', fecha: documento.fecha, cantidad: 1, responsable: documento.entregadoPor }, hoy);
  const faltas: FaltaParaConfirmar[] = delDocumento.map((f) => ({ renglon: null, texto: f.mensaje }));

  propuesta.renglones.forEach((renglon, n) => {
    for (const marca of estadoDelRenglon(renglon, unidadDe(renglon))) {
      if (marca.tipo === 'bloquea') faltas.push({ renglon: n, texto: marca.texto });
    }
    if (renglon.cantidad !== null && renglon.cantidad <= 0) {
      faltas.push({ renglon: n, texto: MENSAJES_DE_MOVIMIENTO.cantidadNoPositiva });
    }
  });
  return faltas;
}

/** Un ingreso listo para escribir. */
export interface IngresoAConfirmar {
  /** Su posición en la propuesta: de ella sale su id fijo (RF-88). */
  renglon: number;
  material: Exclude<MaterialDelRenglon, null>;
  /** En centésimas, como la base del Almacén (D31). */
  centesimas: number;
  valorUnitario: number | null;
  valorUnidad: string | null;
}

/** Lo que se escribe al confirmar: los datos del documento una vez y un ingreso por renglón (RF-38). */
export interface ImportacionAConfirmar {
  fecha: string;
  entregadoPor: string;
  proveedor: string | null;
  tipo: TipoDeDocumento;
  numero: string | null;
  /** Para el aviso de repetido de las importaciones siguientes (RF-43, RF-45). */
  clave: string | null;
  ingresos: IngresoAConfirmar[];
}

/** Un texto sin espacios de sobra, o `null` si no queda nada. */
const textoOVacio = (texto: string | null) => texto?.trim() || null;

/**
 * RF-38, D31: lo que se escribe, en la forma de la base. Se llama después de
 * `faltasParaConfirmar`: un renglón sin material o sin cantidad aquí es un error de quien llama.
 */
export function importacionAConfirmar(propuesta: PropuestaPorConfirmar): ImportacionAConfirmar {
  const { documento } = propuesta;
  const proveedor = textoOVacio(documento.proveedor);
  const numero = textoOVacio(documento.numero);
  return {
    fecha: documento.fecha,
    entregadoPor: documento.entregadoPor.trim(),
    proveedor,
    tipo: documento.tipo,
    numero,
    clave: claveDelDocumento(proveedor, numero),
    ingresos: propuesta.renglones.map((r, renglon) => {
      if (!r.material || r.cantidad === null) throw new Error(`El renglón ${renglon + 1} no está listo para confirmar.`);
      const valorUnitario = r.valorUnitario === null ? null : aDosDecimales(r.valorUnitario);
      return {
        renglon,
        material: r.material,
        centesimas: Math.round(aDosDecimales(r.cantidad) * 100),
        valorUnitario,
        valorUnidad: valorUnitario === null ? null : textoOVacio(r.valorUnidad),
      };
    }),
  };
}

/** Un material que se crea al confirmar, con los renglones que lo usan. */
export interface MaterialNuevoAConfirmar {
  /** Como lo compara el índice único de la base (`nombre_normalizado`, 009/RF-3). */
  clave: string;
  nombre: string;
  unidad: UnidadAlmacen;
  renglones: number[];
}

/**
 * RF-39, RF-23: los materiales nuevos de una importación, uno por nombre aunque lo usen varios
 * renglones. Se comparan como la base (`normalizar`: sin tildes ni mayúsculas), para que dos
 * renglones con «Alambre negro» y «ALAMBRE NEGRO» no choquen entre sí con el índice único. Un mismo
 * material no puede nacer con dos unidades: eso es una falta de cada renglón que lo usa.
 */
export function materialesNuevosDe(importacion: ImportacionAConfirmar): { nuevos: MaterialNuevoAConfirmar[]; faltas: FaltaParaConfirmar[] } {
  const porClave = new Map<string, { nombre: string; unidades: Set<UnidadAlmacen | null>; renglones: number[] }>();
  for (const ingreso of importacion.ingresos) {
    if (ingreso.material.tipo !== 'nuevo') continue;
    const nombre = ingreso.material.nombre.trim();
    const clave = normalizar(nombre);
    const grupo = porClave.get(clave) ?? { nombre, unidades: new Set(), renglones: [] };
    grupo.unidades.add(ingreso.material.unidad);
    grupo.renglones.push(ingreso.renglon);
    porClave.set(clave, grupo);
  }

  const nuevos: MaterialNuevoAConfirmar[] = [];
  const faltas: FaltaParaConfirmar[] = [];
  for (const [clave, grupo] of porClave) {
    const [unidad] = grupo.unidades;
    if (grupo.unidades.size > 1 || !unidad) {
      const texto = !unidad && grupo.unidades.size === 1
        ? 'Escoja la unidad del material nuevo.'
        : `El material nuevo «${grupo.nombre}» va con dos unidades distintas: escoja una sola.`;
      for (const renglon of grupo.renglones) faltas.push({ renglon, texto });
      continue;
    }
    nuevos.push({ clave, nombre: grupo.nombre, unidad, renglones: grupo.renglones });
  }
  faltas.sort((a, b) => (a.renglon ?? -1) - (b.renglon ?? -1));
  return { nuevos, faltas };
}
