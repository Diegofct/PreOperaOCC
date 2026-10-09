/**
 * Aprobar un reporte de almacén de WhatsApp (spec 023, RF-22 a RF-40, RF-53,
 * RF-54). **Solo servidor.**
 *
 * ── Todo o nada, sin transacción interactiva ──
 *
 * RF-35 pide registrar todos los movimientos del reporte o ninguno, y RF-33 que
 * ninguna salida deje el stock por debajo de cero aunque otra persona registre una
 * salida al mismo tiempo (009/RF-16). Neon por HTTP no deja abrir una transacción,
 * mirar y decidir; lo que sí da es un **lote** que corre en una sola transacción,
 * en aislamiento serializable (`baseServidorSerializable`). Así que va en un lote
 * de dos sentencias:
 *
 *  1. los materiales nuevos (RF-28), con su id fijo y el índice único del nombre
 *     vigente frenando uno repetido que llegue entre medias (RF-29);
 *  2. **una sola** sentencia con todos los movimientos, que antes de insertar
 *     comprueba en la base, por material, que el stock de hoy más lo que entra
 *     menos lo que sale no quede negativo, y que cada material siga vigente en la
 *     obra. Si no, **lanza un error a propósito**, y el lote entero se deshace,
 *     también los materiales nuevos.
 *
 * Antes del lote, la regla pura (`faltasDelReporte`) ya decidió con lo leído y
 * redactó las faltas, por fecha (RF-34). La guarda en SQL no decide nada nuevo:
 * repite lo que puede cambiar entre leer y escribir, el saldo final de cada
 * material, como `sentenciaDeMovimiento` repite «el stock alcanza».
 *
 * ── El reintento ──
 *
 * Los ids salen del mensaje (`idDeterminista`). Si el lote ya se hizo y lo que
 * falló fue marcar el mensaje, el reintento encuentra los movimientos por su id,
 * no inserta nada y termina de marcarlo.
 */
import { and, eq, sql, type SQL } from 'drizzle-orm';

import { baseServidor, baseServidorSerializable } from '@/db/servidor/cliente';
import { almacenMateriales, whatsappMensajes } from '@/db/servidor/esquema';
import { materialesConStock } from '@/features/almacen-obra/servidor/materiales';
import { conReintentoSiChoca, errorDePeticion } from '@/features/servidor/respuestas';
import { aDecimal } from '@/shared/rules/almacen';
import { fechaDeJornada } from '@/shared/rules/jornada';
import { normalizar } from '@/shared/rules/texto';
import {
  claveDeMaterialNuevo,
  faltasDelReporte,
  type FaltaDelReporte,
  type ReporteDelDia,
} from '@/shared/rules/whatsapp';

import type { Actor } from './actor';
import { idDeterminista } from './ids';

export interface AlmacenAprobado {
  movimientos: number;
  materialesNuevos: number;
}

/** Lo que la guarda en SQL lanza cuando el saldo de un material quedaría negativo. */
const STOCK_INSUFICIENTE = 'stock_insuficiente';
/** Y cuando un material del reporte dejó de estar vigente en la obra. */
const MATERIAL_NO_VIGENTE = 'material_no_vigente';

function respuestaDeFaltas(faltas: FaltaDelReporte[], estado = 400) {
  return Response.json(
    { error: 'Al reporte de almacén le falta información. Complétela antes de aprobar.', faltas },
    { status: estado },
  );
}

/** Las faltas del reporte que tocan al almacén: la fecha y sus renglones. */
export async function faltasDelAlmacen(reporte: ReporteDelDia, obraId: string) {
  const materiales = await materialesConStock(obraId);
  return faltasDelReporte(reporte, {
    hoy: fechaDeJornada(),
    // Un reporte de almacén no lleva máquinas: el medidor no se usa.
    claseDeMedidor: () => 'horometro',
    almacen: { materiales },
  }).filter((f) => f.seccion === 'fecha' || f.seccion === 'almacen');
}

/** El texto de un error de Postgres, venga como venga del driver. */
function textoDelError(fallo: unknown): string {
  return fallo instanceof Error ? `${fallo.message} ${String((fallo as { cause?: unknown }).cause ?? '')}` : '';
}

/** Lo que pasó al escribir: `null` si se escribió (o ya estaba), o por qué no. */
export type ResultadoDeEscribir = null | 'stock' | 'material' | 'nombre';

/**
 * El lote que registra los materiales nuevos y los movimientos de un reporte de
 * almacén **ya validado**, todo o nada (RF-28, RF-35, RF-37). Aparte de la
 * aprobación para poder probar la guarda en SQL sin pasar por la regla.
 *
 * `reporte` tiene que venir sin faltas: cada renglón con su material elegido o uno
 * nuevo con nombre y unidad, y su cantidad.
 */
