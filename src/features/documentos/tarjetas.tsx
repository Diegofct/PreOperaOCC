/**
 * Las tarjetas del archivador de documentos (spec 051).
 *
 * `TarjetaDeCarpeta` es una clase de documento vista como carpeta. Todas llevan el mismo dibujo
 * (RF-11): el nombre de la clase ya dice qué hay dentro, y un ícono distinto por clase obligaría a
 * aprenderse una leyenda. Lo que sí cambia es lo que hay que atender: los vencidos en el tono de
 * «malo» y los por vencer en el de «atención», siempre con su texto, porque el color nunca va solo.
 *
 * Desde el cambio del 2026-11-20 no hay carpetas vacías: una carpeta nace con su primer documento.
 * La única que se ve en gris con «0» es la que solo tiene anulados, y solo con «Ver anulados» (RF-9,
 * RF-76). Gris no es deshabilitada: se abre igual, para ver lo anulado (RF-68). El botón «Subir el
 * primero» de la primera versión se retiró con RF-47 y RF-48.
 *
 * `TarjetaDeDocumento` reemplaza la fila de la tabla de la spec 034 (D4): lo necesario para
 * reconocer un papel sin abrirlo —qué tipo de archivo es, cómo se llama, de quién es, cuándo vence,
 * quién lo subió y cuánto pesa—. La tarjeta no sabe de la API: abrir y anular los decide quien la
 * monta, igual que hacía la tabla. Un anulado se sigue pudiendo abrir (RF-65): es evidencia.
 */
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { FuentePanel, Movimiento, Panel, Radio, Sombra, Spacing, TextoPanel } from '@/constants/theme';
import { Acciones, Boton, Etiqueta, Tarjeta } from '@/features/panel/componentes';
import type { DocumentoDelLugar } from '@/features/panel/contratos';
import { Icono } from '@/features/panel/iconos';
import { fechaDelCorte } from '@/shared/rules/cortes';
import {
  formatoDeArchivo,
  tamanoLegible,
  type CarpetaDelArchivador,
  type FormatoDeArchivo,
} from '@/shared/rules/documentos';

export function TarjetaDeCarpeta({ carpeta, alAbrir }: { carpeta: CarpetaDelArchivador; alAbrir: () => void }) {
  const { nombre, vigentes, vencidos, porVencer, vacia } = carpeta;
  const cuantos = vigentes === 1 ? '1 documento' : `${vigentes} documentos`;

  return (
    <View style={[estilos.tarjeta, vacia && estilos.vacia]}>
      <Pressable
        onPress={alAbrir}
        accessibilityRole="button"
        accessibilityLabel={`Carpeta ${nombre}: ${cuantos}${vencidos ? `, ${vencidos} vencidos` : ''}${porVencer ? `, ${porVencer} por vencer` : ''}. Abrir.`}
        style={({ hovered }) => [estilos.zona, hovered && estilos.encima]}
      >
        <View style={estilos.cabeza}>
          <Icono nombre="documentos" color={vacia ? Panel.textoApoyo : Panel.texto} tamano={28} />
          <Text style={[estilos.numero, vacia && estilos.textoVacio]}>{vigentes}</Text>
        </View>
        <Text style={[estilos.nombre, vacia && estilos.textoVacio]} numberOfLines={2}>
          {nombre}
        </Text>
        {vencidos || porVencer ? (
          <View style={estilos.avisos}>
            {vencidos ? <Etiqueta tono="malo">{vencidos === 1 ? '1 vencido' : `${vencidos} vencidos`}</Etiqueta> : null}
            {porVencer ? <Etiqueta tono="atencion">{`${porVencer} por vencer`}</Etiqueta> : null}
          </View>
        ) : (
          <Text style={estilos.apoyo}>{vacia ? 'Solo anulados' : cuantos}</Text>
        )}
      </Pressable>
    </View>
  );
}

/** El texto de cada formato (RF-26). Un tipo que no se reconoce se llama «Archivo»: nunca queda vacío. */
const NOMBRE_DEL_FORMATO: Record<FormatoDeArchivo, string> = { pdf: 'PDF', imagen: 'Imagen', word: 'Word', excel: 'Excel' };

