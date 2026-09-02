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
 */
export const ROLES = ['admin', 'supervisor', 'operador'] as const;
export type Rol = (typeof ROLES)[number];

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
  rol: z.enum(ROLES, { error: 'Ese cargo no existe.' }).default('operador'),
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
