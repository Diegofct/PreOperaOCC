/**
 * La barra de arriba del panel: quién está dentro y cómo salir. Spec 022, RF-15 a
 * RF-19.
 *
 * Los módulos ya no van aquí, van en el menú lateral (RF-19). La barra se quedó
 * con lo que no es navegar: la marca, la cuenta y sus dos acciones. Con once
 * módulos la barra de antes se partía en dos renglones; esta mide lo mismo con
 * uno que con veinte.
 *
 * Es una píldora grafito separada de los bordes, al estilo de egg.live (RF-15). El
 * logotipo de OCC lleva «OBRAS» en negro, y sobre grafito esa mitad del nombre
 * desaparecería: por eso va sobre su propia pastilla clara, sin tocar el logo
 * (la spec deja el logo fuera de alcance).
 *
 * A la derecha va quién está dentro y con qué cargo. No es decoración: en un
 * computador compartido de obra, saber con qué cuenta se está trabajando evita
 * que alguien registre algo a nombre de otro sin darse cuenta.
 */
import { useState } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';

import {
  EspaciadoLetra,
  FuentePanel,
  Grosor,
  Movimiento,
  Panel,
  Radio,
  Spacing,
  TextoPanel,
} from '@/constants/theme';

import { ETIQUETA_ROL } from './contratos';
import { Icono, type NombreDeIcono } from './iconos';
import { useSesionPanel } from './sesion';

export function BarraSuperior() {
  const { persona, salir, pedirCambioDeClave } = useSesionPanel();

  return (
    <View style={estilos.franja}>
      <View style={estilos.pildora}>
        <View style={estilos.marca}>
          <View style={estilos.fondoLogotipo}>
            <Image
              source={require('@/../assets/obras_civiles_transparente.png')}
              style={estilos.logotipo}
              resizeMode="contain"
              accessibilityLabel="Obras Civiles Colombianas"
            />
          </View>
          <Text style={estilos.nombreSistema} numberOfLines={1}>
            Control de Obra
          </Text>
        </View>

        <View style={estilos.cuenta}>
          {persona ? (
            <Text style={estilos.persona} numberOfLines={1}>
              {persona.nombreCompleto}
              <Text style={estilos.cargo}> · {ETIQUETA_ROL[persona.rol]}</Text>
            </Text>
          ) : null}
          <BotonDeBarra
            icono="clave"
            titulo="Cambiar contraseña"
            onPress={() => pedirCambioDeClave(true)}
          />
          <BotonDeBarra icono="salir" titulo="Cerrar sesión" onPress={salir} />
        </View>
      </View>
    </View>
  );
}

/**
 * Un botón de la barra: píldora con borde fino, ícono y rótulo en mayúsculas.
 *
 * El realce se lleva con estado propio y no con el `hovered` de `Pressable`, por
 * el mismo motivo que en el resto del panel: el foco y el puntero de la web no
 * están en los tipos de React Native.
 */
function BotonDeBarra({
  icono,
  titulo,
  onPress,
}: {
  icono: NombreDeIcono;
  titulo: string;
  onPress: () => void;
}) {
  const [encima, setEncima] = useState(false);
  const [enfocado, setEnfocado] = useState(false);

  return (
    <Pressable
      onPress={onPress}
      onHoverIn={() => setEncima(true)}
      onHoverOut={() => setEncima(false)}
      onFocus={() => setEnfocado(true)}
      onBlur={() => setEnfocado(false)}
      accessibilityRole="button"
      style={[
        estilos.boton,
        encima && estilos.botonEncima,
        enfocado && estilos.botonEnfocado,
      ]}
    >
      <Icono nombre={icono} color={Panel.textoBarra} tamano={16} />
      <Text style={estilos.botonTexto}>{titulo}</Text>
    </Pressable>
  );
}

const estilos = StyleSheet.create({
  /** El aire alrededor de la píldora: es lo que la hace flotar (RF-15). */
  franja: {
    paddingHorizontal: Spacing.three,
    paddingTop: Spacing.three,
    paddingBottom: Spacing.two,
    backgroundColor: Panel.fondo,
  },
  pildora: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.three,
    paddingVertical: Spacing.two,
    paddingLeft: Spacing.two,
    paddingRight: Spacing.two,
    borderRadius: Radio.pastilla,
    backgroundColor: Panel.barra,
  },
  marca: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    flexShrink: 1,
  },
  /** La pastilla clara del logotipo: sobre grafito, «OBRAS» no se vería. */
  fondoLogotipo: {
    paddingHorizontal: Spacing.three,
    paddingVertical: 0,
    borderRadius: Radio.pastilla,
    backgroundColor: Panel.superficie,
  },
  // A la proporción del dibujo (1,8 : 1), para que `contain` no deje aire a los lados.
  logotipo: { width: 80, height: 44 },
  nombreSistema: {
    fontFamily: FuentePanel.texto,
    fontSize: TextoPanel.seccion,
    fontWeight: '700',
    letterSpacing: EspaciadoLetra.titulo / 2,
    color: Panel.textoBarra,
  },

  cuenta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    flexShrink: 1,
    minWidth: 0,
  },
  /** El nombre se recorta antes que los botones: los botones son lo que se pulsa. */
  persona: {
    flexShrink: 1,
    marginRight: Spacing.two,
    fontFamily: FuentePanel.texto,
    fontSize: TextoPanel.apoyo,
    fontWeight: '700',
    color: Panel.textoBarra,
  },
  cargo: { fontWeight: '500', color: Panel.textoBarraApoyo },

  boton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderRadius: Radio.pastilla,
    borderWidth: Grosor.linea,
    borderColor: Panel.bordeBarra,
    transitionDuration: `${Movimiento.rapido}ms`,
  },
  botonEncima: { backgroundColor: Panel.fondoBarraHover },
  /** Sobre grafito el anillo va claro: el `foco` grafito del panel no se vería. */
  botonEnfocado: { boxShadow: `0 0 0 ${Grosor.marca}px ${Panel.textoBarraApoyo}` },
  botonTexto: {
    fontFamily: FuentePanel.rotulo,
    fontSize: TextoPanel.micro,
    fontWeight: '500',
    letterSpacing: EspaciadoLetra.rotulo,
    textTransform: 'uppercase',
    color: Panel.textoBarra,
  },
});
