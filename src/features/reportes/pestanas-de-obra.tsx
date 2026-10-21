/**
 * Las pestañas Actividades, Cantera, Control de calidad, y Clima y novedades de
 * Reportes (spec 030, RF-51 a RF-55): lo que la obra hizo en el periodo, sumado.
 *
 * Van juntas porque son tablas de lectura sin más: ninguna escribe nada ni tiene
 * ventanas propias, salvo el detalle por día de un ítem.
 */
import { router } from 'expo-router';
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
  Etiqueta,
  Modal,
  Paginacion,
  Seccion,
  Tabla,
  type Columna,
} from '@/features/panel/componentes';
import type { ConsultaDeReporte, PestanaDeReporte, ReporteFila } from '@/features/panel/contratos';
import { useListado } from '@/features/panel/marco';
import { POR_PAGINA, usePaginacion } from '@/features/panel/usar-listado-filtrado';
import { diaCorto } from '@/shared/rules/jornada';

import { AvisoDeAbiertas, BarraDeProporcion, cifra } from './comunes';

/** El reporte de una pestaña, con su carga y su error. */
function useReporte<P extends PestanaDeReporte>(pestana: P, { obraId, tipo, fecha }: ConsultaDeReporte) {
  const reporte = useListado<ReporteFila<P>>(
    useCallback(async () => [await api.reportes.de(pestana, { obraId, tipo, fecha })], [pestana, obraId, tipo, fecha]),
  );
  return { ...reporte, datos: reporte.datos[0] };
}

const conId = <T,>(filas: readonly T[], id: (f: T, i: number) => string) => filas.map((f, i) => ({ ...f, id: id(f, i) }));

/* ── Actividades (RF-51, RF-52) ───────────────────────────────────────── */

type Item = ReporteFila<'actividades'>['items'][number] & { id: string };
type Otra = ReporteFila<'actividades'>['otras'][number] & { id: string };

