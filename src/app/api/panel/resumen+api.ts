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
import { formatoPendiente } from '@/shared/catalogos/tipos-vehiculo';
import { cumplimientoDelDia } from '@/shared/rules/cumplimiento';
import { horarioEfectivo, horasDeLaPersona } from '@/shared/rules/horas';
import {
  avanceDeMedidor,
  fechaDeJornada,
  PERIODOS,
  restarDias,
  type Periodo,
} from '@/shared/rules/jornada';

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
        anuladoEn: partesDeObra.anuladoEn,
        horario: partesDeObra.horario,
        horarioDeLaObra: obras.horario,
      })
      .from(partesDeObra)
      .innerJoin(obras, eq(obras.id, partesDeObra.obraId))
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

      // Las extras se cuentan con el horario de cada parte, el mismo que usa el
      // parte en pantalla (spec 016): con uno fijo, el Inicio y el parte darían
      // cifras distintas para las mismas personas.
      const horario = horarioEfectivo(parte, parte.horarioDeLaObra);
      // Lo reportado manda sobre el cálculo (spec 025, RF-14, RF-17); una persona con
      // novedad y sin horas cuenta, con 0 horas (RF-22).
      for (const persona of parte.personal) {
        const horas = horasDeLaPersona(parte.fecha, persona, horario);
        if (!horas) {
          if (persona.novedad) personasContadas++;
          continue;
        }
        minutosPersonal += horas.trabajados;
        minutosExtra += horas.extra;
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
    const inspeccionadosHoy = new Set(vivas.map((i) => i.vehiculoId));
    const noAptos = vivas.filter((i) => i.resultado === 'no_apto').length;

    const flota = await db
      .select({ id: vehiculos.id, tipoVehiculoId: vehiculos.tipoVehiculoId })
      .from(vehiculos)
      .innerJoin(tiposVehiculo, eq(tiposVehiculo.id, vehiculos.tipoVehiculoId))
      .where(and(isNull(vehiculos.eliminadoEn), filtroDeObra(sesion, vehiculos.obraId)));

    // Solo cuentan los equipos a los que se les puede levantar preoperacional
    // (spec 019, RF-21 a RF-23): uno de un tipo sin formato no está pendiente.
    const dia = cumplimientoDelDia(
      flota.map((v) => ({ id: v.id, conFormato: !formatoPendiente(v.tipoVehiculoId) })),
      inspeccionadosHoy,
    );

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
      equiposInspeccionables: dia.inspeccionables,
      // Sin equipos inspeccionables el porcentaje no es cero, es «no aplica»:
      // una obra sin flota —o solo con equipos sin formato— no incumple nada.
      cumplimiento: dia.cumplimiento,
      inspeccionadosHoy: dia.inspeccionados,
      sinInspeccionar: dia.sinInspeccionar,
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
