/**
 * Lo que el Excel de OCC no puede expresar.
 *
 * `scripts/import-formatos.ts` traduce las hojas de cálculo tal cual, y eso es
 * deliberado: el formato de la app tiene que ser el formato firmado por OCC. Pero
 * hay decisiones que el Excel no sabe decir —una casilla que existe en el papel y
 * que en la práctica no se llena, por ejemplo— y que no pueden resolverse editando
 * el JSON generado, porque el JSON se regenera y el ajuste se perdería.
 *
 * Este archivo es ese lugar. Cada ajuste va con el motivo escrito y la spec que
 * lo pidió, porque un ajuste sin motivo es indistinguible de un error de
 * importación.
 *
 * **Un ajuste que cambia los ítems cambia el formato, y por tanto la versión.**
 * El identificador de una plantilla es `<tipo>-v<version>` y su huella se firma
 * con cada acta: si se altera lo que se pregunta sin subir la versión, las actas
 * viejas dejarían de cuadrar con la plantilla que dicen haber usado.
 */
import type { PlantillaChecklist } from '../types';

/**
 * Spec 003 / RF-4: camioneta y volqueta se controlan por kilometraje.
 *
 * El formato de OCC trae una casilla de horómetro para las dos, pero esos
 * equipos no trabajan por horas de motor: lo que se controla son los kilómetros.
 * Pedir una lectura que nadie mira convierte el preoperacional en un trámite, y
 * un trámite se llena con cualquier número.
 *
 * Se quita el ítem y se oculta el medidor. Las dos cosas: dejar el ítem dentro
 * de las secciones con el medidor oculto haría que el operador nunca pudiera
 * firmar, porque la evaluación lo contaría como una respuesta que falta.
 */
const SIN_HOROMETRO = new Set(['camioneta', 'volqueta']);

/** Aplica a una plantilla recién importada lo que el Excel no sabe decir. */
export function aplicarAjustes(plantilla: PlantillaChecklist): PlantillaChecklist {
  if (!SIN_HOROMETRO.has(plantilla.tipoVehiculo)) return plantilla;

  const secciones = plantilla.secciones
    .map((seccion) => ({
      ...seccion,
      items: seccion.items.filter((item) => !(item.tipo === 'numero' && item.unidad === 'h')),
    }))
    .filter((seccion) => seccion.items.length > 0);

  return {
    ...plantilla,
    // v2: se quitó un ítem, así que la huella cambia y la versión tiene que
    // acompañarla. Las actas firmadas contra la v1 siguen resolviéndose contra
    // la v1, que permanece en la base del servidor.
    version: 2,
    medidores: { ...plantilla.medidores, horometro: 'oculto' },
    secciones,
  };
}
