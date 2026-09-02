/**
 * Lo que se ve según quién esté dentro.
 *
 * Está aparte del layout de ruta porque el layout **no puede** usar el hook de
 * sesión: tendría que estar dentro del proveedor que él mismo monta. Aquí ya se
 * está dentro, y esta es la única pieza que decide entre las cuatro pantallas
 * posibles.
 *
 * La pantalla de contraseña obligatoria se interpone **antes de montar el
 * `Stack`**, no como una redirección. Una redirección se esquiva escribiendo
 * otra URL; esto no existe hasta que la contraseña deje de ser temporal. Y aun
 * si alguien lograra pintar el panel, el servidor rechaza con 409 todas las
 * demás rutas mientras `debeCambiar` siga puesto: la defensa real está allá, y
 * esto solo evita enseñar una pantalla que no funcionaría.
 */
import type { ReactNode } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { Colors, Marca } from '@/constants/theme';

import PantallaCambiarClave from './pantalla-cambiar-clave';
import PantallaIngreso from './pantalla-ingreso';
import { useSesionPanel } from './sesion';

export function MarcoSesion({ children }: { children: ReactNode }) {
  const { estado } = useSesionPanel();

  if (estado === 'comprobando') {
    return (
      <View style={estilos.centro}>
        <ActivityIndicator color={Marca.primario} size="large" />
      </View>
    );
  }

  if (estado === 'fuera') return <PantallaIngreso />;
  if (estado === 'debe_cambiar') return <PantallaCambiarClave />;

  return <>{children}</>;
}

const estilos = StyleSheet.create({
  centro: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.light.background,
  },
});
