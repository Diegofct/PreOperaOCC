/**
 * Un día abierto de la Bitácora de OCC (spec 038, RF-8 a RF-9f, RF-12a, RF-18 a RF-20,
 * RF-24, D12): sus cinco secciones, filtros por equipo y por estado, y corregir, cerrar y
 * anular.
 *
 * ── Se pide el día entero y se filtra aquí ──
 *
 * La corrección manda cada sección entera (`PATCH`): si la pantalla tuviera solo lo
 * filtrado, corregir un renglón con un filtro puesto borraría los demás. Por eso el día se
 * pide sin filtro y se filtra con la misma regla del servidor, `filtrarDia`.
 *
 * ── Corregir sin una pantalla de edición entera ──
 *
 * Lo que llega por WhatsApp casi siempre está bien y lo que falla es un renglón: el estado
 * o el motivo de un equipo, el tipo o la descripción de un trabajo, o uno que sobra. Por eso
 * se corrige renglón por renglón, en una ventana, y se quita con confirmación. Cerrada, solo
 * se ve; para cambiarla se anula (RF-19, RF-20).
 */
import { useCallback, useMemo, useState } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';

import { FuentePanel, Panel, Radio, Spacing, TextoPanel } from '@/constants/theme';
import { api } from '@/features/panel/cliente-api';
import {
  Acciones,
  AccionesFormulario,
  Aviso,
  Boton,
  Campo,
  Celda,
  Confirmacion,
  Etiqueta,
  Formulario,
  Modal,
  Seccion,
  Selector,
  Tabla,
  type Columna,
} from '@/features/panel/componentes';
import type { BitacoraDeEmpresaDelDia } from '@/features/panel/contratos';
import { MarcoPantalla, useListado } from '@/features/panel/marco';
import { useAccionDeVentana } from '@/features/panel/usar-accion-de-ventana';
import {
  claveDelEquipo,
  estadoActual,
  filtrarDia,
  NOMBRE_DE_TIPO_DE_TRABAJO,
  TIPOS_DE_TRABAJO,
  type ActividadDeMantenimiento,
  type EquipoDelRenglon,
  type EstadoDeEquipo,
  type EstadoDelEquipo,
  type PendienteDelDia,
  type TipoDeTrabajo,
  type TrabajoDeMantenimiento,
} from '@/shared/rules/bitacora-occ';
import { fechaDelCorte } from '@/shared/rules/cortes';

const NOMBRE_DEL_CAMBIO = { varado: 'Varado', en_mantenimiento: 'En mantenimiento', operativo: 'Operativo' } as const;
const NOMBRE_DEL_ESTADO: Record<EstadoDeEquipo, string> = { operativo: 'Operativo', inoperativo: 'Inoperativo' };

type Correccion = Partial<Pick<BitacoraDeEmpresaDelDia, 'estadoEquipos' | 'trabajos' | 'actividades' | 'pendientes'>>;

