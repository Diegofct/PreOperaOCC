/**
 * Borra del teléfono los datos de demostración, una sola vez.
 *
 * La siembra de demostración ya no existe en el código, pero **sigue existiendo
 * en los equipos que la instalaron**. Con dejarla morir no basta por dos
 * razones:
 *
 *  1. El índice único nuevo sobre `usuarios.usuario` haría **fallar el primer
 *     pull** si el servidor manda un operador real llamado `operador` mientras
 *     `demo-usuario-01` sigue ocupando ese nombre. Por eso esto corre **dentro
 *     de la misma transacción del pull y antes de insertar**: o pasa todo, o no
 *     pasa nada.
 *  2. Un vehículo `demo-` sin lápida seguiría apareciendo en el inicio del
 *     operador, porque el servidor nunca va a mandar una baja de algo que no
 *     conoce.
 *
 * **Lo que se deja en pie:** cualquier fila `demo-` referenciada por un
 * preoperacional, una bitácora o un archivo local. Esos registros son trabajo
 * del operador y no se tocan jamás — la fila se conserva para que no se queden
 * huérfanos, apagada con su lápida. Es la misma regla que ya gobierna el
 * desenrolamiento del equipo.
 */
import { eq, inArray, like, notInArray, sql } from 'drizzle-orm';

import { appKv, asignaciones, bitacoras, media, obras, preoperacionales, usuarios, vehiculos } from './schema';
import type { TransaccionLocal } from './client';

const CLAVE_HECHA = 'demo.purgada';

/** El prefijo con el que nacieron todas las filas de mentira. */
const PREFIJO = 'demo-%';

export async function yaSePurgo(db: TransaccionLocal): Promise<boolean> {
  const [fila] = await db.select().from(appKv).where(eq(appKv.clave, CLAVE_HECHA)).limit(1);
  return fila !== undefined;
}

/**
 * Corre dentro de la transacción del pull. **No abre la suya.**
 *
 * Recibe la base como parámetro justamente por eso: tiene que compartir la
 * transacción con las inserciones que vienen después, no ejecutarse aparte.
 */
export async function purgarDemostracion(db: TransaccionLocal): Promise<void> {
  // Los vehículos y usuarios que algún registro de trabajo referencia. Esos se
  // quedan: borrarlos dejaría preoperacionales firmados sin máquina ni autor.
  const vehiculosEnUso = new Set<string>();
  const usuariosEnUso = new Set<string>();

  for (const fila of await db
    .select({ vehiculoId: preoperacionales.vehiculoId, usuarioId: preoperacionales.usuarioId })
    .from(preoperacionales)) {
    vehiculosEnUso.add(fila.vehiculoId);
    usuariosEnUso.add(fila.usuarioId);
  }

  for (const fila of await db
    .select({
      vehiculoId: bitacoras.vehiculoId,
      usuarioId: bitacoras.usuarioId,
      operadorId: bitacoras.operadorId,
    })
    .from(bitacoras)) {
    vehiculosEnUso.add(fila.vehiculoId);
    usuariosEnUso.add(fila.usuarioId);
    if (fila.operadorId) usuariosEnUso.add(fila.operadorId);
  }

  const ahora = Date.now();

  // Orden inverso al de las dependencias: primero lo que apunta, luego lo
  // apuntado. Las asignaciones no las referencia nadie, así que se van enteras.
  await db.delete(asignaciones).where(like(asignaciones.id, PREFIJO));

  await borrarOApagarVehiculos(db, [...vehiculosEnUso], ahora);
  await borrarOApagarUsuarios(db, [...usuariosEnUso]);

  // Las obras solo se quedan si algún vehículo o usuario superviviente las
  // referencia; se apagan en vez de borrarse, que es más barato que averiguarlo.
  await db
    .update(obras)
    .set({ eliminadoEn: ahora, activa: false })
    .where(like(obras.id, PREFIJO));

  // Media huérfana de la demostración: no hay archivo real detrás.
  await db.delete(media).where(like(media.duenoId, PREFIJO));

  await db.insert(appKv).values({ clave: CLAVE_HECHA, valor: String(ahora) }).onConflictDoNothing();
}

async function borrarOApagarVehiculos(db: TransaccionLocal, enUso: string[], ahora: number) {
  if (enUso.length > 0) {
    await db
      .update(vehiculos)
      .set({ eliminadoEn: ahora, estado: 'fuera_servicio' })
      .where(sql`${vehiculos.id} like ${PREFIJO} and ${inArray(vehiculos.id, enUso)}`);
    await db
      .delete(vehiculos)
      .where(sql`${vehiculos.id} like ${PREFIJO} and ${notInArray(vehiculos.id, enUso)}`);
    return;
  }
  await db.delete(vehiculos).where(like(vehiculos.id, PREFIJO));
}

async function borrarOApagarUsuarios(db: TransaccionLocal, enUso: string[]) {
  if (enUso.length > 0) {
    // Se les cambia el nombre de usuario además de desactivarlos: el índice
    // único es lo que obliga, porque el servidor puede mandar un operador real
    // que se llame igual que el de demostración.
    await db
      .update(usuarios)
      .set({ activo: false, usuario: sql`'baja-' || ${usuarios.id}` })
      .where(sql`${usuarios.id} like ${PREFIJO} and ${inArray(usuarios.id, enUso)}`);
    await db
      .delete(usuarios)
      .where(sql`${usuarios.id} like ${PREFIJO} and ${notInArray(usuarios.id, enUso)}`);
    return;
  }
  await db.delete(usuarios).where(like(usuarios.id, PREFIJO));
}
