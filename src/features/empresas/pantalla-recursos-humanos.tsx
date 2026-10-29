/**
 * Recursos Humanos de Elemental (cambio del 2026-10-27, RF-13; spec 035, RF-1).
 *
 *  · Personal (spec 035): todo el personal del grupo, con su ficha, sus documentos y sus
 *    avisos. Es lo propio del módulo, así que abre primero.
 *  · Personas y accesos: la pantalla de siempre, donde se registra a una persona y se le
 *    da o se le quita el acceso al panel y al celular (RF-14).
 *  · Obras, como hoy.
 *
 * La pestaña queda en la dirección (`?pestana=obras`), como en Reportes: así la dirección
 * de antes de Obras llega a su pestaña (RF-47).
 */
import { StyleSheet, View } from 'react-native';

import { Panel, Spacing } from '@/constants/theme';
import { Acciones, Boton } from '@/features/panel/componentes';
import PantallaObras from '@/features/panel/pantalla-obras';
import PantallaPersonas from '@/features/panel/pantalla-personas';
import { useParametroDeDireccion } from '@/features/panel/usar-parametro-direccion';
import PantallaPersonal from '@/features/rrhh/pantalla-personal';

const PESTANAS = [
  { clave: 'personal', titulo: 'Personal' },
  { clave: 'personas', titulo: 'Personas y accesos' },
  { clave: 'obras', titulo: 'Obras' },
] as const;

export function PantallaRecursosHumanos() {
  const [pestana, setPestana] = useParametroDeDireccion('pestana', 'personal');

  return (
    <View style={estilos.pantalla}>
      <View style={estilos.pestanas}>
        <Acciones>
          {PESTANAS.map((p) => (
            <Boton
              key={p.clave}
              titulo={p.titulo}
              tono={pestana === p.clave ? 'primario' : 'secundario'}
              onPress={() => setPestana(p.clave)}
            />
          ))}
        </Acciones>
      </View>
      {pestana === 'obras' ? <PantallaObras /> : pestana === 'personas' ? <PantallaPersonas /> : <PantallaPersonal />}
    </View>
  );
}

const estilos = StyleSheet.create({
  pantalla: { flex: 1, backgroundColor: Panel.fondo },
  // Con el mismo margen que el marco de la pantalla de debajo, para que se lean juntos.
  pestanas: { paddingHorizontal: Spacing.four, paddingTop: Spacing.four },
});
