import { Redirect } from 'expo-router';

/**
 * El destino de todas las rutas del operador en el navegador.
 *
 * Existe para que las variantes `.web.tsx` de esas pantallas sean una sola línea
 * y no cinco redirecciones repetidas.
 */
export default function RedirigirAlPanel() {
  return <Redirect href="/panel" />;
}
