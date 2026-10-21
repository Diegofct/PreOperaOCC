/**
 * Las pólizas y los documentos del contrato (spec 031, RF-23 a RF-30), parte 2 de la
 * pestaña Contrato. Viven fuera del formulario del contrato: cada póliza y cada
 * documento se guarda al momento, y siguen abiertos aunque el contrato esté aprobado
 * (renovar una póliza no es cambiar lo pactado).
 *
 * Nada se borra (RF-26, RF-29): una póliza se reemplaza por otra o se anula con motivo,
 * y un documento se anula y sigue en la lista, marcado.
 *
 * El archivo se sube primero y lo cita después el registro: si la subida falla, no se
 * crea nada a medias.
 */
import { useState } from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';

import { FuentePanel, Panel, TextoPanel } from '@/constants/theme';
import { api, mensajeDe } from '@/features/panel/cliente-api';
import {
  Acciones,
  AccionesFormulario,
  Aviso,
  Boton,
  Campo,
  CampoDeFecha,
  Celda,
  Etiqueta,
  Modal,
  Seccion,
  Selector,
  Tabla,
  type Columna,
} from '@/features/panel/componentes';
import type { ContratoDeObra, DocumentoDelContrato, PolizaDelContrato } from '@/features/panel/contratos';
import {
  CLASES_DE_DOCUMENTO,
  MIMES_DEL_CONTRATO,
  rechazoDeArchivo,
  type ClaseDeDocumento,
} from '@/shared/rules/contrato';
import { fechaDeJornada } from '@/shared/rules/jornada';
import { enPesos } from '@/shared/rules/pesos';
import { AMPAROS, NOMBRE_DE_VIGENCIA, nombreDeAmparo, type Amparo } from '@/shared/rules/polizas';

import { elegirArchivo } from './elegir-archivo';

/** Abre un archivo del contrato en otra pestaña: el PDF lo muestra el navegador. */
function abrirArchivo(mediaId: string) {
  if (Platform.OS === 'web') window.open(`/api/panel/media/${mediaId}`, '_blank');
}

function fecha(texto: string): string {
  const [a, m, d] = texto.split('-');
  return `${d}/${m}/${a}`;
}

const TONO_DE_VIGENCIA = { vigente: 'bueno', por_vencer: 'atencion', vencida: 'malo' } as const;

/** El archivo elegido para un registro, con lo que se comprueba antes de subirlo. */
function CampoDeArchivo({
  archivo,
  alElegir,
  obligatorio,
}: {
  archivo: File | null;
  alElegir: (f: File | null, error: string | null) => void;
  obligatorio?: boolean;
}) {
  return (
    <View style={estilos.archivo}>
      <Boton
        titulo={archivo ? 'Cambiar archivo' : obligatorio ? 'Elegir archivo *' : 'Elegir archivo (opcional)'}
        tono="secundario"
        onPress={async () => {
          const f = await elegirArchivo(MIMES_DEL_CONTRATO.join(','));
          if (!f) return;
          const rechazo = rechazoDeArchivo(f.type, f.size);
          alElegir(rechazo ? null : f, rechazo?.mensaje ?? null);
        }}
      />
      <Text style={estilos.nota}>{archivo ? archivo.name : 'PDF o imagen, hasta 20 MB.'}</Text>
    </View>
  );
}

/* ------------------------------------------------------------------------ */
/* Pólizas                                                                  */
/* ------------------------------------------------------------------------ */

