/**
 * Los sitios y los materiales de cantera de una obra (spec 010, RF-1 a RF-6).
 *
 * Son las listas de donde se eligen el origen, el destino y el material de cada
 * viaje (H1). Por eso van **debajo** de los viajes en la pantalla: se llenan una
 * vez al empezar la obra y luego casi no se tocan, mientras que los viajes se
 * registran todos los días.
 *
 * ── Dar de baja no pide condición ──
 *
 * A diferencia del almacén, que no deja dar de baja un material con stock, un sitio
 * o un material de cantera se da de baja aunque tenga viajes (RF-5): los viajes lo
 * siguen nombrando, y solo deja de ofrecerse para viajes nuevos (RF-6). La
 * confirmación lo dice así, para que nadie crea que va a perder el historial.
 *
 * Quien no escribe (el residente) ve las dos tablas sin formularios ni botones.
 */
import { useCallback, useState } from 'react';

import { api } from './cliente-api';
import {
  Acciones,
  AccionesFormulario,
  Aviso,
  Boton,
  Campo,
  Celda,
  Confirmacion,
  Confirmado,
  Formulario,
  Modal,
  Seccion,
  Selector,
  Tabla,
  type Columna,
} from './componentes';
import {
  ETIQUETA_TIPO_SITIO,
  TIPOS_SITIO,
  type MaterialDeCanteraFila,
  type SitioDeCanteraFila,
  type TipoSitio,
} from './contratos';
import { useListado } from './marco';
import { useAccionDeVentana } from './usar-accion-de-ventana';

const OPCIONES_DE_TIPO = TIPOS_SITIO.map((t) => ({ valor: t, etiqueta: ETIQUETA_TIPO_SITIO[t] }));

/**
 * Las dos secciones, para una obra. `obraId` es la elegida por la gerencia, o
 * `null` para quien trabaja en la suya (el servidor la pone).
 *
 * `alCambiar` avisa a la pantalla de que las listas cambiaron, para que el
 * formulario de viaje vuelva a pedir sus opciones.
 */
export function CatalogosCantera({
  obraId,
  puedeRegistrar,
  alCambiar,
}: {
  obraId: string | null;
  puedeRegistrar: boolean;
  alCambiar: () => void;
}) {
  const [hecho, setHecho] = useState<string | null>(null);
  const avisar = (mensaje: string) => {
    setHecho(mensaje);
    alCambiar();
  };

  return (
    <>
      <Confirmado mensaje={hecho} />
      <SeccionSitios obraId={obraId} puedeRegistrar={puedeRegistrar} alHacer={avisar} />
      <SeccionMateriales obraId={obraId} puedeRegistrar={puedeRegistrar} alHacer={avisar} />
    </>
  );
}

/* ── Sitios ────────────────────────────────────────────────────────────── */