export async function escribirReporteDeAlmacen(datos: {
  mensajeId: string;
  obraId: string;
  aprobadoPor: string;
  reporte: ReporteDelDia;
  /** De dónde salen los ids, si no del mensaje (spec 024: un renglón completado aparte). */
  claveDeIds?: string;
}): Promise<{ resultado: ResultadoDeEscribir; movimientos: number; materialesNuevos: number }> {
  const { mensajeId, obraId, aprobadoPor, reporte } = datos;
  const clave = datos.claveDeIds ?? mensajeId;
  const fecha = reporte.fecha!;

  // Los materiales nuevos, uno por clave (dos renglones del mismo son uno).
  const nuevos = new Map<string, { id: string; nombre: string; unidad: string }>();
  for (const m of reporte.almacen) {
    if (m.materialId || !m.materialNuevo) continue;
    const claveDelMaterial = claveDeMaterialNuevo(m.materialNuevo.nombre);
    if (nuevos.has(claveDelMaterial)) continue;
    nuevos.set(claveDelMaterial, {
      id: await idDeterminista(clave, 'material', claveDelMaterial),
      nombre: m.materialNuevo.nombre.trim(),
      unidad: m.materialNuevo.unidad!,
    });
  }

  // Los movimientos, con su material ya resuelto y su id fijo.
  const movimientos = await Promise.all(
    reporte.almacen.map(async (m, renglon) => ({
      id: await idDeterminista(clave, 'almacen', renglon),
      materialId: m.materialId ?? nuevos.get(claveDeMaterialNuevo(m.materialNuevo!.nombre))!.id,
      tipo: m.tipo,
      cantidad: aDecimal(m.cantidad!),
      // Lo que no corresponde a su tipo no se guarda (009/RF-8, RF-11).
      paraQue: m.tipo === 'salida' ? m.paraQue.trim() : null,
      observacion: m.tipo === 'ingreso' ? m.observacion.trim() || null : null,
      responsable: m.responsable.trim(),
    })),
  );

  const filas: SQL = sql.join(
    movimientos.map(
      (m) =>
        sql`(${m.id}, ${m.materialId}, ${m.tipo}::tipo_movimiento_almacen, ${m.cantidad}::numeric, ${m.paraQue}, ${m.observacion}, ${m.responsable})`,
    ),
    sql`, `,
  );
  const ids = sql.join(
    movimientos.map((m) => sql`${m.id}`),
    sql`, `,
  );

  /*
   * La sentencia de los movimientos. `guarda` cuenta, en la base y en esta misma
   * transacción, los materiales que quedarían en negativo y los que ya no están
   * vigentes en la obra; si hay alguno, el `cast` de un texto a entero falla y el
   * lote se deshace. El texto depende de la fila (el conteo), así que Postgres no
   * lo puede evaluar antes de tiempo. `ya` es el reintento: si los movimientos ya
   * están, no se comprueba ni se inserta nada.
   */
  const sentenciaDeMovimientos = sql`
    with nuevos (id, material_id, tipo, cantidad, para_que, observacion, responsable) as (
      values ${filas}
    ),
    por_material as (
      select material_id,
             sum(case when tipo = 'ingreso' then cantidad else -cantidad end) as delta
        from nuevos group by material_id
    ),
    reintento as (
      select exists (select 1 from almacen_movimientos where id in (${ids})) as ya
    ),
    guarda as (
      -- En un reintento no se comprueba nada: los movimientos ya están y contarían dos veces.
      select r.ya,
        case when r.ya then 0 else
          (select count(*) from por_material p
            where (select coalesce(sum(case when m.tipo = 'ingreso' then m.cantidad else -m.cantidad end), 0)
                     from almacen_movimientos m
                    where m.material_id = p.material_id and m.anulado_en is null) + p.delta < 0)
        end as sin_stock,
        case when r.ya then 0 else
          (select count(*) from por_material p
            where not exists (select 1 from almacen_materiales a
                               where a.id = p.material_id and a.obra_id = ${obraId}
                                 and a.eliminado_en is null))
        end as no_vigentes
      from reintento r
    )
    insert into almacen_movimientos
      (id, obra_id, material_id, tipo, fecha, cantidad, para_que, observacion, responsable,
       mensaje_whatsapp_id, registrado_por)
    select n.id, ${obraId}, n.material_id, n.tipo, ${fecha}::date, n.cantidad, n.para_que,
           n.observacion, n.responsable, ${mensajeId}, ${aprobadoPor}
      from nuevos n, guarda g
     where not g.ya
       and (case when g.no_vigentes > 0 then (${MATERIAL_NO_VIGENTE} || g.no_vigentes)::int else 0 end) = 0
       and (case when g.sin_stock > 0 then (${STOCK_INSUFICIENTE} || g.sin_stock)::int else 0 end) = 0
    on conflict (id) do nothing
    returning id
  `;

  const resultado = await conReintentoSiChoca(async (): Promise<ResultadoDeEscribir> => {
    const db = baseServidorSerializable();
    try {
      const lote = [
        ...(nuevos.size > 0
          ? [
              db
                .insert(almacenMateriales)
                .values(
                  [...nuevos.values()].map((n) => ({
                    id: n.id,
                    obraId,
                    nombre: n.nombre,
                    nombreNormalizado: normalizar(n.nombre),
                    unidad: n.unidad as typeof almacenMateriales.$inferInsert.unidad,
                    creadoPor: aprobadoPor,
                  })),
                )
                .onConflictDoNothing({ target: almacenMateriales.id }),
            ]
          : []),
        db.execute(sentenciaDeMovimientos),
      ];
      await db.batch(lote as unknown as Parameters<typeof db.batch>[0]);
      return null;
    } catch (fallo) {
      const texto = textoDelError(fallo);
      if (texto.includes(STOCK_INSUFICIENTE)) return 'stock';
      if (texto.includes(MATERIAL_NO_VIGENTE)) return 'material';
      // Un material nuevo con el nombre de otro que alguien registró entre medias.
      if (texto.includes('ux_almacen_material_nombre')) return 'nombre';
      throw fallo;
    }
  });

  return { resultado, movimientos: movimientos.length, materialesNuevos: nuevos.size };
}

