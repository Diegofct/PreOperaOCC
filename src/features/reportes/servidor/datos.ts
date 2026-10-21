/**
 * Lo que leen los reportes (spec 030, RF-2, RF-6, RF-11, RF-16). **Solo servidor.**
 *
 * Las reglas que arman cada reporte son puras (`shared/rules/reportes.ts`); aquí se
 * decide de qué obra y de qué periodo se habla, y se leen las filas: las bitácoras no
 * anuladas del periodo con el horario con que se cuentan sus horas, los vehículos de
 * la obra y quién hizo el preoperacional de cada máquina cada día.
 */
import { and, between, eq, isNull, lte, or, sql } from 'drizzle-orm';

import { baseServidor } from '@/db/servidor/cliente';
import { alias } from 'drizzle-orm/pg-core';

import {
  canteraMateriales,
  canteraSitios,
  canteraViajes,
  obras,
  partesDeObra,
  preoperacionales,
  presupuestos,
  tiposVehiculo,
  usuarios,
  vehiculos,
} from '@/db/servidor/esquema';
import type { PersonaEnSesion } from '@/features/servidor/guardia';
import { errorDePeticion } from '@/features/servidor/respuestas';
import { horarioEfectivo } from '@/shared/rules/horas';
import { fechaDeJornada, medidorDeClase } from '@/shared/rules/jornada';
import { diasDe, esTipoDePeriodo, periodoDe, type PeriodoDeReporte } from '@/shared/rules/periodos';

const FECHA = /^\d{4}-\d{2}-\d{2}$/;

export interface PedidoDeReporte {
  obraId: string;
  periodo: PeriodoDeReporte;
  dias: string[];
}

/**
 * La obra y el periodo de la petición (RF-2, RF-4, RF-5), o la respuesta de error.
 *
 *  · El residente, su obra, pida lo que pida. La gerencia, la que pida; sin pedirla
 *    no hay reporte, porque mezclar obras no tiene sentido en un reporte de obra.
 *  · `tipo` día, semana o mes, por defecto la semana; `fecha` la de referencia, por
 *    defecto hoy en la obra.
 */
export function pedidoDeReporte(sesion: PersonaEnSesion, url: URL): PedidoDeReporte | Response {
  const parametros = url.searchParams;
  const obraId = sesion.rol === 'admin' ? parametros.get('obraId') : sesion.obraId;
  if (!obraId) {
    return errorDePeticion(sesion.rol === 'admin' ? 'Elija la obra.' : 'Su usuario no tiene obra asignada.');
  }
  const tipo = parametros.get('tipo') ?? 'semana';
  if (!esTipoDePeriodo(tipo)) return errorDePeticion('El periodo es día, semana o mes.');
  const fecha = parametros.get('fecha') ?? fechaDeJornada();
  if (!FECHA.test(fecha)) return errorDePeticion('La fecha va en formato AAAA-MM-DD.');
  const periodo = periodoDe(tipo, fecha);
  return { obraId, periodo, dias: diasDe(periodo) };
}

/** Las bitácoras no anuladas del periodo, con el horario efectivo de cada una (RF-6, RF-56). */
export async function partesDelPeriodo(pedido: PedidoDeReporte) {
  const filas = await baseServidor()
    .select({
      id: partesDeObra.id,
      fecha: partesDeObra.fecha,
      cerradoEn: partesDeObra.cerradoEn,
      anuladoEn: partesDeObra.anuladoEn,
      maquinaria: partesDeObra.maquinaria,
      personal: partesDeObra.personal,
      actividades: partesDeObra.actividades,
      clima: partesDeObra.clima,
      laboratorio: partesDeObra.laboratorio,
      sinTrabajo: partesDeObra.sinTrabajo,
      motivoSinTrabajo: partesDeObra.motivoSinTrabajo,
      notas: partesDeObra.notas,
      horario: partesDeObra.horario,
      horarioDeLaObra: obras.horario,
    })
    .from(partesDeObra)
    .innerJoin(obras, eq(obras.id, partesDeObra.obraId))
    .where(
      and(
        eq(partesDeObra.obraId, pedido.obraId),
        isNull(partesDeObra.anuladoEn),
        between(partesDeObra.fecha, pedido.periodo.desde, pedido.periodo.hasta),
      ),
    );
  return filas.map(({ horarioDeLaObra, ...fila }) => ({
    ...fila,
    abierta: fila.cerradoEn === null,
    horario: horarioEfectivo(fila, horarioDeLaObra),
  }));
}

export type ParteLeido = Awaited<ReturnType<typeof partesDelPeriodo>>[number];

/**
 * Las actividades de todas las bitácoras no anuladas de la obra hasta una fecha (spec 031,
 * RF-68): de ahí sale lo acumulado de cada ítem, no solo lo del periodo.
 */
export async function actividadesHasta(obraId: string, hasta: string) {
  return baseServidor()
    .select({ fecha: partesDeObra.fecha, actividades: partesDeObra.actividades })
    .from(partesDeObra)
    .where(and(eq(partesDeObra.obraId, obraId), isNull(partesDeObra.anuladoEn), lte(partesDeObra.fecha, hasta)));
}

