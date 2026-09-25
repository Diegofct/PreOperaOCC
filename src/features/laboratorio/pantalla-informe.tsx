/**
 * El informe del ensayo, para imprimir o guardar como PDF (spec 018, RF-95 a RF-100).
 *
 * ── Por qué una página y no una ventana ──
 *
 * Una ventana del panel se desplaza por dentro y tiene alto máximo: al imprimirla, el
 * navegador cortaría lo que no cabe en su caja. En una página, el informe es un bloque
 * del documento y se imprime entero.
 *
 * ── Cómo se imprime solo el informe ──
 *
 * Una hoja de estilos de impresión, puesta mientras la página está abierta, esconde todo
 * —la barra, el menú, los botones de arriba— y deja visible únicamente el bloque marcado
 * con su `id`. `@page` fija la hoja carta (RF-100, pendiente de confirmar el papel).
 * El navegador guarda como PDF desde su propio diálogo de impresión (RF-99): no hace
 * falta generar PDF en el servidor ni una dependencia nueva.
 *
 * ── El formato ──
 *
 * Es el LAB-FR-01-2025 de GEOLAB, con su logo (RF-95, precisado el 2026-09-24): el
 * laboratorio es contratado y el formato es suyo. El encabezado repite el del Excel
 * (anexo D). Las cifras pasan por `formatearNumero`, el redondeo de Excel, como en la
 * pantalla: el informe no puede decir un decimal distinto del que se aprobó.
 *
 * ── Lo que no está aprobado se dice en el papel ──
 *
 * Un borrador, un enviado o un devuelto salen con una marca que dice que no están
 * aprobados (RF-97); un anulado, con ANULADO y el motivo (RF-98). Un papel sin esa marca
 * es un acta que alguien podría tomar por buena.
 */
import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect } from 'react';
import { Image, Platform, StyleSheet, Text, View } from 'react-native';

import { Colors, Estado, Panel, Spacing, TextoPanel } from '@/constants/theme';
import { SERIE_DE_TAMICES, tamizPorId } from '@/shared/catalogos/tamices';
import {
  ETIQUETA_ESTADO_ENSAYO,
  formatearNumero,
  type PosicionEnFranja,
} from '@/shared/rules/granulometria';

import { api } from '@/features/panel/cliente-api';
import { Acciones, Aviso, Boton } from '@/features/panel/componentes';
import type { EnsayoDetalle } from '@/features/panel/contratos';
import { MarcoPantalla, useListado } from '@/features/panel/marco';

import { firmaLegible } from './acciones-ensayo';
import { CurvaGranulometrica } from './curva-granulometrica';

/** El encabezado del formato de GEOLAB, tal como está en el Excel (anexo D). */
const FORMATO = {
  titulo: 'DETERMINACIÓN DE LOS TAMAÑOS DE LAS PARTÍCULAS DE SUELOS',
  norma: 'INV E 123 - 13',
  codigo: 'LAB-FR-01-2025',
  version: 'Versión 0.0',
  actualizacion: '2025/08/11',
} as const;

/** El `id` del bloque que se imprime. */
const ID_DE_LA_HOJA = 'informe-granulometria';

/** El ancho del informe: una hoja carta menos márgenes, a 96 puntos por pulgada. */
const ANCHO_DE_HOJA = 720;

/**
 * Lo que se imprime. `visibility` y no `display`: esconder con `display` rompería la
 * cadena de contenedores de React Native Web y el informe saldría en blanco; con
 * `visibility`, los contenedores siguen ahí, invisibles, y solo el informe se ve.
 *
 * `transform` y `overflow` se anulan porque el `ScrollView` del panel lleva una
 * transformación vacía: con ella, `position: fixed` se mide desde el `ScrollView` y no
 * desde la hoja —el informe salía corrido hacia abajo y se partía en dos páginas— y su
 * recorte cortaba lo que no cabía en la caja. Solo al imprimir, cuando lo demás está oculto.
 * **Menos el SVG**: la rotación del rótulo vertical de la curva es un `transform`, y
 * anulado el rótulo salía acostado encima del eje.
 */
