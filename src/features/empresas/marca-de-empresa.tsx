/**
 * La marca de una empresa en su caja (spec 049): el logo, o su nombre como logotipo de
 * texto si todavía no lo tiene, o el ícono de las obras para Proyectos.
 *
 * La caja es fija por tamaño (`CajaDeLogo`): la card y el menú no cambian de alto el día
 * que llegue un logo. El logo se reduce para caber en ella conservando su proporción, así que
 * uno de 2048 px no se deforma (RNF), y **nunca se agranda** por encima de su archivo: el de
 * GeoLab (85×84) se vería borroso (cambio del 2026-11-18, D17). En la card va centrado (RF-54).
 *
 * El logo se multiplica con el fondo (`mixBlendMode: 'multiply'`): el blanco de un JPG, como el
 * de Elemental, desaparece sobre el crema del menú en vez de verse como un rectángulo, y un
 * fondo oscuro (GeoLab) queda tal cual. Esquinas redondeadas para la insignia de GeoLab (RF-52).
 *
 * - `card`: el inicio de Gerencia (RF-15 a RF-19).
 * - `menu`: la cabecera del menú abierto (RF-21, RF-22).
 * - `menuPlegado`: el riel de 72 (RF-25). Sin logo, la inicial de la empresa en un cuadro.
 */
import { Image, StyleSheet, Text, View } from 'react-native';

import { CajaDeLogo, EspaciadoLetra, FuentePanel, Panel, Radio, TextoPanel } from '@/constants/theme';
import { Icono } from '@/features/panel/iconos';
import { nombreDeEmpresa, type EmpresaId } from '@/shared/rules/empresas';

import { logoDeEmpresa } from './logos';

export type TamanoDeMarca = keyof typeof CajaDeLogo;

export function MarcaDeEmpresa({ empresa, tamano }: { empresa: EmpresaId; tamano: TamanoDeMarca }) {
  const caja = CajaDeLogo[tamano];
  const nombre = nombreDeEmpresa(empresa);
  const logo = logoDeEmpresa(empresa);
  const plegado = tamano === 'menuPlegado';

  const enCard = tamano === 'card';

  if (empresa === 'proyectos') {
    return (
      <View style={[estilos.caja, { width: caja.ancho, height: caja.alto }, enCard ? estilos.centro : estilos.izquierda]}>
        <Icono nombre="proyectos" color={Panel.texto} tamano={Math.min(caja.alto, plegado ? 24 : enCard ? 48 : 32)} />
      </View>
    );
  }

  if (logo) {
    // Cabe en la caja; reducir sí, agrandar nunca (D17).
    const escala = Math.min(1, caja.ancho / logo.ancho, caja.alto / logo.alto);
    return (
      <Image
        source={logo.fuente}
        style={[estilos.logo, { width: Math.round(logo.ancho * escala), height: Math.round(logo.alto * escala) }]}
        resizeMode="contain"
        accessibilityLabel={nombre}
      />
    );
  }

  if (plegado) {
    return (
      <View
        style={[estilos.caja, estilos.inicial, { width: caja.ancho, height: caja.alto }]}
        accessible
        accessibilityLabel={nombre}
      >
        <Text style={estilos.textoInicial}>{nombre.charAt(0)}</Text>
      </View>
    );
  }

  // El nombre como logotipo: en la card ocupa todo el ancho, porque ahí no se repite debajo
  // y tiene que leerse entero («Elemental Ingeniería y Arquitectura» no cabe en 160).
  return (
    <View style={[estilos.caja, { width: tamano === 'card' ? '100%' : caja.ancho, height: caja.alto }, estilos.izquierda]}>
      <Text style={tamano === 'card' ? estilos.logotipoCard : estilos.logotipoMenu} numberOfLines={2}>
        {nombre}
      </Text>
    </View>
  );
}

const estilos = StyleSheet.create({
  caja: { justifyContent: 'center' },
  izquierda: { alignItems: 'flex-start' },
  centro: { alignItems: 'center' },
  logo: { borderRadius: Radio.sm, mixBlendMode: 'multiply' },
  inicial: { alignItems: 'center', borderRadius: Radio.sm, backgroundColor: Panel.fondoHover },
  textoInicial: {
    fontFamily: FuentePanel.rotulo,
    fontSize: TextoPanel.seccion,
    fontWeight: '700',
    color: Panel.texto,
  },
  /** El nombre como logotipo: la letra de rótulo, en negrita y apretada, como «Grupo HS». */
  logotipoCard: {
    fontFamily: FuentePanel.rotulo,
    fontSize: TextoPanel.seccion,
    fontWeight: '700',
    letterSpacing: EspaciadoLetra.titulo / 2,
    color: Panel.texto,
  },
  logotipoMenu: {
    fontFamily: FuentePanel.rotulo,
    fontSize: TextoPanel.cuerpo,
    fontWeight: '700',
    letterSpacing: EspaciadoLetra.titulo / 2,
    color: Panel.texto,
  },
});
