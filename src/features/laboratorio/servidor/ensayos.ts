/**
 * Los ensayos de granulometría en la base (spec 018). **Solo servidor.**
 *
 * ── Una sola forma de leer ──
 *
 * El listado, el detalle y la respuesta de cada escritura salen de aquí, con las
 * mismas columnas. Si cada ruta armara su `select`, un día el listado diría
 * «Aprobado» de un ensayo que el detalle muestra anulado.
 *
 * ── Lo calculado lo calcula el servidor ──
 *
 * `resultado` y `veredicto` se guardan con `calcularGranulometria`, la misma función
 * pura que usa la pantalla, **con la franja copiada en el ensayo** y nunca con la del
 * catálogo de hoy (RF-21, RF-42). Lo que el navegador mande como porcentaje no llega
 * aquí: el contrato ni siquiera lo lee.
 *
 * ── Las firmas salen de la historia ──
 *
 * «Revisó», «Aprobó» y la anulación se leen de la historia del ensayo, que guarda el
 * nombre y el cargo **de ese momento** (RF-94). Si mañana la persona cambia de cargo,
 * el informe sigue diciendo con qué cargo firmó.
 */
import { and, desc, eq, inArray, isNull, sql, type SQL } from 'drizzle-orm';

import { baseServidor } from '@/db/servidor/cliente';
import { ensayosGranulometria, obras, usuarios } from '@/db/servidor/esquema';
import type { EventoDelEnsayo } from '@/features/laboratorio/tipos';
import type { EnsayoDetalle, EnsayoFila, FirmaDelEnsayo } from '@/features/panel/contratos';
import { alcanzaLaObra, veTodasLasObras } from '@/features/servidor/alcance';
import type { PersonaEnSesion } from '@/features/servidor/guardia';
import { errorDePeticion, noEncontrado, ok, type ErrorConCampos } from '@/features/servidor/respuestas';
import { nombreDeCargo } from '@/shared/catalogos/cargos';
import type { FranjaGranulometrica } from '@/shared/catalogos/franjas-granulometricas';
import {
  calcularGranulometria,
  ETIQUETA_ESTADO_ENSAYO,
  estadoVisible,
  transicionPermitida,
  veredictoDe,
  type EnsayoAValidar,
  type EntradaGranulometria,
  type EstadoEnsayo,
  type EstadoVisibleEnsayo,
  type ErrorDeEnsayo,
  type AccionSobreEnsayo,
  type ResultadoGranulometria,
} from '@/shared/rules/granulometria';

const e = ensayosGranulometria;

const COLUMNAS_DE_FILA = {
  id: e.id,
  obraId: e.obraId,
  obraCodigo: obras.codigo,
  numeroInforme: e.numeroInforme,
  material: e.material,
  fuente: e.fuente,
  franjaId: e.franjaId,
  // El nombre de la franja **copiada**, no el del catálogo de hoy (RF-21).
  franja: sql<string | null>`${e.franja}->>'nombre'`,
  fechaRecepcion: e.fechaRecepcion,
  fechaEjecucion: e.fechaEjecucion,
  veredicto: e.veredicto,
  estado: e.estado,
  anuladoEn: e.anuladoEn,
  descartadoEn: e.descartadoEn,
  creadoEn: e.creadoEn,
};

/** Lo que devuelve `COLUMNAS_DE_FILA`, escrito a mano: es lo que `aFila` promete leer. */
interface FilaLeida {
  id: string;
  obraId: string;
  obraCodigo: string;
  numeroInforme: string | null;
  material: string | null;
  fuente: string | null;
  franjaId: string | null;
  franja: string | null;
  fechaRecepcion: string | null;
  fechaEjecucion: string | null;
  veredicto: 'cumple' | 'no_cumple' | null;
  estado: EstadoEnsayo;
  anuladoEn: Date | null;
  descartadoEn: Date | null;
  creadoEn: Date;
}

function aFila(fila: FilaLeida): EnsayoFila {
  return {
    id: fila.id,
    obraId: fila.obraId,
    obraCodigo: fila.obraCodigo,
    numeroInforme: fila.numeroInforme,
    material: fila.material,
    fuente: fila.fuente,
    franjaId: fila.franjaId,
    franja: fila.franja,
    fechaRecepcion: fila.fechaRecepcion,
    fechaEjecucion: fila.fechaEjecucion,
    veredicto: fila.veredicto,
    estado: estadoVisible(fila.estado, fila.anuladoEn, fila.descartadoEn),
    registradoEn: fila.creadoEn.toISOString(),
  };
}

