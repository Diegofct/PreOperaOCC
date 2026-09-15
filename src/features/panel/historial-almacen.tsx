/**
 * El historial de un material: cada ingreso y cada salida, con el stock que dejó
 * (spec 009, RF-20 a RF-27).
 *
 * Va en una sección de la página y no en una ventana: es una tabla de siete
 * columnas, y en una ventana emergente cabría a medias. Lo ven todos los que ven
 * el almacén, residente incluido (RF-29); anular es solo de quien escribe.
 *
 * ── Un movimiento no se edita ni se borra ──
 *
 * No hay botón de corregir ni de borrar (RF-23). Lo único es **anular con
 * motivo**, y lo anulado sigue en la lista, marcado, sin saldo y con quién lo
 * anuló y por qué (RF-24, RF-25, RF-27). Un inventario al que se le pueden quitar
 * filas deja de ser creíble.
 *
 * ── Filtros ──
 *
 * Periodo y tipo, sobre el historial completo que ya llegó (RF-21), con
 * `filtrarMovimientos`. El saldo de cada fila **no cambia al filtrar**: es el que
 * dejó ese movimiento en el historial entero, y así lo calcula el servidor.
 *
 * Se muestra del más reciente al más antiguo: lo que se busca casi siempre es lo
 * último que pasó.
 */
import { useCallback, useEffect, useRef, useState } from 'react';

import {
  filtrarMovimientos,
  formatearCantidad,
  rechazoDeAnulacion,
  type TipoMovimiento,
} from '@/shared/rules/almacen';

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
  Seccion,
  Selector,
  Tabla,
  type Columna,
} from './componentes';
import type { MaterialDeAlmacenFila, MovimientoDeAlmacenFila } from './contratos';
import { mensajeDe, useListado } from './marco';

const FECHA = /^\d{4}-\d{2}-\d{2}$/;

