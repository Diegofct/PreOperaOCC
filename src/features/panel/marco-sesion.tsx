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

import { Panel } from '@/constants/theme';
import { tituloConSistema } from '@/shared/catalogos/marca';

import { ProveedorDeAvisos } from './avisos';
import PantallaCambiarClave from './pantalla-cambiar-clave';
import PantallaIngreso from './pantalla-ingreso';
import { useSesionPanel } from './sesion';

/**
 * El título de la pestaña mientras no hay sesión, o mientras se cambia la contraseña
 * (obligatorio o por gusto: spec 049, RF-13). Al cancelar un cambio por gusto el panel
 * se vuelve a montar, y su `TituloDeLaPestana` repone el de la pantalla.
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
      ? tituloConSistema('Ingresar')
      : // Spec 049, RF-13: obligatorio o por gusto, mientras se cambia la contraseña.
        estado === 'debe_cambiar' || cambiandoClave
        ? tituloConSistema('Cambiar contraseña')
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
  // El obligatorio se pinta en lugar del panel y sin «Cancelar» (RF-83): no hay a dónde volver hasta
  // que se cambie. El que se pide por gusto va encima, más abajo.
  if (estado === 'debe_cambiar') return <PantallaCambiarClave />;

  // Spec 050, RF-81: los avisos encima del `Stack`, así sobreviven al cambio de pantalla.
  return (
    <ProveedorDeAvisos>
      {children}
      {/* Spec 050, RF-61: el cambio por gusto se pinta **encima** del panel, que sigue montado debajo.
          Antes se devolvía en su lugar y el `Stack` se desmontaba: al cancelar se volvía al inicio, sin
          la pantalla, la búsqueda ni los filtros de antes. Así, «Cancelar» deja todo donde estaba. */}
      {cambiandoClave ? (
        <View style={estilos.capaDeClave}>
          <PantallaCambiarClave onCancelar={() => pedirCambioDeClave(false)} />
        </View>
      ) : null}
    </ProveedorDeAvisos>
  );
}

const estilos = StyleSheet.create({
  /** Cubre toda la ventana, opaca: el panel sigue debajo, pero no se ve ni se toca mientras se cambia la clave. */
  capaDeClave: {
    position: 'fixed' as 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: Panel.fondo,
  },
  centro: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Panel.fondo,
  },
});
