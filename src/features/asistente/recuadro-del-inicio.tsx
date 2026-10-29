/**
 * El asistente en el Inicio (spec 028, RF-73): un recuadro para escribir la pregunta, que
 * abre la conversación con ella ya enviada, y las últimas conversaciones de quien mira.
 *
 * La pregunta viaja en la dirección (`/panel/asistente?pregunta=…`) y el asistente la manda
 * al abrir. Con navegación completa, como las fuentes: el asistente lee la dirección al
 * montar (`useParametroDeDireccion`).
 */
import { useCallback, useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';

import { FuentePanel, Panel, Radio, Spacing, TextoPanel } from '@/constants/theme';
import { useObraDeLaRuta } from '@/features/empresas/contexto-empresa';
import { api } from '@/features/panel/cliente-api';
import { Acciones, Boton, Campo, Seccion } from '@/features/panel/componentes';
import { useListado } from '@/features/panel/marco';
import { rutaDeObra } from '@/shared/rules/empresas';

const ULTIMAS = 3;

function ir(ruta: string) {
  if (Platform.OS === 'web' && typeof window !== 'undefined') window.location.assign(ruta);
}

const cuando = (iso: string) =>
  new Date(iso).toLocaleString('es-CO', { timeZone: 'America/Bogota', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' });

export function RecuadroDelAsistente() {
  // Spec 033, RF-30: en la portada de una obra, al asistente de esa obra.
  const obraId = useObraDeLaRuta();
  const asistente = obraId ? rutaDeObra(obraId, 'asistente') : '/panel/asistente';
  const [pregunta, setPregunta] = useState('');
  const lista = useListado(useCallback(async () => [await api.asistente.conversaciones()], []));
  const datos = lista.datos[0];
  const ultimas = datos?.conversaciones.slice(0, ULTIMAS) ?? [];
  const sinCupo = datos ? datos.cupo.quedan === 0 : false;

  const preguntar = () => {
    if (!pregunta.trim()) return;
    ir(`${asistente}?${new URLSearchParams({ pregunta: pregunta.trim() })}`);
  };

  return (
    <Seccion titulo="Pregúntele al Asistente">
      <View style={estilos.recuadro}>
        <Text style={estilos.nota}>
          {sinCupo
            ? `Ya hizo sus ${datos?.cupo.limite} preguntas de hoy. Podrá preguntar de nuevo mañana.`
            : 'Pregunte en español sobre su obra: viajes, máquinas, personal, ensayos, almacén… La respuesta dice de dónde sale cada cifra.'}
        </Text>
        <Campo etiqueta="Su pregunta" valor={pregunta} onChange={setPregunta} multilinea compacto />
        <Acciones>
          <Boton titulo="Preguntar" onPress={preguntar} deshabilitado={!pregunta.trim() || sinCupo} />
          <Boton titulo="Ver mis conversaciones" tono="secundario" onPress={() => ir(asistente)} />
        </Acciones>
        {ultimas.length > 0 ? (
          <View style={estilos.lista}>
            <Text style={estilos.notaPequena}>Sus últimas conversaciones</Text>
            {ultimas.map((c) => (
              <Pressable
                key={c.id}
                accessibilityRole="link"
                onPress={() => ir(`${asistente}?${new URLSearchParams({ conversacion: c.id })}`)}
                style={({ hovered }) => [estilos.fila, hovered && estilos.filaEncima]}
              >
                <Text style={estilos.titulo} numberOfLines={1}>
                  {c.titulo}
                </Text>
                <Text style={estilos.notaPequena}>{cuando(c.actualizadaEn)}</Text>
              </Pressable>
            ))}
          </View>
        ) : null}
      </View>
    </Seccion>
  );
}

const estilos = StyleSheet.create({
  recuadro: {
    gap: Spacing.two,
    padding: Spacing.three,
    borderRadius: Radio.md,
    borderWidth: 1,
    borderColor: Panel.bordeSuave,
    backgroundColor: Panel.superficie,
  },
  lista: { gap: Spacing.one, marginTop: Spacing.two },
  fila: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.two,
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.two,
    borderRadius: Radio.sm,
  },
  filaEncima: { backgroundColor: Panel.fondoHover },
  titulo: {
    flex: 1,
    minWidth: 180,
    fontFamily: FuentePanel.texto,
    fontSize: TextoPanel.cuerpo,
    color: Panel.texto,
    textDecorationLine: 'underline',
  },
  nota: { fontFamily: FuentePanel.texto, fontSize: TextoPanel.cuerpo, color: Panel.textoApoyo },
  notaPequena: { fontFamily: FuentePanel.texto, fontSize: TextoPanel.apoyo, color: Panel.textoApoyo },
});
