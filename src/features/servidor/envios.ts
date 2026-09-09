/**
 * La forma de lo que manda el celular, escrita una sola vez.
 *
 * Existe por un fallo que costó dos rondas de pruebas en campo. La respuesta a
 * un ítem tenía su tipo en `@/features/checklists/types` y su validación aquí
 * —dos declaraciones de la misma cosa, en dos targets distintos, que nadie
 * comparaba nunca— y habían divergido en dos puntos a la vez:
 *
 *  - `valor` solo aceptaba texto. En cuanto el horómetro y el odómetro pasaron a
 *    viajar como ítems del formato (ver `respuestasDeMedidores`), su lectura
 *    numérica dejó de validar: el envío se rechazaba con **400, que la cola
 *    trata como definitivo**, y el preoperacional quedaba marcado como
 *    rechazado en el teléfono sin que nada se quejara en voz alta.
 *  - el comentario del operador se llamaba `observacion`, un nombre que no
 *    existe en ningún otro sitio del proyecto. Zod descarta lo que no declara,
 *    así que **lo que el operador escribía junto a un hallazgo se perdía en
 *    silencio al ingresar**, igual que la lista de fotos del ítem.
 *
 * Por eso el esquema vive aquí y no dentro del `+api.ts`: `scripts/verificar-reglas.ts`
 * lo importa y comprueba contra él exactamente lo que arma el móvil. Un tipo y
 * una validación que discrepan no fallan al compilar — solo en obra.
 */
import { z } from 'zod';

/** Una respuesta del checklist tal como la escribe `RespuestaItem` en el móvil. */
export const respuestaEnviada = z.object({
  itemKey: z.string().min(1),
  seccionKey: z.string().min(1),
  label: z.string(),
  sistema: z.string().nullish(),
  tipo: z.string(),
  inmoviliza: z.boolean(),
  /**
   * `conforme`/`no_conforme`/`na` en los ítems de conformidad, y un **número**
   * en los de tipo `numero` —horómetro, odómetro—, que también son ítems del
   * formato. `null` no se rechaza aquí: lo sin responder lo decide
   * `evaluarPreoperacional`, que es quien tiene la plantilla delante.
   */
  valor: z.union([z.string(), z.number(), z.null()]),
  /** Lo que el operador escribió junto a un hallazgo. Es evidencia: no se pierde. */
  comentario: z.string().max(2000).nullish(),
  /** Las fotos del ítem, por id. Suben aparte y más tarde; el vínculo viaja ya. */
  mediaIds: z.array(z.string().max(64)).max(20).nullish(),
  marcadoEnBloque: z.boolean().nullish(),
  respondidoEn: z.number().int().nonnegative().nullish(),
});

export type RespuestaEnviada = z.infer<typeof respuestaEnviada>;
