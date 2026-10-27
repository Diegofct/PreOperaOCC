/**
 * Los reportes del módulo de Reportes (spec 030), por pestaña. **Solo servidor.**
 *
 * Una función por pestaña: cada una lee solo lo suyo (Máquinas no lee el personal).
 * Todas devuelven el periodo, los días con la bitácora abierta (RF-7) y sus cifras
 * (RF-8); lo demás es de cada una. Los cálculos son las reglas puras de
 * `rules/reportes.ts`, con las mismas cuentas de horas que la bitácora (RF-56).
 *
 * Lo usan la consulta (`GET /api/panel/reportes/:pestana`) y la descarga en Excel, para
 * que el archivo diga lo mismo que la pantalla.
 */
import { eq } from 'drizzle-orm';

import { baseServidor } from '@/db/servidor/cliente';
import { obras } from '@/db/servidor/esquema';
import { nombreDeCargo } from '@/shared/catalogos/cargos';
import { ensayosDeLosPartes, type FilaDeCalidadLeida } from '@/shared/rules/ensayos-de-obra';
import {
  calidadPorEnsayo,
  cantidadesPorItem,
  claveDeCantidad,
  climaDelPeriodo,
  conContratado,
  horasDelPersonal,
  usoDeMaquinas,
  viajesAgrupados,
} from '@/shared/rules/reportes';

import {
  actividadesHasta,
  contratadoDeLaObra,
  partesDelPeriodo,
  preoperacionalesDelPeriodo,
  vehiculosDeLaObra,
  viajesDelPeriodo,
  type PedidoDeReporte,
} from './datos';
import { mantenimientoDeLaObra, resumenDeMantenimiento } from './mantenimientos';

export type PestanaDeReporte =
  | 'maquinas'
  | 'mantenimiento'
  | 'personal'
  | 'actividades'
  | 'cantera'
  | 'calidad'
  | 'clima';

const PESTANAS = {
  maquinas: reporteDeMaquinas,
  mantenimiento: reporteDeMantenimiento,
  personal: reporteDePersonal,
  actividades: reporteDeActividades,
  cantera: reporteDeCantera,
  calidad: reporteDeCalidad,
  clima: reporteDeClima,
} satisfies Record<PestanaDeReporte, (pedido: PedidoDeReporte) => Promise<object>>;

export function esPestanaDeReporte(valor: string): valor is PestanaDeReporte {
  return valor in PESTANAS;
}

/**
 * Lo que devuelve el reporte de cada pestaña, con la obra de la que habla: lo usan la
 * pantalla, la exportación (que es pura) y la página para imprimir.
 */
export type ReporteDe<P extends PestanaDeReporte> = Awaited<ReturnType<(typeof PESTANAS)[P]>> & {
  obra: { codigo: string; nombre: string } | null;
};

/** El reporte de una pestaña para la obra y el periodo pedidos. */
export async function reporteDe<P extends PestanaDeReporte>(pestana: P, pedido: PedidoDeReporte): Promise<ReporteDe<P>> {
  const [datos, [obra]] = await Promise.all([
    PESTANAS[pestana](pedido) as ReturnType<(typeof PESTANAS)[P]>,
    baseServidor().select({ codigo: obras.codigo, nombre: obras.nombre }).from(obras).where(eq(obras.id, pedido.obraId)).limit(1),
  ]);
  return { ...(datos as Awaited<ReturnType<(typeof PESTANAS)[P]>>), obra: obra ?? null };
}

/** Lo común de todas: el periodo y los días que siguen abiertos (RF-4, RF-7). */
function encabezado(pedido: PedidoDeReporte, partes: readonly { fecha: string; abierta: boolean }[]) {
  return {
    obraId: pedido.obraId,
    periodo: { ...pedido.periodo, dias: pedido.dias },
    abiertas: partes.filter((p) => p.abierta).map((p) => p.fecha).sort(),
  };
}

/** Máquinas (RF-11 a RF-21). */
async function reporteDeMaquinas(pedido: PedidoDeReporte) {
  const [partes, vehiculos, preoperacionales, mantenimiento] = await Promise.all([
    partesDelPeriodo(pedido),
    vehiculosDeLaObra(pedido.obraId),
    preoperacionalesDelPeriodo(pedido),
    resumenDeMantenimiento(pedido.obraId),
  ]);
  const { maquinas, cifras } = usoDeMaquinas({
    dias: pedido.dias,
    partes: partes.map((p) => ({ fecha: p.fecha, abierta: p.abierta, maquinaria: p.maquinaria })),
    vehiculos: vehiculos.map((v) => ({ id: v.id, codigo: v.codigo, tipo: v.tipo, claseMedidor: v.claseMedidor })),
    preoperacionales,
  });
  return {
    ...encabezado(pedido, partes),
    // Las alertas vencidas, con las demás cifras (RF-21).
    cifras: { ...cifras, mantenimientosVencidos: mantenimiento.vencidas },
    // El estado de mantenimiento junto a cada máquina (RF-20). Las de otra obra no lo llevan.
    maquinas: maquinas.map((m) => ({ ...m, mantenimiento: mantenimiento.porVehiculo.get(m.vehiculoId) ?? null })),
  };
}

