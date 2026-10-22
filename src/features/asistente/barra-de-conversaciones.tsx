/**
 * La barra lateral del asistente (spec 028, cambio del 2026-10-22, RF-81 y RF-82): «Nueva
 * conversación», el buscador por título, las conversaciones agrupadas en Hoy, Ayer,
 * Últimos 7 días y Anteriores, y el paso a las archivadas (RF-46, RF-47). La gerencia
 * tiene arriba sus dos vistas, «Conversaciones» y «Uso y límites» (RF-56 a RF-59).
 *
 * Se pliega con su botón y la elección se recuerda en este navegador, como el menú del
 * panel (`preferencia-menu.ts`): es una comodidad de quien usa ese computador. En pantalla
 * angosta no se pliega: la pantalla la abre encima de la conversación y la cierra al elegir.
 */
import { useState, useSyncExternalStore } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { FuentePanel, Panel, Radio, Spacing, TextoPanel } from '@/constants/theme';
import { Etiqueta } from '@/features/panel/componentes';
import type { ConversacionDelAsistente } from '@/features/panel/contratos';
import { Icono, type NombreDeIcono } from '@/features/panel/iconos';
import { almacenDelNavegador } from '@/features/panel/preferencia-menu';

import { agruparPorFecha, conversacionesQueCoinciden } from '@/shared/rules/asistente';

export const ANCHO_DE_LA_BARRA = 260;

const CLAVE_BARRA = 'preoperaocc.asistente.barra';

/* ── Si quedó plegada, como almacén externo de una entrada (igual que `estado-menu.tsx`) ── */

/** `undefined` es «todavía no se leyó»: se lee una vez y luego manda la memoria. */
let plegadaEnMemoria: boolean | undefined;
const oyentes = new Set<() => void>();

/** Nunca lanza: sin almacenamiento, abierta. */
function instantanea(): boolean {
  if (plegadaEnMemoria === undefined) {
    try {
      plegadaEnMemoria = almacenDelNavegador()?.getItem(CLAVE_BARRA) === 'plegada';
    } catch {
      plegadaEnMemoria = false;
    }
  }
  return plegadaEnMemoria;
}

function suscribir(oyente: () => void) {
  oyentes.add(oyente);
  return () => {
    oyentes.delete(oyente);
  };
}

function fijarPlegada(plegada: boolean) {
  plegadaEnMemoria = plegada;
  try {
    almacenDelNavegador()?.setItem(CLAVE_BARRA, plegada ? 'plegada' : 'abierta');
  } catch {
    // Solo dura esta visita.
  }
  oyentes.forEach((oyente) => oyente());
}

/** RF-81: si la barra está plegada y cómo cambiarlo. El servidor la pinta abierta. */
export function useBarraPlegada(): [boolean, (plegada: boolean) => void] {
  return [useSyncExternalStore(suscribir, instantanea, () => false), fijarPlegada];
}

interface Props {
  lista: ConversacionDelAsistente[];
  cargando: boolean;
  conversacionId: string;
  onElegir: (id: string) => void;
  onNueva: () => void;
  archivadas: boolean;
  onArchivadas: (archivadas: boolean) => void;
  /** Hay una respuesta en camino: no se cambia de conversación. */
  ocupado: boolean;
  /** RF-56: la gerencia ve también «Uso y límites». */
  veUso: boolean;
  vista: string;
  onVista: (vista: 'conversaciones' | 'uso') => void;
  /** Plegar en escritorio; cerrar en pantalla angosta. */
  onCerrar: () => void;
  etiquetaCerrar: string;
}

