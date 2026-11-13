/**
 * Revisar y confirmar la propuesta de un documento importado (spec 042, RF-10 a RF-17, RF-19 a
 * RF-37, RF-43, RF-44, RF-58, RF-69 a RF-77, RF-81 a RF-85, RF-89, RF-90).
 *
 * Arriba, los datos de todo el documento, que se corrigen ahí mismo: proveedor, tipo, número, fecha
 * y quién entregó (RF-11, RF-13, RF-30 a RF-33). Debajo, un renglón por material, con lo que trae el
 * documento a la izquierda —su nombre y su cita, para comparar (RF-15, RF-76)— y lo que se va a
 * registrar a la derecha: el material, la cantidad en su unidad con de dónde salió la conversión
 * (RF-25, RF-26) y el valor con la unidad del documento (RF-58). Cada renglón se ajusta o se quita en
 * su ventana (`ventana-renglon.tsx`).
 *
 * ── Lo que impide confirmar ──
 *
 * Las marcas de cada renglón y las faltas del documento salen de las mismas reglas que usa el
 * servidor al confirmar (`estadoDelRenglon`, `faltasParaConfirmar`, `materialesNuevosDe`), con la fecha
 * de hoy en Colombia: lo que esta pantalla deja confirmar es lo que el servidor acepta (principio 3).
 * Lo que bloquea apaga «Confirmar» y se nombra por renglón; los avisos se ven y no impiden (D12).
 *
 * ── Lo que solo se sabe en el servidor ──
 *
 * El aviso de documento repetido viene con la propuesta (RF-43), y pide una casilla antes de confirmar
 * (RF-44). Si se corrigen el proveedor o el número, el servidor lo vuelve a mirar al confirmar y, si
 * ahora es repetido, responde 409 con quién y cuándo: la casilla aparece entonces. Cualquier otro 409
 * —ya entró, cambió, venció, un material dejó de estar vigente— se dice y se ofrece volver a cargar,
 * sin reintentar solo (RF-86, RF-89).
 *
 * Nada se guarda en el servidor hasta confirmar: lo que se corrige vive en esta pantalla (RF-18).
 *
 * Las columnas caben en `MaxContentWidthPanel` (1 280): 300 + 230 + 170 + 170 + 100 = 970, más cuatro
 * separaciones de 16 y 16 a cada lado: 1 066. Las marcas van dentro de la columna del material.
 */
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { FuentePanel, Panel, TextoPanel } from '@/constants/theme';
import type { ImportacionConfirmada, ImportacionDetalle, RevisionDelRepetido } from '@/features/panel/almacen-importacion';
import { api, ErrorApi, mensajeDe } from '@/features/panel/cliente-api';
import { Acciones, Aviso, Boton, Campo, CampoDeFecha, Casilla, Celda, Etiqueta, Selector, Tabla, type Columna } from '@/features/panel/componentes';
import { abreviaturaDeUnidad } from '@/shared/catalogos/almacen';
import {
  estadoDelRenglon,
  faltasParaConfirmar,
  importacionAConfirmar,
  materialesNuevosDe,
  TIPOS_DE_DOCUMENTO,
  valorConSuUnidad,
  type DocumentoDeLaImportacion,
  type DocumentoRepetido,
  type FaltaParaConfirmar,
  type MarcaDelRenglon,
  type RenglonDeLaImportacion,
  type TipoDeDocumento,
} from '@/shared/rules/almacen-importacion';
import { fechaDeJornada } from '@/shared/rules/jornada';

import { unidadDelMaterial, VentanaDeRenglon } from './ventana-renglon';

const NOMBRE_DEL_TIPO: Record<TipoDeDocumento, string> = { factura: 'Factura', remision: 'Remisión', otro: 'Otro' };

/** Cómo se rotula cada marca en la tabla; el texto completo va en la lista de abajo. */
const ROTULO: Record<MarcaDelRenglon, string> = {
  sin_material: 'Falta el material',
  unidad_sin_convertir: 'Falta convertir',
  sin_cantidad: 'Falta la cantidad',
  revisar: 'Revisar cifra',
  unidad_distinta: 'Unidad convertida',
  calculado_del_total: 'Calculado del total',
};

const enCantidad = (n: number) => n.toLocaleString('es-CO', { maximumFractionDigits: 2 });

