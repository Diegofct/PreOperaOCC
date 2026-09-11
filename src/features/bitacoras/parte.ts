/**
 * Cómo se arma cada fila del parte diario.
 *
 * El navegador manda qué eligió —el id del equipo, el de la persona, la clave
 * del material— y **el servidor pone los nombres**. Nunca al revés: si el
 * nombre llegara del cliente, bastaría con editar la petición para que el parte
 * dijera que trabajó otra persona.
 *
 * Cada fila se auto-describe: guarda el nombre además de la clave. Un parte de
 * 2026 tiene que seguir leyéndose en 2030 aunque el catálogo de materiales haya
 * cambiado, aunque a un equipo le hayan cambiado el código interno y aunque una
 * persona ya no trabaje en la empresa. Es el mismo criterio con el que se
 * guardan las respuestas del preoperacional.
 */
import { uuidv7 } from 'uuidv7';

import type {
  ActividadDelParte,
  FranjaDeClima,
  MaquinaDelParte,
  MaterialDelParte,
  PersonaDelParte,
} from './tipos';
import { CLAVE_OTRA, nombreDeActividad } from './actividades';
import {
  ETIQUETA_UNIDAD,
  materialPorId,
  nombreDeClima,
  type UnidadMaterial,
} from '@/shared/catalogos/bitacora';
import { nombreDeCargo } from '@/shared/catalogos/cargos';
import type { ClaseDeMedidor } from '@/shared/rules/jornada';

/** Lo que el navegador puede decir de una máquina. */
export interface MaquinaPedida {
  vehiculoId: string;
  medidorInicial?: number | null;
  medidorFinal?: number | null;
}

export function construirMaquina(
  pedida: MaquinaPedida,
  codigo: string,
  claseMedidor: ClaseDeMedidor,
): MaquinaDelParte {
  return {
    id: uuidv7(),
    vehiculoId: pedida.vehiculoId,
    codigo,
    claseMedidor,
    medidorInicial: pedida.medidorInicial ?? null,
    medidorFinal: pedida.medidorFinal ?? null,
  };
}

export interface PersonaPedida {
  usuarioId: string;
  entrada: string;
  salida: string;
}

export function construirPersona(
  pedida: PersonaPedida,
  nombre: string,
  cargo: string | null,
): PersonaDelParte {
  return {
    id: uuidv7(),
    usuarioId: pedida.usuarioId,
    nombre,
    // Se guarda el rótulo y no el slug: es lo que se va a leer, y el catálogo
    // de cargos puede cambiar de nombre sin avisar a los partes viejos.
    cargo: cargo ? nombreDeCargo(cargo) : null,
    entrada: pedida.entrada,
    salida: pedida.salida,
  };
}

export interface ActividadPedida {
  /** El de la fila que ya existía; si no viene, nace uno. */
  id?: string | null;
  clave: string;
  texto?: string | null;
  descripcion: string;
  observaciones: string;
  longitud: number | null;
  ancho: number | null;
  alto: number | null;
  area: number | null;
  volumen: number | null;
}

export function construirActividadDelParte(pedida: ActividadPedida): ActividadDelParte {
  return {
    // Se conserva el id que traía: es a lo que apuntan sus fotografías. Generar
    // uno nuevo en cada guardado las dejaba huérfanas en silencio.
    id: pedida.id ?? uuidv7(),
    clave: pedida.clave,
    // «Otra» sin decir cuál no describe nada, así que el texto libre es el
    // nombre cuando la clave es esa.
    nombre:
      pedida.clave === CLAVE_OTRA && pedida.texto
        ? pedida.texto
        : nombreDeActividad(pedida.clave),
    descripcion: pedida.descripcion,
    observaciones: pedida.observaciones,
    longitud: pedida.longitud,
    ancho: pedida.ancho,
    alto: pedida.alto,
    area: pedida.area,
    volumen: pedida.volumen,
  };
}

export interface FranjaPedida {
  condicion: string;
  desde: string;
  hasta: string;
}

export function construirFranja(pedida: FranjaPedida): FranjaDeClima {
  return {
    id: uuidv7(),
    condicion: pedida.condicion,
    nombre: nombreDeClima(pedida.condicion),
    desde: pedida.desde,
    hasta: pedida.hasta,
  };
}

export interface MaterialPedido {
  material: string;
  cantidad: number;
}

export function construirMaterial(pedido: MaterialPedido): MaterialDelParte | null {
  const material = materialPorId(pedido.material);
  if (!material) return null;
  return {
    id: uuidv7(),
    material: material.id,
    nombre: material.nombre,
    cantidad: pedido.cantidad,
    // La unidad se congela con el parte: si mañana el cemento se midiera en
    // toneladas, los partes viejos seguirían diciendo bultos, que es lo que
    // de verdad se consumió.
    unidad: ETIQUETA_UNIDAD[material.unidad as UnidadMaterial],
  };
}
