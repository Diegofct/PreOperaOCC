/**
 * Ingreso del operador.
 *
 * No es una ruta: el layout la monta en lugar del `Stack` cuando no hay sesión
 * abierta. Así no existe ningún instante en que una pantalla de trabajo alcance
 * a renderizarse sin operador, ni un enlace por el que colarse.
 *
 * Una sola pantalla con cuatro modos, y **solo el primero necesita señal**:
 *
 *   · Activar        — usuario + código de la administración. Una vez por equipo.
 *   · Definir PIN    — seis dígitos, dos veces. El PIN no sale del teléfono.
 *   · Desbloquear    — solo PIN, contra este mismo celular. En modo avión.
 *   · Recuperar      — código de respaldo cuando olvidó el PIN. **También sin señal.**
 *
 * Todo se teclea con el mismo teclado grande: el operador lleva guantes, y en el
 * único sitio donde hace falta escribir letras —el usuario y el código— el campo
 * es de altura `Toque.primario`.
 */
import * as Haptics from 'expo-haptics';
import { useCallback, useRef, useState } from 'react';
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

/**
 * Reinicia lo tecleado al cambiar de modo, sin un efecto que llame a `setState`.
 *
 * La `key` es el modo, así que React desmonta y vuelve a montar el formulario
 * cuando se pasa de activar a definir el PIN, o de desbloquear a recuperar. El
 * estado nace limpio por construcción: arrastrar tres dígitos de la pantalla
 * anterior confunde y no sirve para nada.
 */
export function PantallaIngreso() {
  const { estado } = useSesion();

  if (estado === 'cargando') {
    return (
      <View style={estilos.centro}>
        <ActivityIndicator size="large" color={Marca.primario} />
      </View>
    );
  }

  return <FormularioDeIngreso key={estado} />;
}

