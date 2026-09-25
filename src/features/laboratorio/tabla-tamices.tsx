/**
 * La tabla de tamices del ensayo (spec 018, RF-26, RF-46 a RF-48, RF-52, RF-55, RF-61).
 *
 * Es la tabla del formato LAB-FR-01: un renglón por tamiz, la masa retenida que se
 * digita y los tres porcentajes que salen de ella. Se calcula mientras se escribe
 * (RF-43) con la misma regla que usa el servidor al guardar.
 *
 * ── Por qué no es la `Tabla` del panel ──
 *
 * La `Tabla` es para leer filas; esta tiene una casilla por renglón que se escribe
 * con el teclado, de arriba abajo, como en la hoja. Dieciséis `Campo` con su rótulo
 * encima harían una columna de un metro; aquí la casilla es la celda.
 *
 * ── Lo que dice cada renglón ──
 *
 * Las cifras pasan por `formatearNumero`, el redondeo de Excel (ver las notas de T3).
 * El fondo no tiene «% pasa» (RF-52). Si un tamiz queda fuera de la franja, se dice
 * con flecha **y** texto —«▲ Por encima»—, no solo con color (RF-61, RF-62).
 */
import { StyleSheet, Text, TextInput, View } from 'react-native';

import { Colors, Estado, Panel, Radio, Spacing, TextoPanel } from '@/constants/theme';
import type { FranjaGranulometrica } from '@/shared/catalogos/franjas-granulometricas';
import { SERIE_DE_TAMICES, type IdTamiz } from '@/shared/catalogos/tamices';
import {
  formatearNumero,
  type PosicionEnFranja,
  type ResultadoGranulometria,
} from '@/shared/rules/granulometria';

const ANCHO = {
  tamiz: 80,
  mm: 70,
  retenido: 120,
  retenidoPct: 90,
  acumulado: 110,
  pasa: 90,
  franja: 90,
  fuera: 120,
} as const;

export function TablaDeTamices({
  retenidos,
  onCambiar,
  editable,
  resultado,
  franja,
  errores,
}: {
  /** Lo digitado en cada casilla, tal cual. */
  retenidos: Record<IdTamiz, string>;
  onCambiar: (tamiz: IdTamiz, texto: string) => void;
  editable: boolean;
  resultado: ResultadoGranulometria;
  franja: FranjaGranulometrica | null;
  /** Por campo: `retenidos.n_40` → mensaje. */
  errores: Record<string, string>;
}) {
  const renglones = resultado.completo ? resultado.renglones : null;
  const posicion = new Map<string, PosicionEnFranja>(
    resultado.completo
      ? (resultado.veredicto?.tamices ?? []).map((t) => [t.tamiz, t.posicion])
      : [],
  );

  return (
    <View style={estilos.tabla}>
      <View style={[estilos.fila, estilos.cabecera]}>
        <Encabezado ancho={ANCHO.tamiz}>Tamiz</Encabezado>
        <Encabezado ancho={ANCHO.mm}>mm</Encabezado>
        <Encabezado ancho={ANCHO.retenido}>Masa retenida (g)</Encabezado>
        <Encabezado ancho={ANCHO.retenidoPct}>% retenido</Encabezado>
        <Encabezado ancho={ANCHO.acumulado}>% ret. acumulado</Encabezado>
        <Encabezado ancho={ANCHO.pasa}>% pasa</Encabezado>
        <Encabezado ancho={ANCHO.franja}>Franja</Encabezado>
        <Encabezado ancho={ANCHO.fuera}> </Encabezado>
      </View>

      {SERIE_DE_TAMICES.map((tamiz, indice) => {
        const calculado = renglones?.[indice];
        const limite = tamiz.id === 'fondo' ? undefined : franja?.limites[tamiz.id];
        const lugar = posicion.get(tamiz.id);
        const error = errores[`retenidos.${tamiz.id}`];
        return (
          <View key={tamiz.id} style={[estilos.fila, indice % 2 === 1 && estilos.filaAlterna]}>
            <Texto ancho={ANCHO.tamiz} fuerte>
              {tamiz.nombre}
            </Texto>
            <Texto ancho={ANCHO.mm}>
              {tamiz.mm === null ? '—' : String(tamiz.mm).replace('.', ',')}
            </Texto>
            <View style={{ width: ANCHO.retenido }}>
              <TextInput
                value={retenidos[tamiz.id]}
                onChangeText={(texto) => onCambiar(tamiz.id, texto)}
                editable={editable}
                inputMode="decimal"
                accessibilityLabel={`Masa retenida en ${tamiz.id === 'fondo' ? 'el fondo' : `el tamiz ${tamiz.nombre}`}, en gramos`}
                style={[
                  estilos.casilla,
                  !editable && estilos.casillaSoloLectura,
                  error ? estilos.casillaMal : null,
                ]}
              />
              {error ? <Text style={estilos.error}>{error}</Text> : null}
            </View>
            <Cifra ancho={ANCHO.retenidoPct} valor={calculado?.porcentajeRetenido} />
            <Cifra ancho={ANCHO.acumulado} valor={calculado?.retenidoAcumulado} />
            {/* RF-52: bajo el último tamiz no pasa nada. */}
            <Cifra ancho={ANCHO.pasa} valor={calculado?.pasa ?? undefined} fuerte />
            <Texto ancho={ANCHO.franja}>{limite ? `${limite.min}–${limite.max}` : '—'}</Texto>
            <View style={{ width: ANCHO.fuera }}>
              {lugar === 'encima' ? (
                <Text style={estilos.fuera}>▲ Por encima</Text>
              ) : lugar === 'debajo' ? (
                <Text style={estilos.fuera}>▼ Por debajo</Text>
              ) : null}
            </View>
          </View>
        );
      })}
    </View>
  );
}

