/**
 * Los viajes de cantera (spec 010, RF-7 a RF-25 y RF-30). **Solo servidor.**
 *
 * ── Qué se comprueba con la base y qué no ──
 *
 * La forma del viaje la deciden la regla (`validarViaje`) y el contrato. Aquí se
 * comprueba lo que solo la base sabe: que el material, los sitios, la volqueta y el
 * conductor existan, sigan vigentes y sean **de la obra del viaje**. Sin esto, una
 * petición hecha por fuera podría apuntar una volqueta de otra obra.
 *
 * No va en lote serializable, a diferencia del almacén: ninguna regla de esta spec
 * depende de sumar otros viajes. Si alguien da de baja un sitio en el mismo segundo
 * en que se registra un viaje, el viaje queda con ese sitio, que es lo que pasó.
 */
import { and, desc, eq, gte, isNull, lte, type SQL } from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';

import { baseServidor } from '@/db/servidor/cliente';
import {
  canteraMateriales,
  canteraSitios,
  canteraViajes,
  partesDeObra,
  usuarios,
  vehiculos,
} from '@/db/servidor/esquema';
import type { OpcionesDeCantera, ViajeFila } from '@/features/panel/contratos';
import {
  conductorElegible,
  DESTINO_OBRA,
  volquetaElegible,
  type CampoDeViaje,
} from '@/shared/rules/cantera';

import { leerMateriales, leerSitios } from './catalogos';

const conductor = alias(usuarios, 'conductor');
const registrador = alias(usuarios, 'registrador');
const anulador = alias(usuarios, 'anulador');
const origen = alias(canteraSitios, 'origen');
const destino = alias(canteraSitios, 'destino');

/**
 * Los viajes que cumplen la condición, del más reciente al más antiguo (RF-20),
 * con los nombres de todo lo que apuntan y de quién registró y anuló (RF-22).
 *
 * Los nombres salen **de hoy**: en el módulo, un sitio corregido se ve corregido
 * en todos sus viajes. Lo que se congela con el nombre de ese día es la bitácora
 * cerrada (RF-29), no este listado.
 */
export async function leerViajes(condicion: SQL | undefined): Promise<ViajeFila[]> {
  const filas = await baseServidor()
    .select({
      id: canteraViajes.id,
      obraId: canteraViajes.obraId,
      fecha: canteraViajes.fecha,
      hora: canteraViajes.hora,
      materialId: canteraViajes.materialId,
      material: canteraMateriales.nombre,
      vehiculoId: canteraViajes.vehiculoId,
      volqueta: vehiculos.codigoInterno,
      conductorId: canteraViajes.conductorId,
      conductor: conductor.nombreCompleto,
      origenId: canteraViajes.origenId,
      origen: origen.nombre,
      destinoId: canteraViajes.destinoId,
      destino: destino.nombre,
      destinoObra: canteraViajes.destinoObra,
      pr: canteraViajes.pr,
      metros: canteraViajes.metros,
      creadoEn: canteraViajes.creadoEn,
      registradoPorNombre: registrador.nombreCompleto,
      anuladoEn: canteraViajes.anuladoEn,
      anuladoPorNombre: anulador.nombreCompleto,
      motivoAnulacion: canteraViajes.motivoAnulacion,
    })
    .from(canteraViajes)
    .innerJoin(canteraMateriales, eq(canteraMateriales.id, canteraViajes.materialId))
    .innerJoin(vehiculos, eq(vehiculos.id, canteraViajes.vehiculoId))
    .innerJoin(conductor, eq(conductor.id, canteraViajes.conductorId))
    .innerJoin(origen, eq(origen.id, canteraViajes.origenId))
    .leftJoin(destino, eq(destino.id, canteraViajes.destinoId))
    .leftJoin(registrador, eq(registrador.id, canteraViajes.registradoPor))
    .leftJoin(anulador, eq(anulador.id, canteraViajes.anuladoPor))
    .where(condicion)
    .orderBy(desc(canteraViajes.fecha), desc(canteraViajes.hora), desc(canteraViajes.creadoEn));

  return filas.map(({ creadoEn, anuladoEn, ...fila }) => ({
    ...fila,
    registradoEn: creadoEn.toISOString(),
    anulado: anuladoEn !== null,
    anuladoEn: anuladoEn?.toISOString() ?? null,
  }));
}

/** Los viajes de una condición de obra en un periodo, fechas incluidas. */
export function condicionDePeriodo(obra: SQL | undefined, desde: string, hasta: string): SQL | undefined {
  return and(obra, gte(canteraViajes.fecha, desde), lte(canteraViajes.fecha, hasta));
}

/**
 * El aviso de RF-30, o `null`: si la bitácora de esa obra y ese día ya está cerrada,
 * el viaje se acepta en el módulo pero la bitácora no cambia, y hay que decirlo.
 */
