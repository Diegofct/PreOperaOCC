import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { ActivityIndicator, View } from 'react-native';

import { Colors, Marca, Texto } from '@/constants/theme';
import { ProveedorBaseLocal } from '@/db/local/provider';
import { PantallaIngreso } from '@/features/auth/pantalla-ingreso';
import { ProveedorSesion, useSesion } from '@/features/auth/sesion';
import { useSincronizacion } from '@/features/sync/usar-sincronizacion';

/**
 * La superficie del operador.
 *
 * Todo lo que toca la base local vive bajo este layout y no por encima: es lo
 * que mantiene `src/db/local` fuera del bundle web. El grupo no aparece en las
 * rutas, así que `/`, `/vehiculo` y `/preoperacional` siguen siendo lo que eran.
 *
 * La app del operador se fuerza en tema claro: el modo oscuro es ilegible bajo
 * el sol de una obra, que es donde se usa.
 */
export default function LayoutOperador() {
  return (
    <>
      {/* Con edge-to-edge, la barra de estado se pinta sobre el header azul. */}
      <StatusBar style="light" />
      <ProveedorBaseLocal>
        <ProveedorSesion>
          <Puerta />
        </ProveedorSesion>
      </ProveedorBaseLocal>
    </>
  );
}

/**
 * Sin sesión no se monta el `Stack`.
 *
 * Es más contundente que un guard con redirección: no hay una ruta de trabajo
 * que exista y esté protegida, sencillamente no existe hasta que hay operador.
 * Y nada de esto necesita red — el PIN se valida contra el propio equipo.
 */
function Puerta() {
  // Los recordatorios diarios se fueron con la bitácora del celular (spec 004):
  // avisaban a quien llevaba las bitácoras, y eso ahora se hace en el panel.
  const { estado } = useSesion();

  /**
   * La bajada de datos corre aquí y no en `ProveedorBaseLocal`.
   *
   * Ese provider es "lo único que puede mostrar un spinner en el arranque", y la
   * sincronización no puede añadir un segundo: el operador tiene que poder
   * trabajar en el instante en que desbloquea, con lo que ya tenga bajado. Si
   * hay señal, los datos se refrescan por detrás mientras él arranca la máquina;
   * si no la hay, no pasa nada en absoluto.
   */
  useSincronizacion(estado === 'abierta');

  if (estado === 'cargando') {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.light.background }}>
        <ActivityIndicator size="large" color={Marca.primario} />
      </View>
    );
  }

  if (estado !== 'abierta') return <PantallaIngreso />;

  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: Marca.primario },
        headerTintColor: Marca.sobreColor,
        headerTitleStyle: { fontSize: Texto.etiqueta, fontWeight: '700' },
        contentStyle: { backgroundColor: Colors.light.background },
      }}
    >
      <Stack.Screen name="index" options={{ title: 'PreOpera OCC' }} />
      <Stack.Screen name="vehiculo" options={{ title: 'Escoger vehículo' }} />
      <Stack.Screen name="preoperacional" options={{ title: 'Preoperacional' }} />
      <Stack.Screen
        name="resultado"
        options={{ title: 'Resultado', headerBackVisible: false, gestureEnabled: false }}
      />
    </Stack>
  );
}
