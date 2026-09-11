/**
 * Registro de la flota.
 *
 * El tipo de equipo es lo único que no se puede cambiar de opinión a la ligera:
 * decide qué formato de preoperacional le sale al operador y qué medidor se le
 * pide. Por eso viene de un catálogo cerrado y no de un campo de texto.
 *
 * Las lecturas de partida importan más de lo que parece. El preoperacional del
 * día valida la lectura contra la última conocida; si el vehículo nace sin
 * ninguna, la primera cifra que digite el operador se acepta tal cual, y un
 * dígito de más pasa inadvertido hasta que alguien revise el histórico meses
 * después.
 */
import { useCallback, useState } from 'react';

import { formatoPendiente } from '@/shared/catalogos/tipos-vehiculo';

import { api } from './cliente-api';
import {
  Acciones,
  AccionesFormulario,
  Aviso,
  BarraDeListado,
  Boton,
  Campo,
  Celda,
  Confirmacion,
  Confirmado,
  Etiqueta,
  Formulario,
  Paginacion,
  Seccion,
  Selector,
  Tabla,
  type Columna,
} from './componentes';
import {
  ESTADOS_VEHICULO,
  ETIQUETA_ESTADO_VEHICULO,
  type ObraFila,
  type TipoVehiculoFila,
  type VehiculoFila,
} from './contratos';
import { MarcoPantalla, useListado } from './marco';
import { SeccionLlantas } from './seccion-llantas';
import { POR_PAGINA, useListadoFiltrado } from './usar-listado-filtrado';
import { VentanaCorregirVehiculo } from './ventana-vehiculo';

/** Cadena de formulario → número, con lo vacío como ausencia y no como cero. */
function aNumero(texto: string): number | null {
  const limpio = texto.trim();
  if (limpio === '') return null;
  const valor = Number(limpio);
  return Number.isFinite(valor) ? Math.trunc(valor) : null;
}