function VentanaDePoliza({
  obraId,
  reemplaza,
  alCerrar,
  alGuardar,
}: {
  obraId: string;
  /** La póliza que se renueva o se corrige, si es un reemplazo (RF-26). */
  reemplaza: PolizaDelContrato | null;
  alCerrar: () => void;
  alGuardar: (texto: string) => void;
}) {
  const [amparo, setAmparo] = useState<Amparo | null>(reemplaza?.amparo ?? null);
  const [aseguradora, setAseguradora] = useState(reemplaza?.aseguradora ?? '');
  const [numero, setNumero] = useState('');
  const [valor, setValor] = useState(reemplaza?.valor ? String(reemplaza.valor) : '');
  const [desde, setDesde] = useState(reemplaza ? reemplaza.hasta : fechaDeJornada());
  const [hasta, setHasta] = useState('');
  const [archivo, setArchivo] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const valorEnPesos = valor.replace(/\D/g, '') ? Number(valor.replace(/\D/g, '')) : null;
  const falta = !amparo
    ? 'Elija el amparo.'
    : !aseguradora.trim()
      ? 'Falta la aseguradora.'
      : !numero.trim()
        ? 'Falta el número de la póliza.'
        : !desde || !hasta
          ? 'Faltan las fechas de la vigencia.'
          : hasta < desde
            ? 'La póliza no puede terminar antes de empezar.'
            : null;

  async function guardar() {
    setEnviando(true);
    setError(null);
    try {
      const mediaId = archivo ? (await api.contrato.subirArchivo(obraId, archivo)).mediaId : null;
      const datos = { obraId, amparo: amparo!, aseguradora, numero, valor: valorEnPesos, desde, hasta, mediaId };
      if (reemplaza) await api.contrato.reemplazarPoliza(reemplaza.id, datos);
      else await api.contrato.crearPoliza(datos);
      alGuardar(reemplaza ? 'Póliza reemplazada.' : 'Póliza registrada.');
    } catch (fallo) {
      setError(mensajeDe(fallo));
    } finally {
      setEnviando(false);
    }
  }

  return (
    <Modal titulo={reemplaza ? `Reemplazar la póliza ${reemplaza.numero}` : 'Registrar póliza'} onCerrar={alCerrar}>
      {reemplaza ? (
        <Text style={estilos.nota}>La nueva queda activa y esta pasa a «Reemplazada». No se borra.</Text>
      ) : null}
      <Selector
        etiqueta="Amparo"
        valor={amparo}
        opciones={AMPAROS.map((a) => ({ valor: a.id, etiqueta: a.nombre }))}
        onChange={(v) => setAmparo((v as Amparo | null) ?? null)}
        vacio="Elija el amparo"
      />
      <Campo etiqueta="Aseguradora" obligatorio valor={aseguradora} onChange={setAseguradora} />
      <Campo etiqueta="Número de la póliza" obligatorio valor={numero} onChange={setNumero} />
      <Campo
        etiqueta="Valor asegurado"
        valor={valor}
        onChange={setValor}
        ayuda={valorEnPesos !== null ? enPesos(valorEnPesos) : 'En pesos, opcional.'}
      />
      <View style={estilos.fila}>
        <CampoDeFecha etiqueta="Vigente desde" valor={desde} onChange={setDesde} />
        <CampoDeFecha etiqueta="Hasta" valor={hasta} onChange={setHasta} min={desde || undefined} />
      </View>
      <CampoDeArchivo
        archivo={archivo}
        alElegir={(f, e) => {
          setArchivo(f);
          setError(e);
        }}
      />
      {error ? <Aviso tono="error">{error}</Aviso> : falta ? <Text style={estilos.nota}>{falta}</Text> : null}
      <AccionesFormulario>
        <Boton titulo="Cancelar" tono="secundario" onPress={alCerrar} />
        <Boton
          titulo={enviando ? 'Guardando…' : 'Guardar'}
          onPress={guardar}
          deshabilitado={enviando || falta !== null}
        />
      </AccionesFormulario>
    </Modal>
  );
}

/** Pedir el motivo de una anulación (RF-26, RF-29). */
function VentanaDeAnular({
  titulo,
  aviso,
  alCerrar,
  alAnular,
}: {
  titulo: string;
  aviso: string;
  alCerrar: () => void;
  alAnular: (motivo: string) => Promise<void>;
}) {
  const [motivo, setMotivo] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  return (
    <Modal titulo={titulo} onCerrar={alCerrar}>
      <Text style={estilos.nota}>{aviso}</Text>
      <Campo etiqueta="Motivo" obligatorio valor={motivo} onChange={setMotivo} multilinea />
      {error ? <Aviso tono="error">{error}</Aviso> : null}
      <AccionesFormulario>
        <Boton titulo="Cancelar" tono="secundario" onPress={alCerrar} />
        <Boton
          titulo={enviando ? 'Anulando…' : 'Anular'}
          tono="peligro"
          deshabilitado={!motivo.trim() || enviando}
          onPress={async () => {
            setEnviando(true);
            setError(null);
            try {
              await alAnular(motivo);
            } catch (fallo) {
              setError(mensajeDe(fallo));
            } finally {
              setEnviando(false);
            }
          }}
        />
      </AccionesFormulario>
    </Modal>
  );
}

