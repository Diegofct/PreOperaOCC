/**
 * Documentos de Elemental, OCC, Geolab y cada obra (spec 034, RF-1, RF-2, RF-31 a RF-46).
 *
 * La misma pantalla en las tres empresas y en las obras: el lugar sale de la dirección
 * (`useLugarDelPanel`), y el servidor decide si quien entra lo alcanza. Llega la lista
 * entera —con los anulados marcados— y aquí se filtra y se busca, para que buscar
 * responda mientras se escribe.
 *
 * Suben todos los que ven (RF-9); anular es solo de la gerencia (RF-10, RF-48): a los
 * demás no se les muestra el botón, y el servidor lo exige igual.
 *
 * La carpeta —cifras, tabla, subir y anular— es `CarpetaDeDocumentos`, aparte de la
 * pantalla: la ficha de una persona (spec 035, RF-23 a RF-25) la usa con `{ personaId }` y
 * los permisos de Recursos Humanos.
 */
import { useCallback, useState } from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';

import { FuentePanel, Panel, Spacing, TextoPanel } from '@/constants/theme';
import { elegirArchivo } from '@/features/contratos/elegir-archivo';
import { VentanaDeAnular } from '@/features/contratos/polizas-y-documentos';
import { useLugarDelPanel } from '@/features/empresas/contexto-empresa';
import { api, mensajeDe, type LugarDeLosDocumentos } from '@/features/panel/cliente-api';
import {
  Acciones,
  AccionesFormulario,
  Aviso,
  BarraDeListado,
  Boton,
  Campo,
  CampoDeFecha,
  Casilla,
  Celda,
  Cifra,
  Cifras,
  Etiqueta,
  Modal,
  Paginacion,
  Seccion,
  Selector,
  Tabla,
  type Columna,
} from '@/features/panel/componentes';
import type { DocumentoDelLugar, DocumentosDelLugar } from '@/features/panel/contratos';
import { MarcoPantalla, useListado } from '@/features/panel/marco';
import { usePersona } from '@/features/panel/sesion';
import { POR_PAGINA } from '@/features/panel/paginas';
import { useListadoFiltrado } from '@/features/panel/usar-listado-filtrado';
import { fechaDelCorte } from '@/shared/rules/cortes';
import {
  ACEPTA_DOCUMENTOS,
  BYTES_DE_FIRMA,
  clasesDe,
  faltasDelDocumento,
  llevaPrecio,
  revisarDocumento,
  type LugarDeDocumentos,
} from '@/shared/rules/documentos';
import { nombreDeEmpresa } from '@/shared/rules/empresas';
import { fechaDeJornada } from '@/shared/rules/jornada';
import { alcanza } from '@/shared/rules/permisos';

const SIN_DOCUMENTOS: DocumentosDelLugar = { documentos: [], resumen: { vencidos: 0, porVencer: 0 } };

/** PDF e imágenes los muestra el navegador (RF-35); Word y Excel se guardan (RF-36). */
function seAbreEnElNavegador(mime: string): boolean {
  return mime === 'application/pdf' || mime.startsWith('image/');
}

function abrir(url: string) {
  if (Platform.OS === 'web') window.open(url, '_blank', 'noopener');
}

/**
 * Los documentos de un lugar: una empresa, una obra, una persona o una solicitud de compra
 * (spec 036). Un objeto y no una lista: va envuelto en una, como el detalle de un ensayo. Se
 * recarga cuando cambia el lugar (`clave`), no cuando se arma otro `pedido` igual.
 */
export function useDocumentosDelLugar(pedido: LugarDeLosDocumentos | null) {
  const clave = pedido
    ? 'empresa' in pedido
      ? pedido.empresa
      : 'obraId' in pedido
        ? pedido.obraId
        : 'personaId' in pedido
          ? pedido.personaId
          : pedido.solicitudId
    : null;
  return useListado<DocumentosDelLugar>(
    // eslint-disable-next-line react-hooks/exhaustive-deps
    useCallback(() => (pedido ? api.documentos.listar(pedido).then((d) => [d]) : Promise.resolve([])), [clave]),
  );
}

export type DocumentosCargados = ReturnType<typeof useDocumentosDelLugar>;

