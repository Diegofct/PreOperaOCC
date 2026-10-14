/**
 * Las fotos de la sección «Fotografía del día» (spec 027).
 *
 * Desde el cambio del 2026-10-14 son **una sola sección**: las que la obra mandó por
 * WhatsApp y las subidas en el panel, juntas y sin foto principal (RF-34, RF-35), por hora
 * (RF-37). Cada foto de WhatsApp dice quién la mandó, a qué hora, en qué tipo de mensaje y
 * qué entendió la IA (RF-14 a RF-17); una subida dice «Subida en el panel» y su hora (RF-38).
 * Se abre en grande al tocarla.
 *
 * Mientras la bitácora se puede editar, cada foto se puede **quitar** con un motivo
 * (RF-22 a RF-24); con la bitácora cerrada el botón no aparece (RF-28). Las quitadas no se
 * borran: se listan aparte con quién, cuándo y por qué (RF-25).
 *
 * Las imágenes se piden a `/api/panel/media/:id`, la misma puerta de la foto principal, que
 * vuelve a mirar el alcance por obra: nunca hay un enlace directo al almacén.
 *
 * Se pintan primero doce miniaturas y el resto a pedido: una bitácora con cuarenta fotos
 * abre igual de rápido (requisito no funcional), sin descargar cuarenta imágenes completas
 * que nadie ha pedido ver todavía.
 */
import { useState } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';

import { FuentePanel, Panel, Radio, Spacing, TextoPanel } from '@/constants/theme';

import { api, mensajeDe } from './cliente-api';
import { Acciones, Ayuda, Aviso, Boton, Campo, Modal } from './componentes';
import type { FotoDelDiaFila, FotosDelDiaFila } from '@/features/panel/contratos';
import type { Listado } from './marco';

/** Cuántas miniaturas se pintan antes de «Ver las demás». */
const MINIATURAS_INICIALES = 12;

/** La hora en que se mandó, en Colombia (RF-15): «3:05 p. m.». */
function horaDeEnvio(iso: string): string {
  return new Date(iso).toLocaleTimeString('es-CO', {
    timeZone: 'America/Bogota',
    hour: 'numeric',
    minute: '2-digit',
  });
}

/** Cuándo se quitó, en Colombia: «14 oct, 9:05 a. m.». */
function momentoDeQuitada(iso: string): string {
  return new Date(iso).toLocaleString('es-CO', {
    timeZone: 'America/Bogota',
    day: 'numeric',
    month: 'short',
    hour: 'numeric',
    minute: '2-digit',
  });
}

/**
 * Quién, a qué hora y en qué tipo de mensaje, en una línea; o «Subida en el panel» y la
 * hora en que se subió (RF-38).
 */
function pieDeFoto(foto: FotoDelDiaFila): string {
  if (foto.origen === 'panel') return `Subida en el panel · ${horaDeEnvio(foto.enviadoEn)}`;
  return [foto.autorNombre ?? 'Sin nombre', horaDeEnvio(foto.enviadoEn), foto.tipo].join(' · ');
}

export function FotosDelDia({
  parteId,
  editable,
  seccion: listado,
}: {
  parteId: string;
  editable: boolean;
  /** Las pide la pantalla: el índice y los bloqueos del cierre las cuentan (RF-41). */
  seccion: Listado<FotosDelDiaFila>;
}) {
  const [todas, setTodas] = useState(false);
  const [abierta, setAbierta] = useState<FotoDelDiaFila | null>(null);
  const [quitando, setQuitando] = useState<FotoDelDiaFila | null>(null);

  const fotos = listado.datos[0]?.fotos ?? [];
  const quitadas = listado.datos[0]?.quitadas ?? [];
  const visibles = todas ? fotos : fotos.slice(0, MINIATURAS_INICIALES);

  return (
    <View style={estilos.bloque}>
      <Ayuda>Las que llegaron por WhatsApp ese día —sin los vales ni los videos— y las subidas aquí.</Ayuda>

      {listado.error ? <Aviso tono="error">{listado.error}</Aviso> : null}
      {listado.cargando ? <Ayuda>Cargando…</Ayuda> : null}
      {!listado.cargando && !listado.error && fotos.length === 0 ? (
        <Ayuda>{editable ? 'Todavía sin fotografía.' : 'Sin fotografía.'}</Ayuda>
      ) : null}

      <View style={estilos.cuadricula}>
        {visibles.map((foto) => (
          // La tarjeta no es un botón: dentro va «Quitar», y un botón no puede llevar otro.
          // Lo que abre el visor es la foto con su pie.
          <View key={foto.id} style={estilos.tarjeta}>
            <Pressable
              onPress={() => setAbierta(foto)}
              accessibilityRole="button"
              accessibilityLabel={`Ver en grande la foto de ${pieDeFoto(foto)}`}
              style={({ hovered }: { hovered?: boolean }) => [estilos.abrir, hovered && estilos.abrirEncima]}
            >
              <Image source={{ uri: `/api/panel/media/${foto.mediaId}` }} style={estilos.miniatura} resizeMode="cover" />
              <Text style={estilos.pie} numberOfLines={2}>
                {pieDeFoto(foto)}
              </Text>
              {foto.descripcion ? (
                <Text style={estilos.descripcion} numberOfLines={3}>
                  {foto.descripcion}
                </Text>
              ) : null}
            </Pressable>
            {editable ? (
              <View style={estilos.quitar}>
                <Boton titulo="Quitar" tono="secundario" onPress={() => setQuitando(foto)} />
              </View>
            ) : null}
          </View>
        ))}
      </View>

      {!todas && fotos.length > MINIATURAS_INICIALES ? (
        <Acciones>
          <Boton
            titulo={`Ver las ${fotos.length - MINIATURAS_INICIALES} demás`}
            tono="secundario"
            onPress={() => setTodas(true)}
          />
        </Acciones>
      ) : null}

      {quitadas.length > 0 ? (
        <View style={estilos.quitadas}>
          <Text style={estilos.titulo}>{`Quitadas (${quitadas.length})`}</Text>
          {quitadas.map((foto) => (
            <Text key={foto.id} style={estilos.descripcion}>
              {`${pieDeFoto(foto)} — quitada por ${foto.quitada?.por ?? 'alguien'} el ${momentoDeQuitada(
                foto.quitada?.en ?? foto.enviadoEn,
              )}: «${foto.quitada?.motivo ?? ''}»`}
            </Text>
          ))}
        </View>
      ) : null}

      {quitando ? (
        <VentanaQuitar
          parteId={parteId}
          foto={quitando}
          alCerrar={() => setQuitando(null)}
          alQuitar={() => {
            setQuitando(null);
            listado.recargar();
          }}
        />
      ) : null}

      {abierta ? (
        <Modal titulo={pieDeFoto(abierta)} onCerrar={() => setAbierta(null)}>
          <Image
            source={{ uri: `/api/panel/media/${abierta.mediaId}` }}
            style={estilos.grande}
            resizeMode="contain"
            accessibilityLabel={abierta.descripcion ?? 'Foto del día'}
          />
          {abierta.descripcion ? <Ayuda>{abierta.descripcion}</Ayuda> : null}
        </Modal>
      ) : null}
    </View>
  );
}

