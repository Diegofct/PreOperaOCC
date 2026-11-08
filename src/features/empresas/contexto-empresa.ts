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
import { rolVeTodasLasObras, type ModulosDeObra } from '@/shared/rules/permisos';

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
 * los trae en la sesión; quien ve todas —la gerencia y, desde la 041, el Director de
 * Proyectos— los lee de la lista de obras. `null` fuera de una obra, mientras carga o si la
 * obra no es de quien entra.
 *
 * Spec 041: «adscrito» es estar entre **sus** obras, no ser la de la sesión al cargar. El
 * Director de Obra con dos obras ve el nombre y el menú de la que tiene abierta (RF-22).
 */
export function useObraDelLugar(): ObraDelLugar | null {
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
