/**
 * Dónde se pintan los avisos fuera del navegador. El panel no corre en el celular —sus pantallas entran al
 * bundle nativo porque Expo Router evalúa todas las rutas, pero inertes—, así que aquí van en su sitio, sin
 * portal: la variante que cuenta es `capa-de-avisos.web.tsx`.
 */
import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

export function CapaDeAvisos({ children }: { children: ReactNode }) {
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
      {children}
    </View>
  );
}
