/**
 * Cómo habla el panel con su servidor.
 *
 * Todo `fetch` del navegador pasa por aquí, y esa es la única regla del módulo.
 * Repartir las llamadas por las pantallas obliga a repetir en cada una el manejo
 * del error, y lo que acaba pasando es que unas muestran el mensaje del servidor
 * y otras un "algo falló" genérico, según quién escribió la pantalla.
 *
 * El servidor siempre responde JSON, incluso al fallar (ver
 * `@/features/servidor/respuestas`), así que aquí se puede dar por hecho. La única
 * excepción es una descarga (`descargar`): si sale bien es un archivo, y si falla,
 * el mismo JSON de error de siempre.
 *
 * **Nada de este archivo toca `src/db/local`.** El panel es del navegador y su
 * única fuente es la API; la base del teléfono no existe para él.
 *
 * **Cada petición dice la obra de su pestaña** (spec 041, RF-22, RF-23), en la cabecera
 * `x-obra-en-uso`, sacada de la dirección. Así un Director de Obra con la obra A abierta en
 * una pestaña y la B en otra guarda cada cosa en la suya. No se guarda en ningún estado: la
 * dirección ya es por pestaña, y un estado compartido movería las dos a la vez.
 */
import type { CatalogoDeActividades } from '@/shared/rules/actividades-de-obra';
import type { EstadoDeSolicitud } from '@/shared/rules/compras';
import type { EstadoDePago, PagoDeLaCompra } from '@/shared/rules/pagos';
import { lugarDeLaRuta, type EmpresaId } from '@/shared/rules/empresas';
import type {
  AprobacionDePlanificacion,
  EstadoDeLectura,
  InformeRespuesta,
  LecturaIniciada,
  PlanificacionDetalle,
  PlanificacionFila,
  PropuestaDeHojasRespuesta,
  SeleccionDeHojasPedida,
} from '@/features/panel/planificacion';
import type {
  EstadoDeLecturaDePlanRespuesta,
  GuardadoDePlanSemanal,
  LecturaDePlanIniciada,
  ListaDePlanesSemanales,
  PlanSemanalDetalle,
} from '@/features/panel/plan-semanal';
import type { RangoDeFechas } from '@/shared/rules/rango';
import type { Periodo } from '@/shared/rules/jornada';

import type { z } from 'zod';

import type {
  BitacoraDeEmpresaDelDia,
  EnsayoDeLasObrasFila,
  ReportesEsperadosDeLaEmpresa,
  correccionDeBitacoraDeEmpresa,
  DiaDeBitacoraDeEmpresaFila,
  ConversacionDelAsistente,
  CupoDelAsistente,
  EventoDelAsistente,
  MensajeDelAsistente,
  UsoDelAsistente,
  PersonasDesdeLaBandeja,
  Aprobacion,
  ReporteEsperadoFila,
  ReportesEsperadosDeLaObra,
  ExcepcionFila,
  CreadoFila,
  DiaDeWhatsapp,
  DetalleDePropuesta,
  GrupoFila,
  PropuestaFila,
  AsignacionFila,
  AsignacionNueva,
  BitacoraEditada,
  BitacoraNueva,
  CanteraDelParteFila,
  FotoQuitada,
  FotosDelDiaFila,
  ClaveNueva,
  ClaveTemporalFila,
  CodigosFila,
  ConsultaDeEnsayos,
  ConsultaDeEnsayosDeObra,
  ConsultaDeReporte,
  ContratoDeObra,
  ContratoEditado,
  DocumentoNuevo,
  DocumentosDelLugar,
  EventoDeLaFicha,
  FichaDeLaPersona,
  FichaEditada,
  BandejaDeCompras,
  BandejaDeTesoreria,
  CompraPorPagar,
  CompraPedida,
  GastoDeCompras,
  PasoPedido,
  PersonalDelLugar,
  ReciboDeLaSolicitud,
  SolicitudCorregida,
  PagoPedido,
  PagosDelRango,
  PasoDePagoPedido,
  SolicitudDePagoCorregida,
  SolicitudDePagoDetallada,
  SolicitudDePagoPedida,
  SolicitudDetallada,
  SolicitudesDePagoDelLugar,
  SolicitudesDelLugar,
  SolicitudPedida,
  PolizaNueva,
  PresupuestoDetalle,
  PresupuestoEditado,
  PresupuestoFila,
  VistaPreviaDelPresupuesto,
  IntervaloEditado,
  IntervalosDeTipoFila,
  MantenimientoNuevo,
  PestanaDeReporte,
  ReporteFila,
  ConsultaDeMovimientos,
  ConsultaDeViajes,
  CredencialesIngreso,
  JornadaDePreoperacionales,
  DiaDeObra,
  EnsayoDetalle,
  EnsayoEditado,
  EnsayoNuevo,
  GranulometriaDelParteFila,
  JornadaFila,
  LlantaFila,
  LlantaNueva,
  MaterialDeAlmacenFila,
  MaterialDeCanteraEditado,
  MaterialDeCanteraFila,
  MaterialDeCanteraNuevo,
  MaterialEditado,
  MaterialNuevo,
  MovimientoDeAlmacenFila,
  MovimientoNuevo,
  ObraFila,
  ObraNueva,
  OpcionesDeCantera,
  SitioDeCanteraFila,
  SitioEditado,
  SitioNuevo,
  ViajeAnulado,
  ViajeFila,
  ViajeNuevo,
  ViajeRegistrado,
  PeriodoResumen,
  ResumenFila,
  ConsolidadoDelGrupo,
  CorteNuevo,
  CortesDe,
  DatosDeEmpresa,
  EmpresaEditada,
  EmpresaFila,
  MaquinaDeLasObrasFila,
  ParteEditado,
  ParteFila,
  PersonaEnSesionFila,
  PreoperacionalDetalle,
  PersonaFila,
  PersonaEditada,
  PersonaNueva,
  TipoVehiculoFila,
  VehiculoFila,
  VehiculoNuevo,
} from './contratos';
import type { EstadoMensajeWhatsapp, ReporteDelDia } from '@/shared/rules/whatsapp';

/**
 * Un fallo que el panel sabe explicar.
 *
 * `campos` viene de la validación del servidor y permite señalar el campo exacto
 * del formulario en vez de poner un mensaje suelto arriba.
 */
export class ErrorApi extends Error {
  readonly estado: number;
  readonly campos?: Record<string, string>;
  /**
   * El cuerpo entero de la respuesta, para los pocos casos en que un 4xx no es un
   * fallo sino una pregunta: el vale repetido (spec 023, RF-45) trae el viaje con
   * que choca, y la ventana lo usa para ofrecer «Guardar igual».
   */
  readonly cuerpo?: unknown;

  constructor(mensaje: string, estado: number, campos?: Record<string, string>, cuerpo?: unknown) {
    super(mensaje);
    this.name = 'ErrorApi';
    this.estado = estado;
    this.campos = campos;
    this.cuerpo = cuerpo;
    // Ver `@/features/servidor/configuracion`: heredar de `Error` rompe
    // `instanceof` si el empaquetador rebaja la clase a ES5.
    Object.setPrototypeOf(this, ErrorApi.prototype);
  }
}

/**
 * El texto que se le puede enseñar a una persona sobre cualquier fallo.
 *
 * `ErrorApi` ya trae el mensaje del servidor, que está redactado para leerse.
 * Un `Error` cualquiera —un fallo del propio navegador— también se muestra: es
 * más útil que un "algo falló" mientras esto corre en desarrollo.
 *
 * ── Por qué vive aquí y no en `marco.tsx`, donde nació ──
 *
 * Porque `marco.tsx` tiene componentes que necesitan la sesión, y `sesion.tsx`
 * necesitaba esta función: el resultado era un ciclo de `require` —Metro lo
 * avisaba en cada arranque— que puede dejar valores sin inicializar según el
 * orden en que se evalúen los módulos. Aquí no hay ciclo posible: este archivo
 * solo importa tipos, y es además donde vive `ErrorApi`, que es de lo que esta
 * función sabe traducir.
 */
