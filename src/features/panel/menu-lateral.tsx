/**
 * El menú lateral del panel: los módulos a la izquierda. Spec 022, RF-1 a RF-14.
 *
 * Reemplaza los enlaces de la barra de arriba, que con once módulos ya no cabían
 * en un renglón. En columna caben todos y los que vengan, y se leen de arriba
 * abajo, que es como se busca en una lista.
 *
 * Quién ve qué sale de `modulosVisibles` (cargo y módulos de su obra), igual que
 * antes (RF-2), y `gruposDelMenu` los reparte bajo sus títulos y quita los grupos
 * vacíos (RF-3, RF-4). El activo se marca con `moduloDeLaRuta`, por prefijo, para
 * que las subpáginas —el informe de un ensayo— también lo marquen (RF-6).
 *
 * Plegado deja solo los íconos (RF-9). El nombre aparece al pasar el puntero o al
 * llegar con el tabulador (RF-10), en una etiqueta que se dibuja **fuera** de la
 * lista: la lista se desplaza, y todo lo que se sale de un desplazable se recorta.
 *
 * En ventana angosta (régimen `riel`) el menú ocupa siempre su columna plegada, y
 * al abrirlo se dibuja **encima** del contenido, con el telón detrás (RF-12, RF-13):
 * así el contenido no salta de ancho cada vez que alguien busca un módulo. Elegir
 * uno o tocar el telón lo cierra (RF-14).
 */
import { Link, usePathname } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import {
  AnchoMenuAbierto,
  EspaciadoLetra,
  FuentePanel,
  Grosor,
  Movimiento,
  Panel,
  Radio,
  Sombra,
  Spacing,
  TextoPanel,
} from '@/constants/theme';

import { gruposDelMenu, type GrupoDelMenu } from '@/shared/rules/menu';
import { modulosVisibles, type Modulo } from '@/shared/rules/permisos';

import { useMenu } from './estado-menu';
import { Icono } from './iconos';
import { ENLACES_DE_MODULO, moduloDeLaRuta } from './modulos';
import { useSesionPanel } from './sesion';

/** La etiqueta del menú plegado: qué módulo y a qué altura de la lista. */
interface Etiqueta {
  titulo: string;
  /** Centro vertical del enlace dentro de la lista, sin contar el desplazamiento. */
  centro: number;
}

export function MenuLateral() {
  const { persona } = useSesionPanel();
  const { abierto, encima, anchoReservado, alternar, cerrarEncima } = useMenu();
  const activo = moduloDeLaRuta(usePathname());
  const grupos = gruposDelMenu(
    modulosVisibles(persona?.rol ?? 'operador', persona?.modulosDeObra),
  );

  const [desplazado, setDesplazado] = useState(0);
  const [etiqueta, setEtiqueta] = useState<Etiqueta | null>(null);
  const conEtiqueta = etiqueta !== null && !abierto;

  return (
    // La columna reserva siempre su ancho; el menú de dentro es el que, abierto en
    // ventana angosta, se sale de ella y queda encima del contenido.
    <View
      style={[
        estilos.columna,
        { width: anchoReservado },
        // Encima del contenido: la etiqueta del plegado y el menú abierto encima.
        (conEtiqueta || encima) && estilos.columnaEncima,
      ]}
    >
      <View style={[estilos.menu, encima && estilos.menuEncima]}>
        <ScrollView
          // Sin barra visible: se come 8 del ancho y vuelve a cortar «Reportes de
          // WhatsApp». La rueda y el teclado siguen desplazando.
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[estilos.lista, !abierto && estilos.listaPlegada]}
          onScroll={(e) => setDesplazado(e.nativeEvent.contentOffset.y)}
          scrollEventThrottle={32}
        >
          {grupos.map((grupo, indice) => (
            <Grupo
              key={grupo.titulo ?? 'suelto'}
              grupo={grupo}
              primero={indice === 0}
              activo={activo}
              abierto={abierto}
              alElegir={encima ? cerrarEncima : undefined}
              alSenalar={(modulo, centro) =>
                setEtiqueta(
                  modulo === null ? null : { titulo: ENLACES_DE_MODULO[modulo].titulo, centro },
                )
              }
            />
          ))}
        </ScrollView>

        <View style={estilos.pie}>
          <BotonPlegar abierto={abierto} onPress={alternar} />
        </View>
      </View>

      {conEtiqueta ? (
        <View
          pointerEvents="none"
          style={[
            estilos.etiqueta,
            { left: anchoReservado + Spacing.one, top: etiqueta.centro - desplazado },
          ]}
        >
          <Text style={estilos.etiquetaTexto}>{etiqueta.titulo}</Text>
        </View>
      ) : null}
    </View>
  );
}

/**
 * Un grupo del menú, con su título. Mide dónde empieza dentro de la lista para
 * que cada enlace sepa su altura total: `onLayout` da la posición relativa al
 * padre, y el padre de un enlace es el grupo, no la lista.
 */
