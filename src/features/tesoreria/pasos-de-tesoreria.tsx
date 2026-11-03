/**
 * Lo que hace la gerencia sobre una solicitud de pago, desde Tesorería de Elemental (spec
 * 037, RF-11 a RF-16): aprobar (por lo pedido o por menos), rechazar, devolver, registrar un
 * pago con su comprobante y anular un pago.
 *
 * Los botones salen de `pasos`, como en Compras: la auxiliar de RR. HH. consulta la misma
 * solicitud y no ve ninguno. Lo que impide cada paso lo dicen las reglas de `rules/pagos`
 * antes de enviarlo.
 */
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { FuentePanel, Panel, Spacing, TextoPanel } from '@/constants/theme';
import { VentanaDeMotivo } from '@/features/compras/vista-de-la-solicitud';
import { elegirArchivo } from '@/features/contratos/elegir-archivo';
import { api, mensajeDe, type LugarDeLosDocumentos } from '@/features/panel/cliente-api';
import { AccionesFormulario, Aviso, Boton, Campo, CampoDeFecha, Modal, Selector } from '@/features/panel/componentes';
import type { PagoPedido, SolicitudDePagoDetallada } from '@/features/panel/contratos';
import { fechaDelCorte } from '@/shared/rules/cortes';
import { ACEPTA_DOCUMENTOS, BYTES_DE_FIRMA, revisarDocumento } from '@/shared/rules/documentos';
import { fechaDeJornada } from '@/shared/rules/jornada';
import { aprobacionDelPago, faltasDelPago, MEDIOS_DE_PAGO, nombreDeMedio } from '@/shared/rules/pagos';
import { enPesos } from '@/shared/rules/pesos';

const aPesos = (texto: string) => (texto.trim() ? Number(texto.replace(/[.\s$]/g, '')) : Number.NaN);

/** Aprobar (RF-11): con lo pedido escrito; se baja para aprobar menos. */
function VentanaDeAprobar({ s, alCerrar, alAprobar }: { s: SolicitudDePagoDetallada; alCerrar: () => void; alAprobar: (m: string) => void }) {
  const pedido = s.valor ?? 0;
  const [valor, setValor] = useState(String(pedido));
  const [error, setError] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const elegido = aPesos(valor);
  const { falta } = aprobacionDelPago(pedido, Number.isNaN(elegido) ? 0 : elegido);
  return (
    <Modal titulo={`Aprobar ${s.codigo}`} onCerrar={alCerrar}>
      <Text style={estilos.texto}>{`Se pidieron ${enPesos(pedido)}. Para aprobar menos, baje el valor.`}</Text>
      <Campo etiqueta="Valor aprobado (pesos)" valor={valor} onChange={setValor} error={falta ?? undefined} ancho={220} />
      {error ? <Aviso tono="error">{error}</Aviso> : null}
      <AccionesFormulario>
        <Boton titulo="Volver" tono="secundario" onPress={alCerrar} />
        <Boton
          titulo={enviando ? 'Aprobando…' : 'Aprobar'}
          deshabilitado={enviando || falta !== null}
          onPress={async () => {
            setEnviando(true);
            setError(null);
            try {
              await api.tesoreria.paso(s.id, {
                paso: 'aprobar',
                version: s.version,
                valorAprobado: elegido === pedido ? null : elegido,
              });
              alAprobar(elegido === pedido ? `Solicitud ${s.codigo} aprobada.` : `Solicitud ${s.codigo} aprobada por ${enPesos(elegido)}.`);
            } catch (fallo) {
              setError(mensajeDe(fallo));
              setEnviando(false);
            }
          }}
        />
      </AccionesFormulario>
    </Modal>
  );
}

/**
 * Registrar un pago (RF-13 a RF-15, RF-18), de una solicitud de pago o de una compra: con lo
 * que falta ya escrito; se baja para un anticipo. El comprobante, si se adjunta, se sube
 * primero a los soportes de la solicitud (`de`) y el pago lo cita. `registrar` envía el pago y
 * responde el mensaje para quien pagó.
 */
