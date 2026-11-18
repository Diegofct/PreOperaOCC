/**
 * Dónde se está dentro del grupo empresarial (spec 033, RF-10, RF-19): la empresa, la
 * obra y la página, leídas de la dirección con `lugarDeLaRuta`. No hay estado aparte:
 * recargar o abrir un enlace copiado deja a la persona en el mismo sitio.
 */

import { usePathname } from 'expo-router';
import { createElement, useCallback, type ReactNode } from 'react';

import { api } from '@/features/panel/cliente-api';
import type { ObraFila } from '@/features/panel/contratos';
import { useListado } from '@/features/panel/marco';
import { ContextoObraDelLugar, useObraDelLugar, type ObraDelLugar } from '@/features/panel/obra-del-lugar';
import { usePersona } from '@/features/panel/sesion';
import { lugarDeLaRuta, type LugarDelPanel } from '@/shared/rules/empresas';
import { rolVeTodasLasObras } from '@/shared/rules/permisos';

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

/**
 * Nombre y módulos de la obra de la dirección (RF-10, RF-18). Quien está adscrito a ella
 * los trae en la sesión; quien ve todas —la gerencia y, desde la 041, el Director de
 * Proyectos— los lee de la lista de obras. `null` fuera de una obra, mientras carga o si la
 * obra no es de quien entra.
 *
 * Spec 041: «adscrito» es estar entre **sus** obras, no ser la de la sesión al cargar. El
 * Director de Obra con dos obras ve el nombre y el menú de la que tiene abierta (RF-22).
 */
function useCalcularObraDelLugar(): ObraDelLugar | null {
  const persona = usePersona();
  const obraId = useObraDeLaRuta();
  const todas = rolVeTodasLasObras(persona.rol);
  const obras = useListado<ObraFila>(
    useCallback(() => (todas && obraId ? api.obras.listar() : Promise.resolve([])), [todas, obraId]),
  );
  if (!obraId) return null;
  if (!todas) {
    const suya = persona.obrasConNombre.find((o) => o.id === obraId);
    return suya ? { id: suya.id, nombre: suya.nombre, modulos: suya.modulos } : null;
  }
  const obra = obras.datos.find((o) => o.id === obraId);
  if (!obra) return null;
  return {
    id: obra.id,
    nombre: obra.nombre,
    modulos: { almacen: obra.almacenActivo, cantera: obra.canteraActivo, laboratorio: obra.laboratorioActivo },
  };
}

/**
 * Calcula la obra del lugar una sola vez para todo el panel (spec 050): la leen el menú, la puerta
 * de las páginas de obra y la ruta de arriba de cada pantalla, con `useObraDelLugar`.
 */
export function ProveedorObraDelLugar({ children }: { children: ReactNode }) {
  return createElement(ContextoObraDelLugar.Provider, { value: useCalcularObraDelLugar() }, children);
}

export { useObraDelLugar, type ObraDelLugar };