const ESTILO_DE_IMPRESION = `
@page { size: letter; margin: 10mm; }
@media print {
  body * { visibility: hidden !important; }
  body *:not(svg, svg *) { transform: none !important; }
  html, body, body * { overflow: visible !important; }
  #${ID_DE_LA_HOJA}, #${ID_DE_LA_HOJA} * { visibility: visible !important; }
  #${ID_DE_LA_HOJA} { position: fixed !important; left: 0; top: 0; width: ${ANCHO_DE_HOJA}px; border: none !important; }
  html, body { background: ${Colors.light.background} !important; }
}`;

/** `YYYY-MM-DD` en la obra: la fecha de emisión es el día de la aprobación (RF-84). */
function diaEnObra(iso: string): string {
  return new Date(iso).toLocaleDateString('en-CA', { timeZone: 'America/Bogota' });
}

export default function PantallaInforme() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const ensayo = useListado<EnsayoDetalle>(
    useCallback(() => api.laboratorio.detalle(id).then((d) => [d]), [id]),
  );
  const detalle = ensayo.datos[0];

  // La hoja de impresión vive mientras esta página está abierta, y solo en la web.
  useEffect(() => {
    if (Platform.OS !== 'web') return;
    const hoja = document.createElement('style');
    hoja.setAttribute('data-hoja', 'informe-granulometria');
    hoja.textContent = ESTILO_DE_IMPRESION;
    document.head.appendChild(hoja);
    return () => hoja.remove();
  }, []);

  return (
    <MarcoPantalla
      modulo="laboratorio"
      exigeObra
      titulo="Informe para imprimir"
      descripcion="Al imprimir sale solo la hoja, sin el menú del panel. Para PDF, escoja «Guardar como PDF» en el diálogo de impresión."
      error={ensayo.error}
      cargando={ensayo.cargando}
    >
      <Acciones>
        <Boton
          titulo="Imprimir o guardar PDF"
          onPress={() => {
            if (Platform.OS === 'web') window.print();
          }}
        />
        <Boton
          titulo="Volver al ensayo"
          tono="secundario"
          onPress={() => router.replace({ pathname: '/panel/laboratorio/[id]', params: { id } })}
        />
      </Acciones>
      {detalle && detalle.estado !== 'aprobado' ? (
        <Aviso tono="info">
          Este ensayo no está aprobado: el informe sale con la marca de su estado.
        </Aviso>
      ) : null}
      {detalle ? <Hoja detalle={detalle} /> : null}
    </MarcoPantalla>
  );
}

