/**
 * La cadena de una requisición y decidirla en su paso (spec 046, RF-25 a RF-34, RF-46, RF-76 a
 * RF-82). Lo usan los detalles de la 036 y la 037: la requisición vive en esas tablas, y estos son
 * los dos trozos que le añade la 046.
 *
 * ── La cadena ──
 *
 * Cada paso de la vuelta actual, con quién lo ocupa y si ya aprobó, si se saltó, si está ahí o si
 * falta (RF-33, RF-46). Lo arma el servidor con la historia (`cadenaDesdeLaHistoria`).
 *
 * ── Decidir ──
 *
 * Los botones salen solo a quien le toca (`puedeDecidir`, que calculó el servidor con la misma
 * regla que lo va a comprobar): quien ocupa el paso, o la Gerencia, y nunca quien la pidió (RF-25,
 * RF-26, RF-76). Devolver y rechazar piden el motivo (RF-30, RF-32). Al aprobar, cambiar lo pedido
 * —bajar cantidades, quitar renglones, un valor menor— solo se ofrece a quien puede (`puedeRecortar`:
 * la Administradora en su paso o la Gerencia, RF-34, RF-79, RF-80); los demás aprueban tal cual.
 *
 * ── La planificación al aprobar (spec 048) ──
 *
 * Si a un renglón le falta su valor estimado —lo pidió el Almacenista—, la ventana lo pide y no
 * aprueba sin él (RF-14, RF-15): el servidor solo acepta los que faltan (RF-17). Quien puede
 * recortar puede también cambiar a qué parte de la planificación va cada renglón, y queda en la
 * historia (RF-36, RF-37, RF-64); los demás, si no les cuadra, devuelven (RF-38).
 */
import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { FuentePanel, Panel, Spacing, TextoPanel } from '@/constants/theme';
import { VentanaDeMotivo } from '@/features/compras/vista-de-la-solicitud';
import { api, mensajeDe } from '@/features/panel/cliente-api';
import { AccionesFormulario, Aviso, Boton, Campo, Etiqueta, Modal, Seccion } from '@/features/panel/componentes';
import type { CadenaDeLaRequisicion, OpcionesParaImputar, RequisicionEnElDetalle } from '@/features/panel/requisiciones';
import { usePersona } from '@/features/panel/sesion';
import { veLosValores } from '@/shared/rules/compras';
import { enPesos } from '@/shared/rules/pesos';
import { imputacionPropuesta, type ImputacionDelRenglon } from '@/shared/rules/requisicion-planificacion';

import { CampoDeImputacion, IMPUTACION_VACIA, imputacionAPedir, type ImputacionEscrita } from './campo-de-imputacion';
import type { TipoDeRequisicion } from '@/shared/rules/requisiciones';

type PasoDeLaVista = CadenaDeLaRequisicion['pasos'][number];

const COMO: Record<PasoDeLaVista['como'], { texto: string; tono: 'bueno' | 'atencion' | 'neutro' | 'malo' }> = {
  aprobado: { texto: 'Aprobó', tono: 'bueno' },
  devolvio: { texto: 'Devolvió', tono: 'atencion' },
  rechazo: { texto: 'Rechazó', tono: 'malo' },
  aqui: { texto: 'Le toca', tono: 'atencion' },
  falta: { texto: 'Sigue', tono: 'neutro' },
  saltado: { texto: 'Se saltó', tono: 'neutro' },
};

const cuando = (iso: string) => new Date(iso).toLocaleString('es-CO', { dateStyle: 'medium', timeStyle: 'short' });
const quienes = (p: PasoDeLaVista) => (p.quienes.length ? p.quienes.join(', ') : 'Nadie ocupa este paso');

/**
 * Lo que se lee de un paso: de lo hecho, quién y cuándo (y por qué se saltó); de lo que espera o
 * sigue, quién puede aprobarlo (RF-46). Con la requisición fuera de la cadena —aprobada de una vez
 * por la Gerencia, devuelta, rechazada—, lo que no se alcanzó a recorrer «no llegó».
 */
function detalleDelPaso(p: PasoDeLaVista, enCadena: boolean): string[] {
  if (p.como === 'aprobado' || p.como === 'devolvio' || p.como === 'rechazo') {
    // El motivo de devolver o rechazar ya está en el aviso y en la historia.
    return [`${p.por || 'Alguien'}${p.en ? ` · ${cuando(p.en)}` : ''}`];
  }
  if (p.como === 'saltado') return [p.motivo ?? 'Nadie ocupaba este paso.', ...(p.en ? [cuando(p.en)] : [])];
  if (p.como === 'aqui') return [`Puede aprobarla: ${quienes(p)}`];
  return enCadena ? [quienes(p)] : ['No llegó a este paso.'];
}

