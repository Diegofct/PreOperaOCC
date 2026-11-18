/**
 * La tarjeta de las pantallas de acceso: ingresar y cambiar la contraseña.
 * Spec 022, RF-29 a RF-31.
 *
 * Una tarjeta blanca centrada sobre el crema, con la marca arriba, como el
 * ingreso de egg.live. Vive aparte porque la usan las dos pantallas y la spec pide
 * que se vean iguales (RF-31): dos copias acabarían separándose.
 *
 * Aquí no hay barra ni menú —todavía no hay sesión, o la contraseña temporal no
 * deja pasar—, así que la marca la lleva la tarjeta.
 *
 * Desde la spec 049 la marca es la del Grupo HS con Kontrola (RF-5 a RF-9), no el logo de
 * OCC: el sistema es de todo el grupo. La dibuja `LogotipoGrupo`.
 */
import type { ReactNode } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import {
  EspaciadoLetra,
  FuentePanel,
  Grosor,
  Panel,
  Radio,
  Sombra,
  Spacing,
  TextoPanel,
} from '@/constants/theme';

import { LogotipoGrupo } from './logotipo-grupo';

export function TarjetaDeAcceso({
  titulo,
  subtitulo,
  children,
}: {
  titulo: string;
  subtitulo?: string;
  children: ReactNode;
}) {
  return (
    // Desplazable y no un `View` fijo: en una ventana baja la tarjeta es más alta
    // que la pantalla, y centrada a la fuerza se cortaba arriba y abajo sin forma
    // de llegar al botón. Con `flexGrow` sigue centrada cuando cabe.
    <ScrollView style={estilos.pantalla} contentContainerStyle={estilos.centro}>
      <View style={estilos.tarjeta}>
        <LogotipoGrupo variante="tarjeta" />

        <View style={estilos.encabezado}>
          <Text style={estilos.titulo} accessibilityRole="header">
            {titulo}
          </Text>
          {subtitulo ? <Text style={estilos.subtitulo}>{subtitulo}</Text> : null}
        </View>

        {children}
      </View>
    </ScrollView>
  );
}

/** La raya fina que separa el pie de la tarjeta de lo de arriba. */
export function SeparadorDeAcceso() {
  return <View style={estilos.separador} />;
}

/** El texto de apoyo al pie de la tarjeta. */
export function PieDeAcceso({ children }: { children: ReactNode }) {
  return <Text style={estilos.pie}>{children}</Text>;
}

const estilos = StyleSheet.create({
  pantalla: { flex: 1, backgroundColor: Panel.fondo },
  centro: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.four,
  },
  tarjeta: {
    width: '100%',
    maxWidth: 420,
    gap: Spacing.four,
    padding: Spacing.five,
    borderRadius: Radio.lg + Spacing.one,
    borderCurve: 'continuous',
    borderWidth: Grosor.linea,
    borderColor: Panel.bordeSuave,
    backgroundColor: Panel.superficie,
    // Sutil: la tarjeta se apoya en el crema, no flota sobre nada.
    boxShadow: Sombra.elevada,
  },
  encabezado: { gap: Spacing.one, alignItems: 'center' },
  titulo: {
    fontFamily: FuentePanel.texto,
    fontSize: TextoPanel.titulo,
    fontWeight: '700',
    letterSpacing: EspaciadoLetra.titulo,
    color: Panel.texto,
    textAlign: 'center',
  },
  subtitulo: {
    fontFamily: FuentePanel.texto,
    fontSize: TextoPanel.apoyo,
    lineHeight: 19,
    color: Panel.textoApoyo,
    textAlign: 'center',
  },
  separador: { height: Grosor.linea, backgroundColor: Panel.bordeSuave },
  pie: {
    fontFamily: FuentePanel.texto,
    fontSize: TextoPanel.apoyo,
    lineHeight: 19,
    color: Panel.textoApoyo,
    textAlign: 'center',
  },
});
