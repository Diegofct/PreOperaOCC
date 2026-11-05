/**
 * Los pagos del grupo (spec 037, RF-23, D9): los vigentes entre dos fechas de pago, de
 * solicitudes y de compras, con el total por lugar y el del rango. Solo la gerencia
 * y, desde la spec 040 (RF-6), la Auxiliar Administrativa (`veLosPagos`).
 *
 * Abre con el mes en curso, como el Gasto de Compras. Un pago de una solicitud se anula en su
 * detalle (lleva la versión de la solicitud): aquí se abre. Uno de una compra se anula aquí
 * mismo, porque la compra no tiene otro lugar donde ver sus pagos.
 */
import { useCallback, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { FuentePanel, Panel, Spacing, TextoPanel } from '@/constants/theme';
import { VentanaDeMotivo } from '@/features/compras/vista-de-la-solicitud';
import { api } from '@/features/panel/cliente-api';
import {
  Aviso,
  Boton,
  CampoDeFecha,
  Celda,
  Cifra,
  Cifras,
  Confirmado,
  Etiqueta,
  RenglonDeCampos,
  Seccion,
  Tabla,
  type Columna,
} from '@/features/panel/componentes';
import type { PagosDelRango } from '@/features/panel/contratos';
import { MarcoPantalla, useListado } from '@/features/panel/marco';
import { fechaDelCorte } from '@/shared/rules/cortes';
import { fechaDeJornada } from '@/shared/rules/jornada';
import { nombreDeMedio } from '@/shared/rules/pagos';
import { enPesos } from '@/shared/rules/pesos';
import { MENSAJES_DE_RANGO, rangoDeFechas } from '@/shared/rules/rango';

type Pago = PagosDelRango['pagos'][number];
type LugarDeLosPagos = PagosDelRango['lugares'][number] & { id: string };

export function PantallaPagos({ alAbrir }: { alAbrir: (solicitudPagoId: string) => void }) {
  const hoy = fechaDeJornada();
  const [desde, setDesde] = useState(`${hoy.slice(0, 8)}01`);
  const [hasta, setHasta] = useState(hoy);
  const rango = rangoDeFechas(desde, hasta, hoy);
  const error = 'error' in rango ? MENSAJES_DE_RANGO[rango.error] : null;
  const [anulando, setAnulando] = useState<Pago | null>(null);
  const [hecho, setHecho] = useState<string | null>(null);

  const cargados = useListado<PagosDelRango>(
    useCallback(
      () => ('error' in rango ? Promise.resolve([]) : api.tesoreria.pagos(rango.desde, rango.hasta).then((p) => [p])),
      // eslint-disable-next-line react-hooks/exhaustive-deps
      [desde, hasta],
    ),
  );
  const datos = cargados.datos[0];
  const lugares: LugarDeLosPagos[] = (datos?.lugares ?? []).map((l) => ({ ...l, id: l.lugar.id }));

  const columnasLugares: Columna<LugarDeLosPagos>[] = [
    { clave: 'lugar', titulo: 'Para', ancho: 260, pintar: (l) => <Celda>{l.lugar.nombre}</Celda> },
    { clave: 'pagos', titulo: 'Pagos', ancho: 110, pintar: (l) => <Celda>{String(l.pagos)}</Celda> },
    { clave: 'total', titulo: 'Total pagado', ancho: 180, pintar: (l) => <Celda>{enPesos(l.total)}</Celda> },
  ];

  const columnasPagos: Columna<Pago>[] = [
    { clave: 'fecha', titulo: 'Fecha', ancho: 110, pintar: (p) => <Celda>{fechaDelCorte(p.fecha)}</Celda> },
    {
      clave: 'origen',
      titulo: 'De',
      ancho: 250,
      pintar: (p) => (
        <View style={estilos.celdaDoble}>
          <Text style={estilos.fuerte}>{p.origen.codigo}</Text>
          <Text style={estilos.texto}>{p.origen.quien}</Text>
          {/* Caso límite: la compra se anuló después de pagarla; el reintegro va por fuera. */}
          {p.origen.compraAnulada ? <Etiqueta tono="malo">Compra anulada</Etiqueta> : null}
        </View>
      ),
    },
    { clave: 'lugar', titulo: 'Para', ancho: 160, pintar: (p) => <Celda>{p.lugar.nombre}</Celda> },
    { clave: 'valor', titulo: 'Valor', ancho: 130, pintar: (p) => <Celda>{enPesos(p.valor)}</Celda> },
    {
      clave: 'medio',
      titulo: 'Medio',
      ancho: 160,
      pintar: (p) => (
        <View style={estilos.celdaDoble}>
          <Text style={estilos.texto}>{nombreDeMedio(p.medio)}</Text>
          {p.referencia ? <Text style={estilos.apoyo}>{p.referencia}</Text> : null}
        </View>
      ),
    },
    {
      clave: 'accion',
      titulo: '',
      ancho: 110,
      anchoMinimo: 110,
      pintar: (p) =>
        p.origen.tipo === 'solicitud' ? (
          <Boton titulo="Abrir" tono="secundario" onPress={() => alAbrir(p.origen.id)} />
        ) : (
          <Boton titulo="Anular" tono="peligro" onPress={() => setAnulando(p)} />
        ),
    },
  ];

  return (
    <MarcoPantalla
      titulo="Pagos"
      descripcion="Lo pagado en el grupo entre dos fechas de pago, de solicitudes de pago y de compras, sin los pagos anulados."
      error={cargados.error}
      cargando={cargados.cargando}
    >
      <Confirmado mensaje={hecho} />
      <RenglonDeCampos>
        <CampoDeFecha etiqueta="Pagados desde" valor={desde} onChange={setDesde} max={hoy} />
        <CampoDeFecha etiqueta="Hasta" valor={hasta} onChange={setHasta} min={desde || undefined} />
      </RenglonDeCampos>
      {error ? <Aviso tono="error">{error}</Aviso> : null}
      {datos ? (
        <>
          <Cifras>
            <Cifra titulo="Total pagado" valor={enPesos(datos.total)} pie={`Del ${fechaDelCorte(datos.desde)} al ${fechaDelCorte(datos.hasta)}`} />
            <Cifra
              titulo="Pagos"
              valor={String(datos.pagos.length)}
              pie={`En ${lugares.length} ${lugares.length === 1 ? 'lugar' : 'lugares'}`}
            />
          </Cifras>
          <Seccion titulo="Por lugar">
            <Tabla columnas={columnasLugares} filas={lugares} vacio="No hay pagos registrados en esas fechas." />
          </Seccion>
          <Seccion titulo="Los pagos">
            <Tabla columnas={columnasPagos} filas={datos.pagos} vacio="No hay pagos registrados en esas fechas." />
          </Seccion>
        </>
      ) : !error ? (
        <Text style={estilos.apoyo}>Cargando…</Text>
      ) : null}

      {anulando ? (
        <VentanaDeMotivo
          titulo={`Anular el pago de ${enPesos(anulando.valor)} · ${anulando.origen.codigo}`}
          aviso={`El pago a ${anulando.origen.quien} queda anulado con el motivo, y la compra vuelve a Compras por pagar.`}
          accion="Anular el pago"
          alCerrar={() => setAnulando(null)}
          alConfirmar={async (motivo) => {
            await api.tesoreria.anularPago(anulando.id, { motivo });
            setAnulando(null);
            setHecho(`Pago de ${enPesos(anulando.valor)} a ${anulando.origen.quien} anulado.`);
            cargados.recargar();
          }}
        />
      ) : null}
    </MarcoPantalla>
  );
}

const estilos = StyleSheet.create({
  celdaDoble: { gap: Spacing.half, alignItems: 'flex-start' },
  fuerte: { fontFamily: FuentePanel.texto, fontSize: TextoPanel.cuerpo, fontWeight: '600', color: Panel.texto },
  texto: { fontFamily: FuentePanel.texto, fontSize: TextoPanel.cuerpo, color: Panel.texto },
  apoyo: { fontFamily: FuentePanel.texto, fontSize: TextoPanel.apoyo, color: Panel.textoApoyo },
});
