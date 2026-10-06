/**
 * La bandeja de reportes de WhatsApp (spec 021, RF-10 a RF-25).
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
} from '../componentes';
import type { GrupoFila, ObraFila, PropuestaFila } from '../contratos';
import { MarcoPantalla, useListado } from '../marco';
import { DetalleDeReporte } from './propuesta-reporte';
import { usePersona } from '../sesion';

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
  { valor: 'pendiente', etiqueta: 'Pendientes' },
  { valor: 'ignorado', etiqueta: 'Ignorados' },
  { valor: 'aprobado', etiqueta: 'Aprobados' },
  { valor: 'descartado', etiqueta: 'Descartados' },
];

const TONO_DEL_ESTADO: Record<EstadoMensajeWhatsapp, 'neutro' | 'atencion' | 'malo' | 'bueno'> = {
  pendiente: 'atencion',
  ignorado: 'neutro',
  aprobado: 'bueno',
  descartado: 'malo',
};

const NOMBRE_DEL_ESTADO: Record<EstadoMensajeWhatsapp, string> = {
  pendiente: 'Pendiente',
  ignorado: 'Ignorado',
  aprobado: 'Aprobado',
  descartado: 'Descartado',
};

export default function PantallaBandeja() {
  const { rol } = usePersona();
  // La gerencia ve todas las obras: asocia grupos y puede filtrar por obra (RF-9, RF-14).
  const esGerencia = alcanza(rol, 'obras', 'listar');

  const [estado, setEstado] = useState<EstadoMensajeWhatsapp>('pendiente');
  const [obraId, setObraId] = useState<string | null>(null);
  // El reporte abierto. Al volver, la bandeja se vuelve a pedir: pudo cambiar.
  const [abierta, setAbierta] = useState<string | null>(null);

  const obras = useListado<ObraFila>(
    useCallback(() => (esGerencia ? api.obras.listar() : Promise.resolve([])), [esGerencia]),
  );
  const propuestas = useListado<PropuestaFila>(
    useCallback(() => api.whatsapp.propuestas.listar(estado, obraId), [estado, obraId]),
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
      clave: 'grupo',
      titulo: 'Grupo y obra',
      ancho: 180,
      pintar: (p) => (
        <>
          <Celda lineas={2}>{p.grupoNombre}</Celda>
          <Celda>{p.obraNombre}</Celda>
        </>
      ),
    },
    {
      clave: 'autor',
      titulo: 'Autor',
      ancho: 130,
      pintar: (p) => <Celda lineas={2}>{p.autorNombre ?? 'Sin nombre'}</Celda>,
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
      pintar: (p) => (
        <Celda lineas={2}>
          {p.archivos === 0 ? '—' : `${p.archivos} ${p.archivos === 1 ? 'archivo' : 'archivos'}`}
        </Celda>
      ),
    },
    {
      clave: 'estado',
      titulo: 'Estado',
      ancho: 110,
      pintar: (p) => (
        <>
          <Etiqueta tono={TONO_DEL_ESTADO[p.estado]}>{NOMBRE_DEL_ESTADO[p.estado]}</Etiqueta>
          {p.viajesAprobados ? <Celda lineas={2}>Viajes ya registrados</Celda> : null}
        </>
      ),
    },
    {
      clave: 'abrir',
      titulo: '',
      ancho: 100,
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

  return (
    <MarcoPantalla
      modulo="whatsapp"
      exigeObra
      titulo="Reportes de WhatsApp"
      descripcion="Lo que se reportó en los grupos de la obra. Revíselo, corríjalo si hace falta y apruébelo para pasarlo a la bitácora."
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
      <Seccion titulo="Bandeja">
        <Acciones>
          <Selector
            etiqueta="Estado"
            valor={estado}
            opciones={ESTADOS.map((e) => ({ valor: e.valor, etiqueta: e.etiqueta }))}
            onChange={(v) => setEstado((v as EstadoMensajeWhatsapp | null) ?? 'pendiente')}
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
        </Acciones>
        <Tabla
          columnas={columnas}
          filas={propuestas.datos}
          vacio={
            estado === 'pendiente'
              ? 'No hay reportes pendientes de revisar.'
              : `No hay reportes ${ESTADOS.find((e) => e.valor === estado)!.etiqueta.toLowerCase()}.`
          }
        />
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
      <Tabla columnas={columnas} filas={grupos.datos} vacio="Todavía no ha llegado ningún grupo." />
    </Seccion>
  );
}