export function PolizasYDocumentos({ leido, recargar }: { leido: ContratoDeObra; recargar: () => void }) {
  const [aviso, setAviso] = useState<string | null>(null);
  const [ventana, setVentana] = useState<
    | { tipo: 'poliza'; reemplaza: PolizaDelContrato | null }
    | { tipo: 'anular-poliza'; poliza: PolizaDelContrato }
    | { tipo: 'documento' }
    | { tipo: 'anular-documento'; documento: DocumentoDelContrato }
    | null
  >(null);

  if (!leido.contrato) {
    return <Aviso tono="info">Guarde primero el contrato para registrar sus pólizas y documentos.</Aviso>;
  }

  const listo = (texto: string) => {
    setVentana(null);
    setAviso(texto);
    recargar();
  };

  const columnasDePolizas: Columna<PolizaDelContrato>[] = [
    {
      clave: 'amparo',
      titulo: 'Amparo',
      ancho: 220,
      pintar: (p) => <Celda>{nombreDeAmparo(p.amparo)}</Celda>,
    },
    {
      clave: 'aseguradora',
      titulo: 'Aseguradora y número',
      ancho: 220,
      pintar: (p) => <Celda>{`${p.aseguradora} · ${p.numero}`}</Celda>,
    },
    {
      clave: 'vigencia',
      titulo: 'Vigencia',
      ancho: 190,
      pintar: (p) => <Celda>{`${fecha(p.desde)} – ${fecha(p.hasta)}`}</Celda>,
    },
    {
      clave: 'valor',
      titulo: 'Valor asegurado',
      ancho: 150,
      pintar: (p) => <Celda>{p.valor !== null ? enPesos(p.valor) : '—'}</Celda>,
    },
    {
      clave: 'estado',
      titulo: 'Estado',
      ancho: 210,
      pintar: (p) =>
        p.estado === 'activa' && p.vigencia ? (
          <View style={estilos.estado}>
            <Etiqueta tono={TONO_DE_VIGENCIA[p.vigencia]}>{NOMBRE_DE_VIGENCIA[p.vigencia]}</Etiqueta>
            <Text style={estilos.nota}>{p.texto}</Text>
          </View>
        ) : (
          <View style={estilos.estado}>
            <Etiqueta tono="neutro">{p.estado === 'anulada' ? 'Anulada' : 'Reemplazada'}</Etiqueta>
            {p.motivoAnulacion ? <Celda lineas={3}>{p.motivoAnulacion}</Celda> : null}
          </View>
        ),
    },
    {
      clave: 'acciones',
      titulo: '',
      ancho: 300,
      anchoMinimo: 300,
      pintar: (p) => (
        <Acciones>
          {p.mediaId ? <Boton titulo="Abrir" tono="secundario" onPress={() => abrirArchivo(p.mediaId!)} /> : null}
          {p.estado === 'activa' ? (
            <>
              <Boton
                titulo="Reemplazar"
                tono="secundario"
                onPress={() => setVentana({ tipo: 'poliza', reemplaza: p })}
              />
              <Boton titulo="Anular" tono="peligro" onPress={() => setVentana({ tipo: 'anular-poliza', poliza: p })} />
            </>
          ) : null}
        </Acciones>
      ),
    },
  ];

  const nombreDeClase = (clase: ClaseDeDocumento) => CLASES_DE_DOCUMENTO.find((c) => c.id === clase)?.nombre ?? clase;
  const columnasDeDocumentos: Columna<DocumentoDelContrato>[] = [
    { clave: 'fecha', titulo: 'Fecha', ancho: 110, pintar: (d) => <Celda>{fecha(d.fecha)}</Celda> },
    { clave: 'clase', titulo: 'Documento', ancho: 180, pintar: (d) => <Celda>{nombreDeClase(d.clase)}</Celda> },
    {
      clave: 'descripcion',
      titulo: 'Descripción',
      ancho: 260,
      pintar: (d) => <Celda lineas={3}>{d.descripcion || '—'}</Celda>,
    },
    { clave: 'subido', titulo: 'Subido por', ancho: 160, pintar: (d) => <Celda>{d.subidoPor}</Celda> },
    {
      clave: 'estado',
      titulo: 'Estado',
      ancho: 200,
      pintar: (d) =>
        d.anulado ? (
          <View style={estilos.estado}>
            <Etiqueta tono="malo">Anulado</Etiqueta>
            <Celda lineas={3}>{`${d.anulado.motivo} (${d.anulado.por})`}</Celda>
          </View>
        ) : (
          <Etiqueta tono="bueno">Vigente</Etiqueta>
        ),
    },
    {
      clave: 'acciones',
      titulo: '',
      ancho: 200,
      anchoMinimo: 200,
      pintar: (d) => (
        <Acciones>
          <Boton titulo="Abrir" tono="secundario" onPress={() => abrirArchivo(d.mediaId)} />
          {d.anulado ? null : (
            <Boton
              titulo="Anular"
              tono="peligro"
              onPress={() => setVentana({ tipo: 'anular-documento', documento: d })}
            />
          )}
        </Acciones>
      ),
    },
  ];

  return (
    <View style={estilos.columna}>
      {aviso ? <Aviso tono="exito">{aviso}</Aviso> : null}

      <Seccion titulo="Pólizas">
        <Acciones>
          <Boton
            titulo="Registrar póliza"
            tono="secundario"
            onPress={() => setVentana({ tipo: 'poliza', reemplaza: null })}
          />
        </Acciones>
        <Tabla columnas={columnasDePolizas} filas={leido.polizas} vacio="Todavía no hay pólizas registradas." />
      </Seccion>

      <Seccion titulo="Documentos">
        <Acciones>
          <Boton titulo="Subir documento" tono="secundario" onPress={() => setVentana({ tipo: 'documento' })} />
        </Acciones>
        <Tabla columnas={columnasDeDocumentos} filas={leido.documentos} vacio="Todavía no hay documentos." />
      </Seccion>

      {ventana?.tipo === 'poliza' ? (
        <VentanaDePoliza
          obraId={leido.obraId}
          reemplaza={ventana.reemplaza}
          alCerrar={() => setVentana(null)}
          alGuardar={listo}
        />
      ) : null}
      {ventana?.tipo === 'anular-poliza' ? (
        <VentanaDeAnular
          titulo={`Anular la póliza ${ventana.poliza.numero}`}
          aviso="La póliza queda en la lista como anulada, con el motivo. Si se renovó, use «Reemplazar»."
          alCerrar={() => setVentana(null)}
          alAnular={async (motivo) => {
            await api.contrato.anularPoliza(ventana.poliza.id, motivo);
            listo('Póliza anulada.');
          }}
        />
      ) : null}
      {ventana?.tipo === 'documento' ? (
        <VentanaDeDocumento obraId={leido.obraId} alCerrar={() => setVentana(null)} alGuardar={listo} />
      ) : null}
      {ventana?.tipo === 'anular-documento' ? (
        <VentanaDeAnular
          titulo="Anular documento"
          aviso="El documento sigue en la lista, marcado como anulado, con el motivo."
          alCerrar={() => setVentana(null)}
          alAnular={async (motivo) => {
            await api.contrato.anularDocumento(ventana.documento.id, motivo);
            listo('Documento anulado.');
          }}
        />
      ) : null}
    </View>
  );
}

