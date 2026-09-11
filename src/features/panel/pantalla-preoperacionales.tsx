/**
 * Los preoperacionales firmados, día a día.
 *
 * Es la pantalla por la que existe todo lo demás. OCC no montó este sistema para
 * que el operador tuviera una lista bonita en el celular, sino para poder
 * responder dos preguntas: **qué se inspeccionó hoy y qué salió mal**.
 *
 * Por eso el orden no es cronológico: los **NO APTO van primero**, y las
 * máquinas que hoy no tienen formato salen arriba del todo en ámbar. Un listado
 * ordenado por hora entierra justo el registro que obliga a alguien a hacer algo.
 *
 * Las imágenes ya suben. La firma viaja con el resto del formato en cuanto hay
 * señal, porque es lo que hace válida el acta; las fotos de hallazgos esperan a
 * una WiFi para no gastarle el plan de datos al operador, así que pueden llegar
 * más tarde. La pantalla lo dice en vez de disimularlo, que es lo mismo que
 * hacía antes por el motivo contrario.
 */
import { useCallback, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Colors, Estado, Radio, Spacing, TextoPanel } from '@/constants/theme';
import { fechaDeJornada, type Periodo, sumarDias } from '@/shared/rules/jornada';

import { api } from './cliente-api';
import {
  Aviso,
  BarraDeListado,
  Boton,
  Celda,
  Etiqueta,
  Paginacion,
  Seccion,
  Selector,
  Tabla,
  type Columna,
} from './componentes';
import {
  ETIQUETA_RESULTADO,
  type JornadaDePreoperacionales,
  type PreoperacionalFila,
  type VehiculoFila,
} from './contratos';
import { MarcoPantalla, useListado } from './marco';
import { POR_PAGINA, useListadoFiltrado } from './usar-listado-filtrado';
import { useParametroDeDireccion } from './usar-parametro-direccion';
import { DetallePreoperacional } from './detalle-preoperacional';

function fechaLarga(fecha: string): string {
  return new Date(`${fecha}T12:00:00Z`).toLocaleDateString('es-CO', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  });
}

/** La hora en que el operador firmó, en hora de obra. */
function hora(iso: string): string {
  return new Date(iso).toLocaleTimeString('es-CO', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'America/Bogota',
  });
}

/** El día de obra de un instante, `YYYY-MM-DD`, en hora de Colombia. */
function diaDeObra(iso: string): string {
  return fechaDeJornada(Date.parse(iso));
}

/** «5 al 11 de septiembre», o un solo día si los extremos coinciden. */
function rangoLegible(desde: string, hasta: string): string {
  if (desde === hasta) return fechaLarga(desde);
  return `${fechaLarga(desde)} — ${fechaLarga(hasta)}`;
}

/**
 * Qué decir cuando la tabla está vacía, que no es una sola cosa.
 *
 * Hay cuatro vacíos distintos y se parecían todos: no alcanzar ninguna obra, no
 * haber nada en el periodo, y que lo escondan la búsqueda o el filtro. El
 * primero es el que más caro sale —una cuenta mal configurada ve un panel que
 * parece vacío y nadie sabe por qué— y es el que el servidor nos dice
 * (spec 006 / RF-24, RF-25).
 */
function textoDelVacio(
  ventana: JornadaDePreoperacionales | undefined,
  busqueda: string,
  resultadoFiltro: string | null,
): string {
  if (!ventana) return 'Cargando…';

  if (ventana.preoperacionales.length > 0) {
    const filtros = [
      busqueda.trim().length > 0 ? `la búsqueda «${busqueda.trim()}»` : null,
      resultadoFiltro !== null ? 'el filtro de resultado' : null,
    ].filter((x): x is string => x !== null);
    return filtros.length > 0
      ? `Hay ${ventana.preoperacionales.length} preoperacional(es) en este periodo, pero ninguno pasa ${filtros.join(' ni ')}. Quítelo para verlos todos.`
      : 'Ningún preoperacional coincide con lo que busca.';
  }

  if (ventana.motivoVacio === 'sin_obra') {
    return (
      'Su cuenta no tiene ninguna obra asignada, así que no alcanza ningún registro. ' +
      'No es que no haya preoperacionales: es que no hay ninguno que le corresponda ver. ' +
      'Pídale a la gerencia que le asigne su obra.'
    );
  }

  return (
    'Aquí aparecen los preoperacionales que firman los operadores en obra, con su firma y ' +
    'sus fotos. Ninguno en este periodo: si el operador ya lo llenó, llegará en cuanto su ' +
    'celular agarre señal.'
  );
}