function Grupo({
  grupo,
  primero,
  activo,
  abierto,
  alElegir,
  alSenalar,
}: {
  grupo: GrupoDelMenu;
  primero: boolean;
  activo: Modulo | null;
  abierto: boolean;
  alElegir?: () => void;
  alSenalar: (modulo: Modulo | null, centro: number) => void;
}) {
  const [arriba, setArriba] = useState(0);

  return (
    <View style={estilos.grupo} onLayout={(e) => setArriba(e.nativeEvent.layout.y)}>
      {grupo.titulo === null ? null : abierto ? (
        <Text style={estilos.tituloGrupo} numberOfLines={1}>
          {grupo.titulo}
        </Text>
      ) : primero ? null : (
        // Plegado no hay sitio para el título: una raya separa los grupos.
        <View style={estilos.separadorGrupo} />
      )}
      {grupo.modulos.map((modulo) => (
        <EnlaceDelMenu
          key={modulo}
          modulo={modulo}
          activo={modulo === activo}
          abierto={abierto}
          alElegir={alElegir}
          alSenalar={(centro) => alSenalar(centro === null ? null : modulo, arriba + (centro ?? 0))}
        />
      ))}
    </View>
  );
}

/**
 * Un módulo del menú.
 *
 * La caja con su realce vive en un `View` interno y no en el `Pressable`: `Link`
 * con `asChild` le impone su propio `style` al hijo, y un estilo-función ahí se
 * pierde. Es lo mismo que ya pasaba con la barra de antes.
 */
function EnlaceDelMenu({
  modulo,
  activo,
  abierto,
  alElegir,
  alSenalar,
}: {
  modulo: Modulo;
  activo: boolean;
  abierto: boolean;
  /** Al elegirlo, además de navegar: cierra el menú abierto encima (RF-14). */
  alElegir?: () => void;
  /** Avisa el centro del enlace dentro de su grupo al señalarlo, o `null` al dejarlo. */
  alSenalar: (centro: number | null) => void;
}) {
  const enlace = ENLACES_DE_MODULO[modulo];
  const [encima, setEncima] = useState(false);
  const [enfocado, setEnfocado] = useState(false);
  const [centro, setCentro] = useState(0);

  return (
    <View
      onLayout={(e) =>
        setCentro(e.nativeEvent.layout.y + e.nativeEvent.layout.height / 2)
      }
    >
      {activo ? <View style={estilos.marcaActivo} /> : null}
      {/* El `onPress` va en el `Link`, no en el hijo: `Link` lo llama y después navega. */}
      <Link href={enlace.ruta} onPress={alElegir} asChild>
        <Pressable
          onFocus={() => {
            setEnfocado(true);
            alSenalar(centro);
          }}
          onBlur={() => {
            setEnfocado(false);
            alSenalar(null);
          }}
          // Plegado, el nombre no se ve: el lector de pantalla lo necesita igual.
          accessibilityLabel={enlace.titulo}
          accessibilityState={{ selected: activo }}
        >
          <View
            onPointerEnter={() => {
              setEncima(true);
              alSenalar(centro);
            }}
            onPointerLeave={() => {
              setEncima(false);
              alSenalar(null);
            }}
            style={[
              estilos.enlace,
              !abierto && estilos.enlacePlegado,
              encima && !activo && estilos.enlaceEncima,
              activo && estilos.enlaceActivo,
              enfocado && estilos.enlaceEnfocado,
            ]}
          >
            <Icono nombre={modulo} color={activo ? Panel.sobreAcento : Panel.texto} />
            {abierto ? (
              <Text
                style={[estilos.enlaceTexto, activo && estilos.enlaceTextoActivo]}
                numberOfLines={1}
              >
                {enlace.titulo}
              </Text>
            ) : null}
          </View>
        </Pressable>
      </Link>
    </View>
  );
}

/** El botón de plegar y abrir el menú (RF-9). Abajo, fuera de la lista: siempre a mano. */
function BotonPlegar({ abierto, onPress }: { abierto: boolean; onPress: () => void }) {
  const [encima, setEncima] = useState(false);
  const [enfocado, setEnfocado] = useState(false);
  const rotulo = abierto ? 'Plegar menú' : 'Abrir menú';

  return (
    <Pressable
      onPress={onPress}
      onHoverIn={() => setEncima(true)}
      onHoverOut={() => setEncima(false)}
      onFocus={() => setEnfocado(true)}
      onBlur={() => setEnfocado(false)}
      accessibilityRole="button"
      accessibilityLabel={rotulo}
      accessibilityState={{ expanded: abierto }}
      style={[
        estilos.enlace,
        !abierto && estilos.enlacePlegado,
        encima && estilos.enlaceEncima,
        enfocado && estilos.enlaceEnfocado,
      ]}
    >
      <Icono nombre={abierto ? 'plegar' : 'abrir'} color={Panel.textoApoyo} />
      {abierto ? <Text style={estilos.plegarTexto}>{rotulo}</Text> : null}
    </Pressable>
  );
}