function Hoja({ detalle }: { detalle: EnsayoDetalle }) {
  const resultado = detalle.resultado;
  const completo = resultado?.completo ? resultado : null;
  const franja = detalle.franjaCopia;
  const posicion = new Map<string, PosicionEnFranja>(
    (completo?.veredicto?.tamices ?? []).map((t) => [t.tamiz, t.posicion]),
  );
  const nombreDe = (idTamiz: string) => tamizPorId(idTamiz)?.nombre ?? idTamiz;
  const sinAprobar = detalle.estado !== 'aprobado';

  return (
    // `nativeID` se vuelve el `id` del bloque en la web: es lo que la hoja de impresión deja ver.
    <View style={estilos.hoja} nativeID={ID_DE_LA_HOJA}>
      {/* RF-97 y RF-98: la marca va antes que todo, arriba de la hoja. */}
      {detalle.estado === 'anulado' && detalle.anulado ? (
        <Text style={estilos.marca}>
          {`ANULADO — ${firmaLegible(detalle.anulado)} · Motivo: ${detalle.anulado.motivo}`}
        </Text>
      ) : sinAprobar ? (
        <Text style={estilos.marca}>
          {`${ETIQUETA_ESTADO_ENSAYO[detalle.estado].toUpperCase()} — SIN APROBAR · No es un informe válido`}
        </Text>
      ) : null}

      {/* Encabezado del formato (RF-95, anexo D). */}
      <View style={estilos.encabezado}>
        <View style={[estilos.celdaEncabezado, estilos.celdaLogo]}>
          <Image
            source={require('@/../assets/logo-geolab.jpeg')}
            style={estilos.logo}
            resizeMode="contain"
            accessibilityLabel="GEOLAB Colombia SAS"
          />
        </View>
        <View style={[estilos.celdaEncabezado, estilos.celdaTitulo]}>
          <Text style={estilos.titulo}>{FORMATO.titulo}</Text>
          <Text style={estilos.norma}>{FORMATO.norma}</Text>
        </View>
        <View style={[estilos.celdaEncabezado, estilos.celdaCodigo]}>
          <Text style={estilos.dato}>{`Código ${FORMATO.codigo}`}</Text>
          <Text style={estilos.dato}>{FORMATO.version}</Text>
          <Text style={estilos.dato}>{`Actualización ${FORMATO.actualizacion}`}</Text>
        </View>
      </View>

      <Text style={estilos.obra}>{`${detalle.obraNombre} (${detalle.obraCodigo})`}</Text>

      {/* Datos de la muestra (RF-96). */}
      <View style={estilos.rejilla}>
        <Par rotulo="Material" valor={detalle.material} ancho />
        <Par rotulo="Fuente" valor={detalle.fuente} />
        <Par rotulo="N.º de informe" valor={detalle.numeroInforme} />
        <Par rotulo="Localización" valor={detalle.localizacion} ancho />
        <Par rotulo="Recepción" valor={detalle.fechaRecepcion} />
        <Par rotulo="Ejecución" valor={detalle.fechaEjecucion} />
        <Par rotulo="Emisión" valor={detalle.aprobado ? diaEnObra(detalle.aprobado.en) : null} />
        <Par rotulo="Franja" valor={franja ? `${franja.nombre} — ${franja.norma}` : null} ancho />
      </View>

      <View style={estilos.rejilla}>
        <Par estrecho rotulo="Masa húmeda" valor={gramos(detalle.masas.humeda)} />
        <Par estrecho rotulo="Masa seca M1" valor={gramos(detalle.masas.seca)} />
        <Par estrecho rotulo="Tara" valor={gramos(detalle.masas.tara)} />
        <Par estrecho rotulo="Masa lavada M2" valor={gramos(detalle.masas.lavada)} />
        <Par
          estrecho
          rotulo="Humedad"
          valor={
            completo && completo.humedad !== null
              ? `${formatearNumero(completo.humedad, 1)} %`
              : null
          }
        />
        <Par
          estrecho
          rotulo="Tamaño máximo"
          valor={
            completo
              ? 'tamiz' in completo.tamanoMaximo
                ? nombreDe(completo.tamanoMaximo.tamiz)
                : `> ${nombreDe(completo.tamanoMaximo.mayorQue)}`
              : null
          }
        />
        <Par
          estrecho
          rotulo="T. máx. nominal"
          valor={completo?.tamanoMaximoNominal ? nombreDe(completo.tamanoMaximoNominal) : null}
        />
      </View>

      {/* La tabla del formato (RF-96), de solo lectura. */}
      <View style={estilos.tabla}>
        <View style={[estilos.fila, estilos.filaCabecera]}>
          {[
            'Tamiz',
            'mm',
            'Retenido (g)',
            '% retenido',
            '% ret. acum.',
            '% pasa',
            'Franja',
            '',
          ].map((t, i) => (
            <Text key={i} style={[estilos.celda, estilos.cabecera, { width: ANCHOS[i] }]}>
              {t}
            </Text>
          ))}
        </View>
        {SERIE_DE_TAMICES.map((tamiz, i) => {
          const renglon = completo?.renglones[i];
          const limite = tamiz.id === 'fondo' ? undefined : franja?.limites[tamiz.id];
          const lugar = posicion.get(tamiz.id);
          const retenido = detalle.retenidos[tamiz.id];
          return (
            <View key={tamiz.id} style={estilos.fila}>
              <Text style={[estilos.celda, estilos.fuerte, { width: ANCHOS[0] }]}>
                {tamiz.nombre}
              </Text>
              <Text style={[estilos.celda, estilos.cifra, { width: ANCHOS[1] }]}>
                {tamiz.mm === null ? '—' : String(tamiz.mm).replace('.', ',')}
              </Text>
              <Text style={[estilos.celda, estilos.cifra, { width: ANCHOS[2] }]}>
                {retenido === null || retenido === undefined ? '—' : formatearNumero(retenido, 1)}
              </Text>
              <Cifra valor={renglon?.porcentajeRetenido} ancho={ANCHOS[3]} />
              <Cifra valor={renglon?.retenidoAcumulado} ancho={ANCHOS[4]} />
              <Cifra valor={renglon?.pasa ?? undefined} ancho={ANCHOS[5]} fuerte />
              <Text style={[estilos.celda, estilos.cifra, { width: ANCHOS[6] }]}>
                {limite ? `${limite.min}–${limite.max}` : '—'}
              </Text>
              <Text style={[estilos.celda, estilos.fuera, { width: ANCHOS[7] }]}>
                {lugar === 'encima' ? '▲ Encima' : lugar === 'debajo' ? '▼ Debajo' : ''}
              </Text>
            </View>
          );
        })}
      </View>

      {completo ? (
        <CurvaGranulometrica
          resultado={completo}
          franja={franja}
          ancho={ANCHO_DE_HOJA}
          alto={200}
        />
      ) : (
        <Text style={estilos.texto}>Sin masas completas: no hay curva.</Text>
      )}

      {/* Veredicto y lavado (RF-96). */}
      <View style={estilos.veredicto}>
        <Text style={[estilos.veredictoTexto, detalle.veredicto === 'no_cumple' && estilos.malo]}>
          {detalle.veredicto === 'cumple'
            ? '✓ CUMPLE'
            : detalle.veredicto === 'no_cumple'
              ? '✗ NO CUMPLE'
              : '— Sin veredicto'}
        </Text>
        <Text style={estilos.texto}>
          {completo?.lavado
            ? `Control de lavado: ${formatearNumero(completo.lavado.porcentaje, 2)} % de diferencia con M2${completo.lavado.aviso ? ' (supera el 0,3 % de la INV E-123)' : ''}.`
            : 'Control de lavado: sin M2.'}
        </Text>
      </View>

      <Text style={estilos.texto}>
        <Text style={estilos.fuerte}>Observaciones: </Text>
        {detalle.observaciones ?? 'Sin observaciones.'}
      </Text>

      {/* Revisó y Aprobó (RF-96): nombre, cargo y fecha de quien firmó. */}
      <View style={estilos.firmas}>
        <Firma rotulo="REVISÓ" firma={detalle.revisado} />
        <Firma rotulo="APROBÓ" firma={detalle.aprobado} />
      </View>
    </View>
  );
}