export default function PantallaPreoperacionales() {
  /**
   * Se abre en la **última semana**, no en hoy.
   *
   * Un acta puede tardar días en subir —el celular sube cuando agarra señal— y
   * con la pantalla anclada al día de hoy quedaba invisible: para encontrarla
   * había que pulsar «día anterior» tantas veces como días llevara de retraso,
   * sospechando que existía. Pasó de verdad con un preoperacional de VOL-01.
   *
   * El periodo vive en la dirección, así que recargar no lo pierde y el enlace
   * se le puede pasar a otro (spec 006 / RF-30).
   */
  const [periodo, setPeriodo] = useParametroDeDireccion('periodo', 'semana');
  /** Un día concreto, cuando se navega a uno. `null` mientras se mire el periodo. */
  const [dia, setDia] = useState<string | null>(null);
  const [vehiculoId, setVehiculoId] = useState<string | null>(null);
  const [abierto, setAbierto] = useState<string | null>(null);

  const jornada = useListado<JornadaDePreoperacionales>(
    useCallback(
      async () => [
        dia
          ? await api.preoperacionales.delDia(dia, vehiculoId)
          : await api.preoperacionales.delPeriodo(periodo as Periodo, vehiculoId),
      ],
      [dia, periodo, vehiculoId],
    ),
  );
  const vehiculos = useListado<VehiculoFila>(useCallback(() => api.vehiculos.listar(), []));

  const ventana = jornada.datos[0];

  /**
   * Buscar y filtrar lo firmado ese día.
   *
   * Con una obra y cinco máquinas sobra; con tres obras y cuarenta equipos, dar
   * con el preoperacional de una volqueta concreta es leer la tabla entera.
   */
  const [resultadoFiltro, setResultadoFiltro] = useState<string | null>(null);
  const filtrado = useListadoFiltrado(
    ventana?.preoperacionales ?? [],
    (p) => [p.vehiculoCodigo, p.tipoNombre, p.operadorNombre, p.obraNombre],
    useCallback(
      (p: PreoperacionalFila) => resultadoFiltro === null || p.resultado === resultadoFiltro,
      [resultadoFiltro],
    ),
  );

  if (abierto) {
    return (
      <DetallePreoperacional
        id={abierto}
        onVolver={() => setAbierto(null)}
        onAnulado={() => {
          setAbierto(null);
          jornada.recargar();
        }}
      />
    );
  }

  const columnas: Columna<PreoperacionalFila>[] = [
    {
      clave: 'dia',
      titulo: 'Día de trabajo',
      ancho: 110,
      // Con un periodo de varios días, la hora sola no ubica nada.
      pintar: (p) => (
        <Celda>
          {diaDeObra(p.iniciadoEn)} · {hora(p.iniciadoEn)}
        </Celda>
      ),
    },
    {
      clave: 'vehiculo',
      titulo: 'Máquina',
      ancho: 130,
      pintar: (p) => <Celda>{p.vehiculoCodigo}</Celda>,
    },
    { clave: 'tipo', titulo: 'Tipo', ancho: 120, pintar: (p) => <Celda>{p.tipoNombre}</Celda> },
    {
      clave: 'operador',
      titulo: 'Operador',
      ancho: 190,
      pintar: (p) => <Celda>{p.operadorNombre}</Celda>,
    },
    {
      clave: 'medidores',
      titulo: 'Odóm. / Horóm.',
      ancho: 150,
      pintar: (p) => (
        <Celda>
          {p.odometroKm !== null ? `${p.odometroKm} km` : '—'} ·{' '}
          {p.horometroH !== null ? `${p.horometroH} h` : '—'}
        </Celda>
      ),
    },
    {
      clave: 'resultado',
      titulo: 'Resultado',
      ancho: 200,
      pintar: (p) =>
        p.anuladoEn ? (
          <Etiqueta tono="neutro">Anulado</Etiqueta>
        ) : p.resultado === 'no_apto' ? (
          <Etiqueta tono="malo">
            {`NO APTO · ${p.cantidadInmovilizantes} ${p.cantidadInmovilizantes === 1 ? 'ítem' : 'ítems'}`}
          </Etiqueta>
        ) : p.resultado === 'apto_con_observaciones' ? (
          <Etiqueta tono="atencion">Con observaciones</Etiqueta>
        ) : (
          <Etiqueta tono="bueno">APTO</Etiqueta>
        ),
    },
    {
      clave: 'llego',
      titulo: 'Llegó',
      ancho: 110,
      /**
       * Cuándo lo recibió el servidor, y una marca si no es el mismo día en que
       * se firmó. El retraso no es un fallo —el celular sube cuando hay señal—
       * pero explica por qué un acta aparece en un periodo que no le toca.
       */
      pintar: (p) => {
        const llegada = diaDeObra(p.recibidoEn);
        return llegada === diaDeObra(p.iniciadoEn) ? (
          <Celda>{llegada}</Celda>
        ) : (
          <Etiqueta tono="atencion">{`${llegada} · tarde`}</Etiqueta>
        );
      },
    },
    {
      clave: 'acciones',
      titulo: '',
      ancho: 90,
      pintar: (p) => <Boton titulo="Ver" tono="secundario" onPress={() => setAbierto(p.id)} />,
    },
  ];

  return (
    <MarcoPantalla
      modulo="preoperacionales"
      titulo="Preoperacionales"
      descripcion="Lo que los operadores inspeccionaron y firmaron en obra. Suben solos del celular en cuanto el equipo agarra señal."
      error={jornada.error ?? vehiculos.error}
      cargando={jornada.cargando || vehiculos.cargando}
    >
      {dia ? (
        <View style={estilos.dias}>
          <Boton
            titulo="◀ Día anterior"
            tono="secundario"
            onPress={() => setDia(sumarDias(dia, -1))}
          />
          <View style={estilos.fecha}>
            <Text style={estilos.fechaTexto}>{fechaLarga(dia)}</Text>
            <Text style={estilos.fechaAyuda} onPress={() => setDia(null)}>
              Volver al periodo
            </Text>
          </View>
          <Boton
            titulo="Día siguiente ▶"
            tono="secundario"
            onPress={() => setDia(sumarDias(dia, 1))}
            deshabilitado={dia >= fechaDeJornada()}
          />
        </View>
      ) : (
        <View style={estilos.dias}>
          <Selector
            etiqueta="Periodo"
            valor={periodo}
            opciones={[
              { valor: 'hoy', etiqueta: 'Hoy' },
              { valor: 'semana', etiqueta: 'Última semana' },
              { valor: 'mes', etiqueta: 'Último mes' },
            ]}
            onChange={(v) => setPeriodo(v ?? 'semana')}
            ancho={230}
          />
          <View style={estilos.fecha}>
            <Text style={estilos.fechaTexto}>
              {ventana ? rangoLegible(ventana.desde, ventana.hasta) : '…'}
            </Text>
            <Text style={estilos.fechaAyuda} onPress={() => setDia(fechaDeJornada())}>
              Ver un día concreto
            </Text>
          </View>
        </View>
      )}

      <View style={estilos.filtro}>
      <Selector
        etiqueta="Filtrar por máquina"
        valor={vehiculoId}
        opciones={vehiculos.datos.map((v) => ({
          valor: v.id,
          etiqueta: v.codigoInterno,
          detalle: v.tipoNombre,
        }))}
        onChange={setVehiculoId}
        permiteVacio
        vacio="Todas las máquinas"
        ancho={280}
      />
      </View>

      {ventana && ventana.pendientes.length > 0 ? (
        <Aviso tono="error">
          {ventana.pendientes.length === 1
            ? `Hoy hay 1 máquina sin preoperacional: ${ventana.pendientes[0].codigoInterno}. Si está trabajando, se está usando sin inspeccionar.`
            : `Hoy hay ${ventana.pendientes.length} máquinas sin preoperacional (${ventana.pendientes.map((m) => m.codigoInterno).join(', ')}). Si están trabajando, se están usando sin inspeccionar.`}
        </Aviso>
      ) : null}

      {ventana ? (
        <Seccion
          titulo={dia ? 'Firmados este día' : 'Firmados en el periodo'}
          // Por encima de la nota del pie, que tiene fondo propio y se pintaba
          // sobre el desplegable de «Resultado».
          apilado={1}
        >
          <BarraDeListado
            busqueda={filtrado.busqueda}
            onBuscar={filtrado.buscar}
            total={filtrado.total}
            mostradas={filtrado.coincidencias}
          >
            <Selector
              etiqueta="Resultado"
              valor={resultadoFiltro}
              opciones={[
                { valor: 'no_apto', etiqueta: 'NO APTO' },
                { valor: 'apto_con_observaciones', etiqueta: 'Apto con observaciones' },
                { valor: 'apto', etiqueta: 'Apto' },
              ]}
              onChange={setResultadoFiltro}
              permiteVacio
              vacio="Cualquier resultado"
              ancho={230}
            />
          </BarraDeListado>

          <Tabla
            columnas={columnas}
            filas={filtrado.pagina}
            vacio={textoDelVacio(ventana, filtrado.busqueda, resultadoFiltro)}
          />

          <Paginacion
            pagina={filtrado.paginaActual}
            porPagina={POR_PAGINA}
            total={filtrado.coincidencias}
            onCambiar={filtrado.irAPagina}
          />
        </Seccion>
      ) : null}

      <View style={estilos.nota}>
        <Text style={estilos.notaTexto}>
          El formato llega completo, con su firma, en cuanto el celular agarra señal. Las fotos de
          los hallazgos se suman al entrar a una WiFi, para no gastarle el plan de datos al
          operador; el detalle de cada acta marca las que vienen en camino.
        </Text>
      </View>
    </MarcoPantalla>
  );
}

const estilos = StyleSheet.create({
  /**
   * La fila del periodo lleva un desplegable, así que se pinta por encima de lo
   * que viene debajo. Sin esto, React Native Web deja a todos los hermanos
   * empatados a `z-index: 0` y la lista abierta se mete detrás del filtro de
   * máquina y del aviso de flota.
   */
  dias: { zIndex: 3, flexDirection: 'row', alignItems: 'center', gap: Spacing.three },
  /** El filtro de máquina: por encima de la tabla, por debajo del periodo. */
  filtro: { zIndex: 2 },
  fecha: { flex: 1, alignItems: 'center' },
  fechaTexto: { fontSize: TextoPanel.seccion, fontWeight: '700', color: Colors.light.text },
  fechaAyuda: { fontSize: TextoPanel.cuerpo, color: Estado.info, fontWeight: '600' },
  nota: {
    padding: Spacing.three,
    borderRadius: Radio.md,
    backgroundColor: Colors.light.backgroundElement,
  },
  notaTexto: { fontSize: TextoPanel.cuerpo, lineHeight: 22, color: Colors.light.textSecondary },
});

export { ETIQUETA_RESULTADO };