function SeccionSitios({
  obraId,
  puedeRegistrar,
  alHacer,
}: {
  obraId: string | null;
  puedeRegistrar: boolean;
  alHacer: (mensaje: string) => void;
}) {
  const sitios = useListado<SitioDeCanteraFila>(
    useCallback(() => api.cantera.sitios.listar(obraId), [obraId]),
  );

  const [nombre, setNombre] = useState('');
  const [tipo, setTipo] = useState<TipoSitio | null>(null);
  const [corrigiendo, setCorrigiendo] = useState<SitioDeCanteraFila | null>(null);
  const [porDarDeBaja, setPorDarDeBaja] = useState<SitioDeCanteraFila | null>(null);

  async function registrar() {
    if (!tipo) return;
    const registrado = nombre.trim();
    const listo = await sitios.ejecutar(() => api.cantera.sitios.crear({ nombre, tipo, obraId }));
    if (listo) {
      setNombre('');
      setTipo(null);
      alHacer(`${registrado} quedó registrado.`);
    }
  }

  const columnasSitios: Columna<SitioDeCanteraFila>[] = [
    { clave: 'nombre', titulo: 'Sitio', ancho: 320, pintar: (s) => <Celda>{s.nombre}</Celda> },
    {
      clave: 'tipo',
      titulo: 'Tipo',
      ancho: 140,
      pintar: (s) => <Celda>{ETIQUETA_TIPO_SITIO[s.tipo]}</Celda>,
    },
    { clave: 'obra', titulo: 'Obra', ancho: 220, pintar: (s) => <Celda>{s.obraNombre ?? '—'}</Celda> },
    {
      clave: 'acciones',
      titulo: '',
      ancho: 230,
      pintar: (s) =>
        puedeRegistrar ? (
          <Acciones>
            <Boton titulo="Corregir" tono="secundario" onPress={() => setCorrigiendo(s)} />
            <Boton titulo="Dar de baja" tono="peligro" onPress={() => setPorDarDeBaja(s)} />
          </Acciones>
        ) : null,
    },
  ];

  return (
    <Seccion titulo="Sitios: canteras, plantas y otros">
      {puedeRegistrar ? (
        <Formulario>
          <Campo
            etiqueta="Nombre del sitio"
            obligatorio
            valor={nombre}
            onChange={setNombre}
            ayuda="Ej. Cantera La Esperanza"
            error={sitios.errorDe('nombre')}
            ancho={280}
          />
          <Selector
            etiqueta="Tipo"
            obligatorio
            valor={tipo}
            opciones={OPCIONES_DE_TIPO}
            onChange={(v) => setTipo(v as TipoSitio | null)}
            vacio="Elija el tipo"
            error={sitios.errorDe('tipo')}
            ancho={180}
          />
          <AccionesFormulario>
            <Boton
              titulo="Registrar sitio"
              onPress={registrar}
              deshabilitado={!nombre.trim() || !tipo}
            />
          </AccionesFormulario>
        </Formulario>
      ) : null}

      <ErrorDeListado error={sitios.error} />

      {porDarDeBaja ? (
        <Confirmacion
          aviso={`${porDarDeBaja.nombre} deja de ofrecerse como origen o destino de viajes nuevos. No se borra: los viajes que ya lo usaron lo siguen nombrando.`}
          confirmar="Dar de baja"
          onConfirmar={async () => {
            // Sin `sitios.ejecutar`: se traga el error y la ventana nunca se
            // enteraría de que falló (spec 015, RF-25).
            const sitio = porDarDeBaja;
            await api.cantera.sitios.darDeBaja(sitio.id);
            setPorDarDeBaja(null);
            sitios.recargar();
            alHacer(`${sitio.nombre} quedó dado de baja.`);
          }}
          onCancelar={() => setPorDarDeBaja(null)}
        />
      ) : null}

      {corrigiendo ? (
        <VentanaCorregir
          titulo={`Corregir ${corrigiendo.nombre}`}
          nombreActual={corrigiendo.nombre}
          etiquetaNombre="Nombre del sitio"
          tipoActual={corrigiendo.tipo}
          onCerrar={() => setCorrigiendo(null)}
          onGuardar={(cambios) => api.cantera.sitios.corregir(corrigiendo.id, cambios)}
          onGuardado={(nuevo) => {
            setCorrigiendo(null);
            sitios.recargar();
            alHacer(`${nuevo} quedó corregido.`);
          }}
        />
      ) : null}

      <Tabla
        columnas={columnasSitios}
        filas={sitios.datos}
        vacio={
          sitios.cargando
            ? 'Cargando…'
            : puedeRegistrar
              ? 'Todavía no hay sitios. Registre al menos una cantera: sin un origen no se puede registrar ningún viaje.'
              : 'Esta obra todavía no tiene sitios registrados.'
        }
      />
    </Seccion>
  );
}

/* ── Materiales ────────────────────────────────────────────────────────── */

function SeccionMateriales({
  obraId,
  puedeRegistrar,
  alHacer,
}: {
  obraId: string | null;
  puedeRegistrar: boolean;
  alHacer: (mensaje: string) => void;
}) {
  const materiales = useListado<MaterialDeCanteraFila>(
    useCallback(() => api.cantera.materiales.listar(obraId), [obraId]),
  );

  const [nombre, setNombre] = useState('');
  const [corrigiendo, setCorrigiendo] = useState<MaterialDeCanteraFila | null>(null);
  const [porDarDeBaja, setPorDarDeBaja] = useState<MaterialDeCanteraFila | null>(null);

  async function registrar() {
    const registrado = nombre.trim();
    const listo = await materiales.ejecutar(() =>
      api.cantera.materiales.crear({ nombre, obraId }),
    );
    if (listo) {
      setNombre('');
      alHacer(`${registrado} quedó registrado.`);
    }
  }

  const columnasMateriales: Columna<MaterialDeCanteraFila>[] = [
    { clave: 'nombre', titulo: 'Material', ancho: 460, pintar: (m) => <Celda>{m.nombre}</Celda> },
    { clave: 'obra', titulo: 'Obra', ancho: 220, pintar: (m) => <Celda>{m.obraNombre ?? '—'}</Celda> },
    {
      clave: 'acciones',
      titulo: '',
      ancho: 230,
      pintar: (m) =>
        puedeRegistrar ? (
          <Acciones>
            <Boton titulo="Corregir" tono="secundario" onPress={() => setCorrigiendo(m)} />
            <Boton titulo="Dar de baja" tono="peligro" onPress={() => setPorDarDeBaja(m)} />
          </Acciones>
        ) : null,
    },
  ];

  return (
    <Seccion titulo="Materiales de cantera">
      {puedeRegistrar ? (
        <Formulario>
          <Campo
            etiqueta="Nombre del material"
            obligatorio
            valor={nombre}
            onChange={setNombre}
            ayuda="Ej. Afirmado, Subbase, Triturado"
            error={materiales.errorDe('nombre')}
            ancho={280}
          />
          <AccionesFormulario>
            <Boton titulo="Registrar material" onPress={registrar} deshabilitado={!nombre.trim()} />
          </AccionesFormulario>
        </Formulario>
      ) : null}

      <ErrorDeListado error={materiales.error} />

      {porDarDeBaja ? (
        <Confirmacion
          aviso={`${porDarDeBaja.nombre} deja de ofrecerse para viajes nuevos. No se borra: los viajes que ya lo llevaron lo siguen nombrando.`}
          confirmar="Dar de baja"
          onConfirmar={async () => {
            // Sin `materiales.ejecutar`: se traga el error y la ventana nunca se
            // enteraría de que falló (spec 015, RF-25).
            const material = porDarDeBaja;
            await api.cantera.materiales.darDeBaja(material.id);
            setPorDarDeBaja(null);
            materiales.recargar();
            alHacer(`${material.nombre} quedó dado de baja.`);
          }}
          onCancelar={() => setPorDarDeBaja(null)}
        />
      ) : null}

      {corrigiendo ? (
        <VentanaCorregir
          titulo={`Corregir ${corrigiendo.nombre}`}
          nombreActual={corrigiendo.nombre}
          etiquetaNombre="Nombre del material"
          onCerrar={() => setCorrigiendo(null)}
          onGuardar={(cambios) =>
            api.cantera.materiales.corregir(corrigiendo.id, { nombre: cambios.nombre })
          }
          onGuardado={(nuevo) => {
            setCorrigiendo(null);
            materiales.recargar();
            alHacer(`${nuevo} quedó corregido.`);
          }}
        />
      ) : null}

      <Tabla
        columnas={columnasMateriales}
        filas={materiales.datos}
        vacio={
          materiales.cargando
            ? 'Cargando…'
            : puedeRegistrar
              ? 'Todavía no hay materiales. Registre los que salen de la cantera: afirmado, subbase, arena…'
              : 'Esta obra todavía no tiene materiales de cantera registrados.'
        }
      />
    </Seccion>
  );
}

