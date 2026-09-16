/**
 * Los viajes de cantera de una obra en un periodo (spec 010, RF-20 a RF-25).
 *
 * El periodo lo pide al servidor (por defecto, la última semana); los filtros por
 * volqueta, material, origen y destino se aplican aquí sobre lo que llegó, con
 * `filtrarViajes` (RF-21). Las opciones de esos filtros salen **de los viajes del
 * periodo** y no de los catálogos: así sirven también al residente, que no pide las
 * opciones de registro, y a un sitio ya dado de baja que tuvo viajes.
 *
 * Un viaje no se edita ni se borra (RF-23): lo único es **anular con motivo**, y lo
 * anulado sigue en la lista, marcado, con quién y por qué (RF-24, RF-25). Si la
 * bitácora de ese día ya está cerrada, se anula igual y se avisa que la bitácora lo
 * sigue mostrando (RF-30).
 */
import { useCallback, useEffect, useRef, useState } from 'react';

import { DESTINO_OBRA, filtrarViajes, formatearAbscisa } from '@/shared/rules/cantera';
import { fechaDeJornada, restarDias } from '@/shared/rules/jornada';

import { api } from './cliente-api';
import {
  Acciones,
  AccionesFormulario,
  Aviso,
  Boton,
  Campo,
  Celda,
  Etiqueta,
  Formulario,
  Modal,
  Selector,
  Tabla,
  type Columna,
  type Opcion,
} from './componentes';
import type { ViajeFila } from './contratos';
import { mensajeDe, useListado } from './marco';

const FECHA = /^\d{4}-\d{2}-\d{2}$/;

