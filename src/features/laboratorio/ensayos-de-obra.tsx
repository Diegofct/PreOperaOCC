/**
 * La pestaña «Ensayos de obra» de Laboratorio (spec 029, RF-24 a RF-32): los ensayos
 * anotados en «Control Calidad de Obra» de las bitácoras, para seguir la calidad sin
 * abrir las bitácoras una por una.
 *
 * Solo lectura (RF-30): se corrigen en la bitácora, y como el servidor los lee de ella
 * cada vez, la corrección se ve al volver (RF-31). El periodo —y para la gerencia, la
 * obra— decide qué llega; el ensayo y si cumple se filtran aquí sobre lo que llegó
 * (RF-27), como en granulometrías.
 */
import { router } from 'expo-router';
import { useCallback, useState } from 'react';

import { nombreDeEnsayo } from '@/shared/catalogos/bitacora';
import { filtrarEnsayosDeObra, type FiltroDeCumple } from '@/shared/rules/ensayos-de-obra';
import { fechaDeJornada, restarDias } from '@/shared/rules/jornada';

import { api } from '@/features/panel/cliente-api';
import {
  Acciones,
  Aviso,
  Boton,
  CampoDeFecha,
  Celda,
  Etiqueta,
  Formulario,
  Paginacion,
  Seccion,
  Selector,
  Tabla,
  type Columna,
  type Opcion,
} from '@/features/panel/componentes';
import type { EnsayoDeObraFila, ObraFila } from '@/features/panel/contratos';
import { useListado } from '@/features/panel/marco';
import { POR_PAGINA, usePaginacion } from '@/features/panel/usar-listado-filtrado';

import { EtiquetaDeVeredicto } from './etiquetas';

const FECHA = /^\d{4}-\d{2}-\d{2}$/;

/** Cuántos días hacia atrás muestra la lista al abrirla (RF-27). */
const DIAS_POR_DEFECTO = 7;

const OPCIONES_DE_CUMPLE: Opcion[] = [
  { valor: 'si', etiqueta: 'Cumple' },
  { valor: 'no', etiqueta: 'No cumple' },
  { valor: 'sin_dato', etiqueta: 'Sin dato' },
];

