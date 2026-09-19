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
import { useEffect } from 'react';
import type { ReactNode } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { Colors, Panel } from '@/constants/theme';

import PantallaCambiarClave from './pantalla-cambiar-clave';
import PantallaIngreso from './pantalla-ingreso';
import { useSesionPanel } from './sesion';

/**
 * El título de la pestaña mientras no hay sesión.
 *
 * El `Stack` de rutas pone el título de la pantalla a la que se va, pero cuando
 * no hay sesión **ese `Stack` ni siquiera se monta**: el contenido se sustituye
 * sin navegar, a propósito, para que al entrar se caiga justo donde se iba. El
 * efecto secundario era que la pestaña anunciaba «Bitácoras · Control de Obra
 * OCC» mientras se veía el ingreso.
 *
 * Se escribe directo sobre `document` y no con una API de rutas porque esto es
 * exactamente lo que hay por encima de las rutas. La guarda de `undefined` es
 * por el bundle nativo, donde estas pantallas entran aunque estén inertes.
 */
function useTituloDeLaPestana(titulo: string | null) {
  useEffect(() => {
    if (titulo === null || typeof document === 'undefined') return;
    document.title = titulo;
  }, [titulo]);
}

export function MarcoSesion({ children }: { children: ReactNode }) {
  const { estado, cambiandoClave, pedirCambioDeClave } = useSesionPanel();

  useTituloDeLaPestana(
    estado === 'fuera'
      ? 'Ingresar · Control de Obra OCC'
      : estado === 'debe_cambiar'
        ? 'Cambiar contraseña · Control de Obra OCC'
        : null,
  );

  if (estado === 'comprobando') {
    return (
      <View style={estilos.centro}>
        <ActivityIndicator color={Panel.accion} size="large" />
      </View>
    );
  }

  if (estado === 'fuera') return <PantallaIngreso />;
  // Obligatorio o voluntario, el cambio de contraseña se pinta igual y desde
  // aquí: es la única capa que está por encima del `Stack`.
  if (estado === 'debe_cambiar') return <PantallaCambiarClave />;
  if (cambiandoClave) return <PantallaCambiarClave onCancelar={() => pedirCambioDeClave(false)} />;

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
