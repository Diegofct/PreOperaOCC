/**
 * Registro de personas: operadores y personal administrativo.
 *
 * Las dos superficies se reparten aquí, y la diferencia importa:
 *
 *  · El **operador** entra al celular con un PIN que elige él mismo en su propio
 *    equipo y que nunca sale de ahí. Desde esta pantalla no se le puede dar
 *    ninguna clave, y por eso no le sale el botón.
 *  · El **residente, el director, la gerencia, el almacenista y el encargado de
 *    planta** entran al panel con contraseña.
 *    Gerencia les genera una temporal desde aquí, se la entrega, y ellos la
 *    cambian al entrar. Así nadie acaba conociendo la contraseña definitiva de
 *    otro.
 *
 * **Cargo y acceso son dos campos distintos**, y antes eran uno solo. El cargo es
 * el oficio en la obra —topógrafo, cadenero, maestro—; el acceso es lo que puede
 * hacer en el sistema, y solo se amplía cuando cambia eso (spec 008). Mezclarlos
 * dejaba fuera a media obra: un cadenero no es «operador» en ningún sentido útil,
 * pero era la única casilla donde cabía. Elegir el cargo **propone** el acceso; se
 * puede corregir a mano.
 *
 * ── Sobre la propia fila no hay botones que se lleven a nadie por delante ──
 *
 * "Dar acceso" **repone** la contraseña: borra la anterior y cierra las sesiones
 * abiertas de esa persona. Sobre uno mismo eso es cerrarse la puerta, y ya pasó:
 * un administrador lo pulsó sobre su propia fila creyendo que le mostraría su
 * acceso, se quedó fuera y hubo que reponerle la clave desde la terminal. Por
 * eso ahora, en la fila de quien está mirando, ese botón se cambia por el de
 * cambiar la propia contraseña — que es lo que uno espera al pulsarlo sobre sí
 * mismo— y "Dar de baja" no aparece.
 *
 * "Dar de baja" sobre uno mismo el servidor ya lo rechazaba, así que el botón
 * solo servía para ofrecer algo que no podía pasar; se quita de esa fila y el
 * rechazo del servidor se queda donde está, que es donde manda.
 *
 * Para el resto de las filas, reponer una contraseña pide confirmación antes: el
 * aviso dice **qué se rompe**, porque un "¿está seguro?" pelado se contesta que
 * sí por reflejo.
 */
import { useCallback, useState } from 'react';

import {
  CARGOS,
  cargoPorId,
  nombreDeCargo,
  operaVehiculos,
  rolSugerido,
  type Cargo,
} from '@/shared/catalogos/cargos';

import { api, mensajeDe } from './cliente-api';
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
  Modal,
  Formulario,
  Paginacion,
  Seccion,
  Selector,
  Tabla,
  type Columna,
} from './componentes';
import {
  ETIQUETA_ROL,
  ROLES,
  type ClaveTemporalFila,
  type CodigosFila,
  type ObraFila,
  type PersonaFila,
  type PersonaNueva,
  type Rol,
} from './contratos';
import { MarcoPantalla, useListado } from './marco';
import { ordenarFilas, type Orden } from './ordenar';
import { useSesionPanel } from './sesion';
import { POR_PAGINA, useListadoFiltrado } from './usar-listado-filtrado';
import { useOrdenRecordado } from './usar-orden-recordado';

/**
 * Qué acceso tiene de verdad una persona, no el nombre interno del rol.
 *
 * A un topógrafo el sistema le dice «operador» por dentro, pero no entra a
 * ninguna parte, y verlo escrito evita repartir códigos por error. Vive fuera de
 * la columna porque la tabla se ordena por este mismo texto (spec 015): ordenar
 * por el rol interno dejaría un orden que la pantalla no explica.
 */
