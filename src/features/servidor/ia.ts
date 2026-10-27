/**
 * El cliente de la IA (Claude, de Anthropic) para el panel. **Solo servidor.**
 *
 * Uno solo para todo el panel: hoy lee presupuestos en Excel (spec 031, RF-74) y
 * mañana lo usará el asistente (spec 028). La llave vive en `ANTHROPIC_API_KEY`, en el
 * `.env` del servidor, y nunca llega al navegador.
 *
 * Opcional a propósito, como el token de WhatsApp: sin la llave el panel funciona igual
 * y lo que necesita la IA responde que no está disponible, en vez de tumbar el arranque.
 */
import Anthropic from '@anthropic-ai/sdk';

/** El mismo modelo que lee los mensajes de WhatsApp en n8n. */
export const MODELO_DE_IA = 'claude-opus-5-5';

let cliente: Anthropic | null | undefined;

/** El cliente, o `null` si no hay llave configurada. */
export function clienteDeIa(): Anthropic | null {
  if (cliente === undefined) {
    const llave = process.env.ANTHROPIC_API_KEY?.trim();
    cliente = llave ? new Anthropic({ apiKey: llave }) : null;
  }
  return cliente;
}

/**
 * Qué decirle a la persona cuando la llamada falla (031/RF-87). Por la clase del error,
 * no por su texto. El detalle va al log del servidor, nunca a la pantalla.
 */
export function mensajeDeFalloDeIa(fallo: unknown): string {
  console.error('[ia] la llamada falló:', fallo);
  if (fallo instanceof Anthropic.APIConnectionTimeoutError) return 'La IA tardó demasiado en responder.';
  if (fallo instanceof Anthropic.APIConnectionError) return 'No se pudo conectar con la IA.';
  if (fallo instanceof Anthropic.AuthenticationError || fallo instanceof Anthropic.PermissionDeniedError) {
    return 'La llave de la IA no es válida. Avise a quien administra el sistema.';
  }
  if (fallo instanceof Anthropic.RateLimitError) return 'La IA está ocupada en este momento.';
  // Sin saldo en la cuenta de Anthropic, la API responde 400.
  if (fallo instanceof Anthropic.BadRequestError) {
    return 'La IA rechazó la petición; puede que la cuenta de Anthropic no tenga saldo. Avise a quien administra el sistema.';
  }
  if (fallo instanceof Anthropic.APIError) return 'La IA respondió con un error.';
  return 'La IA no respondió.';
}
