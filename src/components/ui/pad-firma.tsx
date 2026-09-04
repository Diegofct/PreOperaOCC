/**
 * Lienzo de firma del operador.
 *
 * Usa `PanResponder` en vez de gesture-handler a propósito: el trazo necesita
 * cada punto en el hilo de JS para dibujarse, así que los worklets no aportan
 * nada aquí y sí añaden una pieza que puede fallar. Es un caso donde lo simple
 * responde igual de bien.
 */
import { useMemo, useRef, useState } from 'react';
import {
  Modal,
  PanResponder,
  Pressable,
  StyleSheet,
  Text,
  View,
  type GestureResponderEvent,
} from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { captureRef } from 'react-native-view-shot';

import { Captura, Colors, Estado, Marca, Radio, Spacing, Texto, Toque } from '@/constants/theme';

interface Props {
  visible: boolean;
  titulo?: string;
  nombreFirmante?: string;
  onCancelar: () => void;
  /** Recibe la URI de un PNG temporal con la firma ya recortada. */
  onFirmar: (uri: string) => void;
}

export function PadFirma({
  visible,
  titulo = 'Firma del operador',
  nombreFirmante,
  onCancelar,
  onFirmar,
}: Props) {
  const [trazos, setTrazos] = useState<string[]>([]);
  const [trazoActual, setTrazoActual] = useState('');
  const [guardando, setGuardando] = useState(false);
  const lienzo = useRef<View>(null);
  const enCurso = useRef('');

  // El linter marca la lectura de `enCurso.current` como acceso a una ref
  // durante el render. No lo es: aquí solo se definen los manejadores, que
  // corren después, con el dedo en el lienzo. La regla no puede ver dentro de
  // los cierres.
  const panResponder = useMemo(
    () =>
      // eslint-disable-next-line react-hooks/refs
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderGrant: (evento: GestureResponderEvent) => {
          const { locationX, locationY } = evento.nativeEvent;
          enCurso.current = `M ${locationX.toFixed(1)} ${locationY.toFixed(1)}`;
          setTrazoActual(enCurso.current);
        },
        onPanResponderMove: (evento: GestureResponderEvent) => {
          const { locationX, locationY } = evento.nativeEvent;
          enCurso.current += ` L ${locationX.toFixed(1)} ${locationY.toFixed(1)}`;
          setTrazoActual(enCurso.current);
        },
        onPanResponderRelease: () => {
          const terminado = enCurso.current;
          enCurso.current = '';
          setTrazoActual('');
          if (terminado) setTrazos((previos) => [...previos, terminado]);
        },
      }),
    [],
  );

  const hayFirma = trazos.length > 0 || trazoActual.length > 0;

  function limpiar() {
    setTrazos([]);
    setTrazoActual('');
    enCurso.current = '';
  }

  async function confirmar() {
    if (!hayFirma || guardando || !lienzo.current) return;
    setGuardando(true);
    try {
      const uri = await captureRef(lienzo, { format: 'png', quality: 1, result: 'tmpfile' });
      onFirmar(uri);
      limpiar();
    } finally {
      setGuardando(false);
    }
  }

  function cancelar() {
    limpiar();
    onCancelar();
  }

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={cancelar}>
      <View style={estilos.pantalla}>
        <View style={estilos.cabecera}>
          <Text style={estilos.titulo}>{titulo}</Text>
          <Text style={estilos.ayuda}>Firme con el dedo dentro del recuadro.</Text>
        </View>

        <View ref={lienzo} collapsable={false} style={estilos.lienzo} {...panResponder.panHandlers}>
          <Svg style={StyleSheet.absoluteFill}>
            {trazos.map((trazo, indice) => (
              <Path
                key={indice}
                d={trazo}
                stroke={Captura.tinta}
                strokeWidth={3}
                strokeLinecap="round"
                strokeLinejoin="round"
                fill="none"
              />
            ))}
            {trazoActual ? (
              <Path
                d={trazoActual}
                stroke={Captura.tinta}
                strokeWidth={3}
                strokeLinecap="round"
                strokeLinejoin="round"
                fill="none"
              />
            ) : null}
          </Svg>

          {!hayFirma ? (
            <View pointerEvents="none" style={estilos.marcaDeAgua}>
              <View style={estilos.linea} />
              <Text style={estilos.marcaDeAguaTexto}>{nombreFirmante ?? 'Firme aquí'}</Text>
            </View>
          ) : null}
        </View>

        <View style={estilos.acciones}>
          <Pressable
            accessibilityRole="button"
            onPress={limpiar}
            disabled={!hayFirma}
            style={({ pressed }) => [
              estilos.boton,
              estilos.botonSecundario,
              pressed && estilos.presionado,
              !hayFirma && estilos.deshabilitado,
            ]}
          >
            <Text style={estilos.botonSecundarioTexto}>Borrar</Text>
          </Pressable>

          <Pressable
            accessibilityRole="button"
            onPress={confirmar}
            disabled={!hayFirma || guardando}
            style={({ pressed }) => [
              estilos.boton,
              estilos.botonPrimario,
              pressed && estilos.presionado,
              (!hayFirma || guardando) && estilos.deshabilitado,
            ]}
          >
            <Text style={estilos.botonPrimarioTexto}>{guardando ? 'Guardando…' : 'Confirmar'}</Text>
          </Pressable>
        </View>

        <Pressable
          accessibilityRole="button"
          onPress={cancelar}
          style={({ pressed }) => [estilos.cancelar, pressed && estilos.presionado]}
        >
          <Text style={estilos.cancelarTexto}>Cancelar</Text>
        </Pressable>
      </View>
    </Modal>
  );
}

const estilos = StyleSheet.create({
  pantalla: { flex: 1, padding: Spacing.three, gap: Spacing.three, backgroundColor: Colors.light.background },
  cabecera: { gap: Spacing.half, paddingTop: Spacing.five },
  titulo: { fontSize: Texto.titulo, fontWeight: '800', color: Colors.light.text },
  ayuda: { fontSize: Texto.base, color: Colors.light.textSecondary },
  lienzo: {
    flex: 1,
    borderRadius: Radio.lg,
    borderWidth: 2,
    borderColor: Colors.light.backgroundSelected,
    backgroundColor: Captura.papel,
    overflow: 'hidden',
  },
  marcaDeAgua: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingBottom: Spacing.six,
    gap: Spacing.two,
  },
  linea: { width: '70%', height: 1, backgroundColor: Colors.light.backgroundSelected },
  marcaDeAguaTexto: { fontSize: Texto.pie, color: Colors.light.textSecondary },
  acciones: { flexDirection: 'row', gap: Spacing.three },
  boton: {
    flex: 1,
    minHeight: Toque.primario,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Radio.lg,
  },
  botonPrimario: { backgroundColor: Marca.primario },
  botonPrimarioTexto: { fontSize: Texto.etiqueta, fontWeight: '800', color: Marca.sobreColor },
  botonSecundario: { backgroundColor: Colors.light.backgroundElement },
  botonSecundarioTexto: { fontSize: Texto.etiqueta, fontWeight: '700', color: Estado.na },
  cancelar: { minHeight: Toque.minimo, alignItems: 'center', justifyContent: 'center' },
  cancelarTexto: { fontSize: Texto.base, fontWeight: '600', color: Colors.light.textSecondary },
  presionado: { opacity: 0.7 },
  deshabilitado: { opacity: 0.4 },
});
