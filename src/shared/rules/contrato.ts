/**
 * El contrato de una obra (spec 031, RF-7 a RF-22). Reglas puras: sin I/O, como todo
 * `shared/rules`.
 *
 * Aquí se decide qué se puede guardar, qué falta para aprobar y cómo se lee el plazo.
 * La pantalla las usa para avisar antes de enviar y el servidor las vuelve a correr al
 * recibir: si difieren, gana el servidor (constitución, principio 3).
 *
 * ── Dos listas de faltas, no una ──
 *
 * Un borrador se guarda a medias: nadie tiene el contrato entero el primer día. Por
 * eso `faltasParaGuardarContrato` solo rechaza lo imposible (una fecha de fin antes
 * del inicio, un porcentaje de 130) y `faltasParaAprobarContrato` exige además lo que
 * los cortes de la spec 032 van a necesitar.
 */
import { enPesos } from './pesos';

/** Los tipos de contrato, en los grupos de NexusObras (RF-12). */
export const GRUPOS_DE_TIPO_DE_CONTRATO = [
  {
    grupo: 'Contratos de obra',
    tipos: [
      { id: 'precio_global', nombre: 'Precio global' },
      { id: 'precios_unitarios', nombre: 'Precios unitarios' },
      { id: 'administracion_delegada', nombre: 'Administración delegada' },
      { id: 'llave_en_mano', nombre: 'Llave en mano' },
    ],
  },
  {
    grupo: 'Consultoría de obra',
    tipos: [
      { id: 'estudios_y_disenos', nombre: 'Estudios y diseños' },
      { id: 'interventoria', nombre: 'Interventoría o supervisión técnica' },
      { id: 'gerencia_de_proyectos', nombre: 'Gerencia de proyectos' },
      { id: 'asesoria_tecnica', nombre: 'Asesoría técnica especializada' },
    ],
  },
  {
    grupo: 'Otros',
    tipos: [
      { id: 'mano_de_obra', nombre: 'Mano de obra' },
      { id: 'todo_costo', nombre: 'Todo costo' },
      { id: 'subcontrato', nombre: 'Subcontrato' },
      { id: 'alquiler', nombre: 'Alquiler' },
      { id: 'otro', nombre: 'Otro' },
    ],
  },
] as const;

export type TipoDeContrato = (typeof GRUPOS_DE_TIPO_DE_CONTRATO)[number]['tipos'][number]['id'];

export const TIPOS_DE_CONTRATO: readonly TipoDeContrato[] = GRUPOS_DE_TIPO_DE_CONTRATO.flatMap((g) =>
  g.tipos.map((t) => t.id),
);

export function esTipoDeContrato(valor: unknown): valor is TipoDeContrato {
  return typeof valor === 'string' && (TIPOS_DE_CONTRATO as readonly string[]).includes(valor);
}

export function nombreDeTipoDeContrato(tipo: TipoDeContrato): string {
  for (const g of GRUPOS_DE_TIPO_DE_CONTRATO) {
    const t = g.tipos.find((x) => x.id === tipo);
    if (t) return t.nombre;
  }
  return tipo;
}

/** Sobre qué se calcula un impuesto o una retención (RF-20). */
export const BASES_DE_IMPUESTO = ['costo_directo', 'aiu', 'utilidad', 'iva', 'corte'] as const;

export type BaseDeImpuesto = (typeof BASES_DE_IMPUESTO)[number];

export const NOMBRE_DE_BASE: Record<BaseDeImpuesto, string> = {
  costo_directo: 'Costo directo',
  aiu: 'AIU',
  utilidad: 'Utilidad',
  iva: 'IVA',
  corte: 'Valor del corte',
};

export function esBaseDeImpuesto(valor: unknown): valor is BaseDeImpuesto {
  return typeof valor === 'string' && (BASES_DE_IMPUESTO as readonly string[]).includes(valor);
}

export interface ImpuestoDelContrato {
  id: string;
  nombre: string;
  /** En por ciento: 2 es el 2 %. `null` mientras nadie lo escribe (ReteICA, RF-21). */
  porcentaje: number | null;
  base: BaseDeImpuesto;
}

/**
 * Los que se proponen al agregar (RF-21). Sin id: lo pone quien los agrega. La ReteICA
 * y las estampillas dependen del municipio, así que su porcentaje queda por escribir.
 */
