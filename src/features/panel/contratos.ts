/**
 * Lo que el panel puede pedirle al servidor, escrito una sola vez.
 *
 * Cada alta y cada edición tiene aquí su esquema de Zod, y de él salen a la vez
 * la validación del endpoint y el tipo que usa el formulario. Escribir las dos
 * mitades por separado es la manera clásica de que un campo obligatorio deje de
 * serlo en un lado y no en el otro, y de que el error se descubra cuando ya hay
 * datos malos guardados.
 *
 * **El servidor valida igual.** Que el formulario compruebe lo mismo es
 * comodidad para quien escribe, no una defensa: el endpoint no confía en el
 * navegador y vuelve a pasar todo por estos esquemas.
 *
 * Módulo puro —solo Zod— para que lo importen las dos mitades sin arrastrar nada
 * de una a la otra.
 */
import { z } from 'zod';

import { IDS_CARGO, type Cargo } from '@/shared/catalogos/cargos';
import { ROLES, type Rol } from '@/shared/rules/permisos';

/** Texto opcional de formulario: lo vacío es ausencia, no cadena vacía. */
const textoOpcional = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .nullish()
    .transform((v) => (v && v.length > 0 ? v : null));

const textoObligatorio = (max: number, campo: string) =>
  z.string().trim().min(1, `Falta ${campo}.`).max(max);

/** Lectura de medidor: entera, no negativa y opcional. */
const medidorOpcional = z
  .number()
  .int('El medidor va en números enteros.')
  .min(0, 'El medidor no puede ser negativo.')
  .nullish()
  .transform((v) => v ?? null);

const idOpcional = z
  .string()
  .trim()
  .nullish()
  .transform((v) => (v && v.length > 0 ? v : null));

/*
 * Campos de una edición parcial.
 *
 * Se distinguen de los de arriba en una cosa que parece un detalle y no lo es:
 * **ausente y vacío significan cosas distintas.** Un `PATCH` que solo manda el
 * horómetro final no está pidiendo borrar el inicial, y con los ayudantes de
 * arriba —que convierten lo ausente en `null`— eso es exactamente lo que
 * pasaba: guardar un campo vaciaba los demás.
 *
 * Aquí, ausente es `undefined` y el endpoint no toca la columna; `null`
 * explícito sí la vacía.
 */
const medidorParcial = z
  .number()
  .int('El medidor va en números enteros.')
  .min(0, 'El medidor no puede ser negativo.')
  .nullable()
  .optional();

const idParcial = z.string().trim().min(1).nullable().optional();

/* ------------------------------------------------------------------------ */
/* Obras                                                                     */
/* ------------------------------------------------------------------------ */

export const obraNueva = z.object({
  codigo: textoObligatorio(32, 'el código'),
  nombre: textoObligatorio(160, 'el nombre'),
  municipio: textoOpcional(120),
  activa: z.boolean().default(true),
});

export const obraEditada = obraNueva.partial();

export type ObraNueva = z.input<typeof obraNueva>;

export interface ObraFila {
  id: string;
  codigo: string;
  nombre: string;
  municipio: string | null;
  activa: boolean;
}

/* ------------------------------------------------------------------------ */
/* Personas                                                                  */
/* ------------------------------------------------------------------------ */

/**
 * El rol no se amplía: los cargos reales de OCC se mapean sobre estos tres.
 * Residente y director de obra son `supervisor`; gerencia es `admin`.
 *
 * La lista vive con la tabla de permisos, no aquí: quien decide qué puede hacer
 * cada rol es quien debe decir cuáles hay.
 */
export { ROLES, type Rol };

export const ETIQUETA_ROL: Record<Rol, string> = {
  admin: 'Gerencia',
  supervisor: 'Residente / Director',
  operador: 'Operador',
};

export const personaNueva = z.object({
  /**
   * Con lo que se identifica al ingresar, en el celular y en la web. Se guarda
   * en minúsculas y sin espacios porque nadie va a recordar si lo escribió con
   * mayúscula, y un usuario duplicado que solo difiere en eso es un ingreso
   * ambiguo.
   */
  usuario: textoObligatorio(40, 'el usuario')
    .toLowerCase()
    .regex(/^[a-z0-9._-]+$/, 'El usuario solo admite letras, números, punto, guion y guion bajo.'),
  nombreCompleto: textoObligatorio(160, 'el nombre completo'),
  documento: textoOpcional(32),
  /** El acceso al sistema. El oficio va en `cargo`, que es otra cosa. */
  rol: z.enum(ROLES, { error: 'Ese nivel de acceso no existe.' }).default('operador'),
  /**
   * El oficio en la obra. Opcional porque las personas registradas antes de la
   * spec 002 no lo tienen, y quedarse sin cargo es un estado real.
   */
  cargo: z
    .enum(IDS_CARGO as [Cargo, ...Cargo[]], { error: 'Ese cargo no existe.' })
    .nullish()
    .transform((v) => v ?? null),
  obraId: idOpcional,
  activo: z.boolean().default(true),
});