function etiquetaDeAcceso(p: PersonaFila): { texto: string; tono: 'bueno' | 'neutro' } {
  if (p.rol === 'admin') return { texto: 'Gerencia', tono: 'bueno' };
  // Todo el que no es operador entra al panel: residente, almacenista y
  // encargado de planta (spec 008). Preguntar solo por el residente dejaba a
  // un almacenista como «Sin acceso» mientras sí lo tenía.
  if (p.rol !== 'operador') return { texto: 'Panel', tono: 'bueno' };
  return operaVehiculos(p.cargo)
    ? { texto: 'Celular', tono: 'neutro' }
    : { texto: 'Sin acceso', tono: 'neutro' };
}

/**
 * Por qué texto se ordena cada columna (spec 015, RF-8). Es lo que se ve en la
 * celda: el cargo por su nombre y el acceso por su etiqueta.
 */
const ORDEN_DE_COLUMNA: Record<string, (p: PersonaFila) => string | null> = {
  usuario: (p) => p.usuario,
  nombre: (p) => p.nombreCompleto,
  documento: (p) => p.documento,
  // «Sin definir» se ve en la celda, pero cuenta como vacío: va al final (RF-13).
  cargo: (p) => cargoPorId(p.cargo)?.nombre ?? null,
  acceso: (p) => etiquetaDeAcceso(p).texto,
  obra: (p) => p.obraNombre,
};

const COLUMNAS_ORDENABLES = Object.keys(ORDEN_DE_COLUMNA);

/** Sin orden elegido, por nombre como siempre (RF-17). */
const ORDEN_INICIAL: Orden = { clave: 'nombre', sentido: 'asc' };

