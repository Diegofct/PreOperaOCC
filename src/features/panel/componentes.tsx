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

/**
 * El paso intermedio antes de una acción que se lleva por delante algo vivo.
 *
 * No es un `Aviso` con botones dentro: `Aviso` mete su contenido en un `<Text>`,
 * y un botón dentro de un texto no es válido. Tampoco es el `confirm()` del
 * navegador, que no deja redactar nada y no existe fuera de la web.
 *
 * Lo que sí hace, y es la razón de existir: **decir qué se rompe, no preguntar
 * si está seguro.** Un "¿confirma?" pelado no informa de nada y se contesta que
 * sí por reflejo; "la contraseña actual de Fulano deja de servir" se lee.
 */
export function Confirmacion({
  aviso,
  confirmar,
  onConfirmar,
  onCancelar,
}: {
  aviso: string;
  confirmar: string;
  onConfirmar: () => void;
  onCancelar: () => void;
}) {
  return (
    <View style={estilos.confirmacion}>
      <Text style={estilos.confirmacionSimbolo}>!</Text>
      <View style={estilos.confirmacionCuerpo}>
        <Text style={estilos.confirmacionTexto}>{aviso}</Text>
        <View style={estilos.grupoAcciones}>
          <Boton titulo={confirmar} tono="peligro" onPress={onConfirmar} />
          <Boton titulo="Cancelar" tono="secundario" onPress={onCancelar} />
        </View>
      </View>
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
  /**
   * El botón principal va en el grafito de OCC, no en su rojo.
   *
   * El rojo de la marca es el mismo con el que aquí se dice «peligro» y «NO
   * APTO». Si el botón de guardar fuera rojo, el de dar de baja dejaría de
   * distinguirse de él, y ese es un error que solo se descubre cuando alguien
   * ya pulsó el que no era.
   */
  const paleta = {
    primario: {
      fondo: Panel.accion,
      fondoActivo: Panel.accionPresionada,
      texto: Panel.sobreAccion,
      borde: 'transparent',
    },
    secundario: {
      fondo: Colors.light.background,
      fondoActivo: Panel.fondoHover,
      texto: Panel.accion,
      borde: Panel.borde,
    },
    peligro: {
      fondo: Colors.light.background,
      fondoActivo: Estado.noConformeFondo,
      texto: Marca.critico,
      borde: Panel.borde,
    },
  }[tono];

  const [enfocado, setEnfocado] = useState(false);

  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      disabled={deshabilitado}
      onFocus={() => setEnfocado(true)}
      onBlur={() => setEnfocado(false)}
      // `hovered` solo llega en web; en nativo es siempre falso y no estorba.
      style={({ pressed, hovered }) => [
        estilos.boton,
        {
          backgroundColor: pressed || hovered ? paleta.fondoActivo : paleta.fondo,
          borderColor: paleta.borde,
          transitionDuration: `${Movimiento.rapido}ms`,
        },
        tono === 'primario' && !deshabilitado && { boxShadow: Sombra.tarjeta },
        // Quien navega con el tabulador tiene que ver dónde está. Sin esto el
        // panel se puede recorrer sin ratón, pero a ciegas.
        enfocado && estilos.enfocado,
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
  // El foco se lleva aparte porque `focused` no está en los tipos de
  // `Pressable`: solo existe en el React Native de la web.
  const [enfocado, setEnfocado] = useState(false);
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
        onFocus={() => setEnfocado(true)}
        onBlur={() => setEnfocado(false)}
        style={({ hovered }) => [
          estilos.campoEntrada,
          estilos.selectorBoton,
          hovered && estilos.campoHover,
          // Abierto o enfocado con el tabulador: en los dos casos hay que ver
          // dónde está uno.
          (abierto || enfocado) && estilos.campoEnfocado,
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
  variante = 'tarjeta',
}: {
  columnas: Columna<T>[];
  filas: T[];
  vacio: string;
  /**
   * `tarjeta` es una tabla apoyada en el lienzo gris, con su fondo y su sombra.
   * `desnuda` es la misma tabla **dentro** de otra superficie: sin fondo, sin
   * sombra y sin radio, porque una caja blanca dentro de una caja blanca se lee
   * como un error de dibujo.
   *
   * El valor por defecto es el de siempre, así que las nueve pantallas que ya la
   * usan no cambian ni un píxel.
   */
  variante?: 'tarjeta' | 'desnuda';
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
      style={[estilos.tablaMarco, variante === 'desnuda' && estilos.tablaDesnuda]}
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

export function Seccion({
  titulo,
  apilado,
  children,
}: {
  titulo: string;
  /**
   * Cuánto se levanta esta sección sobre las que vienen **después**.
   *
   * Hace falta cuando la sección contiene un desplegable y no es la última de la
   * pantalla. React Native Web le pone `z-index: 0` a toda vista, así que cada
   * sección es su propio contexto de apilamiento: el `zIndex` que lleve algo de
   * dentro —la barra de listado lleva 2— sube dentro de la sección y **no puede
   * salir de ella**. Fuera, la sección empata a cero con sus hermanas y gana la
   * última pintada, así que una lista abierta se mete debajo de lo que haya
   * debajo.
   *
   * Opcional a propósito: la mayoría de las pantallas tienen su listado al final
   * y no necesitan nada. Solo lo pasa quien tiene algo debajo.
   */
  apilado?: number;
  children: ReactNode;
}) {
  return (
    <View style={[estilos.seccion, apilado !== undefined && { zIndex: apilado }]}>
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

/**
 * Una fila de un formulario largo, dentro de una sola tarjeta.
 *
 * El parte diario tiene siete secciones y cada una es una lista: máquinas,
 * personas, actividades, tramos de clima, materiales. Con una tarjeta por fila
 * —que es como estaba— la pantalla se convierte en una escalera de bloques
 * blancos con sombra, y a la quinta ya no se distingue dónde acaba una máquina y
 * empieza la siguiente.
 *
 * Aquí las filas viven dentro de la tarjeta de su sección, separadas por una
 * línea fina. Es lo mismo que hace una tabla, con campos en vez de celdas.
 */
export function FilaDeFormulario({
  children,
  ultima = false,
  apilado,
}: {
  children: ReactNode;
  /** La última no lleva línea abajo: si no, parece que falta algo debajo. */
  ultima?: boolean;
  /**
   * Cuánto se levanta esta fila sobre las de abajo.
   *
   * Hace falta por lo mismo que en las bandas: React Native Web le pone
   * `z-index: 0` a toda vista, las filas empatan, y con el empate gana la última
   * pintada. Un desplegable abierto en la primera fila se metía debajo de la
   * segunda. Se pasa **al revés** —`total - índice`— porque la lista cae hacia
   * abajo y lo que hay que tapar es lo que viene después.
   */
  apilado?: number;
}) {
  return (
    <View
      style={[
        estilos.filaFormulario,
        !ultima && estilos.filaConLinea,
        apilado !== undefined && { zIndex: apilado },
      ]}
    >
      {children}
    </View>
  );
}

/* ------------------------------------------------------------------------ */
/* Cifras y medidores                                                        */
/* ------------------------------------------------------------------------ */

/**
 * Una cifra grande con su rótulo y su pie.
 *
 * El pie no es decoración: una cifra sola no dice si está bien o mal. «14
 * equipos» no significa nada; «14 equipos · 3 sin inspeccionar» sí.
 */
export function Cifra({
  titulo,
  valor,
  pie,
  tono = 'neutro',
}: {
  titulo: string;
  valor: string;
  pie?: string;
  tono?: 'neutro' | 'bueno' | 'atencion' | 'malo';
}) {
  const color = {
    neutro: Colors.light.text,
    bueno: Estado.conforme,
    atencion: Estado.atencion,
    malo: Estado.noConforme,
  }[tono];

  return (
    <View style={estilos.cifra}>
      <Text style={estilos.cifraTitulo}>{titulo.toUpperCase()}</Text>
      <Text style={[estilos.cifraValor, { color }]}>{valor}</Text>
      {pie ? <Text style={estilos.cifraPie}>{pie}</Text> : null}
    </View>
  );
}

/**
 * Una barra de porcentaje.
 *
 * Lleva **siempre el número escrito al lado**. El color solo acompaña: quien no
 * distingue el verde del rojo tiene que poder leer lo mismo, y en una pantalla
 * de obra con sol de frente el color es lo primero que se pierde.
 */
export function Medidor({
  titulo,
  porcentaje,
  pie,
}: {
  titulo: string;
  /** De 0 a 100, o `null` cuando la cifra no aplica. */
  porcentaje: number | null;
  pie?: string;
}) {
  const tono =
    porcentaje === null
      ? Panel.borde
      : porcentaje >= 90
        ? Estado.conforme
        : porcentaje >= 60
          ? Estado.atencion
          : Estado.noConforme;

  return (
    <View style={estilos.medidor}>
      <View style={estilos.medidorCabecera}>
        <Text style={estilos.cifraTitulo}>{titulo.toUpperCase()}</Text>
        <Text style={estilos.medidorValor}>
          {porcentaje === null ? 'No aplica' : `${porcentaje}%`}
        </Text>
      </View>
      <View style={estilos.medidorCarril}>
        <View
          style={[
            estilos.medidorRelleno,
            { width: `${porcentaje ?? 0}%`, backgroundColor: tono },
          ]}
        />
      </View>
      {pie ? <Text style={estilos.cifraPie}>{pie}</Text> : null}
    </View>
  );
}

/** Una fila de cifras que se reparte el ancho y baja de línea si no cabe. */
export function Cifras({ children }: { children: ReactNode }) {
  return <View style={estilos.cifras}>{children}</View>;
}

/* ------------------------------------------------------------------------ */
/* Ventana modal                                                             */
/* ------------------------------------------------------------------------ */

/**
 * Una ventana sobre la pantalla, para editar sin perder de vista la lista.
 *
 * Se prefiere a llevar a otra pantalla porque editar es una corrección corta:
 * ir y volver hace perder el sitio en una tabla de cincuenta filas, y quien
 * corrige un dato normalmente va a corregir otro justo después.
 *
 * El telón cierra al pulsarlo, igual que el del `Selector`. Es lo que espera
 * cualquiera y evita dejar a alguien atrapado si el botón de cerrar se pierde
 * detrás de un formulario largo.
 */
export function Modal({
  titulo,
  children,
  onCerrar,
}: {
  titulo: string;
  children: ReactNode;
  onCerrar: () => void;
}) {
  return (
    <View style={estilos.telonModal}>
      <Pressable style={StyleSheet.absoluteFill} onPress={onCerrar} />
      <View style={estilos.ventana}>
        <View style={estilos.ventanaCabecera}>
          <Text style={estilos.ventanaTitulo}>{titulo}</Text>
          <Boton titulo="Cerrar" tono="secundario" onPress={onCerrar} />
        </View>
        <View style={estilos.ventanaCuerpo}>{children}</View>
      </View>
    </View>
  );
}

/* ------------------------------------------------------------------------ */
/* Buscar y filtrar                                                          */
/* ------------------------------------------------------------------------ */

/**
 * La barra de encima de un listado: buscar, filtrar y saber cuántas filas hay.
 *
 * Va en una sola fila y encima de la tabla, no repartida: con los filtros
 * dispersos nadie sabe cuáles están puestos, y una lista filtrada que parece
 * completa es peor que una lista larga.
 */
export function BarraDeListado({
  busqueda,
  onBuscar,
  total,
  mostradas,
  children,
}: {
  busqueda: string;
  onBuscar: (texto: string) => void;
  total: number;
  mostradas: number;
  /** Los selectores de filtro, si la pantalla tiene alguno. */
  children?: ReactNode;
}) {
  return (
    <View style={estilos.barra}>
      <Campo etiqueta="Buscar" valor={busqueda} onChange={onBuscar} ancho={260} />
      {children}
      <View style={estilos.cuenta}>
        <Text style={estilos.cuentaTexto}>
          {mostradas === total
            ? `${total} ${total === 1 ? 'registro' : 'registros'}`
            : `${mostradas} de ${total}`}
        </Text>
        {busqueda.length > 0 || mostradas !== total ? (
          <Boton titulo="Limpiar" tono="secundario" onPress={() => onBuscar('')} />
        ) : null}
      </View>
    </View>
  );
}

/**
 * Recorrer una lista por partes.
 *
 * Aparece solo cuando hace falta: con dos páginas de nada, unos botones
 * deshabilitados debajo de la tabla son ruido.
 */
export function Paginacion({
  pagina,
  porPagina,
  total,
  onCambiar,
}: {
  pagina: number;
  porPagina: number;
  total: number;
  onCambiar: (pagina: number) => void;
}) {
  const paginas = Math.max(1, Math.ceil(total / porPagina));
  if (paginas <= 1) return null;

  return (
    <View style={estilos.paginacion}>
      <Boton
        titulo="◀ Anterior"
        tono="secundario"
        onPress={() => onCambiar(pagina - 1)}
        deshabilitado={pagina <= 1}
      />
      <Text style={estilos.cuentaTexto}>
        Página {pagina} de {paginas}
      </Text>
      <Boton
        titulo="Siguiente ▶"
        tono="secundario"
        onPress={() => onCambiar(pagina + 1)}
        deshabilitado={pagina >= paginas}
      />
    </View>
  );
}

/**
 * Lo que se acaba de hacer, dicho sin interrumpir.
 *
 * No es un diálogo ni tapa nada: una confirmación que hay que cerrar convierte
 * cada guardado en dos gestos, y a la tercera vez se pulsa sin leer.
 */
export function Confirmado({ mensaje }: { mensaje: string | null }) {
  if (!mensaje) return null;
  return <Aviso tono="exito">{mensaje}</Aviso>;
}

const estilos = StyleSheet.create({
  titulo: { fontSize: TextoPanel.titulo, fontWeight: '800', color: Colors.light.text },

  filaFormulario: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'flex-end',
    gap: Spacing.three,
    padding: Spacing.three,
  },
  filaConLinea: { borderBottomWidth: 1, borderBottomColor: Panel.bordeSuave },

  cifras: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.three },
  cifra: {
    flexGrow: 1,
    flexBasis: 190,
    minWidth: 190,
    gap: Spacing.one,
    padding: Spacing.three,
    borderRadius: Radio.md,
    borderCurve: 'continuous',
    borderWidth: 1,
    borderColor: Panel.bordeSuave,
    backgroundColor: Colors.light.background,
    boxShadow: Sombra.tarjeta,
  },
  cifraTitulo: {
    fontSize: TextoPanel.micro,
    fontWeight: '800',
    letterSpacing: 0.4,
    color: Colors.light.textSecondary,
    // Deja los números alineados aunque un rótulo ocupe dos renglones.
    minHeight: 30,
  },
  cifraValor: { fontSize: TextoPanel.cifra, fontWeight: '800' },
  cifraPie: { fontSize: TextoPanel.apoyo, color: Colors.light.textSecondary },

  medidor: {
    flexGrow: 1,
    flexBasis: 280,
    minWidth: 280,
    gap: Spacing.two,
    padding: Spacing.three,
    borderRadius: Radio.md,
    borderCurve: 'continuous',
    borderWidth: 1,
    borderColor: Panel.bordeSuave,
    backgroundColor: Colors.light.background,
    boxShadow: Sombra.tarjeta,
  },
  medidorCabecera: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', gap: Spacing.two },
  medidorValor: { fontSize: TextoPanel.titulo, fontWeight: '800', color: Colors.light.text },
  medidorCarril: {
    height: 10,
    borderRadius: Radio.pastilla,
    backgroundColor: Panel.fondoCabecera,
    overflow: 'hidden',
  },
  medidorRelleno: { height: '100%', borderRadius: Radio.pastilla },

  telonModal: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    // El telón oscurece lo de detrás sin ocultarlo: se sigue viendo de qué
    // lista salió esta ventana.
    backgroundColor: 'rgba(16, 24, 40, 0.45)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.four,
    zIndex: 100,
  },
  ventana: {
    width: '100%',
    maxWidth: 720,
    maxHeight: '90%',
    borderRadius: Radio.lg,
    borderCurve: 'continuous',
    backgroundColor: Colors.light.background,
    boxShadow: Sombra.flotante,
  },
  ventanaCabecera: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.three,
    padding: Spacing.four,
    borderBottomWidth: 1,
    borderBottomColor: Panel.bordeSuave,
  },
  ventanaTitulo: { fontSize: TextoPanel.seccion, fontWeight: '800', color: Colors.light.text },
  ventanaCuerpo: { padding: Spacing.four, gap: Spacing.three },

  barra: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: Spacing.three,
    flexWrap: 'wrap',
    zIndex: 2,
  },
  cuenta: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two, paddingBottom: Spacing.one },
  cuentaTexto: { fontSize: TextoPanel.apoyo, color: Colors.light.textSecondary, fontWeight: '600' },

  paginacion: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.three,
    paddingTop: Spacing.two,
  },
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

  confirmacion: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.two,
    padding: Spacing.three,
    borderRadius: Radio.md,
    borderLeftWidth: 3,
    backgroundColor: Estado.atencionFondo,
    borderLeftColor: Estado.atencion,
  },
  confirmacionSimbolo: {
    fontSize: TextoPanel.cuerpo,
    fontWeight: '800',
    lineHeight: 21,
    color: Estado.atencion,
  },
  confirmacionCuerpo: { flex: 1, gap: Spacing.three },
  confirmacionTexto: {
    fontSize: TextoPanel.cuerpo,
    lineHeight: 21,
    fontWeight: '600',
    color: Estado.atencion,
  },

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
  campoEnfocado: { borderColor: Panel.accion, boxShadow: `0 0 0 3px ${Panel.foco}` },
  /** El mismo anillo, para lo que se pulsa. */
  enfocado: { borderColor: Panel.accion, boxShadow: `0 0 0 3px ${Panel.foco}` },
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
  selectorOpcionElegida: { backgroundColor: Panel.accionSuave },

  tablaMarco: {
    borderRadius: Radio.md,
    borderCurve: 'continuous',
    backgroundColor: Colors.light.background,
    boxShadow: Sombra.tarjeta,
  },
  /** La misma tabla sin superficie propia: ya está dentro de una. */
  tablaDesnuda: { backgroundColor: 'transparent', boxShadow: 'none', borderRadius: 0 },
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
