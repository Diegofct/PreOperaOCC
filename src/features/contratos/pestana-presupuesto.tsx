/**
 * La pestaña Presupuesto (spec 031, RF-31 a RF-46, RF-55), parte 1: la lista de versiones,
 * importar el Excel del formulario con su vista previa (o leído con IA, RF-82 a RF-86), crear uno en blanco y ver uno con
 * su resumen. El editor del borrador, aprobar, la nueva versión y el Excel de salida
 * llegan en las partes 2 y 3 (T18, T19).
 *
 * La versión que se mira va en la dirección (`presupuesto`), como la obra y la pestaña.
 * Sin elegir, se abre el borrador si lo hay —es en lo que se está trabajando— y si no,
 * el vigente.
 */
import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { FuentePanel, Panel, TextoPanel } from '@/constants/theme';
import { api, mensajeDe } from '@/features/panel/cliente-api';
import {
  Acciones,
  AccionesFormulario,
  Aviso,
  Boton,
  Campo,
  Celda,
  Cifra,
  Cifras,
  Etiqueta,
  Modal,
  Seccion,
  Tabla,
  type Columna,
} from '@/features/panel/componentes';
import type { PresupuestoDetalle, PresupuestoFila, VistaPreviaDelPresupuesto } from '@/features/panel/contratos';
import { useListado } from '@/features/panel/marco';
import { useParametroDeDireccion } from '@/features/panel/usar-parametro-direccion';
import { etiquetaDeUnidad } from '@/shared/catalogos/presupuesto';
import { enPesos } from '@/shared/rules/pesos';
import {
  NOMBRE_DE_ESTADO_DE_PRESUPUESTO,
  type EstadoDePresupuesto,
  type ItemDelPresupuesto,
  type RubroDelPresupuesto,
} from '@/shared/rules/presupuesto';

import { AccionesDeVersion } from './acciones-presupuesto';
import { EditorDePresupuesto } from './editor-presupuesto';
import { elegirArchivo } from './elegir-archivo';

const TONO_DE_ESTADO: Record<EstadoDePresupuesto, 'bueno' | 'atencion' | 'neutro' | 'malo'> = {
  vigente: 'bueno',
  borrador: 'atencion',
  reemplazado: 'neutro',
  descartado: 'malo',
};

const XLSX = '.xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

/** Una cantidad como se lee: hasta tres decimales, con coma. */
function cantidad(n: number | null): string {
  return n === null ? '—' : n.toLocaleString('es-CO', { maximumFractionDigits: 3 });
}

function porciento(n: number): string {
  return `${n.toLocaleString('es-CO', { maximumFractionDigits: 2 })} %`;
}

