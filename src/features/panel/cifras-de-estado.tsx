/**
 * Las cifras de estado encima de una lista (spec 050, RF-48 a RF-52, RF-77): una por estado, con su símbolo,
 * su nombre y cuántos registros hay en él. Pulsar una filtra la lista por ese estado; pulsar la que ya filtra
 * quita el filtro. Reemplazan al selector de «Estado» (RF-75): enseñan de una vez lo que el selector
 * escondía detrás de un desplegable —cuántas hay de cada cosa— y filtran con un solo toque.
 *
 * La elegida se distingue por algo más que el color (RF-51): un borde grueso y «✓» delante del nombre. Las
 * demás llevan un borde transparente del mismo grueso, para que al elegir una nada salte de sitio.
 *
 * Mientras la lista carga no hay número (RF-77): un «0» que luego pasa a «12» dice primero algo falso.
 *
 * Los números los cuenta `contarPorEstado` sobre la lista entera con la búsqueda y los demás filtros, no
 * sobre la página que se ve (RF-52). Este componente solo los pinta.
 */
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Estado, FuentePanel, Grosor, Movimiento, Panel, Radio, Sombra, Spacing, TextoPanel } from '@/constants/theme';

export interface EstadoDeLaLista {
  valor: string;
  etiqueta: string;
  /** Un símbolo de texto que acompaña al nombre: el color nunca va solo. */
  simbolo: string;
  tono?: 'neutro' | 'bueno' | 'atencion' | 'malo';
}

const COLOR_DEL_TONO = {
  neutro: Panel.texto,
  bueno: Estado.conforme,
  atencion: Estado.atencion,
  malo: Estado.noConforme,
} as const;

export function CifrasDeEstado({
  estados,
  conteos,
  elegido,
  alElegir,
}: {
  estados: readonly EstadoDeLaLista[];
  /** `null` mientras la lista carga: entonces no se muestra ningún número (RF-77). */
  conteos: Record<string, number> | null;
  elegido: string | null;
  /** Con `null`, sin filtro de estado. */
  alElegir: (estado: string | null) => void;
}) {
  return (
    <View style={estilos.cifras} accessibilityRole="toolbar" aria-label="Filtrar por estado">
      {estados.map((e) => {
        const activo = elegido === e.valor;
        const cuantos = conteos ? (conteos[e.valor] ?? 0) : null;
        return (
          <Pressable
            key={e.valor}
            onPress={() => alElegir(activo ? null : e.valor)}
            accessibilityRole="button"
            accessibilityState={{ selected: activo }}
            accessibilityLabel={`${e.etiqueta}: ${cuantos ?? 'cargando'}. ${activo ? 'Filtrando; pulse para quitar el filtro.' : 'Pulse para filtrar.'}`}
            style={({ hovered }) => [estilos.cifra, hovered && estilos.cifraEncima, activo && estilos.cifraActiva]}
          >
            <Text style={[estilos.simbolo, { color: COLOR_DEL_TONO[e.tono ?? 'neutro'] }]}>{e.simbolo}</Text>
            <View style={estilos.textos}>
              <Text style={estilos.nombre} numberOfLines={1}>
                {activo ? `✓ ${e.etiqueta}` : e.etiqueta}
              </Text>
              <Text style={estilos.numero}>{cuantos === null ? '…' : String(cuantos)}</Text>
            </View>
          </Pressable>
        );
      })}
    </View>
  );
}

const estilos = StyleSheet.create({
  cifras: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
  cifra: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.three,
    borderRadius: Radio.md,
    borderCurve: 'continuous',
    borderWidth: Grosor.marca,
    borderColor: 'transparent',
    backgroundColor: Panel.superficie,
    boxShadow: Sombra.tarjeta,
    transitionProperty: 'box-shadow, border-color',
    transitionDuration: `${Movimiento.rapido}ms`,
  },
  cifraEncima: { boxShadow: Sombra.elevada },
  cifraActiva: { borderColor: Panel.foco },
  simbolo: { fontFamily: FuentePanel.texto, fontSize: TextoPanel.seccion, fontWeight: '700' },
  textos: { gap: Spacing.half },
  nombre: { fontFamily: FuentePanel.texto, fontSize: TextoPanel.apoyo, fontWeight: '600', color: Panel.textoApoyo },
  numero: { fontFamily: FuentePanel.texto, fontSize: TextoPanel.seccion, fontWeight: '800', color: Panel.texto },
});

/**
 * El símbolo y el tono de cada estado de una requisición o una solicitud, de compra o de pago. Los dos
 * flujos comparten la mayoría de sus estados (enviada, devuelta, aprobada…), y Requisiciones y Tesorería
 * los muestran juntos: escritos una vez, «Devuelta» se ve igual en las dos.
 */
const SIMBOLO_DEL_TRAMITE: Record<string, Pick<EstadoDeLaLista, 'simbolo' | 'tono'>> = {
  enviada: { simbolo: '→', tono: 'neutro' },
  devuelta: { simbolo: '↩', tono: 'atencion' },
  aprobada: { simbolo: '✓', tono: 'bueno' },
  comprada: { simbolo: '■', tono: 'neutro' },
  recibida_en_parte: { simbolo: '◐', tono: 'atencion' },
  recibida: { simbolo: '✓', tono: 'bueno' },
  pagada_en_parte: { simbolo: '◐', tono: 'atencion' },
  pagada: { simbolo: '✓', tono: 'bueno' },
  rechazada: { simbolo: '✕', tono: 'malo' },
  cancelada: { simbolo: '⊘', tono: 'neutro' },
};

/** Los estados de un trámite como cifras: los de la lista que se pasa, con su símbolo. */
export function estadosDelTramite(estados: readonly { id: string; nombre: string }[]): EstadoDeLaLista[] {
  return estados.map((e) => ({ valor: e.id, etiqueta: e.nombre, ...(SIMBOLO_DEL_TRAMITE[e.id] ?? { simbolo: '•', tono: 'neutro' }) }));
}
