/**
 * El reloj de `actualizado_en`, mantenido por la base y no por la aplicación.
 *
 * Ese campo es el `server_updated_at` del cursor de sincronización: el pull
 * pregunta "¿qué cambió desde X?" y esta columna es la única respuesta. Si la
 * pusiera la aplicación, cualquier escritura que no pase por nuestras rutas —un
 * `UPDATE` corriendo a mano en la consola de Neon para arreglar una placa mal
 * digitada, que es exactamente lo que va a pasar— dejaría la columna intacta y
 * el cambio nunca llegaría al celular. Sin error, sin log, sin nada: el operador
 * simplemente vería la placa vieja para siempre.
 *
 * Por eso va en un disparador, que no se puede saltar.
 *
 * No vive en `drizzle/`: drizzle-kit no genera disparadores y esos archivos son
 * generados, no se editan a mano. Las sentencias son idempotentes, así que
 * `scripts/migrar-servidor.ts` las vuelve a aplicar después de cada migración.
 */

/** Las tablas que llevan `actualizado_en`. Debe coincidir con `esquema.ts`. */
const TABLAS_CON_RELOJ = [
  'obras',
  'usuarios',
  'tipos_vehiculo',
  'vehiculos',
  'asignaciones',
  'plantillas',
  'preoperacionales',
  'bitacoras',
  'media',
  'credenciales_web',
];

const FUNCION = `
create or replace function tocar_actualizado_en() returns trigger as $$
begin
  new.actualizado_en = now();
  return new;
end;
$$ language plpgsql
`.trim();

/**
 * Las sentencias en orden, una por llamada.
 *
 * Neon por HTTP ejecuta una sentencia por petición, así que el llamador itera:
 * no se pueden mandar todas juntas separadas por punto y coma.
 */
export function sentenciasDeDisparadores(): string[] {
  const sentencias = [FUNCION];

  for (const tabla of TABLAS_CON_RELOJ) {
    const disparador = `tr_${tabla}_actualizado_en`;
    sentencias.push(`drop trigger if exists ${disparador} on ${tabla}`);
    sentencias.push(
      `create trigger ${disparador} before update on ${tabla} ` +
        `for each row execute function tocar_actualizado_en()`,
    );
  }

  return sentencias;
}
