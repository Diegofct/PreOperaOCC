/**
 * El historial de los reportes de WhatsApp (spec 024, RF-58, RF-59; antes, la bandeja
 * de la spec 021, RF-10 a RF-25).
 *
 * Desde la spec 024 el sistema guarda solo lo que llega: la lista abre en lo guardado y
 * dice, de cada mensaje, dónde quedó —Control Cantera, Almacén o la bitácora de su
 * día— con un botón que lleva ahí. Lo que espera a la bitácora, lo pendiente de
 * procesar y lo aprobado a mano antes de la 024 siguen en el filtro.
 *
 * Lo que se reportó en los grupos de la obra, para revisarlo y pasarlo a la
 * bitácora. Arriba, solo para la gerencia, los grupos de WhatsApp con la obra a la
 * que pertenecen —los que todavía no tienen obra, primero (RF-10)—: hasta que se
 * asocian, sus mensajes no salen en ninguna bandeja (RF-11). Abajo, la bandeja: los
 * pendientes por defecto, del más antiguo al más reciente (RF-16), y con el filtro,
 * los ignorados, los aprobados o los descartados (RF-24).
 *
 * La lista no resuelve nada: muestra lo que dijo la IA —categoría, resumen y el
 * motivo de revisión cuando lo hay (RF-17 a RF-19)— para decidir qué abrir. El
 * detalle, con la corrección y la aprobación, va aparte (tareas T20 a T22).
 */
import { router } from 'expo-router';
import { useCallback, useState } from 'react';

import { alcanza } from '@/shared/rules/permisos';
import { etiquetaDeCategoria, type EstadoMensajeWhatsapp } from '@/shared/rules/whatsapp';

import { api } from '../cliente-api';
import {
  Acciones,
  Aviso,
  Boton,
  Celda,
  Etiqueta,
  Seccion,
  Selector,
  Tabla,
  type Columna,
  type Opcion,
  Paginacion,
} from '../componentes';
import type { GrupoFila, ObraFila, PropuestaFila } from '../contratos';
import { MarcoPantalla, useListado } from '../marco';
import { CamposDeFechas, useFiltroDeFechas } from './filtro-de-fechas';
import { CreadoAutomaticamente } from './creado-automaticamente';
import { EstadoDelDia } from './estado-del-dia';
import { NoSePudoGuardar } from './no-se-pudo-guardar';
import { DetalleDeReporte } from './propuesta-reporte';
import { ReportesEsperados } from './reportes-esperados';
import { usePersona } from '../sesion';
import { POR_PAGINA, usePaginacion } from '../usar-listado-filtrado';

