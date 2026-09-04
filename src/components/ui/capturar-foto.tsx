/**
 * Cámara de evidencias.
 *
 * A pantalla completa y con un solo obturador de 88 dp. No hay filtros, ni
 * zoom, ni cambio de cámara: el operador está de pie junto a una máquina, con
 * guantes, y necesita una foto — no una aplicación de fotografía.
 */
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useRef, useState } from 'react';
import { ActivityIndicator, Image, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Captura, Colors, Marca, Radio, Spacing, Texto, Toque } from '@/constants/theme';

interface Props {
  visible: boolean;
  titulo: string;
  ayuda?: string;
  onCancelar: () => void;
  /** URI temporal de la foto; el llamador la comprime y la guarda. */
  onCapturar: (uri: string) => void;
}

export function CapturarFoto({ visible, titulo, ayuda, onCancelar, onCapturar }: Props) {
  const insets = useSafeAreaInsets();
  const [permiso, pedirPermiso] = useCameraPermissions();
  const [previa, setPrevia] = useState<string | null>(null);
  const [tomando, setTomando] = useState(false);
  const camara = useRef<CameraView>(null);

  async function tomar() {
    if (tomando) return;
    setTomando(true);
    try {
      const foto = await camara.current?.takePictureAsync({ quality: 0.8 });
      if (foto?.uri) setPrevia(foto.uri);
    } finally {
      setTomando(false);
    }
  }

  function usar() {
    if (!previa) return;
    onCapturar(previa);
    setPrevia(null);
  }

  function cerrar() {
    setPrevia(null);
    onCancelar();
  }

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={cerrar}>
      <View style={estilos.pantalla}>
        {!permiso ? (
          <View style={estilos.centro}>
            <ActivityIndicator color={Marca.sobreColor} size="large" />
          </View>
        ) : !permiso.granted ? (
          <View style={[estilos.centro, estilos.permiso]}>
            <Text style={estilos.permisoTitulo}>La aplicación necesita la cámara</Text>
            <Text style={estilos.permisoTexto}>
              La foto es la evidencia del hallazgo. Sin ella, el reporte no sirve para sustentar un
              mantenimiento ante la interventoría.
            </Text>
            <Pressable
              accessibilityRole="button"
              onPress={pedirPermiso}
              style={({ pressed }) => [estilos.botonPrimario, pressed && estilos.presionado]}
            >
              <Text style={estilos.botonPrimarioTexto}>Permitir cámara</Text>
            </Pressable>
            <Pressable accessibilityRole="button" onPress={cerrar} style={estilos.cancelar}>
              <Text style={estilos.cancelarTexto}>Ahora no</Text>
            </Pressable>
          </View>
        ) : previa ? (
          <>
            <Image source={{ uri: previa }} style={estilos.previa} resizeMode="contain" />
            <View style={[estilos.acciones, { paddingBottom: insets.bottom + Spacing.three }]}>
              <Pressable
                accessibilityRole="button"
                onPress={() => setPrevia(null)}
                style={({ pressed }) => [
                  estilos.boton,
                  estilos.botonSecundario,
                  pressed && estilos.presionado,
                ]}
              >
                <Text style={estilos.botonSecundarioTexto}>Repetir</Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                onPress={usar}
                style={({ pressed }) => [
                  estilos.boton,
                  estilos.botonPrimarioAncho,
                  pressed && estilos.presionado,
                ]}
              >
                <Text style={estilos.botonPrimarioTexto}>Usar esta foto</Text>
              </Pressable>
            </View>
          </>
        ) : (
          <>
            <CameraView ref={camara} style={estilos.camara} facing="back" />
            <View style={[estilos.encabezado, { paddingTop: insets.top + Spacing.three }]}>
              <Text style={estilos.titulo}>{titulo}</Text>
              {ayuda ? <Text style={estilos.ayuda}>{ayuda}</Text> : null}
            </View>
            <View style={[estilos.barraCaptura, { paddingBottom: insets.bottom + Spacing.four }]}>
              <Pressable accessibilityRole="button" onPress={cerrar} style={estilos.cancelarLateral}>
                <Text style={estilos.cancelarTexto}>Cancelar</Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Tomar foto"
                onPress={tomar}
                disabled={tomando}
                style={({ pressed }) => [estilos.obturador, pressed && estilos.obturadorPresionado]}
              >
                <View style={estilos.obturadorInterior} />
              </Pressable>
              <View style={estilos.cancelarLateral} />
            </View>
          </>
        )}
      </View>
    </Modal>
  );
}

const estilos = StyleSheet.create({
  pantalla: { flex: 1, backgroundColor: Captura.visor },
  centro: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  permiso: { padding: Spacing.four, gap: Spacing.three, backgroundColor: Colors.light.background },
  permisoTitulo: {
    fontSize: Texto.titulo,
    fontWeight: '800',
    color: Colors.light.text,
    textAlign: 'center',
  },
  permisoTexto: {
    fontSize: Texto.base,
    lineHeight: 26,
    color: Colors.light.textSecondary,
    textAlign: 'center',
  },
  camara: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
  encabezado: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    paddingHorizontal: Spacing.four,
    paddingBottom: Spacing.three,
    gap: Spacing.half,
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  titulo: { fontSize: Texto.etiqueta, fontWeight: '800', color: Marca.sobreColor },
  ayuda: { fontSize: Texto.pie, color: 'rgba(255,255,255,0.85)' },
  barraCaptura: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.four,
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  obturador: {
    width: Toque.obturador,
    height: Toque.obturador,
    borderRadius: Toque.obturador / 2,
    borderWidth: 5,
    borderColor: Marca.sobreColor,
    alignItems: 'center',
    justifyContent: 'center',
  },
  obturadorPresionado: { opacity: 0.6 },
  obturadorInterior: {
    width: Toque.obturador - 22,
    height: Toque.obturador - 22,
    borderRadius: (Toque.obturador - 22) / 2,
    backgroundColor: Captura.papel,
  },
  cancelarLateral: { width: 92, minHeight: Toque.minimo, justifyContent: 'center' },
  cancelar: { minHeight: Toque.minimo, alignItems: 'center', justifyContent: 'center' },
  cancelarTexto: { fontSize: Texto.base, fontWeight: '600', color: Marca.sobreColor },
  previa: { flex: 1 },
  acciones: {
    flexDirection: 'row',
    gap: Spacing.three,
    paddingHorizontal: Spacing.three,
    paddingTop: Spacing.three,
    backgroundColor: Captura.visor,
  },
  boton: {
    minHeight: Toque.primario,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Radio.lg,
  },
  botonSecundario: { flex: 1, backgroundColor: 'rgba(255,255,255,0.16)' },
  botonSecundarioTexto: { fontSize: Texto.etiqueta, fontWeight: '700', color: Marca.sobreColor },
  botonPrimarioAncho: { flex: 2, backgroundColor: Marca.primario },
  botonPrimario: {
    minHeight: Toque.primario,
    alignSelf: 'stretch',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Radio.lg,
    backgroundColor: Marca.primario,
  },
  botonPrimarioTexto: { fontSize: Texto.etiqueta, fontWeight: '800', color: Marca.sobreColor },
  presionado: { opacity: 0.7 },
});
