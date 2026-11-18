/**
 * Dónde se dice por qué falló una acción (spec 050, RF-57, RF-79).
 *
 * - **Si el servidor señala campos**, cada motivo va debajo de su campo y en ningún otro sitio: ni el
 *   renglón «Revise los campos marcados» ni un aviso. El desplazamiento al primer error (T10) lleva la
 *   vista hasta él. Antes, con un solo campo el motivo iba arriba y no debajo (spec 015, RF-33); la 050
 *   lo cambia, porque arriba se leía como un error de toda la ventana.
 * - **Si no** —sin conexión, otra persona ya lo cambió, un fallo del servidor—, va al aviso de error, que
 *   se queda hasta que alguien lo cierra.
 *
 * Lo usan `useListado.ejecutar` y `useAccionDeVentana`, para que la página y las ventanas decidan igual.
 * Sin React, para que la verificación lo pruebe.
 */
export function repartirFallo(
  campos: Record<string, string>,
  mensaje: string,
): { campos: Record<string, string>; aviso: string | null } {
  if (Object.keys(campos).length > 0) return { campos, aviso: null };
  return { campos: {}, aviso: mensaje };
}
