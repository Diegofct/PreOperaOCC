/**
 * Quién puede tocar una bitácora, y cuándo.
 *
 * Vive aquí y no dentro de una ruta porque lo comparten tres endpoints
 * (`PATCH`, `cerrar`, `anular`) y **una ruta no debe importar a otra**: Expo
 * Router evalúa todos los módulos de ruta al construir su manifiesto, así que
 * enlazarlas entre sí las acopla de una forma que solo se nota cuando el
 * empaquetado falla.
 */
import { eq } from 'drizzle-orm';

import { baseServidor } from '@/db/servidor/cliente';
import { bitacoras, partesDeObra } from '@/db/servidor/esquema';
import { alcanzaLaObra } from '@/features/servidor/alcance';
import type { PersonaEnSesion } from '@/features/servidor/guardia';
import { errorDePeticion, noEncontrado } from '@/features/servidor/respuestas';

/**
 * Devuelve la respuesta de rechazo, o `null` si se puede seguir.
 *
 * **Una bitácora cerrada no se edita.** Es evidencia del trabajo de un día
 * concreto: corregirla es anularla y abrir otra, nunca reescribir la que ya se
 * cerró. Es la misma regla que rige un preoperacional firmado.
 */
export async function rechazoSiNoEsEditable(
  sesion: PersonaEnSesion,
  id: string,
): Promise<Response | null> {
  const [fila] = await baseServidor()
    .select({
      obraId: bitacoras.obraId,
      cerradaEn: bitacoras.cerradaEn,
      anuladoEn: bitacoras.anuladoEn,
    })
    .from(bitacoras)
    .where(eq(bitacoras.id, id))
    .limit(1);

  // "No existe" y no "no puede": confirmar que el id es real le diría a un
  // residente qué se registra en las obras que no le tocan.
  if (!fila || !alcanzaLaObra(sesion, fila.obraId)) return noEncontrado('esa bitácora');

  if (fila.anuladoEn) {
    return errorDePeticion('Esa bitácora está anulada. Abra una nueva para ese día.', 409);
  }
  if (fila.cerradaEn) {
    return errorDePeticion(
      'Esa bitácora ya está cerrada. Para corregirla hay que anularla y abrir otra.',
      409,
    );
  }
  return null;
}

/**
 * ¿Se puede escribir todavía en esta bitácora de obra? (spec 004)
 *
 * Vive aquí y no dentro de la ruta porque lo comparten el guardado, el cierre y
 * la anulación. Una ruta importando a otra ruta funciona, pero deja al
 * enrutador evaluando un módulo de ruta por un ayudante, que es justo la clase
 * de cadena de imports que este proyecto evita.
 */
export async function parteEditable(
  sesion: PersonaEnSesion,
  id: string,
): Promise<Response | { obraId: string; fecha: string }> {
  const [fila] = await baseServidor()
    .select({
      obraId: partesDeObra.obraId,
      fecha: partesDeObra.fecha,
      cerradoEn: partesDeObra.cerradoEn,
      anuladoEn: partesDeObra.anuladoEn,
    })
    .from(partesDeObra)
    .where(eq(partesDeObra.id, id))
    .limit(1);

  if (!fila || !alcanzaLaObra(sesion, fila.obraId)) return noEncontrado('esa bitácora');
  if (fila.anuladoEn) return errorDePeticion('Esa bitácora está anulada.', 409);
  if (fila.cerradoEn) {
    return errorDePeticion(
      'Esa bitácora ya está cerrada. Para corregirla hay que anularla y abrir otra.',
      409,
    );
  }
  return { obraId: fila.obraId, fecha: fila.fecha };
}
