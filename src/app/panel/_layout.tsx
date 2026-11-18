import { Stack, usePathname } from 'expo-router';
import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';

import '@/features/panel/fuentes.css';

import { Panel } from '@/constants/theme';
import { ProveedorObraDelLugar } from '@/features/empresas/contexto-empresa';
import { BarraSuperior } from '@/features/panel/barra-superior';
import { ProveedorMenu } from '@/features/panel/estado-menu';
import { iconoDeLaPestana } from '@/features/panel/icono-de-la-pestana';
import { MarcoSesion } from '@/features/panel/marco-sesion';
import { MenuLateral, TelonDelMenu } from '@/features/panel/menu-lateral';
import { tituloDeLaPestana } from '@/features/panel/modulos';
import { ProveedorSesionPanel, useSesionPanel } from '@/features/panel/sesion';

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
 *
 * El ícono de la pestaña (spec 049, RF-14) se pone **fuera** de `MarcoSesion`: así
 * vale también en el ingreso, que se ve antes de que haya panel.
 */
export default function LayoutPanel() {
  return (
    <ProveedorSesionPanel>
      <IconoDeLaPestana />
      <MarcoSesion>
        <ProveedorMenu>
          {/* La obra de la dirección se pide una vez y la leen el menú, la puerta de las páginas de
              obra y la ruta de arriba de cada pantalla (spec 050). */}
          <ProveedorObraDelLugar>
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
          </ProveedorObraDelLugar>
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
  // Spec 050, RF-61: el cambio de contraseña por gusto va encima del panel, que sigue montado; al
  // cancelarlo, el título de la pantalla tiene que volver (lo pone `MarcoSesion` mientras dura).
  const { cambiandoClave } = useSesionPanel();
  useEffect(() => {
    // La guarda es por el paquete nativo, donde estas pantallas entran inertes.
    if (typeof document === 'undefined' || cambiandoClave) return;
    document.title = tituloDeLaPestana(ruta);
  }, [ruta, cambiandoClave]);
  return null;
}

/**
 * Pone la K de Kontrola como ícono de la pestaña (ver `iconoDeLaPestana`). Si el
 * documento ya trae un `<link rel="icon">` —el de Expo—, se le cambia la dirección;
 * si no, se crea. No se quita al salir: el panel es lo único que se abre en el navegador.
 */
function IconoDeLaPestana() {
  useEffect(() => {
    // La guarda es por el paquete nativo, donde estas pantallas entran inertes.
    if (typeof document === 'undefined') return;
    let enlace = document.querySelector<HTMLLinkElement>('link[rel~="icon"]');
    if (!enlace) {
      enlace = document.createElement('link');
      enlace.rel = 'icon';
      document.head.appendChild(enlace);
    }
    enlace.type = 'image/svg+xml';
    enlace.href = iconoDeLaPestana();
  }, []);
  return null;
}

const estilos = StyleSheet.create({
  panel: { flex: 1, backgroundColor: Panel.fondo },
  /** El menú y la pantalla, uno al lado del otro, bajo la barra. */
  cuerpo: { flex: 1, flexDirection: 'row', minHeight: 0 },
  /** `minWidth: 0` deja que la pantalla se encoja y no empuje el menú fuera. */
  contenido: { flex: 1, minWidth: 0 },
});
