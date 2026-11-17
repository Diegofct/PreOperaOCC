/**
 * Lo comprometido por las requisiciones de la obra contra la planificación vigente (spec 048,
 * RF-42, RF-50 a RF-53, RF-66).
 *
 * Una fila por ítem, rubro y renglón indirecto, en el orden de la planificación, con lo planeado,
 * lo comprometido y lo que queda; lo que se pasa va arriba de todo en un aviso y resaltado en su
 * fila (RF-50). La mano de obra indirecta es una sola fila, porque así se imputa (RF-66). Aparte,
 * lo «Fuera de lo planeado» y lo que perdió su opción al cambiar de versión (RF-51). Cada fila
 * abre sus requisiciones (RF-52).
 *
 * Solo se pide si quien mira es de los que lo ven (RF-53): a los demás el servidor les diría 403,
 * y no tiene sentido mostrarles un error por algo que no pidieron. Por defecto se ven las filas con
 * algo comprometido: con 158 opciones, las vacías taparían lo que importa.
 *
 * Las columnas caben en `MaxContentWidthPanel`: 400 + 150 + 150 + 150 + 120 + 180 = 1 150, más
 * 5 × 16 y 32: 1 262.
 */
import { router, type Href } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { FuentePanel, Panel, Spacing, TextoPanel } from '@/constants/theme';
import { api } from '@/features/panel/cliente-api';
import { Aviso, Casilla, Celda, Etiqueta, Seccion, Tabla, type Columna } from '@/features/panel/componentes';
import { useListado } from '@/features/panel/marco';
import type { ResumenComprometidoRespuesta } from '@/features/panel/requisiciones';
import { usePersona } from '@/features/panel/sesion';
import { enPesos } from '@/shared/rules/pesos';
import { TEXTO_SE_PASA, TEXTO_SIN_OPCION, ETIQUETA_FUERA, veElResumenDeLoComprometido, type FilaDelResumen } from '@/shared/rules/requisicion-planificacion';

const pesosO = (valor: number | null, sinValor = 'Sin precio de costo') => (valor === null ? sinValor : enPesos(valor));

export function ResumenComprometido({ planificacionId, obraId }: { planificacionId: string; obraId: string }) {
  const { rol } = usePersona();
  const ve = veElResumenDeLoComprometido(rol);
  const cargado = useListado<ResumenComprometidoRespuesta>(
    useCallback(() => (ve ? api.planificaciones.comprometido(planificacionId).then((r) => [r]) : Promise.resolve([])), [ve, planificacionId]),
  );
  const [todas, setTodas] = useState(false);
  if (!ve) return null;
  const r = cargado.datos[0];
  if (cargado.error) return <Aviso tono="error">{cargado.error}</Aviso>;
  if (!r) return null;

  /** RF-52: abre la requisición en Requisiciones de la obra. */
  const abrir = (id: string) => {
    const req = r.requisiciones[id];
    if (req) router.push(`/panel/proyectos/${obraId}/requisiciones?requisicion=${req.tipo}:${id}` as Href);
  };
  const enlaces = (ids: string[]) => (
    <View style={estilos.enlaces}>
      {ids.length === 0 ? <Text style={estilos.apoyo}>—</Text> : null}
      {ids.map((id) => (
        <Pressable key={id} onPress={() => abrir(id)} accessibilityRole="link">
          <Text style={estilos.enlace}>{r.requisiciones[id]?.codigo ?? 'Requisición'}</Text>
        </Pressable>
      ))}
    </View>
  );

  const pasadas = r.filas.filter((f) => f.exceso !== null);
  const filas = (todas ? r.filas : r.filas.filter((f) => f.comprometido > 0)).map((f) => ({ ...f, id: f.llave }));
  const columnas: Columna<FilaDelResumen & { id: string }>[] = [
    {
      clave: 'va',
      titulo: 'Va a',
      ancho: 400,
      pintar: (f) => (
        <View style={estilos.celdaDoble}>
          <Text style={estilos.texto}>{f.etiqueta}</Text>
          <Text style={estilos.apoyo}>{[f.capitulo, f.frente].filter(Boolean).join(' · ')}</Text>
        </View>
      ),
    },
    { clave: 'planeado', titulo: 'Planeado', ancho: 150, pintar: (f) => <Celda>{pesosO(f.planeado)}</Celda> },
    { clave: 'comprometido', titulo: 'Comprometido', ancho: 150, pintar: (f) => <Celda>{enPesos(f.comprometido)}</Celda> },
    { clave: 'queda', titulo: 'Queda', ancho: 150, pintar: (f) => <Celda>{f.queda === null ? '—' : enPesos(f.queda)}</Celda> },
    {
      clave: 'exceso',
      titulo: 'Aviso',
      ancho: 120,
      pintar: (f) => (f.exceso !== null ? <Etiqueta tono="malo">{`Se pasa ${enPesos(f.exceso)}`}</Etiqueta> : <Celda>—</Celda>),
    },
    { clave: 'requisiciones', titulo: 'Requisiciones', ancho: 180, pintar: (f) => enlaces(f.requisiciones) },
  ];

  return (
    <Seccion titulo="Lo comprometido por las requisiciones">
      <View style={estilos.columna}>
        <Text style={estilos.apoyo}>
          Lo que las requisiciones de la obra ya comprometieron contra esta planificación: el estimado mientras no hay compra, y lo
          comprado desde que se registra.
        </Text>
        {pasadas.length ? (
          <Aviso tono="error">{`${TEXTO_SE_PASA} en ${pasadas.length} ${pasadas.length === 1 ? 'parte' : 'partes'}: ${pasadas
            .map((f) => `${f.etiqueta} (${enPesos(f.exceso ?? 0)})`)
            .join('; ')}.`}</Aviso>
        ) : null}
        <View style={estilos.fila}>
          <Casilla etiqueta="Ver también lo que no tiene nada comprometido" marcada={todas} onChange={setTodas} />
        </View>
        <Tabla columnas={columnas} filas={filas} vacio="Ninguna requisición ha comprometido nada todavía." />
        <View style={estilos.fila}>
          <View style={estilos.celdaDoble}>
            <Text style={estilos.fuerte}>{`${ETIQUETA_FUERA}: ${enPesos(r.fuera.valor)}`}</Text>
            {enlaces(r.fuera.requisiciones)}
          </View>
          <View style={estilos.celdaDoble}>
            <Text style={estilos.fuerte}>{`${TEXTO_SIN_OPCION}: ${enPesos(r.sinOpcion.valor)}`}</Text>
            {enlaces(r.sinOpcion.requisiciones)}
          </View>
        </View>
      </View>
    </Seccion>
  );
}

const estilos = StyleSheet.create({
  columna: { gap: Spacing.two },
  fila: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.four, alignItems: 'flex-start' },
  celdaDoble: { gap: Spacing.half },
  enlaces: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.one },
  texto: { fontFamily: FuentePanel.texto, fontSize: TextoPanel.cuerpo, color: Panel.texto },
  fuerte: { fontFamily: FuentePanel.texto, fontSize: TextoPanel.cuerpo, fontWeight: '600', color: Panel.texto },
  apoyo: { fontFamily: FuentePanel.texto, fontSize: TextoPanel.apoyo, color: Panel.textoApoyo },
  enlace: { fontFamily: FuentePanel.texto, fontSize: TextoPanel.cuerpo, color: Panel.accion, textDecorationLine: 'underline' },
});
