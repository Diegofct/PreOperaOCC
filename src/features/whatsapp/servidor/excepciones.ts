/**
 * «No se pudo guardar»: listar, completar y descartar los renglones que el sistema
 * no pudo guardar solo (spec 024, RF-60 a RF-64). **Solo servidor.**
 *
 * ── Completar un renglón ──
 *
 * Quien atiende la lista corrige el renglón con los mismos selectores de la propuesta y
 * lo guarda, con su permiso y su nombre como autor (RF-61). Pasa por las mismas
 * validaciones que el registro a mano (RF-71):
 *
 *  · un viaje, a Control Cantera, con el id que habría tenido si se hubiera guardado
 *    solo (mensaje y renglón original): un reintento del mensaje no lo duplica;
 *  · un renglón de la bitácora (personal, máquina, actividad, ensayo, clima), a la
 *    bitácora de su día, con ids propios de la excepción para no chocar con los que el
 *    mensaje ya llevó;
 *  · un movimiento de almacén, al almacén, igual.
 *
 * Lo que no es un renglón —la fecha, la bitácora cerrada, un mensaje abandonado, una
 * sección entera— no se completa: «guardar» es reintentar. El mensaje vuelve a
 * pendiente y el pulso lo procesa otra vez; si vuelve a fallar, reaparece aquí.
 */
import { and, asc, eq, sql } from 'drizzle-orm';

import { baseServidor } from '@/db/servidor/cliente';
import { obras, whatsappExcepciones, whatsappGrupos, whatsappMensajes } from '@/db/servidor/esquema';
import { eleccionesAjenas, opcionesDeLaObra } from '@/features/cantera/servidor/viajes';
import { reporteCorregido, type ExcepcionFila } from '@/features/panel/contratos';
import { filtroDeObraEstricto, veTodasLasObras } from '@/features/servidor/alcance';
import type { PersonaEnSesion } from '@/features/servidor/guardia';
import { errorDePeticion, noEncontrado } from '@/features/servidor/respuestas';
import { fechaDeJornada } from '@/shared/rules/jornada';
import { faltasDelReporte, type ReporteDelDia } from '@/shared/rules/whatsapp';
import type { EstadoDeExcepcion } from '@/shared/rules/whatsapp-automatico';

import { escribirReporteDeAlmacen, faltasDelAlmacen } from './almacen';
import { guardarEnBitacora, guardarViajes } from './aprobacion';
import { catalogosDeLaObra } from './catalogos';
import { obraDelMensaje } from './obra';

/** Las secciones de la bitácora que un renglón completado puede llevar. */
const SECCIONES_DE_BITACORA = ['clima', 'actividades', 'maquinaria', 'personal', 'ensayos'] as const;

const COLUMNAS = {
  id: whatsappExcepciones.id,
  mensajeId: whatsappExcepciones.mensajeId,
  obraId: sql<string>`${obraDelMensaje}`,
  obraNombre: obras.nombre,
  autorNombre: whatsappMensajes.autorNombre,
  enviadoEn: whatsappMensajes.enviadoEn,
  categoria: whatsappMensajes.categoria,
  resumen: sql<string | null>`${whatsappMensajes.propuestaIa}->>'resumen'`,
  fecha: whatsappMensajes.fechaHecho,
  seccion: whatsappExcepciones.seccion,
  renglon: whatsappExcepciones.renglon,
  motivo: whatsappExcepciones.motivo,
  datos: whatsappExcepciones.datos,
  estado: whatsappExcepciones.estado,
  autorDelMensaje: whatsappMensajes.autorNombre,
  enviadoEnDelMensaje: whatsappMensajes.enviadoEn,
};

function consulta() {
  return baseServidor()
    .select(COLUMNAS)
    .from(whatsappExcepciones)
    .innerJoin(whatsappMensajes, eq(whatsappMensajes.id, whatsappExcepciones.mensajeId))
    .innerJoin(whatsappGrupos, eq(whatsappGrupos.id, whatsappMensajes.grupoId))
    .innerJoin(obras, sql`${obras.id} = ${obraDelMensaje}`);
}

