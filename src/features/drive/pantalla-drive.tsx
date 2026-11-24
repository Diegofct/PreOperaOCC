/**
 * El Drive de la obra en el panel (spec 052, RF-29 a RF-35, RF-41).
 *
 * Es la vista de lo que n8n trajo de la carpeta del consorcio: no se sube ni se borra nada aquí,
 * porque el Drive es del consorcio y Kontrola solo lo copia y lo lee. Por eso no hay botón en el
 * encabezado; la única acción es «Volver a leer» lo que no se pudo leer (RF-33).
 *
 * ── Lo que se ve ──
 *
 *  - La carpeta y su **última entrega** (RF-34), con un aviso si pasó más de media hora: n8n
 *    entrega cada 5 minutos, y una lista que deja de cambiar parece al día aunque no lo esté.
 *  - Las **cifras** por estado, de toda la carpeta, no de lo que se está buscando.
 *  - El **buscador** (RF-31) busca en el servidor, porque el contenido no viaja a la pantalla: se
 *    espera a que se deje de escribir, para no pedir la lista en cada letra.
 *  - Una **tarjeta por documento**, a lo ancho, porque el resumen es un párrafo (RF-30). Cómo se
 *    abre cada copia lo decide la regla (`comoSeAbre`): el navegador muestra PDF, imágenes y
 *    texto; Word y Excel se descargan; lo que pasa de 50 MB se abre en el Drive (RF-41). Las
 *    versiones viejas se abren igual (RF-32), desde su propia lista dentro de la tarjeta.
 *
 * Quién ve esta pantalla lo decide el menú de la obra y, de verdad, la ruta del servidor (RF-36,
 * RF-37).
 *
 * ── Una obra sin carpeta (RF-8 a RF-10) ──
 *
 * La carpeta nace sola en Kontrola con la primera entrega de n8n, sin obra; asociarla es de la
 * gerencia (`activar`), y aquí se le ofrece desde la obra misma: «Conectar carpeta», con las que
 * todavía no tienen obra. Los demás ven solo que la obra no tiene carpeta y quién la conecta. El
 * servidor responde 409 si la obra ya tenía otra, y ese motivo sale en el aviso.
 */
import { useCallback, useEffect, useState } from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';

import { FuentePanel, Panel, Spacing, TextoPanel } from '@/constants/theme';
import { useObraDeLaRuta } from '@/features/empresas/contexto-empresa';
import { api } from '@/features/panel/cliente-api';
import {
  Acciones,
  Aviso,
  BarraDeListado,
  Boton,
  Cifra,
  Cifras,
  Etiqueta,
  ListaVacia,
  Modal,
  Selector,
  Paginacion,
  Tarjeta,
} from '@/features/panel/componentes';
import type { DocumentoDelDriveFila, ListaDelDrive, VersionDelDriveFila } from '@/features/panel/contratos';
import { MarcoPantalla, useListado } from '@/features/panel/marco';
import { POR_PAGINA } from '@/features/panel/paginas';
import { usePersona } from '@/features/panel/sesion';
import { comoSeAbre, entregaAtrasada, opcionesDeCarpetasSinObra } from '@/shared/rules/drive';
import { alcanza } from '@/shared/rules/permisos';

/** Cuánto se espera después de la última letra antes de buscar. */
const ESPERA_DE_BUSQUEDA_MS = 350;

const SIN_LISTA: ListaDelDrive = { carpeta: null, documentos: [] };

function fechaHora(iso: string): string {
  return new Date(iso).toLocaleString('es-CO', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'America/Bogota' });
}

function abrirEnOtraPestana(url: string) {
  if (Platform.OS === 'web') window.open(url, '_blank', 'noopener');
}

/** El estado con su símbolo y su color: el color nunca va solo (RF-30). */
const MARCA_DEL_ESTADO = {
  leido: { tono: 'bueno', simbolo: '✓' },
  leyendo: { tono: 'neutro', simbolo: '◷' },
  no_se_pudo: { tono: 'malo', simbolo: '✕' },
  retirado: { tono: 'neutro', simbolo: '⊘' },
} as const;

