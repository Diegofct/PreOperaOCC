/**
 * Los módulos que lleva una obra concreta (spec 017). **Solo servidor.**
 *
 * La sesión ya trae los de la obra **de quien pide** (`PersonaEnSesion.modulosDeObra`),
 * que es lo que mira la guardia. Esto es para el otro caso: cuando la gerencia habla
 * de la obra **de otra persona** —darle el acceso de almacenista, de encargado de
 * planta o de laboratorista— y hay que mirar los módulos de esa obra, no los suyos (RF-11).
 *
 * Vive aquí y no dentro de una ruta porque lo usan las dos de personas, y una ruta no
 * importa a otra.
 */
import { eq } from 'drizzle-orm';

import { baseServidor } from '@/db/servidor/cliente';
import { obras } from '@/db/servidor/esquema';
import { TODOS_LOS_MODULOS, type ModulosDeObra } from '@/shared/rules/permisos';

/**
 * Los módulos de esa obra. Sin obra —o si no existe— los dos encendidos: quien no
 * está adscrito a ninguna no se queda sin nada por esto, y una obra que no existe la
 * rechaza después la llave foránea.
 */
export async function modulosDeLaObra(obraId: string | null): Promise<ModulosDeObra> {
  if (!obraId) return TODOS_LOS_MODULOS;

  const [fila] = await baseServidor()
    .select({
      almacen: obras.almacenActivo,
      cantera: obras.canteraActivo,
      laboratorio: obras.laboratorioActivo,
    })
    .from(obras)
    .where(eq(obras.id, obraId))
    .limit(1);

  return fila ?? TODOS_LOS_MODULOS;
}
