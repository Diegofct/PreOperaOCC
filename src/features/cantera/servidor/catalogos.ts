/**
 * Sitios y materiales de cantera (spec 010, RF-1 a RF-6). **Solo servidor.**
 *
 * Son dos catálogos por obra con la misma forma que los materiales del almacén: un
 * nombre normalizado con índice único parcial, corrección de nombre sin tocar los
 * viajes que los usan —apuntan por id— y baja lógica. A diferencia del almacén, la
 * baja no tiene condición: un sitio sin uso o con cien viajes se da de baja igual,
 * y sus viajes lo siguen nombrando (RF-5). Lo único que cambia es que deja de
 * ofrecerse para viajes nuevos (RF-6).
 *
 * Se escriben las funciones de los dos catálogos por separado, y no una genérica
 * sobre «la tabla que sea»: con dos tablas, la genérica costaría más tipos que las
 * dos copias cortas, y leer una consulta concreta es más fácil que leer una
 * abstracción.
 */
import { and, asc, eq, isNull, type SQL } from 'drizzle-orm';

import { baseServidor } from '@/db/servidor/cliente';
import { canteraMateriales, canteraSitios, obras } from '@/db/servidor/esquema';
import type { MaterialDeCanteraFila, SitioDeCanteraFila } from '@/features/panel/contratos';
import { alcanzaLaObra, filtroDeObra, veTodasLasObras } from '@/features/servidor/alcance';
import type { PersonaEnSesion } from '@/features/servidor/guardia';

/* ── La obra de la petición ────────────────────────────────────────────── */

/**
 * La condición de obra de un listado: la gerencia puede pedir una (o todas, sin
 * pedir); a los demás, la suya, mande lo que mande. Igual que el almacén.
 */
export function condicionDeObra(
  sesion: PersonaEnSesion,
  peticion: Request,
  columna: typeof canteraSitios.obraId | typeof canteraMateriales.obraId,
): SQL | undefined {
  const pedida = new URL(peticion.url).searchParams.get('obraId');
  return veTodasLasObras(sesion) && pedida ? eq(columna, pedida) : filtroDeObra(sesion, columna);
}

/**
 * La obra en la que se registra, o la respuesta de por qué no hay (RF-32).
 *
 * La gerencia dice cuál y tiene que existir; el encargado de planta registra en la
 * suya, y si no tiene, se le dice que la pida.
 */
export async function obraParaRegistrar(
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
    Response.json({ error: mensaje, campos: { obraId: mensaje } }, { status: 400 });

  if (!obraIdPedida) return faltaObra('Elija la obra.');

  const [obra] = await baseServidor()
    .select({ id: obras.id })
    .from(obras)
    .where(and(eq(obras.id, obraIdPedida), isNull(obras.eliminadoEn)))
    .limit(1);
  return obra ? obra.id : faltaObra('Esa obra no existe.');
}

/* ── Sitios ────────────────────────────────────────────────────────────── */

export async function leerSitios(condicion: SQL | undefined): Promise<SitioDeCanteraFila[]> {
  return baseServidor()
    .select({
      id: canteraSitios.id,
      obraId: canteraSitios.obraId,
      obraNombre: obras.nombre,
      nombre: canteraSitios.nombre,
      tipo: canteraSitios.tipo,
    })
    .from(canteraSitios)
    .leftJoin(obras, eq(obras.id, canteraSitios.obraId))
    .where(and(isNull(canteraSitios.eliminadoEn), condicion))
    .orderBy(asc(canteraSitios.nombreNormalizado));
}

/**
 * Un sitio vigente al alcance de quien pregunta, o `null`. Uno de otra obra es
 * `null` igual que uno que no existe: decir «no puede» confirmaría que el id es real.
 */
export async function sitioAlAlcance(
  sesion: PersonaEnSesion,
  id: string,
): Promise<SitioDeCanteraFila | null> {
  const [sitio] = await leerSitios(eq(canteraSitios.id, id));
  return sitio && alcanzaLaObra(sesion, sitio.obraId) ? sitio : null;
}

/* ── Materiales ────────────────────────────────────────────────────────── */

export async function leerMateriales(
  condicion: SQL | undefined,
): Promise<MaterialDeCanteraFila[]> {
  return baseServidor()
    .select({
      id: canteraMateriales.id,
      obraId: canteraMateriales.obraId,
      obraNombre: obras.nombre,
      nombre: canteraMateriales.nombre,
    })
    .from(canteraMateriales)
    .leftJoin(obras, eq(obras.id, canteraMateriales.obraId))
    .where(and(isNull(canteraMateriales.eliminadoEn), condicion))
    .orderBy(asc(canteraMateriales.nombreNormalizado));
}

export async function materialAlAlcance(
  sesion: PersonaEnSesion,
  id: string,
): Promise<MaterialDeCanteraFila | null> {
  const [material] = await leerMateriales(eq(canteraMateriales.id, id));
  return material && alcanzaLaObra(sesion, material.obraId) ? material : null;
}
