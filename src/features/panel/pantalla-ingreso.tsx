/**
 * La puerta del panel.
 *
 * Es un formulario de escritorio y no el teclado numérico del operador: aquí hay
 * teclado físico y ratón, y quien entra no lleva guantes. Lo único que comparte
 * con el móvil son los colores.
 *
 * No dice nunca si el usuario existe. El servidor responde lo mismo para un
 * nombre inventado y para una contraseña mala —y tarda lo mismo—, así que esta
 * pantalla solo repite lo que le llega.
 */
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Colors, Marca, Radio, Spacing, Texto } from '@/constants/theme';

import { Aviso, Boton, Campo } from './componentes';
import { useSesionPanel } from './sesion';

export default function PantallaIngreso() {
  const { ingresar } = useSesionPanel();

  const [usuario, setUsuario] = useState('');
  const [clave, setClave] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [ocupado, setOcupado] = useState(false);

  async function enviar() {
    if (!usuario || !clave || ocupado) return;
    setOcupado(true);
    // Derivar la contraseña cuesta ~300 ms a propósito, así que aquí sí se nota
    // la espera y hay que decirlo en el botón.
    setError(await ingresar({ usuario, clave }));
    setOcupado(false);
  }

  return (
    <View style={estilos.pantalla}>
      <View style={estilos.tarjeta}>
        <View style={estilos.encabezado}>
          <Text style={estilos.marca}>PreOpera OCC</Text>
          <Text style={estilos.subtitulo}>Panel de administración</Text>
        </View>

        {error ? <Aviso tono="error">{error}</Aviso> : null}

        <Campo etiqueta="Usuario" valor={usuario} onChange={setUsuario} ancho={undefined} />
        <Campo
          etiqueta="Contraseña"
          valor={clave}
          onChange={setClave}
          oculto
          onEnviar={enviar}
          ancho={undefined}
        />

        <Boton
          titulo={ocupado ? 'Entrando…' : 'Entrar'}
          onPress={enviar}
          deshabilitado={!usuario || !clave || ocupado}
        />

        <Text style={estilos.pie}>
          Si es operador, su acceso no es este: entre desde la aplicación del celular con su PIN.
        </Text>
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
    backgroundColor: Colors.light.backgroundElement,
  },
  tarjeta: {
    width: '100%',
    maxWidth: 380,
    gap: Spacing.three,
    padding: Spacing.four,
    borderRadius: Radio.lg,
    backgroundColor: Colors.light.background,
  },
  encabezado: { gap: Spacing.half },
  marca: { fontSize: Texto.titulo, fontWeight: '800', color: Marca.primarioTexto },
  subtitulo: { fontSize: Texto.pie, color: Colors.light.textSecondary },
  pie: { fontSize: Texto.pie, lineHeight: 21, color: Colors.light.textSecondary },
});
