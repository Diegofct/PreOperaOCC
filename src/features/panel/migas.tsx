/**
 * La ruta de arriba del título de cada pantalla (spec 050, RF-27 a RF-29, RF-69): empresa u obra ›
 * módulo › registro.
 *
 * Los pasos los decide `migasDelLugar`, en las reglas, y aquí solo se pintan. Así la verificación
 * puede probar qué pasos salen sin abrir un navegador. Todo paso lleva a su pantalla menos el
 * último, que es donde se está (D4).
 *
 * ── El nombre recortado ──
 *
 * Un nombre de obra largo se corta con «…» a `AnchoMaximoDeMiga` (RF-29). Para saber si de verdad se
 * cortó, se mide el texto entero en una copia invisible y se compara con lo que ocupa a la vista, en
 * vez de adivinarlo por el número de letras: «MMMM» y «iiii» no miden lo mismo. Solo cuando se cortó,
 * el nombre completo sale en una etiqueta al pasar el puntero o al mantenerlo pulsado (RF-69), con la
 * misma forma que la etiqueta del menú plegado (T7). Sin recorte no sale nada: repetir lo que ya se
 * lee entero es ruido.
 */
import { Link, usePathname, type Href } from 'expo-router';
import { Fragment, useState } from 'react';
import { Pressable, StyleSheet, Text, View, type LayoutChangeEvent } from 'react-native';

import { AltoDeControlAngosto, AnchoMaximoDeMiga, FuentePanel, Panel, Radio, Sombra, Spacing, TextoPanel } from '@/constants/theme';
import { lugarDeLaRuta, migasDelLugar, type Miga } from '@/shared/rules/empresas';

import { useObraDelLugar } from './obra-del-lugar';
import { useEsAngosto } from './usar-ancho';

export function Migas({ registro }: { registro?: string }) {
  const lugar = lugarDeLaRuta(usePathname());
  const obra = useObraDelLugar();
  const pasos = migasDelLugar(lugar, { obra: obra?.nombre ?? null }, registro);
  if (pasos.length === 0) return null;
  return (
    <View role="navigation" aria-label="Ruta de la pantalla" style={estilos.migas}>
      {pasos.map((paso, i) => (
        <Fragment key={`${i}:${paso.titulo}`}>
          {i > 0 ? (
            <Text style={estilos.separador} aria-hidden>
              ›
            </Text>
          ) : null}
          <Paso paso={paso} />
        </Fragment>
      ))}
    </View>
  );
}

function Paso({ paso }: { paso: Miga }) {
  const [encima, setEncima] = useState(false);
  const [pulsado, setPulsado] = useState(false);
  const [entero, setEntero] = useState(0);
  const [visible, setVisible] = useState(0);
  // Un píxel de holgura: el redondeo del navegador da 140,4 contra 140 sin que falte nada.
  const recortado = entero > 0 && visible > 0 && entero > visible + 1;
  const enlace = paso.ruta !== null;
  // Spec 050, RF-65: en el celular, un paso que se toca mide lo que cualquier otro control.
  const angosto = useEsAngosto();

  const boton = (
    <Pressable
      onHoverIn={() => setEncima(true)}
      onHoverOut={() => setEncima(false)}
      onLongPress={() => setPulsado(true)}
      onPressOut={() => setPulsado(false)}
      accessibilityRole={enlace ? 'link' : undefined}
      accessibilityLabel={paso.titulo}
      aria-current={enlace ? undefined : 'page'}
      // Un solo objeto y no una lista: es lo que `Link` con `asChild` acepta en su hijo (como en el menú).
      style={angosto && enlace ? estilos.pasoAngosto : estilos.paso}
    >
      <Text
        numberOfLines={1}
        onLayout={(e: LayoutChangeEvent) => setVisible(e.nativeEvent.layout.width)}
        style={[estilos.texto, enlace ? estilos.textoEnlace : estilos.textoActual, enlace && encima && estilos.textoEncima]}
      >
        {paso.titulo}
      </Text>
      {/* La copia que mide el nombre entero: fuera de la vista y de los lectores de pantalla. */}
      <Text
        aria-hidden
        onLayout={(e: LayoutChangeEvent) => setEntero(e.nativeEvent.layout.width)}
        style={[estilos.texto, enlace ? estilos.textoEnlace : estilos.textoActual, estilos.medida]}
      >
        {paso.titulo}
      </Text>
      {recortado && (encima || pulsado) ? (
        <View style={estilos.completo} pointerEvents="none">
          <Text style={estilos.completoTexto}>{paso.titulo}</Text>
        </View>
      ) : null}
    </Pressable>
  );

  return enlace ? (
    <Link href={paso.ruta as Href} asChild>
      {boton}
    </Link>
  ) : (
    boton
  );
}

const estilos = StyleSheet.create({
  migas: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    columnGap: Spacing.two,
    rowGap: Spacing.half,
  },
  separador: {
    fontFamily: FuentePanel.texto,
    fontSize: TextoPanel.apoyo,
    color: Panel.textoApoyo,
  },
  paso: { maxWidth: AnchoMaximoDeMiga },
  pasoAngosto: { maxWidth: AnchoMaximoDeMiga, minHeight: AltoDeControlAngosto, justifyContent: 'center' },
  texto: {
    fontFamily: FuentePanel.texto,
    fontSize: TextoPanel.apoyo,
  },
  textoEnlace: { fontWeight: '500', color: Panel.textoApoyo },
  textoEncima: { color: Panel.texto, textDecorationLine: 'underline' },
  textoActual: { fontWeight: '600', color: Panel.texto },
  /** La copia que mide: sin tope de ancho, en un solo renglón y sin ocupar sitio. */
  medida: {
    position: 'absolute',
    opacity: 0,
    // Ancho del texto entero, sin el tope del paso. `max-content` es de la web, que es donde vive
    // el panel, igual que en la etiqueta del menú plegado.
    width: 'max-content' as unknown as number,
  },
  /** El nombre completo de un paso recortado (RF-69). */
  completo: {
    position: 'absolute',
    top: '100%',
    left: 0,
    zIndex: 10,
    marginTop: Spacing.one,
    width: 'max-content' as unknown as number,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.one + Spacing.half,
    borderRadius: Radio.pastilla,
    backgroundColor: Panel.barra,
    boxShadow: Sombra.flotante,
  },
  completoTexto: {
    fontFamily: FuentePanel.texto,
    fontSize: TextoPanel.apoyo,
    fontWeight: '600',
    color: Panel.textoBarra,
  },
});
