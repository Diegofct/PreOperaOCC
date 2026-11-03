/**
 * La Bitácora diaria de una empresa en el panel: listar los días, ver uno, corregirlo,
 * cerrarlo y anularlo (spec 038, RF-18 a RF-24, RF-29). **Solo servidor.**
 *
 * ── Lo mismo que la bitácora de una obra ──
 *
 *  · Cerrada no se cambia (RF-19): corregir una cerrada es 422, y lo que llega tarde por
 *    WhatsApp va a «No se pudo guardar» (`whatsapp/servidor/empresa.ts`).
 *  · Se anula con motivo, sin borrarla (RF-20, RF-30). Anulada deja el día libre: el
 *    siguiente mensaje de ese día abre otra.
 *  · Cada escritura lleva la versión que se leyó (casos límite): si otra persona —o un
 *    mensaje del grupo— escribió en medio, 409, y quien corrige vuelve a leer.
 *
 * El acceso es el de la Bitácora de la empresa (`empresaAlAlcance`): gerencia y el
 * Encargado de OCC ven, corrigen, cierran y anulan la de OCC; nadie más la ve (RF-18, RF-29).
 */
import { and, asc, between, desc, eq, inArray, isNotNull, isNull, sql } from 'drizzle-orm';

import { baseServidor } from '@/db/servidor/cliente';
import { bitacoraFotos, bitacorasEmpresa, vehiculos, whatsappDiasEmpresa } from '@/db/servidor/esquema';
import type {
  anulacionDeBitacoraDeEmpresa,
  BitacoraDeEmpresaDelDia,
  cierreDeBitacoraDeEmpresa,
  correccionDeBitacoraDeEmpresa,
  DiaDeBitacoraDeEmpresaFila,
} from '@/features/panel/contratos';
import type { PersonaEnSesion } from '@/features/servidor/guardia';
import { columnasParaNombrar, nombrarVehiculo } from '@/features/servidor/placas';
import { errorDePeticion, noEncontrado } from '@/features/servidor/respuestas';
import { empresaAlAlcance } from '@/features/whatsapp/servidor/dias-empresa';
import {
  conteoDelDia,
  ESTADOS_DE_EQUIPO,
  estadoDelDiaDeEmpresa,
  faltaDeLaCorreccion,
  filtrarDia,
  type EstadoDeEquipo,
} from '@/shared/rules/bitacora-occ';
import { esFechaReal, fechaDeJornada } from '@/shared/rules/jornada';

import type { z } from 'zod';

/** Cuántos días hacia atrás muestra la lista si no se pide un rango. */
const DIAS_POR_DEFECTO = 30;

const MENSAJE_DE_VERSION =
  'Alguien cambió esta bitácora mientras usted la tenía abierta (otra persona o un mensaje del grupo). Recárguela y vuelva a intentarlo.';

const COLUMNAS_DEL_DIA = {
  id: bitacorasEmpresa.id,
  empresaId: bitacorasEmpresa.empresaId,
  fecha: bitacorasEmpresa.fecha,
  version: bitacorasEmpresa.version,
  cerradoEn: bitacorasEmpresa.cerradoEn,
  anuladoEn: bitacorasEmpresa.anuladoEn,
  motivoAnulacion: bitacorasEmpresa.motivoAnulacion,
  fechaDudosa: bitacorasEmpresa.fechaDudosa,
  estadoEquipos: bitacorasEmpresa.estadoEquipos,
  trabajos: bitacorasEmpresa.trabajos,
  actividades: bitacorasEmpresa.actividades,
  pendientes: bitacorasEmpresa.pendientes,
  listas: bitacorasEmpresa.listas,
  armado: whatsappDiasEmpresa.estado,
};

/** El armado del día, junto a su bitácora (la vigente o la anulada de esa fecha). */
function conArmado() {
  return and(
    eq(whatsappDiasEmpresa.empresaId, bitacorasEmpresa.empresaId),
    eq(whatsappDiasEmpresa.fecha, bitacorasEmpresa.fecha),
  );
}