function cuando(iso: string): string {
  return new Date(iso).toLocaleString('es-CO', { timeZone: 'America/Bogota', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' });
}

interface FilaDeRenglon {
  id: string;
  n: number;
  r: RenglonDeLaImportacion;
}

export function RevisarImportacion({
  detalle,
  alConfirmar,
  alDescartar,
  alRecargar,
}: {
  detalle: ImportacionDetalle;
  /** RF-38: entró; con cuántos ingresos y materiales nuevos. */
  alConfirmar: (resultado: ImportacionConfirmada) => void;
  alDescartar: () => void;
  /** Volver a pedir la propuesta al servidor; lo corregido se pierde. */
  alRecargar: () => void;
}) {
  const inicial = detalle.propuesta!;
  const [documento, setDocumento] = useState(inicial.documento);
  const [renglones, setRenglones] = useState(inicial.renglones);
  const [abierto, setAbierto] = useState<number | null>(null);
  const [repetido, setRepetido] = useState<RevisionDelRepetido>(detalle.repetido);
  const [aceptoRepetido, setAceptoRepetido] = useState(false);
  const [verFuera, setVerFuera] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<{ texto: string; recargar: boolean } | null>(null);
  const [faltasDelServidor, setFaltasDelServidor] = useState<FaltaParaConfirmar[]>([]);
  // RF-34: «hoy» en Colombia, una vez al abrir; el servidor lo vuelve a mirar al confirmar.
  const [hoy] = useState(() => fechaDeJornada(Date.now()));

  const ponerEnDocumento = (cambio: Partial<DocumentoDeLaImportacion>) => {
    setDocumento({ ...documento, ...cambio });
    setFaltasDelServidor([]);
  };
  const ponerRenglones = (nuevos: RenglonDeLaImportacion[]) => {
    setRenglones(nuevos);
    setFaltasDelServidor([]);
  };

  // D12: las mismas reglas que el servidor, con la fecha de hoy en Colombia.
  const unidadDe = (r: RenglonDeLaImportacion) => unidadDelMaterial(r.material, detalle.materiales);
  const marcas = renglones.map((r) => estadoDelRenglon(r, unidadDe(r)));
  const propuesta = { documento, renglones };
  const deLaRegla = faltasParaConfirmar(propuesta, unidadDe, hoy);
  const faltas = deLaRegla.length > 0 ? deLaRegla : materialesNuevosDe(importacionAConfirmar(propuesta)).faltas;
  const todasLasFaltas = faltas.length > 0 ? faltas : faltasDelServidor;
  const faltaAceptar = repetido.tipo === 'repetido' && !aceptoRepetido;

  const nombreDelMaterial = (r: RenglonDeLaImportacion) => {
    const { material } = r;
    if (!material) return null;
    if (material.tipo === 'nuevo') return material.nombre;
    return detalle.materiales.find((m) => m.id === material.id)?.nombre ?? 'Un material que ya no está en la obra';
  };
  const nombreDelRenglon = (n: number) => `Renglón ${n + 1} · ${renglones[n]?.nombreEnDocumento ?? ''}`;

  async function confirmar() {
    setEnviando(true);
    setError(null);
    try {
      const resultado = await api.almacen.importaciones.confirmar(detalle.id, {
        version: detalle.version,
        documento,
        renglones,
        confirmarRepetido: repetido.tipo === 'repetido' && aceptoRepetido,
      });
      alConfirmar(resultado);
    } catch (fallo) {
      const cuerpo = fallo instanceof ErrorApi ? (fallo.cuerpo as { faltas?: FaltaParaConfirmar[]; repetido?: DocumentoRepetido } | undefined) : undefined;
      if (cuerpo?.repetido) {
        // RF-43, RF-44: con el proveedor o el número corregidos, ahora es repetido.
        setRepetido({ tipo: 'repetido', repetido: cuerpo.repetido });
        setAceptoRepetido(false);
        setError({ texto: mensajeDe(fallo), recargar: false });
      } else if (cuerpo?.faltas) {
        setFaltasDelServidor(cuerpo.faltas);
        setError({ texto: mensajeDe(fallo), recargar: false });
      } else {
        // RF-86, RF-89: ya entró, cambió, venció o un material dejó de estar vigente.
        setError({ texto: mensajeDe(fallo), recargar: fallo instanceof ErrorApi && fallo.estado === 409 });
      }
    } finally {
      setEnviando(false);
    }
  }

  async function descartar() {
    setEnviando(true);
    setError(null);
    try {
      await api.almacen.importaciones.descartar(detalle.id);
      alDescartar();
    } catch (fallo) {
      setError({ texto: mensajeDe(fallo), recargar: false });
    } finally {
      setEnviando(false);
    }
  }

  const columnas: Columna<FilaDeRenglon>[] = [
    {
      clave: 'documento',
      titulo: 'Del documento',
      ancho: 300,
      pintar: ({ r }) => (
        <View style={estilos.celda}>
          <Celda>{r.nombreEnDocumento}</Celda>
          <Text style={estilos.pie}>
            {[r.cita, r.cantidadEnDocumento !== null ? `${enCantidad(r.cantidadEnDocumento)} ${r.unidadEnDocumento ?? '(sin unidad)'}` : 'sin cantidad'].filter(Boolean).join(' · ')}
          </Text>
        </View>
      ),
    },
    {
      clave: 'material',
      titulo: 'Material del Almacén',
      ancho: 230,
      pintar: ({ r, n }) => (
        <View style={estilos.celda}>
          <Celda>{nombreDelMaterial(r) ?? '—'}</Celda>
          <View style={estilos.marcas}>
            {r.material?.tipo === 'nuevo' ? <Etiqueta tono="neutro">{r.material.deLaLista ? 'Nuevo, de la lista de OCC' : 'Nuevo'}</Etiqueta> : null}
            {marcas[n].map((m) => (
              <Etiqueta key={m.marca} tono={m.tipo === 'bloquea' ? 'malo' : 'atencion'}>
                {ROTULO[m.marca]}
              </Etiqueta>
            ))}
          </View>
        </View>
      ),
    },
    {
      clave: 'cantidad',
      titulo: 'Cantidad',
      ancho: 170,
      pintar: ({ r }) => {
        const unidad = unidadDe(r);
        return (
          <View style={estilos.celda}>
            <Celda>{r.cantidad === null ? '—' : `${enCantidad(r.cantidad)}${unidad ? ` ${abreviaturaDeUnidad(unidad)}` : ''}`}</Celda>
            {r.conversion ? <Text style={estilos.pie}>{r.conversion.fuente}</Text> : null}
          </View>
        );
      },
    },
    {
      clave: 'valor',
      titulo: 'Valor unitario',
      ancho: 170,
      pintar: ({ r }) => (
        <View style={estilos.celda}>
          <Celda>{valorConSuUnidad(r.valorUnitario, r.valorUnidad) ?? '—'}</Celda>
          {r.valorCalculadoDelTotal ? <Text style={estilos.pie}>Calculado del total</Text> : null}
        </View>
      ),
    },
    {
      clave: 'acciones',
      titulo: '',
      ancho: 100,
      anchoMinimo: 100,
      pintar: ({ n }) => <Boton titulo="Ajustar" tono="secundario" onPress={() => setAbierto(n)} />,
    },
  ];

  return (
    <View style={estilos.columna}>
      <Text style={estilos.subtitulo}>El documento</Text>
      <View style={estilos.fila}>
        <Campo etiqueta="Proveedor" valor={documento.proveedor ?? ''} onChange={(v) => ponerEnDocumento({ proveedor: v || null })} ancho={280} />
        <Selector
          etiqueta="Tipo"
          valor={documento.tipo}
          opciones={TIPOS_DE_DOCUMENTO.map((t) => ({ valor: t, etiqueta: NOMBRE_DEL_TIPO[t] }))}
          onChange={(v) => v && ponerEnDocumento({ tipo: v as TipoDeDocumento })}
          ancho={150}
        />
        <Campo etiqueta="Número" valor={documento.numero ?? ''} onChange={(v) => ponerEnDocumento({ numero: v || null })} ancho={160} />
        <CampoDeFecha etiqueta="Fecha de los ingresos" valor={documento.fecha} onChange={(fecha) => ponerEnDocumento({ fecha })} ancho={180} />
        <Campo etiqueta="Entregado por" valor={documento.entregadoPor} onChange={(entregadoPor) => ponerEnDocumento({ entregadoPor })} ancho={240} obligatorio />
      </View>

      {/* RF-71, RF-75: lo que se dice sin impedir. */}
      {inicial.avisos.map((aviso, n) => (
        <Aviso key={n} tono="info">
          {aviso}
        </Aviso>
      ))}
      {/* RF-90: sin proveedor o número no se pudo revisar. */}
      {repetido.tipo === 'sin_clave' ? <Aviso tono="info">Falta el proveedor o el número: no se pudo revisar si este documento ya se importó.</Aviso> : null}

      <Text style={estilos.subtitulo}>{`Materiales (${renglones.length})`}</Text>
      <Tabla
        filas={renglones.map((r, n) => ({ id: String(n), n, r }))}
        columnas={columnas}
        vacio="No queda ningún renglón. Descarte la propuesta o vuelva a subir el documento."
      />

      {/* RF-73, RF-74: lo que la IA dejó por fuera, con su motivo. */}
      {inicial.dejadosPorFuera.length > 0 ? (
        <View style={estilos.columnaCorta}>
          <Acciones>
            <Boton
              titulo={verFuera ? 'Ocultar lo que no entra' : `Ver lo que no entra como ingreso (${inicial.dejadosPorFuera.length})`}
              tono="secundario"
              onPress={() => setVerFuera(!verFuera)}
            />
          </Acciones>
          {verFuera
            ? inicial.dejadosPorFuera.map((d, n) => <Text key={n} style={estilos.pie}>{`• ${d.texto} (${d.cita}): ${d.motivo}`}</Text>)
            : null}
        </View>
      ) : null}

      {/* D12: lo que bloquea, nombrado por renglón (o del documento). */}
      {todasLasFaltas.length > 0 ? (
        <Aviso tono="error">
          {['Antes de confirmar:', ...todasLasFaltas.map((f) => `• ${f.renglon === null ? 'El documento' : nombreDelRenglon(f.renglon)}: ${f.texto}`)].join('\n')}
        </Aviso>
      ) : null}

      {/* RF-43, RF-44. */}
      {repetido.tipo === 'repetido' ? (
        <View style={estilos.columnaCorta}>
          <Aviso tono="error">
            {`Este documento ya se importó el ${cuando(repetido.repetido.importadoEn)}${repetido.repetido.importadoPor ? `, lo confirmó ${repetido.repetido.importadoPor}` : ''} (${repetido.repetido.ingresosVigentes} ingresos vigentes).`}
          </Aviso>
          <Casilla etiqueta="Es otra entrega con el mismo número: registrarlo de todas formas." marcada={aceptoRepetido} onChange={setAceptoRepetido} />
        </View>
      ) : null}

      {error ? <Aviso tono="error">{error.texto}</Aviso> : null}
      <Acciones>
        {error?.recargar ? (
          <Boton titulo="Volver a cargar la propuesta" tono="primario" onPress={alRecargar} />
        ) : (
          <Boton
            titulo={enviando ? 'Confirmando…' : `Confirmar ${renglones.length} ${renglones.length === 1 ? 'ingreso' : 'ingresos'}`}
            tono="primario"
            deshabilitado={enviando || faltas.length > 0 || faltaAceptar}
            onPress={() => void confirmar()}
          />
        )}
        <Boton titulo="Descartar la propuesta" tono="peligro" deshabilitado={enviando} onPress={() => void descartar()} />
      </Acciones>
      {faltaAceptar ? <Text style={estilos.pie}>Marque la casilla del documento repetido para confirmar.</Text> : null}

      {abierto !== null && renglones[abierto] ? (
        <VentanaDeRenglon
          key={abierto}
          renglon={renglones[abierto]}
          materiales={detalle.materiales}
          alAceptar={(r) => {
            ponerRenglones(renglones.map((x, n) => (n === abierto ? r : x)));
            setAbierto(null);
          }}
          alQuitar={() => {
            ponerRenglones(renglones.filter((_, n) => n !== abierto));
            setAbierto(null);
          }}
          alCerrar={() => setAbierto(null)}
        />
      ) : null}
    </View>
  );
}

const estilos = StyleSheet.create({
  columna: { gap: 12 },
  columnaCorta: { gap: 6 },
  fila: { flexDirection: 'row', gap: 12, flexWrap: 'wrap', alignItems: 'flex-start' },
  celda: { gap: 4 },
  marcas: { flexDirection: 'row', gap: 4, flexWrap: 'wrap' },
  subtitulo: { fontFamily: FuentePanel.texto, fontWeight: '600', fontSize: TextoPanel.cuerpo, color: Panel.texto },
  pie: { fontFamily: FuentePanel.texto, fontSize: TextoPanel.apoyo, color: Panel.textoApoyo },
});