export function PestanaPresupuesto({ obraId, esGerencia }: { obraId: string | null; esGerencia: boolean }) {
  const lista = useListado<PresupuestoFila>(useCallback(() => api.presupuestos.listar(obraId), [obraId]));
  const [elegido, setElegido] = useParametroDeDireccion('presupuesto', '');
  const [importando, setImportando] = useState(false);
  const [aviso, setAviso] = useState<{ tono: 'error' | 'exito'; texto: string } | null>(null);
  const [creando, setCreando] = useState(false);

  const borrador = lista.datos.find((p) => p.estado === 'borrador');
  const vigente = lista.datos.find((p) => p.estado === 'vigente');
  const visible = lista.datos.find((p) => p.id === elegido) ?? borrador ?? vigente ?? lista.datos[0];
  // La obra de la gerencia viene elegida; la del residente la pone el servidor (vacío = la suya).
  const obraParaCrear = obraId;

  async function crearEnBlanco() {
    setCreando(true);
    setAviso(null);
    try {
      const creado = await api.presupuestos.crearEnBlanco(obraParaCrear ?? '', 'Presupuesto del contrato');
      setElegido(creado.id);
      setAviso({ tono: 'exito', texto: `Se creó la versión ${creado.numeroVersion} en blanco.` });
      lista.recargar();
    } catch (fallo) {
      setAviso({ tono: 'error', texto: mensajeDe(fallo) });
    } finally {
      setCreando(false);
    }
  }

  const columnas: Columna<PresupuestoFila>[] = [
    { clave: 'version', titulo: 'Versión', ancho: 80, pintar: (p) => <Celda>{`v${p.numeroVersion}`}</Celda> },
    {
      clave: 'nombre',
      titulo: 'Nombre',
      ancho: 260,
      pintar: (p) => <Celda>{p.notaVersion ? `${p.nombre} · ${p.notaVersion}` : p.nombre}</Celda>,
    },
    {
      clave: 'estado',
      titulo: 'Estado',
      ancho: 170,
      pintar: (p) => (
        <View style={estilos.etiquetas}>
          <Etiqueta tono={TONO_DE_ESTADO[p.estado]}>{NOMBRE_DE_ESTADO_DE_PRESUPUESTO[p.estado]}</Etiqueta>
          {p.revisar ? <Etiqueta tono="atencion">Revisar</Etiqueta> : null}
          {p.origen === 'excel_ia' ? <Etiqueta tono="neutro">Excel (IA)</Etiqueta> : null}
        </View>
      ),
    },
    { clave: 'valor', titulo: 'Valor', ancho: 190, pintar: (p) => <Celda>{enPesos(p.valor)}</Celda> },
    {
      clave: 'fecha',
      titulo: 'Creado',
      ancho: 120,
      pintar: (p) => <Celda>{new Date(p.creadoEn).toLocaleDateString('es-CO', { timeZone: 'America/Bogota' })}</Celda>,
    },
    {
      clave: 'acciones',
      titulo: '',
      ancho: 110,
      anchoMinimo: 110,
      pintar: (p) =>
        visible?.id === p.id ? (
          <Etiqueta tono="neutro">Viendo</Etiqueta>
        ) : (
          <Boton titulo="Ver" tono="secundario" onPress={() => setElegido(p.id)} />
        ),
    },
  ];

  return (
    <View style={estilos.columna}>
      <Seccion titulo="Versiones">
        <Acciones>
          <Boton
            titulo="Importar Excel"
            tono="secundario"
            onPress={() => setImportando(true)}
            deshabilitado={Boolean(borrador)}
          />
          <Boton
            titulo={creando ? 'Creando…' : 'Crear en blanco'}
            tono="secundario"
            onPress={crearEnBlanco}
            deshabilitado={Boolean(borrador) || creando}
          />
        </Acciones>
        {borrador ? (
          <Text style={estilos.nota}>
            {`Hay un borrador abierto (v${borrador.numeroVersion}): termínelo o descártelo antes de crear otro.`}
          </Text>
        ) : null}
        {aviso ? <Aviso tono={aviso.tono}>{aviso.texto}</Aviso> : null}
        {lista.error ? <Aviso tono="error">{lista.error}</Aviso> : null}
        <Tabla
          columnas={columnas}
          filas={lista.datos}
          vacio={
            lista.cargando
              ? 'Cargando…'
              : 'La obra todavía no tiene presupuesto. Importe el Excel del formulario o créelo en blanco.'
          }
        />
      </Seccion>

      {visible ? (
        <DetalleDePresupuesto
          key={`${visible.id}-${lista.datos.length}-${visible.estado}`}
          id={visible.id}
          esGerencia={esGerencia}
          alCambiar={(mensaje, mirar) => {
            if (mensaje) setAviso({ tono: 'exito', texto: mensaje });
            if (mirar) setElegido(mirar);
            lista.recargar();
          }}
        />
      ) : null}

      {importando ? (
        <VentanaDeImportar
          obraId={obraParaCrear ?? ''}
          alCerrar={() => setImportando(false)}
          alCrear={(creado) => {
            setImportando(false);
            setElegido(creado.id);
            setAviso({ tono: 'exito', texto: `Se importó como la versión ${creado.numeroVersion}, en borrador.` });
            lista.recargar();
          }}
        />
      ) : null}
    </View>
  );
}

/* ------------------------------------------------------------------------ */
/* Importar                                                                 */
/* ------------------------------------------------------------------------ */

