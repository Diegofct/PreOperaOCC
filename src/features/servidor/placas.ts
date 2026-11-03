import { and, eq, isNull, ne, or, sql } from 'drizzle-orm';

import { baseServidor } from '@/db/servidor/cliente';
import { vehiculos } from '@/db/servidor/esquema';
import type { ErrorConCampos } from '@/features/servidor/respuestas';
import { identificacionDelVehiculo, type VehiculoNombrable } from '@/shared/rules/vehiculos';
import { claveDeNombreEnWhatsapp } from '@/shared/rules/whatsapp';

/**
 * El rechazo de una placa que ya tiene otro vehículo vigente (spec 032, RF-10), o
 * `null` si está libre. `salvoId` es el vehículo que se edita: su propia placa no
 * choca consigo misma.
 *
 * Se mira antes de escribir para que el mensaje diga **qué** placa, y el campo en
 * el que pintarlo. Sin transacciones (Neon por HTTP) dos altas a la vez pueden pasar
 * las dos esta lectura: ahí responde el índice único `ux_vehiculos_codigo`, porque
 * el código interno es la placa, con el mensaje genérico de `duplicadoDe`.
 */
export async function placaOcupada(placa: string, salvoId?: string): Promise<Response | null> {
  const [otro] = await baseServidor()
    .select({ id: vehiculos.id })
    .from(vehiculos)
    .where(
      and(
        // Por el código y por la placa escrita: hasta que corre el script de la
        // spec 032 un vehículo viejo tiene su placa aquí y otro código allá.
        or(
          eq(vehiculos.codigoInterno, placa),
          sql`regexp_replace(upper(${vehiculos.placa}), '[^A-Z0-9]', '', 'g') = ${placa}`,
        ),
        isNull(vehiculos.eliminadoEn),
        salvoId ? ne(vehiculos.id, salvoId) : undefined,
      ),
    )
    .limit(1);
  if (!otro) return null;
  const mensaje = `Ya hay un vehículo con la placa ${placa}.`;
  return Response.json({ error: mensaje, campos: { placa: mensaje } } satisfies ErrorConCampos, { status: 409 });
}

/**
 * El rechazo de un nombre en WhatsApp que ya tiene otro equipo vigente (spec 038, D11),
 * o `null` si todos están libres. Si dos equipos se llamaran igual, el grupo de OCC no
 * podría reconocer ninguno de los dos (RF-12): mejor decirlo al guardarlo que descubrirlo
 * en «No se pudo guardar». Se compara como se reconoce, sin tildes ni espacios.
 *
 * Son pocos equipos con nombres, así que se leen y se comparan aquí, en una sola regla
 * con el reconocimiento, en vez de repetir la normalización en SQL.
 */
export async function nombresEnWhatsappOcupados(
  nombres: readonly string[],
  salvoId?: string,
): Promise<Response | null> {
  if (nombres.length === 0) return null;
  const otros = await baseServidor()
    .select({ id: vehiculos.id, nombres: vehiculos.nombresWhatsapp, ...columnasParaNombrar })
    .from(vehiculos)
    .where(
      and(
        isNull(vehiculos.eliminadoEn),
        sql`cardinality(${vehiculos.nombresWhatsapp}) > 0`,
        salvoId ? ne(vehiculos.id, salvoId) : undefined,
      ),
    );
  for (const nombre of nombres) {
    const clave = claveDeNombreEnWhatsapp(nombre);
    const otro = otros.find((v) => v.nombres.some((n) => claveDeNombreEnWhatsapp(n) === clave));
    if (otro) {
      const mensaje = `«${nombre}» ya es un nombre en WhatsApp de ${nombrarVehiculo(otro)}.`;
      return Response.json({ error: mensaje, campos: { nombresWhatsapp: mensaje } } satisfies ErrorConCampos, {
        status: 409,
      });
    }
  }
  return null;
}

/**
 * Lo que hace falta seleccionar de un vehículo para nombrarlo con
 * `identificacionDelVehiculo` (spec 032, RF-13). El tipo va como subconsulta para
 * que sirva igual en las consultas que ya unen `tipos_vehiculo` y en las que no.
 *
 * Se nombra en JavaScript y no con una expresión SQL a propósito: la regla de qué
 * se muestra sin placa vive en un solo sitio (constitución, principio 3).
 */
export const columnasParaNombrar = {
  placa: vehiculos.placa,
  marca: vehiculos.marca,
  modelo: vehiculos.modelo,
  tipo: sql<string | null>`(select t.nombre from tipos_vehiculo t where t.id = ${vehiculos.tipoVehiculoId})`,
};

/** El nombre del equipo a partir de `columnasParaNombrar`; nulo si no hubo vehículo (left join). */
export function nombrarVehiculo(fila: VehiculoNombrable): string {
  return identificacionDelVehiculo(fila);
}

/**
 * Cambia el objeto `nombrable` de cada fila —seleccionado como
 * `nombrable: columnasParaNombrar`— por el nombre del equipo en `campo`. Así las
 * consultas que ya devolvían `vehiculoCodigo` o `codigo` siguen devolviendo ese
 * campo, ahora con la placa, sin que la pantalla cambie de contrato.
 */
export function conNombreDelVehiculo<T extends { nombrable: VehiculoNombrable | null }, K extends string>(
  filas: readonly T[],
  campo: K,
): (Omit<T, 'nombrable'> & Record<K, string>)[] {
  return filas.map(({ nombrable, ...resto }) => ({
    ...resto,
    [campo]: nombrable ? nombrarVehiculo(nombrable) : '—',
  })) as (Omit<T, 'nombrable'> & Record<K, string>)[];
}
