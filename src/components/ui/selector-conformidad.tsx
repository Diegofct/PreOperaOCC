/**
 * El control que el operador toca cientos de veces al día.
 *
 * Tres opciones de 72 dp en fila. Cada estado se distingue por color, símbolo
 * y texto a la vez: el color solo nunca basta — hay daltonismo en cualquier
 * cuadrilla, y a pleno sol los tonos se lavan.
 */
import * as Haptics from 'expo-haptics';
import { memo } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';

import type { Conformidad } from '@/features/checklists/types';
import { Colors, Estado, Radio, SeparacionTactil, Spacing, Texto, Toque } from '@/constants/theme';

interface Opcion {
  valor: Conformidad;
  simbolo: string;
  etiqueta: string;
  color: string;
  fondo: string;
}

const OPCIONES: Opcion[] = [
  {
    valor: 'conforme',
    simbolo: '✓',
    etiqueta: 'Bien',
    color: Estado.conforme,
    fondo: Estado.conformeFondo,
  },
  {
    valor: 'no_conforme',
    simbolo: '✕',
    etiqueta: 'Mal',
    color: Estado.noConforme,
    fondo: Estado.noConformeFondo,
  },
  { valor: 'na', simbolo: '–', etiqueta: 'N/A', color: Estado.na, fondo: Estado.naFondo },
];

interface Props {
  valor: Conformidad | null;
  onChange: (valor: Conformidad) => void;
  /** Los ítems que inmovilizan no se pueden marcar en bloque ni despachar rápido. */
  inmoviliza?: boolean;
  deshabilitado?: boolean;
}

export const SelectorConformidad = memo(function SelectorConformidad({
  valor,
  onChange,
  inmoviliza = false,
  deshabilitado = false,
}: Props) {
  function seleccionar(opcion: Opcion) {
    if (deshabilitado) return;
    // Con guantes y el motor encendido, la vibración es la única confirmación
    // que el operador percibe de forma fiable.
    if (Platform.OS !== 'web') {
      void Haptics.impactAsync(
        opcion.valor === 'no_conforme'
          ? Haptics.ImpactFeedbackStyle.Heavy
          : Haptics.ImpactFeedbackStyle.Light,
      );
    }
    onChange(opcion.valor);
  }

  return (
    <View style={estilos.fila}>
      {OPCIONES.map((opcion) => {
        const activo = valor === opcion.valor;
        const resaltarRiesgo = activo && opcion.valor === 'no_conforme' && inmoviliza;

        return (
          <Pressable
            key={opcion.valor}
            accessibilityRole="radio"
            accessibilityState={{ selected: activo, disabled: deshabilitado }}
            accessibilityLabel={opcion.etiqueta}
            onPress={() => seleccionar(opcion)}
            disabled={deshabilitado}
            style={({ pressed }) => [
              estilos.opcion,
              activo && { backgroundColor: opcion.fondo, borderColor: opcion.color },
              resaltarRiesgo && estilos.riesgo,
              pressed && !deshabilitado && estilos.presionado,
              deshabilitado && estilos.deshabilitado,
            ]}
          >
            <Text style={[estilos.simbolo, { color: activo ? opcion.color : Colors.light.textSecondary }]}>
              {opcion.simbolo}
            </Text>
            <Text
              style={[
                estilos.etiqueta,
                { color: activo ? opcion.color : Colors.light.textSecondary },
                activo && estilos.etiquetaActiva,
              ]}
            >
              {opcion.etiqueta}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
});

const estilos = StyleSheet.create({
  fila: {
    flexDirection: 'row',
    gap: SeparacionTactil,
  },
  opcion: {
    flex: 1,
    minHeight: Toque.primario,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.half,
    borderRadius: Radio.md,
    borderWidth: 2,
    borderColor: Colors.light.backgroundSelected,
    backgroundColor: Colors.light.backgroundElement,
  },
  riesgo: {
    borderWidth: 3,
  },
  presionado: {
    opacity: 0.7,
  },
  deshabilitado: {
    opacity: 0.4,
  },
  simbolo: {
    fontSize: 26,
    lineHeight: 30,
    fontWeight: '700',
  },
  etiqueta: {
    fontSize: Texto.pie,
    fontWeight: '600',
  },
  etiquetaActiva: {
    fontWeight: '700',
  },
});
