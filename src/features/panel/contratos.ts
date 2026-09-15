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

import type { Periodo } from '@/shared/rules/jornada';
import { IDS_UNIDAD, type UnidadAlmacen } from '@/shared/catalogos/almacen';
import { IDS_CARGO, type Cargo } from '@/shared/catalogos/cargos';
import {
  aCentesimas,
  MENSAJES_DE_MOVIMIENTO,
  type TipoMovimiento,
} from '@/shared/rules/almacen';
import { ETIQUETA_ROL, ROLES, type Rol } from '@/shared/rules/permisos';

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

/**
 * Texto de una edición parcial: ausente es `undefined` y no toca la columna;
 * vacío o `null` la vacía.
 *
 * Existe porque `textoOpcional` convierte lo ausente en `null`, y en un `PATCH`
 * eso borra lo que había sin que nadie lo pidiera.
 */
const textoParcial = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .nullable()
    .optional()
    .transform((v) => (v === undefined ? undefined : v && v.length > 0 ? v : null));

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
 * Los cargos reales de OCC se mapean sobre estos roles: residente y director de
 * obra son `supervisor`; gerencia es `admin`. Almacenista y Encargado de Planta
 * tienen el suyo desde la spec 008.
 *
 * La lista vive con la tabla de permisos, no aquí: quien decide qué puede hacer
 * cada rol es quien debe decir cuáles hay.
 */
export { ETIQUETA_ROL, ROLES, type Rol };

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
  claseMedidor: 'odometro' | 'horometro' | 'ambos';
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
  /**
   * Cuándo lo recibió el servidor. Puede estar a días del inicio: el celular
   * sube cuando agarra señal, y eso es el diseño y no un fallo (spec 006/RF-21).
   */
  recibidoEn: string;
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

/** Por qué un listado vino vacío. `sin_obra` no es lo mismo que `sin_datos`. */
export type MotivoVacio = 'sin_obra' | 'sin_datos';

