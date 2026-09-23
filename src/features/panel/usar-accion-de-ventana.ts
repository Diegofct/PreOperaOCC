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

import { ErrorApi, mensajeDe } from './cliente-api';

export interface AccionDeVentana {
  /** Mientras corre: los botones se deshabilitan y el de la acción dice «…». */
  ejecutando: boolean;
  /** El motivo del último fallo, para pintarlo arriba de la ventana. */
  error: string | null;
  /** Lo que el servidor dijo de un campo concreto, para pasárselo a su `Campo`. */
  campoConError: (campo: string) => string | undefined;
  /** Corre la acción y devuelve si salió bien. No cierra nada. */
  ejecutar: (accion: () => Promise<unknown>) => Promise<boolean>;
  /** Borra el error y los campos marcados, sin correr nada. */
  limpiar: () => void;
}

export function useAccionDeVentana(): AccionDeVentana {
  const [ejecutando, setEjecutando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [camposConError, setCamposConError] = useState<Record<string, string>>({});

  const limpiar = useCallback(() => {
    setError(null);
    setCamposConError({});
  }, []);

  const ejecutar = useCallback(async (accion: () => Promise<unknown>) => {
    setEjecutando(true);
    setError(null);
    setCamposConError({});
    try {
      await accion();
      return true;
    } catch (fallo) {
      /*
       * **El mismo texto no sale dos veces** (RF-33). Según cuántos campos
       * señale el servidor, el motivo va arriba o va debajo, nunca en los dos
       * sitios:
       *
       *  · Ningún campo, o **uno solo**: el motivo arriba, y el campo no lo
       *    repite. Es el caso que motivó la spec —«Esa obra no lleva el módulo
       *    Almacén.»—, donde además el campo señalado era `rol` mientras lo que
       *    se había cambiado era la obra: repetirlo abajo despistaba.
       *  · **Varios**: cada uno con el suyo debajo, y arriba solo el aviso de
       *    que hay que corregir. Aquí el detalle está en los campos y una frase
       *    suelta arriba no puede resumir tres cosas distintas.
       *
       * Arriba va lo que mande el servidor, y no un texto nuestro, porque su
       * contrato dice que `error` es «un mensaje que se le puede mostrar tal
       * cual a una persona» (ver `@/features/servidor/respuestas`); en los de
       * validación es el del primer campo, nunca un relleno.
       */
      const campos = fallo instanceof ErrorApi ? (fallo.campos ?? {}) : {};
      const motivo = mensajeDe(fallo);
      const distintos = new Set(Object.values(campos));
      const varios = distintos.size > 1;

      setError(varios ? 'Revise los campos marcados.' : motivo);
      // Con un solo motivo, el de arriba ya lo dice: debajo no se repite.
      setCamposConError(varios ? campos : {});
      return false;
    } finally {
      // En `finally` y no en cada rama: si esto se olvidara tras un fallo, la
      // ventana quedaría con los botones muertos y sin forma de reintentar,
      // que es justo lo que RF-25 pide que no pase.
      setEjecutando(false);
    }
  }, []);

  const campoConError = useCallback(
    (campo: string) => camposConError[campo],
    [camposConError],
  );

  return { ejecutando, error, campoConError, ejecutar, limpiar };
}
