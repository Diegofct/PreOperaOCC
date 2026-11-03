/**
 * El guardado automático de un mensaje del grupo de una empresa (spec 038, RF-9 a RF-19).
 * **Solo servidor.**
 *
 * Es el gemelo de `procesarMensaje` para el grupo de OCC: mismo camino de entrada, misma
 * guardia, mismos «No se pudo guardar», pero el destino es la bitácora del día de la
 * empresa (`bitacoras_empresa`) y no la de una obra.
 *
 *  1. qué hace el mensaje: `destinoEnGrupoDeEmpresa` (RF-9g: las conversaciones no arman
 *     renglones);
 *  2. de qué día es: `diaDeEmpresa` (RF-9a, RF-9e, D12);
 *  3. qué equipo nombra cada renglón y qué se aparta: `leerMensajeDeEmpresa` (RF-12 a
 *     RF-12c);
 *  4. llevarlo al día: `llevarAlDia`, en una sola sentencia con la versión que se leyó.
 *     Si otro mensaje escribió el mismo día en medio, se lee otra vez y se reintenta
 *     (RF-15). Con el día cerrado, el mensaje entero va a «No se pudo guardar» (RF-19).
 *
 * ── Al llegar, sin esperar el día ──
 *
 * En una obra lo de la bitácora espera a que lleguen los reportes del día (024/RF-5),
 * porque el reporte diario trae el día entero. En OCC cada mensaje es un pedazo —una
 * lista, una foto, un informe— y la bitácora es un documento abierto que se va llenando:
 * se escribe al llegar. Si llegó todo lo esperado lo lleva `whatsapp_dias_empresa`
 * (T12), sin detener lo que llega.
 *
 * ── Fuera de la bitácora (T11) ──
 *
 *  · las lecturas de un equipo ligado, a sus medidores, con la misma función de la obra
 *    (RF-14, RF-12b), y solo si la bitácora no estaba cerrada, como en la obra;
 *  · los mantenimientos, al módulo Mantenimientos con la obra de cada equipo (RF-9h),
 *    vaya adonde vaya el resto, como en la obra (030/RF-36);
 *  · las fotos, a «Fotos del día» de la bitácora de la empresa (RF-8), por día.
 *
 * Repetir no duplica: los renglones llevan ids fijos por mensaje y renglón, el
 * mantenimiento sale de equipo, clase y día, y el mensaje se marca `guardado` con su
 * versión, así que un segundo intento no lo encuentra pendiente.
 */
import { and, eq, isNull, sql } from 'drizzle-orm';
import { uuidv7 } from 'uuidv7';

import { baseServidor } from '@/db/servidor/cliente';
import { bitacorasEmpresa, vehiculos, whatsappMensajes } from '@/db/servidor/esquema';
import { propuestaDeIa } from '@/features/panel/contratos';
import {
  agregarEstadoAlDia,
  diaDeEmpresa,
  horaDeColombia,
  lecturaVacia,
  leerMensajeDeEmpresa,
  llevarAlDia,
  mantenimientosDelMensaje,
  type ClaseDeMensajeDeEmpresa,
  type Origen,
  type PropuestaDeEmpresa,
  type SeccionesDeLaBitacoraOcc,
} from '@/shared/rules/bitacora-occ';
import type { EmpresaId } from '@/shared/rules/empresas';
import {
  destinoEnGrupoDeEmpresa,
  EMPRESAS_CON_BITACORA_PROPIA,
  type EmpresaConGrupo,
  type VehiculoConocido,
} from '@/shared/rules/whatsapp';
import { tipoDeReporteDeEmpresa } from '@/shared/rules/whatsapp-automatico';

import { apartar } from './apartados';
import { actualizarMedidores } from './aprobacion';
import { actualizarDiaDeEmpresa } from './dias-empresa';
import { sincronizarFotosDeEmpresa } from './fotos-del-dia';
import { guardarMantenimientos, type MantenimientosGuardados } from './mantenimientos';

/** Cuántas veces se vuelve a leer el día si otro mensaje escribió en medio. */
const REINTENTOS_DEL_DIA = 5;

