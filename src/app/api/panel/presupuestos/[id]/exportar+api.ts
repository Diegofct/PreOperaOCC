import { eq } from 'drizzle-orm';

import { baseServidor } from '@/db/servidor/cliente';
import { obras } from '@/db/servidor/esquema';
import { libroDelPresupuesto, nombreDelArchivoDelPresupuesto } from '@/features/presupuestos/servidor/excel';
import { presupuestoAlAlcance } from '@/features/presupuestos/servidor/presupuestos';
import { requerirPermiso } from '@/features/servidor/guardia';
import { noEncontrado, responder } from '@/features/servidor/respuestas';

/**
 * Descargar un presupuesto en Excel. `GET /api/panel/presupuestos/:id/exportar` (spec 031,
 * RF-73): el vigente o cualquier versión, con su estructura y sus valores.
 */
export async function GET(peticion: Request, { id }: { id: string }) {
  return responder(async () => {
    const sesion = await requerirPermiso(peticion, 'contrato', 'ver');
    if (sesion instanceof Response) return sesion;

    const fila = await presupuestoAlAlcance(sesion, id);
    if (!fila) return noEncontrado('ese presupuesto');
    const [obra] = await baseServidor()
      .select({ codigo: obras.codigo, nombre: obras.nombre })
      .from(obras)
      .where(eq(obras.id, fila.obraId))
      .limit(1);

    const archivo = await libroDelPresupuesto({
      nombre: fila.nombre,
      numeroVersion: fila.numeroVersion,
      estado: fila.estado,
      estructura: fila.estructura,
      obra: obra ?? { codigo: '', nombre: '' },
    });
    return new Response(archivo, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${nombreDelArchivoDelPresupuesto(obra?.codigo ?? '', fila.numeroVersion)}"`,
        'Cache-Control': 'private, no-store',
      },
    });
  });
}
