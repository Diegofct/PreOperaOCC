/**
 * Una requisición de pagos de OCC con todo lo que le pasó (spec 047, RF-10 a RF-58).
 *
 * La abren Requisiciones de OCC, la bandeja de Elemental y Tesorería. Los botones salen de `puede`,
 * que manda el servidor con la misma regla que lo revisa (`porQueNoPuedeOcc`): el Encargado arma y
 * envía; la Administradora y la Gerencia autorizan, devuelven y cancelan; quien paga, paga.
 *
 * ── La tabla cabe en `MaxContentWidthPanel` (1 280) ──
 *
 * 50 + 190 + 220 + 160 + 120 + 100 + 170 + 120 = 1 130, más 7 separaciones de 16 (112) y 16 a cada
 * lado (32): 1 274. El Excel de OCC tiene diez columnas: la fecha de solicitud y el proveedor van
 * debajo del beneficiario, y las observaciones debajo del concepto, para que el botón de la última
 * columna no quede fuera de la vista.
 */
import { useCallback, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { FuentePanel, Panel, Spacing, TextoPanel } from '@/constants/theme';
import { VentanaDeMotivo } from '@/features/compras/vista-de-la-solicitud';
import { api, mensajeDe } from '@/features/panel/cliente-api';
import { Acciones, Aviso, Boton, Celda, Cifra, Cifras, Confirmacion, Confirmado, Etiqueta, Seccion, Tabla, type Columna } from '@/features/panel/componentes';
import type { PagoRegistrado } from '@/features/panel/contratos';
import { guardarArchivo } from '@/features/panel/guardar-archivo';
import { MarcoPantalla, useListado } from '@/features/panel/marco';
import type { LineaOccEnElDetalle, RequisicionOccDetallada } from '@/features/panel/requisiciones-occ';
import { fechaDelCorte } from '@/shared/rules/cortes';
import { NOMBRE_DEL_PAGO_DE_LA_COMPRA, nombreDeMedio } from '@/shared/rules/pagos';
import { enPesos } from '@/shared/rules/pesos';

import { ImportarPlanillaOcc } from './importar-planilla-occ';
import { cuando, EstadoOcc, textoDelEventoOcc, type EventoOcc } from './partes-occ';
import { VentanaAutorizarOcc, VentanaLineaOcc, VentanaPagoOcc } from './ventanas-occ';

const urlDelArchivo = (mediaId: string) => `/api/panel/media/${mediaId}`;

type Ventana =
  | { que: 'linea'; linea?: LineaOccEnElDetalle }
  | { que: 'quitar'; linea: LineaOccEnElDetalle }
  | { que: 'enviar' }
  | { que: 'autorizar' }
  | { que: 'devolver' }
  | { que: 'cancelar' }
  | { que: 'importar' }
  | { que: 'pagar'; linea: LineaOccEnElDetalle }
  | { que: 'anular'; pago: PagoRegistrado };

export function VistaDeRequisicionOcc({ id, alVolver, volverA }: { id: string; alVolver: () => void; volverA: string }) {
  const cargada = useListado<RequisicionOccDetallada>(useCallback(() => api.requisiciones.occ.detalle(id).then((d) => [d]), [id]));
  const r = cargada.datos[0];
  const [ventana, setVentana] = useState<Ventana | null>(null);
  const [hecho, setHecho] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const listo = (mensaje: string) => {
    setVentana(null);
    setHecho(mensaje);
    setError(null);
    cargada.recargar();
  };
  const volver = <Boton titulo={`← Volver a ${volverA}`} tono="secundario" onPress={alVolver} />;

  if (!r) {
    return (
      <MarcoPantalla titulo="Requisición de pagos" descripcion="" error={cargada.error} cargando={cargada.cargando}>
        <Acciones>{volver}</Acciones>
      </MarcoPantalla>
    );
  }

  async function descargar() {
    setError(null);
    try {
      const { contenido, nombre } = await api.requisiciones.occ.excel(id);
      guardarArchivo(contenido, nombre);
    } catch (fallo) {
      setError(mensajeDe(fallo));
    }
  }

  const paso = (accion: 'enviar' | 'devolver' | 'cancelar', motivo = '') => api.requisiciones.occ.paso(id, { version: r.version, accion, motivo });

  const columnas: Columna<LineaOccEnElDetalle>[] = [
    { clave: 'numero', titulo: 'N.º', ancho: 50, anchoMinimo: 50, pintar: (l) => <Text style={estilos.fuerte}>{l.numero}</Text> },
    {
      clave: 'beneficiario',
      titulo: 'Beneficiario',
      ancho: 190,
      pintar: (l) => (
        <View style={estilos.celdaDoble}>
          <Text style={estilos.texto}>{l.beneficiario}</Text>
          {l.proveedor && l.proveedor !== l.beneficiario ? <Text style={estilos.apoyo}>{`Proveedor: ${l.proveedor}`}</Text> : null}
          <Text style={estilos.apoyo}>{`Solicitada el ${fechaDelCorte(l.fechaSolicitud)}`}</Text>
        </View>
      ),
    },
    {
      clave: 'concepto',
      titulo: 'Concepto',
      ancho: 220,
      pintar: (l) => (
        <View style={estilos.celdaDoble}>
          <Text style={estilos.texto}>{l.concepto}</Text>
          {l.observaciones ? <Text style={estilos.apoyo}>{l.observaciones}</Text> : null}
        </View>
      ),
    },
    { clave: 'especificaciones', titulo: 'Especificaciones', ancho: 160, pintar: (l) => <Celda lineas={3}>{l.especificaciones || '—'}</Celda> },
    { clave: 'valor', titulo: 'Valor', ancho: 120, pintar: (l) => <Celda>{enPesos(l.valor)}</Celda> },
    {
      clave: 'adjuntos',
      titulo: 'RUT y cuenta',
      ancho: 100,
      pintar: (l) => (
        <View style={estilos.celdaDoble}>
          {l.rutMediaId ? <Enlace texto="RUT" url={urlDelArchivo(l.rutMediaId)} /> : <Text style={estilos.apoyo}>Sin RUT</Text>}
          {l.cuentaMediaId ? <Enlace texto="Cuenta" url={urlDelArchivo(l.cuentaMediaId)} /> : <Text style={estilos.apoyo}>Sin cuenta</Text>}
        </View>
      ),
    },
    {
      clave: 'respuesta',
      titulo: 'Respuesta',
      ancho: 170,
      pintar: (l) => (
        <View style={estilos.celdaDoble}>
          {l.respuesta === 'autorizada' ? (
            <Etiqueta tono="bueno">Autorizado</Etiqueta>
          ) : l.respuesta === 'no_autorizada' ? (
            <Etiqueta tono="malo">NO Autorizado</Etiqueta>
          ) : (
            <Text style={estilos.apoyo}>{r.estado === 'borrador' ? '—' : 'Sin responder'}</Text>
          )}
          {l.motivoRespuesta ? <Text style={estilos.apoyo}>{l.motivoRespuesta}</Text> : null}
          {l.pago ? <Text style={estilos.apoyo}>{`${NOMBRE_DEL_PAGO_DE_LA_COMPRA[l.pago]}${l.porPagar > 0 && l.pagado > 0 ? ` · faltan ${enPesos(l.porPagar)}` : ''}`}</Text> : null}
        </View>
      ),
    },
    {
      clave: 'acciones',
      titulo: '',
      ancho: 120,
      anchoMinimo: 120,
      pintar: (l) => (
        <View style={estilos.celdaDoble}>
          {r.puede.armar ? <Boton titulo="Cambiar" tono="secundario" onPress={() => setVentana({ que: 'linea', linea: l })} /> : null}
          {r.puede.armar ? <Boton titulo="Quitar" tono="peligro" onPress={() => setVentana({ que: 'quitar', linea: l })} /> : null}
          {r.puede.pagar && l.respuesta === 'autorizada' && l.porPagar > 0 ? <Boton titulo="Pagar" onPress={() => setVentana({ que: 'pagar', linea: l })} /> : null}
        </View>
      ),
    },
  ];

  const pagos = r.lineasVigentes.flatMap((l) => l.pagos.map((p) => ({ ...p, linea: l })));
  const columnasPagos: Columna<(typeof pagos)[number]>[] = [
    { clave: 'linea', titulo: 'Línea', ancho: 220, pintar: (p) => <Celda>{`${p.linea.numero}. ${p.linea.beneficiario}`}</Celda> },
    { clave: 'fecha', titulo: 'Fecha', ancho: 110, pintar: (p) => <Celda>{fechaDelCorte(p.fecha)}</Celda> },
    {
      clave: 'valor',
      titulo: 'Valor',
      ancho: 200,
      pintar: (p) => (
        <View style={estilos.celdaDoble}>
          <Text style={[estilos.texto, p.anulado && estilos.anulado]}>{enPesos(p.valor)}</Text>
          {p.anulado ? <Text style={estilos.apoyo}>{`Anulado por ${p.anulado.por}: ${p.anulado.motivo}`}</Text> : null}
        </View>
      ),
    },
    { clave: 'medio', titulo: 'Medio', ancho: 150, pintar: (p) => <Celda>{[nombreDeMedio(p.medio), p.referencia].filter(Boolean).join(' · ')}</Celda> },
    {
      clave: 'comprobante',
      titulo: 'Comprobante',
      ancho: 120,
      pintar: (p) => (p.comprobanteMediaId ? <Enlace texto="Ver" url={urlDelArchivo(p.comprobanteMediaId)} /> : <Celda>—</Celda>),
    },
    { clave: 'por', titulo: 'Registró', ancho: 220, pintar: (p) => <Celda>{`${p.registradoPor} · ${cuando(p.registradoEn)}`}</Celda> },
    {
      clave: 'anular',
      titulo: '',
      ancho: 110,
      anchoMinimo: 110,
      pintar: (p) => (r.puede.anular_pago && !p.anulado ? <Boton titulo="Anular" tono="peligro" onPress={() => setVentana({ que: 'anular', pago: p })} /> : null),
    },
  ];

  const historia = r.historia.map((e, i) => ({ ...e, id: String(i) }));
  const columnasHistoria: Columna<EventoOcc & { id: string }>[] = [
    { clave: 'en', titulo: 'Cuándo', ancho: 170, pintar: (e) => <Celda>{cuando(e.en)}</Celda> },
    { clave: 'por', titulo: 'Quién', ancho: 200, pintar: (e) => <Celda>{e.por}</Celda> },
    {
      clave: 'que',
      titulo: 'Qué hizo',
      ancho: 560,
      pintar: (e) => (
        <View style={estilos.celdaDoble}>
          <Text style={estilos.texto}>{textoDelEventoOcc(e)}</Text>
          {e.motivo ? <Text style={estilos.apoyo}>{`Motivo: ${e.motivo}`}</Text> : null}
        </View>
      ),
    },
  ];

  const devolucion = r.estado === 'devuelta' ? [...r.historia].reverse().find((e) => e.paso === 'devuelta') : null;
  const enviable = r.lineasVigentes.length > 0;

  return (
    <MarcoPantalla
      titulo={`Requisición de pagos ${r.codigo}`}
      descripcion={`OCC · viernes de entrega ${fechaDelCorte(r.viernes)} · elaborada por ${r.elaboradaPor.nombre}`}
      error={cargada.error}
      cargando={cargada.cargando}
    >
      <Acciones>
        {volver}
        {r.puede.armar ? <Boton titulo="Agregar línea" onPress={() => setVentana({ que: 'linea' })} /> : null}
        {r.puede.armar ? <Boton titulo="Importar planilla" tono="secundario" onPress={() => setVentana({ que: 'importar' })} /> : null}
        {r.puede.enviar && enviable ? <Boton titulo="Enviar para autorizar" onPress={() => setVentana({ que: 'enviar' })} /> : null}
        {r.puede.responder ? <Boton titulo="Autorizar línea por línea" onPress={() => setVentana({ que: 'autorizar' })} /> : null}
        {r.puede.devolver ? <Boton titulo="Devolver" tono="secundario" onPress={() => setVentana({ que: 'devolver' })} /> : null}
        <Boton titulo="Descargar Excel" tono="secundario" onPress={descargar} />
        {r.puede.cancelar ? <Boton titulo="Cancelar la requisición" tono="peligro" onPress={() => setVentana({ que: 'cancelar' })} /> : null}
      </Acciones>
      <Confirmado mensaje={hecho} />
      {error ? <Aviso tono="error">{error}</Aviso> : null}
      {devolucion ? <Aviso tono="error">{`Devuelta para corregir: ${devolucion.motivo ?? ''}`}</Aviso> : null}
      {r.puede.enviar && !enviable ? <Aviso tono="info">Agregue las líneas a mano o importe la planilla; después, envíela para autorizar.</Aviso> : null}

      <Seccion titulo="La requisición">
        <View style={estilos.marcas}>
          <EstadoOcc estado={r.estado} />
          {r.marcas.map((m) => (
            <Etiqueta key={m} tono="malo">
              {m === 'Devuelta: corrígela' && !r.puede.armar ? 'Devuelta' : m}
            </Etiqueta>
          ))}
        </View>
        <Cifras>
          <Cifra titulo="Total pedido" valor={enPesos(r.totalPedido)} pie={`${r.lineas} ${r.lineas === 1 ? 'línea' : 'líneas'}`} />
          <Cifra titulo="Total a pagar" valor={enPesos(r.totalAPagar)} pie="Solo lo autorizado" tono={r.totalAPagar > 0 ? 'bueno' : 'neutro'} />
          {r.estado === 'en_autorizacion' ? (
            <Cifra titulo="Faltan por responder" valor={String(r.faltanPorResponder)} tono={r.faltanPorResponder > 0 ? 'atencion' : 'bueno'} />
          ) : null}
        </Cifras>
      </Seccion>

      <Seccion titulo="Líneas">
        <Tabla columnas={columnas} filas={r.lineasVigentes} vacio="Todavía no tiene líneas." />
      </Seccion>

      {pagos.length ? (
        <Seccion titulo="Pagos">
          <Tabla columnas={columnasPagos} filas={pagos} vacio="" />
        </Seccion>
      ) : null}

      {r.planillas.length ? (
        <Seccion titulo="Planillas importadas">
          <View style={estilos.celdaDoble}>
            {r.planillas.map((p) => (
              <Enlace key={p.id} texto={`${p.nombreArchivo} · ${cuando(p.en)}`} url={`${urlDelArchivo(p.mediaId)}?descargar=1`} />
            ))}
          </View>
        </Seccion>
      ) : null}

      <Seccion titulo="Historia">
        <Tabla columnas={columnasHistoria} filas={historia} vacio="" />
      </Seccion>

      {ventana?.que === 'linea' ? (
        <VentanaLineaOcc requisicionId={id} version={r.version} linea={ventana.linea} alCerrar={() => setVentana(null)} alGuardar={listo} />
      ) : null}
      {ventana?.que === 'quitar' ? (
        <Confirmacion
          titulo={`Quitar la línea ${ventana.linea.numero}`}
          aviso={`«${ventana.linea.beneficiario} · ${ventana.linea.concepto}» sale de la requisición. Queda en la historia.`}
          confirmar="Quitar"
          onCancelar={() => setVentana(null)}
          onConfirmar={async () => {
            await api.requisiciones.occ.quitarLinea(id, ventana.linea.id, r.version);
            listo('Línea quitada.');
          }}
        />
      ) : null}
      {ventana?.que === 'enviar' ? (
        <Confirmacion
          titulo={`Enviar ${r.codigo}`}
          aviso={`Va a la Administradora de Elemental con ${r.lineas} ${r.lineas === 1 ? 'línea' : 'líneas'} por ${enPesos(r.totalPedido)}. Después de enviarla no se le agregan líneas: lo que llegue va a la del viernes siguiente.`}
          confirmar="Enviar"
          onCancelar={() => setVentana(null)}
          onConfirmar={async () => {
            await paso('enviar');
            listo(`${r.codigo} enviada para autorizar.`);
          }}
        />
      ) : null}
      {ventana?.que === 'autorizar' ? (
        <VentanaAutorizarOcc
          requisicionId={id}
          codigo={r.codigo}
          version={r.version}
          lineas={r.lineasVigentes}
          alCerrar={() => setVentana(null)}
          alGuardar={listo}
        />
      ) : null}
      {ventana?.que === 'devolver' ? (
        <VentanaDeMotivo
          titulo={`Devolver ${r.codigo}`}
          aviso="Vuelve a quien la elaboró para corregirla. Al reenviarla, todas las líneas esperan respuesta otra vez."
          etiqueta="Qué debe corregirse"
          accion="Devolver"
          tono="primario"
          alCerrar={() => setVentana(null)}
          alConfirmar={async (motivo) => {
            await paso('devolver', motivo);
            listo(`${r.codigo} devuelta.`);
          }}
        />
      ) : null}
      {ventana?.que === 'cancelar' ? (
        <VentanaDeMotivo
          titulo={`Cancelar ${r.codigo}`}
          aviso="La requisición queda cancelada y no se puede volver a abrir. Ese viernes queda libre para otra."
          accion="Cancelar la requisición"
          alCerrar={() => setVentana(null)}
          alConfirmar={async (motivo) => {
            await paso('cancelar', motivo);
            listo(`${r.codigo} cancelada.`);
          }}
        />
      ) : null}
      {ventana?.que === 'importar' ? <ImportarPlanillaOcc requisicionId={id} alCerrar={() => setVentana(null)} alConfirmar={listo} /> : null}
      {ventana?.que === 'pagar' ? (
        <VentanaPagoOcc
          requisicionId={id}
          codigo={r.codigo}
          version={r.version}
          linea={ventana.linea}
          alCerrar={() => setVentana(null)}
          alPagar={listo}
        />
      ) : null}
      {ventana?.que === 'anular' ? (
        <VentanaDeMotivo
          titulo={`Anular un pago de ${enPesos(ventana.pago.valor)}`}
          aviso="El pago queda en la historia, marcado como anulado, y la línea vuelve a estar por pagar."
          accion="Anular el pago"
          alCerrar={() => setVentana(null)}
          alConfirmar={async (motivo) => {
            await api.tesoreria.anularPago(ventana.pago.id, { version: r.version, motivo });
            listo('Pago anulado.');
          }}
        />
      ) : null}
    </MarcoPantalla>
  );
}

/** Un enlace a un archivo, que se abre en otra pestaña. */
function Enlace({ texto, url }: { texto: string; url: string }) {
  return (
    <Text style={estilos.enlace} accessibilityRole="link" onPress={() => window.open(url, '_blank', 'noopener')}>
      {texto}
    </Text>
  );
}

const estilos = StyleSheet.create({
  celdaDoble: { gap: Spacing.half, alignItems: 'flex-start' },
  marcas: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.half, marginBottom: Spacing.two },
  texto: { fontFamily: FuentePanel.texto, fontSize: TextoPanel.cuerpo, color: Panel.texto },
  fuerte: { fontFamily: FuentePanel.texto, fontSize: TextoPanel.cuerpo, fontWeight: '600', color: Panel.texto },
  apoyo: { fontFamily: FuentePanel.texto, fontSize: TextoPanel.apoyo, color: Panel.textoApoyo },
  enlace: { fontFamily: FuentePanel.texto, fontSize: TextoPanel.cuerpo, color: Panel.accion, textDecorationLine: 'underline' },
  anulado: { textDecorationLine: 'line-through', color: Panel.textoApoyo },
});
