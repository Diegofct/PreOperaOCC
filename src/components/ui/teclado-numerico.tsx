/**
 * Teclado numérico propio.
 *
 * No se usa el del sistema en ningún campo numérico de esta app. El teclado de
 * Android trae teclas de ~30 dp, autocorrección y sugerencias: con guantes de
 * carnaza eso produce horómetros equivocados, y un horómetro equivocado
 * dispara de golpe todos los mantenimientos preventivos del vehículo.
 *
 * El componente no guarda el valor: emite dígitos y borrados. Quien lo usa
 * decide qué significan.
 */
import * as Haptics from 'expo-haptics';
import { memo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Colors, Estado, Radio, Spacing, Texto, Toque } from '@/constants/theme';

interface Props {
  onDigito: (digito: string) => void;
  onBorrar: () => void;
  /** Tecla de la esquina inferior izquierda. Por defecto queda vacía. */
  teclaExtra?: { texto: string; onPress: () => void };
  deshabilitado?: boolean;
}

const DIGITOS = ['1', '2', '3', '4', '5', '6', '7', '8', '9'];

export const TecladoNumerico = memo(function TecladoNumerico({
  onDigito,
  onBorrar,
  teclaExtra,
  deshabilitado = false,
}: Props) {
  function pulsar(accion: () => void) {
    if (deshabilitado) return;
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    accion();
  }

  return (
    <View style={[estilos.rejilla, deshabilitado && estilos.deshabilitado]}>
      {DIGITOS.map((digito) => (
        <Tecla key={digito} texto={digito} onPress={() => pulsar(() => onDigito(digito))} />
      ))}

      {teclaExtra ? (
        <Tecla texto={teclaExtra.texto} secundaria onPress={() => pulsar(teclaExtra.onPress)} />
      ) : (
        <View style={estilos.tecla} />
      )}

      <Tecla texto="0" onPress={() => pulsar(() => onDigito('0'))} />

      <Tecla texto="⌫" secundaria etiqueta="Borrar" onPress={() => pulsar(onBorrar)} />
    </View>
  );
});

function Tecla({
  texto,
  onPress,
  secundaria = false,
  etiqueta,
}: {
  texto: string;
  onPress: () => void;
  secundaria?: boolean;
  etiqueta?: string;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={etiqueta ?? texto}
      onPress={onPress}
      style={({ pressed }) => [
        estilos.tecla,
        secundaria && estilos.teclaSecundaria,
        pressed && estilos.presionada,
      ]}
    >
      <Text style={[estilos.teclaTexto, secundaria && estilos.teclaTextoSecundario]}>{texto}</Text>
    </Pressable>
  );
}

const estilos = StyleSheet.create({
  rejilla: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
    justifyContent: 'center',
  },
  deshabilitado: { opacity: 0.4 },
  tecla: {
    // Tres columnas dejando sitio a los dos huecos de 'gap'.
    width: '31%',
    minHeight: Toque.tecla,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Radio.lg,
    backgroundColor: Colors.light.backgroundElement,
  },
  teclaSecundaria: { backgroundColor: Estado.naFondo },
  presionada: { backgroundColor: Colors.light.backgroundSelected },
  teclaTexto: { fontSize: Texto.medidor, fontWeight: '700', color: Colors.light.text },
  teclaTextoSecundario: { fontSize: Texto.titulo, color: Estado.na },
});