function Encabezado({ ancho, children }: { ancho: number; children: string }) {
  return <Text style={[estilos.encabezado, { width: ancho }]}>{children}</Text>;
}

function Texto({ ancho, fuerte, children }: { ancho: number; fuerte?: boolean; children: string }) {
  return (
    <Text style={[estilos.texto, fuerte && estilos.fuerte, { width: ancho }]}>{children}</Text>
  );
}

/** Un porcentaje a dos decimales, o una raya si todavía no se puede calcular. */
function Cifra({
  ancho,
  valor,
  fuerte,
}: {
  ancho: number;
  valor: number | undefined;
  fuerte?: boolean;
}) {
  return (
    <Text style={[estilos.texto, estilos.cifra, fuerte && estilos.fuerte, { width: ancho }]}>
      {valor === undefined ? '—' : formatearNumero(valor, 2)}
    </Text>
  );
}

const estilos = StyleSheet.create({
  tabla: {
    borderWidth: 1,
    borderColor: Panel.borde,
    borderRadius: Radio.sm,
    overflow: 'hidden',
    backgroundColor: Colors.light.background,
    alignSelf: 'flex-start',
  },
  fila: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.one,
    borderBottomWidth: 1,
    borderBottomColor: Panel.bordeSuave,
  },
  filaAlterna: { backgroundColor: Panel.fondoAlterno },
  cabecera: { backgroundColor: Panel.fondoCabecera, paddingVertical: Spacing.two },
  encabezado: { fontSize: TextoPanel.micro, fontWeight: '700', color: Colors.light.textSecondary },
  texto: { fontSize: TextoPanel.cuerpo, color: Colors.light.text },
  cifra: { textAlign: 'right', fontVariant: ['tabular-nums'] },
  fuerte: { fontWeight: '700' },
  casilla: {
    borderWidth: 1,
    borderColor: Panel.borde,
    borderRadius: Radio.sm,
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.one,
    fontSize: TextoPanel.cuerpo,
    color: Colors.light.text,
    textAlign: 'right',
    fontVariant: ['tabular-nums'],
    backgroundColor: Colors.light.background,
  },
  casillaSoloLectura: { backgroundColor: Panel.fondoCabecera, color: Colors.light.textSecondary },
  casillaMal: { borderColor: Estado.noConforme },
  error: { fontSize: TextoPanel.micro, color: Estado.noConforme, fontWeight: '600' },
  fuera: { fontSize: TextoPanel.apoyo, color: Estado.noConforme, fontWeight: '700' },
});