function FormularioDeIngreso() {
  const {
    estado,
    usuarioEnrolado,
    esperaMs,
    ocupado,
    hayRespaldo,
    activar,
    definirPin,
    desbloquear,
    iniciarRecuperacion,
    cancelarRecuperacion,
    comprobarRespaldo,
    desenrolar,
  } = useSesion();

  const [usuario, setUsuario] = useState('');
  const [codigo, setCodigo] = useState('');
  const [pin, setPin] = useState('');
  /** El primer PIN, mientras se pide la repetición. Nunca sale de aquí. */
  const [pinPrimero, setPinPrimero] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const enviando = useRef(false);

  const bloqueado = esperaMs > 0;

  const enviarPin = useCallback(
    async (pinCompleto: string) => {
      if (enviando.current) return;
      enviando.current = true;
      setError(null);

      try {
        if (estado === 'definiendo_pin') {
          if (pinPrimero === null) {
            setPinPrimero(pinCompleto);
            setPin('');
            return;
          }
          if (pinPrimero !== pinCompleto) {
            void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
            setPinPrimero(null);
            setPin('');
            setError('Los dos PIN no coinciden. Empiece de nuevo.');
            return;
          }
          const definido = await definirPin(pinCompleto);
          if (!definido.ok) {
            void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
            setPinPrimero(null);
            setPin('');
            setError(definido.mensaje ?? null);
          }
          return;
        }

        const resultado = await desbloquear(pinCompleto);
        if (!resultado.ok) {
          void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
          setPin('');
          setError(resultado.mensaje ?? null);
        }
      } finally {
        enviando.current = false;
      }
    },
    [estado, pinPrimero, definirPin, desbloquear],
  );

  function agregarDigito(digito: string) {
    if (bloqueado || ocupado) return;
    setError(null);
    setPin((previo) => {
      if (previo.length >= LONGITUD_PIN) return previo;
      const siguiente = previo + digito;
      if (siguiente.length === LONGITUD_PIN) void enviarPin(siguiente);
      return siguiente;
    });
  }

  function borrar() {
    setError(null);
    setPin((previo) => previo.slice(0, -1));
  }

  async function enviarActivacion() {
    if (ocupado || !usuario.trim() || !codigo.trim()) return;
    setError(null);
    const resultado = await activar(usuario, codigo);
    if (!resultado.ok) {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      setError(resultado.mensaje ?? null);
    }
  }

  async function enviarRespaldo() {
    if (ocupado || !codigo.trim()) return;
    setError(null);
    const resultado = await comprobarRespaldo(codigo);
    if (!resultado.ok) {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      setError(resultado.mensaje ?? null);
    } else {
      setCodigo('');
    }
  }

  function confirmarDesenrolar() {
    Alert.alert(
      'Activar con otro usuario',
      'Se borrará el acceso de este equipo y habrá que activarlo de nuevo con un código. Los preoperacionales guardados no se pierden.',
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

  /* --------------------------------------------------------------------- */
  /* Activar y recuperar: los dos modos que se resuelven con un código      */
  /* --------------------------------------------------------------------- */

  if (estado === 'sin_enrolar' || estado === 'recuperando') {
    const activando = estado === 'sin_enrolar';

    return (
      <ScrollView
        style={estilos.pantalla}
        contentContainerStyle={estilos.contenido}
        keyboardShouldPersistTaps="handled"
      >
        <View style={estilos.cabecera}>
          <Text style={estilos.titulo}>
            {activando ? 'Active este equipo' : 'Recupere su acceso'}
          </Text>
          <Text style={estilos.ayuda}>
            {activando
              ? 'Escriba su usuario y el código que le dio la administración. Es lo único que necesita señal, y solo hay que hacerlo una vez.'
              : `Equipo de ${usuarioEnrolado}. Pídale a su residente el código de respaldo de la carpeta de la obra. No necesita señal.`}
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

        <TextInput
          value={codigo}
          onChangeText={setCodigo}
          placeholder={activando ? 'Código de activación' : 'Código de respaldo'}
          placeholderTextColor={Colors.light.textSecondary}
          autoCapitalize="characters"
          autoCorrect={false}
          onSubmitEditing={activando ? enviarActivacion : enviarRespaldo}
          style={estilos.campoUsuario}
        />

        {ocupado ? (
          <View style={estilos.estadoLinea}>
            <ActivityIndicator color={Marca.primario} />
            <Text style={estilos.estadoTexto}>Comprobando…</Text>
          </View>
        ) : error ? (
          <Text style={estilos.error}>{error}</Text>
        ) : (
          <View style={estilos.estadoLinea} />
        )}

        <Pressable
          accessibilityRole="button"
          onPress={activando ? enviarActivacion : enviarRespaldo}
          disabled={ocupado}
          style={({ pressed }) => [
            estilos.principal,
            pressed && estilos.presionado,
            ocupado && estilos.inactivo,
          ]}
        >
          <Text style={estilos.principalTexto}>{activando ? 'Activar' : 'Continuar'}</Text>
        </Pressable>

        {!activando ? (
          <Pressable
            accessibilityRole="button"
            onPress={cancelarRecuperacion}
            style={({ pressed }) => [estilos.secundario, pressed && estilos.presionado]}
          >
            <Text style={estilos.secundarioTexto}>Volver</Text>
          </Pressable>
        ) : null}
      </ScrollView>
    );
  }

  /* --------------------------------------------------------------------- */
  /* Definir PIN y desbloquear: los dos modos del teclado numérico          */
  /* --------------------------------------------------------------------- */

  const definiendo = estado === 'definiendo_pin';
  const repitiendo = definiendo && pinPrimero !== null;

  return (
    <ScrollView
      style={estilos.pantalla}
      contentContainerStyle={estilos.contenido}
      keyboardShouldPersistTaps="handled"
    >
      <View style={estilos.cabecera}>
        <Text style={estilos.titulo}>
          {definiendo ? (repitiendo ? 'Repita su PIN' : 'Defina su PIN') : 'Ingrese su PIN'}
        </Text>
        <Text style={estilos.ayuda}>
          {definiendo
            ? repitiendo
              ? 'Escríbalo otra vez para confirmarlo.'
              : 'Seis dígitos que solo usted sabrá. No lo conoce nadie más, ni la oficina: si lo olvida, se recupera con el código de respaldo de la obra.'
            : `Equipo de ${usuarioEnrolado}. No necesita señal.`}
        </Text>
      </View>

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

      {estado === 'bloqueada' ? (
        <>
          {hayRespaldo ? (
            <Pressable
              accessibilityRole="button"
              onPress={iniciarRecuperacion}
              style={({ pressed }) => [estilos.secundario, pressed && estilos.presionado]}
            >
              <Text style={estilos.secundarioTexto}>Olvidé mi PIN</Text>
            </Pressable>
          ) : null}
          <Pressable
            accessibilityRole="button"
            onPress={confirmarDesenrolar}
            style={({ pressed }) => [estilos.secundario, pressed && estilos.presionado]}
          >
            <Text style={estilos.secundarioTexto}>Activar con otro usuario</Text>
          </Pressable>
        </>
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
  principal: {
    minHeight: Toque.primario,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Radio.md,
    backgroundColor: Marca.primario,
  },
  principalTexto: {
    fontSize: Texto.etiqueta,
    fontWeight: '800',
    color: Colors.light.background,
  },
  inactivo: { opacity: 0.5 },
  secundario: {
    minHeight: Toque.minimo,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secundarioTexto: { fontSize: Texto.base, fontWeight: '600', color: Marca.primarioTexto },
  presionado: { opacity: 0.7 },
});
