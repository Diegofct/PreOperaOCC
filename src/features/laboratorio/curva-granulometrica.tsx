/**
 * La curva granulométrica (spec 018, RF-64 a RF-69).
 *
 * ── Por qué SVG a mano y no una librería de gráficas ──
 *
 * Son tres líneas sobre un eje logarítmico. `react-native-svg` ya está en el proyecto
 * (lo usa la firma) y dibuja igual en el navegador; una librería de gráficas sería una
 * dependencia nueva para esto (constitución, principio 8). Y SVG imprime vectorial:
 * en el informe la curva sale nítida a cualquier tamaño.
 *
 * ── Lo que copia del Excel y lo que no ──
 *
 * Como la hoja: diámetro en milímetros en el eje horizontal, logarítmico y creciendo
 * hacia la derecha; «% que pasa» de 0 a 100 en el vertical; la curva del ensayo y los
 * dos límites de la franja. A diferencia de la hoja, la curva usa **todos** los
 * tamices de la serie (la hoja dibujaba diez) y los límites solo en los que la franja
 * controla (RF-65, RF-66).
 *
 * ── El color nunca es la única señal ──
 *
 * Los dos límites se distinguen por el trazo (rayas largas y cortas), y un punto fuera
 * de la franja cambia de **forma** —triángulo hacia arriba si queda por encima, hacia
 * abajo si queda por debajo—, no solo de color (RF-68). La leyenda lo dice.
 */
import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, G, Line, Polygon, Polyline, Rect, Text as TextoSvg } from 'react-native-svg';

import { Estado, Fonts, Marca, Panel, Spacing, TextoPanel } from '@/constants/theme';
import type { FranjaGranulometrica } from '@/shared/catalogos/franjas-granulometricas';
import { TAMICES_CON_ABERTURA } from '@/shared/catalogos/tamices';
import type { PosicionEnFranja, ResultadoGranulometria } from '@/shared/rules/granulometria';

/** El eje horizontal, en milímetros: una década por debajo del N.º 200 y hasta 100. */
const MM_MIN = 0.05;
const MM_MAX = 100;

const MARGEN = { izquierda: 52, derecha: 16, arriba: 12, abajo: 44 };

const COLOR = {
  ensayo: Marca.primario,
  inferior: Estado.atencion,
  superior: Estado.info,
  fuera: Estado.noConforme,
  rejilla: Panel.bordeSuave,
  eje: Panel.borde,
  texto: Estado.na,
} as const;

/** Rayas distintas para cada límite: se distinguen también en blanco y negro. */
const TRAZO_INFERIOR = '8 5';
const TRAZO_SUPERIOR = '2 4';

interface Punto {
  x: number;
  y: number;
}