export function DiaDeLaBitacoraDeOcc({ fecha, alVolver }: { fecha: string; alVolver: () => void }) {
  const cargado = useListado<BitacoraDeEmpresaDelDia>(
    useCallback(() => api.bitacoraDeEmpresa.dia('occ', fecha).then((d) => [d]), [fecha]),
  );
  const dia = cargado.datos[0] ?? null;
  const [equipo, setEquipo] = useState<string | null>(null);
  const [estado, setEstado] = useState<string | null>(null);
  const [editandoEstado, setEditandoEstado] = useState<EstadoDelEquipo | null>(null);
  const [editandoTrabajo, setEditandoTrabajo] = useState<TrabajoDeMantenimiento | null>(null);
  const [porQuitar, setPorQuitar] = useState<{ seccion: 'trabajos' | 'actividades' | 'pendientes'; id: string; texto: string } | null>(null);
  const [cerrando, setCerrando] = useState(false);
  const [anulando, setAnulando] = useState(false);
  const [hecho, setHecho] = useState<string | null>(null);

  const visto = useMemo(
    () => (dia ? filtrarDia(dia, { equipo, estado: (estado as EstadoDeEquipo | null) ?? null }) : null),
    [dia, equipo, estado],
  );

  if (!dia || !visto) {
    return (
      <MarcoPantalla titulo={`Bitácora de OCC · ${fechaDelCorte(fecha)}`} descripcion="" error={cargado.error} cargando={cargado.cargando}>
        <Acciones>
          <Boton titulo="← Volver a los días" tono="secundario" onPress={alVolver} />
        </Acciones>
      </MarcoPantalla>
    );
  }

  const cerrada = dia.estado === 'cerrada';
  const nombre = (e: EquipoDelRenglon | null) => (e ? (e.vehiculoId ? (dia.equipos[e.vehiculoId] ?? e.escrito) : e.escrito) : '—');
  /** El equipo con la nota de la placa mal escrita (RF-12a), en dos renglones. */
  const celdaDeEquipo = (e: EquipoDelRenglon | null) => (
    <View style={estilos.celdaDoble}>
      <Text style={estilos.fuerte}>{nombre(e)}</Text>
      {e?.posiblePlaca ? (
        <Text style={estilos.apoyo}>{`Posiblemente sea la placa registrada ${e.posiblePlaca.placa}`}</Text>
      ) : null}
    </View>
  );

  /** Las opciones del filtro de equipo: los que nombra el día, una vez cada uno. */
  const equipos = [
    ...new Map(
      [...dia.estadoEquipos, ...dia.trabajos, ...dia.actividades.map((a) => a.equipo), ...dia.pendientes.map((p) => p.equipo)]
        .filter((e): e is EquipoDelRenglon => !!e)
        .map((e) => [claveDelEquipo(e), { valor: claveDelEquipo(e), etiqueta: nombre(e) }]),
    ).values(),
  ].sort((a, b) => a.etiqueta.localeCompare(b.etiqueta, 'es'));

  async function corregir(cambios: Correccion, mensaje: string) {
    await api.bitacoraDeEmpresa.corregir('occ', fecha, { version: dia!.version, ...cambios });
    setHecho(mensaje);
    cargado.recargar();
  }

  const columnasDeEstado: Columna<EstadoDelEquipo>[] = [
    { clave: 'equipo', titulo: 'Equipo', ancho: 230, pintar: (r) => celdaDeEquipo(r) },
    {
      clave: 'lista',
      titulo: 'Según la lista',
      ancho: 240,
      pintar: (r) => (
        <View style={estilos.celdaDoble}>
          <Text style={estilos.fuerte}>{r.estado ? NOMBRE_DEL_ESTADO[r.estado] : 'No estaba en la lista'}</Text>
          {r.motivo ? <Text style={estilos.apoyo}>{r.motivo}</Text> : null}
        </View>
      ),
    },
    {
      clave: 'cambios',
      titulo: 'En el día',
      ancho: 280,
      pintar: (r) =>
        r.cambios.length === 0 ? (
          <Celda>—</Celda>
        ) : (
          <View style={estilos.celdaDoble}>
            {r.cambios.map((c) => (
              <Text key={`${c.mensajeId}|${c.estado}`} style={estilos.texto}>
                {`${c.hora} · ${NOMBRE_DEL_CAMBIO[c.estado]}${c.texto ? ` — ${c.texto}` : ''}`}
              </Text>
            ))}
          </View>
        ),
    },
    {
      clave: 'final',
      titulo: 'Quedó',
      ancho: 120,
      pintar: (r) => {
        const final = estadoActual(r);
        return final ? (
          <Etiqueta tono={final === 'operativo' ? 'bueno' : 'malo'}>{NOMBRE_DEL_ESTADO[final]}</Etiqueta>
        ) : (
          <Celda>—</Celda>
        );
      },
    },
    { clave: 'reporto', titulo: 'Reportó', ancho: 140, pintar: (r) => <Celda lineas={2}>{r.origen?.reportadoPor ?? '—'}</Celda> },
    {
      clave: 'accion',
      titulo: '',
      ancho: 110,
      anchoMinimo: 94,
      pintar: (r) =>
        cerrada ? null : <Boton titulo="Corregir" tono="secundario" onPress={() => setEditandoEstado(r)} />,
    },
  ];

  const columnasDeTrabajos: Columna<TrabajoDeMantenimiento>[] = [
    { clave: 'hora', titulo: 'Hora', ancho: 70, pintar: (t) => <Celda>{t.hora}</Celda> },
    { clave: 'equipo', titulo: 'Equipo', ancho: 210, pintar: (t) => celdaDeEquipo(t) },
    { clave: 'tipo', titulo: 'Tipo', ancho: 170, pintar: (t) => <Celda>{NOMBRE_DE_TIPO_DE_TRABAJO[t.tipo]}</Celda> },
    { clave: 'descripcion', titulo: 'Qué se hizo', ancho: 370, pintar: (t) => <Celda lineas={3}>{t.descripcion}</Celda> },
    { clave: 'reporto', titulo: 'Reportó', ancho: 130, pintar: (t) => <Celda lineas={2}>{t.reportadoPor}</Celda> },
    {
      clave: 'accion',
      titulo: '',
      ancho: 110,
      anchoMinimo: 94,
      pintar: (t) =>
        cerrada ? null : (
          <Acciones>
            <Boton titulo="Corregir" tono="secundario" onPress={() => setEditandoTrabajo(t)} />
            <Boton
              titulo="Quitar"
              tono="peligro"
              onPress={() => setPorQuitar({ seccion: 'trabajos', id: t.id, texto: `el trabajo «${t.descripcion}»` })}
            />
          </Acciones>
        ),
    },
  ];

  const columnasDeActividades: Columna<ActividadDeMantenimiento>[] = [
    { clave: 'persona', titulo: 'Persona', ancho: 180, pintar: (a) => <Celda lineas={2}>{a.persona}</Celda> },
    { clave: 'actividad', titulo: 'Actividad', ancho: 520, pintar: (a) => <Celda lineas={3}>{a.descripcion}</Celda> },
    { clave: 'equipo', titulo: 'Equipo', ancho: 220, pintar: (a) => (a.equipo ? celdaDeEquipo(a.equipo) : <Celda>—</Celda>) },
    {
      clave: 'accion',
      titulo: '',
      ancho: 110,
      anchoMinimo: 94,
      pintar: (a) =>
        cerrada ? null : (
          <Boton
            titulo="Quitar"
            tono="peligro"
            onPress={() => setPorQuitar({ seccion: 'actividades', id: a.id, texto: `la actividad «${a.descripcion}»` })}
          />
        ),
    },
  ];

  const columnasDePendientes: Columna<PendienteDelDia>[] = [
    { clave: 'texto', titulo: 'Pendiente', ancho: 640, pintar: (p) => <Celda lineas={3}>{p.texto}</Celda> },
    { clave: 'equipo', titulo: 'Equipo', ancho: 260, pintar: (p) => (p.equipo ? celdaDeEquipo(p.equipo) : <Celda>—</Celda>) },
    {
      clave: 'accion',
      titulo: '',
      ancho: 110,
      anchoMinimo: 94,
      pintar: (p) =>
        cerrada ? null : (
          <Boton titulo="Quitar" tono="peligro" onPress={() => setPorQuitar({ seccion: 'pendientes', id: p.id, texto: `el pendiente «${p.texto}»` })} />
        ),
    },
  ];

  const fotos = dia.fotos.filter((f) => !f.quitada);
  // Con un filtro puesto, una sección vacía es por el filtro, no porque falte el reporte.
  const conFiltro = !!equipo || !!estado;
  const vacio = (sinFiltro: string) => (conFiltro ? 'Nada con este filtro.' : sinFiltro);
  const equiposEn = (n: number, estadoDe: string) => `${n} ${n === 1 ? 'equipo' : 'equipos'} ${estadoDe}${n === 1 ? '' : 's'}`;

  return (
    <MarcoPantalla
      titulo={`Bitácora de OCC · ${fechaDelCorte(fecha)}`}
      descripcion={`Al final del día: ${equiposEn(dia.operativos, 'operativo')} y ${equiposEn(dia.inoperativos, 'inoperativo')}.`}
      error={cargado.error}
      cargando={cargado.cargando}
    >
      <Acciones>
        <Boton titulo="← Volver a los días" tono="secundario" onPress={alVolver} />
        <Etiqueta tono={cerrada ? 'neutro' : dia.estado === 'incompleta' ? 'atencion' : 'bueno'}>
          {cerrada ? 'Cerrada' : dia.estado === 'incompleta' ? 'Incompleta' : dia.estado === 'en_espera' ? 'En espera' : 'Armada'}
        </Etiqueta>
        {!cerrada ? <Boton titulo="Cerrar el día" onPress={() => setCerrando(true)} /> : null}
        <Boton titulo="Anular" tono="peligro" onPress={() => setAnulando(true)} />
      </Acciones>

      {dia.fechaDudosa && !cerrada ? (
        <Aviso tono="info">
          Fecha dudosa: la lista de equipos de este día decía un día que ya había pasado, o llegó de noche para el mismo día.
          Revísela antes de cerrar: si era de otro día, corrija los equipos o anule esta bitácora.
        </Aviso>
      ) : null}
      {cerrada ? <Aviso tono="info">Esta bitácora está cerrada: no se cambia. Para corregirla, anúlela.</Aviso> : null}
      {hecho ? <Aviso tono="exito">{hecho}</Aviso> : null}
      {dia.anuladas.length > 0 ? (
        <Aviso tono="info">
          {`Este día tiene ${dia.anuladas.length === 1 ? 'una bitácora anulada' : `${dia.anuladas.length} bitácoras anuladas`}: ${dia.anuladas.map((a) => a.motivo).join(' · ')}`}
        </Aviso>
      ) : null}

      <Acciones>
        <Selector etiqueta="Equipo" valor={equipo} opciones={equipos} onChange={setEquipo} permiteVacio vacio="Todos los equipos" ancho={260} />
        <Selector
          etiqueta="Quedó"
          valor={estado}
          opciones={[
            { valor: 'operativo', etiqueta: 'Operativos' },
            { valor: 'inoperativo', etiqueta: 'Inoperativos' },
          ]}
          onChange={setEstado}
          permiteVacio
          vacio="Todos"
          ancho={200}
        />
      </Acciones>

      <Seccion titulo="Estado de los equipos">
        <Tabla columnas={columnasDeEstado} filas={visto.estadoEquipos} vacio={vacio('Todavía no llega la lista de equipos de este día.')} />
      </Seccion>
      <Seccion titulo="Trabajos de mantenimiento">
        <Tabla columnas={columnasDeTrabajos} filas={visto.trabajos} vacio={vacio('Sin trabajos de mantenimiento este día.')} />
      </Seccion>
      <Seccion titulo="Actividades del personal de mantenimiento">
        <Tabla columnas={columnasDeActividades} filas={visto.actividades} vacio={vacio('Todavía no llega el informe de este día.')} />
      </Seccion>
      <Seccion titulo="Pendientes">
        <Tabla columnas={columnasDePendientes} filas={visto.pendientes} vacio={vacio('Sin pendientes este día.')} />
      </Seccion>
      <Seccion titulo="Fotos del día">
        {fotos.length === 0 ? (
          <Text style={estilos.apoyo}>Sin fotos este día.</Text>
        ) : (
          <View style={estilos.cuadricula}>
            {fotos.map((f) => (
              <Image key={f.id} source={{ uri: `/api/panel/media/${f.mediaId}` }} style={estilos.miniatura} resizeMode="cover" />
            ))}
          </View>
        )}
      </Seccion>

      {editandoEstado ? (
        <VentanaEstado
          renglon={editandoEstado}
          nombre={nombre(editandoEstado)}
          onCerrar={() => setEditandoEstado(null)}
          onGuardar={async (cambio) => {
            await corregir(
              { estadoEquipos: dia.estadoEquipos.map((r) => (r.id === editandoEstado.id ? { ...r, ...cambio } : r)) },
              `${nombre(editandoEstado)} quedó corregido.`,
            );
            setEditandoEstado(null);
          }}
        />
      ) : null}
      {editandoTrabajo ? (
        <VentanaTrabajo
          trabajo={editandoTrabajo}
          nombre={nombre(editandoTrabajo)}
          onCerrar={() => setEditandoTrabajo(null)}
          onGuardar={async (cambio) => {
            await corregir(
              { trabajos: dia.trabajos.map((t) => (t.id === editandoTrabajo.id ? { ...t, ...cambio } : t)) },
              'El trabajo quedó corregido.',
            );
            setEditandoTrabajo(null);
          }}
        />
      ) : null}
      {porQuitar ? (
        <Confirmacion
          titulo="Quitar"
          aviso={`Se quita ${porQuitar.texto} de la bitácora de este día. El mensaje de WhatsApp no se borra.`}
          confirmar="Quitar"
          onConfirmar={async () => {
            const { seccion, id } = porQuitar;
            await corregir(
              seccion === 'trabajos'
                ? { trabajos: dia.trabajos.filter((t) => t.id !== id) }
                : seccion === 'actividades'
                  ? { actividades: dia.actividades.filter((a) => a.id !== id) }
                  : { pendientes: dia.pendientes.filter((p) => p.id !== id) },
              'Quedó quitado.',
            );
            setPorQuitar(null);
          }}
          onCancelar={() => setPorQuitar(null)}
        />
      ) : null}
      {cerrando ? (
        <Confirmacion
          titulo="Cerrar el día"
          aviso={`La bitácora de OCC del ${fechaDelCorte(fecha)} queda cerrada: ya no se cambia, y lo que llegue después por WhatsApp va a «No se pudo guardar».`}
          confirmar="Cerrar el día"
          onConfirmar={async () => {
            await api.bitacoraDeEmpresa.cerrar('occ', fecha, dia.version);
            setCerrando(false);
            setHecho('El día quedó cerrado.');
            cargado.recargar();
          }}
          onCancelar={() => setCerrando(false)}
        />
      ) : null}
      {anulando ? (
        <VentanaAnular
          fecha={fecha}
          onCerrar={() => setAnulando(false)}
          onAnular={async (motivo) => {
            await api.bitacoraDeEmpresa.anular('occ', fecha, dia.version, motivo);
            setAnulando(false);
            alVolver();
          }}
        />
      ) : null}
    </MarcoPantalla>
  );
}

