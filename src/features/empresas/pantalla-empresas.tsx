/**
 * Las tarjetas de las empresas del grupo: el Inicio de la gerencia (spec 033, RF-1 a
 * RF-5). Una por empresa, con su función, el saldo de su último corte y su fecha —o
 * «Sin información financiera»— y, en Proyectos, cuántas obras activas hay. Pulsarla
 * abre la empresa con su menú.
 *
 * Una columna en el celular; dos o cuatro en ventana ancha (requisito no funcional),
 * nunca tres: con tres, la cuarta queda sola en su renglón.
 */

import { Link, type Href } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';

import { EspaciadoLetra, FuentePanel, Grosor, Movimiento, Panel, Radio, Spacing, TextoPanel } from '@/constants/theme';
import { api } from '@/features/panel/cliente-api';
import type { EmpresaFila } from '@/features/panel/contratos';
import { useMenu } from '@/features/panel/estado-menu';
import { MarcoPantalla, useListado } from '@/features/panel/marco';
import { fechaDelCorte, SIN_INFORMACION_FINANCIERA } from '@/shared/rules/cortes';
import { rutaDeEmpresa, rutaDeProyectos } from '@/shared/rules/empresas';
import { anchoDelContenido } from '@/shared/rules/menu';
import { enPesos } from '@/shared/rules/pesos';

/** El ancho por debajo del cual una tarjeta ya no lee bien su saldo. */
const ANCHO_MINIMO_DE_TARJETA = 210;

function columnasPara(ancho: number): number {
  const separacion = Spacing.three;
  if (ancho >= 4 * ANCHO_MINIMO_DE_TARJETA + 3 * separacion) return 4;
  if (ancho >= 2 * ANCHO_MINIMO_DE_TARJETA + separacion) return 2;
  return 1;
}

export function PantallaEmpresas() {
  const empresas = useListado<EmpresaFila>(useCallback(() => api.empresas.listar(), []));
  // El ancho de la columna de contenido, con la misma regla que el resto del panel.
  const { width } = useWindowDimensions();
  const { anchoReservado } = useMenu();
  const columnas = columnasPara(anchoDelContenido(width, anchoReservado));
  // En CSS y sobre el enlace mismo: `Link` con `asChild` no deja pasar una lista de
  // estilos, y un ancho medido con `onLayout` no le llegaba a la tarjeta.
  const separacion = (Spacing.three * (columnas - 1)) / columnas;
  const anchoDeTarjeta = `calc(${100 / columnas}% - ${separacion}px)`;

  return (
    <MarcoPantalla
      titulo="Empresas del grupo"
      descripcion="Elija una empresa para ver su información y sus módulos."
      error={empresas.error}
      cargando={empresas.cargando}
    >
      <View style={estilos.rejilla}>
        {empresas.datos.map((empresa) => (
          <TarjetaDeEmpresa key={empresa.id} empresa={empresa} ancho={anchoDeTarjeta} />
        ))}
      </View>
    </MarcoPantalla>
  );
}

function TarjetaDeEmpresa({ empresa, ancho }: { empresa: EmpresaFila; ancho: string }) {
  const [encima, setEncima] = useState(false);
  const [enfocada, setEnfocada] = useState(false);
  const ruta = empresa.id === 'proyectos' ? rutaDeProyectos() : rutaDeEmpresa(empresa.id);
  const financiero = empresa.financiero;
  // En Proyectos el saldo es la suma de sus obras, a la fecha del corte más antiguo (RF-2).
  const rotulo = financiero
    ? `${empresa.id === 'proyectos' ? 'Saldo de las obras' : 'Saldo'} al ${fechaDelCorte(financiero.fechaCorte)}`
    : null;

  return (
    <Link href={ruta as Href} asChild>
      <Pressable
        accessibilityRole="link"
        accessibilityLabel={`${empresa.nombre}. ${empresa.funcion} ${
          financiero && rotulo ? `${rotulo}: ${enPesos(financiero.saldo)}.` : `${SIN_INFORMACION_FINANCIERA}.`
        }`}
        onHoverIn={() => setEncima(true)}
        onHoverOut={() => setEncima(false)}
        onFocus={() => setEnfocada(true)}
        onBlur={() => setEnfocada(false)}
        // Un solo objeto, no una lista: es lo que `Link` con `asChild` acepta.
        style={{ width: ancho as unknown as number }}
      >
        {/* La caja en un `View` interno: `Link` con `asChild` no admite una lista de
            estilos en su hijo (lo mismo que el menú lateral). */}
        <View
          style={[
            estilos.tarjeta,
            encima && estilos.tarjetaEncima,
            enfocada && estilos.tarjetaEnfocada,
          ]}
        >
          <View style={estilos.cabecera}>
            <Text style={estilos.nombre}>{empresa.nombre}</Text>
            <Text style={estilos.funcion}>{empresa.funcion}</Text>
          </View>
          {financiero && rotulo ? (
            <View style={estilos.cifra}>
              <Text style={estilos.rotulo}>{rotulo.toUpperCase()}</Text>
              <Text style={estilos.valor}>{enPesos(financiero.saldo)}</Text>
            </View>
          ) : (
            <Text style={estilos.sinInformacion}>{SIN_INFORMACION_FINANCIERA}</Text>
          )}
          {empresa.obrasActivas !== null ? (
            // RF-4.
            <Text style={estilos.pie}>
              {empresa.obrasActivas === 1 ? '1 obra activa' : `${empresa.obrasActivas} obras activas`}
            </Text>
          ) : null}
        </View>
      </Pressable>
    </Link>
  );
}

const estilos = StyleSheet.create({
  rejilla: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.three },
  tarjeta: {
    // La misma altura en todo el renglón, aunque una diga más que otra.
    flexGrow: 1,
    gap: Spacing.three,
    padding: Spacing.four,
    borderRadius: Radio.lg,
    borderCurve: 'continuous',
    borderWidth: Grosor.linea,
    borderColor: Panel.bordeSuave,
    backgroundColor: Panel.superficie,
    transitionDuration: `${Movimiento.rapido}ms`,
  },
  tarjetaEncima: { borderColor: Panel.borde, backgroundColor: Panel.fondoHover },
  tarjetaEnfocada: { boxShadow: `0 0 0 ${Grosor.marca}px ${Panel.foco}` },
  cabecera: { gap: Spacing.one },
  nombre: {
    fontFamily: FuentePanel.texto,
    fontSize: TextoPanel.seccion,
    fontWeight: '700',
    color: Panel.texto,
  },
  funcion: { fontFamily: FuentePanel.texto, fontSize: TextoPanel.apoyo, color: Panel.textoApoyo },
  cifra: { gap: Spacing.one },
  rotulo: {
    fontFamily: FuentePanel.rotulo,
    fontSize: TextoPanel.micro,
    fontWeight: '500',
    letterSpacing: EspaciadoLetra.rotulo,
    color: Panel.textoApoyo,
  },
  valor: {
    fontFamily: FuentePanel.texto,
    fontSize: TextoPanel.cifra,
    fontWeight: '800',
    letterSpacing: EspaciadoLetra.titulo,
    color: Panel.texto,
  },
  sinInformacion: { fontFamily: FuentePanel.texto, fontSize: TextoPanel.cuerpo, color: Panel.textoApoyo },
  pie: { fontFamily: FuentePanel.texto, fontSize: TextoPanel.apoyo, fontWeight: '600', color: Panel.texto },
});