export function BarraDeConversaciones({
  lista,
  cargando,
  conversacionId,
  onElegir,
  onNueva,
  archivadas,
  onArchivadas,
  ocupado,
  veUso,
  vista,
  onVista,
  onCerrar,
  etiquetaCerrar,
}: Props) {
  const [buscado, setBuscado] = useState('');
  const grupos = agruparPorFecha(conversacionesQueCoinciden(lista, buscado));

  return (
    <View style={estilos.barra}>
      <View style={estilos.cabecera}>
        {veUso ? (
          <View style={estilos.vistas} accessibilityRole="tablist">
            <Vista titulo="Conversaciones" elegida={vista !== 'uso'} onPress={() => onVista('conversaciones')} />
            <Vista titulo="Uso y límites" elegida={vista === 'uso'} onPress={() => onVista('uso')} />
          </View>
        ) : (
          <Text style={estilos.rotulo}>Conversaciones</Text>
        )}
        <BotonDeIcono icono="plegar" etiqueta={etiquetaCerrar} onPress={onCerrar} />
      </View>

      <Fila icono="nueva" texto="Nueva conversación" onPress={onNueva} deshabilitado={ocupado} />

      <View style={estilos.buscador}>
        <Icono nombre="buscar" color={Panel.textoApoyo} tamano={16} />
        <TextInput
          value={buscado}
          onChangeText={setBuscado}
          placeholder="Buscar por título"
          placeholderTextColor={Panel.textoApoyo}
          accessibilityLabel="Buscar conversaciones por título"
          style={estilos.textoBuscador}
        />
        {buscado ? (
          <Pressable accessibilityRole="button" accessibilityLabel="Borrar la búsqueda" onPress={() => setBuscado('')}>
            <Text style={estilos.quitar}>✕</Text>
          </Pressable>
        ) : null}
      </View>

      <ScrollView style={estilos.lista} contentContainerStyle={estilos.contenidoLista}>
        {archivadas ? <Text style={estilos.rotuloGrupo}>Archivadas</Text> : null}
        {!cargando && grupos.length === 0 ? (
          <Text style={estilos.nota}>
            {buscado
              ? 'Ninguna conversación tiene ese título.'
              : archivadas
                ? 'No hay conversaciones archivadas.'
                : 'Todavía no hay conversaciones.'}
          </Text>
        ) : null}
        {grupos.map((g) => (
          <View key={g.grupo} style={estilos.grupo}>
            <Text style={estilos.rotuloGrupo} accessibilityRole="header">
              {g.grupo}
            </Text>
            {g.conversaciones.map((c) => (
              <Pressable
                key={c.id}
                accessibilityRole="button"
                accessibilityState={{ selected: c.id === conversacionId, disabled: ocupado }}
                {...({ title: c.titulo } as object)}
                onPress={() => onElegir(c.id)}
                disabled={ocupado}
                style={({ hovered }) => [
                  estilos.conversacion,
                  hovered && estilos.conversacionEncima,
                  c.id === conversacionId && estilos.conversacionElegida,
                ]}
              >
                <Text style={estilos.titulo} numberOfLines={1}>
                  {c.titulo}
                </Text>
                {!c.visible ? <Etiqueta tono="neutro">Fuera de su alcance</Etiqueta> : null}
              </Pressable>
            ))}
          </View>
        ))}
      </ScrollView>

      <Pressable
        accessibilityRole="switch"
        accessibilityState={{ checked: archivadas }}
        onPress={() => onArchivadas(!archivadas)}
        style={({ hovered }) => [estilos.pie, hovered && estilos.conversacionEncima]}
      >
        <Text style={estilos.enlace}>{archivadas ? '← Volver a las conversaciones' : 'Ver archivadas'}</Text>
      </Pressable>
    </View>
  );
}

function Vista({ titulo, elegida, onPress }: { titulo: string; elegida: boolean; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="tab"
      accessibilityState={{ selected: elegida }}
      onPress={onPress}
      style={({ hovered }) => [estilos.vista, elegida && estilos.vistaElegida, hovered && !elegida && estilos.conversacionEncima]}
    >
      <Text style={[estilos.textoVista, elegida && estilos.textoVistaElegida]}>{titulo}</Text>
    </Pressable>
  );
}

function Fila({
  icono,
  texto,
  onPress,
  deshabilitado,
}: {
  icono: NombreDeIcono;
  texto: string;
  onPress: () => void;
  deshabilitado?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: Boolean(deshabilitado) }}
      onPress={onPress}
      disabled={deshabilitado}
      style={({ hovered }) => [estilos.fila, hovered && !deshabilitado && estilos.conversacionEncima, deshabilitado && estilos.apagado]}
    >
      <Icono nombre={icono} color={Panel.texto} tamano={18} />
      <Text style={estilos.textoFila}>{texto}</Text>
    </Pressable>
  );
}

