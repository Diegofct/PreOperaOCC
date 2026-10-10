/**
 * Quién guarda lo que llega por WhatsApp (spec 024, RF-10). **Solo servidor.**
 *
 * Hasta la 024, todo lo que se guardaba desde la bandeja lo aprobaba una persona en
 * sesión, y su id quedaba como `registrado_por`, `aprobado_por` y dueño de la
 * bitácora que se abría. Ahora también lo guarda el sistema solo. Los pasos que
 * escriben reciben un *actor*: la persona en sesión (que ya tiene `id`) o el
 * usuario de sistema «IA WhatsApp», que la migración 0021 inserta con id fijo.
 *
 * El actor solo dice **quién** escribe. El alcance por obra sigue siendo de la
 * sesión (`filtroDeObraEstricto`) en las rutas del panel; el sistema no tiene obra
 * propia: escribe en la obra del grupo del mensaje.
 */
import { USUARIO_IA_WHATSAPP } from '@/shared/rules/whatsapp-automatico';

/** Quién queda como autor de lo que se escribe. Una persona en sesión es un actor. */
export interface Actor {
  id: string;
}

/** El usuario de sistema «IA WhatsApp», autor de lo que se guarda sin una persona. */
export const ACTOR_SISTEMA: Actor = { id: USUARIO_IA_WHATSAPP.id };
