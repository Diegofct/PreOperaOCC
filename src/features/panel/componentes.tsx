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
import {
  Children,
  cloneElement,
  createContext,
  createElement,
  isValidElement,
  useContext,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import {
  Dimensions,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
  type FlexStyle,
} from 'react-native';

import {
  AltoDeControlAngosto,
  CampoPanel,
  EspaciadoLetra,
  Estado,
  FuentePanel,
  Grosor,
  Movimiento,
  Panel,
  Radio,
  Sombra,
  Spacing,
  TextoPanel,
} from '@/constants/theme';

import { colocarLista, type ColocacionDeLista } from '@/shared/rules/flotante';
import {
  HORAS_DEL_DIA,
  minutosOfrecidos,
  partirHora,
  unirHora,
} from '@/shared/rules/horas';
import { filtrarOpciones, ofreceBusqueda } from '@/shared/rules/texto';

import { CapaFlotante } from './capa-flotante';
import { anchoMinimoDeColumna, crecimientoDeColumna, partesDeLaTarjeta, seMuestraEnTarjetas } from './columnas';
import { pulsacionesPara, type Orden, type Sentido } from './ordenar';
import { useEsAngosto } from './usar-ancho';
import { useAccionDeVentana } from './usar-accion-de-ventana';

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
  titulo = 'Confirmar',
}: {
  aviso: string;
  confirmar: string;
  /**
   * La acción. **Si falla, tiene que lanzar**: es así como esta ventana se
   * entera y puede mostrar el motivo. Cerrar al salir bien es cosa de quien la
   * usa, dentro de esta misma función.
   */
  onConfirmar: () => Promise<unknown>;
  onCancelar: () => void;
  titulo?: string;
}) {
  /*
   * En una ventana y no en línea (spec 015, RF-1 a RF-6). Pintada donde la
   * pantalla la declaraba, salía arriba del todo, lejos del botón pulsado, y con
   * la tabla al fondo se pasaba por alto: parecía que «Dar de baja» no hacía
   * nada. La ventana tapa la página con el telón oscuro, no deja tocar lo de
   * detrás, y Esc, el clic fuera y «Cerrar» equivalen a «Cancelar».
   *
   * ── La ventana se queda abierta hasta que la acción sale bien (RF-25) ──
   *
   * Antes se cerraba **antes** de ejecutar, para que un error saliera en la
   * pantalla. No funcionó: la pantalla está detrás del telón mientras la ventana
   * vive, y al cerrarse el aviso aparecía arriba del todo, donde no mira quien
   * acaba de pulsar. La gerencia se topó con ello el 2026-09-22 —el servidor
   * rechazó mover a un almacenista a una obra sin ese módulo y nadie llegó a
   * leer el motivo—, y RF-25 invirtió la decisión: el motivo va aquí dentro y
   * desde aquí se reintenta o se cancela.
   *
   * Mientras la acción corre no se puede cerrar ni con Esc ni con el telón: una
   * ventana que desaparece a mitad de vuelo deja la tabla sin recargar y al
   * servidor haciendo el trabajo igualmente.
   */
  const accion = useAccionDeVentana();

  return (
    <Modal titulo={titulo} onCerrar={accion.ejecutando ? () => {} : onCancelar} angosta>
      <View style={estilos.confirmacion}>
        <Text style={estilos.confirmacionSimbolo}>!</Text>
        <View style={estilos.confirmacionCuerpo}>
          <Text style={estilos.confirmacionTexto}>{aviso}</Text>
          {accion.error ? <Aviso tono="error">{accion.error}</Aviso> : null}
          <View style={estilos.grupoAcciones}>
            <Boton
              titulo={accion.ejecutando ? 'Un momento…' : confirmar}
              tono="peligro"
              onPress={() => {
                void accion.ejecutar(onConfirmar);
              }}
              deshabilitado={accion.ejecutando}
            />
            <Boton
              titulo="Cancelar"
              tono="secundario"
              onPress={onCancelar}
              deshabilitado={accion.ejecutando}
            />
          </View>
        </View>
      </View>
    </Modal>
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
  const angosto = useEsAngosto();
  const paleta = {
    neutro: { fondo: Estado.naFondo, texto: Estado.na },
    atencion: { fondo: Estado.atencionFondo, texto: Estado.atencion },
    malo: { fondo: Estado.noConformeFondo, texto: Estado.noConforme },
    bueno: { fondo: Estado.conformeFondo, texto: Estado.conforme },
  }[tono];

  return (
    <View style={[estilos.etiqueta, { backgroundColor: paleta.fondo }]}>
      <Text style={[estilos.etiquetaTexto, angosto && estilos.textoAngosto, { color: paleta.texto }]}>{children}</Text>
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
  const angosto = useEsAngosto();
  /**
   * El botón principal va en el grafito, no en el rojo de OCC.
   *
   * El rojo de la marca es el mismo con el que aquí se dice «peligro» y «NO
   * APTO». Si el botón de guardar fuera rojo, el de dar de baja dejaría de
   * distinguirse de él, y ese es un error que solo se descubre cuando alguien
   * ya pulsó el que no era.
   *
   * Desde la spec 022 los tres son píldoras, como en egg.live (RF-24): el principal
   * relleno de grafito y los otros dos transparentes, con un borde fino. El de
   * peligro lleva el rojo de `Estado` en el texto: es un estado, no un adorno.
   */
  const paleta = {
    primario: {
      fondo: Panel.accion,
      fondoActivo: Panel.accionPresionada,
      texto: Panel.sobreAccion,
      borde: Panel.accion,
    },
    secundario: {
      fondo: 'transparent',
      fondoActivo: Panel.fondoHover,
      texto: Panel.texto,
      borde: Panel.borde,
    },
    peligro: {
      fondo: 'transparent',
      fondoActivo: Estado.noConformeFondo,
      texto: Estado.noConforme,
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
        angosto && estilos.controlAngosto,
        {
          backgroundColor: pressed || hovered ? paleta.fondoActivo : paleta.fondo,
          borderColor: paleta.borde,
          transitionDuration: `${Movimiento.rapido}ms`,
        },
        // Quien navega con el tabulador tiene que ver dónde está. Sin esto el
        // panel se puede recorrer sin ratón, pero a ciegas.
        enfocado && estilos.enfocado,
        deshabilitado && estilos.botonInactivo,
      ]}
    >
      <Text style={[estilos.botonTexto, angosto && estilos.rotuloAngosto, { color: paleta.texto }]}>{titulo}</Text>
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
/**
 * Dentro de un `Formulario` de alta los campos crecen hasta llenar su renglón, para
 * que las filas queden parejas en vez de dentadas (spec 026, RF-29 a RF-31).
 */
const EnFormulario = createContext(false);

/**
 * Dentro de una ventana (spec 050, RF-21): los botones de su formulario se quedan pegados al pie
 * mientras el cuerpo se desplaza, para no tener que bajar hasta el final a buscar «Guardar».
 *
 * Se resuelve con `position: sticky` sobre los mismos botones y no con una ranura en la ventana
 * que `AccionesFormulario` llenara, que era lo que decía el plan: llenarla obliga a que los
 * botones le avisen a la ventana en cada pintada, y la ventana, al repintarse, vuelve a pintar los
 * botones —un ciclo—, o a sacarlos con un portal de `react-dom`, que el proyecto no usa. Pegados,
 * los botones son los mismos, se pintan una sola vez y siguen en el orden de siempre.
 */
const EnVentana = createContext(false);

/**
 * Dentro de la columna final de una `FilaDeSeccion` la observación toma el ancho de esa
 * columna y no el suyo, para que la casilla caiga en el mismo sitio en todas las
 * secciones de la bitácora (spec 032, RF-3).
 */
const EnColumnaFinal = createContext(false);

/**
 * Los tres anchos de un campo en un formulario de alta (spec 039, RF-24): corto para un
 * número, una hora o una fecha; medio para un nombre o un selector; largo, flexible,
 * para un texto. Cada campo cae en el suyo por el `ancho` que pide, y así los
 * formularios quedan en rejilla en vez de con un ancho distinto por campo.
 */
export const ANCHOS_DE_CAMPO = { corto: 120, medio: 220 } as const;

function anchoUniforme(ancho: number): FlexStyle {
  if (ancho <= 160) return { flexBasis: ANCHOS_DE_CAMPO.corto, flexGrow: 1, minWidth: ANCHOS_DE_CAMPO.corto, maxWidth: ANCHOS_DE_CAMPO.corto * 1.5 };
  if (ancho <= 280) return { flexBasis: ANCHOS_DE_CAMPO.medio, flexGrow: 1, minWidth: ANCHOS_DE_CAMPO.medio, maxWidth: ANCHOS_DE_CAMPO.medio * 1.5 };
  return { flexBasis: ancho, flexGrow: 2, minWidth: ANCHOS_DE_CAMPO.medio };
}

/**
 * El ancho de un campo con `ancho` (spec 026; spec 039, RF-24):
 *  · en el celular, el renglón entero: un campo por renglón (RF-35);
 *  · en un formulario de alta, uno de los tres anchos uniformes, creciendo un poco para
 *    que el renglón quede parejo (RF-29);
 *  · en lo demás —las filas de la bitácora, ya medidas a 1280 px—, ese ancho fijo.
 */
/**
 * El ancho de un campo **sin** `ancho` (spec 039, RF-25): en el celular, el renglón entero;
 * en un formulario de escritorio, el largo flexible, para que llene su renglón —con
 * `alignSelf: 'stretch'` en una fila que envuelve se encogía a lo escrito: «Nombre» y
 * «Dirección» del contrato salían de media caja—; fuera de un formulario, como siempre.
 */
function useAnchoSinMedida(): FlexStyle {
  const angosto = useEsAngosto();
  const enFormulario = useContext(EnFormulario);
  if (angosto) return { width: '100%' };
  if (enFormulario) return { flexBasis: 300, flexGrow: 2, minWidth: ANCHOS_DE_CAMPO.medio };
  return estilos.campoLleno;
}

function useAnchoDeCampo(ancho: number): FlexStyle {
  const angosto = useEsAngosto();
  const enFormulario = useContext(EnFormulario);
  if (angosto) return { width: '100%' };
  if (enFormulario) return anchoUniforme(ancho);
  return { width: ancho };
}

/**
 * Ir al primer campo con error (spec 050, RF-20).
 *
 * Al guardar, el servidor puede rechazar un campo que no está a la vista —el último de una
 * ventana larga— y quien guardó solo ve que no pasó nada. Cada campo con error se marca en su
 * elemento (`data-campo-con-error`), y en el siguiente cuadro se lleva a la vista **el primero de
 * la página**, en el orden en que se lee. Si fallan cinco campos a la vez, se hace un solo
 * desplazamiento, no cinco.
 *
 * Va sobre la marca del DOM y no sobre un contexto que registre los campos, que era lo que decía
 * el plan: así ningún formulario tiene que envolverse en nada, y «el primero» lo decide el orden
 * real de la página y no el orden en que React montó los componentes. Solo se mueve cuando el
 * error **aparece**: mientras alguien corrige otro campo, la pantalla no salta.
 */
let irAlPrimerErrorPendiente = false;

function programarIrAlPrimerError() {
  if (irAlPrimerErrorPendiente || Platform.OS !== 'web' || typeof document === 'undefined') return;
  irAlPrimerErrorPendiente = true;
  requestAnimationFrame(() => {
    irAlPrimerErrorPendiente = false;
    document.querySelector('[data-campo-con-error]')?.scrollIntoView({ block: 'center', behavior: 'smooth' });
  });
}

function useIrAlPrimerError(error: string | undefined) {
  const ref = useRef<View>(null);
  const conError = Boolean(error);
  useEffect(() => {
    if (Platform.OS !== 'web') return;
    // En la web, el `View` de React Native es un elemento del DOM.
    const nodo = ref.current as unknown as HTMLElement | null;
    if (!nodo?.setAttribute) return;
    if (conError) {
      nodo.setAttribute('data-campo-con-error', '');
      programarIrAlPrimerError();
    } else {
      nodo.removeAttribute('data-campo-con-error');
    }
  }, [conError]);
  return ref;
}

/**
 * La etiqueta de un campo, siempre encima (spec 050, RF-13 a RF-16). En el escritorio ocupa un
 * solo renglón de alto fijo, así que en un renglón de campos todos los recuadros arrancan a la
 * misma altura, digan lo que digan sus etiquetas; la que no cabe se corta con «…» y el lector de
 * pantalla la lee entera. En el celular va un campo por renglón y no hay nada que alinear: ahí se
 * parte en los renglones que necesite, para no esconder nada.
 */
function EtiquetaDeCampo({ texto, obligatorio }: { texto: string; obligatorio?: boolean }) {
  const angosto = useEsAngosto();
  return (
    <Text
      style={[estilos.campoEtiqueta, angosto ? estilos.textoAngosto : estilos.campoEtiquetaFija]}
      numberOfLines={angosto ? undefined : 1}
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
  compacto,
  envolver,
}: {
  etiqueta: string;
  valor: string;
  onChange: (v: string) => void;
  /**
   * Con `soloLectura`, el texto envuelve en vez de cortarse: el nombre de una máquina o
   * de una persona en la columna de 200 de la bitácora («Montacarga a Diesel · Falta la
   * placa»), que antes se leía «Montacarga a Diesel · Falt» (spec 039, RF-26).
   */
  envolver?: boolean;
  ayuda?: string;
  error?: string;
  soloNumeros?: boolean;
  /**
   * Con `multilinea`, tres renglones en vez de seis: la observación de una fila de la
   * bitácora (spec 029, RF-12), que cuando la hay es una frase.
   */
  compacto?: boolean;
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
  const angosto = useEsAngosto();
  const [enfocado, setEnfocado] = useState(false);
  const anchoDeCampo = useAnchoDeCampo(ancho ?? 0);
  const sinMedida = useAnchoSinMedida();
  const conError = useIrAlPrimerError(error);

  return (
    <View
      ref={conError}
      style={[
        estilos.campo,
        ancho !== undefined
          ? anchoDeCampo
          : multilinea
            ? estilos.campoRenglonEntero
            : sinMedida,
      ]}
    >
      <EtiquetaDeCampo texto={etiqueta} obligatorio={obligatorio} />
      {envolver && soloLectura ? (
        <Text
          style={[estilos.campoEntrada, estilos.campoSoloLectura, estilos.campoEnvuelto, angosto && estilos.controlAngosto]}
          accessibilityLabel={`${etiqueta}: ${valor}`}
        >
          {valor}
        </Text>
      ) : (
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
        numberOfLines={multilinea ? (compacto ? 3 : 6) : undefined}
        onFocus={() => setEnfocado(true)}
        onBlur={() => setEnfocado(false)}
        readOnly={soloLectura}
        style={[
          estilos.campoEntrada,
          angosto && estilos.controlAngosto,
          multilinea && estilos.campoAreaDeTexto,
          multilinea && compacto && estilos.campoAreaCompacta,
          soloLectura && estilos.campoSoloLectura,
          enfocado && !soloLectura && estilos.campoEnfocado,
          error ? estilos.campoEntradaMal : null,
        ]}
        placeholderTextColor={Panel.textoApoyo}
      />
      )}
      {error ? <Text style={estilos.campoError}>{error}</Text> : null}
      {!error && ayuda ? <Text style={[estilos.campoAyuda, angosto && estilos.textoAngosto]}>{ayuda}</Text> : null}
    </View>
  );
}

/**
 * La observación de una fila de la bitácora, detrás de una casilla (spec 029,
 * RF-10 a RF-14, RF-16, RF-18).
 *
 * Casi nunca hay nada que anotar, y un recuadro vacío de seis renglones en cada
 * máquina y cada persona era la mitad de la pantalla. Ahora:
 *
 *  · sin marcar, se lee «Sin observación»: no hay nada, y queda dicho (RF-11);
 *  · marcada, sale el campo de tres renglones, con el ancho de una columna del
 *    formulario y alineado con los demás campos de la fila (RF-12);
 *  · con texto guardado, abre marcada (RF-13);
 *  · desmarcarla borra el texto al guardar (RF-14). El texto se recuerda mientras
 *    tanto: si fue un clic de más, volver a marcarla lo devuelve;
 *  · `obligatoria` la deja marcada y sin poder desmarcarla, para el ensayo sin
 *    resultado ni «cumple», donde la observación sigue haciendo falta (RF-16);
 *  · sin poder editar, el texto en solo lectura o «Sin observación» (RF-18).
 */
export function CampoObservacion({
  valor,
  onChange,
  editable,
  etiqueta = 'Observación',
  obligatoria = false,
  error,
  ayuda,
  accion,
}: {
  valor: string;
  onChange: (v: string) => void;
  editable: boolean;
  etiqueta?: string;
  obligatoria?: boolean;
  error?: string;
  ayuda?: string;
  /**
   * El «Quitar» de la fila (spec 032, RF-3): al lado de «Sin observación», o debajo del
   * campo si está abierto. En el renglón de la casilla y no en uno propio, que es lo
   * que hacía que cada fila ocupara un renglón de más.
   */
  accion?: ReactNode;
}) {
  const [abierta, setAbierta] = useState(() => valor.trim() !== '');
  // Lo escrito antes de desmarcar, para devolverlo si se vuelve a marcar.
  const recordado = useRef('');
  const enColumnaFinal = useContext(EnColumnaFinal);
  const anchoPropio = useAnchoDeCampo(ANCHO_OBSERVACION);
  const anchoDeCampo = enColumnaFinal ? estilos.campoLleno : anchoPropio;
  const hayTexto = valor.trim() !== '';
  const marcada = abierta || obligatoria || (!editable && hayTexto);

  function cambiarCasilla(marcar: boolean) {
    if (marcar) {
      setAbierta(true);
      if (!valor && recordado.current) onChange(recordado.current);
    } else {
      recordado.current = valor;
      setAbierta(false);
      onChange('');
    }
  }

  if (!editable) {
    return (
      <View style={[estilos.campo, anchoDeCampo]}>
        {hayTexto ? (
          <>
            <Campo etiqueta={etiqueta} valor={valor} onChange={() => {}} multilinea compacto soloLectura />
            {accion ? <View style={estilos.observacionAccion}>{accion}</View> : null}
          </>
        ) : (
          <>
            <EtiquetaDeCampo texto={etiqueta} />
            <View style={estilos.observacionVacia}>
              <Text style={estilos.sinObservacion}>Sin observación</Text>
              {accion}
            </View>
          </>
        )}
      </View>
    );
  }

  return (
    <View style={[estilos.campo, anchoDeCampo]}>
      <Casilla
        etiqueta="¿Tienes alguna observación?"
        marcada={marcada}
        onChange={cambiarCasilla}
        deshabilitada={obligatoria}
      />
      {marcada ? (
        <>
          <Campo
            etiqueta={etiqueta}
            valor={valor}
            onChange={onChange}
            multilinea
            compacto
            obligatorio={obligatoria}
            error={error}
            ayuda={ayuda}
          />
          {accion ? <View style={estilos.observacionAccion}>{accion}</View> : null}
        </>
      ) : (
        <View style={estilos.observacionVacia}>
          <Text style={estilos.sinObservacion}>Sin observación</Text>
          {accion}
        </View>
      )}
    </View>
  );
}

/** El ancho de la observación: el de dos campos de lectura juntos. */
const ANCHO_OBSERVACION = 360;

/**
 * Una fecha `AAAA-MM-DD` elegida en el calendario del navegador (spec 026, RF-24,
 * RF-25, RF-28).
 *
 * Es el `<input type="date">` del navegador y no un calendario propio: en el
 * computador abre un almanaque, en el celular el selector del sistema, y no añade
 * ninguna dependencia. Se viste con los mismos tokens que `Campo`. `min` y `max`
 * limitan lo que se puede elegir: «Hasta» no ofrece días anteriores a «Desde».
 * Fuera de la web (no se usa: el panel solo existe ahí) cae en un `Campo` de texto.
 */
export function CampoDeFecha({
  etiqueta,
  valor,
  onChange,
  min,
  max,
  error,
  ayuda,
  ancho = 170,
  obligatorio,
}: {
  etiqueta: string;
  valor: string;
  onChange: (v: string) => void;
  min?: string;
  max?: string;
  error?: string;
  ayuda?: string;
  ancho?: number;
  /**
   * Hay que llenarla para guardar. Se marca en la etiqueta igual que en `Campo` y `Selector`
   * (spec 050, RF-18): hasta entonces cada pantalla escribía «Para cuándo *» en el texto, y el
   * asterisco no salía en rojo como en los demás.
   */
  obligatorio?: boolean;
}) {
  const angosto = useEsAngosto();
  const [enfocado, setEnfocado] = useState(false);
  const anchoDeCampo = useAnchoDeCampo(ancho);
  const conError = useIrAlPrimerError(error);
  if (Platform.OS !== 'web') {
    return <Campo etiqueta={etiqueta} valor={valor} onChange={onChange} error={error} ayuda={ayuda} ancho={ancho} obligatorio={obligatorio} />;
  }
  const borde = error ? Estado.noConforme : enfocado ? Panel.accion : Panel.borde;
  return (
    <View ref={conError} style={[estilos.campo, anchoDeCampo]}>
      <EtiquetaDeCampo texto={etiqueta} obligatorio={obligatorio} />
      {createElement('input', {
        type: 'date',
        value: valor,
        min,
        max,
        'aria-label': etiqueta,
        onChange: (e: { target: { value: string } }) => onChange(e.target.value),
        onFocus: () => setEnfocado(true),
        onBlur: () => setEnfocado(false),
        // El almanaque se abre al tocar cualquier parte del campo, no solo el ícono.
        onClick: (e: { currentTarget: { showPicker?: () => void } }) => {
          try {
            e.currentTarget.showPicker?.();
          } catch {
            // Algunos navegadores solo lo permiten con un gesto directo: queda el ícono.
          }
        },
        style: {
          boxSizing: 'border-box',
          width: '100%',
          minHeight: angosto ? ALTO_DE_CONTROL_ANGOSTO : CampoPanel.alto,
          paddingLeft: Spacing.three,
          paddingRight: Spacing.two,
          border: `${Grosor.linea}px solid ${borde}`,
          borderRadius: Radio.md,
          fontFamily: FuentePanel.texto,
          fontSize: TextoPanel.cuerpo,
          color: Panel.texto,
          backgroundColor: Panel.superficie,
          outline: 'none',
          boxShadow: enfocado ? ANILLO_DE_FOCO : 'none',
          cursor: 'pointer',
        },
      })}
      {error ? <Text style={estilos.campoError}>{error}</Text> : null}
      {!error && ayuda ? <Text style={[estilos.campoAyuda, angosto && estilos.textoAngosto]}>{ayuda}</Text> : null}
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
 * Escoger varias opciones de una lista corta: las obras de un Director de Obra (spec 041,
 * RF-17). Casillas a la vista y no un desplegable, para que se vea de un vistazo cuáles quedan
 * marcadas. Quitarle una obra a alguien le quita el acceso a esa obra, y eso no debe quedar
 * escondido dentro de una lista cerrada.
 */
export function SelectorDeVarios({
  etiqueta,
  valores,
  opciones,
  onChange,
  error,
  ancho = 260,
  obligatorio,
}: {
  etiqueta: string;
  valores: readonly string[];
  opciones: Opcion[];
  onChange: (valores: string[]) => void;
  error?: string;
  ancho?: number;
  obligatorio?: boolean;
}) {
  const anchoDeCampo = useAnchoDeCampo(ancho);
  const conError = useIrAlPrimerError(error);
  return (
    <View ref={conError} style={[estilos.campo, anchoDeCampo]}>
      <EtiquetaDeCampo texto={etiqueta} obligatorio={obligatorio} />
      {opciones.map((o) => (
        <Casilla
          key={o.valor}
          etiqueta={o.etiqueta}
          marcada={valores.includes(o.valor)}
          onChange={(marcada) =>
            onChange(marcada ? [...valores, o.valor] : valores.filter((v) => v !== o.valor))
          }
        />
      ))}
      {error ? <Text style={estilos.campoError}>{error}</Text> : null}
    </View>
  );
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
  const angosto = useEsAngosto();
  const conError = useIrAlPrimerError(error);
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
  const anchoDeCampo = useAnchoDeCampo(ancho ?? 0);
  const sinMedida = useAnchoSinMedida();
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
    <View ref={conError} style={[estilos.campo, ancho === undefined ? sinMedida : anchoDeCampo]}>
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
          angosto && estilos.controlAngosto,
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
                  placeholderTextColor={Panel.textoApoyo}
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
/* Hora                                                                      */
/* ------------------------------------------------------------------------ */

const OPCIONES_DE_HORA: Opcion[] = HORAS_DEL_DIA.map((h) => ({ valor: h, etiqueta: h }));

/** Lo justo para «hh ▼» y «mm ▼»: dos cifras no piden más. */
const ANCHO_HORA = 96;
const ANCHO_MINUTO = 88;
const ANCHO_HORA_COMPACTA = 66;
const ANCHO_MINUTO_COMPACTO = 70;

/**
 * Una hora del día en dos desplegables: la hora y los minutos (spec 016, RF-30).
 *
 * Reemplaza al campo de texto «HH:MM», donde se escribía «7.30», «730» o «7:3» y
 * el error solo aparecía al guardar. Los minutos van de cuarto en cuarto; si la
 * hora guardada no cae en la rejilla —un «07:10» de antes—, ese minuto se sigue
 * ofreciendo y se ve tal cual (RF-33).
 *
 * Mientras falte una de las dos partes, hacia fuera la hora es `''`: completar el
 * minuto con «00» sería un valor puesto de antemano (004/RF-44). Lo elegido a
 * medias vive aquí dentro para que no se pierda al volver a pintar.
 *
 * Hecho con dos `Selector` y no con `<input type="time">`: ese acepta cualquier
 * minuto, se ve distinto en cada navegador y no sigue los tokens del panel.
 */
export function SelectorDeHora({
  etiqueta,
  valor,
  onChange,
  error,
  obligatorio,
  compacta = false,
}: {
  etiqueta: string;
  /** «HH:MM», o `''` sin elegir. */
  valor: string;
  onChange: (hora: string) => void;
  error?: string;
  obligatorio?: boolean;
  /**
   * Los dos desplegables a lo justo para «hh ▼» y «mm ▼» sin holgura: la hora de un
   * ensayo de la bitácora, que comparte renglón con otros campos (spec 032, RF-6).
   */
  compacta?: boolean;
}) {
  const [partes, setPartes] = useState(() => partirHora(valor));
  const [valorVisto, setValorVisto] = useState(valor);

  // Si la hora cambia desde fuera (se recargó el parte, se quitó una fila), se
  // vuelve a partir. Se hace al pintar y no con un efecto, para no pintar una vez
  // la hora vieja. Lo elegido a medias no se pisa: hacia fuera sigue siendo `''`.
  if (valor !== valorVisto) {
    setValorVisto(valor);
    if (valor !== unirHora(partes.hora, partes.minuto)) setPartes(partirHora(valor));
  }

  function elegir(nuevas: { hora: string | null; minuto: string | null }) {
    setPartes(nuevas);
    onChange(unirHora(nuevas.hora, nuevas.minuto));
  }

  return (
    <View style={estilos.hora}>
      <Selector
        etiqueta={etiqueta}
        obligatorio={obligatorio}
        valor={partes.hora}
        opciones={OPCIONES_DE_HORA}
        onChange={(hora) => elegir({ ...partes, hora })}
        vacio="hh"
        error={error}
        ancho={compacta ? ANCHO_HORA_COMPACTA : ANCHO_HORA}
      />
      <Text style={estilos.horaSeparador}>:</Text>
      <Selector
        etiqueta="min"
        valor={partes.minuto}
        opciones={minutosOfrecidos(valor).map((m) => ({ valor: m, etiqueta: m }))}
        onChange={(minuto) => elegir({ ...partes, minuto })}
        vacio="mm"
        ancho={compacta ? ANCHO_MINUTO_COMPACTO : ANCHO_MINUTO}
      />
    </View>
  );
}

/* ------------------------------------------------------------------------ */
/* Tabla                                                                     */
/* ------------------------------------------------------------------------ */

export interface Columna<T> {
  clave: string;
  titulo: string;
  /** El ancho preferido. Con sitio de sobra la columna mide esto, ni más ni menos. */
  ancho: number;
  /**
   * Hasta dónde puede encogerse cuando falta sitio (spec 022, RF-27). Sin él, el
   * `EncogimientoColumna` de su ancho. Una columna que no debe partirse —la de los
   * botones— lo declara igual a su `ancho`.
   */
  anchoMinimo?: number;
  pintar: (fila: T) => ReactNode;
  /**
   * El texto por el que se ordena esta columna (spec 015). Sin él, la columna no
   * se ordena. Es lo que se **ve** en la celda —el cargo por su nombre, no por su
   * identificador—: ordenar por algo que la pantalla no enseña deja un orden que
   * nadie entiende.
   */
  ordenar?: (fila: T) => string | null | undefined;
  /**
   * El dato principal de la fila, el que encabeza su tarjeta en el celular (spec 050, RF-34). Sin
   * marca, la primera columna; se marca cuando la primera no lo es, como una fecha.
   */
  principal?: boolean;
  /**
   * Los botones de la fila, que van al pie de su tarjeta (RF-36). Sin marca, la columna de clave
   * `acciones`; se marca cuando los botones tienen otra clave.
   */
  acciones?: boolean;
}

/**
 * Dentro del dato principal de una tarjeta, la `Celda` sale en letra más grande (spec 050, RF-34). Por
 * contexto, porque lo que pinta cada columna lo escribe cada pantalla y casi siempre es una `Celda`.
 */
const EnPrincipalDeTarjeta = createContext(false);

/**
 * Lo que dice una lista sin ningún registro (spec 050, RF-53): un ícono, una frase que dice qué va ahí y,
 * si el cargo puede crearlo, el botón para crear el primero. Un texto solo sigue valiendo: es la frase.
 */
export interface VacioDeLista {
  texto: string;
  icono?: string;
  /** El botón para crear el primero, con la misma condición de permiso que el del encabezado. */
  accion?: ReactNode;
}

export function Tabla<T extends { id: string }>({
  columnas,
  filas,
  vacio,
  sinResultados,
  variante = 'tarjeta',
  orden,
  alOrdenar,
  tipo = 'lista',
}: {
  columnas: Columna<T>[];
  filas: T[];
  vacio: string | VacioDeLista;
  /**
   * Hay registros, pero la búsqueda o los filtros no dejan ver ninguno (spec 050, RF-54, RF-78). Se dice
   * así, y no con la frase de la lista vacía, que haría creer que no hay nada; y se ofrece quitarlos.
   */
  sinResultados?: { alQuitar: () => void };
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
  /**
   * Por qué columna está ordenada la tabla, y qué hacer al pulsar un título
   * (spec 015). Sin `alOrdenar` los títulos son texto y la tabla se pinta como
   * siempre: solo ordenan las pantallas que lo piden.
   */
  orden?: Orden;
  alOrdenar?: (clave: string) => void;
  /**
   * Una `lista` pasa a tarjetas en el celular (spec 050, RF-33). Una `cuadricula` —lo que se llena celda
   * por celda o es una matriz: la granulometría, los renglones del almacén, el presupuesto— sigue
   * siendo tabla en cualquier ancho y se desplaza dentro de su marco (RF-71, RF-72, D5).
   */
  tipo?: 'lista' | 'cuadricula';
}) {
  // Lo mínimo que mide la tabla con todas las columnas encogidas: por debajo de
  // esto, y solo por debajo, se desplaza dentro de su marco.
  const minimo =
    columnas.reduce((suma, c) => suma + anchoMinimoDeColumna(c.ancho, c.anchoMinimo), 0) +
    Spacing.three * (columnas.length - 1) +
    Spacing.three * 2;

  const angosto = useEsAngosto();
  // Spec 050, RF-40, RF-70: el ancho que de verdad tiene la tabla, no el de la ventana: con el menú
  // abierto o en una columna de dos, una lista de nueve columnas no cabe aunque la ventana mida 1366.
  // Se vuelve a medir al girar o cambiar el tamaño; la búsqueda, los filtros y el orden viven en la
  // pantalla, así que pasar a tarjetas y volver no los toca (RF-73).
  const [marco, setMarco] = useState(0);
  const tarjetas = seMuestraEnTarjetas({ tipo, angosto, marco, minimo });

  if (filas.length === 0) {
    if (sinResultados) {
      return (
        <View style={estilos.tablaVacia}>
          <Text style={estilos.vacioSimbolo}>⌕</Text>
          <Text style={estilos.vacioTexto}>No hay resultados con estos filtros.</Text>
          <Boton titulo="Quitar los filtros" tono="secundario" onPress={sinResultados.alQuitar} />
        </View>
      );
    }
    const { texto, icono = '—', accion } = typeof vacio === 'string' ? { texto: vacio } : vacio;
    return (
      <View style={estilos.tablaVacia}>
        <Text style={estilos.vacioSimbolo}>{icono}</Text>
        <Text style={estilos.vacioTexto}>{texto}</Text>
        {accion ?? null}
      </View>
    );
  }

  return (
    <View onLayout={(e) => setMarco(e.nativeEvent.layout.width)}>
      {tarjetas ? (
        <Tarjetas columnas={columnas} filas={filas} orden={orden} alOrdenar={alOrdenar} />
      ) : (
        <TablaConColumnas
          columnas={columnas}
          filas={filas}
          variante={variante}
          orden={orden}
          alOrdenar={alOrdenar}
          minimo={minimo}
          angosto={angosto}
        />
      )}
    </View>
  );
}

/** La tabla de siempre, con sus columnas, su cabecera y su desplazamiento dentro del marco. */
function TablaConColumnas<T extends { id: string }>({
  columnas,
  filas,
  variante,
  orden,
  alOrdenar,
  minimo,
  angosto,
}: {
  columnas: Columna<T>[];
  filas: T[];
  variante: 'tarjeta' | 'desnuda';
  orden?: Orden;
  alOrdenar?: (clave: string) => void;
  minimo: number;
  angosto: boolean;
}) {
  const { width: ventana } = useWindowDimensions();
  return (
    // Horizontal propio: una tabla ancha se desplaza dentro de su marco, nunca
    // empujando la página entera de lado. Sin barra visible: se dibujaba siempre,
    // incluso cuando la tabla cabía entera, y una barra permanente bajo cada
    // tabla es ruido que sugiere que hay algo más que ver cuando no lo hay.
    <ScrollView
      horizontal
      // En el celular sí se ve la barra: es la única pista de que hay más columnas (026/RF-36).
      showsHorizontalScrollIndicator={angosto}
      style={[estilos.tablaMarco, variante === 'desnuda' && estilos.tablaDesnuda]}
      // El contenido mide lo que su marco (para que las columnas se encojan en vez
      // de empujar) pero nunca menos que la tabla encogida del todo. Además, así la
      // cabecera y las bandas llegan al borde de la tarjeta cuando sobra sitio: sin
      // eso quedaban cortadas a media tarjeta, con un vacío que parecía un error.
      contentContainerStyle={[estilos.tablaContenido, { minWidth: minimo }]}
    >
      <View style={estilos.tablaCuerpo}>
        <View style={estilos.tablaCabecera}>
          {columnas.map((columna) =>
            alOrdenar && columna.ordenar ? (
              <TituloOrdenable
                key={columna.clave}
                titulo={columna.titulo}
                estiloColumna={estiloDeColumna(columna, ventana)}
                sentido={orden?.clave === columna.clave ? orden.sentido : null}
                onPress={() => alOrdenar(columna.clave)}
              />
            ) : (
              <Text key={columna.clave} style={[estilos.tablaTitulo, angosto && estilos.rotuloAngosto, estiloDeColumna(columna, ventana)]}>
                {columna.titulo}
              </Text>
            ),
          )}
        </View>
        {filas.map((fila, indice) => (
          <Fila key={fila.id} alterna={indice % 2 === 1}>
            {columnas.map((columna) => (
              <View key={columna.clave} style={estiloDeColumna(columna, ventana)}>
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
 * Las filas de una lista como tarjetas (spec 050, RF-33 a RF-37): arriba el dato principal en letra
 * más grande; en medio cada dato con el nombre de su columna, «Cargo: Residente»; al pie los botones,
 * o nada si la fila no tiene. Se arma con las mismas `Columna` de la tabla, así que una tarjeta enseña
 * todo lo que enseña su fila (RF-35) sin que ninguna pantalla escriba otra vista.
 */
/** Los dos sentidos de «Ordenar por», con las mismas palabras que la flecha de los títulos (spec 015). */
const SENTIDOS: { sentido: Sentido; texto: string }[] = [
  { sentido: 'asc', texto: 'de la A a la Z' },
  { sentido: 'desc', texto: 'de la Z a la A' },
];

function Tarjetas<T extends { id: string }>({
  columnas,
  filas,
  orden,
  alOrdenar,
}: {
  columnas: Columna<T>[];
  filas: T[];
  orden?: Orden;
  alOrdenar?: (clave: string) => void;
}) {
  const partes = partesDeLaTarjeta(columnas);
  const deClave = (clave: string) => columnas.find((c) => c.clave === clave)!;
  const principal = partes.principal ? deClave(partes.principal) : null;
  // RF-38, RF-39: sin títulos que pulsar, el orden se escoge aquí. Es el mismo orden de la tabla —lo
  // lleva la pantalla—, así que al volver a la tabla sigue igual.
  const ordenables = alOrdenar && orden ? columnas.filter((c) => c.ordenar) : [];
  return (
    <View style={estilos.tarjetas}>
      {ordenables.length > 0 && alOrdenar && orden ? (
        <Formulario desnudo>
          <Selector
            etiqueta="Ordenar por"
            valor={`${orden.clave}:${orden.sentido}`}
            opciones={ordenables.flatMap((c) =>
              SENTIDOS.map(({ sentido, texto }) => ({ valor: `${c.clave}:${sentido}`, etiqueta: `${c.titulo}, ${texto}` })),
            )}
            onChange={(valor) => {
              if (!valor) return;
              const [clave, sentido] = valor.split(':') as [string, Sentido];
              for (let i = 0; i < pulsacionesPara(orden, { clave, sentido }); i++) alOrdenar(clave);
            }}
            ancho={ANCHOS_DE_CAMPO.medio}
          />
        </Formulario>
      ) : null}
      {filas.map((fila) => {
        const pie = partes.acciones.map((clave) => ({ clave, contenido: deClave(clave).pintar(fila) }));
        const conPie = pie.some((p) => p.contenido !== null && p.contenido !== undefined && p.contenido !== false);
        return (
          <View key={fila.id} style={estilos.tarjetaDeFila}>
            {principal ? (
              <EnPrincipalDeTarjeta.Provider value>
                <View>{principal.pintar(fila)}</View>
              </EnPrincipalDeTarjeta.Provider>
            ) : null}
            {partes.datos.map((clave) => {
              const columna = deClave(clave);
              return (
                <View key={clave} style={estilos.datoDeTarjeta}>
                  {columna.titulo ? <Text style={estilos.datoDeTarjetaTitulo}>{`${columna.titulo}:`}</Text> : null}
                  <View style={estilos.datoDeTarjetaValor}>{columna.pintar(fila)}</View>
                </View>
              );
            })}
            {conPie ? (
              <View style={estilos.pieDeTarjeta}>
                {pie.map((p) => (
                  <View key={p.clave}>{p.contenido}</View>
                ))}
              </View>
            ) : null}
          </View>
        );
      })}
    </View>
  );
}

/**
 * El ancho de una columna: parte de su `ancho` y se encoge hasta su mínimo (spec 022, RF-27). Hasta una
 * ventana de 1366 no crece: la tabla se ve como se midió, con el aire a la derecha de la última columna.
 * Por encima sí, en proporción a su ancho (spec 050, RF-74): en un monitor de 1920 ese aire era un hueco
 * de un tercio del listado. Cabecera y celdas usan el mismo estilo, así que siguen alineadas al encogerse
 * y al crecer.
 */
function estiloDeColumna(columna: { ancho: number; anchoMinimo?: number }, ventana: number): FlexStyle {
  return {
    // Spec 050, RF-74: por encima de 1366 sí crece, en proporción a su ancho.
    flexGrow: crecimientoDeColumna(columna.ancho, ventana),
    flexShrink: 1,
    flexBasis: columna.ancho,
    minWidth: anchoMinimoDeColumna(columna.ancho, columna.anchoMinimo),
  };
}

/**
 * El título de una columna que se puede ordenar (spec 015, RF-9 a RF-11).
 *
 * La flecha va en el texto y no solo en un cambio de color: el color nunca es la
 * única señal. ▲ es de la A a la Z y ▼ de la Z a la A; la columna por la que no se
 * está ordenando no lleva flecha, y se reconoce como pulsable por el cursor y el
 * realce al pasar por encima.
 */
function TituloOrdenable({
  titulo,
  estiloColumna,
  sentido,
  onPress,
}: {
  titulo: string;
  estiloColumna: FlexStyle;
  sentido: 'asc' | 'desc' | null;
  onPress: () => void;
}) {
  const flecha = sentido === 'asc' ? ' ▲' : sentido === 'desc' ? ' ▼' : '';
  const explicacion =
    sentido === 'asc'
      ? 'ordenada de la A a la Z; pulse para invertir'
      : sentido === 'desc'
        ? 'ordenada de la Z a la A; pulse para invertir'
        : 'pulse para ordenar';
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${titulo}, ${explicacion}`}
      style={estiloColumna}
    >
      {({ hovered }) => (
        <Text
          style={[
            estilos.tablaTitulo,
            (sentido !== null || hovered) && estilos.tablaTituloActivo,
          ]}
        >
          {titulo}
          {flecha}
        </Text>
      )}
    </Pressable>
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
  lineas = 2,
}: {
  children: ReactNode;
  /**
   * Cuántos renglones puede ocupar antes de cortarse con «…». Dos por defecto desde
   * la spec 022: cuando la columna se encoge, el texto se parte en vez de
   * esconderse tras los puntos. Con sitio de sobra cabe en uno, como siempre, y
   * las filas siguen parejas. Más solo para texto que hay que leer entero —el
   * motivo de una anulación—: cortado ahí, no dice nada.
   */
  lineas?: number;
}) {
  const principal = useContext(EnPrincipalDeTarjeta);
  return (
    <Text style={[estilos.celda, principal && estilos.celdaPrincipal]} numberOfLines={lineas}>
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
export function Formulario({
  children,
  desnudo = false,
}: {
  children: ReactNode;
  /**
   * Los mismos anchos uniformes, sin la caja blanca ni su relleno: para una fila de campos
   * **dentro** de otra superficie, como cada renglón de la requisición (spec 050, RF-23). Una caja
   * blanca dentro de una caja blanca se lee como un error de dibujo (igual que la tabla `desnuda`).
   */
  desnudo?: boolean;
}) {
  return (
    <EnFormulario.Provider value>
      <View style={desnudo ? estilos.formularioDesnudo : estilos.formulario}>{children}</View>
    </EnFormulario.Provider>
  );
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
  const angosto = useEsAngosto();
  return <View style={[estilos.grupoAcciones, angosto && estilos.grupoAccionesAngosto]}>{children}</View>;
}

/**
 * La fila de botones de un formulario.
 *
 * Ocupa el ancho completo y va debajo de los campos, separada por una línea. Sin
 * esto, el botón era un campo más de la fila: al acomodarse el formulario se
 * descolgaba a un renglón propio con un hueco raro encima, y no se leía como el
 * cierre de nada.
 */
/**
 * Los botones de un formulario en su orden (spec 039, RF-25): lo que no es un botón —un
 * texto, un aviso— primero, luego los secundarios, el de peligro y el principal al final.
 * Entre iguales se respeta el orden escrito. Entra también en un `Acciones` anidado, que
 * es como lo escriben diecinueve formularios.
 */
function enOrdenDeFormulario(children: ReactNode): ReactNode[] {
  const lugar = (hijo: ReactNode) => {
    if (!isValidElement(hijo) || hijo.type !== Boton) return 0;
    const tono = (hijo.props as { tono?: string }).tono;
    // El de peligro («Descartar», «Anular») antes del principal: si los dos están, el
    // principal es el que queda en el sitio de siempre.
    return tono === 'secundario' ? 1 : tono === 'peligro' ? 2 : 3;
  };
  return Children.toArray(children)
    .map((hijo) =>
      isValidElement<{ children?: ReactNode }>(hijo) && hijo.type === Acciones
        ? cloneElement(hijo, undefined, ...enOrdenDeFormulario(hijo.props.children))
        : hijo,
    )
    .map((hijo, i) => ({ hijo, i }))
    .sort((a, b) => lugar(a.hijo) - lugar(b.hijo) || a.i - b.i)
    .map((h) => h.hijo);
}

export function AccionesFormulario({ children }: { children: ReactNode }) {
  // El principal a la derecha y los secundarios a su izquierda, en todos los formularios,
  // los haya escrito cada pantalla en el orden que fuera.
  const ordenados = enOrdenDeFormulario(children);
  const enVentana = useContext(EnVentana);
  // Sin botones (todos condicionales y ninguno aplica), ni la línea: sola parece un error.
  if (ordenados.length === 0) return null;
  return <View style={[estilos.acciones, enVentana && estilos.accionesFijas]}>{ordenados}</View>;
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

/** El ancho de la columna del nombre de una fila de la bitácora (spec 032, RF-2). */
export const ANCHO_NOMBRE_DE_FILA = 200;
/** El de la columna final: la casilla de observación y el «Quitar» (spec 032, RF-3). */
export const ANCHO_FINAL_DE_FILA = 240;
/**
 * Lo que piden los campos de una fila en un renglón: el operador y las dos lecturas de
 * Maquinaria, las tres horas y la novedad de Personal (spec 032, RF-4, RF-5).
 */
export const ANCHO_CAMPOS_DE_FILA = 441;

/**
 * Una fila de Maquinaria, Personal, Actividades o Control de calidad (spec 032, RF-1 a
 * RF-7), en tres columnas que caen en el mismo sitio en las cuatro secciones:
 *
 *  · el nombre (máquina, persona, actividad o ensayo), de ancho fijo, con lo que va
 *    debajo de él —el responsable del ensayo, la foto de la actividad—;
 *  · los campos propios de la sección, en uno o dos `RenglonDeCampos`;
 *  · la observación con el «Quitar», de ancho fijo.
 *
 * Antes cada sección echaba sus campos en una fila que envolvía donde le tocaba: la
 * casilla caía a un segundo renglón y el «Quitar» a un tercero, y nada quedaba debajo
 * de nada. En el celular las columnas se apilan (RF-7).
 *
 * `debajo` es lo que no es un campo y necesita el ancho entero: avisos, el desglose de
 * las horas. Solo se pinta si hay algo.
 */
export function FilaDeSeccion({
  nombre,
  children,
  final,
  debajo,
  ultima = false,
}: {
  nombre: ReactNode;
  children?: ReactNode;
  final?: ReactNode;
  debajo?: ReactNode;
  ultima?: boolean;
}) {
  const angosto = useEsAngosto();
  // A 1366 px con el menú abierto no caben las tres columnas: los campos se partían en
  // dos renglones. Entonces la columna final —la observación y el «Quitar»— baja debajo
  // de los campos y estos quedan en uno (spec 039, RF-26).
  const [ancho, setAncho] = useState(0);
  const finalAbajo =
    !angosto && ancho > 0 && ancho < ANCHO_NOMBRE_DE_FILA + ANCHO_FINAL_DE_FILA + ANCHO_CAMPOS_DE_FILA + 2 * Spacing.three;
  const columnaFinal = (
    <EnColumnaFinal.Provider value={true}>
      <View style={[estilos.filaSeccionFinal, (angosto || finalAbajo) && estilos.filaSeccionColumnaAngosta]}>
        {final}
      </View>
    </EnColumnaFinal.Provider>
  );
  return (
    <View
      style={[estilos.filaSeccion, !ultima && estilos.filaConLinea]}
      onLayout={(e) => setAncho(Math.round(e.nativeEvent.layout.width))}
    >
      <View style={[estilos.filaSeccionColumnas, angosto && estilos.filaSeccionApilada]}>
        <View style={[estilos.filaSeccionNombre, angosto && estilos.filaSeccionColumnaAngosta]}>
          {nombre}
        </View>
        <View style={[estilos.filaSeccionCampos, angosto && estilos.filaSeccionColumnaAngosta]}>
          {children}
          {finalAbajo ? columnaFinal : null}
        </View>
        {finalAbajo ? null : columnaFinal}
      </View>
      {debajo}
    </View>
  );
}

/** Un renglón de campos dentro de una `FilaDeSeccion`. */
export function RenglonDeCampos({ children }: { children: ReactNode }) {
  return <View style={estilos.renglonDeCampos}>{children}</View>;
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
    neutro: Panel.texto,
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
  soloBotonCierra = false,
  amplia = false,
  angosta = false,
}: {
  titulo: string;
  children: ReactNode;
  onCerrar: () => void;
  /** Más ancha (960 en vez de 720), para revisar algo con columnas, como la vista previa del presupuesto. */
  amplia?: boolean;
  /**
   * Más angosta (520), para una confirmación o un formulario de dos o tres campos
   * (spec 039, RF-24): a 720 quedaban con media ventana vacía.
   */
  angosta?: boolean;
  /**
   * Quita Esc y el clic en el telón, y deja «Cerrar» como única salida
   * (spec 015, RF-31).
   *
   * **Solo para lo que no se puede volver a ver**: hoy, la ventana que muestra
   * una contraseña temporal o unos códigos de activación. El servidor no los
   * guarda en claro, así que un clic distraído fuera de la ventana obliga a
   * generar otros — y los anteriores ya dejaron de servir. En las otras once
   * ventanas cerrar sin querer no cuesta nada, y ahí Esc y el telón son lo
   * cómodo: por eso es una excepción y no el comportamiento de todas.
   */
  soloBotonCierra?: boolean;
}) {
  const angosto = useEsAngosto();
  return (
    <CapaFlotante visible alCerrar={soloBotonCierra ? () => {} : onCerrar} telon="oscuro">
      {/* Centra la ventana y deja pasar los clics de fuera hasta el telón, que cierra. */}
      <View style={[estilos.centroModal, angosto && estilos.centroModalAngosto]}>
        <View style={[estilos.ventana, amplia && estilos.ventanaAmplia, angosta && estilos.ventanaCompacta, angosto && estilos.ventanaAngosta]}>
          <View style={estilos.ventanaCabecera}>
            <Text style={estilos.ventanaTitulo}>{titulo}</Text>
            <Boton titulo="Cerrar" tono="secundario" onPress={onCerrar} />
          </View>
          <ScrollView
            style={estilos.ventanaDesplazable}
            contentContainerStyle={estilos.ventanaCuerpo}
          >
            <EnVentana.Provider value>{children}</EnVentana.Provider>
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
  onLimpiar,
  children,
}: {
  busqueda: string;
  onBuscar: (texto: string) => void;
  total: number;
  mostradas: number;
  /**
   * Quita la búsqueda **y** los filtros (spec 050, RF-78). Sin él, solo la búsqueda, como antes: un
   * «Limpiar» que dejaba puestos los filtros dejaba la lista igual de vacía.
   */
  onLimpiar?: () => void;
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
          <Boton titulo="Limpiar" tono="secundario" onPress={onLimpiar ?? (() => onBuscar(''))} />
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

/** El anillo de foco del panel: franja clara y aro grafito (spec 022). */
/** En el celular, lo que se toca mide al menos esto (spec 026, RF-40): el token de `medidas.ts`. */
const ALTO_DE_CONTROL_ANGOSTO = AltoDeControlAngosto;

const ANILLO_DE_FOCO = `0 0 0 2px ${Panel.superficie}, 0 0 0 ${2 + Grosor.marca}px ${Panel.foco}`;

/**
 * La superficie de todo lo que se apoya en el crema: tarjetas, formularios,
 * tablas, cifras (spec 022, RF-25).
 *
 * Plana, como en egg.live: blanca, con un borde fino tenue y esquinas de 16. La
 * sombra se queda para lo que **flota** —ventanas, listas abiertas—, que es donde
 * dice algo; en cada tarjeta era ruido sobre el crema.
 */
/**
 * La superficie de las tarjetas y las tablas. Desde la spec 050 (RF-46) se separa del lienzo crema con una
 * sombra suave y no con un borde: el borde fino de antes, repetido en cada tarjeta, tablas y secciones,
 * dibujaba una rejilla de líneas que se leía como un formulario de papel.
 */
const SUPERFICIE = {
  borderRadius: Radio.lg,
  borderCurve: 'continuous',
  backgroundColor: Panel.superficie,
  boxShadow: Sombra.tarjeta,
} as const;

const estilos = StyleSheet.create({
  titulo: {
    fontFamily: FuentePanel.texto,
    fontSize: TextoPanel.titulo,
    fontWeight: '800',
    letterSpacing: EspaciadoLetra.titulo,
    color: Panel.texto,
  },

  filaFormulario: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    // Por arriba y no por abajo (spec 007, RF-23). Alineadas por abajo, la ayuda
    // que cuelga bajo un campo —«Largo × ancho»— lo empujaba hacia arriba, y en
    // una misma fila las etiquetas quedaban a tres alturas distintas: visto en la
    // segunda línea de una actividad el 2026-09-15.
    alignItems: 'flex-start',
    // 12 y no 16 entre campos (spec 039, RF-24).
    gap: Spacing.two + Spacing.one,
    padding: Spacing.three,
  },
  filaConLinea: { borderBottomWidth: 1, borderBottomColor: Panel.bordeSuave },

  // Sin relleno a los lados: el marco de la sección ya lo pone, y esos 32 px son los
  // que dejan Maquinaria y Personal en un renglón a 1280 px (spec 032, RF-4, RF-5).
  filaSeccion: { gap: Spacing.two, paddingVertical: Spacing.three },
  filaSeccionColumnas: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.three },
  filaSeccionApilada: { flexDirection: 'column', gap: Spacing.two },
  filaSeccionNombre: { width: ANCHO_NOMBRE_DE_FILA, gap: Spacing.two },
  filaSeccionCampos: { flex: 1, minWidth: 0, gap: Spacing.two },
  filaSeccionFinal: { width: ANCHO_FINAL_DE_FILA, gap: Spacing.two },
  filaSeccionColumnaAngosta: { width: '100%', flex: undefined },
  renglonDeCampos: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'flex-start',
    gap: Spacing.two,
  },
  observacionVacia: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.two,
  },
  observacionAccion: { flexDirection: 'row', justifyContent: 'flex-end' },

  cifras: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.three },
  cifra: {
    flexGrow: 1,
    flexBasis: 190,
    minWidth: 190,
    gap: Spacing.one,
    padding: Spacing.three,
    ...SUPERFICIE,
  },
  /** Rótulo en mayúsculas, como las cabeceras de tabla (RF-23). */
  cifraTitulo: {
    fontFamily: FuentePanel.rotulo,
    fontSize: TextoPanel.micro,
    fontWeight: '500',
    letterSpacing: EspaciadoLetra.rotulo,
    color: Panel.textoApoyo,
    // Deja los números alineados aunque un rótulo ocupe dos renglones.
    minHeight: 30,
  },
  cifraValor: {
    fontFamily: FuentePanel.texto,
    fontSize: TextoPanel.cifra,
    fontWeight: '800',
    letterSpacing: EspaciadoLetra.titulo,
  },
  cifraPie: { fontFamily: FuentePanel.texto, fontSize: TextoPanel.apoyo, color: Panel.textoApoyo },

  medidor: {
    flexGrow: 1,
    flexBasis: 280,
    minWidth: 280,
    gap: Spacing.two,
    padding: Spacing.three,
    ...SUPERFICIE,
  },
  medidorCabecera: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', gap: Spacing.two },
  medidorValor: {
    fontFamily: FuentePanel.texto,
    fontSize: TextoPanel.titulo,
    fontWeight: '800',
    color: Panel.texto,
  },
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
    backgroundColor: Panel.superficie,
    boxShadow: Sombra.flotante,
    // Sin esto el cuerpo no se encoge y la ventana crece más que la pantalla.
    overflow: 'hidden',
  },
  ventanaDesplazable: { flexShrink: 1 },
  /** En el celular: controles de 44 px y texto de 14 como mínimo (spec 026, RF-40, RNF). */
  controlAngosto: { minHeight: ALTO_DE_CONTROL_ANGOSTO },
  textoAngosto: { fontFamily: FuentePanel.texto, fontSize: TextoPanel.cuerpo },
  /** Lo mismo para lo que va en la letra de los rótulos: botones y títulos de tabla. */
  rotuloAngosto: { fontFamily: FuentePanel.rotulo, fontSize: TextoPanel.apoyo + 1 },
  /** En el celular la ventana ocupa la pantalla entera (spec 026, RF-37). */
  centroModalAngosto: { padding: 0 },
  ventanaAmplia: { maxWidth: 960 },
  ventanaCompacta: { maxWidth: 520 },
  ventanaAngosta: { maxWidth: '100%', height: '100%', maxHeight: '100%', borderRadius: 0 },
  ventanaCabecera: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.three,
    paddingVertical: Spacing.three,
    paddingHorizontal: Spacing.four,
    borderBottomWidth: 1,
    borderBottomColor: Panel.bordeSuave,
  },
  ventanaTitulo: {
    fontFamily: FuentePanel.texto,
    fontSize: TextoPanel.seccion,
    fontWeight: '800',
    color: Panel.texto,
  },
  ventanaCuerpo: { paddingVertical: Spacing.three, paddingHorizontal: Spacing.four, gap: Spacing.two + Spacing.one },

  barra: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: Spacing.three,
    flexWrap: 'wrap',
  },
  cuenta: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two, paddingBottom: Spacing.one },
  cuentaTexto: {
    fontFamily: FuentePanel.texto,
    fontSize: TextoPanel.apoyo,
    color: Panel.textoApoyo,
    fontWeight: '600',
  },

  paginacion: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.three,
    paddingTop: Spacing.two,
  },
  ayuda: {
    fontFamily: FuentePanel.texto,
    fontSize: TextoPanel.apoyo,
    lineHeight: 20,
    color: Panel.textoApoyo,
  },

  aviso: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.two,
    padding: Spacing.three,
    borderRadius: Radio.lg,
    // Una franja de color a la izquierda: identifica el tono de un vistazo, sin
    // teñir el bloque entero.
    borderLeftWidth: Grosor.marca,
  },
  avisoSimbolo: {
    fontFamily: FuentePanel.texto,
    fontSize: TextoPanel.cuerpo,
    fontWeight: '800',
    lineHeight: 21,
  },
  avisoTexto: {
    flex: 1,
    fontFamily: FuentePanel.texto,
    fontSize: TextoPanel.cuerpo,
    lineHeight: 21,
    fontWeight: '600',
  },

  confirmacion: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.two,
    padding: Spacing.three,
    borderRadius: Radio.lg,
    borderLeftWidth: Grosor.marca,
    backgroundColor: Estado.atencionFondo,
    borderLeftColor: Estado.atencion,
  },
  confirmacionSimbolo: {
    fontFamily: FuentePanel.texto,
    fontSize: TextoPanel.cuerpo,
    fontWeight: '800',
    lineHeight: 21,
    color: Estado.atencion,
  },
  confirmacionCuerpo: { flex: 1, gap: Spacing.three },
  confirmacionTexto: {
    fontFamily: FuentePanel.texto,
    fontSize: TextoPanel.cuerpo,
    lineHeight: 21,
    fontWeight: '600',
    color: Estado.atencion,
  },

  etiqueta: {
    alignSelf: 'flex-start',
    // Spec 050, RF-64: en una tarjeta de 360 px, «En aprobación: Administradora de Elemental» no cabía en
    // un renglón y se salía por el borde. Con el tope, el texto se parte.
    maxWidth: '100%',
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.half,
    borderRadius: Radio.pastilla,
  },
  etiquetaTexto: {
    fontFamily: FuentePanel.texto,
    fontSize: TextoPanel.micro,
    fontWeight: '700',
    letterSpacing: 0.3,
  },

  /** La píldora (RF-24). Con el alto de un campo, para que alineen en una fila. */
  boton: {
    minHeight: CampoPanel.alto,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderRadius: Radio.pastilla,
    borderWidth: Grosor.linea,
    alignItems: 'center',
    justifyContent: 'center',
  },
  botonInactivo: { opacity: 0.45 },
  /**
   * Space Grotesk en mayúsculas y espaciada, como los botones de egg.live (RF-23), y
   * a su tamaño: 12. A 13 y con más relleno los botones crecían un 20 % y volvían a
   * sacar las columnas de acciones de las tablas angostas.
   */
  botonTexto: {
    fontFamily: FuentePanel.rotulo,
    fontSize: TextoPanel.micro,
    fontWeight: '500',
    letterSpacing: EspaciadoLetra.rotulo,
    textTransform: 'uppercase',
  },

  campo: { gap: Spacing.one },
  campoLleno: { alignSelf: 'stretch' },
  campoRenglonEntero: { width: '100%' },
  campoSoloLectura: { backgroundColor: Panel.fondoCabecera, color: Panel.textoApoyo },
  // Alto mínimo de un campo, y lo que haga falta para un nombre de dos renglones.
  campoEnvuelto: { paddingVertical: Spacing.two, lineHeight: 20 },
  campoAreaDeTexto: {
    minHeight: CampoPanel.altoAreaDeTexto,
    // Sin esto el texto nace centrado en vertical, como en un campo de una línea.
    textAlignVertical: 'top',
  },
  campoAreaCompacta: { minHeight: CampoPanel.altoObservacion },
  /** «Sin observación»: se lee como un dato, no como una ayuda (spec 029, RF-11). */
  sinObservacion: {
    fontFamily: FuentePanel.texto,
    fontSize: TextoPanel.cuerpo,
    color: Panel.textoApoyo,
    paddingVertical: Spacing.one,
  },
  /** La etiqueta, siempre encima de su campo (RF-26). */
  campoEtiqueta: {
    fontFamily: FuentePanel.texto,
    fontSize: TextoPanel.apoyo,
    fontWeight: '600',
    color: Panel.texto,
  },
  /** Un renglón de alto fijo en el escritorio (spec 050, RF-15). */
  campoEtiquetaFija: { height: CampoPanel.altoEtiqueta, lineHeight: CampoPanel.altoEtiqueta },
  campoObligatorio: { color: Estado.noConforme },
  campoEntrada: {
    borderWidth: Grosor.linea,
    borderColor: Panel.borde,
    borderRadius: Radio.md,
    borderCurve: 'continuous',
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    minHeight: CampoPanel.alto,
    fontFamily: FuentePanel.texto,
    fontSize: TextoPanel.cuerpo,
    color: Panel.texto,
    backgroundColor: Panel.superficie,
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
    borderRadius: Radio.pastilla,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  casillaCaja: {
    width: TextoPanel.seccion + Spacing.one,
    height: TextoPanel.seccion + Spacing.one,
    borderRadius: Radio.sm / 2,
    borderWidth: 1,
    borderColor: Panel.borde,
    backgroundColor: Panel.superficie,
    alignItems: 'center',
    justifyContent: 'center',
  },
  casillaCajaMarcada: { backgroundColor: Panel.accion, borderColor: Panel.accion },
  casillaMarca: {
    fontFamily: FuentePanel.texto,
    fontSize: TextoPanel.apoyo,
    fontWeight: '800',
    color: Panel.sobreAccion,
  },
  /**
   * El foco del teclado: un aro grafito separado del borde por una franja clara
   * (spec 022). Pegado al borde grafito del campo se fundía con él; con la franja
   * se lee como un anillo aparte.
   */
  campoEnfocado: { borderColor: Panel.accion, boxShadow: ANILLO_DE_FOCO },
  /** El mismo anillo, para lo que se pulsa. */
  enfocado: { boxShadow: ANILLO_DE_FOCO },
  campoEntradaMal: { borderColor: Estado.noConforme },
  campoError: {
    fontFamily: FuentePanel.texto,
    fontSize: TextoPanel.apoyo,
    color: Estado.noConforme,
    fontWeight: '600',
  },
  /** Los dos desplegables de una hora, alineados por abajo con el separador. */
  hora: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.one },
  horaSeparador: {
    // A la altura de los botones: debajo de la etiqueta, centrado en la caja.
    marginTop: Spacing.four + Spacing.one,
    fontFamily: FuentePanel.texto,
    fontSize: TextoPanel.cuerpo,
    fontWeight: '700',
    color: Panel.textoApoyo,
  },
  campoAyuda: { fontFamily: FuentePanel.texto, fontSize: TextoPanel.apoyo, color: Panel.textoApoyo },

  selectorBoton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  selectorValor: { fontFamily: FuentePanel.texto, fontSize: TextoPanel.cuerpo, color: Panel.texto },
  selectorVacio: {
    fontFamily: FuentePanel.texto,
    fontSize: TextoPanel.cuerpo,
    color: Panel.textoApoyo,
  },
  selectorFlecha: {
    fontFamily: FuentePanel.texto,
    fontSize: TextoPanel.micro,
    color: Panel.textoApoyo,
  },
  selectorLista: {
    // La posición y el alto los pone `colocarLista` al abrir.
    position: 'absolute',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Panel.borde,
    borderRadius: Radio.lg,
    borderCurve: 'continuous',
    backgroundColor: Panel.superficie,
    boxShadow: Sombra.flotante,
  },
  selectorOpcion: {
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderBottomWidth: 1,
    borderBottomColor: Panel.bordeSuave,
  },
  selectorOpcionElegida: { backgroundColor: Panel.acentoSuave },
  selectorOpcionFila: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  selectorOpcionTextos: { flex: 1 },
  selectorBuscador: {
    padding: Spacing.two,
    borderBottomWidth: 1,
    borderBottomColor: Panel.bordeSuave,
  },
  selectorDesplazable: { flexShrink: 1 },
  selectorMarca: {
    fontFamily: FuentePanel.texto,
    fontSize: TextoPanel.cuerpo,
    fontWeight: '800',
    color: Panel.accion,
  },

  tablaMarco: { ...SUPERFICIE },
  /** La misma tabla sin superficie propia: ya está dentro de una. */
  tablaDesnuda: { backgroundColor: 'transparent', borderWidth: 0, borderRadius: 0 },
  tablaContenido: { width: '100%' },
  // `flex: 1` y no solo `flexGrow`: React Native pone `flexShrink: 0` por defecto,
  // y con él el cuerpo medía lo que su contenido y las columnas nunca se encogían.
  tablaCuerpo: { flex: 1 },
  tablaCabecera: {
    flexDirection: 'row',
    gap: Spacing.three,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    backgroundColor: Panel.fondoCabecera,
    borderBottomWidth: Grosor.linea,
    borderBottomColor: Panel.bordeSuave,
  },
  /** Space Grotesk en mayúsculas, como los botones y los grupos del menú (RF-23). */
  tablaTitulo: {
    fontFamily: FuentePanel.rotulo,
    fontSize: TextoPanel.micro,
    fontWeight: '500',
    letterSpacing: EspaciadoLetra.rotulo,
    textTransform: 'uppercase',
    color: Panel.textoApoyo,
  },
  /** La columna por la que se ordena, o la que está bajo el cursor. */
  tablaTituloActivo: { color: Panel.texto, fontWeight: '700' },
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
    borderRadius: Radio.lg,
    borderCurve: 'continuous',
    borderWidth: Grosor.linea,
    borderStyle: 'dashed',
    borderColor: Panel.borde,
    backgroundColor: Panel.fondoCabecera,
  },
  vacioSimbolo: {
    fontFamily: FuentePanel.texto,
    fontSize: TextoPanel.titulo,
    color: Panel.borde,
    fontWeight: '800',
  },
  vacioTexto: {
    fontFamily: FuentePanel.texto,
    fontSize: TextoPanel.cuerpo,
    lineHeight: 21,
    color: Panel.textoApoyo,
    textAlign: 'center',
    maxWidth: 460,
  },
  celda: { fontFamily: FuentePanel.texto, fontSize: TextoPanel.cuerpo, color: Panel.texto },
  /** El dato que encabeza la tarjeta de una fila (spec 050, RF-34). */
  celdaPrincipal: { fontFamily: FuentePanel.texto, fontSize: TextoPanel.seccion, fontWeight: '700' },

  /* Las filas de una lista como tarjetas (spec 050, RF-33 a RF-37). */
  tarjetas: { gap: Spacing.three },
  tarjetaDeFila: { ...SUPERFICIE, gap: Spacing.two, padding: Spacing.three },
  datoDeTarjeta: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'baseline', columnGap: Spacing.two, rowGap: Spacing.half },
  datoDeTarjetaTitulo: { fontFamily: FuentePanel.texto, fontSize: TextoPanel.apoyo, fontWeight: '600', color: Panel.textoApoyo },
  datoDeTarjetaValor: { flexShrink: 1, minWidth: 0 },
  pieDeTarjeta: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
    marginTop: Spacing.one,
    paddingTop: Spacing.two,
    borderTopWidth: Grosor.linea,
    borderTopColor: Panel.bordeSuave,
  },

  seccion: { gap: Spacing.two },
  seccionTitulo: {
    fontFamily: FuentePanel.texto,
    fontSize: TextoPanel.seccion,
    fontWeight: '700',
    color: Panel.texto,
  },
  formulario: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'flex-start',
    // 12 y no 16 entre campos (spec 039, RF-24).
    gap: Spacing.two + Spacing.one,
    padding: Spacing.three,
    ...SUPERFICIE,
  },
  /** El mismo renglón de campos, sin superficie propia (spec 050, RF-23). */
  formularioDesnudo: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'flex-start',
    gap: Spacing.two + Spacing.one,
  },
  grupoAcciones: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    // Por abajo (spec 026, RF-29): un botón junto a campos con etiqueta queda a la
    // altura de los campos y no de sus etiquetas.
    alignItems: 'flex-end',
    gap: Spacing.two,
  },
  /** En el celular los campos van uno debajo de otro; los botones siguen en línea. */
  grupoAccionesAngosto: { alignItems: 'stretch' },
  acciones: {
    width: '100%',
    flexDirection: 'row',
    flexWrap: 'wrap',
    // El principal en el mismo sitio en todos los formularios: a la derecha (039/RF-25).
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: Spacing.two,
    paddingTop: Spacing.two + Spacing.one,
    marginTop: Spacing.one,
    borderTopWidth: Grosor.linea,
    borderTopColor: Panel.bordeSuave,
  },
  /**
   * Pegados al pie de la ventana mientras se desplaza (spec 050, RF-21). Con el fondo de la
   * ventana, para que lo que pasa por detrás no se lea a través, y un relleno abajo para que el
   * último botón no quede contra el borde. `sticky` es de la web, donde vive el panel.
   */
  accionesFijas: {
    position: 'sticky' as 'relative',
    bottom: 0,
    zIndex: 1,
    paddingBottom: Spacing.two,
    backgroundColor: Panel.superficie,
  },
  tarjeta: {
    padding: Spacing.three,
    ...SUPERFICIE,
  },
});