export interface JornadaDePreoperacionales {
  /** El día pedido, o hoy si se consultó un periodo. */
  fecha: string;
  /** `null` cuando se pidió un día concreto en vez de un periodo. */
  periodo: Periodo | null;
  /** Los extremos de la ventana consultada, en día de obra. */
  desde: string;
  hasta: string;
  preoperacionales: PreoperacionalFila[];
  /** Siempre de **hoy**, sea cual sea el periodo consultado (spec 006/RF-23). */
  pendientes: MaquinaSinFormatoFila[];
  motivoVacio: MotivoVacio | null;
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

/* ------------------------------------------------------------------------ */
/* El parte diario de obra (spec 004)                                        */
/* ------------------------------------------------------------------------ */

/**
 * Cada sección llega entera y se reemplaza entera.
 *
 * No se mandan altas y bajas por separado: el parte se edita como un formulario,
 * no como una lista viva, y reemplazar la sección completa evita tener que
 * resolver en el servidor qué fila se borró. El servidor **reconstruye** cada
 * fila con el nombre del vehículo, de la persona y del material que tengan ese
 * día, así que lo que mande el navegador en esos campos se ignora.
 */
const numeroOpcional = (campo: string) =>
  z
    .number()
    .min(0, `${campo} no puede ser negativo.`)
    .nullish()
    .transform((v) => v ?? null);

/** "HH:MM". Es lo que teclea quien llena el parte. */
const horaDelDia = z
  .string()
  .trim()
  .regex(/^\d{1,2}:\d{2}$/, 'La hora va como HH:MM.');

export const maquinaDelParte = z.object({
  vehiculoId: textoObligatorio(64, 'el equipo'),
  /** Horas u odómetro según el equipo: lo decide el servidor por su tipo. */
  medidorInicial: medidorParcial,
  medidorFinal: medidorParcial,
  /**
   * Lo que pasó con la máquina ese día (spec 004, RF-45). Mil caracteres dan
   * para un párrafo largo; más ya es un informe y va en las notas del día.
   */
  observaciones: textoOpcional(1000).transform((v) => v ?? ''),
});

export const personaDelParte = z.object({
  usuarioId: textoObligatorio(64, 'la persona'),
  entrada: horaDelDia,
  salida: horaDelDia,
});

export const actividadDelParte = z.object({
  /**
   * El id de la fila, cuando ya existía.
   *
   * Es lo que permite colgarle una fotografía: sin esto el servidor generaba un
   * id nuevo en cada guardado y la foto quedaba apuntando a una actividad que
   * ya no existía. Las demás secciones no lo necesitan porque no llevan
   * adjuntos.
   *
   * Desde el 2026-09-15 lo crea el navegador al añadir la actividad, para que
   * la foto se pueda subir antes de guardar (RF-47). El tope es el largo de un
   * UUID con holgura: es texto que viaja y se guarda, y sin tope sería una
   * puerta para meter lo que sea en el parte.
   */
  id: z.string().trim().min(1).max(64).nullable().optional(),
  clave: textoObligatorio(60, 'la actividad'),
  /** Solo cuando la actividad es «otra»: qué fue. */
  texto: textoOpcional(120),
  descripcion: textoOpcional(400).transform((v) => v ?? ''),
  observaciones: textoOpcional(400).transform((v) => v ?? ''),
  longitud: numeroOpcional('La longitud'),
  ancho: numeroOpcional('El ancho'),
  alto: numeroOpcional('El alto'),
  area: numeroOpcional('El área'),
  volumen: numeroOpcional('El volumen'),
});

export const franjaDeClima = z.object({
  condicion: textoObligatorio(40, 'la condición del clima'),
  desde: horaDelDia,
  hasta: horaDelDia,
});

export const materialDelParte = z.object({
  material: textoObligatorio(60, 'el material'),
  cantidad: z
    .number()
    .positive('La cantidad tiene que ser mayor que cero.')
    .max(100_000, 'Esa cantidad no parece de una obra.'),
});

export const parteEditado = z.object({
  maquinaria: z.array(maquinaDelParte).max(40).optional(),
  personal: z.array(personaDelParte).max(80).optional(),
  actividades: z.array(actividadDelParte).max(40).optional(),
  clima: z.array(franjaDeClima).max(12).optional(),
  laboratorio: z.array(materialDelParte).max(40).optional(),
  /**
   * Parcial y no `textoOpcional`: con aquel, guardar cualquier otra sección
   * llegaba con `notas: null` y borraba las notas del día (encontrado en
   * 004/T15, corregido en T16).
   */
  notas: textoParcial(4000),
  /** Día sin trabajo (spec 004, RF-53 a RF-55). Ausente no toca la marca. */
  sinTrabajo: z.boolean().optional(),
  motivoSinTrabajo: textoParcial(500),
});

export type ParteEditado = z.input<typeof parteEditado>;

export interface MaquinaDelParteFila {
  id: string;
  vehiculoId: string;
  codigo: string;
  claseMedidor: 'horometro' | 'odometro';
  medidorInicial: number | null;
  medidorFinal: number | null;
  /** Ausente en los partes anteriores al 2026-09-14. */
  observaciones?: string;
}

export interface PersonaDelParteFila {
  id: string;
  usuarioId: string;
  nombre: string;
  cargo: string | null;
  entrada: string | null;
  salida: string | null;
}

export interface ActividadDelParteFila {
  id: string;
  clave: string;
  nombre: string;
  descripcion: string;
  observaciones: string;
  longitud: number | null;
  ancho: number | null;
  alto: number | null;
  area: number | null;
  volumen: number | null;
}

export interface FranjaDeClimaFila {
  id: string;
  condicion: string;
  nombre: string;
  desde: string;
  hasta: string;
}

export interface MaterialDelParteFila {
  id: string;
  material: string;
  nombre: string;
  cantidad: number;
  unidad: string;
}

export interface ParteFila {
  id: string;
  obraId: string;
  obraNombre: string | null;
  fecha: string;
  usuarioNombre: string | null;
  maquinaria: MaquinaDelParteFila[];
  personal: PersonaDelParteFila[];
  actividades: ActividadDelParteFila[];
  clima: FranjaDeClimaFila[];
  laboratorio: MaterialDelParteFila[];
  notas: string | null;
  sinTrabajo: boolean;
  motivoSinTrabajo: string | null;
  cerradoEn: string | null;
  anuladoEn: string | null;
  motivoAnulacion: string | null;
}

/** Lo que devuelve la consulta de un día: el parte y con qué llenarlo. */
export interface DiaDeObra {
  fecha: string;
  partes: ParteFila[];
}

/* ------------------------------------------------------------------------ */
/* El resumen del inicio (spec 005)                                          */
/* ------------------------------------------------------------------------ */

export type PeriodoResumen = 'hoy' | 'semana' | 'mes';

export const ETIQUETA_PERIODO: Record<PeriodoResumen, string> = {
  hoy: 'Hoy',
  semana: 'Última semana',
  mes: 'Último mes',
};

export interface ResumenFila {
  periodo: PeriodoResumen;
  desde: string;
  hasta: string;
  obras: number;
  equipos: number;
  /** De 0 a 100, o `null` si no hay equipos: sin flota no se incumple nada. */
  cumplimiento: number | null;
  inspeccionadosHoy: number;
  sinInspeccionar: number;
  noAptos: number;
  /** Horas de motor. **No se suman con los kilómetros**: son dos unidades. */
  horasMaquina: number;
  kilometros: number;
  partes: number;
  partesCerrados: number;
  minutosPersonal: number;
  minutosExtra: number;
  personasContadas: number;
}

/* ------------------------------------------------------------------------ */
/* Almacén de obra (spec 009)                                                */
/* ------------------------------------------------------------------------ */

/**
 * Las cantidades viajan **en centésimas enteras** en las respuestas —70 bultos es
 * `7000`—, igual que las usan las reglas de `shared/rules/almacen`. Así ni el
 * servidor ni la pantalla convierten de decimal a entero más de una vez, que es
 * donde aparecen los 69,99999999 bultos. Para mostrarlas, `formatearCantidad`.
 *
 * En la **petición**, en cambio, la cantidad llega tal como se escribió («2,5»),
 * y el contrato la convierte con `aCentesimas`: así «1.000» se rechaza igual en
 * el formulario que en una petición hecha por fuera.
 */
const unidadAlmacen = z.enum(IDS_UNIDAD as [UnidadAlmacen, ...UnidadAlmacen[]], {
  error: 'Elija una unidad de la lista.',
});

const nombreDeMaterial = z
  .string({ error: 'Falta el nombre del material.' })
  .trim()
  .min(1, 'Falta el nombre del material.')
  .max(120, 'El nombre del material es demasiado largo.');

export const materialNuevo = z.object({
  nombre: nombreDeMaterial,
  unidad: unidadAlmacen,
  /**
   * La obra del almacén. **Solo la usa la gerencia**, que lleva todas; al
   * almacenista y al residente el servidor les pone la suya y esto se ignora
   * (009/RF-28): si no, un almacenista podría registrar en otra obra.
   */
  obraId: idOpcional,
});

export type MaterialNuevo = z.input<typeof materialNuevo>;

/** Corregir un material: ausente es «no se toca». Cambiar la unidad lo decide la regla (RF-5). */
export const materialEditado = z.object({
  nombre: nombreDeMaterial.optional(),
  unidad: unidadAlmacen.optional(),
});

export type MaterialEditado = z.input<typeof materialEditado>;

/** La cantidad escrita, convertida a centésimas; mayor que cero (RF-9). */
const cantidadDeMovimiento = z
  .union([z.string(), z.number()], { error: MENSAJES_DE_MOVIMIENTO.cantidadIlegible })
  .transform((valor, contexto) => {
    const centesimas = aCentesimas(valor);
    if (centesimas === null) {
      contexto.addIssue({ code: 'custom', message: MENSAJES_DE_MOVIMIENTO.cantidadIlegible });
      return z.NEVER;
    }
    if (centesimas <= 0) {
      contexto.addIssue({ code: 'custom', message: MENSAJES_DE_MOVIMIENTO.cantidadNoPositiva });
      return z.NEVER;
    }
    return centesimas;
  });

const fechaDeMovimiento = z
  .string({ error: MENSAJES_DE_MOVIMIENTO.fechaMalEscrita })
  .regex(/^\d{4}-\d{2}-\d{2}$/, MENSAJES_DE_MOVIMIENTO.fechaMalEscrita);

const materialDelMovimiento = z
  .string({ error: 'Elija el material.' })
  .trim()
  .min(1, 'Elija el material.')
  .max(64);

/**
 * Un ingreso o una salida. La forma depende del `tipo`, y eso es lo que hace que
 * una salida sin «para qué» no pase ni siquiera la validación (RF-13), mientras
 * que el ingreso lleva una observación opcional (RF-8).
 *
 * **No lleva quién lo registra** (RF-27, RF-30): lo pone el servidor desde la
 * sesión. Tampoco la obra: es la de su material.
 *
 * La fecha posterior a hoy (RF-10) no se mira aquí sino en la ruta, con
 * `validarMovimiento`: depende del reloj, y un contrato que cambia de veredicto
 * según la hora a la que se evalúa no se puede probar.
 */
export const movimientoNuevo = z.discriminatedUnion(
  'tipo',
  [
    z.object({
      tipo: z.literal('ingreso'),
      materialId: materialDelMovimiento,
      fecha: fechaDeMovimiento,
      cantidad: cantidadDeMovimiento,
      observacion: textoOpcional(300),
    }),
    z.object({
      tipo: z.literal('salida'),
      materialId: materialDelMovimiento,
      fecha: fechaDeMovimiento,
      cantidad: cantidadDeMovimiento,
      paraQue: z
        .string({ error: MENSAJES_DE_MOVIMIENTO.sinParaQue })
        .trim()
        .min(1, MENSAJES_DE_MOVIMIENTO.sinParaQue)
        .max(300, 'El «para qué» es demasiado largo.'),
    }),
  ],
  { error: 'El movimiento tiene que ser un ingreso o una salida.' },
);

export type MovimientoNuevo = z.input<typeof movimientoNuevo>;

/** Un material del almacén con sus totales. Cantidades en centésimas. */
export interface MaterialDeAlmacenFila {
  id: string;
  obraId: string;
  obraNombre: string | null;
  nombre: string;
  unidad: UnidadAlmacen;
  ingresado: number;
  salido: number;
  stock: number;
  /** Cuántos movimientos tiene, anulados incluidos: decide si la unidad se puede cambiar (RF-5). */
  movimientos: number;
}

/** Un movimiento del historial, con el stock que dejó. Cantidades en centésimas. */
export interface MovimientoDeAlmacenFila {
  id: string;
  materialId: string;
  tipo: TipoMovimiento;
  fecha: string;
  cantidad: number;
  paraQue: string | null;
  observacion: string | null;
  /** ISO 8601. Es el orden del historial. */
  registradoEn: string;
  /** El nombre de quien lo registró, aunque hoy esté de baja. */
  registradoPorNombre: string | null;
  anulado: boolean;
  anuladoEn: string | null;
  anuladoPorNombre: string | null;
  motivoAnulacion: string | null;
  /** El stock que dejó; `null` si está anulado (RF-20, RF-25). */
  saldo: number | null;
}

/** Qué movimientos pedir: los de un material, con el filtro de RF-21. */
export interface ConsultaDeMovimientos {
  materialId: string;
  desde?: string;
  hasta?: string;
  tipo?: TipoMovimiento;
}