export function VentanaDePago({
  codigo,
  falta,
  beneficiario,
  de,
  registrar,
  alCerrar,
  alPagar,
}: {
  codigo: string;
  falta: number;
  beneficiario: string;
  de: LugarDeLosDocumentos;
  registrar: (pago: PagoPedido) => Promise<string>;
  alCerrar: () => void;
  alPagar: (mensaje: string) => void;
}) {
  const [fecha, setFecha] = useState(fechaDeJornada());
  const [valor, setValor] = useState(String(falta));
  const [medio, setMedio] = useState<string | null>('transferencia');
  const [referencia, setReferencia] = useState('');
  const [comprobante, setComprobante] = useState<File | null>(null);
  const [intentado, setIntentado] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const datos = { fecha, valor: aPesos(valor), medio: medio ?? '', referencia };
  const faltas = faltasDelPago(datos, falta);

  async function adjuntar() {
    const archivo = await elegirArchivo(ACEPTA_DOCUMENTOS);
    if (!archivo) return;
    const revision = revisarDocumento(archivo.name, archivo.size, new Uint8Array(await archivo.slice(0, BYTES_DE_FIRMA).arrayBuffer()));
    setError(revision.ok ? null : revision.mensaje);
    if (revision.ok) setComprobante(archivo);
  }

  async function pagar() {
    setIntentado(true);
    if (faltas.length) return;
    setEnviando(true);
    setError(null);
    try {
      let documentoId: string | null = null;
      if (comprobante) {
        const subido = await api.documentos.subir(
          de,
          {
            clase: 'comprobante_de_pago',
            nombre: `Comprobante ${nombreDeMedio(datos.medio).toLowerCase()} ${referencia.trim()}`.trim(),
            fecha,
            vence: '',
            proveedor: beneficiario,
            descripcion: '',
          },
          comprobante,
          comprobante.name,
        );
        documentoId = subido.id;
      }
      alPagar(await registrar({ ...datos, documentoId }));
    } catch (fallo) {
      setError(mensajeDe(fallo));
      setEnviando(false);
    }
  }

  return (
    <Modal titulo={`Registrar un pago · ${codigo}`} onCerrar={alCerrar}>
      <Text style={estilos.texto}>{`Falta por pagar ${enPesos(falta)}. Para un anticipo, baje el valor.`}</Text>
      <View style={estilos.fila}>
        <Campo etiqueta="Valor (pesos)" obligatorio valor={valor} onChange={setValor} ancho={200} />
        <CampoDeFecha etiqueta="Fecha del pago" valor={fecha} onChange={setFecha} max={fechaDeJornada()} />
      </View>
      <View style={[estilos.fila, estilos.arriba]}>
        <Selector
          etiqueta="Medio"
          obligatorio
          valor={medio}
          opciones={MEDIOS_DE_PAGO.map((m) => ({ valor: m.id, etiqueta: m.nombre }))}
          onChange={setMedio}
          ancho={200}
        />
        <Campo etiqueta="Referencia" valor={referencia} onChange={setReferencia} ayuda="Opcional: número de transferencia o de cheque." ancho={260} />
      </View>
      <View style={estilos.inicio}>
        <Boton titulo={comprobante ? 'Cambiar comprobante' : 'Adjuntar comprobante'} tono="secundario" onPress={adjuntar} />
        <Text style={estilos.apoyo}>{comprobante ? comprobante.name : 'Opcional. PDF o imagen, hasta 20 MB.'}</Text>
      </View>
      {intentado && faltas.length ? <Aviso tono="error">{faltas.join(' ')}</Aviso> : null}
      {error ? <Aviso tono="error">{error}</Aviso> : null}
      <AccionesFormulario>
        <Boton titulo="Volver" tono="secundario" onPress={alCerrar} />
        <Boton titulo={enviando ? 'Registrando…' : 'Registrar pago'} onPress={pagar} deshabilitado={enviando} />
      </AccionesFormulario>
    </Modal>
  );
}

/** Anular un pago (RF-16): cuál y por qué. */
function VentanaDeAnularPago({ s, alCerrar, alAnular }: { s: SolicitudDePagoDetallada; alCerrar: () => void; alAnular: (m: string) => void }) {
  const vigentes = (s.pagos ?? []).filter((p) => !p.anulado);
  const [pago, setPago] = useState<string | null>(vigentes.length === 1 ? vigentes[0].id : null);
  const [motivo, setMotivo] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const elegido = vigentes.find((p) => p.id === pago);
  return (
    <Modal titulo={`Anular un pago · ${s.codigo}`} onCerrar={alCerrar}>
      <Text style={estilos.texto}>El pago queda en la solicitud, tachado y con el motivo. Lo que falta por pagar vuelve a subir.</Text>
      <Selector
        etiqueta="Pago"
        valor={pago}
        opciones={vigentes.map((p) => ({ valor: p.id, etiqueta: enPesos(p.valor), detalle: [fechaDelCorte(p.fecha), nombreDeMedio(p.medio), p.referencia].filter(Boolean).join(' · ') }))}
        onChange={setPago}
        vacio="Elija el pago"
        ancho={360}
      />
      <Campo etiqueta="Motivo" obligatorio valor={motivo} onChange={setMotivo} multilinea compacto />
      {error ? <Aviso tono="error">{error}</Aviso> : null}
      <AccionesFormulario>
        <Boton titulo="Volver" tono="secundario" onPress={alCerrar} />
        <Boton
          titulo={enviando ? 'Anulando…' : 'Anular el pago'}
          tono="peligro"
          deshabilitado={!elegido || !motivo.trim() || enviando}
          onPress={async () => {
            if (!elegido) return;
            setEnviando(true);
            setError(null);
            try {
              await api.tesoreria.anularPago(elegido.id, { version: s.version, motivo });
              alAnular(`Pago de ${enPesos(elegido.valor)} anulado.`);
            } catch (fallo) {
              setError(mensajeDe(fallo));
              setEnviando(false);
            }
          }}
        />
      </AccionesFormulario>
    </Modal>
  );
}

