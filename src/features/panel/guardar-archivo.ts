/**
 * Guarda un archivo en el equipo de quien lo pidió, con un enlace temporal. Vivía en la pantalla
 * del Almacén (spec 009); desde la spec 040 también lo usan los archivos del asistente.
 *
 * El panel es de navegador, y así es como un navegador guarda lo que ya tiene en memoria. El
 * enlace se libera un momento después y no en el acto: revocarlo en el mismo instante cancela
 * la descarga en algunos navegadores.
 */
export function guardarArchivo(contenido: Blob, nombre: string) {
  const url = URL.createObjectURL(contenido);
  const enlace = document.createElement('a');
  enlace.href = url;
  enlace.download = nombre;
  document.body.appendChild(enlace);
  enlace.click();
  enlace.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