/** Los días de la bitácora de la empresa en un rango, vigentes y anulados (RF-23). */
export async function listarDias(
  sesion: PersonaEnSesion,
  pedida: string,
  filtro: { desde: string | null; hasta: string | null },
): Promise<DiaDeBitacoraDeEmpresaFila[] | Response> {
  const empresaId = empresaAlAlcance(sesion, pedida, 'listar');
  if (empresaId instanceof Response) return empresaId;
  const hasta = filtro.hasta && esFechaReal(filtro.hasta) ? filtro.hasta : fechaDeJornada();
  const desde =
    filtro.desde && esFechaReal(filtro.desde)
      ? filtro.desde
      : new Date(Date.parse(`${hasta}T00:00:00Z`) - (DIAS_POR_DEFECTO - 1) * 86_400_000).toISOString().slice(0, 10);

  const filas = await baseServidor()
    .select(COLUMNAS_DEL_DIA)
    .from(bitacorasEmpresa)
    .leftJoin(whatsappDiasEmpresa, conArmado())
    .where(and(eq(bitacorasEmpresa.empresaId, empresaId), between(bitacorasEmpresa.fecha, desde, hasta)))
    .orderBy(desc(bitacorasEmpresa.fecha), asc(bitacorasEmpresa.anuladoEn));

  return filas.map((f) => ({
    id: f.id,
    fecha: f.fecha,
    estado: estadoDelDiaDeEmpresa({ anulada: !!f.anuladoEn, cerrada: !!f.cerradoEn, armado: f.armado }),
    ...conteoDelDia(f),
    trabajos: f.trabajos.length,
    actividades: f.actividades.length,
    pendientes: f.pendientes.length,
    fechaDudosa: f.fechaDudosa,
    motivoAnulacion: f.motivoAnulacion,
  }));
}

/** La bitácora vigente de la empresa ese día, o `null`. */
async function vigente(empresaId: string, fecha: string) {
  const [fila] = await baseServidor()
    .select(COLUMNAS_DEL_DIA)
    .from(bitacorasEmpresa)
    .leftJoin(whatsappDiasEmpresa, conArmado())
    .where(
      and(
        sql`${bitacorasEmpresa.empresaId} = ${empresaId}`,
        eq(bitacorasEmpresa.fecha, fecha),
        isNull(bitacorasEmpresa.anuladoEn),
      ),
    )
    .limit(1);
  return fila ?? null;
}

/** El día abierto, con sus secciones filtradas por equipo y por estado (RF-23, RF-24). */
export async function verDia(
  sesion: PersonaEnSesion,
  pedida: string,
  fecha: string,
  filtro: { equipo: string | null; estado: string | null },
): Promise<BitacoraDeEmpresaDelDia | Response> {
  const empresaId = empresaAlAlcance(sesion, pedida, 'listar');
  if (empresaId instanceof Response) return empresaId;
  if (!esFechaReal(fecha)) return noEncontrado('ese día');
  const dia = await vigente(empresaId, fecha);
  if (!dia) return noEncontrado('la bitácora de ese día');

  const db = baseServidor();
  const estado = (ESTADOS_DE_EQUIPO as readonly string[]).includes(filtro.estado ?? '')
    ? (filtro.estado as EstadoDeEquipo)
    : null;
  const filtrado = filtrarDia(dia, { equipo: filtro.equipo, estado });
  const ligados = [
    ...new Set(
      [...dia.estadoEquipos, ...dia.trabajos, ...dia.actividades.map((a) => a.equipo), ...dia.pendientes.map((p) => p.equipo)]
        .map((e) => e?.vehiculoId)
        .filter((id): id is string => !!id),
    ),
  ];
  const [fotos, nombrables, anuladas] = await Promise.all([
    db
      .select({
        id: bitacoraFotos.id,
        mediaId: bitacoraFotos.mediaId,
        mensajeId: bitacoraFotos.mensajeId,
        quitadaEn: bitacoraFotos.quitadaEn,
      })
      .from(bitacoraFotos)
      .where(eq(bitacoraFotos.bitacoraEmpresaId, dia.id))
      .orderBy(asc(bitacoraFotos.agregadaEn)),
    ligados.length > 0
      ? db.select({ id: vehiculos.id, ...columnasParaNombrar }).from(vehiculos).where(inArray(vehiculos.id, ligados))
      : Promise.resolve([]),
    db
      .select({ id: bitacorasEmpresa.id, anuladoEn: bitacorasEmpresa.anuladoEn, motivo: bitacorasEmpresa.motivoAnulacion })
      .from(bitacorasEmpresa)
      .where(
        and(
          sql`${bitacorasEmpresa.empresaId} = ${empresaId}`,
          eq(bitacorasEmpresa.fecha, fecha),
          isNotNull(bitacorasEmpresa.anuladoEn),
        ),
      )
      .orderBy(desc(bitacorasEmpresa.anuladoEn)),
  ]);

  return {
    id: dia.id,
    empresaId,
    fecha: dia.fecha,
    version: dia.version,
    estado: estadoDelDiaDeEmpresa({ anulada: false, cerrada: !!dia.cerradoEn, armado: dia.armado }),
    cerradoEn: dia.cerradoEn?.toISOString() ?? null,
    fechaDudosa: dia.fechaDudosa,
    estadoEquipos: filtrado.estadoEquipos,
    trabajos: filtrado.trabajos,
    actividades: filtrado.actividades,
    pendientes: filtrado.pendientes,
    listas: dia.listas,
    fotos: fotos.map((f) => ({ id: f.id, mediaId: f.mediaId, mensajeId: f.mensajeId, quitada: !!f.quitadaEn })),
    equipos: Object.fromEntries(nombrables.map(({ id, ...nombrable }) => [id, nombrarVehiculo(nombrable)])),
    // El conteo es del día entero, no del filtro: es el resumen de arriba (RF-24).
    ...conteoDelDia(dia),
    anuladas: anuladas.map((a) => ({ id: a.id, anuladoEn: a.anuladoEn!.toISOString(), motivo: a.motivo ?? '' })),
  };
}

