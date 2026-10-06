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
 *
 * Desde la spec 022 es la tarjeta centrada de `TarjetaDeAcceso`, con el logo real
 * de OCC —antes un cuadro con «OCC», porque no había logo— y el botón «Ingresar»
 * a lo ancho (RF-29, RF-30).
 */
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Spacing } from '@/constants/theme';

import { Aviso, Boton, Campo } from './componentes';
import { useSesionPanel } from './sesion';
import { PieDeAcceso, SeparadorDeAcceso, TarjetaDeAcceso } from './tarjeta-de-acceso';

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
    <TarjetaDeAcceso
      titulo="Ingresar"
      subtitulo="Obras, maquinaria, personal y la bitácora diaria de cada jornada"
    >
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
        titulo={ocupado ? 'Ingresando…' : 'Ingresar'}
        onPress={enviar}
        deshabilitado={!puedeEntrar}
      />

      <SeparadorDeAcceso />

      <PieDeAcceso>
        ¿Es operador? Su acceso no es este: entre desde la aplicación del celular con su PIN.
      </PieDeAcceso>
    </TarjetaDeAcceso>
  );
}

const estilos = StyleSheet.create({
  campos: { gap: Spacing.three },
});
