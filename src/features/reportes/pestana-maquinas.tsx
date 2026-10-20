/**
 * La pestaña Máquinas de Reportes (spec 030, RF-11 a RF-21): qué hizo cada máquina en
 * el periodo, día por día.
 *
 *  · Día: una fila por máquina con si trabajó, quién la operó, las lecturas y lo del día.
 *  · Semana: una columna por día con el botón Sí/No y las horas o los kilómetros, y
 *    el total (RF-18).
 *  · Mes: los totales; el detalle por día se abre en una ventana (RF-19).
 */
import { useCallback, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { FuentePanel, Panel, TextoPanel } from '@/constants/theme';
import { api } from '@/features/panel/cliente-api';
import {
  Acciones,
  Aviso,
  Boton,
  Celda,
  Cifra,
  Cifras,
  Modal,
  Paginacion,
  Tabla,
  type Columna,
} from '@/features/panel/componentes';
import type { ConsultaDeReporte, ReporteFila } from '@/features/panel/contratos';
import { useListado } from '@/features/panel/marco';
import { POR_PAGINA, usePaginacion } from '@/features/panel/usar-listado-filtrado';
import { diaCorto, UNIDAD_DE_MEDIDOR } from '@/shared/rules/jornada';

import { AvisoDeAbiertas, cifra, EstadoDeMantenimientoEtiqueta, rotuloDelDia, TrabajoDelDia } from './comunes';

type Reporte = ReporteFila<'maquinas'>;
type Maquina = Reporte['maquinas'][number] & { id: string };
type Dia = Maquina['dias'][number] & { id: string };

export function PestanaMaquinas({
  consulta,
  alVerMantenimiento,
}: {
  consulta: ConsultaDeReporte;
  alVerMantenimiento: () => void;
}) {
  const { obraId, tipo, fecha } = consulta;
  const reporte = useListado<Reporte>(
    useCallback(async () => [await api.reportes.de('maquinas', { obraId, tipo, fecha })], [obraId, tipo, fecha]),
  );
  const datos = reporte.datos[0];
  const filas: Maquina[] = (datos?.maquinas ?? []).map((m) => ({ ...m, id: m.vehiculoId }));
  const pagina = usePaginacion(filas);
  const [abierta, setAbierta] = useState<Maquina | null>(null);

  const unidad = (m: Maquina) => UNIDAD_DE_MEDIDOR[m.claseMedidor];
  const maquina: Columna<Maquina> = {
    clave: 'maquina',
    titulo: 'Máquina',
    ancho: 190,
    ordenar: (m) => m.codigo,
    pintar: (m) => (
      <View>
        <Celda>{m.codigo}</Celda>
        {m.tipo ? <Text style={estilos.apoyo}>{m.tipo}</Text> : null}
      </View>
    ),
  };
  const mantenimiento: Columna<Maquina> = {
    clave: 'mantenimiento',
    titulo: 'Mantenimiento',
    ancho: 210,
    pintar: (m) =>
      m.mantenimiento ? (
        <EstadoDeMantenimientoEtiqueta {...m.mantenimiento} alPulsar={alVerMantenimiento} />
      ) : (
        <Text style={estilos.apoyo}>De otra obra</Text>
      ),
  };

  const columnasDelDia: Columna<Maquina>[] = [
    maquina,
    { clave: 'trabajo', titulo: 'Trabajó', ancho: 110, pintar: (m) => <TrabajoDelDia trabajo={m.dias[0].trabajo} /> },
    { clave: 'operador', titulo: 'Operador', ancho: 180, pintar: (m) => <Celda lineas={2}>{m.dias[0].operador ?? '—'}</Celda> },
    { clave: 'inicial', titulo: 'Inicial', ancho: 100, pintar: (m) => <Celda>{cifra(m.dias[0].inicial)}</Celda> },
    { clave: 'final', titulo: 'Final', ancho: 100, pintar: (m) => <Celda>{cifra(m.dias[0].final)}</Celda> },
    {
      clave: 'avance',
      titulo: 'Horas / km',
      ancho: 100,
      pintar: (m) => <Celda>{m.dias[0].avance === null ? '—' : `${cifra(m.dias[0].avance)} ${unidad(m)}`}</Celda>,
    },
    mantenimiento,
  ];

  const columnasDeLaSemana: Columna<Maquina>[] = [
    maquina,
    ...(datos?.periodo.dias ?? []).map(
      (dia, i): Columna<Maquina> => ({
        clave: dia,
        titulo: rotuloDelDia(dia),
        ancho: 84,
        anchoMinimo: 84,
        pintar: (m) => (
          <View style={estilos.dia}>
            <TrabajoDelDia trabajo={m.dias[i].trabajo} />
            {m.dias[i].trabajo === 'si' ? <Text style={estilos.apoyo}>{`${cifra(m.dias[i].avance)} ${unidad(m)}`}</Text> : null}
          </View>
        ),
      }),
    ),
    {
      clave: 'total',
      titulo: 'Total',
      ancho: 100,
      ordenar: (m) => String(m.total).padStart(12, '0'),
      pintar: (m) => <Celda>{`${cifra(m.total)} ${unidad(m)}`}</Celda>,
    },
    { clave: 'dias', titulo: 'Días', ancho: 70, pintar: (m) => <Celda>{String(m.diasTrabajados)}</Celda> },
  ];

  const columnasDelMes: Columna<Maquina>[] = [
    maquina,
    {
      clave: 'total',
      titulo: 'Total',
      ancho: 110,
      ordenar: (m) => String(m.total).padStart(12, '0'),
      pintar: (m) => <Celda>{`${cifra(m.total)} ${unidad(m)}`}</Celda>,
    },
    { clave: 'trabajados', titulo: 'Días trabajados', ancho: 110, pintar: (m) => <Celda>{String(m.diasTrabajados)}</Celda> },
    { clave: 'sin', titulo: 'Días sin trabajar', ancho: 110, pintar: (m) => <Celda>{String(m.diasSinTrabajar)}</Celda> },
    {
      clave: 'promedio',
      titulo: 'Promedio por día',
      ancho: 120,
      pintar: (m) => <Celda>{m.promedio === null ? '—' : `${cifra(m.promedio)} ${unidad(m)}`}</Celda>,
    },
    mantenimiento,
    {
      clave: 'detalle',
      titulo: '',
      ancho: 110,
      anchoMinimo: 110,
      pintar: (m) => (
        <Acciones>
          <Boton titulo="Por día" tono="secundario" onPress={() => setAbierta(m)} />
        </Acciones>
      ),
    },
  ];

  const columnas = tipo === 'dia' ? columnasDelDia : tipo === 'semana' ? columnasDeLaSemana : columnasDelMes;

  return (
    <>
      {reporte.error ? <Aviso tono="error">{reporte.error}</Aviso> : null}
      {datos ? (
        <>
          {/* Las cifras del periodo (RF-21). */}
          <Cifras>
            <Cifra titulo="Trabajaron" valor={String(datos.cifras.trabajaron)} pie="máquinas con algún día de trabajo" tono="bueno" />
            <Cifra titulo="No trabajaron" valor={String(datos.cifras.noTrabajaron)} pie="ningún día del periodo" />
            <Cifra titulo="Horas de máquina" valor={cifra(datos.cifras.horas)} pie="las de horómetro" />
            <Cifra titulo="Kilómetros" valor={cifra(datos.cifras.kilometros)} pie="los de odómetro" />
            <Cifra
              titulo="Mantenimiento vencido"
              valor={String(datos.cifras.mantenimientosVencidos)}
              pie="máquinas con aceite o preventivo vencido"
              tono={datos.cifras.mantenimientosVencidos > 0 ? 'malo' : 'neutro'}
            />
          </Cifras>
          <AvisoDeAbiertas abiertas={datos.abiertas} />
        </>
      ) : null}
      <Tabla
        columnas={columnas}
        filas={pagina.pagina}
        vacio={reporte.cargando ? 'Cargando el reporte…' : 'La obra no tiene máquinas ni bitácoras en este periodo.'}
      />
      <Paginacion pagina={pagina.paginaActual} porPagina={POR_PAGINA} total={pagina.total} onCambiar={pagina.irAPagina} />

      {abierta ? (
        <Modal titulo={`${abierta.codigo} · por día`} onCerrar={() => setAbierta(null)}>
          <DetalleDeLaMaquina maquina={abierta} />
        </Modal>
      ) : null}
    </>
  );
}

/** El detalle por día de una máquina en el mes (RF-19). */
function DetalleDeLaMaquina({ maquina }: { maquina: Maquina }) {
  const unidad = UNIDAD_DE_MEDIDOR[maquina.claseMedidor];
  const filas: Dia[] = maquina.dias.filter((d) => d.trabajo !== 'sin_bitacora').map((d) => ({ ...d, id: d.fecha }));
  const columnas: Columna<Dia>[] = [
    { clave: 'fecha', titulo: 'Día', ancho: 90, pintar: (d) => <Celda>{diaCorto(d.fecha)}</Celda> },
    { clave: 'trabajo', titulo: 'Trabajó', ancho: 100, pintar: (d) => <TrabajoDelDia trabajo={d.trabajo} /> },
    { clave: 'operador', titulo: 'Operador', ancho: 170, pintar: (d) => <Celda lineas={2}>{d.operador ?? '—'}</Celda> },
    {
      clave: 'avance',
      titulo: 'Horas / km',
      ancho: 100,
      pintar: (d) => <Celda>{d.avance === null ? '—' : `${cifra(d.avance)} ${unidad}`}</Celda>,
    },
  ];
  return <Tabla columnas={columnas} filas={filas} vacio="Ningún día con bitácora en este periodo." variante="desnuda" />;
}

const estilos = StyleSheet.create({
  apoyo: { fontFamily: FuentePanel.texto, fontSize: TextoPanel.apoyo, color: Panel.textoApoyo },
  dia: { gap: 2, alignItems: 'flex-start' },
});
