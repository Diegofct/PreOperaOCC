/**
 * Piezas que comparten las pestañas de Reportes (spec 030): cómo se escribe una cifra,
 * el botón Sí/No de un día, la etiqueta del estado de mantenimiento y el aviso de
 * las bitácoras abiertas.
 */
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Estado, FuentePanel, Panel, TextoPanel } from '@/constants/theme';
import { Aviso, Etiqueta } from '@/features/panel/componentes';
import { diaDeLaSemana } from '@/shared/rules/festivos';
import { diaCorto } from '@/shared/rules/jornada';
import type { EstadoDeMantenimiento } from '@/shared/rules/mantenimiento';

/** Una cifra como se lee en Colombia: punto de miles y coma decimal, un decimal como mucho. */
export function cifra(n: number | null | undefined, decimales = 1): string {
  if (n === null || n === undefined) return '—';
  return n.toLocaleString('es-CO', { maximumFractionDigits: decimales });
}

/** Minutos en horas, con un decimal: 510 → «8,5». */
export function enHoras(minutos: number): string {
  return cifra(minutos / 60);
}

const DIAS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

/** «Lun 5», para el encabezado de una columna de la semana. */
export function rotuloDelDia(fecha: string): string {
  return `${DIAS[diaDeLaSemana(fecha)]} ${Number(fecha.slice(8))}`;
}

/** El botón verde «Sí», el rojo «No», o «—» si ese día no hay bitácora (RF-13 a RF-15). */
export function TrabajoDelDia({ trabajo }: { trabajo: 'si' | 'no' | 'sin_bitacora' }) {
  if (trabajo === 'si') return <Etiqueta tono="bueno">Sí</Etiqueta>;
  if (trabajo === 'no') return <Etiqueta tono="malo">No</Etiqueta>;
  return <Text style={estilos.sinBitacora}>Sin bitácora</Text>;
}

const TONO_DE_ESTADO: Record<EstadoDeMantenimiento, 'bueno' | 'atencion' | 'malo' | 'neutro'> = {
  al_dia: 'bueno',
  proximo: 'atencion',
  vencido: 'malo',
  sin_registro: 'neutro',
  revisar: 'atencion',
};

/** El estado de mantenimiento con su texto; pulsarlo lleva a la pestaña Mantenimiento (RF-20). */
export function EstadoDeMantenimientoEtiqueta({
  estado,
  texto,
  correctivoPendiente,
  alPulsar,
}: {
  estado: EstadoDeMantenimiento;
  texto: string;
  correctivoPendiente: boolean;
  alPulsar?: () => void;
}) {
  return (
    <Pressable
      onPress={alPulsar}
      accessibilityRole={alPulsar ? 'link' : undefined}
      accessibilityLabel={`${texto}${correctivoPendiente ? ', correctivo pendiente' : ''}. Ver mantenimiento`}
      style={estilos.mantenimiento}
    >
      {correctivoPendiente ? <Etiqueta tono="malo">Correctivo pendiente</Etiqueta> : null}
      <Etiqueta tono={TONO_DE_ESTADO[estado]}>{texto}</Etiqueta>
    </Pressable>
  );
}

/** Los días con la bitácora abierta: lo de esos días todavía puede cambiar (RF-7). */
export function AvisoDeAbiertas({ abiertas }: { abiertas: readonly string[] }) {
  if (abiertas.length === 0) return null;
  // En un mes pueden ser quince: más de cuatro fechas seguidas no se leen.
  const cuales =
    abiertas.length > 4
      ? `${abiertas.length} bitácoras de este periodo, entre el ${diaCorto(abiertas[0])} y el ${diaCorto(abiertas[abiertas.length - 1])},`
      : `${abiertas.length === 1 ? 'La bitácora del' : 'Las bitácoras del'} ${abiertas.map(diaCorto).join(', ')}`;
  return (
    <Aviso tono="info">
      {`${cuales} ${abiertas.length === 1 ? 'sigue abierta' : 'siguen abiertas'}: sus datos todavía pueden cambiar.`}
    </Aviso>
  );
}

/**
 * Una barra de proporción con su cifra escrita al lado: el color solo acompaña al
 * número (como `Medidor`), pero cabe en una celda de tabla.
 */
export function BarraDeProporcion({ valor, maximo, texto }: { valor: number; maximo: number; texto: string }) {
  const ancho = maximo > 0 ? Math.max(2, Math.round((valor / maximo) * 100)) : 0;
  return (
    <View style={estilos.barra} accessibilityLabel={texto}>
      <View style={estilos.barraFondo}>
        <View style={[estilos.barraRelleno, { width: `${ancho}%` }]} />
      </View>
      <Text style={estilos.barraTexto}>{texto}</Text>
    </View>
  );
}

const estilos = StyleSheet.create({
  sinBitacora: { fontFamily: FuentePanel.texto, fontSize: TextoPanel.apoyo, color: Panel.textoApoyo },
  mantenimiento: { gap: 4, alignItems: 'flex-start' },
  barra: { flexDirection: 'row', alignItems: 'center', gap: 8, width: '100%' },
  barraFondo: { flex: 1, height: 8, borderRadius: 4, backgroundColor: Panel.fondoCabecera, overflow: 'hidden' },
  barraRelleno: { height: 8, borderRadius: 4, backgroundColor: Estado.conforme },
  barraTexto: { fontFamily: FuentePanel.texto, fontSize: TextoPanel.apoyo, color: Panel.texto, minWidth: 36, textAlign: 'right' },
});
