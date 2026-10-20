/**
 * La pestaña Personal de Reportes (spec 030, RF-44 a RF-50): cuántas horas laboró cada
 * persona, con sus extras y sus novedades, por día, semana o mes.
 *
 *  · Día: una fila por persona con sus horas y su novedad.
 *  · Semana: una columna por día con las horas y una marca de extras o novedad, y los
 *    totales (RF-46).
 *  · Mes: los totales y cuántos días tuvo cada novedad; el detalle por día se abre en
 *    una ventana (RF-47).
 *
 * Avisa —no impide— cuando alguien pasa de 2 h extra en un día o de 12 h en una semana
 * (RF-48). Se filtra por cargo y se busca por nombre (RF-49).
 */
import { useCallback, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { FuentePanel, Panel, TextoPanel } from '@/constants/theme';
import { api } from '@/features/panel/cliente-api';
import {
  Acciones,
  Aviso,
  Boton,
  Campo,
  Celda,
  Cifra,
  Cifras,
  Etiqueta,
  Formulario,
  Modal,
  Paginacion,
  Selector,
  Tabla,
  type Columna,
} from '@/features/panel/componentes';
import type { ConsultaDeReporte, ReporteFila } from '@/features/panel/contratos';
import { useListado } from '@/features/panel/marco';
import { POR_PAGINA, usePaginacion } from '@/features/panel/usar-listado-filtrado';
import { nombreDeNovedad } from '@/shared/catalogos/bitacora';
import { diaCorto } from '@/shared/rules/jornada';
import { normalizar } from '@/shared/rules/texto';

import { AvisoDeAbiertas, cifra, enHoras, rotuloDelDia } from './comunes';

type Reporte = ReporteFila<'personal'>;
type Persona = Reporte['personas'][number] & { id: string };
type Dia = Persona['dias'][number] & { id: string };

/** Los avisos de extras de una persona (RF-48). */
function AvisosDeExtras({ persona }: { persona: Persona }) {
  if (persona.diasConExtraDeMas.length === 0 && persona.semanasConExtraDeMas.length === 0) {
    return <Text style={estilos.apoyo}>—</Text>;
  }
  return (
    <View style={estilos.celda}>
      {persona.diasConExtraDeMas.length > 0 ? (
        <Etiqueta tono="atencion">
          {persona.diasConExtraDeMas.length === 1
            ? `+2 h extra el ${diaCorto(persona.diasConExtraDeMas[0])}`
            : `+2 h extra en ${persona.diasConExtraDeMas.length} días`}
        </Etiqueta>
      ) : null}
      {persona.semanasConExtraDeMas.map((s) => (
        <Etiqueta key={s.desde} tono="malo">{`${enHoras(s.extra)} h extra sem. ${diaCorto(s.desde)}`}</Etiqueta>
      ))}
    </View>
  );
}

/** Las horas de un día como se leen en la cuadrícula: «10 h», con su marca. */
function HorasDelDia({ dia }: { dia: Persona['dias'][number] }) {
  if (dia.estado === 'sin_bitacora') return <Text style={estilos.apoyo}>Sin bitácora</Text>;
  if (dia.estado === 'ausente') return <Text style={estilos.apoyo}>—</Text>;
  const extra = dia.extraDiurna + dia.extraNocturna;
  return (
    <View style={estilos.celda}>
      <Celda>{dia.laboradas > 0 ? `${enHoras(dia.laboradas)} h` : '0 h'}</Celda>
      {extra > 0 ? <Etiqueta tono="atencion">{`+${enHoras(extra)} extra`}</Etiqueta> : null}
      {dia.novedad ? <Etiqueta tono="neutro">{nombreDeNovedad(dia.novedad)}</Etiqueta> : null}
    </View>
  );
}

export function PestanaPersonal({ consulta }: { consulta: ConsultaDeReporte }) {
  const { obraId, tipo, fecha } = consulta;
  const reporte = useListado<Reporte>(
    useCallback(async () => [await api.reportes.de('personal', { obraId, tipo, fecha })], [obraId, tipo, fecha]),
  );
  const datos = reporte.datos[0];
  const [cargo, setCargo] = useState<string | null>(null);
  const [busqueda, setBusqueda] = useState('');
  const [abierta, setAbierta] = useState<Persona | null>(null);

  const todas: Persona[] = (datos?.personas ?? []).map((p) => ({ ...p, id: p.usuarioId }));
  const cargos = [...new Set(todas.map((p) => p.cargo).filter((c): c is string => Boolean(c)))].sort((a, b) =>
    a.localeCompare(b, 'es'),
  );
  const buscada = normalizar(busqueda);
  const filas = todas.filter(
    (p) => (!cargo || p.cargo === cargo) && (!buscada || normalizar(p.nombre).includes(buscada)),
  );
  const pagina = usePaginacion(filas, `${cargo ?? ''}|${busqueda}`);

  const persona: Columna<Persona> = {
    clave: 'persona',
    titulo: 'Persona',
    ancho: 180,
    pintar: (p) => (
      <View>
        <Celda lineas={2}>{p.nombre}</Celda>
        {p.cargo ? <Text style={estilos.apoyo}>{p.cargo}</Text> : null}
      </View>
    ),
  };
  const horas = (titulo: string, clave: 'laboradas' | 'extraDiurna' | 'extraNocturna', ancho = 100): Columna<Persona> => ({
    clave,
    titulo,
    ancho,
    pintar: (p) => <Celda>{`${enHoras(p[clave])} h`}</Celda>,
  });
  const avisos: Columna<Persona> = { clave: 'avisos', titulo: 'Avisos', ancho: 190, anchoMinimo: 170, pintar: (p) => <AvisosDeExtras persona={p} /> };
  const novedades: Columna<Persona> = {
    clave: 'novedades',
    titulo: 'Novedades',
    ancho: 170,
    pintar: (p) => {
      const lista = Object.entries(p.novedades);
      if (lista.length === 0) return <Text style={estilos.apoyo}>—</Text>;
      return (
        <View style={estilos.celda}>
          {lista.map(([n, dias]) => (
            <Etiqueta key={n} tono="neutro">{`${nombreDeNovedad(n)}: ${dias} ${dias === 1 ? 'día' : 'días'}`}</Etiqueta>
          ))}
        </View>
      );
    },
  };

  const columnasDelDia: Columna<Persona>[] = [
    persona,
    { clave: 'dia', titulo: 'Laboradas', ancho: 140, pintar: (p) => <HorasDelDia dia={p.dias[0]} /> },
    horas('Extra diurnas', 'extraDiurna', 110),
    horas('Extra nocturnas', 'extraNocturna', 120),
    {
      clave: 'novedad',
      titulo: 'Novedad',
      ancho: 140,
      pintar: (p) => <Celda>{p.dias[0].novedad ? nombreDeNovedad(p.dias[0].novedad) : '—'}</Celda>,
    },
    avisos,
  ];

  const columnasDeLaSemana: Columna<Persona>[] = [
    persona,
    ...(datos?.periodo.dias ?? []).map(
      (dia, i): Columna<Persona> => ({
        clave: dia,
        titulo: rotuloDelDia(dia),
        ancho: 82,
        anchoMinimo: 82,
        pintar: (p) => <HorasDelDia dia={p.dias[i]} />,
      }),
    ),
    horas('Total', 'laboradas', 80),
    {
      clave: 'extras',
      titulo: 'Extras D / N',
      ancho: 100,
      pintar: (p) => <Celda>{`${enHoras(p.extraDiurna)} / ${enHoras(p.extraNocturna)} h`}</Celda>,
    },
    { clave: 'dias', titulo: 'Días', ancho: 50, pintar: (p) => <Celda>{String(p.diasTrabajados)}</Celda> },
    avisos,
  ];

  const columnasDelMes: Columna<Persona>[] = [
    persona,
    horas('Laboradas', 'laboradas'),
    horas('Extra diurnas', 'extraDiurna', 110),
    horas('Extra nocturnas', 'extraNocturna', 120),
    { clave: 'dias', titulo: 'Días trabajados', ancho: 110, pintar: (p) => <Celda>{String(p.diasTrabajados)}</Celda> },
    novedades,
    avisos,
    {
      clave: 'detalle',
      titulo: '',
      ancho: 110,
      anchoMinimo: 110,
      pintar: (p) => (
        <Acciones>
          <Boton titulo="Por día" tono="secundario" onPress={() => setAbierta(p)} />
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
          {/* Las cifras del periodo (RF-50). */}
          <Cifras>
            <Cifra titulo="Personas" valor={String(datos.cifras.personas)} pie="en las bitácoras del periodo" />
            <Cifra titulo="Horas laboradas" valor={enHoras(datos.cifras.laboradas)} pie="con las extras incluidas" />
            <Cifra titulo="Extra diurnas" valor={enHoras(datos.cifras.extraDiurna)} pie="horas" tono={datos.cifras.extraDiurna > 0 ? 'atencion' : 'neutro'} />
            <Cifra titulo="Extra nocturnas" valor={enHoras(datos.cifras.extraNocturna)} pie="horas" tono={datos.cifras.extraNocturna > 0 ? 'atencion' : 'neutro'} />
            <Cifra titulo="Con novedad" valor={String(datos.cifras.conNovedad)} pie="incapacidad, permiso, vacaciones…" />
          </Cifras>
          <AvisoDeAbiertas abiertas={datos.abiertas} />
        </>
      ) : null}
      <Formulario>
        <Selector
          etiqueta="Cargo"
          valor={cargo}
          opciones={cargos.map((c) => ({ valor: c, etiqueta: c }))}
          onChange={setCargo}
          permiteVacio
          vacio="Todos"
          ancho={220}
        />
        <Campo etiqueta="Buscar por nombre" valor={busqueda} onChange={setBusqueda} ancho={240} />
      </Formulario>
      <Tabla
        columnas={columnas}
        filas={pagina.pagina}
        vacio={
          reporte.cargando
            ? 'Cargando el reporte…'
            : todas.length === 0
              ? 'Las bitácoras de este periodo no tienen personal.'
              : 'Nadie coincide con el cargo o el nombre buscados.'
        }
      />
      <Paginacion pagina={pagina.paginaActual} porPagina={POR_PAGINA} total={pagina.total} onCambiar={pagina.irAPagina} />

      {abierta ? (
        <Modal titulo={`${abierta.nombre} · por día`} onCerrar={() => setAbierta(null)}>
          <DetalleDeLaPersona persona={abierta} />
        </Modal>
      ) : null}
    </>
  );
}

/** El detalle por día de una persona en el mes (RF-47). */
function DetalleDeLaPersona({ persona }: { persona: Persona }) {
  const filas: Dia[] = persona.dias.filter((d) => d.estado === 'registrada').map((d) => ({ ...d, id: d.fecha }));
  const columnas: Columna<Dia>[] = [
    { clave: 'fecha', titulo: 'Día', ancho: 90, pintar: (d) => <Celda>{diaCorto(d.fecha)}</Celda> },
    { clave: 'laboradas', titulo: 'Laboradas', ancho: 100, pintar: (d) => <Celda>{`${enHoras(d.laboradas)} h`}</Celda> },
    { clave: 'ed', titulo: 'Extra D', ancho: 80, pintar: (d) => <Celda>{`${enHoras(d.extraDiurna)} h`}</Celda> },
    { clave: 'en', titulo: 'Extra N', ancho: 80, pintar: (d) => <Celda>{`${enHoras(d.extraNocturna)} h`}</Celda> },
    { clave: 'novedad', titulo: 'Novedad', ancho: 130, pintar: (d) => <Celda>{d.novedad ? nombreDeNovedad(d.novedad) : '—'}</Celda> },
  ];
  return (
    <>
      <Text style={estilos.apoyo}>{`${cifra(persona.diasTrabajados, 0)} días trabajados en el periodo.`}</Text>
      <Tabla columnas={columnas} filas={filas} vacio="No está en ninguna bitácora del periodo." variante="desnuda" />
    </>
  );
}

const estilos = StyleSheet.create({
  apoyo: { fontFamily: FuentePanel.texto, fontSize: TextoPanel.apoyo, color: Panel.textoApoyo },
  celda: { gap: 3, alignItems: 'flex-start' },
});