export default function PantallaVehiculos() {
  const vehiculos = useListado<VehiculoFila>(useCallback(() => api.vehiculos.listar(), []));
  const tipos = useListado<TipoVehiculoFila>(useCallback(() => api.tiposVehiculo.listar(), []));
  const obras = useListado<ObraFila>(useCallback(() => api.obras.listar(), []));

  const [codigoInterno, setCodigoInterno] = useState('');
  const [placa, setPlaca] = useState('');
  const [tipoVehiculoId, setTipoVehiculoId] = useState<string | null>(null);
  const [marca, setMarca] = useState('');
  const [modelo, setModelo] = useState('');
  const [obraId, setObraId] = useState<string | null>(null);
  const [odometro, setOdometro] = useState('');
  const [horometro, setHorometro] = useState('');

  const tipoElegido = tipos.datos.find((t) => t.id === tipoVehiculoId);
  // El tipo existe en el catálogo pero OCC aún no entregó su formato. Se puede
  // registrar el equipo —hace falta para asignarlo y para la bitácora—, pero no
  // se le podrá levantar un preoperacional hasta que llegue la hoja.
  const sinFormato = formatoPendiente(tipoVehiculoId);
  const pideOdometro = tipoElegido?.claseMedidor !== 'horometro';
  const pideHorometro = tipoElegido?.claseMedidor !== 'odometro';

  /** Filtros propios de esta pantalla, encima de la búsqueda por texto. */
  const [obraFiltro, setObraFiltro] = useState<string | null>(null);
  const [estadoFiltro, setEstadoFiltro] = useState<string | null>(null);

  const filtrado = useListadoFiltrado(
    vehiculos.datos,
    (v) => [v.codigoInterno, v.placa, v.marca, v.modelo, v.tipoNombre, v.obraNombre],
    useCallback(
      (v: VehiculoFila) =>
        (obraFiltro === null || v.obraId === obraFiltro) &&
        (estadoFiltro === null || v.estado === estadoFiltro),
      [obraFiltro, estadoFiltro],
    ),
  );

  const [editando, setEditando] = useState<VehiculoFila | null>(null);
  const [porDarDeBaja, setPorDarDeBaja] = useState<VehiculoFila | null>(null);
  const [hecho, setHecho] = useState<string | null>(null);

  async function crear() {
    if (!tipoVehiculoId) return;

    const creado = await vehiculos.ejecutar(() =>
      api.vehiculos.crear({
        codigoInterno,
        placa,
        tipoVehiculoId,
        marca,
        modelo,
        obraId,
        odometroKm: pideOdometro ? aNumero(odometro) : null,
        horometroH: pideHorometro ? aNumero(horometro) : null,
        estado: 'operativo',
      }),
    );

    if (creado) {
      setHecho(codigoInterno + ' quedó registrado.');
      setCodigoInterno('');
      setPlaca('');
      setMarca('');
      setModelo('');
      setOdometro('');
      setHorometro('');
    }
  }

  const columnas: Columna<VehiculoFila>[] = [
    {
      clave: 'codigo',
      titulo: 'Código',
      ancho: 105,
      pintar: (v) => <Celda>{v.codigoInterno}</Celda>,
    },
    { clave: 'tipo', titulo: 'Tipo', ancho: 145, pintar: (v) => <Celda>{v.tipoNombre}</Celda> },
    { clave: 'placa', titulo: 'Placa', ancho: 95, pintar: (v) => <Celda>{v.placa ?? '—'}</Celda> },
    {
      clave: 'maquina',
      titulo: 'Marca y modelo',
      ancho: 160,
      pintar: (v) => <Celda>{[v.marca, v.modelo].filter(Boolean).join(' ') || '—'}</Celda>,
    },
    { clave: 'obra', titulo: 'Obra', ancho: 160, pintar: (v) => <Celda>{v.obraNombre ?? '—'}</Celda> },
    {
      clave: 'medidores',
      titulo: 'Odóm. / Horóm.',
      ancho: 145,
      pintar: (v) => (
        <Celda>
          {v.odometroKm !== null ? `${v.odometroKm} km` : '—'} ·{' '}
          {v.horometroH !== null ? `${v.horometroH} h` : '—'}
        </Celda>
      ),
    },
    {
      clave: 'estado',
      titulo: 'Estado',
      ancho: 140,
      pintar: (v) => (
        <>
          <Etiqueta
            tono={v.estado === 'operativo' ? 'bueno' : v.estado === 'no_apto' ? 'malo' : 'atencion'}
          >
            {ETIQUETA_ESTADO_VEHICULO[v.estado]}
          </Etiqueta>
          {formatoPendiente(v.tipoVehiculoId) ? (
            <Etiqueta tono="atencion">Sin formato</Etiqueta>
          ) : null}
          {v.llantasPorCambiar > 0 ? (
            <Etiqueta tono="malo">
              {v.llantasPorCambiar === 1
                ? '1 llanta por cambiar'
                : `${v.llantasPorCambiar} llantas por cambiar`}
            </Etiqueta>
          ) : null}
        </>
      ),
    },
    {
      clave: 'acciones',
      titulo: '',
      ancho: 130,
      pintar: (v) => (
        <Acciones>
          <Boton titulo="Corregir" tono="secundario" onPress={() => setEditando(v)} />
          <Boton
            titulo="Dar de baja"
            tono="peligro"
            onPress={() => {
              setHecho(null);
              setPorDarDeBaja(v);
            }}
          />
        </Acciones>
      ),
    },
  ];

  return (
    <MarcoPantalla
      modulo="vehiculos"
      titulo="Vehículos"
      descripcion="La maquinaria de OCC. El tipo de equipo decide qué formato de preoperacional se le presenta al operador."
      error={vehiculos.error ?? tipos.error ?? obras.error}
      cargando={vehiculos.cargando || tipos.cargando || obras.cargando}
    >
      <Seccion titulo="Registrar un vehículo">
        <Formulario>
          <Campo
            etiqueta="Código interno"
            valor={codigoInterno}
            onChange={setCodigoInterno}
            ayuda="Ej. VOL-01"
            ancho={160}
          />
          <Selector
            etiqueta="Tipo de equipo"
            valor={tipoVehiculoId}
            opciones={tipos.datos.map((t) => ({ valor: t.id, etiqueta: t.nombre }))}
            onChange={setTipoVehiculoId}
            vacio="Elige un tipo"
            ancho={200}
          />
          <Campo etiqueta="Placa" valor={placa} onChange={setPlaca} ancho={140} />
          <Campo etiqueta="Marca" valor={marca} onChange={setMarca} ancho={160} />
          <Campo etiqueta="Modelo" valor={modelo} onChange={setModelo} ancho={160} />
          <Selector
            etiqueta="Obra"
            valor={obraId}
            opciones={obras.datos.map((o) => ({ valor: o.id, etiqueta: o.nombre, detalle: o.codigo }))}
            onChange={setObraId}
            permiteVacio
            ancho={220}
          />
          {pideOdometro ? (
            <Campo
              etiqueta="Odómetro (km)"
              valor={odometro}
              onChange={setOdometro}
              soloNumeros
              ayuda="Lectura actual"
              ancho={160}
            />
          ) : null}
          {pideHorometro ? (
            <Campo
              etiqueta="Horómetro (h)"
              valor={horometro}
              onChange={setHorometro}
              soloNumeros
              ayuda="Lectura actual"
              ancho={160}
            />
          ) : null}
          {sinFormato ? (
            <Aviso tono="info">
              Este tipo de equipo todavía no tiene formato de preoperacional. Puede registrarlo y
              asignarlo, pero el operador no podrá inspeccionarlo hasta que OCC entregue la hoja.
            </Aviso>
          ) : null}
          <AccionesFormulario>
            <Boton
              titulo="Registrar vehículo"
              onPress={crear}
              deshabilitado={!codigoInterno || !tipoVehiculoId}
            />
          </AccionesFormulario>
        </Formulario>
      </Seccion>

      <Confirmado mensaje={hecho} />

      {porDarDeBaja ? (
        <Confirmacion
          aviso={porDarDeBaja.codigoInterno + ' deja de aparecer en la flota y de poder asignarse. No se borra: los preoperacionales firmados y las bitácoras cerradas de esa máquina siguen apuntándole.'}
          confirmar="Dar de baja"
          onConfirmar={async () => {
            const equipo = porDarDeBaja;
            setPorDarDeBaja(null);
            const listo = await vehiculos.ejecutar(() => api.vehiculos.darDeBaja(equipo.id));
            if (listo) setHecho(equipo.codigoInterno + ' quedó dado de baja.');
          }}
          onCancelar={() => setPorDarDeBaja(null)}
        />
      ) : null}

      {editando ? (
        <VentanaCorregirVehiculo
          vehiculo={editando}
          obras={obras.datos}
          onCerrar={() => setEditando(null)}
          onGuardado={(codigo) => {
            setEditando(null);
            setHecho(codigo + ' quedó corregido.');
            vehiculos.recargar();
          }}
          onFallo={vehiculos.setError}
        />
      ) : null}

      <Seccion titulo="Flota registrada">
        <BarraDeListado
          busqueda={filtrado.busqueda}
          onBuscar={filtrado.buscar}
          total={filtrado.total}
          mostradas={filtrado.coincidencias}
        >
          <Selector
            etiqueta="Obra"
            valor={obraFiltro}
            opciones={obras.datos.map((o) => ({ valor: o.id, etiqueta: o.nombre }))}
            onChange={setObraFiltro}
            permiteVacio
            vacio="Todas las obras"
            ancho={200}
          />
          <Selector
            etiqueta="Estado"
            valor={estadoFiltro}
            opciones={ESTADOS_VEHICULO.map((e) => ({
              valor: e,
              etiqueta: ETIQUETA_ESTADO_VEHICULO[e],
            }))}
            onChange={setEstadoFiltro}
            permiteVacio
            vacio="Todos los estados"
            ancho={190}
          />
        </BarraDeListado>

        <Tabla
          columnas={columnas}
          filas={filtrado.pagina}
          vacio={
            vehiculos.datos.length === 0
              ? 'Aquí va la maquinaria de OCC. El tipo de equipo decide qué formato de preoperacional le sale al operador y con qué medidor se controla, así que conviene registrarlo bien desde el principio. Registre el primero en el formulario de arriba.'
              : 'Ningún equipo coincide con lo que busca.'
          }
        />

        <Paginacion
          pagina={filtrado.paginaActual}
          porPagina={POR_PAGINA}
          total={filtrado.coincidencias}
          onCambiar={filtrado.irAPagina}
        />
      </Seccion>

      <SeccionLlantas vehiculos={vehiculos.datos} />
    </MarcoPantalla>
  );
}
