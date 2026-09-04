/**
 * Dónde está el servidor, visto desde el teléfono.
 *
 * `EXPO_PUBLIC_API_URL` es pública a propósito —es una dirección, no un
 * secreto— y por eso Expo la incrusta en el bundle. Las credenciales de verdad
 * viven en el servidor y nunca cruzan esta frontera.
 *
 * En desarrollo, si no se define, se deduce del propio servidor de Metro: el
 * teléfono ya está hablando con esa máquina, así que es la dirección correcta
 * sin tener que configurarla ni acordarse de la IP del portátil.
 */
import Constants from 'expo-constants';

function deMetro(): string | null {
  // "192.168.1.20:8081" en un equipo físico, "localhost:8081" en emulador.
  const anfitrion = Constants.expoConfig?.hostUri;
  return anfitrion ? `http://${anfitrion.split(':').slice(0, -1).join(':')}:8081` : null;
}

export function urlDelServidor(): string {
  const configurada = process.env.EXPO_PUBLIC_API_URL;
  if (configurada) return configurada.replace(/\/$/, '');

  const metro = deMetro();
  if (metro) return metro;

  throw new Error(
    'No sé a qué servidor hablar. Defina EXPO_PUBLIC_API_URL en el archivo .env ' +
      '(por ejemplo, la dirección del despliegue).',
  );
}