const ANCHOS = [60, 50, 90, 80, 90, 70, 70, 80];

function gramos(valor: number | null): string | null {
  return valor === null ? null : `${formatearNumero(valor, 1)} g`;
}

function Par({
  rotulo,
  valor,
  ancho,
  estrecho,
}: {
  rotulo: string;
  valor: string | null;
  ancho?: boolean;
  /** Cuatro por renglón: las masas y los tamaños. */
  estrecho?: boolean;
}) {
  return (
    <Text style={[estilos.par, ancho && estilos.parAncho, estrecho && estilos.parEstrecho]}>
      <Text style={estilos.rotulo}>{`${rotulo}: `}</Text>
      {valor ?? '—'}
    </Text>
  );
}

function Cifra({
  valor,
  ancho,
  fuerte,
}: {
  valor: number | undefined;
  ancho: number;
  fuerte?: boolean;
}) {
  return (
    <Text style={[estilos.celda, estilos.cifra, fuerte && estilos.fuerte, { width: ancho }]}>
      {valor === undefined ? '—' : formatearNumero(valor, 2)}
    </Text>
  );
}

function Firma({
  rotulo,
  firma,
}: {
  rotulo: string;
  firma: { nombre: string; cargo: string | null; en: string } | null;
}) {
  return (
    <View style={estilos.firma}>
      <Text style={estilos.rotulo}>{rotulo}</Text>
      <Text style={estilos.texto}>{firma ? firma.nombre : '—'}</Text>
      <Text style={estilos.texto}>{firma?.cargo ?? ' '}</Text>
      <Text style={estilos.texto}>{firma ? diaEnObra(firma.en) : ' '}</Text>
    </View>
  );
}

