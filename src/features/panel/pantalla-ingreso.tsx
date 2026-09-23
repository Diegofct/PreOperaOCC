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
 *
 * Los campos ocupan el ancho de la tarjeta: no se les pasa `ancho`. Antes se les
 * pasaba `ancho={undefined}` creyendo que eso pedía ancho completo, y no lo
 * pedía — ver la nota en `Campo`.
 */
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import {
  Colors,
  Marca,
  Panel,
  Radio,
  Sombra,
  Spacing,
  TextoPanel,
} from '@/constants/theme';

import { Aviso, Boton, Campo } from './componentes';
import { useSesionPanel } from './sesion';

export default function PantallaIngreso() {
  const { ingresar } = useSesionPanel();

  const [usuario, setUsuario] = useState('');
  const [clave, setClave] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [ocupado, setOcupado] = useState(false);

  const puedeEntrar = usuario.trim().length > 0 && clave.length > 0 && !ocupado;

  async function enviar() {
    if (!puedeEntrar) return;
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
          <View style={estilos.marca}>
            <View style={estilos.logotipo}>
              <Text style={estilos.logotipoTexto}>OCC</Text>
            </View>
            <Text style={estilos.nombre}>Control de Obra</Text>
          </View>
          <Text style={estilos.subtitulo}>
            Obras, maquinaria, personal y la bitácora diaria de cada jornada
          </Text>
        </View>

        {error ? <Aviso tono="error">{error}</Aviso> : null}

        <View style={estilos.campos}>
          <Campo etiqueta="Usuario" obligatorio valor={usuario} onChange={setUsuario} />
          <Campo
            etiqueta="Contraseña"
            obligatorio
            valor={clave}
            onChange={setClave}
            oculto
            onEnviar={enviar}
          />
        </View>

        <Boton
          titulo={ocupado ? 'Entrando…' : 'Entrar'}
          onPress={enviar}
          deshabilitado={!puedeEntrar}
        />

        <View style={estilos.separador} />

        <Text style={estilos.pie}>
          ¿Es operador? Su acceso no es este: entre desde la aplicación del celular con su PIN.
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
    backgroundColor: Panel.fondo,
  },
  tarjeta: {
    width: '100%',
    maxWidth: 400,
    gap: Spacing.four,
    padding: Spacing.five,
    borderRadius: Radio.lg,
    borderCurve: 'continuous',
    backgroundColor: Colors.light.background,
    boxShadow: Sombra.flotante,
  },
  encabezado: { gap: Spacing.two },
  marca: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  // Un cuadro con las iniciales en vez de una imagen: no hay logotipo todavía, y
  // un espacio en blanco donde debería ir la marca se ve inacabado.
  logotipo: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Radio.md,
    borderCurve: 'continuous',
    backgroundColor: Panel.accion,
  },
  logotipoTexto: {
    fontSize: TextoPanel.apoyo,
    fontWeight: '800',
    letterSpacing: 0.5,
    color: Marca.sobreColor,
  },
  nombre: { fontSize: TextoPanel.titulo, fontWeight: '800', color: Colors.light.text },
  subtitulo: { fontSize: TextoPanel.apoyo, lineHeight: 19, color: Colors.light.textSecondary },

  campos: { gap: Spacing.three },

  separador: { height: 1, backgroundColor: Panel.bordeSuave },
  pie: { fontSize: TextoPanel.apoyo, lineHeight: 19, color: Colors.light.textSecondary },
});
