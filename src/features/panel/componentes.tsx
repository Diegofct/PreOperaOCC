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
import { useEffect, useId, useMemo, useRef, useState, type ReactNode } from 'react';
import {
  Dimensions,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import {
  CampoPanel,
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

import { colocarLista, type ColocacionDeLista } from '@/shared/rules/flotante';
import { filtrarOpciones, ofreceBusqueda } from '@/shared/rules/texto';

import { CapaFlotante } from './capa-flotante';

/* ------------------------------------------------------------------------ */
/* Texto y avisos                                                          */
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

/**
 * La etiqueta de un campo o de un selector.
 *
 * Lo obligatorio lleva «*», y el lector de pantalla oye «obligatorio»: el
 * asterisco rojo solo no basta, porque el color nunca va solo y un «*» leído en
 * voz alta no le dice nada a nadie. Se marca **antes** de intentar guardar
 * (spec 007, RF-17): descubrir que un campo era obligatorio por el rechazo es
 * descubrirlo tarde.
 */
function EtiquetaDeCampo({ texto, obligatorio }: { texto: string; obligatorio?: boolean }) {
  return (
    <Text
      style={estilos.campoEtiqueta}
      accessibilityLabel={obligatorio ? `${texto}, obligatorio` : texto}
    >
      {texto}
      {obligatorio ? <Text style={estilos.campoObligatorio}> *</Text> : null}
    </Text>
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
  multilinea,
  soloLectura,
  obligatorio,
}: {
  etiqueta: string;
  valor: string;
  onChange: (v: string) => void;
  ayuda?: string;
  error?: string;
  soloNumeros?: boolean;
  /**
   * Área de texto de varios renglones, para observaciones (spec 007, RF-24).
   *
   * Sin `ancho`, ocupa **el renglón entero** de su fila de formulario y no solo
   * el ancho que le sobre: esas filas envuelven, y un área de texto encajada al
   * lado de dos lecturas de medidor quedaría de cuatro dedos de ancho.
   */
  multilinea?: boolean;
  /**
   * Se ve pero no se escribe: un valor que calcula el sistema, como el área de
   * una actividad con largo y ancho (spec 004, RF-58). Lleva fondo apagado para
   * que no parezca un campo que se olvidó llenar.
   */
  soloLectura?: boolean;
  /** Hay que llenarlo para poder guardar. Se marca en la etiqueta (spec 007, RF-17). */
  obligatorio?: boolean;
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
    <View
      style={[
        estilos.campo,
        ancho !== undefined
          ? { width: ancho }
          : multilinea
            ? estilos.campoRenglonEntero
            : estilos.campoLleno,
      ]}
    >
      <EtiquetaDeCampo texto={etiqueta} obligatorio={obligatorio} />
      <TextInput
        value={valor}
        onChangeText={onChange}
        inputMode={soloNumeros ? 'numeric' : 'text'}
        secureTextEntry={oculto}
        // En un área de texto, Enter es un salto de renglón, no «enviar».
        onSubmitEditing={multilinea ? undefined : onEnviar}
        returnKeyType={onEnviar && !multilinea ? 'go' : 'default'}
        multiline={multilinea}
        // En la web se traduce a `rows` del `<textarea>`.
        numberOfLines={multilinea ? 6 : undefined}
        onFocus={() => setEnfocado(true)}
        onBlur={() => setEnfocado(false)}
        readOnly={soloLectura}
        style={[
          estilos.campoEntrada,
          multilinea && estilos.campoAreaDeTexto,
          soloLectura && estilos.campoSoloLectura,
          enfocado && !soloLectura && estilos.campoEnfocado,
          error ? estilos.campoEntradaMal : null,
        ]}
        placeholderTextColor={Colors.light.textSecondary}
      />
      {error ? <Text style={estilos.campoError}>{error}</Text> : null}
      {!error && ayuda ? <Text style={estilos.campoAyuda}>{ayuda}</Text> : null}
    </View>
  );
}

/**
 * Una casilla de sí o no.
 *
 * La marca es un «✓» de texto y no solo el relleno de color de la caja: el
 * color nunca va solo, y un lector de pantalla lee la casilla como tal por su
 * rol. Se construye aquí y no con el `<input type="checkbox">` del navegador
 * por lo mismo que el `Selector`: React Native Web no lo trae, y el del
 * navegador no se deja vestir con los tokens del proyecto.
 */
export function Casilla({
  etiqueta,
  marcada,
  onChange,
  deshabilitada,
}: {
  etiqueta: string;
  marcada: boolean;
  onChange: (marcada: boolean) => void;
  deshabilitada?: boolean;
}) {
  const [enfocada, setEnfocada] = useState(false);

  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityState={{ checked: marcada, disabled: deshabilitada }}
      onPress={() => onChange(!marcada)}
      disabled={deshabilitada}
      onFocus={() => setEnfocada(true)}
      onBlur={() => setEnfocada(false)}
      style={({ hovered }) => [
        estilos.casilla,
        hovered && !deshabilitada && estilos.campoHover,
        enfocada && estilos.enfocado,
        deshabilitada && estilos.botonInactivo,
      ]}
    >
      <View style={[estilos.casillaCaja, marcada && estilos.casillaCajaMarcada]}>
        <Text style={estilos.casillaMarca}>{marcada ? '✓' : ' '}</Text>
      </View>
      <Text style={estilos.selectorValor}>{etiqueta}</Text>
    </Pressable>
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
 * **La lista se pinta en la capa flotante** (spec 007, RF-1 a RF-8). Antes
 * flotaba dentro de su tarjeta, con un `zIndex` que solo la subía dentro de esa
 * tarjeta: en el navegador, el 2026-09-15, el botón «Añadir actividad» se pintaba
 * encima de la lista de actividades y la tabla de Asignaciones tapaba la lista de
 * vehículos. Ahora se mide el botón al abrir, y la lista se coloca en la capa
 * junto a él —abajo si cabe, arriba si no (`colocarLista`)—, así que nada de la
 * página la tapa ni la recorta, tampoco dentro de una ventana.
 *
 * Se cierra con un clic fuera, con Esc, y con la rueda del ratón fuera de la
 * lista: la lista va fija en la pantalla, y si la página se moviera debajo
 * quedaría flotando lejos de su botón (RF-5).
 *
 * **Se maneja sin ratón** (RF-9 a RF-14): flechas para moverse, Enter para
 * elegir y, al cerrar, el foco vuelve al botón para seguir con el tabulador.
 * Con más de ocho opciones lleva un buscador arriba que no distingue tildes: en
 * los quince cargos o en cincuenta vehículos, tres letras llegan antes que la
 * vista.
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
  obligatorio,
}: {
  etiqueta: string;
  valor: string | null;
  opciones: Opcion[];
  onChange: (v: string | null) => void;
  vacio?: string;
  permiteVacio?: boolean;
  error?: string;
  ancho?: number;
  /** Hay que elegir algo para poder guardar. Se marca en la etiqueta (spec 007, RF-17). */
  obligatorio?: boolean;
}) {
  const [colocacion, setColocacion] = useState<
    (ColocacionDeLista & { x: number; anchoBoton: number }) | null
  >(null);
  const abierto = colocacion !== null;
  // El foco se lleva aparte porque `focused` no está en los tipos de
  // `Pressable`: solo existe en el React Native de la web.
  const [enfocado, setEnfocado] = useState(false);
  const boton = useRef<View>(null);
  const lista = useRef<View>(null);
  const idLista = useId();
  const elegida = opciones.find((o) => o.valor === valor);

  const [filtro, setFiltro] = useState('');
  /** La opción marcada con el teclado. Es un índice sobre `entradas`. */
  const [senalada, setSenalada] = useState(0);
  const conBuscador = ofreceBusqueda(opciones.length);

  // Lo que se pinta en la lista, en orden. La opción vacía va primero y solo
  // mientras no se esté buscando: «Sin asignar» no es algo que se busque.
  const entradas = useMemo<
    { valor: string | null; etiqueta: string; detalle?: string; vacia?: boolean }[]
  >(
    () => [
      ...(permiteVacio && filtro.trim() === ''
        ? [{ valor: null, etiqueta: vacio, vacia: true }]
        : []),
      ...filtrarOpciones(opciones, filtro),
    ],
    [permiteVacio, filtro, vacio, opciones],
  );

  function abrir() {
    setFiltro('');
    // Se abre con la opción actual marcada: bajar desde ahí es lo normal.
    const valores: (string | null)[] = [
      ...(permiteVacio ? [null] : []),
      ...opciones.map((o) => o.valor),
    ];
    setSenalada(Math.max(0, valores.indexOf(valor)));
    boton.current?.measureInWindow((x, y, anchoBoton, altoBoton) => {
      setColocacion({
        ...colocarLista({
          botonY: y,
          botonAlto: altoBoton,
          altoLista: CampoPanel.altoListaSelector,
          altoPantalla: Dimensions.get('window').height,
          separacion: Spacing.one,
          margen: Spacing.two,
          altoMinimo: CampoPanel.altoMinimoListaSelector,
        }),
        x,
        anchoBoton,
      });
    });
  }

  function cerrar() {
    setColocacion(null);
  }


  function elegir(v: string | null) {
    onChange(v);
    cerrar();
  }

  // La rueda fuera de la lista cierra; dentro, desplaza la lista como siempre.
  // Solo en la web: es la única superficie del panel, y `window` no existe en
  // el celular.
  useEffect(() => {
    if (!abierto || Platform.OS !== 'web') return;
    function alGirar(evento: WheelEvent) {
      const nodo = lista.current as unknown as { contains?: (otro: unknown) => boolean } | null;
      if (nodo?.contains?.(evento.target)) return;
      setColocacion(null);
    }
    function alRedimensionar() {
      setColocacion(null);
    }
    window.addEventListener('wheel', alGirar, { capture: true, passive: true });
    window.addEventListener('resize', alRedimensionar);
    return () => {
      window.removeEventListener('wheel', alGirar, { capture: true });
      window.removeEventListener('resize', alRedimensionar);
    };
  }, [abierto]);

  // Flechas y Enter mientras la lista está abierta (RF-10, RF-11). Esc lo
  // atiende la capa flotante. Se escucha en `window` porque el foco puede estar
  // en el buscador o en ninguna opción, y la lista responde igual.
  useEffect(() => {
    if (!abierto || Platform.OS !== 'web') return;
    function alPulsar(evento: KeyboardEvent) {
      if (evento.key === 'ArrowDown' || evento.key === 'ArrowUp') {
        evento.preventDefault();
        const paso = evento.key === 'ArrowDown' ? 1 : -1;
        setSenalada((i) => Math.min(Math.max(i + paso, 0), Math.max(entradas.length - 1, 0)));
      } else if (evento.key === 'Enter') {
        const entrada = entradas[senalada];
        if (!entrada) return;
        evento.preventDefault();
        evento.stopPropagation();
        onChange(entrada.valor);
        setColocacion(null);
      }
    }
    window.addEventListener('keydown', alPulsar, { capture: true });
    return () => window.removeEventListener('keydown', alPulsar, { capture: true });
  }, [abierto, entradas, senalada, onChange]);

  /**
   * El cursor en el buscador en cuanto la lista se abre, **también dentro de una
   * ventana**. El `autoFocus` solo no basta ahí: la caja se crea mientras la
   * ventana de fuera todavía vigila el foco (React Native Web activa la capa de
   * arriba un instante después), y esa ventana se lo quita y lo deja en su botón
   * «Cerrar». Lo tecleado no llegaba al buscador. Se vio en el formulario de viaje
   * de cantera (spec 010, T9) con el selector de PR, de 26 opciones. Pedirlo en la
   * siguiente vuelta, con la capa ya activa, lo resuelve.
   */
  const buscador = useRef<TextInput>(null);
  useEffect(() => {
    if (!abierto || !conBuscador) return;
    const pedido = setTimeout(() => buscador.current?.focus(), 0);
    return () => clearTimeout(pedido);
  }, [abierto, conBuscador]);

  // La marcada siempre a la vista, aunque la lista se desplace.
  useEffect(() => {
    if (!abierto || Platform.OS !== 'web') return;
    document.getElementById(`${idLista}-${senalada}`)?.scrollIntoView({ block: 'nearest' });
  }, [abierto, idLista, senalada]);

  return (
    <View style={[estilos.campo, ancho === undefined ? estilos.campoLleno : { width: ancho }]}>
      <EtiquetaDeCampo texto={etiqueta} obligatorio={obligatorio} />
      <Pressable
        ref={boton}
        // Con rol de botón, Enter y la barra espaciadora lo abren desde el teclado.
        accessibilityRole="button"
        accessibilityLabel={etiqueta}
        onPress={() => (abierto ? cerrar() : abrir())}
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
      {/*
        El motivo, escrito bajo el selector como bajo un campo de texto (spec 007,
        RF-18). Hasta el 2026-09-16 solo se pintaba el borde en rojo: se veía que algo
        estaba mal pero no qué, y el color quedaba como única señal.
      */}
      {error ? <Text style={estilos.campoError}>{error}</Text> : null}

      <CapaFlotante
        visible={abierto}
        alCerrar={cerrar}
        // De vuelta al botón: quien va con el tabulador sigue desde donde estaba
        // (RF-9). Cuando la capa ya se fue, no antes: ver `alTerminarDeCerrar`.
        alTerminarDeCerrar={() => boton.current?.focus()}
      >
        {colocacion ? (
          <View
            ref={lista}
            style={[
              estilos.selectorLista,
              { left: colocacion.x, width: colocacion.anchoBoton, maxHeight: colocacion.alto },
              // Hacia arriba se ancla por abajo: si la lista es más corta que su
              // alto máximo, sigue pegada al botón en vez de dejar un hueco.
              colocacion.hacia === 'abajo'
                ? { top: colocacion.top }
                : { bottom: Dimensions.get('window').height - colocacion.top - colocacion.alto },
            ]}
          >
            {conBuscador ? (
              <View style={estilos.selectorBuscador}>
                <TextInput
                  ref={buscador}
                  value={filtro}
                  onChangeText={(texto) => {
                    setFiltro(texto);
                    setSenalada(0);
                  }}
                  autoFocus
                  placeholder="Escriba para buscar"
                  placeholderTextColor={Colors.light.textSecondary}
                  accessibilityLabel={`Buscar en ${etiqueta}`}
                  style={estilos.campoEntrada}
                />
              </View>
            ) : null}
            <ScrollView style={estilos.selectorDesplazable}>
              {entradas.map((entrada, indice) => (
                <OpcionDeLista
                  key={entrada.valor ?? '__vacia'}
                  id={`${idLista}-${indice}`}
                  etiqueta={entrada.etiqueta}
                  detalle={entrada.detalle}
                  vacia={entrada.vacia}
                  elegida={entrada.valor === valor}
                  senalada={indice === senalada}
                  alSenalar={() => setSenalada(indice)}
                  alElegir={() => elegir(entrada.valor)}
                />
              ))}
              {opciones.length === 0 ? (
                <View style={estilos.selectorOpcion}>
                  <Text style={estilos.selectorVacio}>No hay nada que elegir todavía.</Text>
                </View>
              ) : entradas.length === 0 ? (
                // RF-14: una lista vacía por un filtro dice por qué lo está.
                <View style={estilos.selectorOpcion}>
                  <Text style={estilos.selectorVacio}>
                    {`Ninguna opción coincide con «${filtro.trim()}».`}
                  </Text>
                </View>
              ) : null}
            </ScrollView>
          </View>
        ) : null}
      </CapaFlotante>
    </View>
  );
}

/**
 * Una opción de la lista. La elegida lleva «✓» además del fondo: el color nunca
 * va solo (spec 007, RF-15).
 */
function OpcionDeLista({
  id,
  etiqueta,
  detalle,
  vacia,
  elegida,
  senalada,
  alSenalar,
  alElegir,
}: {
  /** Para llevarla a la vista cuando se marca con el teclado. */
  id: string;
  etiqueta: string;
  detalle?: string;
  vacia?: boolean;
  elegida: boolean;
  /** Marcada con el teclado o bajo el puntero: es la que elige Enter. */
  senalada: boolean;
  alSenalar: () => void;
  alElegir: () => void;
}) {
  return (
    <Pressable
      nativeID={id}
      accessibilityRole="menuitem"
      accessibilityState={{ selected: elegida }}
      onPress={alElegir}
      // Puntero y teclado marcan la misma opción: si no, Enter elegiría una
      // distinta de la que se ve resaltada.
      onHoverIn={alSenalar}
      style={[
        estilos.selectorOpcion,
        estilos.selectorOpcionFila,
        elegida && estilos.selectorOpcionElegida,
        senalada && estilos.campoHover,
      ]}
    >
      <View style={estilos.selectorOpcionTextos}>
        <Text style={vacia ? estilos.selectorVacio : estilos.selectorValor}>{etiqueta}</Text>
        {detalle ? <Text style={estilos.campoAyuda}>{detalle}</Text> : null}
      </View>
      {elegida ? <Text style={estilos.selectorMarca}>✓</Text> : null}
    </Pressable>
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
export function Celda({
  children,
  lineas = 1,
}: {
  children: ReactNode;
  /**
   * Cuántos renglones puede ocupar antes de cortarse con «…». Uno por defecto, que
   * es lo que mantiene las filas parejas. Más solo para texto que hay que leer
   * entero —el motivo de una anulación—: cortado ahí, no dice nada.
   */
  lineas?: number;
}) {
  return (
    <Text style={estilos.celda} numberOfLines={lineas}>
      {children}
    </Text>
  );
}

/* ------------------------------------------------------------------------ */
/* Estructura de pantalla                                                    */
/* ------------------------------------------------------------------------ */

/**
 * Hasta la spec 007 aceptaba `apilado`: un `zIndex` para que la lista abierta de
 * un selector de esta sección no quedara debajo de la sección siguiente, porque
 * React Native Web le pone `z-index: 0` a toda vista y cada sección era su propio
 * contexto de apilamiento. Las listas se pintan ahora en la capa flotante, fuera
 * de la página, y el parche se retiró.
 */
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
}: {
  children: ReactNode;
  /** La última no lleva línea abajo: si no, parece que falta algo debajo. */
  ultima?: boolean;
}) {
  return (
    <View
      style={[
        estilos.filaFormulario,
        !ultima && estilos.filaConLinea,
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
 *
 * **Se pinta en la capa flotante** (spec 007, RF-25 y RF-26). Hasta el
 * 2026-09-15 el telón vivía dentro del contenido de la página: no cubría la
 * barra, se desplazaba con la página, y con la lista de vehículos al fondo la
 * ventana «Corregir» salía con la cabecera escondida bajo la barra. Ahora cubre
 * la pantalla, va centrada en lo que se ve, y si el formulario es más alto que
 * la pantalla se desplaza **por dentro**: la cabecera con «Cerrar» no se va.
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
    <CapaFlotante visible alCerrar={onCerrar} telon="oscuro">
      {/* Centra la ventana y deja pasar los clics de fuera hasta el telón, que cierra. */}
      <View style={estilos.centroModal}>
        <View style={estilos.ventana}>
          <View style={estilos.ventanaCabecera}>
            <Text style={estilos.ventanaTitulo}>{titulo}</Text>
            <Boton titulo="Cerrar" tono="secundario" onPress={onCerrar} />
          </View>
          <ScrollView
            style={estilos.ventanaDesplazable}
            contentContainerStyle={estilos.ventanaCuerpo}
          >
            {children}
          </ScrollView>
        </View>
      </View>
    </CapaFlotante>
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
    // Por arriba y no por abajo (spec 007, RF-23). Alineadas por abajo, la ayuda
    // que cuelga bajo un campo —«Largo × ancho»— lo empujaba hacia arriba, y en
    // una misma fila las etiquetas quedaban a tres alturas distintas: visto en la
    // segunda línea de una actividad el 2026-09-15.
    alignItems: 'flex-start',
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

  // El telón y su color los pone la capa flotante (`Panel.telon`). Esto solo
  // centra la ventana en la pantalla y deja pasar los clics de fuera.
  centroModal: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.four,
    pointerEvents: 'box-none',
  },
  ventana: {
    width: '100%',
    maxWidth: 720,
    maxHeight: '90%',
    borderRadius: Radio.lg,
    borderCurve: 'continuous',
    backgroundColor: Colors.light.background,
    boxShadow: Sombra.flotante,
    // Sin esto el cuerpo no se encoge y la ventana crece más que la pantalla.
    overflow: 'hidden',
  },
  ventanaDesplazable: { flexShrink: 1 },
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
  campoRenglonEntero: { width: '100%' },
  campoSoloLectura: { backgroundColor: Panel.fondoCabecera, color: Colors.light.textSecondary },
  campoAreaDeTexto: {
    minHeight: CampoPanel.altoAreaDeTexto,
    // Sin esto el texto nace centrado en vertical, como en un campo de una línea.
    textAlignVertical: 'top',
  },
  campoEtiqueta: {
    fontSize: TextoPanel.apoyo,
    fontWeight: '700',
    color: Colors.light.textSecondary,
  },
  campoObligatorio: { color: Marca.critico },
  campoEntrada: {
    borderWidth: 1,
    borderColor: Panel.borde,
    borderRadius: Radio.sm,
    borderCurve: 'continuous',
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    minHeight: CampoPanel.alto,
    fontSize: TextoPanel.cuerpo,
    color: Colors.light.text,
    backgroundColor: Colors.light.background,
    transitionDuration: `${Movimiento.rapido}ms`,
    // El navegador dibuja su propio anillo de foco; aquí se dibuja uno con
    // los colores del proyecto, y dos anillos se ven mal.
    outlineWidth: 0,
  },
  campoHover: { backgroundColor: Panel.fondoHover },
  casilla: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: Spacing.two,
    paddingVertical: Spacing.one,
    paddingHorizontal: Spacing.two,
    borderRadius: Radio.sm,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  casillaCaja: {
    width: TextoPanel.seccion + Spacing.one,
    height: TextoPanel.seccion + Spacing.one,
    borderRadius: Radio.sm / 2,
    borderWidth: 1,
    borderColor: Panel.borde,
    backgroundColor: Colors.light.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  casillaCajaMarcada: { backgroundColor: Panel.accion, borderColor: Panel.accion },
  casillaMarca: { fontSize: TextoPanel.apoyo, fontWeight: '800', color: Panel.sobreAccion },
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
  selectorLista: {
    // La posición y el alto los pone `colocarLista` al abrir.
    position: 'absolute',
    overflow: 'hidden',
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
  selectorOpcionFila: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  selectorOpcionTextos: { flex: 1 },
  selectorBuscador: {
    padding: Spacing.two,
    borderBottomWidth: 1,
    borderBottomColor: Panel.bordeSuave,
  },
  selectorDesplazable: { flexShrink: 1 },
  selectorMarca: { fontSize: TextoPanel.cuerpo, fontWeight: '800', color: Panel.accion },

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
