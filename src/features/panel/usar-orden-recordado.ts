/**
 * El orden de una tabla, recordado en ese navegador (spec 015).
 *
 * ── En `localStorage`, no en la dirección ──
 *
 * La búsqueda vive en la dirección (`usar-parametro-direccion`), pero el orden no
 * puede: el menú lleva a `/panel/personas` sin parámetros, así que al volver
 * desde otro módulo se perdería, y RF-16 pide justo lo contrario. Es una
 * comodidad de quien mira, no un dato de la obra, y eso es lo que el
 * almacenamiento del navegador puede guardar.
 *
 * ── Nunca puede fallar ──
 *
 * En una ventana privada o con el almacenamiento bloqueado, leer o escribir
 * lanza. Todo va en `try/catch`: si no se puede recordar, la tabla arranca por
 * el orden de siempre (RF-17) y sigue ordenándose mientras la pantalla esté
 * abierta. Lo guardado se valida con `leerOrdenGuardado`, que descarta lo roto.
 */
import { useCallback, useState } from 'react';
import { Platform } from 'react-native';

import { leerOrdenGuardado, ordenTrasPulsar, type Orden } from './ordenar';

const PREFIJO = 'panel.orden.';

function leer(tabla: string, claves: readonly string[], porDefecto: Orden): Orden {
  if (Platform.OS !== 'web' || typeof window === 'undefined') return porDefecto;
  try {
    return leerOrdenGuardado(window.localStorage.getItem(PREFIJO + tabla), claves, porDefecto);
  } catch {
    return porDefecto;
  }
}

function guardar(tabla: string, orden: Orden) {
  if (Platform.OS !== 'web' || typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(PREFIJO + tabla, JSON.stringify(orden));
  } catch {
    // Sin almacenamiento el orden dura lo que dure la pantalla. Ver la cabecera.
  }
}

/**
 * @param tabla  nombre de la tabla, para no mezclar órdenes de pantallas distintas
 * @param claves  las columnas que se pueden ordenar
 * @param porDefecto  el orden mientras no se haya elegido otro
 */
export function useOrdenRecordado(
  tabla: string,
  claves: readonly string[],
  porDefecto: Orden,
): { orden: Orden; pulsar: (clave: string) => void } {
  // Se lee una sola vez, al montar: el inicializador perezoso evita tocar el
  // almacenamiento en cada pintado.
  const [orden, setOrden] = useState<Orden>(() => leer(tabla, claves, porDefecto));

  const pulsar = useCallback(
    (clave: string) => {
      setOrden((actual) => {
        const nuevo = ordenTrasPulsar(actual, clave);
        // Escribir aquí es seguro aunque React repita la función en desarrollo:
        // guardar el mismo orden dos veces deja lo mismo.
        guardar(tabla, nuevo);
        return nuevo;
      });
    },
    [tabla],
  );

  return { orden, pulsar };
}