export function CurvaGranulometrica({
  resultado,
  franja,
  ancho = 640,
  alto = 340,
}: {
  resultado: ResultadoGranulometria;
  franja: FranjaGranulometrica | null;
  ancho?: number;
  alto?: number;
}) {
  // RF-69: sin datos completos no hay curva a medias, se dice qué falta.
  if (!resultado.completo) {
    return (
      <View style={[estilos.vacio, { width: ancho, height: alto }]}>
        <Text style={estilos.vacioTitulo}>La curva aparece cuando estén todas las masas.</Text>
        <Text style={estilos.vacioDetalle}>
          {`Falta ${resultado.faltan.slice(0, 3).join(', ')}${resultado.faltan.length > 3 ? ` y ${resultado.faltan.length - 3} más` : ''}.`}
        </Text>
      </View>
    );
  }

  const w = ancho - MARGEN.izquierda - MARGEN.derecha;
  const h = alto - MARGEN.arriba - MARGEN.abajo;
  const lmin = Math.log10(MM_MIN);
  const lmax = Math.log10(MM_MAX);
  const x = (mm: number) => MARGEN.izquierda + ((Math.log10(mm) - lmin) / (lmax - lmin)) * w;
  const y = (porcentaje: number) =>
    MARGEN.arriba + (1 - Math.min(Math.max(porcentaje, 0), 100) / 100) * h;
  const enTexto = (puntos: Punto[]) => puntos.map((p) => `${p.x},${p.y}`).join(' ');

  // Cada tamiz con abertura, con su «% pasa» y dónde queda respecto a la franja.
  const posicion = new Map<string, PosicionEnFranja>(
    (resultado.veredicto?.tamices ?? []).map((t) => [t.tamiz, t.posicion]),
  );
  const puntos = TAMICES_CON_ABERTURA.flatMap((tamiz) => {
    const pasa = resultado.renglones.find((r) => r.tamiz === tamiz.id)?.pasa;
    if (pasa === null || pasa === undefined) return [];
    return [
      {
        id: tamiz.id,
        x: x(tamiz.mm),
        y: y(pasa),
        posicion: posicion.get(tamiz.id) ?? 'dentro',
      },
    ];
  });

  const limites = franja
    ? TAMICES_CON_ABERTURA.flatMap((tamiz) => {
        const limite = franja.limites[tamiz.id];
        return limite ? [{ mm: tamiz.mm, ...limite }] : [];
      })
    : [];
  const inferior = limites.map((l) => ({ x: x(l.mm), y: y(l.min) }));
  const superior = limites.map((l) => ({ x: x(l.mm), y: y(l.max) }));
  const hayFuera = puntos.some((p) => p.posicion !== 'dentro');

  // La rejilla logarítmica: una línea por cada 1…9 de cada década; las décadas, rotuladas.
  const decadas = [0.1, 1, 10, 100];
  const menores = [0.01, 0.1, 1, 10].flatMap((d) => [2, 3, 4, 5, 6, 7, 8, 9].map((k) => k * d));
  const verticales = [...menores, ...decadas].filter((mm) => mm >= MM_MIN && mm <= MM_MAX);

  const descripcion =
    `Curva granulométrica${franja ? ` contra ${franja.nombre}` : ''}. ` +
    (resultado.veredicto
      ? resultado.veredicto.global === 'cumple'
        ? 'Todos los tamices controlados quedan dentro de la franja.'
        : fueraDeFranja(puntos.filter((p) => p.posicion !== 'dentro').length)
      : 'Sin franja escogida.');

  return (
    <View style={{ width: ancho }}>
      {/* La fuente va en el grupo: el texto de un SVG no hereda la del panel y saldría con serifa. */}
      <Svg width={ancho} height={alto} accessibilityLabel={descripcion}>
        <G fontFamily={Fonts?.sans}>
          <Rect
            x={MARGEN.izquierda}
            y={MARGEN.arriba}
            width={w}
            height={h}
            fill="none"
            stroke={COLOR.eje}
          />

          {verticales.map((mm) => (
            <Line
              key={`v${mm}`}
              x1={x(mm)}
              x2={x(mm)}
              y1={MARGEN.arriba}
              y2={MARGEN.arriba + h}
              stroke={decadas.includes(mm) ? COLOR.eje : COLOR.rejilla}
            />
          ))}
          {[10, 20, 30, 40, 50, 60, 70, 80, 90].map((p) => (
            <Line
              key={`h${p}`}
              x1={MARGEN.izquierda}
              x2={MARGEN.izquierda + w}
              y1={y(p)}
              y2={y(p)}
              stroke={COLOR.rejilla}
            />
          ))}

          {decadas.map((mm) => (
            <TextoSvg
              key={`tx${mm}`}
              x={x(mm)}
              y={MARGEN.arriba + h + 16}
              fontSize={TextoPanel.micro}
              fill={COLOR.texto}
              textAnchor="middle"
            >
              {String(mm).replace('.', ',')}
            </TextoSvg>
          ))}
          {[0, 20, 40, 60, 80, 100].map((p) => (
            <TextoSvg
              key={`ty${p}`}
              x={MARGEN.izquierda - 6}
              y={y(p) + 4}
              fontSize={TextoPanel.micro}
              fill={COLOR.texto}
              textAnchor="end"
            >
              {String(p)}
            </TextoSvg>
          ))}
          <TextoSvg
            x={MARGEN.izquierda + w / 2}
            y={alto - 6}
            fontSize={TextoPanel.apoyo}
            fill={COLOR.texto}
            textAnchor="middle"
          >
            Diámetro de las partículas (mm)
          </TextoSvg>
          <TextoSvg
            x={14}
            y={MARGEN.arriba + h / 2}
            fontSize={TextoPanel.apoyo}
            fill={COLOR.texto}
            textAnchor="middle"
            // Rotación de SVG escrita a mano: `rotation`/`origin` no se traducen bien en
            // el navegador y dejan una propiedad inválida en el DOM.
            transform={`rotate(-90 14 ${MARGEN.arriba + h / 2})`}
          >
            % que pasa
          </TextoSvg>

          {inferior.length > 1 ? (
            <Polyline
              points={enTexto(inferior)}
              fill="none"
              stroke={COLOR.inferior}
              strokeWidth={2}
              strokeDasharray={TRAZO_INFERIOR}
            />
          ) : null}
          {superior.length > 1 ? (
            <Polyline
              points={enTexto(superior)}
              fill="none"
              stroke={COLOR.superior}
              strokeWidth={2}
              strokeDasharray={TRAZO_SUPERIOR}
            />
          ) : null}

          <Polyline points={enTexto(puntos)} fill="none" stroke={COLOR.ensayo} strokeWidth={2} />
          {puntos.map((p) => (
            <G key={p.id}>
              <Marcador x={p.x} y={p.y} posicion={p.posicion} />
            </G>
          ))}
        </G>
      </Svg>

      <View style={estilos.leyenda}>
        <ElementoDeLeyenda etiqueta="Ensayo">
          <Line x1={0} x2={24} y1={8} y2={8} stroke={COLOR.ensayo} strokeWidth={2} />
          <Circle cx={12} cy={8} r={3.5} fill={COLOR.ensayo} />
        </ElementoDeLeyenda>
        {franja ? (
          <>
            <ElementoDeLeyenda etiqueta="Límite inferior">
              <Line
                x1={0}
                x2={24}
                y1={8}
                y2={8}
                stroke={COLOR.inferior}
                strokeWidth={2}
                strokeDasharray={TRAZO_INFERIOR}
              />
            </ElementoDeLeyenda>
            <ElementoDeLeyenda etiqueta="Límite superior">
              <Line
                x1={0}
                x2={24}
                y1={8}
                y2={8}
                stroke={COLOR.superior}
                strokeWidth={2}
                strokeDasharray={TRAZO_SUPERIOR}
              />
            </ElementoDeLeyenda>
          </>
        ) : null}
        {hayFuera ? (
          <>
            <ElementoDeLeyenda etiqueta="Por encima de la franja">
              <Marcador x={12} y={8} posicion="encima" />
            </ElementoDeLeyenda>
            <ElementoDeLeyenda etiqueta="Por debajo de la franja">
              <Marcador x={12} y={8} posicion="debajo" />
            </ElementoDeLeyenda>
          </>
        ) : null}
      </View>
    </View>
  );
}

