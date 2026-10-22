/**
 * El campo para preguntar al asistente (spec 028, cambio del 2026-10-22), a la manera de
 * los chats de IA: un recuadro redondeado con el texto, los adjuntos como pastillas encima
 * y, dentro del mismo recuadro, el botón de adjuntar y el de enviar (RF-76).
 *
 *  · Mientras se redacta una respuesta, enviar pasa a detener (RF-77).
 *  · Enter envía y Mayús + Enter salta de línea (RF-78). En la web, con `onKeyPress`:
 *    `onSubmitEditing` no llega en un área de texto.
 *  · El texto crece con lo que se escribe hasta 8 renglones; de ahí en adelante, se desplaza.
 *  · Debajo, lo que queda del día (RF-51) y lo que falte en los adjuntos (RF-67).
 */
import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View, type NativeSyntheticEvent, type TextInputKeyPressEventData } from 'react-native';

import { Estado, FuentePanel, Panel, Radio, Sombra, Spacing, TextoPanel } from '@/constants/theme';
import type { CupoDelAsistente } from '@/features/panel/contratos';
import { Icono } from '@/features/panel/iconos';

const RENGLON = 21;
const RENGLONES_MAXIMOS = 8;

interface Props {
  valor: string;
  onChange: (texto: string) => void;
  onEnviar: () => void;
  onDetener: () => void;
  onAdjuntar: () => void;
  archivos: File[];
  onQuitarArchivo: (indice: number) => void;
  /** Hay una respuesta en camino: enviar pasa a detener. */
  enCurso: boolean;
  /** Lo que impide enviar aunque haya texto: sin cupo o adjuntos que no sirven. */
  bloqueado: boolean;
  cupo: CupoDelAsistente | null;
  faltasDeArchivos: string[];
  placeholder: string;
  autoFocus?: boolean;
}

/** En la web, `nativeEvent` es el `KeyboardEvent` del navegador, con `shiftKey` e `isComposing`. */
type TeclaDelNavegador = TextInputKeyPressEventData & { shiftKey?: boolean; isComposing?: boolean };

export function CampoDePregunta({
  valor,
  onChange,
  onEnviar,
  onDetener,
  onAdjuntar,
  archivos,
  onQuitarArchivo,
  enCurso,
  bloqueado,
  cupo,
  faltasDeArchivos,
  placeholder,
  autoFocus,
}: Props) {
  const [alto, setAlto] = useState(RENGLON);
  const [enfocado, setEnfocado] = useState(false);
  const puedeEnviar = !enCurso && !bloqueado && (valor.trim().length > 0 || archivos.length > 0);
  const sinCupo = cupo !== null && cupo.quedan === 0;

  function alPulsarTecla(e: NativeSyntheticEvent<TextInputKeyPressEventData>) {
    const tecla = e.nativeEvent as TeclaDelNavegador;
    // Mientras se compone una letra con tilde (o en un teclado de otro idioma), Enter
    // confirma la letra, no la pregunta.
    if (tecla.key !== 'Enter' || tecla.shiftKey || tecla.isComposing) return;
    e.preventDefault();
    if (puedeEnviar) onEnviar();
  }

  return (
    <View style={estilos.contenedor}>
      <View style={[estilos.recuadro, enfocado && estilos.recuadroEnfocado]}>
        {archivos.length > 0 ? (
          <View style={estilos.adjuntos}>
            {archivos.map((a, j) => (
              <View key={`${a.name}-${j}`} style={estilos.adjunto}>
                <Text style={estilos.textoAdjunto} numberOfLines={1}>{`📎 ${a.name} · ${pesoLegible(a.size)}`}</Text>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`Quitar ${a.name}`}
                  onPress={() => onQuitarArchivo(j)}
                  disabled={enCurso}
                >
                  <Text style={estilos.quitar}>✕</Text>
                </Pressable>
              </View>
            ))}
          </View>
        ) : null}

        <TextInput
          value={valor}
          onChangeText={onChange}
          onKeyPress={alPulsarTecla}
          multiline
          autoFocus={autoFocus}
          placeholder={placeholder}
          placeholderTextColor={Panel.textoApoyo}
          accessibilityLabel="Su pregunta"
          onFocus={() => setEnfocado(true)}
          onBlur={() => setEnfocado(false)}
          onContentSizeChange={(e) => setAlto(Math.min(RENGLON * RENGLONES_MAXIMOS, Math.max(RENGLON, e.nativeEvent.contentSize.height)))}
          style={[estilos.texto, { height: alto }]}
        />

        <View style={estilos.botones}>
          <BotonRedondo
            icono="adjuntar"
            etiqueta="Adjuntar fotos, PDF, Excel o Word"
            onPress={onAdjuntar}
            deshabilitado={enCurso}
            tono="suave"
          />
          {enCurso ? (
            <BotonRedondo icono="detener" etiqueta="Detener la respuesta" onPress={onDetener} tono="fuerte" />
          ) : (
            <BotonRedondo icono="enviar" etiqueta="Enviar la pregunta" onPress={onEnviar} deshabilitado={!puedeEnviar} tono="fuerte" />
          )}
        </View>
      </View>

      {faltasDeArchivos.length > 0 ? (
        <Text style={estilos.falta} accessibilityRole="alert">
          {faltasDeArchivos.join('\n')}
        </Text>
      ) : null}
      {cupo ? (
        <Text style={[estilos.nota, sinCupo && estilos.notaAgotada]}>
          {sinCupo
            ? `Ya hizo sus ${cupo.limite} preguntas de hoy. Podrá preguntar de nuevo mañana.`
            : `Le quedan ${cupo.quedan} de ${cupo.limite} preguntas hoy. Puede adjuntar hasta 5 archivos de 10 MB; el asistente los lee, pero no guarda nada de ellos en los módulos.`}
        </Text>
      ) : null}
    </View>
  );
}