function VentanaDeImportar({
  obraId,
  alCerrar,
  alCrear,
}: {
  obraId: string;
  alCerrar: () => void;
  alCrear: (creado: PresupuestoDetalle) => void;
}) {
  const [archivo, setArchivo] = useState<File | null>(null);
  const [previa, setPrevia] = useState<VistaPreviaDelPresupuesto | null>(null);
  const [nombre, setNombre] = useState('Presupuesto del contrato');
  const [error, setError] = useState<string | null>(null);
  const [ocupado, setOcupado] = useState<'leyendo' | 'creando' | null>(null);
  // RF-86: si la lectura pasa de unos segundos, es que la está haciendo la IA.
  const [tardando, setTardando] = useState(false);
  useEffect(() => {
    if (ocupado !== 'leyendo') return;
    const espera = setTimeout(() => setTardando(true), 6000);
    return () => clearTimeout(espera);
  }, [ocupado]);

  async function elegir() {
    const f = await elegirArchivo(XLSX);
    if (!f) return;
    setArchivo(f);
    setPrevia(null);
    setError(null);
    setTardando(false);
    setOcupado('leyendo');
    try {
      setPrevia(await api.presupuestos.vistaPrevia(obraId, f));
    } catch (fallo) {
      setError(mensajeDe(fallo));
    } finally {
      setOcupado(null);
    }
  }

  async function crear() {
    setOcupado('creando');
    setError(null);
    try {
      alCrear(await api.presupuestos.importar(obraId, nombre.trim() || 'Presupuesto del contrato', archivo!));
    } catch (fallo) {
      setError(mensajeDe(fallo));
    } finally {
      setOcupado(null);
    }
  }

  return (
    <Modal titulo="Importar el presupuesto desde Excel" onCerrar={alCerrar} amplia>
      <Text style={estilos.nota}>
        Suba el formulario de propuesta económica (.xlsx). Si el Excel tiene otra forma, lo lee la IA. Primero se
        muestra lo que se encontró; nada se crea hasta confirmar.
      </Text>
      <Acciones>
        <Boton
          titulo={ocupado === 'leyendo' ? 'Leyendo…' : archivo ? 'Elegir otro archivo' : 'Elegir el Excel'}
          tono="secundario"
          onPress={elegir}
          deshabilitado={ocupado !== null}
        />
        {archivo ? <Text style={estilos.nota}>{archivo.name}</Text> : null}
      </Acciones>
      {ocupado === 'leyendo' && tardando ? (
        <Aviso tono="info">
          Leyendo con IA… puede tardar un par de minutos. El archivo no tiene la forma del formulario y la IA está
          leyendo la hoja del presupuesto. No cierre esta ventana.
        </Aviso>
      ) : null}

      {previa ? <VistaPreviaLeida previa={previa} /> : null}
      {previa ? (
        <View style={estilos.columna}>
          <Campo etiqueta="Nombre del presupuesto" valor={nombre} onChange={setNombre} />
          <Text style={estilos.nota}>
            {previa.leidoPor === 'ia' || !previa.cuadra || previa.diferencias.length > 0
              ? 'Se creará como borrador, marcado para revisar. Podrá corregirlo en el editor antes de aprobarlo.'
              : 'Se creará como borrador. Podrá corregirlo en el editor antes de aprobarlo.'}
          </Text>
        </View>
      ) : null}

      {error ? <Aviso tono="error">{error}</Aviso> : null}
      <AccionesFormulario>
        <Boton titulo="Cancelar" tono="secundario" onPress={alCerrar} />
        <Boton
          titulo={ocupado === 'creando' ? 'Creando…' : 'Crear el borrador'}
          onPress={crear}
          deshabilitado={!previa || ocupado !== null}
        />
      </AccionesFormulario>
    </Modal>
  );
}

/**
 * Lo que se leyó del Excel, antes de crear nada (RF-43 a RF-45, RF-81, RF-82, RF-89), en
 * tres partes: el estado (quién lo leyó y si cuadra), lo que se encontró (grupo por
 * grupo, que se abre para ver capítulos y rubros) y lo que hay que revisar.
 */
