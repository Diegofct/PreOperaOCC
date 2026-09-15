/**
 * Lo que comparten las rutas del almacén de obra (spec 009). **Solo servidor.**
 *
 * La carpeta se llama `almacen-obra` y no `almacen` a propósito: en
 * `features/media/servidor/almacen.ts` ya vive el almacén de **imágenes** (R2), y
 * dos módulos con el mismo nombre para dos cosas distintas es la manera de que
 * alguien importe el equivocado.
 *
 * ── Dónde se decide y dónde se protege ──
 *
 * Toda decisión sobre el stock sale de las reglas puras de
 * `shared/rules/almacen`, con los movimientos leídos de la base: es la regla
 * escrita una sola vez (constitución §3), y es la que redacta el rechazo.
 *
 * Pero entre leer y escribir puede entrar otro movimiento. Por eso cada escritura
 * que depende del stock lleva además una **guarda en SQL** —«solo si el stock
 * sigue siendo el que permite esto»— y va dentro de un lote serializable
 * (`baseServidorSerializable`). La guarda no decide nada nuevo: repite en la base
 * la misma condición, para que dos escrituras simultáneas no la pasen las dos.
 * Si la guarda no deja escribir, la ruta vuelve a leer y responde lo que diga la
 * regla con el stock nuevo.
 */
import { and, asc, eq, inArray, isNull, sql, type SQL } from 'drizzle-orm';

import { baseServidor } from '@/db/servidor/cliente';
import { almacenMateriales, almacenMovimientos, obras } from '@/db/servidor/esquema';
import type { MaterialDeAlmacenFila } from '@/features/panel/contratos';
import { alcanzaLaObra } from '@/features/servidor/alcance';
import type { PersonaEnSesion } from '@/features/servidor/guardia';
import {
  aCentesimas,
  totalesDelMaterial,
  type MovimientoRegistrado,
} from '@/shared/rules/almacen';

/** Un material tal como sale de la base, antes de sumarle sus movimientos. */
export interface MaterialLeido {
  id: string;
  obraId: string;
  obraNombre: string | null;
  nombre: string;
  unidad: MaterialDeAlmacenFila['unidad'];
}

const COLUMNAS_MATERIAL = {
  id: almacenMateriales.id,
  obraId: almacenMateriales.obraId,
  obraNombre: obras.nombre,
  nombre: almacenMateriales.nombre,
  unidad: almacenMateriales.unidad,
};

/** Los materiales vigentes que cumplen la condición, con el nombre de su obra. */
export async function leerMateriales(condicion: SQL | undefined): Promise<MaterialLeido[]> {
  return baseServidor()
    .select(COLUMNAS_MATERIAL)
    .from(almacenMateriales)
    .leftJoin(obras, eq(obras.id, almacenMateriales.obraId))
    .where(and(isNull(almacenMateriales.eliminadoEn), condicion))
    .orderBy(asc(almacenMateriales.nombreNormalizado));
}

/**
 * Un material vigente al alcance de quien pregunta, o `null`.
 *
 * Uno de otra obra es `null` igual que uno que no existe: responder «no puede»
 * confirmaría que ese id es real (mismo criterio que vehículos).
 */
export async function leerMaterialAlAlcance(
  sesion: PersonaEnSesion,
  id: string,
): Promise<MaterialLeido | null> {
  const [material] = await leerMateriales(eq(almacenMateriales.id, id));
  if (!material || !alcanzaLaObra(sesion, material.obraId)) return null;
  return material;
}

/** Los movimientos de esos materiales, en la forma que piden las reglas. */
export async function movimientosDe(
  materialIds: readonly string[],
): Promise<(MovimientoRegistrado & { materialId: string })[]> {
  if (materialIds.length === 0) return [];

  const filas = await baseServidor()
    .select({
      id: almacenMovimientos.id,
      materialId: almacenMovimientos.materialId,
      tipo: almacenMovimientos.tipo,
      fecha: almacenMovimientos.fecha,
      cantidad: almacenMovimientos.cantidad,
      creadoEn: almacenMovimientos.creadoEn,
      anuladoEn: almacenMovimientos.anuladoEn,
    })
    .from(almacenMovimientos)
    .where(inArray(almacenMovimientos.materialId, [...materialIds]));

  return filas.map((f) => ({
    id: f.id,
    materialId: f.materialId,
    tipo: f.tipo,
    fecha: f.fecha,
    cantidad: cantidadDeLaBase(f.cantidad),
    registradoEn: f.creadoEn.toISOString(),
    anulado: f.anuladoEn !== null,
  }));
}

/**
 * `numeric` llega como texto («70.00»). Si alguna vez llegara algo que no se
 * puede leer, es un fallo del servidor y no un cero silencioso: un stock
 * inventado es peor que un error.
 */
export function cantidadDeLaBase(valor: string): number {
  const centesimas = aCentesimas(valor);
  if (centesimas === null) throw new Error(`Cantidad ilegible en la base: ${valor}`);
  return centesimas;
}

/** Cada material con sus totales, calculados por la regla. */
export function filasDeMateriales(
  materiales: readonly MaterialLeido[],
  movimientos: readonly (Pick<MovimientoRegistrado, 'tipo' | 'cantidad' | 'anulado'> & {
    materialId: string;
  })[],
): MaterialDeAlmacenFila[] {
  return materiales.map((material) => {
    const propios = movimientos.filter((m) => m.materialId === material.id);
    return { ...material, ...totalesDelMaterial(propios), movimientos: propios.length };
  });
}

/** Un solo material con sus totales, leyendo sus movimientos. */
export async function filaDeMaterial(material: MaterialLeido): Promise<MaterialDeAlmacenFila> {
  return filasDeMateriales([material], await movimientosDe([material.id]))[0];
}

/**
 * El stock de un material **en SQL**, para las guardas de las escrituras.
 *
 * Dice lo mismo que `totalesDelMaterial` —ingresos menos salidas, sin los
 * anulados— y no la sustituye: la decisión y su texto salen de la regla. Esto
 * solo existe para que la base compruebe la condición en la misma sentencia que
 * escribe (ver el comentario del módulo).
 */
export function stockEnSql(materialId: string): SQL {
  return sql`(
    select coalesce(sum(case when ${almacenMovimientos.tipo} = 'ingreso'
                             then ${almacenMovimientos.cantidad}
                             else -${almacenMovimientos.cantidad} end), 0)
    from ${almacenMovimientos}
    where ${almacenMovimientos.materialId} = ${materialId}
      and ${almacenMovimientos.anuladoEn} is null
  )`;
}

/** ¿Tiene algún movimiento, anulado o no? En SQL, para la guarda del cambio de unidad. */
export function sinMovimientosEnSql(materialId: string): SQL {
  return sql`not exists (
    select 1 from ${almacenMovimientos} where ${almacenMovimientos.materialId} = ${materialId}
  )`;
}
