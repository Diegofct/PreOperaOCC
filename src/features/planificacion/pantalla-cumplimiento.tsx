/**
 * Cumplimiento de la planificación (spec 043, RF-54, RF-56, RF-58 a RF-74, RF-82, RF-123 a
 * RF-130). La ven la Gerencia, el Director de Proyectos, el Director de Obra y el Residente.
 *
 * Lo que ven todos son las cantidades: meta, ejecutado, porcentaje y pendientes por ítem, lo
 * ejecutado fuera de la planificación y los avisos. La plata (`plata-del-cumplimiento.tsx`) se
 * pinta si el informe la trae: al Residente le llega ya sin plata (RF-88, RF-89), así que aquí no
 * se esconde nada, y sus descargas salen igual de limpias, del mismo objeto en el servidor.
 *
 * El periodo se escoge como en Reportes, con las mismas reglas (`periodoDe`, `periodoVecino`,
 * `textoDelPeriodo`): semana de lunes a domingo o mes del calendario (RF-58, RF-59). El selector
 * de Reportes está escrito dentro de su pantalla; este es el mismo, sin el día, que aquí no aplica.
 * Ambos van en la dirección (`periodo`, `fecha`), para que recargar o compartir el enlace deje a
 * quien lo abre en el mismo periodo.
 *
 * Ninguna cifra se calcula en esta pantalla: todas vienen hechas del servidor (RF-96).
 */