/** Corregir el estado y el motivo de un equipo en la lista del día (RF-18). */
function VentanaEstado({
  renglon,
  nombre,
  onCerrar,
  onGuardar,
}: {
  renglon: EstadoDelEquipo;
  nombre: string;
  onCerrar: () => void;
  onGuardar: (cambio: { estado: EstadoDeEquipo | null; motivo: string }) => Promise<void>;
}) {
  const [estado, setEstado] = useState<string | null>(renglon.estado);
  const [motivo, setMotivo] = useState(renglon.motivo);
  const accion = useAccionDeVentana();
  return (
    <Modal titulo={`Corregir ${nombre}`} onCerrar={onCerrar}>
      {accion.error ? <Aviso tono="error">{accion.error}</Aviso> : null}
      <Formulario>
        <Selector
          etiqueta="Según la lista"
          valor={estado}
          opciones={[
            { valor: 'operativo', etiqueta: 'Operativo' },
            { valor: 'inoperativo', etiqueta: 'Inoperativo' },
          ]}
          onChange={setEstado}
          permiteVacio
          vacio="No estaba en la lista"
          ancho={220}
        />
        <Campo etiqueta="Motivo u observación" valor={motivo} onChange={setMotivo} multilinea />
        <AccionesFormulario>
          <Acciones>
            <Boton
              titulo={accion.ejecutando ? 'Guardando…' : 'Guardar'}
              deshabilitado={accion.ejecutando}
              onPress={() => accion.ejecutar(() => onGuardar({ estado: (estado as EstadoDeEquipo | null) ?? null, motivo: motivo.trim() }))}
            />
            <Boton titulo="Cancelar" tono="secundario" onPress={onCerrar} />
          </Acciones>
        </AccionesFormulario>
      </Formulario>
    </Modal>
  );
}