/** La cadena, paso por paso: quién aprobó, quién sigue, qué se saltó y por qué (RF-33, RF-46). */
export function CadenaDeLaRequisicionVista({ requisicion }: { requisicion: RequisicionEnElDetalle }) {
  const { pasos, paso } = requisicion.cadena;
  if (pasos.length === 0) return null;
  const enCadena = paso !== null;
  return (
    <Seccion titulo="Cadena de aprobación">
      <View style={estilos.cadena}>
        {pasos.map((p, i) => (
          <View key={p.paso} style={estilos.paso}>
            <Text style={estilos.fuerte}>{`${i + 1}. ${p.nombre}`}</Text>
            <Etiqueta tono={COMO[p.como].tono}>{p.como === 'falta' && !enCadena ? 'No llegó' : COMO[p.como].texto}</Etiqueta>
            {detalleDelPaso(p, enCadena).map((linea) => (
              <Text key={linea} style={estilos.apoyo}>
                {linea}
              </Text>
            ))}
          </View>
        ))}
      </View>
    </Seccion>
  );
}

/**
 * Lo que hace falta de la requisición para aprobarla con recorte. Spec 048: con `obraId`, cada
 * renglón trae su imputación y su valor estimado (`undefined` si quien mira no ve valores).
 */
export type ParaRecortar = { obraId?: string | null } & (
  | {
      tipo: 'compra';
      renglones: {
        id: string;
        orden: number;
        descripcion: string;
        cantidad: number;
        unidad: string;
        valorEstimado?: number | null;
        planificacion?: { imputacion: ImputacionDelRenglon | null };
      }[];
    }
  | { tipo: 'pago'; valor: number | undefined; imputacion?: ImputacionDelRenglon | null }
);

/** RF-36: la imputación de ahora, como se escribe en el formulario. */
function escritaDe(imputacion: ImputacionDelRenglon | null | undefined): ImputacionEscrita {
  const propuesta = imputacionPropuesta(imputacion ?? null);
  if (!propuesta) return IMPUTACION_VACIA;
  return propuesta.llave ? { llave: propuesta.llave, fuera: false, explicacion: '' } : { llave: null, fuera: true, explicacion: propuesta.explicacion ?? '' };
}

const mismaImputacion = (a: ImputacionEscrita, b: ImputacionEscrita) =>
  a.fuera === b.fuera && a.llave === b.llave && a.explicacion.trim() === b.explicacion.trim();

/** Los botones de decidir y sus ventanas (RF-25 a RF-34, RF-80). */
export function BotonesDeDecision({
  tipo,
  id,
  codigo,
  version,
  requisicion,
  recorte,
  listo,
}: {
  tipo: TipoDeRequisicion;
  id: string;
  codigo: string;
  version: number;
  requisicion: RequisicionEnElDetalle;
  recorte: ParaRecortar;
  listo: (mensaje: string) => void;
}) {
  const [ventana, setVentana] = useState<'aprobar' | 'devolver' | 'rechazar' | null>(null);
  if (!requisicion.cadena.puedeDecidir) return null;

  const decidir = async (decision: 'aprobar' | 'devolver' | 'rechazar', extra: Record<string, unknown> = {}) => {
    const r = await api.requisiciones.decidir(tipo, id, { decision, version, ...extra });
    const que =
      decision === 'devolver'
        ? 'devuelta a quien la pidió'
        : decision === 'rechazar'
          ? 'rechazada'
          : r.estado === 'aprobada'
            ? 'aprobada'
            : 'aprobada en este paso: pasa al siguiente';
    listo(`Requisición ${codigo} ${que}.`);
  };

  return (
    <>
      <Boton titulo="Aprobar" onPress={() => setVentana('aprobar')} />
      <Boton titulo="Devolver" tono="secundario" onPress={() => setVentana('devolver')} />
      <Boton titulo="Rechazar" tono="peligro" onPress={() => setVentana('rechazar')} />
      {ventana === 'aprobar' ? (
        <VentanaDeAprobar
          codigo={codigo}
          recorta={requisicion.cadena.puedeRecortar}
          recorte={recorte}
          alCerrar={() => setVentana(null)}
          alAprobar={(extra) => decidir('aprobar', extra)}
        />
      ) : null}
      {ventana === 'devolver' ? (
        <VentanaDeMotivo
          titulo={`Devolver ${codigo}`}
          aviso="Vuelve a quien la pidió para que la corrija. Al reenviarla, recorre la cadena otra vez desde el principio."
          etiqueta="Qué debe corregirse"
          accion="Devolver"
          tono="primario"
          alCerrar={() => setVentana(null)}
          alConfirmar={(motivo) => decidir('devolver', { motivo })}
        />
      ) : null}
      {ventana === 'rechazar' ? (
        <VentanaDeMotivo
          titulo={`Rechazar ${codigo}`}
          aviso="Una requisición rechazada no se vuelve a abrir. Si hace falta, se pide otra."
          accion="Rechazar"
          alCerrar={() => setVentana(null)}
          alConfirmar={(motivo) => decidir('rechazar', { motivo })}
        />
      ) : null}
    </>
  );
}

