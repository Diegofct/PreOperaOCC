/**
 * Dónde se pintan los avisos en el navegador (spec 050, RF-58, RF-82): un portal propio sobre `document.body`.
 *
 * No es la `CapaFlotante` de los selectores y las ventanas: esa es el `Modal` de React Native, que atrapa
 * el foco y pone un telón que no deja tocar la página. Un aviso no debe estorbar: la página y la ventana
 * abierta siguen funcionando debajo, y solo el propio aviso recibe el puntero (su botón «Cerrar»). Y tiene
 * que verse **por encima** de una ventana abierta, porque cuando guardar falla la ventana se queda con lo
 * escrito y el error va al aviso (RF-57, RF-80): por eso el portal lleva un `z-index` por encima del de los
 * `Modal`, que también cuelgan de `document.body`.
 *
 * Solo en la web; en el celular el panel no corre (ver `capa-de-avisos.tsx`).
 */
import { useEffect, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

/** Por encima de las ventanas (`Modal` de React Native Web, que se apilan en `document.body`). */
const POR_ENCIMA_DE_LAS_VENTANAS = '2147483000';

export function CapaDeAvisos({ children }: { children: ReactNode }) {
  // El nodo se crea al montar y no en un efecto, para no pintar dos veces. En el servidor (la web se sirve
  // con `output: "server"`) no hay `document`: ahí no hay capa, y nunca hay avisos en el primer pintado.
  const [nodo] = useState<HTMLElement | null>(() => {
    if (typeof document === 'undefined') return null;
    const capa = document.createElement('div');
    capa.setAttribute('data-capa', 'avisos');
    Object.assign(capa.style, {
      position: 'fixed',
      inset: '0',
      zIndex: POR_ENCIMA_DE_LAS_VENTANAS,
      // La capa no recibe el puntero; los avisos sí (lo vuelven a activar en su estilo).
      pointerEvents: 'none',
    });
    return capa;
  });

  // Se cuelga de `document.body` mientras haya avisos, y se descuelga al terminar.
  useEffect(() => {
    if (!nodo) return;
    document.body.appendChild(nodo);
    return () => {
      nodo.remove();
    };
  }, [nodo]);

  return nodo ? createPortal(children, nodo) : null;
}