function VistaPreviaLeida({ previa }: { previa: VistaPreviaDelPresupuesto }) {
  const [abiertos, setAbiertos] = useState<Set<string>>(new Set());
  const alternar = (id: string) =>
    setAbiertos((a) => {
      const b = new Set(a);
      if (b.has(id)) b.delete(id);
      else b.add(id);
      return b;
    });
  const conIa = previa.leidoPor === 'ia';
  const { conteo, resumen } = previa;
  const rubrosDe = (grupoId: string | null) => previa.rubros.filter((r) => r.grupoId === grupoId);
  const generales = rubrosDe(null);
  const nadaQueRevisar = previa.rechazados.length === 0 && previa.diferencias.length === 0;
  const plural = (n: number, uno: string, varios: string) => `${n} ${n === 1 ? uno : varios}`;

  const fila = (clave: string, texto: string, valor: number, detalle?: string) => (
    <View key={clave} style={estilos.filaDetalle}>
      <Text style={estilos.textoFila}>{texto}</Text>
      {detalle ? <Text style={estilos.notaPequena}>{detalle}</Text> : null}
      <Text style={estilos.valorFila}>{enPesos(valor)}</Text>
    </View>
  );

  const bloque = (
    clave: string,
    nombre: string,
    nombreCompleto: string,
    cuantos: string,
    total: number,
    contenido: ReactNode,
  ) => {
    const abierto = abiertos.has(clave);
    return (
      <View key={clave} style={estilos.grupoPrevio}>
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ expanded: abierto }}
          onPress={() => alternar(clave)}
          style={({ hovered }) => [estilos.cabeceraPrevia, hovered && estilos.cabeceraPreviaEncima]}
        >
          <Text style={estilos.flecha}>{abierto ? '▾' : '▸'}</Text>
          <View style={estilos.nombrePrevio}>
            <Text style={estilos.nombreCapitulo}>{nombre}</Text>
            {nombreCompleto ? (
              <Text style={estilos.notaPequena} numberOfLines={2}>
                {nombreCompleto}
              </Text>
            ) : null}
          </View>
          <Text style={estilos.notaPequena}>{cuantos}</Text>
          <Text style={estilos.valorFila}>{enPesos(total)}</Text>
        </Pressable>
        {abierto ? <View style={estilos.detallePrevio}>{contenido}</View> : null}
      </View>
    );
  };

  return (
    <View style={estilos.columna}>
      {/* 1. El estado */}
      <View style={estilos.etiquetas}>
        <Etiqueta tono={conIa ? 'atencion' : 'bueno'}>{conIa ? '✦ Leído con IA' : 'Formulario reconocido'}</Etiqueta>
        <Text style={estilos.nota}>
          {conIa
            ? 'Revíselo antes de aprobar: la IA lo leyó y el sistema comprobó cada ítem contra su fila del Excel.'
            : 'Se leyó con el lector del formulario oficial.'}
        </Text>
      </View>
      <Aviso tono={previa.cuadra ? 'exito' : 'error'}>
        {previa.cuadra
          ? `Cuadra: ${enPesos(previa.valor)}, igual al «VALOR TOTAL» del Excel.`
          : `No cuadra: el sistema calcula ${enPesos(previa.valor)} y el Excel dice ${enPesos(previa.valorDelExcel)} (diferencia de ${enPesos(Math.abs(previa.valor - previa.valorDelExcel))}). Se puede crear igual, marcado para revisar.`}
      </Aviso>
      <Text style={estilos.conteo}>
        {[
          conteo.grupos > 0 ? plural(conteo.grupos, 'grupo', 'grupos') : null,
          plural(conteo.capitulos, 'capítulo', 'capítulos'),
          plural(conteo.items, 'ítem', 'ítems'),
          plural(conteo.rubros, 'rubro', 'rubros'),
        ]
          .filter(Boolean)
          .join(' · ')}
      </Text>

      {/* 2. Lo que se encontró */}
      <Seccion titulo="Lo que se encontró">
        <Text style={estilos.notaPequena}>Toque un grupo para ver sus capítulos y rubros.</Text>
        {resumen.grupos.map((g) => {
          const rubros = rubrosDe(g.id);
          return bloque(
            g.id,
            g.nombre || 'Capítulos',
            g.nombreCompleto,
            [plural(g.capitulos.length, 'capítulo', 'capítulos'), rubros.length > 0 ? plural(rubros.length, 'rubro', 'rubros') : null]
              .filter(Boolean)
              .join(' · '),
            g.subtotal + g.rubros,
            <>
              {g.capitulos.map((c) => fila(c.id, `${c.codigo} · ${c.nombre}`, c.subtotal, plural(c.items, 'ítem', 'ítems')))}
              {rubros.map((r) => fila(r.id, `+ ${r.nombre}`, r.valor, 'rubro'))}
            </>,
          );
        })}
        {generales.length > 0
          ? bloque(
              'contrato',
              'Rubros de todo el contrato',
              '',
              plural(generales.length, 'rubro', 'rubros'),
              generales.reduce((t, r) => t + r.valor, 0),
              <>{generales.map((r) => fila(r.id, r.nombre, r.valor))}</>,
            )
          : null}
      </Seccion>

      {/* 3. Lo que hay que revisar */}
      <Seccion titulo="Para revisar">
        {nadaQueRevisar ? (
          <View style={estilos.etiquetas}>
            <Etiqueta tono="bueno">✓ Nada</Etiqueta>
            <Text style={estilos.nota}>
              {conIa
                ? 'Todo lo leído se encontró en su fila del Excel y los totales de los ítems coinciden.'
                : 'Los totales de los ítems coinciden con cantidad × valor unitario.'}
            </Text>
          </View>
        ) : null}
        {previa.rechazados.length > 0 ? (
          <Aviso tono="error">
            {`No se crearán (la IA los leyó, pero no están en la fila del Excel que citó):\n${previa.rechazados
              .map((r) => `· ${r.que}: ${r.motivo}`)
              .join('\n')}`}
          </Aviso>
        ) : null}
        {previa.diferencias.length > 0 ? (
          <Aviso tono="info">
            {`Ítems cuyo total en el Excel no es cantidad × valor unitario (se usará el calculado):\n${previa.diferencias
              .map(
                (d) =>
                  `· Renglón ${d.renglon}, ítem ${d.item} (${d.capitulo}): Excel ${enPesos(d.delExcel)}, calculado ${enPesos(d.calculado)}`,
              )
              .join('\n')}`}
          </Aviso>
        ) : null}
      </Seccion>
    </View>
  );
}

