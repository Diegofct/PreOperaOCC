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
import { useFocusEffect, useLocalSearchParams, useNavigation, usePathname, useRouter, type Href } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';

import { FuentePanel, Panel, Spacing, TextoPanel } from '@/constants/theme';
import { ArchivadorDeDocumentos } from '@/features/documentos/archivador';
import { VentanaDeSubir } from '@/features/documentos/ventana-de-subir';
import { VentanaDeAnular } from '@/features/contratos/polizas-y-documentos';
import { useLugarDelPanel } from '@/features/empresas/contexto-empresa';
import { api, type LugarDeLosDocumentos } from '@/features/panel/cliente-api';
import {
  Acciones,
  Aviso,
  BarraDeListado,
  Boton,
  Casilla,
  Celda,
  Cifra,
  Cifras,
  Etiqueta,
  Paginacion,
  Seccion,
  Selector,
  Tabla,
  type Columna,
} from '@/features/panel/componentes';
import type { DocumentoDelLugar, DocumentosDelLugar } from '@/features/panel/contratos';
import { MarcoPantalla, useListado } from '@/features/panel/marco';
import { usePersona } from '@/features/panel/sesion';
import { useTituloDelRegistro } from '@/features/panel/titulo-del-registro';
import { POR_PAGINA } from '@/features/panel/paginas';
import { useListadoFiltrado } from '@/features/panel/usar-listado-filtrado';
import { useParametroDeDireccion } from '@/features/panel/usar-parametro-direccion';
import { fechaDelCorte } from '@/shared/rules/cortes';
import {
  carpetasDe,
  clasesDe,
  type LugarDeDocumentos,
} from '@/shared/rules/documentos';
import { nombreDeEmpresa } from '@/shared/rules/empresas';
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
          : 'solicitudId' in pedido
            ? pedido.solicitudId
            : pedido.solicitudPagoId
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
  const deQuien: LugarDeDocumentos = pedido && 'empresa' in pedido ? pedido.empresa : 'obra';

  const nombreDelLugar =
    lugar?.tipo === 'empresa' ? nombreDeEmpresa(lugar.empresa) : lugar?.tipo === 'obra' ? 'la obra' : '';
  const puedeSubir = alcanza(rol, 'documentos', 'escribir');
  // Spec 050, RF-30, RF-32: aquí subir es la acción principal y va en el encabezado, solo para quien
  // puede. La ventana sigue siendo de la carpeta; desde aquí solo se abre.
  const [subiendo, setSubiendo] = useState(false);

  // Spec 051, RF-19 a RF-22: la carpeta abierta vive en la dirección como pantalla nueva del Stack
  // (T4). Una clave que no es carpeta de este lugar se ignora y se ven todas.
  // Cambio del 2026-11-20: la carpeta de la dirección se busca también entre las que solo tienen
  // anulados, para poder abrirla por su enlace (RF-22, RF-68); la cuadrícula y la ventana de subir
  // usan las que tienen vigentes.
  const todas = carpetasDe(deQuien, cargados.datos[0]?.documentos ?? [], { conAnulados: true });
  const carpetas = todas.filter((c) => c.vigentes > 0);
  const { carpeta: carpetaPedida } = useLocalSearchParams<{ carpeta?: string }>();
  const abierta = todas.find((c) => c.id === carpetaPedida) ?? null;
  const ruta = usePathname();
  const router = useRouter();
  const navegacion = useNavigation();
  // Segundo cambio del 2026-11-20 (RF-80, D23): mientras se busca, los resultados son de todas las
  // carpetas, así que el título, la pestaña y la ruta dicen «Documentos» aunque haya una abierta. El
  // texto se lee aquí y baja al archivador: una sola lectura de la dirección, para que no se desfasen.
  const [busqueda, buscar] = useParametroDeDireccion('buscar', '');
  const enLaCarpeta = busqueda.trim().length > 0 ? null : abierta;
  useTituloDelRegistro(enLaCarpeta?.nombre);

  // Cada carpeta abierta es una pantalla aparte del Stack (T4), y la de abajo se queda montada con lo que
  // pidió al entrar. Si en la de arriba se subió o se anuló algo, al volver con «atrás» o con «Todas las
  // carpetas» mostraría los números de antes. Por eso, cada vez que esta pantalla vuelve a quedar delante,
  // pide la lista otra vez (sin la ruedita de «Cargando»). La primera vez no: ya la está pidiendo.
  const yaEstuvoDelante = useRef(false);
  const { recargar } = cargados;
  useFocusEffect(
    useCallback(() => {
      if (yaEstuvoDelante.current) recargar();
      yaEstuvoDelante.current = true;
    }, [recargar]),
  );

  const abrirCarpeta = (id: string) => router.push(`${ruta}?carpeta=${encodeURIComponent(id)}` as Href);
  // RF-17, RF-18, RF-20: si debajo están las carpetas de esta misma pantalla, se vuelve a ellas —es
  // lo que haría «atrás», sin pedir la lista otra vez—. Si se llegó por un enlace directo a la
  // carpeta, debajo no hay nada propio y se reemplaza por las carpetas.
  const volver = () => {
    const estado = navegacion.getState();
    const abajo = estado && estado.index > 0 ? estado.routes[estado.index - 1] : undefined;
    const actual = estado?.routes[estado.index];
    const sonLasCarpetas =
      abajo !== undefined && abajo.name === actual?.name && !(abajo.params as { carpeta?: string } | undefined)?.carpeta;
    if (sonLasCarpetas) router.back();
    else router.replace(ruta as Href);
  };

  return (
    <MarcoPantalla
      acciones={puedeSubir && pedido ? <Boton titulo="Subir documento" onPress={() => setSubiendo(true)} /> : undefined}
      titulo={enLaCarpeta?.nombre ?? 'Documentos'}
      registro={enLaCarpeta?.nombre}
      alVolverDelRegistro={enLaCarpeta ? volver : undefined}
      descripcion={
        enLaCarpeta
          ? `Los documentos de ${nombreDelLugar} en esta carpeta, del más reciente al más antiguo.`
          : `Los documentos de ${nombreDelLugar}, en una carpeta por clase. Al subir uno se elige su carpeta o se crea una nueva. Nada se borra: lo que sobra se anula con motivo.`
      }
      error={cargados.error}
      cargando={cargados.cargando}
    >
      {/* Spec 051: las carpetas. La ficha, la requisición y el pago siguen con CarpetaDeDocumentos (RF-2). */}
      {pedido ? (
        <ArchivadorDeDocumentos
          cargados={cargados}
          pedido={pedido}
          deQuien={deQuien}
          carpetas={carpetas}
          abierta={abierta}
          busqueda={busqueda}
          buscar={buscar}
          alAbrir={abrirCarpeta}
          alVolver={volver}
          puedeSubir={puedeSubir}
          puedeAnular={alcanza(rol, 'documentos', 'anular')}
          subida={{ abierta: subiendo, alCambiar: setSubiendo }}
        />
      ) : null}
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
  subida,
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
  /**
   * Spec 050, RF-30: cuando subir es la acción principal de la pantalla, el botón va en su
   * encabezado y desde ahí se abre la ventana; la carpeta no pinta el suyo. Sin esto, como siempre:
   * en la ficha, en una solicitud y en un pago, subir es secundario y va dentro de la sección.
   */
  subida?: { abierta: boolean; alCambiar: (abierta: boolean) => void };
}) {
  const { documentos, resumen } = cargados.datos[0] ?? SIN_DOCUMENTOS;
  const [ventana, setVentana] = useState<{ tipo: 'subir' } | { tipo: 'anular'; documento: DocumentoDelLugar } | null>(
    null,
  );
  const [hecho, setHecho] = useState<string | null>(null);
  const subirAbierta = subida ? subida.abierta : ventana?.tipo === 'subir';
  const cerrarSubir = () => (subida ? subida.alCambiar(false) : setVentana(null));
  const listo = (texto: string) => {
    setVentana(null);
    subida?.alCambiar(false);
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
    { hay: clase !== null || soloConAviso || verAnulados, limpiar: () => { setClase(null); setSoloConAviso(false); setVerAnulados(false); } },
  );
  const vigentes = documentos.filter((d) => d.anulado === null).length;
  const anulados = documentos.length - vigentes;
  // Spec 036: los soportes de una compra no vencen; sus cifras y su columna serían ruido.
  const conVencimientos = deQuien !== 'solicitud' && deQuien !== 'pago';

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
        {puedeSubir && pedido && !subida ? (
          <Acciones>
            <Boton titulo="Subir documento" onPress={() => setVentana({ tipo: 'subir' })} />
          </Acciones>
        ) : null}
        <BarraDeListado onLimpiar={listado.limpiar}
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
          sinResultados={listado.sinResultados}
          columnas={columnas}
          filas={listado.pagina}
          // Spec 050, RF-53: el ícono, la frase y, a quien puede subir, el botón para el primero.
          vacio={{
            icono: '🗀',
            texto: 'Todavía no hay documentos aquí.',
            accion:
              puedeSubir && pedido ? (
                <Boton
                  titulo="Subir documento"
                  onPress={() => (subida ? subida.alCambiar(true) : setVentana({ tipo: 'subir' }))}
                />
              ) : undefined,
          }}
        />
        <Paginacion
          pagina={listado.paginaActual}
          porPagina={POR_PAGINA}
          total={listado.coincidencias}
          onCambiar={listado.irAPagina}
        />
      </Seccion>

      {subirAbierta && pedido ? (
        <VentanaDeSubir
          pedido={pedido}
          lugar={deQuien}
          sinPrecio={sinPrecio}
          alCerrar={cerrarSubir}
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

const estilos = StyleSheet.create({
  celdaDoble: { gap: Spacing.half, alignItems: 'flex-start' },
  nombre: { fontFamily: FuentePanel.texto, fontSize: TextoPanel.cuerpo, fontWeight: '600', color: Panel.texto },
  anulado: { textDecorationLine: 'line-through', color: Panel.textoApoyo },
  texto: { fontFamily: FuentePanel.texto, fontSize: TextoPanel.cuerpo, color: Panel.texto },
  apoyo: { fontFamily: FuentePanel.texto, fontSize: TextoPanel.apoyo, color: Panel.textoApoyo },
});
