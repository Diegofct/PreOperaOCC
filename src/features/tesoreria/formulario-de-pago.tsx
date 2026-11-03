/**
 * Pedir un pago o corregir una solicitud devuelta (spec 037, RF-6 a RF-9).
 *
 * Como el formulario de Compras (036): lo que impide enviarla lo dicen las mismas reglas del
 * servidor (`faltasDelPagoPorCampo`), cada falta junto a su campo después del primer
 * intento, y los adjuntos (la cuenta de cobro, la factura, el RUT, la certificación
 * bancaria) se suben después de guardar, porque son de la solicitud. El comprobante de pago
 * no se ofrece aquí: lo sube Tesorería al pagar.
 */
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { FuentePanel, Panel, Spacing, TextoPanel } from '@/constants/theme';
import { elegirArchivo } from '@/features/contratos/elegir-archivo';
import { api, mensajeDe, type LugarDeLasSolicitudes } from '@/features/panel/cliente-api';
import { AccionesFormulario, Aviso, Boton, Campo, CampoDeFecha, Casilla, Modal, Selector } from '@/features/panel/componentes';
import { ACEPTA_DOCUMENTOS, BYTES_DE_FIRMA, clasesDe, revisarDocumento } from '@/shared/rules/documentos';
import { fechaDeJornada } from '@/shared/rules/jornada';
import { CONCEPTOS_DE_PAGO, faltasDelPagoPorCampo, type DatosDeLaSolicitudDePago } from '@/shared/rules/pagos';

/** «1.850.000», «1850000» o «$ 1.850.000» → 1850000; vacío → no es un valor. */
const aPesos = (texto: string) => (texto.trim() ? Number(texto.replace(/[.\s$]/g, '')) : Number.NaN);

/** Las clases que se ofrecen al pedir: todas las del pago menos el comprobante, que es de Tesorería. */
const CLASES_AL_PEDIR = clasesDe('pago').filter((c) => c.id !== 'comprobante_de_pago');

