/**
 * Recordatorios de la bitácora.
 *
 * Son notificaciones **locales**: las programa el propio celular y las dispara
 * el sistema operativo, sin servidor y sin señal. Es la consecuencia buena de
 * no usar Firebase — sin push remoto, pero esto funciona en una obra sin cobertura.
 *
 * ── Por qué `expo-notifications` se carga con `require()` y no con `import` ──
 *
 * En Expo Go sobre Android **importar el módulo lanza una excepción**, no una
 * advertencia. `DevicePushTokenAutoRegistration.fx.js` registra un listener de
 * push en el ámbito del módulo, y desde SDK 53 esa ruta aborta en Expo Go.
 * Como `index.js` reexporta desde ese archivo, cualquier `import` de
 * `expo-notifications` revienta antes de ejecutar una sola línea propia — y se
 * lleva por delante el módulo que lo importó. Eso dejaba a `_layout.tsx` sin
 * `default export` y tumbaba la app entera.
 *
 * Cargarlo dentro de una función, y solo fuera de Expo Go, aísla el problema
 * aquí: el resto de la app no sabe que existe.
 *
 * ── Regla de este archivo ──
 *
 * **Nada de aquí puede tumbar un guardado.** Un aviso es una comodidad; el
 * preoperacional firmado y la bitácora son la evidencia. Cada función atrapa
 * sus errores y devuelve un resultado en vez de lanzar.
 *
 * Y hay una segunda razón para no confiar solo en el aviso: Xiaomi, Oppo y
 * Huawei traen ahorros de batería que retrasan o silencian notificaciones de
 * apps "no usadas recientemente". Por eso el inicio y la bitácora muestran en
 * ámbar que falta el registro de la hora en curso.
 */
import { isRunningInExpoGo } from 'expo';
import { Platform } from 'react-native';

/** Solo tipos: `typeof import(...)` se borra al compilar, no carga nada. */
type ModuloNotificaciones = typeof import('expo-notifications');

export const CANAL = 'bitacora';

/**
 * A qué hora se le recuerda al jefe de operadores que llene las bitácoras.
 *
 * **Pendiente que OCC confirme a qué hora termina el turno en obra.** Está aquí
 * como constante y no en la base porque todavía no hay a quién preguntarle;
 * cuando se sepa, se mueve a `app_kv` y el dashboard la configura.
 */
export const HORA_RECORDATORIO = 17;

/** Marca las notificaciones de la bitácora para poder cancelarlas en bloque. */
const ETIQUETA = { tipo: 'bitacora' } as const;

export type ResultadoAvisos =
  | { estado: 'programados'; cuantos: number }
  | { estado: 'sin_permiso' }
  | { estado: 'no_soportado' }
  | { estado: 'error'; detalle: string };

let modulo: ModuloNotificaciones | null = null;
let yaSeIntento = false;
let handlerPuesto = false;

function notificaciones(): ModuloNotificaciones | null {
  if (isRunningInExpoGo()) return null;
  if (yaSeIntento) return modulo;
  yaSeIntento = true;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    modulo = require('expo-notifications') as ModuloNotificaciones;
  } catch (error) {
    console.warn('[bitacora] expo-notifications no está disponible:', error);
    modulo = null;
  }
  return modulo;
}

/** Si no, no tiene sentido ofrecerle al operador un recordatorio que no llegará. */
export function hayAvisosDisponibles(): boolean {
  return notificaciones() !== null;
}

/** Prepara el canal de Android y el manejador de primer plano. */
export async function prepararCanal(): Promise<void> {
  const Notifications = notificaciones();
  if (!Notifications) return;

  try {
    if (!handlerPuesto) {
      // En primer plano el aviso también se muestra: el operador puede tener la
      // app abierta y aun así necesita verlo.
      Notifications.setNotificationHandler({
        handleNotification: async () => ({
          shouldPlaySound: true,
          shouldSetBadge: false,
          shouldShowBanner: true,
          shouldShowList: true,
        }),
      });
      handlerPuesto = true;
    }

    if (Platform.OS !== 'android') return;

    await Notifications.setNotificationChannelAsync(CANAL, {
      name: 'Recordatorio de bitácora',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 300, 200, 300],
      lightColor: '#208AEF',
      sound: 'default',
    });
  } catch (error) {
    console.warn('[bitacora] no se pudo preparar el canal de avisos:', error);
  }
}