export function mensajeDe(fallo: unknown): string {
  if (fallo instanceof Error) return fallo.message;
  return 'Algo falló. Vuelve a intentarlo.';
}

/**
 * La cabecera con la obra de la pestaña (spec 041), o ninguna fuera de una obra. El servidor
 * la acepta solo si es una de las obras de la persona (`obraEnUso`); una ajena la ignora.
 */
export function cabeceraDeObraEnUso(): Record<string, string> {
  if (typeof window === 'undefined' || !window.location) return {};
  const lugar = lugarDeLaRuta(window.location.pathname);
  return lugar?.tipo === 'obra' ? { 'x-obra-en-uso': lugar.obraId } : {};
}

async function pedir<T>(ruta: string, opciones?: RequestInit): Promise<T> {
  let respuesta: Response;
  try {
    respuesta = await fetch(ruta, {
      ...opciones,
      // Un formulario con archivo (spec 034) lleva el `Content-Type` que pone el navegador,
      // con su separador; cualquier otro cuerpo es JSON.
      headers:
        opciones?.body instanceof FormData
          ? { ...cabeceraDeObraEnUso(), ...(opciones.headers as Record<string, string> | undefined) }
          : { 'Content-Type': 'application/json', ...cabeceraDeObraEnUso(), ...opciones?.headers },
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
      cuerpo,
    );
  }

  return cuerpo as T;
}

/**
 * Un archivo que el panel pide para guardarlo (spec 009, RF-45): el contenido y el
 * nombre con que lo manda el servidor.
 *
 * Con `fetch` y no con un enlace directo a la ruta: así un permiso negado o un fallo
 * del servidor se dicen en el panel con su mensaje, como cualquier otro, en vez de
 * guardarse como un archivo roto.
 */
async function descargar(ruta: string): Promise<{ contenido: Blob; nombre: string }> {
  let respuesta: Response;
  try {
    respuesta = await fetch(ruta, { headers: cabeceraDeObraEnUso() });
  } catch {
    throw new ErrorApi('No se pudo contactar al servidor. ¿Está corriendo `npm run web`?', 0);
  }

  if (!respuesta.ok) {
    const detalle = (await respuesta.json().catch(() => null)) as { error?: string } | null;
    throw new ErrorApi(detalle?.error ?? `El servidor respondió ${respuesta.status}.`, respuesta.status);
  }

  const disposicion = respuesta.headers.get('Content-Disposition') ?? '';
  const nombre = /filename="([^"]+)"/.exec(disposicion)?.[1] ?? 'descarga.xlsx';
  return { contenido: await respuesta.blob(), nombre };
}

const enviar = <T>(ruta: string, metodo: string, datos?: unknown) =>
  pedir<T>(ruta, { method: metodo, body: datos === undefined ? undefined : JSON.stringify(datos) });

/** Atajo para las rutas del panel, que son casi todas. */
const panel = <T>(ruta: string) => pedir<T>(`/api/panel${ruta}`);
const panelEnviar = <T>(ruta: string, metodo: string, datos?: unknown) =>
  enviar<T>(`/api/panel${ruta}`, metodo, datos);

/** De quién son unos documentos (spec 034): una empresa con menú o una obra. */
/** Spec 035: también los de una persona (`personaId`), que son de Recursos Humanos. */
/** Spec 036: también los soportes de una solicitud de compra (`solicitudId`). */
export type LugarDeLosDocumentos =
  | { empresa: 'elemental' | 'occ' | 'geolab' }
  | { obraId: string }
  | { personaId: string }
  | { solicitudId: string }
  | { solicitudPagoId: string };

const delLugar = (lugar: LugarDeLosDocumentos) =>
  'empresa' in lugar
    ? `?empresa=${lugar.empresa}`
    : 'obraId' in lugar
      ? `?obraId=${encodeURIComponent(lugar.obraId)}`
      : 'personaId' in lugar
        ? `?personaId=${encodeURIComponent(lugar.personaId)}`
        : 'solicitudId' in lugar
          ? `?solicitudId=${encodeURIComponent(lugar.solicitudId)}`
          : `?solicitudPagoId=${encodeURIComponent(lugar.solicitudPagoId)}`;

/** Spec 035: el personal de una empresa con menú o de una obra. */
export type LugarDelPersonal = { empresa: 'elemental' | 'occ' | 'geolab' } | { obraId: string };

/** Spec 036: de dónde son unas solicitudes de compra. Elemental no pide (D1). */
export type LugarDeLasSolicitudes = { empresa: 'occ' | 'geolab' } | { obraId: string };

const deLasSolicitudes = (lugar: LugarDeLasSolicitudes) =>
  'empresa' in lugar ? `?empresa=${lugar.empresa}` : `?obraId=${encodeURIComponent(lugar.obraId)}`;

