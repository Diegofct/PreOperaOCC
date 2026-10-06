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
 *
 * Usa la misma tarjeta que el ingreso (spec 022, RF-31).
 */
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Spacing } from '@/constants/theme';

import { Aviso, Boton, Campo } from './componentes';
import { LONGITUD_MINIMA_CLAVE } from './contratos';
import { useSesionPanel } from './sesion';
import { TarjetaDeAcceso } from './tarjeta-de-acceso';

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
    <TarjetaDeAcceso
      titulo={obligatorio ? 'Defina su contraseña' : 'Cambiar contraseña'}
      subtitulo={
        obligatorio
          ? 'Está entrando con una contraseña temporal. Elija una suya para continuar: nadie ' +
            'más debería conocerla, ni siquiera quien se la entregó.'
          : undefined
      }
    >
      {error ? <Aviso tono="error">{error}</Aviso> : null}

      <View style={estilos.campos}>
        <Campo
          etiqueta={obligatorio ? 'Contraseña temporal' : 'Contraseña actual'}
          obligatorio
          valor={actual}
          onChange={setActual}
          oculto
        />
        <Campo
          etiqueta="Contraseña nueva"
          obligatorio
          valor={nueva}
          onChange={setNueva}
          oculto
          error={cortaDeMas ? `Al menos ${LONGITUD_MINIMA_CLAVE} caracteres.` : undefined}
          ayuda={`Mínimo ${LONGITUD_MINIMA_CLAVE} caracteres. Larga y fácil de recordar es mejor que corta y llena de símbolos.`}
        />
        <Campo
          etiqueta="Repítala"
          obligatorio
          valor={repetida}
          onChange={setRepetida}
          oculto
          onEnviar={enviar}
          error={noCoinciden ? 'No coincide con la anterior.' : undefined}
        />
      </View>

      <View style={estilos.botones}>
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
    </TarjetaDeAcceso>
  );
}

const estilos = StyleSheet.create({
  campos: { gap: Spacing.three },
  botones: { gap: Spacing.two },
});
