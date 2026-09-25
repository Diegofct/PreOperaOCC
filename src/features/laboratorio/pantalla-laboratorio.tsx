/**
 * El módulo Laboratorio: los ensayos de granulometría de la obra (spec 018, RF-101 a
 * RF-105).
 *
 * ── Qué se pide al servidor y qué se filtra aquí ──
 *
 * El periodo —sobre la fecha de ejecución— y, para la gerencia, la obra: eso decide
 * qué filas llegan. Material, franja, estado y veredicto se filtran aquí sobre lo que
 * llegó (RF-103), con `filtrarEnsayos`, como los viajes de Control Cantera. Las
 * opciones de material salen **de los ensayos del periodo**: no hay catálogo de
 * materiales de laboratorio, y un material escrito una vez tiene que poder buscarse.
 *
 * ── Quién ve qué ──
 *
 * El laboratorista y la gerencia registran («Nuevo ensayo»); el residente y la
 * gerencia ven cuántos esperan su aprobación (RF-105). A nadie se le enseña un botón
 * que el servidor le rechazaría.
 *
 * ── Registrar es crear un borrador y abrirlo ──
 *
 * «Nuevo ensayo» crea el borrador vacío en el servidor y lleva a su pantalla: el
 * ensayo tiene dirección desde el primer momento y se puede dejar a medias (RF-31).
 */
import { router } from 'expo-router';
import { useCallback, useState } from 'react';

import { FRANJAS_GRANULOMETRICAS } from '@/shared/catalogos/franjas-granulometricas';
import {
  ETIQUETA_ESTADO_ENSAYO,
  filtrarEnsayos,
  type EstadoVisibleEnsayo,
  type FiltroDeVeredicto,
} from '@/shared/rules/granulometria';
import { fechaDeJornada, restarDias } from '@/shared/rules/jornada';
import { alcanza } from '@/shared/rules/permisos';

import { api, mensajeDe } from '@/features/panel/cliente-api';
import {
  Acciones,
  Aviso,
  Boton,
  Campo,
  Celda,
  Formulario,
  Seccion,
  Selector,
  Tabla,
  type Columna,
  type Opcion,
} from '@/features/panel/componentes';
import type { EnsayoFila, ObraFila } from '@/features/panel/contratos';
import { MarcoPantalla, useListado } from '@/features/panel/marco';
import { usePersona } from '@/features/panel/sesion';

import { EtiquetaDeEstado, EtiquetaDeVeredicto } from './etiquetas';

const FECHA = /^\d{4}-\d{2}-\d{2}$/;

/** Cuántos días hacia atrás muestra el listado al abrirlo. */
const DIAS_POR_DEFECTO = 30;

const OPCIONES_DE_ESTADO: Opcion[] = (
  ['borrador', 'enviado', 'devuelto', 'aprobado', 'anulado'] as const
).map((estado) => ({ valor: estado, etiqueta: ETIQUETA_ESTADO_ENSAYO[estado] }));

const OPCIONES_DE_VEREDICTO: Opcion[] = [
  { valor: 'cumple', etiqueta: 'Cumple' },
  { valor: 'no_cumple', etiqueta: 'No cumple' },
  { valor: 'sin_veredicto', etiqueta: 'Sin veredicto' },
];

