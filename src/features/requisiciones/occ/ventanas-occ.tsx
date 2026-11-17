/**
 * Las ventanas de la requisición de pagos de OCC (spec 047): crear la del viernes, una línea con su
 * RUT y su cuenta, autorizar línea por línea y registrar un pago.
 *
 * Lo que impide guardar lo dicen las reglas de `rules/requisicion-occ.ts`, las mismas del servidor,
 * junto a su campo (RF-12 a RF-14, RF-77); el servidor vuelve a revisarlo y, si dice otra cosa, gana
 * él y su mensaje se muestra. La versión que se vio va en cada cambio: si otra persona tocó la
 * requisición mientras tanto, el servidor responde que cambió y la ventana lo dice (RF-75).
 */
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { FuentePanel, Panel, Spacing, TextoPanel } from '@/constants/theme';
import { elegirArchivo } from '@/features/contratos/elegir-archivo';
import { api, ErrorApi, mensajeDe } from '@/features/panel/cliente-api';
import { AccionesFormulario, Aviso, Boton, Campo, CampoDeFecha, Modal, Selector } from '@/features/panel/componentes';
import type { LineaOccEnElDetalle, RequisicionOccExistente } from '@/features/panel/requisiciones-occ';
import { ACEPTA_DOCUMENTOS, BYTES_DE_FIRMA, revisarDocumento } from '@/shared/rules/documentos';
import { fechaDeJornada } from '@/shared/rules/jornada';
import { faltasDelPago, MEDIOS_DE_PAGO } from '@/shared/rules/pagos';
import { enPesos } from '@/shared/rules/pesos';
import { faltaDelViernes, faltasDeLaLineaPorCampo, type DatosDeLineaOcc, type RespuestaDeLineaOcc } from '@/shared/rules/requisicion-occ';

/** «1.850.000», «1850000» o «$ 1.850.000» → 1850000; vacío → nulo. Una coma decimal no es un peso entero. */
export const aPesosOcc = (texto: string): number | null => (texto.trim() ? Number(texto.replace(/[.\s$]/g, '').replace(',', '.')) : null);

/** El próximo viernes desde hoy (hoy mismo si es viernes), para proponerlo. */
export function proximoViernes(hoy: string = fechaDeJornada()): string {
  const dia = new Date(`${hoy}T12:00:00Z`);
  dia.setUTCDate(dia.getUTCDate() + ((5 - dia.getUTCDay() + 7) % 7));
  return dia.toISOString().slice(0, 10);
}

/* ── Nueva requisición del viernes (RF-5 a RF-8) ── */

export function VentanaNuevaOcc({
  alCerrar,
  alCrear,
  alAbrirExistente,
}: {
  alCerrar: () => void;
  alCrear: (id: string, codigo: string) => void;
  alAbrirExistente: (id: string) => void;
}) {
  const [viernes, setViernes] = useState(proximoViernes());
  const [error, setError] = useState<string | null>(null);
  const [existente, setExistente] = useState<RequisicionOccExistente['existente'] | null>(null);
  const [enviando, setEnviando] = useState(false);
  const falta = faltaDelViernes(viernes);

  async function crear() {
    if (falta) return;
    setEnviando(true);
    setError(null);
    setExistente(null);
    try {
      const creada = await api.requisiciones.occ.crear(viernes);
      alCrear(creada.id, creada.codigo);
    } catch (fallo) {
      // RF-8: la del viernes ya existe; se ofrece abrirla.
      const cuerpo = fallo instanceof ErrorApi ? (fallo.cuerpo as Partial<RequisicionOccExistente> | undefined) : undefined;
      if (cuerpo?.existente) setExistente(cuerpo.existente);
      setError(mensajeDe(fallo));
      setEnviando(false);
    }
  }

  return (
    <Modal titulo="Nueva requisición de pagos" onCerrar={alCerrar} angosta>
      <Text style={estilos.texto}>Una por viernes de entrega. Se arma durante la semana y se envía para autorizar.</Text>
      <CampoDeFecha etiqueta="Viernes de entrega *" valor={viernes} onChange={setViernes} min={fechaDeJornada()} error={falta ?? undefined} />
      {error ? <Aviso tono="error">{error}</Aviso> : null}
      <AccionesFormulario>
        <Boton titulo="Cancelar" tono="secundario" onPress={alCerrar} />
        {existente ? <Boton titulo={`Abrir ${existente.codigo}`} tono="secundario" onPress={() => alAbrirExistente(existente.id)} /> : null}
        <Boton titulo={enviando ? 'Creando…' : 'Crear'} onPress={crear} deshabilitado={enviando || Boolean(falta)} />
      </AccionesFormulario>
    </Modal>
  );
}

/* ── Una línea, con su RUT y su cuenta (RF-10 a RF-19, RF-36, RF-37) ── */