export function EnsayosDeObra({
  esGerencia,
  obrasConLaboratorio,
}: {
  esGerencia: boolean;
  obrasConLaboratorio: ObraFila[];
}) {
  const [obraElegida, setObraElegida] = useState<string | null>(null);

  const hoy = fechaDeJornada();
  const [desde, setDesde] = useState(restarDias(hoy, DIAS_POR_DEFECTO - 1));
  const [hasta, setHasta] = useState(hoy);
  const desdeMal = !FECHA.test(desde.trim());
  const hastaMal = !FECHA.test(hasta.trim());
  // Se pregunta al servidor solo cuando las dos fechas se leen, como en granulometrías.
  const [periodo, setPeriodo] = useState({ desde: restarDias(hoy, DIAS_POR_DEFECTO - 1), hasta: hoy });
  function cambiarPeriodo(nuevoDesde: string, nuevoHasta: string) {
    setDesde(nuevoDesde);
    setHasta(nuevoHasta);
    const d = nuevoDesde.trim();
    const h = nuevoHasta.trim();
    if (FECHA.test(d) && FECHA.test(h) && d <= h) setPeriodo({ desde: d, hasta: h });
  }

  const ensayos = useListado<EnsayoDeObraFila>(
    useCallback(
      () =>
        api.laboratorio
          .ensayosDeObra({ obraId: esGerencia ? obraElegida : null, ...periodo })
          .then((consulta) => consulta.ensayos),
      [esGerencia, obraElegida, periodo],
    ),
  );

  const [ensayo, setEnsayo] = useState<string | null>(null);
  const [cumple, setCumple] = useState<string | null>(null);
  const visibles = filtrarEnsayosDeObra(ensayos.datos, {
    ensayo,
    cumple: cumple as FiltroDeCumple | null,
  });

  // Los ensayos que hay en el periodo, por su nombre del catálogo.
  const opcionesDeEnsayo: Opcion[] = [...new Set(ensayos.datos.map((e) => e.ensayo))]
    .map((id) => ({ valor: id, etiqueta: nombreDeEnsayo(id) }))
    .sort((a, b) => a.etiqueta.localeCompare(b.etiqueta, 'es'));

  const columnas: Columna<EnsayoDeObraFila>[] = [
    { clave: 'fecha', titulo: 'Fecha', ancho: 115, pintar: (e) => <Celda>{e.fecha}</Celda> },
    ...(esGerencia
      ? [{ clave: 'obra', titulo: 'Obra', ancho: 90, pintar: (e: EnsayoDeObraFila) => <Celda>{e.obraCodigo}</Celda> }]
      : []),
    {
      clave: 'ensayo',
      titulo: 'Ensayo',
      ancho: 170,
      pintar: (e) => (
        <Celda lineas={2}>{`${e.nombre}${e.horaInicio ? ` · ${e.horaInicio}` : ''}`}</Celda>
      ),
    },
    { clave: 'ubicacion', titulo: 'Ubicación', ancho: 170, pintar: (e) => <Celda lineas={2}>{e.ubicacion ?? '—'}</Celda> },
    {
      clave: 'edad',
      titulo: 'Edad',
      ancho: 70,
      pintar: (e) => <Celda>{e.edadDias === null ? '—' : `${e.edadDias} d`}</Celda>,
    },
    {
      clave: 'resultado',
      titulo: 'Resultado',
      ancho: 100,
      pintar: (e) => <Celda>{e.resultado === null ? '—' : `${e.resultado}${e.unidad ? ` ${e.unidad}` : ''}`}</Celda>,
    },
    {
      clave: 'cumple',
      titulo: 'Cumple',
      ancho: 130,
      pintar: (e) => (
        <EtiquetaDeVeredicto veredicto={e.cumple === 'si' ? 'cumple' : e.cumple === 'no' ? 'no_cumple' : null} />
      ),
    },
    { clave: 'responsable', titulo: 'Responsable', ancho: 140, pintar: (e) => <Celda lineas={2}>{e.responsable ?? '—'}</Celda> },
    {
      clave: 'origen',
      titulo: 'Origen',
      ancho: 110,
      pintar: (e) => (e.desdeWhatsapp ? <Etiqueta tono="neutro">WhatsApp</Etiqueta> : <Celda>Panel</Celda>),
    },
    {
      clave: 'abrir',
      titulo: '',
      ancho: 130,
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

  // Páginas de 15 (spec 025, RF-55; 029/RF-28).
  const pagina = usePaginacion(visibles);

  return (
    <>
      {ensayos.error ? <Aviso tono="error">{ensayos.error}</Aviso> : null}
      <Seccion titulo="Ensayos de obra">
        <Formulario>
          {esGerencia ? (
            <Selector
              etiqueta="Obra"
              valor={obraElegida}
              opciones={obrasConLaboratorio.map((o) => ({ valor: o.id, etiqueta: `${o.codigo} · ${o.nombre}` }))}
              onChange={setObraElegida}
              permiteVacio
              vacio="Todas"
              ancho={260}
            />
          ) : null}
          <CampoDeFecha
            etiqueta="Desde"
            valor={desde}
            onChange={(v) => cambiarPeriodo(v, hasta)}
            error={desdeMal ? 'La fecha va en formato AAAA-MM-DD.' : undefined}
            max={hasta || undefined}
          />
          <CampoDeFecha
            etiqueta="Hasta"
            valor={hasta}
            onChange={(v) => cambiarPeriodo(desde, v)}
            min={desde || undefined}
            error={
              hastaMal
                ? 'La fecha va en formato AAAA-MM-DD.'
                : !desdeMal && desde.trim() > hasta.trim()
                  ? 'Tiene que ser igual o posterior a «Desde».'
                  : undefined
            }
          />
          <Selector
            etiqueta="Ensayo"
            valor={ensayo}
            opciones={opcionesDeEnsayo}
            onChange={setEnsayo}
            permiteVacio
            vacio="Todos"
            ancho={220}
          />
          <Selector
            etiqueta="¿Cumple?"
            valor={cumple}
            opciones={OPCIONES_DE_CUMPLE}
            onChange={setCumple}
            permiteVacio
            vacio="Todos"
            ancho={150}
          />
        </Formulario>
        <Celda>
          Los ensayos anotados en «Control Calidad de Obra» de las bitácoras. Se corrigen en la bitácora del día.
        </Celda>
      </Seccion>

      <Tabla
        columnas={columnas}
        filas={pagina.pagina}
        vacio={
          ensayos.cargando
            ? 'Cargando los ensayos…'
            : ensayos.datos.length === 0
              ? 'Las bitácoras de este periodo no tienen ensayos.'
              : 'Ningún ensayo coincide con los filtros elegidos.'
        }
      />
      <Paginacion
        pagina={pagina.paginaActual}
        porPagina={POR_PAGINA}
        total={pagina.total}
        onCambiar={pagina.irAPagina}
      />
    </>
  );
}
