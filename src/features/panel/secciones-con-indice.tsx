/**
 * Un documento largo con su índice al lado.
 *
 * Nació para el parte diario, que son nueve secciones en una columna. Antes eran
 * nueve rectángulos blancos apilados y quien lo llenaba no sabía en qué punto
 * iba, ni cuántas quedaban, ni qué le faltaba para poder cerrarlo — lo descubría
 * pulsando «Cerrar» y recibiendo un rechazo.
 *
 * ── Por qué un archivo aparte y no `componentes.tsx` ──
 *
 * `componentes.tsx` es el vocabulario que comparten las diez pantallas del panel
 * y ya pasa de 1100 líneas. Tener ahí `Seccion` —que es transparente— y
 * `SeccionEnMarco` —que es una banda dentro de una superficie— codo con codo es
 * invitar a que alguien las mezcle. Son cosas distintas con nombres parecidos.
 *
 * ── Por qué no se toca `Seccion` ──
 *
 * La usan nueve pantallas más. Convertirla en tarjeta sería rediseñar el panel
 * entero dentro de una spec que se acota al parte. Aquí no se modifica nada
 * existente: se añade.
 *
 * ── La geometría ──
 *
 * El índice se lleva `AnchoIndiceDeSecciones` y el marco se queda con
 * `AnchoContenidoConIndice`, que está **derivado** en el tema. De ahí sale el
 * presupuesto de anchos de tabla que comprueba `scripts/verificar-reglas.ts`: si
 * alguno de los dos cambia, el otro se mueve solo.
 */
import { useRef, useState, type ReactNode } from 'react';
import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';

import {
  AnchoIndiceDeSecciones,
  AnchoMinimoDosColumnas,
  Colors,
  Grosor,
  Movimiento,
  Panel,
  Radio,
  Sombra,
  Spacing,
  TextoPanel,
} from '@/constants/theme';
import {
  IDS_DE_SECCION,
  type EstadoDeSeccion,
  type IdDeSeccion,
  type SeccionDelParte,
} from '@/shared/rules/parte';

/* ------------------------------------------------------------------------ */
/* El índice                                                                 */
/* ------------------------------------------------------------------------ */

/**
 * El glifo de cada estado.
 *
 * Es un carácter de texto y no un `View` con color, a propósito: sobrevive al
 * modo de alto contraste del sistema operativo y lo lee un lector de pantalla.
 * El color solo acompaña — nunca es la única señal (spec 006 / RF-14).
 */
const GLIFO: Record<EstadoDeSeccion, string> = {
  lleno: '●',
  vacio: '○',
  desconocido: '·',
};

function detalleDe(seccion: SeccionDelParte): string {
  if (seccion.estado === 'desconocido') return 'comprobando';
  if (seccion.cuantos === null) return seccion.estado === 'lleno' ? 'listo' : 'sin registrar';
  return seccion.cuantos === 0 ? 'sin registrar' : String(seccion.cuantos);
}

function EntradaDelIndice({
  seccion,
  activa,
  alElegir,
}: {
  seccion: SeccionDelParte;
  activa: boolean;
  alElegir: () => void;
}) {
  const [encima, setEncima] = useState(false);
  const [enfocada, setEnfocada] = useState(false);

  return (
    <Pressable
      onPress={alElegir}
      onPointerEnter={() => setEncima(true)}
      onPointerLeave={() => setEncima(false)}
      onFocus={() => setEnfocada(true)}
      onBlur={() => setEnfocada(false)}
      accessibilityRole="button"
      accessibilityLabel={`${seccion.titulo}, ${detalleDe(seccion)}`}
      style={[
        estilos.entrada,
        encima && !activa && estilos.entradaHover,
        activa && estilos.entradaActiva,
        enfocada && estilos.entradaEnfocada,
      ]}
    >
      <Text
        style={[estilos.glifo, seccion.estado === 'lleno' && estilos.glifoLleno]}
        accessibilityElementsHidden
      >
        {GLIFO[seccion.estado]}
      </Text>
      <Text
        style={[estilos.entradaTitulo, activa && estilos.entradaTituloActiva]}
        numberOfLines={1}
      >
        {seccion.titulo}
      </Text>
      <Text style={estilos.entradaDetalle}>{detalleDe(seccion)}</Text>
    </Pressable>
  );
}

/**
 * La columna de la izquierda: qué secciones hay, cuáles están llenas y, al pie,
 * qué falta para dar el documento por terminado.
 */
export function IndiceDeSecciones({
  secciones,
  activa,
  alElegir,
  pie,
}: {
  secciones: SeccionDelParte[];
  activa: string | null;
  alElegir: (id: string) => void;
  pie?: ReactNode;
}) {
  return (
    <View style={estilos.indice}>
      {secciones.map((seccion) => (
        <EntradaDelIndice
          key={seccion.id}
          seccion={seccion}
          activa={seccion.id === activa}
          alElegir={() => alElegir(seccion.id)}
        />
      ))}
      {pie ? <View style={estilos.indicePie}>{pie}</View> : null}
    </View>
  );
}