/**
 * Los ensayos que cumplen la condición, del más reciente al más antiguo por fecha de
 * ejecución (RF-102). Los borradores sin fecha van primero: son lo que está en curso.
 */
export async function leerEnsayos(condicion: SQL | undefined): Promise<EnsayoFila[]> {
  const filas = await baseServidor()
    .select(COLUMNAS_DE_FILA)
    .from(e)
    .innerJoin(obras, eq(obras.id, e.obraId))
    .where(condicion)
    .orderBy(sql`${e.fechaEjecucion} desc nulls first`, desc(e.creadoEn));
  return filas.map(aFila);
}

/** La última vez que se hizo esa acción, como firma. */
function firmaDe(historia: EventoDelEnsayo[], accion: EventoDelEnsayo['accion']): FirmaDelEnsayo | null {
  // Recorrida al revés a mano: `findLast` no está en todos los entornos donde corre.
  let evento: EventoDelEnsayo | undefined;
  for (let i = historia.length - 1; i >= 0 && !evento; i--) {
    if (historia[i].accion === accion) evento = historia[i];
  }
  return evento ? { nombre: evento.nombre, cargo: evento.cargo, en: evento.en } : null;
}

/** Un ensayo entero, o `null` si no existe. El alcance por obra lo mira quien pregunta. */
export async function leerDetalle(id: string): Promise<EnsayoDetalle | null> {
  const [fila] = await baseServidor()
    .select({
      ...COLUMNAS_DE_FILA,
      obraNombre: obras.nombre,
      localizacion: e.localizacion,
      observaciones: e.observaciones,
      masas: e.masas,
      retenidos: e.retenidos,
      franjaCopia: e.franja,
      resultado: e.resultado,
      comentarioDevolucion: e.comentarioDevolucion,
      motivoAnulacion: e.motivoAnulacion,
      historia: e.historia,
    })
    .from(e)
    .innerJoin(obras, eq(obras.id, e.obraId))
    .where(eq(e.id, id))
    .limit(1);

  if (!fila) return null;

  const base = aFila(fila);
  const anulado = firmaDe(fila.historia, 'anular');
  return {
    ...base,
    obraNombre: fila.obraNombre,
    localizacion: fila.localizacion,
    observaciones: fila.observaciones,
    masas: fila.masas,
    retenidos: fila.retenidos,
    franjaCopia: fila.franjaCopia,
    resultado: fila.resultado,
    revisado: firmaDe(fila.historia, 'enviar'),
    aprobado: firmaDe(fila.historia, 'aprobar'),
    // Solo mientras está devuelto: después de reenviarlo, el comentario es historia.
    comentarioDevolucion: base.estado === 'devuelto' ? fila.comentarioDevolucion : null,
    anulado: anulado && fila.motivoAnulacion ? { ...anulado, motivo: fila.motivoAnulacion } : null,
    historia: fila.historia,
  };
}

/**
 * Un ensayo tal como está guardado, con lo que hace falta para corregirlo o cambiarle
 * el estado. Lleva `actualizadoEn` para que la escritura compruebe que nadie lo tocó
 * entre la lectura y el `UPDATE` (Neon por HTTP no da transacciones).
 */
export interface EnsayoGuardado extends EnsayoAValidar {
  id: string;
  obraId: string;
  observaciones: string | null;
  franja: FranjaGranulometrica | null;
  estado: EstadoEnsayo;
  visible: EstadoVisibleEnsayo;
  actualizadoEn: Date;
}

/**
 * El ensayo, o `null` si no existe **o no le toca a quien pregunta**: uno de otra
 * obra responde igual que uno que no existe (RF-6, RF-7). A la gerencia, además, se
 * le esconden los de obras con el módulo apagado (RF-8); a los demás ya los frenó la
 * guardia si la suya lo tiene apagado.
 */