function BotonRedondo({
  icono,
  etiqueta,
  onPress,
  deshabilitado,
  tono,
}: {
  icono: 'adjuntar' | 'enviar' | 'detener';
  etiqueta: string;
  onPress: () => void;
  deshabilitado?: boolean;
  tono: 'suave' | 'fuerte';
}) {
  const fuerte = tono === 'fuerte';
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={etiqueta}
      accessibilityState={{ disabled: Boolean(deshabilitado) }}
      // El texto al pasar el cursor: el ícono solo no dice qué hace.
      {...({ title: etiqueta } as object)}
      onPress={onPress}
      disabled={deshabilitado}
      style={({ hovered, pressed }) => [
        estilos.boton,
        fuerte ? estilos.botonFuerte : estilos.botonSuave,
        hovered && !deshabilitado && (fuerte ? estilos.botonFuerteEncima : estilos.botonSuaveEncima),
        pressed && fuerte && estilos.botonFuerteEncima,
        deshabilitado && estilos.botonApagado,
      ]}
    >
      <Icono nombre={icono} color={fuerte ? Panel.sobreAccion : Panel.texto} tamano={18} />
    </Pressable>
  );
}

const pesoLegible = (bytes: number) =>
  bytes < 1024 * 1024 ? `${Math.max(1, Math.round(bytes / 1024))} KB` : `${(bytes / 1024 / 1024).toFixed(1).replace('.', ',')} MB`;

const estilos = StyleSheet.create({
  contenedor: { width: '100%', gap: Spacing.two },
  recuadro: {
    gap: Spacing.two,
    paddingTop: Spacing.three,
    paddingBottom: Spacing.two,
    paddingHorizontal: Spacing.three,
    borderRadius: Radio.lg + Spacing.one,
    borderWidth: 1,
    borderColor: Panel.bordeSuave,
    backgroundColor: Panel.superficie,
    boxShadow: Sombra.elevada,
  },
  recuadroEnfocado: { borderColor: Panel.borde },
  texto: {
    fontFamily: FuentePanel.texto,
    fontSize: TextoPanel.cuerpo,
    lineHeight: RENGLON,
    color: Panel.texto,
    padding: 0,
    // El recuadro ya dice dónde se escribe; el anillo del navegador sobra.
    outlineWidth: 0,
    // Con `outline-style: auto`, Chrome dibuja su anillo aunque el ancho sea 0. React Native
    // web acepta `none`, pero los tipos de React Native no lo listan.
    outlineStyle: 'none' as 'solid',
  },
  botones: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  boton: { width: 34, height: 34, borderRadius: Radio.pastilla, alignItems: 'center', justifyContent: 'center' },
  botonSuave: { borderWidth: 1, borderColor: Panel.bordeSuave, backgroundColor: Panel.superficie },
  botonSuaveEncima: { backgroundColor: Panel.fondoHover },
  botonFuerte: { backgroundColor: Panel.accion },
  botonFuerteEncima: { backgroundColor: Panel.accionPresionada },
  botonApagado: { opacity: 0.35 },
  adjuntos: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
  adjunto: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    maxWidth: 320,
    paddingVertical: Spacing.one,
    paddingHorizontal: Spacing.two,
    borderRadius: Radio.pastilla,
    borderWidth: 1,
    borderColor: Panel.borde,
    backgroundColor: Panel.fondoAlterno,
  },
  textoAdjunto: { flexShrink: 1, fontFamily: FuentePanel.texto, fontSize: TextoPanel.apoyo, color: Panel.texto },
  quitar: { fontFamily: FuentePanel.texto, fontSize: TextoPanel.cuerpo, color: Panel.textoApoyo, paddingHorizontal: Spacing.one },
  falta: { fontFamily: FuentePanel.texto, fontSize: TextoPanel.apoyo, color: Estado.noConforme, paddingHorizontal: Spacing.three },
  nota: {
    fontFamily: FuentePanel.texto,
    fontSize: TextoPanel.micro,
    color: Panel.textoApoyo,
    textAlign: 'center',
    paddingHorizontal: Spacing.three,
  },
  notaAgotada: { color: Panel.texto, fontWeight: '600' },
});