/**
 * Aprueba los ingresos y salidas de un reporte de almacén. El mensaje ya se leyó y
 * se comprobó pendiente y en su versión (`aprobarPropuesta`); aquí se valida, se
 * escribe y se marca.
 */
export async function aprobarReporteDeAlmacen(
  // Quien aprueba, o el sistema (spec 024, RF-3, RF-10).
  actor: Actor,
  id: string,
  mensaje: { obraId: string; almacenActivo: boolean; version: number },
  reporte: ReporteDelDia,
): Promise<AlmacenAprobado | Response> {
  // RF-25: sin el módulo en la obra no hay almacén donde registrar.
  if (!mensaje.almacenActivo) {
    return errorDePeticion(
      'Esta obra no lleva Almacén: el reporte no se puede aprobar. Descártelo o pida que se active el módulo.',
      400,
    );
  }
  if (reporte.almacen.length === 0) {
    return errorDePeticion('El reporte no trae ingresos ni salidas que registrar.', 400);
  }

  // 1. Todo lo que falta, de una vez, con el stock de hoy (RF-26 a RF-34, RF-36).
  const faltas = await faltasDelAlmacen(reporte, mensaje.obraId);
  if (faltas.length > 0) return respuestaDeFaltas(faltas);

  // 2. El lote: materiales nuevos y movimientos, todo o nada (RF-28, RF-35).
  const escrito = await escribirReporteDeAlmacen({
    mensajeId: id,
    obraId: mensaje.obraId,
    aprobadoPor: actor.id,
    reporte,
  });

  if (escrito.resultado === 'stock') {
    // Otra salida entró entre leer y escribir: se responde lo que dice la regla ahora.
    const ahora = await faltasDelAlmacen(reporte, mensaje.obraId);
    return ahora.length > 0
      ? respuestaDeFaltas(ahora, 409)
      : errorDePeticion('El stock cambió mientras se aprobaba. Vuelva a intentarlo.', 409);
  }
  if (escrito.resultado === 'material') {
    return errorDePeticion(
      'Un material del reporte se dio de baja mientras se aprobaba. Vuelva a abrir la propuesta.',
      409,
    );
  }
  if (escrito.resultado === 'nombre') {
    return errorDePeticion(
      'Alguien registró en el almacén un material con el mismo nombre que uno nuevo del reporte. Vuelva a abrir la propuesta y elíjalo de la lista.',
      409,
    );
  }

  // 3. El mensaje, aprobado, con la obra donde se decidió (021/RF-13, RF-46). Sin
  // bitácora: el almacén no va a ella (RF-40).
  const [aprobado] = await baseServidor()
    .update(whatsappMensajes)
    .set({
      estado: 'aprobado',
      propuesta: reporte as unknown as Record<string, unknown>,
      parteId: null,
      aprobadoPor: actor.id,
      aprobadoEn: new Date(),
      obraDecididaId: mensaje.obraId,
      version: sql`${whatsappMensajes.version} + 1`,
    })
    .where(
      and(
        eq(whatsappMensajes.id, id),
        eq(whatsappMensajes.estado, 'pendiente'),
        eq(whatsappMensajes.version, mensaje.version),
      ),
    )
    .returning({ id: whatsappMensajes.id });
  if (!aprobado) {
    return errorDePeticion('Otra persona decidió sobre esta propuesta al mismo tiempo. Vuelva a abrirla.', 409);
  }

  return { movimientos: escrito.movimientos, materialesNuevos: escrito.materialesNuevos };
}
