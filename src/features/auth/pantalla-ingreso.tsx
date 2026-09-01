/**
 * Ingreso del operador.
 *
 * No es una ruta: el layout raíz la monta en lugar del `Stack` cuando no hay
 * sesión abierta. Así no existe ningún instante en que una pantalla de trabajo
 * alcance a renderizarse sin operador, ni un enlace por el que colarse.
 *
 * Una sola pantalla con dos modos:
 *   · Activación — usuario + PIN. Ocurre una vez por equipo. Cuando exista el
 *     servidor será el único momento en que la app pide señal.
 *   · Desbloqueo — solo PIN, validado contra este mismo celular. Funciona en
 *     modo avión, que es como se usa casi siempre.
 */
import * as Haptics from 'expo-haptics';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { TecladoNumerico } from '@/components/ui/teclado-numerico';
import { Colors, Estado, Marca, Radio, Spacing, Texto, Toque } from '@/constants/theme';
import { LONGITUD_PIN } from './pin';
import { useSesion } from './sesion';

export function PantallaIngreso() {
  const { estado, usuarioEnrolado, esperaMs, ocupado, enrolar, desbloquear, desenrolar } =
    useSesion();
  const activando = estado === 'sin_enrolar';

  const [usuario, setUsuario] = useState('');
  const [pin, setPin] = useState('');
  const [error, setError] = useState<string | null>(null);
  const enviando = useRef(false);

  const bloqueado = esperaMs > 0;

  const enviar = useCallback(
    async (pinCompleto: string) => {
      if (enviando.current) return;
      enviando.current = true;
      setError(null);
      try {
        if (activando && usuario.trim().length === 0) {
          setPin('');
          setError('Escriba su usuario.');
          return;
        }
        const respuesta = activando
          ? await enrolar(usuario, pinCompleto)
          : await desbloquear(pinCompleto);
        if (!respuesta.ok) {
          setPin('');
          setError(respuesta.mensaje ?? 'No se pudo ingresar.');
          void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        }
      } finally {
        enviando.current = false;
      }
    },
    [activando, usuario, enrolar, desbloquear],
  );

  // El PIN se envía solo al sexto dígito: en desbloqueo no hay ninguna razón
  // para pedir un toque más, y es el gesto que el operador repite a diario.
  useEffect(() => {
    if (pin.length !== LONGITUD_PIN) return;
    void enviar(pin);
  }, [pin, enviar]);

  function agregarDigito(digito: string) {
    if (bloqueado || ocupado) return;
    setError(null);
    setPin((previo) => (previo.length >= LONGITUD_PIN ? previo : previo + digito));
  }

  function borrar() {
    if (bloqueado || ocupado) return;
    setPin((previo) => previo.slice(0, -1));
  }

  function confirmarDesenrolar() {
    Alert.alert(
      'Activar con otro usuario',
      'Se borrará el acceso de este equipo y habrá que activarlo de nuevo con usuario y PIN. Los preoperacionales guardados no se pierden.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Continuar',
          style: 'destructive',
          onPress: () => {
            setPin('');
            setError(null);
            void desenrolar();
          },
        },
      ],
    );
  }

  if (estado === 'cargando') {
    return (
      <View style={estilos.centro}>
        <ActivityIndicator size="large" color={Marca.primario} />
      </View>
    );
  }

  return (
    <ScrollView
      style={estilos.pantalla}
      contentContainerStyle={estilos.contenido}
      keyboardShouldPersistTaps="handled"
    >
      <View style={estilos.cabecera}>
        <Text style={estilos.titulo}>{activando ? 'Active este equipo' : 'Ingrese su PIN'}</Text>
        <Text style={estilos.ayuda}>
          {activando
            ? 'Escriba el usuario y el PIN de 6 dígitos que le entregó su supervisor. Solo hay que hacerlo una vez.'
            : `Equipo de ${usuarioEnrolado}. No necesita señal.`}
        </Text>
      </View>

      {activando ? (
        <TextInput
          value={usuario}
          onChangeText={setUsuario}
          placeholder="Usuario"
          placeholderTextColor={Colors.light.textSecondary}
          autoCapitalize="none"
          autoCorrect={false}
          style={estilos.campoUsuario}
        />
      ) : null}

      <PuntosPin longitud={pin.length} hayError={error !== null} />

      {ocupado ? (
        <View style={estilos.estadoLinea}>
          <ActivityIndicator color={Marca.primario} />
          <Text style={estilos.estadoTexto}>Verificando…</Text>
        </View>
      ) : error ? (
        <Text style={estilos.error}>{error}</Text>
      ) : (
        <View style={estilos.estadoLinea} />
      )}

      <TecladoNumerico
        onDigito={agregarDigito}
        onBorrar={borrar}
        deshabilitado={bloqueado || ocupado}
      />

      {!activando ? (
        <Pressable
          accessibilityRole="button"
          onPress={confirmarDesenrolar}
          style={({ pressed }) => [estilos.secundario, pressed && estilos.presionado]}
        >
          <Text style={estilos.secundarioTexto}>Activar con otro usuario</Text>
        </Pressable>
      ) : null}
    </ScrollView>
  );
}

/**
 * Los seis puntos. Con guantes y a contraluz, el operador necesita ver cuántos
 * dígitos lleva sin tener que contar la fila de asteriscos de un campo de texto.
 */
function PuntosPin({ longitud, hayError }: { longitud: number; hayError: boolean }) {
  return (
    <View style={estilos.puntos}>
      {Array.from({ length: LONGITUD_PIN }, (_, indice) => (
        <View
          key={indice}
          style={[
            estilos.punto,
            indice < longitud && estilos.puntoLleno,
            hayError && estilos.puntoError,
          ]}
        />
      ))}
    </View>
  );
}

const estilos = StyleSheet.create({
  pantalla: { flex: 1, backgroundColor: Colors.light.background },
  centro: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.light.background,
  },
  contenido: {
    padding: Spacing.four,
    paddingTop: Spacing.six,
    gap: Spacing.four,
    paddingBottom: Spacing.six,
  },
  cabecera: { gap: Spacing.two },
  titulo: { fontSize: Texto.titulo, fontWeight: '800', color: Colors.light.text },
  ayuda: { fontSize: Texto.base, lineHeight: 26, color: Colors.light.textSecondary },
  campoUsuario: {
    minHeight: Toque.primario,
    paddingHorizontal: Spacing.three,
    borderRadius: Radio.md,
    borderWidth: 2,
    borderColor: Colors.light.backgroundSelected,
    backgroundColor: Colors.light.backgroundElement,
    fontSize: Texto.etiqueta,
    color: Colors.light.text,
  },
  puntos: { flexDirection: 'row', justifyContent: 'center', gap: Spacing.three },
  punto: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: Colors.light.textSecondary,
  },
  puntoLleno: { backgroundColor: Marca.primario, borderColor: Marca.primario },
  puntoError: { borderColor: Estado.noConforme },
  estadoLinea: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.two,
  },
  estadoTexto: { fontSize: Texto.base, color: Colors.light.textSecondary },
  error: {
    minHeight: 48,
    fontSize: Texto.base,
    fontWeight: '600',
    lineHeight: 24,
    color: Estado.noConforme,
    textAlign: 'center',
  },
  secundario: {
    minHeight: Toque.minimo,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secundarioTexto: { fontSize: Texto.base, fontWeight: '600', color: Marca.primarioTexto },
  presionado: { opacity: 0.7 },
});
