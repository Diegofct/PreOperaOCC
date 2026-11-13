/**
 * Confirmar una importación al Almacén: entran todos sus ingresos o ninguno (spec 042, RF-18,
 * RF-34 a RF-46, RF-81 a RF-91). **Solo servidor.**
 *
 * ── Antes de escribir ──
 *
 * En este orden, y sin tocar nada:
 *  1. que la importación sea de quien confirma, siga `lista` y en la versión que vio (RF-88, RF-89);
 *  2. que los materiales existentes sigan vigentes (RF-86);
 *  3. la regla: las faltas de cada renglón y los materiales nuevos, uno por nombre (RF-34 a RF-37,
 *     RF-39, RF-81 a RF-84);
 *  4. que un material nuevo no se llame como uno vigente (RF-41);
 *  5. el aviso de documento repetido, que hay que aceptar (RF-43, RF-44).
 *
 * ── Todo o nada, sin transacción interactiva ──
 *
 * Neon por HTTP no deja abrir una transacción, mirar y decidir; da un **lote** que corre en una sola
 * transacción serializable. Es el patrón del almacén por WhatsApp (023), copiado y no compartido: allá
 * van salidas con su guarda de stock y aquí solo ingresos, que nunca dejan un saldo negativo. Tres
 * sentencias:
 *
 *  1. los materiales nuevos, con id fijo, y el índice único del nombre frenando uno igual que alguien
 *     registre entre medias (RF-39, RF-41);
 *  2. **una sola** sentencia con todos los ingresos, que antes de insertar comprueba en la base que la
 *     importación siga `lista` en su versión y que cada material siga vigente en la obra. Si no,
 *     **lanza un error a propósito** y el lote entero se deshace, materiales nuevos incluidos (RF-40,
 *     RF-86, RF-88);
 *  3. la importación pasa a `confirmada`, con quién y cuándo (RF-42, RF-87).
 *
 * Lo que se mira antes y lo que mira la sentencia es lo mismo; la sentencia solo repite lo que puede
 * cambiar entre leer y escribir. Una segunda confirmación —doble clic, otra pestaña— se encuentra la
 * importación `confirmada` y responde 409 con quién y cuándo (RF-89).
 */
import { and, eq, inArray, isNull, sql, type SQL } from 'drizzle-orm';

import { baseServidor, baseServidorSerializable } from '@/db/servidor/cliente';
import { almacenImportaciones, almacenMateriales, usuarios } from '@/db/servidor/esquema';
import type { ConfirmacionDeImportacion, ImportacionConfirmada } from '@/features/panel/almacen-importacion';
import type { PersonaEnSesion } from '@/features/servidor/guardia';
import { conReintentoSiChoca, errorDePeticion, noEncontrado } from '@/features/servidor/respuestas';
import { idDeterminista } from '@/features/whatsapp/servidor/ids';
import { aDecimal } from '@/shared/rules/almacen';
import {
  faltasParaConfirmar,
  importacionAConfirmar,
  materialesNuevosDe,
  type RenglonDeLaImportacion,
} from '@/shared/rules/almacen-importacion';
import { fechaDeJornada } from '@/shared/rules/jornada';
import { normalizar } from '@/shared/rules/texto';

import { importacionDe, revisionDelRepetido } from './estado-de-importacion';

/** Lo que la sentencia de los ingresos lanza cuando la importación ya no está lista en esa versión. */
const IMPORTACION_CAMBIO = 'importacion_cambio';
/** Y cuando un material dejó de estar vigente en la obra. */
const MATERIAL_NO_VIGENTE = 'material_no_vigente';

const CAMBIO = 'Esta propuesta cambió desde que la abrió. Vuelva a cargarla antes de confirmar.';

function textoDelError(fallo: unknown): string {
  return fallo instanceof Error ? `${fallo.message} ${String((fallo as { cause?: unknown }).cause ?? '')}` : '';
}

