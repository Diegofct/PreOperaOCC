/**
 * El logotipo del Grupo HS con el nombre del sistema (spec 049).
 *
 * El Grupo HS todavía no tiene logo, así que su lugar lo ocupa este logotipo de texto.
 * Es el **único** sitio que lo dibuja: cuando llegue el logo, se cambia aquí y la barra
 * y el ingreso lo toman sin tocar ninguna pantalla (RNF).
 *
 * «HS» va en una pastilla amarilla con letra grafito, no en letra amarilla: el amarillo
 * del panel va siempre de fondo (spec 022, RF-20), porque como letra sobre crema no se
 * lee. Así el mismo logotipo sirve sobre la barra grafito y sobre la tarjeta blanca.
 *
 * - `barra`: «Grupo HS» y, a su lado, «KONTROLA». En el celular (`compacto`) solo «Grupo
 *   HS», para que quepan el ☰ y los botones (RF-3).
 * - `tarjeta`: el ingreso y el cambio de contraseña. «Grupo HS» grande, debajo «KONTROLA»
 *   y el lema (RF-5 a RF-7).
 */
import { StyleSheet, Text, View } from 'react-native';

import { EspaciadoLetra, FuentePanel, Grosor, Panel, Radio, Spacing, TextoPanel } from '@/constants/theme';
import { MARCA } from '@/shared/catalogos/marca';

/** «Grupo HS» → «Grupo» y «HS»: lo segundo va en la pastilla. */
const [GRUPO, SIGLA] = (() => {
  const partes = MARCA.grupo.split(' ');
  return [partes.slice(0, -1).join(' '), partes[partes.length - 1]] as const;
})();

export function LogotipoGrupo({
  variante,
  compacto = false,
}: {
  variante: 'barra' | 'tarjeta';
  compacto?: boolean;
}) {
  const enBarra = variante === 'barra';
  return (
    <View
      style={enBarra ? estilos.barra : estilos.tarjeta}
      accessible
      accessibilityRole="header"
      accessibilityLabel={`${MARCA.grupo} · ${MARCA.sistema}`}
    >
      <View style={estilos.grupo}>
        <Text style={enBarra ? estilos.palabraBarra : estilos.palabraTarjeta}>{GRUPO}</Text>
        <View style={[estilos.pastilla, !enBarra && estilos.pastillaTarjeta]}>
          <Text style={enBarra ? estilos.siglaBarra : estilos.siglaTarjeta}>{SIGLA}</Text>
        </View>
      </View>

      {enBarra ? (
        compacto ? null : (
          <>
            <View style={estilos.separador} />
            <Text style={estilos.sistemaBarra} numberOfLines={1}>
              {MARCA.logotipo}
            </Text>
          </>
        )
      ) : (
        <View style={estilos.debajo}>
          <Text style={estilos.sistemaTarjeta}>{MARCA.logotipo}</Text>
          <Text style={estilos.lema}>{MARCA.lema}</Text>
        </View>
      )}
    </View>
  );
}

const estilos = StyleSheet.create({
  barra: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three, flexShrink: 1 },
  tarjeta: { alignItems: 'center', gap: Spacing.two },

  grupo: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  palabraBarra: {
    fontFamily: FuentePanel.rotulo,
    fontSize: TextoPanel.logotipo,
    fontWeight: '700',
    letterSpacing: EspaciadoLetra.titulo,
    color: Panel.textoBarra,
  },
  palabraTarjeta: {
    fontFamily: FuentePanel.rotulo,
    fontSize: TextoPanel.logotipoGrande,
    fontWeight: '700',
    letterSpacing: EspaciadoLetra.titulo,
    color: Panel.texto,
  },

  pastilla: {
    paddingHorizontal: Spacing.two,
    borderRadius: Radio.sm,
    backgroundColor: Panel.acento,
  },
  pastillaTarjeta: { paddingHorizontal: Spacing.three, borderRadius: Radio.md },
  siglaBarra: { fontFamily: FuentePanel.rotulo, fontSize: TextoPanel.logotipo, fontWeight: '700', color: Panel.sobreAcento },
  siglaTarjeta: { fontFamily: FuentePanel.rotulo, fontSize: TextoPanel.logotipoGrande, fontWeight: '700', color: Panel.sobreAcento },

  /** La raya fina entre el grupo y el sistema, del color del borde de los botones. */
  separador: { width: Grosor.linea, alignSelf: 'stretch', backgroundColor: Panel.bordeBarra },
  sistemaBarra: {
    fontFamily: FuentePanel.rotulo,
    fontSize: TextoPanel.cuerpo,
    fontWeight: '700',
    letterSpacing: EspaciadoLetra.rotulo * 2,
    color: Panel.textoBarra,
  },

  debajo: { alignItems: 'center', gap: Spacing.one },
  sistemaTarjeta: {
    fontFamily: FuentePanel.rotulo,
    fontSize: TextoPanel.seccion,
    fontWeight: '700',
    letterSpacing: EspaciadoLetra.rotulo * 3,
    color: Panel.texto,
  },
  lema: { fontFamily: FuentePanel.texto, fontSize: TextoPanel.apoyo, color: Panel.textoApoyo },
});