/**
 * Quitar una foto con su motivo (RF-22, RF-24). Sin motivo no se manda: se pide aquí mismo,
 * y el servidor lo vuelve a exigir. Si otra persona la quitó primero o la bitácora se cerró
 * entre medias, el aviso del servidor sale en la ventana (RF-28).
 */
function VentanaQuitar({
  parteId,
  foto,
  alCerrar,
  alQuitar,
}: {
  parteId: string;
  foto: FotoDelDiaFila;
  alCerrar: () => void;
  alQuitar: () => void;
}) {
  const [motivo, setMotivo] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  async function quitar() {
    if (!motivo.trim()) {
      setError('Escriba por qué la quita.');
      return;
    }
    setEnviando(true);
    setError(null);
    try {
      await api.partes.quitarFoto(parteId, foto.id, motivo);
      alQuitar();
    } catch (fallo) {
      setError(mensajeDe(fallo));
    } finally {
      setEnviando(false);
    }
  }

  return (
    <Modal titulo="Quitar foto" onCerrar={alCerrar}>
      <Image source={{ uri: `/api/panel/media/${foto.mediaId}` }} style={estilos.enVentana} resizeMode="contain" />
      <Ayuda>
        {foto.origen === 'whatsapp'
          ? `${pieDeFoto(foto)} — Sale de la bitácora, pero sigue en el historial de WhatsApp.`
          : `${pieDeFoto(foto)} — Sale de la bitácora; el archivo no se borra.`}
      </Ayuda>
      <Campo etiqueta="Motivo" valor={motivo} onChange={setMotivo} multilinea obligatorio />
      {error ? <Aviso tono="error">{error}</Aviso> : null}
      <Acciones>
        <Boton titulo={enviando ? 'Quitando…' : 'Quitar'} tono="peligro" deshabilitado={enviando} onPress={quitar} />
        <Boton titulo="Cancelar" tono="secundario" onPress={alCerrar} />
      </Acciones>
    </Modal>
  );
}

const estilos = StyleSheet.create({
  bloque: { gap: Spacing.two },
  titulo: {
    fontFamily: FuentePanel.texto,
    fontSize: TextoPanel.cuerpo,
    fontWeight: '700',
    color: Panel.texto,
  },
  // Columnas que se acomodan solas al ancho: en el celular caben una o dos, sin
  // desplazamiento horizontal (requisito no funcional).
  cuadricula: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.three },
  tarjeta: {
    width: 200,
    maxWidth: '100%',
    gap: Spacing.one,
    padding: Spacing.two,
    borderRadius: Radio.sm,
    borderWidth: 1,
    borderColor: Panel.borde,
    backgroundColor: Panel.superficie,
  },
  abrir: { gap: Spacing.one, borderRadius: Radio.sm },
  abrirEncima: { opacity: 0.85 },
  miniatura: { width: '100%', aspectRatio: 4 / 3, borderRadius: Radio.sm, backgroundColor: Panel.borde },
  pie: { fontFamily: FuentePanel.texto, fontSize: TextoPanel.micro, fontWeight: '600', color: Panel.texto },
  descripcion: { fontFamily: FuentePanel.texto, fontSize: TextoPanel.micro, lineHeight: 16, color: Panel.textoApoyo },
  grande: { width: '100%', height: 520 },
  enVentana: { width: '100%', height: 220 },
  quitar: { alignItems: 'flex-start', marginTop: Spacing.one },
  quitadas: { gap: Spacing.one, marginTop: Spacing.two },
});