const VACIA: DatosDeLineaOcc = {
  fechaSolicitud: '',
  beneficiario: '',
  concepto: '',
  especificaciones: '',
  proveedor: '',
  valor: null,
  observaciones: '',
};

export function VentanaLineaOcc({
  requisicionId,
  version,
  linea,
  alCerrar,
  alGuardar,
}: {
  requisicionId: string;
  version: number;
  /** Para cambiarla; sin ella, es una línea nueva. */
  linea?: LineaOccEnElDetalle;
  alCerrar: () => void;
  alGuardar: (mensaje: string) => void;
}) {
  const inicial = linea ?? { ...VACIA, fechaSolicitud: fechaDeJornada() };
  const [datos, setDatos] = useState({ ...inicial, valorTexto: inicial.valor === null ? '' : String(inicial.valor) });
  const [rut, setRut] = useState<File | null>(null);
  const [cuenta, setCuenta] = useState<File | null>(null);
  const [intentado, setIntentado] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  const paraGuardar: DatosDeLineaOcc = {
    fechaSolicitud: datos.fechaSolicitud,
    beneficiario: datos.beneficiario,
    concepto: datos.concepto,
    especificaciones: datos.especificaciones,
    proveedor: datos.proveedor,
    valor: aPesosOcc(datos.valorTexto),
    observaciones: datos.observaciones,
  };
  const faltas = faltasDeLaLineaPorCampo(paraGuardar);
  const hayFaltas = Object.values(faltas).some((f) => f !== null);
  const ver = (falta: string | null) => (intentado && falta ? `${falta[0].toUpperCase()}${falta.slice(1)}.` : undefined);
  const cambiar = (cambio: Partial<typeof datos>) => setDatos((d) => ({ ...d, ...cambio }));

  async function escoger(poner: (f: File) => void) {
    const archivo = await elegirArchivo(ACEPTA_DOCUMENTOS);
    if (!archivo) return;
    const revision = revisarDocumento(archivo.name, archivo.size, new Uint8Array(await archivo.slice(0, BYTES_DE_FIRMA).arrayBuffer()));
    setError(revision.ok ? null : revision.mensaje);
    if (revision.ok) poner(archivo);
  }

  async function guardar() {
    setIntentado(true);
    if (hayFaltas) return;
    setEnviando(true);
    setError(null);
    try {
      let actual = linea
        ? await api.requisiciones.occ.cambiarLinea(requisicionId, linea.id, { ...paraGuardar, version })
        : await api.requisiciones.occ.agregarLinea(requisicionId, { ...paraGuardar, version });
      // Cada adjunto reemplaza la línea (RF-37): se encadenan con la línea y la versión que deja el anterior.
      for (const [clase, archivo] of [['rut', rut], ['cuenta', cuenta]] as const) {
        if (archivo) actual = await api.requisiciones.occ.adjuntar(requisicionId, actual.lineaId, clase, archivo, actual.version);
      }
      alGuardar(linea ? 'Línea cambiada.' : 'Línea agregada.');
    } catch (fallo) {
      setError(mensajeDe(fallo));
      setEnviando(false);
    }
  }

  const adjunto = (titulo: string, nuevo: File | null, yaTiene: boolean, poner: (f: File) => void) => (
    <View style={estilos.adjunto}>
      <Boton titulo={nuevo || yaTiene ? `Cambiar ${titulo}` : `Adjuntar ${titulo}`} tono="secundario" onPress={() => escoger(poner)} />
      <Text style={estilos.apoyo}>{nuevo ? nuevo.name : yaTiene ? 'Ya adjunto.' : 'Opcional.'}</Text>
    </View>
  );

  return (
    <Modal titulo={linea ? `Cambiar la línea ${linea.numero}` : 'Agregar una línea'} onCerrar={alCerrar} amplia>
      <View style={estilos.fila}>
        <CampoDeFecha
          etiqueta="Fecha de solicitud *"
          valor={datos.fechaSolicitud}
          onChange={(fechaSolicitud) => cambiar({ fechaSolicitud })}
          max={fechaDeJornada()}
          error={ver(faltas.fechaSolicitud)}
        />
        <Campo etiqueta="Beneficiario" obligatorio valor={datos.beneficiario} onChange={(beneficiario) => cambiar({ beneficiario })} error={ver(faltas.beneficiario)} ancho={320} />
        <Campo etiqueta="Valor (pesos)" obligatorio valor={datos.valorTexto} onChange={(valorTexto) => cambiar({ valorTexto })} error={ver(faltas.valor)} ayuda="Sin centavos." ancho={180} />
      </View>
      <Campo etiqueta="Concepto" obligatorio valor={datos.concepto} onChange={(concepto) => cambiar({ concepto })} error={ver(faltas.concepto)} />
      <View style={estilos.fila}>
        <Campo
          etiqueta="Especificaciones"
          valor={datos.especificaciones}
          onChange={(especificaciones) => cambiar({ especificaciones })}
          ayuda="Por ejemplo, la placa: «Para Volqueta TAY 076»."
          ancho={360}
        />
        <Campo etiqueta="Proveedor" valor={datos.proveedor} onChange={(proveedor) => cambiar({ proveedor })} ancho={300} />
      </View>
      <Campo etiqueta="Observaciones" valor={datos.observaciones} onChange={(observaciones) => cambiar({ observaciones })} multilinea compacto />
      <View style={estilos.fila}>
        {adjunto('RUT', rut, Boolean(linea?.rutMediaId), setRut)}
        {adjunto('cuenta bancaria', cuenta, Boolean(linea?.cuentaMediaId), setCuenta)}
      </View>
      {error ? <Aviso tono="error">{error}</Aviso> : null}
      {intentado && hayFaltas ? <Aviso tono="error">Revise lo marcado en rojo.</Aviso> : null}
      <AccionesFormulario>
        <Boton titulo="Cancelar" tono="secundario" onPress={alCerrar} />
        <Boton titulo={enviando ? 'Guardando…' : linea ? 'Guardar cambios' : 'Agregar'} onPress={guardar} deshabilitado={enviando} />
      </AccionesFormulario>
    </Modal>
  );
}

