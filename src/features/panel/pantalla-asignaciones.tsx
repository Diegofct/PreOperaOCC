/**
 * Qué operador lleva qué máquina.
 *
 * Es la consulta con la que arranca la app del operador, y por eso la decisión
 * se toma aquí y no en el celular. El móvil solo tiene el respaldo: si alguien
 * llega a obra sin ninguna asignación vigente, escoge él mismo y la fila llega
 * marcada como autoasignada. Esas aparecen destacadas arriba, esperando que
 * alguien las confirme.
 *
 * Confirmar no es un trámite: es el momento en que la administración se entera
 * de que una máquina se está operando sin que nadie lo hubiera previsto.
 */
import { useCallback, useState } from 'react';
import { View } from 'react-native';

import { Spacing } from '@/constants/theme';

import { api } from './cliente-api';
import {
  Aviso,
  Boton,
  Celda,
  Etiqueta,
  Formulario,
  Seccion,
  Selector,
  Tabla,
  type Columna,
} from './componentes';
import type { AsignacionFila, PersonaFila, VehiculoFila } from './contratos';
import { MarcoPantalla, useListado } from './marco';

/** Fecha corta para una tabla; la hora no aporta nada aquí. */
function fechaCorta(iso: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('es-CO', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

export default function PantallaAsignaciones() {
  const asignaciones = useListado<AsignacionFila>(useCallback(() => api.asignaciones.listar(), []));
  const vehiculos = useListado<VehiculoFila>(useCallback(() => api.vehiculos.listar(), []));
  const personas = useListado<PersonaFila>(useCallback(() => api.personas.listar(), []));

  const [vehiculoId, setVehiculoId] = useState<string | null>(null);
  const [usuarioId, setUsuarioId] = useState<string | null>(null);

  const operadores = personas.datos.filter((p) => p.rol === 'operador');
  const porConfirmar = asignaciones.datos.filter(
    (a) => a.origen === 'autoasignada' && a.hasta === null,
  );

  async function crear() {
    if (!vehiculoId || !usuarioId) return;
    const creada = await asignaciones.ejecutar(() =>
      api.asignaciones.crear({ vehiculoId, usuarioId }),
    );
    if (creada) {
      setVehiculoId(null);
      setUsuarioId(null);
    }
  }

  const columnas: Columna<AsignacionFila>[] = [
    {
      clave: 'vehiculo',
      titulo: 'Vehículo',
      ancho: 130,
      pintar: (a) => <Celda>{a.vehiculoCodigo}</Celda>,
    },
    {
      clave: 'operador',
      titulo: 'Operador',
      ancho: 240,
      pintar: (a) => <Celda>{a.usuarioNombre}</Celda>,
    },
    { clave: 'obra', titulo: 'Obra', ancho: 200, pintar: (a) => <Celda>{a.obraNombre ?? '—'}</Celda> },
    { clave: 'desde', titulo: 'Desde', ancho: 130, pintar: (a) => <Celda>{fechaCorta(a.desde)}</Celda> },
    {
      clave: 'estado',
      titulo: 'Estado',
      ancho: 170,
      pintar: (a) =>
        a.hasta !== null ? (
          <Etiqueta tono="neutro">Cerrada {fechaCorta(a.hasta)}</Etiqueta>
        ) : a.origen === 'autoasignada' ? (
          <Etiqueta tono="atencion">Sin confirmar</Etiqueta>
        ) : (
          <Etiqueta tono="bueno">Vigente</Etiqueta>
        ),
    },
    {
      clave: 'acciones',
      titulo: '',
      ancho: 210,
      pintar: (a) =>
        a.hasta !== null ? null : (
          <View style={{ flexDirection: 'row', gap: Spacing.two }}>
            {a.origen === 'autoasignada' ? (
              <Boton
                titulo="Confirmar"
                onPress={() => asignaciones.ejecutar(() => api.asignaciones.confirmar(a.id))}
              />
            ) : null}
            <Boton
              titulo="Cerrar"
              tono="secundario"
              onPress={() => asignaciones.ejecutar(() => api.asignaciones.cerrar(a.id))}
            />
          </View>
        ),
    },
  ];

  return (
    <MarcoPantalla
      titulo="Asignaciones"
      descripcion="Qué máquina lleva cada operador. Es lo primero que consulta la app al abrirse en obra."
      error={asignaciones.error ?? vehiculos.error ?? personas.error}
      cargando={asignaciones.cargando || vehiculos.cargando || personas.cargando}
    >
      {porConfirmar.length > 0 ? (
        <Aviso tono="info">
          {porConfirmar.length === 1
            ? 'Hay 1 asignación que un operador se hizo en obra y está sin confirmar.'
            : `Hay ${porConfirmar.length} asignaciones que operadores se hicieron en obra y están sin confirmar.`}
        </Aviso>
      ) : null}

      <Seccion titulo="Asignar un vehículo">
        <Formulario>
          <Selector
            etiqueta="Vehículo"
            valor={vehiculoId}
            opciones={vehiculos.datos.map((v) => ({
              valor: v.id,
              etiqueta: v.codigoInterno,
              detalle: `${v.tipoNombre}${v.obraNombre ? ` · ${v.obraNombre}` : ''}`,
            }))}
            onChange={setVehiculoId}
            vacio="Elige un vehículo"
            ancho={260}
          />
          <Selector
            etiqueta="Operador"
            valor={usuarioId}
            opciones={operadores.map((p) => ({
              valor: p.id,
              etiqueta: p.nombreCompleto,
              detalle: p.obraNombre ?? undefined,
            }))}
            onChange={setUsuarioId}
            vacio="Elige un operador"
            ancho={280}
          />
          <View style={{ paddingTop: Spacing.four }}>
            <Boton titulo="Asignar" onPress={crear} deshabilitado={!vehiculoId || !usuarioId} />
          </View>
        </Formulario>
      </Seccion>

      <Seccion titulo={`Asignaciones (${asignaciones.datos.length})`}>
        <Tabla
          columnas={columnas}
          filas={asignaciones.datos}
          vacio="Todavía no hay asignaciones. Un operador sin asignación puede escoger su máquina desde el celular, y aparecerá aquí para confirmar."
        />
      </Seccion>
    </MarcoPantalla>
  );
}
