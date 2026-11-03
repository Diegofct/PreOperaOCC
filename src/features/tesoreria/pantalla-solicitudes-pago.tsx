/**
 * Solicitudes de pago de una obra, de OCC o de Geolab (spec 037, RF-1, RF-2, RF-21, RF-22).
 *
 * La misma pantalla en los tres lugares, como Solicitudes de compra (036): el lugar sale de
 * la dirección y el servidor decide quién entra. Llega la lista entera, ya en el orden de
 * RF-21 —abiertas arriba, cerradas abajo— y con las marcas de hoy; aquí solo se busca.
 *
 * El valor lo manda el servidor solo a quien lo ve (RF-5a): el almacenista lo ve en las que
 * pidió él y en las demás sale «—».
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
import type { SolicitudDePagoEnElLugar, SolicitudesDePagoDelLugar } from '@/features/panel/contratos';
import { MarcoPantalla, useListado } from '@/features/panel/marco';
import { POR_PAGINA } from '@/features/panel/paginas';
import { usePersona } from '@/features/panel/sesion';
import { useParametroDeDireccion } from '@/features/panel/usar-parametro-direccion';
import { useListadoFiltrado } from '@/features/panel/usar-listado-filtrado';
import { fechaDelCorte } from '@/shared/rules/cortes';
import { nombreDeEmpresa } from '@/shared/rules/empresas';
import { nombreDeConcepto, pagoAbierto } from '@/shared/rules/pagos';
import { alcanza } from '@/shared/rules/permisos';

import { FormularioDePago } from './formulario-de-pago';
import { EstadoDelPago, textoDelPago, valorDelPago } from './partes';
import { VistaDelPago } from './vista-del-pago';

const SIN_SOLICITUDES: SolicitudesDePagoDelLugar = { solicitudes: [], sePuedePedir: true };

export default function PantallaSolicitudesDePago() {
  const lugar = useLugarDelPanel();
  const persona = usePersona();
  const [pidiendo, setPidiendo] = useState(false);
  const [hecho, setHecho] = useState<string | null>(null);
  // La solicitud abierta va en la dirección (`?solicitud=`), como en Compras.
  const [abierta, setAbierta] = useParametroDeDireccion('solicitud', '');
  const pedido: LugarDeLasSolicitudes | null =
    lugar?.tipo === 'empresa' && (lugar.empresa === 'occ' || lugar.empresa === 'geolab')
      ? { empresa: lugar.empresa }
      : lugar?.tipo === 'obra'
        ? { obraId: lugar.obraId }
        : null;
  const clave = pedido ? ('empresa' in pedido ? pedido.empresa : pedido.obraId) : null;

  // Un objeto y no una lista, como en Compras. Se recarga cuando cambia el lugar.
  const cargados = useListado<SolicitudesDePagoDelLugar>(
    // eslint-disable-next-line react-hooks/exhaustive-deps
    useCallback(() => (pedido ? api.tesoreria.solicitudes(pedido).then((d) => [d]) : Promise.resolve([])), [clave]),
  );
  const { solicitudes, sePuedePedir } = cargados.datos[0] ?? SIN_SOLICITUDES;
  const listado = useListadoFiltrado(solicitudes, textoDelPago);

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
    {
      clave: 'beneficiario',
      titulo: 'A quién',
      ancho: 220,
      pintar: (s) => (
        <View style={estilos.celdaDoble}>
          <Text style={estilos.texto}>{s.beneficiario}</Text>
          <Text style={estilos.apoyo}>{[nombreDeConcepto(s.concepto), s.beneficiarioDocumento].filter(Boolean).join(' · ')}</Text>
        </View>
      ),
    },
    { clave: 'paraQue', titulo: 'Para qué', ancho: 220, pintar: (s) => <Celda>{s.paraQue}</Celda> },
    { clave: 'paraCuando', titulo: 'Para cuándo', ancho: 115, pintar: (s) => <Celda>{fechaDelCorte(s.paraCuando)}</Celda> },
    {
      clave: 'estado',
      titulo: 'Estado',
      ancho: 190,
      pintar: (s) => (
        <View style={estilos.marcas}>
          {/* «Devuelta: corrígela» ya dice el estado: las dos juntas se leen dos veces. */}
          {s.estado === 'devuelta' ? null : <EstadoDelPago estado={s.estado} />}
          {s.marcas.map((m) => (
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
        const lineas = valorDelPago(s);
        return lineas ? (
          <View style={estilos.celdaDoble}>
            <Text style={estilos.texto}>{lineas[0]}</Text>
            {lineas.slice(1).map((l) => (
              <Text key={l} style={estilos.apoyo}>
                {l}
              </Text>
            ))}
          </View>
        ) : (
          <Celda>—</Celda>
        );
      },
    },
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
      <VistaDelPago
        id={abierta}
        alVolver={() => {
          setAbierta('');
          cargados.recargar();
        }}
      />
    );
  }

  const nombreDelLugar = lugar?.tipo === 'empresa' ? nombreDeEmpresa(lugar.empresa) : 'la obra';
  const abiertas = solicitudes.filter((s) => pagoAbierto(s.estado)).length;

  return (
    <MarcoPantalla
      titulo="Solicitudes de pago"
      descripcion={`Los pagos que se piden para ${nombreDelLugar}. Tesorería de Elemental los aprueba y los paga.`}
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
        <FormularioDePago
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
        <BarraDeListado busqueda={listado.busqueda} onBuscar={listado.buscar} total={listado.total} mostradas={listado.coincidencias} />
        <Tabla
          columnas={columnas}
          filas={listado.pagina}
          vacio={solicitudes.length === 0 ? 'Todavía no hay solicitudes de pago aquí.' : 'Ninguna solicitud coincide con la búsqueda.'}
        />
        <Paginacion pagina={listado.paginaActual} porPagina={POR_PAGINA} total={listado.coincidencias} onCambiar={listado.irAPagina} />
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
