/**
 * El estado de una acción que se pide **desde dentro de una ventana** (spec 015,
 * RF-25 a RF-27).
 *
 * ── Por qué no vale `useListado.ejecutar` ──
 *
 * `ejecutar` deja el motivo del fallo en el error de la pantalla, y la pantalla
 * queda **detrás del telón** de la ventana: quien acaba de pulsar «Guardar» ve la
 * ventana abierta, sin mensaje, y parece que el botón no hizo nada. Le pasó a la
 * gerencia el 2026-09-22 al mover a un almacenista a una obra sin ese módulo: el
 * servidor contestó «Esa obra no lleva el módulo Almacén.» y nadie llegó a leerlo.
 *
 * Este hook hace lo mismo que `ejecutar` con el error —incluido repartir
 * `ErrorApi.campos` bajo cada campo— pero deja el resultado **en la ventana**.
 * `useListado.ejecutar` se queda como está para el formulario de alta de cada
 * pantalla, que sí está en la página y ahí el aviso se lee bien.
 *
 * ── Por qué no cierra la ventana al salir bien ──
 *
 * Porque cerrar no siempre es lo correcto y no es asunto suyo. «Corregir» cierra;
 * la ventana que muestra una contraseña temporal se queda abierta con el secreto
 * dentro (RF-32), y un hook que cerrara obligaría a esquivarlo justo en el caso
 * nuevo de la spec. Devuelve si salió bien y quien lo usa decide.
 */
import { useCallback, useState } from 'react';

import { useAvisos } from './avisos';
import { ErrorApi, mensajeDe } from './cliente-api';
import { repartirFallo } from './repartir-fallo';

export interface AccionDeVentana {
  /** Mientras corre: los botones se deshabilitan y el de la acción dice «…». */
  ejecutando: boolean;
  /**
   * Desde la 050 siempre `null`: el motivo va debajo de su campo o al aviso de error (RF-57, RF-79). Se
   * queda para que las ventanas que lo pintan no tengan que cambiar todas a la vez.
   */
  error: string | null;
  /** Lo que el servidor dijo de un campo concreto, para pasárselo a su `Campo`. */
  campoConError: (campo: string) => string | undefined;
  /** Corre la acción y devuelve si salió bien. No cierra nada. Con `exito`, ese aviso (RF-55). */
  ejecutar: (accion: () => Promise<unknown>, opciones?: { exito?: string }) => Promise<boolean>;
  /** Borra el error y los campos marcados, sin correr nada. */
  limpiar: () => void;
}

/**
 * @param conCampos  la ventana pasa `campoConError` a sus campos. Sin eso, un motivo «de campo» no se vería
 *   en ningún sitio —el código repetido de una obra, en una ventana que no lo pinta—, así que va al aviso de
 *   error como cualquier otro (spec 050, RF-57, RF-79).
 */
export function useAccionDeVentana({ conCampos = false }: { conCampos?: boolean } = {}): AccionDeVentana {
  const [ejecutando, setEjecutando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [camposConError, setCamposConError] = useState<Record<string, string>>({});

  const limpiar = useCallback(() => {
    setError(null);
    setCamposConError({});
  }, []);

  const avisos = useAvisos();
  const ejecutar = useCallback(
    async (accion: () => Promise<unknown>, opciones?: { exito?: string }) => {
      setEjecutando(true);
      setError(null);
      setCamposConError({});
      try {
        await accion();
        if (opciones?.exito) avisos.exito(opciones.exito);
        return true;
      } catch (fallo) {
        /*
         * Spec 050, RF-57, RF-79 (cambia la 015, RF-33). Si el servidor señala campos, cada motivo va
         * debajo del suyo y en ningún otro sitio. Si no, al aviso de error, que se ve encima de la
         * ventana: el caso que motivó este hook en la 015 («Esa obra no lleva el módulo Almacén.») ya no
         * se queda sin leer. La ventana sigue abierta con lo escrito (RF-80): este hook no cierra nada.
         */
        const señalados = fallo instanceof ErrorApi && conCampos ? (fallo.campos ?? {}) : {};
        const { campos, aviso } = repartirFallo(señalados, mensajeDe(fallo));
        setCamposConError(campos);
        if (aviso) avisos.error(aviso);
        return false;
      } finally {
        // En `finally` y no en cada rama: si esto se olvidara tras un fallo, la
        // ventana quedaría con los botones muertos y sin forma de reintentar,
        // que es justo lo que RF-25 pide que no pase.
        setEjecutando(false);
      }
    },
    [avisos, conCampos],
  );

  const campoConError = useCallback(
    (campo: string) => camposConError[campo],
    [camposConError],
  );

  return { ejecutando, error, campoConError, ejecutar, limpiar };
}
