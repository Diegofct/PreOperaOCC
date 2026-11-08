/**
 * Recursos Humanos de Elemental (cambio del 2026-10-27, RF-13; spec 035, RF-1).
 *
 *  · Personal (spec 035): todo el personal del grupo, con su ficha, sus documentos y sus
 *    avisos. Es lo propio del módulo, así que abre primero.
 *  · Accesos y contraseñas (antes «Personas y accesos»; spec 039, RF-27): la pantalla de
 *    siempre, con todo el personal del grupo, donde se registra a una persona y se le da o
 *    se le quita el acceso al panel y al celular (RF-14).
 *  · Obras, como hoy.
 *
 * La pestaña queda en la dirección (`?pestana=obras`), como en Reportes: así la dirección
 * de antes de Obras llega a su pestaña (RF-47).
 *
 * Dentro de una obra (spec 041) hay dos pestañas: Personal y Accesos. El Residente, el Director
 * de Obra y el Director de Proyectos no entran a Elemental, así que sin esta pestaña no tendrían
 * dónde dar los accesos de obra que les da la tabla de permisos (RF-12, RF-26).
 */
import { StyleSheet, View } from 'react-native';

import { Panel, Spacing } from '@/constants/theme';
import { Acciones, Boton } from '@/features/panel/componentes';
import PantallaObras from '@/features/panel/pantalla-obras';
import PantallaPersonas from '@/features/panel/pantalla-personas';
import { usePersona } from '@/features/panel/sesion';
import { useParametroDeDireccion } from '@/features/panel/usar-parametro-direccion';
import PantallaPersonal from '@/features/rrhh/pantalla-personal';
import { alcanza } from '@/shared/rules/permisos';

const PESTANAS = [
  { clave: 'personal', titulo: 'Personal' },
  { clave: 'personas', titulo: 'Accesos y contraseñas' },
  { clave: 'obras', titulo: 'Obras' },
] as const;

const PESTANAS_DE_OBRA = [
  { clave: 'personal', titulo: 'Personal' },
  { clave: 'personas', titulo: 'Accesos' },
] as const;

function BarraDePestanas({
  pestanas,
  actual,
  onCambiar,
}: {
  pestanas: readonly { clave: string; titulo: string }[];
  actual: string;
  onCambiar: (clave: string) => void;
}) {
  return (
    <View style={estilos.pestanas}>
      <Acciones>
        {pestanas.map((p) => (
          <Boton
            key={p.clave}
            titulo={p.titulo}
            tono={actual === p.clave ? 'primario' : 'secundario'}
            onPress={() => onCambiar(p.clave)}
          />
        ))}
      </Acciones>
    </View>
  );
}

export function PantallaRecursosHumanos() {
  const [pestana, setPestana] = useParametroDeDireccion('pestana', 'personal');

  return (
    <View style={estilos.pantalla}>
      <BarraDePestanas pestanas={PESTANAS} actual={pestana} onCambiar={setPestana} />
      {pestana === 'obras' ? <PantallaObras /> : pestana === 'personas' ? <PantallaPersonas /> : <PantallaPersonal />}
    </View>
  );
}

/** Recursos Humanos de una obra: el personal y, a quien los da, los accesos (spec 041). */
export function PantallaRecursosHumanosDeObra() {
  const persona = usePersona();
  const [pestana, setPestana] = useParametroDeDireccion('pestana', 'personal');

  if (!alcanza(persona.rol, 'personas', 'ver')) return <PantallaPersonal />;

  return (
    <View style={estilos.pantalla}>
      <BarraDePestanas pestanas={PESTANAS_DE_OBRA} actual={pestana} onCambiar={setPestana} />
      {pestana === 'personas' ? <PantallaPersonas /> : <PantallaPersonal />}
    </View>
  );
}

const estilos = StyleSheet.create({
  pantalla: { flex: 1, backgroundColor: Panel.fondo },
  // Con el mismo margen que el marco de la pantalla de debajo, para que se lean juntos.
  pestanas: { paddingHorizontal: Spacing.four, paddingTop: Spacing.four },
});