export default function PantallaDrive() {
  const obraId = useObraDeLaRuta();
  const persona = usePersona();
  const puedeReleer = alcanza(persona.rol, 'drive', 'escribir');
  const puedeConectar = alcanza(persona.rol, 'drive', 'activar');
  const [conectando, setConectando] = useState(false);
  // La hora con la que se juzga si la última entrega está atrasada: la de abrir la pantalla.
  const [abiertaEn] = useState(() => Date.now());

  const [busqueda, setBusqueda] = useState('');
  const [buscada, setBuscada] = useState('');
  useEffect(() => {
    const espera = setTimeout(() => setBuscada(busqueda.trim()), ESPERA_DE_BUSQUEDA_MS);
    return () => clearTimeout(espera);
  }, [busqueda]);

  // Toda la carpeta, para las cifras y la lista sin búsqueda; y aparte lo que se busca.
  const completa = useListado<ListaDelDrive>(
    useCallback(() => (obraId ? api.drive.documentos(obraId).then((l) => [l]) : Promise.resolve([])), [obraId]),
  );
  const buscando = useListado<ListaDelDrive>(
    useCallback(
      () => (obraId && buscada ? api.drive.documentos(obraId, buscada).then((l) => [l]) : Promise.resolve([])),
      [obraId, buscada],
    ),
  );

  const lista = completa.datos[0] ?? SIN_LISTA;
  const visibles = buscada ? (buscando.datos[0]?.documentos ?? []) : lista.documentos;
  // La página va con la búsqueda a la que pertenece: buscar otra cosa vuelve a la primera.
  const [pagina, setPagina] = useState({ de: '', numero: 1 });
  const paginas = Math.max(1, Math.ceil(visibles.length / POR_PAGINA));
  const actual = Math.min(pagina.de === buscada ? pagina.numero : 1, paginas);
  const enLaPagina = visibles.slice((actual - 1) * POR_PAGINA, actual * POR_PAGINA);

  const cuantos = (clave: DocumentoDelDriveFila['estado']['clave']) => lista.documentos.filter((d) => d.estado.clave === clave).length;

  async function releer(version: VersionDelDriveFila) {
    const listo = await completa.ejecutar(() => api.drive.releer(version.id), {
      exito: 'Se volverá a leer en el próximo pulso, en unos minutos.',
    });
    if (listo && buscada) buscando.recargar();
  }

  return (
    <MarcoPantalla
      titulo="Drive"
      descripcion="Los documentos de la carpeta del Drive de la obra, copiados y leídos para buscarlos y para el asistente."
      cargando={completa.cargando}
      error={completa.error ?? buscando.error}
      exigeObra
    >
      {!lista.carpeta ? (
        <ListaVacia
          vacio={{
            texto: 'Esta obra todavía no tiene una carpeta del Drive conectada. La conecta la gerencia.',
            icono: '—',
            accion: puedeConectar ? <Boton titulo="Conectar carpeta" onPress={() => setConectando(true)} /> : undefined,
          }}
        />
      ) : (
        <>
          <View style={estilos.carpeta}>
            <Text style={estilos.carpetaNombre}>{`Carpeta «${lista.carpeta.nombre}»`}</Text>
            <Text style={estilos.apoyo}>
              {lista.carpeta.ultimaEntregaEn
                ? `Última entrega de n8n: ${fechaHora(lista.carpeta.ultimaEntregaEn)}, con ${lista.carpeta.archivosEnLaUltimaEntrega ?? 0} archivos.`
                : 'Todavía no ha llegado ninguna entrega de n8n.'}
            </Text>
          </View>
          {entregaAtrasada(lista.carpeta.ultimaEntregaEn, abiertaEn) ? (
            <Aviso tono="info">
              No llega una entrega del Drive desde hace más de media hora: puede que la integración de n8n se haya detenido. Lo que
              cambió en el Drive desde entonces todavía no está aquí.
            </Aviso>
          ) : null}

          <Cifras>
            <Cifra titulo="Leídos" valor={String(cuantos('leido'))} tono="bueno" />
            <Cifra titulo="Leyendo" valor={String(cuantos('leyendo'))} />
            <Cifra titulo="No se pudo leer" valor={String(cuantos('no_se_pudo'))} tono={cuantos('no_se_pudo') > 0 ? 'malo' : 'neutro'} />
            <Cifra titulo="Retirados del Drive" valor={String(cuantos('retirado'))} />
          </Cifras>

          <BarraDeListado
            busqueda={busqueda}
            onBuscar={setBusqueda}
            total={lista.documentos.length}
            mostradas={buscada ? visibles.length : lista.documentos.length}
          />

          {visibles.length === 0 ? (
            buscada ? (
              <ListaVacia vacio="" sinResultados={{ alQuitar: () => setBusqueda('') }} />
            ) : (
              <ListaVacia vacio={{ texto: 'Todavía no hay documentos: aparecen cuando n8n entrega los de la carpeta.', icono: '—' }} />
            )
          ) : (
            <View style={estilos.lista}>
              {enLaPagina.map((d) => (
                <TarjetaDelDrive key={d.id} documento={d} alReleer={puedeReleer ? releer : undefined} />
              ))}
              <Paginacion pagina={actual} porPagina={POR_PAGINA} total={visibles.length} onCambiar={(numero) => setPagina({ de: buscada, numero })} />
            </View>
          )}
        </>
      )}
      {conectando && obraId ? (
        <VentanaDeConectar
          obraId={obraId}
          alCerrar={() => setConectando(false)}
          alConectar={async (carpetaId) => {
            const listo = await completa.ejecutar(() => api.drive.carpetas.asociar(carpetaId, obraId), {
              exito: 'Carpeta conectada. Sus documentos se ven aquí desde ya.',
            });
            if (listo) setConectando(false);
          }}
        />
      ) : null}
    </MarcoPantalla>
  );
}