/* ------------------------------------------------------------------------ */
/* El marco y sus bandas                                                     */
/* ------------------------------------------------------------------------ */

/**
 * La **única** superficie blanca del documento.
 *
 * Sombra y no borde: es lo que dice el comentario de `Sombra` en el tema —«se
 * usan en vez de un borde, no encima»— y lo que `Bloque` incumplía llevando los
 * dos. `overflow: 'visible'` porque las listas de los selectores flotan y tienen
 * que poder salirse.
 */
export function MarcoDeSecciones({ children }: { children: ReactNode }) {
  return <View style={estilos.marco}>{children}</View>;
}

/**
 * Una banda del documento: rótulo, su acción a la derecha, y el cuerpo.
 *
 * La divisoria va **de lado a lado** del marco y no alrededor de la banda: es lo
 * que hace que las nueve se lean como un solo documento con partes, en vez de
 * como nueve tarjetas pegadas.
 */
export function SeccionEnMarco({
  id,
  titulo,
  accion,
  ultima,
  alMedir,
  children,
}: {
  /** Cerrado a los nueve ids de la regla: de ahí sale también el apilado. */
  id: IdDeSeccion;
  titulo: string;
  /** Lo que va a la derecha del rótulo. Normalmente el botón de guardar. */
  accion?: ReactNode;
  ultima?: boolean;
  /** Dónde empieza esta banda dentro del marco, para poder saltar a ella. */
  alMedir?: (id: string, y: number) => void;
  children: ReactNode;
}) {
  /**
   * Por qué cada banda lleva su propio `zIndex`, y por qué va al revés.
   *
   * React Native Web le pone `z-index: 0` a toda vista, así que cada banda es su
   * propio contexto de apilamiento y **todas empatan a cero**. Con el empate
   * manda el orden de pintado, y una lista desplegable abierta en la banda de
   * arriba se metía por debajo de la de abajo — el `zIndex: 10` del desplegable
   * solo lo sube dentro de su propia banda, que es donde no hace falta.
   *
   * Se apilan al revés —las primeras más arriba— porque una lista siempre cae
   * **hacia abajo**: lo que tiene que taparse es lo que viene después.
   *
   * Este problema ya se había resuelto una vez, en la bitácora por máquina que
   * la spec 004 retiró. Se perdió con el archivo y volvió con las bandas.
   */
  const apilado = IDS_DE_SECCION.length - IDS_DE_SECCION.indexOf(id);

  return (
    <View
      nativeID={`seccion-${id}`}
      onLayout={(evento) => alMedir?.(id, evento.nativeEvent.layout.y)}
      style={[estilos.banda, !ultima && estilos.bandaConLinea, { zIndex: apilado }]}
    >
      <View style={estilos.bandaCabecera}>
        <Text style={estilos.bandaTitulo}>{titulo}</Text>
        {accion ? <View style={estilos.bandaAccion}>{accion}</View> : null}
      </View>
      <View style={estilos.bandaCuerpo}>{children}</View>
    </View>
  );
}

/** El pie de una banda: añadir una fila, guardar. Sin superficie propia. */
export function PieDeSeccion({ children }: { children: ReactNode }) {
  return <View style={estilos.pie}>{children}</View>;
}

/* ------------------------------------------------------------------------ */
/* La disposición                                                            */
/* ------------------------------------------------------------------------ */

/**
 * Índice a la izquierda y documento a la derecha, con un solo régimen de
 * respaldo: por debajo de `AnchoMinimoDosColumnas` el índice **sube** y se
 * convierte en una tira horizontal encima del documento.
 *
 * Sube y no desaparece. Es la única señal de qué falta antes de cerrar la
 * jornada, y esconderla justo en la pantalla pequeña es esconderla en la obra.
 */
export function DisposicionConIndice({
  indice,
  children,
  alMedir,
}: {
  indice: ReactNode;
  children: ReactNode;
  /** Dónde empieza la disposición dentro de la página. */
  alMedir?: (y: number) => void;
}) {
  const { width } = useWindowDimensions();
  const estrecha = width > 0 && width < AnchoMinimoDosColumnas;

  return (
    <View
      onLayout={(evento) => alMedir?.(evento.nativeEvent.layout.y)}
      style={[estilos.disposicion, estrecha && estilos.disposicionEstrecha]}
    >
      <View style={estrecha ? estilos.ladoEstrecho : estilos.lado}>{indice}</View>
      <View style={estilos.documento}>{children}</View>
    </View>
  );
}

