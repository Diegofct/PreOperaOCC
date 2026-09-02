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
import { View } from 'react-native';

import { Spacing } from '@/constants/theme';

import { api } from './cliente-api';
import {
  Boton,
  Campo,
  Celda,
  Etiqueta,
  Formulario,
  Seccion,
  Selector,
  Tabla,
  type Columna,
} from './componentes';
import {
  ETIQUETA_ESTADO_VEHICULO,
  type ObraFila,
  type TipoVehiculoFila,
  type VehiculoFila,
} from './contratos';
import { MarcoPantalla, useListado } from './marco';

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
  const pideOdometro = tipoElegido?.claseMedidor !== 'horometro';
  const pideHorometro = tipoElegido?.claseMedidor !== 'odometro';

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
      ancho: 120,
      pintar: (v) => <Celda>{v.codigoInterno}</Celda>,
    },
    { clave: 'tipo', titulo: 'Tipo', ancho: 160, pintar: (v) => <Celda>{v.tipoNombre}</Celda> },
    { clave: 'placa', titulo: 'Placa', ancho: 110, pintar: (v) => <Celda>{v.placa ?? '—'}</Celda> },
    {
      clave: 'maquina',
      titulo: 'Marca y modelo',
      ancho: 200,
      pintar: (v) => <Celda>{[v.marca, v.modelo].filter(Boolean).join(' ') || '—'}</Celda>,
    },
    { clave: 'obra', titulo: 'Obra', ancho: 200, pintar: (v) => <Celda>{v.obraNombre ?? '—'}</Celda> },
    {
      clave: 'medidores',
      titulo: 'Odóm. / Horóm.',
      ancho: 160,
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
      ancho: 150,
      pintar: (v) => (
        <Etiqueta
          tono={v.estado === 'operativo' ? 'bueno' : v.estado === 'no_apto' ? 'malo' : 'atencion'}
        >
          {ETIQUETA_ESTADO_VEHICULO[v.estado]}
        </Etiqueta>
      ),
    },
    {
      clave: 'acciones',
      titulo: '',
      ancho: 120,
      pintar: (v) => (
        <Boton
          titulo="Dar de baja"
          tono="peligro"
          onPress={() => vehiculos.ejecutar(() => api.vehiculos.darDeBaja(v.id))}
        />
      ),
    },
  ];

  return (
    <MarcoPantalla
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
          <View style={{ paddingTop: Spacing.four }}>
            <Boton
              titulo="Registrar vehículo"
              onPress={crear}
              deshabilitado={!codigoInterno || !tipoVehiculoId}
            />
          </View>
        </Formulario>
      </Seccion>

      <Seccion titulo={`Flota registrada (${vehiculos.datos.length})`}>
        <Tabla
          columnas={columnas}
          filas={vehiculos.datos}
          vacio="Todavía no hay ningún vehículo. Registra el primero arriba."
        />
      </Seccion>
    </MarcoPantalla>
  );
}