export default function PantallaPersonas() {
  const { persona: yo, pedirCambioDeClave } = useSesionPanel();
  const esGerencia = yo?.rol === 'admin';

  const personas = useListado<PersonaFila>(useCallback(() => api.personas.listar(), []));
  const obras = useListado<ObraFila>(useCallback(() => api.obras.listar(), []));

  /**
   * La contraseña recién generada. Vive **solo en memoria y solo un rato**: no
   * se guarda en claro en la base ni hay endpoint que la devuelva otra vez. Si
   * se cierra la página antes de anotarla, se genera otra.
   */
  const [temporal, setTemporal] = useState<ClaveTemporalFila | null>(null);

  /** Los dos códigos de un operador. Igual que la contraseña: solo esta vez. */
  const [codigos, setCodigos] = useState<CodigosFila | null>(null);

  /**
   * A quién se le va a reponer la contraseña, mientras no lo confirmen.
   *
   * Se guarda la fila entera y no el id porque el aviso nombra a la persona: un
   * "¿confirma?" que no dice a quién afecta no es una confirmación.
   */
  const [porConfirmar, setPorConfirmar] = useState<PersonaFila | null>(null);

  function pedirConfirmacion(persona: PersonaFila) {
    setTemporal(null);
    setCodigos(null);
    setPorConfirmar(persona);
  }

  async function generarClave(id: string) {
    try {
      setPorConfirmar(null);
      setCodigos(null);
      setTemporal(await api.personas.generarClave(id));
      personas.setError(null);
    } catch (fallo) {
      setTemporal(null);
      personas.setError(mensajeDe(fallo));
    }
  }

  async function generarCodigos(id: string) {
    try {
      setPorConfirmar(null);
      setTemporal(null);
      setCodigos(await api.personas.generarCodigos(id));
      personas.setError(null);
    } catch (fallo) {
      setCodigos(null);
      personas.setError(mensajeDe(fallo));
    }
  }

  const [usuario, setUsuario] = useState('');
  const [nombreCompleto, setNombreCompleto] = useState('');
  const [documento, setDocumento] = useState('');
  const [rol, setRol] = useState<Rol>('operador');
  const [cargo, setCargo] = useState<Cargo | null>(null);
  const [obraId, setObraId] = useState<string | null>(null);

  /**
   * Elegir el cargo propone el acceso que le corresponde, y ahí se acaba la
   * automatía: gerencia puede corregirlo a mano después y no se le vuelve a
   * pisar. Deducirlo sin poder cambiarlo dejaría sin salida el caso raro —un
   * auxiliar que sí debe entrar al panel— y obligaría a inventarle un cargo
   * falso para resolverlo.
   */
  function elegirCargo(valor: string | null) {
    const nuevo = (valor as Cargo) ?? null;
    setCargo(nuevo);
    if (nuevo) setRol(rolSugerido(nuevo));
  }

  const [obraFiltro, setObraFiltro] = useState<string | null>(null);
  const [accesoFiltro, setAccesoFiltro] = useState<string | null>(null);

  const { orden, pulsar: ordenarPor } = useOrdenRecordado(
    'personas',
    COLUMNAS_ORDENABLES,
    ORDEN_INICIAL,
  );

  const filtrado = useListadoFiltrado(
    personas.datos,
    (p) => [p.nombreCompleto, p.usuario, p.documento, nombreDeCargo(p.cargo), p.obraNombre],
    useCallback(
      (p: PersonaFila) =>
        (obraFiltro === null || p.obraId === obraFiltro) &&
        (accesoFiltro === null || p.rol === accesoFiltro),
      [obraFiltro, accesoFiltro],
    ),
    useCallback(
      (filas: PersonaFila[]) =>
        ordenarFilas(
          filas,
          ORDEN_DE_COLUMNA[orden.clave] ?? ORDEN_DE_COLUMNA.nombre,
          orden.sentido,
          (p) => p.nombreCompleto,
        ),
      [orden],
    ),
  );

  /** A quién se está corrigiendo. `null` mientras no haya ventana abierta. */
  const [editando, setEditando] = useState<PersonaFila | null>(null);

  /** A quién se va a dar de baja, mientras no lo confirmen. */
  const [porDarDeBaja, setPorDarDeBaja] = useState<PersonaFila | null>(null);

  /** Lo último que salió bien. Se dice sin interrumpir y se borra al siguiente gesto. */
  const [hecho, setHecho] = useState<string | null>(null);

  async function crear() {
    const creada = await personas.ejecutar(() =>
      api.personas.crear({ usuario, nombreCompleto, documento, rol, cargo, obraId, activo: true }),
    );
    if (creada) {
      setHecho(`${nombreCompleto} quedó registrada.`);
      setUsuario('');
      setNombreCompleto('');
      setDocumento('');
      setCargo(null);
      // El acceso vuelve a su valor inicial con el cargo: si se quedara, la
      // siguiente persona saldría propuesta con el acceso de la anterior —tras un
      // almacenista, como almacenista— sin que nadie lo hubiera elegido.
      setRol('operador');
      setObraId(null);
    }
  }

  const columnas: Columna<PersonaFila>[] = [
    {
      clave: 'usuario',
      titulo: 'Usuario',
      ancho: 130,
      pintar: (p) => <Celda>{p.usuario}</Celda>,
      ordenar: ORDEN_DE_COLUMNA.usuario,
    },
    {
      clave: 'nombre',
      titulo: 'Nombre completo',
      ancho: 210,
      pintar: (p) => <Celda>{p.nombreCompleto}</Celda>,
      ordenar: ORDEN_DE_COLUMNA.nombre,
    },
    {
      clave: 'documento',
      titulo: 'Documento',
      ancho: 110,
      pintar: (p) => <Celda>{p.documento ?? '—'}</Celda>,
      ordenar: ORDEN_DE_COLUMNA.documento,
    },
    {
      clave: 'cargo',
      titulo: 'Cargo',
      ancho: 160,
      pintar: (p) => <Celda>{nombreDeCargo(p.cargo)}</Celda>,
      ordenar: ORDEN_DE_COLUMNA.cargo,
    },
    {
      clave: 'acceso',
      titulo: 'Acceso',
      ancho: 110,
      pintar: (p) => {
        const { texto, tono } = etiquetaDeAcceso(p);
        return <Etiqueta tono={tono}>{texto}</Etiqueta>;
      },
      ordenar: ORDEN_DE_COLUMNA.acceso,
    },
    {
      clave: 'obra',
      titulo: 'Obra',
      ancho: 180,
      pintar: (p) => <Celda>{p.obraNombre ?? '—'}</Celda>,
      ordenar: ORDEN_DE_COLUMNA.obra,
    },
    {
      clave: 'acciones',
      titulo: '',
      ancho: 230,
      pintar: (p) => {
        // La fila de quien está mirando. Ver la cabecera del archivo: aquí no va
        // ninguna acción que pueda dejarle fuera de su propio panel.
        const soyYo = p.id === yo?.id;

        if (soyYo) {
          return (
            <Acciones>
              <Boton
                titulo="Cambiar mi contraseña"
                tono="secundario"
                onPress={() => pedirCambioDeClave(true)}
              />
            </Acciones>
          );
        }

        return (
          <Acciones>
            {/* Repartir accesos al panel es de gerencia, y un operador no entra a
                la web: su acceso es el celular con su PIN. */}
            {esGerencia && p.rol !== 'operador' ? (
              <Boton titulo="Dar acceso" tono="secundario" onPress={() => pedirConfirmacion(p)} />
            ) : null}
            {/* El operador no entra al panel: lo suyo es activar su celular. */}
            {operaVehiculos(p.cargo) ? (
              <Boton titulo="Códigos" tono="secundario" onPress={() => generarCodigos(p.id)} />
            ) : null}
            <Boton titulo="Corregir" tono="secundario" onPress={() => setEditando(p)} />
            <Boton
              titulo="Dar de baja"
              tono="peligro"
              onPress={() => {
                setHecho(null);
                setPorDarDeBaja(p);
              }}
            />
          </Acciones>
        );
      },
    },
  ];

  return (
    <MarcoPantalla
      modulo="personas"
      titulo="Personas"
      descripcion="Quién trabaja en OCC y con qué cargo. Al personal administrativo se le da acceso al panel desde aquí; el operador elige su PIN en el celular."
      error={personas.error ?? obras.error}
      cargando={personas.cargando || obras.cargando}
    >
      {porConfirmar ? (
        <Confirmacion
          aviso={
            `Se le va a generar una contraseña nueva a ${porConfirmar.nombreCompleto} ` +
            `(usuario "${porConfirmar.usuario}"). La que tenga ahora deja de servir en ese ` +
            'momento y se le cerrará la sesión si estaba dentro. La nueva se muestra una sola ' +
            'vez: téngala a mano para dictársela.'
          }
          confirmar="Generar contraseña nueva"
          onConfirmar={() => generarClave(porConfirmar.id)}
          onCancelar={() => setPorConfirmar(null)}
        />
      ) : null}

      {codigos ? (
        <Aviso tono="exito">
          {`Códigos de ${codigos.nombreCompleto} (usuario "${codigos.usuario}"). `}
          {`ACTIVACIÓN: ${codigos.codigoActivacion} — dícteselo por teléfono; vence en ${codigos.horasDeVigencia} horas y sirve una sola vez. `}
          {`RESPALDO: ${codigos.codigoRespaldo} — imprímalo y guárdelo en la carpeta de la obra: es la única forma de que recupere su PIN si lo olvida donde no hay señal. `}
          {'Ninguno de los dos se vuelve a mostrar.'}
        </Aviso>
      ) : null}

      {temporal ? (
        <Aviso tono="exito">
          {`Contraseña temporal de ${temporal.nombreCompleto} (usuario "${temporal.usuario}"): `}
          {temporal.claveTemporal}
          {'. Anótela y entréguesela ahora: no se vuelve a mostrar y no se guarda en ninguna parte. '}
          {'Al entrar, esa persona tendrá que cambiarla por una suya.'}
        </Aviso>
      ) : null}

      <Seccion titulo="Registrar una persona">
        <Formulario>
          <Campo
            etiqueta="Usuario"
            obligatorio
            valor={usuario}
            onChange={setUsuario}
            ayuda="Con esto ingresa. Sin espacios."
            error={personas.errorDe('usuario')}
            ancho={180}
          />
          <Campo
            etiqueta="Nombre completo"
            obligatorio
            valor={nombreCompleto}
            onChange={setNombreCompleto}
            ancho={260}
          />
          <Campo etiqueta="Documento" valor={documento} onChange={setDocumento} ancho={160} />
          <Selector
            etiqueta="Cargo"
            valor={cargo}
            opciones={CARGOS.map((c) => ({ valor: c.id, etiqueta: c.nombre }))}
            onChange={elegirCargo}
            permiteVacio
            vacio="Sin definir"
            ancho={220}
          />
          <Selector
            etiqueta="Acceso"
            valor={rol}
            opciones={ROLES.map((r) => ({ valor: r, etiqueta: ETIQUETA_ROL[r] }))}
            onChange={(v) => setRol((v as Rol) ?? 'operador')}
            ancho={220}
          />
          <Selector
            etiqueta="Obra"
            valor={obraId}
            opciones={obras.datos.map((o) => ({ valor: o.id, etiqueta: o.nombre, detalle: o.codigo }))}
            onChange={setObraId}
            permiteVacio
            vacio="Sin obra (gerencia)"
            ancho={240}
          />
          <AccionesFormulario>
            <Boton
              titulo="Registrar persona"
              onPress={crear}
              deshabilitado={!usuario || !nombreCompleto}
            />
          </AccionesFormulario>
        </Formulario>
      </Seccion>

      <Confirmado mensaje={hecho} />

      {porDarDeBaja ? (
        <Confirmacion
          aviso={
            `Se va a dar de baja a ${porDarDeBaja.nombreCompleto}. Deja de aparecer en los listados y de poder entrar, pero no se borra: los preoperacionales y las bitácoras que firmó siguen apuntándole.` +
            // Spec 015, RF-18: la baja desactiva su celular en el mismo paso, y
            // lo que tenga sin subir se queda en el teléfono y ya no llega.
            // Dicho antes de confirmar, que es cuando todavía se puede esperar
            // a que sincronice.
            (porDarDeBaja.celularActivo
              ? ' Tiene un celular activado: ese celular deja de servirle en este momento, y lo que no haya subido desde él ya no llegará.'
              : '')
          }
          confirmar="Dar de baja"
          onConfirmar={async () => {
            const quien = porDarDeBaja.nombreCompleto;
            setPorDarDeBaja(null);
            const hechoYa = await personas.ejecutar(() =>
              api.personas.darDeBaja(porDarDeBaja.id),
            );
            if (hechoYa) setHecho(`${quien} quedó dada de baja.`);
          }}
          onCancelar={() => setPorDarDeBaja(null)}
        />
      ) : null}

      {editando ? (
        <VentanaCorregirPersona
          persona={editando}
          obras={obras.datos}
          onCerrar={() => setEditando(null)}
          onGuardado={(nombre) => {
            setEditando(null);
            setHecho(`${nombre} quedó corregida.`);
            personas.recargar();
          }}
          onFallo={personas.setError}
        />
      ) : null}

      <Seccion titulo="Personas registradas">
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
            etiqueta="Acceso"
            valor={accesoFiltro}
            opciones={ROLES.map((r) => ({ valor: r, etiqueta: ETIQUETA_ROL[r] }))}
            onChange={setAccesoFiltro}
            permiteVacio
            vacio="Cualquier acceso"
            ancho={210}
          />
        </BarraDeListado>

        <Tabla
          columnas={columnas}
          filas={filtrado.pagina}
          orden={orden}
          alOrdenar={ordenarPor}
          vacio={
            personas.datos.length === 0
              ? 'Aquí va quién trabaja en OCC, con su cargo y su nivel de acceso. Los operadores entran al celular con un PIN; el personal del panel, con contraseña. Registre a la primera persona en el formulario de arriba.'
              : 'Nadie coincide con lo que busca.'
          }
        />

        <Paginacion
          pagina={filtrado.paginaActual}
          porPagina={POR_PAGINA}
          total={filtrado.coincidencias}
          onCambiar={filtrado.irAPagina}
        />
      </Seccion>
    </MarcoPantalla>
  );
}