/** «2,5» y «2.5» son lo mismo. */
const aNumero = (texto: string) => Number(texto.trim().replace(',', '.'));
/** «1.850.000» → 1850000. */
const aPesos = (texto: string) => Number(texto.replace(/[.\s$]/g, ''));

/**
 * Aprobar: tal cual, o con lo que se cambia si quien aprueba puede recortar (RF-34, RF-79). Lo que
 * no vale —subir una cantidad, quitarlo todo, un valor mayor— lo dice el servidor con su regla.
 */
function VentanaDeAprobar({
  codigo,
  recorta,
  recorte,
  alCerrar,
  alAprobar,
}: {
  codigo: string;
  recorta: boolean;
  recorte: ParaRecortar;
  alCerrar: () => void;
  alAprobar: (extra: Record<string, unknown>) => Promise<void>;
}) {
  const [cantidades, setCantidades] = useState<Record<string, string>>(
    recorte.tipo === 'compra' ? Object.fromEntries(recorte.renglones.map((r) => [r.id, String(r.cantidad).replace('.', ',')])) : {},
  );
  const [valor, setValor] = useState(recorte.tipo === 'pago' && recorte.valor ? String(recorte.valor) : '');
  const [error, setError] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  // Spec 048: los valores que faltan (RF-14) y, a quien recorta, las imputaciones (RF-36).
  const persona = usePersona();
  const conValores = veLosValores(persona.rol);
  const faltanValores =
    recorte.tipo === 'compra' && recorte.obraId
      ? recorte.renglones.filter((r) => r.planificacion?.imputacion && r.valorEstimado === null)
      : [];
  const [valores, setValores] = useState<Record<string, string>>({});
  const reimputa = recorta && Boolean(recorte.obraId);
  const antes: Record<string, ImputacionEscrita> =
    recorte.tipo === 'compra'
      ? Object.fromEntries(recorte.renglones.map((r) => [r.id, escritaDe(r.planificacion?.imputacion)]))
      : { pago: escritaDe(recorte.imputacion) };
  const [imputaciones, setImputaciones] = useState<Record<string, ImputacionEscrita>>(antes);
  const [imputables, setImputables] = useState<OpcionesParaImputar | null>(null);
  useEffect(() => {
    if (!reimputa || !recorte.obraId) return;
    let vigente = true;
    api.requisiciones
      .imputables(recorte.obraId)
      .then((r) => vigente && setImputables(r))
      .catch((fallo) => vigente && setError(mensajeDe(fallo)));
    return () => {
      vigente = false;
    };
  }, [reimputa, recorte.obraId]);

  // RF-61: lo que esta requisición ya aporta a cada opción (está contada en lo que trae el
  // servidor) y lo que le pide con las imputaciones de la ventana.
  const valorDe = (id: string) => (recorte.tipo === 'compra' ? (recorte.renglones.find((r) => r.id === id)?.valorEstimado ?? 0) : (recorte.valor ?? 0));
  const contadoEn = (llave: string | null) =>
    recorte.tipo === 'compra'
      ? recorte.renglones.filter((r) => (r.planificacion?.imputacion?.llave ?? null) === llave).reduce((t, r) => t + (r.valorEstimado ?? 0), 0)
      : (recorte.imputacion?.llave ?? null) === llave
        ? (recorte.valor ?? 0)
        : 0;
  const pideA = (llave: string | null) =>
    Object.entries(imputaciones)
      .filter(([, escrita]) => escrita.llave === llave)
      .reduce((t, [clave]) => t + valorDe(clave), 0);

  async function aprobar() {
    setEnviando(true);
    setError(null);
    try {
      const extra: Record<string, unknown> = {};
      if (faltanValores.length) {
        extra.valoresEstimados = faltanValores.map((r) => ({ renglonId: r.id, valor: aPesos(valores[r.id] ?? '') }));
      }
      if (reimputa) {
        extra.imputaciones = Object.entries(imputaciones)
          .filter(([clave, escrita]) => !mismaImputacion(escrita, antes[clave]))
          .map(([clave, escrita]) => ({ renglonId: clave === 'pago' ? null : clave, imputacion: imputacionAPedir(escrita) }));
      }
      if (recorta && recorte.tipo === 'compra') {
        extra.cantidades = recorte.renglones
          .map((r) => ({ renglonId: r.id, cantidad: aNumero(cantidades[r.id] ?? '') }))
          .filter((c, i) => c.cantidad !== recorte.renglones[i].cantidad);
      }
      if (recorta && recorte.tipo === 'pago' && valor.trim() && aPesos(valor) !== recorte.valor) extra.valorAprobado = aPesos(valor);
      await alAprobar(extra);
    } catch (fallo) {
      setError(mensajeDe(fallo));
      setEnviando(false);
    }
  }

  return (
    <Modal titulo={`Aprobar ${codigo}`} onCerrar={alCerrar} angosta={!reimputa}>
      <Text style={estilos.texto}>
        {recorta
          ? 'Puede bajar una cantidad, quitar un renglón con 0 o aprobar un valor menor. Lo demás se aprueba tal como se pidió.'
          : 'Se aprueba tal como se pidió y pasa al siguiente paso. Si algo no cuadra, devuélvala con lo que hay que corregir.'}
      </Text>
      {recorta && recorte.tipo === 'compra'
        ? recorte.renglones.map((r) => (
            <Campo
              key={r.id}
              etiqueta={`${r.orden}. ${r.descripcion} (${r.unidad})`}
              valor={cantidades[r.id] ?? ''}
              onChange={(v) => setCantidades((c) => ({ ...c, [r.id]: v }))}
              ayuda={`Pedido: ${String(r.cantidad).replace('.', ',')}`}
              ancho={320}
            />
          ))
        : null}
      {recorta && recorte.tipo === 'pago' ? (
        <Campo
          etiqueta="Valor aprobado (pesos)"
          valor={valor}
          onChange={setValor}
          ayuda={recorte.valor ? `Pedido: ${enPesos(recorte.valor)}` : undefined}
          ancho={240}
        />
      ) : null}
      {faltanValores.length ? (
        <>
          <Text style={estilos.texto}>
            Lo pidió el Almacenista, que no pone valores: escriba el valor estimado de cada renglón antes de aprobar.
          </Text>
          {faltanValores.map((r) => (
            <Campo
              key={r.id}
              etiqueta={`Valor estimado de ${r.orden}. ${r.descripcion}`}
              obligatorio
              valor={valores[r.id] ?? ''}
              onChange={(v) => setValores((x) => ({ ...x, [r.id]: v }))}
              ayuda="En pesos, sin centavos."
              ancho={320}
            />
          ))}
        </>
      ) : null}
      {reimputa ? (
        <>
          <Text style={estilos.texto}>A qué parte de la planificación va. Si la cambia, queda en la historia.</Text>
          {recorte.tipo === 'compra'
            ? recorte.renglones.map((r) => (
                <View key={r.id} style={estilos.imputacion}>
                  <Text style={estilos.fuerte}>{`${r.orden}. ${r.descripcion}`}</Text>
                  <CampoDeImputacion
                    opciones={imputables}
                    valor={imputaciones[r.id] ?? IMPUTACION_VACIA}
                    onChange={(v) => setImputaciones((x) => ({ ...x, [r.id]: v }))}
                    conValores={conValores}
                    pideEstaRequisicion={pideA(imputaciones[r.id]?.llave ?? null)}
                    yaContado={{ llave: imputaciones[r.id]?.llave ?? null, valor: contadoEn(imputaciones[r.id]?.llave ?? null) }}
                  />
                </View>
              ))
            : (
                <CampoDeImputacion
                  opciones={imputables}
                  valor={imputaciones.pago ?? IMPUTACION_VACIA}
                  onChange={(v) => setImputaciones((x) => ({ ...x, pago: v }))}
                  conValores={conValores}
                  pideEstaRequisicion={pideA(imputaciones.pago?.llave ?? null)}
                  yaContado={{ llave: imputaciones.pago?.llave ?? null, valor: contadoEn(imputaciones.pago?.llave ?? null) }}
                />
              )}
        </>
      ) : null}
      {error ? <Aviso tono="error">{error}</Aviso> : null}
      <AccionesFormulario>
        <Boton titulo="Cancelar" tono="secundario" onPress={alCerrar} />
        <Boton titulo={enviando ? 'Aprobando…' : 'Aprobar'} onPress={aprobar} deshabilitado={enviando} />
      </AccionesFormulario>
    </Modal>
  );
}

const estilos = StyleSheet.create({
  cadena: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.three },
  paso: { gap: Spacing.half, minWidth: 200, maxWidth: 260, alignItems: 'flex-start' },
  fuerte: { fontFamily: FuentePanel.texto, fontSize: TextoPanel.cuerpo, fontWeight: '600', color: Panel.texto },
  texto: { fontFamily: FuentePanel.texto, fontSize: TextoPanel.cuerpo, color: Panel.texto },
  apoyo: { fontFamily: FuentePanel.texto, fontSize: TextoPanel.apoyo, color: Panel.textoApoyo },
  imputacion: { gap: Spacing.one },
});
