/**
 * La obra en uso de la pantalla (spec 041, RF-22, RF-23, RF-67), del lado del panel.
 *
 * Es la misma regla que aplica el servidor (`obraEnUso`, en `rules/cargos-de-obra`): la obra
 * de la dirección si es de la persona; si no, la única que tenga; con varias y ninguna en la
 * dirección, ninguna. Se calcula aquí con la dirección y las obras que trajo la sesión, y no se
 * le pregunta al servidor: la dirección es por pestaña, y la respuesta tiene que ser la de esta
 * pestaña, no la de la última que habló con el servidor.
 *
 * Solo mira **las obras de la persona**. Quien ve todas no tiene ninguna propia y aquí recibe
 * `null`: el nombre y los módulos de una obra cualquiera los saca `useObraDelLugar` de la lista
 * de obras.
 */
import { usePathname } from 'expo-router';

import { obraEnUso } from '@/shared/rules/cargos-de-obra';
import { lugarDeLaRuta } from '@/shared/rules/empresas';

import type { ObraDeLaSesionFila } from './contratos';
import { usePersona } from './sesion';

export function useObraEnUso(): ObraDeLaSesionFila | null {
  const persona = usePersona();
  const lugar = lugarDeLaRuta(usePathname());
  const id = obraEnUso(lugar?.tipo === 'obra' ? lugar.obraId : null, persona.obras);
  return persona.obrasConNombre.find((o) => o.id === id) ?? null;
}
