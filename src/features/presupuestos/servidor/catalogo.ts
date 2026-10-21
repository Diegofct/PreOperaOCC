/**
 * El catálogo de actividades de una obra (spec 031, RF-58, RF-59). **Solo servidor.**
 *
 * Con presupuesto vigente, sus ítems dentro de cada capítulo; sin él, la lista fija de
 * siempre. Lo usan el guardado del parte y la aprobación de WhatsApp, y lo recibe la
 * pantalla, para que ofrezcan y acepten lo mismo.
 */
import { and, eq } from 'drizzle-orm';

import { baseServidor } from '@/db/servidor/cliente';
import { presupuestos } from '@/db/servidor/esquema';
import { catalogoDelPresupuesto, catalogoFijo, type CatalogoDeActividades } from '@/shared/rules/actividades-de-obra';

export async function catalogoDeLaObra(obraId: string): Promise<CatalogoDeActividades> {
  const [vigente] = await baseServidor()
    .select({ estructura: presupuestos.estructura })
    .from(presupuestos)
    .where(and(eq(presupuestos.obraId, obraId), eq(presupuestos.estado, 'vigente')))
    .limit(1);
  return vigente ? catalogoDelPresupuesto(vigente.estructura) : catalogoFijo();
}
