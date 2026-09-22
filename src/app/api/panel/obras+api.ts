import { and, asc, isNull } from 'drizzle-orm';
import { uuidv7 } from 'uuidv7';

import { baseServidor } from '@/db/servidor/cliente';
import { obras } from '@/db/servidor/esquema';
import { obraNueva } from '@/features/panel/contratos';
import { filtroDeObra } from '@/features/servidor/alcance';
import { requerirPermiso } from '@/features/servidor/guardia';
import { cuerpoJson, ok, responder } from '@/features/servidor/respuestas';

/**
 * Las obras de OCC. `GET /api/panel/obras`, `POST` para dar de alta.
 *
 * La obra es la raíz de todo lo demás: las personas pertenecen a una, los
 * vehículos están en una, y el pull del celular usa la obra del operador para
 * decidir qué máquinas bajarle. Por eso es la primera pantalla del panel — sin
 * al menos una obra no hay dónde poner un vehículo.
 */

export async function GET(peticion: Request) {
  return responder(async () => {
    const sesion = await requerirPermiso(peticion, 'obras', 'listar');
    if (sesion instanceof Response) return sesion;

    const filas = await baseServidor()
      .select({
        id: obras.id,
        codigo: obras.codigo,
        nombre: obras.nombre,
        municipio: obras.municipio,
        activa: obras.activa,
        // El residente también lo lee: el parte le dice el horario de su obra
        // (spec 016, RF-10), aunque cambiarlo sea solo de gerencia (RF-5).
        horario: obras.horario,
        // Qué módulos lleva (spec 017): el panel arma con esto los selectores de
        // obra de Almacén y Cantera, y la ficha sus casillas.
        almacenActivo: obras.almacenActivo,
        canteraActivo: obras.canteraActivo,
      })
      .from(obras)
      // El residente ve la suya; la gerencia, todas. La condición la decide
      // `alcance.ts` y no esta consulta: ver el porqué en ese archivo.
      .where(and(isNull(obras.eliminadoEn), filtroDeObra(sesion, obras.id)))
      .orderBy(asc(obras.codigo));

    return ok(filas);
  });
}

/**
 * Dar de alta una obra es de gerencia.
 *
 * Un residente que pudiera crear obras podría crearse uno donde colocar
 * vehículos fuera del alcance de cualquier otro, y la separación por obra
 * dejaría de significar nada.
 */
export async function POST(peticion: Request) {
  return responder(async () => {
    const sesion = await requerirPermiso(peticion, 'obras', 'escribir');
    if (sesion instanceof Response) return sesion;

    const datos = await cuerpoJson(peticion, obraNueva);

    // UUID v7 igual que las capturas del móvil: ordenable por tiempo, así que
    // el índice de la clave primaria no se fragmenta al insertar.
    const [fila] = await baseServidor()
      .insert(obras)
      .values({ id: uuidv7(), ...datos })
      .returning({
        id: obras.id,
        codigo: obras.codigo,
        nombre: obras.nombre,
        municipio: obras.municipio,
        activa: obras.activa,
        horario: obras.horario,
        almacenActivo: obras.almacenActivo,
        canteraActivo: obras.canteraActivo,
      });

    return ok(fila, 201);
  });
}
