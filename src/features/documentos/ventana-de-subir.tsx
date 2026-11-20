/**
 * Subir un documento (spec 034, RF-24 a RF-30). El archivo se revisa al elegirlo con la misma regla
 * del servidor —tipo real y tamaño—, para no esperar una subida de 20 MB que se va a rechazar; el
 * servidor lo vuelve a revisar todo (034/RF-50).
 *
 * Vive aparte de `pantalla-documentos.tsx` desde el cambio del 2026-11-20 a la spec 051: la usan esa
 * pantalla (la lista de la ficha, la requisición y el pago) y el archivador, y tenerla dentro de la
 * pantalla hacía que el archivador y la pantalla se importaran el uno al otro.
 *
 * Dos maneras de usarla:
 * - **Sin `carpetas`** (ficha, requisición, pago): se elige entre las clases de siempre del lugar, como
 *   desde la spec 034 (051/RF-78).
 * - **Con `carpetas`** (Documentos de empresas y obras): se elige entre las carpetas que ya tiene el
 *   lugar, las clases de siempre como sugerencia, o «＋ Nueva carpeta…», que pide su nombre (051/RF-71,
 *   RF-72). Antes de guardar se le muestra a quien sube a qué carpeta va a ir, porque un nombre que ya
 *   existe con otra escritura cae en la que hay (RF-73, RF-74). La decisión final es del servidor
 *   (`claseAGuardar`, RF-79), y la ventana devuelve la clase que respondió para abrir esa carpeta.
 *
 * `claseInicial` deja ya escogida la carpeta desde la que se sube (051/RF-49), y se puede cambiar
 * (RF-50).
 */
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { FuentePanel, Panel, Spacing, TextoPanel } from '@/constants/theme';
import { elegirArchivo } from '@/features/contratos/elegir-archivo';
import { useAvisos } from '@/features/panel/avisos';
import { api, mensajeDe, type LugarDeLosDocumentos } from '@/features/panel/cliente-api';
import {
  AccionesFormulario,
  Aviso,
  Boton,
  Campo,
  CampoDeFecha,
  Formulario,
  Modal,
  Selector,
} from '@/features/panel/componentes';
import { fechaDeJornada } from '@/shared/rules/jornada';
import {
  ACEPTA_DOCUMENTOS,
  BYTES_DE_FIRMA,
  claseParaNombre,
  clasesDe,
  faltaDelNombreDeCarpeta,
  faltasDelDocumento,
  LARGO_MAXIMO_DE_CARPETA,
  llevaPrecio,
  opcionesDeCarpeta,
  revisarDocumento,
  VALOR_NUEVA_CARPETA,
  type LugarDeDocumentos,
} from '@/shared/rules/documentos';

