/**
 * Subir una fotografía desde el panel.
 *
 * El selector de archivo se crea a mano con `document.createElement` en vez de
 * pintar un `<input type="file">` en el árbol: React Native Web no tiene ese
 * componente, y el panel se dibuja con los mismos componentes que el celular.
 * Crearlo dentro del gesto —nunca al montar— es lo que mantiene este archivo
 * inofensivo si algún día lo evalúa el empaquetador de la app nativa.
 *
 * Los bytes viajan tal cual en el cuerpo, igual que desde el teléfono. El
 * servidor los guarda en el bucket privado y devuelve el id; la imagen se pide
 * después por `/api/panel/media/:id`, que es la única puerta a ese bucket.
 */
import { useState } from 'react';
import { Image, Platform, StyleSheet, View } from 'react-native';

import { Panel, Radio, Spacing } from '@/constants/theme';

import { Acciones, Ayuda, Aviso, Boton } from './componentes';
import { mensajeDe } from './cliente-api';

/** Lo que el servidor admite. Se comprueba aquí para no subir en balde. */
const TIPOS = 'image/jpeg,image/png,image/webp';
const TAMANO_MAXIMO = 8 * 1024 * 1024;

export function SubirFoto({
  titulo,
  rutaDeSubida,
  fotos,
  editable,
  alSubir,
}: {
  titulo: string;
  /** A dónde se mandan los bytes, ya con el `item` si es de una actividad. */
  rutaDeSubida: string;
  /** Los ids ya subidos, para pintarlos. */
  fotos: string[];
  editable: boolean;
  alSubir: () => void;
}) {
  const [subiendo, setSubiendo] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function elegir() {
    if (Platform.OS !== 'web') return;

    const entrada = document.createElement('input');
    entrada.type = 'file';
    entrada.accept = TIPOS;
    entrada.onchange = async () => {
      const archivo = entrada.files?.[0];
      if (!archivo) return;

      if (archivo.size > TAMANO_MAXIMO) {
        setError('La imagen pesa más de 8 MB. Redúzcala antes de subirla.');
        return;
      }

      setSubiendo(true);
      setError(null);
      try {
        const respuesta = await fetch(rutaDeSubida, {
          method: 'POST',
          headers: { 'content-type': archivo.type },
          body: await archivo.arrayBuffer(),
          credentials: 'include',
        });
        if (!respuesta.ok) {
          const cuerpo = (await respuesta.json().catch(() => null)) as { error?: string } | null;
          throw new Error(cuerpo?.error ?? 'No se pudo subir la imagen.');
        }
        alSubir();
      } catch (fallo) {
        setError(mensajeDe(fallo));
      } finally {
        setSubiendo(false);
      }
    };
    entrada.click();
  }

  return (
    <View style={estilos.bloque}>
      {fotos.length > 0 ? (
        <View style={estilos.tira}>
          {fotos.map((id) => (
            <Image
              key={id}
              source={{ uri: `/api/panel/media/${id}` }}
              style={estilos.miniatura}
              resizeMode="cover"
            />
          ))}
        </View>
      ) : (
        <Ayuda>{editable ? 'Todavía sin fotografía.' : 'Sin fotografía.'}</Ayuda>
      )}

      {error ? <Aviso tono="error">{error}</Aviso> : null}

      {editable ? (
        <Acciones>
          <Boton
            titulo={subiendo ? 'Subiendo…' : titulo}
            tono="secundario"
            onPress={elegir}
            deshabilitado={subiendo}
          />
        </Acciones>
      ) : null}
    </View>
  );
}

const estilos = StyleSheet.create({
  bloque: { gap: Spacing.two },
  tira: { flexDirection: 'row', gap: Spacing.two, flexWrap: 'wrap' },
  miniatura: {
    width: 140,
    height: 105,
    borderRadius: Radio.sm,
    borderWidth: 1,
    borderColor: Panel.borde,
    backgroundColor: Panel.fondoCabecera,
  },
});
