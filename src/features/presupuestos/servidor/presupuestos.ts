/**
 * Los presupuestos de una obra en el servidor (spec 031, RF-31 a RF-57). **Solo
 * servidor.**
 *
 * Cada versión es una fila con su estructura entera en un jsonb (plan, decisiones). Se
 * guarda reemplazándola completa con `where version = ?` en la misma sentencia: Neon por
 * HTTP no da transacciones, y así quien guarda sobre lo que otra persona ya cambió
 * recibe un 409 en vez de pisarlo. Antes de guardar, el servidor recalcula los totales
 * y el valor con las mismas reglas que la pantalla (constitución, principio 3).
 *
 * A lo sumo un borrador y un vigente por obra: lo garantizan los índices parciales de
 * la base; aquí solo se traduce el choque a un mensaje.
 */
import { and, desc, eq, max } from 'drizzle-orm';
import { uuidv7 } from 'uuidv7';

import { baseServidor } from '@/db/servidor/cliente';
import { presupuestos } from '@/db/servidor/esquema';
import type { PresupuestoDetalle, PresupuestoEditado, PresupuestoFila } from '@/features/panel/contratos';
import { alcanzaLaObra } from '@/features/servidor/alcance';
import type { PersonaEnSesion } from '@/features/servidor/guardia';
import { errorDePeticion, noEncontrado } from '@/features/servidor/respuestas';
import {
  ESTRUCTURA_VACIA,
  faltasParaAprobarPresupuesto,
  faltasParaGuardarPresupuesto,
  normalizarEstructura,
  resumenDelPresupuesto,
  type EstructuraDePresupuesto,
} from '@/shared/rules/presupuesto';

export const MENSAJE_DE_CHOQUE_DEL_PRESUPUESTO =
  'Otra persona cambió el presupuesto mientras usted lo editaba. Vuelva a cargarlo para ver lo último.';

const MENSAJE_DE_BORRADOR_ABIERTO = 'La obra ya tiene un borrador de presupuesto: termínelo o descártelo antes de crear otro.';

type FilaDePresupuesto = typeof presupuestos.$inferSelect;

function aFila(p: FilaDePresupuesto): PresupuestoFila {
  return {
    id: p.id,
    nombre: p.nombre,
    numeroVersion: p.numeroVersion,
    notaVersion: p.notaVersion,
    estado: p.estado,
    valor: p.valor,
    valorExcel: p.valorExcel,
    revisar: p.revisar,
    origen: p.origen,
    creadoEn: p.creadoEn.toISOString(),
    aprobadoEn: p.aprobadoEn?.toISOString() ?? null,
  };
}

/** La lista de versiones de la obra, de la más nueva a la más vieja (RF-31). */
export async function listarPresupuestos(obraId: string): Promise<PresupuestoFila[]> {
  const filas = await baseServidor()
    .select()
    .from(presupuestos)
    .where(eq(presupuestos.obraId, obraId))
    .orderBy(desc(presupuestos.numeroVersion));
  return filas.map(aFila);
}

/** El presupuesto si existe y la sesión alcanza su obra; si no, `null` (se responde 404). */
export async function presupuestoAlAlcance(sesion: PersonaEnSesion, id: string): Promise<FilaDePresupuesto | null> {
  const [fila] = await baseServidor().select().from(presupuestos).where(eq(presupuestos.id, id)).limit(1);
  return fila && alcanzaLaObra(sesion, fila.obraId) ? fila : null;
}

/** Uno, con su resumen y lo que falta para aprobarlo (RF-40, RF-50, RF-55). */
export function detalleDe(fila: FilaDePresupuesto): PresupuestoDetalle {
  return {
    ...aFila(fila),
    obraId: fila.obraId,
    version: fila.version,
    estructura: fila.estructura,
    resumen: resumenDelPresupuesto(fila.estructura),
    faltasParaAprobar: fila.estado === 'borrador' ? faltasParaAprobarPresupuesto(fila.estructura) : [],
    motivoDescarte: fila.motivoDescarte,
  };
}

/** La versión que sigue en la obra: la mayor que haya, más uno. */
export async function siguienteVersion(obraId: string): Promise<number> {
  const [fila] = await baseServidor()
    .select({ mayor: max(presupuestos.numeroVersion) })
    .from(presupuestos)
    .where(eq(presupuestos.obraId, obraId));
  return (fila?.mayor ?? 0) + 1;
}

/** El borrador abierto de la obra, si lo hay (RF-57). */
export async function borradorDeLaObra(obraId: string): Promise<FilaDePresupuesto | undefined> {
  const [fila] = await baseServidor()
    .select()
    .from(presupuestos)
    .where(and(eq(presupuestos.obraId, obraId), eq(presupuestos.estado, 'borrador')))
    .limit(1);
  return fila;
}

/** ¿Hay ya un borrador en la obra? Para explicar un choque con el índice parcial (RF-57). */
async function hayBorrador(obraId: string): Promise<boolean> {
  const [fila] = await baseServidor()
    .select({ id: presupuestos.id })
    .from(presupuestos)
    .where(and(eq(presupuestos.obraId, obraId), eq(presupuestos.estado, 'borrador')))
    .limit(1);
  return Boolean(fila);
}