/** Los botones de la gerencia y sus ventanas, para `accionesExtra` del detalle. */
export function PasosDeTesoreria({ solicitud: s, listo }: { solicitud: SolicitudDePagoDetallada; listo: (mensaje: string) => void }) {
  const [ventana, setVentana] = useState<'aprobar' | 'rechazar' | 'devolver' | 'pagar' | 'anular' | null>(null);
  const hecho = (mensaje: string) => {
    setVentana(null);
    listo(mensaje);
  };
  const puede = (paso: SolicitudDePagoDetallada['pasos'][number]) => s.pasos.includes(paso);
  return (
    <>
      {puede('aprobar') ? <Boton titulo="Aprobar" onPress={() => setVentana('aprobar')} /> : null}
      {puede('registrar_pago') ? <Boton titulo="Registrar un pago" onPress={() => setVentana('pagar')} /> : null}
      {puede('devolver') ? <Boton titulo="Devolver para corregir" tono="secundario" onPress={() => setVentana('devolver')} /> : null}
      {puede('anular_pago') ? <Boton titulo="Anular un pago" tono="peligro" onPress={() => setVentana('anular')} /> : null}
      {puede('rechazar') ? <Boton titulo="Rechazar" tono="peligro" onPress={() => setVentana('rechazar')} /> : null}

      {ventana === 'aprobar' ? <VentanaDeAprobar s={s} alCerrar={() => setVentana(null)} alAprobar={hecho} /> : null}
      {ventana === 'pagar' ? (
        <VentanaDePago
          codigo={s.codigo}
          falta={(s.valorAprobado ?? s.valor ?? 0) - (s.pagado ?? 0)}
          beneficiario={s.beneficiario}
          de={{ solicitudPagoId: s.id }}
          registrar={async (pago) => {
            const r = await api.tesoreria.registrarPago(s.id, { ...pago, version: s.version });
            const falta = (s.valorAprobado ?? s.valor ?? 0) - (s.pagado ?? 0) - Number(pago.valor);
            return r.estado === 'pagada'
              ? `Pago de ${enPesos(Number(pago.valor))} registrado. La solicitud quedó pagada.`
              : `Pago de ${enPesos(Number(pago.valor))} registrado. Faltan ${enPesos(falta)}.`;
          }}
          alCerrar={() => setVentana(null)}
          alPagar={hecho}
        />
      ) : null}
      {ventana === 'anular' ? <VentanaDeAnularPago s={s} alCerrar={() => setVentana(null)} alAnular={hecho} /> : null}
      {ventana === 'rechazar' ? (
        <VentanaDeMotivo
          titulo={`Rechazar ${s.codigo}`}
          aviso="La solicitud queda rechazada y no se puede volver a abrir. Quien la pidió ve el motivo."
          accion="Rechazar"
          alCerrar={() => setVentana(null)}
          alConfirmar={async (motivo) => {
            await api.tesoreria.paso(s.id, { paso: 'rechazar', version: s.version, motivo });
            hecho(`Solicitud ${s.codigo} rechazada.`);
          }}
        />
      ) : null}
      {ventana === 'devolver' ? (
        <VentanaDeMotivo
          titulo={`Devolver ${s.codigo}`}
          aviso="Vuelve a quien la pidió para que la corrija y la envíe otra vez."
          etiqueta="Qué debe corregirse"
          accion="Devolver"
          tono="primario"
          alCerrar={() => setVentana(null)}
          alConfirmar={async (motivo) => {
            await api.tesoreria.paso(s.id, { paso: 'devolver', version: s.version, motivo });
            hecho(`Solicitud ${s.codigo} devuelta para corregir.`);
          }}
        />
      ) : null}
    </>
  );
}

const estilos = StyleSheet.create({
  fila: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'flex-end', gap: Spacing.two },
  arriba: { alignItems: 'flex-start' },
  inicio: { gap: Spacing.one, alignItems: 'flex-start' },
  texto: { fontFamily: FuentePanel.texto, fontSize: TextoPanel.cuerpo, color: Panel.texto },
  apoyo: { fontFamily: FuentePanel.texto, fontSize: TextoPanel.apoyo, color: Panel.textoApoyo },
});