export function PestanaActividades({ consulta }: { consulta: ConsultaDeReporte }) {
  const { datos, error, cargando } = useReporte('actividades', consulta);
  const [abierto, setAbierto] = useState<Item | null>(null);
  // Con presupuesto, el mismo ítem puede estar en varios capítulos: la fila es «capítulo|ítem» (spec 031).
  const items = conId(datos?.items ?? [], (i) => (i.capituloId ? `${i.capituloId}|${i.item}` : i.item));
  const otras = conId(datos?.otras ?? [], (o, i) => `${o.fecha}-${i}`);
  const pagina = usePaginacion(items);

  const columnas: Columna<Item>[] = [
    { clave: 'item', titulo: 'Ítem', ancho: 80, pintar: (i) => <Celda>{i.item}</Celda> },
    { clave: 'actividad', titulo: 'Actividad', ancho: 300, pintar: (i) => <Celda lineas={2}>{i.nombre}</Celda> },
    {
      clave: 'capitulo',
      titulo: 'Capítulo',
      ancho: 220,
      pintar: (i) => <Celda lineas={2}>{i.capitulo ? [i.capitulo, i.grupo].filter(Boolean).join(' · ') : 'Sin capítulo'}</Celda>,
    },
    {
      clave: 'cantidad',
      titulo: 'En el periodo',
      ancho: 130,
      pintar: (i) => <Celda>{`${cifra(i.cantidad, 2)} ${i.unidad}`}</Celda>,
    },
    { clave: 'dias', titulo: 'Días', ancho: 60, pintar: (i) => <Celda>{String(i.dias.length)}</Celda> },
    {
      clave: 'avance',
      titulo: 'Acumulado / contratado',
      ancho: 210,
      pintar: (i) =>
        i.contratado !== null ? (
          <BarraDeProporcion
            valor={i.acumulado ?? 0}
            maximo={i.contratado}
            texto={`${cifra(i.acumulado ?? 0, 2)} de ${cifra(i.contratado, 2)} · ${cifra(i.porcentaje ?? 0, 1)} %`}
          />
        ) : (
          <Celda>—</Celda>
        ),
    },
    {
      clave: 'detalle',
      titulo: '',
      ancho: 110,
      anchoMinimo: 110,
      pintar: (i) => (
        <Acciones>
          <Boton titulo="Por día" tono="secundario" onPress={() => setAbierto(i)} />
        </Acciones>
      ),
    },
  ];
  const columnasDeOtras: Columna<Otra>[] = [
    { clave: 'fecha', titulo: 'Día', ancho: 80, pintar: (o) => <Celda>{diaCorto(o.fecha)}</Celda> },
    { clave: 'actividad', titulo: 'Actividad', ancho: 220, pintar: (o) => <Celda lineas={2}>{o.nombre}</Celda> },
    { clave: 'descripcion', titulo: 'Descripción', ancho: 280, pintar: (o) => <Celda lineas={2}>{o.descripcion || '—'}</Celda> },
    {
      clave: 'cantidad',
      titulo: 'Cantidad',
      ancho: 120,
      pintar: (o) => <Celda>{o.cantidad === null ? '—' : `${cifra(o.cantidad, 2)} ${o.unidad ?? ''}`}</Celda>,
    },
  ];

  return (
    <>
      {error ? <Aviso tono="error">{error}</Aviso> : null}
      {datos ? (
        <>
          <Cifras>
            <Cifra titulo="Ítems del presupuesto" valor={String(datos.cifras.items)} pie="con cantidad en el periodo" />
            <Cifra titulo="Fuera del presupuesto" valor={String(datos.cifras.otras)} pie="actividades sin ítem" />
            <Cifra titulo="Días con actividades" valor={String(datos.cifras.diasConActividades)} pie="bitácoras con algo hecho" />
          </Cifras>
          <AvisoDeAbiertas abiertas={datos.abiertas} />
        </>
      ) : null}
      <Tabla
        columnas={columnas}
        filas={pagina.pagina}
        vacio={cargando ? 'Cargando el reporte…' : 'Las bitácoras de este periodo no tienen actividades del presupuesto.'}
      />
      <Paginacion pagina={pagina.paginaActual} porPagina={POR_PAGINA} total={pagina.total} onCambiar={pagina.irAPagina} />
      {otras.length > 0 ? (
        <Seccion titulo="Fuera del presupuesto">
          <Tabla columnas={columnasDeOtras} filas={otras} vacio="" variante="desnuda" />
        </Seccion>
      ) : null}
      {abierto ? (
        <Modal titulo={`${abierto.item} · por día`} onCerrar={() => setAbierto(null)}>
          <Text style={estilos.apoyo}>{abierto.nombre}</Text>
          <Tabla
            columnas={[
              { clave: 'fecha', titulo: 'Día', ancho: 100, pintar: (d) => <Celda>{diaCorto(d.fecha)}</Celda> },
              { clave: 'cantidad', titulo: 'Cantidad', ancho: 160, pintar: (d) => <Celda>{`${cifra(d.cantidad, 2)} ${abierto.unidad}`}</Celda> },
            ]}
            filas={conId(abierto.porDia, (d) => d.fecha)}
            vacio=""
            variante="desnuda"
          />
        </Modal>
      ) : null}
    </>
  );
}

/* ── Cantera (RF-53) ──────────────────────────────────────────────────── */

type Conteo = { nombre: string; viajes: number; id: string };

export function PestanaCantera({ consulta }: { consulta: ConsultaDeReporte }) {
  const { datos, error, cargando } = useReporte('cantera', consulta);
  const grupo = (titulo: string, rotulo: string, conteos: readonly { nombre: string; viajes: number }[]) => {
    const maximo = Math.max(0, ...conteos.map((c) => c.viajes));
    const columnas: Columna<Conteo>[] = [
      { clave: 'nombre', titulo: rotulo, ancho: 220, pintar: (c) => <Celda lineas={2}>{c.nombre}</Celda> },
      {
        clave: 'viajes',
        titulo: 'Viajes',
        ancho: 260,
        pintar: (c) => <BarraDeProporcion valor={c.viajes} maximo={maximo} texto={String(c.viajes)} />,
      },
    ];
    return (
      <Seccion titulo={titulo}>
        <Tabla columnas={columnas} filas={conId(conteos, (c) => c.nombre)} vacio="Sin viajes en este periodo." variante="desnuda" />
      </Seccion>
    );
  };
  return (
    <>
      {error ? <Aviso tono="error">{error}</Aviso> : null}
      {datos ? (
        <Cifras>
          <Cifra titulo="Viajes" valor={String(datos.cifras.viajes)} pie="vigentes, sin los anulados" />
          <Cifra titulo="Volquetas" valor={String(datos.cifras.volquetas)} pie="que hicieron viajes" />
          <Cifra titulo="Materiales" valor={String(datos.cifras.materiales)} pie="distintos" />
          <Cifra titulo="Días con viajes" valor={String(datos.cifras.dias)} pie="en el periodo" />
        </Cifras>
      ) : null}
      {cargando && !datos ? <Aviso tono="info">Cargando el reporte…</Aviso> : null}
      {datos ? (
        <View style={estilos.rejilla}>
          {grupo('Por volqueta', 'Volqueta', datos.porVolqueta)}
          {grupo('Por material', 'Material', datos.porMaterial)}
          {grupo('Por origen', 'Origen', datos.porOrigen)}
          {grupo('Por destino', 'Destino', datos.porDestino)}
        </View>
      ) : null}
    </>
  );
}

