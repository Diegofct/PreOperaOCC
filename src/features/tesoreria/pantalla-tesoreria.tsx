/**
 * Tesorería de Elemental (spec 037, RF-3, RF-4, RF-10, RF-22).
 *
 * Pestañas en la dirección (`?pestana=`), como Recursos Humanos: Solicitudes de pago (la
 * bandeja del grupo), Compras por pagar, Pagos (solo la gerencia, `veLosPagos`; RF-23, D9) y
 * Cortes (RF-24, RF-25).
 * Con una solicitud abierta no hay pestañas: es su detalle. La abierta la lleva esta pantalla
 * (`?solicitud=`), porque se abre desde la bandeja y desde Pagos: el parámetro de la dirección
 * es estado de quien lo usa, y las pestañas no se enterarían si lo cambiara otra.
 *
 * La bandeja llega entera, en su orden —primero lo que espera aprobación, las urgentes
 * arriba— y con el resumen de todo el grupo; aquí se filtra con la misma regla del servidor
 * (`pasaLosFiltrosDePago`). Las cifras de arriba no cambian al filtrar.
 */
import { useCallback, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { FuentePanel, Panel, Spacing, TextoPanel } from '@/constants/theme';
import { api } from '@/features/panel/cliente-api';
import {
  Acciones,
  BarraDeListado,
  Boton,
  CampoDeFecha,
  Casilla,
  Celda,
  Cifra,
  Cifras,
  Etiqueta,
  Paginacion,
  Seccion,
  Selector,
  Tabla,
  type Columna,
} from '@/features/panel/componentes';
import type { BandejaDeTesoreria, SolicitudDePagoEnElLugar } from '@/features/panel/contratos';
import { MarcoPantalla, useListado } from '@/features/panel/marco';
import { POR_PAGINA } from '@/features/panel/paginas';
import { usePersona } from '@/features/panel/sesion';
import { useListadoFiltrado } from '@/features/panel/usar-listado-filtrado';
import { useParametroDeDireccion } from '@/features/panel/usar-parametro-direccion';
import { fechaDelCorte } from '@/shared/rules/cortes';
import { ESTADOS_DE_PAGO, nombreDeConcepto, pasaLosFiltrosDePago, veLosPagos, type EstadoDePago } from '@/shared/rules/pagos';
import { enPesos } from '@/shared/rules/pesos';

import { PantallaComprasPorPagar } from './pantalla-compras-por-pagar';
import { PantallaCortes } from './pantalla-cortes';
import { PantallaPagos } from './pantalla-pagos';
import { EstadoDelPago, textoDelPago, valorDelPago } from './partes';
import { PasosDeTesoreria } from './pasos-de-tesoreria';
import { VistaDelPago } from './vista-del-pago';

const PESTANAS = [
  { clave: 'solicitudes', titulo: 'Solicitudes de pago' },
  { clave: 'compras', titulo: 'Compras por pagar' },
  { clave: 'pagos', titulo: 'Pagos' },
  { clave: 'cortes', titulo: 'Cortes' },
] as const;

export default function PantallaTesoreria() {
  const persona = usePersona();
  const [pestana, setPestana] = useParametroDeDireccion('pestana', 'solicitudes');
  const [abierta, setAbierta] = useParametroDeDireccion('solicitud', '');
  if (abierta) {
    return (
      <VistaDelPago
        id={abierta}
        volverA="Tesorería"
        alVolver={() => setAbierta('')}
        accionesExtra={(s, listo) => <PasosDeTesoreria solicitud={s} listo={listo} />}
      />
    );
  }
  const pestanas = PESTANAS.filter((p) => p.clave !== 'pagos' || veLosPagos(persona.rol));
  const elegida = pestanas.some((p) => p.clave === pestana) ? pestana : 'solicitudes';
  return (
    <View style={estilos.pantalla}>
      <View style={estilos.pestanas}>
        <Acciones>
          {pestanas.map((p) => (
            <Boton key={p.clave} titulo={p.titulo} tono={elegida === p.clave ? 'primario' : 'secundario'} onPress={() => setPestana(p.clave)} />
          ))}
        </Acciones>
      </View>
      {elegida === 'compras' ? (
        <PantallaComprasPorPagar />
      ) : elegida === 'pagos' ? (
        <PantallaPagos alAbrir={setAbierta} />
      ) : elegida === 'cortes' ? (
        <PantallaCortes />
      ) : (
        <BandejaDeSolicitudes alAbrir={setAbierta} />
      )}
    </View>
  );
}

const SIN_BANDEJA: BandejaDeTesoreria = { solicitudes: [], resumen: { porAprobar: 0, porPagar: 0, valorPorPagar: 0, vencidas: 0 }, total: 0 };

/** Al volver del detalle, la bandeja se monta otra vez y se vuelve a cargar. */
function BandejaDeSolicitudes({ alAbrir }: { alAbrir: (id: string) => void }) {
  const cargada = useListado<BandejaDeTesoreria>(useCallback(() => api.tesoreria.bandeja().then((b) => [b]), []));
  const { solicitudes, resumen } = cargada.datos[0] ?? SIN_BANDEJA;
  const [lugar, setLugar] = useState<string | null>(null);
  const [estado, setEstado] = useState<string | null>(null);
  const [soloUrgentes, setSoloUrgentes] = useState(false);
  const [desde, setDesde] = useState('');
  const [hasta, setHasta] = useState('');

  const lugares = [...new Map(solicitudes.map((s) => [s.lugar.id, s.lugar])).values()].sort((a, b) =>
    a.tipo === b.tipo ? a.nombre.localeCompare(b.nombre) : a.tipo === 'empresa' ? -1 : 1,
  );
  const pasa = useCallback(
    (s: SolicitudDePagoEnElLugar) =>
      pasaLosFiltrosDePago(s, {
        lugar,
        estado: estado as EstadoDePago | null,
        soloUrgentes,
        desde: desde || null,
        hasta: hasta || null,
        // El texto lo busca el buscador común, con los mismos campos (`textoDelPago`).
        texto: '',
      }),
    [lugar, estado, soloUrgentes, desde, hasta],
  );
  const listado = useListadoFiltrado(solicitudes, textoDelPago, pasa);

  const columnas: Columna<SolicitudDePagoEnElLugar>[] = [
    {
      clave: 'numero',
      titulo: 'Número',
      ancho: 110,
      pintar: (s) => (
        <View style={estilos.celdaDoble}>
          <Text style={estilos.fuerte}>{s.codigo}</Text>
          {s.urgente ? <Etiqueta tono="malo">Urgente</Etiqueta> : null}
        </View>
      ),
    },
    { clave: 'lugar', titulo: 'Para', ancho: 160, pintar: (s) => <Celda>{s.lugar.nombre}</Celda> },
    {
      clave: 'beneficiario',
      titulo: 'A quién',
      ancho: 220,
      pintar: (s) => (
        <View style={estilos.celdaDoble}>
          <Text style={estilos.texto}>{s.beneficiario}</Text>
          <Text style={estilos.apoyo}>{nombreDeConcepto(s.concepto)}</Text>
        </View>
      ),
    },
    { clave: 'paraCuando', titulo: 'Para cuándo', ancho: 115, pintar: (s) => <Celda>{fechaDelCorte(s.paraCuando)}</Celda> },
    {
      clave: 'estado',
      titulo: 'Estado',
      ancho: 180,
      pintar: (s) => (
        <View style={estilos.marcas}>
          {s.estado === 'devuelta' ? <Etiqueta tono="atencion">Devuelta</Etiqueta> : <EstadoDelPago estado={s.estado} />}
          {/* «Corrígela» le habla a quien pidió; aquí basta con decir que está devuelta. */}
          {s.marcas
            .filter((m) => m !== 'Devuelta: corrígela')
            .map((m) => (
              <Etiqueta key={m} tono="malo">
                {m}
              </Etiqueta>
            ))}
        </View>
      ),
    },
    {
      clave: 'valor',
      titulo: 'Valor',
      ancho: 170,
      pintar: (s) => {
        const lineas = valorDelPago(s) ?? ['—'];
        return (
          <View style={estilos.celdaDoble}>
            <Text style={estilos.texto}>{lineas[0]}</Text>
            {lineas.slice(1).map((l) => (
              <Text key={l} style={estilos.apoyo}>
                {l}
              </Text>
            ))}
          </View>
        );
      },
    },
    {
      clave: 'pedida',
      titulo: 'Pedida por',
      ancho: 170,
      pintar: (s) => (
        <View style={estilos.celdaDoble}>
          <Text style={estilos.texto}>{s.pedidaPor.nombre}</Text>
          <Text style={estilos.apoyo}>{fechaDelCorte(s.pedidaEl)}</Text>
        </View>
      ),
    },
    {
      clave: 'abrir',
      titulo: '',
      ancho: 100,
      anchoMinimo: 100,
      pintar: (s) => <Boton titulo="Abrir" tono="secundario" onPress={() => alAbrir(s.id)} />,
    },
  ];

  return (
    <MarcoPantalla
      titulo="Tesorería"
      descripcion="Los pagos que piden OCC, Geolab y las obras: aprobarlos, rechazarlos o devolverlos, y registrar lo que se paga."
      error={cargada.error}
      cargando={cargada.cargando}
    >
      {/* RF-10: lo que espera a la gerencia, de todo el grupo. */}
      <Cifras>
        <Cifra titulo="Esperan aprobación" valor={String(resumen.porAprobar)} tono={resumen.porAprobar > 0 ? 'atencion' : 'neutro'} />
        <Cifra
          titulo="Aprobadas sin pagar"
          valor={String(resumen.porPagar)}
          pie={resumen.valorPorPagar ? `Faltan ${enPesos(resumen.valorPorPagar)}` : undefined}
          tono={resumen.porPagar > 0 ? 'atencion' : 'neutro'}
        />
        <Cifra titulo="Vencidas" valor={String(resumen.vencidas)} pie="Pasó su fecha y no se ha pagado" tono={resumen.vencidas > 0 ? 'malo' : 'neutro'} />
      </Cifras>

      <Seccion titulo="Solicitudes de pago del grupo">
        <BarraDeListado busqueda={listado.busqueda} onBuscar={listado.buscar} total={listado.total} mostradas={listado.coincidencias}>
          <Selector
            etiqueta="Para"
            valor={lugar}
            opciones={lugares.map((l) => ({ valor: l.id, etiqueta: l.nombre }))}
            onChange={setLugar}
            permiteVacio
            vacio="Todo el grupo"
            ancho={200}
          />
          <Selector
            etiqueta="Estado"
            valor={estado}
            opciones={ESTADOS_DE_PAGO.map((e) => ({ valor: e.id, etiqueta: e.nombre }))}
            onChange={setEstado}
            permiteVacio
            vacio="Todos los estados"
            ancho={190}
          />
          <CampoDeFecha etiqueta="Pedidas desde" valor={desde} onChange={setDesde} />
          <CampoDeFecha etiqueta="Hasta" valor={hasta} onChange={setHasta} min={desde || undefined} />
        </BarraDeListado>
        <Acciones>
          <Casilla etiqueta="Solo urgentes" marcada={soloUrgentes} onChange={setSoloUrgentes} />
        </Acciones>
        <Tabla
          columnas={columnas}
          filas={listado.pagina}
          vacio={solicitudes.length === 0 ? 'Todavía nadie ha pedido un pago.' : 'Ninguna solicitud coincide con la búsqueda o los filtros.'}
        />
        <Paginacion pagina={listado.paginaActual} porPagina={POR_PAGINA} total={listado.coincidencias} onCambiar={listado.irAPagina} />
      </Seccion>
    </MarcoPantalla>
  );
}

const estilos = StyleSheet.create({
  pantalla: { flex: 1, backgroundColor: Panel.fondo },
  // Con el mismo margen que el marco de la pantalla de debajo, como en Recursos Humanos.
  pestanas: { paddingHorizontal: Spacing.four, paddingTop: Spacing.four },
  celdaDoble: { gap: Spacing.half, alignItems: 'flex-start' },
  marcas: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.half },
  fuerte: { fontFamily: FuentePanel.texto, fontSize: TextoPanel.cuerpo, fontWeight: '600', color: Panel.texto },
  texto: { fontFamily: FuentePanel.texto, fontSize: TextoPanel.cuerpo, color: Panel.texto },
  apoyo: { fontFamily: FuentePanel.texto, fontSize: TextoPanel.apoyo, color: Panel.textoApoyo },
});