/* ------------------------------------------------------------------------ */
/* Ver uno                                                                  */
/* ------------------------------------------------------------------------ */

const COLUMNAS_DE_ITEMS: Columna<ItemDelPresupuesto>[] = [
  { clave: 'renglon', titulo: 'Nº', ancho: 50, pintar: (i) => <Celda>{i.renglon ?? ''}</Celda> },
  { clave: 'item', titulo: 'Ítem', ancho: 80, pintar: (i) => <Celda>{i.item}</Celda> },
  { clave: 'descripcion', titulo: 'Descripción', ancho: 360, pintar: (i) => <Celda lineas={3}>{i.descripcion}</Celda> },
  {
    clave: 'unidad',
    titulo: 'Und.',
    ancho: 70,
    pintar: (i) => <Celda>{i.unidad ? etiquetaDeUnidad(i.unidad) : i.unidadEscrita || '—'}</Celda>,
  },
  { clave: 'cantidad', titulo: 'Cantidad', ancho: 110, pintar: (i) => <Celda>{cantidad(i.cantidad)}</Celda> },
  {
    clave: 'unitario',
    titulo: 'Valor unitario',
    ancho: 140,
    pintar: (i) => <Celda>{i.valorUnitario === null ? '—' : enPesos(i.valorUnitario)}</Celda>,
  },
  {
    clave: 'total',
    titulo: 'Total',
    ancho: 170,
    pintar: (i) =>
      i.totalDelExcel ? (
        <View style={estilos.etiquetas}>
          <Celda>{enPesos(i.valorTotal)}</Celda>
          <Etiqueta tono="atencion">{`Excel: ${enPesos(i.totalDelExcel)}`}</Etiqueta>
        </View>
      ) : (
        <Celda>{enPesos(i.valorTotal)}</Celda>
      ),
  },
];

