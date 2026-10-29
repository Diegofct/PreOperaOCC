/**
 * El asistente (spec 028): conversaciones en las que se pregunta en español sobre la
 * información de la obra y la respuesta llega mientras se redacta, con sus fuentes.
 *
 *  · A la izquierda, la barra de conversaciones (`barra-de-conversaciones.tsx`): plegable,
 *    con buscador, grupos por fecha y archivadas (RF-39, RF-46, RF-47, RF-81). En pantalla
 *    angosta se abre encima de la conversación y se cierra al elegir (RF-82).
 *  · A la derecha, la conversación, a la manera de los chats de IA (cambio del 2026-10-22):
 *    sin conversación abierta, un saludo con el campo y ejemplos (RF-74); con ella, una
 *    columna centrada con las preguntas en burbuja y las respuestas con sus fuentes (que
 *    abren el registro en su módulo, RF-30) y sus acciones (RF-80), que baja sola mientras
 *    llega la respuesta (RF-79), y el campo fijo al pie con lo que queda del día (RF-76).
 *
 * La conversación abierta va en la dirección (`conversacion`), como la obra en otros
 * módulos: recargar o compartir el enlace vuelve a ella.
 */
import { router, type Href } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';

import { FuentePanel, Panel, Radio, Sombra, Spacing, TextoPanel } from '@/constants/theme';
import { useObraDeLaRuta } from '@/features/empresas/contexto-empresa';
import { api, mensajeDe, preguntarAlAsistente } from '@/features/panel/cliente-api';
import { Aviso } from '@/features/panel/componentes';
import type { ConversacionDelAsistente, CupoDelAsistente, MensajeDelAsistente } from '@/features/panel/contratos';
import { MarcoPantalla, useListado } from '@/features/panel/marco';
import { usePersona } from '@/features/panel/sesion';
import { useEsAngosto } from '@/features/panel/usar-ancho';
import { useParametroDeDireccion } from '@/features/panel/usar-parametro-direccion';

import { alcanceDelAsistente, ejemplosDePregunta, faltasDeLosAdjuntos } from '@/shared/rules/asistente';
import { alcanza } from '@/shared/rules/permisos';

import { AccionesDeRespuesta } from './acciones-de-respuesta';
import { BarraDeConversaciones, BotonDeIcono, useBarraPlegada } from './barra-de-conversaciones';
import { CampoDePregunta } from './campo-de-pregunta';
import { elegirArchivos, TIPOS_DEL_ASISTENTE } from './elegir-archivos';
import { paginaDeLaRespuesta } from './imprimir';
import { UsoDelAsistentePanel } from './uso-del-asistente';
import { Markdown } from './markdown';

/** Lo que se muestra mientras la IA consulta un módulo. */
const NOMBRE_DE_CONSULTA: Record<string, string> = {
  obras_a_mi_alcance: 'sus obras',
  reporte: 'Reportes',
  bitacora_del_dia: 'la bitácora',
  viajes_de_cantera: 'Control Cantera',
  ensayos: 'Laboratorio',
  almacen: 'Almacén',
  preoperacionales: 'Preoperacionales',
  vehiculos_y_medidores: 'Vehículos',
  personas_de_la_obra: 'Personas',
  contrato_y_presupuesto: 'Contrato y Presupuesto',
  anulados: 'lo anulado',
  mensajes_de_whatsapp: 'Reportes de WhatsApp',
};

/** Con una ventana muy baja, la conversación no se encoge de aquí: se desplaza la página. */
const ALTO_MINIMO_DE_LA_CONVERSACION = 360;
/** A menos de esto del final, la conversación sigue a la respuesta que llega (RF-79). */
const MARGEN_DEL_FINAL = 80;
/** La columna de lectura de la conversación y del campo (RF-75). */
const ANCHO_DE_LECTURA = 760;

