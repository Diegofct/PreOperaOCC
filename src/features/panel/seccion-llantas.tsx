/**
 * Control de llantas de un equipo.
 *
 * Va aquí abajo y no como una columna más de la tabla de vehículos por dos
 * razones: la tabla ya iba justa de ancho —y la columna que se sale de la vista
 * es siempre la de los botones—, y las llantas son una lista dentro de otra
 * lista, que en una celda no cabe de ninguna forma legible.
 *
 * Una fila por rueda, no un juego por vehículo: en una volqueta de diez, saber
 * que «las llantas están al 40%» no dice cuál hay que cambiar, que es justo el
 * dato por el que existe esto.
 *
 * Retirar no borra. Una llanta retirada se queda con su fecha y su motivo,
 * porque es el histórico de lo que rodó en esa posición.
 */
import { useCallback, useState } from 'react';

import {
  hayQueCambiar,
  nombreDePosicion,
  posicionesDe,
  vidaUtilRestante,
} from '@/shared/catalogos/llantas';

import { api } from './cliente-api';
import {
  Acciones,
  AccionesFormulario,
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
import type { LlantaFila, VehiculoFila } from './contratos';
import { useListado } from './marco';

/** Vacío es ausencia, no cero: una medida sin escribir no se sabe. */
function aNumero(texto: string): number | null {
  const limpio = texto.trim();
  if (limpio.length === 0) return null;
  const valor = Number.parseInt(limpio, 10);
  return Number.isFinite(valor) ? valor : null;
}

function medidaDe(llanta: LlantaFila): string {
  const { ancho, alto, rin } = llanta;
  if (ancho === null && alto === null && rin === null) return '—';
  const perfil = [ancho, alto].filter((v) => v !== null).join('/');
  return rin === null ? perfil : `${perfil ? `${perfil} ` : ''}R${rin}`;
}

export function SeccionLlantas({ vehiculos }: { vehiculos: VehiculoFila[] }) {
  const [vehiculoId, setVehiculoId] = useState<string | null>(null);
  const vehiculo = vehiculos.find((v) => v.id === vehiculoId) ?? null;

  const llantas = useListado<LlantaFila>(
    useCallback(
      () => (vehiculoId ? api.llantas.deVehiculo(vehiculoId) : Promise.resolve([])),
      [vehiculoId],
    ),
  );

  const [posicion, setPosicion] = useState<string | null>(null);
  const [marca, setMarca] = useState('');
  const [rin, setRin] = useState('');
  const [ancho, setAncho] = useState('');
  const [alto, setAlto] = useState('');
  const [desgaste, setDesgaste] = useState('');

  /** A quién se le está cambiando el desgaste, y el valor tecleado. */
  const [editando, setEditando] = useState<string | null>(null);
  const [desgasteNuevo, setDesgasteNuevo] = useState('');

  /** A qué llanta se le va a dar de baja, mientras no se escriba el motivo. */
  const [retirando, setRetirando] = useState<LlantaFila | null>(null);
  const [motivo, setMotivo] = useState('');

  const puestas = new Set(llantas.datos.filter((l) => !l.retiradaEn).map((l) => l.posicion));
  const libres = posicionesDe(vehiculo?.tipoVehiculoId).filter((p) => !puestas.has(p.id));

  function limpiar() {
    setPosicion(null);
    setMarca('');
    setRin('');
    setAncho('');
    setAlto('');
    setDesgaste('');
  }

  async function montar() {
    if (!vehiculoId || !posicion) return;
    const creada = await llantas.ejecutar(() =>
      api.llantas.montar(vehiculoId, {
        posicion,
        marca,
        rin: aNumero(rin),
        ancho: aNumero(ancho),
        alto: aNumero(alto),
        porcentajeDesgaste: aNumero(desgaste),
      }),
    );
    if (creada) limpiar();
  }

  async function guardarDesgaste(id: string) {
    const guardada = await llantas.ejecutar(() =>
      api.llantas.actualizar(id, { porcentajeDesgaste: aNumero(desgasteNuevo) }),
    );
    if (guardada) {
      setEditando(null);
      setDesgasteNuevo('');
    }
  }

  async function retirar(id: string) {
    const retirada = await llantas.ejecutar(() => api.llantas.retirar(id, motivo));
    if (retirada) {
      setRetirando(null);
      setMotivo('');
    }
  }

  const columnas: Columna<LlantaFila>[] = [
    {
      clave: 'posicion',
      titulo: 'Posición',
      ancho: 200,
      pintar: (l) => <Celda>{nombreDePosicion(vehiculo?.tipoVehiculoId, l.posicion)}</Celda>,
    },
    { clave: 'marca', titulo: 'Marca', ancho: 130, pintar: (l) => <Celda>{l.marca ?? '—'}</Celda> },
    { clave: 'medida', titulo: 'Medida', ancho: 130, pintar: (l) => <Celda>{medidaDe(l)}</Celda> },
    {
      clave: 'desgaste',
      // Se enseñan los dos números a la vez —lo gastado y lo que queda— porque
      // en obra se habla de «la llanta está al 30%», que es la vida restante, y
      // la ficha guarda el desgaste. Verlos juntos quita la ambigüedad.
      titulo: 'Desgaste',
      ancho: 150,
      pintar: (l) =>
        l.porcentajeDesgaste === null ? (
          <Celda>Sin medir</Celda>
        ) : (
          <Celda>
            {`${l.porcentajeDesgaste}% · le queda ${vidaUtilRestante(l.porcentajeDesgaste)}%`}
          </Celda>
        ),
    },
    {
      clave: 'estado',
      titulo: 'Estado',
      ancho: 120,
      pintar: (l) => {
        if (l.retiradaEn) return <Etiqueta tono="neutro">Retirada</Etiqueta>;
        return hayQueCambiar(l.porcentajeDesgaste) ? (
          <Etiqueta tono="malo">Cambiar</Etiqueta>
        ) : (
          <Etiqueta tono="bueno">Puesta</Etiqueta>
        );
      },
    },
    {
      clave: 'acciones',
      titulo: '',
      ancho: 300,
      pintar: (l) => {
        if (l.retiradaEn) return <Celda>{l.motivoRetiro ?? 'Sin motivo escrito'}</Celda>;

        if (editando === l.id) {
          return (
            <Acciones>
              <Campo
                etiqueta=""
                valor={desgasteNuevo}
                onChange={setDesgasteNuevo}
                soloNumeros
                ancho={80}
                onEnviar={() => guardarDesgaste(l.id)}
              />
              <Boton titulo="Guardar" onPress={() => guardarDesgaste(l.id)} />
              <Boton titulo="Cancelar" tono="secundario" onPress={() => setEditando(null)} />
            </Acciones>
          );
        }

        return (
          <Acciones>
            <Boton
              titulo="Desgaste"
              tono="secundario"
              onPress={() => {
                setEditando(l.id);
                setDesgasteNuevo(l.porcentajeDesgaste === null ? '' : String(l.porcentajeDesgaste));
              }}
            />
            <Boton
              titulo="Retirar"
              tono="peligro"
              onPress={() => {
                setRetirando(l);
                setMotivo('');
              }}
            />
          </Acciones>
        );
      },
    },
  ];

  return (
    <Seccion titulo="Llantas">
      <Formulario>
        <Selector
          etiqueta="Equipo"
          valor={vehiculoId}
          opciones={vehiculos.map((v) => ({
            valor: v.id,
            etiqueta: v.codigoInterno,
            detalle: v.tipoNombre,
          }))}
          onChange={(v) => {
            setVehiculoId(v);
            limpiar();
            setEditando(null);
            setRetirando(null);
          }}
          vacio="Elija un equipo"
          ancho={260}
        />

        {vehiculo && libres.length > 0 ? (
          <>
            <Selector
              etiqueta="Posición"
              obligatorio
              valor={posicion}
              opciones={libres.map((p) => ({ valor: p.id, etiqueta: p.nombre }))}
              onChange={setPosicion}
              vacio="Elija la posición"
              ancho={220}
            />
            <Campo etiqueta="Marca" valor={marca} onChange={setMarca} ancho={160} />
            <Campo etiqueta="Rin" valor={rin} onChange={setRin} soloNumeros ancho={90} />
            <Campo etiqueta="Ancho (mm)" valor={ancho} onChange={setAncho} soloNumeros ancho={120} />
            <Campo etiqueta="Alto (mm)" valor={alto} onChange={setAlto} soloNumeros ancho={120} />
            <Campo
              etiqueta="Desgaste (%)"
              valor={desgaste}
              onChange={setDesgaste}
              soloNumeros
              ayuda="0 nueva · 100 lisa"
              ancho={150}
            />
            <AccionesFormulario>
              <Boton titulo="Montar llanta" onPress={montar} deshabilitado={!posicion} />
            </AccionesFormulario>
          </>
        ) : null}
      </Formulario>

      {retirando ? (
        <Formulario>
          <Campo
            etiqueta={`Motivo del retiro · ${nombreDePosicion(vehiculo?.tipoVehiculoId, retirando.posicion)}`}
            valor={motivo}
            onChange={setMotivo}
            ayuda="Queda guardado con la llanta. La posición vuelve a quedar libre."
            ancho={420}
          />
          <AccionesFormulario>
            <Acciones>
              <Boton
                titulo="Confirmar retiro"
                tono="peligro"
                onPress={() => retirar(retirando.id)}
              />
              <Boton titulo="Cancelar" tono="secundario" onPress={() => setRetirando(null)} />
            </Acciones>
          </AccionesFormulario>
        </Formulario>
      ) : null}

      {vehiculoId ? (
        <Tabla
          columnas={columnas}
          filas={llantas.datos}
          vacio="Este equipo todavía no tiene llantas registradas."
        />
      ) : null}
    </Seccion>
  );
}