/** El mensaje como lo lee `procesarMensaje`, con lo que hace falta aquí. */
export interface MensajeDeEmpresa {
  id: string;
  version: number;
  categoria: string | null;
  enviadoEn: Date;
  propuestaIa: Record<string, unknown>;
  autorId: string;
  autorNombre: string | null;
  empresaId: EmpresaId;
}

/** Lo que queda escrito en el mensaje para el historial (como 024/RF-58). */
export interface ResultadoEnEmpresa {
  modulo: 'bitacora_empresa';
  /** La bitácora del día donde quedó; vacío si no traía nada para ella. */
  guardados: string[];
  repetidos: number;
  apartados: number;
  creados: number;
  fecha: string;
  fechaDudosa: boolean;
  /** Las lecturas que llegaron a los medidores (RF-14). */
  medidores?: number;
  /** Lo que fue a Mantenimientos (RF-9h). */
  mantenimientos?: MantenimientosGuardados;
}

export type ResultadoDelProcesoDeEmpresa =
  | { estado: 'no_pendiente' }
  | { estado: 'sin_destino' }
  | { estado: 'guardado'; resultado: ResultadoEnEmpresa };

/** De qué clase es el mensaje, para saber de qué día es (RF-9a, RF-9e). */
function claseDelMensaje(categoria: string | null): ClaseDeMensajeDeEmpresa {
  if (categoria === 'lista_equipos') return 'lista_equipos';
  if (categoria === 'informe_mantenimiento') return 'informe_mantenimiento';
  return 'otro';
}

/** Todos los equipos vigentes: OCC lleva la maquinaria de todas las obras (RF-12). */
async function equiposConocidos(): Promise<VehiculoConocido[]> {
  const filas = await baseServidor()
    .select({
      id: vehiculos.id,
      codigoInterno: vehiculos.codigoInterno,
      placa: vehiculos.placa,
      codigoAnterior: vehiculos.codigoAnterior,
      obraId: vehiculos.obraId,
      tipoId: vehiculos.tipoVehiculoId,
      marca: vehiculos.marca,
      modelo: vehiculos.modelo,
      nombresWhatsapp: vehiculos.nombresWhatsapp,
    })
    .from(vehiculos)
    .where(isNull(vehiculos.eliminadoEn));
  return filas;
}

/**
 * Lleva lo leído a la bitácora del día de la empresa: la abre si no existe, y escribe con
 * la versión que leyó. `cerrada` si el día ya está cerrado (RF-19).
 */
