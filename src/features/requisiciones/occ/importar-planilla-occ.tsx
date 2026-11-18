/**
 * Importar la planilla de requisición de pagos de OCC con IA (spec 047, RF-59 a RF-70, D7 a D9).
 *
 * Tres momentos en una sola ventana: escoger el Excel, esperar la lectura —que sigue en el servidor
 * aunque se cierre la ventana— y revisar lo que la IA propone. Nada entra sin confirmar (RF-62): las
 * líneas se pueden corregir o sacar de la propuesta, y lo que la IA no pudo leer llega vacío y marcado
 * para llenarlo (RF-63). Confirmadas, son líneas como cualquier otra (RF-70).
 *
 * Desde una requisición, las líneas van al final de esa. Desde la lista, la planilla crea la del
 * viernes escogido; si ya hay una abierta para ese viernes, se ofrece agregarlas a esa (RF-8, RF-60).
 */
import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { FuentePanel, Panel, Spacing, TextoPanel } from '@/constants/theme';
import { useAvisos } from '@/features/panel/avisos';
import { elegirArchivo } from '@/features/contratos/elegir-archivo';
import { api, ErrorApi, mensajeDe } from '@/features/panel/cliente-api';
import { AccionesFormulario, Aviso, Boton, Campo, CampoDeFecha, Etiqueta, Formulario, Modal } from '@/features/panel/componentes';
import type { ImportacionOccDetalle, RequisicionOccExistente } from '@/features/panel/requisiciones-occ';
import { fechaDeJornada } from '@/shared/rules/jornada';
import { enPesos } from '@/shared/rules/pesos';
import { faltaDelViernes, faltasDeLasLineasOcc, type DatosDeLineaOcc } from '@/shared/rules/requisicion-occ';
import type { CampoMarcadoOcc } from '@/shared/rules/requisicion-occ-ia';

import { aPesosOcc, proximoViernes } from './ventanas-occ';

/** Cada cuánto se pregunta cómo va la lectura. */
const CADA_CUANTO_MS = 2500;

type LineaEnRevision = Omit<DatosDeLineaOcc, 'valor'> & { cita: string; marcados: CampoMarcadoOcc[]; valorTexto: string };

const NOMBRE_DEL_MARCADO: Record<CampoMarcadoOcc, string> = {
  fechaSolicitud: 'la fecha',
  beneficiario: 'el beneficiario',
  concepto: 'el concepto',
  valor: 'el valor',
};

