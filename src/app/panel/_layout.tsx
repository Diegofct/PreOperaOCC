import { Stack, usePathname } from 'expo-router';
import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';

import '@/features/panel/fuentes.css';

import { Panel } from '@/constants/theme';
import { BarraSuperior } from '@/features/panel/barra-superior';
import { ProveedorMenu } from '@/features/panel/estado-menu';
import { MarcoSesion } from '@/features/panel/marco-sesion';
import { MenuLateral, TelonDelMenu } from '@/features/panel/menu-lateral';
import { tituloDeLaPestana } from '@/features/panel/modulos';
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
 * ingreso, el cambio de contraseña obligatorio, o el panel. El `Stack` va sin
 * encabezado: en un panel de administración se salta entre secciones todo el
 * rato, y un botón de volver convertiría cada salto en dos.
 *
 * Desde la spec 022 los módulos van en un menú lateral a la izquierda y arriba
 * queda una barra con la cuenta. Las dos están **fuera** del `Stack`: no se
 * vuelven a montar al cambiar de pantalla, y el menú conserva su estado.
 *
 * Las tipografías del panel (spec 022) se cargan aquí y solo aquí: el CSS no
 * entra al grafo del operador, y el celular no cambia (RF-34).
 *
 * Las pantallas no se declaran una por una con su `title`: Expo Router 57 no lo
 * lleva a la pestaña, y el título sale de la ruta con `tituloDeLaPestana`.
 */
export default function LayoutPanel() {
  return (
    <ProveedorSesionPanel>
      <MarcoSesion>
        <ProveedorMenu>
          <TituloDeLaPestana />
          <View style={estilos.panel}>
            <BarraSuperior />
            <View style={estilos.cuerpo}>
              <MenuLateral />
              <View style={estilos.contenido}>
                <Stack
                  screenOptions={{
                    headerShown: false,
                    contentStyle: { backgroundColor: Panel.fondo },
                  }}
                />
                <TelonDelMenu />
              </View>
            </View>
          </View>
        </ProveedorMenu>
      </MarcoSesion>
    </ProveedorSesionPanel>
  );
}

/**
 * Pone el título de la pestaña según la pantalla (ver `tituloDeLaPestana`).
 *
 * Va dentro de `MarcoSesion`: sin sesión, o con la contraseña obligatoria, el título
 * lo pone el propio `MarcoSesion` («Ingresar · …»), y este no está montado.
 */
function TituloDeLaPestana() {
  const ruta = usePathname();
  useEffect(() => {
    // La guarda es por el paquete nativo, donde estas pantallas entran inertes.
    if (typeof document === 'undefined') return;
    document.title = tituloDeLaPestana(ruta);
  }, [ruta]);
  return null;
}

const estilos = StyleSheet.create({
  panel: { flex: 1, backgroundColor: Panel.fondo },
  /** El menú y la pantalla, uno al lado del otro, bajo la barra. */
  cuerpo: { flex: 1, flexDirection: 'row', minHeight: 0 },
  /** `minWidth: 0` deja que la pantalla se encoja y no empuje el menú fuera. */
  contenido: { flex: 1, minWidth: 0 },
});