const estilos = StyleSheet.create({
  hoja: {
    width: ANCHO_DE_HOJA,
    backgroundColor: Colors.light.background,
    padding: Spacing.two,
    gap: Spacing.two,
    borderWidth: 1,
    borderColor: Panel.borde,
    alignSelf: 'flex-start',
  },
  marca: {
    fontSize: TextoPanel.cuerpo,
    fontWeight: '800',
    color: Estado.noConforme,
    borderWidth: 2,
    borderColor: Estado.noConforme,
    padding: Spacing.two,
    textAlign: 'center',
  },
  encabezado: { flexDirection: 'row', borderWidth: 1, borderColor: Panel.borde },
  celdaEncabezado: { padding: Spacing.two, justifyContent: 'center' },
  celdaLogo: {
    width: 90,
    alignItems: 'center',
    borderRightWidth: 1,
    borderRightColor: Panel.borde,
  },
  celdaTitulo: { flex: 1, alignItems: 'center', gap: Spacing.one },
  celdaCodigo: { width: 170, borderLeftWidth: 1, borderLeftColor: Panel.borde, gap: Spacing.half },
  logo: { width: 60, height: 60 },
  titulo: {
    fontSize: TextoPanel.cuerpo,
    fontWeight: '800',
    textAlign: 'center',
    color: Colors.light.text,
  },
  norma: { fontSize: TextoPanel.apoyo, fontWeight: '700', color: Colors.light.text },
  dato: { fontSize: TextoPanel.micro, color: Colors.light.text },
  obra: {
    fontSize: TextoPanel.apoyo,
    fontWeight: '700',
    color: Colors.light.text,
    textAlign: 'center',
  },
  rejilla: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    columnGap: Spacing.three,
    rowGap: Spacing.half,
  },
  par: { fontSize: TextoPanel.micro, color: Colors.light.text, width: 210 },
  parAncho: { width: 440 },
  parEstrecho: { width: 160 },
  rotulo: { fontSize: TextoPanel.micro, fontWeight: '700', color: Colors.light.textSecondary },
  tabla: { borderWidth: 1, borderColor: Panel.borde },
  fila: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: Panel.bordeSuave },
  filaCabecera: { backgroundColor: Panel.fondoCabecera },
  celda: {
    fontSize: TextoPanel.micro,
    color: Colors.light.text,
    paddingHorizontal: Spacing.one,
  },
  cabecera: { fontWeight: '700', color: Colors.light.textSecondary },
  cifra: { textAlign: 'right', fontVariant: ['tabular-nums'] },
  fuerte: { fontWeight: '700' },
  fuera: { fontWeight: '700', color: Estado.noConforme },
  veredicto: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three, flexWrap: 'wrap' },
  veredictoTexto: { fontSize: TextoPanel.seccion, fontWeight: '800', color: Estado.conforme },
  malo: { color: Estado.noConforme },
  texto: { fontSize: TextoPanel.micro, color: Colors.light.text },
  firmas: { flexDirection: 'row', gap: Spacing.four, marginTop: Spacing.two },
  firma: {
    flex: 1,
    borderTopWidth: 1,
    borderTopColor: Colors.light.text,
    paddingTop: Spacing.one,
    gap: Spacing.half,
  },
});
