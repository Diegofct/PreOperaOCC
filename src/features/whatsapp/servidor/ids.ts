/**
 * Los ids fijos de lo que crea una aprobación desde la bandeja (spec 021, plan;
 * spec 023). **Solo servidor.**
 *
 * Neon por HTTP no da transacciones interactivas: aprobar son varios pasos, y lo
 * que los vuelve seguros de reintentar es que el mismo mensaje dé siempre los
 * mismos ids. Si un paso ya se hizo, el reintento encuentra sus filas por su id y
 * no las vuelve a crear.
 *
 * Vive aparte para que la aprobación de la bitácora (`aprobacion.ts`) y la del
 * almacén (`almacen.ts`) lo compartan sin importarse la una a la otra.
 */
import { aHex } from '@/shared/cripto/formato-pbkdf2';

/**
 * Un id fijo para la fila `renglon` de la `seccion` que crea este mensaje, con
 * forma de UUID (versión 5, a partir de SHA-256). El renglón puede ser un número o
 * una clave, como la del material nuevo.
 */
export async function idDeterminista(
  mensajeId: string,
  seccion: string,
  renglon: number | string,
): Promise<string> {
  const huella = aHex(
    new Uint8Array(
      await crypto.subtle.digest('SHA-256', new TextEncoder().encode(`${mensajeId}|${seccion}|${renglon}`)),
    ),
  );
  const variante = ((parseInt(huella[16], 16) & 0x3) | 0x8).toString(16);
  return `${huella.slice(0, 8)}-${huella.slice(8, 12)}-5${huella.slice(13, 16)}-${variante}${huella.slice(17, 20)}-${huella.slice(20, 32)}`;
}