export function VentanaDeSubir({
  pedido,
  lugar,
  sinPrecio,
  carpetas,
  claseInicial,
  alCerrar,
  alGuardar,
}: {
  pedido: LugarDeLosDocumentos;
  lugar: LugarDeDocumentos;
  sinPrecio: boolean;
  /** Las carpetas que ya tiene el lugar. Con ellas se ofrece «＋ Nueva carpeta…» (051/RF-71). */
  carpetas?: readonly { id: string; nombre: string }[];
  claseInicial?: string;
  alCerrar: () => void;
  /** La clase con que quedó el documento, según el servidor. */
  alGuardar: (clase: string) => void;
}) {
  const opciones = carpetas
    ? opcionesDeCarpeta(lugar, carpetas)
    : clasesDe(lugar)
        .filter((c) => !sinPrecio || !llevaPrecio(c.id))
        .map((c) => ({ valor: c.id, etiqueta: c.nombre }));
  // Una carpeta inicial que no está entre las opciones (solo con anulados, por ejemplo) no se
  // preselecciona: el selector mostraría un valor que no puede elegirse.
  const inicial = claseInicial && opciones.some((o) => o.valor === claseInicial) ? claseInicial : null;

  const [clase, setClase] = useState<string | null>(inicial);
  const [nombreDeCarpeta, setNombreDeCarpeta] = useState('');
  const [nombre, setNombre] = useState('');
  const [fecha, setFecha] = useState(fechaDeJornada());
  const [vence, setVence] = useState('');
  const [proveedor, setProveedor] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [archivo, setArchivo] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  // Spec 050, RF-57: un fallo al guardar va al aviso de abajo, que se queda hasta que se cierra.
  const avisos = useAvisos();
  const [enviando, setEnviando] = useState(false);

  const nueva = clase === VALOR_NUEVA_CARPETA;
  const resuelta = nueva ? claseParaNombre(lugar, nombreDeCarpeta) : null;
  const claseQueSeManda = nueva ? (resuelta?.clase ?? '') : (clase ?? '');
  // Si el nombre escrito ya es una carpeta (o una clase de siempre), se dice a cuál va.
  const yaExiste = resuelta
    ? (carpetas?.find((c) => c.id === resuelta.clase)?.nombre ??
      clasesDe(lugar).find((c) => c.id === resuelta.clase)?.nombre ??
      null)
    : null;

  // Si cae en una carpeta que ya existe, se guarda con el nombre que esa carpeta ya tiene: si no, quien
  // escribe «manuales DE obra» le cambiaría el nombre a la carpeta «Manuales de obra» de todos (RF-74).
  const nombreQueSeManda = yaExiste ?? resuelta?.claseNombre;

  const falta =
    (nueva ? faltaDelNombreDeCarpeta(nombreDeCarpeta) : null) ??
    faltasDelDocumento(lugar, {
      clase: claseQueSeManda,
      claseNombre: nombreQueSeManda,
      nombre,
      fecha,
      vence: vence || null,
    })[0] ??
    (archivo ? null : 'Elija el archivo.');

  async function elegir() {
    const elegido = await elegirArchivo(ACEPTA_DOCUMENTOS);
    if (!elegido) return;
    const cabecera = new Uint8Array(await elegido.slice(0, BYTES_DE_FIRMA).arrayBuffer());
    const revision = revisarDocumento(elegido.name, elegido.size, cabecera);
    setArchivo(revision.ok ? elegido : null);
    setError(revision.ok ? null : revision.mensaje);
    // Sin nombre todavía, el del archivo sin la extensión: casi siempre es lo que se iba a escribir.
    if (revision.ok && !nombre.trim()) setNombre(elegido.name.replace(/\.[^.]+$/, ''));
  }

  async function guardar() {
    if (!archivo) return;
    setEnviando(true);
    setError(null);
    try {
      const subido = await api.documentos.subir(
        pedido,
        {
          clase: claseQueSeManda,
          claseNombre: nombreQueSeManda ?? '',
          nombre,
          fecha,
          vence,
          proveedor,
          descripcion,
        },
        archivo,
        archivo.name,
      );
      alGuardar(subido.clase);
    } catch (fallo) {
      avisos.error(mensajeDe(fallo));
    } finally {
      setEnviando(false);
    }
  }

  return (
    <Modal titulo="Subir documento" onCerrar={alCerrar}>
      <Selector
        etiqueta={carpetas ? 'Carpeta' : 'Clase'}
        valor={clase}
        opciones={opciones}
        onChange={setClase}
        vacio={carpetas ? 'Elija la carpeta' : 'Elija la clase'}
      />
      {nueva ? (
        <View style={estilos.carpetaNueva}>
          <Campo
            etiqueta="Nombre de la carpeta"
            obligatorio
            valor={nombreDeCarpeta}
            onChange={setNombreDeCarpeta}
            ayuda={`Hasta ${LARGO_MAXIMO_DE_CARPETA} caracteres. Por ejemplo: Manuales de obra.`}
          />
          {yaExiste ? <Text style={estilos.apoyo}>{`Ya existe: el documento va a «${yaExiste}».`}</Text> : null}
        </View>
      ) : null}
      <View style={estilos.archivo}>
        <Boton titulo={archivo ? 'Cambiar archivo' : 'Elegir archivo *'} tono="secundario" onPress={elegir} />
        <Text style={estilos.apoyo}>
          {archivo ? archivo.name : 'PDF, imagen (JPG, PNG, WEBP), Word o Excel, hasta 20 MB.'}
        </Text>
      </View>
      {/* Spec 050, RF-15 a RF-17: en rejilla, con los anchos de la escala. */}
      <Formulario desnudo>
        <Campo etiqueta="Nombre" obligatorio valor={nombre} onChange={setNombre} ayuda="Por ejemplo: Cámara de comercio octubre 2026." />
        <CampoDeFecha etiqueta="Fecha del documento" valor={fecha} onChange={setFecha} />
        {lugar === 'solicitud' || lugar === 'pago' ? null : (
          <CampoDeFecha
            etiqueta="Vence"
            valor={vence}
            onChange={setVence}
            min={fecha || undefined}
            ayuda="Déjelo vacío si no vence. Avisa desde 30 días antes."
          />
        )}
        <Campo etiqueta="Proveedor o tercero" valor={proveedor} onChange={setProveedor} ayuda="Opcional. Sirve para buscarlo después." />
        <Campo etiqueta="Descripción" valor={descripcion} onChange={setDescripcion} multilinea compacto />
      </Formulario>
      {error ? <Aviso tono="error">{error}</Aviso> : falta ? <Text style={estilos.apoyo}>{falta}</Text> : null}
      <AccionesFormulario>
        <Boton titulo="Cancelar" tono="secundario" onPress={alCerrar} />
        <Boton titulo={enviando ? 'Subiendo…' : 'Subir'} onPress={guardar} deshabilitado={enviando || falta !== null} />
      </AccionesFormulario>
    </Modal>
  );
}

const estilos = StyleSheet.create({
  apoyo: { fontFamily: FuentePanel.texto, fontSize: TextoPanel.apoyo, color: Panel.textoApoyo },
  archivo: { gap: Spacing.one, alignItems: 'flex-start' },
  carpetaNueva: { gap: Spacing.one },
});