async function escribirEnElDia(datos: {
  empresaId: EmpresaId;
  fecha: string;
  /** Lo que se le hace al día: llevar un mensaje, o un renglón completado (T14). */
  cambiar: (antes: SeccionesDeLaBitacoraOcc) => SeccionesDeLaBitacoraOcc;
}): Promise<{ bitacoraId: string } | { cerrada: true }> {
  const db = baseServidor();
  // Abrirla, si no hay una vigente ese día (índice único parcial, como el del parte).
  await db.execute(sql`
    insert into bitacoras_empresa (id, empresa_id, fecha)
    values (${uuidv7()}, ${datos.empresaId}, ${datos.fecha})
    on conflict (empresa_id, fecha) where anulado_en is null do nothing`);

  for (let intento = 0; intento < REINTENTOS_DEL_DIA; intento++) {
    const [dia] = await db
      .select({
        id: bitacorasEmpresa.id,
        version: bitacorasEmpresa.version,
        cerradoEn: bitacorasEmpresa.cerradoEn,
        estadoEquipos: bitacorasEmpresa.estadoEquipos,
        trabajos: bitacorasEmpresa.trabajos,
        actividades: bitacorasEmpresa.actividades,
        pendientes: bitacorasEmpresa.pendientes,
        lista: bitacorasEmpresa.lista,
        listas: bitacorasEmpresa.listas,
        fechaDudosa: bitacorasEmpresa.fechaDudosa,
      })
      .from(bitacorasEmpresa)
      .where(
        and(
          eq(bitacorasEmpresa.empresaId, datos.empresaId),
          eq(bitacorasEmpresa.fecha, datos.fecha),
          isNull(bitacorasEmpresa.anuladoEn),
        ),
      )
      .limit(1);
    if (!dia) throw new Error(`No se pudo abrir la bitácora de ${datos.empresaId} del ${datos.fecha}.`);
    if (dia.cerradoEn) return { cerrada: true };

    const antes: SeccionesDeLaBitacoraOcc = {
      estadoEquipos: dia.estadoEquipos,
      trabajos: dia.trabajos,
      actividades: dia.actividades,
      pendientes: dia.pendientes,
      lista: dia.lista,
      listas: dia.listas,
      fechaDudosa: dia.fechaDudosa,
    };
    const despues = datos.cambiar(antes);

    const [escrita] = await db
      .update(bitacorasEmpresa)
      .set({
        estadoEquipos: despues.estadoEquipos,
        trabajos: despues.trabajos,
        actividades: despues.actividades,
        pendientes: despues.pendientes,
        lista: despues.lista,
        listas: despues.listas,
        fechaDudosa: despues.fechaDudosa,
        version: sql`${bitacorasEmpresa.version} + 1`,
      })
      .where(
        and(
          eq(bitacorasEmpresa.id, dia.id),
          eq(bitacorasEmpresa.version, dia.version),
          isNull(bitacorasEmpresa.cerradoEn),
          isNull(bitacorasEmpresa.anuladoEn),
        ),
      )
      .returning({ id: bitacorasEmpresa.id });
    if (escrita) return { bitacoraId: escrita.id };
  }
  throw new Error(`La bitácora de ${datos.empresaId} del ${datos.fecha} cambió muchas veces seguidas: se reintenta después.`);
}