/**
 * Llevar la vista a una sección.
 *
 * Guarda dónde empieza cada banda —medido con `onLayout`, que se vuelve a
 * disparar solo cuando algo cambia de alto— y desplaza el `ScrollView` de la
 * pantalla hasta ahí.
 *
 * Las medidas van en un `ref` y no en estado: medir no debe repintar.
 *
 * Se descartó `scrollIntoView` sobre el `nativeID`, que el navegador haría solo:
 * el punto de llegada queda **debajo** del índice pegado, y la única cura es
 * `scroll-margin-top`, una propiedad CSS que ninguna hoja de React Native puede
 * expresar sin escribir un valor suelto fuera del sistema de tokens.
 */
export function useSaltoASeccion(desplazamiento: React.RefObject<ScrollView | null>) {
  const inicioDeDisposicion = useRef(0);
  const inicioDeBanda = useRef(new Map<string, number>());

  return {
    alMedirDisposicion: (y: number) => {
      inicioDeDisposicion.current = y;
    },
    alMedirBanda: (id: string, y: number) => {
      inicioDeBanda.current.set(id, y);
    },
    saltarA: (id: string) => {
      const y = inicioDeBanda.current.get(id);
      // Si todavía no se ha medido, no se adivina un cero: quedarse quieto es
      // mejor que llevar a alguien al principio de la página sin avisar.
      if (y === undefined) return;
      desplazamiento.current?.scrollTo({
        y: inicioDeDisposicion.current + y - Spacing.four,
        animated: true,
      });
    },
  };
}

const estilos = StyleSheet.create({
  disposicion: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.four },
  disposicionEstrecha: { flexDirection: 'column', gap: Spacing.three },

  /**
   * `alignSelf: 'flex-start'` es imprescindible con `sticky`: si la columna se
   * estira a la altura de la fila no hay recorrido dentro del cual pegarse.
   *
   * `position: 'sticky'` no está en los tipos de React Native —solo existe en la
   * web— y por eso el objeto lleva su conversión acotada a esa propiedad. Es el
   * mismo trato que el panel ya le da a `boxShadow` y `transitionDuration`.
   */
  lado: {
    width: AnchoIndiceDeSecciones,
    alignSelf: 'flex-start',
    ...(Platform.OS === 'web'
      ? ({ position: 'sticky', top: Spacing.four } as object)
      : null),
  },
  ladoEstrecho: { width: '100%' },

  documento: { flex: 1, minWidth: 0 },

  indice: { gap: Spacing.half },
  indicePie: {
    marginTop: Spacing.two,
    paddingTop: Spacing.three,
    borderTopWidth: Grosor.linea,
    borderTopColor: Panel.bordeSuave,
    gap: Spacing.two,
  },

  entrada: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.two,
    borderRadius: Radio.sm,
    borderCurve: 'continuous',
    borderLeftWidth: Grosor.marca,
    borderLeftColor: 'transparent',
    transitionDuration: `${Movimiento.rapido}ms`,
  },
  entradaHover: { backgroundColor: Panel.fondoCabecera },
  /**
   * Fondo tenue y borde a la izquierda, no una pastilla sólida: entre nueve
   * entradas en columna, los rellenos sólidos se leen como una hilera de
   * manchas. La barra de navegación sí usa el sólido, y con razón — ahí son
   * siete en fila y uno relleno se localiza de un vistazo.
   */
  entradaActiva: { backgroundColor: Panel.accionSuave, borderLeftColor: Panel.accion },
  entradaEnfocada: { boxShadow: `0 0 0 ${Grosor.marca}px ${Panel.foco}` },

  glifo: { fontSize: TextoPanel.micro, color: Colors.light.textSecondary, width: 12 },
  glifoLleno: { color: Colors.light.text },
  entradaTitulo: {
    flex: 1,
    fontSize: TextoPanel.apoyo,
    fontWeight: '600',
    color: Colors.light.textSecondary,
  },
  entradaTituloActiva: { color: Colors.light.text, fontWeight: '700' },
  entradaDetalle: { fontSize: TextoPanel.micro, color: Colors.light.textSecondary },

  marco: {
    backgroundColor: Colors.light.background,
    borderRadius: Radio.md,
    borderCurve: 'continuous',
    boxShadow: Sombra.tarjeta,
    overflow: 'visible',
  },

  banda: { paddingVertical: Spacing.three },
  bandaConLinea: { borderBottomWidth: Grosor.linea, borderBottomColor: Panel.bordeSuave },
  bandaCabecera: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.three,
    paddingHorizontal: Spacing.four,
    paddingBottom: Spacing.two,
  },
  bandaTitulo: { fontSize: TextoPanel.seccion, fontWeight: '700', color: Colors.light.text },
  bandaAccion: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  bandaCuerpo: { paddingHorizontal: Spacing.four, gap: Spacing.two },

  /** Puede llevar un selector, así que se pinta por encima de lo que sigue. */
  pie: {
    zIndex: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'flex-end',
    gap: Spacing.three,
    paddingTop: Spacing.three,
  },
});