/** Lo contratado por «capítulo|ítem» en el presupuesto vigente de la obra, o vacío (spec 031, RF-68). */
export async function contratadoDeLaObra(obraId: string): Promise<Map<string, number>> {
  const [vigente] = await baseServidor()
    .select({ estructura: presupuestos.estructura })
    .from(presupuestos)
    .where(and(eq(presupuestos.obraId, obraId), eq(presupuestos.estado, 'vigente')))
    .limit(1);
  const contratado = new Map<string, number>();
  for (const g of vigente?.estructura.grupos ?? []) {
    for (const c of g.capitulos) for (const i of c.items) contratado.set(`${c.id}|${i.item}`, i.cantidad ?? 0);
  }
  return contratado;
}

/** Los vehículos vigentes de la obra, con su tipo, su medidor, su estado y su lectura (RF-11, RF-30). */
export async function vehiculosDeLaObra(obraId: string) {
  const filas = await baseServidor()
    .select({
      id: vehiculos.id,
      codigo: vehiculos.codigoInterno,
      placa: vehiculos.placa,
      tipoId: vehiculos.tipoVehiculoId,
      tipo: tiposVehiculo.nombre,
      clase: tiposVehiculo.claseMedidor,
      estado: vehiculos.estado,
      odometroKm: vehiculos.odometroKm,
      horometroH: vehiculos.horometroH,
    })
    .from(vehiculos)
    .innerJoin(tiposVehiculo, eq(tiposVehiculo.id, vehiculos.tipoVehiculoId))
    .where(and(eq(vehiculos.obraId, obraId), isNull(vehiculos.eliminadoEn)));
  return filas.map((v) => {
    const claseMedidor = medidorDeClase(v.clase);
    return {
      ...v,
      claseMedidor,
      lectura: (claseMedidor === 'odometro' ? v.odometroKm : v.horometroH) ?? null,
    };
  });
}

/** El día de Colombia del preoperacional, en SQL, como en WhatsApp (`catalogos.ts`). */
const diaDelPreoperacional = sql<string>`to_char(${preoperacionales.iniciadoEn} at time zone 'America/Bogota', 'YYYY-MM-DD')`;

/** Quién hizo el preoperacional de cada máquina de la obra cada día del periodo (RF-16). */
export async function preoperacionalesDelPeriodo(pedido: PedidoDeReporte) {
  return baseServidor()
    .select({
      vehiculoId: preoperacionales.vehiculoId,
      fecha: diaDelPreoperacional,
      operadorNombre: usuarios.nombreCompleto,
    })
    .from(preoperacionales)
    .innerJoin(usuarios, eq(usuarios.id, preoperacionales.usuarioId))
    .innerJoin(vehiculos, eq(vehiculos.id, preoperacionales.vehiculoId))
    .where(
      and(
        // El de la obra; uno sin obra, por la obra de su vehículo, como en WhatsApp.
        or(
          eq(preoperacionales.obraId, pedido.obraId),
          and(isNull(preoperacionales.obraId), eq(vehiculos.obraId, pedido.obraId)),
        ),
        isNull(preoperacionales.anuladoEn),
        between(diaDelPreoperacional, pedido.periodo.desde, pedido.periodo.hasta),
      ),
    );
}

const origen = alias(canteraSitios, 'origen');
const destino = alias(canteraSitios, 'destino');

/**
 * Los viajes vigentes de la obra en el periodo, con los nombres ya resueltos (RF-53).
 * Los anulados no cuentan. La volqueta se nombra por su placa, que es como la conoce
 * la obra, o por su código si no tiene; los que van a la obra cuentan como «Obra».
 */
export async function viajesDelPeriodo(pedido: PedidoDeReporte) {
  const filas = await baseServidor()
    .select({
      fecha: canteraViajes.fecha,
      placa: vehiculos.placa,
      codigo: vehiculos.codigoInterno,
      material: canteraMateriales.nombre,
      origen: origen.nombre,
      destino: destino.nombre,
      destinoObra: canteraViajes.destinoObra,
    })
    .from(canteraViajes)
    .innerJoin(vehiculos, eq(vehiculos.id, canteraViajes.vehiculoId))
    .innerJoin(canteraMateriales, eq(canteraMateriales.id, canteraViajes.materialId))
    .innerJoin(origen, eq(origen.id, canteraViajes.origenId))
    .leftJoin(destino, eq(destino.id, canteraViajes.destinoId))
    .where(
      and(
        eq(canteraViajes.obraId, pedido.obraId),
        isNull(canteraViajes.anuladoEn),
        between(canteraViajes.fecha, pedido.periodo.desde, pedido.periodo.hasta),
      ),
    );
  return filas.map((v) => ({
    fecha: v.fecha,
    volqueta: v.placa || v.codigo,
    material: v.material,
    origen: v.origen,
    // A la obra van a muchas abscisas; contadas una por una partirían la tabla.
    destino: v.destinoObra ? 'Obra' : (v.destino ?? 'Obra'),
  }));
}

