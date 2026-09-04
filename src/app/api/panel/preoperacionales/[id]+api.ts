import { aliasedTable, eq } from 'drizzle-orm';

import { baseServidor } from '@/db/servidor/cliente';
import { obras, plantillas, preoperacionales, tiposVehiculo, usuarios, vehiculos } from '@/db/servidor/esquema';
import { alcanzaLaObra } from '@/features/servidor/alcance';
import { requerirSesion } from '@/features/servidor/guardia';
import { noEncontrado, ok, responder } from '@/features/servidor/respuestas';

/**
 * Un preoperacional entero. `GET /api/panel/preoperacionales/:id`.
 *
 * Devuelve las respuestas **y la plantilla con la que se firmó**, no la última
 * publicada. Es lo que permite imprimir el registro tal como lo vio el operador
 * ese día aunque el formato haya cambiado tres veces desde entonces — la misma
 * razón por la que las respuestas se guardan auto-descritas, con su etiqueta
 * dentro de cada una.
 */
const operador = aliasedTable(usuarios, 'operador');

export async function GET(peticion: Request, { id }: { id: string }) {
  return responder(async () => {
    const sesion = await requerirSesion(peticion);
    if (sesion instanceof Response) return sesion;

    const db = baseServidor();

    const [fila] = await db
      .select({
        id: preoperacionales.id,
        vehiculoId: preoperacionales.vehiculoId,
        vehiculoCodigo: vehiculos.codigoInterno,
        placa: vehiculos.placa,
        tipoNombre: tiposVehiculo.nombre,
        obraId: preoperacionales.obraId,
        obraNombre: obras.nombre,
        operadorNombre: operador.nombreCompleto,
        operadorUsuario: operador.usuario,
        plantillaTipoVehiculo: preoperacionales.plantillaTipoVehiculo,
        plantillaVersion: preoperacionales.plantillaVersion,
        periodicidades: preoperacionales.periodicidades,
        iniciadoEn: preoperacionales.iniciadoEn,
        enviadoEn: preoperacionales.enviadoEn,
        recibidoEn: preoperacionales.recibidoEn,
        odometroKm: preoperacionales.odometroKm,
        horometroH: preoperacionales.horometroH,
        respuestas: preoperacionales.respuestas,
        resultado: preoperacionales.resultado,
        cantidadInmovilizantes: preoperacionales.cantidadInmovilizantes,
        observaciones: preoperacionales.observaciones,
        desfaseRelojMs: preoperacionales.desfaseRelojMs,
        anuladoEn: preoperacionales.anuladoEn,
        motivoAnulacion: preoperacionales.motivoAnulacion,
        anuladoPor: preoperacionales.anuladoPor,
      })
      .from(preoperacionales)
      .innerJoin(vehiculos, eq(vehiculos.id, preoperacionales.vehiculoId))
      .innerJoin(tiposVehiculo, eq(tiposVehiculo.id, vehiculos.tipoVehiculoId))
      .innerJoin(operador, eq(operador.id, preoperacionales.usuarioId))
      .leftJoin(obras, eq(obras.id, preoperacionales.obraId))
      .where(eq(preoperacionales.id, id))
      .limit(1);

    // "No existe" y no "no puede": confirmar que el id es real le diría a un
    // residente qué se registra en las obras que no le tocan.
    if (!fila || !alcanzaLaObra(sesion, fila.obraId)) return noEncontrado('ese preoperacional');

    const anuladoPorNombre = fila.anuladoPor
      ? ((
          await db
            .select({ nombre: usuarios.nombreCompleto })
            .from(usuarios)
            .where(eq(usuarios.id, fila.anuladoPor))
            .limit(1)
        )[0]?.nombre ?? null)
      : null;

    const [plantilla] = await db
      .select({ esquema: plantillas.esquema })
      .from(plantillas)
      .where(eq(plantillas.id, `${fila.plantillaTipoVehiculo}-v${fila.plantillaVersion}`))
      .limit(1);

    return ok({ ...fila, anuladoPorNombre, plantilla: plantilla?.esquema ?? null });
  });
}