function aFila(f: Awaited<ReturnType<typeof consulta>>[number]): ExcepcionFila {
  return {
    id: f.id,
    mensajeId: f.mensajeId,
    obraId: f.obraId,
    obraNombre: f.obraNombre,
    autorNombre: f.autorNombre,
    enviadoEn: f.enviadoEn.toISOString(),
    categoria: f.categoria,
    resumen: f.resumen,
    fecha: f.fecha,
    seccion: f.seccion,
    renglon: f.renglon,
    motivo: f.motivo,
    datos: f.datos,
    estado: f.estado,
  };
}

/** La lista, de lo más antiguo a lo más nuevo (RF-60, RF-64). */
export async function listarExcepciones(
  sesion: PersonaEnSesion,
  filtro: { obraId: string | null; estado: EstadoDeExcepcion },
): Promise<ExcepcionFila[]> {
  const filas = await consulta()
    .where(
      and(
        filtroDeObraEstricto(sesion, obraDelMensaje),
        veTodasLasObras(sesion) && filtro.obraId ? sql`${obraDelMensaje} = ${filtro.obraId}` : undefined,
        eq(whatsappExcepciones.estado, filtro.estado),
      ),
    )
    .orderBy(asc(whatsappMensajes.enviadoEn), asc(whatsappExcepciones.seccion), asc(whatsappExcepciones.renglon))
    .limit(300);
  return filas.map(aFila);
}

/** Una excepción al alcance de la sesión, o `null`. */
async function leerExcepcion(sesion: PersonaEnSesion, id: string) {
  const [fila] = await consulta()
    .where(and(eq(whatsappExcepciones.id, id), filtroDeObraEstricto(sesion, obraDelMensaje)))
    .limit(1);
  return fila ?? null;
}

/** La marca la resuelve, condicionada a que siga pendiente: si otro se adelantó, 409. */
async function resolver(
  sesion: PersonaEnSesion,
  id: string,
  estado: 'guardada' | 'descartada',
  motivoDescarte: string | null = null,
): Promise<boolean> {
  const [hecha] = await baseServidor()
    .update(whatsappExcepciones)
    .set({ estado, resueltaPor: sesion.id, resueltaEn: new Date(), motivoDescarte })
    .where(and(eq(whatsappExcepciones.id, id), eq(whatsappExcepciones.estado, 'pendiente')))
    .returning({ id: whatsappExcepciones.id });
  return !!hecha;
}

const yaResuelta = () => errorDePeticion('Este renglón ya se resolvió. Vuelva a abrir la lista.', 409);

function respuestaDeFaltas(faltas: { seccion: string; renglon: number | null; mensaje: string }[]) {
  return Response.json({ error: 'Al renglón le falta información. Complételo antes de guardar.', faltas }, { status: 400 });
}

/** Un reporte con un solo renglón en una sección, pasado por el contrato de la corrección. */
function reporteDeUnRenglon(seccion: string, datos: unknown, fecha: string | null): ReporteDelDia {
  return reporteCorregido.parse({
    fecha,
    clima: [],
    actividades: [],
    maquinaria: [],
    personal: [],
    ensayos: [],
    viajes: [],
    notas: '',
    almacen: [],
    [seccion]: [datos],
  }) as ReporteDelDia;
}

/**
 * Guarda un renglón completado, o reintenta el mensaje si lo apartado es el mensaje
 * entero (RF-61, RF-62, RF-71).
 */
