/**
 * Requisiciones (spec 046): la lista de una obra o de GeoLab y, en Elemental, la bandeja de
 * aprobación del grupo. Una pantalla para los dos, porque se leen igual: una fila por requisición
 * —RQ de compra o de pago, o una SC o SP anterior—, con su número, lo que se pide, para cuándo, en
 * qué paso va y quién la pidió.
 *
 * El lugar sale de la dirección (`useLugarDelPanel`): en Elemental es la bandeja (RF-47); en una
 * obra o en GeoLab, la lista del lugar (RF-1). El servidor la manda ya ordenada —primero las que
 * esperan mi aprobación (RF-45), luego las abiertas y al final las cerradas (RF-49)— y con las
 * marcas de hoy. Aquí se busca y se filtra con la regla (`pasaLosFiltrosDeRequisicion`, RF-50,
 * RF-51), para que «rq7» encuentre la RQ-0007 igual que en el servidor, y responda mientras se
 * escribe.
 *
 * Pedir: una requisición de compra o de pago (RF-4), con los formularios de la 036 y la 037 en su
 * modo requisición. El detalle es el de la 036 o la 037 según la clase: la requisición vive en
 * esas tablas, y todo lo que pasa después de aprobarla sigue allí.
 *
 * Las columnas caben en `MaxContentWidthPanel` (1 280): 120 + 240 + 120 + 240 + 140 + 170 + 100 =
 * 1 130, más 6 separaciones de 16 (96) y 16 a cada lado (32): 1 258.
 *
 * Spec 047: en OCC se pide con la requisición de pagos del viernes (RF-1), que va en su propia tabla
 * arriba —con «Nueva requisición de pagos» e «Importar planilla»— y las de antes debajo (RF-3). En
 * Elemental, las de OCC en autorización van en la bandeja, con «OCC» (RF-49). Su tabla: 120 + 130 +
 * 220 + 90 + 150 + 150 + 170 + 100 = 1 130, más 7 separaciones (112) y los dos lados (32): 1 274.
 */
