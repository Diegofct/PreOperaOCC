/**
 * El detalle de un reporte de WhatsApp: lo que se mandó y lo que la IA entendió,
 * listo para corregir (spec 021, RF-17 a RF-22, RF-26 a RF-29, RF-60 a RF-67, RF-81).
 *
 * Arriba, el mensaje tal como llegó —texto, autor con su nombre y cargo del sistema
 * si se le reconoce, grupo, obra y adjuntos, también los de los mensajes que lo
 * complementan (RF-20)— y el motivo de revisión de la IA. Debajo, el reporte por
 * secciones de la bitácora, editable mientras esté pendiente (RF-26).
 *
 * ── Qué se edita aquí ──
 *
 * El reporte entero, sección por sección: lo que va a la bitácora (fecha, clima,
 * actividades, maquinaria con su operador, personal, control calidad y notas) y
 * los viajes que van a Control Cantera. Viaja entero en cada corrección (`PATCH`
 * con la versión leída, RF-29).
 *
 * Lo que no se reconoció queda sin elegir, con lo que decía el mensaje al lado
 * («En el reporte: el mono»), y se elige de los catálogos de la obra que trae el
 * detalle (`opciones`): los mismos contra los que se aprueba (RF-71, RF-75, RF-79,
 * RF-83, RF-95).
 *
 * ── Decidir ──
 *
 * Aprobar manda el reporte tal como se ve, con las fotos elegidas: la del día y la
 * de cada actividad, sobre las imágenes del mensaje y de sus complementos (RF-50 a
 * RF-52). Si hay cambios sin guardar, primero se guarda la corrección: así, si al
 * aprobar falta algo, las faltas del servidor salen en su renglón. Antes de aprobar
 * se avisa qué se reemplazaría en la bitácora abierta del día (RF-89), y con la
 * bitácora cerrada se explica por qué no se puede y se ofrecen solo los viajes
 * (RF-41 a RF-43, RF-96). Descartar pide el motivo (RF-54, RF-55); un ignorado se
 * puede devolver a la bandeja (RF-25).
 *
 * ── Las faltas ──
 *
 * Las calcula el servidor (`faltasDelReporte`) y se pintan en su renglón. No se
 * recalculan aquí al escribir: la del medidor depende del tipo de cada equipo, que
 * la pantalla no tiene. Se ven al guardar la corrección, que vuelve a pedir el
 * detalle.
 */
import { useEffect, useState } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';

import { Estado, FuentePanel, Panel, Radio, Spacing, TextoPanel } from '@/constants/theme';
import { CONDICIONES_CLIMA, ENSAYOS_DE_CALIDAD } from '@/shared/catalogos/bitacora';
import {
  ACTIVIDADES_DEL_PRESUPUESTO,
  CLAVE_OTRA_ACTIVIDAD,
  etiquetaDeActividad,
  UNIDADES_DE_ACTIVIDAD,
} from '@/shared/catalogos/presupuesto';
import { UNIDADES_ALMACEN, type UnidadAlmacen } from '@/shared/catalogos/almacen';
import { CARGOS, type Cargo } from '@/shared/catalogos/cargos';
import { CLAVE_OTRO_MATERIAL, MATERIALES_DE_OCC } from '@/shared/catalogos/materiales';
import { formatearCantidad, type TipoMovimiento } from '@/shared/rules/almacen';
import { DESTINO_OBRA, OPCIONES_DE_METROS, OPCIONES_DE_PR } from '@/shared/rules/cantera';
import { alcanza } from '@/shared/rules/permisos';
import { normalizar } from '@/shared/rules/texto';
import {
  cargoDeHoja,
  etiquetaDeCategoria,
  type ActividadDelReporte,
  type EnsayoDelReporte,
  type FranjaDelReporte,
  type MaquinaDelReporte,
  type MovimientoDelReporte,
  type PersonaDelReporte,
  type ReporteDelDia,
  type ViajeDelReporte,
} from '@/shared/rules/whatsapp';

import { api, mensajeDe } from '../cliente-api';
import {
  Acciones,
  Aviso,
  Ayuda,
  Boton,
  Campo,
  Casilla,
  Celda,
  Etiqueta,
  FilaDeFormulario,
  Formulario,
  Modal,
  Seccion,
  Selector,
  SelectorDeHora,
  Tarjeta,
} from '../componentes';
import type { DetalleDePropuesta } from '../contratos';
import { usePersona } from '../sesion';
import { useAccionDeVentana } from '../usar-accion-de-ventana';

type Falta = DetalleDePropuesta['faltas'][number];

