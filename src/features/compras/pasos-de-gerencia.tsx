/**
 * Lo que hace la gerencia sobre una solicitud, desde Compras de Elemental (spec 036, RF-13
 * a RF-19, RF-30): aprobar (bajando cantidades o quitando renglones), rechazar, devolver,
 * registrar la compra con sus soportes y anular una compra.
 *
 * Los botones salen de `pasos`, que manda el servidor con la misma regla que lo revisa
 * (`puedeDar`): la auxiliar de RR. HH. consulta la misma solicitud y no ve ninguno.
 * Lo que impide cada paso lo dicen las reglas de `rules/compras` antes de enviarlo.
 */
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { FuentePanel, Panel, Spacing, TextoPanel } from '@/constants/theme';
import { elegirArchivo } from '@/features/contratos/elegir-archivo';
import { api, mensajeDe } from '@/features/panel/cliente-api';
import {
  AccionesFormulario,
  Aviso,
  Boton,
  Campo,
  CampoDeFecha,
  Casilla,
  Modal,
  Selector,
} from '@/features/panel/componentes';
import type { SolicitudDetallada } from '@/features/panel/contratos';
import { aprobacionDeLaSolicitud, faltasDeLaCompra } from '@/shared/rules/compras';
import { ACEPTA_DOCUMENTOS, BYTES_DE_FIRMA, revisarDocumento } from '@/shared/rules/documentos';
import { fechaDeJornada } from '@/shared/rules/jornada';
import { enPesos } from '@/shared/rules/pesos';

import { VentanaDeMotivo } from './vista-de-la-solicitud';

type Ventana = 'aprobar' | 'rechazar' | 'devolver' | 'comprar' | 'anular' | null;

const cantidad = (n: number) => n.toLocaleString('es-CO');
const aNumero = (texto: string) => (texto.trim() ? Number(texto.trim().replace(',', '.')) : Number.NaN);
const aPesos = (texto: string) => (texto.trim() ? Number(texto.replace(/[.\s$]/g, '')) : Number.NaN);

/**
 * Aprobar (RF-13): cada renglón con lo pedido ya escrito; se baja o se pone en 0 para
 * quitarlo. Todo en cero no se deja: para eso se rechaza.
 */
function VentanaDeAprobar({
  solicitud,
  alCerrar,
  alAprobar,
}: {
  solicitud: SolicitudDetallada;
  alCerrar: () => void;
  alAprobar: (mensaje: string) => void;
}) {
  const [cantidades, setCantidades] = useState<Record<string, string>>(
    Object.fromEntries(solicitud.renglones.map((r) => [r.id, String(r.cantidad).replace('.', ',')])),
  );
  const [error, setError] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const pedidas = solicitud.renglones.map((r) => ({ renglonId: r.id, cantidad: aNumero(cantidades[r.id] ?? '') }));
  const { faltas, cambios } = aprobacionDeLaSolicitud(
    solicitud.renglones.map((r) => ({ id: r.id, orden: r.orden, descripcion: r.descripcion, cantidad: r.cantidad })),
    pedidas.map((p) => ({ ...p, cantidad: Number.isNaN(p.cantidad) ? -1 : p.cantidad })),
  );

  async function aprobar() {
    setEnviando(true);
    setError(null);
    try {
      await api.compras.paso(solicitud.id, {
        paso: 'aprobar',
        version: solicitud.version,
        // Solo las que cambian: las demás se aprueban enteras.
        cantidades: pedidas.filter((p) => solicitud.renglones.find((r) => r.id === p.renglonId)?.cantidad !== p.cantidad),
      });
      alAprobar(
        cambios.length
          ? `Solicitud ${solicitud.codigo} aprobada con ${cambios.length === 1 ? 'un cambio' : `${cambios.length} cambios`}.`
          : `Solicitud ${solicitud.codigo} aprobada.`,
      );
    } catch (fallo) {
      setError(mensajeDe(fallo));
      setEnviando(false);
    }
  }

  return (
    <Modal titulo={`Aprobar ${solicitud.codigo}`} onCerrar={alCerrar}>
      <Text style={estilos.texto}>
        Se aprueba lo que dice cada renglón. Para aprobar menos, baje la cantidad; para quitar un renglón, póngalo en cero.
      </Text>
      {solicitud.renglones.map((r) => (
        <View key={r.id} style={estilos.fila}>
          <Text style={[estilos.texto, estilos.nombreDeRenglon]}>
            {`${r.orden}. ${r.descripcion} — pidió ${cantidad(r.cantidad)} ${r.unidad}`}
          </Text>
          <Campo
            etiqueta={`Se aprueba (${r.unidad})`}
            valor={cantidades[r.id] ?? ''}
            onChange={(v) => setCantidades((todas) => ({ ...todas, [r.id]: v }))}
            ancho={150}
          />
        </View>
      ))}
      {faltas.length ? <Aviso tono="error">{faltas[0]}</Aviso> : null}
      {error ? <Aviso tono="error">{error}</Aviso> : null}
      <AccionesFormulario>
        <Boton titulo="Volver" tono="secundario" onPress={alCerrar} />
        <Boton titulo={enviando ? 'Aprobando…' : 'Aprobar'} onPress={aprobar} deshabilitado={enviando || faltas.length > 0} />
      </AccionesFormulario>
    </Modal>
  );
}