export const IMPUESTOS_SUGERIDOS: readonly Omit<ImpuestoDelContrato, 'id'>[] = [
  { nombre: 'Retefuente (servicios de construcción)', porcentaje: 2, base: 'corte' },
  { nombre: 'ReteIVA', porcentaje: 15, base: 'iva' },
  { nombre: 'ReteICA', porcentaje: null, base: 'corte' },
  { nombre: 'Estampillas', porcentaje: null, base: 'corte' },
];

export interface IntegranteDelConsorcio {
  nombre: string;
  nit: string;
  /** En por ciento: 60 es el 60 %. */
  porcentaje: number | null;
}

/** Lo del contrato que deciden estas reglas. Las demás columnas no cambian nada aquí. */
export interface ContratoParaRevisar {
  contratanteNombre: string;
  esConsorcio: boolean;
  nombreConsorcio: string;
  integrantes: readonly IntegranteDelConsorcio[];
  tipo: string | null;
  numero: string;
  /** `YYYY-MM-DD`. */
  fechaInicio: string | null;
  fechaFin: string | null;
  /** Pesos, sin decimales. */
  valor: number | null;
  anticipoPorcentaje: number | null;
  retencionPorcentaje: number | null;
  impuestos: readonly ImpuestoDelContrato[];
}

/** Un porcentaje entre 0 y 100, ambos incluidos (RF-22). `null` es «sin escribir» y vale. */
export function porcentajeValido(valor: number | null | undefined): boolean {
  if (valor === null || valor === undefined) return true;
  return Number.isFinite(valor) && valor >= 0 && valor <= 100;
}

function diaUtc(fecha: string): number {
  return Date.UTC(Number(fecha.slice(0, 4)), Number(fecha.slice(5, 7)) - 1, Number(fecha.slice(8, 10)));
}

/**
 * Los días entre el inicio y el fin (RF-13): del 1 al 31 de octubre son 30, como cuenta
 * el plazo un contrato que vence «a los 30 días» de su acta de inicio. `null` si falta
 * una fecha o el fin es anterior (eso lo dice `faltasParaGuardarContrato`).
 */
export function plazoEnDias(inicio: string | null, fin: string | null): number | null {
  if (!inicio || !fin) return null;
  const dias = Math.round((diaUtc(fin) - diaUtc(inicio)) / 86_400_000);
  return dias < 0 ? null : dias;
}

/** Cuánto suman las participaciones del consorcio, con un decimal (RF-11). */
export function sumaDeParticipaciones(integrantes: readonly IntegranteDelConsorcio[]): number {
  return Math.round(integrantes.reduce((s, i) => s + (i.porcentaje ?? 0), 0) * 10) / 10;
}

/**
 * Lo que impide guardar incluso un borrador (RF-14, RF-22): fechas al revés y
 * porcentajes imposibles. Vacía si se puede guardar.
 */
export function faltasParaGuardarContrato(c: ContratoParaRevisar): string[] {
  const faltas: string[] = [];
  if (c.fechaInicio && c.fechaFin && diaUtc(c.fechaFin) < diaUtc(c.fechaInicio)) {
    faltas.push('La fecha de fin es anterior a la de inicio.');
  }
  if (!porcentajeValido(c.anticipoPorcentaje)) faltas.push('El anticipo debe estar entre 0 % y 100 %.');
  if (!porcentajeValido(c.retencionPorcentaje)) {
    faltas.push('La retención en garantía debe estar entre 0 % y 100 %.');
  }
  for (const i of c.impuestos) {
    if (!porcentajeValido(i.porcentaje)) {
      faltas.push(`${i.nombre.trim() || 'Un impuesto'}: el porcentaje debe estar entre 0 % y 100 %.`);
    }
  }
  if (c.esConsorcio) {
    for (const i of c.integrantes) {
      if (!porcentajeValido(i.porcentaje)) {
        faltas.push(`${i.nombre.trim() || 'Un integrante'}: la participación debe estar entre 0 % y 100 %.`);
      }
    }
  }
  if (c.valor !== null && (!Number.isFinite(c.valor) || c.valor < 0)) faltas.push('El valor no puede ser negativo.');
  return faltas;
}

/**
 * Lo que falta para aprobar (RF-11, RF-17): lo de guardar, más el contratante, el
 * tipo, el número, las dos fechas y el valor; y, en un consorcio, su nombre, al menos
 * dos integrantes con nombre y participaciones que sumen 100 %.
 */
