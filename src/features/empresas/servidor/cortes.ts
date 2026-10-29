/**
 * Los cortes financieros (spec 033, RF-34 a RF-43): leerlos por dueño, registrar,
 * anular y el Consolidado del grupo. Lo que decide —fecha futura o repetida, el último,
 * la diferencia, el total, lo desactualizado— está en `shared/rules/cortes`; aquí solo se
 * lee y se escribe.
 */

import { and, desc, eq, isNull, type SQL } from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';
import { uuidv7 } from 'uuidv7';

import { baseServidor } from '@/db/servidor/cliente';
import { cortesFinancieros, obras, usuarios } from '@/db/servidor/esquema';
import type { ConsolidadoDelGrupo, CorteFila, CorteNuevo, CortesDe } from '@/features/panel/contratos';
import { consolidado, diferenciaConElAnterior, validarCorte } from '@/shared/rules/cortes';
import { EMPRESAS_CON_CORTE, nombreDeEmpresa, type EmpresaId } from '@/shared/rules/empresas';
import { fechaDeJornada } from '@/shared/rules/jornada';

/** De quién es el corte: una empresa con corte propio o una obra. */
export type DuenoDeCortes = { empresaId: EmpresaId } | { obraId: string };

function condicionDelDueno(dueno: DuenoDeCortes): SQL {
  return 'empresaId' in dueno
    ? eq(cortesFinancieros.empresaId, dueno.empresaId)
    : eq(cortesFinancieros.obraId, dueno.obraId);
}

const anulador = alias(usuarios, 'anulador');

/** Todos los cortes del dueño, del más reciente al más antiguo, con la diferencia del último (RF-37, RF-38). */
export async function cortesDe(dueno: DuenoDeCortes): Promise<CortesDe> {
  const filas = await baseServidor()
    .select({
      id: cortesFinancieros.id,
      empresaId: cortesFinancieros.empresaId,
      obraId: cortesFinancieros.obraId,
      fechaCorte: cortesFinancieros.fechaCorte,
      saldo: cortesFinancieros.saldo,
      cuentasPorPagar: cortesFinancieros.cuentasPorPagar,
      cuentasPorCobrar: cortesFinancieros.cuentasPorCobrar,
      notas: cortesFinancieros.notas,
      registradoPor: usuarios.nombreCompleto,
      registradoEn: cortesFinancieros.registradoEn,
      anuladoEn: cortesFinancieros.anuladoEn,
      anuladoPor: anulador.nombreCompleto,
      motivoAnulacion: cortesFinancieros.motivoAnulacion,
    })
    .from(cortesFinancieros)
    .innerJoin(usuarios, eq(usuarios.id, cortesFinancieros.registradoPor))
    .leftJoin(anulador, eq(anulador.id, cortesFinancieros.anuladoPor))
    .where(condicionDelDueno(dueno))
    .orderBy(desc(cortesFinancieros.fechaCorte), desc(cortesFinancieros.registradoEn));

  const cortes: CorteFila[] = filas.map((f) => ({
    ...f,
    registradoEn: f.registradoEn.toISOString(),
    anuladoEn: f.anuladoEn?.toISOString() ?? null,
  }));
  return { cortes, diferencia: diferenciaConElAnterior(cortes) };
}

/** La obra existe y no está dada de baja: a una obra de baja no se le registran cortes. */
export async function obraVigente(obraId: string): Promise<boolean> {
  const [fila] = await baseServidor()
    .select({ id: obras.id })
    .from(obras)
    .where(and(eq(obras.id, obraId), isNull(obras.eliminadoEn)))
    .limit(1);
  return Boolean(fila);
}

export type ResultadoDeRegistrar =
  | { tipo: 'registrado'; id: string }
  | { tipo: 'rechazado'; mensaje: string; estado: 400 | 409 };

/**
 * Registra un corte si la regla lo deja (RF-34 a RF-36). La fecha repetida responde 409,
 * como el índice único que la respalda; lo demás, 400.
 */