/* ── Piezas comunes ────────────────────────────────────────────────────── */

/** El fallo de una sección se dice dentro de ella, no arriba de la página. */
function ErrorDeListado({ error }: { error: string | null }) {
  return error ? <Aviso tono="error">{error}</Aviso> : null;
}

/**
 * Corregir el nombre —y, en un sitio, el tipo— sin darlo de baja (RF-4). Los viajes
 * lo apuntan por id y no cambian; las bitácoras cerradas guardaron el nombre de ese
 * día. Se manda solo lo que cambió.
 */
function VentanaCorregir({
  titulo,
  nombreActual,
  etiquetaNombre,
  tipoActual,
  onCerrar,
  onGuardar,
  onGuardado,
}: {
  titulo: string;
  nombreActual: string;
  etiquetaNombre: string;
  /** Solo los sitios tienen tipo. */
  tipoActual?: TipoSitio;
  onCerrar: () => void;
  onGuardar: (cambios: { nombre?: string; tipo?: TipoSitio }) => Promise<unknown>;
  onGuardado: (nombre: string) => void;
}) {
  const [nombre, setNombre] = useState(nombreActual);
  const [tipo, setTipo] = useState<TipoSitio | undefined>(tipoActual);
  /*
   * El nombre repetido se queda en la ventana, bajo su campo, y lo demás arriba
   * de ella (spec 015, RF-25 y RF-27): el aviso de la página queda detrás del
   * telón. Antes se leía `ErrorApi.campos.nombre` a mano y cualquier otro campo
   * se perdía en la página; el hook los reparte todos.
   */
  const accion = useAccionDeVentana();
  const faltaNombre = nombre.trim().length === 0;

  async function guardar() {
    if (faltaNombre) return;
    const cambios: { nombre?: string; tipo?: TipoSitio } = {};
    if (nombre.trim() !== nombreActual) cambios.nombre = nombre;
    if (tipo !== tipoActual) cambios.tipo = tipo;
    if (Object.keys(cambios).length === 0) {
      onCerrar();
      return;
    }

    const bien = await accion.ejecutar(() => onGuardar(cambios));
    if (bien) onGuardado(nombre.trim());
  }

  return (
    <Modal titulo={titulo} onCerrar={onCerrar}>
      {accion.error ? <Aviso tono="error">{accion.error}</Aviso> : null}
      <Formulario>
        <Campo
          etiqueta={etiquetaNombre}
          obligatorio
          valor={nombre}
          onChange={setNombre}
          error={faltaNombre ? 'El nombre no puede quedar vacío.' : accion.campoConError('nombre')}
          ancho={280}
        />
        {tipoActual ? (
          <Selector
            etiqueta="Tipo"
            obligatorio
            valor={tipo ?? null}
            opciones={OPCIONES_DE_TIPO}
            onChange={(v) => setTipo((v as TipoSitio | null) ?? tipoActual)}
            ancho={180}
          />
        ) : null}
        <AccionesFormulario>
          <Acciones>
            <Boton
              titulo={accion.ejecutando ? 'Guardando…' : 'Guardar cambios'}
              onPress={guardar}
              deshabilitado={accion.ejecutando || faltaNombre}
            />
            <Boton titulo="Cancelar" tono="secundario" onPress={onCerrar} />
          </Acciones>
        </AccionesFormulario>
      </Formulario>
    </Modal>
  );
}