export function faltasParaAprobarContrato(c: ContratoParaRevisar): string[] {
  const faltas = faltasParaGuardarContrato(c);
  if (!c.contratanteNombre.trim()) faltas.push('Falta el nombre del contratante.');
  if (!esTipoDeContrato(c.tipo)) faltas.push('Falta el tipo de contrato.');
  if (!c.numero.trim()) faltas.push('Falta el número del contrato.');
  if (!c.fechaInicio) faltas.push('Falta la fecha de inicio.');
  if (!c.fechaFin) faltas.push('Falta la fecha de fin.');
  if (!c.valor) faltas.push('Falta el valor del contrato.');
  if (c.esConsorcio) {
    if (!c.nombreConsorcio.trim()) faltas.push('Falta el nombre del consorcio o la unión temporal.');
    if (c.integrantes.length < 2) faltas.push('Un consorcio o unión temporal tiene al menos dos integrantes.');
    if (c.integrantes.some((i) => !i.nombre.trim())) faltas.push('Hay un integrante sin nombre.');
    const suma = sumaDeParticipaciones(c.integrantes);
    if (suma !== 100) {
      faltas.push(`Las participaciones de los integrantes suman ${suma.toLocaleString('es-CO')} %; deben sumar 100 %.`);
    }
  }
  for (const i of c.impuestos) {
    if (!i.nombre.trim()) faltas.push('Hay un impuesto sin nombre.');
    else if (i.porcentaje === null) faltas.push(`${i.nombre.trim()}: falta el porcentaje.`);
  }
  return faltas;
}

/**
 * La diferencia entre el valor del contrato y el del presupuesto vigente (RF-16), o
 * `null` si coinciden o falta uno de los dos. Solo avisa: no impide nada (D3).
 */
export function diferenciaConPresupuesto(
  valorContrato: number | null,
  valorPresupuesto: number | null,
): { diferencia: number; texto: string } | null {
  if (valorContrato === null || valorPresupuesto === null) return null;
  const diferencia = valorContrato - valorPresupuesto;
  if (diferencia === 0) return null;
  const cuanto = enPesos(Math.abs(diferencia));
  return {
    diferencia,
    texto:
      diferencia > 0
        ? `El contrato vale ${cuanto} más que el presupuesto vigente.`
        : `El contrato vale ${cuanto} menos que el presupuesto vigente.`,
  };
}

/** Las clases de documento del contrato (RF-27). */
export const CLASES_DE_DOCUMENTO = [
  { id: 'contrato_firmado', nombre: 'Contrato firmado' },
  { id: 'acta_de_inicio', nombre: 'Acta de inicio' },
  { id: 'otrosi', nombre: 'Otrosí' },
  { id: 'acta_de_suspension', nombre: 'Acta de suspensión' },
  { id: 'acta_de_reinicio', nombre: 'Acta de reinicio' },
  { id: 'acta_de_recibo', nombre: 'Acta de recibo' },
  { id: 'minuta', nombre: 'Minuta' },
  { id: 'otro', nombre: 'Otro' },
] as const;

export type ClaseDeDocumento = (typeof CLASES_DE_DOCUMENTO)[number]['id'];

export const IDS_CLASE_DE_DOCUMENTO = CLASES_DE_DOCUMENTO.map((c) => c.id) as readonly ClaseDeDocumento[];

/** Los archivos que acepta el contrato (RF-30): PDF o imagen, hasta 20 MB. */
export const MIMES_DEL_CONTRATO = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'] as const;

export const TAMANO_MAXIMO_DEL_CONTRATO = 20 * 1024 * 1024;

/** Por qué no se acepta un archivo (RF-30), o `null` si se acepta. */
export function rechazoDeArchivo(mime: string, bytes: number): { mensaje: string; estado: 413 | 415 | 422 } | null {
  if (!(MIMES_DEL_CONTRATO as readonly string[]).includes(mime)) {
    return { mensaje: 'Solo se admiten archivos PDF o imágenes JPG, PNG o WEBP.', estado: 415 };
  }
  if (bytes === 0) return { mensaje: 'El archivo llegó vacío.', estado: 422 };
  if (bytes > TAMANO_MAXIMO_DEL_CONTRATO) {
    return { mensaje: 'El archivo pesa más de 20 MB. Redúzcalo antes de subirlo.', estado: 413 };
  }
  return null;
}
