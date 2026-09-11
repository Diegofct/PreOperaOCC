/**
 * Cómo habla el panel con su servidor.
 *
 * Todo `fetch` del navegador pasa por aquí, y esa es la única regla del módulo.
 * Repartir las llamadas por las pantallas obliga a repetir en cada una el manejo
 * del error, y lo que acaba pasando es que unas muestran el mensaje del servidor
 * y otras un "algo falló" genérico, según quién escribió la pantalla.
 *
 * El servidor siempre responde JSON, incluso al fallar (ver
 * `@/features/servidor/respuestas`), así que aquí se puede dar por hecho.
 *
 * **Nada de este archivo toca `src/db/local`.** El panel es del navegador y su
 * única fuente es la API; la base del teléfono no existe para él.
 */
import type { Periodo } from '@/shared/rules/jornada';

import type {
  AsignacionFila,
  AsignacionNueva,
  BitacoraEditada,
  BitacoraNueva,
  ClaveNueva,
  ClaveTemporalFila,
  CodigosFila,
  CredencialesIngreso,
  JornadaDePreoperacionales,
  DiaDeObra,
  JornadaFila,
  LlantaFila,
  LlantaNueva,
  ObraFila,
  ObraNueva,
  PeriodoResumen,
  ResumenFila,
  ParteEditado,
  ParteFila,
  PersonaEnSesionFila,
  PreoperacionalDetalle,
  PersonaFila,
  PersonaNueva,
  TipoVehiculoFila,
  VehiculoFila,
  VehiculoNuevo,
} from './contratos';

/**
 * Un fallo que el panel sabe explicar.
 *
 * `campos` viene de la validación del servidor y permite señalar el campo exacto
 * del formulario en vez de poner un mensaje suelto arriba.
 */
export class ErrorApi extends Error {
  readonly estado: number;
  readonly campos?: Record<string, string>;

  constructor(mensaje: string, estado: number, campos?: Record<string, string>) {
    super(mensaje);
    this.name = 'ErrorApi';
    this.estado = estado;
    this.campos = campos;
    // Ver `@/features/servidor/configuracion`: heredar de `Error` rompe
    // `instanceof` si el empaquetador rebaja la clase a ES5.
    Object.setPrototypeOf(this, ErrorApi.prototype);
  }
}

async function pedir<T>(ruta: string, opciones?: RequestInit): Promise<T> {
  let respuesta: Response;
  try {
    respuesta = await fetch(ruta, {
      ...opciones,
      headers: { 'Content-Type': 'application/json', ...opciones?.headers },
    });
  } catch {
    // El servidor de desarrollo caído es el caso más frecuente y el más
    // desconcertante, porque el navegador solo dice "failed to fetch".
    throw new ErrorApi('No se pudo contactar al servidor. ¿Está corriendo `npm run web`?', 0);
  }

  const cuerpo: unknown = await respuesta.json().catch(() => null);

  if (!respuesta.ok) {
    const detalle = cuerpo as { error?: string; campos?: Record<string, string> } | null;
    throw new ErrorApi(
      detalle?.error ?? `El servidor respondió ${respuesta.status}.`,
      respuesta.status,
      detalle?.campos,
    );
  }

  return cuerpo as T;
}

const enviar = <T>(ruta: string, metodo: string, datos?: unknown) =>
  pedir<T>(ruta, { method: metodo, body: datos === undefined ? undefined : JSON.stringify(datos) });

/** Atajo para las rutas del panel, que son casi todas. */
const panel = <T>(ruta: string) => pedir<T>(`/api/panel${ruta}`);
const panelEnviar = <T>(ruta: string, metodo: string, datos?: unknown) =>
  enviar<T>(`/api/panel${ruta}`, metodo, datos);

