/**
 * La navegación del panel.
 *
 * Sustituye al encabezado del `Stack` en vez de vivir dentro de cada pantalla:
 * el residente salta entre obras, personas, vehículos y preoperacionales todo el
 * rato —registrar una máquina y asignarla son un solo gesto mental— y esconder
 * eso detrás de un botón de volver convierte cada salto en dos.
 *
 * La sección activa se marca con una **pastilla**, no con un subrayado. Con
 * siete enlaces en una sola barra, un subrayado fino obliga a buscar dónde está
 * uno; un bloque de color se ve sin mirar.
 *
 * A la derecha va quién está dentro y con qué cargo. No es decoración: en un
 * computador compartido de obra, saber con qué cuenta se está trabajando evita
 * que alguien registre algo a nombre de otro sin darse cuenta.
 */
import { Link, usePathname } from 'expo-router';
import { useState, type ReactNode } from 'react';
import { Image, Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';

import {
  AnchoLadoBarra,
  AnchoMinimoBarraCentrada,
  Colors,
  Grosor,
  MaxContentWidthPanel,
  Movimiento,
  Panel,
  Radio,
  Spacing,
  TextoPanel,
} from '@/constants/theme';

import { modulosVisibles, type Modulo } from '@/shared/rules/permisos';

import { ETIQUETA_ROL } from './contratos';
import { useSesionPanel } from './sesion';

/**
 * Un enlace por módulo. Qué módulos hay y en qué orden lo dice la tabla de
 * permisos, no esta lista: aquí solo viven la ruta y el rótulo.
 *
 * Así el menú no puede desalinearse de la cerradura. Si algún día se añade un
 * módulo a la tabla y se olvida aquí, TypeScript lo dice — el `Record` obliga a
 * que estén los siete.
 */
const ENLACES = {
  inicio: { ruta: '/panel', titulo: 'Inicio' },
  obras: { ruta: '/panel/obras', titulo: 'Obras' },
  personas: { ruta: '/panel/personas', titulo: 'Personas' },
  vehiculos: { ruta: '/panel/vehiculos', titulo: 'Vehículos' },
  asignaciones: { ruta: '/panel/asignaciones', titulo: 'Asignaciones' },
  bitacoras: { ruta: '/panel/bitacoras', titulo: 'Bitácoras' },
  preoperacionales: { ruta: '/panel/preoperacionales', titulo: 'Preoperacionales' },
  // `as const` conserva las rutas como literales, que es lo que exigen las
  // rutas tipadas de Expo Router; `satisfies` obliga a que estén los siete.
} as const satisfies Record<Modulo, { ruta: string; titulo: string }>;

export function BarraNavegacion() {
  const rutaActual = usePathname();
  const { persona, salir, pedirCambioDeClave } = useSesionPanel();
  const { width } = useWindowDimensions();

  // Por debajo del corte, la barra pasa a dos renglones explícitos: marca y
  // cuenta arriba, enlaces abajo a lo ancho. No se deja a `flexWrap` que lo
  // resuelva solo porque lo primero que baja de renglón es la cuenta, y
  // entonces los enlaces vuelven a quedarse pegados a la marca — el defecto de
  // hoy con otro disfraz.
  const apretada = width > 0 && width < AnchoMinimoBarraCentrada;

  return (
    <View style={estilos.barra}>
      <View style={[estilos.contenido, apretada && estilos.contenidoApretado]}>
        <View style={[estilos.marca, apretada && estilos.ladoApretado]}>
          <Image
            source={require('@/../assets/obras_civiles_transparente.png')}
            style={estilos.logotipo}
            resizeMode="contain"
            accessibilityLabel="Obras Civiles Colombianas"
          />
          <View style={estilos.separadorMarca} />
          <Text style={estilos.nombre}>PreOpera</Text>
        </View>

        <View style={[estilos.enlaces, apretada && estilos.enlacesApretados]}>
          {modulosVisibles(persona?.rol ?? 'operador').map((modulo) => {
            const enlace = ENLACES[modulo];
            const activo = rutaActual === enlace.ruta;
            return (
              <EnlaceDeModulo
                key={enlace.ruta}
                ruta={enlace.ruta}
                titulo={enlace.titulo}
                activo={activo}
              />
            );
          })}
        </View>

        <View style={[estilos.cuenta, apretada && estilos.ladoApretado]}>
          {persona ? (
            <Pressable
              onPress={() => pedirCambioDeClave(true)}
              accessibilityLabel="Cambiar mi contraseña"
              style={({ hovered }) => [estilos.enlaceCaja, hovered && estilos.enlaceHover]}
            >
              <Text style={estilos.nombrePersona} numberOfLines={1}>
                {persona.nombreCompleto}
              </Text>
              <Text style={estilos.cargo}>{ETIQUETA_ROL[persona.rol]}</Text>
            </Pressable>
          ) : null}
          <Pressable
            onPress={salir}
            style={({ hovered }) => [estilos.salir, hovered && estilos.enlaceHover]}
          >
            <Text style={estilos.salirTexto}>Salir</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

/**
 * Un enlace de módulo.
 *
 * El foco se lleva con estado propio y no con el `focused` de `Pressable`, que
 * solo existe en el React Native de la web y no está en los tipos. Es el mismo
 * patrón que usan los campos y los botones del panel desde la spec 005.
 */
type RutaDeModulo = (typeof ENLACES)[Modulo]['ruta'];

function EnlaceDeModulo({
  ruta,
  titulo,
  activo,
}: {
  /**
   * El literal de la tabla, no un `string` cualquiera. Es lo que le permite a
   * `Link` seguir comprobando la ruta: tiparlo como `string` obligaría a forzar
   * la conversión aquí dentro, y una conversión forzada es la forma de que una
   * ruta mal escrita llegue a producción sin que nadie la vea.
   */
  ruta: RutaDeModulo;
  titulo: string;
  activo: boolean;
}) {
  const [enfocado, setEnfocado] = useState(false);

  return (
    <Link href={ruta} asChild>
      <Pressable onFocus={() => setEnfocado(true)} onBlur={() => setEnfocado(false)}>
        <Pastilla activa={activo} enfocada={enfocado}>
          <Text style={[estilos.enlace, activo && estilos.enlaceTextoActivo]}>{titulo}</Text>
        </Pastilla>
      </Pressable>
    </Link>
  );
}

/**
 * La caja de un enlace, con su realce bajo el cursor.
 *
 * El realce vive en un `View` interno y no en el `Pressable`: cuando `Link` lo
 * envuelve con `asChild` le impone su propio `style`, así que un estilo-función
 * en el `Pressable` se pierde y el enlace se queda sin caja. Con la caja un
 * nivel más adentro, `Link` puede hacer lo que quiera con el `Pressable`.
 */
function Pastilla({
  activa,
  enfocada,
  children,
}: {
  activa: boolean;
  enfocada: boolean;
  children: ReactNode;
}) {
  const [encima, setEncima] = useState(false);

  return (
    <View
      onPointerEnter={() => setEncima(true)}
      onPointerLeave={() => setEncima(false)}
      style={[
        estilos.enlaceCaja,
        encima && !activa && estilos.enlaceHover,
        activa && estilos.enlaceActivo,
        enfocada && estilos.enlaceEnfocado,
      ]}
    >
      {children}
    </View>
  );
}

const estilos = StyleSheet.create({
  /**
   * Barra blanca, y no de color.
   *
   * Dos razones, y la primera manda: el logotipo de OCC lleva «OBRAS» en negro y
   * «CIVILES» en gris, y sobre un fondo oscuro la mitad del nombre desaparece.
   * Está dibujado para vivir sobre claro.
   *
   * La segunda es la de siempre en esta aplicación: el rojo de la marca es el
   * mismo con el que aquí se dice NO APTO. Una barra de color compitiendo con
   * los estados le quita fuerza al único color que tiene que darla. El grafito
   * queda para lo que se pulsa.
   */
  barra: {
    backgroundColor: Colors.light.background,
    paddingVertical: Spacing.two,
    alignItems: 'center',
    borderBottomWidth: Grosor.linea,
    borderBottomColor: Panel.borde,
  },
  contenido: {
    width: '100%',
    maxWidth: MaxContentWidthPanel,
    paddingHorizontal: Spacing.four,
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: Spacing.three,
  },

  /**
   * El centrado de los enlaces sale de aquí, y no de un `justifyContent` sobre
   * la fila: **los dos lados comparten la misma base de flex**, así que el
   * espacio sobrante se reparte por igual y el bloque del centro queda centrado
   * respecto a la barra. Un `justifyContent: 'center'` a secas lo centraría
   * respecto al hueco que queda entre marca y cuenta, que miden distinto —y la
   * cuenta además cambia de ancho con el nombre de cada persona—.
   *
   * Lo que hace que se vea igual de centrado con los cuatro módulos del
   * residente que con los siete de la gerencia: el centrado no depende de lo que
   * mida el centro.
   */
  marca: {
    flexGrow: 1,
    flexShrink: 1,
    flexBasis: AnchoLadoBarra,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    gap: Spacing.three,
  },
  /** El logotipo de OCC, con su propia transparencia. Se apoya en el blanco. */
  logotipo: { width: 116, height: 36 },
  /** Separa la marca de la empresa del nombre del sistema. No son lo mismo. */
  separadorMarca: { width: Grosor.linea, height: 24, backgroundColor: Panel.borde },
  nombre: { fontSize: TextoPanel.seccion, fontWeight: '800', color: Colors.light.text },

  /** Sin `flex`: crece lo que necesite y deja que los lados se repartan el resto. */
  enlaces: {
    flexGrow: 0,
    flexShrink: 1,
    flexBasis: 'auto',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    flexWrap: 'wrap',
    gap: Spacing.one,
  },
  enlaceCaja: {
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderRadius: Radio.sm,
    borderCurve: 'continuous',
    transitionDuration: `${Movimiento.rapido}ms`,
  },
  enlaceHover: { backgroundColor: Panel.fondoCabecera },
  /** El mismo anillo que llevan los campos y los botones del panel. */
  enlaceEnfocado: { boxShadow: `0 0 0 ${Grosor.marca}px ${Panel.foco}` },
  enlaceActivo: { backgroundColor: Panel.accion },
  enlace: {
    fontSize: TextoPanel.cuerpo,
    fontWeight: '600',
    color: Colors.light.textSecondary,
  },
  enlaceTextoActivo: { color: Panel.sobreAccion, fontWeight: '700' },

  /** La otra mitad de la simetría. Misma base que `marca`, pegada a la derecha. */
  cuenta: {
    flexGrow: 1,
    flexShrink: 1,
    flexBasis: AnchoLadoBarra,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: Spacing.two,
  },

  /* ── Régimen de dos renglones, en ventana estrecha ── */

  /** La fila se parte: marca y cuenta arriba, enlaces abajo. */
  contenidoApretado: { flexWrap: 'wrap', rowGap: Spacing.two },
  /** Los dos lados dejan de repartirse nada y ocupan lo que miden. */
  ladoApretado: { flexGrow: 0, flexBasis: 'auto' },
  /** Los enlaces se llevan un renglón entero, y siguen centrados en él. */
  enlacesApretados: { flexBasis: '100%', flexGrow: 1 },
  nombrePersona: { fontSize: TextoPanel.apoyo, fontWeight: '700', color: Colors.light.text },
  cargo: { fontSize: TextoPanel.micro, color: Colors.light.textSecondary },

  salir: {
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderRadius: Radio.sm,
    borderCurve: 'continuous',
    borderWidth: Grosor.linea,
    borderColor: Panel.borde,
    transitionDuration: `${Movimiento.rapido}ms`,
  },
  salirTexto: { fontSize: TextoPanel.apoyo, fontWeight: '700', color: Colors.light.text },
});