export function FormularioDePago({
  lugar,
  inicial,
  alCerrar,
  alGuardar,
}: {
  lugar: LugarDeLasSolicitudes;
  /** Para corregir: la solicitud como está, con su versión. Sin ella, es una nueva. */
  inicial?: { id: string; codigo: string; version: number; datos: DatosDeLaSolicitudDePago };
  alCerrar: () => void;
  /** Con el mensaje para la pantalla: qué quedó y, si algo no subió, qué. */
  alGuardar: (mensaje: string) => void;
}) {
  const [beneficiario, setBeneficiario] = useState(inicial?.datos.beneficiario ?? '');
  const [documento, setDocumento] = useState(inicial?.datos.beneficiarioDocumento ?? '');
  const [concepto, setConcepto] = useState<string | null>(inicial?.datos.concepto ?? null);
  const [paraQue, setParaQue] = useState(inicial?.datos.paraQue ?? '');
  const [valor, setValor] = useState(inicial ? String(inicial.datos.valor) : '');
  const [paraCuando, setParaCuando] = useState(inicial?.datos.paraCuando ?? '');
  const [urgente, setUrgente] = useState(inicial?.datos.urgente ?? false);
  const [adjuntos, setAdjuntos] = useState<{ archivo: File; clase: string | null }[]>([]);
  const [intentado, setIntentado] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  const datos: DatosDeLaSolicitudDePago = {
    beneficiario,
    beneficiarioDocumento: documento,
    concepto: concepto ?? '',
    paraQue,
    valor: aPesos(valor),
    paraCuando,
    urgente,
  };
  const faltas = faltasDelPagoPorCampo(datos);
  const hayFaltas = Object.values(faltas).some((f) => f !== null) || adjuntos.some((a) => !a.clase);
  const ver = (falta: string | null) => (intentado ? (falta ?? undefined) : undefined);

  async function adjuntar() {
    const elegido = await elegirArchivo(ACEPTA_DOCUMENTOS);
    if (!elegido) return;
    const cabecera = new Uint8Array(await elegido.slice(0, BYTES_DE_FIRMA).arrayBuffer());
    const revision = revisarDocumento(elegido.name, elegido.size, cabecera);
    if (!revision.ok) {
      setError(revision.mensaje);
      return;
    }
    setError(null);
    // La primera suele ser la cuenta de cobro: se propone, y se cambia si no.
    setAdjuntos((todos) => [...todos, { archivo: elegido, clase: todos.length === 0 ? 'cuenta_de_cobro' : null }]);
  }

  async function enviar() {
    setIntentado(true);
    if (hayFaltas) return;
    setEnviando(true);
    setError(null);
    let guardada: { id: string; codigo: string };
    try {
      if (inicial) {
        await api.tesoreria.corregir(inicial.id, { ...datos, version: inicial.version });
        guardada = { id: inicial.id, codigo: inicial.codigo };
      } else {
        guardada = await api.tesoreria.crear(lugar, datos);
      }
    } catch (fallo) {
      setError(mensajeDe(fallo));
      setEnviando(false);
      return;
    }
    // La solicitud ya quedó: lo que no suba se dice, pero no la deshace.
    const sinSubir: string[] = [];
    for (const { archivo, clase } of adjuntos) {
      try {
        await api.documentos.subir(
          { solicitudPagoId: guardada.id },
          {
            clase: clase ?? '',
            nombre: archivo.name.replace(/\.[^.]+$/, ''),
            fecha: fechaDeJornada(),
            vence: '',
            proveedor: beneficiario.trim(),
            descripcion: '',
          },
          archivo,
          archivo.name,
        );
      } catch (fallo) {
        sinSubir.push(`«${archivo.name}» (${mensajeDe(fallo)})`);
      }
    }
    setEnviando(false);
    const hecho = inicial ? `Solicitud ${guardada.codigo} corregida y enviada otra vez.` : `Solicitud ${guardada.codigo} enviada.`;
    alGuardar(sinSubir.length ? `${hecho} No se pudo adjuntar: ${sinSubir.join(', ')}.` : hecho);
  }

  return (
    <Modal titulo={inicial ? `Corregir ${inicial.codigo}` : 'Nueva solicitud de pago'} onCerrar={alCerrar} amplia>
      <View style={estilos.fila}>
        <Campo etiqueta="A quién se le paga" obligatorio valor={beneficiario} onChange={setBeneficiario} error={ver(faltas.beneficiario)} ancho={320} />
        <Campo etiqueta="NIT o cédula" valor={documento} onChange={setDocumento} ayuda="Opcional." ancho={200} />
      </View>
      <View style={estilos.fila}>
        <Selector
          etiqueta="Concepto"
          obligatorio
          valor={concepto}
          opciones={CONCEPTOS_DE_PAGO.map((c) => ({ valor: c.id, etiqueta: c.nombre }))}
          onChange={setConcepto}
          vacio="Elija el concepto"
          error={ver(faltas.concepto)}
          ancho={280}
        />
        <Campo etiqueta="Valor (pesos)" obligatorio valor={valor} onChange={setValor} error={ver(faltas.valor)} ayuda="Sin centavos." ancho={200} />
      </View>
      <Campo
        etiqueta="Para qué"
        obligatorio
        valor={paraQue}
        onChange={setParaQue}
        multilinea
        compacto
        error={ver(faltas.paraQue)}
        ayuda="Por ejemplo: acarreo de material de la cantera a la obra."
      />
      <View style={estilos.fila}>
        <CampoDeFecha etiqueta="Para cuándo *" valor={paraCuando} onChange={setParaCuando} min={fechaDeJornada()} error={ver(faltas.paraCuando)} />
        <View style={estilos.casilla}>
          <Casilla etiqueta="Es urgente" marcada={urgente} onChange={setUrgente} />
        </View>
      </View>

      <Text style={estilos.subtitulo}>Adjuntos</Text>
      {adjuntos.map((a, i) => (
        <View key={`${a.archivo.name}-${i}`} style={estilos.fila}>
          <Text style={estilos.archivo}>{a.archivo.name}</Text>
          <Selector
            etiqueta="Clase"
            valor={a.clase}
            opciones={CLASES_AL_PEDIR.map((c) => ({ valor: c.id, etiqueta: c.nombre }))}
            onChange={(clase) => setAdjuntos((todos) => todos.map((x, j) => (j === i ? { ...x, clase } : x)))}
            vacio="Elija la clase"
            error={intentado && !a.clase ? 'Elija la clase.' : undefined}
            ancho={220}
          />
          <Boton titulo="Quitar" tono="secundario" onPress={() => setAdjuntos((todos) => todos.filter((_, j) => j !== i))} />
        </View>
      ))}
      <View style={estilos.inicio}>
        <Boton titulo="Adjuntar archivo" tono="secundario" onPress={adjuntar} />
        <Text style={estilos.apoyo}>
          Cuenta de cobro, factura, RUT o certificación bancaria. PDF, imagen, Word o Excel, hasta 20 MB.
        </Text>
      </View>

      {error ? <Aviso tono="error">{error}</Aviso> : null}
      {intentado && hayFaltas ? <Aviso tono="error">Revise lo marcado en rojo.</Aviso> : null}
      <AccionesFormulario>
        <Boton titulo="Cancelar" tono="secundario" onPress={alCerrar} />
        <Boton titulo={enviando ? 'Enviando…' : inicial ? 'Corregir y enviar' : 'Enviar solicitud'} onPress={enviar} deshabilitado={enviando} />
      </AccionesFormulario>
    </Modal>
  );
}

const estilos = StyleSheet.create({
  subtitulo: { fontFamily: FuentePanel.texto, fontSize: TextoPanel.cuerpo, fontWeight: '600', color: Panel.texto, marginTop: Spacing.two },
  fila: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'flex-end', gap: Spacing.two },
  casilla: { paddingBottom: Spacing.two },
  inicio: { gap: Spacing.one, alignItems: 'flex-start' },
  archivo: { fontFamily: FuentePanel.texto, fontSize: TextoPanel.cuerpo, color: Panel.texto, minWidth: 200, paddingBottom: Spacing.two },
  apoyo: { fontFamily: FuentePanel.texto, fontSize: TextoPanel.apoyo, color: Panel.textoApoyo },
});