export function ImportarPlanillaOcc({
  requisicionId,
  alCerrar,
  alConfirmar,
}: {
  /** La requisición a la que van las líneas; sin ella, se crea la del viernes. */
  requisicionId?: string;
  alCerrar: () => void;
  alConfirmar: (mensaje: string, requisicionId: string) => void;
}) {
  const [importacionId, setImportacionId] = useState<string | null>(null);
  const [detalle, setDetalle] = useState<ImportacionOccDetalle | null>(null);
  const [lineas, setLineas] = useState<LineaEnRevision[]>([]);
  const [viernes, setViernes] = useState(proximoViernes());
  const [existente, setExistente] = useState<RequisicionOccExistente['existente'] | null>(null);
  const [error, setError] = useState<string | null>(null);
  // Spec 050, RF-57: un fallo al guardar va al aviso de abajo, que se queda hasta que se cierra.
  const avisos = useAvisos();
  const [intentado, setIntentado] = useState(false);
  const [enviando, setEnviando] = useState(false);

  // La lectura sigue en el servidor: se pregunta cada poco hasta que termine.
  useEffect(() => {
    if (!importacionId || (detalle && detalle.estado !== 'en_curso')) return;
    const espera = setTimeout(async () => {
      try {
        const d = await api.requisiciones.occ.importaciones.de(importacionId);
        setDetalle(d);
        if (d.estado === 'lista' && d.propuesta) {
          setLineas(d.propuesta.lineas.map(({ valor, ...l }) => ({ ...l, valorTexto: valor === null ? '' : String(valor) })));
          // RF-60: el viernes del archivo, si lo es; si no, el próximo.
          if (!d.propuesta.viernesMarcado && d.propuesta.viernes >= fechaDeJornada()) setViernes(d.propuesta.viernes);
        }
      } catch (fallo) {
        setError(mensajeDe(fallo));
      }
    }, CADA_CUANTO_MS);
    return () => clearTimeout(espera);
  }, [importacionId, detalle]);

  async function escoger() {
    const archivo = await elegirArchivo('.xlsx');
    if (!archivo) return;
    setError(null);
    setEnviando(true);
    try {
      const { importacionId: id } = await api.requisiciones.occ.importaciones.subir(archivo, requisicionId);
      setDetalle({ id, requisicionId: requisicionId ?? null, nombreArchivo: archivo.name, estado: 'en_curso', error: null, propuesta: null, version: 1 });
      setImportacionId(id);
    } catch (fallo) {
      avisos.error(mensajeDe(fallo));
    } finally {
      setEnviando(false);
    }
  }

  const paraConfirmar: DatosDeLineaOcc[] = lineas.map(({ cita: _cita, marcados: _marcados, valorTexto, ...l }) => ({ ...l, valor: aPesosOcc(valorTexto) }));
  const faltas = faltasDeLasLineasOcc(paraConfirmar);
  const faltaViernes = requisicionId ? null : faltaDelViernes(viernes);

  async function confirmar(en?: string) {
    if (!detalle) return;
    setIntentado(true);
    if (faltas.length || (!en && faltaViernes) || lineas.length === 0) return;
    setEnviando(true);
    setError(null);
    try {
      const r = await api.requisiciones.occ.importaciones.confirmar(detalle.id, {
        version: detalle.version,
        lineas: paraConfirmar,
        ...(en ? { requisicionId: en } : requisicionId ? {} : { viernes }),
      });
      alConfirmar(`${lineas.length} ${lineas.length === 1 ? 'línea importada' : 'líneas importadas'} de «${detalle.nombreArchivo}».`, r.requisicionId);
    } catch (fallo) {
      const cuerpo = fallo instanceof ErrorApi ? (fallo.cuerpo as Partial<RequisicionOccExistente> | undefined) : undefined;
      setExistente(cuerpo?.existente ?? null);
      avisos.error(mensajeDe(fallo));
      setEnviando(false);
    }
  }

  async function descartar() {
    if (detalle && detalle.estado !== 'confirmada') {
      await api.requisiciones.occ.importaciones.descartar(detalle.id).catch(() => undefined);
    }
    alCerrar();
  }

  const cambiar = (i: number, cambio: Partial<LineaEnRevision>) => setLineas((todas) => todas.map((l, j) => (j === i ? { ...l, ...cambio } : l)));
  const marcado = (l: LineaEnRevision, campo: CampoMarcadoOcc) => l.marcados.includes(campo);
  const total = paraConfirmar.reduce((a, l) => a + (l.valor ?? 0), 0);
  const conExistente = existente && (existente.estado === 'borrador' || existente.estado === 'devuelta') ? existente : null;

  return (
    <Modal titulo="Importar la planilla de requisición" onCerrar={detalle?.estado === 'lista' ? descartar : alCerrar} amplia>
      {!detalle ? (
        <>
          <Text style={estilos.texto}>
            Suba la planilla de requisición de pagos de OCC en Excel (.xlsx). La IA lee sus líneas y se las muestra para revisarlas antes de agregarlas.
          </Text>
          <View style={estilos.inicio}>
            <Boton titulo={enviando ? 'Subiendo…' : 'Escoger la planilla'} onPress={escoger} deshabilitado={enviando} />
          </View>
        </>
      ) : detalle.estado === 'en_curso' ? (
        <Aviso tono="info">{`Leyendo «${detalle.nombreArchivo}»… suele tardar menos de un minuto. Puede cerrar esta ventana: la lectura sigue.`}</Aviso>
      ) : detalle.estado !== 'lista' ? (
        <>
          <Aviso tono="error">{detalle.error ?? 'No se pudo leer la planilla.'}</Aviso>
          <Text style={estilos.texto}>Puede subirla otra vez o seguir armando la requisición a mano.</Text>
        </>
      ) : (
        <>
          <Text style={estilos.texto}>{`«${detalle.nombreArchivo}»: ${lineas.length} líneas por ${enPesos(total)}. Revíselas; lo marcado hay que mirarlo.`}</Text>
          {detalle.propuesta?.avisos.map((a) => (
            <Aviso key={a} tono="info">
              {a}
            </Aviso>
          ))}
          {requisicionId ? null : (
            <CampoDeFecha etiqueta="Viernes de entrega" obligatorio valor={viernes} onChange={setViernes} min={fechaDeJornada()} error={intentado ? (faltaViernes ?? undefined) : undefined} />
          )}
          {lineas.map((l, i) => (
            <View key={`${l.cita}-${i}`} style={[estilos.linea, l.marcados.length > 0 && estilos.lineaMarcada]}>
              <View style={estilos.cabeceraLinea}>
                <Text style={estilos.fuerte}>{`Línea ${i + 1}`}</Text>
                <Text style={estilos.apoyo}>{`Fila ${l.cita.replace(/^H\d+F/, '')} de la planilla`}</Text>
                {l.marcados.length ? <Etiqueta tono="atencion">{`Revisar ${l.marcados.map((m) => NOMBRE_DEL_MARCADO[m]).join(', ')}`}</Etiqueta> : null}
                <Boton titulo="Sacar de la propuesta" tono="secundario" onPress={() => setLineas((todas) => todas.filter((_, j) => j !== i))} />
              </View>
              <Formulario desnudo>
                <CampoDeFecha etiqueta={marcado(l, 'fechaSolicitud') ? 'Fecha de solicitud (revisar)' : 'Fecha de solicitud'} valor={l.fechaSolicitud} onChange={(fechaSolicitud) => cambiar(i, { fechaSolicitud })} max={fechaDeJornada()} />
                <Campo etiqueta={marcado(l, 'beneficiario') ? 'Beneficiario (revisar)' : 'Beneficiario'} valor={l.beneficiario} onChange={(beneficiario) => cambiar(i, { beneficiario })} ancho={260} />
                <Campo etiqueta={marcado(l, 'valor') ? 'Valor (revisar)' : 'Valor'} valor={l.valorTexto} onChange={(valorTexto) => cambiar(i, { valorTexto })} ancho={150} />
              </Formulario>
              <Campo etiqueta={marcado(l, 'concepto') ? 'Concepto (revisar)' : 'Concepto'} valor={l.concepto} onChange={(concepto) => cambiar(i, { concepto })} />
              <Formulario desnudo>
                <Campo etiqueta="Especificaciones" valor={l.especificaciones} onChange={(especificaciones) => cambiar(i, { especificaciones })} ancho={300} />
                <Campo etiqueta="Proveedor" valor={l.proveedor} onChange={(proveedor) => cambiar(i, { proveedor })} ancho={260} />
                <Campo etiqueta="Observaciones" valor={l.observaciones} onChange={(observaciones) => cambiar(i, { observaciones })} ancho={300} />
              </Formulario>
            </View>
          ))}
          {intentado && faltas.length ? <Aviso tono="error">{faltas.slice(0, 5).join(' ')}</Aviso> : null}
        </>
      )}
      {error ? <Aviso tono="error">{error}</Aviso> : null}
      <AccionesFormulario>
        <Boton titulo={detalle?.estado === 'lista' ? 'Descartar' : 'Cerrar'} tono="secundario" onPress={detalle?.estado === 'lista' ? descartar : alCerrar} />
        {detalle && detalle.estado !== 'lista' && detalle.estado !== 'en_curso' ? (
          <Boton
            titulo="Subir otra"
            tono="secundario"
            onPress={() => {
              setDetalle(null);
              setImportacionId(null);
            }}
          />
        ) : null}
        {conExistente ? <Boton titulo={`Agregar a ${conExistente.codigo}`} tono="secundario" onPress={() => confirmar(conExistente.id)} deshabilitado={enviando} /> : null}
        {detalle?.estado === 'lista' ? (
          <Boton titulo={enviando ? 'Agregando…' : `Agregar ${lineas.length} ${lineas.length === 1 ? 'línea' : 'líneas'}`} onPress={() => confirmar()} deshabilitado={enviando || lineas.length === 0} />
        ) : null}
      </AccionesFormulario>
    </Modal>
  );
}

const estilos = StyleSheet.create({
  inicio: { alignItems: 'flex-start' },
  fila: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'flex-end', gap: Spacing.two },
  linea: { gap: Spacing.one, paddingVertical: Spacing.two, paddingHorizontal: Spacing.two, borderTopWidth: 1, borderTopColor: Panel.borde },
  lineaMarcada: { borderLeftWidth: 4, borderLeftColor: Panel.accion },
  cabeceraLinea: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: Spacing.two },
  texto: { fontFamily: FuentePanel.texto, fontSize: TextoPanel.cuerpo, color: Panel.texto },
  fuerte: { fontFamily: FuentePanel.texto, fontSize: TextoPanel.cuerpo, fontWeight: '600', color: Panel.texto },
  apoyo: { fontFamily: FuentePanel.texto, fontSize: TextoPanel.apoyo, color: Panel.textoApoyo },
});