/** Corregir el tipo y la descripción de un trabajo (RF-18). */
function VentanaTrabajo({
  trabajo,
  nombre,
  onCerrar,
  onGuardar,
}: {
  trabajo: TrabajoDeMantenimiento;
  nombre: string;
  onCerrar: () => void;
  onGuardar: (cambio: { tipo: TipoDeTrabajo; descripcion: string }) => Promise<void>;
}) {
  const [tipo, setTipo] = useState<string | null>(trabajo.tipo);
  const [descripcion, setDescripcion] = useState(trabajo.descripcion);
  const accion = useAccionDeVentana();
  const falta = !tipo || descripcion.trim() === '';
  return (
    <Modal titulo={`Corregir el trabajo de ${nombre}`} onCerrar={onCerrar}>
      {accion.error ? <Aviso tono="error">{accion.error}</Aviso> : null}
      <Formulario>
        <Selector
          etiqueta="Tipo"
          obligatorio
          valor={tipo}
          opciones={TIPOS_DE_TRABAJO.map((t) => ({ valor: t, etiqueta: NOMBRE_DE_TIPO_DE_TRABAJO[t] }))}
          onChange={setTipo}
          ancho={280}
        />
        <Campo etiqueta="Qué se hizo" obligatorio valor={descripcion} onChange={setDescripcion} multilinea />
        <AccionesFormulario>
          <Acciones>
            <Boton
              titulo={accion.ejecutando ? 'Guardando…' : 'Guardar'}
              deshabilitado={accion.ejecutando || falta}
              onPress={() => accion.ejecutar(() => onGuardar({ tipo: tipo as TipoDeTrabajo, descripcion: descripcion.trim() }))}
            />
            <Boton titulo="Cancelar" tono="secundario" onPress={onCerrar} />
          </Acciones>
        </AccionesFormulario>
      </Formulario>
    </Modal>
  );
}

