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
 *    Gerencia o un director (spec 041, RF-75) les genera una temporal desde
 *    aquí, se la entrega, y ellos la cambian al entrar. Así nadie acaba
 *    conociendo la contraseña definitiva de otro.
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
 *
 * ── Las obras de cada acceso (spec 041) ──
 *
 * Qué se pregunta sobre las obras lo decide `campoDeObras`, no esta pantalla: varias para el
 * Director de Obra, una obligatoria para el Residente, ninguna para el Director de Proyectos y,
 * al bajar a un Director de Obra, cuál conserva. El Residente y el Director de Obra no pueden
 * pedir la lista de obras, así que sus opciones salen de las obras de su sesión.
 *
 * Quien revisa la lista «Pasaron a Residente» (gerencia y Director de Proyectos) carga a todas
 * las personas también dentro de una obra, y la pantalla recorta a las de esa obra. Si se
 * pidieran solo las de la obra, quien quedó **sin obra** con la migración no saldría nunca, y es
 * justo a quien más hay que revisar (RF-65).
 */
import { useCallback, useMemo, useState } from 'react';

import {
  CARGOS,
  cargoPorId,
  nombreDeCargo,
  operaVehiculos,
  rolSugerido,
  type Cargo,
} from '@/shared/catalogos/cargos';

import { useLugarDelPanel, useObraDeLaRuta } from '@/features/empresas/contexto-empresa';
import { campoDeObras, puedeMarcarRevisado } from '@/shared/rules/cargos-de-obra';
import { EMPRESAS, empresaDelAccesoSinObra, esEmpresa, type EmpresaId } from '@/shared/rules/empresas';
import { alcanza, puedeCambiarRol, puedeGenerarClave, rolesQuePuedeDar } from '@/shared/rules/permisos';


import { api } from './cliente-api';
import {
  Acciones,
  AccionesFormulario,
  Aviso,
  BarraDeListado,
  Boton,
  Campo,
  Casilla,
  Celda,
  Confirmacion,
  Confirmado,
  Etiqueta,
  Modal,
  Formulario,
  Paginacion,
  Seccion,
  Selector,
  SelectorDeVarios,
  Tabla,
  type Columna,
  type Opcion,
} from './componentes';
import {
  ETIQUETA_ROL,
  ROLES,
  type ClaveTemporalFila,
  type CodigosFila,
  type ObraFila,
  type PersonaEditada,
  type PersonaFila,
  type Rol,
} from './contratos';
import { MarcoPantalla, useListado } from './marco';
import { ordenarFilas, type Orden } from './ordenar';
import { useSesionPanel } from './sesion';
import { POR_PAGINA, useListadoFiltrado } from './usar-listado-filtrado';
import { useAccionDeVentana } from './usar-accion-de-ventana';
import { useOrdenRecordado } from './usar-orden-recordado';
import { DatoSecreto, VentanaDeSecreto } from './ventana-de-secreto';

/** Las cuatro empresas del grupo, para elegir la de una persona (spec 033, RF-45). */
const OPCIONES_DE_EMPRESA = EMPRESAS.map((e) => ({ valor: e.id, etiqueta: e.nombre }));

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

/** Las obras de una persona: la lista del listado o, si no vino, la suya (spec 041). */
function obrasDe(p: PersonaFila): string[] {
  return p.obras ?? (p.obraId ? [p.obraId] : []);
}

/**
 * Lo que dice la columna Obra. Un Director de Obra no tiene obra propia sino una lista, y quien
 * mira puede no conocer todas: un Residente solo sabe el nombre de la suya. Las demás se cuentan
 * sin nombrarlas, porque los nombres de obras ajenas no son de quien mira.
 */
function textoDeObras(p: PersonaFila, nombres: ReadonlyMap<string, string>): string | null {
  if (p.rol !== 'director_obra') return p.obraNombre;
  const suyas = obrasDe(p);
  if (suyas.length === 0) return null;
  const conocidas = suyas.flatMap((id) => nombres.get(id) ?? []);
  const otras = suyas.length - conocidas.length;
  if (conocidas.length === 0) return `${otras} ${otras === 1 ? 'obra' : 'obras'}`;
  return otras > 0 ? `${conocidas.join(', ')} y ${otras} más` : conocidas.join(', ');
}

