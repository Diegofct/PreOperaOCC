/**
 * El control de los viajes de cantera (spec 010).
 *
 * ── Una obra a la vez ──
 *
 * Un viaje se registra con las volquetas, conductores y sitios **de una obra**, así
 * que el módulo trabaja siempre sobre una. El encargado de planta y el residente
 * trabajan en la suya, y el marco les avisa si su cuenta no tiene (008/RF-6). La
 * gerencia, que lleva todas, elige arriba en cuál: hasta que no elige, no hay
 * formulario ni listas que enseñar.
 *
 * ── Quién ve qué ──
 *
 * El encargado de planta y la gerencia registran; el residente consulta (RF-32,
 * RF-33). Al residente no se le enseñan botones que el servidor le rechazaría.
 */
import { useCallback, useState } from 'react';

import { formatearAbscisa } from '@/shared/rules/cantera';
import { alcanza } from '@/shared/rules/permisos';

import { api } from './cliente-api';
import { CatalogosCantera } from './catalogos-cantera';
import {
  Acciones,
  Aviso,
  Boton,
  Confirmado,
  Formulario,
  Seccion,
  Selector,
} from './componentes';
import type { ObraFila, OpcionesDeCantera } from './contratos';
import { ListadoDeViajes } from './listado-viajes';
import { MarcoPantalla, useListado } from './marco';
import { usePersona } from './sesion';
import { VentanaViaje } from './ventana-viaje';

export default function PantallaCantera() {
  const { rol } = usePersona();
  const puedeRegistrar = alcanza(rol, 'cantera', 'escribir');
  const esGerencia = alcanza(rol, 'obras', 'listar');

  // Solo la gerencia elige obra: a los demás el servidor les rechazaría el listado.
  const obras = useListado<ObraFila>(
    useCallback(() => (esGerencia ? api.obras.listar() : Promise.resolve([])), [esGerencia]),
  );
  // Solo las que llevan control de cantera (spec 017, RF-10).
  const obrasConCantera = obras.datos.filter((o) => o.canteraActivo);
  const [obraElegida, setObraElegida] = useState<string | null>(null);

  /**
   * Sube cada vez que cambian los sitios o los materiales, para que el formulario de
   * viaje vuelva a pedir sus opciones.
   */
  const [versionDeCatalogos, setVersionDeCatalogos] = useState(0);

  // Para quien no es gerencia, `null`: el servidor usa su obra.
  const obraId = esGerencia ? obraElegida : null;
  const hayObra = !esGerencia || obraElegida !== null;

  return (
    <MarcoPantalla
      modulo="cantera"
      exigeObra
      titulo="Control Cantera"
      descripcion={
        puedeRegistrar
          ? 'Los viajes de las volquetas: qué material, de dónde a dónde y en qué punto de la vía se descargó.'
          : 'Los viajes de las volquetas de su obra. Los registra el encargado de planta; aquí se consultan.'
      }
      error={obras.error}
      cargando={obras.cargando}
    >
      {esGerencia ? (
        <Seccion titulo="Obra">
          <Formulario>
            <Selector
              etiqueta="Obra"
              obligatorio
              valor={obraElegida}
              opciones={obrasConCantera.map((o) => ({
                valor: o.id,
                etiqueta: o.nombre,
                detalle: o.codigo,
              }))}
              onChange={setObraElegida}
              vacio="Elija la obra"
              ancho={280}
            />
          </Formulario>
          {!obraElegida ? (
            <Aviso tono="info">
              Elija la obra para ver y registrar sus viajes, sitios y materiales: cada obra tiene
              sus propias volquetas, conductores y canteras.
            </Aviso>
          ) : null}
        </Seccion>
      ) : null}

      {hayObra ? (
        <SeccionViajes
          key={`viajes-${obraId ?? 'propia'}`}
          obraId={obraId}
          puedeRegistrar={puedeRegistrar}
          puedeAnular={alcanza(rol, 'cantera', 'anular')}
          versionDeCatalogos={versionDeCatalogos}
        />
      ) : null}

      {hayObra ? (
        <CatalogosCantera
          // Al cambiar de obra se empieza de cero: formularios y ventanas no se
          // arrastran de una obra a otra.
          key={obraId ?? 'propia'}
          obraId={obraId}
          puedeRegistrar={puedeRegistrar}
          alCambiar={() => setVersionDeCatalogos((v) => v + 1)}
        />
      ) : null}
    </MarcoPantalla>
  );
}

/**
 * Los viajes de la obra: registrar uno y el listado del periodo, con anulación.
 *
 * Las opciones del formulario se piden al abrir la sección y otra vez cuando cambian
 * los sitios o los materiales, para que un sitio recién registrado se pueda elegir
 * sin recargar la página.
 */
function SeccionViajes({
  obraId,
  puedeRegistrar,
  puedeAnular,
  versionDeCatalogos,
}: {
  obraId: string | null;
  puedeRegistrar: boolean;
  puedeAnular: boolean;
  versionDeCatalogos: number;
}) {
  const opciones = useListado<OpcionesDeCantera>(
    useCallback(
      () =>
        puedeRegistrar ? api.cantera.opciones(obraId).then((o) => [o]) : Promise.resolve([]),
      // La versión no se usa dentro: está para volver a pedir cuando cambia.
      // eslint-disable-next-line react-hooks/exhaustive-deps
      [obraId, puedeRegistrar, versionDeCatalogos],
    ),
  );

  const [registrando, setRegistrando] = useState(false);
  const [hecho, setHecho] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  /** Sube con cada viaje registrado, para que el listado vuelva a pedir el periodo. */
  const [registrados, setRegistrados] = useState(0);

  return (
    <Seccion titulo="Viajes">
      <Confirmado mensaje={hecho} />
      {/* RF-30: el viaje se guardó, pero la bitácora de ese día ya no cambia. */}
      {aviso ? <Aviso tono="info">{aviso}</Aviso> : null}
      {opciones.error ? <Aviso tono="error">{opciones.error}</Aviso> : null}

      {puedeRegistrar ? (
        <Acciones>
          <Boton
            titulo="Registrar viaje"
            onPress={() => {
              setHecho(null);
              setAviso(null);
              setRegistrando(true);
            }}
            deshabilitado={opciones.cargando || opciones.datos.length === 0}
          />
        </Acciones>
      ) : null}

      {registrando && opciones.datos[0] ? (
        <VentanaViaje
          obraId={obraId}
          opciones={opciones.datos[0]}
          onCerrar={() => setRegistrando(false)}
          onRegistrado={({ viaje, aviso: avisoDelServidor }) => {
            setRegistrando(false);
            setHecho(
              `Viaje registrado: ${viaje.volqueta} con ${viaje.material}, de ${viaje.origen} a ${
                viaje.destinoObra && viaje.pr !== null && viaje.metros !== null
                  ? `la obra en ${formatearAbscisa(viaje.pr, viaje.metros)}`
                  : (viaje.destino ?? '—')
              }.`,
            );
            setAviso(avisoDelServidor);
            setRegistrados((n) => n + 1);
          }}
        />
      ) : null}

      <ListadoDeViajes
        obraId={obraId}
        puedeAnular={puedeAnular}
        version={registrados}
      />
    </Seccion>
  );
}
