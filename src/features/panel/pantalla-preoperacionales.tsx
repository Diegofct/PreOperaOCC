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
import { fechaDeJornada } from '@/shared/rules/jornada';

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
import { DetallePreoperacional } from './detalle-preoperacional';

function sumarDias(fecha: string, dias: number): string {
  const base = new Date(`${fecha}T12:00:00Z`);
  base.setUTCDate(base.getUTCDate() + dias);
  return base.toISOString().slice(0, 10);
}

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

export default function PantallaPreoperacionales() {
  const [fecha, setFecha] = useState(fechaDeJornada());
  const [vehiculoId, setVehiculoId] = useState<string | null>(null);
  const [abierto, setAbierto] = useState<string | null>(null);

  const jornada = useListado<JornadaDePreoperacionales>(
    useCallback(async () => [await api.preoperacionales.delDia(fecha, vehiculoId)], [fecha, vehiculoId]),
  );
  const vehiculos = useListado<VehiculoFila>(useCallback(() => api.vehiculos.listar(), []));

  const dia = jornada.datos[0];

  /**
   * Buscar y filtrar lo firmado ese día.
   *
   * Con una obra y cinco máquinas sobra; con tres obras y cuarenta equipos, dar
   * con el preoperacional de una volqueta concreta es leer la tabla entera.
   */
  const [resultadoFiltro, setResultadoFiltro] = useState<string | null>(null);
  const filtrado = useListadoFiltrado(
    dia?.preoperacionales ?? [],
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
    { clave: 'hora', titulo: 'Hora', ancho: 80, pintar: (p) => <Celda>{hora(p.iniciadoEn)}</Celda> },
    {
      clave: 'vehiculo',
      titulo: 'Máquina',
      ancho: 140,
      pintar: (p) => <Celda>{p.vehiculoCodigo}</Celda>,
    },
    { clave: 'tipo', titulo: 'Tipo', ancho: 150, pintar: (p) => <Celda>{p.tipoNombre}</Celda> },
    {
      clave: 'operador',
      titulo: 'Operador',
      ancho: 220,
      pintar: (p) => <Celda>{p.operadorNombre}</Celda>,
    },
    {
      clave: 'medidores',
      titulo: 'Odóm. / Horóm.',
      ancho: 160,
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
      ancho: 210,
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
      clave: 'acciones',
      titulo: '',
      ancho: 100,
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
      <View style={estilos.dias}>
        <Boton titulo="◀ Día anterior" tono="secundario" onPress={() => setFecha(sumarDias(fecha, -1))} />
        <View style={estilos.fecha}>
          <Text style={estilos.fechaTexto}>{fechaLarga(fecha)}</Text>
          {fecha !== fechaDeJornada() ? (
            <Text style={estilos.fechaAyuda} onPress={() => setFecha(fechaDeJornada())}>
              Volver a hoy
            </Text>
          ) : null}
        </View>
        <Boton
          titulo="Día siguiente ▶"
          tono="secundario"
          onPress={() => setFecha(sumarDias(fecha, 1))}
          deshabilitado={fecha >= fechaDeJornada()}
        />
      </View>

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

      {dia && dia.pendientes.length > 0 ? (
        <Aviso tono="error">
          {dia.pendientes.length === 1
            ? `Hoy hay 1 máquina sin preoperacional: ${dia.pendientes[0].codigoInterno}. Si está trabajando, se está usando sin inspeccionar.`
            : `Hoy hay ${dia.pendientes.length} máquinas sin preoperacional (${dia.pendientes.map((m) => m.codigoInterno).join(', ')}). Si están trabajando, se están usando sin inspeccionar.`}
        </Aviso>
      ) : null}

      {dia ? (
        <Seccion titulo="Firmados este día">
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
            vacio={
              dia.preoperacionales.length === 0
                ? 'Aquí aparecen los preoperacionales que firman los operadores en obra, con su firma y sus fotos. Ninguno este día: si el operador ya lo llenó, llegará en cuanto su celular agarre señal.'
                : 'Ningún preoperacional coincide con lo que busca.'
            }
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
  dias: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three },
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
