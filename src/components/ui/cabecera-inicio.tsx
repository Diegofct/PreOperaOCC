/**
 * Lo que comparten las dos pantallas de inicio — la del operador y la del jefe
 * de operadores: el estado de la cola de salida y quién tiene la sesión abierta.
 */
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';

import { Colors, Estado, Marca, Radio, Spacing, Texto, Toque } from '@/constants/theme';

/**
 * El indicador de confianza más importante de la app: se tiene que poder ver de
 * un vistazo que el trabajo está guardado, aunque no haya señal.
 *
 * Cuenta la cola de salida real, no el historial: lo que importa no es cuántos
 * registros se hicieron sino cuántos siguen sin subir.
 */
export function PildoraSincronizacion({ pendientes }: { pendientes: number }) {
  const sinPendientes = pendientes === 0;
  return (
    <View
      style={[
        estilos.pildora,
        { backgroundColor: sinPendientes ? Estado.conformeFondo : Estado.atencionFondo },
      ]}
    >
      <Text
        style={[estilos.pildoraTexto, { color: sinPendientes ? Estado.conforme : Estado.atencion }]}
      >
        {sinPendientes
          ? 'Todo guardado en este equipo'
          : `${pendientes} ${pendientes === 1 ? 'registro pendiente' : 'registros pendientes'} de enviar`}
      </Text>
    </View>
  );
}

export function FilaUsuario({ nombre, onSalir }: { nombre: string; onSalir: () => void }) {
  function confirmar() {
    Alert.alert('Salir', 'Tendrá que ingresar su PIN para volver a entrar.', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Salir', style: 'destructive', onPress: onSalir },
    ]);
  }

  return (
    <View style={estilos.fila}>
      <Text style={estilos.nombre}>{nombre}</Text>
      <Pressable
        accessibilityRole="button"
        onPress={confirmar}
        style={({ pressed }) => [estilos.salir, pressed && estilos.presionado]}
      >
        <Text style={estilos.salirTexto}>Salir</Text>
      </Pressable>
    </View>
  );
}

const estilos = StyleSheet.create({
  pildora: {
    alignSelf: 'flex-start',
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderRadius: Radio.pastilla,
  },
  pildoraTexto: { fontSize: Texto.pie, fontWeight: '700' },
  fila: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three },
  nombre: { flex: 1, fontSize: Texto.titulo, fontWeight: '700', color: Colors.light.text },
  salir: {
    minHeight: Toque.icono,
    paddingHorizontal: Spacing.three,
    alignItems: 'center',
    justifyContent: 'center',
  },
  salirTexto: { fontSize: Texto.base, fontWeight: '600', color: Marca.primarioTexto },
  presionado: { opacity: 0.7 },
});
