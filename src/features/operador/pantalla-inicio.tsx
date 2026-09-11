/**
 * El inicio del celular.
 *
 * La app del teléfono es del **operador de máquina**, y solo suya. Antes tenía
 * también la bitácora del jefe de obra, pero desde la spec 004 el parte diario
 * se lleva en el panel web: son siete secciones con fotografías, y quien lo
 * llena trabaja con computador.
 *
 * A quien entre con una cuenta del panel se le dice dónde está su trabajo, en
 * vez de dejarle una pantalla en blanco.
 */
import { StyleSheet, Text, View } from 'react-native';

import { Colors, Spacing, Texto } from '@/constants/theme';
import { useSesion } from '@/features/auth/sesion';
import { InicioOperador } from '@/features/checklists/inicio-operador';

export default function Inicio() {
  const { usuario } = useSesion();

  // La puerta del layout no monta esto sin sesión abierta; esto es el cinturón.
  if (!usuario) return null;

  if (usuario.rol !== 'operador') {
    return (
      <View style={estilos.centro}>
        <Text style={estilos.titulo}>Su trabajo está en el panel web</Text>
        <Text style={estilos.texto}>
          El parte diario de la obra se lleva desde el computador. Esta aplicación es para que
          los operadores levanten el preoperacional de su máquina en obra.
        </Text>
      </View>
    );
  }

  return <InicioOperador />;
}

const estilos = StyleSheet.create({
  centro: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.four,
    gap: Spacing.three,
  },
  titulo: {
    fontSize: Texto.titulo,
    fontWeight: '800',
    color: Colors.light.text,
    textAlign: 'center',
  },
  texto: { fontSize: Texto.base, color: Colors.light.textSecondary, textAlign: 'center' },
});
