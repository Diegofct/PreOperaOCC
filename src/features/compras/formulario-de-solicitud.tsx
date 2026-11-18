/**
 * Pedir una compra o corregir una devuelta (spec 036, RF-7 a RF-11).
 *
 * Lo que impide enviarla lo dicen las mismas reglas del servidor (`faltasPorCampo`), y cada
 * falta se ve junto a su campo después del primer intento: antes, el formulario vacío sería
 * todo rojo.
 *
 * Los adjuntos (cotizaciones, fotos, fichas técnicas) se suben después de guardar la
 * solicitud, porque son suyos (`?solicitudId=`): si uno falla, la solicitud ya quedó y se
 * dice cuál no subió. Al almacenista no se le ofrece el valor estimado ni las clases con
 * precio (RF-31): no los vería después.
 *
 * Spec 046: con `requisicion` es una requisición de compra de una obra o de GeoLab. Cada renglón
 * pide para cuándo y para qué (RF-10, RF-11); la cabecera ya no pide fecha —es la más cercana de
 * los renglones— y su «para qué» pasa a ser una nota general opcional (RF-9). Se crea por
 * Requisiciones y, devuelta, se corrige por la ruta de la 036, que la vuelve a la cadena.
 *
 * Spec 048: en una requisición de obra cada renglón lleva su valor estimado —el Almacenista no lo
 * ve ni lo pone (RF-11, RF-13)— y a qué parte de la planificación va (RF-2, RF-4). La cabecera ya
 * no pide valor: es la suma de los renglones (RF-18). Al corregir, cada renglón trae lo que tenía
 * (RF-10); si su opción ya no está en la planificación, el servidor lo dice (RF-55).
 */