/** Procesa un mensaje del grupo de una empresa (spec 038, RF-9 a RF-19). */
export async function procesarMensajeDeEmpresa(mensaje: MensajeDeEmpresa): Promise<ResultadoDelProcesoDeEmpresa> {
  const db = baseServidor();
  // RF-28: el grupo de una empresa sin bitácora propia (Geolab) se guarda y se ve en
  // Reportes de WhatsApp, sin armar nada; como un mensaje sin destino.
  const conBitacora = EMPRESAS_CON_BITACORA_PROPIA.includes(mensaje.empresaId as EmpresaConGrupo);
  if (!conBitacora || destinoEnGrupoDeEmpresa(mensaje.categoria) === 'ninguno') {
    // RF-9g: queda en Reportes de WhatsApp, procesado, para que el pulso no lo retome.
    await db.update(whatsappMensajes).set({ procesadoEn: new Date() }).where(eq(whatsappMensajes.id, mensaje.id));
    return { estado: 'sin_destino' };
  }

  const leida = propuestaDeIa.safeParse(mensaje.propuestaIa);
  const propuesta = leida.success ? leida.data : null;
  const occ: PropuestaDeEmpresa = propuesta?.occ ?? {};
  const clase = claseDelMensaje(mensaje.categoria);
  const fechaQueDice =
    (clase === 'lista_equipos' ? occ.lista?.fecha : clase === 'informe_mantenimiento' ? occ.informe?.fecha : null) ??
    propuesta?.fecha_evento ??
    null;
  const dia = diaDeEmpresa({ clase, fechaQueDice, enviadoEn: mensaje.enviadoEn.getTime() });

  const origen: Origen = {
    mensajeId: mensaje.id,
    reportadoPor: mensaje.autorNombre?.trim() || mensaje.autorId,
    hora: horaDeColombia(mensaje.enviadoEn.getTime()),
  };
  const lectura = leerMensajeDeEmpresa(occ, await equiposConocidos(), origen);
  await apartar(mensaje.id, lectura.apartados);
  let apartados = lectura.apartados.length;

  // RF-9h: a Mantenimientos ya, vaya adonde vaya el resto (como 030/RF-36).
  const paraMantenimiento = mantenimientosDelMensaje(lectura);
  const enMantenimiento =
    paraMantenimiento.length > 0
      ? await guardarMantenimientos({
          mensajeId: mensaje.id,
          obraId: null,
          reporte: {
            fecha: dia.fecha,
            clima: [],
            actividades: [],
            maquinaria: [],
            personal: [],
            ensayos: [],
            viajes: [],
            notas: '',
            almacen: [],
            mantenimientos: paraMantenimiento,
          },
        })
      : null;
  if (enMantenimiento) apartados += enMantenimiento.apartados;

  const guardados: string[] = [];
  let cerrada = false;
  if (!lecturaVacia(lectura)) {
    const escrito = await escribirEnElDia({
      empresaId: mensaje.empresaId,
      fecha: dia.fecha,
      cambiar: (antes) => llevarAlDia(antes, lectura, { origen, dudosa: dia.dudosa, ahora: new Date().toISOString() }),
    });
    if ('cerrada' in escrito) {
      // RF-19: el día cerrado no se toca; lo que llega tarde va a «No se pudo guardar».
      await apartar(mensaje.id, [
        {
          seccion: 'bitacora_empresa',
          renglon: null,
          motivo: `Bitácora cerrada: el día ${dia.fecha} ya está cerrado. Para agregar esto, anule esa bitácora y vuelva a procesar el mensaje.`,
          datos: null,
        },
      ]);
      apartados++;
      cerrada = true;
    } else {
      guardados.push(escrito.bitacoraId);
    }
  }

  // RF-14, RF-12b: solo las de un equipo ligado (ya filtradas al leer), hacia adelante.
  if (!cerrada && lectura.lecturas.length > 0) {
    await actualizarMedidores(
      lectura.lecturas.map((l) => ({ vehiculoId: l.vehiculoId, claseMedidor: l.clase, medidorFinal: l.valor })),
      dia.fecha,
    );
  }

  const resultado: ResultadoEnEmpresa = {
    modulo: 'bitacora_empresa',
    guardados,
    repetidos: 0,
    apartados,
    creados: 0,
    fecha: dia.fecha,
    fechaDudosa: dia.dudosa,
    ...(!cerrada && lectura.lecturas.length > 0 ? { medidores: lectura.lecturas.length } : {}),
    ...(enMantenimiento ? { mantenimientos: enMantenimiento } : {}),
  };
  const [marcado] = await db
    .update(whatsappMensajes)
    .set({
      estado: 'guardado',
      empresaDecididaId: mensaje.empresaId,
      fechaHecho: dia.fecha,
      tipoReporte: tipoDeReporteDeEmpresa(mensaje.categoria),
      procesadoEn: new Date(),
      resultado: resultado as unknown as Record<string, unknown>,
      errorProceso: null,
      version: sql`${whatsappMensajes.version} + 1`,
    })
    .where(
      and(
        eq(whatsappMensajes.id, mensaje.id),
        eq(whatsappMensajes.estado, 'pendiente'),
        eq(whatsappMensajes.version, mensaje.version),
      ),
    )
    .returning({ id: whatsappMensajes.id });
  if (!marcado) return { estado: 'no_pendiente' };
  // RF-8: sus fotos —y las de los mensajes que lo complementan— a las Fotos del día.
  await sincronizarFotosDeEmpresa(mensaje.empresaId, dia.fecha);
  // RF-16, RF-17: si con este el día ya tiene lo que se esperaba.
  await actualizarDiaDeEmpresa(mensaje.empresaId, dia.fecha);
  return { estado: 'guardado', resultado };
}

/* ── Completar un renglón de «No se pudo guardar» (RF-11, T14) ─────────── */

/** Las secciones de un mensaje de empresa que se completan a mano. */
export const SECCIONES_DE_EMPRESA = ['estado_equipos', 'cambios', 'trabajos', 'lecturas'] as const;
export type SeccionDeEmpresa = (typeof SECCIONES_DE_EMPRESA)[number];

/** El renglón como lo completa quien atiende: la forma de la IA, más el equipo elegido. */
export type RenglonCompletado = Record<string, unknown> & { vehiculoId?: string | null; equipo?: string | null };

