/**
 * A qué parte de la planificación va un renglón, al pedir o al corregir (spec 048, RF-2 a RF-9,
 * RF-26 a RF-30, RF-46).
 *
 * Usa el `Selector` del panel: con más de ocho opciones ya trae un buscador que no distingue
 * tildes y busca en la etiqueta y el detalle, así que el número, la descripción, el capítulo y el
 * frente se encuentran escribiendo (RF-46). La primera opción es «Fuera de lo planeado», que pide
 * su explicación (RF-4).
 *
 * Las cifras —planeado, ya comprometido, lo que queda— salen para quien ve valores (RF-9, RF-34),
 * y se calculan aquí mismo con la regla compartida (`cifrasDeLaOpcion`) a partir de lo que trajo
 * el servidor y de lo que el formulario lleva escrito: así lo que queda se mueve mientras se
 * escribe el valor. El servidor lo vuelve a calcular al abrir la requisición (RF-33).
 */
import { StyleSheet, Text, View } from 'react-native';

import { FuentePanel, Panel, Spacing, TextoPanel } from '@/constants/theme';
import { Campo, Etiqueta, Selector } from '@/features/panel/componentes';
import type { OpcionesParaImputar } from '@/features/panel/requisiciones';
import { enPesos } from '@/shared/rules/pesos';
import { cifrasDeLaOpcion, ETIQUETA_FUERA, ETIQUETA_SIN_PLANIFICACION, TEXTO_SE_PASA } from '@/shared/rules/requisicion-planificacion';

/** La imputación mientras se escribe. `fuera` sin llave es «Fuera de lo planeado». */
export interface ImputacionEscrita {
  llave: string | null;
  fuera: boolean;
  explicacion: string;
}

export const IMPUTACION_VACIA: ImputacionEscrita = { llave: null, fuera: false, explicacion: '' };

/** Lo que se manda al servidor; `null` si no se escogió nada (la regla dirá qué falta). */
export function imputacionAPedir(escrita: ImputacionEscrita): { llave: string | null; explicacion: string | null } | null {
  if (escrita.fuera) return { llave: null, explicacion: escrita.explicacion };
  return escrita.llave ? { llave: escrita.llave, explicacion: null } : null;
}

const FUERA = '__fuera__';

export function CampoDeImputacion({
  opciones,
  valor,
  onChange,
  conValores,
  pideEstaRequisicion,
  error,
  yaContado,
}: {
  /** `null` mientras cargan. */
  opciones: OpcionesParaImputar | null;
  valor: ImputacionEscrita;
  onChange: (valor: ImputacionEscrita) => void;
  conValores: boolean;
  /** Lo que la requisición entera pide a la opción escogida, sumando sus renglones. */
  pideEstaRequisicion: number;
  /**
   * Al aprobar, la requisición ya está contada en lo comprometido que trae el servidor: lo que ya
   * aporta a su opción de antes se descuenta, para que «ya comprometido» sea sin ella (RF-61).
   */
  yaContado?: { llave: string | null; valor: number };
  error?: string;
}) {
  if (!opciones) return <Text style={estilos.apoyo}>Cargando la planificación…</Text>;
  // RF-8: sin planificación aprobada se pide igual; solo se avisa.
  if (!opciones.hayPlanificacion) {
    return (
      <View style={estilos.fila}>
        <Etiqueta tono="neutro">{ETIQUETA_SIN_PLANIFICACION}</Etiqueta>
      </View>
    );
  }

  const elegida = valor.llave ? opciones.opciones.find((o) => o.llave === valor.llave) : undefined;
  const cifras =
    conValores && elegida && elegida.planeado !== undefined
      ? cifrasDeLaOpcion(
          elegida.llave,
          elegida.planeado,
          (elegida.comprometido ?? 0) - (yaContado && yaContado.llave === elegida.llave ? yaContado.valor : 0),
          pideEstaRequisicion,
        )
      : null;

  return (
    <View style={estilos.columna}>
      <Selector
        etiqueta="Va a"
        obligatorio
        valor={valor.fuera ? FUERA : valor.llave}
        opciones={[
          { valor: FUERA, etiqueta: ETIQUETA_FUERA, detalle: 'No cabe en ningún ítem ni rubro' },
          ...opciones.opciones.map((o) => ({
            valor: o.llave,
            etiqueta: o.etiqueta,
            detalle: [o.capitulo, o.frente].filter(Boolean).join(' · '),
          })),
        ]}
        onChange={(v) => onChange(v === FUERA ? { ...valor, llave: null, fuera: true } : { ...valor, llave: v, fuera: false })}
        vacio="Escoja a qué parte de la planificación va"
        error={error && !valor.fuera ? error : undefined}
        ancho={420}
      />
      {valor.fuera ? (
        <Campo
          etiqueta="Por qué no cabe en la planificación"
          obligatorio
          valor={valor.explicacion}
          onChange={(explicacion) => onChange({ ...valor, explicacion })}
          error={error}
          ancho={420}
        />
      ) : null}
      {cifras ? (
        <View style={estilos.fila}>
          <Text style={estilos.apoyo}>
            {cifras.planeado === null
              ? 'Sin precio de costo en la planificación'
              : `Planeado ${enPesos(cifras.planeado)} · ya comprometido ${enPesos(cifras.yaComprometido)} · queda ${enPesos(cifras.queda ?? 0)}`}
          </Text>
          {cifras.exceso !== null ? <Etiqueta tono="malo">{`${TEXTO_SE_PASA} por ${enPesos(cifras.exceso)}`}</Etiqueta> : null}
        </View>
      ) : null}
    </View>
  );
}

const estilos = StyleSheet.create({
  columna: { gap: Spacing.one },
  fila: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: Spacing.two },
  apoyo: { fontFamily: FuentePanel.texto, fontSize: TextoPanel.apoyo, color: Panel.textoApoyo },
});
