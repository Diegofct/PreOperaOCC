/**
 * Las respuestas del asistente vienen en Markdown (spec 028, RF-23: resumen, títulos y
 * tablas). Esto pinta solo lo que el asistente usa —párrafos, títulos `##`, listas,
 * **negrita** y tablas— con los componentes de React Native, sin una librería nueva
 * (constitución, principio 8). Lo que no reconoce sale como texto, tal cual.
 *
 * Se repinta en cada pedazo que llega mientras se redacta (RF-13): una tabla a medio
 * escribir se ve como sus filas completas hasta ese momento.
 */
import { Fragment, type ReactNode } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { FuentePanel, Panel, Radio, Spacing, TextoPanel } from '@/constants/theme';

export type Bloque =
  | { tipo: 'titulo'; nivel: number; texto: string }
  | { tipo: 'parrafo'; texto: string }
  | { tipo: 'lista'; ordenada: boolean; items: string[] }
  | { tipo: 'tabla'; encabezado: string[]; filas: string[][] };

const celdasDe = (linea: string) =>
  linea
    .trim()
    .replace(/^\||\|$/g, '')
    .split('|')
    .map((c) => c.trim());

const esSeparadorDeTabla = (linea: string) => /^\s*\|?\s*:?-{2,}:?\s*(\|\s*:?-{2,}:?\s*)*\|?\s*$/.test(linea);

export function bloquesDe(markdown: string): Bloque[] {
  const lineas = markdown.split('\n');
  const bloques: Bloque[] = [];
  let i = 0;
  while (i < lineas.length) {
    const linea = lineas[i];
    if (!linea.trim()) {
      i++;
      continue;
    }
    const titulo = /^(#{1,4})\s+(.*)$/.exec(linea);
    if (titulo) {
      bloques.push({ tipo: 'titulo', nivel: titulo[1].length, texto: titulo[2] });
      i++;
      continue;
    }
    if (linea.trim().startsWith('|') && i + 1 < lineas.length && esSeparadorDeTabla(lineas[i + 1])) {
      const encabezado = celdasDe(linea);
      const filas: string[][] = [];
      i += 2;
      while (i < lineas.length && lineas[i].trim().startsWith('|')) filas.push(celdasDe(lineas[i++]));
      bloques.push({ tipo: 'tabla', encabezado, filas });
      continue;
    }
    const item = /^\s*([-*•]|\d+[.)])\s+(.*)$/.exec(linea);
    if (item) {
      const ordenada = /\d/.test(item[1]);
      const items: string[] = [];
      while (i < lineas.length) {
        const m = /^\s*([-*•]|\d+[.)])\s+(.*)$/.exec(lineas[i]);
        if (!m) break;
        items.push(m[2]);
        i++;
      }
      bloques.push({ tipo: 'lista', ordenada, items });
      continue;
    }
    const parrafo: string[] = [];
    while (i < lineas.length && lineas[i].trim() && !/^(#{1,4}\s|\s*\||\s*([-*•]|\d+[.)])\s)/.test(lineas[i])) parrafo.push(lineas[i++]);
    if (parrafo.length === 0) parrafo.push(lineas[i++]);
    bloques.push({ tipo: 'parrafo', texto: parrafo.join('\n') });
  }
  return bloques;
}

/** `**negrita**` y `` `código` `` dentro de un texto. */
function enLinea(texto: string): ReactNode[] {
  return texto.split(/(\*\*[^*]+\*\*|`[^`]+`)/g).map((trozo, i) => {
    if (/^\*\*[^*]+\*\*$/.test(trozo)) return <Text key={i} style={estilos.negrita}>{trozo.slice(2, -2)}</Text>;
    if (/^`[^`]+`$/.test(trozo)) return <Text key={i} style={estilos.codigo}>{trozo.slice(1, -1)}</Text>;
    return <Fragment key={i}>{trozo}</Fragment>;
  });
}

export function Markdown({ texto }: { texto: string }) {
  return (
    <View style={estilos.columna}>
      {bloquesDe(texto).map((b, i) => {
        if (b.tipo === 'titulo') {
          return (
            <Text key={i} style={[estilos.texto, estilos.titulo, b.nivel <= 1 && estilos.tituloGrande]} accessibilityRole="header">
              {enLinea(b.texto)}
            </Text>
          );
        }
        if (b.tipo === 'lista') {
          return (
            <View key={i} style={estilos.lista}>
              {b.items.map((item, j) => (
                <View key={j} style={estilos.item}>
                  <Text style={[estilos.texto, estilos.vineta]}>{b.ordenada ? `${j + 1}.` : '•'}</Text>
                  <Text style={[estilos.texto, estilos.textoDelItem]}>{enLinea(item)}</Text>
                </View>
              ))}
            </View>
          );
        }
        if (b.tipo === 'tabla') {
          return (
            <ScrollView key={i} horizontal style={estilos.marcoTabla}>
              <View>
                <View style={[estilos.fila, estilos.filaEncabezado]}>
                  {b.encabezado.map((c, j) => (
                    <Text key={j} style={[estilos.texto, estilos.celda, estilos.negrita]}>
                      {enLinea(c)}
                    </Text>
                  ))}
                </View>
                {b.filas.map((fila, k) => (
                  <View key={k} style={[estilos.fila, k % 2 === 1 && estilos.filaAlterna]}>
                    {b.encabezado.map((_, j) => (
                      <Text key={j} style={[estilos.texto, estilos.celda]}>
                        {enLinea(fila[j] ?? '')}
                      </Text>
                    ))}
                  </View>
                ))}
              </View>
            </ScrollView>
          );
        }
        return (
          <Text key={i} style={estilos.texto}>
            {enLinea(b.texto)}
          </Text>
        );
      })}
    </View>
  );
}

const estilos = StyleSheet.create({
  columna: { gap: Spacing.two },
  texto: { fontFamily: FuentePanel.texto, fontSize: TextoPanel.cuerpo, lineHeight: 21, color: Panel.texto },
  titulo: { fontWeight: '700', fontSize: TextoPanel.cuerpo + 2, marginTop: Spacing.one },
  tituloGrande: { fontSize: TextoPanel.seccion },
  negrita: { fontWeight: '700' },
  codigo: { fontFamily: 'monospace', backgroundColor: Panel.fondoAlterno },
  lista: { gap: Spacing.one },
  item: { flexDirection: 'row', gap: Spacing.two },
  vineta: { minWidth: 16, color: Panel.textoApoyo },
  textoDelItem: { flex: 1 },
  marcoTabla: { borderWidth: 1, borderColor: Panel.bordeSuave, borderRadius: Radio.sm },
  fila: { flexDirection: 'row' },
  filaEncabezado: { backgroundColor: Panel.fondoCabecera },
  filaAlterna: { backgroundColor: Panel.fondoAlterno },
  celda: { minWidth: 110, maxWidth: 280, paddingVertical: Spacing.one + 2, paddingHorizontal: Spacing.two },
});
