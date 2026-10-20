/**
 * La pestaña Mantenimiento de Reportes (spec 030, RF-22 a RF-35): el estado de cada
 * máquina —aceite, preventivo y correctivos pendientes— y el historial, con las
 * ventanas para registrar, anular, marcar resuelto y configurar los intervalos.
 *
 * No depende del periodo: el estado es el de hoy, contra la última lectura de cada
 * máquina. Lo de antes está en el historial.
 *
 * Registrar, anular y resolver lo hacen la gerencia y el residente; los intervalos,
 * solo la gerencia (RF-24, RF-25): al residente no se le enseña ese botón, y la ruta
 * se lo rechazaría igual.
 */
import { useCallback, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { FuentePanel, Panel, TextoPanel } from '@/constants/theme';
import { api, mensajeDe } from '@/features/panel/cliente-api';
import {
  Acciones,
  Aviso,
  Boton,
  Campo,
  CampoDeFecha,
  Celda,
  Cifra,
  Cifras,
  Etiqueta,
  Formulario,
  Modal,
  Paginacion,
  Seccion,
  Selector,
  Tabla,
  type Columna,
} from '@/features/panel/componentes';
import type { ConsultaDeReporte, IntervalosDeTipoFila, ReporteFila } from '@/features/panel/contratos';
import { useListado } from '@/features/panel/marco';
import { POR_PAGINA, usePaginacion } from '@/features/panel/usar-listado-filtrado';
import { diaCorto, fechaDeJornada, UNIDAD_DE_MEDIDOR } from '@/shared/rules/jornada';
import {
  CLASES_CON_INTERVALO,
  CLASES_DE_MANTENIMIENTO,
  NOMBRE_DE_CLASE,
  type ClaseConIntervalo,
  type ClaseDeMantenimiento,
} from '@/shared/rules/mantenimiento';

import { cifra, EstadoDeMantenimientoEtiqueta } from './comunes';

type Reporte = ReporteFila<'mantenimiento'>;
type Maquina = Reporte['maquinas'][number] & { id: string };
type Registro = Reporte['historial'][number];

/** Una lectura escrita: con coma o punto decimal; vacía es «la registrada». */
function numeroEscrito(texto: string): number | null | undefined {
  const limpio = texto.trim().replace(',', '.');
  if (!limpio) return null;
  const n = Number(limpio);
  return Number.isFinite(n) && n >= 0 ? n : undefined;
}

export function PestanaMantenimiento({ consulta, esGerencia }: { consulta: ConsultaDeReporte; esGerencia: boolean }) {
  const { obraId, tipo, fecha } = consulta;
  const reporte = useListado<Reporte>(
    useCallback(async () => [await api.reportes.de('mantenimiento', { obraId, tipo, fecha })], [obraId, tipo, fecha]),
  );
  const datos = reporte.datos[0];
  const maquinas: Maquina[] = (datos?.maquinas ?? []).map((m) => ({ ...m, id: m.vehiculoId }));
  const paginaDeMaquinas = usePaginacion(maquinas);
  const paginaDelHistorial = usePaginacion(datos?.historial ?? []);

  const [ventana, setVentana] = useState<
    | { tipo: 'registrar'; vehiculoId: string | null }
    | { tipo: 'anular'; registro: Registro }
    | { tipo: 'resolver'; maquina: Maquina; correctivo: Maquina['correctivosPendientes'][number] }
    | { tipo: 'intervalos' }
    | { tipo: 'intervaloDeMaquina'; maquina: Maquina }
    | null
  >(null);
  const [hecho, setHecho] = useState<string | null>(null);

  function alTerminar(mensaje: string) {
    setVentana(null);
    setHecho(mensaje);
    reporte.recargar();
  }

  const clase = (c: ClaseConIntervalo): Columna<Maquina> => ({
    clave: c,
    titulo: NOMBRE_DE_CLASE[c],
    ancho: 200,
    pintar: (m) => {
      const estado = m.clases[c];
      return (
        <View style={estilos.celda}>
          <EstadoDeMantenimientoEtiqueta estado={estado.estado} texto={estado.texto.replace(`${NOMBRE_DE_CLASE[c]}: `, '').replace(`${NOMBRE_DE_CLASE[c]} `, '')} correctivoPendiente={false} />
          <Text style={estilos.apoyo}>
            {`Cada ${cifra(estado.intervalo.cada, 0)} ${UNIDAD_DE_MEDIDOR[m.claseMedidor]}${estado.intervalo.origen === 'vehiculo' ? ' (propio)' : ''}`}
            {estado.ultimo ? ` · último ${diaCorto(estado.ultimo.fecha)}` : ''}
          </Text>
        </View>
      );
    },
  });

  const columnasDeMaquinas: Columna<Maquina>[] = [
    {
      clave: 'maquina',
      titulo: 'Máquina',
      ancho: 180,
      pintar: (m) => (
        <View>
          <Celda>{m.codigo}</Celda>
          <Text style={estilos.apoyo}>{m.tipo}</Text>
          {m.fueraDeServicio ? <Etiqueta tono="malo">Fuera de servicio</Etiqueta> : null}
        </View>
      ),
    },
    {
      clave: 'lectura',
      titulo: 'Lectura',
      ancho: 110,
      pintar: (m) => <Celda>{m.lectura === null ? '—' : `${cifra(m.lectura)} ${UNIDAD_DE_MEDIDOR[m.claseMedidor]}`}</Celda>,
    },
    clase('aceite'),
    clase('preventivo'),
    {
      clave: 'correctivo',
      titulo: 'Correctivo',
      ancho: 220,
      pintar: (m) =>
        m.correctivosPendientes.length === 0 ? (
          <Text style={estilos.apoyo}>Ninguno pendiente</Text>
        ) : (
          <View style={estilos.celda}>
            {m.correctivosPendientes.map((c) => (
              <View key={c.id} style={estilos.celda}>
                <Etiqueta tono="malo">{`Pendiente desde el ${diaCorto(c.fecha)}`}</Etiqueta>
                {c.nota ? <Text style={estilos.apoyo} numberOfLines={2}>{c.nota}</Text> : null}
                <Boton
                  titulo="Marcar resuelto"
                  tono="secundario"
                  onPress={() => setVentana({ tipo: 'resolver', maquina: m, correctivo: c })}
                />
              </View>
            ))}
          </View>
        ),
    },
    {
      clave: 'acciones',
      titulo: '',
      ancho: 150,
      anchoMinimo: 150,
      pintar: (m) => (
        <View style={estilos.celda}>
          <Boton titulo="Registrar" tono="secundario" onPress={() => setVentana({ tipo: 'registrar', vehiculoId: m.vehiculoId })} />
          {esGerencia ? (
            <Boton titulo="Intervalo" tono="secundario" onPress={() => setVentana({ tipo: 'intervaloDeMaquina', maquina: m })} />
          ) : null}
        </View>
      ),
    },
  ];

  const columnasDelHistorial: Columna<Registro>[] = [
    { clave: 'fecha', titulo: 'Fecha', ancho: 90, pintar: (r) => <Celda>{diaCorto(r.fecha)}</Celda> },
    { clave: 'maquina', titulo: 'Máquina', ancho: 150, pintar: (r) => <Celda>{r.codigo}</Celda> },
    { clave: 'clase', titulo: 'Clase', ancho: 130, pintar: (r) => <Celda>{NOMBRE_DE_CLASE[r.clase]}</Celda> },
    { clave: 'lectura', titulo: 'Lectura', ancho: 100, pintar: (r) => <Celda>{cifra(r.lectura)}</Celda> },
    { clave: 'nota', titulo: 'Nota', ancho: 220, pintar: (r) => <Celda lineas={2}>{r.nota || '—'}</Celda> },
    {
      clave: 'origen',
      titulo: 'Origen',
      ancho: 150,
      pintar: (r) => (
        <View>
          {r.origen === 'whatsapp' ? <Etiqueta tono="neutro">WhatsApp</Etiqueta> : <Celda>Panel</Celda>}
          <Text style={estilos.apoyo}>{r.registradoPor}</Text>
        </View>
      ),
    },
    {
      clave: 'estado',
      titulo: 'Estado',
      ancho: 190,
      pintar: (r) =>
        r.anuladoEn ? (
          <View>
            <Etiqueta tono="neutro">Anulado</Etiqueta>
            <Text style={estilos.apoyo} numberOfLines={2}>{`${r.anuladoPor ?? ''}: ${r.motivoAnulacion ?? ''}`}</Text>
          </View>
        ) : r.clase === 'correctivo' ? (
          r.resueltoEn ? (
            <Etiqueta tono="bueno">{`Resuelto el ${diaCorto(r.resueltoEn)}`}</Etiqueta>
          ) : (
            <Etiqueta tono="malo">Pendiente</Etiqueta>
          )
        ) : (
          <Etiqueta tono="bueno">Vigente</Etiqueta>
        ),
    },
    {
      clave: 'anular',
      titulo: '',
      ancho: 110,
      anchoMinimo: 110,
      pintar: (r) =>
        r.anuladoEn ? null : (
          <Acciones>
            <Boton titulo="Anular" tono="peligro" onPress={() => setVentana({ tipo: 'anular', registro: r })} />
          </Acciones>
        ),
    },
  ];

  return (
    <>
      {reporte.error ? <Aviso tono="error">{reporte.error}</Aviso> : null}
      {hecho ? <Aviso tono="exito">{hecho}</Aviso> : null}
      {datos ? (
        <Cifras>
          <Cifra
            titulo="Correctivos pendientes"
            valor={String(datos.cifras.correctivosPendientes)}
            pie="máquinas esperando reparación"
            tono={datos.cifras.correctivosPendientes > 0 ? 'malo' : 'neutro'}
          />
          <Cifra titulo="Vencidas" valor={String(datos.cifras.vencidas)} pie="aceite o preventivo" tono={datos.cifras.vencidas > 0 ? 'malo' : 'neutro'} />
          <Cifra titulo="Próximas" valor={String(datos.cifras.proximas)} pie="desde el aviso" tono={datos.cifras.proximas > 0 ? 'atencion' : 'neutro'} />
          <Cifra titulo="Sin registro" valor={String(datos.cifras.sinRegistro)} pie="sin un servicio anotado" />
          <Cifra titulo="Fuera de servicio" valor={String(datos.cifras.fueraDeServicio)} pie="según Vehículos" />
        </Cifras>
      ) : null}

      <Acciones>
        <Boton titulo="Registrar mantenimiento" onPress={() => setVentana({ tipo: 'registrar', vehiculoId: null })} />
        {esGerencia ? <Boton titulo="Configurar intervalos" tono="secundario" onPress={() => setVentana({ tipo: 'intervalos' })} /> : null}
      </Acciones>

      <Tabla
        columnas={columnasDeMaquinas}
        filas={paginaDeMaquinas.pagina}
        vacio={reporte.cargando ? 'Cargando el mantenimiento…' : 'La obra no tiene máquinas.'}
      />
      <Paginacion
        pagina={paginaDeMaquinas.paginaActual}
        porPagina={POR_PAGINA}
        total={paginaDeMaquinas.total}
        onCambiar={paginaDeMaquinas.irAPagina}
      />

      <Seccion titulo="Historial">
        <Tabla
          columnas={columnasDelHistorial}
          filas={paginaDelHistorial.pagina}
          vacio="Todavía no se ha registrado ningún mantenimiento en esta obra."
          variante="desnuda"
        />
        <Paginacion
          pagina={paginaDelHistorial.paginaActual}
          porPagina={POR_PAGINA}
          total={paginaDelHistorial.total}
          onCambiar={paginaDelHistorial.irAPagina}
        />
      </Seccion>

      {ventana?.tipo === 'registrar' ? (
        <VentanaRegistrar
          maquinas={maquinas}
          vehiculoId={ventana.vehiculoId}
          onCerrar={() => setVentana(null)}
          alTerminar={alTerminar}
        />
      ) : null}
      {ventana?.tipo === 'anular' ? (
        <VentanaAnular registro={ventana.registro} onCerrar={() => setVentana(null)} alTerminar={alTerminar} />
      ) : null}
      {ventana?.tipo === 'resolver' ? (
        <VentanaResolver
          maquina={ventana.maquina}
          correctivoId={ventana.correctivo.id}
          onCerrar={() => setVentana(null)}
          alTerminar={alTerminar}
        />
      ) : null}
      {ventana?.tipo === 'intervalos' ? <VentanaIntervalos onCerrar={() => setVentana(null)} alTerminar={alTerminar} /> : null}
      {ventana?.tipo === 'intervaloDeMaquina' ? (
        <VentanaIntervaloDeMaquina maquina={ventana.maquina} onCerrar={() => setVentana(null)} alTerminar={alTerminar} />
      ) : null}
    </>
  );
}

/** «Registrar mantenimiento» (RF-32, RF-33). */
function VentanaRegistrar({
  maquinas,
  vehiculoId,
  onCerrar,
  alTerminar,
}: {
  maquinas: Maquina[];
  vehiculoId: string | null;
  onCerrar: () => void;
  alTerminar: (mensaje: string) => void;
}) {
  const [maquinaId, setMaquinaId] = useState<string | null>(vehiculoId);
  const [clase, setClase] = useState<ClaseDeMantenimiento | null>(null);
  const [fecha, setFecha] = useState(fechaDeJornada());
  const [lectura, setLectura] = useState('');
  const [nota, setNota] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const maquina = maquinas.find((m) => m.vehiculoId === maquinaId);
  const leida = numeroEscrito(lectura);

  async function guardar() {
    if (!maquinaId || !clase) return setError('Elija la máquina y la clase de mantenimiento.');
    if (leida === undefined) return setError('La lectura va en números, por ejemplo 455,5.');
    setEnviando(true);
    try {
      const hecho = await api.reportes.registrarMantenimiento({ vehiculoId: maquinaId, clase, fecha, lectura: leida, nota });
      alTerminar(
        `${NOMBRE_DE_CLASE[clase]} de ${maquina?.codigo ?? 'la máquina'} registrado.${hecho.avisoLectura ? ` ${hecho.avisoLectura}` : ''}`,
      );
    } catch (fallo) {
      setError(mensajeDe(fallo));
      setEnviando(false);
    }
  }

  return (
    <Modal titulo="Registrar mantenimiento" onCerrar={onCerrar}>
      {error ? <Aviso tono="error">{error}</Aviso> : null}
      <Formulario>
        <Selector
          etiqueta="Máquina"
          valor={maquinaId}
          opciones={maquinas.map((m) => ({ valor: m.vehiculoId, etiqueta: m.codigo, detalle: m.tipo }))}
          onChange={setMaquinaId}
          vacio="Elija la máquina"
          ancho={260}
        />
        <Selector
          etiqueta="Clase"
          valor={clase}
          opciones={CLASES_DE_MANTENIMIENTO.map((c) => ({ valor: c, etiqueta: NOMBRE_DE_CLASE[c] }))}
          onChange={(v) => setClase(v as ClaseDeMantenimiento | null)}
          vacio="Elija la clase"
          ancho={200}
        />
        <CampoDeFecha etiqueta="Fecha" valor={fecha} onChange={setFecha} max={fechaDeJornada()} />
        <Campo
          etiqueta={maquina ? `Lectura (${UNIDAD_DE_MEDIDOR[maquina.claseMedidor]})` : 'Lectura'}
          valor={lectura}
          onChange={setLectura}
          soloNumeros
          ayuda={
            maquina?.lectura !== null && maquina?.lectura !== undefined
              ? `Vacía: la registrada, ${cifra(maquina.lectura)} ${UNIDAD_DE_MEDIDOR[maquina.claseMedidor]}.`
              : 'Vacía: la registrada de la máquina.'
          }
          error={leida === undefined ? 'Solo números.' : undefined}
          ancho={180}
        />
        <Campo etiqueta="Nota" valor={nota} onChange={setNota} multilinea compacto ayuda="Qué se hizo: filtros, aceite usado, quién lo hizo." />
      </Formulario>
      <Acciones>
        <Boton titulo="Cancelar" tono="secundario" onPress={onCerrar} />
        <Boton titulo={enviando ? 'Guardando…' : 'Registrar'} onPress={guardar} deshabilitado={enviando} />
      </Acciones>
    </Modal>
  );
}

/** Anular con motivo (RF-35). */
function VentanaAnular({
  registro,
  onCerrar,
  alTerminar,
}: {
  registro: Registro;
  onCerrar: () => void;
  alTerminar: (mensaje: string) => void;
}) {
  const [motivo, setMotivo] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  async function anular() {
    if (!motivo.trim()) return setError('Escriba por qué lo anula.');
    setEnviando(true);
    try {
      await api.reportes.anularMantenimiento(registro.id, motivo.trim());
      alTerminar(`Se anuló el ${NOMBRE_DE_CLASE[registro.clase].toLowerCase()} de ${registro.codigo} del ${diaCorto(registro.fecha)}.`);
    } catch (fallo) {
      setError(mensajeDe(fallo));
      setEnviando(false);
    }
  }
  return (
    <Modal titulo={`Anular: ${NOMBRE_DE_CLASE[registro.clase]} de ${registro.codigo}`} onCerrar={onCerrar}>
      <Text style={estilos.apoyo}>Un mantenimiento no se edita: se anula, y deja de contar. Sigue en el historial.</Text>
      {error ? <Aviso tono="error">{error}</Aviso> : null}
      <Campo etiqueta="Motivo" valor={motivo} onChange={setMotivo} multilinea compacto obligatorio />
      <Acciones>
        <Boton titulo="Cancelar" tono="secundario" onPress={onCerrar} />
        <Boton titulo={enviando ? 'Anulando…' : 'Anular'} tono="peligro" onPress={anular} deshabilitado={enviando} />
      </Acciones>
    </Modal>
  );
}

/** Marcar resuelto un correctivo (RF-29). */
function VentanaResolver({
  maquina,
  correctivoId,
  onCerrar,
  alTerminar,
}: {
  maquina: Maquina;
  correctivoId: string;
  onCerrar: () => void;
  alTerminar: (mensaje: string) => void;
}) {
  const [fecha, setFecha] = useState(fechaDeJornada());
  const [nota, setNota] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  async function resolver() {
    setEnviando(true);
    try {
      await api.reportes.resolverCorrectivo(correctivoId, { fecha, nota });
      alTerminar(`El correctivo de ${maquina.codigo} quedó resuelto.`);
    } catch (fallo) {
      setError(mensajeDe(fallo));
      setEnviando(false);
    }
  }
  return (
    <Modal titulo={`Correctivo de ${maquina.codigo} resuelto`} onCerrar={onCerrar}>
      {error ? <Aviso tono="error">{error}</Aviso> : null}
      <Formulario>
        <CampoDeFecha etiqueta="Resuelto el" valor={fecha} onChange={setFecha} max={fechaDeJornada()} />
        <Campo etiqueta="Nota" valor={nota} onChange={setNota} multilinea compacto ayuda="Qué se reparó." />
      </Formulario>
      <Acciones>
        <Boton titulo="Cancelar" tono="secundario" onPress={onCerrar} />
        <Boton titulo={enviando ? 'Guardando…' : 'Marcar resuelto'} onPress={resolver} deshabilitado={enviando} />
      </Acciones>
    </Modal>
  );
}

/** Los intervalos de cada tipo de equipo (RF-23, RF-24). Solo la gerencia la ve. */
function VentanaIntervalos({ onCerrar, alTerminar }: { onCerrar: () => void; alTerminar: (mensaje: string) => void }) {
  const tipos = useListado<IntervalosDeTipoFila>(useCallback(async () => (await api.reportes.intervalos()).tipos, []));
  return (
    <Modal titulo="Intervalos de mantenimiento por tipo de equipo" onCerrar={onCerrar}>
      <Text style={estilos.apoyo}>
        Cada cuántas horas (horómetro) o kilómetros (odómetro) se hace cada servicio, y desde qué porcentaje se avisa. Una
        máquina puede tener el suyo propio desde su fila.
      </Text>
      {tipos.error ? <Aviso tono="error">{tipos.error}</Aviso> : null}
      {tipos.datos.map((t) => (
        <FilaDeIntervalos key={t.tipoVehiculoId} tipo={t} alGuardar={() => tipos.recargar()} />
      ))}
      <Acciones>
        <Boton titulo="Listo" onPress={() => alTerminar('Intervalos actualizados.')} />
      </Acciones>
    </Modal>
  );
}

function FilaDeIntervalos({ tipo, alGuardar }: { tipo: IntervalosDeTipoFila; alGuardar: () => void }) {
  const unidad = UNIDAD_DE_MEDIDOR[tipo.claseMedidor];
  return (
    <View style={estilos.filaIntervalo}>
      <Text style={estilos.nombreDeTipo}>{`${tipo.nombre} (${unidad})`}</Text>
      {CLASES_CON_INTERVALO.map((c) => (
        <EditorDeIntervalo
          key={c}
          clase={c}
          unidad={unidad}
          actual={tipo.clases[c]}
          guardar={(cada, aviso) =>
            api.reportes.guardarIntervalo({ tipoVehiculoId: tipo.tipoVehiculoId, clase: c, cada, avisoPorcentaje: aviso })
          }
          alGuardar={alGuardar}
          // El de arranque no se quita: no hay nada puesto.
          propio={tipo.clases[c].origen === 'tipo'}
        />
      ))}
    </View>
  );
}

/** El de una máquina concreta, que manda sobre el de su tipo (RF-25). */
function VentanaIntervaloDeMaquina({
  maquina,
  onCerrar,
  alTerminar,
}: {
  maquina: Maquina;
  onCerrar: () => void;
  alTerminar: (mensaje: string) => void;
}) {
  const unidad = UNIDAD_DE_MEDIDOR[maquina.claseMedidor];
  return (
    <Modal titulo={`Intervalos de ${maquina.codigo}`} onCerrar={onCerrar}>
      <Text style={estilos.apoyo}>
        Si se deja el de su tipo, la máquina sigue los cambios del tipo. «Volver al del tipo» quita el propio.
      </Text>
      {CLASES_CON_INTERVALO.map((c) => (
        <EditorDeIntervalo
          key={c}
          clase={c}
          unidad={unidad}
          actual={maquina.clases[c].intervalo}
          guardar={(cada, aviso) =>
            api.reportes.guardarIntervalo({ vehiculoId: maquina.vehiculoId, clase: c, cada, avisoPorcentaje: aviso })
          }
          alGuardar={() => alTerminar(`Intervalos de ${maquina.codigo} actualizados.`)}
          textoDeQuitar="Volver al del tipo"
          // Solo se quita el puesto a esta máquina; el del tipo se cambia en «Configurar intervalos».
          propio={maquina.clases[c].intervalo.origen === 'vehiculo'}
        />
      ))}
    </Modal>
  );
}

function EditorDeIntervalo({
  clase,
  unidad,
  actual,
  guardar,
  alGuardar,
  propio,
  textoDeQuitar = 'Volver al de arranque',
}: {
  clase: ClaseConIntervalo;
  unidad: string;
  actual: { cada: number; avisoPorcentaje: number };
  guardar: (cada: number | null, aviso: number) => Promise<unknown>;
  alGuardar: () => void;
  /** Hay uno puesto que se puede quitar. */
  propio: boolean;
  textoDeQuitar?: string;
}) {
  const [cada, setCada] = useState(String(actual.cada));
  const [aviso, setAviso] = useState(String(actual.avisoPorcentaje));
  const [error, setError] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  async function enviar(quitar: boolean) {
    const n = numeroEscrito(cada);
    const a = Number(aviso);
    if (!quitar && (n === null || n === undefined || n <= 0)) return setError('El intervalo tiene que ser mayor que cero.');
    if (!quitar && !(Number.isInteger(a) && a >= 50 && a <= 99)) return setError('El aviso va de 50 a 99 %.');
    setEnviando(true);
    setError(null);
    try {
      await guardar(quitar ? null : (n as number), quitar ? 90 : a);
      alGuardar();
    } catch (fallo) {
      setError(mensajeDe(fallo));
    } finally {
      setEnviando(false);
    }
  }

  return (
    <View style={estilos.editor}>
      <Formulario>
        <Campo etiqueta={`${NOMBRE_DE_CLASE[clase]}, cada (${unidad})`} valor={cada} onChange={setCada} soloNumeros ancho={170} />
        <Campo etiqueta="Aviso desde (%)" valor={aviso} onChange={setAviso} soloNumeros ancho={130} error={error ?? undefined} />
      </Formulario>
      <Acciones>
        <Boton titulo={enviando ? 'Guardando…' : 'Guardar'} tono="secundario" onPress={() => enviar(false)} deshabilitado={enviando} />
        {propio ? <Boton titulo={textoDeQuitar} tono="secundario" onPress={() => enviar(true)} deshabilitado={enviando} /> : null}
      </Acciones>
    </View>
  );
}

const estilos = StyleSheet.create({
  apoyo: { fontFamily: FuentePanel.texto, fontSize: TextoPanel.apoyo, color: Panel.textoApoyo },
  celda: { gap: 4, alignItems: 'flex-start' },
  filaIntervalo: { gap: 6, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: Panel.borde },
  nombreDeTipo: { fontFamily: FuentePanel.texto, fontWeight: '700', fontSize: TextoPanel.cuerpo, color: Panel.texto },
  editor: { gap: 4 },
});