export const personaEditada = personaNueva.partial();

export type PersonaNueva = z.input<typeof personaNueva>;

export interface PersonaFila {
  id: string;
  usuario: string;
  nombreCompleto: string;
  documento: string | null;
  rol: Rol;
  cargo: Cargo | null;
  obraId: string | null;
  obraNombre: string | null;
  activo: boolean;
}

/* ------------------------------------------------------------------------ */
/* Vehículos                                                                 */
/* ------------------------------------------------------------------------ */

export const ESTADOS_VEHICULO = [
  'operativo',
  'en_mantenimiento',
  'fuera_servicio',
  'no_apto',
] as const;
export type EstadoVehiculo = (typeof ESTADOS_VEHICULO)[number];

export const ETIQUETA_ESTADO_VEHICULO: Record<EstadoVehiculo, string> = {
  operativo: 'Operativo',
  en_mantenimiento: 'En mantenimiento',
  fuera_servicio: 'Fuera de servicio',
  no_apto: 'No apto',
};

export const vehiculoNuevo = z.object({
  /** El número con el que OCC lo llama en obra: VOL-01, CAM-03… */
  codigoInterno: textoObligatorio(32, 'el código interno'),
  placa: textoOpcional(16).transform((v) => v?.toUpperCase() ?? null),
  tipoVehiculoId: textoObligatorio(40, 'el tipo de equipo'),
  marca: textoOpcional(80),
  modelo: textoOpcional(80),
  obraId: idOpcional,
  odometroKm: medidorOpcional,
  horometroH: medidorOpcional,
  estado: z.enum(ESTADOS_VEHICULO, { error: 'Ese estado de vehículo no existe.' }).default('operativo'),
});

export const vehiculoEditado = vehiculoNuevo.partial();

export type VehiculoNuevo = z.input<typeof vehiculoNuevo>;

export interface VehiculoFila {
  id: string;
  codigoInterno: string;
  placa: string | null;
  tipoVehiculoId: string;
  tipoNombre: string;
  marca: string | null;
  modelo: string | null;
  obraId: string | null;
  obraNombre: string | null;
  odometroKm: number | null;
  horometroH: number | null;
  estado: EstadoVehiculo;
  /** Llantas puestas a las que les queda 30% de vida o menos. Ver spec 003. */
  llantasPorCambiar: number;
}

export interface TipoVehiculoFila {
  id: string;
  nombre: string;
  claseMedidor: 'odometro' | 'horometro' | 'ambos';
}

/* ------------------------------------------------------------------------ */
/* Asignaciones                                                              */
/* ------------------------------------------------------------------------ */

export const asignacionNueva = z.object({
  vehiculoId: textoObligatorio(64, 'el vehículo'),
  usuarioId: textoObligatorio(64, 'el operador'),
});

export type AsignacionNueva = z.input<typeof asignacionNueva>;

/**
 * Lo que se le puede hacer a una asignación existente. Son dos cosas y no una:
 * `confirmar` acepta lo que el operador se autoasignó en obra, `cerrar` termina
 * la asignación. Ninguna de las dos borra la fila.
 */
export const asignacionEditada = z.object({
  accion: z.enum(['confirmar', 'cerrar'], { error: 'La acción solo puede ser confirmar o cerrar.' }),
});

export interface AsignacionFila {
  id: string;
  vehiculoId: string;
  vehiculoCodigo: string;
  usuarioId: string;
  usuarioNombre: string;
  obraId: string | null;
  obraNombre: string | null;
  desde: string;
  hasta: string | null;
  /** `autoasignada` la escogió el operador en obra y espera confirmación. */
  origen: 'supervisor' | 'autoasignada';
  confirmadaEn: string | null;
}

/* ------------------------------------------------------------------------ */
/* Ingreso                                                                   */
/* ------------------------------------------------------------------------ */

export const credencialesIngreso = z.object({
  usuario: z.string().trim().toLowerCase().min(1, 'Escriba su usuario.'),
  clave: z.string().min(1, 'Escriba su contraseña.'),
});

export type CredencialesIngreso = z.input<typeof credencialesIngreso>;

/**
 * Mínimo de longitud, y nada más.
 *
 * Nada de exigir mayúscula, número y símbolo: esas reglas empujan a la gente a
 * `Obra2024!` y a apuntarla en un papel pegado al monitor. Una contraseña larga
 * que su dueño recuerda protege más que una corta llena de símbolos.
 */
