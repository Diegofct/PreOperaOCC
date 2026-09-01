/**
 * Captura de horómetro y odómetro.
 *
 * A pantalla completa y con el teclado grande, nunca con el del sistema. Es el
 * único dato numérico libre de todo el preoperacional y el más caro de
 * equivocar: un "12400" donde iban "1240" dispara de golpe todos los
 * mantenimientos preventivos del vehículo.
 *
 * Por eso la lectura anterior se muestra del mismo tamaño que lo que el
 * operador está tecleando: comparar las dos cifras tiene que ser inmediato.
 */
import { useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import { TecladoNumerico } from '@/components/ui/teclado-numerico';
import { Colors, Estado, Marca, Radio, Spacing, Texto, Toque } from '@/constants/theme';

const MAXIMO_DIGITOS = 8;

interface Props {
  visible: boolean;
  titulo: string;
  unidad: string;
  anterior: number | null;
  valorInicial: string;
  onCancelar: () => void;
  onConfirmar: (valor: string) => void;
}

/**
 * El medidor dentro de su propio modal. Para pantallas normales.
 *
 * Si ya está dentro de otro modal — la entrada de bitácora — use `PanelMedidor`
 * directamente: anidar modales en Android es inestable, el interior puede
 * quedar detrás del exterior o no aparecer.
 */
export function CapturarMedidor({ visible, onCancelar, ...resto }: Props) {
  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onCancelar}>
      {/*
        El panel solo existe mientras el modal está abierto: al reabrirlo se
        monta de nuevo y arranca de lo que hay guardado, no de lo que se tecleó
        la vez anterior. Es lo mismo que haría un efecto de reinicio, sin el
        render de más.
      */}
      {visible ? <PanelMedidor onCancelar={onCancelar} {...resto} /> : null}
    </Modal>
  );
}

export function PanelMedidor({
  titulo,
  unidad,
  anterior,
  valorInicial,
  onCancelar,
  onConfirmar,
}: Omit<Props, 'visible'>) {
  const [valor, setValor] = useState(valorInicial);

  const numero = valor ? Number(valor) : null;
  const retrocede = numero != null && anterior != null && numero < anterior;

  return (
    <View style={estilos.pantalla}>
      <View style={estilos.cabecera}>
        <Text style={estilos.titulo}>{titulo}</Text>
        {anterior != null ? (
          <Text style={estilos.anterior}>
            Último registro: {anterior.toLocaleString('es-CO')} {unidad}
          </Text>
        ) : (
          <Text style={estilos.anterior}>Sin registro anterior en este equipo.</Text>
        )}
      </View>

      <View style={estilos.visor}>
        <Text style={[estilos.cifra, retrocede && estilos.cifraMal]}>
          {numero != null ? numero.toLocaleString('es-CO') : '—'}
        </Text>
        <Text style={estilos.unidad}>{unidad}</Text>
      </View>

      <Text style={estilos.aviso}>
        {retrocede
          ? `El medidor no puede ir para atrás. El último registro fue ${anterior?.toLocaleString('es-CO')} ${unidad}.`
          : ' '}
      </Text>

      <TecladoNumerico
        onDigito={(digito) =>
          setValor((previo) => {
            const siguiente = (previo + digito).replace(/^0+(?=\d)/, '');
            return siguiente.length > MAXIMO_DIGITOS ? previo : siguiente;
          })
        }
        onBorrar={() => setValor((previo) => previo.slice(0, -1))}
      />

      <View style={estilos.acciones}>
        <Pressable
          accessibilityRole="button"
          onPress={onCancelar}
          style={({ pressed }) => [
            estilos.boton,
            estilos.botonSecundario,
            pressed && estilos.presionado,
          ]}
        >
          <Text style={estilos.botonSecundarioTexto}>Cancelar</Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          onPress={() => onConfirmar(valor)}
          disabled={valor.length === 0}
          style={({ pressed }) => [
            estilos.boton,
            estilos.botonPrimario,
            pressed && estilos.presionado,
            valor.length === 0 && estilos.deshabilitado,
          ]}
        >
          <Text style={estilos.botonPrimarioTexto}>Confirmar</Text>
        </Pressable>
      </View>
    </View>
  );
}

const estilos = StyleSheet.create({
  pantalla: {
    flex: 1,
    padding: Spacing.three,
    paddingTop: Spacing.six,
    gap: Spacing.three,
    backgroundColor: Colors.light.background,
  },
  cabecera: { gap: Spacing.half },
  titulo: {
    fontSize: Texto.titulo,
    fontWeight: '800',
    color: Colors.light.text,
  },
  anterior: { fontSize: Texto.base, color: Colors.light.textSecondary },
  visor: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'center',
    gap: Spacing.two,
    paddingVertical: Spacing.four,
    borderRadius: Radio.lg,
    backgroundColor: Colors.light.backgroundElement,
  },
  cifra: { fontSize: 44, fontWeight: '800', color: Colors.light.text },
  cifraMal: { color: Estado.noConforme },
  unidad: {
    fontSize: Texto.etiqueta,
    fontWeight: '700',
    color: Colors.light.textSecondary,
  },
  aviso: {
    minHeight: 44,
    fontSize: Texto.pie,
    fontWeight: '600',
    lineHeight: 21,
    color: Estado.noConforme,
    textAlign: 'center',
  },
  acciones: {
    flexDirection: 'row',
    gap: Spacing.three,
    paddingBottom: Spacing.three,
  },
  boton: {
    flex: 1,
    minHeight: Toque.primario,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Radio.lg,
  },
  botonPrimario: { flex: 2, backgroundColor: Marca.primario },
  botonPrimarioTexto: {
    fontSize: Texto.etiqueta,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  botonSecundario: { backgroundColor: Colors.light.backgroundElement },
  botonSecundarioTexto: {
    fontSize: Texto.etiqueta,
    fontWeight: '700',
    color: Estado.na,
  },
  presionado: { opacity: 0.7 },
  deshabilitado: { opacity: 0.4 },
});