export async function avisoDeBitacoraCerrada(
  obraId: string,
  fecha: string,
  que: 'registro' | 'anulacion',
): Promise<string | null> {
  // El parte vivo de esa obra y ese día: el índice único parcial garantiza que hay
  // como mucho uno sin anular.
  const [parte] = await baseServidor()
    .select({ cerradoEn: partesDeObra.cerradoEn })
    .from(partesDeObra)
    .where(
      and(
        eq(partesDeObra.obraId, obraId),
        eq(partesDeObra.fecha, fecha),
        isNull(partesDeObra.anuladoEn),
      ),
    )
    .limit(1);
  if (!parte?.cerradoEn) return null;

  return que === 'registro'
    ? `La bitácora del ${fecha} ya está cerrada: el viaje queda registrado aquí, pero la bitácora de ese día no cambia.`
    : `La bitácora del ${fecha} ya está cerrada: la anulación queda registrada aquí, pero la bitácora de ese día sigue mostrando el viaje.`;
}

/**
 * Lo que se puede elegir en un viaje de esa obra: sitios y materiales vigentes
 * (RF-6, RF-9, RF-10), volquetas elegibles (RF-8) y conductores elegibles (RF-35).
 * Qué es elegible lo deciden las reglas, no esta consulta.
 */
export async function opcionesDeLaObra(obraId: string): Promise<OpcionesDeCantera> {
  const [sitios, materiales, flota, personas] = await Promise.all([
    leerSitios(eq(canteraSitios.obraId, obraId)),
    leerMateriales(eq(canteraMateriales.obraId, obraId)),
    baseServidor()
      .select({
        id: vehiculos.id,
        codigoInterno: vehiculos.codigoInterno,
        placa: vehiculos.placa,
        obraId: vehiculos.obraId,
        tipoVehiculoId: vehiculos.tipoVehiculoId,
        estado: vehiculos.estado,
        eliminadoEn: vehiculos.eliminadoEn,
      })
      .from(vehiculos)
      .where(eq(vehiculos.obraId, obraId))
      .orderBy(vehiculos.codigoInterno),
    baseServidor()
      .select({
        id: usuarios.id,
        nombreCompleto: usuarios.nombreCompleto,
        cargo: usuarios.cargo,
        obraId: usuarios.obraId,
        activo: usuarios.activo,
        eliminadoEn: usuarios.eliminadoEn,
      })
      .from(usuarios)
      .where(eq(usuarios.obraId, obraId))
      .orderBy(usuarios.nombreCompleto),
  ]);

  return {
    sitios,
    materiales,
    volquetas: flota
      .filter((v) => volquetaElegible({ ...v, dadoDeBaja: v.eliminadoEn !== null }, obraId))
      .map(({ id, codigoInterno, placa }) => ({ id, codigoInterno, placa })),
    conductores: personas
      .filter((p) => conductorElegible({ ...p, dadoDeBaja: p.eliminadoEn !== null }, obraId))
      .map(({ id, nombreCompleto, cargo }) => ({ id, nombreCompleto, cargo })),
  };
}

/**
 * Qué de lo elegido no es de las opciones de esa obra, campo por campo. Vacío si
 * todo está bien. Compara contra las mismas opciones que ve el formulario, así que
 * lo que el panel ofrece y lo que el servidor acepta no pueden discrepar.
 */
export function eleccionesAjenas(
  opciones: OpcionesDeCantera,
  viaje: {
    materialId: string;
    vehiculoId: string;
    conductorId: string;
    origenId: string;
    destino: string;
  },
): { campo: CampoDeViaje; mensaje: string }[] {
  const hay = (lista: { id: string }[], id: string) => lista.some((x) => x.id === id);
  const ajenas: { campo: CampoDeViaje; mensaje: string }[] = [];

  if (!hay(opciones.materiales, viaje.materialId)) {
    ajenas.push({ campo: 'materialId', mensaje: 'Ese material no está disponible en esta obra.' });
  }
  if (!hay(opciones.volquetas, viaje.vehiculoId)) {
    ajenas.push({
      campo: 'vehiculoId',
      mensaje: 'Esa volqueta no está disponible: tiene que ser de esta obra y estar operativa.',
    });
  }
  if (!hay(opciones.conductores, viaje.conductorId)) {
    ajenas.push({
      campo: 'conductorId',
      mensaje: 'Esa persona no está disponible como conductor en esta obra.',
    });
  }
  if (!hay(opciones.sitios, viaje.origenId)) {
    ajenas.push({ campo: 'origenId', mensaje: 'Ese sitio no está disponible en esta obra.' });
  }
  if (viaje.destino !== DESTINO_OBRA && !hay(opciones.sitios, viaje.destino)) {
    ajenas.push({ campo: 'destino', mensaje: 'Ese sitio no está disponible en esta obra.' });
  }
  return ajenas;
}