const estilos = StyleSheet.create({
  columna: {
    transitionProperty: 'width',
    transitionDuration: `${Movimiento.base}ms`,
  },
  columnaEncima: { zIndex: 20 },
  menu: {
    flex: 1,
    backgroundColor: Panel.fondo,
    borderRightWidth: Grosor.linea,
    borderRightColor: Panel.bordeSuave,
  },
  /** Abierto en ventana angosta: sale de su columna y flota sobre el contenido (RF-13). */
  menuEncima: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    width: AnchoMenuAbierto,
    borderRightWidth: 0,
    boxShadow: Sombra.flotante,
  },
  // Los rellenos están contados para que «Reportes de WhatsApp», el rótulo más
  // largo, quepa entero en los 248 del menú abierto: 12 + 14 de cada lado, 20 del
  // ícono y 12 de separación le dejan 162 al texto.
  lista: {
    gap: Spacing.three,
    paddingVertical: Spacing.three,
    paddingHorizontal: Spacing.two + Spacing.one,
  },
  listaPlegada: { gap: Spacing.two },
  grupo: { gap: Spacing.half },
  /** «EL DÍA A DÍA»: Space Grotesk en mayúsculas, como en egg.live (RF-23). */
  tituloGrupo: {
    paddingHorizontal: Spacing.two + Spacing.half * 3,
    paddingBottom: Spacing.one,
    fontFamily: FuentePanel.rotulo,
    fontSize: TextoPanel.micro,
    fontWeight: '500',
    letterSpacing: EspaciadoLetra.rotulo,
    textTransform: 'uppercase',
    color: Panel.textoApoyo,
  },
  separadorGrupo: {
    height: Grosor.linea,
    marginHorizontal: Spacing.two,
    marginBottom: Spacing.two,
    backgroundColor: Panel.bordeSuave,
  },
  enlace: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two + Spacing.one,
    paddingHorizontal: Spacing.two + Spacing.half * 3,
    paddingVertical: Spacing.two + Spacing.half,
    borderRadius: Radio.pastilla,
    transitionDuration: `${Movimiento.rapido}ms`,
  },
  /** Plegado, el ícono solo y centrado en la píldora. */
  enlacePlegado: { justifyContent: 'center', paddingHorizontal: 0 },
  enlaceEncima: { backgroundColor: Panel.fondoHover },
  /** El activo: píldora amarilla con grafito encima (RF-6). */
  enlaceActivo: { backgroundColor: Panel.acento },
  enlaceEnfocado: { boxShadow: `0 0 0 ${Grosor.marca}px ${Panel.foco}` },
  /**
   * La barra al borde del menú, a la altura del activo. Es la señal que no es
   * color (RF-6, constitución 7): con el amarillo apagado —una pantalla en
   * escala de grises, un daltónico— sigue diciendo dónde se está.
   */
  marcaActivo: {
    position: 'absolute',
    left: -(Spacing.two + Spacing.one) + Spacing.half,
    top: Spacing.two,
    bottom: Spacing.two,
    width: Grosor.marca + 1,
    borderRadius: Radio.pastilla,
    backgroundColor: Panel.texto,
  },
  enlaceTexto: {
    flexShrink: 1,
    fontFamily: FuentePanel.texto,
    fontSize: TextoPanel.cuerpo,
    fontWeight: '500',
    color: Panel.texto,
  },
  enlaceTextoActivo: { fontWeight: '700', color: Panel.sobreAcento },

  pie: {
    paddingHorizontal: Spacing.two + Spacing.one,
    paddingVertical: Spacing.two,
    borderTopWidth: Grosor.linea,
    borderTopColor: Panel.bordeSuave,
  },
  plegarTexto: {
    fontFamily: FuentePanel.texto,
    fontSize: TextoPanel.apoyo,
    fontWeight: '500',
    color: Panel.textoApoyo,
  },

  /** El nombre del módulo junto al ícono, con el menú plegado (RF-10). */
  etiqueta: {
    position: 'absolute',
    transform: [{ translateY: '-50%' }],
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.one + Spacing.half,
    borderRadius: Radio.pastilla,
    backgroundColor: Panel.barra,
    boxShadow: Sombra.flotante,
  },
  etiquetaTexto: {
    fontFamily: FuentePanel.texto,
    fontSize: TextoPanel.apoyo,
    fontWeight: '600',
    color: Panel.textoBarra,
  },
});

/**
 * El telón detrás del menú abierto encima (RF-13). Cubre el contenido, lo oscurece
 * sin ocultarlo —se sigue viendo dónde se estaba— y al tocarlo cierra el menú
 * (RF-14). Va en el layout, sobre la pantalla, y no dentro del menú: el menú solo
 * es dueño de su columna.
 */
export function TelonDelMenu() {
  const { encima, cerrarEncima } = useMenu();
  if (!encima) return null;
  return (
    <Pressable
      onPress={cerrarEncima}
      accessibilityLabel="Cerrar el menú"
      style={estilosTelon.telon}
    />
  );
}

const estilosTelon = StyleSheet.create({
  telon: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, zIndex: 15, backgroundColor: Panel.telon },
});