/**
 * Registrar una compra (RF-16 a RF-19): a quién, por cuánto, cuándo, qué renglones cubre y,
 * si se quiere, la factura o la orden de compra como adjunto. Con dos proveedores se
 * registran dos compras, cada una con sus renglones.
 */
function VentanaDeComprar({
  solicitud,
  alCerrar,
  alComprar,
}: {
  solicitud: SolicitudDetallada;
  alCerrar: () => void;
  alComprar: (mensaje: string) => void;
}) {
  const enCompra = new Set(solicitud.compras.filter((c) => !c.anulada).flatMap((c) => c.renglonIds));
  const libres = solicitud.renglones.filter((r) => (r.cantidadAprobada ?? 0) > 0 && !enCompra.has(r.id));
  const [elegidos, setElegidos] = useState<string[]>(libres.map((r) => r.id));
  const [proveedor, setProveedor] = useState(solicitud.proveedorSugerido);
  const [valor, setValor] = useState('');
  const [fecha, setFecha] = useState(fechaDeJornada());
  const [factura, setFactura] = useState('');
  const [soporte, setSoporte] = useState<{ archivo: File; clase: string } | null>(null);
  const [intentado, setIntentado] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  const datos = { proveedor, valor: aPesos(valor), fecha, factura, renglonIds: elegidos };
  const faltas = faltasDeLaCompra(
    datos,
    solicitud.renglones.map((r) => ({
      id: r.id,
      orden: r.orden,
      cantidadAprobada: r.cantidadAprobada,
      enCompraVigente: enCompra.has(r.id),
    })),
  );

  async function adjuntar() {
    const elegido = await elegirArchivo(ACEPTA_DOCUMENTOS);
    if (!elegido) return;
    const cabecera = new Uint8Array(await elegido.slice(0, BYTES_DE_FIRMA).arrayBuffer());
    const revision = revisarDocumento(elegido.name, elegido.size, cabecera);
    setError(revision.ok ? null : revision.mensaje);
    if (revision.ok) setSoporte({ archivo: elegido, clase: 'factura' });
  }

  async function comprar() {
    setIntentado(true);
    if (faltas.length) return;
    setEnviando(true);
    setError(null);
    try {
      await api.compras.registrarCompra(solicitud.id, { ...datos, version: solicitud.version });
    } catch (fallo) {
      setError(mensajeDe(fallo));
      setEnviando(false);
      return;
    }
    // La compra ya quedó: si el soporte no sube, se dice, pero no la deshace.
    let sinSoporte = '';
    if (soporte) {
      try {
        await api.documentos.subir(
          { solicitudId: solicitud.id },
          {
            clase: soporte.clase,
            nombre: `${soporte.clase === 'factura' ? 'Factura' : 'Orden de compra'} ${proveedor.trim()}${factura.trim() ? ` ${factura.trim()}` : ''}`,
            fecha,
            vence: '',
            proveedor: proveedor.trim(),
            descripcion: '',
          },
          soporte.archivo,
          soporte.archivo.name,
        );
      } catch (fallo) {
        sinSoporte = ` No se pudo adjuntar «${soporte.archivo.name}»: ${mensajeDe(fallo)}`;
      }
    }
    alComprar(`Compra a ${proveedor.trim()} registrada por ${enPesos(datos.valor)}.${sinSoporte}`);
  }

  return (
    <Modal titulo={`Registrar compra · ${solicitud.codigo}`} onCerrar={alCerrar}>
      <Text style={estilos.subtitulo}>Qué renglones cubre</Text>
      {libres.length === 0 ? <Text style={estilos.apoyo}>Todos los renglones aprobados ya tienen compra.</Text> : null}
      {libres.map((r) => (
        <Casilla
          key={r.id}
          etiqueta={`${r.orden}. ${r.descripcion} — ${cantidad(r.cantidadAprobada ?? 0)} ${r.unidad}`}
          marcada={elegidos.includes(r.id)}
          onChange={(marcada) =>
            setElegidos((todos) => (marcada ? [...todos, r.id] : todos.filter((x) => x !== r.id)))
          }
        />
      ))}
      <View style={estilos.fila}>
        <Campo etiqueta="Proveedor" obligatorio valor={proveedor} onChange={setProveedor} ancho={280} />
        <Campo etiqueta="Valor total (pesos)" obligatorio valor={valor} onChange={setValor} ancho={200} ayuda="Sin centavos." />
      </View>
      <View style={estilos.fila}>
        <CampoDeFecha etiqueta="Fecha de compra" valor={fecha} onChange={setFecha} />
        <Campo etiqueta="Factura o remisión" valor={factura} onChange={setFactura} ancho={200} ayuda="Opcional: el número." />
      </View>
      <Text style={estilos.subtitulo}>Soporte</Text>
      {soporte ? (
        <View style={estilos.fila}>
          <Text style={[estilos.texto, estilos.nombreDeRenglon]}>{soporte.archivo.name}</Text>
          <Selector
            etiqueta="Clase"
            valor={soporte.clase}
            opciones={[
              { valor: 'factura', etiqueta: 'Factura' },
              { valor: 'orden_de_compra', etiqueta: 'Orden de compra' },
            ]}
            onChange={(clase) => setSoporte({ ...soporte, clase: clase ?? 'factura' })}
            ancho={200}
          />
          <Boton titulo="Quitar" tono="secundario" onPress={() => setSoporte(null)} />
        </View>
      ) : (
        <View style={estilos.inicio}>
          <Boton titulo="Adjuntar factura u orden" tono="secundario" onPress={adjuntar} />
          <Text style={estilos.apoyo}>Opcional. PDF, imagen, Word o Excel, hasta 20 MB.</Text>
        </View>
      )}
      {intentado && faltas.length ? <Aviso tono="error">{faltas.join(' ')}</Aviso> : null}
      {error ? <Aviso tono="error">{error}</Aviso> : null}
      <AccionesFormulario>
        <Boton titulo="Volver" tono="secundario" onPress={alCerrar} />
        <Boton titulo={enviando ? 'Registrando…' : 'Registrar compra'} onPress={comprar} deshabilitado={enviando} />
      </AccionesFormulario>
    </Modal>
  );
}

