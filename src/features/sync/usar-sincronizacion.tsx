/**
 * Cuándo sincroniza el teléfono.
 *
 * Dos de los tres disparadores viven aquí, y ninguno bloquea nada:
 *
 *  1. **Al abrir sesión.** Es el momento en que más probable es que haya señal
 *     —el operador acaba de llegar, muchas veces desde el campamento— y en que
 *     más útil resulta: le van a asignar la máquina del día.
 *  2. **Al recuperar red.** `expo-network` ya era dependencia y su permiso ya
 *     estaba en `app.json` desde la Fase 1, esperando exactamente esto. Un
 *     operador que sale del hueco sin cobertura sincroniza solo, sin tocar nada.
 *
 * El tercero —**al cerrar una captura**— no puede vivir aquí: no es un momento
 * de esta pantalla sino del registro que se acaba de firmar, y lo dispara el
 * repositorio que lo encola. Ver `@/features/sync/motor`.
 *
 * **No hay reintentos en bucle.** Si no hay señal, no se hace nada y ya habrá
 * otra oportunidad; un temporizador reintentando cada minuto solo gastaría
 * batería en una obra donde puede no haber cobertura en todo el día.
 */
import * as Network from 'expo-network';
import { useEffect } from 'react';

import { sincronizacionCompleta } from './motor';

export function useSincronizacion(activa: boolean) {
  useEffect(() => {
    if (!activa) return;

    let vigente = true;

    // El candado contra disparos simultáneos está en el motor, no aquí: ahora
    // hay tres puntos de entrada y uno de ellos —firmar— no pasa por este hook.
    const intentar = () => {
      if (vigente) void sincronizacionCompleta();
    };

    intentar();

    const suscripcion = Network.addNetworkStateListener((estado) => {
      if (estado.isConnected && estado.isInternetReachable !== false) intentar();
    });

    return () => {
      vigente = false;
      suscripcion.remove();
    };
  }, [activa]);
}
