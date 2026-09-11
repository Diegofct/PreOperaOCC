import { and, eq, gte, isNull, lt } from 'drizzle-orm';

import { baseServidor } from '@/db/servidor/cliente';
import {
  obras,
  partesDeObra,
  preoperacionales,
  tiposVehiculo,
  vehiculos,
} from '@/db/servidor/esquema';
import { filtroDeObra } from '@/features/servidor/alcance';
import { requerirPermiso } from '@/features/servidor/guardia';
import { ok, responder } from '@/features/servidor/respuestas';
import { desglosarJornada } from '@/shared/rules/horas';
import { avanceDeMedidor, fechaDeJornada } from '@/shared/rules/jornada';

/**
 * El resumen del inicio. `GET /api/panel/resumen?periodo=hoy|semana|mes`.
 *
 * Devuelve cifras, no filas: el inicio responde «¿cómo va esto?», y para eso no
 * hace falta bajarse la operación entera al navegador.
 *
 * ── Por qué se cuenta aquí y no en el cliente ──
 *
 * El inicio ya pedía cuatro listados completos solo para contar cuántos había.
 * Con una obra de un año eso son miles de filas viajando para producir seis
 * números. Aquí se recorren en el servidor y viaja el resultado.
 *
 * ── Lo que no se mezcla ──
 *
 * Las horas de motor y los kilómetros van **por separado**. Desde la spec 003
 * la camioneta y la volqueta se miden en kilómetros y la maquinaria amarilla en
 * horas; sumarlos daría un número que no significa nada.
 */

const PERIODOS = { hoy: 0, semana: 6, mes: 29 } as const;
type Periodo = keyof typeof PERIODOS;

/** Resta días a una fecha `YYYY-MM-DD` por mediodía UTC, para no cruzar el día. */
function restarDias(fecha: string, dias: number): string {
  const base = new Date(`${fecha}T12:00:00Z`);
  base.setUTCDate(base.getUTCDate() - dias);
  return base.toISOString().slice(0, 10);
}

export async function GET(peticion: Request) {
  return responder(async () => {
    const sesion = await requerirPermiso(peticion, 'inicio', 'ver');
    if (sesion instanceof Response) return sesion;

    const pedido = new URL(peticion.url).searchParams.get('periodo');
    const periodo: Periodo = pedido === 'semana' || pedido === 'mes' ? pedido : 'hoy';

    const hoy = fechaDeJornada();
    const desdeFecha = restarDias(hoy, PERIODOS[periodo]);

    const db = baseServidor();

    /* ── Lo que trabajaron las máquinas y la gente ── */

    const partes = await db
      .select({
        fecha: partesDeObra.fecha,
        maquinaria: partesDeObra.maquinaria,
        personal: partesDeObra.personal,
        cerradoEn: partesDeObra.cerradoEn,
      })
      .from(partesDeObra)
      .where(
        and(
          gte(partesDeObra.fecha, desdeFecha),
          isNull(partesDeObra.anuladoEn),
          filtroDeObra(sesion, partesDeObra.obraId),
        ),
      );

    let horasMaquina = 0;
    let kilometros = 0;
    let minutosPersonal = 0;
    let minutosExtra = 0;
    let personasContadas = 0;

    for (const parte of partes) {
      for (const maquina of parte.maquinaria) {
        const avance = avanceDeMedidor(maquina.medidorInicial, maquina.medidorFinal);
        if (avance === null) continue;
        if (maquina.claseMedidor === 'odometro') kilometros += avance;
        else horasMaquina += avance;
      }

      for (const persona of parte.personal) {
        const desglose = desglosarJornada(parte.fecha, persona.entrada, persona.salida);
        if (!desglose) continue;
        minutosPersonal += desglose.trabajados;
        minutosExtra += desglose.extra;
        personasContadas++;
      }
    }

    /* ── El preoperacional de hoy ── */

    const inicioDelDia = new Date(`${hoy}T00:00:00.000-05:00`);
    const finDelDia = new Date(inicioDelDia.getTime() + 86_400_000);

    const inspecciones = await db
      .select({
        vehiculoId: preoperacionales.vehiculoId,
        resultado: preoperacionales.resultado,
        anuladoEn: preoperacionales.anuladoEn,
      })
      .from(preoperacionales)
      .where(
        and(
          gte(preoperacionales.iniciadoEn, inicioDelDia),
          lt(preoperacionales.iniciadoEn, finDelDia),
          filtroDeObra(sesion, preoperacionales.obraId),
        ),
      );

    const vivas = inspecciones.filter((i) => i.anuladoEn === null);
    const conFormato = new Set(vivas.map((i) => i.vehiculoId));
    const noAptos = vivas.filter((i) => i.resultado === 'no_apto').length;

    const flota = await db
      .select({ id: vehiculos.id })
      .from(vehiculos)
      .innerJoin(tiposVehiculo, eq(tiposVehiculo.id, vehiculos.tipoVehiculoId))
      .where(and(isNull(vehiculos.eliminadoEn), filtroDeObra(sesion, vehiculos.obraId)));

    const sinInspeccionar = flota.filter((v) => !conFormato.has(v.id)).length;

    /* ── Cuántas obras cubre este resumen ── */

    const obrasVisibles = await db
      .select({ id: obras.id })
      .from(obras)
      .where(and(isNull(obras.eliminadoEn), filtroDeObra(sesion, obras.id)));

    return ok({
      periodo,
      desde: desdeFecha,
      hasta: hoy,
      obras: obrasVisibles.length,
      equipos: flota.length,
      // Sin equipos activos el porcentaje no es cero, es «no aplica»: una obra
      // sin flota no está incumpliendo nada.
      cumplimiento: flota.length === 0 ? null : Math.round((conFormato.size / flota.length) * 100),
      inspeccionadosHoy: conFormato.size,
      sinInspeccionar,
      noAptos,
      horasMaquina,
      kilometros,
      partes: partes.length,
      partesCerrados: partes.filter((p) => p.cerradoEn !== null).length,
      minutosPersonal,
      minutosExtra,
      personasContadas,
    });
  });
}
