/**
 * La navegación del panel.
 *
 * Sustituye al encabezado del `Stack` en vez de vivir dentro de cada pantalla:
 * el residente salta entre obras, personas, vehículos y asignaciones todo el
 * rato —registrar una máquina y asignarla son un solo gesto mental— y esconder
 * eso detrás de un botón de volver convierte cada salto en dos.
 *
 * A la derecha va quién está dentro y con qué cargo. No es decoración: en un
 * computador compartido de obra, saber con qué cuenta se está trabajando evita
 * que alguien registre algo a nombre de otro sin darse cuenta.
 */
import { Link, usePathname } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Colors, Marca, MaxContentWidthPanel, Radio, Spacing, Texto } from '@/constants/theme';

import { ETIQUETA_ROL } from './contratos';
import PantallaCambiarClave from './pantalla-cambiar-clave';
import { useSesionPanel } from './sesion';

const ENLACES = [
  { ruta: '/panel', titulo: 'Inicio' },
  { ruta: '/panel/obras', titulo: 'Obras' },
  { ruta: '/panel/personas', titulo: 'Personas' },
  { ruta: '/panel/vehiculos', titulo: 'Vehículos' },
  { ruta: '/panel/asignaciones', titulo: 'Asignaciones' },
] as const;

export function BarraNavegacion() {
  const rutaActual = usePathname();
  const { persona, salir } = useSesionPanel();
  const [cambiando, setCambiando] = useState(false);

  if (cambiando) return <PantallaCambiarClave onCancelar={() => setCambiando(false)} />;

  return (
    <View style={estilos.barra}>
      <View style={estilos.contenido}>
        <Text style={estilos.marca}>PreOpera OCC</Text>

        <View style={estilos.enlaces}>
          {ENLACES.map((enlace) => {
            const activo = rutaActual === enlace.ruta;
            return (
              <Link key={enlace.ruta} href={enlace.ruta} style={estilos.enlaceCaja}>
                <Text style={[estilos.enlace, activo && estilos.enlaceActivo]}>{enlace.titulo}</Text>
              </Link>
            );
          })}
        </View>

        <View style={estilos.cuenta}>
          {persona ? (
            <Pressable onPress={() => setCambiando(true)} style={estilos.enlaceCaja}>
              <Text style={estilos.nombre} numberOfLines={1}>
                {persona.nombreCompleto}
              </Text>
              <Text style={estilos.cargo}>{ETIQUETA_ROL[persona.rol]}</Text>
            </Pressable>
          ) : null}
          <Pressable onPress={salir} style={[estilos.enlaceCaja, estilos.salir]}>
            <Text style={estilos.enlace}>Salir</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

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
  marca: { fontSize: Texto.etiqueta, fontWeight: '800', color: Colors.light.background },
  enlaces: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: Spacing.one,
  },
  cuenta: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  enlaceCaja: {
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderRadius: Radio.sm,
  },
  enlace: { fontSize: Texto.pie, fontWeight: '600', color: Colors.light.background, opacity: 0.85 },
  enlaceActivo: { opacity: 1, textDecorationLine: 'underline' },
  nombre: { fontSize: Texto.pie, fontWeight: '700', color: Colors.light.background },
  cargo: { fontSize: Texto.pie, color: Colors.light.background, opacity: 0.8 },
  salir: { borderWidth: 1, borderColor: Colors.light.background },
});