/** Anular el día con motivo (RF-20): no se borra, y el día queda libre para otra. */
function VentanaAnular({
  fecha,
  onCerrar,
  onAnular,
}: {
  fecha: string;
  onCerrar: () => void;
  onAnular: (motivo: string) => Promise<void>;
}) {
  const [motivo, setMotivo] = useState('');
  const accion = useAccionDeVentana();
  return (
    <Modal titulo={`Anular la bitácora de OCC del ${fechaDelCorte(fecha)}`} onCerrar={onCerrar}>
      <Aviso tono="info">
        No se borra: queda anulada, con quién, cuándo y por qué. El siguiente mensaje de este día abre otra.
      </Aviso>
      {accion.error ? <Aviso tono="error">{accion.error}</Aviso> : null}
      <Formulario>
        <Campo etiqueta="Motivo" obligatorio valor={motivo} onChange={setMotivo} multilinea />
        <AccionesFormulario>
          <Acciones>
            <Boton
              titulo={accion.ejecutando ? 'Anulando…' : 'Anular'}
              tono="peligro"
              deshabilitado={accion.ejecutando || motivo.trim() === ''}
              onPress={() => accion.ejecutar(() => onAnular(motivo.trim()))}
            />
            <Boton titulo="Cancelar" tono="secundario" onPress={onCerrar} />
          </Acciones>
        </AccionesFormulario>
      </Formulario>
    </Modal>
  );
}

const estilos = StyleSheet.create({
  celdaDoble: { gap: Spacing.half, alignItems: 'flex-start' },
  fuerte: { fontFamily: FuentePanel.texto, fontSize: TextoPanel.cuerpo, fontWeight: '600', color: Panel.texto },
  texto: { fontFamily: FuentePanel.texto, fontSize: TextoPanel.cuerpo, color: Panel.texto },
  apoyo: { fontFamily: FuentePanel.texto, fontSize: TextoPanel.apoyo, color: Panel.textoApoyo },
  cuadricula: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.three },
  miniatura: { width: 200, aspectRatio: 4 / 3, borderRadius: Radio.sm, backgroundColor: Panel.borde },
});
