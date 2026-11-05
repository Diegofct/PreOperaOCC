/**
 * Compras por pagar (spec 037, RF-17, RF-18, D4): las compras vigentes de la spec 036 que no
 * están pagadas del todo, la más antigua primero. Cada compra se paga aquí mismo, sin pedir una
 * solicitud de pago aparte; el comprobante queda en los soportes de su solicitud de compra.
 *
 * Pagan la gerencia y, desde la spec 040 (RF-6), la Auxiliar Administrativa; quien solo
 * consulta ve la misma lista sin el botón.
 */
import { useCallback, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { FuentePanel, Panel, Spacing, TextoPanel } from '@/constants/theme';
import { api } from '@/features/panel/cliente-api';
import { BarraDeListado, Boton, Celda, Cifra, Cifras, Confirmado, Paginacion, Seccion, Tabla, type Columna } from '@/features/panel/componentes';
import type { CompraPorPagar } from '@/features/panel/contratos';
import { MarcoPantalla, useListado } from '@/features/panel/marco';
import { POR_PAGINA } from '@/features/panel/paginas';
import { usePersona } from '@/features/panel/sesion';
import { useListadoFiltrado } from '@/features/panel/usar-listado-filtrado';
import { fechaDelCorte } from '@/shared/rules/cortes';
import { alcanza } from '@/shared/rules/permisos';
import { enPesos } from '@/shared/rules/pesos';

import { VentanaDePago } from './pasos-de-tesoreria';

const textoDeLaCompra = (c: CompraPorPagar) => [c.codigoSolicitud, c.lugar.nombre, c.proveedor, c.factura];

export function PantallaComprasPorPagar() {
  const persona = usePersona();
  const paga = alcanza(persona.rol, 'tesoreria', 'escribir');
  const cargadas = useListado<CompraPorPagar>(useCallback(() => api.tesoreria.comprasPorPagar(), []));
  const listado = useListadoFiltrado(cargadas.datos, textoDeLaCompra);
  const [pagando, setPagando] = useState<CompraPorPagar | null>(null);
  const [hecho, setHecho] = useState<string | null>(null);
  const porPagar = cargadas.datos.reduce((suma, c) => suma + c.porPagar, 0);

  const columnas: Columna<CompraPorPagar>[] = [
    {
      clave: 'solicitud',
      titulo: 'Solicitud',
      ancho: 170,
      pintar: (c) => (
        <View style={estilos.celdaDoble}>
          <Text style={estilos.fuerte}>{c.codigoSolicitud}</Text>
          <Text style={estilos.apoyo}>{c.lugar.nombre}</Text>
        </View>
      ),
    },
    { clave: 'proveedor', titulo: 'Proveedor', ancho: 220, pintar: (c) => <Celda>{c.proveedor}</Celda> },
    { clave: 'fecha', titulo: 'Comprada el', ancho: 115, pintar: (c) => <Celda>{fechaDelCorte(c.fecha)}</Celda> },
    { clave: 'factura', titulo: 'Factura o remisión', ancho: 140, pintar: (c) => <Celda>{c.factura || '—'}</Celda> },
    { clave: 'valor', titulo: 'Valor', ancho: 130, pintar: (c) => <Celda>{enPesos(c.valor)}</Celda> },
    {
      clave: 'falta',
      titulo: 'Falta por pagar',
      ancho: 150,
      pintar: (c) => (
        <View style={estilos.celdaDoble}>
          <Text style={estilos.fuerte}>{enPesos(c.porPagar)}</Text>
          {c.pagado ? <Text style={estilos.apoyo}>{`Pagado ${enPesos(c.pagado)}`}</Text> : null}
        </View>
      ),
    },
    ...(paga
      ? [
          {
            clave: 'pagar',
            titulo: '',
            ancho: 110,
            anchoMinimo: 110,
            pintar: (c: CompraPorPagar) => <Boton titulo="Pagar" tono="secundario" onPress={() => setPagando(c)} />,
          },
        ]
      : []),
  ];

  return (
    <MarcoPantalla
      titulo="Compras por pagar"
      descripcion="Las compras registradas en Compras que todavía no están pagadas del todo, la más antigua primero."
      error={cargadas.error}
      cargando={cargadas.cargando}
    >
      <Confirmado mensaje={hecho} />
      <Cifras>
        <Cifra titulo="Compras por pagar" valor={String(cargadas.datos.length)} tono={cargadas.datos.length ? 'atencion' : 'neutro'} />
        <Cifra titulo="Falta por pagar" valor={enPesos(porPagar)} />
      </Cifras>
      <Seccion titulo="Compras sin pagar del todo">
        <BarraDeListado busqueda={listado.busqueda} onBuscar={listado.buscar} total={listado.total} mostradas={listado.coincidencias} />
        <Tabla
          columnas={columnas}
          filas={listado.pagina}
          vacio={cargadas.datos.length === 0 ? 'No hay compras por pagar.' : 'Ninguna compra coincide con la búsqueda.'}
        />
        <Paginacion pagina={listado.paginaActual} porPagina={POR_PAGINA} total={listado.coincidencias} onCambiar={listado.irAPagina} />
      </Seccion>

      {pagando ? (
        <VentanaDePago
          codigo={`${pagando.codigoSolicitud} · ${pagando.proveedor}`}
          falta={pagando.porPagar}
          beneficiario={pagando.proveedor}
          de={{ solicitudId: pagando.solicitudId }}
          registrar={async (pago) => {
            const r = await api.tesoreria.pagarCompra(pagando.id, pago);
            return r.pago === 'pagada'
              ? `Pago de ${enPesos(Number(pago.valor))} registrado. La compra de ${pagando.proveedor} quedó pagada.`
              : `Pago de ${enPesos(Number(pago.valor))} registrado. Faltan ${enPesos(pagando.porPagar - Number(pago.valor))}.`;
          }}
          alCerrar={() => setPagando(null)}
          alPagar={(mensaje) => {
            setPagando(null);
            setHecho(mensaje);
            cargadas.recargar();
          }}
        />
      ) : null}
    </MarcoPantalla>
  );
}

const estilos = StyleSheet.create({
  celdaDoble: { gap: Spacing.half, alignItems: 'flex-start' },
  fuerte: { fontFamily: FuentePanel.texto, fontSize: TextoPanel.cuerpo, fontWeight: '600', color: Panel.texto },
  apoyo: { fontFamily: FuentePanel.texto, fontSize: TextoPanel.apoyo, color: Panel.textoApoyo },
});