/** Día y hora en la obra, corto: «3 oct, 07:30 p. m.». */
function momento(iso: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('es-CO', {
    timeZone: 'America/Bogota',
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

const ESTADOS: { valor: EstadoMensajeWhatsapp; etiqueta: string }[] = [
  { valor: 'guardado', etiqueta: 'Guardados' },
  { valor: 'en_espera', etiqueta: 'En espera de la bitácora' },
  { valor: 'pendiente', etiqueta: 'Sin procesar' },
  { valor: 'ignorado', etiqueta: 'Ignorados' },
  { valor: 'aprobado', etiqueta: 'Aprobados a mano' },
  { valor: 'descartado', etiqueta: 'Descartados' },
];

/** Las pestañas del módulo (spec 024, RF-55 a RF-64). Las siguientes llegan con sus tareas. */
const PESTANAS = [
  { valor: 'historial', titulo: 'Historial' },
  { valor: 'dias', titulo: 'Estado del día' },
  { valor: 'excepciones', titulo: 'No se pudo guardar' },
  { valor: 'creados', titulo: 'Creado automáticamente' },
  { valor: 'esperados', titulo: 'Reportes esperados' },
] as const;

type Pestana = (typeof PESTANAS)[number]['valor'];

/** «1 viaje», «3 viajes». */
function cuenta(n: number, singular: string, plural: string): string {
  return `${n} ${n === 1 ? singular : plural}`;
}

/** Adónde lleva el botón de un mensaje del historial (RF-59). */
interface Enlace {
  titulo: string;
  ruta: '/panel/bitacoras' | '/panel/cantera' | '/panel/almacen';
  params: Record<string, string>;
}

/**
 * Dónde quedó un mensaje, en renglones cortos, y adónde lleva su botón (spec 024,
 * RF-58, RF-59). Sale del resultado que el sistema dejó al guardarlo.
 */
function dondeQuedo(p: PropuestaFila): { renglones: string[]; enlace: Enlace | null } {
  const r = p.resultado ?? {};
  const viajes = r.guardados?.length ?? 0;
  const extra = [
    r.repetidos ? cuenta(r.repetidos, 'ya estaba guardado', 'ya estaban guardados') : null,
    r.apartados ? `${cuenta(r.apartados, 'renglón', 'renglones')} en «No se pudo guardar»` : null,
  ].filter((x): x is string => !!x);
  const delDia = { obraId: p.obraId, ...(p.fechaHecho ? { fecha: p.fechaHecho } : {}) };

  switch (p.estado) {
    case 'en_espera':
      return {
        renglones: [
          `Espera la bitácora del ${p.fechaHecho ?? 'día'}`,
          ...(viajes ? [`${cuenta(viajes, 'viaje', 'viajes')} ya en Control Cantera`] : []),
          ...extra,
        ],
        enlace: viajes ? { titulo: 'Ver viajes', ruta: '/panel/cantera', params: delDia } : null,
      };
    case 'guardado':
      if (r.modulo === 'cantera') {
        return {
          renglones: [`Control Cantera: ${cuenta(viajes, 'viaje', 'viajes')}`, ...extra],
          enlace: viajes ? { titulo: 'Ver viajes', ruta: '/panel/cantera', params: delDia } : null,
        };
      }
      if (r.modulo === 'almacen') {
        return {
          renglones: [`Almacén: ${cuenta(viajes, 'movimiento', 'movimientos')}`, ...extra],
          enlace: viajes ? { titulo: 'Ver almacén', ruta: '/panel/almacen', params: { obraId: p.obraId } } : null,
        };
      }
      return {
        renglones: [
          r.parteId ? `Bitácora del ${p.fechaHecho ?? 'día'}` : 'No llegó a la bitácora',
          ...(viajes ? [`${cuenta(viajes, 'viaje', 'viajes')} en Control Cantera`] : []),
          ...extra,
        ],
        enlace: r.parteId ? { titulo: 'Ver bitácora', ruta: '/panel/bitacoras', params: delDia } : null,
      };
    case 'aprobado':
      return { renglones: ['Aprobado a mano (antes del guardado automático)'], enlace: null };
    case 'pendiente':
      return { renglones: ['Todavía no se procesa'], enlace: null };
    default:
      return { renglones: ['—'], enlace: null };
  }
}

const TONO_DEL_ESTADO: Record<EstadoMensajeWhatsapp, 'neutro' | 'atencion' | 'malo' | 'bueno'> = {
  pendiente: 'atencion',
  ignorado: 'neutro',
  aprobado: 'bueno',
  descartado: 'malo',
  en_espera: 'atencion',
  guardado: 'bueno',
};

const NOMBRE_DEL_ESTADO: Record<EstadoMensajeWhatsapp, string> = {
  pendiente: 'Pendiente',
  ignorado: 'Ignorado',
  aprobado: 'Aprobado',
  descartado: 'Descartado',
  en_espera: 'En espera de la bitácora',
  guardado: 'Guardado',
};

export default function PantallaBandeja() {
  const { rol } = usePersona();
  // La gerencia ve todas las obras: asocia grupos y puede filtrar por obra (RF-9, RF-14).
  const esGerencia = alcanza(rol, 'obras', 'listar');

  const [pestana, setPestana] = useState<Pestana>('historial');
  const [estado, setEstado] = useState<EstadoMensajeWhatsapp>('guardado');
  const [obraId, setObraId] = useState<string | null>(null);
  // El reporte abierto. Al volver, la bandeja se vuelve a pedir: pudo cambiar.
  const [abierta, setAbierta] = useState<string | null>(null);

  const obras = useListado<ObraFila>(
    useCallback(() => (esGerencia ? api.obras.listar() : Promise.resolve([])), [esGerencia]),
  );
  // El rango de días del reporte, en la dirección (spec 025, RF-45, RF-49, RF-54).
  const fechas = useFiltroDeFechas();
  const { desde, hasta } = fechas.consultado;
  const propuestas = useListado<PropuestaFila>(
    useCallback(
      () => api.whatsapp.propuestas.listar(estado, obraId, { desde, hasta }),
      [estado, obraId, desde, hasta],
    ),
  );

  const opcionesDeObra: Opcion[] = obras.datos
    .filter((o) => o.activa)
    .map((o) => ({ valor: o.id, etiqueta: o.nombre }));

  const columnas: Columna<PropuestaFila>[] = [
    {
      clave: 'recibido',
      titulo: 'Enviado',
      ancho: 115,
      ordenar: (p) => p.enviadoEn,
      pintar: (p) => <Celda lineas={2}>{momento(p.enviadoEn)}</Celda>,
    },
    {
      // Spec 024: el grupo se lee en el detalle; aquí, quién y de qué obra, para que
      // quepa «Dónde quedó» sin pasar del ancho de la pantalla (spec 022).
      clave: 'autor',
      titulo: 'Autor y obra',
      ancho: 150,
      pintar: (p) => (
        <>
          <Celda lineas={2}>{p.autorNombre ?? 'Sin nombre'}</Celda>
          <Celda>{p.obraNombre}</Celda>
        </>
      ),
    },
    {
      clave: 'categoria',
      titulo: 'Categoría',
      ancho: 120,
      pintar: (p) => <Celda lineas={2}>{etiquetaDeCategoria(p.categoria)}</Celda>,
    },
    {
      clave: 'resumen',
      titulo: 'Qué entendió la IA',
      ancho: 255,
      // La que cede cuando falta sitio (spec 022, RF-27): es la de más texto y se
      // lee bien en varios renglones; así los botones conservan su ancho.
      anchoMinimo: 140,
      pintar: (p) => (
        <>
          <Celda lineas={3}>{p.resumen ?? '—'}</Celda>
          {p.motivoRevision ? <Celda lineas={3}>{`Revisar: ${p.motivoRevision}`}</Celda> : null}
        </>
      ),
    },
    {
      clave: 'archivos',
      titulo: 'Adjuntos',
      ancho: 90,
      // No por debajo de su título: «ADJUNTOS» se partía a media palabra (spec 022).
      anchoMinimo: 84,
      pintar: (p) => (
        <Celda lineas={2}>
          {p.archivos === 0 ? '—' : `${p.archivos} ${p.archivos === 1 ? 'archivo' : 'archivos'}`}
        </Celda>
      ),
    },
    {
      // Spec 024, RF-58, RF-59: el estado, qué se guardó, dónde, y un botón que lleva ahí.
      clave: 'donde',
      titulo: 'Estado y dónde quedó',
      ancho: 210,
      anchoMinimo: 170,
      pintar: (p) => {
        const { renglones, enlace } = dondeQuedo(p);
        return (
          <>
            <Etiqueta tono={TONO_DEL_ESTADO[p.estado]}>{NOMBRE_DEL_ESTADO[p.estado]}</Etiqueta>
            {p.viajesAprobados ? <Celda lineas={2}>Viajes ya registrados</Celda> : null}
            {renglones.map((r) => (
              <Celda key={r} lineas={2}>
                {r}
              </Celda>
            ))}
            {enlace ? (
              <Boton
                titulo={enlace.titulo}
                tono="secundario"
                onPress={() => router.push({ pathname: enlace.ruta, params: enlace.params })}
              />
            ) : null}
          </>
        );
      },
    },
    {
      clave: 'abrir',
      titulo: '',
      ancho: 100,
      // No por debajo de su botón: «Revisar» mide 87 (spec 022, RF-27).
      anchoMinimo: 90,
      pintar: (p) => (
        <Acciones>
          <Boton
            titulo={p.estado === 'pendiente' ? 'Revisar' : 'Ver'}
            tono={p.estado === 'pendiente' ? 'primario' : 'secundario'}
            onPress={() => setAbierta(p.id)}
          />
        </Acciones>
      ),
    },
  ];

  // Páginas de 15 (spec 025, RF-55 a RF-58).
  const paginaDelHistorial = usePaginacion(propuestas.datos, `${estado}|${obraId}|${desde}|${hasta}`);

  return (
    <MarcoPantalla
      modulo="whatsapp"
      exigeObra
      titulo="Reportes de WhatsApp"
      descripcion="Lo que se reportó en los grupos de la obra se guarda solo en su módulo. Aquí se ve qué se guardó y dónde."
      error={propuestas.error}
      cargando={propuestas.cargando}
    >
      {abierta ? (
        <DetalleDeReporte
          id={abierta}
          alVolver={() => {
            setAbierta(null);
            propuestas.recargar();
          }}
        />
      ) : null}
      {!abierta && esGerencia ? (
        <GruposDeWhatsapp opcionesDeObra={opcionesDeObra} alAsociar={propuestas.recargar} />
      ) : null}

      {abierta ? null : (
        <Acciones>
          {PESTANAS.map((p) => (
            <Boton
              key={p.valor}
              titulo={p.titulo}
              tono={pestana === p.valor ? 'primario' : 'secundario'}
              onPress={() => setPestana(p.valor)}
            />
          ))}
        </Acciones>
      )}
      {!abierta && pestana === 'dias' ? <EstadoDelDia opcionesDeObra={opcionesDeObra} /> : null}
      {!abierta && pestana === 'excepciones' ? <NoSePudoGuardar opcionesDeObra={opcionesDeObra} /> : null}
      {!abierta && pestana === 'creados' ? <CreadoAutomaticamente opcionesDeObra={opcionesDeObra} /> : null}
      {!abierta && pestana === 'esperados' ? <ReportesEsperados opcionesDeObra={opcionesDeObra} /> : null}

      {abierta || pestana !== 'historial' ? null : (
      <Seccion titulo="Historial">
        <Acciones>
          <Selector
            etiqueta="Estado"
            valor={estado}
            opciones={ESTADOS.map((e) => ({ valor: e.valor, etiqueta: e.etiqueta }))}
            onChange={(v) => setEstado((v as EstadoMensajeWhatsapp | null) ?? 'guardado')}
            ancho={200}
          />
          {esGerencia ? (
            <Selector
              etiqueta="Obra"
              valor={obraId}
              opciones={opcionesDeObra}
              onChange={setObraId}
              vacio="Todas las obras"
              permiteVacio
              ancho={280}
            />
          ) : null}
          <CamposDeFechas filtro={fechas} />
        </Acciones>
        <>
          <Tabla
            columnas={columnas}
            filas={paginaDelHistorial.pagina}
            vacio={`No hay reportes en «${ESTADOS.find((e) => e.valor === estado)!.etiqueta}» entre el ${desde} y el ${hasta}.`}
          />
          <Paginacion
            pagina={paginaDelHistorial.paginaActual}
            porPagina={POR_PAGINA}
            total={paginaDelHistorial.total}
            onCambiar={paginaDelHistorial.irAPagina}
          />
        </>
      </Seccion>
      )}
    </MarcoPantalla>
  );
}

/**
 * Los grupos de WhatsApp y su obra, para la gerencia (RF-8 a RF-13). Asociar es
 * elegir la obra y guardar; cambiarla, lo mismo. Al hacerlo, los pendientes del
 * grupo pasan a la bandeja de esa obra, y lo ya decidido se queda donde estaba.
 */
function GruposDeWhatsapp({
  opcionesDeObra,
  alAsociar,
}: {
  opcionesDeObra: Opcion[];
  alAsociar: () => void;
}) {
  const grupos = useListado<GrupoFila>(useCallback(() => api.whatsapp.grupos.listar(), []));
  const [elegidas, setElegidas] = useState<Record<string, string | null>>({});
  const [hecho, setHecho] = useState<string | null>(null);

  const sinObra = grupos.datos.filter((g) => !g.obraId).length;

  async function asociar(grupo: GrupoFila) {
    const obraId = elegidas[grupo.id];
    if (!obraId) return;
    setHecho(null);
    const bien = await grupos.ejecutar(() => api.whatsapp.grupos.asociar(grupo.id, obraId));
    if (bien) {
      const nombre = opcionesDeObra.find((o) => o.valor === obraId)?.etiqueta ?? 'la obra';
      setHecho(`«${grupo.nombre}» quedó en ${nombre}. Sus pendientes ya están en esa bandeja.`);
      setElegidas((antes) => ({ ...antes, [grupo.id]: null }));
      alAsociar();
    }
  }

  const columnas: Columna<GrupoFila>[] = [
    {
      clave: 'grupo',
      titulo: 'Grupo de WhatsApp',
      ancho: 250,
      pintar: (g) => <Celda lineas={2}>{g.nombre}</Celda>,
    },
    {
      clave: 'obra',
      titulo: 'Obra',
      ancho: 210,
      pintar: (g) =>
        g.obraNombre ? (
          <Celda lineas={2}>{g.obraNombre}</Celda>
        ) : (
          <Etiqueta tono="atencion">Sin obra</Etiqueta>
        ),
    },
    {
      clave: 'pendientes',
      titulo: 'Pendientes',
      ancho: 100,
      pintar: (g) => <Celda>{String(g.pendientes)}</Celda>,
    },
    {
      clave: 'ultimo',
      titulo: 'Último mensaje',
      ancho: 130,
      pintar: (g) => <Celda>{momento(g.ultimoMensajeEn)}</Celda>,
    },
    {
      clave: 'asociar',
      titulo: 'Asociar a',
      ancho: 260,
      pintar: (g) => (
        <Selector
          etiqueta={g.obraId ? 'Cambiar a' : 'Obra'}
          valor={elegidas[g.id] ?? null}
          opciones={opcionesDeObra.filter((o) => o.valor !== g.obraId)}
          onChange={(v) => setElegidas((antes) => ({ ...antes, [g.id]: v }))}
          vacio="Elija la obra"
        />
      ),
    },
    {
      clave: 'accion',
      titulo: '',
      ancho: 110,
      // No por debajo de su botón: «Cambiar» y «Asociar» miden 91 (spec 022, RF-27).
      anchoMinimo: 94,
      pintar: (g) => (
        <Acciones>
          <Boton
            titulo={g.obraId ? 'Cambiar' : 'Asociar'}
            tono={g.obraId ? 'secundario' : 'primario'}
            deshabilitado={!elegidas[g.id]}
            onPress={() => asociar(g)}
          />
        </Acciones>
      ),
    },
  ];

  // Páginas de 15 (spec 025, RF-55 a RF-58).
  const paginaDeGrupos = usePaginacion(grupos.datos);

  return (
    <Seccion titulo="Grupos de WhatsApp">
      {sinObra > 0 ? (
        <Aviso tono="info">
          {sinObra === 1
            ? 'Hay un grupo sin obra: sus mensajes no salen en ninguna bandeja hasta que lo asocie.'
            : `Hay ${sinObra} grupos sin obra: sus mensajes no salen en ninguna bandeja hasta que los asocie.`}
        </Aviso>
      ) : null}
      {grupos.error ? <Aviso tono="error">{grupos.error}</Aviso> : null}
      {hecho ? <Aviso tono="exito">{hecho}</Aviso> : null}
      <>
        <Tabla columnas={columnas} filas={paginaDeGrupos.pagina} vacio="Todavía no ha llegado ningún grupo." />
        <Paginacion
          pagina={paginaDeGrupos.paginaActual}
          porPagina={POR_PAGINA}
          total={paginaDeGrupos.total}
          onCambiar={paginaDeGrupos.irAPagina}
        />
      </>
    </Seccion>
  );
}
