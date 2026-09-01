import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect } from 'react';
import * as Haptics from 'expo-haptics';
import { Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Estado, Marca, Radio, Spacing, Texto, Toque } from '@/constants/theme';
import type { ResultadoPreoperacional } from '@/features/checklists/types';

/**
 * Cierre del preoperacional.
 *
 * Cuando hay un hallazgo que inmoviliza, esta pantalla ocupa todo y no tiene
 * salida lateral: el operador debe leerla. Es el único momento en que la app
 * le impide seguir, y por eso el resto de la aplicación no bloquea nunca.
 */
export default function PantallaResultado() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{
    resultado: ResultadoPreoperacional;
    inmovilizantes: string;
    observaciones: string;
    vehiculo: string;
  }>();

  const inmovilizantes: string[] = (() => {
    try {
      return JSON.parse(params.inmovilizantes ?? '[]');
    } catch {
      return [];
    }
  })();

  const noApto = params.resultado === 'no_apto';
  const conObservaciones = params.resultado === 'apto_con_observaciones';
  const cantidadObservaciones = Number(params.observaciones ?? '0');

  useEffect(() => {
    if (Platform.OS === 'web') return;
    void Haptics.notificationAsync(
      noApto ? Haptics.NotificationFeedbackType.Error : Haptics.NotificationFeedbackType.Success,
    );
  }, [noApto]);

  const paleta = noApto
    ? { fondo: Estado.noConforme, texto: '#FFFFFF', suave: 'rgba(255,255,255,0.16)' }
    : conObservaciones
      ? { fondo: Estado.atencionFondo, texto: Estado.atencion, suave: 'rgba(0,0,0,0.06)' }
      : { fondo: Estado.conformeFondo, texto: Estado.conforme, suave: 'rgba(0,0,0,0.06)' };

  return (
    <View style={[estilos.pantalla, { backgroundColor: paleta.fondo }]}>
      <ScrollView contentContainerStyle={estilos.contenido}>
        <Text style={[estilos.simbolo, { color: paleta.texto }]}>
          {noApto ? '✕' : conObservaciones ? '!' : '✓'}
        </Text>

        <Text style={[estilos.titulo, { color: paleta.texto }]}>
          {noApto
            ? 'VEHÍCULO NO APTO PARA OPERAR'
            : conObservaciones
              ? 'Apto con novedades'
              : 'Vehículo apto'}
        </Text>

        <Text style={[estilos.vehiculo, { color: paleta.texto }]}>{params.vehiculo}</Text>

        {noApto ? (
          <View style={[estilos.bloque, { backgroundColor: paleta.suave }]}>
            <Text style={[estilos.bloqueTitulo, { color: paleta.texto }]}>
              Hallazgos que inmovilizan el equipo
            </Text>
            {inmovilizantes.map((label) => (
              <Text key={label} style={[estilos.item, { color: paleta.texto }]}>
                •  {label}
              </Text>
            ))}
            <Text style={[estilos.nota, { color: paleta.texto }]}>
              El reporte quedó guardado y se enviará a mantenimiento apenas haya señal. No opere el
              equipo e informe a su supervisor.
            </Text>
          </View>
        ) : conObservaciones ? (
          <View style={[estilos.bloque, { backgroundColor: paleta.suave }]}>
            <Text style={[estilos.nota, { color: paleta.texto }]}>
              Se reportaron {cantidadObservaciones}{' '}
              {cantidadObservaciones === 1 ? 'novedad' : 'novedades'}. El equipo puede operar, pero
              quedan registradas para mantenimiento.
            </Text>
          </View>
        ) : (
          <Text style={[estilos.nota, { color: paleta.texto }]}>
            Sin novedades. Puede iniciar su jornada.
          </Text>
        )}

        <View style={[estilos.bloque, { backgroundColor: paleta.suave }]}>
          <Text style={[estilos.nota, { color: paleta.texto }]}>
            Guardado en este equipo. Se enviará solo cuando haya conexión.
          </Text>

        </View>
      </ScrollView>

      <View style={[estilos.pie, { paddingBottom: insets.bottom + Spacing.three }]}>
        <Pressable
          accessibilityRole="button"
          onPress={() => router.replace('/')}
          style={({ pressed }) => [
            estilos.boton,
            { backgroundColor: noApto ? '#FFFFFF' : Marca.primario },
            pressed && estilos.presionado,
          ]}
        >
          <Text style={[estilos.botonTexto, { color: noApto ? Estado.noConforme : '#FFFFFF' }]}>
            Entendido
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

const estilos = StyleSheet.create({
  pantalla: { flex: 1 },
  contenido: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: Spacing.four,
    gap: Spacing.three,
  },
  simbolo: { fontSize: 72, fontWeight: '800', textAlign: 'center', lineHeight: 80 },
  titulo: { fontSize: 30, fontWeight: '800', textAlign: 'center', lineHeight: 36 },
  vehiculo: { fontSize: Texto.etiqueta, fontWeight: '700', textAlign: 'center', opacity: 0.9 },
  bloque: { padding: Spacing.three, borderRadius: Radio.lg, gap: Spacing.two },
  bloqueTitulo: { fontSize: Texto.base, fontWeight: '800' },
  item: { fontSize: Texto.base, fontWeight: '600', lineHeight: 26 },
  nota: { fontSize: Texto.base, lineHeight: 26, textAlign: 'center' },
  pie: { paddingHorizontal: Spacing.four, paddingTop: Spacing.two },
  boton: {
    minHeight: Toque.primario,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Radio.lg,
  },
  botonTexto: { fontSize: Texto.etiqueta, fontWeight: '800' },
  presionado: { opacity: 0.8 },
});
