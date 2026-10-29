/**
 * El menú lateral del panel. Spec 022, RF-1 a RF-14; desde la spec 033, uno por empresa
 * y por obra (RF-10, RF-11, RF-13 a RF-18, RF-20).
 *
 * Qué lleva sale de `menuDelLugar` (rules/empresas), según dónde se está —que lo dice
 * la dirección— y lo que el rol alcanza: el menú reparte, no da permisos (RF-21). Arriba,
 * «← Empresas» y «Cambiar de obra» para la gerencia; debajo, el nombre de la empresa (y
 * de la obra) y sus páginas. El activo es la página de la dirección (RF-6).
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
import { Link, type Href } from 'expo-router';
import { useState } from 'react';
import { Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

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

import { useLugarDelPanel, useObraDelLugar } from '@/features/empresas/contexto-empresa';
import {
  empresaDelLugar,
  esEmpresa,
  menuDelLugar,
  nombreDeEmpresa,
  type EnlaceDelMenu as Enlace,
} from '@/shared/rules/empresas';
import { MODULOS, type Modulo } from '@/shared/rules/permisos';

import { useMenu } from './estado-menu';
import { Icono, type NombreDeIcono } from './iconos';
import { usePersona, useSesionPanel } from './sesion';

/** La etiqueta del menú plegado: qué módulo y a qué altura de la lista. */
interface Etiqueta {
  titulo: string;
  /** Centro vertical del enlace dentro de la lista, sin contar el desplazamiento. */
  centro: number;
}

/** Un bloque del menú: la navegación, o las páginas bajo el nombre de la empresa. */
interface Bloque {
  clave: string;
  titulo: string | null;
  subtitulo: string | null;
  enlaces: Enlace[];
}

/** El dibujo de cada enlace: el del módulo si es uno, y los propios de la spec 033. */
const ICONOS: Record<string, NombreDeIcono> = {
  // El texto ya lleva la flecha («← Empresas», RF-11): el ícono es la casa de las tarjetas.
  empresas: 'inicio',
  'cambiar-obra': 'obras',
  // Los de los menús definitivos (cambio del 2026-10-27).
  'recursos-humanos': 'personas',
  compras: 'compras',
  tesoreria: 'finanzas',
  documentos: 'documentos',
  licitaciones: 'licitaciones',
  bitacora: 'bitacoras',
  calidad: 'laboratorio',
  'solicitudes-compra': 'compras',
  'solicitudes-pago': 'finanzas',
  elemental: 'empresa',
  occ: 'empresa',
  geolab: 'empresa',
  proyectos: 'obras',
};

function iconoDe(clave: string): NombreDeIcono {
  return (
    ICONOS[clave] ?? ((MODULOS as readonly string[]).includes(clave) ? (clave as Modulo) : 'inicio')
  );
}

export function MenuLateral() {
  const { persona } = useSesionPanel();
  // Sin sesión no hay menú: el marco muestra el ingreso.
  return persona ? <MenuConSesion /> : null;
}

function MenuConSesion() {
  const persona = usePersona();
  const { regimen, abierto, encima, anchoReservado, alternar, cerrarEncima } = useMenu();
  const lugar = useLugarDelPanel();
  const obra = useObraDelLugar();
  const menu = menuDelLugar(lugar, persona, obra?.modulos);
  const empresa = empresaDelLugar(lugar);
  const activo = lugar && lugar.tipo !== 'proyectos' ? lugar.pagina : null;

  const bloques: Bloque[] = [
    {
      clave: 'navegacion',
      titulo: null,
      subtitulo: null,
      enlaces: menu.navegacion,
    },
    {
      clave: 'paginas',
      // El nombre de la empresa, y el de la obra en Proyectos (RF-10).
      titulo: empresa && esEmpresa(empresa) ? nombreDeEmpresa(empresa) : lugar ? null : 'Empresas',
      subtitulo: lugar?.tipo === 'obra' ? (obra?.nombre ?? '…') : null,
      enlaces: menu.entradas,
    },
  ].filter((b) => b.enlaces.length > 0 || b.titulo !== null);

  const [desplazado, setDesplazado] = useState(0);
  const [etiqueta, setEtiqueta] = useState<Etiqueta | null>(null);
  const conEtiqueta = etiqueta !== null && !abierto;

  // En el celular no hay riel: el menú solo existe mientras está abierto con ☰ (026/RF-33).
  if (regimen === 'oculto' && !encima) return null;

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
      {/* Tocar fuera del menú abierto lo cierra, como en cualquier menú de celular. */}
      {regimen === 'oculto' ? (
        <Pressable
          accessibilityLabel="Cerrar el menú"
          onPress={cerrarEncima}
          style={estilos.velo}
        />
      ) : null}
      <View style={[estilos.menu, encima && estilos.menuEncima]}>
        <ScrollView
          // Sin barra visible: se come 8 del ancho y vuelve a cortar «Reportes de
          // WhatsApp». La rueda y el teclado siguen desplazando.
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[estilos.lista, !abierto && estilos.listaPlegada]}
          onScroll={(e) => setDesplazado(e.nativeEvent.contentOffset.y)}
          scrollEventThrottle={32}
        >
          {bloques.map((bloque, indice) => (
            <Grupo
              key={bloque.clave}
              bloque={bloque}
              primero={indice === 0}
              activo={activo}
              abierto={abierto}
              alElegir={encima ? cerrarEncima : undefined}
              alSenalar={(titulo, centro) =>
                setEtiqueta(titulo === null ? null : { titulo, centro })
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
            {
              left: anchoReservado + Spacing.one,
              top: etiqueta.centro - desplazado,
            },
          ]}
        >
          <Text style={estilos.etiquetaTexto}>{etiqueta.titulo}</Text>
        </View>
      ) : null}
    </View>
  );
}

