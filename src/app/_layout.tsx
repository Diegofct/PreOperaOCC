import { Slot } from 'expo-router';
import { SafeAreaProvider } from 'react-native-safe-area-context';

/**
 * Lo único que comparten las dos superficies de la app.
 *
 * Aquí no se importa nada específico de plataforma, y esa es toda su razón de
 * ser: el operador (`(operador)/`) arrastra SQLite y el panel (`panel/`) arrastra
 * `fetch`, así que cada uno monta sus proveedores en su propio layout. Mezclarlos
 * aquí metería `src/db/local` en el grafo del bundle web.
 */
export default function LayoutRaiz() {
  return (
    <SafeAreaProvider>
      <Slot />
    </SafeAreaProvider>
  );
}
