/**
 * Las piezas de interfaz del panel.
 *
 * Van en un solo archivo porque son pequeñas y se usan siempre juntas: las
 * cuatro pantallas de registro son la misma pantalla con distintos campos —una
 * tabla, un formulario de alta, un aviso de error—, y partir eso en ocho
 * archivos de veinte líneas complica más de lo que ordena.
 *
 * El panel es de escritorio: no aplica el mínimo táctil de 56 dp que rige en el
 * móvil, porque aquí hay ratón y no guantes. Sí aplican los mismos colores, para
 * que un vehículo NO APTO se vea igual de rojo en el computador del residente
 * que en el celular del operador. Ningún valor va escrito a mano: si falta un
 * token, se añade a `@/constants/theme`.
 */
import { useState, type ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { Colors, Estado, Marca, Panel, Radio, Spacing, Texto } from '@/constants/theme';

/* ------------------------------------------------------------------------ */
/* Texto y avisos                                                            */
/* ------------------------------------------------------------------------ */

export function Titulo({ children }: { children: ReactNode }) {
  return <Text style={estilos.titulo}>{children}</Text>;
}

export function Ayuda({ children }: { children: ReactNode }) {
  return <Text style={estilos.ayuda}>{children}</Text>;
}

/** Un mensaje de error o de confirmación. El color nunca va solo: siempre con símbolo. */
export function Aviso({ tono, children }: { tono: 'error' | 'exito' | 'info'; children: ReactNode }) {
  const paleta = {
    error: { fondo: Estado.noConformeFondo, texto: Estado.noConforme, simbolo: '✕' },
    exito: { fondo: Estado.conformeFondo, texto: Estado.conforme, simbolo: '✓' },
    info: { fondo: Estado.infoFondo, texto: Estado.info, simbolo: 'i' },
  }[tono];

  return (
    <View style={[estilos.aviso, { backgroundColor: paleta.fondo }]}>
      <Text style={[estilos.avisoSimbolo, { color: paleta.texto }]}>{paleta.simbolo}</Text>
      <Text style={[estilos.avisoTexto, { color: paleta.texto }]}>{children}</Text>
    </View>
  );
}

/** Marca de estado dentro de una tabla: texto y color, nunca solo color. */
export function Etiqueta({ tono, children }: { tono: 'neutro' | 'atencion' | 'malo' | 'bueno'; children: ReactNode }) {
  const paleta = {
    neutro: { fondo: Estado.naFondo, texto: Estado.na },
    atencion: { fondo: Estado.atencionFondo, texto: Estado.atencion },
    malo: { fondo: Estado.noConformeFondo, texto: Estado.noConforme },
    bueno: { fondo: Estado.conformeFondo, texto: Estado.conforme },
  }[tono];

  return (
    <View style={[estilos.etiqueta, { backgroundColor: paleta.fondo }]}>
      <Text style={[estilos.etiquetaTexto, { color: paleta.texto }]}>{children}</Text>
    </View>
  );
}

/* ------------------------------------------------------------------------ */
/* Controles                                                                 */
/* ------------------------------------------------------------------------ */

export function Boton({
  titulo,
  onPress,
  tono = 'primario',
  deshabilitado,
}: {
  titulo: string;
  onPress: () => void;
  tono?: 'primario' | 'secundario' | 'peligro';
  deshabilitado?: boolean;
}) {
  const paleta = {
    primario: { fondo: Marca.primario, texto: Colors.light.background, borde: Marca.primario },
    secundario: { fondo: Colors.light.background, texto: Marca.primarioTexto, borde: Panel.borde },
    peligro: { fondo: Colors.light.background, texto: Marca.critico, borde: Panel.borde },
  }[tono];

  return (
    <Pressable
      onPress={onPress}
      disabled={deshabilitado}
      style={({ pressed }) => [
        estilos.boton,
        { backgroundColor: paleta.fondo, borderColor: paleta.borde },
        pressed && estilos.botonPresionado,
        deshabilitado && estilos.botonInactivo,
      ]}
    >
      <Text style={[estilos.botonTexto, { color: paleta.texto }]}>{titulo}</Text>
    </Pressable>
  );
}

export function Campo({
  etiqueta,
  valor,
  onChange,
  ayuda,
  error,
  soloNumeros,
  oculto,
  onEnviar,
  ancho = 220,
}: {
  etiqueta: string;
  valor: string;
  onChange: (v: string) => void;
  ayuda?: string;
  error?: string;
  soloNumeros?: boolean;
  /** Contraseña: ni se ve al teclear ni la ofrece el autocompletado del navegador. */
  oculto?: boolean;
  /** Enter dentro del campo. En un formulario de escritorio se da por hecho. */
  onEnviar?: () => void;
  /** `undefined` ocupa el ancho disponible, para formularios de una columna. */
  ancho?: number;
}) {
  return (
    <View style={[estilos.campo, ancho === undefined ? null : { width: ancho }]}>
      <Text style={estilos.campoEtiqueta}>{etiqueta}</Text>
      <TextInput
        value={valor}
        onChangeText={onChange}
        inputMode={soloNumeros ? 'numeric' : 'text'}
        secureTextEntry={oculto}
        onSubmitEditing={onEnviar}
        returnKeyType={onEnviar ? 'go' : 'default'}
        style={[estilos.campoEntrada, error ? estilos.campoEntradaMal : null]}
        placeholderTextColor={Colors.light.textSecondary}
      />
      {error ? <Text style={estilos.campoError}>{error}</Text> : null}
      {!error && ayuda ? <Text style={estilos.campoAyuda}>{ayuda}</Text> : null}
    </View>
  );
}

export interface Opcion {
  valor: string;
  etiqueta: string;
  detalle?: string;
}

/**
 * Selector desplegable.
 *
 * No usa el `Picker` nativo a propósito: esta pantalla solo existe en el
 * navegador, y ahí el picker de React Native se degrada a algo que no se puede
 * estilar con los tokens del proyecto. Con una lista propia, la obra y el
 * vehículo se ven igual aquí que en cualquier otra parte del panel.
 */
export function Selector({
  etiqueta,
  valor,
  opciones,
  onChange,
  vacio = 'Sin asignar',
  permiteVacio = false,
  error,
  ancho = 220,
}: {
  etiqueta: string;
  valor: string | null;
  opciones: Opcion[];
  onChange: (v: string | null) => void;
  vacio?: string;
  permiteVacio?: boolean;
  error?: string;
  ancho?: number;
}) {
  const [abierto, setAbierto] = useState(false);
  const elegida = opciones.find((o) => o.valor === valor);

  return (
    <View style={[estilos.campo, { width: ancho }]}>
      <Text style={estilos.campoEtiqueta}>{etiqueta}</Text>
      <Pressable
        onPress={() => setAbierto((a) => !a)}
        style={[estilos.campoEntrada, estilos.selectorBoton, error ? estilos.campoEntradaMal : null]}
      >
        <Text style={elegida ? estilos.selectorValor : estilos.selectorVacio} numberOfLines={1}>
          {elegida?.etiqueta ?? vacio}
        </Text>
        <Text style={estilos.selectorFlecha}>{abierto ? '▲' : '▼'}</Text>
      </Pressable>

      {abierto ? (
        <ScrollView style={estilos.selectorLista} nestedScrollEnabled>
          {permiteVacio ? (
            <Pressable
              onPress={() => {
                onChange(null);
                setAbierto(false);
              }}
              style={estilos.selectorOpcion}
            >
              <Text style={estilos.selectorVacio}>{vacio}</Text>
            </Pressable>
          ) : null}
          {opciones.map((opcion) => (
            <Pressable
              key={opcion.valor}
              onPress={() => {
                onChange(opcion.valor);
                setAbierto(false);
              }}
              style={[
                estilos.selectorOpcion,
                opcion.valor === valor && estilos.selectorOpcionElegida,
              ]}
            >
              <Text style={estilos.selectorValor}>{opcion.etiqueta}</Text>
              {opcion.detalle ? <Text style={estilos.campoAyuda}>{opcion.detalle}</Text> : null}
            </Pressable>
          ))}
          {opciones.length === 0 ? (
            <View style={estilos.selectorOpcion}>
              <Text style={estilos.selectorVacio}>No hay nada que elegir todavía.</Text>
            </View>
          ) : null}
        </ScrollView>
      ) : null}
    </View>
  );
}

/* ------------------------------------------------------------------------ */
/* Tabla                                                                     */
/* ------------------------------------------------------------------------ */

export interface Columna<T> {
  clave: string;
  titulo: string;
  ancho: number;
  pintar: (fila: T) => ReactNode;
}

export function Tabla<T extends { id: string }>({
  columnas,
  filas,
  vacio,
}: {
  columnas: Columna<T>[];
  filas: T[];
  vacio: string;
}) {
  if (filas.length === 0) {
    return (
      <View style={estilos.tablaVacia}>
        <Text style={estilos.ayuda}>{vacio}</Text>
      </View>
    );
  }

  return (
    // Horizontal propio: una tabla ancha se desplaza dentro de su marco, nunca
    // empujando la página entera de lado.
    <ScrollView horizontal showsHorizontalScrollIndicator style={estilos.tablaMarco}>
      <View>
        <View style={estilos.tablaCabecera}>
          {columnas.map((columna) => (
            <Text key={columna.clave} style={[estilos.tablaTitulo, { width: columna.ancho }]}>
              {columna.titulo}
            </Text>
          ))}
        </View>
        {filas.map((fila) => (
          <View key={fila.id} style={estilos.tablaFila}>
            {columnas.map((columna) => (
              <View key={columna.clave} style={{ width: columna.ancho }}>
                {columna.pintar(fila)}
              </View>
            ))}
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

/** Texto normal dentro de una celda. */
export function Celda({ children }: { children: ReactNode }) {
  return (
    <Text style={estilos.celda} numberOfLines={1}>
      {children}
    </Text>
  );
}

/* ------------------------------------------------------------------------ */
/* Estructura de pantalla                                                    */
/* ------------------------------------------------------------------------ */

export function Seccion({ titulo, children }: { titulo: string; children: ReactNode }) {
  return (
    <View style={estilos.seccion}>
      <Text style={estilos.seccionTitulo}>{titulo}</Text>
      {children}
    </View>
  );
}

/** La fila de campos de un formulario de alta: se acomoda sola al ancho. */
export function Formulario({ children }: { children: ReactNode }) {
  return <View style={estilos.formulario}>{children}</View>;
}

const estilos = StyleSheet.create({
  titulo: { fontSize: Texto.titulo, fontWeight: '800', color: Colors.light.text },
  ayuda: { fontSize: Texto.pie, lineHeight: 22, color: Colors.light.textSecondary },

  aviso: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.two,
    padding: Spacing.three,
    borderRadius: Radio.md,
  },
  avisoSimbolo: { fontSize: Texto.pie, fontWeight: '800', lineHeight: 22 },
  avisoTexto: { flex: 1, fontSize: Texto.pie, lineHeight: 22, fontWeight: '600' },

  etiqueta: {
    alignSelf: 'flex-start',
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.half,
    borderRadius: Radio.pastilla,
  },
  etiquetaTexto: { fontSize: Texto.pie, fontWeight: '700' },

  boton: {
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderRadius: Radio.sm,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  botonPresionado: { opacity: 0.75 },
  botonInactivo: { opacity: 0.4 },
  botonTexto: { fontSize: Texto.pie, fontWeight: '700' },

  campo: { gap: Spacing.one },
  campoEtiqueta: { fontSize: Texto.pie, fontWeight: '700', color: Colors.light.text },
  campoEntrada: {
    borderWidth: 1,
    borderColor: Panel.borde,
    borderRadius: Radio.sm,
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.two,
    fontSize: Texto.pie,
    color: Colors.light.text,
    backgroundColor: Colors.light.background,
  },
  campoEntradaMal: { borderColor: Estado.noConforme },
  campoError: { fontSize: Texto.pie, color: Estado.noConforme, fontWeight: '600' },
  campoAyuda: { fontSize: Texto.pie, color: Colors.light.textSecondary },

  selectorBoton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  selectorValor: { fontSize: Texto.pie, color: Colors.light.text },
  selectorVacio: { fontSize: Texto.pie, color: Colors.light.textSecondary },
  selectorFlecha: { fontSize: Texto.pie, color: Colors.light.textSecondary },
  selectorLista: {
    maxHeight: 220,
    borderWidth: 1,
    borderColor: Panel.borde,
    borderRadius: Radio.sm,
    backgroundColor: Colors.light.background,
  },
  selectorOpcion: {
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.two,
    borderBottomWidth: 1,
    borderBottomColor: Panel.bordeSuave,
  },
  selectorOpcionElegida: { backgroundColor: Colors.light.backgroundSelected },

  tablaMarco: {
    borderWidth: 1,
    borderColor: Panel.borde,
    borderRadius: Radio.md,
    backgroundColor: Colors.light.background,
  },
  tablaCabecera: {
    flexDirection: 'row',
    gap: Spacing.three,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    backgroundColor: Panel.fondoCabecera,
    borderBottomWidth: 1,
    borderBottomColor: Panel.borde,
  },
  tablaTitulo: { fontSize: Texto.pie, fontWeight: '700', color: Colors.light.textSecondary },
  tablaFila: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderBottomWidth: 1,
    borderBottomColor: Panel.bordeSuave,
  },
  tablaVacia: {
    padding: Spacing.four,
    borderWidth: 1,
    borderColor: Panel.borde,
    borderRadius: Radio.md,
    backgroundColor: Panel.fondoCabecera,
  },
  celda: { fontSize: Texto.pie, color: Colors.light.text },

  seccion: { gap: Spacing.three },
  seccionTitulo: { fontSize: Texto.etiqueta, fontWeight: '700', color: Colors.light.text },
  formulario: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'flex-start',
    gap: Spacing.three,
    padding: Spacing.three,
    borderWidth: 1,
    borderColor: Panel.borde,
    borderRadius: Radio.md,
    backgroundColor: Panel.fondoCabecera,
  },
});