import { useCallback, useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { FuentePanel, Grosor, Panel, Radio, Spacing, TextoPanel } from '@/constants/theme';
import { useAvisos } from '@/features/panel/avisos';
import { elegirArchivo } from '@/features/contratos/elegir-archivo';
import { api, mensajeDe, type LugarDeLasSolicitudes } from '@/features/panel/cliente-api';
import type { LugarDeRequisiciones, OpcionesParaImputar } from '@/features/panel/requisiciones';
import {
  CampoDeImputacion,
  IMPUTACION_VACIA,
  imputacionAPedir,
  type ImputacionEscrita,
} from '@/features/requisiciones/campo-de-imputacion';
import {
  AccionesFormulario,
  Aviso,
  Boton,
  Campo,
  CampoDeFecha,
  ANCHOS_DE_CAMPO,
  Casilla,
  Formulario,
  Modal,
  Selector,
} from '@/features/panel/componentes';
import type { MaterialDeAlmacenFila } from '@/features/panel/contratos';
import { useListado } from '@/features/panel/marco';
import { usePersona } from '@/features/panel/sesion';
import { abreviaturaDeUnidad } from '@/shared/catalogos/almacen';
import { faltasPorCampo, valorEstimadoDeLosRenglones, veLosValores, type DatosDeLaSolicitud } from '@/shared/rules/compras';
import {
  ACEPTA_DOCUMENTOS,
  BYTES_DE_FIRMA,
  clasesDe,
  llevaPrecio,
  revisarDocumento,
} from '@/shared/rules/documentos';
import { fechaDeJornada } from '@/shared/rules/jornada';
import { enPesos } from '@/shared/rules/pesos';
import { imputacionPropuesta, type ImputacionDelRenglon } from '@/shared/rules/requisicion-planificacion';

/** Un renglón mientras se escribe: la cantidad es texto hasta enviar. */
interface RenglonEscrito {
  descripcion: string;
  cantidad: string;
  unidad: string;
  materialId: string | null;
  /** Spec 046: en una requisición, para cuándo y para qué es este renglón. */
  necesitaEl: string;
  paraQue: string;
  /** Spec 048: en una requisición de obra, su valor estimado y a qué parte de la planificación va. */
  valorEstimado: string;
  imputacion: ImputacionEscrita;
}

const RENGLON_VACIO: RenglonEscrito = {
  descripcion: '',
  cantidad: '',
  unidad: '',
  materialId: null,
  necesitaEl: '',
  paraQue: '',
  valorEstimado: '',
  imputacion: IMPUTACION_VACIA,
};

/** RF-10: lo que tenía el renglón que se corrige, como se escribe en el formulario. */
function imputacionEscritaDe(anterior: ImputacionDelRenglon | null): ImputacionEscrita {
  const propuesta = imputacionPropuesta(anterior);
  if (!propuesta) return IMPUTACION_VACIA;
  return propuesta.llave ? { llave: propuesta.llave, fuera: false, explicacion: '' } : { llave: null, fuera: true, explicacion: propuesta.explicacion ?? '' };
}

/** «2,5» y «2.5» son lo mismo; vacío no es cero, es que falta. */
const aNumero = (texto: string) => (texto.trim() ? Number(texto.trim().replace(',', '.')) : Number.NaN);

/** «1.850.000» o «1850000» → 1850000; vacío → sin valor. */
const aPesos = (texto: string) => (texto.trim() ? Number(texto.replace(/[.\s$]/g, '')) : null);

export function FormularioDeSolicitud({
  lugar,
  inicial,
  alCerrar,
  alGuardar,
  requisicion = false,
}: {
  lugar: LugarDeLasSolicitudes;
  /** Spec 046: es una requisición de compra (fecha y para qué por renglón). */
  requisicion?: boolean;
  /**
   * Para corregir: la solicitud como está, con su versión. Sin ella, es una nueva. `imputaciones`,
   * en el orden de los renglones (spec 048).
   */
  inicial?: { id: string; codigo: string; version: number; datos: DatosDeLaSolicitud; imputaciones?: (ImputacionDelRenglon | null)[] };
  alCerrar: () => void;
  /** Con el mensaje para la pantalla: qué quedó y, si algo no subió, qué. */
  alGuardar: (mensaje: string) => void;
}) {
  const persona = usePersona();
  const conValores = veLosValores(persona.rol);
  const obraId = 'obraId' in lugar ? lugar.obraId : null;
  // Spec 048: solo las requisiciones de obra se imputan y llevan valor por renglón (RF-1).
  const deObra = requisicion && obraId !== null;
  const delAlmacenista = persona.rol === 'almacenista';

  const [renglones, setRenglones] = useState<RenglonEscrito[]>(
    inicial
      ? inicial.datos.renglones.map((r, i) => ({
          descripcion: r.descripcion,
          materialId: r.materialId,
          unidad: r.unidad,
          cantidad: String(r.cantidad).replace('.', ','),
          necesitaEl: r.necesitaEl ?? '',
          paraQue: r.paraQue ?? '',
          valorEstimado: r.valorEstimado ? String(r.valorEstimado) : '',
          imputacion: imputacionEscritaDe(inicial.imputaciones?.[i] ?? null),
        }))
      : [RENGLON_VACIO],
  );
  const [paraCuando, setParaCuando] = useState(inicial?.datos.paraCuando ?? '');
  const [urgente, setUrgente] = useState(inicial?.datos.urgente ?? false);
  const [paraQue, setParaQue] = useState(inicial?.datos.paraQue ?? '');
  const [proveedor, setProveedor] = useState(inicial?.datos.proveedorSugerido ?? '');
  const [valor, setValor] = useState(inicial?.datos.valorEstimado ? String(inicial.datos.valorEstimado) : '');
  const [adjuntos, setAdjuntos] = useState<{ archivo: File; clase: string | null }[]>([]);
  const [intentado, setIntentado] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Spec 050, RF-57: un fallo al guardar va al aviso de abajo, que se queda hasta que se cierra.
  const avisos = useAvisos();
  const [enviando, setEnviando] = useState(false);

  // Spec 048: las opciones para imputar de la obra, con sus cifras si se ven (RF-6, RF-9).
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

  // El catálogo del Almacén, solo en una obra (RF-7). Si no lo lleva o no se puede ver, se escribe a mano.
  const materiales = useListado<MaterialDeAlmacenFila>(
    useCallback(() => (obraId ? api.almacen.materiales.listar(obraId).catch(() => []) : Promise.resolve([])), [obraId]),
  ).datos;

  const datos: DatosDeLaSolicitud = {
    renglones: renglones.map((r) => ({
      descripcion: r.descripcion,
      cantidad: aNumero(r.cantidad),
      unidad: r.unidad,
      materialId: r.materialId,
      ...(requisicion ? { necesitaEl: r.necesitaEl || null, paraQue: r.paraQue } : {}),
      ...(deObra && conValores ? { valorEstimado: aPesos(r.valorEstimado) } : {}),
    })),
    paraCuando,
    urgente,
    paraQue,
    proveedorSugerido: proveedor,
    valorEstimado: !conValores ? null : deObra ? null : aPesos(valor),
  };
  if (deObra && conValores) datos.valorEstimado = valorEstimadoDeLosRenglones(datos.renglones);
  const faltas = faltasPorCampo(datos, undefined, { requisicion, deObra, delAlmacenista });
  // RF-2, RF-4: con planificación, cada renglón va a algo, y «Fuera de lo planeado» explica por qué.
  const faltaDeImputacion = (r: RenglonEscrito): string | null => {
    if (!deObra || !imputables?.hayPlanificacion) return null;
    if (r.imputacion.fuera) return r.imputacion.explicacion.trim() ? null : 'Explique por qué no cabe.';
    return r.imputacion.llave ? null : 'Escoja a qué va, o «Fuera de lo planeado».';
  };
  const hayFaltas =
    faltas.renglones !== null ||
    faltas.paraCuando !== null ||
    faltas.valorEstimado !== null ||
    faltas.porRenglon.some((r) => r.descripcion || r.cantidad || r.unidad || r.necesitaEl || r.paraQue || r.valorEstimado) ||
    renglones.some((r) => faltaDeImputacion(r) !== null) ||
    (deObra && imputables === null) ||
    adjuntos.some((a) => !a.clase);
  /** Lo que la requisición entera pide a una opción, sumando sus renglones (para lo que queda). */
  const pideALaOpcion = (llave: string | null) =>
    llave ? renglones.filter((r) => r.imputacion.llave === llave).reduce((t, r) => t + (aPesos(r.valorEstimado) ?? 0), 0) : 0;
  const ver = (falta: string | null) => (intentado ? (falta ?? undefined) : undefined);

  const clases = clasesDe('solicitud').filter((c) => conValores || !llevaPrecio(c.id));

  function cambiarRenglon(i: number, cambio: Partial<RenglonEscrito>) {
    setRenglones((todos) => todos.map((r, j) => (j === i ? { ...r, ...cambio } : r)));
  }

  function elegirMaterial(i: number, id: string | null) {
    const material = materiales.find((m) => m.id === id);
    cambiarRenglon(
      i,
      material
        ? { materialId: material.id, descripcion: material.nombre, unidad: abreviaturaDeUnidad(material.unidad) }
        : { materialId: null },
    );
  }

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
    setAdjuntos((todos) => [...todos, { archivo: elegido, clase: null }]);
  }

  async function enviar() {
    setIntentado(true);
    if (hayFaltas) return;
    setEnviando(true);
    setError(null);
    let guardada: { id: string; codigo: string };
    try {
      if (inicial) {
        await api.compras.corregir(inicial.id, {
          ...datos,
          renglones: datos.renglones.map((r, i) => ({ ...r, ...(deObra ? { imputacion: imputacionAPedir(renglones[i].imputacion) } : {}) })),
          version: inicial.version,
        });
        guardada = { id: inicial.id, codigo: inicial.codigo };
      } else if (requisicion) {
        // Spec 046: por Requisiciones, con la nota general en la cabecera.
        guardada = await api.requisiciones.crear(lugar as LugarDeRequisiciones, {
          tipo: 'compra',
          urgente,
          nota: paraQue,
          proveedorSugerido: proveedor,
          valorEstimado: datos.valorEstimado,
          renglones: renglones.map((r) => ({
            descripcion: r.descripcion,
            cantidad: aNumero(r.cantidad),
            unidad: r.unidad,
            materialId: r.materialId,
            necesitaEl: r.necesitaEl,
            paraQue: r.paraQue,
            ...(deObra ? { valorEstimado: conValores ? aPesos(r.valorEstimado) : null, imputacion: imputacionAPedir(r.imputacion) } : {}),
          })),
        });
      } else {
        guardada = await api.compras.crear(lugar, datos);
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
          { solicitudId: guardada.id },
          { clase: clase ?? '', nombre: archivo.name.replace(/\.[^.]+$/, ''), fecha: fechaDeJornada(), vence: '', proveedor: '', descripcion: '' },
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
      titulo={inicial ? `Corregir ${inicial.codigo}` : requisicion ? 'Nueva requisición de compra' : 'Nueva solicitud de compra'}
      onCerrar={alCerrar}
      amplia
    >
      <Text style={estilos.subtitulo}>Qué se necesita</Text>
      {renglones.map((r, i) => {
        const f = faltas.porRenglon[i];
        return (
          // Spec 050, RF-22, RF-23: cada renglón es una tarjeta con su cabecera y sus campos en dos
          // filas alineadas. Antes era una sola fila con ocho anchos escritos a mano que, al
          // partirse, dejaba cada etiqueta a una altura distinta.
          <View key={i} style={estilos.renglon}>
            <View style={estilos.cabeceraDelRenglon}>
              <Text style={estilos.numero}>Renglón {i + 1}</Text>
              {renglones.length > 1 ? (
                <Boton titulo="Quitar" tono="secundario" onPress={() => setRenglones((todos) => todos.filter((_, j) => j !== i))} />
              ) : null}
            </View>
            <Formulario desnudo>
              {materiales.length ? (
                <Selector
                  etiqueta="Del catálogo del Almacén"
                  valor={r.materialId}
                  opciones={materiales.map((m) => ({ valor: m.id, etiqueta: m.nombre, detalle: abreviaturaDeUnidad(m.unidad) }))}
                  onChange={(id) => elegirMaterial(i, id)}
                  permiteVacio
                  vacio="Escribirlo a mano"
                  ancho={ANCHOS_DE_CAMPO.medio}
                />
              ) : null}
              <Campo
                etiqueta="Qué se necesita"
                obligatorio
                valor={r.descripcion}
                onChange={(v) => cambiarRenglon(i, { descripcion: v, materialId: null })}
                // Junto al campo basta lo corto: «del renglón 2» ya lo dice la fila.
                error={ver(f?.descripcion ? 'Diga qué se necesita.' : null)}
              />
              <Campo
                etiqueta="Cantidad"
                obligatorio
                valor={r.cantidad}
                onChange={(v) => cambiarRenglon(i, { cantidad: v })}
                error={ver(f?.cantidad ? 'Mayor que cero.' : null)}
                ancho={ANCHOS_DE_CAMPO.corto}
              />
              <Campo
                etiqueta="Unidad"
                obligatorio
                valor={r.unidad}
                onChange={(v) => cambiarRenglon(i, { unidad: v, materialId: null })}
                error={ver(f?.unidad ? 'Falta la unidad.' : null)}
                ayuda={i === 0 ? 'Bulto, kg, m3, caja, u…' : undefined}
                ancho={ANCHOS_DE_CAMPO.corto}
              />
            </Formulario>
            {requisicion || (deObra && conValores) ? (
              <Formulario desnudo>
                {requisicion ? (
                  <>
                    <CampoDeFecha
                      etiqueta="Para cuándo"
                      obligatorio
                      valor={r.necesitaEl}
                      onChange={(v) => cambiarRenglon(i, { necesitaEl: v })}
                      min={fechaDeJornada()}
                      error={ver(f?.necesitaEl ? (r.necesitaEl ? 'No puede ser antes de hoy.' : 'Diga para cuándo.') : null)}
                    />
                    <Campo
                      etiqueta="Para qué"
                      obligatorio
                      valor={r.paraQue}
                      onChange={(v) => cambiarRenglon(i, { paraQue: v })}
                      error={ver(f?.paraQue ? 'Diga para qué.' : null)}
                      ayuda={i === 0 ? 'Por ejemplo: andenes del K2.' : undefined}
                    />
                  </>
                ) : null}
                {deObra && conValores ? (
                  <Campo
                    etiqueta="Valor estimado (pesos)"
                    obligatorio
                    valor={r.valorEstimado}
                    onChange={(v) => cambiarRenglon(i, { valorEstimado: v })}
                    error={ver(f?.valorEstimado ? 'En pesos, mayor que cero.' : null)}
                    ancho={ANCHOS_DE_CAMPO.medio}
                  />
                ) : null}
              </Formulario>
            ) : null}
            {deObra ? (
              <View style={estilos.imputacion}>
                <CampoDeImputacion
                  opciones={imputables}
                  valor={r.imputacion}
                  onChange={(imputacion) => cambiarRenglon(i, { imputacion })}
                  conValores={conValores}
                  pideEstaRequisicion={pideALaOpcion(r.imputacion.llave)}
                  error={ver(faltaDeImputacion(r))}
                />
              </View>
            ) : null}
          </View>
        );
      })}
      {intentado && faltas.renglones ? <Aviso tono="error">{faltas.renglones}</Aviso> : null}
      <View style={estilos.inicio}>
        <Boton titulo="Agregar renglón" tono="secundario" onPress={() => setRenglones((todos) => [...todos, RENGLON_VACIO])} />
      </View>

      <Text style={estilos.subtitulo}>{requisicion ? 'Urgencia y nota' : 'Para cuándo y para qué'}</Text>
      <View style={estilos.fila}>
        {requisicion ? null : (
          <CampoDeFecha
            etiqueta="Para cuándo"
            obligatorio
            valor={paraCuando}
            onChange={setParaCuando}
            min={fechaDeJornada()}
            error={ver(faltas.paraCuando)}
          />
        )}
        <View style={estilos.casilla}>
          <Casilla etiqueta="Es urgente" marcada={urgente} onChange={setUrgente} />
        </View>
      </View>
      <Campo
        etiqueta={requisicion ? 'Nota general' : 'Para qué'}
        valor={paraQue}
        onChange={setParaQue}
        multilinea
        compacto
        ayuda={requisicion ? 'Opcional: lo que valga para toda la requisición.' : 'Por ejemplo: fundir la placa del segundo piso.'}
      />
      <View style={estilos.fila}>
        <Campo etiqueta="Proveedor sugerido" valor={proveedor} onChange={setProveedor} ayuda="Opcional." ancho={280} />
        {deObra && conValores ? (
          // RF-18: en una de obra, el valor es la suma de los renglones.
          <Text style={estilos.apoyo}>{`Valor estimado: ${datos.valorEstimado ? enPesos(datos.valorEstimado) : '—'} (la suma de los renglones)`}</Text>
        ) : conValores ? (
          <Campo
            etiqueta="Valor estimado (pesos)"
            valor={valor}
            onChange={setValor}
            ayuda="Opcional, sin centavos."
            error={ver(faltas.valorEstimado)}
            ancho={200}
          />
        ) : null}
      </View>

      <Text style={estilos.subtitulo}>Adjuntos</Text>
      {adjuntos.map((a, i) => (
        <View key={`${a.archivo.name}-${i}`} style={estilos.renglon}>
          <Text style={estilos.archivo}>{a.archivo.name}</Text>
          <Selector
            etiqueta="Clase"
            valor={a.clase}
            opciones={clases.map((c) => ({ valor: c.id, etiqueta: c.nombre }))}
            onChange={(clase) => setAdjuntos((todos) => todos.map((x, j) => (j === i ? { ...x, clase } : x)))}
            vacio="Elija la clase"
            error={intentado && !a.clase ? 'Elija la clase.' : undefined}
            ancho={200}
          />
          <Boton titulo="Quitar" tono="secundario" onPress={() => setAdjuntos((todos) => todos.filter((_, j) => j !== i))} />
        </View>
      ))}
      <View style={estilos.inicio}>
        <Boton titulo="Adjuntar archivo" tono="secundario" onPress={adjuntar} />
        <Text style={estilos.apoyo}>
          {conValores
            ? 'Cotizaciones, fotos o fichas técnicas. PDF, imagen, Word o Excel, hasta 20 MB.'
            : 'Fotos, remisiones o fichas técnicas. PDF, imagen, Word o Excel, hasta 20 MB.'}
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
  subtitulo: {
    fontFamily: FuentePanel.texto,
    fontSize: TextoPanel.cuerpo,
    fontWeight: '600',
    color: Panel.texto,
    marginTop: Spacing.two,
  },
  /** Un renglón, como tarjeta dentro de la ventana (spec 050, RF-22). */
  renglon: {
    gap: Spacing.two + Spacing.one,
    padding: Spacing.three,
    borderWidth: Grosor.linea,
    borderColor: Panel.bordeSuave,
    borderRadius: Radio.md,
    backgroundColor: Panel.fondo,
  },
  cabeceraDelRenglon: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: Spacing.two },
  numero: { fontFamily: FuentePanel.texto, fontSize: TextoPanel.cuerpo, fontWeight: '700', color: Panel.texto },
  fila: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'flex-end', gap: Spacing.two },
  casilla: { paddingBottom: Spacing.two },
  inicio: { gap: Spacing.one, alignItems: 'flex-start' },
  // La imputación ocupa su propia línea dentro del renglón: el selector y sus cifras son anchos.
  imputacion: { width: '100%' },
  archivo: { fontFamily: FuentePanel.texto, fontSize: TextoPanel.cuerpo, color: Panel.texto, minWidth: 200, paddingBottom: Spacing.two },
  apoyo: { fontFamily: FuentePanel.texto, fontSize: TextoPanel.apoyo, color: Panel.textoApoyo },
});