export function TarjetaDeDocumento({
  documento: d,
  carpeta,
  alAbrir,
  alAnular,
}: {
  documento: DocumentoDelLugar;
  /** El nombre de su carpeta, solo en los resultados de la búsqueda (RF-40). */
  carpeta?: string;
  /** `descargar` es verdadero para Word y Excel, que el navegador no muestra (RF-34). */
  alAbrir: (descargar: boolean) => void;
  /** Sin él no hay botón «Anular»: solo gerencia anula (RF-35). */
  alAnular?: () => void;
}) {
  const formato = formatoDeArchivo(d.mime);
  const seAbre = formato === 'pdf' || formato === 'imagen';
  const tamano = tamanoLegible(d.bytes);

  return (
    <Tarjeta>
      <View style={estilos.documento}>
        <View style={estilos.cabeza}>
          <View style={estilos.formato}>
            <Icono nombre={formato === 'imagen' ? 'imagen' : 'archivo'} color={Panel.textoApoyo} tamano={18} />
            <Text style={estilos.formatoTexto}>{formato ? NOMBRE_DEL_FORMATO[formato] : 'Archivo'}</Text>
          </View>
          {d.anulado ? (
            <Etiqueta tono="neutro">⊘ Anulado</Etiqueta>
          ) : d.aviso ? (
            // RF-31: el color con su símbolo y su texto, como las cifras de estado de la 050.
            <Etiqueta tono={d.aviso.estado === 'vencido' ? 'malo' : 'atencion'}>
              {`${d.aviso.estado === 'vencido' ? '✕' : '◷'} ${d.aviso.texto}`}
            </Etiqueta>
          ) : null}
        </View>

        {carpeta ? <Text style={estilos.apoyo}>{`Carpeta: ${carpeta}`}</Text> : null}
        <View style={estilos.titulo}>
          <Text style={[estilos.nombre, d.anulado && estilos.tachado]} numberOfLines={2}>
            {d.nombre}
          </Text>
          <Text style={estilos.apoyo} numberOfLines={1}>
            {d.nombreArchivo}
          </Text>
        </View>

        <View style={estilos.datos}>
          <Dato titulo="Proveedor o tercero" valor={d.proveedor || '—'} />
          <Dato titulo="Fecha" valor={fechaDelCorte(d.fecha)} />
          <Dato titulo="Vence" valor={d.vence ? fechaDelCorte(d.vence) : 'No vence'} />
          {/* RF-69: sin tamaño guardado no se inventa uno. */}
          {tamano ? <Dato titulo="Tamaño" valor={tamano} /> : null}
        </View>

        <Text style={estilos.apoyo}>{`Subido por ${d.subidoPor} el ${fechaDelCorte(d.subidoEn.slice(0, 10))}`}</Text>
        {d.anulado ? (
          <View style={estilos.anulacion}>
            <Text style={estilos.apoyo}>{`Anulado por ${d.anulado.por} el ${fechaDelCorte(d.anulado.en.slice(0, 10))}`}</Text>
            <Text style={estilos.texto}>{`Motivo: ${d.anulado.motivo}`}</Text>
          </View>
        ) : null}

        <Acciones>
          <Boton titulo={seAbre ? 'Abrir' : 'Descargar'} tono="secundario" onPress={() => alAbrir(!seAbre)} />
          {alAnular && !d.anulado ? <Boton titulo="Anular" tono="peligro" onPress={alAnular} /> : null}
        </Acciones>
      </View>
    </Tarjeta>
  );
}

function Dato({ titulo, valor }: { titulo: string; valor: string }) {
  return (
    <View style={estilos.dato}>
      <Text style={estilos.datoTitulo}>{titulo}</Text>
      <Text style={estilos.texto}>{valor}</Text>
    </View>
  );
}

const estilos = StyleSheet.create({
  tarjeta: {
    borderRadius: Radio.lg,
    borderCurve: 'continuous',
    backgroundColor: Panel.superficie,
    boxShadow: Sombra.tarjeta,
    overflow: 'hidden',
  },
  // Sin sombra y sobre el tono de cabecera: se hunde en el lienzo, que es lo que dice «aquí no hay».
  vacia: { backgroundColor: Panel.fondoCabecera, boxShadow: 'none' },
  zona: {
    gap: Spacing.two,
    padding: Spacing.three,
    transitionProperty: 'background-color',
    transitionDuration: `${Movimiento.rapido}ms`,
  },
  encima: { backgroundColor: Panel.fondoHover },
  cabeza: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  numero: { fontFamily: FuentePanel.texto, fontSize: TextoPanel.cifra, fontWeight: '800', color: Panel.texto },
  nombre: { fontFamily: FuentePanel.texto, fontSize: TextoPanel.cuerpo, fontWeight: '700', color: Panel.texto },
  textoVacio: { color: Panel.textoApoyo },
  avisos: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.one },
  apoyo: { fontFamily: FuentePanel.texto, fontSize: TextoPanel.apoyo, color: Panel.textoApoyo },
  documento: { gap: Spacing.two },
  formato: { flexDirection: 'row', alignItems: 'center', gap: Spacing.one },
  formatoTexto: { fontFamily: FuentePanel.texto, fontSize: TextoPanel.apoyo, fontWeight: '700', color: Panel.textoApoyo },
  titulo: { gap: Spacing.half },
  tachado: { textDecorationLine: 'line-through', color: Panel.textoApoyo },
  datos: { flexDirection: 'row', flexWrap: 'wrap', columnGap: Spacing.four, rowGap: Spacing.two },
  dato: { gap: Spacing.half },
  datoTitulo: { fontFamily: FuentePanel.texto, fontSize: TextoPanel.micro, fontWeight: '600', color: Panel.textoApoyo },
  texto: { fontFamily: FuentePanel.texto, fontSize: TextoPanel.cuerpo, color: Panel.texto },
  anulacion: { gap: Spacing.half },
});