import { useCallback, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { FuentePanel, Panel, TextoPanel } from '@/constants/theme';
import { useObraDeLaRuta } from '@/features/empresas/contexto-empresa';
import { api, mensajeDe } from '@/features/panel/cliente-api';
import { Acciones, Aviso, Boton, CampoDeFecha, Celda, Etiqueta, Seccion, Tabla, type Columna } from '@/features/panel/componentes';
import { MarcoPantalla, useListado } from '@/features/panel/marco';
import { guardarArchivo } from '@/features/panel/guardar-archivo';
import { informeConPlata, type InformeRespuesta } from '@/features/panel/planificacion';
import { useParametroDeDireccion } from '@/features/panel/usar-parametro-direccion';
import { textoDelPeriodo } from '@/features/reportes/exportar';
import { etiquetaDeEstimada, type ActividadFueraDeLaPlanificacion, type FilaEnCantidades } from '@/shared/rules/cumplimiento-de-obra';
import { diaCorto, fechaDeJornada } from '@/shared/rules/jornada';
import { periodoDe, periodoVecino } from '@/shared/rules/periodos';

import { PlataDelCumplimiento } from './plata-del-cumplimiento';

type TipoDelInforme = 'semana' | 'mes';
const TIPOS: { valor: TipoDelInforme; titulo: string }[] = [
  { valor: 'semana', titulo: 'Semana' },
  { valor: 'mes', titulo: 'Mes' },
];
const ANTERIOR: Record<TipoDelInforme, string> = { semana: 'Semana anterior', mes: 'Mes anterior' };
const SIGUIENTE: Record<TipoDelInforme, string> = { semana: 'Semana siguiente', mes: 'Mes siguiente' };

/** Una cantidad como se lee: hasta tres decimales, con coma. */
function cantidad(n: number | null): string {
  return n === null ? '—' : n.toLocaleString('es-CO', { maximumFractionDigits: 3 });
}

function plural(n: number, uno: string, varios: string): string {
  return `${n} ${n === 1 ? uno : varios}`;
}

export default function PantallaCumplimiento() {
  const obraId = useObraDeLaRuta();
  const hoy = fechaDeJornada();
  const [tipoLeido, setTipo] = useParametroDeDireccion('periodo', 'semana');
  const tipo: TipoDelInforme = tipoLeido === 'mes' ? 'mes' : 'semana';
  const [fechaLeida, setFecha] = useParametroDeDireccion('fecha', hoy);
  const fecha = /^\d{4}-\d{2}-\d{2}$/.test(fechaLeida) ? fechaLeida : hoy;
  const periodo = periodoDe(tipo, fecha);
  const esElActual = periodo.desde <= hoy && hoy <= periodo.hasta;

  const informe = useListado<InformeRespuesta>(
    useCallback(() => (obraId ? api.cumplimiento.informe(obraId, tipo, fecha).then((i) => [i]) : Promise.resolve([])), [obraId, tipo, fecha]),
  );
  const datos = informe.datos[0];
  const [bajando, setBajando] = useState<'excel' | 'pdf' | null>(null);
  const [errorDeDescarga, setErrorDeDescarga] = useState<string | null>(null);

  /** RF-92, RF-93: el mismo informe del periodo que se ve, en archivo. */
  async function bajar(formato: 'excel' | 'pdf') {
    if (!obraId) return;
    setBajando(formato);
    setErrorDeDescarga(null);
    try {
      const { contenido, nombre } = await api.cumplimiento.descargar(obraId, tipo, fecha, formato);
      guardarArchivo(contenido, nombre);
    } catch (fallo) {
      setErrorDeDescarga(mensajeDe(fallo));
    } finally {
      setBajando(null);
    }
  }

  return (
    <MarcoPantalla
      exigeObra
      titulo="Cumplimiento"
      descripcion="Qué se cumplió de la planificación aprobada en la semana o el mes, con lo que registran los partes diarios."
      error={informe.error}
      cargando={informe.cargando}
    >
      <View style={estilos.columna}>
        <Acciones>
          {TIPOS.map((t) => (
            <Boton key={t.valor} titulo={t.titulo} tono={tipo === t.valor ? 'primario' : 'secundario'} onPress={() => setTipo(t.valor)} />
          ))}
        </Acciones>
        <View style={estilos.periodo}>
          <Boton titulo={`‹ ${ANTERIOR[tipo]}`} tono="secundario" onPress={() => setFecha(periodoVecino(periodo, -1).desde)} />
          <Text style={estilos.textoDelPeriodo} accessibilityRole="header">
            {textoDelPeriodo(periodo)}
          </Text>
          <Boton titulo={`${SIGUIENTE[tipo]} ›`} tono="secundario" onPress={() => setFecha(periodoVecino(periodo, 1).desde)} />
          {esElActual ? null : <Boton titulo="Volver a hoy" tono="secundario" onPress={() => setFecha(hoy)} />}
          <CampoDeFecha etiqueta="Ir a la fecha" valor={fecha} onChange={(v) => v && setFecha(v)} max={hoy} />
        </View>

        <Acciones>
          <Boton titulo={bajando === 'excel' ? 'Preparando…' : 'Descargar Excel'} tono="secundario" onPress={() => void bajar('excel')} deshabilitado={bajando !== null} />
          <Boton titulo={bajando === 'pdf' ? 'Preparando…' : 'Descargar PDF'} tono="secundario" onPress={() => void bajar('pdf')} deshabilitado={bajando !== null} />
        </Acciones>
        {errorDeDescarga ? <Aviso tono="error">{errorDeDescarga}</Aviso> : null}

        {datos ? <Informe datos={datos} /> : null}
        {datos && informeConPlata(datos) ? <PlataDelCumplimiento informe={datos} /> : null}
      </View>
    </MarcoPantalla>
  );
}

function Avisos({ datos }: { datos: InformeRespuesta }) {
  const { avisos } = datos;
  const versiones = datos.versiones.map((v) => `v${v.numeroVersion} del ${diaCorto(v.desde)} al ${diaCorto(v.hasta)}`);
  return (
    <View style={estilos.columna}>
      {datos.sinPlanificacion ? (
        <Aviso tono="info">
          {datos.versiones.length === 0
            ? 'Sin planificación aprobada: este periodo no tiene metas. Lo ejecutado se ve abajo, como fuera de la planificación.'
            : 'Sin planificación aprobada en parte del periodo: esos días no tienen meta.'}
        </Aviso>
      ) : null}
      {versiones.length > 0 ? <Text style={estilos.nota}>{`Medido con la planificación ${versiones.join(' y ')}.`}</Text> : null}
      {avisos.diasAbiertos > 0 ? (
        <Aviso tono="info">
          {`${plural(avisos.diasAbiertos, 'parte sigue abierto', 'partes siguen abiertos')}: lo que registran ya cuenta, y las cifras pueden cambiar cuando se cierren.`}
        </Aviso>
      ) : null}
      {avisos.diasSinParte > 0 ? (
        <Aviso tono="info">{`${plural(avisos.diasSinParte, 'día de trabajo no tiene', 'días de trabajo no tienen')} parte: lo que se hizo esos días no está contado.`}</Aviso>
      ) : null}
    </View>
  );
}

function Informe({ datos }: { datos: InformeRespuesta }) {
  const filas = datos.filas.map((f) => ({ ...f, id: f.llave }));
  // Caben en `MaxContentWidthPanel`: 150 + 60 + 180 + 110 + 100 + 60 + 110 + 100 + 110 + 110 = 1 090, más 11 separaciones.
  const columnas: Columna<FilaEnCantidades & { id: string }>[] = [
    { clave: 'capitulo', titulo: 'Capítulo', ancho: 150, pintar: (f) => <Celda>{f.capitulo}</Celda>, ordenar: (f) => f.capitulo },
    { clave: 'item', titulo: 'Ítem', ancho: 60, pintar: (f) => <Celda>{f.item}</Celda>, ordenar: (f) => f.item },
    { clave: 'descripcion', titulo: 'Descripción', ancho: 180, pintar: (f) => <Celda>{`${f.descripcion}${f.unidad ? ` (${f.unidad})` : ''}`}</Celda> },
    {
      clave: 'meta',
      titulo: 'Meta',
      ancho: 110,
      pintar: (f) => (
        <View style={estilos.celda}>
          <Celda>{cantidad(f.meta)}</Celda>
          {/* Spec 044, RF-95: con días del plan y días estimados, «Parcialmente estimada (n días del plan)». */}
          {etiquetaDeEstimada(f) ? <Etiqueta tono="neutro">{etiquetaDeEstimada(f)}</Etiqueta> : null}
        </View>
      ),
    },
    { clave: 'ejecutado', titulo: 'Ejecutado', ancho: 100, pintar: (f) => <Celda>{cantidad(f.ejecutado)}</Celda> },
    { clave: 'porcentaje', titulo: '%', ancho: 60, pintar: (f) => <Celda>{f.porcentaje === null ? '—' : `${f.porcentaje} %`}</Celda> },
    { clave: 'pendiente', titulo: 'Pendiente del periodo', ancho: 110, pintar: (f) => <Celda>{cantidad(f.pendientePeriodo)}</Celda> },
    { clave: 'acumulado', titulo: 'Acumulado', ancho: 100, pintar: (f) => <Celda>{cantidad(f.acumulado)}</Celda> },
    { clave: 'pendienteTotal', titulo: 'Pendiente de la obra', ancho: 110, pintar: (f) => <Celda>{cantidad(f.pendienteTotal)}</Celda> },
    {
      clave: 'estado',
      titulo: 'Estado',
      ancho: 110,
      pintar: (f) =>
        f.estado === 'meta_cumplida' ? (
          <Etiqueta tono="bueno">Meta cumplida</Etiqueta>
        ) : f.estado === 'sin_programacion' ? (
          <Etiqueta tono="neutro">Sin programación</Etiqueta>
        ) : null,
    },
  ];

  const fuera = datos.fuera.map((a, i) => ({ ...a, id: String(i) }));
  // 100 + 70 + 300 + 360 + 120 + 130 = 1 080, más 7 separaciones.
  const columnasDeFuera: Columna<ActividadFueraDeLaPlanificacion & { id: string }>[] = [
    { clave: 'fecha', titulo: 'Fecha', ancho: 100, pintar: (a) => <Celda>{diaCorto(a.fecha)}</Celda>, ordenar: (a) => a.fecha },
    { clave: 'item', titulo: 'Ítem', ancho: 70, pintar: (a) => <Celda>{a.item ?? '—'}</Celda> },
    { clave: 'nombre', titulo: 'Actividad', ancho: 300, pintar: (a) => <Celda>{a.nombre}</Celda> },
    { clave: 'descripcion', titulo: 'Descripción', ancho: 360, pintar: (a) => <Celda>{a.descripcion}</Celda> },
    { clave: 'cantidad', titulo: 'Cantidad', ancho: 120, pintar: (a) => <Celda>{`${cantidad(a.cantidad)}${a.unidad ? ` ${a.unidad}` : ''}`}</Celda> },
    {
      clave: 'marca',
      titulo: '',
      ancho: 130,
      pintar: (a) => (a.marca === 'sin_capitulo' ? <Etiqueta tono="atencion">Sin capítulo</Etiqueta> : null),
    },
  ];

  return (
    <View style={estilos.columna}>
      <Avisos datos={datos} />
      <Seccion titulo="Por ítem de la planificación">
        <View style={estilos.columna}>
          <Tabla filas={filas} columnas={columnas} vacio="Ningún ítem de la planificación tiene meta ni ejecución en este periodo." />
          <Text style={estilos.nota}>
            La meta de la semana sale de repartir la del mes entre sus días de trabajo (lunes a sábado, sin festivos), y por eso
            lleva «Estimada». Lo no cumplido no pasa a la semana siguiente.
          </Text>
        </View>
      </Seccion>
      <Seccion titulo={`Fuera de la planificación (${fuera.length})`}>
        <Tabla filas={fuera} columnas={columnasDeFuera} vacio="Todo lo ejecutado en el periodo está en la planificación." />
      </Seccion>
    </View>
  );
}

const estilos = StyleSheet.create({
  columna: { gap: 12 },
  periodo: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'flex-end', gap: 8 },
  textoDelPeriodo: { fontFamily: FuentePanel.texto, fontWeight: '700', fontSize: TextoPanel.seccion, color: Panel.texto, paddingBottom: 8 },
  nota: { fontFamily: FuentePanel.texto, fontSize: TextoPanel.apoyo, color: Panel.textoApoyo },
  celda: { gap: 4, alignItems: 'flex-start' },
});