export async function ensayoAlAlcance(
  sesion: PersonaEnSesion,
  id: string,
): Promise<EnsayoGuardado | null> {
  const [fila] = await baseServidor()
    .select({
      id: e.id,
      obraId: e.obraId,
      laboratorioActivo: obras.laboratorioActivo,
      material: e.material,
      fuente: e.fuente,
      localizacion: e.localizacion,
      numeroInforme: e.numeroInforme,
      fechaRecepcion: e.fechaRecepcion,
      fechaEjecucion: e.fechaEjecucion,
      franjaId: e.franjaId,
      franja: e.franja,
      masas: e.masas,
      retenidos: e.retenidos,
      observaciones: e.observaciones,
      estado: e.estado,
      anuladoEn: e.anuladoEn,
      descartadoEn: e.descartadoEn,
      actualizadoEn: e.actualizadoEn,
    })
    .from(e)
    .innerJoin(obras, eq(obras.id, e.obraId))
    .where(eq(e.id, id))
    .limit(1);

  if (!fila || !alcanzaLaObra(sesion, fila.obraId)) return null;
  if (veTodasLasObras(sesion) && !fila.laboratorioActivo) return null;

  const { laboratorioActivo: _, anuladoEn, descartadoEn, ...guardado } = fila;
  return { ...guardado, visible: estadoVisible(fila.estado, anuladoEn, descartadoEn) };
}

/** Lo que se guarda del cálculo, con la franja que corresponde al ensayo. */
export function calculoParaGuardar(
  entrada: EntradaGranulometria,
  franja: FranjaGranulometrica | null,
): { resultado: ResultadoGranulometria; veredicto: 'cumple' | 'no_cumple' | null } {
  const resultado = calcularGranulometria(entrada, franja);
  return { resultado, veredicto: veredictoDe(resultado) };
}

/** El rechazo de la regla, con cada mensaje en su campo (como en cantera). */
export function rechazoConCampos(errores: ErrorDeEnsayo[]): Response {
  return Response.json(
    {
      error: errores[0].mensaje,
      campos: Object.fromEntries(errores.map((f) => [f.campo, f.mensaje])),
    } satisfies ErrorConCampos,
    { status: 400 },
  );
}

/**
 * En qué obra se registra (RF-6, RF-9, RF-14).
 *
 * El laboratorista registra en la suya —la guardia ya comprobó que la lleve—. La
 * gerencia dice en cuál, y tiene que existir **y llevar el módulo**: a ella la guardia
 * no la frena por obra, así que eso se mira aquí (017/RF-10).
 *
 * No reutiliza `obraParaRegistrar` de cantera porque esa no mira el módulo: la
 * condición sale de la misma fila que la existencia, en una sola consulta.
 */
export async function obraParaRegistrarEnsayo(
  sesion: PersonaEnSesion,
  obraIdPedida: string | null,
): Promise<string | Response> {
  if (!veTodasLasObras(sesion)) {
    if (sesion.obraId) return sesion.obraId;
    return Response.json(
      { error: 'Su cuenta no tiene obra asignada. Pídale a la gerencia que le asigne su obra.' },
      { status: 400 },
    );
  }

  const faltaObra = (mensaje: string) =>
    Response.json({ error: mensaje, campos: { obraId: mensaje } } satisfies ErrorConCampos, {
      status: 400,
    });

  if (!obraIdPedida) return faltaObra('Elija la obra.');

  const [obra] = await baseServidor()
    .select({ id: obras.id, laboratorio: obras.laboratorioActivo })
    .from(obras)
    .where(and(eq(obras.id, obraIdPedida), isNull(obras.eliminadoEn)))
    .limit(1);
  if (!obra) return faltaObra('Esa obra no existe.');
  if (!obra.laboratorio) return faltaObra('Esa obra no lleva el módulo Laboratorio.');
  return obra.id;
}

/* ── Cambios de estado (RF-72 a RF-94) ──────────────────────────────────── */

/** Qué columnas cambia el paso, además del evento de la historia. */
type CambiosDelPaso = Partial<typeof e.$inferInsert>;

interface Paso {
  sesion: PersonaEnSesion;
  id: string;
  accion: Exclude<AccionSobreEnsayo, 'editar'>;
  /** Lo que se escribe, dado el ensayo leído. */
  cambios: (guardado: EnsayoGuardado) => CambiosDelPaso;
  /** El comentario de una devolución o el motivo de una anulación. */
  texto?: string;
  /**
   * Una comprobación sobre el ensayo leído antes de escribir; si devuelve una
   * respuesta, el paso se corta ahí (enviar exige el ensayo completo, RF-73).
   */
  antes?: (guardado: EnsayoGuardado) => Response | null;
  /**
   * Exigir además que nadie lo haya guardado desde la lectura. Lo pide enviar: lo
   * que se valida tiene que ser lo que queda enviado.
   */
  sinCambiosDesdeLaLectura?: boolean;
}

