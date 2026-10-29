/**
 * Solicitudes de compra de una obra, de OCC o de Geolab (spec 036, RF-1, RF-2, RF-24 a
 * RF-26).
 *
 * La misma pantalla en los tres lugares: el lugar sale de la dirección
 * (`useLugarDelPanel`) y el servidor decide quién entra. Llega la lista entera, ya en el
 * orden de RF-24 —abiertas arriba, cerradas abajo— y con las marcas de hoy calculadas con
 * las reglas de `rules/compras`; aquí solo se busca, para que responda mientras se escribe.
 *
 * El valor estimado lo manda el servidor solo a quien ve los valores (RF-31): si llegó, se
 * muestra la columna.
 */
import { useCallback, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { FuentePanel, Panel, Spacing, TextoPanel } from '@/constants/theme';
import { useLugarDelPanel } from '@/features/empresas/contexto-empresa';
import { api, type LugarDeLasSolicitudes } from '@/features/panel/cliente-api';
import {
  Acciones,
  Aviso,
  BarraDeListado,
  Boton,
  Celda,
  Confirmado,
  Etiqueta,
  Paginacion,
  Seccion,
  Tabla,
  type Columna,
} from '@/features/panel/componentes';
import type { SolicitudEnElLugar, SolicitudesDelLugar } from '@/features/panel/contratos';
import { MarcoPantalla, useListado } from '@/features/panel/marco';
import { POR_PAGINA } from '@/features/panel/paginas';
import { usePersona } from '@/features/panel/sesion';
import { useParametroDeDireccion } from '@/features/panel/usar-parametro-direccion';
import { useListadoFiltrado } from '@/features/panel/usar-listado-filtrado';
import { fechaDelCorte } from '@/shared/rules/cortes';
import { nombreDeEmpresa } from '@/shared/rules/empresas';
import { alcanza } from '@/shared/rules/permisos';
import { enPesos } from '@/shared/rules/pesos';

import { FormularioDeSolicitud } from './formulario-de-solicitud';
import { EstadoDeLaSolicitud, resumenDeLoPedido, textoDeLaSolicitud } from './partes';
import { VistaDeLaSolicitud } from './vista-de-la-solicitud';

const SIN_SOLICITUDES: SolicitudesDelLugar = { solicitudes: [], sePuedePedir: true };

export default function PantallaSolicitudes() {
  const lugar = useLugarDelPanel();
  const persona = usePersona();
  const [pidiendo, setPidiendo] = useState(false);
  const [hecho, setHecho] = useState<string | null>(null);
  // La solicitud abierta va en la dirección (`?solicitud=`), como la ficha en Personal: al
  // volver, la búsqueda sigue donde estaba.
  const [abierta, setAbierta] = useParametroDeDireccion('solicitud', '');
  const pedido: LugarDeLasSolicitudes | null =
    lugar?.tipo === 'empresa' && (lugar.empresa === 'occ' || lugar.empresa === 'geolab')
      ? { empresa: lugar.empresa }
      : lugar?.tipo === 'obra'
        ? { obraId: lugar.obraId }
        : null;
  const clave = pedido ? ('empresa' in pedido ? pedido.empresa : pedido.obraId) : null;

  // Un objeto y no una lista, como en Personal. Se recarga cuando cambia el lugar.
  const cargados = useListado<SolicitudesDelLugar>(
    // eslint-disable-next-line react-hooks/exhaustive-deps
    useCallback(() => (pedido ? api.compras.solicitudes(pedido).then((d) => [d]) : Promise.resolve([])), [clave]),
  );
  const { solicitudes, sePuedePedir } = cargados.datos[0] ?? SIN_SOLICITUDES;
  const conValores = solicitudes.some((s) => 'valorEstimado' in s);
  const listado = useListadoFiltrado(solicitudes, textoDeLaSolicitud);

  const columnas: Columna<SolicitudEnElLugar>[] = [
    {
      clave: 'numero',
      titulo: 'Número',
      ancho: 120,
      pintar: (s) => (
        <View style={estilos.celdaDoble}>
          <Text style={estilos.fuerte}>{s.codigo}</Text>
          {s.urgente ? <Etiqueta tono="malo">Urgente</Etiqueta> : null}
        </View>
      ),
    },
    {
      clave: 'pedido',
      titulo: 'Qué se pide',
      ancho: 300,
      pintar: (s) => (
        <View style={estilos.celdaDoble}>
          <Text style={estilos.texto}>{resumenDeLoPedido(s.renglones)}</Text>
          {s.paraQue ? <Text style={estilos.apoyo}>{s.paraQue}</Text> : null}
        </View>
      ),
    },
    {
      clave: 'paraCuando',
      titulo: 'Para cuándo',
      ancho: 120,
      pintar: (s) => <Celda>{fechaDelCorte(s.paraCuando)}</Celda>,
    },
    {
      clave: 'estado',
      titulo: 'Estado',
      ancho: 190,
      pintar: (s) => (
        <View style={estilos.marcas}>
          {/* «Devuelta: corrígela» ya dice el estado: las dos juntas se leen dos veces. */}
          {s.estado === 'devuelta' ? null : <EstadoDeLaSolicitud estado={s.estado} />}
          {s.marcas.map((m) => (
            <Etiqueta key={m} tono="malo">
              {m}
            </Etiqueta>
          ))}
        </View>
      ),
    },
    {
      clave: 'proveedor',
      titulo: 'Proveedor',
      ancho: 180,
      pintar: (s) => (
        <View style={estilos.celdaDoble}>
          {s.proveedores.length ? (
            <Text style={estilos.texto}>{s.proveedores.join(', ')}</Text>
          ) : (
            <Text style={estilos.apoyo}>{s.proveedorSugerido ? `Sugerido: ${s.proveedorSugerido}` : '—'}</Text>
          )}
        </View>
      ),
    },
    ...(conValores
      ? [
          {
            clave: 'valor',
            titulo: 'Valor estimado',
            ancho: 140,
            pintar: (s: SolicitudEnElLugar) => <Celda>{s.valorEstimado ? enPesos(s.valorEstimado) : '—'}</Celda>,
          },
        ]
      : []),
    {
      clave: 'pedida',
      titulo: 'Pedida por',
      ancho: 180,
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

  if (abierta) {
    return (
      <VistaDeLaSolicitud
        id={abierta}
        alVolver={() => {
          setAbierta('');
          // Lo que se hizo en el detalle cambia su estado y sus marcas.
          cargados.recargar();
        }}
      />
    );
  }

  const nombreDelLugar = lugar?.tipo === 'empresa' ? nombreDeEmpresa(lugar.empresa) : 'la obra';
  const abiertas = solicitudes.filter((s) => !['recibida', 'rechazada', 'cancelada'].includes(s.estado)).length;

  return (
    <MarcoPantalla
      titulo="Solicitudes de compra"
      descripcion={`Lo que se pide comprar para ${nombreDelLugar}. Elemental lo aprueba, lo compra y aquí se marca lo que llega.`}
      error={cargados.error}
      cargando={cargados.cargando}
    >
      {!sePuedePedir ? <Aviso tono="info">La obra no está activa: no recibe solicitudes nuevas.</Aviso> : null}
      <Confirmado mensaje={hecho} />
      {pedido && sePuedePedir && alcanza(persona.rol, 'solicitudes', 'escribir') ? (
        <Acciones>
          <Boton titulo="Nueva solicitud" onPress={() => setPidiendo(true)} />
        </Acciones>
      ) : null}
      {pidiendo && pedido ? (
        <FormularioDeSolicitud
          lugar={pedido}
          alCerrar={() => setPidiendo(false)}
          alGuardar={(mensaje) => {
            setPidiendo(false);
            setHecho(mensaje);
            cargados.recargar();
          }}
        />
      ) : null}
      <Seccion titulo={`Solicitudes · ${abiertas} ${abiertas === 1 ? 'abierta' : 'abiertas'}`}>
        <BarraDeListado
          busqueda={listado.busqueda}
          onBuscar={listado.buscar}
          total={listado.total}
          mostradas={listado.coincidencias}
        />
        <Tabla
          columnas={columnas}
          filas={listado.pagina}
          vacio={
            solicitudes.length === 0
              ? 'Todavía no hay solicitudes de compra aquí.'
              : 'Ninguna solicitud coincide con la búsqueda.'
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
  celdaDoble: { gap: Spacing.half, alignItems: 'flex-start' },
  marcas: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.half },
  fuerte: { fontFamily: FuentePanel.texto, fontSize: TextoPanel.cuerpo, fontWeight: '600', color: Panel.texto },
  texto: { fontFamily: FuentePanel.texto, fontSize: TextoPanel.cuerpo, color: Panel.texto },
  apoyo: { fontFamily: FuentePanel.texto, fontSize: TextoPanel.apoyo, color: Panel.textoApoyo },
});
