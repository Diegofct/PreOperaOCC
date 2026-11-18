/**
 * La marca del sistema: Kontrola, del Grupo HS (spec 049).
 *
 * El sistema nació como el control de la maquinaria de OCC y se presentaba así
 * («Control de Obra OCC»). Hoy lo usan Elemental, OCC, GeoLab y las obras, y el dueño
 * de todo eso es el Grupo HS; por eso se llama Kontrola y no lleva el nombre de una de
 * sus empresas. La app del celular no cambia de nombre (RF-41): esto es del panel y de
 * lo que el servidor genera.
 *
 * Está en un solo sitio porque antes cada archivo ponía su propio nombre y ya había
 * tres distintos («PreOperaOCC», «Control de Obra OCC», «Grupo OCC · Control de
 * Obra»). Vive en `catalogos/` y no en `rules/` porque es un dato literal que comparten
 * el panel y el servidor, no una decisión.
 *
 * Mayúsculas (RF-39): «KONTROLA» en los logotipos; «Kontrola» dentro de un texto.
 */
export const MARCA = {
  grupo: 'Grupo HS',
  sistema: 'Kontrola',
  logotipo: 'KONTROLA',
  lema: 'Gestión de obras y empresas',
  /** Autor de los Excel, PDF y Word generados (RF-30). */
  autor: 'Kontrola · Grupo HS',
  /** La línea al pie de todo documento generado (RF-29, RF-33). */
  pie: 'Generado con Kontrola · Grupo HS',
  /** Encabezado de los archivos del Asistente: primero el grupo, como antes (RF-31). */
  encabezado: 'Grupo HS · Kontrola',
} as const;

/** El título de la pestaña fuera de una empresa: «<página> · Kontrola» (RF-10, RF-12, RF-13). */
export function tituloConSistema(pagina: string): string {
  return `${pagina} · ${MARCA.sistema}`;
}