export const LONGITUD_MINIMA_CLAVE = 10;

export const claveNueva = z
  .object({
    actual: z.string().min(1, 'Escriba su contraseña actual.'),
    nueva: z
      .string()
      .min(LONGITUD_MINIMA_CLAVE, `La contraseña nueva necesita al menos ${LONGITUD_MINIMA_CLAVE} caracteres.`)
      .max(200),
  })
  .strict();

export type ClaveNueva = z.input<typeof claveNueva>;

export interface PersonaEnSesionFila {
  id: string;
  usuario: string;
  nombreCompleto: string;
  rol: Rol;
  obraId: string | null;
  debeCambiarClave: boolean;
}

export interface ClaveTemporalFila {
  usuario: string;
  nombreCompleto: string;
  claveTemporal: string;
}

/**
 * Los dos códigos de un operador, devueltos **una sola vez**.
 *
 * El de activación se dicta por teléfono y enrola el equipo. El de respaldo se
 * imprime y se guarda en la carpeta de la obra: es la salida el día que el
 * operador olvide su PIN en un frente sin señal.
 */
export interface CodigosFila {
  usuario: string;
  nombreCompleto: string;
  codigoActivacion: string;
  codigoRespaldo: string;
  horasDeVigencia: number;
}

/* ------------------------------------------------------------------------ */
/* Bitácoras                                                                 */
/* ------------------------------------------------------------------------ */

/**
 * El día de trabajo, `YYYY-MM-DD`.
 *
 * Texto y no fecha, de punta a punta. La jornada del 3 de marzo es el 3 de marzo
 * en obra: convertirla a un instante la correría de día en la frontera de la
 * medianoche, y quien mira el panel puede estar en otra parte.
 */
export const fechaDeJornadaZod = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'La fecha va en formato AAAA-MM-DD.');

export const bitacoraNueva = z.object({
  vehiculoId: textoObligatorio(64, 'el vehículo'),
  fecha: fechaDeJornadaZod,
});

export type BitacoraNueva = z.input<typeof bitacoraNueva>;

export const actividadNuevaZod = z.object({
  clave: textoObligatorio(40, 'la actividad'),
  /** Solo cuando la clave es 'otra': el nombre que escribió quien la registró. */
  texto: z.string().trim().max(120).optional(),
  descripcion: z.string().trim().max(500).default(''),
  observaciones: z.string().trim().max(500).default(''),
});

/**
 * Lo editable mientras la bitácora sigue abierta.
 *
 * Las actividades llegan enteras y sustituyen a las que hubiera, en vez de ir
 * una por una. Es lo que hace que dos pestañas abiertas sobre la misma bitácora
 * no acaben produciendo una lista con actividades repetidas o perdidas: gana la
 * última que guarda, que es lo que quien la está llenando espera.
 */
export const bitacoraEditada = z.object({
  operadorId: idParcial,
  horometroInicial: medidorParcial,
  horometroFinal: medidorParcial,
  actividades: z.array(actividadNuevaZod).max(20).optional(),
});

export type BitacoraEditada = z.input<typeof bitacoraEditada>;

export const anulacion = z.object({
  motivo: textoObligatorio(300, 'el motivo de la anulación'),
});

export interface ActividadFila {
  id: string;
  clave: string;
  nombre: string;
  descripcion: string;
  observaciones: string;
}

export interface BitacoraFila {
  id: string;
  vehiculoId: string;
  vehiculoCodigo: string;
  tipoNombre: string;
  /** El slug estable, que es la llave del catálogo de actividades. */
  tipoVehiculoId: string;
  obraId: string | null;
  obraNombre: string | null;
  fecha: string;
  operadorId: string | null;
  operadorNombre: string | null;
  horometroInicial: number | null;
  horometroFinal: number | null;
  actividades: ActividadFila[];
  cerradaEn: string | null;
  anuladoEn: string | null;
  motivoAnulacion: string | null;
  /** Quién la está llevando. Puede ser distinto del operador. */
  usuarioNombre: string | null;
}

/** Una máquina de la obra que ese día todavía no tiene bitácora. */
export interface MaquinaPendienteFila {
  vehiculoId: string;
  codigoInterno: string;
  tipoNombre: string;
  tipoVehiculoId: string;
  obraNombre: string | null;
  horometroH: number | null;
}

export interface JornadaFila {
  fecha: string;
  bitacoras: BitacoraFila[];
  pendientes: MaquinaPendienteFila[];
}