/* ------------------------------------------------------------------------ */
/* Corregir una persona                                                      */
/* ------------------------------------------------------------------------ */

/**
 * Corregir en vez de dar de baja y volver a crear.
 *
 * Hasta ahora un nombre mal escrito solo se arreglaba así, y eso ensucia el
 * histórico: la persona vieja queda con sus preoperacionales firmados y la
 * nueva empieza de cero, como si fueran dos.
 *
 * **Se manda solo lo que cambió.** El endpoint no toca las columnas que no
 * vienen, y mandarlo todo convertiría cada corrección en un riesgo de pisar un
 * dato que otro acaba de escribir desde el otro computador.
 *
 * El usuario no se corrige: es con lo que la persona ingresa, y cambiarlo la
 * deja fuera sin avisarle. Si de verdad hay que cambiarlo, es una decisión que
 * merece su propio gesto y no una casilla más en esta ventana.
 */
function VentanaCorregirPersona({
  persona,
  obras,
  onCerrar,
  onGuardado,
  onFallo,
}: {
  persona: PersonaFila;
  obras: ObraFila[];
  onCerrar: () => void;
  onGuardado: (nombre: string) => void;
  onFallo: (mensaje: string) => void;
}) {
  const [nombreCompleto, setNombreCompleto] = useState(persona.nombreCompleto);
  const [documento, setDocumento] = useState(persona.documento ?? '');
  const [cargo, setCargo] = useState<Cargo | null>(persona.cargo);
  const [rol, setRol] = useState<Rol>(persona.rol);
  const [obraId, setObraId] = useState<string | null>(persona.obraId);
  const [guardando, setGuardando] = useState(false);

  const faltaNombre = nombreCompleto.trim().length === 0;

  async function guardar() {
    if (faltaNombre) return;
    setGuardando(true);
    try {
      // Solo los campos que de verdad cambiaron.
      const cambios: Partial<PersonaNueva> = {};
      if (nombreCompleto !== persona.nombreCompleto) cambios.nombreCompleto = nombreCompleto;
      if (documento !== (persona.documento ?? '')) cambios.documento = documento;
      if (cargo !== persona.cargo) cambios.cargo = cargo;
      if (rol !== persona.rol) cambios.rol = rol;
      if (obraId !== persona.obraId) cambios.obraId = obraId;

      if (Object.keys(cambios).length === 0) {
        onCerrar();
        return;
      }

      await api.personas.editar(persona.id, cambios);
      onGuardado(nombreCompleto);
    } catch (fallo) {
      onFallo(mensajeDe(fallo));
    } finally {
      setGuardando(false);
    }
  }

  return (
    <Modal titulo={`Corregir a ${persona.usuario}`} onCerrar={onCerrar}>
      <Formulario>
        <Campo
          etiqueta="Nombre completo"
          obligatorio
          valor={nombreCompleto}
          onChange={setNombreCompleto}
          error={faltaNombre ? 'El nombre no puede quedar vacío.' : undefined}
          ancho={280}
        />
        <Campo etiqueta="Documento" valor={documento} onChange={setDocumento} ancho={160} />
        <Selector
          etiqueta="Cargo"
          valor={cargo}
          opciones={CARGOS.map((c) => ({ valor: c.id, etiqueta: c.nombre }))}
          onChange={(v) => {
            const nuevo = (v as Cargo) ?? null;
            setCargo(nuevo);
            if (nuevo) setRol(rolSugerido(nuevo));
          }}
          permiteVacio
          vacio="Sin definir"
          ancho={220}
        />
        <Selector
          etiqueta="Acceso"
          valor={rol}
          opciones={ROLES.map((r) => ({ valor: r, etiqueta: ETIQUETA_ROL[r] }))}
          onChange={(v) => setRol((v as Rol) ?? 'operador')}
          ancho={220}
        />
        <Selector
          etiqueta="Obra"
          valor={obraId}
          opciones={obras.map((o) => ({ valor: o.id, etiqueta: o.nombre, detalle: o.codigo }))}
          onChange={setObraId}
          permiteVacio
          vacio="Sin obra (gerencia)"
          ancho={240}
        />
        <AccionesFormulario>
          <Acciones>
            <Boton
              titulo={guardando ? 'Guardando…' : 'Guardar cambios'}
              onPress={guardar}
              deshabilitado={guardando || faltaNombre}
            />
            <Boton titulo="Cancelar" tono="secundario" onPress={onCerrar} />
          </Acciones>
        </AccionesFormulario>
      </Formulario>
    </Modal>
  );
}