export async function guardarExcepcion(
  sesion: PersonaEnSesion,
  id: string,
  pedido: { datos?: unknown; fecha?: string },
): Promise<{ guardado: string } | Response> {
  const excepcion = await leerExcepcion(sesion, id);
  if (!excepcion) return noEncontrado('ese renglón');
  if (excepcion.estado !== 'pendiente') return yaResuelta();

  const fecha = pedido.fecha ?? excepcion.fecha;
  const { seccion, renglon, mensajeId, obraId } = excepcion;

  // Lo del mensaje entero: reintentarlo (RF-61). Vuelve a pendiente y lo toma el pulso.
  if (renglon === null) {
    if (!(await resolver(sesion, id, 'guardada'))) return yaResuelta();
    await baseServidor()
      .update(whatsappMensajes)
      .set({
        estado: 'pendiente',
        procesadoEn: null,
        intentos: 0,
        errorProceso: null,
        // Con la fecha que dio quien atiende, si el problema era la fecha.
        ...(pedido.fecha ? { fechaHecho: pedido.fecha } : {}),
      })
      .where(eq(whatsappMensajes.id, mensajeId));
    return { guardado: 'reintento' };
  }
  if (!fecha) return errorDePeticion('Diga el día del reporte.', 400);
  if (pedido.datos === undefined) return errorDePeticion('Complete el renglón antes de guardarlo.', 400);

  let reporte: ReporteDelDia;
  try {
    reporte = reporteDeUnRenglon(seccion, pedido.datos, fecha);
  } catch {
    return errorDePeticion('El renglón no tiene la forma esperada. Vuelva a abrir la lista.', 400);
  }
  const claveDeIds = `${mensajeId}#excepcion-${seccion}-${renglon}`;

  if (seccion === 'viajes') {
    const faltas = faltasDelReporte(reporte, { hoy: fechaDeJornada(), claseDeMedidor: () => 'horometro' }).filter(
      (f) => f.seccion === 'viajes' || f.seccion === 'fecha',
    );
    if (faltas.length > 0) return respuestaDeFaltas(faltas);
    const [v] = reporte.viajes;
    const ajenas = eleccionesAjenas(await opcionesDeLaObra(obraId), {
      materialId: v.materialId!,
      vehiculoId: v.vehiculoId!,
      conductorId: v.conductorId!,
      origenId: v.origenId!,
      destino: v.destino!,
    });
    if (ajenas.length > 0) return respuestaDeFaltas(ajenas.map((a) => ({ seccion: 'viajes', renglon: 0, mensaje: a.mensaje })));
    // El id del renglón original: el mismo que habría tenido guardado solo. Escribir
    // primero y marcar después: repetir la escritura no duplica.
    await guardarViajes(mensajeId, reporte, obraId, sesion, [renglon]);
    if (!(await resolver(sesion, id, 'guardada'))) return yaResuelta();
    return { guardado: 'cantera' };
  }

  if (seccion === 'almacen') {
    const faltas = await faltasDelAlmacen(reporte, obraId);
    if (faltas.length > 0) return respuestaDeFaltas(faltas);
    const escrito = await escribirReporteDeAlmacen({ mensajeId, obraId, aprobadoPor: sesion.id, reporte, claveDeIds });
    if (escrito.resultado !== null) {
      return errorDePeticion('El stock o un material cambiaron mientras se guardaba. Vuelva a intentarlo.', 409);
    }
    if (!(await resolver(sesion, id, 'guardada'))) return yaResuelta();
    return { guardado: 'almacen' };
  }

  if ((SECCIONES_DE_BITACORA as readonly string[]).includes(seccion)) {
    const catalogos = await catalogosDeLaObra(obraId, [fecha]);
    const faltas = faltasDelReporte(reporte, {
      hoy: fechaDeJornada(),
      claseDeMedidor: (vehiculoId) => catalogos.claseDe.get(vehiculoId) ?? 'horometro',
    }).filter((f) => f.seccion === seccion || f.seccion === 'fecha');
    if (faltas.length > 0) return respuestaDeFaltas(faltas);
    const enBitacora = await guardarEnBitacora({
      mensajeId,
      reporte,
      obraId,
      actor: sesion,
      autorNombre: excepcion.autorDelMensaje,
      enviadoEn: excepcion.enviadoEnDelMensaje,
      fotos: new Map(),
      fotosElegidas: { delDia: null, porActividad: {} },
      viajesPendientes: false,
      claveDeIds,
    });
    if (enBitacora instanceof Response) return enBitacora;
    if (!(await resolver(sesion, id, 'guardada'))) return yaResuelta();
    return { guardado: 'bitacora' };
  }

  return errorDePeticion('Este renglón no se puede completar aquí.', 400);
}

/** Descarta un renglón con motivo (RF-63): queda en la lista de descartados, no se borra. */
export async function descartarExcepcion(
  sesion: PersonaEnSesion,
  id: string,
  motivo: string,
): Promise<{ descartado: true } | Response> {
  const excepcion = await leerExcepcion(sesion, id);
  if (!excepcion) return noEncontrado('ese renglón');
  if (!(await resolver(sesion, id, 'descartada', motivo))) return yaResuelta();
  return { descartado: true };
}
