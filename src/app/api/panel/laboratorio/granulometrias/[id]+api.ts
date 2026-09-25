import { and, eq, inArray, isNull, sql } from 'drizzle-orm';

import { baseServidor } from '@/db/servidor/cliente';
import { ensayosGranulometria } from '@/db/servidor/esquema';
import {
  calculoParaGuardar,
  enFrase,
  ensayoAlAlcance,
  leerDetalle,
  rechazoConCampos,
} from '@/features/laboratorio/servidor/ensayos';
import { ensayoEditado } from '@/features/panel/contratos';
import { requerirPermiso } from '@/features/servidor/guardia';
import { cuerpoJson, errorDePeticion, noEncontrado, ok, responder } from '@/features/servidor/respuestas';
import { franjaPorId } from '@/shared/catalogos/franjas-granulometricas';
import {
  claveDeInforme,
  transicionPermitida,
  validarEnsayo,
  type EnsayoAValidar,
} from '@/shared/rules/granulometria';
import { fechaDeJornada } from '@/shared/rules/jornada';

/**
 * Un ensayo de granulometría (spec 018).
 *
 * `GET /api/panel/laboratorio/granulometrias/:id` — el ensayo entero, con lo
 * calculado, las firmas y la historia.
 *
 * `PATCH` — corregir un borrador o un devuelto (RF-22, RF-31, RF-71). Enviado o
 * aprobado no lo corrige nadie (RF-76, RF-85): responde 409 con su estado.
 *
 * ── Qué pasa con lo que no viene ──
 *
 * Nada: ausente es «no se toca» y `null` es «se borra» (`AGENTS.md`). Las masas y los
 * retenidos llegan solo los que cambian y se funden con los guardados. Después se
 * valida **el ensayo resultante**, no solo lo que llegó: una tara correcta puede
 * volver imposible una masa seca que ya estaba.
 *
 * ── La franja ──
 *
 * Si no se toca, se sigue juzgando con la copia guardada, aunque el catálogo haya
 * cambiado (RF-21). Si se escoge otra, se copia entera la del catálogo (RF-22).
 */

const e = ensayosGranulometria;

export async function GET(peticion: Request, { id }: { id: string }) {
  return responder(async () => {
    const sesion = await requerirPermiso(peticion, 'laboratorio', 'listar');
    if (sesion instanceof Response) return sesion;

    if (!(await ensayoAlAlcance(sesion, id))) return noEncontrado('ese ensayo');
    const detalle = await leerDetalle(id);
    return detalle ? ok(detalle) : noEncontrado('ese ensayo');
  });
}

export async function PATCH(peticion: Request, { id }: { id: string }) {
  return responder(async () => {
    const sesion = await requerirPermiso(peticion, 'laboratorio', 'escribir');
    if (sesion instanceof Response) return sesion;

    const cambios = await cuerpoJson(peticion, ensayoEditado);

    const guardado = await ensayoAlAlcance(sesion, id);
    if (!guardado) return noEncontrado('ese ensayo');
    if (!transicionPermitida(guardado.visible, 'editar')) {
      return errorDePeticion(`Este ensayo está ${enFrase(guardado.visible)} y ya no se puede corregir.`, 409);
    }

    const tomar = <T>(nuevo: T | undefined, actual: T): T => (nuevo === undefined ? actual : nuevo);

    const resultante: EnsayoAValidar = {
      material: tomar(cambios.material, guardado.material),
      fuente: tomar(cambios.fuente, guardado.fuente),
      localizacion: tomar(cambios.localizacion, guardado.localizacion),
      numeroInforme: tomar(cambios.numeroInforme, guardado.numeroInforme),
      fechaRecepcion: tomar(cambios.fechaRecepcion, guardado.fechaRecepcion),
      fechaEjecucion: tomar(cambios.fechaEjecucion, guardado.fechaEjecucion),
      franjaId: tomar(cambios.franjaId, guardado.franjaId),
      masas: { ...guardado.masas, ...cambios.masas },
      retenidos: { ...guardado.retenidos, ...cambios.retenidos },
    };

    const errores = validarEnsayo(resultante, fechaDeJornada(), 'borrador');
    if (errores.length > 0) return rechazoConCampos(errores);

    const franja =
      cambios.franjaId === undefined
        ? guardado.franja
        : cambios.franjaId === null
          ? null
          : (franjaPorId(cambios.franjaId) ?? null);
    const { resultado, veredicto } = calculoParaGuardar(resultante, franja);

    // Una sola sentencia, condicionada a que siga corregible y a que nadie lo haya
    // guardado entre la lectura y aquí: sin transacciones, `actualizado_en` es el
    // testigo. Si no toca ninguna fila, se dice en qué quedó (RF-93).
    const [fila] = await baseServidor()
      .update(e)
      .set({
        material: resultante.material,
        fuente: resultante.fuente,
        localizacion: resultante.localizacion,
        numeroInforme: resultante.numeroInforme,
        claveInforme: resultante.numeroInforme ? claveDeInforme(resultante.numeroInforme) : null,
        fechaRecepcion: resultante.fechaRecepcion,
        fechaEjecucion: resultante.fechaEjecucion,
        franjaId: franja?.id ?? null,
        franja,
        masas: resultante.masas,
        retenidos: resultante.retenidos,
        observaciones: tomar(cambios.observaciones, guardado.observaciones),
        resultado,
        veredicto,
        actualizadoEn: new Date(),
      })
      .where(
        and(
          eq(e.id, id),
          inArray(e.estado, ['borrador', 'devuelto']),
          isNull(e.anuladoEn),
          isNull(e.descartadoEn),
          // Truncado: Postgres guarda microsegundos y el `Date` leído, milisegundos.
          // Comparados tal cual no coincidirían nunca con una fila puesta por `now()`.
          sql`date_trunc('milliseconds', ${e.actualizadoEn}) = ${guardado.actualizadoEn.toISOString()}::timestamptz`,
        ),
      )
      .returning({ id: e.id });

    if (!fila) {
      const ahora = await ensayoAlAlcance(sesion, id);
      return errorDePeticion(
        ahora && ahora.visible !== guardado.visible
          ? `Este ensayo pasó a ${enFrase(ahora.visible)} mientras lo corregía.`
          : 'Alguien guardó este ensayo mientras usted lo corregía. Vuelva a abrirlo.',
        409,
      );
    }

    return ok(await leerDetalle(id));
  });
}