export function BotonDeIcono({ icono, etiqueta, onPress }: { icono: NombreDeIcono; etiqueta: string; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={etiqueta}
      {...({ title: etiqueta } as object)}
      onPress={onPress}
      style={({ hovered }) => [estilos.botonIcono, hovered && estilos.conversacionEncima]}
    >
      <Icono nombre={icono} color={Panel.textoApoyo} tamano={18} />
    </Pressable>
  );
}

const estilos = StyleSheet.create({
  barra: {
    width: ANCHO_DE_LA_BARRA,
    height: '100%',
    gap: Spacing.two,
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.two,
    borderRadius: Radio.md,
    backgroundColor: Panel.fondoCabecera,
  },
  cabecera: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: Spacing.one },
  rotulo: { fontFamily: FuentePanel.texto, fontSize: TextoPanel.cuerpo, fontWeight: '600', color: Panel.texto, paddingLeft: Spacing.two },
  vistas: { flexDirection: 'row', flexShrink: 1, gap: Spacing.half },
  vista: { paddingVertical: Spacing.one, paddingHorizontal: Spacing.two, borderRadius: Radio.sm },
  vistaElegida: { backgroundColor: Panel.superficie },
  textoVista: { fontFamily: FuentePanel.texto, fontSize: TextoPanel.apoyo, color: Panel.textoApoyo },
  textoVistaElegida: { color: Panel.texto, fontWeight: '600' },
  botonIcono: { width: 32, height: 32, borderRadius: Radio.sm, alignItems: 'center', justifyContent: 'center' },
  fila: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.two,
    borderRadius: Radio.sm,
  },
  textoFila: { fontFamily: FuentePanel.texto, fontSize: TextoPanel.cuerpo, fontWeight: '600', color: Panel.texto },
  apagado: { opacity: 0.4 },
  buscador: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    paddingHorizontal: Spacing.two,
    height: 34,
    borderRadius: Radio.sm,
    borderWidth: 1,
    borderColor: Panel.bordeSuave,
    backgroundColor: Panel.superficie,
  },
  textoBuscador: {
    flex: 1,
    minWidth: 0,
    fontFamily: FuentePanel.texto,
    fontSize: TextoPanel.apoyo,
    color: Panel.texto,
    padding: 0,
    outlineWidth: 0,
    // Con `outline-style: auto`, Chrome dibuja su anillo aunque el ancho sea 0.
    outlineStyle: 'none' as 'solid',
  },
  quitar: { fontFamily: FuentePanel.texto, fontSize: TextoPanel.apoyo, color: Panel.textoApoyo, paddingHorizontal: Spacing.one },
  lista: { flex: 1 },
  contenidoLista: { gap: Spacing.three, paddingVertical: Spacing.one },
  grupo: { gap: Spacing.half },
  rotuloGrupo: {
    fontFamily: FuentePanel.texto,
    fontSize: TextoPanel.micro,
    fontWeight: '600',
    color: Panel.textoApoyo,
    paddingHorizontal: Spacing.two,
    paddingBottom: Spacing.one,
  },
  conversacion: { gap: Spacing.one, paddingVertical: Spacing.two, paddingHorizontal: Spacing.two, borderRadius: Radio.sm },
  conversacionEncima: { backgroundColor: Panel.fondoHover },
  conversacionElegida: { backgroundColor: Panel.superficie },
  titulo: { fontFamily: FuentePanel.texto, fontSize: TextoPanel.apoyo, color: Panel.texto },
  nota: { fontFamily: FuentePanel.texto, fontSize: TextoPanel.apoyo, color: Panel.textoApoyo, paddingHorizontal: Spacing.two },
  pie: { paddingVertical: Spacing.two, paddingHorizontal: Spacing.two, borderRadius: Radio.sm },
  enlace: { fontFamily: FuentePanel.texto, fontSize: TextoPanel.apoyo, color: Panel.texto, textDecorationLine: 'underline' },
});