export const api = {
  /**
   * Ingreso y sesión.
   *
   * No hay ninguna función que lea la cookie ni que la guarde: es `HttpOnly`, o
   * sea invisible para este código, y el navegador la adjunta solo. Que aquí no
   * se pueda tocar la sesión es exactamente la propiedad que la protege.
   */
  sesion: {
    quienSoy: () => pedir<PersonaEnSesionFila>('/api/auth/yo'),
    ingresar: (datos: CredencialesIngreso) =>
      enviar<PersonaEnSesionFila>('/api/auth/ingresar', 'POST', datos),
    salir: () => enviar<{ ok: true }>('/api/auth/salir', 'POST'),
    cambiarClave: (datos: ClaveNueva) =>
      enviar<{ ok: true }>('/api/auth/cambiar-clave', 'POST', datos),
  },

  obras: {
    listar: () => panel<ObraFila[]>('/obras'),
    crear: (datos: ObraNueva) => panelEnviar<ObraFila>('/obras', 'POST', datos),
    editar: (id: string, cambios: Partial<ObraNueva>) =>
      panelEnviar<ObraFila>(`/obras/${id}`, 'PATCH', cambios),
    darDeBaja: (id: string) => panelEnviar<ObraFila>(`/obras/${id}`, 'DELETE'),
  },

  personas: {
    listar: () => panel<PersonaFila[]>('/personas'),
    crear: (datos: PersonaNueva) => panelEnviar<PersonaFila>('/personas', 'POST', datos),
    /**
     * Corregir una persona ya registrada.
     *
     * Manda solo lo que cambió: el endpoint no toca las columnas que no vienen,
     * y mandarlo todo convertiría cada corrección en un riesgo de pisar un dato
     * que otro acaba de escribir desde el otro computador.
     */
    editar: (id: string, cambios: Partial<PersonaNueva>) =>
      panelEnviar<PersonaFila>(`/personas/${id}`, 'PATCH', cambios),
    darDeBaja: (id: string) => panelEnviar<PersonaFila>(`/personas/${id}`, 'DELETE'),
    /** Devuelve una contraseña temporal que **solo se puede leer esta vez**. */
    generarClave: (id: string) =>
      panelEnviar<ClaveTemporalFila>(`/personas/${id}/clave`, 'POST'),
    /** Los dos códigos de un operador. También se leen una sola vez. */
    generarCodigos: (id: string) =>
      panelEnviar<CodigosFila>(`/personas/${id}/activacion`, 'POST'),
  },

  vehiculos: {
    listar: () => panel<VehiculoFila[]>('/vehiculos'),
    crear: (datos: VehiculoNuevo) => panelEnviar<VehiculoFila>('/vehiculos', 'POST', datos),
    editar: (id: string, cambios: Partial<VehiculoNuevo>) =>
      panelEnviar<VehiculoFila>(`/vehiculos/${id}`, 'PATCH', cambios),
    darDeBaja: (id: string) => panelEnviar<VehiculoFila>(`/vehiculos/${id}`, 'DELETE'),
  },

  /** Las cifras del inicio. Viajan contadas, no en filas. */
  resumen: {
    de: (periodo: PeriodoResumen) => panel<ResumenFila>(`/resumen?periodo=${periodo}`),
  },

  tiposVehiculo: {
    listar: () => panel<TipoVehiculoFila[]>('/tipos-vehiculo'),
  },

  /**
   * El parte diario de obra (spec 004).
   *
   * `guardar` manda solo las secciones que cambiaron: el parte se llena a lo
   * largo del día y cada sección se reemplaza entera, pero la que no viaja no
   * se toca.
   */
  partes: {
    delDia: (fecha: string) => panel<DiaDeObra>(`/partes?fecha=${fecha}`),
    abrir: (fecha: string, obraId?: string) =>
      panelEnviar<ParteFila>('/partes', 'POST', { fecha, obraId }),
    guardar: (id: string, cambios: ParteEditado) =>
      panelEnviar<ParteFila>(`/partes/${id}`, 'PATCH', cambios),
    fotos: (id: string) =>
      panel<{ id: string; itemKey: string | null; disponible: boolean }[]>(`/partes/${id}/foto`),
    cerrar: (id: string) => panelEnviar<{ id: string }>(`/partes/${id}/cerrar`, 'POST'),
    anular: (id: string, motivo: string) =>
      panelEnviar<{ id: string }>(`/partes/${id}/anular`, 'POST', { motivo }),
  },

  /** Las llantas de un equipo. Retirar no borra: deja el histórico. */
  llantas: {
    deVehiculo: (vehiculoId: string) => panel<LlantaFila[]>(`/vehiculos/${vehiculoId}/llantas`),
    montar: (vehiculoId: string, datos: LlantaNueva) =>
      panelEnviar<LlantaFila>(`/vehiculos/${vehiculoId}/llantas`, 'POST', datos),
    actualizar: (id: string, datos: Partial<LlantaNueva>) =>
      panelEnviar<LlantaFila>(`/llantas/${id}`, 'PATCH', datos),
    retirar: (id: string, motivo: string) =>
      panelEnviar<LlantaFila>(`/llantas/${id}`, 'DELETE', { motivo }),
  },

  /**
   * La bitácora diaria.
   *
   * Se guarda parcial y muchas veces: el residente abre las del día por la
   * mañana y las va completando. Cerrar es lo que la convierte en documento, y
   * desde entonces solo se puede anular.
   */
  bitacoras: {
    delDia: (fecha: string) => panel<JornadaFila>(`/bitacoras?fecha=${encodeURIComponent(fecha)}`),
    abrir: (datos: BitacoraNueva) => panelEnviar<{ id: string }>('/bitacoras', 'POST', datos),
    guardar: (id: string, cambios: BitacoraEditada) =>
      panelEnviar<{ id: string }>(`/bitacoras/${id}`, 'PATCH', cambios),
    cerrar: (id: string) => panelEnviar<{ id: string }>(`/bitacoras/${id}/cerrar`, 'POST'),
    anular: (id: string, motivo: string) =>
      panelEnviar<{ id: string }>(`/bitacoras/${id}/anular`, 'POST', { motivo }),
  },

  /**
   * Los preoperacionales firmados que subieron del celular.
   *
   * Solo lectura, con una excepción: anular. Un preoperacional firmado es
   * evidencia y no se edita — se anula con motivo y se levanta otro.
   */
  preoperacionales: {
    /**
     * Un **periodo** —hoy, semana o mes— o un día concreto.
     *
     * Sin día, el servidor devuelve la última semana, y una fila entra si su
     * inicio o su llegada caen dentro. Es lo que hace visible un acta que subió
     * con retraso sin tener que sospechar que existe.
     */
    delPeriodo: (periodo: Periodo, vehiculoId?: string | null) =>
      panel<JornadaDePreoperacionales>(
        `/preoperacionales?periodo=${encodeURIComponent(periodo)}` +
          (vehiculoId ? `&vehiculoId=${encodeURIComponent(vehiculoId)}` : ''),
      ),
    delDia: (fecha: string, vehiculoId?: string | null) =>
      panel<JornadaDePreoperacionales>(
        `/preoperacionales?fecha=${encodeURIComponent(fecha)}` +
          (vehiculoId ? `&vehiculoId=${encodeURIComponent(vehiculoId)}` : ''),
      ),
    detalle: (id: string) => panel<PreoperacionalDetalle>(`/preoperacionales/${id}`),
    /**
     * La dirección de una imagen, para dársela a un `<Image>`.
     *
     * Es una ruta del propio servidor y no del bucket: R2 es privado y sus
     * archivos solo salen por `/api/panel/media/:id`, detrás de la sesión. El
     * navegador adjunta la cookie solo, igual que en el resto del panel.
     */
    urlDeImagen: (mediaId: string) => `/api/panel/media/${mediaId}`,
    anular: (id: string, motivo: string) =>
      panelEnviar<{ id: string }>(`/preoperacionales/${id}/anular`, 'POST', { motivo }),
  },

  asignaciones: {
    listar: () => panel<AsignacionFila[]>('/asignaciones'),
    crear: (datos: AsignacionNueva) => panelEnviar<AsignacionFila>('/asignaciones', 'POST', datos),
    confirmar: (id: string) =>
      panelEnviar<AsignacionFila>(`/asignaciones/${id}`, 'PATCH', { accion: 'confirmar' }),
    cerrar: (id: string) =>
      panelEnviar<AsignacionFila>(`/asignaciones/${id}`, 'PATCH', { accion: 'cerrar' }),
  },
};
