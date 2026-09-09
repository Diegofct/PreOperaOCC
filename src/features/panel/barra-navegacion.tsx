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
import { Pressable, StyleSheet, Text, View } from 'react-native';

import {
  Colors,
  Marca,
  MaxContentWidthPanel,
  Movimiento,
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

  return (
    <View style={estilos.barra}>
      <View style={estilos.contenido}>
        <View style={estilos.marca}>
          <View style={estilos.logotipo}>
            <Text style={estilos.logotipoTexto}>OCC</Text>
          </View>
          <Text style={estilos.nombre}>PreOpera</Text>
        </View>

        <View style={estilos.enlaces}>
          {modulosVisibles(persona?.rol ?? 'operador').map((modulo) => {
            const enlace = ENLACES[modulo];
            const activo = rutaActual === enlace.ruta;
            return (
              <Link key={enlace.ruta} href={enlace.ruta} asChild>
                <Pressable>
                  <Pastilla activa={activo}>
                    <Text style={[estilos.enlace, activo && estilos.enlaceTextoActivo]}>
                      {enlace.titulo}
                    </Text>
                  </Pastilla>
                </Pressable>
              </Link>
            );
          })}
        </View>

        <View style={estilos.cuenta}>
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
 * La caja de un enlace, con su realce bajo el cursor.
 *
 * El realce vive en un `View` interno y no en el `Pressable`: cuando `Link` lo
 * envuelve con `asChild` le impone su propio `style`, así que un estilo-función
 * en el `Pressable` se pierde y el enlace se queda sin caja. Con la caja un
 * nivel más adentro, `Link` puede hacer lo que quiera con el `Pressable`.
 */
function Pastilla({ activa, children }: { activa: boolean; children: ReactNode }) {
  const [encima, setEncima] = useState(false);

  return (
    <View
      onPointerEnter={() => setEncima(true)}
      onPointerLeave={() => setEncima(false)}
      style={[
        estilos.enlaceCaja,
        encima && !activa && estilos.enlaceHover,
        activa && estilos.enlaceActivo,
      ]}
    >
      {children}
    </View>
  );
}

/**
 * Blanco translúcido sobre el azul de la barra.
 *
 * No sale de `Marca` a propósito: no es un color del sistema, es el mismo
 * `sobreColor` a media opacidad, y solo tiene sentido encima de esta barra.
 */
const SOBRE_BARRA_TENUE = 'rgba(255, 255, 255, 0.16)';
const SOBRE_BARRA_FUERTE = 'rgba(255, 255, 255, 0.24)';

const estilos = StyleSheet.create({
  barra: { backgroundColor: Marca.primario, paddingVertical: Spacing.two, alignItems: 'center' },
  contenido: {
    width: '100%',
    maxWidth: MaxContentWidthPanel,
    paddingHorizontal: Spacing.four,
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: Spacing.three,
  },

  marca: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  // Un cuadro con las iniciales en vez de una imagen: no hay logotipo todavía, y
  // el nombre solo, suelto en la barra, se lee como un texto más.
  logotipo: {
    width: 30,
    height: 30,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Radio.sm,
    borderCurve: 'continuous',
    backgroundColor: SOBRE_BARRA_FUERTE,
  },
  logotipoTexto: {
    fontSize: TextoPanel.micro,
    fontWeight: '800',
    letterSpacing: 0.5,
    color: Marca.sobreColor,
  },
  nombre: { fontSize: TextoPanel.seccion, fontWeight: '800', color: Marca.sobreColor },

  enlaces: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
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
  enlaceHover: { backgroundColor: SOBRE_BARRA_TENUE },
  enlaceActivo: { backgroundColor: Colors.light.background },
  enlace: {
    fontSize: TextoPanel.cuerpo,
    fontWeight: '600',
    color: Marca.sobreColor,
    opacity: 0.9,
  },
  enlaceTextoActivo: { color: Marca.primarioTexto, opacity: 1, fontWeight: '700' },

  cuenta: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  nombrePersona: { fontSize: TextoPanel.apoyo, fontWeight: '700', color: Marca.sobreColor },
  cargo: { fontSize: TextoPanel.micro, color: Marca.sobreColor, opacity: 0.8 },

  salir: {
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderRadius: Radio.sm,
    borderCurve: 'continuous',
    borderWidth: 1,
    borderColor: SOBRE_BARRA_FUERTE,
    transitionDuration: `${Movimiento.rapido}ms`,
  },
  salirTexto: { fontSize: TextoPanel.apoyo, fontWeight: '700', color: Marca.sobreColor },
});
