/**
 * Una solicitud de compra con todo lo que le pasó (spec 036, RF-11, RF-20, RF-21, RF-23).
 *
 * La abren Solicitudes de compra de su lugar y Compras de Elemental. Lo que puede hacer
 * quien la mira lo manda el servidor en `pasos` (con `puedeDar`, la misma regla que lo
 * revisa al recibirlo): un botón que no se puede pulsar no se pinta.
 *
 * Los valores (estimado y de cada compra) solo existen si el servidor los mandó (RF-31). Los
 * adjuntos son la carpeta de Documentos de la solicitud, con las clases de precio fuera
 * para quien no ve los valores.
 */
import { useCallback, useState, type ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { FuentePanel, Panel, Spacing, TextoPanel } from '@/constants/theme';
import { CarpetaDeDocumentos, useDocumentosDelLugar } from '@/features/documentos/pantalla-documentos';
import { api, mensajeDe, type LugarDeLasSolicitudes } from '@/features/panel/cliente-api';
import {
  Acciones,
  AccionesFormulario,
  Aviso,
  Boton,
  Campo,
  CampoDeFecha,
  Celda,
  Confirmado,
  Etiqueta,
  Modal,
  Seccion,
  Selector,
  Tabla,
  type Columna,
} from '@/features/panel/componentes';
import type { SolicitudDetallada } from '@/features/panel/contratos';
import { MarcoPantalla, useListado } from '@/features/panel/marco';
import { usePersona } from '@/features/panel/sesion';
import { veLosValores } from '@/shared/rules/compras';
import { fechaDelCorte } from '@/shared/rules/cortes';
import { fechaDeJornada } from '@/shared/rules/jornada';
import { alcanza } from '@/shared/rules/permisos';
import { enPesos } from '@/shared/rules/pesos';

import { FormularioDeSolicitud } from './formulario-de-solicitud';
import { EstadoDeLaSolicitud } from './partes';

type Renglon = SolicitudDetallada['renglones'][number];
type Compra = SolicitudDetallada['compras'][number];
type Recepcion = SolicitudDetallada['recepciones'][number];
type Evento = SolicitudDetallada['historia'][number];

const cuando = (iso: string) => new Date(iso).toLocaleString('es-CO', { dateStyle: 'medium', timeStyle: 'short' });
const cantidad = (n: number) => n.toLocaleString('es-CO');

/** Lo que dice la historia de cada paso (RF-23), con lo que cambió. */
export function textoDelEvento(e: Evento, renglones: Renglon[]): string {
  const cambios = e.cambios as Record<string, unknown>[];
  const ordenes = (lista: unknown) =>
    Array.isArray(lista) ? `${lista.length === 1 ? 'renglón' : 'renglones'} ${lista.join(', ')}` : '';
  switch (e.paso) {
    case 'enviada':
      return 'Pidió la compra.';
    case 'corregir': {
      const campos = (cambios[0]?.campos as string[] | undefined) ?? [];
      return campos.length ? `La corrigió y la volvió a enviar (cambió: ${campos.join(', ')}).` : 'La volvió a enviar sin cambios.';
    }
    case 'aprobar':
      return cambios.length
        ? `La aprobó con cambios: ${cambios
            .map((c) => `renglón ${c.renglon} (${c.descripcion}) de ${cantidad(Number(c.antes))} a ${cantidad(Number(c.despues))}`)
            .join('; ')}.`
        : 'La aprobó tal como se pidió.';
    case 'rechazar':
      return 'La rechazó.';
    case 'devolver':
      return 'La devolvió para corregir.';
    case 'cancelar':
      return 'La canceló.';
    case 'registrar_compra':
      return `Registró la compra a ${String(cambios[0]?.proveedor ?? '')} (${ordenes(cambios[0]?.renglones)}).`;
    case 'anular_compra':
      return `Anuló la compra a ${String(cambios[0]?.proveedor ?? '')}.`;
    case 'recibir':
      return `Recibió ${cambios
        .map((c) => {
          const r = renglones.find((x) => x.orden === c.renglon);
          return `${cantidad(Number(c.cantidad))} ${r?.unidad ?? ''} del renglón ${c.renglon}`;
        })
        .join(', ')}.`;
    default:
      return e.paso;
  }
}

/**
 * Una ventana que pide el motivo antes de hacer algo que no se deshace: cancelar, rechazar,
 * devolver, anular una compra (RF-11, RF-14, RF-15, RF-30).
 */
export function VentanaDeMotivo({
  titulo,
  aviso,
  etiqueta = 'Motivo',
  accion,
  tono = 'peligro',
  alCerrar,
  alConfirmar,
}: {
  titulo: string;
  aviso: string;
  etiqueta?: string;
  accion: string;
  tono?: 'primario' | 'peligro';
  alCerrar: () => void;
  alConfirmar: (motivo: string) => Promise<void>;
}) {
  const [motivo, setMotivo] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  return (
    <Modal titulo={titulo} onCerrar={alCerrar}>
      <Text style={estilos.texto}>{aviso}</Text>
      <Campo etiqueta={etiqueta} obligatorio valor={motivo} onChange={setMotivo} multilinea compacto />
      {error ? <Aviso tono="error">{error}</Aviso> : null}
      <AccionesFormulario>
        <Boton titulo="Volver" tono="secundario" onPress={alCerrar} />
        <Boton
          titulo={enviando ? 'Guardando…' : accion}
          tono={tono}
          deshabilitado={!motivo.trim() || enviando}
          onPress={async () => {
            setEnviando(true);
            setError(null);
            try {
              await alConfirmar(motivo);
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
 * Lo que llegó (RF-20): por renglón comprado, con lo que falta ya escrito; se cambia si
 * llegó otra cosa, y lo que se deja vacío o en cero no se registra. Puede llevar la remisión
 * o una foto ya adjunta a la solicitud.
 */
function VentanaDeRecibir({
  solicitud,
  soportes,
  alCerrar,
  alRecibir,
}: {
  solicitud: SolicitudDetallada;
  soportes: { id: string; nombre: string }[];
  alCerrar: () => void;
  alRecibir: (mensaje: string) => void;
}) {
  const comprados = new Set(solicitud.compras.filter((c) => !c.anulada).flatMap((c) => c.renglonIds));
  const porRecibir = solicitud.renglones.filter((r) => comprados.has(r.id));
  const [cantidades, setCantidades] = useState<Record<string, string>>(
    Object.fromEntries(
      porRecibir.map((r) => [r.id, String(Math.max((r.cantidadAprobada ?? 0) - r.recibido, 0)).replace('.', ',')]),
    ),
  );
  const [fecha, setFecha] = useState(fechaDeJornada());
  const [nota, setNota] = useState('');
  const [soporte, setSoporte] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  const recibos = porRecibir
    .map((r) => ({ renglonId: r.id, cantidad: Number((cantidades[r.id] ?? '').trim().replace(',', '.')) }))
    .filter((x) => x.cantidad > 0);

  async function recibir() {
    setEnviando(true);
    setError(null);
    try {
      const r = await api.compras.recibir(solicitud.id, {
        version: solicitud.version,
        fecha,
        nota,
        documentoId: soporte,
        recibos,
      });
      alRecibir(r.estado === 'recibida' ? 'Recibido. La solicitud quedó completa.' : 'Recibido. Todavía falta algo por llegar.');
    } catch (fallo) {
      setError(mensajeDe(fallo));
      setEnviando(false);
    }
  }

  return (
    <Modal titulo={`Recibir · ${solicitud.codigo}`} onCerrar={alCerrar}>
      <Text style={estilos.texto}>Escriba cuánto llegó de cada renglón. Lo que no llegó, déjelo en cero.</Text>
      {porRecibir.map((r) => (
        <View key={r.id} style={estilos.fila}>
          <Text style={[estilos.texto, estilos.renglonDeRecibo]}>
            {`${r.orden}. ${r.descripcion} — aprobado ${cantidad(r.cantidadAprobada ?? 0)} ${r.unidad}, recibido ${cantidad(r.recibido)}`}
          </Text>
          <Campo
            etiqueta={`Llegó (${r.unidad})`}
            valor={cantidades[r.id] ?? ''}
            onChange={(v) => setCantidades((todas) => ({ ...todas, [r.id]: v }))}
            ancho={130}
          />
        </View>
      ))}
      <CampoDeFecha etiqueta="Llegó el" valor={fecha} onChange={setFecha} max={fechaDeJornada()} />
      <Campo etiqueta="Nota" valor={nota} onChange={setNota} multilinea compacto ayuda="Opcional. Por ejemplo: llegaron 8 de 20, el resto el lunes." />
      {soportes.length ? (
        <Selector
          etiqueta="Soporte"
          valor={soporte}
          opciones={soportes.map((s) => ({ valor: s.id, etiqueta: s.nombre }))}
          onChange={setSoporte}
          permiteVacio
          vacio="Sin soporte"
          ancho={320}
        />
      ) : (
        <Text style={estilos.apoyo}>Para usar la remisión o una foto como soporte, adjúntela primero en «Adjuntos».</Text>
      )}
      {error ? <Aviso tono="error">{error}</Aviso> : null}
      <AccionesFormulario>
        <Boton titulo="Volver" tono="secundario" onPress={alCerrar} />
        <Boton
          titulo={enviando ? 'Guardando…' : 'Registrar lo que llegó'}
          onPress={recibir}
          deshabilitado={enviando || recibos.length === 0}
        />
      </AccionesFormulario>
    </Modal>
  );
}

function Dato({ titulo, children }: { titulo: string; children: ReactNode }) {
  return (
    <View style={estilos.dato}>
      <Text style={estilos.apoyo}>{titulo}</Text>
      {typeof children === 'string' ? <Text style={estilos.texto}>{children}</Text> : children}
    </View>
  );
}

export function VistaDeLaSolicitud({
  id,
  alVolver,
  volverA = 'las solicitudes',
  accionesExtra,
}: {
  id: string;
  alVolver: () => void;
  volverA?: string;
  /** Los pasos de la gerencia, que pone Compras de Elemental (T17). */
  accionesExtra?: (s: SolicitudDetallada, listo: (mensaje: string) => void) => ReactNode;
}) {
  const persona = usePersona();
  const cargada = useListado<SolicitudDetallada>(
    useCallback(() => api.compras.detalle(id).then((d) => [d]), [id]),
  );
  const documentos = useDocumentosDelLugar({ solicitudId: id });
  const [ventana, setVentana] = useState<'corregir' | 'cancelar' | 'recibir' | null>(null);
  const [hecho, setHecho] = useState<string | null>(null);
  const s = cargada.datos[0];

  const listo = (mensaje: string) => {
    setVentana(null);
    setHecho(mensaje);
    cargada.recargar();
    documentos.recargar();
  };

  const volver = <Boton titulo={`← Volver a ${volverA}`} tono="secundario" onPress={alVolver} />;
  if (!s) {
    return (
      <MarcoPantalla titulo="Solicitud de compra" descripcion="" error={cargada.error} cargando={cargada.cargando}>
        <Acciones>{volver}</Acciones>
      </MarcoPantalla>
    );
  }

  const conValores = 'valorEstimado' in s;
  const lugar: LugarDeLasSolicitudes =
    s.lugar.tipo === 'empresa' ? { empresa: s.lugar.id as 'occ' | 'geolab' } : { obraId: s.lugar.id };
  const compraDe = (renglonId: string) => s.compras.find((c) => !c.anulada && c.renglonIds.includes(renglonId));
  const nombreDelAdjunto = new Map((documentos.datos[0]?.documentos ?? []).map((d) => [d.id, d.nombre]));
  const soportes = (documentos.datos[0]?.documentos ?? [])
    .filter((d) => !d.anulado && (d.clase === 'remision' || d.clase === 'foto'))
    .map((d) => ({ id: d.id, nombre: `${d.claseNombre}: ${d.nombre}` }));

  const columnasRenglones: Columna<Renglon>[] = [
    { clave: 'orden', titulo: '#', ancho: 40, pintar: (r) => <Celda>{String(r.orden)}</Celda> },
    { clave: 'que', titulo: 'Qué se pide', ancho: 260, pintar: (r) => <Celda>{r.descripcion}</Celda> },
    { clave: 'pedido', titulo: 'Pedido', ancho: 110, pintar: (r) => <Celda>{`${cantidad(r.cantidad)} ${r.unidad}`}</Celda> },
    {
      clave: 'aprobado',
      titulo: 'Aprobado',
      ancho: 110,
      pintar: (r) =>
        r.cantidadAprobada === null ? (
          <Celda>—</Celda>
        ) : r.cantidadAprobada === 0 ? (
          <Etiqueta tono="neutro">Quitado</Etiqueta>
        ) : (
          <Celda>{`${cantidad(r.cantidadAprobada)} ${r.unidad}`}</Celda>
        ),
    },
    {
      clave: 'recibido',
      titulo: 'Recibido',
      ancho: 150,
      pintar: (r) => (
        <View style={estilos.celdaDoble}>
          <Text style={estilos.texto}>{r.recibido ? `${cantidad(r.recibido)} ${r.unidad}` : '—'}</Text>
          {r.cantidadAprobada !== null && r.recibido > r.cantidadAprobada ? (
            <Etiqueta tono="atencion">{`${cantidad(r.recibido - r.cantidadAprobada)} de más`}</Etiqueta>
          ) : null}
        </View>
      ),
    },
    { clave: 'compra', titulo: 'Comprado a', ancho: 180, pintar: (r) => <Celda>{compraDe(r.id)?.proveedor ?? '—'}</Celda> },
  ];

  const columnasCompras: Columna<Compra>[] = [
    {
      clave: 'proveedor',
      titulo: 'Proveedor',
      ancho: 200,
      pintar: (c) => (
        <View style={estilos.celdaDoble}>
          <Text style={[estilos.texto, c.anulada && estilos.anulado]}>{c.proveedor}</Text>
          {c.anulada ? <Text style={estilos.apoyo}>{`Anulada por ${c.anulada.por}: ${c.anulada.motivo}`}</Text> : null}
        </View>
      ),
    },
    ...(conValores
      ? [{ clave: 'valor', titulo: 'Valor', ancho: 130, pintar: (c: Compra) => <Celda>{c.valor ? enPesos(c.valor) : '—'}</Celda> }]
      : []),
    { clave: 'fecha', titulo: 'Fecha', ancho: 110, pintar: (c) => <Celda>{fechaDelCorte(c.fecha)}</Celda> },
    { clave: 'factura', titulo: 'Factura o remisión', ancho: 140, pintar: (c) => <Celda>{c.factura || '—'}</Celda> },
    {
      clave: 'renglones',
      titulo: 'Renglones',
      ancho: 110,
      pintar: (c) => (
        <Celda>{s.renglones.filter((r) => c.renglonIds.includes(r.id)).map((r) => r.orden).join(', ')}</Celda>
      ),
    },
    {
      clave: 'por',
      titulo: 'Registrada por',
      ancho: 220,
      pintar: (c) => (
        <View style={estilos.celdaDoble}>
          <Text style={estilos.texto}>{c.registradaPor}</Text>
          <Text style={estilos.apoyo}>{cuando(c.registradaEn)}</Text>
        </View>
      ),
    },
  ];

  const columnasRecibos: Columna<Recepcion>[] = [
    { clave: 'fecha', titulo: 'Llegó el', ancho: 110, pintar: (r) => <Celda>{fechaDelCorte(r.fecha)}</Celda> },
    {
      clave: 'que',
      titulo: 'Qué',
      ancho: 260,
      pintar: (x) => {
        const r = s.renglones.find((y) => y.id === x.renglonId);
        return <Celda>{`${cantidad(x.cantidad)} ${r?.unidad ?? ''} · ${r?.orden ?? ''}. ${r?.descripcion ?? ''}`}</Celda>;
      },
    },
    { clave: 'nota', titulo: 'Nota', ancho: 220, pintar: (r) => <Celda>{r.nota || '—'}</Celda> },
    {
      clave: 'soporte',
      titulo: 'Soporte',
      ancho: 180,
      // El nombre, si quien mira lo puede ver: está en los adjuntos de la solicitud.
      pintar: (r) => <Celda>{(r.documentoId && nombreDelAdjunto.get(r.documentoId)) || '—'}</Celda>,
    },
    { clave: 'por', titulo: 'Registró', ancho: 180, pintar: (r) => <Celda>{`${r.por} · ${cuando(r.en)}`}</Celda> },
  ];

  const historia = s.historia.map((e, i) => ({ ...e, id: String(i) }));
  const columnasHistoria: Columna<Evento & { id: string }>[] = [
    { clave: 'en', titulo: 'Cuándo', ancho: 170, pintar: (e) => <Celda>{cuando(e.en)}</Celda> },
    { clave: 'por', titulo: 'Quién', ancho: 180, pintar: (e) => <Celda>{e.por}</Celda> },
    {
      clave: 'que',
      titulo: 'Qué hizo',
      ancho: 420,
      pintar: (e) => (
        <View style={estilos.celdaDoble}>
          <Text style={estilos.texto}>{textoDelEvento(e, s.renglones)}</Text>
          {e.motivo ? <Text style={estilos.apoyo}>{`Motivo: ${e.motivo}`}</Text> : null}
        </View>
      ),
    },
  ];

  const devolucion = s.estado === 'devuelta' ? [...s.historia].reverse().find((e) => e.paso === 'devolver') : null;

  return (
    <MarcoPantalla
      titulo={`Solicitud ${s.codigo}`}
      descripcion={`${s.lugar.nombre} · pedida por ${s.pedidaPor.nombre} el ${cuando(s.pedidaEn)}`}
      error={cargada.error}
      cargando={cargada.cargando}
    >
      <Acciones>
        {volver}
        {s.pasos.includes('corregir') ? <Boton titulo="Corregir" onPress={() => setVentana('corregir')} /> : null}
        {s.pasos.includes('recibir') ? <Boton titulo="Recibir lo que llegó" onPress={() => setVentana('recibir')} /> : null}
        {accionesExtra?.(s, listo)}
        {s.pasos.includes('cancelar') ? (
          <Boton titulo="Cancelar la solicitud" tono="peligro" onPress={() => setVentana('cancelar')} />
        ) : null}
      </Acciones>
      <Confirmado mensaje={hecho} />
      {devolucion ? <Aviso tono="error">{`Devuelta para corregir: ${devolucion.motivo ?? ''}`}</Aviso> : null}

      <Seccion titulo="La solicitud">
        <View style={estilos.datos}>
          <Dato titulo="Estado">
            <View style={estilos.marcas}>
              {s.estado === 'devuelta' ? null : <EstadoDeLaSolicitud estado={s.estado} />}
              {s.marcas.map((m) => (
                <Etiqueta key={m} tono="malo">
                  {m}
                </Etiqueta>
              ))}
              {s.urgente ? <Etiqueta tono="malo">Urgente</Etiqueta> : null}
            </View>
          </Dato>
          <Dato titulo="Para cuándo">{fechaDelCorte(s.paraCuando)}</Dato>
          <Dato titulo="Para qué">{s.paraQue || '—'}</Dato>
          <Dato titulo="Proveedor sugerido">{s.proveedorSugerido || '—'}</Dato>
          {conValores ? <Dato titulo="Valor estimado">{s.valorEstimado ? enPesos(s.valorEstimado) : '—'}</Dato> : null}
        </View>
        <Tabla columnas={columnasRenglones} filas={s.renglones} vacio="Sin renglones." />
      </Seccion>

      {s.compras.length ? (
        <Seccion titulo="Compras">
          <Tabla columnas={columnasCompras} filas={s.compras} vacio="" />
        </Seccion>
      ) : null}

      {s.recepciones.length ? (
        <Seccion titulo="Lo que ha llegado">
          <Tabla columnas={columnasRecibos} filas={s.recepciones} vacio="" />
        </Seccion>
      ) : null}

      <CarpetaDeDocumentos
        cargados={documentos}
        pedido={{ solicitudId: id }}
        deQuien="solicitud"
        titulo="Adjuntos"
        puedeSubir={alcanza(persona.rol, 'solicitudes', 'escribir')}
        puedeAnular={alcanza(persona.rol, 'compras', 'anular')}
        sinPrecio={!veLosValores(persona.rol)}
        claveDeBusqueda="buscarAdjunto"
      />

      <Seccion titulo="Historia">
        <Tabla columnas={columnasHistoria} filas={historia} vacio="" />
      </Seccion>

      {ventana === 'corregir' ? (
        <FormularioDeSolicitud
          lugar={lugar}
          inicial={{
            id: s.id,
            codigo: s.codigo,
            version: s.version,
            datos: {
              renglones: s.renglones.map((r) => ({
                descripcion: r.descripcion,
                cantidad: r.cantidad,
                unidad: r.unidad,
                materialId: r.materialId,
              })),
              paraCuando: s.paraCuando,
              urgente: s.urgente,
              paraQue: s.paraQue,
              proveedorSugerido: s.proveedorSugerido,
              valorEstimado: s.valorEstimado ?? null,
            },
          }}
          alCerrar={() => setVentana(null)}
          alGuardar={listo}
        />
      ) : null}
      {ventana === 'cancelar' ? (
        <VentanaDeMotivo
          titulo={`Cancelar ${s.codigo}`}
          aviso="La solicitud queda cancelada y no se puede volver a abrir. Si hace falta, se pide otra."
          accion="Cancelar la solicitud"
          alCerrar={() => setVentana(null)}
          alConfirmar={async (motivo) => {
            await api.compras.paso(s.id, { paso: 'cancelar', version: s.version, motivo });
            listo(`Solicitud ${s.codigo} cancelada.`);
          }}
        />
      ) : null}
      {ventana === 'recibir' ? (
        <VentanaDeRecibir solicitud={s} soportes={soportes} alCerrar={() => setVentana(null)} alRecibir={listo} />
      ) : null}
    </MarcoPantalla>
  );
}

const estilos = StyleSheet.create({
  datos: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.three, marginBottom: Spacing.two },
  dato: { gap: Spacing.half, minWidth: 160, maxWidth: 360 },
  celdaDoble: { gap: Spacing.half, alignItems: 'flex-start' },
  marcas: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.half },
  fila: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'flex-end', gap: Spacing.two },
  renglonDeRecibo: { minWidth: 280, flexShrink: 1, paddingBottom: Spacing.two },
  texto: { fontFamily: FuentePanel.texto, fontSize: TextoPanel.cuerpo, color: Panel.texto },
  apoyo: { fontFamily: FuentePanel.texto, fontSize: TextoPanel.apoyo, color: Panel.textoApoyo },
  anulado: { textDecorationLine: 'line-through', color: Panel.textoApoyo },
});