export default function PantallaDocumentos() {
  const { rol } = usePersona();
  const lugar = useLugarDelPanel();
  // Las empresas con menú y las obras; Proyectos no tiene documentos propios.
  const pedido: LugarDeLosDocumentos | null =
    lugar?.tipo === 'empresa' ? { empresa: lugar.empresa } : lugar?.tipo === 'obra' ? { obraId: lugar.obraId } : null;
  const cargados = useDocumentosDelLugar(pedido);

  const nombreDelLugar =
    lugar?.tipo === 'empresa' ? nombreDeEmpresa(lugar.empresa) : lugar?.tipo === 'obra' ? 'la obra' : '';

  return (
    <MarcoPantalla
      titulo="Documentos"
      descripcion={`Los documentos de ${nombreDelLugar}: búsquelos por nombre, proveedor o archivo, y vea cuáles están vencidos o por vencer. Nada se borra: lo que sobra se anula con motivo.`}
      error={cargados.error}
      cargando={cargados.cargando}
    >
      <CarpetaDeDocumentos
        cargados={cargados}
        pedido={pedido}
        deQuien={pedido && 'empresa' in pedido ? pedido.empresa : 'obra'}
        puedeSubir={alcanza(rol, 'documentos', 'escribir')}
        puedeAnular={alcanza(rol, 'documentos', 'anular')}
      />
    </MarcoPantalla>
  );
}

/**
 * La carpeta de documentos de un lugar: cifras de vencimiento, búsqueda y filtros, tabla,
 * subir y anular. Quién sube y quién anula lo dice quien la monta —en Documentos, la fila
 * `documentos`; en la ficha de una persona, la de Recursos Humanos—; el servidor lo vuelve
 * a exigir.
 */