/** Mantenimiento (RF-22 a RF-35): el estado de cada máquina de la obra y el historial. No depende del periodo. */
async function reporteDeMantenimiento(pedido: PedidoDeReporte) {
  const { maquinas, historial } = await mantenimientoDeLaObra(pedido.obraId);
  return {
    ...encabezado(pedido, []),
    cifras: {
      correctivosPendientes: maquinas.filter((m) => m.correctivosPendientes.length > 0).length,
      vencidas: maquinas.filter((m) => Object.values(m.clases).some((c) => c.estado === 'vencido')).length,
      proximas: maquinas.filter((m) => Object.values(m.clases).some((c) => c.estado === 'proximo')).length,
      sinRegistro: maquinas.filter((m) => Object.values(m.clases).some((c) => c.estado === 'sin_registro')).length,
      fueraDeServicio: maquinas.filter((m) => m.fueraDeServicio).length,
    },
    maquinas,
    historial,
  };
}

/** Personal (RF-44 a RF-50). */
async function reporteDePersonal(pedido: PedidoDeReporte) {
  const partes = await partesDelPeriodo(pedido);
  const { personas, cifras } = horasDelPersonal({
    dias: pedido.dias,
    partes: partes.map((p) => ({ fecha: p.fecha, abierta: p.abierta, horario: p.horario, personal: p.personal })),
  });
  return {
    ...encabezado(pedido, partes),
    cifras,
    // El cargo con su nombre, como en la bitácora: «residente_1» no se lee (004/RF-20).
    personas: personas.map((p) => ({ ...p, cargo: p.cargo ? nombreDeCargo(p.cargo) : null })),
  };
}

/** Actividades (RF-51, RF-52). */
async function reporteDeActividades(pedido: PedidoDeReporte) {
  const [partes, todas, contratado] = await Promise.all([
    partesDelPeriodo(pedido),
    actividadesHasta(pedido.obraId, pedido.periodo.hasta),
    contratadoDeLaObra(pedido.obraId),
  ]);
  const delPeriodo = cantidadesPorItem(partes.map((p) => ({ fecha: p.fecha, actividades: p.actividades })));
  // Spec 031, RF-68: lo acumulado desde el primer día y lo contratado del vigente.
  const acumulado = new Map(cantidadesPorItem(todas).items.map((i) => [claveDeCantidad(i), i.cantidad]));
  const items = conContratado(delPeriodo.items, contratado, acumulado);
  const otras = delPeriodo.otras;
  return {
    ...encabezado(pedido, partes),
    cifras: {
      items: items.length,
      otras: otras.length,
      diasConActividades: partes.filter((p) => p.actividades.length > 0).length,
    },
    items,
    otras,
  };
}

/** Cantera (RF-53). Los viajes no son de la bitácora: las abiertas no aplican. */
async function reporteDeCantera(pedido: PedidoDeReporte) {
  const viajes = await viajesDelPeriodo(pedido);
  const agrupados = viajesAgrupados(viajes);
  return {
    ...encabezado(pedido, []),
    cifras: {
      viajes: agrupados.total,
      volquetas: agrupados.porVolqueta.length,
      materiales: agrupados.porMaterial.length,
      dias: new Set(viajes.map((v) => v.fecha)).size,
    },
    ...agrupados,
  };
}

/** Control de calidad (RF-54), con los mismos ensayos que «Ensayos de obra» de Laboratorio. */
async function reporteDeCalidad(pedido: PedidoDeReporte) {
  const partes = await partesDelPeriodo(pedido);
  const ensayos = ensayosDeLosPartes(
    partes.map((p) => ({
      id: p.id,
      obraId: pedido.obraId,
      fecha: p.fecha,
      cerrada: !p.abierta,
      laboratorio: p.laboratorio as unknown as readonly FilaDeCalidadLeida[],
    })),
  );
  const { porEnsayo, noCumplen } = calidadPorEnsayo(ensayos);
  return {
    ...encabezado(pedido, partes),
    cifras: {
      ensayos: ensayos.length,
      cumplen: ensayos.filter((e) => e.cumple === 'si').length,
      noCumplen: noCumplen.length,
      sinDato: ensayos.filter((e) => e.cumple === null).length,
    },
    porEnsayo,
    noCumplen,
  };
}

/** Clima y novedades (RF-55). */
async function reporteDeClima(pedido: PedidoDeReporte) {
  const partes = await partesDelPeriodo(pedido);
  const { dias, diasConLluvia, diasSinTrabajo, diasConBitacora } = climaDelPeriodo({
    dias: pedido.dias,
    partes: partes.map((p) => ({
      fecha: p.fecha,
      abierta: p.abierta,
      clima: p.clima,
      sinTrabajo: p.sinTrabajo,
      motivoSinTrabajo: p.motivoSinTrabajo,
      sinActividades: p.sinActividades,
      motivoSinActividades: p.motivoSinActividades,
      sinEnsayos: p.sinEnsayos,
      motivoSinEnsayos: p.motivoSinEnsayos,
      notas: p.notas,
    })),
  });
  return { ...encabezado(pedido, partes), cifras: { diasConBitacora, diasConLluvia, diasSinTrabajo }, dias };
}
