/**
 * Cuándo sincroniza el teléfono.
 *
 * Dos disparadores, y ninguno bloquea nada:
 *
 *  1. **Al abrir sesión.** Es el momento en que más probable es que haya señal
 *     —el operador acaba de llegar, muchas veces desde el campamento— y en que
 *     más útil resulta: le van a asignar la máquina del día.
 *  2. **Al recuperar red.** `expo-network` ya era dependencia y su permiso ya
 *     estaba en `app.json` desde la Fase 1, esperando exactamente esto. Un
 *     operador que sale del hueco sin cobertura sincroniza solo, sin tocar nada.
 *
 * **No hay reintentos en bucle.** Si no hay señal, no se hace nada y ya habrá
 * otra oportunidad; un temporizador reintentando cada minuto solo gastaría
 * batería en una obra donde puede no haber cobertura en todo el día.
 *
 * **Sube antes de bajar.** Lo que el operador capturó vale más que lo que le
 * puedan haber asignado: si la ventana de señal es de diez segundos, que se
 * vaya en sacar su trabajo del teléfono.
 */
import * as Network from 'expo-network';
import { useEffect, useRef } from 'react';

import { sincronizar } from './pull';
import { subirPendientes } from './push';

export function useSincronizacion(activa: boolean) {
  // Evita que dos disparos a la vez —abrir sesión justo cuando vuelve la red—
  // apliquen la misma instantánea dos veces.
  const corriendo = useRef(false);

  useEffect(() => {
    if (!activa) return;

    let vigente = true;

    async function intentar() {
      if (corriendo.current || !vigente) return;
      corriendo.current = true;
      try {
        const subida = await subirPendientes();
        if (subida.estado === 'reactivar') {
          console.warn('[sync] este equipo tiene que volver a activarse');
          return;
        }

        const resultado = await sincronizar();
        if (resultado.estado === 'reactivar') {
          // El equipo dejó de estar autorizado. No se fuerza nada desde aquí: el
          // operador sigue trabajando con lo que tiene, y se enterará cuando
          // vuelva a bloquear el equipo. Perderle la jornada por esto sería peor
          // que el problema.
          console.warn('[sync] este equipo tiene que volver a activarse');
        }
      } catch (fallo) {
        // Una sincronización que falla nunca es un error de cara al operador.
        console.warn('[sync] no se pudo sincronizar:', fallo);
      } finally {
        corriendo.current = false;
      }
    }

    void intentar();

    const suscripcion = Network.addNetworkStateListener((estado) => {
      if (estado.isConnected && estado.isInternetReachable !== false) void intentar();
    });

    return () => {
      vigente = false;
      suscripcion.remove();
    };
  }, [activa]);
}
