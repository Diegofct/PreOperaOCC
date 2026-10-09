/**
 * Los catálogos de una obra contra los que se lee una propuesta de WhatsApp (spec
 * 021; cambio del 2026-10-08, RF-105). **Solo servidor.**
 *
 * Vivía en `bandeja.ts`. Sale de ahí porque la spec 024 los necesita también para
 * guardar sin bandeja, y dos copias de esta lectura acabarían reconociendo distinto
 * el mismo mensaje.
 *
 * Además de los equipos, las personas, Control Cantera y el almacén, trae lo que
 * necesitan los dos caminos nuevos del conductor:
 *
 *  · los preoperacionales vigentes de las volquetas de la obra en los días que se
 *    piden —el del hecho y el del mensaje, porque el del hecho sale de la propuesta
 *    y puede faltar—, por día de Colombia;
 *  · el conductor del último viaje vigente de cada volqueta de la obra.
 */
import { and, desc, eq, inArray, isNull, or, sql } from 'drizzle-orm';

import { baseServidor } from '@/db/servidor/cliente';
import {
  canteraViajes,
  preoperacionales,
  tiposVehiculo,
  usuarios,
  vehiculos,
} from '@/db/servidor/esquema';
import { materialesConStock } from '@/features/almacen-obra/servidor/materiales';
import { opcionesDeLaObra } from '@/features/cantera/servidor/viajes';
import type { DetalleDePropuesta, OpcionesDeCantera } from '@/features/panel/contratos';
import { nombreDeCargo } from '@/shared/catalogos/cargos';
import { medidorDeClase, type ClaseDeMedidor } from '@/shared/rules/jornada';
import type {
  CatalogosDeLaObra,
  PreoperacionalDelDia,
  UltimoViajeDeVolqueta,
} from '@/shared/rules/whatsapp';

/** El día de Colombia de un instante, como texto `YYYY-MM-DD`, en SQL. */
const diaDelPreoperacional = sql<string>`to_char(${preoperacionales.iniciadoEn} at time zone 'America/Bogota', 'YYYY-MM-DD')`;

/** Quién hizo el preoperacional de cada volqueta de la obra en esos días (RF-105, RF-106). */
async function preoperacionalesDeLosDias(
  obraId: string,
  dias: readonly string[],
): Promise<PreoperacionalDelDia[]> {
  const validos = [...new Set(dias.filter((d) => /^\d{4}-\d{2}-\d{2}$/.test(d)))];
  if (validos.length === 0) return [];
  return baseServidor()
    .select({
      vehiculoId: preoperacionales.vehiculoId,
      fecha: diaDelPreoperacional,
      usuarioId: preoperacionales.usuarioId,
    })
    .from(preoperacionales)
    .innerJoin(vehiculos, eq(vehiculos.id, preoperacionales.vehiculoId))
    .where(
      and(
        eq(vehiculos.obraId, obraId),
        isNull(preoperacionales.anuladoEn),
        inArray(diaDelPreoperacional, validos),
      ),
    );
}

/** El conductor del último viaje vigente de cada volqueta de la obra (RF-105). */
async function ultimosViajesDeLaObra(obraId: string): Promise<UltimoViajeDeVolqueta[]> {
  return baseServidor()
    .selectDistinctOn([canteraViajes.vehiculoId], {
      vehiculoId: canteraViajes.vehiculoId,
      conductorId: canteraViajes.conductorId,
    })
    .from(canteraViajes)
    .where(and(eq(canteraViajes.obraId, obraId), isNull(canteraViajes.anuladoEn)))
    .orderBy(
      canteraViajes.vehiculoId,
      desc(canteraViajes.fecha),
      desc(canteraViajes.hora),
      desc(canteraViajes.creadoEn),
    );
}

/**
 * Los catálogos de la obra contra los que se lee una propuesta, el medidor de cada
 * equipo, y las opciones que ofrece la pantalla. `dias` son los días del reporte que
 * pueden importar para el preoperacional.
 */
export async function catalogosDeLaObra(
  obraId: string,
  dias: readonly string[],
): Promise<{
  catalogos: CatalogosDeLaObra;
  claseDe: Map<string, ClaseDeMedidor>;
  cargoDe: Map<string, string | null>;
  /** Las personas registradas en esta obra, para las posibles coincidencias (023/RF-65). */
  personasDeLaObra: { id: string; nombreCompleto: string; cargo: string | null }[];
  opciones: DetalleDePropuesta['opciones'];
}> {
  const db = baseServidor();
  const [equipos, personas, cantera, almacen, preoperacionalesDelDia, ultimosViajes] = await Promise.all([
    db
      .select({
        id: vehiculos.id,
        codigoInterno: vehiculos.codigoInterno,
        placa: vehiculos.placa,
        obraId: vehiculos.obraId,
        clase: tiposVehiculo.claseMedidor,
      })
      .from(vehiculos)
      .innerJoin(tiposVehiculo, eq(tiposVehiculo.id, vehiculos.tipoVehiculoId))
      .where(
        and(
          isNull(vehiculos.eliminadoEn),
          or(eq(vehiculos.obraId, obraId), isNull(vehiculos.obraId)),
        ),
      ),
    db
      .select({
        id: usuarios.id,
        nombreCompleto: usuarios.nombreCompleto,
        cargo: usuarios.cargo,
        obraId: usuarios.obraId,
      })
      .from(usuarios)
      .where(isNull(usuarios.eliminadoEn)),
    opcionesDeLaObra(obraId),
    materialesConStock(obraId),
    preoperacionalesDeLosDias(obraId, dias),
    ultimosViajesDeLaObra(obraId),
  ]);

  return {
    catalogos: {
      obraId,
      vehiculos: equipos,
      personas,
      sitios: cantera.sitios,
      materiales: cantera.materiales,
      materialesAlmacen: almacen,
      preoperacionales: preoperacionalesDelDia,
      ultimosViajes,
    },
    claseDe: new Map(equipos.map((e) => [e.id, medidorDeClase(e.clase)])),
    cargoDe: new Map(personas.map((p) => [p.id, p.cargo])),
    personasDeLaObra: personas
      .filter((p) => p.obraId === obraId)
      .map(({ id, nombreCompleto, cargo }) => ({
        id,
        nombreCompleto,
        cargo: cargo ? nombreDeCargo(cargo) : null,
      })),
    opciones: {
      almacen,
      equipos: equipos
        .map(({ id, codigoInterno, placa }) => ({ id, codigoInterno, placa }))
        .sort((a, b) => a.codigoInterno.localeCompare(b.codigoInterno, 'es')),
      personas: personas
        .map(({ id, nombreCompleto, cargo }) => ({
          id,
          nombreCompleto,
          cargo: cargo ? nombreDeCargo(cargo) : null,
        }))
        .sort((a, b) => a.nombreCompleto.localeCompare(b.nombreCompleto, 'es')),
      cantera: cantera satisfies OpcionesDeCantera,
    },
  };
}