/**
 * Crea un borrador (en blanco, importado o copia). Si el índice parcial lo impide, dice
 * por qué: ya hay un borrador (RF-57) o alguien tomó esa versión al mismo tiempo.
 */
export async function crearBorrador(
  sesion: PersonaEnSesion,
  obraId: string,
  datos: {
    id?: string;
    nombre: string;
    notaVersion?: string;
    estructura: EstructuraDePresupuesto;
    origen: 'excel' | 'blanco' | 'copia';
    valorExcel?: number | null;
    revisar?: boolean;
  },
): Promise<PresupuestoDetalle | Response> {
  if (await hayBorrador(obraId)) return errorDePeticion(MENSAJE_DE_BORRADOR_ABIERTO, 409);
  const estructura = normalizarEstructura(datos.estructura);
  const [creado] = await baseServidor()
    .insert(presupuestos)
    .values({
      id: datos.id ?? uuidv7(),
      obraId,
      nombre: datos.nombre,
      numeroVersion: await siguienteVersion(obraId),
      notaVersion: datos.notaVersion ?? '',
      estructura,
      valor: resumenDelPresupuesto(estructura).valor,
      valorExcel: datos.valorExcel ?? null,
      revisar: datos.revisar ?? false,
      origen: datos.origen,
      creadoPor: sesion.id,
      actualizadoPor: sesion.id,
    })
    .onConflictDoNothing()
    .returning();
  if (creado) return detalleDe(creado);
  return errorDePeticion(
    (await hayBorrador(obraId)) ? MENSAJE_DE_BORRADOR_ABIERTO : MENSAJE_DE_CHOQUE_DEL_PRESUPUESTO,
    409,
  );
}

/** Un presupuesto en blanco (RF-48), con la siguiente versión. */
export function crearEnBlanco(sesion: PersonaEnSesion, obraId: string, nombre: string) {
  return crearBorrador(sesion, obraId, { nombre, estructura: ESTRUCTURA_VACIA, origen: 'blanco' });
}

/** Por qué no entró un cambio sobre un borrador. */
function rechazoDeBorrador(fila: FilaDePresupuesto): Response {
  if (fila.estado !== 'borrador') {
    return errorDePeticion(
      'Solo se edita un borrador. Para cambiar el vigente, cree una nueva versión.',
      409,
    );
  }
  return errorDePeticion(MENSAJE_DE_CHOQUE_DEL_PRESUPUESTO, 409);
}

/** Guarda un borrador entero (RF-47), con los totales que calcula el servidor. */
export async function guardarPresupuesto(
  sesion: PersonaEnSesion,
  id: string,
  pedido: PresupuestoEditado,
): Promise<PresupuestoDetalle | Response> {
  const fila = await presupuestoAlAlcance(sesion, id);
  if (!fila) return noEncontrado('ese presupuesto');
  if (fila.estado !== 'borrador' || fila.version !== pedido.version) return rechazoDeBorrador(fila);

  const estructura = normalizarEstructura(pedido.estructura as EstructuraDePresupuesto);
  const faltas = faltasParaGuardarPresupuesto(estructura);
  if (faltas.length > 0) {
    return Response.json({ error: `No se puede guardar: ${faltas[0]}`, faltas }, { status: 400 });
  }

  const [guardado] = await baseServidor()
    .update(presupuestos)
    .set({
      nombre: pedido.nombre,
      notaVersion: pedido.notaVersion ?? '',
      estructura,
      valor: resumenDelPresupuesto(estructura).valor,
      version: pedido.version + 1,
      actualizadoPor: sesion.id,
    })
    .where(and(eq(presupuestos.id, id), eq(presupuestos.version, pedido.version), eq(presupuestos.estado, 'borrador')))
    .returning();
  if (guardado) return detalleDe(guardado);
  const actual = await presupuestoAlAlcance(sesion, id);
  return actual ? rechazoDeBorrador(actual) : noEncontrado('ese presupuesto');
}

/** Descarta un borrador, con motivo (RF-56). Queda en la lista, marcado. */
export async function descartarPresupuesto(
  sesion: PersonaEnSesion,
  id: string,
  motivo: string,
): Promise<PresupuestoDetalle | Response> {
  const fila = await presupuestoAlAlcance(sesion, id);
  if (!fila) return noEncontrado('ese presupuesto');
  if (fila.estado !== 'borrador') {
    return errorDePeticion('Solo se descarta un borrador: el vigente y los reemplazados son historia.', 409);
  }
  const [descartado] = await baseServidor()
    .update(presupuestos)
    .set({
      estado: 'descartado',
      descartadoEn: new Date(),
      descartadoPor: sesion.id,
      motivoDescarte: motivo,
      version: fila.version + 1,
      actualizadoPor: sesion.id,
    })
    .where(and(eq(presupuestos.id, id), eq(presupuestos.estado, 'borrador')))
    .returning();
  return descartado ? detalleDe(descartado) : errorDePeticion('Ese presupuesto ya no es un borrador.', 409);
}
