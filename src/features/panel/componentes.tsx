/**
 * Las piezas de interfaz del panel.
 *
 * Van en un solo archivo porque son pequeñas y se usan siempre juntas: las
 * pantallas de registro son la misma pantalla con distintos campos —una tabla,
 * un formulario de alta, un aviso—, y partir eso en ocho archivos de veinte
 * líneas complica más de lo que ordena.
 *
 * **Las pantallas importan estos componentes; estos componentes importan los
 * tokens.** Ninguna pantalla escribe un color, un tamaño ni un espaciado a mano;
 * si falta un token, se añade a `@/constants/theme`.
 *
 * Tres cosas que este archivo hace y que el móvil no necesita:
 *
 *  1. **Escala propia** (`TextoPanel`). La de campo empieza en 15 sp porque se
 *     lee con guantes bajo el sol; aplicada aquí deja título, etiqueta y dato
 *     del mismo tamaño y la pantalla se ve plana. Aquí hay rango de verdad.
 *  2. **Estado de cursor.** En escritorio hay puntero, y una fila o un botón que
 *     no responde al pasar por encima se siente muerto. En el móvil no existe.
 *  3. **Anillo de foco.** Se puede recorrer el panel entero con el tabulador, y
 *     eso solo sirve si se ve dónde está uno.
 */
import { useState, type ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import {
  Colors,
  Estado,
  Marca,
  Movimiento,
  Panel,
  Radio,
  Sombra,
  Spacing,
  TextoPanel,
} from '@/constants/theme';

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
    <View style={[estilos.aviso, { backgroundColor: paleta.fondo, borderLeftColor: paleta.texto }]}>
      <Text style={[estilos.avisoSimbolo, { color: paleta.texto }]}>{paleta.simbolo}</Text>
      <Text style={[estilos.avisoTexto, { color: paleta.texto }]}>{children}</Text>
    </View>
  );
}

