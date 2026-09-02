/**
 * El tipo de una actividad de la bitácora.
 *
 * Vivía dentro de `src/db/local/schema.ts`. Salió de ahí porque ahora lo
 * necesita también el esquema del servidor, y ese no puede importar nada de
 * `src/db/local/*` ni siquiera como tipo: la regla existe para que ninguna
 * cadena de imports arrastre la base del teléfono, y una excepción "solo de
 * tipos" es exactamente como se empiezan a colar. El tipo es dominio puro, así
 * que su sitio natural era este.
 */

/**
 * Una actividad del día. Una actividad = una fila del formato en papel.
 *
 * Se auto-describe igual que las respuestas del preoperacional: guarda el
 * nombre además de la clave, para que un registro de 2026 se siga leyendo
 * aunque el catálogo de actividades cambie.
 */
export interface ActividadBitacora {
  id: string;
  clave: string;
  nombre: string;
  descripcion: string;
  observaciones: string;
}
