/**
 * Quién arranca una sincronización, y por qué solo puede haber una a la vez.
 *
 * Este módulo existe por un fallo concreto: el operador firmaba su
 * preoperacional con el teléfono conectado a la WiFi de la obra y el registro se
 * quedaba en la cola. No estaba roto ni la subida ni el servidor — es que
 * **nadie llamaba a la subida**. Los disparadores eran dos, abrir sesión y
 * recuperar la red, y ninguno ocurre en el momento en que se firma: la sesión ya
 * estaba abierta y la red nunca se cayó, así que no había ninguna transición que
 * escuchar. El trabajo esperaba al día siguiente.
 *
 * De ahí el tercer disparador, `drenarEnSegundoPlano`, que llaman los sitios que
 * cierran una captura. Es el momento con más señal de toda la jornada —el
 * operador acaba de terminar, mirando el teléfono— y era justo el que no se
 * estaba aprovechando.
 *
 * El candado vive aquí y no en el hook porque ahora hay tres puntos de entrada.
 * Con el candado en uno solo de ellos, firmar mientras corre la sincronización
 * de arranque lanzaría dos drenajes a la vez sobre la misma cola, y el orden
 * estricto de `seq` del que depende `push.ts` dejaría de estar garantizado.
 *
 * **Nada de esto se espera desde una pantalla.** Todas las funciones tragan sus
 * propios errores: una sincronización que falla no es un error de cara al
 * operador, es simplemente algo que ya ocurrirá.
 */
import { sincronizar } from './pull';
import { subirPendientes } from './push';

/** Un solo drenaje a la vez, sea quien sea el que lo pida. */
let corriendo = false;

/**
 * Sube lo pendiente y baja la instantánea, en ese orden.
 *
 * **Sube antes de bajar**: lo que el operador capturó vale más que lo que le
 * puedan haber asignado. Si la ventana de señal es de diez segundos, que se vaya
 * en sacar su trabajo del teléfono.
 */
export async function sincronizacionCompleta(): Promise<void> {
  if (corriendo) return;
  corriendo = true;
  try {
    const subida = await subirPendientes();
    if (subida.estado === 'reactivar') return avisarReactivar();

    const bajada = await sincronizar();
    if (bajada.estado === 'reactivar') avisarReactivar();
  } catch (fallo) {
    console.warn('[sync] no se pudo sincronizar:', fallo);
  } finally {
    corriendo = false;
  }
}

/** Solo la subida. Lo que se acaba de capturar no necesita bajar nada. */
export async function drenarCola(): Promise<void> {
  if (corriendo) return;
  corriendo = true;
  try {
    const subida = await subirPendientes();
    if (subida.estado === 'reactivar') avisarReactivar();
  } catch (fallo) {
    console.warn('[sync] no se pudo subir:', fallo);
  } finally {
    corriendo = false;
  }
}

/**
 * Para llamar justo después de encolar una captura, sin esperarla.
 *
 * Devolver la promesa tentaría a alguien a ponerle un `await` delante, y con él
 * un `spinner` en la pantalla del operador esperando a la red — exactamente lo
 * que este proyecto no hace. Por eso devuelve `void`.
 */
export function drenarEnSegundoPlano(): void {
  void drenarCola();
}

/**
 * El equipo dejó de estar autorizado. No se fuerza nada desde aquí: el operador
 * sigue trabajando con lo que tiene y se entera cuando vuelva a bloquear el
 * equipo. Perderle la jornada por esto sería peor que el problema.
 */
function avisarReactivar(): void {
  console.warn('[sync] este equipo tiene que volver a activarse');
}
