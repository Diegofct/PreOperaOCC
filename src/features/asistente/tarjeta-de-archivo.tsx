/**
 * Un archivo que generó el asistente, bajo su respuesta (spec 040, RF-19, RF-24, D7).
 *
 * Dice el formato con texto, no solo con color ni con el ícono; el nombre del archivo; cuántas
 * filas trae, y un botón para descargarlo. La descarga pasa por `fetch` (`api.asistente.
 * descargarArchivo`): si el servidor dice que ya no está disponible —venció, o la conversación
 * ya no está al alcance—, se muestra aquí mismo con su motivo. Pasados los 30 días ni se ofrece:
 * se dice cuándo venció y que se pida de nuevo.
 */
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Estado, FuentePanel, Panel, Radio, Spacing, TextoPanel } from '@/constants/theme';
import { api, mensajeDe } from '@/features/panel/cliente-api';
import type { ArchivoDelAsistenteEnPantalla } from '@/features/panel/contratos';
import { guardarArchivo } from '@/features/panel/guardar-archivo';
import { Icono } from '@/features/panel/iconos';
import { nombreDelFormato, venceEl, vigente } from '@/shared/rules/archivos-del-asistente';
import { fechaDelCorte } from '@/shared/rules/cortes';

const filas = (n: number) => (n === 1 ? '1 fila' : `${n.toLocaleString('es-CO')} filas`);

export function TarjetaDeArchivo({ archivo }: { archivo: ArchivoDelAsistenteEnPantalla }) {
  const [estado, setEstado] = useState<{ tipo: 'listo' } | { tipo: 'bajando' } | { tipo: 'error'; mensaje: string }>({ tipo: 'listo' });
  const vence = fechaDelCorte(venceEl(archivo.creadoEn));
  const disponible = vigente(archivo.creadoEn);

  const descargar = async () => {
    setEstado({ tipo: 'bajando' });
    try {
      const { contenido } = await api.asistente.descargarArchivo(archivo.mediaId);
      guardarArchivo(contenido, archivo.nombre);
      setEstado({ tipo: 'listo' });
    } catch (fallo) {
      setEstado({ tipo: 'error', mensaje: mensajeDe(fallo) });
    }
  };

  return (
    <View style={estilos.tarjeta} accessibilityLabel={`Archivo ${nombreDelFormato(archivo.formato)}: ${archivo.nombre}`}>
      <View style={estilos.icono}>
        <Icono nombre="documentos" color={Panel.texto} tamano={22} />
        <Text style={estilos.formato}>{nombreDelFormato(archivo.formato)}</Text>
      </View>
      <View style={estilos.datos}>
        <Text style={estilos.nombre} numberOfLines={2}>
          {archivo.nombre}
        </Text>
        <Text style={estilos.detalle}>
          {archivo.filas > 0 ? `${filas(archivo.filas)} · ` : ''}
          {disponible ? `se puede descargar hasta el ${vence}` : `venció el ${vence}; pídalo de nuevo al asistente`}
        </Text>
        {/* El color no es la única señal: el texto dice que no se pudo. */}
        {estado.tipo === 'error' ? <Text style={estilos.error}>{`No se pudo descargar: ${estado.mensaje}`}</Text> : null}
      </View>
      {disponible ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Descargar ${archivo.nombre}`}
          disabled={estado.tipo === 'bajando'}
          onPress={() => void descargar()}
          style={({ hovered }) => [estilos.boton, hovered && estilos.encima, estado.tipo === 'bajando' && estilos.ocupado]}
        >
          <Text style={estilos.textoBoton}>{estado.tipo === 'bajando' ? 'Descargando…' : 'Descargar'}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

/** Los archivos de una respuesta, uno debajo de otro. */
export function ArchivosDeLaRespuesta({ archivos }: { archivos: readonly ArchivoDelAsistenteEnPantalla[] }) {
  if (archivos.length === 0) return null;
  return (
    <View style={estilos.lista}>
      {archivos.map((a) => (
        <TarjetaDeArchivo key={a.mediaId} archivo={a} />
      ))}
    </View>
  );
}

const estilos = StyleSheet.create({
  lista: { gap: Spacing.two },
  tarjeta: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: Spacing.three,
    padding: Spacing.three,
    borderRadius: Radio.md,
    borderWidth: 1,
    borderColor: Panel.bordeSuave,
    backgroundColor: Panel.superficie,
  },
  icono: { alignItems: 'center', gap: Spacing.half, minWidth: 44 },
  formato: { fontFamily: FuentePanel.rotulo, fontSize: TextoPanel.apoyo, color: Panel.texto },
  datos: { flex: 1, minWidth: 180, gap: Spacing.half },
  nombre: { fontFamily: FuentePanel.rotulo, fontSize: TextoPanel.cuerpo, color: Panel.texto },
  detalle: { fontFamily: FuentePanel.texto, fontSize: TextoPanel.apoyo, color: Panel.textoApoyo },
  error: { fontFamily: FuentePanel.texto, fontSize: TextoPanel.apoyo, color: Estado.noConforme },
  boton: {
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.three,
    borderRadius: Radio.pastilla,
    borderWidth: 1,
    borderColor: Panel.borde,
  },
  encima: { backgroundColor: Panel.fondoHover },
  ocupado: { opacity: 0.6 },
  textoBoton: { fontFamily: FuentePanel.rotulo, fontSize: TextoPanel.apoyo, color: Panel.texto },
});