/**
 * Un bloque del menú, con su título. Mide dónde empieza dentro de la lista para
 * que cada enlace sepa su altura total: `onLayout` da la posición relativa al
 * padre, y el padre de un enlace es el grupo, no la lista.
 */
function Grupo({
  bloque,
  primero,
  activo,
  abierto,
  alElegir,
  alSenalar,
}: {
  bloque: Bloque;
  primero: boolean;
  activo: string | null;
  abierto: boolean;
  alElegir?: () => void;
  alSenalar: (titulo: string | null, centro: number) => void;
}) {
  const [arriba, setArriba] = useState(0);

  return (
    <View style={estilos.grupo} onLayout={(e) => setArriba(e.nativeEvent.layout.y)}>
      {bloque.titulo === null ? null : abierto ? (
        <View style={estilos.cabecera}>
          <Text style={estilos.tituloGrupo} numberOfLines={2}>
            {bloque.titulo}
          </Text>
          {bloque.subtitulo ? (
            <Text style={estilos.subtituloGrupo} numberOfLines={2}>
              {bloque.subtitulo}
            </Text>
          ) : null}
        </View>
      ) : primero ? null : (
        // Plegado no hay sitio para el título: una raya separa los grupos.
        <View style={estilos.separadorGrupo} />
      )}
      {bloque.enlaces.map((enlace) => (
        <EnlaceDelMenu
          key={enlace.clave}
          enlace={enlace}
          activo={enlace.clave === activo}
          abierto={abierto}
          alElegir={alElegir}
          alSenalar={(centro) =>
            alSenalar(centro === null ? null : enlace.titulo, arriba + (centro ?? 0))
          }
        />
      ))}
    </View>
  );
}

/**
 * Una página del menú.
 *
 * La caja con su realce vive en un `View` interno y no en el `Pressable`: `Link`
 * con `asChild` le impone su propio `style` al hijo, y un estilo-función ahí se
 * pierde. Es lo mismo que ya pasaba con la barra de antes.
 */
function EnlaceDelMenu({
  enlace,
  activo,
  abierto,
  alElegir,
  alSenalar,
}: {
  enlace: Enlace;
  activo: boolean;
  abierto: boolean;
  /** Al elegirlo, además de navegar: cierra el menú abierto encima (RF-14). */
  alElegir?: () => void;
  /** Avisa el centro del enlace dentro de su grupo al señalarlo, o `null` al dejarlo. */
  alSenalar: (centro: number | null) => void;
}) {
  const [encima, setEncima] = useState(false);
  const [enfocado, setEnfocado] = useState(false);
  const [centro, setCentro] = useState(0);

  const boton = (
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
      {...(enlace.externa
        ? {
            accessibilityRole: 'link' as const,
            onPress: () => {
              alElegir?.();
              // En web abre una pestaña nueva; `Link` con `asChild` pierde el `target`.
              void Linking.openURL(enlace.ruta);
            },
          }
        : {})}
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
        <Icono nombre={iconoDe(enlace.clave)} color={activo ? Panel.sobreAcento : Panel.texto} />
        {abierto ? (
          <Text
            style={[estilos.enlaceTexto, activo && estilos.enlaceTextoActivo]}
            // Dos renglones: «Reportes de vehículos y maquinaria» no cabe en uno (spec 033).
            numberOfLines={2}
          >
            {enlace.titulo}
          </Text>
        ) : null}
      </View>
    </Pressable>
  );

  return (
    <View onLayout={(e) => setCentro(e.nativeEvent.layout.y + e.nativeEvent.layout.height / 2)}>
      {activo ? <View style={estilos.marcaActivo} /> : null}
      {/* El `onPress` va en el `Link`, no en el hijo: `Link` lo llama y después navega.
          Otra aplicación (LicitApp, RF-49) se abre en una pestaña nueva, sin `Link`. */}
      {enlace.externa ? (
        boton
      ) : (
        <Link href={enlace.ruta as Href} onPress={alElegir} asChild>
          {boton}
        </Link>
      )}
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
  /** Lo que queda detrás del menú abierto en el celular: lo oscurece y, tocado, lo cierra. */
  velo: {
    position: 'fixed' as 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.35)',
  },
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
  /** El nombre de la empresa y, debajo, el de la obra (spec 033, RF-10). */
  cabecera: { gap: Spacing.half, paddingBottom: Spacing.one },
  subtituloGrupo: {
    paddingHorizontal: Spacing.two + Spacing.half * 3,
    fontFamily: FuentePanel.texto,
    fontSize: TextoPanel.apoyo,
    fontWeight: '600',
    color: Panel.texto,
  },
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
  telon: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    zIndex: 15,
    backgroundColor: Panel.telon,
  },
});
