/**
 * Una fila del checklist: el ítem, su instructivo y el selector.
 *
 * Cuando el operador marca "Mal" la fila crece para pedir lo que el hallazgo
 * necesita — comentario y evidencia. No se abre un modal: perder de vista el
 * resto de la lista desorienta y obliga a un toque más para volver.
 */
import { memo } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { SelectorConformidad } from '@/components/ui/selector-conformidad';
import { Colors, Estado, Marca, Radio, Spacing, Texto, Toque } from '@/constants/theme';
import type { Conformidad, ItemChecklist } from '@/features/checklists/types';

interface Props {
  item: ItemChecklist;
  valor: Conformidad | null;
  comentario: string;
  cantidadFotos: number;
  onCambiarValor: (valor: Conformidad) => void;
  onCambiarComentario: (texto: string) => void;
  onTomarFoto: () => void;
}

export const FilaItem = memo(function FilaItem({
  item,
  valor,
  comentario,
  cantidadFotos,
  onCambiarValor,
  onCambiarComentario,
  onTomarFoto,
}: Props) {
  const esHallazgo = valor === 'no_conforme';
  const exigeFoto = esHallazgo && item.exigirFoto === 'no_conforme';

  return (
    <View style={[estilos.contenedor, esHallazgo && estilos.contenedorHallazgo]}>
      <View style={estilos.encabezado}>
        <Text style={estilos.label}>{item.label}</Text>
        {item.inmoviliza ? (
          <View style={estilos.insignia}>
            <Text style={estilos.insigniaTexto}>INMOVILIZA</Text>
          </View>
        ) : null}
      </View>

      {item.ayuda ? <Text style={estilos.ayuda}>{item.ayuda}</Text> : null}

      <SelectorConformidad valor={valor} onChange={onCambiarValor} inmoviliza={item.inmoviliza} />

      {esHallazgo ? (
        <View style={estilos.hallazgo}>
          <Text style={estilos.hallazgoTitulo}>
            {item.inmoviliza
              ? 'Este hallazgo deja el vehículo fuera de servicio. Describa qué encontró.'
              : '¿Qué encontró?'}
          </Text>
          <TextInput
            value={comentario}
            onChangeText={onCambiarComentario}
            placeholder="Describa el hallazgo"
            placeholderTextColor={Colors.light.textSecondary}
            multiline
            style={estilos.comentario}
          />
          {exigeFoto || cantidadFotos > 0 ? (
            <Pressable
              accessibilityRole="button"
              onPress={onTomarFoto}
              style={({ pressed }) => [
                estilos.botonFoto,
                cantidadFotos > 0 && estilos.botonFotoListo,
                pressed && estilos.presionado,
              ]}
            >
              <Text
                style={[
                  estilos.botonFotoTexto,
                  cantidadFotos > 0 && estilos.botonFotoTextoListo,
                ]}
              >
                {cantidadFotos === 0
                  ? 'Tomar foto de la evidencia'
                  : `${cantidadFotos} ${cantidadFotos === 1 ? 'foto tomada' : 'fotos tomadas'} · agregar otra`}
              </Text>
            </Pressable>
          ) : null}
        </View>
      ) : null}
    </View>
  );
});

const estilos = StyleSheet.create({
  contenedor: {
    paddingVertical: Spacing.three,
    paddingHorizontal: Spacing.three,
    gap: Spacing.two,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.light.backgroundSelected,
    backgroundColor: Colors.light.background,
  },
  contenedorHallazgo: {
    backgroundColor: Estado.noConformeFondo,
  },
  encabezado: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.two,
  },
  label: {
    flex: 1,
    fontSize: Texto.etiqueta,
    fontWeight: '600',
    color: Colors.light.text,
  },
  insignia: {
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.one,
    borderRadius: Radio.pastilla,
    backgroundColor: Marca.critico,
  },
  insigniaTexto: {
    fontSize: Texto.pie,
    fontWeight: '800',
    letterSpacing: 0.5,
    color: Marca.sobreColor,
  },
  ayuda: {
    fontSize: Texto.pie,
    lineHeight: 21,
    color: Colors.light.textSecondary,
  },
  hallazgo: {
    gap: Spacing.two,
    paddingTop: Spacing.one,
  },
  hallazgoTitulo: {
    fontSize: Texto.pie,
    fontWeight: '600',
    color: Estado.noConforme,
  },
  comentario: {
    minHeight: 88,
    padding: Spacing.three,
    borderRadius: Radio.md,
    borderWidth: 1,
    borderColor: Estado.noConforme,
    backgroundColor: Colors.light.background,
    fontSize: Texto.base,
    color: Colors.light.text,
    textAlignVertical: 'top',
  },
  botonFoto: {
    minHeight: Toque.minimo,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.three,
    borderRadius: Radio.md,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: Estado.atencion,
    backgroundColor: Estado.atencionFondo,
  },
  botonFotoListo: {
    borderStyle: 'solid',
    borderColor: Estado.conforme,
    backgroundColor: Estado.conformeFondo,
  },
  botonFotoTexto: {
    fontSize: Texto.pie,
    fontWeight: '700',
    color: Estado.atencion,
    textAlign: 'center',
  },
  botonFotoTextoListo: {
    color: Estado.conforme,
  },
  presionado: {
    opacity: 0.7,
  },
});
