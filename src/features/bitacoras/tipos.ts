/**
 * Las actividades de la bitácora: su forma y cómo se construyen.
 *
 * Módulo puro, y ese es todo su motivo de existir. Las dos piezas que hay aquí
 * llegaron desde sitios que el navegador no puede tocar:
 *
 *  · `ActividadBitacora` estaba en `src/db/local/schema.ts`, y el esquema del
 *    servidor la necesita. Ese no puede importar nada de `src/db/local/*` **ni
 *    siquiera como tipo**: la regla existe para que ninguna cadena de imports
 *    arrastre la base del teléfono, y una excepción "solo de tipos" es
 *    exactamente como se empiezan a colar.
 *  · `construirActividad` estaba en el repositorio del móvil, que habla con
 *    SQLite. Ahora la bitácora se llena desde dos sitios —el celular del
 *    residente en obra y el panel desde el computador— y las dos tienen que
 *    producir exactamente la misma fila.
 */
import { uuidv7 } from 'uuidv7';

import { nombreDeActividad } from './actividades';

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

/** Lo que llega de un formulario, antes de convertirse en una actividad. */
export interface ActividadNueva {
  clave: string;
  /** Solo cuando la clave es 'otra'. */
  texto?: string;
  descripcion: string;
  observaciones: string;
}

/**
 * Construye la actividad que se guarda.
 *
 * Vivía en el repositorio del móvil. Salió de ahí porque ahora la bitácora se
 * llena desde dos sitios —el celular del residente en obra y el panel desde el
 * computador— y las dos tienen que producir exactamente la misma fila. Si
 * divergieran, una bitácora se leería distinto según dónde se hubiera escrito,
 * que es justo lo que este formato existe para evitar.
 */
export function construirActividad(nueva: ActividadNueva): ActividadBitacora {
  return {
    id: uuidv7(),
    clave: nueva.clave,
    // Se guarda el nombre además de la clave: el registro se sigue leyendo
    // aunque el catálogo de actividades cambie más adelante.
    nombre: nueva.texto?.trim() || nombreDeActividad(nueva.clave),
    descripcion: nueva.descripcion.trim(),
    observaciones: nueva.observaciones.trim(),
  };
}
