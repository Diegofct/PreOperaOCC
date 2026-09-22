/**
 * Los movimientos del almacén de obra (spec 009). **Solo servidor.**
 *
 * Mismo reparto que `materiales.ts`: la regla pura decide y redacta; la guarda en
 * SQL, dentro de un lote serializable, impide que dos escrituras simultáneas
 * pasen la misma comprobación. Ver el comentario de ese módulo.
 */
import { asc, eq, sql } from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';

import { baseServidor } from '@/db/servidor/cliente';
import { almacenMovimientos, usuarios } from '@/db/servidor/esquema';
import type { MovimientoDeAlmacenFila } from '@/features/panel/contratos';
import {
  aDecimal,
  historialConSaldo,
  type TipoMovimiento,
} from '@/shared/rules/almacen';

import { cantidadDeLaBase, stockEnSql } from './materiales';

const anulador = alias(usuarios, 'anulador');

/**
 * El historial completo de un material, con nombres y con el stock que dejó cada
 * movimiento. **Completo** a propósito: el saldo se calcula sobre todos los
 * movimientos y el filtro de periodo y tipo se aplica después, o el saldo de una
 * salida filtrada sería el de una lista a la que le faltan filas.
 */
export async function historialDelMaterial(materialId: string): Promise<MovimientoDeAlmacenFila[]> {
  const filas = await baseServidor()
    .select({
      id: almacenMovimientos.id,
      materialId: almacenMovimientos.materialId,
      tipo: almacenMovimientos.tipo,
      fecha: almacenMovimientos.fecha,
      cantidad: almacenMovimientos.cantidad,
      paraQue: almacenMovimientos.paraQue,
      observacion: almacenMovimientos.observacion,
      responsable: almacenMovimientos.responsable,
      creadoEn: almacenMovimientos.creadoEn,
      // El nombre sale aunque la persona esté de baja: un movimiento antiguo sigue
      // diciendo quién lo hizo (caso límite de la spec).
      registradoPorNombre: usuarios.nombreCompleto,
      anuladoEn: almacenMovimientos.anuladoEn,
      anuladoPorNombre: anulador.nombreCompleto,
      motivoAnulacion: almacenMovimientos.motivoAnulacion,
    })
    .from(almacenMovimientos)
    .leftJoin(usuarios, eq(usuarios.id, almacenMovimientos.registradoPor))
    .leftJoin(anulador, eq(anulador.id, almacenMovimientos.anuladoPor))
    .where(eq(almacenMovimientos.materialId, materialId))
    .orderBy(asc(almacenMovimientos.creadoEn), asc(almacenMovimientos.id));

  return historialConSaldo(
    filas.map((f) => ({
      id: f.id,
      materialId: f.materialId,
      tipo: f.tipo,
      fecha: f.fecha,
      cantidad: cantidadDeLaBase(f.cantidad),
      paraQue: f.paraQue,
      observacion: f.observacion,
      // `null` en los anteriores al 2026-09-22: se muestran sin él (RF-44).
      responsable: f.responsable,
      registradoEn: f.creadoEn.toISOString(),
      registradoPorNombre: f.registradoPorNombre,
      anulado: f.anuladoEn !== null,
      anuladoEn: f.anuladoEn?.toISOString() ?? null,
      anuladoPorNombre: f.anuladoPorNombre,
      motivoAnulacion: f.motivoAnulacion,
    })),
  );
}

/** Un movimiento suelto, para anularlo: con la obra, para comprobar el alcance. */
export async function leerMovimiento(id: string) {
  const [fila] = await baseServidor()
    .select({
      id: almacenMovimientos.id,
      obraId: almacenMovimientos.obraId,
      materialId: almacenMovimientos.materialId,
      tipo: almacenMovimientos.tipo,
      cantidad: almacenMovimientos.cantidad,
      anuladoEn: almacenMovimientos.anuladoEn,
    })
    .from(almacenMovimientos)
    .where(eq(almacenMovimientos.id, id))
    .limit(1);

  if (!fila) return null;
  return {
    id: fila.id,
    obraId: fila.obraId,
    materialId: fila.materialId,
    tipo: fila.tipo,
    cantidad: cantidadDeLaBase(fila.cantidad),
    anulado: fila.anuladoEn !== null,
  };
}

export interface MovimientoPorInsertar {
  id: string;
  materialId: string;
  tipo: TipoMovimiento;
  fecha: string;
  /** En centésimas. */
  cantidad: number;
  paraQue: string | null;
  observacion: string | null;
  /** Quién entregó o recibió, ya validado por la regla (RF-40 a RF-42). */
  responsable: string;
  registradoPor: string;
}

/**
 * La sentencia que guarda un movimiento **solo si** su material sigue vigente y,
 * si es una salida, solo si el stock todavía alcanza. Devuelve el id insertado, o
 * ninguna fila si la guarda no dejó.
 *
 * Un `insert … select … where` y no un `insert … values`, porque así la
 * comprobación y la escritura son la misma sentencia. La obra se copia del
 * material en la base: nunca de lo que mande el navegador.
 *
 * Los parámetros llevan su tipo escrito (`::date`, `::numeric`, el enum): en un
 * `insert … select` Postgres los resuelve como texto, y un texto no se guarda en
 * una columna de tipo fecha o enum sin decirlo.
 */
export function sentenciaDeMovimiento(m: MovimientoPorInsertar) {
  const cantidad = aDecimal(m.cantidad);
  const alcanza =
    m.tipo === 'salida' ? sql`and ${stockEnSql(m.materialId)} >= ${cantidad}::numeric` : sql.empty();

  return sql`
    insert into almacen_movimientos
      (id, obra_id, material_id, tipo, fecha, cantidad, para_que, observacion, responsable,
       registrado_por)
    select ${m.id}, material.obra_id, material.id, ${m.tipo}::tipo_movimiento_almacen,
           ${m.fecha}::date, ${cantidad}::numeric, ${m.paraQue}, ${m.observacion},
           ${m.responsable}, ${m.registradoPor}
    from almacen_materiales as material
    where material.id = ${m.materialId}
      and material.eliminado_en is null
      ${alcanza}
    returning id
  `;
}
