/**
 * Las acciones debajo de cada respuesta del asistente (spec 028, RF-80): copiar el texto,
 * descargar en PDF (RF-24) y, en la que falló, reintentar (RF-62).
 *
 * Son botones de ícono, como en los chats de IA, pero cada uno lleva su nombre para el
 * lector de pantalla y como texto al pasar el cursor. «Reintentar» lleva además el nombre
 * a la vista: es lo único que se puede hacer con una respuesta que falló.
 */
import { useEffect, useRef, useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';

import { FuentePanel, Panel, Radio, Spacing, TextoPanel } from '@/constants/theme';
import { Icono, type NombreDeIcono } from '@/features/panel/iconos';

/** Lo que dura a la vista el «Copiado». */
const MOSTRAR_COPIADO_MS = 2000;

export function AccionesDeRespuesta({
  cuando,
  texto,
  onPdf,
  onReintentar,
  deshabilitado,
}: {
  cuando: string;
  /** El texto de la respuesta, tal como llegó (con su markdown). Sin él no se ofrece copiar. */
  texto?: string;
  onPdf?: () => void;
  onReintentar?: () => void;
  deshabilitado?: boolean;
}) {
  const [copiado, setCopiado] = useState(false);
  const espera = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => (espera.current ? clearTimeout(espera.current) : undefined), []);

  async function copiar() {
    if (!texto || Platform.OS !== 'web') return;
    if (!(await escribirEnElPortapapeles(texto))) return;
    setCopiado(true);
    if (espera.current) clearTimeout(espera.current);
    espera.current = setTimeout(() => setCopiado(false), MOSTRAR_COPIADO_MS);
  }

  return (
    <View style={estilos.fila}>
      {texto ? (
        <BotonDeAccion icono={copiado ? 'listo' : 'copiar'} etiqueta={copiado ? 'Copiado' : 'Copiar el texto'} onPress={copiar} />
      ) : null}
      {copiado ? (
        <Text style={estilos.nota} accessibilityLiveRegion="polite">
          Copiado
        </Text>
      ) : null}
      {onPdf ? <BotonDeAccion icono="pdf" etiqueta="Descargar en PDF" onPress={onPdf} /> : null}
      {onReintentar ? (
        <BotonDeAccion icono="reintentar" etiqueta="Reintentar" conTexto onPress={onReintentar} deshabilitado={deshabilitado} />
      ) : null}
      <Text style={estilos.nota}>{cuando}</Text>
    </View>
  );
}

/**
 * Copia con la API del portapapeles y, si el navegador la niega (sin conexión segura, o con
 * el permiso del portapapeles bloqueado para el sitio), con la forma vieja: un área de
 * texto oculta y `execCommand('copy')`, que solo pide que el clic sea de la persona.
 */
async function escribirEnElPortapapeles(texto: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(texto);
    return true;
  } catch {
    const area = document.createElement('textarea');
    area.value = texto;
    area.setAttribute('readonly', '');
    area.style.position = 'fixed';
    area.style.opacity = '0';
    document.body.appendChild(area);
    area.select();
    try {
      return document.execCommand('copy');
    } catch {
      return false;
    } finally {
      area.remove();
    }
  }
}

function BotonDeAccion({
  icono,
  etiqueta,
  onPress,
  conTexto,
  deshabilitado,
}: {
  icono: NombreDeIcono;
  etiqueta: string;
  onPress: () => void;
  conTexto?: boolean;
  deshabilitado?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={etiqueta}
      accessibilityState={{ disabled: Boolean(deshabilitado) }}
      {...({ title: etiqueta } as object)}
      onPress={onPress}
      disabled={deshabilitado}
      style={({ hovered }) => [
        estilos.boton,
        conTexto && estilos.botonConTexto,
        hovered && !deshabilitado && estilos.botonEncima,
        deshabilitado && estilos.botonApagado,
      ]}
    >
      <Icono nombre={icono} color={Panel.textoApoyo} tamano={16} />
      {conTexto ? <Text style={estilos.textoBoton}>{etiqueta}</Text> : null}
    </Pressable>
  );
}

const estilos = StyleSheet.create({
  fila: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: Spacing.one },
  boton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.one,
    minWidth: 30,
    height: 30,
    borderRadius: Radio.sm,
  },
  botonConTexto: { paddingHorizontal: Spacing.two, borderWidth: 1, borderColor: Panel.bordeSuave, backgroundColor: Panel.superficie },
  botonEncima: { backgroundColor: Panel.fondoHover },
  botonApagado: { opacity: 0.35 },
  textoBoton: { fontFamily: FuentePanel.texto, fontSize: TextoPanel.apoyo, color: Panel.texto },
  nota: { fontFamily: FuentePanel.texto, fontSize: TextoPanel.micro, color: Panel.textoApoyo, paddingHorizontal: Spacing.one },
});