function mismasObras(a: readonly string[], b: readonly string[]): boolean {
  return a.length === b.length && a.every((o) => b.includes(o));
}

/** Sin orden elegido, por nombre como siempre (RF-17). */
const ORDEN_INICIAL: Orden = { clave: 'nombre', sentido: 'asc' };

export default function PantallaPersonas() {
  const { persona: yo, pedirCambioDeClave } = useSesionPanel();
  // Spec 035, RF-11: el selector ofrece solo lo que se puede dar (a la Auxiliar Administrativa,
  // «Operador»); corregir, a quien se podría haber registrado. Dar de baja y emitir los códigos
  // del celular van con `activar`: la gerencia y los dos directores (041/RF-72).
  const rolesQueDa = yo ? rolesQuePuedeDar(yo.rol) : [];
  const puedeActivar = yo ? alcanza(yo.rol, 'personas', 'activar') : false;
  const puedeRevisar = yo ? puedeMarcarRevisado(yo.rol) : false;
  const puedeListarObras = yo ? alcanza(yo.rol, 'obras', 'listar') : false;

  // Spec 033, RF-28: en una empresa, sus personas; dentro de una obra de Proyectos, las de
  // esa obra. En Elemental, que lleva los accesos de todo el grupo, todas, con un filtro
  // por empresa (spec 039, RF-27).
  const obraDeLaRuta = useObraDeLaRuta();
  const lugar = useLugarDelPanel();
  const enElemental = lugar?.tipo === 'empresa' && lugar.empresa === 'elemental';
  const empresaDelLugar = lugar?.tipo === 'empresa' && !enElemental ? lugar.empresa : null;
  const personas = useListado<PersonaFila>(
    useCallback(
      () =>
        api.personas.listar(
          // Quien revisa las carga todas: ver la cabecera del archivo.
          obraDeLaRuta && !puedeRevisar
            ? { obraId: obraDeLaRuta }
            : empresaDelLugar
              ? { empresa: empresaDelLugar }
              : undefined,
        ),
      [obraDeLaRuta, empresaDelLugar, puedeRevisar],
    ),
  );
  const obras = useListado<ObraFila>(
    useCallback(() => (puedeListarObras ? api.obras.listar() : Promise.resolve([])), [puedeListarObras]),
  );

  // Las obras que se pueden ofrecer: todas para quien las lista, las suyas para los demás.
  const obrasDeLaSesion = yo?.obrasConNombre;
  const opcionesDeObra = useMemo<Opcion[]>(
    () =>
      puedeListarObras
        ? obras.datos.map((o) => ({ valor: o.id, etiqueta: o.nombre, detalle: o.codigo }))
        : (obrasDeLaSesion ?? []).map((o) => ({ valor: o.id, etiqueta: o.nombre })),
    [puedeListarObras, obras.datos, obrasDeLaSesion],
  );
  const nombresDeObra = useMemo(
    () => new Map(opcionesDeObra.map((o) => [o.valor, o.etiqueta])),
    [opcionesDeObra],
  );
  const ordenDeColumna = useMemo<Record<string, (p: PersonaFila) => string | null>>(
    () => ({ ...ORDEN_DE_COLUMNA, obra: (p) => textoDeObras(p, nombresDeObra) }),
    [nombresDeObra],
  );

  // Spec 041, RF-51: quienes pasaron a Residente con la migración y falta revisar.
  const porRevisar = useMemo(
    () => (puedeRevisar ? personas.datos.filter((p) => p.revisar) : []),
    [puedeRevisar, personas.datos],
  );
  const [soloRevisar, setSoloRevisar] = useState(false);
  // Al revisar a la última, la casilla desaparece: no puede quedar filtrando una lista vacía.
  const viendoPorRevisar = soloRevisar && porRevisar.length > 0;
  const delLugar = useMemo(() => {
    if (viendoPorRevisar) return porRevisar;
    if (puedeRevisar && obraDeLaRuta) return personas.datos.filter((p) => obrasDe(p).includes(obraDeLaRuta));
    return personas.datos;
  }, [viendoPorRevisar, porRevisar, puedeRevisar, obraDeLaRuta, personas.datos]);

  /*
   * A quién se le está reponiendo la contraseña, y a quién se le están emitiendo
   * los códigos del celular (spec 015, RF-28 a RF-32).
   *
   * **Ya no se guarda aquí el secreto generado.** Vivía en esta pantalla y se
   * pintaba en un aviso de la página, detrás de la ventana desde la que se
   * había pedido; ahora lo tiene `VentanaDeSecreto`, que lo muestra donde se
   * pidió y desaparece con ella. Que el secreto no exista fuera de esa ventana
   * es lo que garantiza que no se quede a la vista de quien pase después.
   *
   * Se guarda la fila entera y no el id porque el aviso nombra a la persona: un
   * "¿confirma?" que no dice a quién afecta no es una confirmación.
   */
  const [accesoDe, setAccesoDe] = useState<PersonaFila | null>(null);
  const [codigosDe, setCodigosDe] = useState<PersonaFila | null>(null);

  const [usuario, setUsuario] = useState('');
  const [nombreCompleto, setNombreCompleto] = useState('');
  const [documento, setDocumento] = useState('');
  const [rol, setRol] = useState<Rol>('operador');
  const [cargo, setCargo] = useState<Cargo | null>(null);
  // Spec 033, RF-45: la empresa de la persona, propuesta con la del lugar —dentro de una
  // obra, Proyectos—. Se puede cambiar; vacía no deja registrar.
  const empresaPropuesta: EmpresaId | null = empresaDelLugar ?? (obraDeLaRuta ? 'proyectos' : null);
  const [empresa, setEmpresa] = useState<EmpresaId | null>(empresaPropuesta);
  const [obraDelSelector, setObraId] = useState<string | null>(null);
  // Registrada dentro de una obra, la persona queda en esa obra (RF-19).
  const obraId = obraDeLaRuta ?? obraDelSelector;
  // Las de un Director de Obra (041/RF-17). Van aparte: los demás accesos llevan una sola.
  const [obrasNuevas, setObrasNuevas] = useState<string[]>([]);
  const campoNuevo = campoDeObras(rol);

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
    if (nuevo) elegirAcceso(rolSugerido(nuevo));
  }

  /**
   * El Encargado de OCC y la Auxiliar Administrativa son de su empresa y sin obra (spec 034,
   * RF-13; spec 035, RF-8): se les ponen solos.
   */
  function elegirAcceso(nuevo: Rol) {
    // Quien pasa a Director de Obra arranca con la obra que ya estaba escogida.
    if (nuevo === 'director_obra' && rol !== 'director_obra') setObrasNuevas(obraId ? [obraId] : []);
    setRol(nuevo);
    const suEmpresa = empresaDelAccesoSinObra(nuevo);
    if (suEmpresa) {
      setEmpresa(suEmpresa);
      setObraId(null);
    }
  }

  const [obraFiltro, setObraFiltro] = useState<string | null>(null);
  const [accesoFiltro, setAccesoFiltro] = useState<string | null>(null);
  const [empresaFiltro, setEmpresaFiltro] = useState<EmpresaId | null>(null);

  const { orden, pulsar: ordenarPor } = useOrdenRecordado(
    'personas',
    COLUMNAS_ORDENABLES,
    ORDEN_INICIAL,
  );

  const filtrado = useListadoFiltrado(
    delLugar,
    (p) => [p.nombreCompleto, p.usuario, p.documento, nombreDeCargo(p.cargo), textoDeObras(p, nombresDeObra)],
    useCallback(
      (p: PersonaFila) =>
        (obraFiltro === null || obrasDe(p).includes(obraFiltro)) &&
        (accesoFiltro === null || p.rol === accesoFiltro) &&
        // `empresa` ya viene resuelta: la suya o la de su rol (spec 033, RF-46).
        (empresaFiltro === null || p.empresa === empresaFiltro),
      [obraFiltro, accesoFiltro, empresaFiltro],
    ),
    useCallback(
      (filas: PersonaFila[]) =>
        ordenarFilas(
          filas,
          ordenDeColumna[orden.clave] ?? ordenDeColumna.nombre,
          orden.sentido,
          (p) => p.nombreCompleto,
        ),
      [orden, ordenDeColumna],
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
      api.personas.crear({
        usuario,
        nombreCompleto,
        documento,
        rol,
        cargo,
        obraId: campoNuevo === 'varias' || campoNuevo === 'ninguna' ? null : obraId,
        ...(campoNuevo === 'varias' ? { obras: obrasNuevas } : {}),
        empresa,
        activo: true,
      }),
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
      setObrasNuevas([]);
      setEmpresa(empresaPropuesta);
    }
  }

  /** Residente estaba bien: se apaga el aviso sin cambiarle nada (041/RF-51). */
  async function marcarRevisada(p: PersonaFila) {
    setHecho(null);
    const bien = await personas.ejecutar(() => api.personas.marcarRevisada(p.id));
    if (bien) setHecho(`${p.nombreCompleto} quedó revisada.`);
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
      pintar: (p) => (
        <>
          <Celda>{p.nombreCompleto}</Celda>
          {p.desdeWhatsapp ? <Etiqueta tono="neutro">Creado desde WhatsApp</Etiqueta> : null}
          {puedeRevisar && p.revisar ? <Etiqueta tono="atencion">Por revisar</Etiqueta> : null}
        </>
      ),
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
      // La que cede cuando falta sitio (spec 022, RF-27): el nombre de una obra se
      // lee bien en dos renglones, y así la columna de botones conserva su ancho.
      anchoMinimo: 88,
      pintar: (p) => <Celda>{textoDeObras(p, nombresDeObra) ?? '—'}</Celda>,
      ordenar: ordenDeColumna.obra,
    },
    {
      clave: 'acciones',
      titulo: '',
      ancho: 230,
      // Los botones se apilan, pero no se parten: la columna no baja del más ancho
      // (spec 022, RF-27). «Cambiar mi contraseña», el botón más ancho de la columna, mide 198.
      anchoMinimo: 200,
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
            {/* La gerencia y los directores, a quienes pueden dar acceso (041/RF-75). Un
                operador no entra a la web: su acceso es el celular con su PIN. */}
            {yo && puedeGenerarClave(yo.rol, p.rol) ? (
              <Boton titulo="Dar acceso" tono="secundario" onPress={() => setAccesoDe(p)} />
            ) : null}
            {/* El operador no entra al panel: lo suyo es activar su celular. */}
            {puedeActivar && operaVehiculos(p.cargo) ? (
              <Boton titulo="Códigos" tono="secundario" onPress={() => setCodigosDe(p)} />
            ) : null}
            {puedeRevisar && p.revisar ? (
              <Boton titulo="Revisado" tono="secundario" onPress={() => marcarRevisada(p)} />
            ) : null}
            {yo && puedeCambiarRol(yo.rol, p.rol) ? (
              <Boton titulo="Corregir" tono="secundario" onPress={() => setEditando(p)} />
            ) : null}
            {/* El servidor rechaza la baja de quien esta persona no podría registrar. */}
            {puedeActivar && yo && puedeCambiarRol(yo.rol, p.rol) ? (
              <Boton
                titulo="Dar de baja"
                tono="peligro"
                onPress={() => {
                  setHecho(null);
                  setPorDarDeBaja(p);
                }}
              />
            ) : null}
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
      {accesoDe ? (
        <VentanaDeSecreto<ClaveTemporalFila>
          titulo={`Contraseña de ${accesoDe.usuario}`}
          aviso={
            `Se le va a generar una contraseña nueva a ${accesoDe.nombreCompleto} ` +
            `(usuario "${accesoDe.usuario}"). La que tenga ahora deja de servir en ese ` +
            'momento y se le cerrará la sesión si estaba dentro. La nueva se muestra una sola ' +
            'vez: téngala a mano para dictársela.'
          }
          confirmar="Generar contraseña nueva"
          generar={() => api.personas.generarClave(accesoDe.id)}
          pintar={(clave) => (
            <DatoSecreto
              rotulo={`Contraseña temporal de ${clave.nombreCompleto} · usuario "${clave.usuario}"`}
              valor={clave.claveTemporal}
              explicacion="Entréguesela ahora. Al entrar, esa persona tendrá que cambiarla por una suya."
            />
          )}
          onCerrar={() => setAccesoDe(null)}
        />
      ) : null}

      {codigosDe ? (
        /* Sin fase de confirmar: emitir códigos no invalida nada de lo que el
           operador esté usando, así que se pide con el botón y ya. */
        <VentanaDeSecreto<CodigosFila>
          titulo={`Códigos de ${codigosDe.usuario}`}
          generar={() => api.personas.generarCodigos(codigosDe.id)}
          pintar={(c) => (
            <>
              <DatoSecreto
                rotulo={`Activación · ${c.nombreCompleto} (usuario "${c.usuario}")`}
                valor={c.codigoActivacion}
                explicacion={`Dícteselo por teléfono. Vence en ${c.horasDeVigencia} horas y sirve una sola vez.`}
              />
              <DatoSecreto
                rotulo="Respaldo"
                valor={c.codigoRespaldo}
                explicacion="Imprímalo y guárdelo en la carpeta de la obra: es la única forma de que recupere su PIN si lo olvida donde no hay señal."
              />
            </>
          )}
          onCerrar={() => setCodigosDe(null)}
        />
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
            opciones={rolesQueDa.map((r) => ({ valor: r, etiqueta: ETIQUETA_ROL[r] }))}
            onChange={(v) => elegirAcceso((v as Rol) ?? 'operador')}
            ancho={220}
          />
          {campoNuevo === 'varias' ? (
            <SelectorDeVarios
              etiqueta="Obras"
              obligatorio
              valores={obrasNuevas}
              opciones={opcionesDeObra}
              onChange={setObrasNuevas}
              error={personas.errorDe('obras')}
            />
          ) : obraDeLaRuta || campoNuevo === 'ninguna' ? null : (
            <Selector
              etiqueta="Obra"
              obligatorio={campoNuevo === 'una-obligatoria'}
              valor={obraId}
              opciones={opcionesDeObra}
              onChange={setObraId}
              permiteVacio={campoNuevo === 'una'}
              vacio={campoNuevo === 'una' ? 'Sin obra (gerencia)' : 'Escoja la obra'}
              error={personas.errorDe('obras') ?? personas.errorDe('obraId')}
              ancho={240}
            />
          )}
          <Selector
            etiqueta="Empresa"
            obligatorio
            valor={empresa}
            opciones={OPCIONES_DE_EMPRESA}
            onChange={(v) => setEmpresa(esEmpresa(v) ? v : null)}
            vacio="Elija la empresa"
            error={personas.errorDe('empresa')}
            ancho={260}
          />
          <AccionesFormulario>
            <Boton
              titulo="Registrar persona"
              onPress={crear}
              deshabilitado={!usuario || !nombreCompleto || !empresa}
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
            // Sin `personas.ejecutar`: se traga el error y la ventana nunca se
            // enteraría de que falló (spec 015, RF-25).
            const quien = porDarDeBaja.nombreCompleto;
            await api.personas.darDeBaja(porDarDeBaja.id);
            setPorDarDeBaja(null);
            personas.recargar();
            setHecho(`${quien} quedó dada de baja.`);
          }}
          onCancelar={() => setPorDarDeBaja(null)}
        />
      ) : null}

      {editando ? (
        <VentanaCorregirPersona
          persona={editando}
          opcionesDeObra={opcionesDeObra}
          rolesQueDa={rolesQueDa}
          onCerrar={() => setEditando(null)}
          onGuardado={(nombre) => {
            setEditando(null);
            setHecho(`${nombre} quedó corregida.`);
            personas.recargar();
          }}
        />
      ) : null}

      <Seccion titulo="Personas registradas">
        {porRevisar.length > 0 ? (
          <Aviso tono="info">
            {porRevisar.length === 1
              ? '1 persona pasó a Residente con el cambio de accesos: falta revisar si le corresponde otro.'
              : `${porRevisar.length} personas pasaron a Residente con el cambio de accesos: falta revisar si les corresponde otro.`}
          </Aviso>
        ) : null}
        <BarraDeListado
          busqueda={filtrado.busqueda}
          onBuscar={filtrado.buscar}
          total={filtrado.total}
          mostradas={filtrado.coincidencias}
        >
          {enElemental ? (
            <Selector
              etiqueta="Empresa"
              valor={empresaFiltro}
              opciones={EMPRESAS.map((e) => ({ valor: e.id, etiqueta: e.nombre }))}
              onChange={(v) => setEmpresaFiltro(esEmpresa(v) ? v : null)}
              permiteVacio
              vacio="Todas las empresas"
              ancho={220}
            />
          ) : null}
          {obraDeLaRuta ? null : (
            <Selector
              etiqueta="Obra"
              valor={obraFiltro}
              opciones={opcionesDeObra}
              onChange={setObraFiltro}
              permiteVacio
              vacio="Todas las obras"
              ancho={200}
            />
          )}
          <Selector
            etiqueta="Acceso"
            valor={accesoFiltro}
            opciones={ROLES.map((r) => ({ valor: r, etiqueta: ETIQUETA_ROL[r] }))}
            onChange={setAccesoFiltro}
            permiteVacio
            vacio="Cualquier acceso"
            ancho={210}
          />
          {porRevisar.length > 0 ? (
            <Casilla
              etiqueta="Pasaron a Residente: revisar"
              marcada={soloRevisar}
              onChange={setSoloRevisar}
            />
          ) : null}
        </BarraDeListado>

        <Tabla
          columnas={columnas}
          filas={filtrado.pagina}
          orden={orden}
          alOrdenar={ordenarPor}
          vacio={
            delLugar.length === 0
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
  opcionesDeObra,
  rolesQueDa,
  onCerrar,
  onGuardado,
}: {
  persona: PersonaFila;
  opcionesDeObra: Opcion[];
  /** Lo que puede dar quien corrige (spec 035, RF-11). */
  rolesQueDa: readonly Rol[];
  onCerrar: () => void;
  onGuardado: (nombre: string) => void;
}) {
  const [nombreCompleto, setNombreCompleto] = useState(persona.nombreCompleto);
  const [documento, setDocumento] = useState(persona.documento ?? '');
  const [cargo, setCargo] = useState<Cargo | null>(persona.cargo);
  const [rol, setRol] = useState<Rol>(persona.rol);
  const [obraId, setObraId] = useState<string | null>(persona.obraId);
  // La que se ve: la suya o la de su rol (RF-46). Elegir otra la guarda (RF-45).
  const [empresa, setEmpresa] = useState<EmpresaId>(persona.empresa);
  // Spec 041. Quien sube a Director de Obra arranca con la obra que tenía (RF-71), y a quien
  // tiene una sola obra se le muestra ya escogida: no hay nada que elegir (RF-70).
  const obrasDeAntes = obrasDe(persona);
  const [obrasElegidas, setObrasElegidas] = useState<string[]>(obrasDeAntes);
  const [obraConservada, setObraConservada] = useState<string | null>(
    obrasDeAntes.length === 1 ? obrasDeAntes[0] : null,
  );
  const campo = campoDeObras(rol, persona.rol);
  // Un Director de Obra sin obras (la migración deja alguno) no tiene nada que conservar.
  const directorSinObras = campo === 'conservada' && obrasDeAntes.length === 0;

  /** Los accesos sin obra van con su empresa (spec 034, RF-13; spec 035, RF-8). */
  function elegirAcceso(nuevo: Rol) {
    setRol(nuevo);
    const suEmpresa = empresaDelAccesoSinObra(nuevo);
    if (suEmpresa) {
      setEmpresa(suEmpresa);
      setObraId(null);
    }
  }
  /*
   * **Esta es la ventana que motivó el cambio del 2026-09-22.** Mover a un
   * almacenista a una obra que no lleva Almacén se rechaza con razón (spec 017,
   * RF-11), pero el motivo iba al aviso de la página, detrás del telón: la
   * ventana se quedaba muda y parecía que «Guardar» no hacía nada. Ahora el
   * motivo sale aquí dentro, y además bajo el campo que el servidor señale
   * (RF-25, RF-27).
   */
  const accion = useAccionDeVentana();

  const faltaNombre = nombreCompleto.trim().length === 0;

  async function guardar() {
    if (faltaNombre) return;

    // Solo los campos que de verdad cambiaron.
    const cambios: PersonaEditada = {};
    if (nombreCompleto !== persona.nombreCompleto) cambios.nombreCompleto = nombreCompleto;
    if (documento !== (persona.documento ?? '')) cambios.documento = documento;
    if (cargo !== persona.cargo) cambios.cargo = cargo;
    if (rol !== persona.rol) cambios.rol = rol;
    if (campo === 'varias') {
      if (rol !== persona.rol || !mismasObras(obrasElegidas, obrasDeAntes)) cambios.obras = obrasElegidas;
    } else if (campo === 'conservada') {
      if (obraConservada) cambios.obraConservada = obraConservada;
    } else if (campo !== 'ninguna' && obraId !== persona.obraId) {
      cambios.obraId = obraId;
    }
    if (empresa !== persona.empresa) cambios.empresa = empresa;

    if (Object.keys(cambios).length === 0) {
      onCerrar();
      return;
    }

    const bien = await accion.ejecutar(() => api.personas.editar(persona.id, cambios));
    if (bien) onGuardado(nombreCompleto);
  }

  return (
    <Modal titulo={`Corregir a ${persona.usuario}`} onCerrar={onCerrar}>
      {accion.error ? <Aviso tono="error">{accion.error}</Aviso> : null}
      {directorSinObras ? (
        <Aviso tono="info">
          Este Director de Obra no tiene obras. Asígnele una, guarde, y después cámbiele el acceso.
        </Aviso>
      ) : null}
      <Formulario>
        <Campo
          etiqueta="Nombre completo"
          obligatorio
          valor={nombreCompleto}
          onChange={setNombreCompleto}
          error={faltaNombre ? 'El nombre no puede quedar vacío.' : accion.campoConError('nombreCompleto')}
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
            if (nuevo) elegirAcceso(rolSugerido(nuevo));
          }}
          permiteVacio
          vacio="Sin definir"
          ancho={220}
        />
        <Selector
          etiqueta="Acceso"
          valor={rol}
          opciones={rolesQueDa.map((r) => ({ valor: r, etiqueta: ETIQUETA_ROL[r] }))}
          onChange={(v) => elegirAcceso((v as Rol) ?? 'operador')}
          error={accion.campoConError('rol')}
          ancho={220}
        />
        {campo === 'varias' ? (
          <SelectorDeVarios
            etiqueta="Obras"
            obligatorio
            valores={obrasElegidas}
            opciones={opcionesDeObra}
            onChange={setObrasElegidas}
            error={accion.campoConError('obras')}
          />
        ) : null}
        {campo === 'conservada' && !directorSinObras ? (
          <Selector
            etiqueta="Obra que conserva"
            obligatorio
            valor={obraConservada}
            opciones={opcionesDeObra.filter((o) => obrasDeAntes.includes(o.valor))}
            onChange={setObraConservada}
            vacio="Escoja la obra"
            error={accion.campoConError('obraConservada') ?? accion.campoConError('obras')}
            ancho={240}
          />
        ) : null}
        {campo === 'una' || campo === 'una-obligatoria' ? (
          <Selector
            etiqueta="Obra"
            obligatorio={campo === 'una-obligatoria'}
            valor={obraId}
            opciones={opcionesDeObra}
            onChange={setObraId}
            permiteVacio={campo === 'una'}
            vacio={campo === 'una' ? 'Sin obra (gerencia)' : 'Escoja la obra'}
            error={accion.campoConError('obras') ?? accion.campoConError('obraId')}
            ancho={240}
          />
        ) : null}
        <Selector
          etiqueta="Empresa"
          obligatorio
          valor={empresa}
          opciones={OPCIONES_DE_EMPRESA}
          onChange={(v) => {
            if (esEmpresa(v)) setEmpresa(v);
          }}
          error={accion.campoConError('empresa')}
          ancho={260}
        />
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