export function CarpetaDeDocumentos({
  cargados,
  pedido,
  deQuien,
  puedeSubir,
  puedeAnular,
  claveDeBusqueda,
  titulo = 'Documentos',
  sinPrecio = false,
}: {
  cargados: DocumentosCargados;
  pedido: LugarDeLosDocumentos | null;
  deQuien: LugarDeDocumentos;
  puedeSubir: boolean;
  puedeAnular: boolean;
  /** Dónde guarda su búsqueda en la dirección, si la página ya tiene otro buscador. */
  claveDeBusqueda?: string;
  titulo?: string;
  /** Spec 036, RF-31: quien no ve los valores no sube cotizaciones, órdenes ni facturas. */
  sinPrecio?: boolean;
}) {
  const { documentos, resumen } = cargados.datos[0] ?? SIN_DOCUMENTOS;
  const [ventana, setVentana] = useState<{ tipo: 'subir' } | { tipo: 'anular'; documento: DocumentoDelLugar } | null>(
    null,
  );
  const [hecho, setHecho] = useState<string | null>(null);
  const listo = (texto: string) => {
    setVentana(null);
    setHecho(texto);
    cargados.recargar();
  };

  const [clase, setClase] = useState<string | null>(null);
  const [soloConAviso, setSoloConAviso] = useState(false);
  const [verAnulados, setVerAnulados] = useState(false);

  const pasaFiltros = useCallback(
    (d: DocumentoDelLugar) =>
      (verAnulados || d.anulado === null) && (clase === null || d.clase === clase) && (!soloConAviso || d.aviso !== null),
    [clase, soloConAviso, verAnulados],
  );
  const listado = useListadoFiltrado(
    documentos,
    (d) => [d.nombre, d.proveedor, d.descripcion, d.nombreArchivo],
    pasaFiltros,
    undefined,
    claveDeBusqueda,
  );
  const vigentes = documentos.filter((d) => d.anulado === null).length;
  const anulados = documentos.length - vigentes;
  // Spec 036: los soportes de una compra no vencen; sus cifras y su columna serían ruido.
  const conVencimientos = deQuien !== 'solicitud';

  const columnas: Columna<DocumentoDelLugar>[] = [
    {
      clave: 'nombre',
      titulo: 'Documento',
      ancho: 260,
      ordenar: (d) => d.nombre,
      pintar: (d) => (
        <View style={estilos.celdaDoble}>
          <Text style={[estilos.nombre, d.anulado && estilos.anulado]}>{d.nombre}</Text>
          <Text style={estilos.apoyo}>{d.nombreArchivo}</Text>
          {d.anulado ? <Text style={estilos.apoyo}>{`Anulado por ${d.anulado.por}: ${d.anulado.motivo}`}</Text> : null}
        </View>
      ),
    },
    { clave: 'clase', titulo: 'Clase', ancho: 180, ordenar: (d) => d.claseNombre, pintar: (d) => <Celda>{d.claseNombre}</Celda> },
    {
      clave: 'proveedor',
      titulo: 'Proveedor o tercero',
      ancho: 180,
      ordenar: (d) => d.proveedor,
      pintar: (d) => <Celda>{d.proveedor || '—'}</Celda>,
    },
    { clave: 'fecha', titulo: 'Fecha', ancho: 110, ordenar: (d) => d.fecha, pintar: (d) => <Celda>{fechaDelCorte(d.fecha)}</Celda> },
    ...(conVencimientos
      ? [
          {
            clave: 'vence',
            titulo: 'Vence',
            ancho: 160,
            ordenar: (d: DocumentoDelLugar) => d.vence,
            pintar: (d: DocumentoDelLugar) => (
              <View style={estilos.celdaDoble}>
                {d.anulado ? (
                  <Etiqueta tono="neutro">Anulado</Etiqueta>
                ) : d.aviso ? (
                  <Etiqueta tono={d.aviso.estado === 'vencido' ? 'malo' : 'atencion'}>{d.aviso.texto}</Etiqueta>
                ) : null}
                <Text style={estilos.apoyo}>{d.vence ? fechaDelCorte(d.vence) : 'No vence'}</Text>
              </View>
            ),
          },
        ]
      : []),
    {
      clave: 'subido',
      titulo: 'Subido',
      ancho: 170,
      ordenar: (d) => d.subidoEn,
      pintar: (d) => (
        <View style={estilos.celdaDoble}>
          <Text style={estilos.texto}>{d.subidoPor}</Text>
          <Text style={estilos.apoyo}>{fechaDelCorte(d.subidoEn.slice(0, 10))}</Text>
        </View>
      ),
    },
    {
      clave: 'acciones',
      titulo: '',
      ancho: 210,
      anchoMinimo: 210,
      pintar: (d) => (
        <Acciones>
          {seAbreEnElNavegador(d.mime) ? (
            <Boton titulo="Abrir" tono="secundario" onPress={() => abrir(api.documentos.urlDelArchivo(d.mediaId))} />
          ) : (
            <Boton
              titulo="Descargar"
              tono="secundario"
              onPress={() => abrir(api.documentos.urlDelArchivo(d.mediaId, true))}
            />
          )}
          {puedeAnular && !d.anulado ? (
            <Boton titulo="Anular" tono="peligro" onPress={() => setVentana({ tipo: 'anular', documento: d })} />
          ) : null}
        </Acciones>
      ),
    },
  ];

  return (
    <>
      {/* RF-41: lo que hay que renovar, arriba de todo. */}
      {conVencimientos ? (
        <Cifras>
          <Cifra titulo="Vencidos" valor={String(resumen.vencidos)} tono={resumen.vencidos > 0 ? 'malo' : 'neutro'} />
          <Cifra
            titulo="Vencen en 30 días"
            valor={String(resumen.porVencer)}
            tono={resumen.porVencer > 0 ? 'atencion' : 'neutro'}
          />
          <Cifra titulo="Vigentes" valor={String(vigentes)} pie={anulados ? `y ${anulados} anulados` : undefined} />
        </Cifras>
      ) : null}

      {hecho ? <Aviso tono="exito">{hecho}</Aviso> : null}

      <Seccion titulo={titulo}>
        {puedeSubir && pedido ? (
          <Acciones>
            <Boton titulo="Subir documento" onPress={() => setVentana({ tipo: 'subir' })} />
          </Acciones>
        ) : null}
        <BarraDeListado
          busqueda={listado.busqueda}
          onBuscar={listado.buscar}
          // Los anulados ocultos no cuentan: «1 de 2» sin haber buscado nada confunde.
          total={verAnulados ? listado.total : vigentes}
          mostradas={listado.coincidencias}
        >
          <Selector
            etiqueta="Clase"
            valor={clase}
            opciones={clasesDe(deQuien).map((c) => ({ valor: c.id, etiqueta: c.nombre }))}
            onChange={setClase}
            permiteVacio
            vacio="Todas las clases"
            ancho={240}
          />
        </BarraDeListado>
        <Acciones>
          {conVencimientos ? (
            <Casilla etiqueta="Solo vencidos o por vencer" marcada={soloConAviso} onChange={setSoloConAviso} />
          ) : null}
          <Casilla etiqueta="Ver anulados" marcada={verAnulados} onChange={setVerAnulados} />
        </Acciones>
        <Tabla
          columnas={columnas}
          filas={listado.pagina}
          vacio={
            documentos.length === 0
              ? puedeSubir
                ? 'Todavía no hay documentos aquí. Suba el primero con «Subir documento».'
                : 'Todavía no hay documentos aquí.'
              : 'Ningún documento coincide con la búsqueda o los filtros.'
          }
        />
        <Paginacion
          pagina={listado.paginaActual}
          porPagina={POR_PAGINA}
          total={listado.coincidencias}
          onCambiar={listado.irAPagina}
        />
      </Seccion>

      {ventana?.tipo === 'subir' && pedido ? (
        <VentanaDeSubir
          pedido={pedido}
          lugar={deQuien}
          sinPrecio={sinPrecio}
          alCerrar={() => setVentana(null)}
          alGuardar={() => listo('Documento subido.')}
        />
      ) : null}
      {ventana?.tipo === 'anular' ? (
        <VentanaDeAnular
          titulo={`Anular «${ventana.documento.nombre}»`}
          aviso="El documento sigue en la lista, marcado como anulado, con el motivo, y se puede seguir abriendo. Si hay que corregirlo, súbalo de nuevo."
          alCerrar={() => setVentana(null)}
          alAnular={async (motivo) => {
            await api.documentos.anular(ventana.documento.id, motivo);
            listo('Documento anulado.');
          }}
        />
      ) : null}
    </>
  );
}