/* ── Control de calidad (RF-54) ───────────────────────────────────────── */

type PorEnsayo = ReporteFila<'calidad'>['porEnsayo'][number] & { id: string };
type NoCumple = ReporteFila<'calidad'>['noCumplen'][number];

export function PestanaCalidad({ consulta }: { consulta: ConsultaDeReporte }) {
  const { datos, error, cargando } = useReporte('calidad', consulta);
  const porEnsayo = conId(datos?.porEnsayo ?? [], (e) => e.ensayo);
  const noCumplen = datos?.noCumplen ?? [];

  const columnas: Columna<PorEnsayo>[] = [
    { clave: 'ensayo', titulo: 'Ensayo', ancho: 220, pintar: (e) => <Celda lineas={2}>{e.nombre}</Celda> },
    { clave: 'total', titulo: 'Hechos', ancho: 80, pintar: (e) => <Celda>{String(e.total)}</Celda> },
    {
      clave: 'cumplen',
      titulo: 'Cumplen',
      ancho: 220,
      pintar: (e) => (
        <BarraDeProporcion
          valor={e.cumplen}
          maximo={e.total}
          texto={`${e.cumplen} (${Math.round((e.cumplen / Math.max(1, e.total)) * 100)} %)`}
        />
      ),
    },
    {
      clave: 'noCumplen',
      titulo: 'No cumplen',
      ancho: 100,
      pintar: (e) => (e.noCumplen > 0 ? <Etiqueta tono="malo">{String(e.noCumplen)}</Etiqueta> : <Celda>0</Celda>),
    },
    { clave: 'sinDato', titulo: 'Sin dato', ancho: 90, pintar: (e) => <Celda>{String(e.sinDato)}</Celda> },
  ];
  const columnasNoCumplen: Columna<NoCumple>[] = [
    { clave: 'fecha', titulo: 'Día', ancho: 80, pintar: (e) => <Celda>{diaCorto(e.fecha)}</Celda> },
    { clave: 'ensayo', titulo: 'Ensayo', ancho: 180, pintar: (e) => <Celda lineas={2}>{e.nombre}</Celda> },
    { clave: 'ubicacion', titulo: 'Ubicación', ancho: 180, pintar: (e) => <Celda lineas={2}>{e.ubicacion ?? '—'}</Celda> },
    {
      clave: 'resultado',
      titulo: 'Resultado',
      ancho: 110,
      pintar: (e) => <Celda>{e.resultado === null ? '—' : `${cifra(e.resultado, 2)} ${e.unidad ?? ''}`}</Celda>,
    },
    { clave: 'responsable', titulo: 'Responsable', ancho: 150, pintar: (e) => <Celda lineas={2}>{e.responsable ?? '—'}</Celda> },
    {
      clave: 'ver',
      titulo: '',
      ancho: 130,
      anchoMinimo: 130,
      pintar: (e) => (
        <Acciones>
          <Boton
            titulo="Ver bitácora"
            tono="secundario"
            onPress={() => router.push({ pathname: '/panel/bitacoras', params: { fecha: e.fecha, obraId: e.obraId } })}
          />
        </Acciones>
      ),
    },
  ];

  return (
    <>
      {error ? <Aviso tono="error">{error}</Aviso> : null}
      {datos ? (
        <>
          <Cifras>
            <Cifra titulo="Ensayos" valor={String(datos.cifras.ensayos)} pie="anotados en las bitácoras" />
            <Cifra titulo="Cumplen" valor={String(datos.cifras.cumplen)} pie="ensayos" tono="bueno" />
            <Cifra titulo="No cumplen" valor={String(datos.cifras.noCumplen)} pie="ensayos" tono={datos.cifras.noCumplen > 0 ? 'malo' : 'neutro'} />
            <Cifra titulo="Sin dato" valor={String(datos.cifras.sinDato)} pie="no dicen si cumplen" />
          </Cifras>
          <AvisoDeAbiertas abiertas={datos.abiertas} />
        </>
      ) : null}
      <Tabla columnas={columnas} filas={porEnsayo} vacio={cargando ? 'Cargando el reporte…' : 'Las bitácoras de este periodo no tienen ensayos.'} />
      {noCumplen.length > 0 ? (
        <Seccion titulo="Los que no cumplen">
          <Tabla columnas={columnasNoCumplen} filas={noCumplen} vacio="" variante="desnuda" />
        </Seccion>
      ) : null}
    </>
  );
}