/** Anular una compra (RF-30): cuál y por qué. Sus renglones quedan libres para otra. */
function VentanaDeAnularCompra({
  solicitud,
  alCerrar,
  alAnular,
}: {
  solicitud: SolicitudDetallada;
  alCerrar: () => void;
  alAnular: (mensaje: string) => void;
}) {
  const vigentes = solicitud.compras.filter((c) => !c.anulada);
  const [compra, setCompra] = useState<string | null>(vigentes.length === 1 ? vigentes[0].id : null);
  const [motivo, setMotivo] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const elegida = vigentes.find((c) => c.id === compra);
  return (
    <Modal titulo={`Anular una compra · ${solicitud.codigo}`} onCerrar={alCerrar}>
      <Text style={estilos.texto}>
        La compra queda en la solicitud, tachada y con el motivo. Sus renglones quedan libres para comprarlos a otro.
      </Text>
      <Selector
        etiqueta="Compra"
        valor={compra}
        opciones={vigentes.map((c) => ({
          valor: c.id,
          etiqueta: c.proveedor,
          detalle: [c.valor ? enPesos(c.valor) : null, c.factura || null].filter(Boolean).join(' · '),
        }))}
        onChange={setCompra}
        vacio="Elija la compra"
        ancho={360}
      />
      <Campo etiqueta="Motivo" obligatorio valor={motivo} onChange={setMotivo} multilinea compacto />
      {error ? <Aviso tono="error">{error}</Aviso> : null}
      <AccionesFormulario>
        <Boton titulo="Volver" tono="secundario" onPress={alCerrar} />
        <Boton
          titulo={enviando ? 'Anulando…' : 'Anular la compra'}
          tono="peligro"
          deshabilitado={!elegida || !motivo.trim() || enviando}
          onPress={async () => {
            if (!elegida) return;
            setEnviando(true);
            setError(null);
            try {
              await api.compras.anularCompra(elegida.id, { version: solicitud.version, motivo });
              alAnular(`Compra a ${elegida.proveedor} anulada.`);
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
export function PasosDeGerencia({
  solicitud,
  listo,
}: {
  solicitud: SolicitudDetallada;
  listo: (mensaje: string) => void;
}) {
  const [ventana, setVentana] = useState<Ventana>(null);
  const hecho = (mensaje: string) => {
    setVentana(null);
    listo(mensaje);
  };
  const s = solicitud;
  const puede = (paso: SolicitudDetallada['pasos'][number]) => s.pasos.includes(paso);
  return (
    <>
      {puede('aprobar') ? <Boton titulo="Aprobar" onPress={() => setVentana('aprobar')} /> : null}
      {puede('registrar_compra') ? <Boton titulo="Registrar compra" onPress={() => setVentana('comprar')} /> : null}
      {puede('devolver') ? <Boton titulo="Devolver para corregir" tono="secundario" onPress={() => setVentana('devolver')} /> : null}
      {puede('anular_compra') ? <Boton titulo="Anular una compra" tono="peligro" onPress={() => setVentana('anular')} /> : null}
      {puede('rechazar') ? <Boton titulo="Rechazar" tono="peligro" onPress={() => setVentana('rechazar')} /> : null}

      {ventana === 'aprobar' ? <VentanaDeAprobar solicitud={s} alCerrar={() => setVentana(null)} alAprobar={hecho} /> : null}
      {ventana === 'comprar' ? <VentanaDeComprar solicitud={s} alCerrar={() => setVentana(null)} alComprar={hecho} /> : null}
      {ventana === 'anular' ? <VentanaDeAnularCompra solicitud={s} alCerrar={() => setVentana(null)} alAnular={hecho} /> : null}
      {ventana === 'rechazar' ? (
        <VentanaDeMotivo
          titulo={`Rechazar ${s.codigo}`}
          aviso="La solicitud queda rechazada y no se puede volver a abrir. Quien la pidió ve el motivo."
          accion="Rechazar"
          alCerrar={() => setVentana(null)}
          alConfirmar={async (motivo) => {
            await api.compras.paso(s.id, { paso: 'rechazar', version: s.version, motivo });
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
            await api.compras.paso(s.id, { paso: 'devolver', version: s.version, motivo });
            hecho(`Solicitud ${s.codigo} devuelta para corregir.`);
          }}
        />
      ) : null}
    </>
  );
}

const estilos = StyleSheet.create({
  subtitulo: {
    fontFamily: FuentePanel.texto,
    fontSize: TextoPanel.cuerpo,
    fontWeight: '600',
    color: Panel.texto,
    marginTop: Spacing.two,
  },
  fila: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'flex-end', gap: Spacing.two },
  nombreDeRenglon: { minWidth: 280, flexShrink: 1, paddingBottom: Spacing.two },
  inicio: { gap: Spacing.one, alignItems: 'flex-start' },
  texto: { fontFamily: FuentePanel.texto, fontSize: TextoPanel.cuerpo, color: Panel.texto },
  apoyo: { fontFamily: FuentePanel.texto, fontSize: TextoPanel.apoyo, color: Panel.textoApoyo },
});