/* ── Autorizar línea por línea (RF-26 a RF-33, RF-77) ── */

type Marcada = { respuesta: RespuestaDeLineaOcc | null; motivo: string };

export function VentanaAutorizarOcc({
  requisicionId,
  codigo,
  version,
  lineas,
  alCerrar,
  alGuardar,
}: {
  requisicionId: string;
  codigo: string;
  version: number;
  lineas: LineaOccEnElDetalle[];
  alCerrar: () => void;
  alGuardar: (mensaje: string) => void;
}) {
  const [marcadas, setMarcadas] = useState<Record<string, Marcada>>(
    Object.fromEntries(lineas.map((l) => [l.id, { respuesta: l.respuesta, motivo: l.motivoRespuesta ?? '' }])),
  );
  const [intentado, setIntentado] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  const cambiadas = lineas.filter((l) => {
    const m = marcadas[l.id];
    return m.respuesta !== null && (m.respuesta !== l.respuesta || (m.respuesta === 'no_autorizada' && m.motivo.trim() !== (l.motivoRespuesta ?? '')));
  });
  const sinMotivo = (l: LineaOccEnElDetalle) => marcadas[l.id].respuesta === 'no_autorizada' && !marcadas[l.id].motivo.trim();
  const faltan = lineas.filter((l) => marcadas[l.id].respuesta === null).length;
  const totalAutorizado = lineas.filter((l) => marcadas[l.id].respuesta === 'autorizada').reduce((a, l) => a + l.valor, 0);
  const marcar = (id: string, cambio: Partial<Marcada>) => setMarcadas((m) => ({ ...m, [id]: { ...m[id], ...cambio } }));

  async function guardar() {
    setIntentado(true);
    if (lineas.some(sinMotivo) || cambiadas.length === 0) return;
    setEnviando(true);
    setError(null);
    try {
      const r = await api.requisiciones.occ.responder(requisicionId, {
        version,
        respuestas: cambiadas.map((l) => ({ lineaId: l.id, respuesta: marcadas[l.id].respuesta as RespuestaDeLineaOcc, motivo: marcadas[l.id].motivo })),
      });
      alGuardar(
        r.estado === 'en_autorizacion'
          ? `Respuestas guardadas. Faltan ${r.faltan} por responder.`
          : r.estado === 'autorizada'
            ? `${codigo} autorizada: pasa a Tesorería para pagar.`
            : `${codigo} quedó sin ninguna línea autorizada.`,
      );
    } catch (fallo) {
      setError(mensajeDe(fallo));
      setEnviando(false);
    }
  }

  return (
    <Modal titulo={`Autorizar ${codigo} línea por línea`} onCerrar={alCerrar} amplia>
      <Text style={estilos.texto}>
        {`Marque cada línea. Lo NO autorizado lleva su motivo. Puede guardar una parte y seguir después. Autorizado hasta ahora: ${enPesos(totalAutorizado)} · faltan ${faltan}.`}
      </Text>
      {lineas.map((l) => (
        <View key={l.id} style={estilos.lineaAutorizar}>
          <View style={estilos.lineaDatos}>
            <Text style={estilos.fuerte}>{`${l.numero}. ${l.beneficiario} · ${enPesos(l.valor)}`}</Text>
            <Text style={estilos.apoyo}>{[l.concepto, l.especificaciones, l.proveedor].filter(Boolean).join(' · ')}</Text>
            <Text style={estilos.apoyo}>{`RUT: ${l.rutMediaId ? 'sí' : 'no'} · Cuenta: ${l.cuentaMediaId ? 'sí' : 'no'}`}</Text>
          </View>
          <View style={estilos.fila}>
            <Selector
              etiqueta="Respuesta"
              valor={marcadas[l.id].respuesta}
              opciones={[
                { valor: 'autorizada', etiqueta: 'Autorizado' },
                { valor: 'no_autorizada', etiqueta: 'NO Autorizado' },
              ]}
              onChange={(v) => marcar(l.id, { respuesta: (v as RespuestaDeLineaOcc | null) ?? null })}
              permiteVacio
              vacio="Sin responder"
              ancho={180}
            />
            {marcadas[l.id].respuesta === 'no_autorizada' ? (
              <Campo
                etiqueta="Motivo"
                obligatorio
                valor={marcadas[l.id].motivo}
                onChange={(motivo) => marcar(l.id, { motivo })}
                error={intentado && sinMotivo(l) ? 'Diga por qué no se autoriza.' : undefined}
                ancho={360}
              />
            ) : null}
          </View>
        </View>
      ))}
      {intentado && cambiadas.length === 0 && !lineas.some(sinMotivo) ? <Aviso tono="error">Marque al menos una línea.</Aviso> : null}
      {error ? <Aviso tono="error">{error}</Aviso> : null}
      <AccionesFormulario>
        <Boton titulo="Volver" tono="secundario" onPress={alCerrar} />
        <Boton titulo={enviando ? 'Guardando…' : 'Guardar respuestas'} onPress={guardar} deshabilitado={enviando} />
      </AccionesFormulario>
    </Modal>
  );
}

