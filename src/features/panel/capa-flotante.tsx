/**
 * Lo que tiene que pintarse por encima de toda la página: la lista abierta de un
 * selector y las ventanas emergentes (spec 007).
 *
 * ── Por qué existe ──
 *
 * React Native Web le pone `position: relative; z-index: 0` a toda vista, así que
 * cada tarjeta, cada banda del parte y cada fila de formulario es su propio
 * contexto de apilamiento. Una lista con `zIndex: 10` dentro de una de ellas no
 * sube por encima de la hermana de al lado. El proyecto lo parcheó tres veces con
 * `zIndex` descendentes, y en el navegador, el 2026-09-15, seguían saliendo casos:
 * el botón «Añadir actividad» pintado encima de la lista de actividades y la tabla
 * de Asignaciones tapando la lista de vehículos. La ventana «Corregir» tenía el
 * mismo origen: su telón vivía dentro del contenido y no cubría la barra.
 *
 * El arreglo no es otro `zIndex`: es **sacar lo flotante de la página**.
 *
 * ── Por qué el `Modal` de React Native ──
 *
 * En la web, `Modal` es un portal a `document.body` con `position: fixed`, cierra
 * con Esc (`onRequestClose`) y atrapa el foco mientras está abierto: justo lo que
 * hace falta, sin añadir ninguna dependencia (constitución §8). Varios abiertos a
 * la vez se apilan en el orden en que se abrieron, así que un selector dentro de
 * una ventana queda por encima de la ventana.
 *
 * Quien la usa coloca su contenido con posición absoluta respecto a la pantalla:
 * la capa no decide dónde va nada, solo garantiza que nada lo tape.
 */
import type { ReactNode } from 'react';
import { Modal, Pressable, StyleSheet } from 'react-native';

import { Panel } from '@/constants/theme';

export function CapaFlotante({
  visible,
  alCerrar,
  alTerminarDeCerrar,
  telon = 'transparente',
  children,
}: {
  visible: boolean;
  /** Esc, o un clic en el telón. */
  alCerrar: () => void;
  /**
   * Cuando la capa ya se quitó de la página. Es el momento de devolver el foco.
   *
   * Antes no sirve: el `Modal` de React Native Web atrapa el foco mientras está
   * montado y, al desmontarse, intenta devolverlo a un elemento de dentro de la
   * capa —guarda el enfocado **después** de haberlo movido adentro—, que ya no
   * existe, así que el foco acaba en `<body>`. Comprobado en Chrome el
   * 2026-09-15.
   */
  alTerminarDeCerrar?: () => void;
  /**
   * `oscuro` para ventanas: se ve que lo de detrás no se puede tocar.
   * `transparente` para listas: la página sigue a la vista tal cual, y el telón
   * solo sirve para que un clic fuera cierre la lista.
   */
  telon?: 'oscuro' | 'transparente';
  children: ReactNode;
}) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={alCerrar}
      onDismiss={alTerminarDeCerrar}
    >
      <Pressable
        accessibilityLabel="Cerrar"
        onPress={alCerrar}
        style={[StyleSheet.absoluteFill, telon === 'oscuro' && estilos.telonOscuro]}
      />
      {children}
    </Modal>
  );
}

const estilos = StyleSheet.create({
  telonOscuro: { backgroundColor: Panel.telon },
});