/**
 * RF-8, RF-9: escoger una de las carpetas que todavía no tienen obra. Las pide al abrirse: es una
 * lista que solo ve la gerencia y que cambia cuando n8n entrega una carpeta nueva.
 */
function VentanaDeConectar({
  obraId,
  alCerrar,
  alConectar,
}: {
  obraId: string;
  alCerrar: () => void;
  alConectar: (carpetaId: string) => Promise<void>;
}) {
  const carpetas = useListado(useCallback(() => api.drive.carpetas.listar(), []));
  const opciones = opcionesDeCarpetasSinObra(carpetas.datos);
  const [elegida, setElegida] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  return (
    <Modal titulo="Conectar una carpeta del Drive" onCerrar={alCerrar} angosta>
      <View style={estilos.ventana} key={obraId}>
        {carpetas.error ? <Aviso tono="error">{carpetas.error}</Aviso> : null}
        {carpetas.cargando ? (
          <Text style={estilos.apoyo}>Buscando las carpetas sin obra…</Text>
        ) : opciones.length === 0 ? (
          <Text style={estilos.apoyo}>
            No hay carpetas sin obra. Una carpeta aparece aquí cuando n8n entrega su primer inventario.
          </Text>
        ) : (
          <>
            <Text style={estilos.apoyo}>
              Sus documentos los verán quienes ven esta obra. Una obra tiene una sola carpeta del Drive.
            </Text>
            <Selector
              etiqueta="Carpeta"
              valor={elegida}
              opciones={opciones}
              onChange={setElegida}
              vacio="Escoja una carpeta"
              obligatorio
            />
          </>
        )}
        <Acciones>
          <Boton titulo="Cancelar" tono="secundario" onPress={alCerrar} />
          <Boton
            titulo={enviando ? 'Conectando…' : 'Conectar'}
            deshabilitado={!elegida || enviando}
            onPress={async () => {
              if (!elegida) return;
              setEnviando(true);
              await alConectar(elegida);
              setEnviando(false);
            }}
          />
        </Acciones>
      </View>
    </Modal>
  );
}

