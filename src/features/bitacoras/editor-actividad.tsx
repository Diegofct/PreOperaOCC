/**
 * Una actividad de la bitácora: qué hizo la máquina, descrito y observado.
 *
 * Normalmente hay una sola por día. La segunda existe para el día en que la
 * retro excavó en la mañana y cargó en la tarde — es la excepción, y por eso
 * vive detrás de un botón en vez de ocupar espacio siempre.
 */
import * as Haptics from 'expo-haptics';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { Colors, Estado, Marca, Radio, Spacing, Texto, Toque } from '@/constants/theme';

import { actividadesDe, CLAVE_OTRA, esImproductiva } from './actividades';

export interface BorradorActividad {
  id: string;
  clave: string | null;
  texto: string;
  descripcion: string;
  observaciones: string;
}

interface Props {
  actividad: BorradorActividad;
  tipoVehiculo: string;
  indice: number;
  puedeQuitar: boolean;
  onCambiar: (cambios: Partial<BorradorActividad>) => void;
  onQuitar: () => void;
}

export function EditorActividad({
  actividad,
  tipoVehiculo,
  indice,
  puedeQuitar,
  onCambiar,
  onQuitar,
}: Props) {
  const opciones = actividadesDe(tipoVehiculo);

  // La descripción no se exige siempre: la actividad ya dice qué hizo. Se exige
  // cuando el registro no se explica solo — "otra", y las horas en que la
  // máquina no produjo, que son justo las que alguien va a cuestionar después.
  const exigeDescripcion =
    actividad.clave === CLAVE_OTRA || (actividad.clave != null && esImproductiva(actividad.clave));

  return (
    <View style={estilos.bloque}>
      <View style={estilos.encabezado}>
        <Text style={estilos.titulo}>
          {indice === 0 ? 'Actividad' : `Actividad ${indice + 1}`}
        </Text>
        {puedeQuitar ? (
          <Pressable
            accessibilityRole="button"
            onPress={onQuitar}
            style={({ pressed }) => [estilos.quitar, pressed && estilos.presionado]}
          >
            <Text style={estilos.quitarTexto}>Quitar</Text>
          </Pressable>
        ) : null}
      </View>

      <View style={estilos.pastillas}>
        {opciones.map((opcion) => {
          const activa = actividad.clave === opcion.clave;
          return (
            <Pressable
              key={opcion.clave}
              accessibilityRole="button"
              accessibilityState={{ selected: activa }}
              onPress={() => {
                void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                onCambiar({ clave: opcion.clave });
              }}
              style={({ pressed }) => [
                estilos.pastilla,
                activa && estilos.pastillaActiva,
                pressed && estilos.presionado,
              ]}
            >
              <Text style={[estilos.pastillaTexto, activa && estilos.pastillaTextoActivo]}>
                {opcion.nombre}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {actividad.clave === CLAVE_OTRA ? (
        <TextInput
          value={actividad.texto}
          onChangeText={(texto) => onCambiar({ texto })}
          placeholder="¿Cuál actividad?"
          placeholderTextColor={Colors.light.textSecondary}
          style={estilos.campo}
        />
      ) : null}

      <Text style={estilos.etiqueta}>
        Descripción {exigeDescripcion ? '' : '(si hay algo que contar)'}
      </Text>
      <TextInput
        value={actividad.descripcion}
        onChangeText={(descripcion) => onCambiar({ descripcion })}
        placeholder="Qué hizo la máquina"
        placeholderTextColor={Colors.light.textSecondary}
        multiline
        style={[estilos.campo, estilos.campoLargo]}
      />

      <Text style={estilos.etiqueta}>Observaciones (opcional)</Text>
      <TextInput
        value={actividad.observaciones}
        onChangeText={(observaciones) => onCambiar({ observaciones })}
        placeholder="Novedades, demoras, algo fuera de lo normal"
        placeholderTextColor={Colors.light.textSecondary}
        multiline
        style={[estilos.campo, estilos.campoLargo]}
      />
    </View>
  );
}

const estilos = StyleSheet.create({
  bloque: {
    gap: Spacing.two,
    padding: Spacing.three,
    borderRadius: Radio.lg,
    backgroundColor: Colors.light.backgroundElement,
  },
  encabezado: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  titulo: { fontSize: Texto.etiqueta, fontWeight: '800', color: Colors.light.text },
  quitar: {
    minHeight: Toque.icono,
    paddingHorizontal: Spacing.two,
    justifyContent: 'center',
  },
  quitarTexto: { fontSize: Texto.base, fontWeight: '700', color: Estado.noConforme },
  etiqueta: { fontSize: Texto.pie, fontWeight: '700', color: Colors.light.textSecondary },
  pastillas: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
  pastilla: {
    minHeight: Toque.minimo,
    justifyContent: 'center',
    paddingHorizontal: Spacing.three,
    borderRadius: Radio.pastilla,
    borderWidth: 2,
    borderColor: Colors.light.backgroundSelected,
    backgroundColor: Colors.light.background,
  },
  pastillaActiva: { borderColor: Marca.primario, backgroundColor: Estado.infoFondo },
  pastillaTexto: { fontSize: Texto.base, fontWeight: '600', color: Colors.light.text },
  pastillaTextoActivo: { color: Marca.primarioTexto, fontWeight: '800' },
  campo: {
    minHeight: Toque.minimo,
    padding: Spacing.three,
    borderRadius: Radio.md,
    borderWidth: 2,
    borderColor: Colors.light.backgroundSelected,
    backgroundColor: Colors.light.background,
    fontSize: Texto.base,
    color: Colors.light.text,
  },
  campoLargo: { minHeight: 80, textAlignVertical: 'top' },
  presionado: { opacity: 0.7 },
});