const enColombia = (d: Date) =>
  d.toLocaleString('es-CO', { timeZone: 'America/Bogota', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' });

/** RF-89: ya entró; con quién y cuándo. */
async function yaConfirmada(confirmadaEn: Date | null, confirmadaPor: string | null): Promise<Response> {
  const [quien] = confirmadaPor
    ? await baseServidor().select({ nombre: usuarios.nombreCompleto }).from(usuarios).where(eq(usuarios.id, confirmadaPor)).limit(1)
    : [];
  const cuando = confirmadaEn ? ` el ${enColombia(confirmadaEn)}` : '';
  return errorDePeticion(`Este documento ya entró al Almacén${cuando}${quien ? `, lo confirmó ${quien.nombre}` : ''}. No se registró de nuevo.`, 409);
}

/** RF-41: el material vigente de la obra que ya se llama como uno de los nuevos, si hay. */
async function nombreQueChoca(obraId: string, claves: string[]): Promise<string | null> {
  if (claves.length === 0) return null;
  const [choque] = await baseServidor()
    .select({ nombre: almacenMateriales.nombre })
    .from(almacenMateriales)
    .where(and(eq(almacenMateriales.obraId, obraId), isNull(almacenMateriales.eliminadoEn), inArray(almacenMateriales.nombreNormalizado, claves)))
    .limit(1);
  return choque?.nombre ?? null;
}

/** RF-18, RF-34 a RF-46, RF-81 a RF-91. */
export async function confirmarImportacion(sesion: PersonaEnSesion, id: string, pedido: ConfirmacionDeImportacion): Promise<ImportacionConfirmada | Response> {
  const f = await importacionDe(sesion, id);
  if (!f) return noEncontrado('esa importación');
  if (f.estado === 'confirmada') return yaConfirmada(f.confirmadaEn, f.confirmadaPor);
  if (f.estado !== 'lista') return errorDePeticion('Esta propuesta ya no está lista: se descartó o venció. Vuelva a subir el documento.', 409);
  if (f.version !== pedido.version) return errorDePeticion(CAMBIO, 409);

  const db = baseServidor();
  // RF-86: los materiales existentes que pide la propuesta, con su unidad y si siguen vigentes.
  const pedidos = [...new Set(pedido.renglones.flatMap((r) => (r.material?.tipo === 'existente' ? [r.material.id] : [])))];
  const existentes = pedidos.length
    ? await db
        .select({ id: almacenMateriales.id, nombre: almacenMateriales.nombre, unidad: almacenMateriales.unidad, eliminadoEn: almacenMateriales.eliminadoEn })
        .from(almacenMateriales)
        .where(and(eq(almacenMateriales.obraId, f.obraId), inArray(almacenMateriales.id, pedidos)))
    : [];
  const vigentes = new Map(existentes.filter((m) => m.eliminadoEn === null).map((m) => [m.id, m]));
  const deBaja = pedidos.find((p) => !vigentes.has(p));
  if (deBaja) {
    const nombre = existentes.find((m) => m.id === deBaja)?.nombre;
    return errorDePeticion(`${nombre ? `«${nombre}»` : 'Un material de la propuesta'} ya no está vigente en el Almacén de la obra. Escoja otro y confirme de nuevo.`, 409);
  }

  // RF-34 a RF-37, RF-39, RF-81 a RF-84: la regla, con la fecha de hoy en Colombia.
  const unidadDe = (r: RenglonDeLaImportacion) => (r.material?.tipo === 'existente' ? (vigentes.get(r.material.id)?.unidad ?? null) : null);
  const faltas = faltasParaConfirmar(pedido, unidadDe, fechaDeJornada(Date.now()));
  if (faltas.length > 0) return Response.json({ error: 'Hay renglones por corregir antes de confirmar.', faltas }, { status: 400 });
  const importacion = importacionAConfirmar(pedido);
  const { nuevos, faltas: deLosNuevos } = materialesNuevosDe(importacion);
  if (deLosNuevos.length > 0) return Response.json({ error: 'Hay renglones por corregir antes de confirmar.', faltas: deLosNuevos }, { status: 400 });

  // RF-41: un nuevo con el nombre de uno vigente se ve antes; el índice cubre el que llegue entre medias.
  const choca = await nombreQueChoca(f.obraId, nuevos.map((n) => n.clave));
  if (choca) return errorDePeticion(`Ya hay un material «${choca}» en el Almacén de la obra: escójalo en vez de crearlo de nuevo.`, 409);

  // RF-43, RF-44.
  const repetido = await revisionDelRepetido(f.obraId, importacion.proveedor, importacion.numero);
  if (repetido.tipo === 'repetido' && !pedido.confirmarRepetido) {
    return Response.json(
      { error: 'Este documento ya se importó. Confirme que quiere registrarlo de nuevo.', repetido: repetido.repetido },
      { status: 409 },
    );
  }

  // Ids fijos, de la importación: un reintento no duplica.
  const idDeNuevo = new Map<string, string>();
  for (const n of nuevos) idDeNuevo.set(n.clave, await idDeterminista(id, 'material', n.clave));
  const ingresos = await Promise.all(
    importacion.ingresos.map(async (ingreso) => ({
      id: await idDeterminista(id, 'ingreso', ingreso.renglon),
      materialId: ingreso.material.tipo === 'existente' ? ingreso.material.id : idDeNuevo.get(normalizar(ingreso.material.nombre.trim()))!,
      cantidad: aDecimal(ingreso.centesimas),
      valorUnitario: ingreso.valorUnitario === null ? null : String(ingreso.valorUnitario),
      valorUnidad: ingreso.valorUnidad,
    })),
  );

  const filas: SQL = sql.join(
    ingresos.map((i) => sql`(${i.id}, ${i.materialId}, ${i.cantidad}::numeric, ${i.valorUnitario}::numeric, ${i.valorUnidad}::text)`),
    sql`, `,
  );
  /*
   * `guarda` cuenta, en la base y en esta misma transacción, si la importación sigue lista en su
   * versión y cuántos materiales ya no están vigentes; si algo falla, el `cast` de un texto a entero
   * lanza y el lote se deshace. El texto depende del conteo, así que Postgres no lo evalúa antes.
   */
  const sentenciaDeIngresos = sql`
    with nuevos (id, material_id, cantidad, valor_unitario, valor_unidad) as (values ${filas}),
    guarda as (
      select
        (select count(*) from almacen_importaciones i
          where i.id = ${id} and i.estado = 'lista' and i.version = ${pedido.version}) as lista,
        (select count(*) from (select distinct material_id from nuevos) p
          where not exists (select 1 from almacen_materiales a
                             where a.id = p.material_id and a.obra_id = ${f.obraId} and a.eliminado_en is null)) as no_vigentes
    )
    insert into almacen_movimientos
      (id, obra_id, material_id, tipo, fecha, cantidad, responsable, proveedor, documento_tipo,
       documento_numero, documento_clave, valor_unitario, valor_unidad, importacion_id, registrado_por)
    select n.id, ${f.obraId}, n.material_id, 'ingreso'::tipo_movimiento_almacen, ${importacion.fecha}::date, n.cantidad,
           ${importacion.entregadoPor}, ${importacion.proveedor}, ${importacion.tipo}, ${importacion.numero},
           ${importacion.clave}, n.valor_unitario, n.valor_unidad, ${id}, ${sesion.id}
      from nuevos n, guarda g
     where (case when g.lista = 0 then (${IMPORTACION_CAMBIO} || g.lista)::int else 0 end) = 0
       and (case when g.no_vigentes > 0 then (${MATERIAL_NO_VIGENTE} || g.no_vigentes)::int else 0 end) = 0
    returning id
  `;

  const fallo = await conReintentoSiChoca(async (): Promise<Response | null> => {
    const lote = baseServidorSerializable();
    const ahora = new Date();
    try {
      await lote.batch([
        ...(nuevos.length > 0
          ? [
              lote.insert(almacenMateriales).values(
                nuevos.map((n) => ({
                  id: idDeNuevo.get(n.clave)!,
                  obraId: f.obraId,
                  nombre: n.nombre,
                  nombreNormalizado: n.clave,
                  unidad: n.unidad,
                  creadoPor: sesion.id,
                })),
              ),
            ]
          : []),
        lote.execute(sentenciaDeIngresos),
        lote
          .update(almacenImportaciones)
          .set({ estado: 'confirmada', confirmadaEn: ahora, confirmadaPor: sesion.id, version: sql`${almacenImportaciones.version} + 1`, actualizadoEn: ahora })
          .where(and(eq(almacenImportaciones.id, id), eq(almacenImportaciones.estado, 'lista'), eq(almacenImportaciones.version, pedido.version))),
      ] as unknown as Parameters<typeof lote.batch>[0]);
      return null;
    } catch (error) {
      const texto = textoDelError(error);
      if (texto.includes(MATERIAL_NO_VIGENTE)) {
        return errorDePeticion('Un material de la propuesta dejó de estar vigente mientras confirmaba. Vuelva a cargarla.', 409);
      }
      if (texto.includes('ux_almacen_material_nombre')) {
        return errorDePeticion('Alguien registró entre tanto un material con el mismo nombre que uno nuevo. Vuelva a cargar la propuesta y escójalo.', 409);
      }
      if (texto.includes(IMPORTACION_CAMBIO)) {
        // Otra confirmación ganó, o la propuesta se descartó o cambió entre medias.
        const [ahoraEs] = await baseServidor().select().from(almacenImportaciones).where(eq(almacenImportaciones.id, id)).limit(1);
        return ahoraEs?.estado === 'confirmada' ? yaConfirmada(ahoraEs.confirmadaEn, ahoraEs.confirmadaPor) : errorDePeticion(CAMBIO, 409);
      }
      throw error;
    }
  });
  if (fallo) return fallo;
  return { ingresos: ingresos.length, materialesNuevos: nuevos.length };
}