/** `?obraId=…` si hay obra, o nada. */
const conObra = (obraId?: string | null) =>
  obraId ? `?obraId=${encodeURIComponent(obraId)}` : '';

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

  /** Las cuatro empresas del grupo, con lo de sus tarjetas, y sus datos (spec 033). */
  empresas: {
    listar: () => panel<EmpresaFila[]>('/empresas'),
    editar: (id: EmpresaId, cambios: EmpresaEditada) =>
      panelEnviar<DatosDeEmpresa>(`/empresas/${id}`, 'PATCH', cambios),
  },

  /** La Bitácora diaria de una empresa, armada desde su grupo de WhatsApp (spec 038). */
  bitacoraDeEmpresa: {
    dias: (empresa: EmpresaId, rango: Partial<RangoDeFechas>) => {
      const parametros = new URLSearchParams();
      if (rango.desde) parametros.set('desde', rango.desde);
      if (rango.hasta) parametros.set('hasta', rango.hasta);
      return panel<{ dias: DiaDeBitacoraDeEmpresaFila[] }>(`/empresas/${empresa}/bitacora?${parametros}`).then((r) => r.dias);
    },
    dia: (empresa: EmpresaId, fecha: string, filtro: { equipo?: string | null; estado?: string | null } = {}) => {
      const parametros = new URLSearchParams();
      if (filtro.equipo) parametros.set('equipo', filtro.equipo);
      if (filtro.estado) parametros.set('estado', filtro.estado);
      return panel<BitacoraDeEmpresaDelDia>(`/empresas/${empresa}/bitacora/${fecha}?${parametros}`);
    },
    corregir: (empresa: EmpresaId, fecha: string, correccion: z.input<typeof correccionDeBitacoraDeEmpresa>) =>
      panelEnviar<BitacoraDeEmpresaDelDia>(`/empresas/${empresa}/bitacora/${fecha}`, 'PATCH', correccion),
    cerrar: (empresa: EmpresaId, fecha: string, version: number) =>
      panelEnviar<BitacoraDeEmpresaDelDia>(`/empresas/${empresa}/bitacora/${fecha}/cerrar`, 'POST', { version }),
    /** La Bitácora de Geolab: el laboratorio de las bitácoras de todas las obras (RF-27). */
    laboratorio: (filtro: { obraId?: string | null } & Partial<RangoDeFechas>) => {
      const parametros = new URLSearchParams();
      if (filtro.obraId) parametros.set('obraId', filtro.obraId);
      if (filtro.desde) parametros.set('desde', filtro.desde);
      if (filtro.hasta) parametros.set('hasta', filtro.hasta);
      return panel<{ ensayos: EnsayoDeLasObrasFila[] }>(`/empresas/geolab/laboratorio?${parametros}`).then((r) => r.ensayos);
    },
    anular: (empresa: EmpresaId, fecha: string, version: number, motivo: string) =>
      panelEnviar<{ id: string; anuladoEn: string }>(`/empresas/${empresa}/bitacora/${fecha}/anular`, 'POST', { version, motivo }),
  },

  /** Los cortes financieros de una empresa o de una obra, y el consolidado (spec 033). */
  cortes: {
    de: (dueno: { empresa: EmpresaId } | { obraId: string }) =>
      panel<CortesDe>(
        `/cortes?${'empresa' in dueno ? `empresa=${dueno.empresa}` : `obraId=${encodeURIComponent(dueno.obraId)}`}`,
      ),
    registrar: (corte: CorteNuevo) => panelEnviar<{ id: string }>('/cortes', 'POST', corte),
    anular: (id: string, motivo: string) =>
      panelEnviar<{ id: string }>(`/cortes/${encodeURIComponent(id)}/anular`, 'POST', { motivo }),
    consolidado: () => panel<ConsolidadoDelGrupo>('/cortes/consolidado'),
  },

  obras: {
    listar: () => panel<ObraFila[]>('/obras'),
    crear: (datos: ObraNueva) => panelEnviar<ObraFila>('/obras', 'POST', datos),
    editar: (id: string, cambios: Partial<ObraNueva>) =>
      panelEnviar<ObraFila>(`/obras/${id}`, 'PATCH', cambios),
    darDeBaja: (id: string) => panelEnviar<ObraFila>(`/obras/${id}`, 'DELETE'),
  },

  personas: {
    /** Spec 033, RF-28: las de una empresa o las de una obra; sin filtro, todas las que alcanza. */
    listar: (filtro?: { empresa?: EmpresaId; obraId?: string }) =>
      panel<PersonaFila[]>(
        `/personas${filtro?.empresa ? `?empresa=${filtro.empresa}` : filtro?.obraId ? `?obraId=${encodeURIComponent(filtro.obraId)}` : ''}`,
      ),
    crear: (datos: PersonaNueva) => panelEnviar<PersonaFila>('/personas', 'POST', datos),
    /**
     * Corregir una persona ya registrada.
     *
     * Manda solo lo que cambió: el endpoint no toca las columnas que no vienen,
     * y mandarlo todo convertiría cada corrección en un riesgo de pisar un dato
     * que otro acaba de escribir desde el otro computador.
     */
    editar: (id: string, cambios: PersonaEditada) =>
      panelEnviar<PersonaFila>(`/personas/${id}`, 'PATCH', cambios),
    /** Apaga el aviso «Pasaron a Residente: revisar» (spec 041, RF-51). */
    marcarRevisada: (id: string) =>
      panelEnviar<{ id: string; revisar: boolean }>(`/personas/${id}/revisado`, 'POST'),
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
    /** Con `obraId`, solo lo de esa obra: la portada de la obra (spec 033). */
    de: (periodo: PeriodoResumen, obraId?: string | null) =>
      panel<ResumenFila>(`/resumen?periodo=${periodo}${obraId ? `&obraId=${encodeURIComponent(obraId)}` : ''}`),
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
    /** La Bitácora de maquinaria de OCC: la Maquinaria de todas las obras (spec 033, RF-22). */
    maquinaria: (filtro: { obraId?: string | null } & Partial<RangoDeFechas>) => {
      const parametros = new URLSearchParams();
      if (filtro.obraId) parametros.set('obraId', filtro.obraId);
      if (filtro.desde) parametros.set('desde', filtro.desde);
      if (filtro.hasta) parametros.set('hasta', filtro.hasta);
      return panel<MaquinaDeLasObrasFila[]>(`/partes/maquinaria?${parametros.toString()}`);
    },
    abrir: (fecha: string, obraId?: string) =>
      panelEnviar<ParteFila>('/partes', 'POST', { fecha, obraId }),
    guardar: (id: string, cambios: ParteEditado) =>
      panelEnviar<ParteFila>(`/partes/${id}`, 'PATCH', cambios),
    fotos: (id: string) =>
      panel<{ id: string; itemKey: string | null; disponible: boolean }[]>(`/partes/${id}/foto`),
    /** Las «Fotos del día» que llegaron por WhatsApp, y aparte las quitadas (spec 027). */
    fotosDelDia: (id: string) => panel<FotosDelDiaFila>(`/partes/${id}/fotos-del-dia`),
    /** Quita una foto de la sección, con motivo (spec 027, RF-22, RF-24). */
    quitarFoto: (id: string, fotoId: string, motivo: string) =>
      panelEnviar<{ id: string }>(
        `/partes/${id}/fotos-del-dia/${encodeURIComponent(fotoId)}/quitar`,
        'POST',
        { motivo } satisfies FotoQuitada,
      ),
    cerrar: (id: string) => panelEnviar<{ id: string }>(`/partes/${id}/cerrar`, 'POST'),
    /** La sección «Control Cantera»: vigentes si está abierto, fijados si está cerrado. */
    cantera: (id: string) => panel<CanteraDelParteFila>(`/partes/${id}/cantera`),
    /** Los ensayos de granulometría del día, del módulo Laboratorio (spec 018). */
    granulometrias: (id: string) =>
      panel<GranulometriaDelParteFila>(`/partes/${id}/granulometrias`),
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
    delPeriodo: (periodo: Periodo, vehiculoId?: string | null, obraId?: string | null) =>
      panel<JornadaDePreoperacionales>(
        `/preoperacionales?periodo=${encodeURIComponent(periodo)}` +
          (vehiculoId ? `&vehiculoId=${encodeURIComponent(vehiculoId)}` : '') +
          (obraId ? `&obraId=${encodeURIComponent(obraId)}` : ''),
      ),
    delDia: (fecha: string, vehiculoId?: string | null, obraId?: string | null) =>
      panel<JornadaDePreoperacionales>(
        `/preoperacionales?fecha=${encodeURIComponent(fecha)}` +
          (vehiculoId ? `&vehiculoId=${encodeURIComponent(vehiculoId)}` : '') +
          (obraId ? `&obraId=${encodeURIComponent(obraId)}` : ''),
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

  /**
   * El almacén de cada obra (spec 009).
   *
   * Las cantidades de las respuestas vienen en centésimas; las de las peticiones
   * van como se escribieron. Un movimiento no tiene editar ni borrar: solo anular
   * (RF-23, RF-24).
   */
  almacen: {
    /**
     * El almacén en Excel (spec 009, RF-45 a RF-50). `obraId` solo lo tiene en cuenta
     * el servidor para la gerencia; sin él, la gerencia descarga todas las obras.
     */
    descargar: (obraId?: string | null) =>
      descargar(`/api/panel/almacen/exportar${obraId ? `?obraId=${encodeURIComponent(obraId)}` : ''}`),
    materiales: {
      /** `obraId` solo lo tiene en cuenta el servidor para la gerencia. */
      listar: (obraId?: string | null) =>
        panel<MaterialDeAlmacenFila[]>(
          `/almacen/materiales${obraId ? `?obraId=${encodeURIComponent(obraId)}` : ''}`,
        ),
      crear: (datos: MaterialNuevo) =>
        panelEnviar<MaterialDeAlmacenFila>('/almacen/materiales', 'POST', datos),
      corregir: (id: string, cambios: MaterialEditado) =>
        panelEnviar<MaterialDeAlmacenFila>(`/almacen/materiales/${id}`, 'PATCH', cambios),
      darDeBaja: (id: string) =>
        panelEnviar<{ id: string }>(`/almacen/materiales/${id}/baja`, 'POST'),
    },
    movimientos: {
      listar: ({ materialId, desde, hasta, tipo }: ConsultaDeMovimientos) => {
        const parametros = new URLSearchParams({ materialId });
        if (desde) parametros.set('desde', desde);
        if (hasta) parametros.set('hasta', hasta);
        if (tipo) parametros.set('tipo', tipo);
        return panel<MovimientoDeAlmacenFila[]>(`/almacen/movimientos?${parametros.toString()}`);
      },
      registrar: (datos: MovimientoNuevo) =>
        panelEnviar<MovimientoDeAlmacenFila>('/almacen/movimientos', 'POST', datos),
      anular: (id: string, motivo: string) =>
        panelEnviar<{ id: string }>(`/almacen/movimientos/${id}/anular`, 'POST', { motivo }),
    },
  },

  /**
   * El laboratorio: ensayos de granulometría (spec 018).
   *
   * `obraId` solo lo tiene en cuenta el servidor para la gerencia. Cada paso del
   * flujo es su propia ruta y responde el ensayo entero, ya recalculado.
   */
  /** El módulo de Reportes (spec 030). */
  /** Spec 031: los presupuestos de la obra, con versiones. */
  presupuestos: {
    listar: (obraId: string | null) => panel<PresupuestoFila[]>(`/presupuestos${conObra(obraId)}`),
    de: (id: string) => panel<PresupuestoDetalle>(`/presupuestos/${id}`),
    crearEnBlanco: (obraId: string, nombre: string) =>
      panelEnviar<PresupuestoDetalle>('/presupuestos', 'POST', { obraId, nombre }),
    /** Guarda el borrador entero con la versión que se leyó; 409 si otra persona lo cambió (RF-47). */
    guardar: (id: string, datos: PresupuestoEditado) =>
      panelEnviar<PresupuestoDetalle>(`/presupuestos/${id}`, 'PUT', datos),
    /** Solo la gerencia (RF-3). 409 con `desaparecen` si quita ítems reportados y no se confirmó (RF-54). */
    aprobar: (id: string, version: number, confirmar = false) =>
      panelEnviar<PresupuestoDetalle>(`/presupuestos/${id}/aprobar`, 'POST', { version, confirmar }),
    nuevaVersion: (id: string, nota: string) =>
      panelEnviar<PresupuestoDetalle>(`/presupuestos/${id}/nueva-version`, 'POST', { nota }),
    descartar: (id: string, motivo: string) =>
      panelEnviar<PresupuestoDetalle>(`/presupuestos/${id}/descartar`, 'POST', { motivo }),
    /** La dirección de la descarga en Excel (RF-73): se abre, no se pide por `fetch`. */
    direccionDelExcel: (id: string) => `/api/panel/presupuestos/${id}/exportar`,
    /** Las actividades que ofrece la bitácora de la obra: con capítulo si tiene presupuesto vigente (RF-58, RF-59). */
    catalogo: (obraId: string) => panel<CatalogoDeActividades>(`/presupuestos/catalogo${conObra(obraId)}`),
    /** Lee el Excel y responde lo que encontró, sin crear nada (RF-43). */
    vistaPrevia: (obraId: string, archivo: Blob) =>
      pedir<VistaPreviaDelPresupuesto>(`/api/panel/presupuestos/importar${conObra(obraId)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' },
        body: archivo,
      }),
    /** Vuelve a leer el mismo Excel y crea el borrador (RF-41). */
    importar: (obraId: string, nombre: string, archivo: Blob) =>
      pedir<PresupuestoDetalle>(
        `/api/panel/presupuestos/importar?${new URLSearchParams({ ...(obraId ? { obraId } : {}), confirmar: '1', nombre })}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' },
          body: archivo,
        },
      ),
  },

  /** Spec 035: Recursos Humanos. */
  rrhh: {
    personal: (lugar: LugarDelPersonal) =>
      panel<PersonalDelLugar>(
        `/rrhh/personal${'empresa' in lugar ? `?empresa=${lugar.empresa}` : `?obraId=${encodeURIComponent(lugar.obraId)}`}`,
      ),
    ficha: (id: string) => panel<FichaDeLaPersona>(`/rrhh/fichas/${encodeURIComponent(id)}`),
    /** Entera, con la versión que se leyó: una vieja responde con el aviso de que cambió. */
    guardarFicha: (id: string, ficha: FichaEditada) =>
      panelEnviar<{ version: number }>(`/rrhh/fichas/${encodeURIComponent(id)}`, 'PUT', ficha),
    historial: (id: string) => panel<EventoDeLaFicha[]>(`/rrhh/fichas/${encodeURIComponent(id)}/historial`),
    /** Con sus documentos de retiro cargados; sin ellos, el servidor dice cuáles faltan. */
    retirar: (id: string, retiro: { version: number; fecha: string; motivo: string }) =>
      panelEnviar<{ version: number }>(`/rrhh/fichas/${encodeURIComponent(id)}/retirar`, 'POST', retiro),
  },

  /** Spec 036: las solicitudes de compra de una obra, OCC o Geolab. */
  compras: {
    solicitudes: (lugar: LugarDeLasSolicitudes) => panel<SolicitudesDelLugar>(`/solicitudes-compra${deLasSolicitudes(lugar)}`),
    /** Pide una compra en ese lugar; responde su número (RF-8). */
    crear: (lugar: LugarDeLasSolicitudes, datos: SolicitudPedida) =>
      panelEnviar<{ id: string; numero: number; codigo: string }>(`/solicitudes-compra${deLasSolicitudes(lugar)}`, 'POST', datos),
    /** Entera, con la versión que se leyó: una vieja responde con el aviso de que cambió. */
    corregir: (id: string, datos: SolicitudCorregida) =>
      panelEnviar<{ version: number }>(`/solicitudes-compra/${encodeURIComponent(id)}`, 'PUT', datos),
    /** Con su historia, compras, recibos y los pasos que puede dar quien la mira (RF-23). */
    detalle: (id: string) => panel<SolicitudDetallada>(`/solicitudes-compra/${encodeURIComponent(id)}`),
    /** Cancelar, aprobar, rechazar o devolver, con la versión que se leyó. */
    paso: (id: string, pedido: PasoPedido) =>
      panelEnviar<{ estado: EstadoDeSolicitud; version: number }>(
        `/solicitudes-compra/${encodeURIComponent(id)}/paso`,
        'POST',
        pedido,
      ),
    /** Compras de Elemental: todas las del grupo, en su orden, con el resumen (RF-3, RF-12). */
    bandeja: () => panel<BandejaDeCompras>('/compras'),
    /** Lo comprado por lugar entre dos fechas de compra (RF-27). Solo la gerencia. */
    gasto: (desde: string, hasta: string) =>
      panel<GastoDeCompras>(`/compras/gasto?desde=${encodeURIComponent(desde)}&hasta=${encodeURIComponent(hasta)}`),
    /** La compra de una solicitud aprobada, con la versión que se leyó (RF-16). */
    registrarCompra: (id: string, compra: CompraPedida) =>
      panelEnviar<{ compraId: string; estado: EstadoDeSolicitud; version: number }>(
        `/solicitudes-compra/${encodeURIComponent(id)}/compras`,
        'POST',
        compra,
      ),
    /** Con la versión de su solicitud y el motivo (RF-30). */
    anularCompra: (compraId: string, pedido: { version: number; motivo: string }) =>
      panelEnviar<{ estado: EstadoDeSolicitud; version: number }>(
        `/compras/${encodeURIComponent(compraId)}/anular`,
        'POST',
        pedido,
      ),
    /** Lo que llegó (RF-20). */
    recibir: (id: string, recibo: ReciboDeLaSolicitud) =>
      panelEnviar<{ estado: EstadoDeSolicitud; version: number }>(
        `/solicitudes-compra/${encodeURIComponent(id)}/recibir`,
        'POST',
        recibo,
      ),
  },

  /** Spec 037: las solicitudes de pago y la Tesorería de Elemental. */
  tesoreria: {
    solicitudes: (lugar: LugarDeLasSolicitudes) => panel<SolicitudesDePagoDelLugar>(`/solicitudes-pago${deLasSolicitudes(lugar)}`),
    /** Pide un pago en ese lugar; responde su número (RF-7). */
    crear: (lugar: LugarDeLasSolicitudes, datos: SolicitudDePagoPedida) =>
      panelEnviar<{ id: string; numero: number; codigo: string }>(`/solicitudes-pago${deLasSolicitudes(lugar)}`, 'POST', datos),
    /** Entera, con la versión que se leyó: una vieja responde con el aviso de que cambió. */
    corregir: (id: string, datos: SolicitudDePagoCorregida) =>
      panelEnviar<{ version: number }>(`/solicitudes-pago/${encodeURIComponent(id)}`, 'PUT', datos),
    /** Con su historia, sus pagos y los pasos que puede dar quien la mira (RF-20). */
    detalle: (id: string) => panel<SolicitudDePagoDetallada>(`/solicitudes-pago/${encodeURIComponent(id)}`),
    /** Cancelar, aprobar, rechazar o devolver, con la versión que se leyó. */
    paso: (id: string, pedido: PasoDePagoPedido) =>
      panelEnviar<{ estado: EstadoDePago; version: number }>(`/solicitudes-pago/${encodeURIComponent(id)}/paso`, 'POST', pedido),
    /** Tesorería de Elemental: todas las del grupo, en su orden, con el resumen (RF-3, RF-10). */
    bandeja: () => panel<BandejaDeTesoreria>('/tesoreria'),
    /** Un pago de una solicitud aprobada, con la versión que se leyó (RF-13). */
    registrarPago: (id: string, pago: PagoPedido) =>
      panelEnviar<{ pagoId: string; estado: EstadoDePago; version: number }>(
        `/solicitudes-pago/${encodeURIComponent(id)}/pagos`,
        'POST',
        pago,
      ),
    /** Con la versión de su solicitud, si es de una; y el motivo (RF-16). */
    anularPago: (pagoId: string, pedido: { version?: number; motivo: string }) =>
      panelEnviar<{ estado: string; version?: number }>(`/pagos/${encodeURIComponent(pagoId)}/anular`, 'POST', pedido),
    /** Las compras de la 036 que faltan por pagar, la más antigua primero (RF-17). */
    comprasPorPagar: () => panel<CompraPorPagar[]>('/tesoreria/compras-por-pagar'),
    /** Pagar una compra, sin versión: lo ya pagado lo revisa el servidor (RF-18). */
    pagarCompra: (compraId: string, pago: PagoPedido) =>
      panelEnviar<{ pagoId: string; pago: PagoDeLaCompra }>(`/compras/${encodeURIComponent(compraId)}/pagos`, 'POST', pago),
    /** Los pagos vigentes del grupo entre dos fechas de pago (RF-23). Solo la gerencia. */
    pagos: (desde: string, hasta: string) =>
      panel<PagosDelRango>(`/tesoreria/pagos?desde=${encodeURIComponent(desde)}&hasta=${encodeURIComponent(hasta)}`),
  },

  /** Spec 034: los documentos de Elemental, OCC, Geolab y cada obra. */
  documentos: {
    listar: (lugar: LugarDeLosDocumentos) => panel<DocumentosDelLugar>(`/documentos${delLugar(lugar)}`),
    /** El archivo y sus datos en un solo formulario (RF-24): o se guardan los dos o ninguno. */
    subir: (lugar: LugarDeLosDocumentos, datos: Record<string, string>, archivo: Blob, nombreArchivo: string) => {
      const formulario = new FormData();
      for (const [campo, valor] of Object.entries(datos)) formulario.append(campo, valor);
      formulario.append('archivo', archivo, nombreArchivo);
      return pedir<{ id: string }>(`/api/panel/documentos${delLugar(lugar)}`, { method: 'POST', body: formulario });
    },
    anular: (id: string, motivo: string) =>
      panelEnviar<{ id: string }>(`/documentos/${encodeURIComponent(id)}/anular`, 'POST', { motivo }),
    /** Abre el PDF o la imagen en el navegador (RF-35), o lo guarda con su nombre (RF-36). */
    urlDelArchivo: (mediaId: string, descargar = false) =>
      `/api/panel/media/${mediaId}${descargar ? '?descargar=1' : ''}`,
  },
  /** Spec 031: el contrato de la obra con su cliente. */
  contrato: {
    de: (obraId: string | null) => panel<ContratoDeObra>(`/contrato${conObra(obraId)}`),
    guardar: (datos: ContratoEditado) => panelEnviar<{ version: number }>('/contrato', 'PUT', datos),
    aprobar: (obraId: string, version: number) =>
      panelEnviar<{ version: number }>('/contrato/aprobar', 'POST', { obraId, version }),
    aBorrador: (obraId: string, version: number, motivo: string) =>
      panelEnviar<{ version: number }>('/contrato/borrador', 'POST', { obraId, version, motivo }),
    /** Sube un PDF o una imagen y devuelve su id, que la póliza o el documento citan (RF-30). */
    subirArchivo: (obraId: string, archivo: Blob) =>
      pedir<{ mediaId: string }>(`/api/panel/contrato/archivos${conObra(obraId)}`, {
        method: 'POST',
        // La misma clave que pone `pedir` («Content-Type»), para reemplazarla y no sumarse a ella.
        headers: { 'Content-Type': archivo.type },
        body: archivo,
      }),
    crearPoliza: (datos: PolizaNueva) => panelEnviar<{ id: string }>('/contrato/polizas', 'POST', datos),
    reemplazarPoliza: (id: string, datos: PolizaNueva) =>
      panelEnviar<{ id: string }>(`/contrato/polizas/${id}/reemplazar`, 'POST', datos),
    anularPoliza: (id: string, motivo: string) =>
      panelEnviar<{ id: string }>(`/contrato/polizas/${id}/anular`, 'POST', { motivo }),
    crearDocumento: (datos: DocumentoNuevo) => panelEnviar<{ id: string }>('/contrato/documentos', 'POST', datos),
    anularDocumento: (id: string, motivo: string) =>
      panelEnviar<{ id: string }>(`/contrato/documentos/${id}/anular`, 'POST', { motivo }),
  },

reportes: {
    de: <P extends PestanaDeReporte>(pestana: P, consulta: ConsultaDeReporte) =>
      panel<ReporteFila<P>>(`/reportes/${pestana}?${parametrosDeReporte(consulta)}`),
    registrarMantenimiento: (datos: MantenimientoNuevo) =>
      panelEnviar<{ id: string; avisoLectura: string | null }>('/reportes/mantenimientos', 'POST', datos),
    anularMantenimiento: (id: string, motivo: string) =>
      panelEnviar<{ anulado: true }>(`/reportes/mantenimientos/${id}/anular`, 'POST', { motivo }),
    resolverCorrectivo: (id: string, datos: { fecha: string; nota: string }) =>
      panelEnviar<{ resuelto: true }>(`/reportes/mantenimientos/${id}/resolver`, 'POST', datos),
    intervalos: () => panel<{ tipos: IntervalosDeTipoFila[] }>('/reportes/intervalos'),
    guardarIntervalo: (datos: IntervaloEditado) =>
      panelEnviar<{ guardado: true }>('/reportes/intervalos', 'PUT', datos),
    /** La dirección de la descarga en Excel: se abre, no se pide por `fetch` (RF-9). */
    direccionDelExcel: (pestana: PestanaDeReporte, consulta: ConsultaDeReporte) =>
      `/api/panel/reportes/exportar?pestana=${pestana}&${parametrosDeReporte(consulta)}`,
  },

  laboratorio: {
    listar: ({ obraId, desde, hasta }: { obraId?: string | null; desde: string; hasta: string }) => {
      const parametros = new URLSearchParams({ desde, hasta });
      if (obraId) parametros.set('obraId', obraId);
      return panel<ConsultaDeEnsayos>(`/laboratorio/granulometrias?${parametros.toString()}`);
    },
    detalle: (id: string) => panel<EnsayoDetalle>(`/laboratorio/granulometrias/${id}`),
    crear: (datos: EnsayoNuevo) =>
      panelEnviar<EnsayoDetalle>('/laboratorio/granulometrias', 'POST', datos),
    corregir: (id: string, cambios: EnsayoEditado) =>
      panelEnviar<EnsayoDetalle>(`/laboratorio/granulometrias/${id}`, 'PATCH', cambios),
    enviar: (id: string) =>
      panelEnviar<EnsayoDetalle>(`/laboratorio/granulometrias/${id}/enviar`, 'POST'),
    aprobar: (id: string) =>
      panelEnviar<EnsayoDetalle>(`/laboratorio/granulometrias/${id}/aprobar`, 'POST'),
    devolver: (id: string, comentario: string) =>
      panelEnviar<EnsayoDetalle>(`/laboratorio/granulometrias/${id}/devolver`, 'POST', {
        comentario,
      }),
    anular: (id: string, motivo: string) =>
      panelEnviar<EnsayoDetalle>(`/laboratorio/granulometrias/${id}/anular`, 'POST', { motivo }),
    descartar: (id: string) =>
      panelEnviar<EnsayoDetalle>(`/laboratorio/granulometrias/${id}/descartar`, 'POST'),
    /** Los ensayos de «Control Calidad de Obra» de las bitácoras (spec 029). */
    ensayosDeObra: ({ obraId, desde, hasta }: { obraId?: string | null; desde: string; hasta: string }) => {
      const parametros = new URLSearchParams({ desde, hasta });
      if (obraId) parametros.set('obraId', obraId);
      return panel<ConsultaDeEnsayosDeObra>(`/laboratorio/ensayos-de-obra?${parametros.toString()}`);
    },
  },

  /**
   * El control de cantera (spec 010).
   *
   * `obraId` solo lo tiene en cuenta el servidor para la gerencia. Un viaje no se
   * edita ni se borra: se anula (RF-23, RF-24). Registrar y anular responden un
   * `aviso` cuando la bitácora de ese día ya está cerrada (RF-30).
   */
  cantera: {
    opciones: (obraId?: string | null) =>
      panel<OpcionesDeCantera>(`/cantera/opciones${conObra(obraId)}`),
    sitios: {
      listar: (obraId?: string | null) =>
        panel<SitioDeCanteraFila[]>(`/cantera/sitios${conObra(obraId)}`),
      crear: (datos: SitioNuevo) =>
        panelEnviar<SitioDeCanteraFila>('/cantera/sitios', 'POST', datos),
      corregir: (id: string, cambios: SitioEditado) =>
        panelEnviar<SitioDeCanteraFila>(`/cantera/sitios/${id}`, 'PATCH', cambios),
      darDeBaja: (id: string) => panelEnviar<{ id: string }>(`/cantera/sitios/${id}/baja`, 'POST'),
    },
    materiales: {
      listar: (obraId?: string | null) =>
        panel<MaterialDeCanteraFila[]>(`/cantera/materiales${conObra(obraId)}`),
      crear: (datos: MaterialDeCanteraNuevo) =>
        panelEnviar<MaterialDeCanteraFila>('/cantera/materiales', 'POST', datos),
      corregir: (id: string, cambios: MaterialDeCanteraEditado) =>
        panelEnviar<MaterialDeCanteraFila>(`/cantera/materiales/${id}`, 'PATCH', cambios),
      darDeBaja: (id: string) =>
        panelEnviar<{ id: string }>(`/cantera/materiales/${id}/baja`, 'POST'),
    },
    viajes: {
      listar: ({ obraId, desde, hasta }: ConsultaDeViajes) => {
        const parametros = new URLSearchParams({ desde, hasta });
        if (obraId) parametros.set('obraId', obraId);
        return panel<ViajeFila[]>(`/cantera/viajes?${parametros.toString()}`);
      },
      registrar: (datos: ViajeNuevo) =>
        panelEnviar<ViajeRegistrado>('/cantera/viajes', 'POST', datos),
      anular: (id: string, motivo: string) =>
        panelEnviar<ViajeAnulado>(`/cantera/viajes/${id}/anular`, 'POST', { motivo }),
    },
  },

  /**
   * La bandeja de reportes de WhatsApp (spec 021). Corregir, aprobar, descartar y
   * devolver mandan la versión que se leyó: si otra persona se adelantó, el
   * servidor responde 409 (RF-29).
   */
  whatsapp: {
    grupos: {
      listar: () => panel<{ grupos: GrupoFila[] }>('/whatsapp/grupos').then((r) => r.grupos),
      /** Spec 038 (RF-1): a una obra o a una empresa, nunca a las dos. */
      asociar: (id: string, dueno: { obraId: string } | { empresaId: 'occ' | 'geolab' }) =>
        panelEnviar<GrupoFila>(`/whatsapp/grupos/${encodeURIComponent(id)}`, 'PATCH', dueno),
    },
    propuestas: {
      /** Con el rango de días del reporte (spec 025, RF-45); sin él, la última semana. */
      listar: (
        estado: EstadoMensajeWhatsapp,
        obraId?: string | null,
        rango?: RangoDeFechas,
        /** Spec 033, RF-23: OCC ve solo lo de vehículos y maquinaria. */
        empresa?: EmpresaId,
        /** Spec 038, RF-25: «todos», «grupo» (el de la empresa) u «obras». */
        origen?: string,
      ) => {
        const parametros = new URLSearchParams({ estado, ...rango });
        if (obraId) parametros.set('obraId', obraId);
        if (empresa) parametros.set('empresa', empresa);
        if (empresa && origen) parametros.set('origen', origen);
        return panel<{ propuestas: PropuestaFila[] }>(
          `/whatsapp/propuestas?${parametros.toString()}`,
        ).then((r) => r.propuestas);
      },
      ver: (id: string) =>
        panel<DetalleDePropuesta>(`/whatsapp/propuestas/${encodeURIComponent(id)}`),
      corregir: (id: string, version: number, propuesta: ReporteDelDia) =>
        panelEnviar<{ version: number }>(`/whatsapp/propuestas/${encodeURIComponent(id)}`, 'PATCH', {
          version,
          propuesta,
        }),
      /** Registra a las personas no reconocidas del reporte (spec 023, RF-57 a RF-68). */
      registrarPersonas: (id: string, datos: PersonasDesdeLaBandeja) =>
        panelEnviar<{
          version: number;
          personas: { seccion: 'personal' | 'maquinaria'; renglon: number; usuarioId: string }[];
        }>(`/whatsapp/propuestas/${encodeURIComponent(id)}/personas`, 'POST', datos),
      aprobar: (id: string, datos: Aprobacion) =>
        panelEnviar<
          | { parteId: string; fecha: string; viajes: number; soloViajes: boolean }
          // Un reporte de almacén: va al Almacén y no a la bitácora (spec 023, RF-40).
          | { movimientos: number; materialesNuevos: number }
        >(
          `/whatsapp/propuestas/${encodeURIComponent(id)}/aprobar`,
          'POST',
          datos,
        ),
      descartar: (id: string, version: number, motivo: string) =>
        panelEnviar<{ version: number }>(
          `/whatsapp/propuestas/${encodeURIComponent(id)}/descartar`,
          'POST',
          { version, motivo },
        ),
      devolver: (id: string, version: number) =>
        panelEnviar<{ version: number }>(
          `/whatsapp/propuestas/${encodeURIComponent(id)}/devolver`,
          'POST',
          { version },
        ),
    },
    /** «Creado automáticamente»: revisar y unir (spec 024, RF-33 a RF-36). */
    creados: {
      /** Con lo que quedó sin revisar antes de «Desde» (spec 025, RF-47). */
      listar: (obraId?: string | null, rango?: RangoDeFechas) => {
        const parametros = new URLSearchParams({ ...rango });
        if (obraId) parametros.set('obraId', obraId);
        return panel<{ creados: CreadoFila[]; anterioresSinRevisar: number }>(
          `/whatsapp/creados?${parametros.toString()}`,
        );
      },
      revisado: (tipo: string, id: string) =>
        panelEnviar<{ revisado: true }>(
          `/whatsapp/creados/${encodeURIComponent(tipo)}/${encodeURIComponent(id)}/revisado`,
          'POST',
          {},
        ),
      unir: (tipo: string, id: string, conRegistroId: string) =>
        panelEnviar<{ viajes: number; bitacoras: number; movimientos: number; sinTocar: number }>(
          `/whatsapp/creados/${encodeURIComponent(tipo)}/${encodeURIComponent(id)}/unir`,
          'POST',
          { conRegistroId },
        ),
    },
    /** «No se pudo guardar»: completar o descartar (spec 024, RF-60 a RF-63). */
    excepciones: {
      /** Con los pendientes anteriores a «Desde» (spec 025, RF-46). */
      listar: (
        estado: 'pendiente' | 'guardada' | 'descartada',
        obraId?: string | null,
        rango?: RangoDeFechas,
        /** Spec 038, RF-26: solo lo del grupo de esta empresa. */
        empresa?: EmpresaId,
      ) => {
        const parametros = new URLSearchParams({ estado, ...rango });
        if (obraId) parametros.set('obraId', obraId);
        if (empresa) parametros.set('empresa', empresa);
        return panel<{ excepciones: ExcepcionFila[]; anterioresPendientes: number }>(
          `/whatsapp/excepciones?${parametros.toString()}`,
        );
      },
      guardar: (id: string, datos?: unknown, fecha?: string) =>
        panelEnviar<{ guardado: string }>(`/whatsapp/excepciones/${encodeURIComponent(id)}/guardar`, 'POST', {
          ...(datos === undefined ? {} : { datos }),
          ...(fecha ? { fecha } : {}),
        }),
      descartar: (id: string, motivo: string) =>
        panelEnviar<{ descartado: true }>(`/whatsapp/excepciones/${encodeURIComponent(id)}/descartar`, 'POST', {
          motivo,
        }),
    },
    /** Los reportes que la bitácora de cada día de una obra espera (spec 024, RF-37 a RF-42). */
    esperados: {
      leer: (obraId: string | null) =>
        panel<ReportesEsperadosDeLaObra>(
          `/whatsapp/esperados${obraId ? `?obraId=${encodeURIComponent(obraId)}` : ''}`,
        ),
      guardar: (obraId: string, esperados: ReporteEsperadoFila[]) =>
        panelEnviar<ReportesEsperadosDeLaObra>('/whatsapp/esperados', 'PUT', { obraId, esperados }),
      /** Spec 038, RF-16: los de la bitácora de una empresa. */
      leerDeEmpresa: (empresa: EmpresaId) => panel<ReportesEsperadosDeLaEmpresa>(`/whatsapp/esperados?empresa=${empresa}`),
      guardarDeEmpresa: (empresa: EmpresaId, esperados: ReporteEsperadoFila[]) =>
        panelEnviar<ReportesEsperadosDeLaEmpresa>('/whatsapp/esperados', 'PUT', { empresaId: empresa, esperados }),
    },
    /** El estado de la bitácora de cada día y «Guardar con lo que hay» (spec 024, RF-48, RF-55). */
    dias: {
      listar: (filtro: { obraId?: string | null; desde: string; hasta: string }) => {
        const parametros = new URLSearchParams({ desde: filtro.desde, hasta: filtro.hasta });
        if (filtro.obraId) parametros.set('obraId', filtro.obraId);
        return panel<{ dias: DiaDeWhatsapp[] }>(`/whatsapp/dias?${parametros.toString()}`).then((r) => r.dias);
      },
      armar: (obraId: string, fecha: string) =>
        panelEnviar<{ parteId: string | null; llevados: number }>(
          `/whatsapp/dias/${encodeURIComponent(obraId)}/${encodeURIComponent(fecha)}/armar`,
          'POST',
          {},
        ),
    },
  },

  /** El asistente (spec 028). Preguntar va aparte: `preguntarAlAsistente`, porque responde a medida que redacta. */
  asistente: {
    /**
     * Spec 040, RF-19, RF-24: un archivo que generó el asistente. Con `fetch`, como las otras
     * descargas: si ya venció o no se alcanza, el panel muestra el motivo en vez de guardar un
     * archivo roto.
     */
    descargarArchivo: (mediaId: string) => descargar(`/api/panel/media/${encodeURIComponent(mediaId)}`),
    conversaciones: (archivadas = false) =>
      panel<{ conversaciones: ConversacionDelAsistente[]; cupo: CupoDelAsistente }>(
        `/asistente/conversaciones${archivadas ? '?archivadas=1' : ''}`,
      ),
    conversacion: (id: string) =>
      panel<{ conversacion: ConversacionDelAsistente; mensajes: MensajeDelAsistente[] }>(
        `/asistente/conversaciones/${encodeURIComponent(id)}`,
      ),
    archivar: (id: string, archivada: boolean) =>
      panelEnviar<{ archivada: boolean }>(`/asistente/conversaciones/${encodeURIComponent(id)}`, 'PATCH', { archivada }),
    uso: (desde: string, hasta: string) =>
      panel<UsoDelAsistente>(`/asistente/uso?${new URLSearchParams({ desde, hasta }).toString()}`),
    ponerLimite: (usuarioId: string | null, limite: number | null) =>
      panelEnviar<UsoDelAsistente['limites']>('/asistente/limites', 'PUT', { usuarioId, limite }),
  },

  asignaciones: {
    /** Con `obraId`, solo las de esa obra (spec 033). */
    listar: (obraId?: string | null) =>
      panel<AsignacionFila[]>(`/asignaciones${obraId ? `?obraId=${encodeURIComponent(obraId)}` : ''}`),
    crear: (datos: AsignacionNueva) => panelEnviar<AsignacionFila>('/asignaciones', 'POST', datos),
    cerrar: (id: string) =>
      panelEnviar<AsignacionFila>(`/asignaciones/${id}`, 'PATCH', { accion: 'cerrar' }),
  },

  /** Spec 043: las versiones de la planificación de una obra y cada una en solo lectura. */
  planificaciones: {
    listar: (obraId: string) => panel<PlanificacionFila[]>(`/planificaciones${conObra(obraId)}`),
    de: (id: string) => panel<PlanificacionDetalle>(`/planificaciones/${encodeURIComponent(id)}`),
    /** El Excel tal como se subió (RF-8, RF-50). */
    excel: (id: string) => descargar(`/api/panel/planificaciones/${encodeURIComponent(id)}/excel`),
    /** RF-4: qué hojas propone la IA. No escribe nada. */
    proponerHojas: (obraId: string, archivo: Blob) =>
      pedir<PropuestaDeHojasRespuesta>(`/api/panel/planificaciones/hojas${conObra(obraId)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' },
        body: archivo,
      }),
    /** RF-6: lee las hojas confirmadas por detrás; 202 con la lectura. 422 trae `faltas`. */
    leer: (obraId: string, archivo: Blob, seleccion: SeleccionDeHojasPedida, opciones: { sustituir: boolean; grupos?: Record<string, string> }) =>
      pedir<LecturaIniciada>(
        `/api/panel/planificaciones/leer?${new URLSearchParams({
          obraId,
          hojas: JSON.stringify(seleccion),
          ...(opciones.sustituir ? { sustituir: '1' } : {}),
          ...(opciones.grupos && Object.keys(opciones.grupos).length ? { grupos: JSON.stringify(opciones.grupos) } : {}),
        })}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' },
          body: archivo,
        },
      ),
    /** RF-9, RF-107: en qué va una lectura. */
    lectura: (id: string) => panel<EstadoDeLectura>(`/planificaciones/lecturas/${encodeURIComponent(id)}`),
    /** RF-34 a RF-39, RF-121: 409 con `hallazgos`, `mesesPorMarcar` o si el borrador cambió (RF-99). */
    aprobar: (id: string, datos: AprobacionDePlanificacion) =>
      panelEnviar<PlanificacionDetalle>(`/planificaciones/${encodeURIComponent(id)}/aprobar`, 'POST', datos),
    /** RF-47, RF-48: solo la vigente, con motivo. */
    anular: (id: string, motivo: string) =>
      panelEnviar<PlanificacionDetalle>(`/planificaciones/${encodeURIComponent(id)}/anular`, 'POST', { motivo }),
  },

  /** Spec 044: los planes semanales de una obra. Al Residente le llegan sin plata (RF-30). */
  planesSemanales: {
    /** RF-2, RF-78: las semanas que se pueden planear hoy y los planes de la obra. */
    listar: (obraId: string) => panel<ListaDePlanesSemanales>(`/planes-semanales${conObra(obraId)}`),
    de: (id: string) => panel<PlanSemanalDetalle>(`/planes-semanales/${encodeURIComponent(id)}`),
    /** RF-22, RF-23, RF-86: guarda el borrador. 400 si una actividad no cuadra; 409 si cambió desde que se abrió. */
    guardar: (id: string, datos: GuardadoDePlanSemanal) =>
      panelEnviar<{ version: number }>(`/planes-semanales/${encodeURIComponent(id)}`, 'PUT', datos),
    /** Un borrador en blanco. 409 si ya hay uno de esa semana o la obra no tiene planificación. */
    crear: (obraId: string, semana: string) => panelEnviar<{ id: string }>('/planes-semanales', 'POST', { obraId, semana }),
    /** RF-34: la IA arma la propuesta por detrás; 202 con la lectura. 409 trae `borrador` si hay uno sin confirmar. */
    proponer: (obraId: string, semana: string, sustituir: boolean) =>
      pedir<LecturaDePlanIniciada>(
        `/api/panel/planes-semanales/proponer?${new URLSearchParams({ obraId, semana, ...(sustituir ? { sustituir: 'true' } : {}) })}`,
        { method: 'POST' },
      ),
    /** RF-42, RF-92: lee el Excel de la semana escogida por detrás; 202 con la lectura. */
    leer: (obraId: string, semana: string, archivo: Blob, sustituir: boolean) =>
      pedir<LecturaDePlanIniciada>(
        `/api/panel/planes-semanales/leer?${new URLSearchParams({ obraId, semana, ...(sustituir ? { sustituir: 'true' } : {}) })}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' },
          body: archivo,
        },
      ),
    /** RF-49: en qué va una propuesta o una lectura. */
    lectura: (id: string) => panel<EstadoDeLecturaDePlanRespuesta>(`/planes-semanales/lecturas/${encodeURIComponent(id)}`),
    /** RF-56 a RF-63, RF-99: 409 con `avisos` si los hay y no se confirmaron, o si el borrador cambió. */
    aprobar: (id: string, datos: { version: number; confirmarAvisos: boolean }) =>
      panelEnviar<PlanSemanalDetalle>(`/planes-semanales/${encodeURIComponent(id)}/aprobar`, 'POST', datos),
    /** RF-65 a RF-67: con motivo; deja de regir hoy. */
    anular: (id: string, motivo: string) => panelEnviar<PlanSemanalDetalle>(`/planes-semanales/${encodeURIComponent(id)}/anular`, 'POST', { motivo }),
    /** RF-80: el plan en Excel; al Residente, sin plata (RF-30, RF-102). */
    excel: (id: string) => descargar(`/api/panel/planes-semanales/${encodeURIComponent(id)}/excel`),
  },

  /** Spec 043: el cumplimiento de la planificación; al Residente le llega sin plata (RF-88). */
  cumplimiento: {
    informe: (obraId: string, tipo: 'semana' | 'mes', fecha: string) =>
      panel<InformeRespuesta>(`/cumplimiento?${new URLSearchParams({ obraId, tipo, fecha })}`),
    /** RF-92, RF-93: el mismo informe en Excel o PDF; al Residente, sin plata. */
    descargar: (obraId: string, tipo: 'semana' | 'mes', fecha: string, formato: 'excel' | 'pdf') =>
      descargar(`/api/panel/cumplimiento/exportar?${new URLSearchParams({ obraId, tipo, fecha, formato })}`),
  },
};

/**
 * Pregunta al asistente y entrega la respuesta a medida que llega (spec 028, RF-13).
 *
 * Con `fetch` y su lector, no con `EventSource`: hay que mandar un `POST` con archivos.
 * Los fallos de antes de empezar (sin cupo, adjunto que no sirve…) llegan como cualquier
 * otro: `ErrorApi` con el mensaje del servidor. Los de durante, como evento `error`.
 */
export async function preguntarAlAsistente(
  datos: {
    pregunta: string;
    conversacionId: string | null;
    archivos: readonly File[];
    /** Spec 033, RF-30: la obra desde la que se pregunta. */
    obraId?: string | null;
  },
  alEvento: (evento: EventoDelAsistente) => void,
  senal?: AbortSignal,
): Promise<void> {
  const formulario = new FormData();
  formulario.append('pregunta', datos.pregunta);
  if (datos.conversacionId) formulario.append('conversacionId', datos.conversacionId);
  if (datos.obraId) formulario.append('obraId', datos.obraId);
  for (const archivo of datos.archivos) formulario.append('archivo', archivo, archivo.name);

  let respuesta: Response;
  try {
    // Sin `Content-Type`: el navegador pone el de multipart con su separador.
    respuesta = await fetch('/api/panel/asistente/preguntar', {
      method: 'POST',
      body: formulario as unknown as BodyInit,
      signal: senal,
      headers: cabeceraDeObraEnUso(),
    });
  } catch (fallo) {
    if (senal?.aborted) return;
    throw new ErrorApi('No se pudo contactar al servidor. ¿Está corriendo `npm run web`?', 0, undefined, fallo);
  }
  if (!respuesta.ok || !respuesta.body) {
    const detalle = (await respuesta.json().catch(() => null)) as { error?: string } | null;
    throw new ErrorApi(detalle?.error ?? `El servidor respondió ${respuesta.status}.`, respuesta.status);
  }

  const lector = respuesta.body.pipeThrough(new TextDecoderStream()).getReader();
  let pendiente = '';
  for (;;) {
    const { value, done } = await lector.read();
    if (done) break;
    pendiente += value;
    // Cada evento termina en una línea en blanco: «event: …», «data: …» y una vacía.
    let corte: number;
    while ((corte = pendiente.indexOf('\n\n')) >= 0) {
      const bloque = pendiente.slice(0, corte);
      pendiente = pendiente.slice(corte + 2);
      const nombre = /^event: (.+)$/m.exec(bloque)?.[1];
      const datosDelEvento = /^data: (.+)$/m.exec(bloque)?.[1];
      if (nombre && datosDelEvento) alEvento({ evento: nombre, ...JSON.parse(datosDelEvento) } as EventoDelAsistente);
    }
  }
}

function parametrosDeReporte({ obraId, tipo, fecha }: ConsultaDeReporte): string {
  const parametros = new URLSearchParams({ tipo, fecha });
  if (obraId) parametros.set('obraId', obraId);
  return parametros.toString();
}

