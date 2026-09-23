/**
 * El almacén de la obra (spec 009).
 *
 * La tabla responde la pregunta que motivó el módulo: **¿cuánto queda?** Cada
 * material trae lo que entró, lo que salió y lo que queda, y el stock no se puede
 * escribir: sale de los movimientos, y lo suma el servidor con la misma regla que
 * decide si una salida alcanza (RF-17, RF-18).
 *
 * ── Quién ve qué ──
 *
 * El almacenista y la gerencia registran; el residente consulta (RF-28, RF-29).
 * Al residente no se le enseñan botones que el servidor le rechazaría: ve la
 * misma tabla, sin formulario ni acciones de escritura. La gerencia lleva todas
 * las obras, así que elige en cuál registra y puede filtrar la tabla por obra; el
 * almacenista y el residente ven siempre la suya, y el marco les avisa si su
 * cuenta no tiene obra (008/RF-6).
 *
 * ── El nombre se elige, no se escribe ──
 *
 * Desde el 2026-09-17 el material sale de la lista de OCC, con «Otro» al final
 * para lo que no esté (RF-32, RF-33). Escribir el nombre a mano dejaba cada
 * almacén con su propio idioma —«cemento», «Cemento gris», «cto gris»— y esos tres
 * son tres materiales distintos para el inventario. La unidad se sigue eligiendo
 * aparte (RF-34).
 *
 * ── Un material en cero no se esconde ──
 *
 * Se señala con la etiqueta «Sin stock», con texto además del color (RF-19). Es
 * justo el material que hay que pedir, y desaparecer de la tabla sería lo último
 * que conviene.
 *
 * ── Descargar en Excel (cambio del 2026-09-22) ──
 *
 * Lo ve todo el que ve el almacén (RF-45). La gerencia descarga la obra que tenga
 * en el filtro, o todas si no eligió ninguna: lo mismo que está mirando. Qué dice
 * el archivo lo decide el servidor; aquí solo se pide y se guarda.
 */
import { useCallback, useState } from 'react';

import { nombreDeUnidad, type UnidadAlmacen } from '@/shared/catalogos/almacen';
import { CLAVE_OTRO_MATERIAL, MATERIALES_DE_OCC } from '@/shared/catalogos/materiales';
import { formatearCantidad, rechazoDeBaja, type TipoMovimiento } from '@/shared/rules/almacen';
import { alcanza } from '@/shared/rules/permisos';