function DetalleDePresupuesto({
  id,
  esGerencia,
  alCambiar,
}: {
  id: string;
  esGerencia: boolean;
  /** Tras un cambio: el mensaje para la lista y, si nació otra versión, cuál mirar. */
  alCambiar: (mensaje?: string, mirar?: string) => void;
}) {
  const lectura = useListado<PresupuestoDetalle>(useCallback(async () => [await api.presupuestos.de(id)], [id]));
  const [abiertos, setAbiertos] = useState<Set<string>>(new Set());
  const [editando, setEditando] = useState(false);
  const [guardado, setGuardado] = useState(false);
  const p = lectura.datos[0];

  if (lectura.cargando && !p) return <Text style={estilos.nota}>Cargando el presupuesto…</Text>;
  if (lectura.error || !p) return <Aviso tono="error">{lectura.error ?? 'No se pudo leer el presupuesto.'}</Aviso>;

  if (editando && p.estado === 'borrador') {
    return (
      <View style={estilos.columna}>
        <Text style={estilos.titulo}>{`Editando ${p.nombre} · v${p.numeroVersion}`}</Text>
        <EditorDePresupuesto
          // La versión en la llave: tras guardar o volver a cargar, se edita lo último.
          key={p.version}
          presupuesto={p}
          alGuardar={() => {
            setEditando(false);
            setGuardado(true);
            lectura.recargar();
            alCambiar();
          }}
          alCancelar={() => {
            setEditando(false);
            lectura.recargar();
          }}
        />
      </View>
    );
  }

  const alternar = (capituloId: string) =>
    setAbiertos((a) => {
      const b = new Set(a);
      if (b.has(capituloId)) b.delete(capituloId);
      else b.add(capituloId);
      return b;
    });
  const rubrosDe = (grupoId: string | null) => p.estructura.rubros.filter((r) => r.grupoId === grupoId);
  const columnasDeRubros: Columna<RubroDelPresupuesto>[] = [
    { clave: 'nombre', titulo: 'Rubro', ancho: 420, pintar: (r) => <Celda lineas={3}>{r.nombre}</Celda> },
    { clave: 'unidad', titulo: 'Und.', ancho: 90, pintar: (r) => <Celda>{r.unidad || '—'}</Celda> },
    { clave: 'cantidad', titulo: 'Cantidad', ancho: 100, pintar: (r) => <Celda>{cantidad(r.cantidad)}</Celda> },
    { clave: 'valor', titulo: 'Valor', ancho: 170, pintar: (r) => <Celda>{enPesos(r.valor)}</Celda> },
  ];

  return (
    <View style={estilos.columna}>
      <View style={estilos.etiquetas}>
        <Text style={estilos.titulo}>{`${p.nombre} · v${p.numeroVersion}`}</Text>
        <Etiqueta tono={TONO_DE_ESTADO[p.estado]}>{NOMBRE_DE_ESTADO_DE_PRESUPUESTO[p.estado]}</Etiqueta>
        {p.estado === 'reemplazado' || p.estado === 'descartado' ? (
          <Text style={estilos.nota}>Solo lectura.</Text>
        ) : null}
      </View>
      <AccionesDeVersion
        presupuesto={p}
        esGerencia={esGerencia}
        alEditar={() => {
          setGuardado(false);
          setEditando(true);
        }}
        alHecho={(mensaje, mirar) => {
          lectura.recargar();
          alCambiar(mensaje, mirar);
        }}
      />
      {guardado ? <Aviso tono="exito">Borrador guardado.</Aviso> : null}
      {p.notaVersion ? <Text style={estilos.nota}>{`Motivo de la versión: ${p.notaVersion}`}</Text> : null}
      {p.motivoDescarte ? <Text style={estilos.nota}>{`Descartado: ${p.motivoDescarte}`}</Text> : null}
      {p.revisar ? (
        <Aviso tono="info">
          {p.origen === 'excel_ia'
            ? `Leído con IA: el «VALOR TOTAL» del Excel era ${p.valorExcel !== null ? enPesos(p.valorExcel) : '—'}. Revíselo antes de aprobar.`
            : `Importado con diferencias: el «VALOR TOTAL» del Excel era ${p.valorExcel !== null ? enPesos(p.valorExcel) : '—'}. Revíselo antes de aprobar.`}
        </Aviso>
      ) : null}

      <Cifras>
        <Cifra titulo="Valor del presupuesto" valor={enPesos(p.resumen.valor)} pie="obras + rubros" />
        <Cifra titulo="Obras" valor={enPesos(p.resumen.obras)} pie={`${p.resumen.items} ítems`} />
        <Cifra titulo="Rubros" valor={enPesos(p.resumen.rubros)} pie={`${p.estructura.rubros.length} rubros`} />
        <Cifra
          titulo="AIU"
          valor={porciento(p.resumen.aiu.total)}
          pie={`A ${porciento(p.resumen.aiu.administracion)} · I ${porciento(p.resumen.aiu.imprevistos)} · U ${porciento(p.resumen.aiu.utilidad)}, incluido en los precios`}
        />
      </Cifras>

      {p.faltasParaAprobar.length > 0 ? (
        <Aviso tono="info">{`Para aprobarlo falta:\n· ${p.faltasParaAprobar.slice(0, 8).join('\n· ')}${p.faltasParaAprobar.length > 8 ? `\n· y ${p.faltasParaAprobar.length - 8} más` : ''}`}</Aviso>
      ) : null}

      {p.estructura.grupos.length === 0 ? (
        <Aviso tono="info">Este presupuesto todavía no tiene capítulos ni ítems.</Aviso>
      ) : null}

      {p.estructura.grupos.map((g) => {
        const resumen = p.resumen.grupos.find((x) => x.id === g.id);
        return (
          // Sin nombre, un presupuesto sin vías: los capítulos van directos (RF-33).
          <Seccion key={g.id} titulo={g.nombre ? `${g.nombre} · ${enPesos(resumen?.subtotal ?? 0)}` : 'Capítulos'}>
            {g.nombreCompleto ? <Text style={estilos.notaPequena}>{g.nombreCompleto}</Text> : null}
            {g.capitulos.map((c) => {
              const sub = resumen?.capitulos.find((x) => x.id === c.id);
              const abierto = abiertos.has(c.id);
              return (
                <View key={c.id} style={estilos.capitulo}>
                  <View style={estilos.cabeceraCapitulo}>
                    <Text style={estilos.nombreCapitulo}>{`${c.codigo} · ${c.nombre}`}</Text>
                    <Text style={estilos.nota}>{`${c.items.length} ítems · ${enPesos(sub?.subtotal ?? 0)}`}</Text>
                    <Boton
                      titulo={abierto ? 'Ocultar ítems' : 'Ver ítems'}
                      tono="secundario"
                      onPress={() => alternar(c.id)}
                    />
                  </View>
                  {abierto ? (
                    <Tabla columnas={COLUMNAS_DE_ITEMS} filas={c.items} vacio="Sin ítems." variante="desnuda" />
                  ) : null}
                </View>
              );
            })}
            {rubrosDe(g.id).length > 0 ? <Tabla columnas={columnasDeRubros} filas={rubrosDe(g.id)} vacio="" /> : null}
          </Seccion>
        );
      })}

      {rubrosDe(null).length > 0 ? (
        <Seccion titulo="Rubros de todo el contrato">
          <Tabla columnas={columnasDeRubros} filas={rubrosDe(null)} vacio="" />
        </Seccion>
      ) : null}
    </View>
  );
}