/** Marca de estado dentro de una tabla: texto y color, nunca solo color. */
export function Etiqueta({
  tono,
  children,
}: {
  tono: 'neutro' | 'atencion' | 'malo' | 'bueno';
  children: ReactNode;
}) {
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
    primario: {
      fondo: Marca.primario,
      fondoActivo: Marca.primarioPresionado,
      texto: Marca.sobreColor,
      borde: 'transparent',
    },
    secundario: {
      fondo: Colors.light.background,
      fondoActivo: Panel.fondoHover,
      texto: Marca.primarioTexto,
      borde: Panel.borde,
    },
    peligro: {
      fondo: Colors.light.background,
      fondoActivo: Estado.noConformeFondo,
      texto: Marca.critico,
      borde: Panel.borde,
    },
  }[tono];

  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      disabled={deshabilitado}
      // `hovered` solo llega en web; en nativo es siempre falso y no estorba.
      style={({ pressed, hovered }) => [
        estilos.boton,
        {
          backgroundColor: pressed || hovered ? paleta.fondoActivo : paleta.fondo,
          borderColor: paleta.borde,
          transitionDuration: `${Movimiento.rapido}ms`,
        },
        tono === 'primario' && !deshabilitado && { boxShadow: Sombra.tarjeta },
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
  ancho,
}: {
  etiqueta: string;
  valor: string;
  onChange: (v: string) => void;
  ayuda?: string;
  error?: string;
  soloNumeros?: boolean;
  /** Contraseña: ni se ve al teclear ni la ofrece el autocompletado. */
  oculto?: boolean;
  /** Enter dentro del campo. En un formulario de escritorio se da por hecho. */
  onEnviar?: () => void;
  /**
   * Ancho fijo, en píxeles. **Sin valor, el campo ocupa el ancho disponible.**
   *
   * No tiene valor por defecto y eso importa: cuando lo tenía, pasarle
   * `ancho={undefined}` para pedir ancho completo no servía de nada —JavaScript
   * aplica el valor por defecto también ante `undefined`— y los campos del
   * ingreso salían más angostos que su tarjeta. Los formularios de varias
   * columnas pasan su ancho; los de una columna, ninguno.
   */
  ancho?: number;
}) {
  const [enfocado, setEnfocado] = useState(false);

  return (
    <View style={[estilos.campo, ancho === undefined ? estilos.campoLleno : { width: ancho }]}>
      <Text style={estilos.campoEtiqueta}>{etiqueta}</Text>
      <TextInput
        value={valor}
        onChangeText={onChange}
        inputMode={soloNumeros ? 'numeric' : 'text'}
        secureTextEntry={oculto}
        onSubmitEditing={onEnviar}
        returnKeyType={onEnviar ? 'go' : 'default'}
        onFocus={() => setEnfocado(true)}
        onBlur={() => setEnfocado(false)}
        style={[
          estilos.campoEntrada,
          enfocado && estilos.campoEnfocado,
          error ? estilos.campoEntradaMal : null,
        ]}
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
 * estilar con los tokens del proyecto.
 *
 * La lista **flota sobre el contenido** en vez de empujarlo hacia abajo: cuando
 * lo empujaba, abrir el selector de un formulario movía de sitio todo lo que
 * había debajo, incluido el botón que se iba a pulsar después.
 */
export function Selector({
  etiqueta,
  valor,
  opciones,
  onChange,
  vacio = 'Sin asignar',
  permiteVacio = false,
  error,
  ancho,
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
    <View
      style={[
        estilos.campo,
        ancho === undefined ? estilos.campoLleno : { width: ancho },
        abierto && estilos.campoAbierto,
      ]}
    >
      <Text style={estilos.campoEtiqueta}>{etiqueta}</Text>
      <Pressable
        onPress={() => setAbierto((a) => !a)}
        style={({ hovered }) => [
          estilos.campoEntrada,
          estilos.selectorBoton,
          hovered && estilos.campoHover,
          abierto && estilos.campoEnfocado,
          error ? estilos.campoEntradaMal : null,
        ]}
      >
        <Text style={elegida ? estilos.selectorValor : estilos.selectorVacio} numberOfLines={1}>
          {elegida?.etiqueta ?? vacio}
        </Text>
        <Text style={estilos.selectorFlecha}>{abierto ? '▲' : '▼'}</Text>
      </Pressable>

      {abierto ? (
        <>
          {/* Capa invisible a pantalla completa: un clic fuera cierra la lista,
              que es lo que cualquiera espera de un desplegable. */}
          <Pressable style={estilos.telon} onPress={() => setAbierto(false)} />
          <ScrollView style={estilos.selectorLista} nestedScrollEnabled>
            {permiteVacio ? (
              <Pressable
                onPress={() => {
                  onChange(null);
                  setAbierto(false);
                }}
                style={({ hovered }) => [estilos.selectorOpcion, hovered && estilos.campoHover]}
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
                style={({ hovered }) => [
                  estilos.selectorOpcion,
                  hovered && estilos.campoHover,
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
        </>
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
        <Text style={estilos.vacioSimbolo}>—</Text>
        <Text style={estilos.vacioTexto}>{vacio}</Text>
      </View>
    );
  }

  return (
    // Horizontal propio: una tabla ancha se desplaza dentro de su marco, nunca
    // empujando la página entera de lado. Sin barra visible: se dibujaba siempre,
    // incluso cuando la tabla cabía entera, y una barra permanente bajo cada
    // tabla es ruido que sugiere que hay algo más que ver cuando no lo hay.
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={estilos.tablaMarco}
      // Sin esto, las filas solo miden lo que suman sus columnas: la tabla que
      // cabe de sobra dejaba la cabecera y las bandas cortadas a media tarjeta,
      // con un vacío blanco a la derecha que parecía un error de carga.
      contentContainerStyle={estilos.tablaContenido}
    >
      <View style={estilos.tablaCuerpo}>
        <View style={estilos.tablaCabecera}>
          {columnas.map((columna) => (
            <Text key={columna.clave} style={[estilos.tablaTitulo, { width: columna.ancho }]}>
              {columna.titulo}
            </Text>
          ))}
        </View>
        {filas.map((fila, indice) => (
          <Fila key={fila.id} alterna={indice % 2 === 1}>
            {columnas.map((columna) => (
              <View key={columna.clave} style={{ width: columna.ancho }}>
                {columna.pintar(fila)}
              </View>
            ))}
          </Fila>
        ))}
      </View>
    </ScrollView>
  );
}

/**
 * Una fila, con banda alterna y realce bajo el cursor.
 *
 * En una tabla de treinta vehículos con siete columnas, seguir un renglón hasta
 * el final sin ninguna de las dos cosas es un ejercicio de puntería.
 */
function Fila({ alterna, children }: { alterna: boolean; children: ReactNode }) {
  return (
    <Pressable
      style={({ hovered }) => [
        estilos.tablaFila,
        alterna && estilos.tablaFilaAlterna,
        hovered && estilos.tablaFilaHover,
      ]}
    >
      {children}
    </Pressable>
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

/**
 * Un grupo de botones en línea.
 *
 * Estaba copiado en cinco sitios —dos como estilo con nombre, tres escritos a
 * mano dentro del JSX—, y el día en que uno de los cinco se separe un píxel de
 * los otros nadie va a saber cuál era el bueno. Envuelve, además, cuando la
 * celda de una tabla se queda estrecha: antes el segundo botón desaparecía por
 * el borde.
 */
export function Acciones({ children }: { children: ReactNode }) {
  return <View style={estilos.grupoAcciones}>{children}</View>;
}

/**
 * La fila de botones de un formulario.
 *
 * Ocupa el ancho completo y va debajo de los campos, separada por una línea. Sin
 * esto, el botón era un campo más de la fila: al acomodarse el formulario se
 * descolgaba a un renglón propio con un hueco raro encima, y no se leía como el
 * cierre de nada.
 */
export function AccionesFormulario({ children }: { children: ReactNode }) {
  return <View style={estilos.acciones}>{children}</View>;
}

/** Una tarjeta blanca sobre el lienzo. La unidad de composición del panel. */
export function Tarjeta({ children }: { children: ReactNode }) {
  return <View style={estilos.tarjeta}>{children}</View>;
}

const estilos = StyleSheet.create({
  titulo: { fontSize: TextoPanel.titulo, fontWeight: '800', color: Colors.light.text },
  ayuda: { fontSize: TextoPanel.apoyo, lineHeight: 20, color: Colors.light.textSecondary },

  aviso: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.two,
    padding: Spacing.three,
    borderRadius: Radio.md,
    // Una franja de color a la izquierda: identifica el tono de un vistazo, sin
    // teñir el bloque entero.
    borderLeftWidth: 3,
  },
  avisoSimbolo: { fontSize: TextoPanel.cuerpo, fontWeight: '800', lineHeight: 21 },
  avisoTexto: { flex: 1, fontSize: TextoPanel.cuerpo, lineHeight: 21, fontWeight: '600' },

  etiqueta: {
    alignSelf: 'flex-start',
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.half,
    borderRadius: Radio.pastilla,
  },
  etiquetaTexto: { fontSize: TextoPanel.micro, fontWeight: '800', letterSpacing: 0.3 },

  boton: {
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderRadius: Radio.sm,
    borderWidth: 1,
    borderCurve: 'continuous',
    alignItems: 'center',
    justifyContent: 'center',
  },
  botonInactivo: { opacity: 0.45 },
  botonTexto: { fontSize: TextoPanel.cuerpo, fontWeight: '700' },

  campo: { gap: Spacing.one },
  campoLleno: { alignSelf: 'stretch' },
  // Los desplegables abiertos van por encima de los campos vecinos.
  campoAbierto: { zIndex: 10 },
  campoEtiqueta: {
    fontSize: TextoPanel.apoyo,
    fontWeight: '700',
    color: Colors.light.textSecondary,
  },
  campoEntrada: {
    borderWidth: 1,
    borderColor: Panel.borde,
    borderRadius: Radio.sm,
    borderCurve: 'continuous',
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    minHeight: 38,
    fontSize: TextoPanel.cuerpo,
    color: Colors.light.text,
    backgroundColor: Colors.light.background,
    transitionDuration: `${Movimiento.rapido}ms`,
    // El navegador dibuja su propio anillo de foco; aquí se dibuja uno con
    // los colores del proyecto, y dos anillos se ven mal.
    outlineWidth: 0,
  },
  campoHover: { backgroundColor: Panel.fondoHover },
  campoEnfocado: { borderColor: Marca.primario, boxShadow: `0 0 0 3px ${Panel.foco}` },
  campoEntradaMal: { borderColor: Estado.noConforme },
  campoError: { fontSize: TextoPanel.apoyo, color: Estado.noConforme, fontWeight: '600' },
  campoAyuda: { fontSize: TextoPanel.apoyo, color: Colors.light.textSecondary },

  selectorBoton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  selectorValor: { fontSize: TextoPanel.cuerpo, color: Colors.light.text },
  selectorVacio: { fontSize: TextoPanel.cuerpo, color: Colors.light.textSecondary },
  selectorFlecha: { fontSize: TextoPanel.micro, color: Colors.light.textSecondary },
  telon: { position: 'absolute', top: -1000, left: -2000, right: -2000, height: 4000 },
  selectorLista: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    maxHeight: 240,
    marginTop: Spacing.one,
    borderWidth: 1,
    borderColor: Panel.borde,
    borderRadius: Radio.md,
    borderCurve: 'continuous',
    backgroundColor: Colors.light.background,
    boxShadow: Sombra.flotante,
  },
  selectorOpcion: {
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderBottomWidth: 1,
    borderBottomColor: Panel.bordeSuave,
  },
  selectorOpcionElegida: { backgroundColor: Marca.primarioSuave },

  tablaMarco: {
    borderRadius: Radio.md,
    borderCurve: 'continuous',
    backgroundColor: Colors.light.background,
    boxShadow: Sombra.tarjeta,
  },
  tablaContenido: { minWidth: '100%' },
  tablaCuerpo: { flexGrow: 1 },
  tablaCabecera: {
    flexDirection: 'row',
    gap: Spacing.three,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    backgroundColor: Panel.fondoCabecera,
    borderBottomWidth: 1,
    borderBottomColor: Panel.borde,
  },
  tablaTitulo: {
    fontSize: TextoPanel.micro,
    fontWeight: '800',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
    color: Colors.light.textSecondary,
  },
  tablaFila: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderBottomWidth: 1,
    borderBottomColor: Panel.bordeSuave,
    transitionDuration: `${Movimiento.rapido}ms`,
  },
  tablaFilaAlterna: { backgroundColor: Panel.fondoAlterno },
  tablaFilaHover: { backgroundColor: Panel.fondoHover },
  tablaVacia: {
    alignItems: 'center',
    gap: Spacing.two,
    padding: Spacing.five,
    borderRadius: Radio.md,
    borderCurve: 'continuous',
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: Panel.borde,
    backgroundColor: Panel.fondoCabecera,
  },
  vacioSimbolo: { fontSize: TextoPanel.titulo, color: Panel.borde, fontWeight: '800' },
  vacioTexto: {
    fontSize: TextoPanel.cuerpo,
    lineHeight: 21,
    color: Colors.light.textSecondary,
    textAlign: 'center',
    maxWidth: 460,
  },
  celda: { fontSize: TextoPanel.cuerpo, color: Colors.light.text },

  seccion: { gap: Spacing.two },
  seccionTitulo: {
    fontSize: TextoPanel.seccion,
    fontWeight: '700',
    color: Colors.light.text,
  },
  formulario: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'flex-start',
    gap: Spacing.three,
    padding: Spacing.three,
    borderRadius: Radio.md,
    borderCurve: 'continuous',
    backgroundColor: Colors.light.background,
    boxShadow: Sombra.tarjeta,
    // Sin esto, un selector abierto queda por debajo de la tabla de abajo.
    zIndex: 1,
  },
  grupoAcciones: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: Spacing.two,
  },
  acciones: {
    width: '100%',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
    paddingTop: Spacing.three,
    marginTop: Spacing.one,
    borderTopWidth: 1,
    borderTopColor: Panel.bordeSuave,
  },
  tarjeta: {
    padding: Spacing.three,
    borderRadius: Radio.md,
    borderCurve: 'continuous',
    backgroundColor: Colors.light.background,
    boxShadow: Sombra.tarjeta,
  },
});