import { useCallback, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { FuentePanel, Panel, Spacing, TextoPanel } from '@/constants/theme';
import { FormularioDeSolicitud } from '@/features/compras/formulario-de-solicitud';
import { PasosDeGerencia } from '@/features/compras/pasos-de-gerencia';
import { VistaDeLaSolicitud } from '@/features/compras/vista-de-la-solicitud';
import { useLugarDelPanel } from '@/features/empresas/contexto-empresa';
import { api } from '@/features/panel/cliente-api';
import {
  Acciones,
  Aviso,
  BarraDeListado,
  Boton,
  CampoDeFecha,
  Casilla,
  Celda,
  Confirmado,
  Etiqueta,
  Seccion,
  Selector,
  Tabla,
  type Columna,
} from '@/features/panel/componentes';
import { MarcoPantalla, useListado } from '@/features/panel/marco';
import type { LugarDeRequisiciones, RequisicionEnLaLista } from '@/features/panel/requisiciones';
import type { RequisicionOccEnLaLista } from '@/features/panel/requisiciones-occ';
import { useParametroDeDireccion } from '@/features/panel/usar-parametro-direccion';
import { FormularioDePago } from '@/features/tesoreria/formulario-de-pago';
import { PasosDeTesoreria } from '@/features/tesoreria/pasos-de-tesoreria';
import { VistaDelPago } from '@/features/tesoreria/vista-del-pago';
import { ESTADOS_DE_SOLICITUD } from '@/shared/rules/compras';
import { fechaDelCorte } from '@/shared/rules/cortes';
import { ESTADOS_DE_PAGO } from '@/shared/rules/pagos';
import { enPesos } from '@/shared/rules/pesos';
import {
  NOMBRE_DEL_PASO,
  pasaLosFiltrosDeRequisicion,
  PASOS_DE_LA_CADENA,
  type FiltrosDeRequisiciones,
  type PasoDeLaCadena,
  type TipoDeRequisicion,
} from '@/shared/rules/requisiciones';

import { ImportarPlanillaOcc } from './occ/importar-planilla-occ';
import { EstadoOcc } from './occ/partes-occ';
import { VentanaNuevaOcc } from './occ/ventanas-occ';
import { VistaDeRequisicionOcc } from './occ/vista-requisicion-occ';

type Fila = RequisicionEnLaLista;

/** Lo que llega del servidor, en las dos formas de la pantalla. */
interface Cargado {
  requisiciones: Fila[];
  sePuedePedir: boolean;
  resumen: { esperan: number; urgentes: number; vencidas: number } | null;
  sinAdministradora: boolean;
  /** Spec 047: las requisiciones de pagos de OCC (en OCC, todas; en la bandeja, las que esperan). */
  pagosOcc: RequisicionOccEnLaLista[];
  sePuedePedirOcc: boolean;
}

const SIN_FILTROS: FiltrosDeRequisiciones = {
  tipo: null,
  paso: null,
  estado: null,
  soloUrgentes: false,
  desde: null,
  hasta: null,
  texto: '',
};

/** Los estados que se pueden escoger: los de compra y los de pago, sin repetir, por nombre. */
const ESTADOS = [...ESTADOS_DE_SOLICITUD, ...ESTADOS_DE_PAGO].filter(
  (e, i, todos) => todos.findIndex((x) => x.id === e.id) === i,
);

export default function PantallaRequisiciones() {
  const lugar = useLugarDelPanel();
  const enBandeja = lugar?.tipo === 'empresa' && lugar.empresa === 'elemental';
  // RF-86: una obra, GeoLab u OCC. En Elemental no se pide: es la lista del grupo.
  const pedido: LugarDeRequisiciones | null =
    lugar?.tipo === 'obra'
      ? { obraId: lugar.obraId }
      : lugar?.tipo === 'empresa' && (lugar.empresa === 'geolab' || lugar.empresa === 'occ')
        ? { empresa: lugar.empresa }
        : null;
  const clave = enBandeja ? 'bandeja' : pedido ? ('obraId' in pedido ? pedido.obraId : pedido.empresa) : null;
  // La abierta va en la dirección (`?requisicion=compra:<id>`), como la solicitud en la 036.
  const [abierta, setAbierta] = useParametroDeDireccion('requisicion', '');
  const [pidiendo, setPidiendo] = useState<TipoDeRequisicion | 'occ' | 'importar_occ' | null>(null);
  const [hecho, setHecho] = useState<string | null>(null);
  const [filtros, setFiltros] = useState<FiltrosDeRequisiciones>(SIN_FILTROS);

  const cargadas = useListado<Cargado>(
    useCallback(
      () =>
        enBandeja
          ? api.requisiciones.bandeja().then((b) => [
              { requisiciones: b.requisiciones, sePuedePedir: false, resumen: b.resumen, sinAdministradora: b.sinAdministradora, pagosOcc: b.pagosOcc, sePuedePedirOcc: false },
            ])
          : pedido
            ? api.requisiciones.listar(pedido).then((l) => [
                { ...l, resumen: null, sinAdministradora: false, pagosOcc: l.pagosOcc ?? [], sePuedePedirOcc: l.sePuedePedirOcc ?? false },
              ])
            : Promise.resolve([]),
      // eslint-disable-next-line react-hooks/exhaustive-deps
      [clave],
    ),
  );
  const cargado = cargadas.datos[0];
  const filas = cargado?.requisiciones ?? [];
  const conValores = filas.some((f) => 'valor' in f);
  const visibles = filas.filter((f) =>
    pasaLosFiltrosDeRequisicion(
      { ...f, pedidaPor: f.pedidaPor.id, textos: [f.resumen, f.pedidaPor.nombre, f.lugar.nombre] },
      filtros,
    ),
  );
  const cambiar = (cambio: Partial<FiltrosDeRequisiciones>) => setFiltros((f) => ({ ...f, ...cambio }));

  if (abierta) {
    const [tipo, id] = abierta.split(':');
    const volver = () => {
      setAbierta('');
      cargadas.recargar();
    };
    // Spec 047: una requisición de pagos de OCC tiene su propio detalle.
    if (tipo === 'occ') return <VistaDeRequisicionOcc id={id} alVolver={volver} volverA={enBandeja ? 'la bandeja' : 'las requisiciones'} />;
    // En la bandeja se deciden también las SC y SP de antes y las de OCC (RF-83), con los botones
    // de la gerencia; una RQ se decide con los de su cadena, que pone el propio detalle.
    return tipo === 'pago' ? (
      <VistaDelPago
        id={id}
        alVolver={volver}
        volverA="las requisiciones"
        accionesExtra={enBandeja ? (s, listo) => <PasosDeTesoreria solicitud={s} listo={listo} donde="requisiciones" /> : undefined}
      />
    ) : (
      <VistaDeLaSolicitud
        id={id}
        alVolver={volver}
        volverA="las requisiciones"
        accionesExtra={enBandeja ? (s, listo) => <PasosDeGerencia solicitud={s} listo={listo} donde="requisiciones" /> : undefined}
      />
    );
  }

  const columnas: Columna<Fila>[] = [
    {
      clave: 'numero',
      titulo: 'Número',
      ancho: 120,
      pintar: (f) => (
        <View style={estilos.celdaDoble}>
          <Text style={estilos.fuerte}>{f.codigo}</Text>
          <Text style={estilos.apoyo}>{f.tipo === 'compra' ? 'Compra' : 'Pago'}</Text>
          {f.urgente ? <Etiqueta tono="malo">Urgente</Etiqueta> : null}
        </View>
      ),
    },
    {
      clave: 'resumen',
      titulo: 'Qué se pide',
      ancho: 240,
      pintar: (f) => <Celda>{f.resumen}</Celda>,
    },
    {
      clave: 'paraCuando',
      titulo: 'Para cuándo',
      ancho: 120,
      pintar: (f) => <Celda>{fechaDelCorte(f.paraCuando)}</Celda>,
    },
    {
      clave: 'estado',
      titulo: 'Estado',
      // «En aprobación: Director de Proyectos» es la etiqueta más larga.
      ancho: 240,
      pintar: (f) => (
        <View style={estilos.marcas}>
          {f.esperaMiAprobacion ? <Etiqueta tono="atencion">Espera su aprobación</Etiqueta> : null}
          {/* «Devuelta: corrígela» ya dice el estado. */}
          {f.estado === 'devuelta' ? null : <Etiqueta tono="neutro">{f.estadoQueSeVe}</Etiqueta>}
          {f.marcas.map((m) => (
            <Etiqueta key={m} tono={m === 'Anterior' || m === 'OCC' ? 'neutro' : 'malo'}>
              {m}
            </Etiqueta>
          ))}
        </View>
      ),
    },
    {
      clave: 'valor',
      titulo: 'Valor',
      ancho: 140,
      pintar: (f) => <Celda>{conValores && f.valor ? enPesos(f.valor) : '—'}</Celda>,
    },
    {
      clave: 'pedida',
      titulo: enBandeja ? 'Lugar y quién' : 'Pedida por',
      ancho: 170,
      pintar: (f) => (
        <View style={estilos.celdaDoble}>
          {enBandeja ? <Text style={estilos.texto}>{f.lugar.nombre}</Text> : null}
          <Text style={enBandeja ? estilos.apoyo : estilos.texto}>{f.pedidaPor.nombre}</Text>
          <Text style={estilos.apoyo}>{fechaDelCorte(f.pedidaEl)}</Text>
        </View>
      ),
    },
    {
      clave: 'abrir',
      titulo: '',
      ancho: 100,
      anchoMinimo: 100,
      pintar: (f) => <Boton titulo="Abrir" tono="secundario" onPress={() => setAbierta(`${f.tipo}:${f.id}`)} />,
    },
  ];

  const columnasOcc: Columna<RequisicionOccEnLaLista>[] = [
    { clave: 'numero', titulo: 'Número', ancho: 120, pintar: (r) => <Text style={estilos.fuerte}>{r.codigo}</Text> },
    { clave: 'viernes', titulo: 'Viernes de entrega', ancho: 130, pintar: (r) => <Celda>{fechaDelCorte(r.viernes)}</Celda> },
    {
      clave: 'estado',
      titulo: 'Estado',
      ancho: 220,
      pintar: (r) => (
        <View style={estilos.marcas}>
          {/* «Devuelta: corrígela» ya dice el estado, como en la lista de la 046. */}
          {r.marcas.includes('Devuelta: corrígela') ? null : <EstadoOcc estado={r.estado} />}
          {r.marcas.map((m) => (
            <Etiqueta key={m} tono={m === 'OCC' ? 'neutro' : 'malo'}>
              {m}
            </Etiqueta>
          ))}
          {r.faltanPorResponder > 0 ? <Etiqueta tono="atencion">{`Faltan ${r.faltanPorResponder}`}</Etiqueta> : null}
        </View>
      ),
    },
    { clave: 'lineas', titulo: 'Líneas', ancho: 90, pintar: (r) => <Celda>{String(r.lineas)}</Celda> },
    { clave: 'pedido', titulo: 'Total pedido', ancho: 150, pintar: (r) => <Celda>{enPesos(r.totalPedido)}</Celda> },
    {
      clave: 'pagar',
      titulo: 'Total a pagar',
      ancho: 150,
      // Solo hay algo que pagar cuando está autorizada; en una cancelada o sin autorizar, nada.
      pintar: (r) => <Celda>{r.estado === 'autorizada' || r.estado === 'pagada_en_parte' || r.estado === 'pagada' ? enPesos(r.totalAPagar) : '—'}</Celda>,
    },
    { clave: 'elaborada', titulo: 'Elaborada por', ancho: 170, pintar: (r) => <Celda>{r.elaboradaPor.nombre}</Celda> },
    {
      clave: 'abrir',
      titulo: '',
      ancho: 100,
      anchoMinimo: 100,
      pintar: (r) => <Boton titulo="Abrir" tono="secundario" onPress={() => setAbierta(`occ:${r.id}`)} />,
    },
  ];
  const enOcc = pedido !== null && !('obraId' in pedido) && pedido.empresa === 'occ';
  const pagosOcc = cargado?.pagosOcc ?? [];

  const esperan = filas.filter((f) => f.esperaMiAprobacion).length;
  const listo = (mensaje: string) => {
    setPidiendo(null);
    setHecho(mensaje);
    cargadas.recargar();
  };
  return (
    <MarcoPantalla
      titulo="Requisiciones"
      descripcion={
        enBandeja
          ? 'Lo que el grupo pide comprar o pagar: aquí se aprueba en el último paso, se registra la compra y se marca lo recibido.'
          : // Spec 047: OCC arma una requisición de pagos por viernes; la autorizan línea por línea.
            enOcc
            ? 'Lo que OCC pide pagar: una requisición por viernes de entrega, que la Administradora de Elemental o la Gerencia autorizan línea por línea.'
            : // RF-19: en GeoLab no hay pasos de obra; va directo a la Administradora.
              pedido && !('obraId' in pedido)
              ? 'Lo que GeoLab pide comprar o pagar. Cada requisición va directo a la Administradora de Elemental.'
            : 'Lo que se pide comprar o pagar. Cada requisición pasa por el Residente, el Director de Obra, el Director de Proyectos y la Administradora de Elemental.'
      }
      error={cargadas.error}
      cargando={cargadas.cargando}
    >
      {cargado?.sinAdministradora ? (
        <Aviso tono="error">No hay ninguna Administradora de Elemental activa: lo que espera ese paso lo aprueba la Gerencia.</Aviso>
      ) : null}
      <Confirmado mensaje={hecho} />
      {pedido && cargado?.sePuedePedir ? (
        <Acciones>
          <Boton titulo="Nueva requisición de compra" onPress={() => setPidiendo('compra')} />
          <Boton titulo="Nueva requisición de pago" tono="secundario" onPress={() => setPidiendo('pago')} />
        </Acciones>
      ) : null}
      {pidiendo === 'compra' && pedido ? (
        <FormularioDeSolicitud requisicion lugar={pedido} alCerrar={() => setPidiendo(null)} alGuardar={listo} />
      ) : null}
      {pidiendo === 'pago' && pedido ? (
        <FormularioDePago requisicion lugar={pedido} alCerrar={() => setPidiendo(null)} alGuardar={listo} />
      ) : null}
      {cargado?.sePuedePedirOcc ? (
        <Acciones>
          <Boton titulo="Nueva requisición de pagos" onPress={() => setPidiendo('occ')} />
          <Boton titulo="Importar planilla" tono="secundario" onPress={() => setPidiendo('importar_occ')} />
        </Acciones>
      ) : null}
      {pidiendo === 'occ' ? (
        <VentanaNuevaOcc
          alCerrar={() => setPidiendo(null)}
          alCrear={(id) => {
            setPidiendo(null);
            setAbierta(`occ:${id}`);
          }}
          alAbrirExistente={(id) => {
            setPidiendo(null);
            setAbierta(`occ:${id}`);
          }}
        />
      ) : null}
      {pidiendo === 'importar_occ' ? (
        <ImportarPlanillaOcc
          alCerrar={() => setPidiendo(null)}
          alConfirmar={(_mensaje, id) => {
            setPidiendo(null);
            setAbierta(`occ:${id}`);
          }}
        />
      ) : null}
      {enOcc || pagosOcc.length ? (
        <Seccion titulo={enBandeja ? `Requisiciones de pagos de OCC · ${pagosOcc.length} esperan autorización` : 'Requisiciones de pagos'}>
          <Tabla
            columnas={columnasOcc}
            filas={pagosOcc}
            vacio="Todavía no hay requisiciones de pagos. Cree la del próximo viernes o importe la planilla."
          />
        </Seccion>
      ) : null}
      {cargado?.resumen ? (
        <Text style={estilos.texto}>
          {`Esperan el último paso: ${cargado.resumen.esperan} · urgentes: ${cargado.resumen.urgentes} · vencidas: ${cargado.resumen.vencidas}`}
        </Text>
      ) : null}
      <Seccion titulo={enOcc ? 'Requisiciones anteriores' : esperan > 0 ? `Requisiciones · ${esperan} esperan su aprobación` : 'Requisiciones'}>
        <BarraDeListado busqueda={filtros.texto} onBuscar={(texto) => cambiar({ texto })} total={filas.length} mostradas={visibles.length}>
          <Selector
            etiqueta="Clase"
            valor={filtros.tipo}
            opciones={[
              { valor: 'compra', etiqueta: 'Compra' },
              { valor: 'pago', etiqueta: 'Pago' },
            ]}
            onChange={(v) => cambiar({ tipo: (v as TipoDeRequisicion | null) ?? null })}
            permiteVacio
            vacio="Todas"
            ancho={140}
          />
          {enBandeja ? null : (
            <Selector
              etiqueta="Paso"
              valor={filtros.paso}
              opciones={PASOS_DE_LA_CADENA.map((p) => ({ valor: p, etiqueta: NOMBRE_DEL_PASO[p] }))}
              onChange={(v) => cambiar({ paso: (v as PasoDeLaCadena | null) ?? null })}
              permiteVacio
              vacio="Todos"
              ancho={200}
            />
          )}
          <Selector
            etiqueta="Estado"
            valor={filtros.estado}
            opciones={ESTADOS.map((e) => ({ valor: e.id, etiqueta: e.nombre }))}
            onChange={(v) => cambiar({ estado: v ?? null })}
            permiteVacio
            vacio="Todos"
            ancho={180}
          />
          <CampoDeFecha etiqueta="Pedidas desde" valor={filtros.desde ?? ''} onChange={(v) => cambiar({ desde: v || null })} ancho={150} />
          <CampoDeFecha etiqueta="Hasta" valor={filtros.hasta ?? ''} onChange={(v) => cambiar({ hasta: v || null })} ancho={150} />
          <View style={estilos.casilla}>
            <Casilla etiqueta="Solo urgentes" marcada={filtros.soloUrgentes} onChange={(soloUrgentes) => cambiar({ soloUrgentes })} />
          </View>
        </BarraDeListado>
        <Tabla
          columnas={columnas}
          filas={visibles}
          vacio={
            filas.length === 0
              ? enBandeja
                ? 'No hay requisiciones esperando el último paso.'
                : 'Todavía no hay requisiciones aquí.'
              : 'Ninguna requisición coincide con la búsqueda.'
          }
        />
      </Seccion>
    </MarcoPantalla>
  );
}

const estilos = StyleSheet.create({
  celdaDoble: { gap: Spacing.half, alignItems: 'flex-start' },
  marcas: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.half },
  casilla: { paddingBottom: Spacing.two },
  fuerte: { fontFamily: FuentePanel.texto, fontSize: TextoPanel.cuerpo, fontWeight: '600', color: Panel.texto },
  texto: { fontFamily: FuentePanel.texto, fontSize: TextoPanel.cuerpo, color: Panel.texto },
  apoyo: { fontFamily: FuentePanel.texto, fontSize: TextoPanel.apoyo, color: Panel.textoApoyo },
});