/* ── Registrar un pago de una línea (RF-44, RF-80) ── */

export function VentanaPagoOcc({
  requisicionId,
  codigo,
  version,
  linea,
  alCerrar,
  alPagar,
}: {
  requisicionId: string;
  codigo: string;
  version: number;
  linea: { id: string; numero: number; beneficiario: string; porPagar: number };
  alCerrar: () => void;
  alPagar: (mensaje: string) => void;
}) {
  const [fecha, setFecha] = useState(fechaDeJornada());
  const [valor, setValor] = useState(String(linea.porPagar));
  const [medio, setMedio] = useState<string | null>('transferencia');
  const [referencia, setReferencia] = useState('');
  const [comprobante, setComprobante] = useState<File | null>(null);
  const [intentado, setIntentado] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const datos = { fecha, valor: aPesosOcc(valor) ?? Number.NaN, medio: medio ?? '', referencia };
  const faltas = faltasDelPago(datos, linea.porPagar);

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
      const comprobanteMediaId = comprobante ? (await api.requisiciones.occ.subirComprobante(requisicionId, comprobante)).mediaId : null;
      const r = await api.requisiciones.occ.pagar(requisicionId, linea.id, { ...datos, version, comprobanteMediaId });
      alPagar(`Pago de ${enPesos(datos.valor)} a ${linea.beneficiario} registrado${r.estado === 'pagada' ? `: ${codigo} quedó pagada` : ''}.`);
    } catch (fallo) {
      setError(mensajeDe(fallo));
      setEnviando(false);
    }
  }

  return (
    <Modal titulo={`Pagar la línea ${linea.numero} · ${codigo}`} onCerrar={alCerrar}>
      <Text style={estilos.texto}>{`${linea.beneficiario}: falta por pagar ${enPesos(linea.porPagar)}. Para un anticipo, baje el valor.`}</Text>
      <View style={estilos.fila}>
        <Campo etiqueta="Valor (pesos)" obligatorio valor={valor} onChange={setValor} ancho={200} />
        <CampoDeFecha etiqueta="Fecha del pago" valor={fecha} onChange={setFecha} max={fechaDeJornada()} />
      </View>
      <View style={estilos.fila}>
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
      <View style={estilos.adjunto}>
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

const estilos = StyleSheet.create({
  // Alineados por arriba: un campo con error o con ayuda debajo no corre a sus vecinos.
  fila: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'flex-start', gap: Spacing.two },
  adjunto: { gap: Spacing.one, alignItems: 'flex-start' },
  lineaAutorizar: { gap: Spacing.one, paddingVertical: Spacing.two, borderBottomWidth: 1, borderBottomColor: Panel.borde },
  lineaDatos: { gap: Spacing.half },
  texto: { fontFamily: FuentePanel.texto, fontSize: TextoPanel.cuerpo, color: Panel.texto },
  fuerte: { fontFamily: FuentePanel.texto, fontSize: TextoPanel.cuerpo, fontWeight: '600', color: Panel.texto },
  apoyo: { fontFamily: FuentePanel.texto, fontSize: TextoPanel.apoyo, color: Panel.textoApoyo },
});