/**
 * Subir un documento (RF-24 a RF-30). El archivo se revisa al elegirlo con la misma regla
 * del servidor —tipo real y tamaño—, para no esperar una subida de 20 MB que se va a
 * rechazar; el servidor lo vuelve a revisar todo (RF-50).
 */
function VentanaDeSubir({
  pedido,
  lugar,
  sinPrecio,
  alCerrar,
  alGuardar,
}: {
  pedido: LugarDeLosDocumentos;
  lugar: LugarDeDocumentos;
  sinPrecio: boolean;
  alCerrar: () => void;
  alGuardar: () => void;
}) {
  const [clase, setClase] = useState<string | null>(null);
  const [nombre, setNombre] = useState('');
  const [fecha, setFecha] = useState(fechaDeJornada());
  const [vence, setVence] = useState('');
  const [proveedor, setProveedor] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [archivo, setArchivo] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  const falta =
    faltasDelDocumento(lugar, { clase: clase ?? '', nombre, fecha, vence: vence || null })[0] ??
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
      await api.documentos.subir(
        pedido,
        { clase: clase ?? '', nombre, fecha, vence, proveedor, descripcion },
        archivo,
        archivo.name,
      );
      alGuardar();
    } catch (fallo) {
      setError(mensajeDe(fallo));
    } finally {
      setEnviando(false);
    }
  }

  return (
    <Modal titulo="Subir documento" onCerrar={alCerrar}>
      <Selector
        etiqueta="Clase"
        valor={clase}
        opciones={clasesDe(lugar)
          .filter((c) => !sinPrecio || !llevaPrecio(c.id))
          .map((c) => ({ valor: c.id, etiqueta: c.nombre }))}
        onChange={setClase}
        vacio="Elija la clase"
      />
      <View style={estilos.archivo}>
        <Boton titulo={archivo ? 'Cambiar archivo' : 'Elegir archivo *'} tono="secundario" onPress={elegir} />
        <Text style={estilos.apoyo}>
          {archivo ? archivo.name : 'PDF, imagen (JPG, PNG, WEBP), Word o Excel, hasta 20 MB.'}
        </Text>
      </View>
      <Campo etiqueta="Nombre" obligatorio valor={nombre} onChange={setNombre} ayuda="Por ejemplo: Cámara de comercio octubre 2026." />
      <CampoDeFecha etiqueta="Fecha del documento" valor={fecha} onChange={setFecha} />
      {lugar === 'solicitud' ? null : (
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
      {error ? <Aviso tono="error">{error}</Aviso> : falta ? <Text style={estilos.apoyo}>{falta}</Text> : null}
      <AccionesFormulario>
        <Boton titulo="Cancelar" tono="secundario" onPress={alCerrar} />
        <Boton titulo={enviando ? 'Subiendo…' : 'Subir'} onPress={guardar} deshabilitado={enviando || falta !== null} />
      </AccionesFormulario>
    </Modal>
  );
}

const estilos = StyleSheet.create({
  celdaDoble: { gap: Spacing.half, alignItems: 'flex-start' },
  nombre: { fontFamily: FuentePanel.texto, fontSize: TextoPanel.cuerpo, fontWeight: '600', color: Panel.texto },
  anulado: { textDecorationLine: 'line-through', color: Panel.textoApoyo },
  texto: { fontFamily: FuentePanel.texto, fontSize: TextoPanel.cuerpo, color: Panel.texto },
  apoyo: { fontFamily: FuentePanel.texto, fontSize: TextoPanel.apoyo, color: Panel.textoApoyo },
  archivo: { gap: Spacing.one, alignItems: 'flex-start' },
});