/** Los botones de una versión: abrir o descargar su copia, o abrirla en el Drive (RF-32, RF-41). */
function BotonesDeLaVersion({
  documento: d,
  version,
  tono,
}: {
  documento: DocumentoDelDriveFila;
  version: VersionDelDriveFila;
  tono: 'primario' | 'secundario';
}) {
  const como = comoSeAbre({ mediaId: version.mediaId, mime: d.mime, nombre: d.nombre, enlace: d.enlace });
  if (como === 'drive' && d.enlace) {
    const enlace = d.enlace;
    return <Boton titulo="Abrir en el Drive" tono={tono} onPress={() => abrirEnOtraPestana(enlace)} />;
  }
  if (!version.mediaId || !como) return null;
  const mediaId = version.mediaId;
  return (
    <>
      {como === 'abrir' ? (
        <Boton titulo="Abrir" tono={tono} onPress={() => abrirEnOtraPestana(api.documentos.urlDelArchivo(mediaId))} />
      ) : null}
      <Boton
        titulo="Descargar"
        tono={como === 'abrir' ? 'secundario' : tono}
        onPress={() => abrirEnOtraPestana(api.documentos.urlDelArchivo(mediaId, true))}
      />
    </>
  );
}

function TarjetaDelDrive({
  documento: d,
  alReleer,
}: {
  documento: DocumentoDelDriveFila;
  /** Sin él no hay «Volver a leer»: el cargo no lo tiene (RF-33). */
  alReleer?: (version: VersionDelDriveFila) => void;
}) {
  const [conVersiones, setConVersiones] = useState(false);
  const vigente = d.versiones[0];
  const viejas = d.versiones.slice(1);
  const marca = MARCA_DEL_ESTADO[d.estado.clave];
  const seVuelveALeer = alReleer && vigente.estado === 'no_se_pudo' && vigente.mediaId !== null;

  return (
    <Tarjeta>
      <View style={estilos.documento}>
        <View style={estilos.cabeza}>
          <Text style={estilos.nombre}>{d.nombre}</Text>
          <Etiqueta tono={marca.tono}>{`${marca.simbolo} ${d.estado.texto}`}</Etiqueta>
        </View>
        <Text style={estilos.apoyo}>{`${d.subcarpeta || 'Raíz de la carpeta'} · modificado en el Drive el ${fechaHora(d.modificadoEnDrive)}`}</Text>
        {d.resumen ? <Text style={estilos.resumen}>{d.resumen}</Text> : null}

        <Acciones>
          <BotonesDeLaVersion documento={d} version={vigente} tono="secundario" />
          {seVuelveALeer ? <Boton titulo="Volver a leer" tono="secundario" onPress={() => alReleer(vigente)} /> : null}
          {viejas.length > 0 ? (
            <Boton
              titulo={conVersiones ? 'Ocultar versiones anteriores' : `Versiones anteriores (${viejas.length})`}
              tono="secundario"
              onPress={() => setConVersiones((v) => !v)}
            />
          ) : null}
        </Acciones>

        {conVersiones ? (
          <View style={estilos.versiones}>
            {viejas.map((v) => (
              <View key={v.id} style={estilos.version}>
                <Text style={estilos.apoyo}>{`Versión del ${fechaHora(v.modificadoEnDrive)}`}</Text>
                <Acciones>
                  <BotonesDeLaVersion documento={d} version={v} tono="secundario" />
                </Acciones>
              </View>
            ))}
          </View>
        ) : null}
      </View>
    </Tarjeta>
  );
}

const estilos = StyleSheet.create({
  carpeta: { gap: Spacing.half },
  carpetaNombre: { fontFamily: FuentePanel.texto, fontSize: TextoPanel.cuerpo, fontWeight: '700', color: Panel.texto },
  apoyo: { fontFamily: FuentePanel.texto, fontSize: TextoPanel.apoyo, color: Panel.textoApoyo },
  lista: { gap: Spacing.three },
  documento: { gap: Spacing.two },
  cabeza: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: Spacing.two },
  nombre: { flexShrink: 1, fontFamily: FuentePanel.texto, fontSize: TextoPanel.cuerpo, fontWeight: '700', color: Panel.texto },
  resumen: { fontFamily: FuentePanel.texto, fontSize: TextoPanel.cuerpo, lineHeight: TextoPanel.cuerpo * 1.5, color: Panel.texto },
  versiones: { gap: Spacing.two, paddingTop: Spacing.two, borderTopWidth: 1, borderTopColor: Panel.borde },
  version: { gap: Spacing.one },
  ventana: { gap: Spacing.three },
});
