/**
 * Lo único que se guarda cifrado en el equipo.
 *
 * Nada de esto es dato de trabajo: son credenciales. Borrarlas es siempre
 * seguro para el operador — lo capturado vive en SQLite y no se toca nunca
 * desde aquí. Ver la regla en `intentos.ts`.
 */
import * as Application from 'expo-application';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const CLAVES = {
  usuarioId: 'auth.usuarioId',
  usuario: 'auth.usuario',
  salt: 'auth.saltDispositivo',
  verificador: 'auth.verificadorPin',
  accessToken: 'auth.accessToken',
  refreshToken: 'auth.refreshToken',
} as const;

export interface Enrolamiento {
  usuarioId: string;
  usuario: string;
  salt: string;
  verificador: string;
}

export async function leerEnrolamiento(): Promise<Enrolamiento | null> {
  const [usuarioId, usuario, salt, verificador] = await Promise.all([
    SecureStore.getItemAsync(CLAVES.usuarioId),
    SecureStore.getItemAsync(CLAVES.usuario),
    SecureStore.getItemAsync(CLAVES.salt),
    SecureStore.getItemAsync(CLAVES.verificador),
  ]);
  if (!usuarioId || !usuario || !salt || !verificador) return null;
  return { usuarioId, usuario, salt, verificador };
}

export async function guardarEnrolamiento(datos: Enrolamiento): Promise<void> {
  await Promise.all([
    SecureStore.setItemAsync(CLAVES.usuarioId, datos.usuarioId),
    SecureStore.setItemAsync(CLAVES.usuario, datos.usuario),
    SecureStore.setItemAsync(CLAVES.salt, datos.salt),
    SecureStore.setItemAsync(CLAVES.verificador, datos.verificador),
  ]);
}

export async function guardarTokens(accessToken: string, refreshToken: string): Promise<void> {
  await Promise.all([
    SecureStore.setItemAsync(CLAVES.accessToken, accessToken),
    SecureStore.setItemAsync(CLAVES.refreshToken, refreshToken),
  ]);
}

export async function leerAccessToken(): Promise<string | null> {
  return SecureStore.getItemAsync(CLAVES.accessToken);
}

export async function leerRefreshToken(): Promise<string | null> {
  return SecureStore.getItemAsync(CLAVES.refreshToken);
}

/**
 * Desenrola el equipo: hay que volver a ingresar usuario + PIN.
 *
 * No borra ni un solo registro de trabajo. Esa separación es deliberada y es
 * lo que hace que un PIN mal tecleado diez veces no cueste una jornada de obra.
 */
export async function olvidarEquipo(): Promise<void> {
  await Promise.all(Object.values(CLAVES).map((clave) => SecureStore.deleteItemAsync(clave)));
}

/** Identificador estable del equipo, para que el admin pueda revocarlo. */
export function idDelDispositivo(): string {
  if (Platform.OS !== 'android') return 'no-android';
  return Application.getAndroidId() ?? 'desconocido';
}