/* ------------------------------------------------------------------------ */
/* Documentos                                                               */
/* ------------------------------------------------------------------------ */

function VentanaDeDocumento({
  obraId,
  alCerrar,
  alGuardar,
}: {
  obraId: string;
  alCerrar: () => void;
  alGuardar: (texto: string) => void;
}) {
  const [clase, setClase] = useState<ClaseDeDocumento | null>(null);
  const [cuando, setCuando] = useState(fechaDeJornada());
  const [descripcion, setDescripcion] = useState('');
  const [archivo, setArchivo] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const falta = !clase
    ? 'Elija la clase de documento.'
    : !cuando
      ? 'Falta la fecha.'
      : !archivo
        ? 'Elija el archivo.'
        : null;

  async function guardar() {
    setEnviando(true);
    setError(null);
    try {
      const { mediaId } = await api.contrato.subirArchivo(obraId, archivo!);
      await api.contrato.crearDocumento({ obraId, clase: clase!, fecha: cuando, descripcion, mediaId });
      alGuardar('Documento subido.');
    } catch (fallo) {
      setError(mensajeDe(fallo));
    } finally {
      setEnviando(false);
    }
  }

  return (
    <Modal titulo="Subir documento" onCerrar={alCerrar}>
      <Selector
        etiqueta="Documento"
        valor={clase}
        opciones={CLASES_DE_DOCUMENTO.map((c) => ({ valor: c.id, etiqueta: c.nombre }))}
        onChange={(v) => setClase((v as ClaseDeDocumento | null) ?? null)}
        vacio="Elija la clase"
      />
      <CampoDeFecha etiqueta="Fecha" valor={cuando} onChange={setCuando} />
      <Campo etiqueta="Descripción" valor={descripcion} onChange={setDescripcion} multilinea />
      <CampoDeArchivo
        archivo={archivo}
        obligatorio
        alElegir={(f, e) => {
          setArchivo(f);
          setError(e);
        }}
      />
      {error ? <Aviso tono="error">{error}</Aviso> : falta ? <Text style={estilos.nota}>{falta}</Text> : null}
      <AccionesFormulario>
        <Boton titulo="Cancelar" tono="secundario" onPress={alCerrar} />
        <Boton titulo={enviando ? 'Subiendo…' : 'Subir'} onPress={guardar} deshabilitado={enviando || falta !== null} />
      </AccionesFormulario>
    </Modal>
  );
}

const estilos = StyleSheet.create({
  columna: { gap: 16 },
  fila: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  archivo: { gap: 6, alignItems: 'flex-start' },
  estado: { gap: 4, alignItems: 'flex-start' },
  nota: { fontFamily: FuentePanel.texto, fontSize: TextoPanel.cuerpo, color: Panel.textoApoyo },
});
