/**
 * Pedir un pago o corregir una solicitud devuelta (spec 037, RF-6 a RF-9).
 *
 * Como el formulario de Compras (036): lo que impide enviarla lo dicen las mismas reglas del
 * servidor (`faltasDelPagoPorCampo`), cada falta junto a su campo después del primer
 * intento, y los adjuntos (la cuenta de cobro, la factura, el RUT, la certificación
 * bancaria) se suben después de guardar, porque son de la solicitud. El comprobante de pago
 * no se ofrece aquí: lo sube Tesorería al pagar.
 *
 * Spec 046: con `requisicion` es una requisición de pago de una obra o de GeoLab: los mismos
 * campos (RF-14), creada por Requisiciones.
 *
 * Spec 048: una de obra dice a qué parte de la planificación va (RF-3), con lo que queda si quien
 * pide ve valores; al corregirla trae lo que tenía (RF-10).
 */
import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { FuentePanel, Panel, Spacing, TextoPanel } from '@/constants/theme';
import { useAvisos } from '@/features/panel/avisos';
import { elegirArchivo } from '@/features/contratos/elegir-archivo';
import { api, mensajeDe, type LugarDeLasSolicitudes } from '@/features/panel/cliente-api';
import type { LugarDeRequisiciones, OpcionesParaImputar } from '@/features/panel/requisiciones';
import { usePersona } from '@/features/panel/sesion';
import {
  CampoDeImputacion,
  IMPUTACION_VACIA,
  imputacionAPedir,
  type ImputacionEscrita,
} from '@/features/requisiciones/campo-de-imputacion';
import { veLosValores } from '@/shared/rules/compras';
import { imputacionPropuesta, type ImputacionDelRenglon } from '@/shared/rules/requisicion-planificacion';
import { AccionesFormulario, ANCHOS_DE_CAMPO, Aviso, Boton, Campo, CampoDeFecha, Casilla, Formulario, Modal, Selector } from '@/features/panel/componentes';
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
  requisicion = false,
}: {
  lugar: LugarDeLasSolicitudes;
  /** Spec 046: es una requisición de pago. */
  requisicion?: boolean;
  /** Para corregir: la solicitud como está, con su versión. Sin ella, es una nueva. */
  inicial?: { id: string; codigo: string; version: number; datos: DatosDeLaSolicitudDePago; imputacion?: ImputacionDelRenglon | null };
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
  // Spec 050, RF-57: un fallo al guardar va al aviso de abajo, que se queda hasta que se cierra.
  const avisos = useAvisos();
  const [enviando, setEnviando] = useState(false);

  // Spec 048: solo las de obra se imputan (RF-1, RF-3).
  const persona = usePersona();
  const obraId = 'obraId' in lugar ? lugar.obraId : null;
  const deObra = requisicion && obraId !== null;
  const [imputacion, setImputacion] = useState<ImputacionEscrita>(() => {
    const propuesta = imputacionPropuesta(inicial?.imputacion ?? null);
    if (!propuesta) return IMPUTACION_VACIA;
    return propuesta.llave ? { llave: propuesta.llave, fuera: false, explicacion: '' } : { llave: null, fuera: true, explicacion: propuesta.explicacion ?? '' };
  });
  const [imputables, setImputables] = useState<OpcionesParaImputar | null>(null);
  useEffect(() => {
    if (!deObra || !obraId) return;
    let vigente = true;
    api.requisiciones
      .imputables(obraId)
      .then((r) => vigente && setImputables(r))
      .catch((fallo) => vigente && setError(mensajeDe(fallo)));
    return () => {
      vigente = false;
    };
  }, [deObra, obraId]);

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
  // RF-3, RF-4: con planificación, va a algo; «Fuera de lo planeado» explica por qué.
  const faltaDeImputacion = !deObra || !imputables?.hayPlanificacion
    ? null
    : imputacion.fuera
      ? imputacion.explicacion.trim()
        ? null
        : 'Explique por qué no cabe.'
      : imputacion.llave
        ? null
        : 'Escoja a qué va, o «Fuera de lo planeado».';
  const hayFaltas =
    Object.values(faltas).some((f) => f !== null) ||
    faltaDeImputacion !== null ||
    (deObra && imputables === null) ||
    adjuntos.some((a) => !a.clase);
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
        await api.tesoreria.corregir(inicial.id, {
          ...datos,
          version: inicial.version,
          ...(deObra ? { imputacion: imputacionAPedir(imputacion) } : {}),
        });
        guardada = { id: inicial.id, codigo: inicial.codigo };
      } else {
        guardada = requisicion
          ? await api.requisiciones.crear(lugar as LugarDeRequisiciones, {
              tipo: 'pago',
              ...datos,
              ...(deObra ? { imputacion: imputacionAPedir(imputacion) } : {}),
            })
          : await api.tesoreria.crear(lugar, datos);
      }
    } catch (fallo) {
      avisos.error(mensajeDe(fallo));
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
    const cual = requisicion ? 'Requisición' : 'Solicitud';
    const hecho = inicial ? `${cual} ${guardada.codigo} corregida y enviada otra vez.` : `${cual} ${guardada.codigo} enviada.`;
    alGuardar(sinSubir.length ? `${hecho} No se pudo adjuntar: ${sinSubir.join(', ')}.` : hecho);
  }

  return (
    <Modal
      titulo={inicial ? `Corregir ${inicial.codigo}` : requisicion ? 'Nueva requisición de pago' : 'Nueva solicitud de pago'}
      onCerrar={alCerrar}
      amplia
    >
      {/* Spec 050, RF-25: en rejilla, con los anchos de la escala. */}
      <Formulario desnudo>
        <Campo etiqueta="A quién se le paga" obligatorio valor={beneficiario} onChange={setBeneficiario} error={ver(faltas.beneficiario)} />
        <Campo etiqueta="NIT o cédula" valor={documento} onChange={setDocumento} ayuda="Opcional." ancho={ANCHOS_DE_CAMPO.medio} />
      </Formulario>
      <Formulario desnudo>
        <Selector
          etiqueta="Concepto"
          obligatorio
          valor={concepto}
          opciones={CONCEPTOS_DE_PAGO.map((c) => ({ valor: c.id, etiqueta: c.nombre }))}
          onChange={setConcepto}
          vacio="Elija el concepto"
          error={ver(faltas.concepto)}
          ancho={ANCHOS_DE_CAMPO.medio}
        />
        <Campo etiqueta="Valor (pesos)" obligatorio valor={valor} onChange={setValor} error={ver(faltas.valor)} ayuda="Sin centavos." ancho={ANCHOS_DE_CAMPO.medio} />
      </Formulario>
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
      {/* La fecha con la casilla al lado es una fila mixta: se queda en su fila. El «*» lo pone `obligatorio` (RF-18). */}
      <View style={estilos.fila}>
        <CampoDeFecha etiqueta="Para cuándo" obligatorio valor={paraCuando} onChange={setParaCuando} min={fechaDeJornada()} error={ver(faltas.paraCuando)} />
        <View style={estilos.casilla}>
          <Casilla etiqueta="Es urgente" marcada={urgente} onChange={setUrgente} />
        </View>
      </View>

      {deObra ? (
        <>
          <Text style={estilos.subtitulo}>A qué parte de la planificación va</Text>
          <CampoDeImputacion
            opciones={imputables}
            valor={imputacion}
            onChange={setImputacion}
            conValores={veLosValores(persona.rol)}
            pideEstaRequisicion={Number.isFinite(datos.valor) ? datos.valor : 0}
            error={ver(faltaDeImputacion)}
          />
        </>
      ) : null}

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
        <Boton
          titulo={enviando ? 'Enviando…' : inicial ? 'Corregir y enviar' : requisicion ? 'Enviar requisición' : 'Enviar solicitud'}
          onPress={enviar}
          deshabilitado={enviando}
        />
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