export default function PantallaLaboratorio() {
  const { rol } = usePersona();
  const puedeRegistrar = alcanza(rol, 'laboratorio', 'escribir');
  const puedeAprobar = alcanza(rol, 'laboratorio', 'aprobar');
  const esGerencia = alcanza(rol, 'obras', 'listar');

  // Solo la gerencia elige obra, y solo entre las que llevan laboratorio (RF-8).
  const obras = useListado<ObraFila>(
    useCallback(() => (esGerencia ? api.obras.listar() : Promise.resolve([])), [esGerencia]),
  );
  const obrasConLaboratorio = obras.datos.filter((o) => o.laboratorioActivo);
  const [obraElegida, setObraElegida] = useState<string | null>(null);

  const hoy = fechaDeJornada();
  const [desde, setDesde] = useState(restarDias(hoy, DIAS_POR_DEFECTO - 1));
  const [hasta, setHasta] = useState(hoy);
  const desdeMal = !FECHA.test(desde.trim());
  const hastaMal = !FECHA.test(hasta.trim());
  // Se pregunta al servidor solo cuando las dos fechas se leen, como en cantera.
  const [periodo, setPeriodo] = useState({
    desde: restarDias(hoy, DIAS_POR_DEFECTO - 1),
    hasta: hoy,
  });
  function cambiarPeriodo(nuevoDesde: string, nuevoHasta: string) {
    setDesde(nuevoDesde);
    setHasta(nuevoHasta);
    const d = nuevoDesde.trim();
    const h = nuevoHasta.trim();
    if (FECHA.test(d) && FECHA.test(h) && d <= h) setPeriodo({ desde: d, hasta: h });
  }

  // El listado trae además cuántos esperan aprobación (RF-105), sin periodo.
  const [pendientes, setPendientes] = useState(0);
  const ensayos = useListado<EnsayoFila>(
    useCallback(
      () =>
        api.laboratorio
          .listar({ obraId: esGerencia ? obraElegida : null, ...periodo })
          .then((consulta) => {
            setPendientes(consulta.pendientes);
            return consulta.ensayos;
          }),
      [esGerencia, obraElegida, periodo],
    ),
  );

  const [material, setMaterial] = useState<string | null>(null);
  const [franjaId, setFranjaId] = useState<string | null>(null);
  const [estado, setEstado] = useState<string | null>(null);
  const [veredicto, setVeredicto] = useState<string | null>(null);

  const visibles = filtrarEnsayos(ensayos.datos, {
    material,
    franjaId,
    estado: estado as EstadoVisibleEnsayo | null,
    veredicto: veredicto as FiltroDeVeredicto | null,
  });

  const materiales: Opcion[] = [
    ...new Set(ensayos.datos.flatMap((e) => (e.material ? [e.material] : []))),
  ]
    .sort((a, b) => a.localeCompare(b, 'es'))
    .map((m) => ({ valor: m, etiqueta: m }));
  const franjas: Opcion[] = FRANJAS_GRANULOMETRICAS.map((f) => ({
    valor: f.id,
    etiqueta: f.nombre,
  }));

  const [creando, setCreando] = useState(false);
  const [errorAlCrear, setErrorAlCrear] = useState<string | null>(null);
  // La gerencia registra en la obra elegida; los demás, en la suya.
  const faltaObraParaRegistrar = esGerencia && !obraElegida;

  async function nuevoEnsayo() {
    setCreando(true);
    setErrorAlCrear(null);
    try {
      const creado = await api.laboratorio.crear({ obraId: esGerencia ? obraElegida : null });
      router.push({ pathname: '/panel/laboratorio/[id]', params: { id: creado.id } });
    } catch (fallo) {
      setErrorAlCrear(mensajeDe(fallo));
      setCreando(false);
    }
  }

  const columnas: Columna<EnsayoFila>[] = [
    {
      clave: 'informe',
      titulo: 'Informe',
      ancho: 90,
      pintar: (e) => <Celda>{e.numeroInforme ?? '—'}</Celda>,
    },
    ...(esGerencia
      ? [
          {
            clave: 'obra',
            titulo: 'Obra',
            ancho: 90,
            pintar: (e: EnsayoFila) => <Celda>{e.obraCodigo}</Celda>,
          },
        ]
      : []),
    {
      clave: 'ejecucion',
      titulo: 'Ejecución',
      ancho: 100,
      pintar: (e) => <Celda>{e.fechaEjecucion ?? 'Sin fecha'}</Celda>,
    },
    {
      clave: 'material',
      titulo: 'Material',
      ancho: 150,
      pintar: (e) => <Celda lineas={2}>{e.material ?? '—'}</Celda>,
    },
    {
      clave: 'fuente',
      titulo: 'Fuente',
      ancho: 140,
      pintar: (e) => <Celda lineas={2}>{e.fuente ?? '—'}</Celda>,
    },
    {
      clave: 'franja',
      titulo: 'Franja',
      ancho: 150,
      pintar: (e) => <Celda lineas={2}>{e.franja ?? 'Sin escoger'}</Celda>,
    },
    {
      clave: 'veredicto',
      titulo: 'Veredicto',
      ancho: 130,
      pintar: (e) => <EtiquetaDeVeredicto veredicto={e.veredicto} />,
    },
    {
      clave: 'estado',
      titulo: 'Estado',
      ancho: 110,
      pintar: (e) => <EtiquetaDeEstado estado={e.estado} />,
    },
    {
      clave: 'abrir',
      titulo: '',
      ancho: 90,
      pintar: (e) => (
        <Acciones>
          <Boton
            titulo="Abrir"
            tono="secundario"
            onPress={() =>
              router.push({ pathname: '/panel/laboratorio/[id]', params: { id: e.id } })
            }
          />
        </Acciones>
      ),
    },
  ];

  return (
    <MarcoPantalla
      modulo="laboratorio"
      exigeObra
      titulo="Laboratorio"
      descripcion={
        puedeRegistrar
          ? 'Los ensayos de granulometría (INV E-123-13): se digitan las masas y el sistema calcula, dibuja la curva y dice si el material cumple.'
          : 'Los ensayos de granulometría de su obra. Los registra el laboratorista; usted los aprueba o los devuelve.'
      }
      error={obras.error}
      cargando={obras.cargando}
    >
      {puedeAprobar && pendientes > 0 ? (
        <Aviso tono="info">
          {pendientes === 1
            ? 'Hay 1 ensayo esperando su aprobación.'
            : `Hay ${pendientes} ensayos esperando su aprobación.`}
        </Aviso>
      ) : null}
      {ensayos.error ? <Aviso tono="error">{ensayos.error}</Aviso> : null}
      {errorAlCrear ? <Aviso tono="error">{errorAlCrear}</Aviso> : null}

      <Seccion titulo="Ensayos">
        <Formulario>
          {esGerencia ? (
            <Selector
              etiqueta="Obra"
              valor={obraElegida}
              opciones={obrasConLaboratorio.map((o) => ({
                valor: o.id,
                etiqueta: `${o.codigo} · ${o.nombre}`,
              }))}
              onChange={setObraElegida}
              permiteVacio
              vacio="Todas"
              ancho={260}
            />
          ) : null}
          <Campo
            etiqueta="Ejecución desde"
            valor={desde}
            onChange={(v) => cambiarPeriodo(v, hasta)}
            ayuda="AAAA-MM-DD"
            error={desdeMal ? 'La fecha va en formato AAAA-MM-DD.' : undefined}
            ancho={150}
          />
          <Campo
            etiqueta="Hasta"
            valor={hasta}
            onChange={(v) => cambiarPeriodo(desde, v)}
            ayuda="AAAA-MM-DD"
            error={
              hastaMal
                ? 'La fecha va en formato AAAA-MM-DD.'
                : !desdeMal && desde.trim() > hasta.trim()
                  ? 'Tiene que ser igual o posterior a «Desde».'
                  : undefined
            }
            ancho={150}
          />
          <Selector
            etiqueta="Material"
            valor={material}
            opciones={materiales}
            onChange={setMaterial}
            permiteVacio
            vacio="Todos"
            ancho={180}
          />
          <Selector
            etiqueta="Franja"
            valor={franjaId}
            opciones={franjas}
            onChange={setFranjaId}
            permiteVacio
            vacio="Todas"
            ancho={200}
          />
          <Selector
            etiqueta="Estado"
            valor={estado}
            opciones={OPCIONES_DE_ESTADO}
            onChange={setEstado}
            permiteVacio
            vacio="Todos"
            ancho={150}
          />
          <Selector
            etiqueta="Veredicto"
            valor={veredicto}
            opciones={OPCIONES_DE_VEREDICTO}
            onChange={setVeredicto}
            permiteVacio
            vacio="Todos"
            ancho={150}
          />
        </Formulario>

        {puedeRegistrar ? (
          <Acciones>
            <Boton
              titulo={creando ? 'Creando…' : 'Nuevo ensayo'}
              onPress={nuevoEnsayo}
              deshabilitado={creando || faltaObraParaRegistrar}
            />
            {faltaObraParaRegistrar ? (
              <Celda>Elija arriba la obra en la que se registra.</Celda>
            ) : null}
          </Acciones>
        ) : null}
      </Seccion>

      <Tabla
        columnas={columnas}
        filas={visibles}
        vacio={
          ensayos.cargando
            ? 'Cargando los ensayos…'
            : ensayos.datos.length === 0
              ? 'No hay ensayos con fecha de ejecución en este periodo, ni borradores sin fecha.'
              : 'Ningún ensayo coincide con los filtros elegidos.'
        }
      />
    </MarcoPantalla>
  );
}