const estilos = StyleSheet.create({
  columna: { gap: 16 },
  etiquetas: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8 },
  nota: { fontFamily: FuentePanel.texto, fontSize: TextoPanel.cuerpo, color: Panel.textoApoyo },
  titulo: { fontFamily: FuentePanel.texto, fontWeight: '700', fontSize: TextoPanel.cuerpo + 4, color: Panel.texto },
  capitulo: { gap: 8, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: Panel.borde },
  cabeceraCapitulo: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 12 },
  nombreCapitulo: {
    fontFamily: FuentePanel.texto,
    fontWeight: '700',
    fontSize: TextoPanel.cuerpo,
    color: Panel.texto,
    flexShrink: 1,
  },
  notaPequena: { fontFamily: FuentePanel.texto, fontSize: TextoPanel.apoyo, color: Panel.textoApoyo },
  conteo: { fontFamily: FuentePanel.texto, fontWeight: '600', fontSize: TextoPanel.cuerpo, color: Panel.texto },
  grupoPrevio: { borderBottomWidth: 1, borderBottomColor: Panel.bordeSuave },
  cabeceraPrevia: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 10,
    paddingHorizontal: 8,
  },
  cabeceraPreviaEncima: { backgroundColor: Panel.fondoHover },
  flecha: { fontFamily: FuentePanel.texto, fontSize: TextoPanel.seccion, color: Panel.textoApoyo, width: 18 },
  nombrePrevio: { flex: 1, minWidth: 220, gap: 2 },
  detallePrevio: { paddingLeft: 34, paddingRight: 8, paddingBottom: 10, gap: 2 },
  filaDetalle: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 12, paddingVertical: 4 },
  textoFila: {
    flex: 1,
    minWidth: 200,
    fontFamily: FuentePanel.texto,
    fontSize: TextoPanel.cuerpo,
    color: Panel.texto,
  },
  valorFila: {
    fontFamily: FuentePanel.texto,
    fontWeight: '600',
    fontSize: TextoPanel.cuerpo,
    color: Panel.texto,
    fontVariant: ['tabular-nums'],
    minWidth: 150,
    textAlign: 'right',
  },
});