/** La bitácora vigente de ese día para escribirla, o la respuesta que corresponde. */
async function paraEscribir(sesion: PersonaEnSesion, pedida: string, fecha: string, accion: 'escribir' | 'anular') {
  const empresaId = empresaAlAlcance(sesion, pedida, accion);
  if (empresaId instanceof Response) return empresaId;
  if (!esFechaReal(fecha)) return noEncontrado('ese día');
  const dia = await vigente(empresaId, fecha);
  return dia ?? noEncontrado('la bitácora de ese día');
}

/** Corregir las secciones de un día abierto (RF-18). */
export async function corregirDia(
  sesion: PersonaEnSesion,
  pedida: string,
  fecha: string,
  pedido: z.output<typeof correccionDeBitacoraDeEmpresa>,
): Promise<BitacoraDeEmpresaDelDia | Response> {
  const dia = await paraEscribir(sesion, pedida, fecha, 'escribir');
  if (dia instanceof Response) return dia;
  if (dia.cerradoEn) return errorDePeticion(`La bitácora del ${fecha} está cerrada: para cambiarla, anúlela.`, 422);
  const { version, ...secciones } = pedido;
  const falta = faltaDeLaCorreccion(secciones);
  if (falta) return errorDePeticion(falta, 422);

  const [escrita] = await baseServidor()
    .update(bitacorasEmpresa)
    .set({ ...secciones, version: sql`${bitacorasEmpresa.version} + 1` })
    .where(
      and(
        eq(bitacorasEmpresa.id, dia.id),
        eq(bitacorasEmpresa.version, version),
        isNull(bitacorasEmpresa.cerradoEn),
        isNull(bitacorasEmpresa.anuladoEn),
      ),
    )
    .returning({ id: bitacorasEmpresa.id });
  if (!escrita) return errorDePeticion(MENSAJE_DE_VERSION, 409);
  return verDia(sesion, pedida, fecha, { equipo: null, estado: null });
}

/** Cerrar el día (RF-18, RF-19): después ya no se cambia. */
export async function cerrarDia(
  sesion: PersonaEnSesion,
  pedida: string,
  fecha: string,
  pedido: z.output<typeof cierreDeBitacoraDeEmpresa>,
): Promise<BitacoraDeEmpresaDelDia | Response> {
  const dia = await paraEscribir(sesion, pedida, fecha, 'escribir');
  if (dia instanceof Response) return dia;
  if (dia.cerradoEn) return errorDePeticion(`La bitácora del ${fecha} ya está cerrada.`, 409);

  const [cerrada] = await baseServidor()
    .update(bitacorasEmpresa)
    .set({ cerradoEn: new Date(), cerradoPor: sesion.id, version: sql`${bitacorasEmpresa.version} + 1` })
    .where(
      and(
        eq(bitacorasEmpresa.id, dia.id),
        eq(bitacorasEmpresa.version, pedido.version),
        isNull(bitacorasEmpresa.cerradoEn),
        isNull(bitacorasEmpresa.anuladoEn),
      ),
    )
    .returning({ id: bitacorasEmpresa.id });
  if (!cerrada) return errorDePeticion(MENSAJE_DE_VERSION, 409);
  return verDia(sesion, pedida, fecha, { equipo: null, estado: null });
}

/**
 * Anular el día con motivo (RF-20), abierto o cerrado: no se borra, queda con quién,
 * cuándo y por qué, y el día queda libre para otra.
 */
export async function anularDia(
  sesion: PersonaEnSesion,
  pedida: string,
  fecha: string,
  pedido: z.output<typeof anulacionDeBitacoraDeEmpresa>,
): Promise<{ id: string; anuladoEn: string } | Response> {
  const dia = await paraEscribir(sesion, pedida, fecha, 'anular');
  if (dia instanceof Response) return dia;

  const [anulada] = await baseServidor()
    .update(bitacorasEmpresa)
    .set({
      anuladoEn: new Date(),
      anuladoPor: sesion.id,
      motivoAnulacion: pedido.motivo,
      version: sql`${bitacorasEmpresa.version} + 1`,
    })
    .where(
      and(
        eq(bitacorasEmpresa.id, dia.id),
        eq(bitacorasEmpresa.version, pedido.version),
        isNull(bitacorasEmpresa.anuladoEn),
      ),
    )
    .returning({ id: bitacorasEmpresa.id, anuladoEn: bitacorasEmpresa.anuladoEn });
  if (!anulada) return errorDePeticion(MENSAJE_DE_VERSION, 409);
  return { id: anulada.id, anuladoEn: anulada.anuladoEn!.toISOString() };
}