/* ------------------------------------------------------------------------ */
/* Preoperacionales                                                          */
/* ------------------------------------------------------------------------ */

export const RESULTADOS = ['apto', 'apto_con_observaciones', 'no_apto'] as const;
export type Resultado = (typeof RESULTADOS)[number];

export const ETIQUETA_RESULTADO: Record<Resultado, string> = {
  apto: 'APTO',
  apto_con_observaciones: 'APTO con observaciones',
  no_apto: 'NO APTO',
};

export interface PreoperacionalFila {
  id: string;
  vehiculoId: string;
  vehiculoCodigo: string;
  tipoNombre: string;
  obraNombre: string | null;
  operadorNombre: string;
  iniciadoEn: string;
  enviadoEn: string | null;
  odometroKm: number | null;
  horometroH: number | null;
  resultado: Resultado | null;
  cantidadInmovilizantes: number;
  anuladoEn: string | null;
}

/** Una máquina que hoy todavía no tiene preoperacional. */
export interface MaquinaSinFormatoFila {
  vehiculoId: string;
  codigoInterno: string;
  tipoNombre: string;
}

export interface JornadaDePreoperacionales {
  fecha: string;
  preoperacionales: PreoperacionalFila[];
  pendientes: MaquinaSinFormatoFila[];
}

/** Una respuesta tal como se guardó: se auto-describe, con su etiqueta dentro. */
export interface RespuestaFila {
  itemKey: string;
  seccionKey: string;
  label: string;
  sistema?: string | null;
  tipo: string;
  inmoviliza: boolean;
  valor: string;
  observacion?: string | null;
  respondidoEn?: number | null;
}

export interface PreoperacionalDetalle extends PreoperacionalFila {
  placa: string | null;
  operadorUsuario: string;
  plantillaTipoVehiculo: string;
  plantillaVersion: number;
  periodicidades: string[];
  recibidoEn: string;
  respuestas: RespuestaFila[];
  observaciones: string | null;
  /** Cuánto iba corrido el reloj del equipo al firmar, en milisegundos. */
  desfaseRelojMs: number;
  motivoAnulacion: string | null;
  anuladoPorNombre: string | null;
  /** La plantilla con la que se firmó, para poder leerlo como se vio ese día. */
  plantilla: { secciones: { key: string; titulo: string }[] } | null;
  imagenes: ImagenDelRegistro[];
}

/**
 * Una firma o una foto de evidencia.
 *
 * Se listan también las que **todavía no han subido**. La fila existe desde que
 * el operador la capturó, aunque el archivo siga en su teléfono esperando una
 * WiFi; decirlo es más honesto que mostrar un acta que parece no tener firma.
 */
export interface ImagenDelRegistro {
  id: string;
  proposito: 'hallazgo' | 'firma_operador' | 'foto_horometro' | 'evidencia';
  /** El ítem del checklist al que pertenece la foto, si es de un hallazgo. */
  itemKey: string | null;
  mime: string;
  bytes: number | null;
  subidoEn: string | null;
  /** `false` mientras el archivo siga en el celular. */
  disponible: boolean;
}

/* ------------------------------------------------------------------------ */
/* Llantas                                                                   */
/* ------------------------------------------------------------------------ */

/**
 * El porcentaje de desgaste. De 0 a 100 y entero: medir décimas de desgaste con
 * la vista, que es como se hace en obra, es precisión inventada.
 */
const desgaste = z
  .number()
  .int('El desgaste va en números enteros.')
  .min(0, 'El desgaste no puede ser negativo.')
  .max(100, 'El desgaste no pasa de 100.')
  .nullish()
  .transform((v) => v ?? null);

/** Medida en milímetros o pulgadas, siempre entera y positiva. */
const medida = (campo: string) =>
  z
    .number()
    .int(`${campo} va en números enteros.`)
    .positive(`${campo} tiene que ser mayor que cero.`)
    .nullish()
    .transform((v) => v ?? null);

export const llantaNueva = z.object({
  /** Slug del catálogo; se valida contra el tipo del vehículo en el servidor. */
  posicion: textoObligatorio(40, 'la posición'),
  marca: textoOpcional(60),
  rin: medida('El rin'),
  ancho: medida('El ancho'),
  alto: medida('El alto'),
  porcentajeDesgaste: desgaste,
});

export const llantaEditada = llantaNueva.partial();

export type LlantaNueva = z.input<typeof llantaNueva>;

export interface LlantaFila {
  id: string;
  vehiculoId: string;
  posicion: string;
  marca: string | null;
  rin: number | null;
  ancho: number | null;
  alto: number | null;
  porcentajeDesgaste: number | null;
  retiradaEn: string | null;
  motivoRetiro: string | null;
}
