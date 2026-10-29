/**
 * Dónde se está dentro del grupo empresarial (spec 033, RF-10, RF-19): la empresa, la
 * obra y la página, leídas de la dirección con `lugarDeLaRuta`. No hay estado aparte:
 * recargar o abrir un enlace copiado deja a la persona en el mismo sitio.
 */

import { usePathname } from 'expo-router';
import { useCallback } from 'react';

import { api } from '@/features/panel/cliente-api';
import type { ObraFila } from '@/features/panel/contratos';
import { useListado } from '@/features/panel/marco';
import { usePersona } from '@/features/panel/sesion';
import { lugarDeLaRuta, type LugarDelPanel } from '@/shared/rules/empresas';
import type { ModulosDeObra } from '@/shared/rules/permisos';

export function useLugarDelPanel(): LugarDelPanel | null {
  return lugarDeLaRuta(usePathname());
}

/**
 * La obra de la dirección, si se está dentro de una obra de Proyectos. Las pantallas que
 * tienen selector de obra la usan para fijarla y esconderlo (RF-19).
 */
export function useObraDeLaRuta(): string | null {
  const lugar = useLugarDelPanel();
  return lugar?.tipo === 'obra' ? lugar.obraId : null;
}

export interface ObraDelLugar {
  id: string;
  nombre: string;
  /** Los módulos que lleva (spec 017): el menú esconde los apagados (RF-18). */
  modulos: ModulosDeObra;
}

/**
 * Nombre y módulos de la obra de la dirección (RF-10, RF-18). Quien está adscrito a ella
 * los trae en la sesión; la gerencia los lee de la lista de obras. `null` fuera de una
 * obra, mientras carga o si la obra no es de quien entra.
 */
export function useObraDelLugar(): ObraDelLugar | null {
  const persona = usePersona();
  const obraId = useObraDeLaRuta();
  const gerencia = persona.rol === 'admin';
  const obras = useListado<ObraFila>(
    useCallback(() => (gerencia && obraId ? api.obras.listar() : Promise.resolve([])), [gerencia, obraId]),
  );
  if (!obraId) return null;
  if (!gerencia) {
    return persona.obraId === obraId
      ? { id: obraId, nombre: persona.obraNombre ?? 'Su obra', modulos: persona.modulosDeObra }
      : null;
  }
  const obra = obras.datos.find((o) => o.id === obraId);
  if (!obra) return null;
  return {
    id: obra.id,
    nombre: obra.nombre,
    modulos: { almacen: obra.almacenActivo, cantera: obra.canteraActivo, laboratorio: obra.laboratorioActivo },
  };
}
