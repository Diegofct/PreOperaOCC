/**
 * Las empresas del grupo con lo que muestran sus tarjetas (spec 033, RF-1 a RF-4).
 *
 * Los cortes se leen todos y se resuelven con las reglas de `shared/rules/cortes`: son
 * pocos —los digita gerencia, uno cada tanto por empresa u obra— y así el último corte
 * y la suma de Proyectos salen de la misma regla que usa el Consolidado.
 */

import { and, eq, isNull } from 'drizzle-orm';

import { baseServidor } from '@/db/servidor/cliente';
import { cortesFinancieros, empresas, obras } from '@/db/servidor/esquema';
import type { DatosDeEmpresa, EmpresaFila } from '@/features/panel/contratos';
import { resumenDeProyectos, ultimoCorte, type CorteParaRegla } from '@/shared/rules/cortes';
import { EMPRESAS, type EmpresaId } from '@/shared/rules/empresas';

/** Las columnas de un corte que piden las reglas. */
export const COLUMNAS_DE_CORTE_PARA_REGLA = {
  fechaCorte: cortesFinancieros.fechaCorte,
  saldo: cortesFinancieros.saldo,
  cuentasPorPagar: cortesFinancieros.cuentasPorPagar,
  cuentasPorCobrar: cortesFinancieros.cuentasPorCobrar,
};

/** Los vigentes, con el dueño, listos para las reglas. */
async function cortesVigentes(): Promise<(CorteParaRegla & { empresaId: string | null; obraId: string | null })[]> {
  const filas = await baseServidor()
    .select({
      ...COLUMNAS_DE_CORTE_PARA_REGLA,
      empresaId: cortesFinancieros.empresaId,
      obraId: cortesFinancieros.obraId,
    })
    .from(cortesFinancieros)
    .where(isNull(cortesFinancieros.anuladoEn));
  return filas.map((f) => ({ ...f, anuladoEn: null }));
}

export function datosDeLaFila(fila: typeof empresas.$inferSelect): DatosDeEmpresa {
  return {
    razonSocial: fila.razonSocial,
    nit: fila.nit,
    direccion: fila.direccion,
    ciudad: fila.ciudad,
    telefono: fila.telefono,
    correo: fila.correo,
    representanteLegal: fila.representanteLegal,
  };
}

/** Las cuatro, en el orden de las tarjetas, con su último corte (RF-1 a RF-4). */
export async function listarEmpresas(): Promise<EmpresaFila[]> {
  const [guardadas, cortes, activas] = await Promise.all([
    baseServidor().select().from(empresas),
    cortesVigentes(),
    baseServidor()
      .select({ id: obras.id })
      .from(obras)
      .where(and(eq(obras.activa, true), isNull(obras.eliminadoEn))),
  ]);

  const deLaEmpresa = (id: EmpresaId) => cortes.filter((c) => c.empresaId === id);
  const idsActivas = new Set(activas.map((o) => o.id));

  return EMPRESAS.map((empresa) => {
    const fila = guardadas.find((g) => g.id === empresa.id);
    // La migración siembra las cuatro; si faltara una, se ve vacía y no rompe las tarjetas.
    const datos: DatosDeEmpresa = fila
      ? datosDeLaFila(fila)
      : { razonSocial: '', nit: '', direccion: '', ciudad: '', telefono: '', correo: '', representanteLegal: '' };

    let financiero: EmpresaFila['financiero'];
    if (empresa.id === 'proyectos') {
      // Por obra activa, la regla toma el último de cada una (RF-2, cambio del 2026-10-27).
      const porObra = [...idsActivas].map((obraId) => ({ cortes: cortes.filter((c) => c.obraId === obraId) }));
      financiero = resumenDeProyectos(porObra);
    } else {
      const ultimo = ultimoCorte(deLaEmpresa(empresa.id));
      financiero = ultimo ? { fechaCorte: ultimo.fechaCorte, saldo: ultimo.saldo } : null;
    }

    return {
      id: empresa.id,
      nombre: empresa.nombre,
      funcion: empresa.funcion,
      datos,
      financiero,
      obrasActivas: empresa.id === 'proyectos' ? idsActivas.size : null,
      actualizadoEn: fila?.actualizadoEn.toISOString() ?? new Date(0).toISOString(),
    };
  });
}