/** Día y hora en la obra: «3 oct, 07:30 p. m.». */
function momento(iso: string): string {
  return new Date(iso).toLocaleString('es-CO', {
    timeZone: 'America/Bogota',
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * Un número que se escribe. Guarda su propio texto: si guardara el número, escribir
 * «6,4» pasaría por «6,» y se convertiría en «6» antes de terminar. Hacia fuera
 * entrega el número, o `null` si está vacío o no se puede leer.
 */
function CampoNumero({
  etiqueta,
  valor,
  onChange,
  editable,
  ancho = 120,
}: {
  etiqueta: string;
  valor: number | null | undefined;
  onChange: (n: number | null) => void;
  editable: boolean;
  ancho?: number;
}) {
  const [texto, setTexto] = useState(valor === null || valor === undefined ? '' : String(valor));
  const [visto, setVisto] = useState(valor);
  // Si el valor cambia desde fuera (se recargó el detalle), se vuelve a escribir.
  if (valor !== visto) {
    setVisto(valor);
    setTexto(valor === null || valor === undefined ? '' : String(valor));
  }
  return (
    <Campo
      etiqueta={etiqueta}
      valor={texto}
      soloNumeros
      soloLectura={!editable}
      ancho={ancho}
      onChange={(v) => {
        setTexto(v);
        const limpio = v.trim().replace(',', '.');
        const n = limpio === '' ? null : Number(limpio);
        const leido = n === null || Number.isNaN(n) ? null : n;
        setVisto(leido);
        onChange(leido);
      }}
    />
  );
}

/** Las faltas de un renglón, en su sitio (RF-64). */
function FaltasDelRenglon({ faltas }: { faltas: Falta[] }) {
  if (faltas.length === 0) return null;
  return (
    <View style={estilos.faltas}>
      {faltas.map((f, i) => (
        <Text key={i} style={estilos.falta}>
          {`✕ ${f.mensaje}`}
        </Text>
      ))}
    </View>
  );
}

const OPCIONES_DE_ACTIVIDAD = [
  { valor: CLAVE_OTRA_ACTIVIDAD, etiqueta: 'Otra actividad' },
  ...ACTIVIDADES_DEL_PRESUPUESTO.map((a) => ({ valor: a.item, etiqueta: etiquetaDeActividad(a) })),
];
const OPCIONES_DE_UNIDAD = UNIDADES_DE_ACTIVIDAD.map((u) => ({ valor: u.id, etiqueta: u.etiqueta }));
const OPCIONES_DE_CLIMA = CONDICIONES_CLIMA.map((c) => ({ valor: c.id, etiqueta: c.nombre }));
const OPCIONES_DE_ENSAYO = ENSAYOS_DE_CALIDAD.map((e) => ({ valor: e.id, etiqueta: e.nombre }));
const OPCIONES_DE_UBICACION = [
  { valor: 'pr', etiqueta: 'En la vía (PR)' },
  { valor: 'lugar', etiqueta: 'Otro lugar' },
];

export function DetalleDeReporte({ id, alVolver }: { id: string; alVolver: () => void }) {
  const { rol } = usePersona();
  const [detalle, setDetalle] = useState<DetalleDePropuesta | null>(null);
  const [reporte, setReporte] = useState<ReporteDelDia | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [hecho, setHecho] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);
  const [cambiado, setCambiado] = useState(false);
  const [decidiendo, setDecidiendo] = useState(false);
  // Las fotos elegidas para la bitácora: la del día y, por renglón, la de cada actividad.
  const [fotoDelDia, setFotoDelDia] = useState<string | null>(null);
  const [fotoPorActividad, setFotoPorActividad] = useState<Record<string, string>>({});
  const [descartando, setDescartando] = useState(false);
  // Las personas que se van a registrar desde la bandeja (spec 023, RF-57, RF-66).
  const [porRegistrar, setPorRegistrar] = useState<PorRegistrar[] | null>(null);
  const [motivo, setMotivo] = useState('');
  const [motivoIntentado, setMotivoIntentado] = useState(false);

  // Volver a pedir el detalle es subir este contador, como en `useListado`: el
  // efecto es el único sitio que pide, y una respuesta vieja no pisa a una nueva.
  const [pulso, setPulso] = useState(0);
  useEffect(() => {
    let vigente = true;
    api.whatsapp.propuestas
      .ver(id)
      .then((leido) => {
        if (!vigente) return;
        setDetalle(leido);
        setReporte(leido.reporte);
        setCambiado(false);
        // El error no se limpia aquí: la recarga que sigue a una aprobación fallida
        // lo borraría antes de verse. Lo limpia cada acción al empezar.
      })
      .catch((fallo: unknown) => {
        if (vigente) setError(mensajeDe(fallo));
      });
    return () => {
      vigente = false;
    };
  }, [id, pulso]);

  if (!detalle || !reporte) {
    return (
      <Seccion titulo="Reporte">
        {error ? <Aviso tono="error">{error}</Aviso> : <Ayuda>Cargando el reporte…</Ayuda>}
        <Acciones>
          <Boton titulo="Volver a la bandeja" tono="secundario" onPress={alVolver} />
        </Acciones>
      </Seccion>
    );
  }

  const editable = detalle.estado === 'pendiente' && alcanza(rol, 'whatsapp', 'escribir');
  const faltasDe = (seccion: string, renglon: number | null) =>
    detalle.faltas.filter((f) => f.seccion === seccion && f.renglon === renglon);

  function cambiar(cambio: Partial<ReporteDelDia>) {
    setReporte((antes) => (antes ? { ...antes, ...cambio } : antes));
    setCambiado(true);
    setHecho(null);
  }
  function cambiarRenglon<
    K extends 'clima' | 'actividades' | 'ensayos' | 'maquinaria' | 'personal' | 'viajes',
  >(
    seccion: K,
    indice: number,
    cambio: Partial<ReporteDelDia[K][number]>,
  ) {
    const filas = [...reporte![seccion]] as ReporteDelDia[K][number][];
    filas[indice] = { ...filas[indice], ...cambio };
    cambiar({ [seccion]: filas } as Partial<ReporteDelDia>);
  }
  function quitarRenglon(
    seccion: 'clima' | 'actividades' | 'ensayos' | 'maquinaria' | 'personal' | 'viajes',
    indice: number,
  ) {
    cambiar({ [seccion]: reporte![seccion].filter((_, i) => i !== indice) } as Partial<ReporteDelDia>);
  }

  async function guardar() {
    setGuardando(true);
    setHecho(null);
    try {
      await api.whatsapp.propuestas.corregir(id, detalle!.version, reporte!);
      setPulso((p) => p + 1);
      setHecho('Corrección guardada.');
    } catch (fallo) {
      setError(mensajeDe(fallo));
    } finally {
      setGuardando(false);
    }
  }

  const { opciones } = detalle;
  const opcionesDeEquipo = opciones.equipos.map((e) => ({
    valor: e.id,
    etiqueta: e.placa ? `${e.codigoInterno} · ${e.placa}` : e.codigoInterno,
  }));
  const opcionesDePersona = opciones.personas.map((p) => ({
    valor: p.id,
    etiqueta: p.nombreCompleto,
    detalle: p.cargo ?? undefined,
  }));
  const opcionesDeVolqueta = opciones.cantera.volquetas.map((v) => ({
    valor: v.id,
    etiqueta: v.placa ? `${v.codigoInterno} · ${v.placa}` : v.codigoInterno,
  }));
  const opcionesDeConductor = opciones.cantera.conductores.map((c) => ({
    valor: c.id,
    etiqueta: c.nombreCompleto,
    detalle: c.cargo ?? undefined,
  }));
  const opcionesDeMaterial = opciones.cantera.materiales.map((m) => ({ valor: m.id, etiqueta: m.nombre }));
  const opcionesDeSitio = opciones.cantera.sitios.map((s) => ({ valor: s.id, etiqueta: s.nombre }));
  const opcionesDeDestino = [{ valor: DESTINO_OBRA, etiqueta: 'La obra' }, ...opcionesDeSitio];

  const imagenes = detalle.archivosDelMensaje.filter((a) => a.mime.startsWith('image/'));
  const opcionesDeFoto = imagenes.map((a, n) => ({ valor: a.id, etiqueta: `Foto ${n + 1}` }));
  const puedeDecidir = detalle.estado === 'pendiente' && alcanza(rol, 'whatsapp', 'aprobar');
  // Spec 023: un reporte de almacén no va a la bitácora (RF-40): ni sus secciones ni
  // sus fotos aplican, y su bitácora cerrada no impide aprobarlo.
  const esAlmacen = detalle.destino === 'almacen';
  const cerrada = !esAlmacen && detalle.bitacoraDelDia === 'cerrada';
  const viajesPorAprobar = reporte.viajes.length > 0 && !detalle.viajesAprobados;
  const reemplazos = [
    ...(detalle.reemplaza.maquinas.length > 0 ? [`las máquinas ${detalle.reemplaza.maquinas.join(', ')}`] : []),
    ...(detalle.reemplaza.personas.length > 0 ? [`a ${detalle.reemplaza.personas.join(', ')}`] : []),
    ...(detalle.reemplaza.clima ? ['todo el clima'] : []),
  ];

  async function aprobar(soloViajes: boolean) {
    setDecidiendo(true);
    setError(null);
    setHecho(null);
    try {
      let version = detalle!.version;
      // Lo que se ve es lo que se aprueba: lo cambiado se guarda antes.
      if (cambiado) version = (await api.whatsapp.propuestas.corregir(id, version, reporte!)).version;
      const hechoAsi = await api.whatsapp.propuestas.aprobar(id, {
        version,
        propuesta: reporte!,
        soloViajes,
        fotos:
          soloViajes || esAlmacen
            ? { delDia: null, porActividad: {} }
            : { delDia: fotoDelDia, porActividad: fotoPorActividad },
      });
      if ('movimientos' in hechoAsi) {
        // Spec 023, RF-38: lo aprobado queda en el Almacén, marcado «desde WhatsApp».
        setHecho(
          `Aprobado: ${hechoAsi.movimientos === 1 ? 'se registró 1 movimiento' : `se registraron ${hechoAsi.movimientos} movimientos`} en el Almacén${hechoAsi.materialesNuevos > 0 ? `, con ${hechoAsi.materialesNuevos === 1 ? '1 material nuevo' : `${hechoAsi.materialesNuevos} materiales nuevos`}` : ''}.`,
        );
        return;
      }
      setHecho(
        hechoAsi.soloViajes
          ? `Se ${hechoAsi.viajes === 1 ? 'registró 1 viaje' : `registraron ${hechoAsi.viajes} viajes`} en Control Cantera. El resto del reporte sigue pendiente hasta que la bitácora del ${hechoAsi.fecha} se pueda volver a abrir.`
          : `Aprobado: pasó a la bitácora del ${hechoAsi.fecha}${hechoAsi.viajes > 0 ? `, y ${hechoAsi.viajes === 1 ? '1 viaje' : `${hechoAsi.viajes} viajes`} a Control Cantera` : ''}.`,
      );
    } catch (fallo) {
      setError(mensajeDe(fallo));
    } finally {
      setDecidiendo(false);
      // Se vuelve a pedir siempre: aprobado, o con las faltas del servidor en su renglón.
      setPulso((p) => p + 1);
    }
  }

  async function descartar() {
    setMotivoIntentado(true);
    if (!motivo.trim()) return;
    setDecidiendo(true);
    try {
      await api.whatsapp.propuestas.descartar(id, detalle!.version, motivo.trim());
      setDescartando(false);
      setMotivo('');
      setMotivoIntentado(false);
      setHecho('Descartado. Queda en «Descartados» con el motivo.');
      setPulso((p) => p + 1);
    } catch (fallo) {
      setError(mensajeDe(fallo));
      setDescartando(false);
    } finally {
      setDecidiendo(false);
    }
  }

  async function devolver() {
    setDecidiendo(true);
    try {
      await api.whatsapp.propuestas.devolver(id, detalle!.version);
      setHecho('Devuelto a la bandeja: ya está entre los pendientes.');
      setPulso((p) => p + 1);
    } catch (fallo) {
      setError(mensajeDe(fallo));
    } finally {
      setDecidiendo(false);
    }
  }
  const documentos = detalle.archivosDelMensaje.filter((a) => !a.mime.startsWith('image/'));

  // ── Registrar a las personas que no están en el sistema (spec 023, RF-57 a RF-66) ──
  const puedeRegistrar = editable && alcanza(rol, 'whatsapp', 'aprobar');
  const personaPorRegistrar = (seccion: 'personal' | 'maquinaria', renglon: number): PorRegistrar | null => {
    const nombre =
      seccion === 'personal' ? reporte.personal[renglon].escrito : (reporte.maquinaria[renglon].operadorEscrito ?? '');
    const elegida =
      seccion === 'personal' ? reporte.personal[renglon].usuarioId : reporte.maquinaria[renglon].operadorId;
    if (elegida || !nombre.trim()) return null;
    return {
      seccion,
      renglon,
      nombre: nombre.trim(),
      // RF-62: el de la hoja del archivo; un operador de máquina, Operador.
      cargo: seccion === 'personal' ? cargoDeHoja(reporte.personal[renglon].hoja) : 'operador',
      incluir: true,
      coincidencias: detalle.coincidencias[seccion][String(renglon)] ?? [],
    };
  };
  const noReconocidas = [
    ...reporte.personal.map((_, i) => personaPorRegistrar('personal', i)),
    ...reporte.maquinaria.map((_, i) => personaPorRegistrar('maquinaria', i)),
  ].filter((p): p is PorRegistrar => p !== null);

  /** Las posibles coincidencias de un renglón, para elegir una antes de registrar (RF-65). */
  function coincidenciasDe(seccion: 'personal' | 'maquinaria', renglon: number) {
    const persona = puedeRegistrar ? personaPorRegistrar(seccion, renglon) : null;
    if (!persona) return null;
    return (
      <View style={estilos.coincidencias}>
        {persona.coincidencias.length > 0 ? (
          <>
            <Ayuda>¿Es alguna de estas personas de la obra?</Ayuda>
            {persona.coincidencias.map((c) => (
              <Boton
                key={c.id}
                titulo={`Es ${c.nombreCompleto}${c.cargo ? ` (${c.cargo})` : ''}`}
                tono="secundario"
                onPress={() =>
                  seccion === 'personal'
                    ? cambiarRenglon('personal', renglon, { usuarioId: c.id })
                    : cambiarRenglon('maquinaria', renglon, { operadorId: c.id })
                }
              />
            ))}
          </>
        ) : null}
        <Boton
          titulo={seccion === 'personal' ? 'Registrar persona' : 'Registrar operador'}
          tono="secundario"
          onPress={() => setPorRegistrar([persona])}
        />
      </View>
    );
  }

  async function registrar(personas: PorRegistrar[]) {
    const elegidas = personas.filter((p) => p.incluir);
    if (elegidas.length === 0) return;
    const registradas = await api.whatsapp.propuestas.registrarPersonas(id, {
      version: detalle!.version,
      // Lo que se ve, con lo cambiado sin guardar: queda guardado con las personas.
      propuesta: reporte!,
      personas: elegidas.map(({ seccion, renglon, nombre, cargo }) => ({ seccion, renglon, nombre, cargo })),
    });
    setPorRegistrar(null);
    setHecho(
      registradas.personas.length === 1
        ? 'Se registró 1 persona en la obra, sin acceso al sistema. Ya está elegida en el reporte.'
        : `Se registraron ${registradas.personas.length} personas en la obra, sin acceso al sistema. Ya están elegidas en el reporte.`,
    );
    setPulso((p) => p + 1);
  }

  return (
    <>
      <Acciones>
        <Boton titulo="← Volver a la bandeja" tono="secundario" onPress={alVolver} />
      </Acciones>

      {/* ── El mensaje tal como llegó (RF-17 a RF-22) ── */}
      <Seccion titulo={etiquetaDeCategoria(detalle.categoria)}>
        <Tarjeta>
          <View style={estilos.encabezado}>
            <Etiqueta tono={detalle.estado === 'pendiente' ? 'atencion' : detalle.estado === 'aprobado' ? 'bueno' : detalle.estado === 'descartado' ? 'malo' : 'neutro'}>
              {detalle.estado === 'pendiente'
                ? 'Pendiente'
                : detalle.estado === 'aprobado'
                  ? 'Aprobado'
                  : detalle.estado === 'descartado'
                    ? 'Descartado'
                    : 'Ignorado'}
            </Etiqueta>
            <Celda>{`${detalle.autor.nombre}${detalle.autor.cargo ? ` · ${detalle.autor.cargo}` : detalle.autor.usuarioId ? '' : ' · no registrado'}`}</Celda>
            <Celda>{`${detalle.grupoNombre} · ${detalle.obraNombre}`}</Celda>
            <Celda>{`Enviado el ${momento(detalle.enviadoEn)}`}</Celda>
          </View>
          {detalle.texto ? <Text style={estilos.textoOriginal}>{detalle.texto}</Text> : null}
          {detalle.complementosDelMensaje.map((c) => (
            <Text key={c.id} style={estilos.complemento}>
              {`${momento(c.enviadoEn)}${c.texto ? ` — ${c.texto}` : ' — (adjunto)'}`}
            </Text>
          ))}
          {imagenes.length > 0 ? (
            <View style={estilos.tira}>
              {imagenes.map((a, n) => (
                <View key={a.id} style={estilos.foto}>
                  <Image
                    source={{ uri: `/api/panel/media/${a.id}` }}
                    style={estilos.miniatura}
                    resizeMode="cover"
                  />
                  <Text style={estilos.pieDeFoto}>{`Foto ${n + 1}`}</Text>
                </View>
              ))}
            </View>
          ) : null}
          {documentos.length > 0 ? (
            <Acciones>
              {documentos.map((a) => (
                <Boton
                  key={a.id}
                  titulo={a.mime === 'application/pdf' ? 'Abrir PDF' : 'Abrir documento'}
                  tono="secundario"
                  onPress={() => window.open(`/api/panel/media/${a.id}`, '_blank')}
                />
              ))}
            </Acciones>
          ) : null}
        </Tarjeta>
        {detalle.motivoRevision ? (
          <Aviso tono="info">{`La IA pide revisar: ${detalle.motivoRevision}`}</Aviso>
        ) : null}
        {detalle.fechaSupuesta ? (
          <Aviso tono="info">
            El reporte no traía fecha: se propone el día en que se mandó. Confírmelo abajo.
          </Aviso>
        ) : null}
      </Seccion>

      {error ? <Aviso tono="error">{error}</Aviso> : null}
      {hecho ? <Aviso tono="exito">{hecho}</Aviso> : null}
      {detalle.faltas.length > 0 ? (
        <Aviso tono="info">
          {detalle.faltas.length === 1
            ? 'Falta 1 dato para poder aprobar. Está marcado en su renglón.'
            : `Faltan ${detalle.faltas.length} datos para poder aprobar. Cada uno está marcado en su renglón.`}
        </Aviso>
      ) : null}

      {/* ── El día del hecho (RF-61, RF-62) ── */}
      <Seccion titulo="Día del reporte">
        <FilaDeFormulario ultima>
          <Campo
            etiqueta="Fecha (AAAA-MM-DD)"
            valor={reporte.fecha ?? ''}
            onChange={(v) => cambiar({ fecha: v.trim() === '' ? null : v.trim() })}
            soloLectura={!editable}
            ancho={200}
          />
          <FaltasDelRenglon faltas={faltasDe('fecha', null)} />
        </FilaDeFormulario>
      </Seccion>

      {esAlmacen ? (
        /* ── Ingresos y salidas, al Almacén (spec 023, RF-19 a RF-34) ── */
        <SeccionAlmacen
          movimientos={reporte.almacen}
          materiales={opciones.almacen}
          editable={editable}
          faltasDe={(renglon) => faltasDe('almacen', renglon)}
          alCambiar={(almacen) => cambiar({ almacen })}
        />
      ) : (
      <>
      {/* ── Clima (RF-66, RF-67) ── */}
      <Seccion titulo={`Clima (${reporte.clima.length})`}>
        <FaltasDelRenglon faltas={faltasDe('clima', null)} />
        {reporte.clima.map((franja: FranjaDelReporte, i) => (
          <FilaDeFormulario key={i} ultima={i === reporte.clima.length - 1}>
            <Selector
              etiqueta="Condición"
              valor={franja.condicion}
              opciones={OPCIONES_DE_CLIMA}
              onChange={(v) => cambiarRenglon('clima', i, { condicion: v })}
              vacio="Elija la condición"
              ancho={220}
            />
            <SelectorDeHora etiqueta="Desde" valor={franja.desde ?? ''} onChange={(v) => cambiarRenglon('clima', i, { desde: v || null })} />
            <SelectorDeHora etiqueta="Hasta" valor={franja.hasta ?? ''} onChange={(v) => cambiarRenglon('clima', i, { hasta: v || null })} />
            {editable ? <Boton titulo="Quitar" tono="secundario" onPress={() => quitarRenglon('clima', i)} /> : null}
            <FaltasDelRenglon faltas={faltasDe('clima', i)} />
          </FilaDeFormulario>
        ))}
        {editable ? (
          <Acciones>
            <Boton
              titulo="Añadir franja"
              tono="secundario"
              onPress={() => cambiar({ clima: [...reporte.clima, { condicion: null, desde: null, hasta: null }] })}
            />
          </Acciones>
        ) : null}
      </Seccion>

      {/* ── Actividades (RF-30 a RF-34) ── */}
      <Seccion titulo={`Actividades (${reporte.actividades.length})`}>
        {reporte.actividades.map((a: ActividadDelReporte, i) => (
          <FilaDeFormulario key={i} ultima={i === reporte.actividades.length - 1}>
            <Selector
              etiqueta="Actividad"
              valor={a.clave}
              opciones={OPCIONES_DE_ACTIVIDAD}
              onChange={(v) => cambiarRenglon('actividades', i, { clave: v })}
              vacio={a.itemEscrito ? `Ítem ${a.itemEscrito}: elija la actividad` : 'Elija la actividad'}
              ancho={460}
            />
            {a.clave === CLAVE_OTRA_ACTIVIDAD ? (
              <>
                <Campo
                  etiqueta="Cuál fue"
                  valor={a.texto ?? ''}
                  onChange={(v) => cambiarRenglon('actividades', i, { texto: v })}
                  soloLectura={!editable}
                  ancho={260}
                />
                <Selector
                  etiqueta="Unidad"
                  valor={a.unidad ?? null}
                  opciones={OPCIONES_DE_UNIDAD}
                  onChange={(v) => cambiarRenglon('actividades', i, { unidad: v })}
                  vacio="Elija la unidad"
                  ancho={150}
                />
              </>
            ) : null}
            <Campo
              etiqueta="Descripción"
              valor={a.descripcion ?? ''}
              onChange={(v) => cambiarRenglon('actividades', i, { descripcion: v })}
              soloLectura={!editable}
              ancho={420}
            />
            <CampoNumero etiqueta="Longitud" valor={a.longitud} editable={editable} onChange={(n) => cambiarRenglon('actividades', i, { longitud: n })} />
            <CampoNumero etiqueta="Ancho" valor={a.ancho} editable={editable} onChange={(n) => cambiarRenglon('actividades', i, { ancho: n })} />
            <CampoNumero etiqueta="Alto" valor={a.alto} editable={editable} onChange={(n) => cambiarRenglon('actividades', i, { alto: n })} />
            <CampoNumero etiqueta="Cantidad" valor={a.cantidad} editable={editable} onChange={(n) => cambiarRenglon('actividades', i, { cantidad: n })} ancho={140} />
            {editable ? <Boton titulo="Quitar" tono="secundario" onPress={() => quitarRenglon('actividades', i)} /> : null}
            {a.itemEscrito && a.clave !== a.itemEscrito ? (
              <Ayuda>{`En el reporte: ítem ${a.itemEscrito}.`}</Ayuda>
            ) : null}
            <FaltasDelRenglon faltas={faltasDe('actividades', i)} />
          </FilaDeFormulario>
        ))}
        {reporte.actividades.length === 0 ? <Ayuda>El reporte no trae actividades.</Ayuda> : null}
        {editable ? (
          <Acciones>
            <Boton
              titulo="Añadir actividad"
              tono="secundario"
              onPress={() =>
                cambiar({
                  actividades: [
                    ...reporte.actividades,
                    { clave: null, itemEscrito: null, descripcion: '', longitud: null, ancho: null, alto: null, cantidad: null },
                  ],
                })
              }
            />
          </Acciones>
        ) : null}
      </Seccion>

      {/* ── Maquinaria con su operador (RF-68 a RF-77) ── */}
      <Seccion titulo={`Maquinaria (${reporte.maquinaria.length})`}>
        {reporte.maquinaria.map((m: MaquinaDelReporte, i) => (
          <FilaDeFormulario key={i} ultima={i === reporte.maquinaria.length - 1}>
            <Selector
              etiqueta="Equipo"
              valor={m.vehiculoId}
              opciones={opcionesDeEquipo}
              onChange={(v) => cambiarRenglon('maquinaria', i, { vehiculoId: v })}
              vacio={m.escrito ? `«${m.escrito}»: elija el equipo` : 'Elija el equipo'}
              ancho={300}
            />
            <Selector
              etiqueta="Operador"
              valor={m.operadorId}
              opciones={opcionesDePersona}
              // Dejarlo vacío es decir «sin operador»: lo escrito deja de contar (RF-75, RF-91).
              onChange={(v) =>
                cambiarRenglon('maquinaria', i, v ? { operadorId: v } : { operadorId: null, operadorEscrito: null })
              }
              vacio={m.operadorEscrito && !m.operadorId ? `«${m.operadorEscrito}»: elija o deje vacío` : 'Sin operador'}
              permiteVacio
              ancho={280}
            />
            <CampoNumero etiqueta="Medidor inicial" valor={m.medidorInicial} editable={editable} onChange={(n) => cambiarRenglon('maquinaria', i, { medidorInicial: n })} ancho={140} />
            <CampoNumero etiqueta="Medidor final" valor={m.medidorFinal} editable={editable} onChange={(n) => cambiarRenglon('maquinaria', i, { medidorFinal: n })} ancho={140} />
            {editable ? <Boton titulo="Quitar" tono="secundario" onPress={() => quitarRenglon('maquinaria', i)} /> : null}
            <Campo
              etiqueta="Observación"
              valor={m.observaciones}
              onChange={(v) => cambiarRenglon('maquinaria', i, { observaciones: v })}
              soloLectura={!editable}
              multilinea
            />
            {m.escrito && !m.vehiculoId ? null : m.escrito ? <Ayuda>{`En el reporte: ${m.escrito}`}</Ayuda> : null}
            <FaltasDelRenglon faltas={faltasDe('maquinaria', i)} />
            {coincidenciasDe('maquinaria', i)}
          </FilaDeFormulario>
        ))}
        {reporte.maquinaria.length === 0 ? <Ayuda>El reporte no trae maquinaria con lecturas.</Ayuda> : null}
        {editable ? (
          <Acciones>
            <Boton
              titulo="Añadir equipo"
              tono="secundario"
              onPress={() =>
                cambiar({
                  maquinaria: [
                    ...reporte.maquinaria,
                    {
                      vehiculoId: null,
                      escrito: '',
                      operadorId: null,
                      operadorEscrito: null,
                      medidorInicial: null,
                      medidorFinal: null,
                      observaciones: '',
                    },
                  ],
                })
              }
            />
          </Acciones>
        ) : null}
      </Seccion>

      {/* ── Personal (RF-78 a RF-80) ── */}
      <Seccion titulo={`Personal (${reporte.personal.length})`}>
        {puedeRegistrar && noReconocidas.length > 1 ? (
          // Spec 023, RF-66: todas de una vez, con su cargo y la opción de excluir.
          <Acciones>
            <Boton
              titulo={`Registrar todas las no reconocidas (${noReconocidas.length})`}
              tono="secundario"
              onPress={() => setPorRegistrar(noReconocidas)}
            />
          </Acciones>
        ) : null}
        {reporte.personal.map((p: PersonaDelReporte, i) => (
          <FilaDeFormulario key={i} ultima={i === reporte.personal.length - 1}>
            <Selector
              etiqueta="Persona"
              valor={p.usuarioId}
              opciones={opcionesDePersona}
              onChange={(v) => cambiarRenglon('personal', i, { usuarioId: v })}
              vacio={p.escrito ? `«${p.escrito}»: elija la persona` : 'Elija la persona'}
              ancho={320}
            />
            <SelectorDeHora etiqueta="Entrada" valor={p.entrada ?? ''} onChange={(v) => cambiarRenglon('personal', i, { entrada: v || null })} />
            <SelectorDeHora etiqueta="Salida" valor={p.salida ?? ''} onChange={(v) => cambiarRenglon('personal', i, { salida: v || null })} />
            <Campo
              etiqueta="Observaciones"
              valor={p.observaciones}
              onChange={(v) => cambiarRenglon('personal', i, { observaciones: v })}
              soloLectura={!editable}
              ancho={300}
            />
            {editable ? <Boton titulo="Quitar" tono="secundario" onPress={() => quitarRenglon('personal', i)} /> : null}
            <FaltasDelRenglon faltas={faltasDe('personal', i)} />
            {coincidenciasDe('personal', i)}
          </FilaDeFormulario>
        ))}
        {reporte.personal.length === 0 ? <Ayuda>El reporte no trae personal.</Ayuda> : null}
        {editable ? (
          <Acciones>
            <Boton
              titulo="Añadir persona"
              tono="secundario"
              onPress={() =>
                cambiar({
                  personal: [
                    ...reporte.personal,
                    { usuarioId: null, escrito: '', entrada: null, salida: null, observaciones: '', hoja: null },
                  ],
                })
              }
            />
          </Acciones>
        ) : null}
      </Seccion>

      {/* ── Control Calidad de Obra (RF-35 a RF-37, RF-81) ── */}
      <Seccion titulo={`Control Calidad de Obra (${reporte.ensayos.length})`}>
        {reporte.ensayos.map((e: EnsayoDelReporte, i) => {
          const enLaVia = !e.ubicacion || 'pr' in e.ubicacion;
          return (
            <FilaDeFormulario key={i} ultima={i === reporte.ensayos.length - 1}>
              <Selector
                etiqueta="Ensayo"
                valor={e.ensayo}
                opciones={OPCIONES_DE_ENSAYO}
                onChange={(v) => cambiarRenglon('ensayos', i, { ensayo: v })}
                vacio={e.escrito ? `«${e.escrito}»: elija el ensayo` : 'Elija el ensayo'}
                ancho={280}
              />
              <SelectorDeHora etiqueta="Inicio" valor={e.horaInicio ?? ''} onChange={(v) => cambiarRenglon('ensayos', i, { horaInicio: v || null })} />
              <SelectorDeHora etiqueta="Fin" valor={e.horaFin ?? ''} onChange={(v) => cambiarRenglon('ensayos', i, { horaFin: v || null })} />
              <Campo
                etiqueta="Responsable"
                valor={e.responsable ?? ''}
                onChange={(v) => cambiarRenglon('ensayos', i, { responsable: v || null })}
                soloLectura={!editable}
                ancho={220}
              />
              <Selector
                etiqueta="Ubicación"
                valor={enLaVia ? 'pr' : 'lugar'}
                opciones={OPCIONES_DE_UBICACION}
                onChange={(v) =>
                  cambiarRenglon('ensayos', i, { ubicacion: v === 'lugar' ? { lugar: '' } : { pr: null, metros: null } })
                }
                ancho={190}
              />
              {enLaVia ? (
                <>
                  <Selector
                    etiqueta="PR"
                    valor={e.ubicacion && 'pr' in e.ubicacion && e.ubicacion.pr !== null ? String(e.ubicacion.pr) : null}
                    opciones={OPCIONES_DE_PR.map((n) => ({ valor: String(n), etiqueta: `PR ${n}` }))}
                    onChange={(v) =>
                      cambiarRenglon('ensayos', i, {
                        ubicacion: {
                          pr: v === null ? null : Number(v),
                          metros: e.ubicacion && 'metros' in e.ubicacion ? e.ubicacion.metros : null,
                        },
                      })
                    }
                    vacio="Elija el PR"
                    ancho={150}
                  />
                  <Selector
                    etiqueta="Metros"
                    valor={e.ubicacion && 'metros' in e.ubicacion && e.ubicacion.metros !== null ? String(e.ubicacion.metros) : null}
                    opciones={OPCIONES_DE_METROS.map((n) => ({ valor: String(n), etiqueta: `+ ${String(n).padStart(3, '0')}` }))}
                    onChange={(v) =>
                      cambiarRenglon('ensayos', i, {
                        ubicacion: {
                          pr: e.ubicacion && 'pr' in e.ubicacion ? e.ubicacion.pr : null,
                          metros: v === null ? null : Number(v),
                        },
                      })
                    }
                    vacio="Elija los metros"
                    ancho={150}
                  />
                </>
              ) : (
                <Campo
                  etiqueta="Lugar"
                  valor={e.ubicacion && 'lugar' in e.ubicacion ? (e.ubicacion.lugar ?? '') : ''}
                  onChange={(v) => cambiarRenglon('ensayos', i, { ubicacion: { lugar: v } })}
                  soloLectura={!editable}
                  ancho={240}
                />
              )}
              <Campo
                etiqueta="Observación"
                valor={e.observacion ?? ''}
                onChange={(v) => cambiarRenglon('ensayos', i, { observacion: v || null })}
                soloLectura={!editable}
                multilinea
              />
              {editable ? <Boton titulo="Quitar" tono="secundario" onPress={() => quitarRenglon('ensayos', i)} /> : null}
              <FaltasDelRenglon faltas={faltasDe('ensayos', i)} />
            </FilaDeFormulario>
          );
        })}
        {reporte.ensayos.length === 0 ? <Ayuda>El reporte no trae ensayos.</Ayuda> : null}
        {editable ? (
          <Acciones>
            <Boton
              titulo="Añadir ensayo"
              tono="secundario"
              onPress={() =>
                cambiar({
                  ensayos: [
                    ...reporte.ensayos,
                    { ensayo: null, escrito: '', horaInicio: null, horaFin: null, responsable: null, ubicacion: null, observacion: null },
                  ],
                })
              }
            />
          </Acciones>
        ) : null}
      </Seccion>

      {/* ── Notas (RF-38) ── */}
      <Seccion titulo="Notas">
        <FilaDeFormulario ultima>
          <Campo
            etiqueta="Notas del día"
            valor={reporte.notas}
            onChange={(v) => cambiar({ notas: v })}
            soloLectura={!editable}
            multilinea
          />
        </FilaDeFormulario>
      </Seccion>

      {/* ── Viajes de cantera, a Control Cantera (RF-39, RF-82 a RF-87, RF-94, RF-95) ── */}
      <Seccion titulo={`Viajes de cantera (${reporte.viajes.length})`}>
        {detalle.viajesAprobados ? (
          <Aviso tono="exito">Los viajes de este reporte ya se registraron en Control Cantera.</Aviso>
        ) : null}
        {reporte.viajes.length > 0 && !detalle.canteraActiva ? (
          <Aviso tono="error">Esta obra no lleva Control Cantera: sus viajes no se pueden aprobar.</Aviso>
        ) : null}
        {reporte.viajes.map((v: ViajeDelReporte, i) => (
          <FilaDeFormulario key={i} ultima={i === reporte.viajes.length - 1}>
            <Selector
              etiqueta="Volqueta"
              valor={v.vehiculoId}
              opciones={opcionesDeVolqueta}
              onChange={(x) => cambiarRenglon('viajes', i, { vehiculoId: x })}
              vacio="Elija la volqueta"
              ancho={240}
            />
            <Selector
              etiqueta="Conductor"
              valor={v.conductorId}
              opciones={opcionesDeConductor}
              onChange={(x) => cambiarRenglon('viajes', i, { conductorId: x })}
              vacio="Elija el conductor"
              ancho={260}
            />
            <SelectorDeHora etiqueta="Hora" valor={v.hora ?? ''} onChange={(x) => cambiarRenglon('viajes', i, { hora: x || null })} />
            <Selector
              etiqueta="Material"
              valor={v.materialId}
              opciones={opcionesDeMaterial}
              onChange={(x) => cambiarRenglon('viajes', i, { materialId: x })}
              vacio="Elija el material"
              ancho={240}
            />
            <Selector
              etiqueta="Origen"
              valor={v.origenId}
              opciones={opcionesDeSitio}
              onChange={(x) => cambiarRenglon('viajes', i, { origenId: x })}
              vacio="Elija el origen"
              ancho={240}
            />
            <Selector
              etiqueta="Destino"
              valor={v.destino}
              opciones={opcionesDeDestino}
              onChange={(x) =>
                cambiarRenglon(
                  'viajes',
                  i,
                  x === DESTINO_OBRA ? { destino: x } : { destino: x, pr: null, metros: null },
                )
              }
              vacio="Elija el destino"
              ancho={220}
            />
            {v.destino === DESTINO_OBRA ? (
              <>
                <Selector
                  etiqueta="PR de llegada"
                  valor={v.pr === null ? null : String(v.pr)}
                  opciones={OPCIONES_DE_PR.map((n) => ({ valor: String(n), etiqueta: `PR ${n}` }))}
                  onChange={(x) => cambiarRenglon('viajes', i, { pr: x === null ? null : Number(x) })}
                  vacio="Elija el PR"
                  ancho={150}
                />
                <Selector
                  etiqueta="Metros"
                  valor={v.metros === null ? null : String(v.metros)}
                  opciones={OPCIONES_DE_METROS.map((n) => ({ valor: String(n), etiqueta: `+ ${String(n).padStart(3, '0')}` }))}
                  onChange={(x) => cambiarRenglon('viajes', i, { metros: x === null ? null : Number(x) })}
                  vacio="Elija los metros"
                  ancho={150}
                />
              </>
            ) : null}
            <Campo
              // Spec 023, RF-50, RF-51: tal como está en el vale; opcional (RF-42).
              etiqueta="N.º de vale"
              valor={v.vale ?? ''}
              onChange={(x) => cambiarRenglon('viajes', i, { vale: x === '' ? null : x })}
              soloLectura={!editable}
              ancho={160}
            />
            {editable ? <Boton titulo="Quitar" tono="secundario" onPress={() => quitarRenglon('viajes', i)} /> : null}
            <FaltasDelRenglon faltas={faltasDe('viajes', i)} />
            {/* RF-45: el vale repetido se avisa y no impide aprobar. */}
            {detalle.avisosDeVale
              .filter((a) => a.renglon === i)
              .map((a) => (
                <Ayuda key={a.mensaje}>{`⚠ ${a.mensaje} Se puede aprobar igual.`}</Ayuda>
              ))}
          </FilaDeFormulario>
        ))}
        {reporte.viajes.length === 0 ? <Ayuda>El reporte no trae viajes.</Ayuda> : null}
        {editable ? (
          <Acciones>
            <Boton
              titulo="Añadir viaje"
              tono="secundario"
              onPress={() =>
                cambiar({
                  viajes: [
                    ...reporte.viajes,
                    {
                      vehiculoId: null,
                      materialId: null,
                      origenId: null,
                      destino: DESTINO_OBRA,
                      pr: null,
                      metros: null,
                      hora: null,
                      conductorId: null,
                      vale: null,
                    },
                  ],
                })
              }
            />
          </Acciones>
        ) : null}
      </Seccion>

      {/* ── Las fotos que pasan a la bitácora (RF-50 a RF-52) ── */}
      {puedeDecidir && imagenes.length > 0 ? (
        <Seccion titulo="Fotos para la bitácora">
          <Ayuda>
            Elija cuál es la fotografía del día y cuál va con cada actividad. Las que no elija se
            quedan en el reporte.
          </Ayuda>
          <FilaDeFormulario ultima>
            <Selector
              etiqueta="Fotografía del día"
              valor={fotoDelDia}
              opciones={opcionesDeFoto}
              onChange={setFotoDelDia}
              vacio="Ninguna"
              permiteVacio
              ancho={200}
            />
            {reporte.actividades.map((a, i) => (
              <Selector
                key={i}
                etiqueta={`Actividad ${i + 1}${a.clave ? ` (${a.clave})` : ''}`}
                valor={fotoPorActividad[String(i)] ?? null}
                opciones={opcionesDeFoto}
                onChange={(v) =>
                  setFotoPorActividad((antes) => {
                    const nuevas = { ...antes };
                    if (v) nuevas[String(i)] = v;
                    else delete nuevas[String(i)];
                    return nuevas;
                  })
                }
                vacio="Ninguna"
                permiteVacio
                ancho={200}
              />
            ))}
          </FilaDeFormulario>
        </Seccion>
      ) : null}

      {/* ── Qué pasa al aprobar (RF-40 a RF-43, RF-89, RF-96) ── */}
      {puedeDecidir && reporte.fecha ? (
        cerrada ? (
          <Aviso tono="error">
            {`La bitácora del ${reporte.fecha} ya está cerrada: lo que va a ella no se puede aprobar. Para incluir este reporte hay que anularla con un motivo y abrir otra.${viajesPorAprobar ? ' Los viajes sí se pueden aprobar aparte.' : ''}`}
          </Aviso>
        ) : detalle.bitacoraDelDia === 'no_existe' ? (
          <Aviso tono="info">{`Al aprobar se abrirá la bitácora del ${reporte.fecha}.`}</Aviso>
        ) : reemplazos.length > 0 ? (
          <Aviso tono="info">
            {`La bitácora del ${reporte.fecha} ya tiene datos. Al aprobar se reemplazarán ${reemplazos.join(', ')}; las actividades, los ensayos y las notas se suman.`}
          </Aviso>
        ) : null
      ) : null}
      </>
      )}

      {/* ── Qué pasa al aprobar un reporte de almacén (spec 023, RF-25, RF-40) ── */}
      {puedeDecidir && esAlmacen ? (
        detalle.almacenActivo ? (
          <Aviso tono="info">
            {`Al aprobar se registrarán ${reporte.almacen.length === 1 ? '1 movimiento' : `${reporte.almacen.length} movimientos`} en el Almacén de la obra, con la fecha del reporte. No pasa nada a la bitácora.`}
          </Aviso>
        ) : (
          <Aviso tono="error">
            Esta obra no lleva Almacén: el reporte no se puede aprobar. Descártelo o pida que se active el módulo.
          </Aviso>
        )
      ) : null}

      <Acciones>
        {editable ? (
          <Boton
            titulo={guardando ? 'Guardando…' : 'Guardar corrección'}
            tono="secundario"
            onPress={guardar}
            deshabilitado={guardando || decidiendo || !cambiado}
          />
        ) : null}
        {puedeDecidir && !cerrada && (!esAlmacen || detalle.almacenActivo) ? (
          <Boton
            titulo={decidiendo ? 'Aprobando…' : 'Aprobar'}
            onPress={() => aprobar(false)}
            deshabilitado={decidiendo}
          />
        ) : null}
        {puedeDecidir && cerrada && viajesPorAprobar ? (
          <Boton
            titulo={decidiendo ? 'Aprobando…' : 'Aprobar solo los viajes'}
            onPress={() => aprobar(true)}
            deshabilitado={decidiendo}
          />
        ) : null}
        {puedeDecidir ? (
          <Boton titulo="Descartar" tono="peligro" onPress={() => setDescartando(true)} deshabilitado={decidiendo} />
        ) : null}
        {detalle.estado === 'ignorado' && alcanza(rol, 'whatsapp', 'escribir') ? (
          <Boton titulo="Devolver a la bandeja" tono="secundario" onPress={devolver} deshabilitado={decidiendo} />
        ) : null}
      </Acciones>

      {porRegistrar ? (
        <VentanaRegistrarPersonas
          personas={porRegistrar}
          onCerrar={() => setPorRegistrar(null)}
          onRegistrar={registrar}
        />
      ) : null}

      {descartando ? (
        <Modal titulo="Descartar el reporte" onCerrar={() => setDescartando(false)}>
          <Aviso tono="info">
            No crea nada en la bitácora ni en Control Cantera. El reporte queda en «Descartados», con
            el motivo, su nombre y la fecha.
          </Aviso>
          <Formulario>
            <Campo
              etiqueta="Motivo del descarte"
              obligatorio
              valor={motivo}
              onChange={setMotivo}
              multilinea
              error={motivoIntentado && !motivo.trim() ? 'Escriba por qué se descarta.' : undefined}
            />
          </Formulario>
          <Acciones>
            <Boton titulo="Cancelar" tono="secundario" onPress={() => setDescartando(false)} />
            <Boton titulo={decidiendo ? 'Descartando…' : 'Descartar'} tono="peligro" onPress={descartar} deshabilitado={decidiendo} />
          </Acciones>
        </Modal>
      ) : null}
    </>
  );
}

/** Una persona del reporte que se va a registrar desde la bandeja (spec 023). */
interface PorRegistrar {
  seccion: 'personal' | 'maquinaria';
  renglon: number;
  nombre: string;
  cargo: Cargo | null;
  /** RF-66: se puede excluir a alguna antes de confirmar. */
  incluir: boolean;
  /** Las de la obra que se le parecen (RF-65). */
  coincidencias: { id: string; nombreCompleto: string; cargo: string | null }[];
}

const OPCIONES_DE_CARGO = CARGOS.map((c) => ({ valor: c.id, etiqueta: c.nombre }));

/**
 * Registrar a una o a todas las personas no reconocidas del reporte (spec 023, RF-57
 * a RF-66). Cada una con su nombre, propuesto con lo que trae el reporte (RF-60), y
 * su cargo, propuesto por la hoja del archivo y cambiable o «sin definir» (RF-61,
 * RF-62). Las que se parecen a alguien de la obra lo dicen antes de confirmar
 * (RF-65): si es la misma, se cierra y se elige de la lista.
 *
 * Quedan en la obra y **sin acceso**: lo dice la ventana, para que nadie espere que
 * la persona pueda entrar (RF-64).
 */
function VentanaRegistrarPersonas({
  personas,
  onCerrar,
  onRegistrar,
}: {
  personas: PorRegistrar[];
  onCerrar: () => void;
  onRegistrar: (personas: PorRegistrar[]) => Promise<void>;
}) {
  const [filas, setFilas] = useState(personas);
  const accion = useAccionDeVentana();
  const elegidas = filas.filter((f) => f.incluir);
  const sinNombre = elegidas.some((f) => !f.nombre.trim());

  function cambiarFila(indice: number, cambio: Partial<PorRegistrar>) {
    setFilas((antes) => antes.map((f, i) => (i === indice ? { ...f, ...cambio } : f)));
  }

  return (
    <Modal
      titulo={personas.length === 1 ? 'Registrar a la persona' : 'Registrar a las personas no reconocidas'}
      onCerrar={onCerrar}
    >
      <Aviso tono="info">
        Quedan registradas en la obra, sin acceso al panel ni al celular: el acceso lo da la gerencia
        en Personas. Aunque después se descarte el reporte, siguen registradas.
      </Aviso>
      {accion.error ? <Aviso tono="error">{accion.error}</Aviso> : null}
      {filas.map((f, i) => (
        <FilaDeFormulario key={`${f.seccion}-${f.renglon}`} ultima={i === filas.length - 1}>
          {filas.length > 1 ? (
            <Casilla
              etiqueta="Registrar"
              marcada={f.incluir}
              onChange={(incluir) => cambiarFila(i, { incluir })}
            />
          ) : null}
          <Campo
            etiqueta={f.seccion === 'personal' ? 'Nombre completo' : 'Nombre completo del operador'}
            valor={f.nombre}
            onChange={(nombre) => cambiarFila(i, { nombre })}
            error={f.incluir && !f.nombre.trim() ? 'Escriba el nombre.' : undefined}
            ancho={300}
          />
          <Selector
            etiqueta="Cargo"
            valor={f.cargo}
            opciones={OPCIONES_DE_CARGO}
            onChange={(v) => cambiarFila(i, { cargo: v as Cargo | null })}
            vacio="Sin definir"
            permiteVacio
            ancho={240}
          />
          {f.coincidencias.length > 0 ? (
            <Ayuda>
              {`Ya hay en la obra: ${f.coincidencias.map((c) => `${c.nombreCompleto}${c.cargo ? ` (${c.cargo})` : ''}`).join(', ')}. Si es la misma persona, cierre esta ventana y elíjala en el reporte.`}
            </Ayuda>
          ) : null}
        </FilaDeFormulario>
      ))}
      <Acciones>
        <Boton
          titulo={
            accion.ejecutando
              ? 'Registrando…'
              : elegidas.length === 1
                ? 'Registrar 1 persona'
                : `Registrar ${elegidas.length} personas`
          }
          onPress={() => accion.ejecutar(() => onRegistrar(filas))}
          deshabilitado={accion.ejecutando || elegidas.length === 0 || sinNombre}
        />
        <Boton titulo="Cancelar" tono="secundario" onPress={onCerrar} deshabilitado={accion.ejecutando} />
      </Acciones>
    </Modal>
  );
}

/** El valor del selector de material que pide registrarlo nuevo (RF-27). */
const MATERIAL_NUEVO = '__nuevo__';

const OPCIONES_DE_UNIDAD_DE_ALMACEN = UNIDADES_ALMACEN.map((u) => ({ valor: u.id, etiqueta: u.nombre }));
const OPCIONES_DE_NOMBRE_DE_OCC = [
  { valor: CLAVE_OTRO_MATERIAL, etiqueta: 'Otro (escribir el nombre)' },
  ...MATERIALES_DE_OCC.map((m) => ({ valor: m, etiqueta: m })),
];
const OPCIONES_DE_TIPO = [
  { valor: 'ingreso', etiqueta: 'Ingreso' },
  { valor: 'salida', etiqueta: 'Salida' },
];

/**
 * Los ingresos y salidas de un reporte de almacén, editables (spec 023, RF-19 a
 * RF-34). Un renglón por material; su fecha es la del reporte (RF-21).
 *
 * El material se elige del almacén de la obra o se registra nuevo ahí mismo, con su
 * nombre de la lista de OCC o escrito con «Otro», y su unidad de la lista cerrada
 * (RF-27, RF-28, 009/RF-31 a RF-34). Junto a cada salida se ve el stock que hay hoy
 * (RF-33); si no alcanza, la falta la dice el servidor en su renglón, contando los
 * ingresos del mismo reporte (RF-34).
 *
 * La cantidad se escribe en la unidad del material y viaja en centésimas, como la
 * guarda el almacén.
 */
function SeccionAlmacen({
  movimientos,
  materiales,
  editable,
  faltasDe,
  alCambiar,
}: {
  movimientos: MovimientoDelReporte[];
  materiales: DetalleDePropuesta['opciones']['almacen'];
  editable: boolean;
  faltasDe: (renglon: number) => Falta[];
  alCambiar: (movimientos: MovimientoDelReporte[]) => void;
}) {
  const opcionesDeMaterial = [
    ...materiales.map((m) => ({
      valor: m.id,
      etiqueta: m.nombre,
      detalle: `Hay ${formatearCantidad(m.stock, m.unidad)}`,
    })),
    { valor: MATERIAL_NUEVO, etiqueta: 'Registrar como material nuevo' },
  ];
  const porId = new Map(materiales.map((m) => [m.id, m]));

  function cambiarRenglon(indice: number, cambio: Partial<MovimientoDelReporte>) {
    alCambiar(movimientos.map((m, i) => (i === indice ? { ...m, ...cambio } : m)));
  }

  function elegirMaterial(indice: number, valor: string | null) {
    const m = movimientos[indice];
    if (valor === MATERIAL_NUEVO) {
      // Se propone con lo que decía el reporte; quien revisa lo ajusta.
      cambiarRenglon(indice, { materialId: null, materialNuevo: { nombre: m.escrito, unidad: m.unidad } });
    } else {
      cambiarRenglon(indice, { materialId: valor, materialNuevo: null });
    }
  }

  function anadir(tipo: TipoMovimiento) {
    alCambiar([
      ...movimientos,
      {
        tipo,
        materialId: null,
        materialNuevo: null,
        escrito: '',
        cantidad: null,
        unidadEscrita: null,
        unidad: null,
        responsable: '',
        paraQue: '',
        observacion: '',
      },
    ]);
  }

  return (
    <Seccion titulo={`Almacén (${movimientos.length})`}>
      {movimientos.length === 0 ? <Ayuda>El reporte no trae ingresos ni salidas.</Ayuda> : null}
      {movimientos.map((m, i) => {
        const material = m.materialId ? porId.get(m.materialId) : undefined;
        const nombreDeLista = m.materialNuevo
          ? (MATERIALES_DE_OCC.find((n) => normalizar(n) === normalizar(m.materialNuevo!.nombre)) ??
            CLAVE_OTRO_MATERIAL)
          : null;
        return (
          <FilaDeFormulario key={i} ultima={i === movimientos.length - 1}>
            <Selector
              etiqueta="Tipo"
              valor={m.tipo}
              opciones={OPCIONES_DE_TIPO}
              onChange={(v) => v && cambiarRenglon(i, { tipo: v as TipoMovimiento })}
              ancho={140}
            />
            <Selector
              etiqueta="Material"
              valor={m.materialId ?? (m.materialNuevo ? MATERIAL_NUEVO : null)}
              opciones={opcionesDeMaterial}
              onChange={(v) => elegirMaterial(i, v)}
              vacio={m.escrito ? `«${m.escrito}»: elija el material` : 'Elija el material'}
              ancho={320}
            />
            {m.materialNuevo ? (
              <>
                <Selector
                  etiqueta="Nombre en la lista de OCC"
                  valor={nombreDeLista}
                  opciones={OPCIONES_DE_NOMBRE_DE_OCC}
                  onChange={(v) =>
                    cambiarRenglon(i, {
                      materialNuevo: {
                        ...m.materialNuevo!,
                        // «Otro» deja escribir; un nombre de la lista lo pone tal cual.
                        nombre: v === CLAVE_OTRO_MATERIAL || v === null ? '' : v,
                      },
                    })
                  }
                  ancho={320}
                />
                {nombreDeLista === CLAVE_OTRO_MATERIAL ? (
                  <Campo
                    etiqueta="Nombre del material nuevo"
                    valor={m.materialNuevo.nombre}
                    onChange={(v) => cambiarRenglon(i, { materialNuevo: { ...m.materialNuevo!, nombre: v } })}
                    soloLectura={!editable}
                    ancho={280}
                  />
                ) : null}
                <Selector
                  etiqueta="Unidad del material nuevo"
                  valor={m.materialNuevo.unidad}
                  opciones={OPCIONES_DE_UNIDAD_DE_ALMACEN}
                  onChange={(v) =>
                    cambiarRenglon(i, {
                      materialNuevo: { ...m.materialNuevo!, unidad: v as UnidadAlmacen | null },
                    })
                  }
                  vacio="Elija la unidad"
                  ancho={200}
                />
              </>
            ) : null}
            <CampoNumero
              etiqueta="Cantidad"
              valor={m.cantidad === null ? null : m.cantidad / 100}
              onChange={(n) => cambiarRenglon(i, { cantidad: n === null ? null : Math.round(n * 100) })}
              editable={editable}
            />
            <Selector
              etiqueta="Unidad"
              valor={m.unidad}
              opciones={OPCIONES_DE_UNIDAD_DE_ALMACEN}
              onChange={(v) => cambiarRenglon(i, { unidad: v as UnidadAlmacen | null })}
              vacio={m.unidadEscrita ? `«${m.unidadEscrita}»: elija la unidad` : 'Elija la unidad'}
              ancho={200}
            />
            <Campo
              etiqueta={m.tipo === 'ingreso' ? 'Entregado por' : 'Recibido por'}
              valor={m.responsable}
              onChange={(v) => cambiarRenglon(i, { responsable: v })}
              soloLectura={!editable}
              ancho={240}
            />
            {m.tipo === 'salida' ? (
              <Campo
                etiqueta="Para qué"
                valor={m.paraQue}
                onChange={(v) => cambiarRenglon(i, { paraQue: v })}
                soloLectura={!editable}
                ancho={280}
              />
            ) : (
              <Campo
                etiqueta="Observación"
                valor={m.observacion}
                onChange={(v) => cambiarRenglon(i, { observacion: v })}
                soloLectura={!editable}
                ancho={280}
              />
            )}
            {editable ? (
              <Boton
                titulo="Quitar"
                tono="secundario"
                onPress={() => alCambiar(movimientos.filter((_, j) => j !== i))}
              />
            ) : null}
            {m.tipo === 'salida' && material ? (
              <Ayuda>{`Hoy hay ${formatearCantidad(material.stock, material.unidad)} de ${material.nombre} en el almacén.`}</Ayuda>
            ) : null}
            <FaltasDelRenglon faltas={faltasDe(i)} />
          </FilaDeFormulario>
        );
      })}
      {editable ? (
        <Acciones>
          <Boton titulo="Añadir ingreso" tono="secundario" onPress={() => anadir('ingreso')} />
          <Boton titulo="Añadir salida" tono="secundario" onPress={() => anadir('salida')} />
        </Acciones>
      ) : null}
    </Seccion>
  );
}

const estilos = StyleSheet.create({
  encabezado: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.three, alignItems: 'center' },
  textoOriginal: {
    fontFamily: FuentePanel.texto,
    marginTop: Spacing.three,
    fontSize: TextoPanel.cuerpo,
    lineHeight: 22,
    color: Panel.texto,
  },
  complemento: {
    fontFamily: FuentePanel.texto,
    marginTop: Spacing.two,
    fontSize: TextoPanel.apoyo,
    color: Panel.textoApoyo,
  },
  tira: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two, marginTop: Spacing.three },
  foto: { gap: Spacing.one, alignItems: 'center' },
  pieDeFoto: { fontFamily: FuentePanel.texto, fontSize: TextoPanel.apoyo, color: Panel.textoApoyo },
  miniatura: {
    width: 200,
    height: 150,
    borderRadius: Radio.sm,
    borderWidth: 1,
    borderColor: Panel.borde,
    backgroundColor: Panel.fondoCabecera,
  },
  faltas: { width: '100%', gap: Spacing.one },
  coincidencias: { width: '100%', flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two, alignItems: 'center' },
  falta: { fontFamily: FuentePanel.texto, fontSize: TextoPanel.apoyo, color: Estado.noConforme },
});