export async function pedirPermiso(): Promise<boolean> {
  const Notifications = notificaciones();
  if (!Notifications) return false;

  try {
    const actual = await Notifications.getPermissionsAsync();
    if (actual.granted) return true;
    if (!actual.canAskAgain) return false;
    const pedido = await Notifications.requestPermissionsAsync();
    return pedido.granted;
  } catch (error) {
    console.warn('[bitacora] no se pudo pedir permiso de avisos:', error);
    return false;
  }
}

/**
 * Un solo recordatorio, repetido todos los días al terminar el turno.
 *
 * Un disparador `DAILY` en vez de N avisos sueltos: el sistema operativo lo
 * repite solo, sobrevive a que la app no se abra en varios días, y no hay nada
 * que reprogramar cada mañana.
 *
 * Se programa al abrir sesión un supervisor y se cancela al salir. Nunca lanza:
 * quien la llama decide si le dice algo al usuario.
 */
export async function programarRecordatorioDiario(): Promise<ResultadoAvisos> {
  const Notifications = notificaciones();
  if (!Notifications) return { estado: 'no_soportado' };

  try {
    await cancelarRecordatorio();
    if (!(await pedirPermiso())) return { estado: 'sin_permiso' };

    await Notifications.scheduleNotificationAsync({
      content: {
        title: 'Bitácoras del día',
        body: 'Registre el horómetro y la actividad de cada máquina antes de cerrar la obra.',
        data: ETIQUETA,
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
        hour: HORA_RECORDATORIO,
        minute: 0,
        ...(Platform.OS === 'android' ? { channelId: CANAL } : {}),
      },
    });
    return { estado: 'programados', cuantos: 1 };
  } catch (error) {
    console.warn('[bitacora] no se pudo programar el recordatorio:', error);
    return { estado: 'error', detalle: String(error) };
  }
}

/** Al cerrar sesión se apaga. Un equipo que cambió de dueño no debe seguir avisando. */
export async function cancelarRecordatorio(): Promise<void> {
  const Notifications = notificaciones();
  if (!Notifications) return;

  try {
    const programadas = await Notifications.getAllScheduledNotificationsAsync();
    for (const aviso of programadas) {
      const datos = aviso.content.data as { tipo?: string } | null;
      if (datos?.tipo === ETIQUETA.tipo) {
        await Notifications.cancelScheduledNotificationAsync(aviso.identifier);
      }
    }
  } catch (error) {
    console.warn('[bitacora] no se pudieron cancelar los avisos:', error);
  }
}

/**
 * Avisa cuando el operador toca la notificación de la hora.
 *
 * Vive aquí y no en el layout para que ninguna pantalla tenga que importar
 * `expo-notifications` — que es exactamente lo que no se puede hacer.
 */
export function escucharToquesDeAviso(alTocar: () => void): () => void {
  const Notifications = notificaciones();
  if (!Notifications) return () => {};

  try {
    const suscripcion = Notifications.addNotificationResponseReceivedListener((respuesta) => {
      const datos = respuesta.notification.request.content.data as { tipo?: string } | null;
      if (datos?.tipo === ETIQUETA.tipo) alTocar();
    });
    return () => suscripcion.remove();
  } catch (error) {
    console.warn('[bitacora] no se pudo escuchar los avisos:', error);
    return () => {};
  }
}

/** Lo que el jefe de operadores debe saber si el recordatorio no va a sonar. */
export function mensajeDeAvisos(resultado: ResultadoAvisos): string | null {
  switch (resultado.estado) {
    case 'programados':
      return null;
    case 'sin_permiso':
      return 'La aplicación no tiene permiso de notificaciones, así que no habrá recordatorio diario.';
    case 'no_soportado':
      return 'En Expo Go no funciona el recordatorio diario.';
    case 'error':
      return 'No se pudo activar el recordatorio diario.';
  }
}