/** Día y hora en la obra, corto: «16 sept, 09:53 a. m.». */
function momento(iso: string): string {
  return new Date(iso).toLocaleString('es-CO', {
    timeZone: 'America/Bogota',
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/** El destino como se lee: la abscisa si fue a la obra (RF-17), o el sitio. */
export function destinoLegible(viaje: Pick<ViajeFila, 'destinoObra' | 'pr' | 'metros' | 'destino'>) {
  return viaje.destinoObra && viaje.pr !== null && viaje.metros !== null
    ? `Obra, ${formatearAbscisa(viaje.pr, viaje.metros)}`
    : (viaje.destino ?? '—');
}

/** Opciones únicas de un filtro, sacadas de los viajes, en orden alfabético. */
function opcionesDe(viajes: ViajeFila[], valor: (v: ViajeFila) => Opcion | null): Opcion[] {
  const unicas = new Map<string, Opcion>();
  for (const v of viajes) {
    const opcion = valor(v);
    if (opcion) unicas.set(opcion.valor, opcion);
  }
  return [...unicas.values()].sort((a, b) => a.etiqueta.localeCompare(b.etiqueta, 'es'));
}

export function ListadoDeViajes({
  obraId,
  puedeAnular,
  version,
}: {
  obraId: string | null;
  puedeAnular: boolean;
  /** Sube al registrar un viaje, para volver a pedir el periodo. */
  version: number;
}) {
  const hoy = fechaDeJornada();
  const [desde, setDesde] = useState(restarDias(hoy, 6));
  const [hasta, setHasta] = useState(hoy);
  const desdeMal = !FECHA.test(desde.trim());
  const hastaMal = !FECHA.test(hasta.trim());

  // Se pide el periodo solo cuando las dos fechas se pueden leer: mientras se
  // escribe «2026-09-1» no tiene sentido preguntar al servidor. Se decide al
  // escribir, no en un efecto: así cada tecla no dispara un segundo render.
  const [periodo, setPeriodo] = useState({ desde: restarDias(hoy, 6), hasta: hoy });
  function cambiarPeriodo(nuevoDesde: string, nuevoHasta: string) {
    setDesde(nuevoDesde);
    setHasta(nuevoHasta);
    const d = nuevoDesde.trim();
    const h = nuevoHasta.trim();
    if (FECHA.test(d) && FECHA.test(h) && d <= h) setPeriodo({ desde: d, hasta: h });
  }

  const viajes = useListado<ViajeFila>(
    useCallback(
      () => api.cantera.viajes.listar({ obraId, desde: periodo.desde, hasta: periodo.hasta }),
      [obraId, periodo],
    ),
  );

  // Registrar un viaje desde la ventana vuelve a pedir el periodo.
  const { recargar } = viajes;
  const versionVista = useRef(version);
  useEffect(() => {
    if (versionVista.current === version) return;
    versionVista.current = version;
    recargar();
  }, [recargar, version]);

  const [vehiculoId, setVehiculoId] = useState<string | null>(null);
  const [materialId, setMaterialId] = useState<string | null>(null);
  const [origenId, setOrigenId] = useState<string | null>(null);
  const [destino, setDestino] = useState<string | null>(null);

  const [porAnular, setPorAnular] = useState<ViajeFila | null>(null);
  const [hecho, setHecho] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);

  const visibles = filtrarViajes(viajes.datos, { vehiculoId, materialId, origenId, destino });

  const columnas: Columna<ViajeFila>[] = [
    {
      clave: 'cuando',
      titulo: 'Fecha y hora',
      ancho: 110,
      pintar: (v) => (
        <>
          <Celda>{v.fecha}</Celda>
          <Celda>{v.hora}</Celda>
        </>
      ),
    },
    { clave: 'volqueta', titulo: 'Volqueta', ancho: 95, pintar: (v) => <Celda>{v.volqueta}</Celda> },
    {
      clave: 'conductor',
      titulo: 'Conductor',
      ancho: 160,
      pintar: (v) => <Celda lineas={2}>{v.conductor}</Celda>,
    },
    {
      clave: 'material',
      titulo: 'Material',
      ancho: 140,
      pintar: (v) => <Celda lineas={2}>{v.material}</Celda>,
    },
    {
      clave: 'origen',
      titulo: 'Origen',
      ancho: 150,
      pintar: (v) => <Celda lineas={2}>{v.origen}</Celda>,
    },
    {
      clave: 'destino',
      titulo: 'Destino',
      ancho: 170,
      pintar: (v) => <Celda lineas={2}>{destinoLegible(v)}</Celda>,
    },
    {
      clave: 'quien',
      titulo: 'Registró',
      ancho: 180,
      pintar: (v) => (
        <>
          <Celda>{v.registradoPorNombre ?? '—'}</Celda>
          <Celda>{momento(v.registradoEn)}</Celda>
          {v.anulado ? (
            // El motivo entero: es lo único que explica la anulación (RF-24).
            <Celda lineas={4}>
              {`Anulado por ${v.anuladoPorNombre ?? '—'}${v.anuladoEn ? ` el ${momento(v.anuladoEn)}` : ''}: ${v.motivoAnulacion ?? ''}`}
            </Celda>
          ) : null}
        </>
      ),
    },
    {
      clave: 'estado',
      titulo: '',
      ancho: 100,
      pintar: (v) =>
        v.anulado ? (
          <Etiqueta tono="malo">Anulado</Etiqueta>
        ) : puedeAnular ? (
          <Acciones>
            <Boton
              titulo="Anular"
              tono="peligro"
              onPress={() => {
                setHecho(null);
                setAviso(null);
                setPorAnular(v);
              }}
            />
          </Acciones>
        ) : null,
    },
  ];

  return (
    <>
      {hecho ? <Aviso tono="exito">{hecho}</Aviso> : null}
      {/* RF-30: se anuló, pero la bitácora cerrada de ese día sigue mostrando el viaje. */}
      {aviso ? <Aviso tono="info">{aviso}</Aviso> : null}
      {viajes.error ? <Aviso tono="error">{viajes.error}</Aviso> : null}

      <Formulario>
        <Campo
          etiqueta="Desde"
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
          etiqueta="Volqueta"
          valor={vehiculoId}
          opciones={opcionesDe(viajes.datos, (v) => ({ valor: v.vehiculoId, etiqueta: v.volqueta }))}
          onChange={setVehiculoId}
          permiteVacio
          vacio="Todas"
          ancho={150}
        />
        <Selector
          etiqueta="Material"
          valor={materialId}
          opciones={opcionesDe(viajes.datos, (v) => ({ valor: v.materialId, etiqueta: v.material }))}
          onChange={setMaterialId}
          permiteVacio
          vacio="Todos"
          ancho={180}
        />
        <Selector
          etiqueta="Origen"
          valor={origenId}
          opciones={opcionesDe(viajes.datos, (v) => ({ valor: v.origenId, etiqueta: v.origen }))}
          onChange={setOrigenId}
          permiteVacio
          vacio="Todos"
          ancho={200}
        />
        <Selector
          etiqueta="Destino"
          valor={destino}
          opciones={opcionesDe(viajes.datos, (v) =>
            v.destinoObra
              ? { valor: DESTINO_OBRA, etiqueta: 'La obra' }
              : v.destinoId && v.destino
                ? { valor: v.destinoId, etiqueta: v.destino }
                : null,
          )}
          onChange={setDestino}
          permiteVacio
          vacio="Todos"
          ancho={200}
        />
      </Formulario>

      <Tabla
        columnas={columnas}
        filas={visibles}
        vacio={
          viajes.cargando
            ? 'Cargando los viajes…'
            : viajes.datos.length === 0
              ? 'No hay viajes registrados en este periodo.'
              : 'Ningún viaje coincide con los filtros elegidos.'
        }
      />

      {porAnular ? (
        <VentanaAnularViaje
          viaje={porAnular}
          onCerrar={() => setPorAnular(null)}
          onAnulado={(avisoDelServidor) => {
            const viaje = porAnular;
            setPorAnular(null);
            setHecho(`Se anuló el viaje de ${viaje.volqueta} del ${viaje.fecha} a las ${viaje.hora}.`);
            setAviso(avisoDelServidor);
            viajes.recargar();
          }}
        />
      ) : null}
    </>
  );
}

/** Anular un viaje, con motivo escrito (RF-24). */
function VentanaAnularViaje({
  viaje,
  onCerrar,
  onAnulado,
}: {
  viaje: ViajeFila;
  onCerrar: () => void;
  onAnulado: (aviso: string | null) => void;
}) {
  const [motivo, setMotivo] = useState('');
  const [intentado, setIntentado] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const faltaMotivo = motivo.trim().length === 0;

  async function anular() {
    setIntentado(true);
    if (faltaMotivo) return;
    setGuardando(true);
    setError(null);
    try {
      const { aviso } = await api.cantera.viajes.anular(viaje.id, motivo);
      onAnulado(aviso);
    } catch (fallo) {
      setError(mensajeDe(fallo));
    } finally {
      setGuardando(false);
    }
  }

  return (
    <Modal titulo="Anular un viaje" onCerrar={onCerrar}>
      <Aviso tono="info">
        {`Va a anular el viaje de ${viaje.volqueta} del ${viaje.fecha} a las ${viaje.hora}, de ${viaje.origen} a ${destinoLegible(viaje)}. No se borra: queda en la lista, marcado, con su nombre y el motivo.`}
      </Aviso>
      {error ? <Aviso tono="error">{error}</Aviso> : null}
      <Formulario>
        <Campo
          etiqueta="Motivo de la anulación"
          obligatorio
          valor={motivo}
          onChange={setMotivo}
          multilinea
          error={intentado && faltaMotivo ? 'Escriba por qué se anula.' : undefined}
        />
        <AccionesFormulario>
          <Acciones>
            <Boton
              titulo={guardando ? 'Anulando…' : 'Anular viaje'}
              tono="peligro"
              onPress={anular}
              deshabilitado={guardando}
            />
            <Boton titulo="Cancelar" tono="secundario" onPress={onCerrar} />
          </Acciones>
        </AccionesFormulario>
      </Formulario>
    </Modal>
  );
}
