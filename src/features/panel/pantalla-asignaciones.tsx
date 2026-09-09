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

import { nombreDeCargo } from '@/shared/catalogos/cargos';

import { api } from './cliente-api';
import {
  Acciones,
  AccionesFormulario,
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

/**
 * Fecha corta para una tabla; la hora no aporta nada aquí.
 *
 * Se arma a mano en vez de con `toLocaleDateString` porque el español de
 * Colombia intercala dos «de» —«03 de sept de 2026»— y esa cadena no cabe
 * dentro de una etiqueta de la columna Estado: se partía en dos renglones y se
 * salía de su celda.
 */
const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

function fechaCorta(iso: string | null): string {
  if (!iso) return '—';
  const fecha = new Date(iso);
  const dia = String(fecha.getDate()).padStart(2, '0');
  return `${dia} ${MESES[fecha.getMonth()]} ${fecha.getFullYear()}`;
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
          <Acciones>
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
          </Acciones>
        ),
    },
  ];

  return (
    <MarcoPantalla
      modulo="asignaciones"
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
              detalle: [nombreDeCargo(p.cargo), p.obraNombre].filter(Boolean).join(' · '),
            }))}
            onChange={setUsuarioId}
            vacio="Elige un operador"
            ancho={280}
          />
          <AccionesFormulario>
            <Boton titulo="Asignar" onPress={crear} deshabilitado={!vehiculoId || !usuarioId} />
          </AccionesFormulario>
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