export async function registrarCorte(corte: CorteNuevo & { notas: string }, registradoPor: string): Promise<ResultadoDeRegistrar> {
  const dueno: DuenoDeCortes = corte.empresaId ? { empresaId: corte.empresaId } : { obraId: corte.obraId! };
  const vigentes = await baseServidor()
    .select({ fechaCorte: cortesFinancieros.fechaCorte })
    .from(cortesFinancieros)
    .where(and(condicionDelDueno(dueno), isNull(cortesFinancieros.anuladoEn)));

  const error = validarCorte(corte, fechaDeJornada(), vigentes);
  if (error) {
    const repetida = vigentes.some((v) => v.fechaCorte === corte.fechaCorte);
    return { tipo: 'rechazado', mensaje: error, estado: repetida ? 409 : 400 };
  }

  const id = uuidv7();
  await baseServidor()
    .insert(cortesFinancieros)
    .values({
      id,
      empresaId: corte.empresaId ?? null,
      obraId: corte.obraId ?? null,
      fechaCorte: corte.fechaCorte,
      saldo: corte.saldo,
      cuentasPorPagar: corte.cuentasPorPagar,
      cuentasPorCobrar: corte.cuentasPorCobrar,
      notas: corte.notas,
      registradoPor,
    });
  return { tipo: 'registrado', id };
}

/**
 * Anula un corte vigente con su motivo (RF-39). `false` si no existe o ya estaba
 * anulado: anular dos veces no reescribe el primer motivo.
 */
export async function anularCorte(id: string, motivo: string, anuladoPor: string): Promise<boolean> {
  const filas = await baseServidor()
    .update(cortesFinancieros)
    .set({ anuladoEn: new Date(), anuladoPor, motivoAnulacion: motivo })
    .where(and(eq(cortesFinancieros.id, id), isNull(cortesFinancieros.anuladoEn)))
    .returning({ id: cortesFinancieros.id });
  return filas.length > 0;
}

/** El Consolidado del grupo (RF-41 a RF-43), a la fecha de la jornada. */
export async function consolidadoDelGrupo(): Promise<ConsolidadoDelGrupo> {
  const [vigentes, todasLasObras] = await Promise.all([
    baseServidor()
      .select({
        empresaId: cortesFinancieros.empresaId,
        obraId: cortesFinancieros.obraId,
        fechaCorte: cortesFinancieros.fechaCorte,
        saldo: cortesFinancieros.saldo,
        cuentasPorPagar: cortesFinancieros.cuentasPorPagar,
        cuentasPorCobrar: cortesFinancieros.cuentasPorCobrar,
      })
      .from(cortesFinancieros)
      .where(isNull(cortesFinancieros.anuladoEn)),
    baseServidor()
      .select({ id: obras.id, nombre: obras.nombre, eliminadoEn: obras.eliminadoEn })
      .from(obras)
      .orderBy(obras.nombre),
  ]);
  const comoRegla = (filas: typeof vigentes) => filas.map((f) => ({ ...f, anuladoEn: null }));

  const hoy = fechaDeJornada();
  const resultado = consolidado(
    {
      empresas: EMPRESAS_CON_CORTE.map((id) => ({
        id,
        nombre: nombreDeEmpresa(id),
        cortes: comoRegla(vigentes.filter((c) => c.empresaId === id)),
      })),
      obras: todasLasObras.map((o) => ({
        id: o.id,
        nombre: o.nombre,
        dadaDeBaja: o.eliminadoEn !== null,
        cortes: comoRegla(vigentes.filter((c) => c.obraId === o.id)),
      })),
    },
    hoy,
  );

  return {
    hoy,
    filas: resultado.filas.map((f) => ({
      tipo: f.tipo,
      id: f.id,
      nombre: f.nombre,
      corte: f.corte
        ? {
            fechaCorte: f.corte.fechaCorte,
            saldo: f.corte.saldo,
            cuentasPorPagar: f.corte.cuentasPorPagar,
            cuentasPorCobrar: f.corte.cuentasPorCobrar,
          }
        : null,
      desactualizado: f.desactualizado,
    })),
    total: resultado.total,
    conCorte: resultado.conCorte,
  };
}
