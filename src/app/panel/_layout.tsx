import { Stack } from 'expo-router';

import { Colors } from '@/constants/theme';
import { BarraNavegacion } from '@/features/panel/barra-navegacion';
import { MarcoSesion } from '@/features/panel/marco-sesion';
import { ProveedorSesionPanel } from '@/features/panel/sesion';

/**
 * El panel de administración.
 *
 * Vive en el navegador, pero no lleva extensión de plataforma: el peligro es
 * unidireccional. Solo el operador arrastra SQLite; estas pantallas hablan por
 * `fetch` con `/api/*` y son inertes en el bundle nativo.
 *
 * **Nada de aquí puede importar `src/db/local`.** Esa frontera la vigila en
 * caliente `src/db/local/client.ts`.
 *
 * El proveedor de sesión envuelve todo y `MarcoSesion` decide qué se pinta: el
 * ingreso, el cambio de contraseña obligatorio, o el panel. El encabezado del
 * `Stack` se sustituye por la barra de navegación, porque en un panel de
 * administración se salta entre secciones constantemente y un botón de volver
 * convertiría cada salto en dos.
 */
export default function LayoutPanel() {
  return (
    <ProveedorSesionPanel>
      <MarcoSesion>
        <Stack
          screenOptions={{
            header: () => <BarraNavegacion />,
            contentStyle: { backgroundColor: Colors.light.background },
          }}
        >
          <Stack.Screen name="index" options={{ title: 'PreOpera OCC · Administración' }} />
          <Stack.Screen name="obras" options={{ title: 'Obras · PreOpera OCC' }} />
          <Stack.Screen name="personas" options={{ title: 'Personas · PreOpera OCC' }} />
          <Stack.Screen name="vehiculos" options={{ title: 'Vehículos · PreOpera OCC' }} />
          <Stack.Screen name="asignaciones" options={{ title: 'Asignaciones · PreOpera OCC' }} />
          <Stack.Screen name="bitacoras" options={{ title: 'Bitácoras · PreOpera OCC' }} />
          <Stack.Screen
            name="preoperacionales"
            options={{ title: 'Preoperacionales · PreOpera OCC' }}
          />
          <Stack.Screen name="almacen" options={{ title: 'Almacén · PreOpera OCC' }} />
          <Stack.Screen name="cantera" options={{ title: 'Control Cantera · PreOpera OCC' }} />
        </Stack>
      </MarcoSesion>
    </ProveedorSesionPanel>
  );
}