import { api, mensajeDe } from './cliente-api';
import {
  Acciones,
  AccionesFormulario,
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
import type { MaterialDeAlmacenFila, ObraFila } from './contratos';
import { HistorialAlmacen } from './historial-almacen';
import { MarcoPantalla, useListado } from './marco';
import { usePersona } from './sesion';
import { POR_PAGINA, useListadoFiltrado } from './usar-listado-filtrado';
import { OPCIONES_DE_UNIDAD, VentanaCorregirMaterial } from './ventana-material';
import { VentanaMovimiento } from './ventana-movimiento';

/**
 * La salida para lo que no esté y, detrás, los materiales de OCC (RF-32, RF-33).
 *
 * **«Otro» va primero, y no al final como en las actividades del parte.** Visto en
 * Chrome: con 351 opciones, al final hay que recorrerlas todas, y buscar «otro»
 * saca antes nueve geotextiles que dicen «u Otros» en su nombre. Es la opción a la
 * que se llega justo cuando la búsqueda no encontró nada, así que tiene que estar
 * donde se ve sin buscar.
 *
 * Se arma una vez y fuera del componente: son 351 opciones y no cambian entre
 * pantallas. El selector pone el buscador solo, por ser más de ocho (007/RF-12).
 */
const OPCIONES_DE_MATERIAL = [
  { valor: CLAVE_OTRO_MATERIAL, etiqueta: 'Otro' },
  ...MATERIALES_DE_OCC.map((m) => ({ valor: m, etiqueta: m })),
];

/**
 * Guarda un archivo en el equipo de quien lo pidió, con un enlace temporal.
 *
 * El panel es de navegador, y así es como un navegador guarda lo que ya tiene en
 * memoria. El enlace se libera un momento después y no en el acto: revocarlo en el
 * mismo instante cancela la descarga en algunos navegadores.
 */
function guardarArchivo(contenido: Blob, nombre: string) {
  const url = URL.createObjectURL(contenido);
  const enlace = document.createElement('a');
  enlace.href = url;
  enlace.download = nombre;
  document.body.appendChild(enlace);
  enlace.click();
  enlace.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export default function PantallaAlmacen() {
  const { rol } = usePersona();
  const puedeRegistrar = alcanza(rol, 'almacen', 'escribir');
  const esGerencia = alcanza(rol, 'obras', 'listar');

  const materiales = useListado<MaterialDeAlmacenFila>(
    useCallback(() => api.almacen.materiales.listar(), []),
  );
  // Solo la gerencia elige obra: a los demás el servidor les rechazaría el listado.
  const obras = useListado<ObraFila>(
    useCallback(() => (esGerencia ? api.obras.listar() : Promise.resolve([])), [esGerencia]),
  );
  // Solo las que llevan almacén: en las demás no hay dónde registrar ni qué ver
  // (spec 017, RF-10).
  const obrasConAlmacen = obras.datos.filter((o) => o.almacenActivo);

  /**
   * Lo elegido en la lista de OCC: un nombre, o «Otro» (RF-32, RF-33). `nombre`
   * es lo que se escribe, y solo cuenta con «Otro»: escrito y luego elegido de la
   * lista, lo que vale es la lista.
   */
  const [elegido, setElegido] = useState<string | null>(null);
  const [nombre, setNombre] = useState('');
  const [unidad, setUnidad] = useState<UnidadAlmacen | null>(null);
  const otroMaterial = elegido === CLAVE_OTRO_MATERIAL;
  const nombreRegistrado = otroMaterial ? nombre.trim() : (elegido ?? '');
  const [obraId, setObraId] = useState<string | null>(null);

  const [obraFiltro, setObraFiltro] = useState<string | null>(null);
  const filtrado = useListadoFiltrado(
    materiales.datos,
    (m) => [m.nombre, nombreDeUnidad(m.unidad), m.obraNombre],
    useCallback(
      (m: MaterialDeAlmacenFila) => obraFiltro === null || m.obraId === obraFiltro,
      [obraFiltro],
    ),
  );

  const [editando, setEditando] = useState<MaterialDeAlmacenFila | null>(null);
  /**
   * El id y no la fila: al anular o registrar, la tabla se recarga y el historial
   * tiene que leer el stock nuevo, no el de la fila que se pulsó.
   */
  const [historialDe, setHistorialDe] = useState<string | null>(null);
  const materialDelHistorial = materiales.datos.find((m) => m.id === historialDe) ?? null;
  const [moviendo, setMoviendo] = useState<{
    material: MaterialDeAlmacenFila;
    tipo: TipoMovimiento;
  } | null>(null);

  function abrirMovimiento(material: MaterialDeAlmacenFila, tipo: TipoMovimiento) {
    setHecho(null);
    materiales.setError(null);
    setMoviendo({ material, tipo });
  }
  const [porDarDeBaja, setPorDarDeBaja] = useState<MaterialDeAlmacenFila | null>(null);
  const [hecho, setHecho] = useState<string | null>(null);
  const [descargando, setDescargando] = useState(false);

  async function descargarExcel() {
    setHecho(null);
    setDescargando(true);
    try {
      const { contenido, nombre } = await api.almacen.descargar(esGerencia ? obraFiltro : null);
      guardarArchivo(contenido, nombre);
    } catch (fallo) {
      // Arriba de la página, como los demás fallos del almacén.
      materiales.setError(mensajeDe(fallo));
    } finally {
      setDescargando(false);
    }
  }

  async function registrar() {
    if (!unidad || nombreRegistrado === '') return;
    // Elegido o escrito, al servidor va un nombre: no distingue de dónde salió, y
    // RF-3 impide repetir uno vigente venga de donde venga.
    const listo = await materiales.ejecutar(() =>
      api.almacen.materiales.crear({
        nombre: nombreRegistrado,
        unidad,
        obraId: esGerencia ? obraId : null,
      }),
    );
    if (listo) {
      setHecho(`${nombreRegistrado} quedó registrado.`);
      setElegido(null);
      setNombre('');
      setUnidad(null);
    }
  }

  function pedirBaja(material: MaterialDeAlmacenFila) {
    setHecho(null);
    // RF-7, dicho antes de pedir confirmación y con el texto del servidor: con
    // stock, preguntar «¿seguro?» para luego rechazarlo sería hacerle perder el
    // tiempo a quien lo intenta.
    const rechazo = rechazoDeBaja(material.stock, material.unidad);
    if (rechazo) {
      materiales.setError(`${material.nombre}: ${rechazo}`);
      return;
    }
    materiales.setError(null);
    setPorDarDeBaja(material);
  }

  const columnas: Columna<MaterialDeAlmacenFila>[] = [
    {
      clave: 'material',
      titulo: 'Material',
      ancho: 240,
      pintar: (m) => <Celda>{m.nombre}</Celda>,
    },
    {
      clave: 'unidad',
      titulo: 'Unidad',
      ancho: 110,
      pintar: (m) => <Celda>{nombreDeUnidad(m.unidad)}</Celda>,
    },
    {
      clave: 'obra',
      titulo: 'Obra',
      ancho: 150,
      pintar: (m) => <Celda>{m.obraNombre ?? '—'}</Celda>,
    },
    {
      clave: 'ingresado',
      titulo: 'Ingresado',
      ancho: 120,
      pintar: (m) => <Celda>{formatearCantidad(m.ingresado, m.unidad)}</Celda>,
    },
    {
      clave: 'salido',
      titulo: 'Salido',
      ancho: 120,
      pintar: (m) => <Celda>{formatearCantidad(m.salido, m.unidad)}</Celda>,
    },
    {
      clave: 'stock',
      titulo: 'Stock',
      ancho: 140,
      pintar: (m) =>
        m.stock === 0 ? (
          <Etiqueta tono="atencion">Sin stock</Etiqueta>
        ) : (
          <Celda>{formatearCantidad(m.stock, m.unidad)}</Celda>
        ),
    },
    {
      clave: 'acciones',
      titulo: '',
      ancho: 260,
      pintar: (m) => (
        <Acciones>
          {/* El historial es de todos los que ven el almacén (RF-29); lo demás, de quien escribe. */}
          <Boton
            titulo={historialDe === m.id ? 'Viendo historial' : 'Historial'}
            tono="secundario"
            onPress={() => setHistorialDe(m.id)}
          />
          {puedeRegistrar ? (
            <>
              <Boton titulo="Ingreso" onPress={() => abrirMovimiento(m, 'ingreso')} />
              <Boton titulo="Salida" onPress={() => abrirMovimiento(m, 'salida')} />
              <Boton titulo="Corregir" tono="secundario" onPress={() => setEditando(m)} />
              <Boton titulo="Dar de baja" tono="peligro" onPress={() => pedirBaja(m)} />
            </>
          ) : null}
        </Acciones>
      ),
    },
  ];

  const sinMateriales = materiales.datos.length === 0;

  return (
    <MarcoPantalla
      modulo="almacen"
      exigeObra
      titulo="Almacén"
      descripcion={
        puedeRegistrar
          ? 'El inventario de la obra: lo que entra, lo que sale y cuánto queda. El stock no se escribe: sale de los ingresos y las salidas.'
          : 'El inventario de su obra: lo que entra, lo que sale y cuánto queda. Lo registra el almacenista; aquí se consulta.'
      }
      error={materiales.error ?? obras.error}
      cargando={materiales.cargando || obras.cargando}
    >
      {puedeRegistrar ? (
        <Seccion titulo="Registrar un material">
          <Formulario>
            <Selector
              etiqueta="Material"
              obligatorio
              valor={elegido}
              opciones={OPCIONES_DE_MATERIAL}
              onChange={setElegido}
              vacio="Elija el material"
              error={otroMaterial ? undefined : materiales.errorDe('nombre')}
              ancho={280}
            />
            {otroMaterial ? (
              <Campo
                etiqueta="¿Cuál?"
                obligatorio
                valor={nombre}
                onChange={setNombre}
                ayuda="El nombre con el que se pide en la obra"
                error={materiales.errorDe('nombre')}
                ancho={280}
              />
            ) : null}
            <Selector
              etiqueta="Unidad"
              obligatorio
              valor={unidad}
              opciones={OPCIONES_DE_UNIDAD}
              onChange={(v) => setUnidad(v as UnidadAlmacen | null)}
              vacio="Elija la unidad"
              error={materiales.errorDe('unidad')}
              ancho={220}
            />
            {esGerencia ? (
              <Selector
                etiqueta="Obra"
                obligatorio
                valor={obraId}
                opciones={obrasConAlmacen.map((o) => ({
                  valor: o.id,
                  etiqueta: o.nombre,
                  detalle: o.codigo,
                }))}
                onChange={setObraId}
                vacio="Elija la obra"
                error={materiales.errorDe('obraId')}
                ancho={240}
              />
            ) : null}
            <AccionesFormulario>
              <Boton
                titulo="Registrar material"
                onPress={registrar}
                deshabilitado={!nombreRegistrado || !unidad || (esGerencia && !obraId)}
              />
            </AccionesFormulario>
          </Formulario>
        </Seccion>
      ) : null}

      <Confirmado mensaje={hecho} />

      {porDarDeBaja ? (
        <Confirmacion
          aviso={`${porDarDeBaja.nombre} deja de aparecer en el almacén. No se borra: su historial de ingresos y salidas se conserva, y si se vuelve a comprar se puede registrar de nuevo con el mismo nombre.`}
          confirmar="Dar de baja"
          onConfirmar={async () => {
            // Sin `materiales.ejecutar`: se traga el error y la ventana nunca se
            // enteraría de que falló (spec 015, RF-25).
            const material = porDarDeBaja;
            await api.almacen.materiales.darDeBaja(material.id);
            setPorDarDeBaja(null);
            materiales.recargar();
            setHecho(`${material.nombre} quedó dado de baja.`);
          }}
          onCancelar={() => setPorDarDeBaja(null)}
        />
      ) : null}

      {moviendo ? (
        <VentanaMovimiento
          material={moviendo.material}
          tipo={moviendo.tipo}
          onCerrar={() => setMoviendo(null)}
          onGuardado={(mensaje) => {
            setMoviendo(null);
            setHecho(mensaje);
            // El stock de la tabla sale del servidor: se vuelve a pedir, no se suma aquí.
            materiales.recargar();
          }}
        />
      ) : null}

      {editando ? (
        <VentanaCorregirMaterial
          material={editando}
          onCerrar={() => setEditando(null)}
          onGuardado={(corregido) => {
            setEditando(null);
            setHecho(`${corregido} quedó corregido.`);
            materiales.recargar();
          }}
        />
      ) : null}

      <Seccion titulo="Materiales y stock">
        <BarraDeListado
          busqueda={filtrado.busqueda}
          onBuscar={filtrado.buscar}
          total={filtrado.total}
          mostradas={filtrado.coincidencias}
        >
          {esGerencia ? (
            <Selector
              etiqueta="Obra"
              valor={obraFiltro}
              opciones={obrasConAlmacen.map((o) => ({ valor: o.id, etiqueta: o.nombre }))}
              onChange={setObraFiltro}
              permiteVacio
              vacio="Todas las obras"
              ancho={200}
            />
          ) : null}
          <AccionesFormulario>
            <Boton
              titulo={descargando ? 'Preparando el archivo…' : 'Descargar en Excel'}
              tono="secundario"
              onPress={descargarExcel}
              deshabilitado={descargando}
            />
          </AccionesFormulario>
        </BarraDeListado>

        <Tabla
          columnas={columnas}
          filas={filtrado.pagina}
          vacio={
            sinMateriales
              ? puedeRegistrar
                ? 'El almacén todavía no tiene materiales. Registre el primero en el formulario de arriba, con la unidad en que se compra y se entrega: después ya no se podrá cambiar si tiene movimientos.'
                : 'El almacén de su obra todavía no tiene materiales. Los registra el almacenista.'
              : 'Ningún material coincide con lo que busca.'
          }
        />

        <Paginacion
          pagina={filtrado.paginaActual}
          porPagina={POR_PAGINA}
          total={filtrado.coincidencias}
          onCambiar={filtrado.irAPagina}
        />
      </Seccion>

      {materialDelHistorial ? (
        <HistorialAlmacen
          material={materialDelHistorial}
          puedeAnular={alcanza(rol, 'almacen', 'anular')}
          onCerrar={() => setHistorialDe(null)}
          onAnulado={(mensaje) => {
            setHecho(mensaje);
            materiales.recargar();
          }}
        />
      ) : null}
    </MarcoPantalla>
  );
}