function fueraDeFranja(cuantos: number): string {
  return cuantos === 1
    ? 'Un tamiz queda fuera de la franja.'
    : `${cuantos} tamices quedan fuera de la franja.`;
}

/**
 * El punto de un tamiz: círculo si está dentro; triángulo hacia arriba o hacia abajo
 * si queda por encima o por debajo de la franja (RF-68).
 */
function Marcador({ x, y, posicion }: { x: number; y: number; posicion: PosicionEnFranja }) {
  if (posicion === 'dentro') return <Circle cx={x} cy={y} r={3.5} fill={COLOR.ensayo} />;
  const t = 6;
  const puntas =
    posicion === 'encima'
      ? `${x},${y - t} ${x - t},${y + t * 0.7} ${x + t},${y + t * 0.7}`
      : `${x},${y + t} ${x - t},${y - t * 0.7} ${x + t},${y - t * 0.7}`;
  return <Polygon points={puntas} fill={COLOR.fuera} />;
}

function ElementoDeLeyenda({ etiqueta, children }: { etiqueta: string; children: ReactNode }) {
  return (
    <View style={estilos.elemento}>
      <Svg width={24} height={16}>
        {children}
      </Svg>
      <Text style={estilos.etiqueta}>{etiqueta}</Text>
    </View>
  );
}

const estilos = StyleSheet.create({
  vacio: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Panel.borde,
    borderStyle: 'dashed',
    padding: Spacing.three,
    gap: Spacing.one,
  },
  vacioTitulo: {
    fontSize: TextoPanel.cuerpo,
    color: Estado.na,
    fontWeight: '600',
    textAlign: 'center',
  },
  vacioDetalle: {
    fontSize: TextoPanel.apoyo,
    color: Estado.na,
    textAlign: 'center',
  },
  leyenda: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.three,
    paddingLeft: MARGEN.izquierda,
    paddingTop: Spacing.one,
  },
  elemento: { flexDirection: 'row', alignItems: 'center', gap: Spacing.one },
  etiqueta: { fontSize: TextoPanel.apoyo, color: Estado.na },
});
