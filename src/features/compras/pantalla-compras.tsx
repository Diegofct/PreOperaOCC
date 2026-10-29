/**
 * Compras de Elemental (spec 036, RF-3, RF-4, RF-12, RF-26): las solicitudes de compra de
 * todo el grupo, para que la gerencia las apruebe, las rechace o las devuelva, registre las
 * compras y las anule. La auxiliar de RR. HH. consulta lo mismo, sin botones (el servidor
 * no le manda `pasos`).
 *
 * Llega la bandeja entera, ya en su orden —primero lo que espera aprobación, las urgentes
 * arriba—, con el resumen de todo el grupo; aquí se filtra y se busca con las mismas reglas
 * del servidor (`pasaLosFiltros`), para que responda mientras se escribe. Las cifras de arriba
 * no cambian al filtrar: lo que espera a la gerencia no desaparece por mirar otra obra.
 *
 * La gerencia tiene además la pestaña «Gasto» (RF-27, `?pestana=gasto`, como en Recursos
 * Humanos); la auxiliar no la ve.
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
import type { BandejaDeCompras, SolicitudEnElLugar } from '@/features/panel/contratos';
import { MarcoPantalla, useListado } from '@/features/panel/marco';
import { usePersona } from '@/features/panel/sesion';
import { POR_PAGINA } from '@/features/panel/paginas';
import { useListadoFiltrado } from '@/features/panel/usar-listado-filtrado';
import { useParametroDeDireccion } from '@/features/panel/usar-parametro-direccion';
import { ESTADOS_DE_SOLICITUD, pasaLosFiltros, veElGasto, type EstadoDeSolicitud } from '@/shared/rules/compras';
import { fechaDelCorte } from '@/shared/rules/cortes';
import { enPesos } from '@/shared/rules/pesos';

import { EstadoDeLaSolicitud, resumenDeLoPedido, textoDeLaSolicitud } from './partes';
import { PantallaGasto } from './pantalla-gasto';
import { PasosDeGerencia } from './pasos-de-gerencia';
import { VistaDeLaSolicitud } from './vista-de-la-solicitud';

const PESTANAS = [
  { clave: 'solicitudes', titulo: 'Solicitudes' },
  { clave: 'gasto', titulo: 'Gasto' },
] as const;

export default function PantallaCompras() {
  const persona = usePersona();
  const [pestana, setPestana] = useParametroDeDireccion('pestana', 'solicitudes');
  const [abierta] = useParametroDeDireccion('solicitud', '');
  // Sin el gasto (la auxiliar) o con una solicitud abierta, no hay pestañas que elegir.
  if (!veElGasto(persona.rol) || abierta) return <BandejaDelGrupo />;
  return (
    <View style={estilos.pantalla}>
      <View style={estilos.pestanas}>
        <Acciones>
          {PESTANAS.map((p) => (
            <Boton
              key={p.clave}
              titulo={p.titulo}
              tono={pestana === p.clave ? 'primario' : 'secundario'}
              onPress={() => setPestana(p.clave)}
            />
          ))}
        </Acciones>
      </View>
      {pestana === 'gasto' ? <PantallaGasto /> : <BandejaDelGrupo />}
    </View>
  );
}

const SIN_BANDEJA: BandejaDeCompras = { solicitudes: [], resumen: { porAprobar: 0, urgentes: 0, vencidas: 0 }, total: 0 };

function BandejaDelGrupo() {
  const cargada = useListado<BandejaDeCompras>(useCallback(() => api.compras.bandeja().then((b) => [b]), []));
  const { solicitudes, resumen } = cargada.datos[0] ?? SIN_BANDEJA;
  const [abierta, setAbierta] = useParametroDeDireccion('solicitud', '');

  const [lugar, setLugar] = useState<string | null>(null);
  const [estado, setEstado] = useState<string | null>(null);
  const [soloUrgentes, setSoloUrgentes] = useState(false);
  const [desde, setDesde] = useState('');
  const [hasta, setHasta] = useState('');

  // Los lugares del filtro son los de las solicitudes que llegaron: OCC, Geolab y las obras que piden.
  const lugares = [...new Map(solicitudes.map((s) => [s.lugar.id, s.lugar])).values()].sort((a, b) =>
    a.tipo === b.tipo ? a.nombre.localeCompare(b.nombre) : a.tipo === 'empresa' ? -1 : 1,
  );

  const pasa = useCallback(
    (s: SolicitudEnElLugar) =>
      pasaLosFiltros(s, {
        lugar,
        estado: estado as EstadoDeSolicitud | null,
        soloUrgentes,
        desde: desde || null,
        hasta: hasta || null,
        // El texto lo busca el buscador común, con los mismos campos (`textoDeLaSolicitud`).
        texto: '',
      }),
    [lugar, estado, soloUrgentes, desde, hasta],
  );
  const listado = useListadoFiltrado(solicitudes, textoDeLaSolicitud, pasa);

  if (abierta) {
    return (
      <VistaDeLaSolicitud
        id={abierta}
        volverA="Compras"
        alVolver={() => {
          setAbierta('');
          cargada.recargar();
        }}
        accionesExtra={(s, listo) => <PasosDeGerencia solicitud={s} listo={listo} />}
      />
    );
  }

  const columnas: Columna<SolicitudEnElLugar>[] = [
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
    { clave: 'lugar', titulo: 'Para', ancho: 170, pintar: (s) => <Celda>{s.lugar.nombre}</Celda> },
    {
      clave: 'pedido',
      titulo: 'Qué se pide',
      ancho: 280,
      pintar: (s) => (
        <View style={estilos.celdaDoble}>
          <Text style={estilos.texto}>{resumenDeLoPedido(s.renglones)}</Text>
          {s.paraQue ? <Text style={estilos.apoyo}>{s.paraQue}</Text> : null}
        </View>
      ),
    },
    { clave: 'paraCuando', titulo: 'Para cuándo', ancho: 115, pintar: (s) => <Celda>{fechaDelCorte(s.paraCuando)}</Celda> },
    {
      clave: 'estado',
      titulo: 'Estado',
      ancho: 190,
      pintar: (s) => (
        <View style={estilos.marcas}>
          {s.estado === 'devuelta' ? <Etiqueta tono="atencion">Devuelta</Etiqueta> : <EstadoDeLaSolicitud estado={s.estado} />}
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
      titulo: 'Valor estimado',
      ancho: 130,
      pintar: (s) => <Celda>{s.valorEstimado ? enPesos(s.valorEstimado) : '—'}</Celda>,
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
      pintar: (s) => <Boton titulo="Abrir" tono="secundario" onPress={() => setAbierta(s.id)} />,
    },
  ];

  return (
    <MarcoPantalla
      titulo="Compras"
      descripcion="Las solicitudes de compra de OCC, Geolab y las obras: aprobarlas, rechazarlas o devolverlas, y registrar lo que se compra."
      error={cargada.error}
      cargando={cargada.cargando}
    >
      {/* RF-12: lo que espera a la gerencia, de todo el grupo. */}
      <Cifras>
        <Cifra
          titulo="Esperan aprobación"
          valor={String(resumen.porAprobar)}
          tono={resumen.porAprobar > 0 ? 'atencion' : 'neutro'}
        />
        <Cifra
          titulo="Urgentes"
          valor={String(resumen.urgentes)}
          pie="Abiertas"
          tono={resumen.urgentes > 0 ? 'malo' : 'neutro'}
        />
        <Cifra
          titulo="Vencidas"
          valor={String(resumen.vencidas)}
          pie="Pasó su fecha y no ha llegado"
          tono={resumen.vencidas > 0 ? 'malo' : 'neutro'}
        />
      </Cifras>

      <Seccion titulo="Solicitudes del grupo">
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
            opciones={ESTADOS_DE_SOLICITUD.map((e) => ({ valor: e.id, etiqueta: e.nombre }))}
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
          vacio={
            solicitudes.length === 0
              ? 'Todavía nadie ha pedido una compra.'
              : 'Ninguna solicitud coincide con la búsqueda o los filtros.'
          }
        />
        <Paginacion
          pagina={listado.paginaActual}
          porPagina={POR_PAGINA}
          total={listado.coincidencias}
          onCambiar={listado.irAPagina}
        />
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