/**
 * El estado dentro de una frase: «está enviado», «está en borrador». El borrador
 * lleva «en» porque es un sustantivo; los demás son participios.
 */
export function enFrase(estado: EstadoVisibleEnsayo): string {
  const nombre = ETIQUETA_ESTADO_ENSAYO[estado].toLowerCase();
  return estado === 'borrador' ? `en ${nombre}` : nombre;
}

/** Los estados desde los que se puede dar el paso, para el `where` (RF-93). */
function estadosDesde(accion: Exclude<AccionSobreEnsayo, 'editar'>): EstadoEnsayo[] {
  return (['borrador', 'enviado', 'devuelto', 'aprobado'] as const).filter((estado) =>
    transicionPermitida(estado, accion),
  );
}

/**
 * Dar un paso del flujo: comprobar que se puede desde el estado actual, escribir el
 * cambio **y** su evento en la historia en una sola sentencia, y responder el ensayo.
 *
 * ── Por qué una sola sentencia ──
 *
 * Neon por HTTP no da transacciones. Si el estado y la historia se escribieran por
 * separado y la segunda fallara, quedaría un ensayo aprobado sin constancia de quién
 * lo aprobó. Así, o cambian los dos o ninguno.
 *
 * ── Dos personas a la vez (RF-93) ──
 *
 * El `UPDATE` se condiciona al estado de partida: si otro residente lo aprobó o lo
 * devolvió entre la lectura y aquí, no toca ninguna fila, y se responde 409 diciendo
 * en qué quedó. Quién puede dar el paso lo decidió ya la guardia; esto decide cuándo.
 */
export async function darPaso(paso: Paso): Promise<Response> {
  const { sesion, id, accion } = paso;

  const guardado = await ensayoAlAlcance(sesion, id);
  if (!guardado) return noEncontrado('ese ensayo');
  if (!transicionPermitida(guardado.visible, accion)) {
    return errorDePeticion(`Este ensayo está ${enFrase(guardado.visible)}: no se puede hacer eso.`, 409);
  }

  const corte = paso.antes?.(guardado);
  if (corte) return corte;

  // El cargo de este momento, con su nombre: es lo que se imprime (RF-75, RF-83).
  const [persona] = await baseServidor()
    .select({ cargo: usuarios.cargo })
    .from(usuarios)
    .where(eq(usuarios.id, sesion.id))
    .limit(1);

  const ahora = new Date();
  const evento: EventoDelEnsayo = {
    accion,
    usuarioId: sesion.id,
    nombre: sesion.nombreCompleto,
    cargo: persona?.cargo ? nombreDeCargo(persona.cargo) : null,
    en: ahora.toISOString(),
    ...(paso.texto ? { texto: paso.texto } : {}),
  };

  const [fila] = await baseServidor()
    .update(e)
    .set({
      ...paso.cambios(guardado),
      historia: sql`${e.historia} || ${JSON.stringify([evento])}::jsonb`,
      actualizadoEn: ahora,
    })
    .where(
      and(
        eq(e.id, id),
        inArray(e.estado, estadosDesde(accion)),
        isNull(e.anuladoEn),
        isNull(e.descartadoEn),
        paso.sinCambiosDesdeLaLectura
          ? // Truncado: Postgres guarda microsegundos y el `Date` leído, milisegundos.
            sql`date_trunc('milliseconds', ${e.actualizadoEn}) = ${guardado.actualizadoEn.toISOString()}::timestamptz`
          : undefined,
      ),
    )
    .returning({ id: e.id });

  if (!fila) {
    const actual = await ensayoAlAlcance(sesion, id);
    return errorDePeticion(
      actual && actual.visible !== guardado.visible
        ? `Este ensayo pasó a ${enFrase(actual.visible)} mientras tanto. Vuelva a abrirlo.`
        : 'Alguien guardó este ensayo mientras tanto. Vuelva a abrirlo.',
      409,
    );
  }

  return ok(await leerDetalle(id));
}