/* ── Clima y novedades (RF-55) ────────────────────────────────────────── */

type DiaDeClima = ReporteFila<'clima'>['dias'][number] & { id: string };

export function PestanaClima({ consulta }: { consulta: ConsultaDeReporte }) {
  const { datos, error, cargando } = useReporte('clima', consulta);
  const dias = conId(datos?.dias ?? [], (d) => d.fecha);
  const pagina = usePaginacion(dias);
  const columnas: Columna<DiaDeClima>[] = [
    { clave: 'fecha', titulo: 'Día', ancho: 80, pintar: (d) => <Celda>{diaCorto(d.fecha)}</Celda> },
    {
      clave: 'clima',
      titulo: 'Clima',
      ancho: 260,
      pintar: (d) =>
        !d.conBitacora ? (
          <Text style={estilos.apoyo}>Sin bitácora</Text>
        ) : d.franjas.length === 0 ? (
          <Text style={estilos.apoyo}>Sin registrar</Text>
        ) : (
          <View style={estilos.celda}>
            {d.franjas.map((f) => (
              <Text key={`${f.desde}-${f.hasta}`} style={estilos.texto}>{`${f.desde}–${f.hasta} · ${f.nombre}`}</Text>
            ))}
          </View>
        ),
    },
    {
      clave: 'lluvia',
      titulo: 'Lluvia',
      ancho: 80,
      pintar: (d) => (d.lluvia ? <Etiqueta tono="atencion">Llovió</Etiqueta> : <Celda>{d.conBitacora ? 'No' : '—'}</Celda>),
    },
    {
      clave: 'trabajo',
      titulo: 'Día sin trabajo',
      ancho: 200,
      pintar: (d) =>
        d.sinTrabajo ? (
          <View style={estilos.celda}>
            <Etiqueta tono="malo">Sin trabajo</Etiqueta>
            {d.motivoSinTrabajo ? <Text style={estilos.apoyo}>{d.motivoSinTrabajo}</Text> : null}
          </View>
        ) : (
          <Celda>{d.conBitacora ? 'Se trabajó' : '—'}</Celda>
        ),
    },
    { clave: 'notas', titulo: 'Notas', ancho: 320, pintar: (d) => <Celda lineas={3}>{d.notas || '—'}</Celda> },
  ];
  return (
    <>
      {error ? <Aviso tono="error">{error}</Aviso> : null}
      {datos ? (
        <>
          <Cifras>
            <Cifra titulo="Días con bitácora" valor={String(datos.cifras.diasConBitacora)} pie={`de ${dias.length} del periodo`} />
            <Cifra titulo="Días con lluvia" valor={String(datos.cifras.diasConLluvia)} pie="alguna franja «Lloviendo»" tono={datos.cifras.diasConLluvia > 0 ? 'atencion' : 'neutro'} />
            <Cifra titulo="Días sin trabajo" valor={String(datos.cifras.diasSinTrabajo)} pie="marcados en la bitácora" tono={datos.cifras.diasSinTrabajo > 0 ? 'malo' : 'neutro'} />
          </Cifras>
          <AvisoDeAbiertas abiertas={datos.abiertas} />
        </>
      ) : null}
      <Tabla columnas={columnas} filas={pagina.pagina} vacio={cargando ? 'Cargando el reporte…' : 'Sin días en este periodo.'} />
      <Paginacion pagina={pagina.paginaActual} porPagina={POR_PAGINA} total={pagina.total} onCambiar={pagina.irAPagina} />
    </>
  );
}

const estilos = StyleSheet.create({
  apoyo: { fontFamily: FuentePanel.texto, fontSize: TextoPanel.apoyo, color: Panel.textoApoyo },
  texto: { fontFamily: FuentePanel.texto, fontSize: TextoPanel.apoyo, color: Panel.texto },
  celda: { gap: 3, alignItems: 'flex-start' },
  rejilla: { gap: 12 },
});
