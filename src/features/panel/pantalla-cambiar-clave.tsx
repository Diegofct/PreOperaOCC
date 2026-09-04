/**
 * Cambiar la contraseña propia.
 *
 * Cumple dos papeles con la misma pantalla:
 *
 *  1. **Obligatoria** cuando la contraseña es una temporal repartida por
 *     gerencia. En ese caso es lo único que el panel deja ver, y no por
 *     cortesía: el servidor rechaza con 409 cualquier otra ruta mientras
 *     `debeCambiar` siga puesto, así que navegar a otra URL a mano tampoco
 *     sirve de nada.
 *
 *  2. **Voluntaria** desde la barra de navegación, cuando alguien quiere
 *     cambiarla sin más.
 *
 * Pide la actual aunque ya haya sesión abierta. Un computador de obra que
 * alguien dejó abierto no debería poder convertirse en una cuenta secuestrada
 * para siempre en dos clics.
 */
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Colors, Panel, Radio, Sombra, Spacing, TextoPanel } from '@/constants/theme';

import { Aviso, Boton, Campo } from './componentes';
import { LONGITUD_MINIMA_CLAVE } from './contratos';
import { useSesionPanel } from './sesion';

export default function PantallaCambiarClave({ onCancelar }: { onCancelar?: () => void }) {
  const { cambiarClave, persona, salir } = useSesionPanel();
  const obligatorio = persona?.debeCambiarClave ?? false;

  const [actual, setActual] = useState('');
  const [nueva, setNueva] = useState('');
  const [repetida, setRepetida] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [ocupado, setOcupado] = useState(false);

  const cortaDeMas = nueva.length > 0 && nueva.length < LONGITUD_MINIMA_CLAVE;
  const noCoinciden = repetida.length > 0 && nueva !== repetida;
  const puedeEnviar =
    actual.length > 0 && nueva.length >= LONGITUD_MINIMA_CLAVE && nueva === repetida && !ocupado;

  async function enviar() {
    if (!puedeEnviar) return;
    setOcupado(true);
    setError(await cambiarClave({ actual, nueva }));
    setOcupado(false);
  }

  return (
    <View style={estilos.pantalla}>
      <View style={estilos.tarjeta}>
        <View style={estilos.encabezado}>
          <Text style={estilos.titulo}>
            {obligatorio ? 'Defina su contraseña' : 'Cambiar contraseña'}
          </Text>
          {obligatorio ? (
            <Text style={estilos.subtitulo}>
              Está entrando con una contraseña temporal. Elija una suya para continuar: nadie más
              debería conocerla, ni siquiera quien se la entregó.
            </Text>
          ) : null}
        </View>

        {error ? <Aviso tono="error">{error}</Aviso> : null}

        <Campo
          etiqueta={obligatorio ? 'Contraseña temporal' : 'Contraseña actual'}
          valor={actual}
          onChange={setActual}
          oculto
        />
        <Campo
          etiqueta="Contraseña nueva"
          valor={nueva}
          onChange={setNueva}
          oculto
          error={cortaDeMas ? `Al menos ${LONGITUD_MINIMA_CLAVE} caracteres.` : undefined}
          ayuda={`Mínimo ${LONGITUD_MINIMA_CLAVE} caracteres. Larga y fácil de recordar es mejor que corta y llena de símbolos.`}
        />
        <Campo
          etiqueta="Repítala"
          valor={repetida}
          onChange={setRepetida}
          oculto
          onEnviar={enviar}
          error={noCoinciden ? 'No coincide con la anterior.' : undefined}
        />

        <Boton
          titulo={ocupado ? 'Guardando…' : 'Guardar contraseña'}
          onPress={enviar}
          deshabilitado={!puedeEnviar}
        />

        {/* Salir es la única salida de la pantalla obligatoria. Sin este botón,
            quien entre con una temporal que no recuerda se queda encerrado. */}
        {obligatorio ? (
          <Boton titulo="Salir" tono="secundario" onPress={salir} />
        ) : onCancelar ? (
          <Boton titulo="Cancelar" tono="secundario" onPress={onCancelar} />
        ) : null}
      </View>
    </View>
  );
}

const estilos = StyleSheet.create({
  pantalla: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.four,
    backgroundColor: Panel.fondo,
  },
  tarjeta: {
    width: '100%',
    maxWidth: 420,
    gap: Spacing.three,
    padding: Spacing.five,
    borderRadius: Radio.lg,
    borderCurve: 'continuous',
    backgroundColor: Colors.light.background,
    boxShadow: Sombra.flotante,
  },
  encabezado: { gap: Spacing.one },
  titulo: { fontSize: TextoPanel.titulo, fontWeight: '800', color: Colors.light.text },
  subtitulo: {
    fontSize: TextoPanel.apoyo,
    lineHeight: 19,
    color: Colors.light.textSecondary,
  },
});