/** Día y hora en la obra, corto: «15 sept, 04:58 p. m.». */
function momento(iso: string): string {
  return new Date(iso).toLocaleString('es-CO', {
    timeZone: 'America/Bogota',
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function HistorialAlmacen({
  material,
  puedeAnular,
  onCerrar,
  onAnulado,
}: {
  material: MaterialDeAlmacenFila;
  puedeAnular: boolean;
  onCerrar: () => void;
  /** Tras anular: la página recarga los stocks y dice qué pasó. */
  onAnulado: (mensaje: string) => void;
}) {
  const historial = useListado<MovimientoDeAlmacenFila>(
    useCallback(() => api.almacen.movimientos.listar({ materialId: material.id }), [material.id]),
  );

  // Cuando el stock del material cambia —se anuló algo aquí, o se registró un
  // ingreso o una salida desde la tabla con el historial abierto—, el historial ya
  // no es el de ahora y se vuelve a pedir. Solo si cambió: al abrirlo ya se pidió.
  const { recargar } = historial;
  const stockVisto = useRef(material.stock);
  useEffect(() => {
    if (stockVisto.current === material.stock) return;
    stockVisto.current = material.stock;
    recargar();
  }, [recargar, material.stock]);

  const [desde, setDesde] = useState('');
  const [hasta, setHasta] = useState('');
  const [tipo, setTipo] = useState<TipoMovimiento | null>(null);
  const [porAnular, setPorAnular] = useState<MovimientoDeAlmacenFila | null>(null);

  const desdeMal = desde.trim() !== '' && !FECHA.test(desde.trim());
  const hastaMal = hasta.trim() !== '' && !FECHA.test(hasta.trim());

  const visibles = filtrarMovimientos(historial.datos, {
    desde: desdeMal ? null : desde.trim() || null,
    hasta: hastaMal ? null : hasta.trim() || null,
    tipo,
  }).reverse();

  const unidad = material.unidad;

  const columnas: Columna<MovimientoDeAlmacenFila>[] = [
    { clave: 'fecha', titulo: 'Fecha', ancho: 105, pintar: (m) => <Celda>{m.fecha}</Celda> },
    {
      clave: 'tipo',
      titulo: 'Tipo',
      ancho: 100,
      pintar: (m) => (
        <Etiqueta tono={m.tipo === 'ingreso' ? 'bueno' : 'neutro'}>
          {m.tipo === 'ingreso' ? 'Ingreso' : 'Salida'}
        </Etiqueta>
      ),
    },
    {
      clave: 'cantidad',
      titulo: 'Cantidad',
      ancho: 120,
      pintar: (m) => (
        <Celda>{`${m.tipo === 'salida' ? '−' : '+'}${formatearCantidad(m.cantidad, unidad)}`}</Celda>
      ),
    },
    {
      clave: 'saldo',
      titulo: 'Stock que dejó',
      ancho: 130,
      pintar: (m) => <Celda>{m.saldo === null ? '—' : formatearCantidad(m.saldo, unidad)}</Celda>,
    },
    {
      clave: 'quien',
      titulo: 'Registró',
      ancho: 170,
      pintar: (m) => (
        <>
          <Celda>{m.registradoPorNombre ?? '—'}</Celda>
          <Celda>{momento(m.registradoEn)}</Celda>
        </>
      ),
    },
    {
      clave: 'detalle',
      titulo: 'Para qué / observación',
      ancho: 330,
      pintar: (m) => (
        <>
          <Celda>{(m.tipo === 'salida' ? m.paraQue : m.observacion) ?? '—'}</Celda>
          {m.anulado ? (
            <Celda>
              {`Anulado por ${m.anuladoPorNombre ?? '—'}${m.anuladoEn ? ` el ${momento(m.anuladoEn)}` : ''}: ${m.motivoAnulacion ?? ''}`}
            </Celda>
          ) : null}
        </>
      ),
    },
    {
      clave: 'estado',
      titulo: '',
      ancho: 150,
      pintar: (m) =>
        m.anulado ? (
          <Etiqueta tono="malo">Anulado</Etiqueta>
        ) : puedeAnular ? (
          <Acciones>
            <Boton titulo="Anular" tono="peligro" onPress={() => setPorAnular(m)} />
          </Acciones>
        ) : null,
    },
  ];

  return (
    <Seccion titulo={`Historial de ${material.nombre}`}>
      <Aviso tono="info">
        {`Stock actual: ${formatearCantidad(material.stock, unidad)}. Un movimiento no se corrige ni se borra: si está equivocado, se anula con motivo y deja de contar en el stock.`}
      </Aviso>

      {historial.error ? <Aviso tono="error">{historial.error}</Aviso> : null}

      <Formulario>
        <Campo
          etiqueta="Desde"
          valor={desde}
          onChange={setDesde}
          ayuda="AAAA-MM-DD"
          error={desdeMal ? 'La fecha va en formato AAAA-MM-DD.' : undefined}
          ancho={150}
        />
        <Campo
          etiqueta="Hasta"
          valor={hasta}
          onChange={setHasta}
          ayuda="AAAA-MM-DD"
          error={hastaMal ? 'La fecha va en formato AAAA-MM-DD.' : undefined}
          ancho={150}
        />
        <Selector
          etiqueta="Tipo"
          valor={tipo}
          opciones={[
            { valor: 'ingreso', etiqueta: 'Ingresos' },
            { valor: 'salida', etiqueta: 'Salidas' },
          ]}
          onChange={(v) => setTipo(v as TipoMovimiento | null)}
          permiteVacio
          vacio="Ingresos y salidas"
          ancho={190}
        />
        <Boton titulo="Cerrar historial" tono="secundario" onPress={onCerrar} />
      </Formulario>

      <Tabla
        columnas={columnas}
        filas={visibles}
        vacio={
          historial.cargando
            ? 'Cargando el historial…'
            : historial.datos.length === 0
              ? 'Este material todavía no tiene movimientos.'
              : 'Ningún movimiento coincide con el periodo y el tipo elegidos.'
        }
      />

      {porAnular ? (
        <VentanaAnularMovimiento
          movimiento={porAnular}
          material={material}
          onCerrar={() => setPorAnular(null)}
          onAnulado={(mensaje) => {
            setPorAnular(null);
            onAnulado(mensaje);
          }}
        />
      ) : null}
    </Seccion>
  );
}

/**
 * Anular un movimiento, con motivo escrito (RF-24).
 *
 * Anular un ingreso cuyo material ya salió dejaría el stock negativo (RF-26). Se
 * dice antes de escribir el motivo, con el texto del servidor, y no se ofrece el
 * botón: pedir un motivo para luego rechazarlo sería hacer escribir en balde.
 */
function VentanaAnularMovimiento({
  movimiento,
  material,
  onCerrar,
  onAnulado,
}: {
  movimiento: MovimientoDeAlmacenFila;
  material: MaterialDeAlmacenFila;
  onCerrar: () => void;
  onAnulado: (mensaje: string) => void;
}) {
  const [motivo, setMotivo] = useState('');
  const [intentado, setIntentado] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const rechazo = rechazoDeAnulacion(movimiento, material.stock, material.unidad);
  const faltaMotivo = motivo.trim().length === 0;
  const cuanto = formatearCantidad(movimiento.cantidad, material.unidad);
  const que = `${movimiento.tipo === 'ingreso' ? 'el ingreso' : 'la salida'} de ${cuanto} del ${movimiento.fecha}`;

  async function anular() {
    setIntentado(true);
    if (faltaMotivo || rechazo) return;
    setGuardando(true);
    setError(null);
    try {
      await api.almacen.movimientos.anular(movimiento.id, motivo);
      onAnulado(`Se anuló ${que} de ${material.nombre}.`);
    } catch (fallo) {
      // El rechazo del servidor (otro movimiento entró en medio) se lee aquí: el
      // aviso de la página queda detrás del telón.
      setError(mensajeDe(fallo));
    } finally {
      setGuardando(false);
    }
  }

  return (
    <Modal titulo="Anular un movimiento" onCerrar={onCerrar}>
      <Aviso tono={rechazo ? 'error' : 'info'}>
        {rechazo ??
          `Va a anular ${que}. No se borra: queda en el historial, marcado, con su nombre y el motivo, y deja de contar en el stock.`}
      </Aviso>
      {error ? <Aviso tono="error">{error}</Aviso> : null}
      {rechazo ? (
        <AccionesFormulario>
          <Boton titulo="Entendido" tono="secundario" onPress={onCerrar} />
        </AccionesFormulario>
      ) : (
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
                titulo={guardando ? 'Anulando…' : 'Anular movimiento'}
                tono="peligro"
                onPress={anular}
                deshabilitado={guardando}
              />
              <Boton titulo="Cancelar" tono="secundario" onPress={onCerrar} />
            </Acciones>
          </AccionesFormulario>
        </Formulario>
      )}
    </Modal>
  );
}