/** La propuesta de un solo renglón, en la sección donde se apartó. */
function propuestaDeUnRenglon(seccion: SeccionDeEmpresa, datos: RenglonCompletado): PropuestaDeEmpresa {
  switch (seccion) {
    case 'estado_equipos':
      return { lista: { equipos: [datos] } };
    case 'cambios':
      return { cambios: [datos] };
    case 'trabajos':
      return { trabajos: [datos] };
    case 'lecturas':
      return { lecturas: [datos as { valor?: number | string | null }] };
  }
}

/**
 * Guarda un renglón de un mensaje de empresa que quien atiende «No se pudo guardar»
 * completó (RF-11), con las mismas reglas que si hubiera llegado bien: se vuelve a leer con
 * `leerMensajeDeEmpresa`, y lo que siga sin cuadrar se responde como falta.
 *
 * Si eligió el equipo de la lista, se escribe con su placa, que es como lo reconoce la
 * regla. Los ids salen del mensaje, la sección y el renglón apartado: completarlo otra vez
 * no lo duplica, y no choca con lo que el mensaje ya llevó.
 */
export async function completarRenglonDeEmpresa(datos: {
  mensajeId: string;
  empresaId: EmpresaId;
  fecha: string;
  seccion: SeccionDeEmpresa;
  renglon: number;
  renglonCompletado: RenglonCompletado;
  reportadoPor: string;
  enviadoEn: Date;
  actor: { id: string };
}): Promise<{ guardado: string } | { faltas: string[] } | { cerrada: true }> {
  const equipos = await equiposConocidos();
  const elegido = datos.renglonCompletado.vehiculoId
    ? equipos.find((e) => e.id === datos.renglonCompletado.vehiculoId)
    : null;
  if (datos.renglonCompletado.vehiculoId && !elegido) return { faltas: ['Ese equipo no existe o fue dado de baja.'] };
  const renglon: RenglonCompletado = elegido
    ? { ...datos.renglonCompletado, equipo: elegido.placa ?? elegido.codigoInterno, tipo: null, marca: null }
    : datos.renglonCompletado;

  const origen: Origen = {
    mensajeId: `${datos.mensajeId}#excepcion-${datos.seccion}-${datos.renglon}`,
    reportadoPor: datos.reportadoPor,
    hora: horaDeColombia(datos.enviadoEn.getTime()),
  };
  const lectura = leerMensajeDeEmpresa(propuestaDeUnRenglon(datos.seccion, renglon), equipos, origen);
  if (lectura.apartados.length > 0) return { faltas: lectura.apartados.map((a) => a.motivo) };

  if (datos.seccion === 'lecturas') {
    if (lectura.lecturas.length === 0) return { faltas: ['Falta la lectura.'] };
    await actualizarMedidores(
      lectura.lecturas.map((l) => ({ vehiculoId: l.vehiculoId, claseMedidor: l.clase, medidorFinal: l.valor })),
      datos.fecha,
    );
    return { guardado: 'medidores' };
  }

  const nuevo = lectura.lista?.estadoEquipos[0];
  const escrito = await escribirEnElDia({
    empresaId: datos.empresaId,
    fecha: datos.fecha,
    cambiar: (antes) =>
      datos.seccion === 'estado_equipos' && nuevo
        ? agregarEstadoAlDia(antes, { ...nuevo, origen })
        : llevarAlDia(antes, { ...lectura, lista: null }, { origen, dudosa: false, ahora: new Date().toISOString() }),
  });
  if ('cerrada' in escrito) return { cerrada: true };

  // RF-9h: lo que va también a Mantenimientos, con quien lo completó como autor.
  const paraMantenimiento = mantenimientosDelMensaje(lectura);
  if (paraMantenimiento.length > 0) {
    await guardarMantenimientos({
      mensajeId: datos.mensajeId,
      obraId: null,
      actor: datos.actor,
      reporte: {
        fecha: datos.fecha,
        clima: [],
        actividades: [],
        maquinaria: [],
        personal: [],
        ensayos: [],
        viajes: [],
        notas: '',
        almacen: [],
        mantenimientos: paraMantenimiento,
      },
    });
  }
  await actualizarDiaDeEmpresa(datos.empresaId, datos.fecha);
  return { guardado: 'bitacora_empresa' };
}