const cuando = (iso: string) =>
  new Date(iso).toLocaleString('es-CO', { timeZone: 'America/Bogota', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' });

interface EnCurso {
  pregunta: string;
  adjuntos: string[];
  texto: string;
  consultando: string | null;
  fuentes: MensajeDelAsistente['fuentes'];
}

export default function PantallaAsistente() {
  const angosto = useEsAngosto();
  const persona = usePersona();
  // Spec 033, RF-30: abierto dentro de una obra, responde por defecto sobre ella.
  const obraDeLaRuta = useObraDeLaRuta();
  // RF-56 a RF-59: la gerencia ve además el uso y los límites, en su propia vista.
  const veUso = alcanza(persona.rol, 'asistente', 'escribir');
  const [vista, setVista] = useParametroDeDireccion('vista', 'conversaciones');
  const [conversacionId, setConversacionId] = useParametroDeDireccion('conversacion', '');
  const [archivadas, setArchivadas] = useState(false);
  const [borrador, setBorrador] = useState('');
  const [enCurso, setEnCurso] = useState<EnCurso | null>(null);
  const [error, setError] = useState<string | null>(null);
  /** El cupo que llega con `fin` o `error`, antes de que la lista se recargue. */
  const [cupoNuevo, setCupoNuevo] = useState<CupoDelAsistente | null>(null);
  const cancelar = useRef<AbortController | null>(null);
  /** RF-66: los archivos que van con la próxima pregunta. */
  const [archivos, setArchivos] = useState<File[]>([]);
  /**
   * RF-62: los archivos de la última pregunta, para que «Reintentar» los vuelva a mandar
   * sin pedirlos otra vez. Solo mientras la pantalla siga abierta.
   */
  const ultimosArchivos = useRef<{ pregunta: string; archivos: File[] } | null>(null);
  const faltasDeArchivos = faltasDeLosAdjuntos(archivos.map((a) => ({ nombre: a.name, tipo: a.type, bytes: a.size })));

  const listado = useListado(useCallback(async () => [await api.asistente.conversaciones(archivadas)], [archivadas]));
  const lectura = useListado(
    useCallback(async () => (conversacionId ? [await api.asistente.conversacion(conversacionId)] : []), [conversacionId]),
  );
  const lista: ConversacionDelAsistente[] = listado.datos[0]?.conversaciones ?? [];
  const cupo = cupoNuevo ?? listado.datos[0]?.cupo ?? null;
  const abierta = lectura.datos[0] ?? null;
  const cargando = listado.cargando && listado.datos.length === 0;

  // Al salir de la pantalla, la respuesta en curso se corta (y queda para reintentar).
  useEffect(() => () => cancelar.current?.abort(), []);

  async function adjuntar() {
    const elegidos = await elegirArchivos(TIPOS_DEL_ASISTENTE);
    if (elegidos.length > 0) setArchivos((ya) => [...ya, ...elegidos]);
  }

  async function preguntar(pregunta: string, id: string, conArchivos: File[]) {
    if ((!pregunta.trim() && conArchivos.length === 0) || enCurso) return;
    setError(null);
    setBorrador('');
    setArchivos([]);
    ultimosArchivos.current = { pregunta, archivos: conArchivos };
    setEnCurso({ pregunta, adjuntos: conArchivos.map((a) => a.name), texto: '', consultando: null, fuentes: [] });
    const control = new AbortController();
    cancelar.current = control;
    let idFinal = id;
    try {
      await preguntarAlAsistente(
        { pregunta, conversacionId: id || null, archivos: conArchivos, obraId: obraDeLaRuta },
        (e) => {
          if (e.evento === 'conversacion') idFinal = e.id;
          else if (e.evento === 'texto') setEnCurso((c) => c && { ...c, texto: c.texto + e.texto, consultando: null });
          else if (e.evento === 'borrar') setEnCurso((c) => c && { ...c, texto: '' });
          else if (e.evento === 'consultando') setEnCurso((c) => c && { ...c, consultando: NOMBRE_DE_CONSULTA[e.consulta] ?? e.consulta });
          else if (e.evento === 'fuente') setEnCurso((c) => c && { ...c, fuentes: [...c.fuentes, e.fuente] });
          else setCupoNuevo(e.cupo);
        },
        control.signal,
      );
    } catch (fallo) {
      // RF-77: si la persona la detuvo, la respuesta ya quedó guardada como interrumpida y con
      // «Reintentar»; no es un error que mostrar, ni hay que devolver la pregunta al campo.
      if (control.signal.aborted) return;
      setError(mensajeDe(fallo));
      setBorrador(pregunta);
      setArchivos(conArchivos);
    } finally {
      setEnCurso(null);
      cancelar.current = null;
      if (idFinal && idFinal !== conversacionId) setConversacionId(idFinal);
      else lectura.recargar();
      setCupoNuevo(null);
      listado.recargar();
    }
  }

  // RF-73: la pregunta que llega del Inicio (`?pregunta=`) se manda una sola vez al abrir,
  // en una conversación nueva, y se quita de la dirección para que recargar no la repita.
  const [preguntaDelInicio, setPreguntaDelInicio] = useParametroDeDireccion('pregunta', '');
  const yaMandada = useRef(false);
  useEffect(() => {
    if (!preguntaDelInicio || yaMandada.current) return;
    yaMandada.current = true;
    const pendiente = preguntaDelInicio;
    const espera = setTimeout(() => {
      setPreguntaDelInicio('');
      void preguntar(pendiente, '', []);
    }, 0);
    return () => clearTimeout(espera);
    // Solo al abrir: `preguntar` cambia en cada render y no debe volver a disparar esto.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [preguntaDelInicio]);

  /**
   * RF-24 a RF-27: abre la respuesta lista para imprimir o guardar como PDF. Con lo que ya
   * está en pantalla: no vuelve a consultar nada.
   */
  function imprimir(pregunta: string, respuesta: MensajeDelAsistente) {
    if (Platform.OS !== 'web') return;
    const ventana = window.open('', '_blank');
    if (!ventana) {
      setError('El navegador bloqueó la ventana del PDF. Permita las ventanas emergentes de este sitio.');
      return;
    }
    ventana.document.open();
    ventana.document.write(paginaDeLaRespuesta({ pregunta, respuesta, pidio: persona.nombreCompleto }));
    ventana.document.close();
  }

  async function archivar(archivada: boolean) {
    if (!abierta) return;
    try {
      await api.asistente.archivar(abierta.conversacion.id, archivada);
      setConversacionId('');
      listado.recargar();
    } catch (fallo) {
      setError(mensajeDe(fallo));
    }
  }

  const sinCupo = cupo !== null && cupo.quedan === 0;

  // RF-81: la barra plegada se recuerda en este navegador.
  const [barraPlegada, plegarBarra] = useBarraPlegada();
  // RF-82: en pantalla angosta la barra se abre encima y empieza cerrada.
  const [barraAbierta, setBarraAbierta] = useState(false);
  // RF-74: sin conversación abierta, el saludo con el campo en el centro y los ejemplos.
  const bienvenida = !conversacionId && !abierta && !enCurso;
  const ejemplos = ejemplosDePregunta(alcanceDelAsistente(persona).modulos);

  // RF-76: la barra y la conversación ocupan lo que queda de la ventana, para que el campo quede
  // fijo al pie y solo se desplacen los mensajes. Se mide dónde empieza el cuerpo en la página
  // —su posición más lo que esté desplazado el marco, porque el navegador lo desplaza al poner
  // el foco en el campo—, después de cada pintado que lo pueda mover: aquí `onLayout` no
  // siempre llega en la web, porque el cuerpo puede no cambiar de tamaño cuando se mueve.
  const ventana = useWindowDimensions();
  const cuerpo = useRef<View>(null);
  const [arriba, setArriba] = useState(0);
  const avisos = Boolean(error ?? listado.error);
  useEffect(() => {
    const pedido = requestAnimationFrame(() => {
      const y = arribaEnLaPagina(cuerpo.current);
      if (y !== null) setArriba(y);
    });
    return () => cancelAnimationFrame(pedido);
  }, [ventana.width, ventana.height, cargando, avisos]);
  // Spacing.six es el relleno de abajo de `MarcoPantalla`: sin restarlo, la página se desplaza.
  const altoDelCuerpo = Math.max(ALTO_MINIMO_DE_LA_CONVERSACION, ventana.height - arriba - Spacing.six);

  // RF-79: mientras llega la respuesta, la conversación baja sola, salvo que la persona haya
  // subido a leer: «pegado» es estar a menos de MARGEN_DEL_FINAL px del final.
  const desplazamiento = useRef<ScrollView>(null);
  const pegadoAlFinal = useRef(true);
  function alDesplazar(e: NativeSyntheticEvent<NativeScrollEvent>) {
    const { contentOffset, contentSize, layoutMeasurement } = e.nativeEvent;
    pegadoAlFinal.current = contentSize.height - layoutMeasurement.height - contentOffset.y < MARGEN_DEL_FINAL;
  }
  // Al abrir otra conversación o al preguntar, se vuelve a seguir lo último.
  const preguntaEnCurso = enCurso?.pregunta;
  useEffect(() => {
    pegadoAlFinal.current = true;
  }, [conversacionId, preguntaEnCurso]);

  // RF-76 a RF-78: el mismo campo en la bienvenida y al pie de la conversación.
  const campo = (
    <CampoDePregunta
      valor={borrador}
      onChange={setBorrador}
      onEnviar={() => void preguntar(borrador, conversacionId, archivos)}
      onDetener={() => cancelar.current?.abort()}
      onAdjuntar={adjuntar}
      archivos={archivos}
      onQuitarArchivo={(j) => setArchivos((ya) => ya.filter((_, k) => k !== j))}
      enCurso={Boolean(enCurso)}
      bloqueado={sinCupo || faltasDeArchivos.length > 0}
      cupo={cupo}
      faltasDeArchivos={faltasDeArchivos}
      placeholder={abierta ? 'Siga preguntando…' : 'Escriba su pregunta…'}
      autoFocus={!angosto}
    />
  );

  const barra = (
    <BarraDeConversaciones
      lista={lista}
      cargando={cargando}
      conversacionId={conversacionId}
      onElegir={(id) => {
        setVista('conversaciones');
        setConversacionId(id);
        if (angosto) setBarraAbierta(false);
      }}
      onNueva={() => {
        setVista('conversaciones');
        setConversacionId('');
        if (angosto) setBarraAbierta(false);
      }}
      archivadas={archivadas}
      onArchivadas={setArchivadas}
      ocupado={Boolean(enCurso)}
      veUso={veUso}
      vista={vista}
      onVista={(v) => {
        setVista(v);
        if (angosto) setBarraAbierta(false);
      }}
      onCerrar={() => (angosto ? setBarraAbierta(false) : plegarBarra(true))}
      etiquetaCerrar={angosto ? 'Cerrar las conversaciones' : 'Plegar la barra de conversaciones'}
    />
  );

  return (
    <MarcoPantalla
      modulo="asistente"
      titulo="Asistente"
      descripcion="Pregunte en español sobre la información de su obra. Cada respuesta dice de dónde sale cada cifra, y el registro se abre con un toque."
      cargando={cargando}
    >
      <View ref={cuerpo} style={[estilos.cuerpo, { height: altoDelCuerpo }]}>
        {/* RF-81: la barra a la izquierda, plegable; RF-82: en pantalla angosta, encima. */}
        {!angosto && !barraPlegada ? barra : null}

        <View style={estilos.contenido}>
          {angosto || barraPlegada ? (
            <View style={estilos.barraPlegada}>
              <BotonDeIcono
                icono="abrir"
                etiqueta={angosto ? 'Ver las conversaciones' : 'Mostrar la barra de conversaciones'}
                onPress={() => (angosto ? setBarraAbierta(true) : plegarBarra(false))}
              />
              {vista !== 'uso' && conversacionId ? (
                <BotonDeIcono icono="nueva" etiqueta="Nueva conversación" onPress={() => setConversacionId('')} />
              ) : null}
            </View>
          ) : null}

          {veUso && vista === 'uso' ? (
            <ScrollView style={estilos.mensajes} contentContainerStyle={estilos.uso}>
              <UsoDelAsistentePanel />
            </ScrollView>
          ) : (
            <View style={estilos.columnaConversacion}>
              {abierta ? (
                <View style={estilos.cabecera}>
                  <Text style={estilos.titulo} numberOfLines={1}>
                    {abierta.conversacion.titulo}
                  </Text>
                  <Pressable
                    accessibilityRole="button"
                    onPress={() => archivar(!abierta.conversacion.archivada)}
                    disabled={Boolean(enCurso)}
                    style={({ hovered }) => [estilos.archivar, hovered && estilos.encima]}
                  >
                    <Text style={estilos.textoArchivar}>{abierta.conversacion.archivada ? 'Sacar del archivo' : 'Archivar'}</Text>
                  </Pressable>
                </View>
              ) : null}

              {bienvenida ? (
                <ScrollView style={estilos.mensajes} contentContainerStyle={estilos.centrado}>
                  <View style={estilos.bienvenida}>
                    <Text style={estilos.saludo} accessibilityRole="header">
                      {`¿Qué quiere saber de su obra, ${primerNombre(persona.nombreCompleto)}?`}
                    </Text>
                    {campo}
                    {ejemplos.length > 0 ? (
                      <View style={estilos.ejemplos}>
                        {ejemplos.map((ejemplo) => (
                          <Pressable
                            key={ejemplo}
                            accessibilityRole="button"
                            accessibilityHint="Lo deja escrito en el campo para que lo ajuste antes de enviar"
                            onPress={() => setBorrador(ejemplo)}
                            style={({ hovered }) => [estilos.ejemplo, hovered && estilos.encima]}
                          >
                            <Text style={estilos.textoEjemplo}>{ejemplo}</Text>
                          </Pressable>
                        ))}
                      </View>
                    ) : null}
                    {(error ?? listado.error) ? <Aviso tono="error">{error ?? listado.error}</Aviso> : null}
                  </View>
                </ScrollView>
              ) : (
                <>
                  {/* RF-75 y RF-79: la conversación se desplaza sola; el campo queda fijo debajo. */}
                  <ScrollView
                    ref={desplazamiento}
                    style={estilos.mensajes}
                    contentContainerStyle={estilos.columnaDeMensajes}
                    onScroll={alDesplazar}
                    scrollEventThrottle={100}
                    onContentSizeChange={() => {
                      if (pegadoAlFinal.current) desplazamiento.current?.scrollToEnd({ animated: false });
                    }}
                  >
                    {abierta && !abierta.conversacion.visible ? (
                      <Aviso tono="info">
                        Esta conversación consultó información que ya no está a su alcance, así que solo se muestra su título y su fecha.
                      </Aviso>
                    ) : null}

                    {abierta?.mensajes.map((m, i) =>
                      m.rol === 'persona' ? (
                        <View key={m.id} style={estilos.burbujaPersona}>
                          {m.texto ? <Text style={estilos.textoPersona}>{m.texto}</Text> : null}
                          <AdjuntosGuardados adjuntos={m.adjuntos} />
                        </View>
                      ) : (
                        <View key={m.id} style={estilos.respuesta}>
                          {m.estado === 'fallido' ? (
                            <Aviso tono="error">{`No se pudo responder: ${m.texto}`}</Aviso>
                          ) : (
                            <Markdown texto={m.texto} />
                          )}
                          <Fuentes fuentes={m.fuentes} />
                          <AccionesDeRespuesta
                            cuando={cuando(m.creadoEn)}
                            texto={m.estado === 'respondido' ? m.texto : undefined}
                            onPdf={m.estado === 'respondido' ? () => imprimir(abierta.mensajes[i - 1]?.texto ?? '', m) : undefined}
                            onReintentar={
                              m.estado === 'fallido' && i === abierta.mensajes.length - 1 && abierta.mensajes[i - 1]?.rol === 'persona'
                                ? () => {
                                    const texto = abierta.mensajes[i - 1].texto;
                                    const previos = ultimosArchivos.current?.pregunta === texto ? ultimosArchivos.current.archivos : [];
                                    void preguntar(texto, abierta.conversacion.id, previos);
                                  }
                                : undefined
                            }
                            deshabilitado={Boolean(enCurso) || sinCupo}
                          />
                        </View>
                      ),
                    )}

                    {enCurso ? (
                      <>
                        <View style={estilos.burbujaPersona}>
                          {enCurso.pregunta ? <Text style={estilos.textoPersona}>{enCurso.pregunta}</Text> : null}
                          {enCurso.adjuntos.map((nombre) => (
                            <Text key={nombre} style={estilos.notaPequena}>{`📎 ${nombre}`}</Text>
                          ))}
                        </View>
                        <View style={estilos.respuesta}>
                          {enCurso.texto ? <Markdown texto={enCurso.texto} /> : null}
                          <Text style={estilos.nota} accessibilityLiveRegion="polite">
                            {enCurso.consultando ? `Consultando ${enCurso.consultando}…` : enCurso.texto ? '' : 'Pensando…'}
                          </Text>
                          <Fuentes fuentes={enCurso.fuentes} />
                        </View>
                      </>
                    ) : null}

                    {(error ?? listado.error ?? lectura.error) ? (
                      <Aviso tono="error">{error ?? listado.error ?? lectura.error}</Aviso>
                    ) : null}
                  </ScrollView>

                  {!abierta || abierta.conversacion.visible ? <View style={estilos.preguntar}>{campo}</View> : null}
                </>
              )}
            </View>
          )}
        </View>

        {angosto && barraAbierta ? (
          <>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Cerrar las conversaciones"
              onPress={() => setBarraAbierta(false)}
              style={estilos.telon}
            />
            <View style={estilos.barraEncima}>{barra}</View>
          </>
        ) : null}
      </View>
    </MarcoPantalla>
  );
}

/**
 * Dónde empieza un elemento en la página, sin contar lo que esté desplazado su contenedor.
 * Solo en la web (el asistente es del panel); en otra plataforma, `null`.
 */
function arribaEnLaPagina(vista: View | null): number | null {
  if (Platform.OS !== 'web' || !vista) return null;
  const nodo = vista as unknown as HTMLElement;
  let desplazado = 0;
  for (let padre = nodo.parentElement; padre; padre = padre.parentElement) desplazado += padre.scrollTop;
  return Math.round(nodo.getBoundingClientRect().top + desplazado);
}

/** El saludo va con el primer nombre, como se le habla a alguien en la obra. */
const primerNombre = (nombreCompleto: string) => nombreCompleto.trim().split(/\s+/)[0] ?? '';

/** RF-71: los adjuntos de una pregunta guardada; los ve solo quien preguntó (`media/[id]`). */
function AdjuntosGuardados({ adjuntos }: { adjuntos: MensajeDelAsistente['adjuntos'] }) {
  if (adjuntos.length === 0) return null;
  return (
    <View style={estilos.adjuntos}>
      {adjuntos.map((a) => (
        <Pressable
          key={a.mediaId}
          accessibilityRole="link"
          onPress={() => {
            if (Platform.OS === 'web' && typeof window !== 'undefined') window.open(`/api/panel/media/${a.mediaId}`, '_blank', 'noopener');
          }}
        >
          <Text style={estilos.textoFuente}>{`📎 ${a.nombre}`}</Text>
        </Pressable>
      ))}
    </View>
  );
}

/**
 * RF-30: abre el registro citado. En la web, con una navegación completa y no con
 * `router.push`: varios módulos (Reportes, Contrato) leen la obra, la pestaña y la fecha
 * de la dirección al abrir (`useParametroDeDireccion`), y con la navegación interna la
 * dirección todavía es la del asistente en ese momento; abrían la obra por defecto.
 */
function abrirFuente(ruta: string) {
  if (Platform.OS === 'web' && typeof window !== 'undefined') window.location.assign(ruta);
  else router.push(ruta as Href);
}

/** RF-28 a RF-30: de dónde sale cada cifra; cada una abre su registro en el módulo. */
function Fuentes({ fuentes }: { fuentes: MensajeDelAsistente['fuentes'] }) {
  if (fuentes.length === 0) return null;
  return (
    <View style={estilos.fuentes}>
      <Text style={estilos.notaPequena}>Fuentes:</Text>
      {fuentes.map((f) => (
        <Pressable
          key={f.ruta + f.etiqueta}
          accessibilityRole="link"
          onPress={() => abrirFuente(f.ruta)}
          style={({ hovered }) => [estilos.fuente, hovered && estilos.encima]}
        >
          <Text style={estilos.textoFuente}>{f.etiqueta}</Text>
        </Pressable>
      ))}
    </View>
  );
}

const estilos = StyleSheet.create({
  cuerpo: { flexDirection: 'row', gap: Spacing.three },
  contenido: { flex: 1, minWidth: 0 },
  barraPlegada: { flexDirection: 'row', gap: Spacing.one },
  // RF-82: en pantalla angosta, la barra encima de la conversación con el telón detrás.
  telon: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, backgroundColor: Panel.telon, borderRadius: Radio.md },
  barraEncima: { position: 'absolute', top: 0, bottom: 0, left: 0, maxWidth: '88%', boxShadow: Sombra.flotante, borderRadius: Radio.md },
  centrado: { flexGrow: 1, justifyContent: 'center' },
  uso: { paddingBottom: Spacing.four },
  encima: { backgroundColor: Panel.fondoHover },
  columnaConversacion: { flex: 1, minWidth: 0, width: '100%', gap: Spacing.two },
  mensajes: { flex: 1 },
  columnaDeMensajes: {
    alignSelf: 'center',
    width: '100%',
    maxWidth: ANCHO_DE_LECTURA,
    gap: Spacing.four,
    paddingVertical: Spacing.three,
  },
  cabecera: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.two,
    paddingBottom: Spacing.two,
    borderBottomWidth: 1,
    borderBottomColor: Panel.bordeSuave,
  },
  titulo: { flexShrink: 1, fontFamily: FuentePanel.texto, fontWeight: '600', fontSize: TextoPanel.cuerpo, color: Panel.texto },
  archivar: { paddingVertical: Spacing.one, paddingHorizontal: Spacing.two, borderRadius: Radio.sm },
  textoArchivar: { fontFamily: FuentePanel.texto, fontSize: TextoPanel.apoyo, color: Panel.textoApoyo },
  bienvenida: {
    alignSelf: 'center',
    alignItems: 'center',
    width: '100%',
    maxWidth: ANCHO_DE_LECTURA,
    gap: Spacing.four,
    paddingTop: Spacing.six,
    paddingBottom: Spacing.five,
  },
  saludo: {
    fontFamily: FuentePanel.texto,
    fontWeight: '600',
    fontSize: TextoPanel.titulo,
    lineHeight: 34,
    color: Panel.texto,
    textAlign: 'center',
  },
  ejemplos: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: Spacing.two },
  ejemplo: {
    maxWidth: 360,
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.three,
    borderRadius: Radio.pastilla,
    borderWidth: 1,
    borderColor: Panel.bordeSuave,
    backgroundColor: Panel.superficie,
  },
  textoEjemplo: { fontFamily: FuentePanel.texto, fontSize: TextoPanel.apoyo, color: Panel.texto },
  burbujaPersona: {
    alignSelf: 'flex-end',
    maxWidth: '85%',
    gap: Spacing.one,
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.three,
    borderRadius: Radio.lg,
    backgroundColor: Panel.fondoCabecera,
  },
  textoPersona: { fontFamily: FuentePanel.texto, fontSize: TextoPanel.cuerpo, lineHeight: 21, color: Panel.texto },
  // RF-75: la respuesta va a todo el ancho de la columna, sin recuadro, como texto de lectura.
  respuesta: { gap: Spacing.two },
  fuentes: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: Spacing.two },
  fuente: {
    paddingVertical: Spacing.one,
    paddingHorizontal: Spacing.two,
    borderRadius: Radio.pastilla,
    borderWidth: 1,
    borderColor: Panel.borde,
  },
  textoFuente: { fontFamily: FuentePanel.texto, fontSize: TextoPanel.apoyo, color: Panel.texto, textDecorationLine: 'underline' },
  preguntar: { alignSelf: 'center', width: '100%', maxWidth: ANCHO_DE_LECTURA },
  adjuntos: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
  nota: { fontFamily: FuentePanel.texto, fontSize: TextoPanel.cuerpo, color: Panel.textoApoyo },
  notaPequena: { fontFamily: FuentePanel.texto, fontSize: TextoPanel.apoyo, color: Panel.textoApoyo },
});
