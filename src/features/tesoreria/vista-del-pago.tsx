/**
 * Una solicitud de pago con todo lo que le pasó (spec 037, RF-9, RF-20).
 *
 * Como el detalle de una solicitud de compra (036): la abren Solicitudes de pago de su lugar
 * y Tesorería de Elemental, y los botones salen de `pasos`, que manda el servidor con la
 * misma regla que lo revisa. Los valores, los pagos y los adjuntos solo existen si el
 * servidor los mandó: el almacenista no los ve en las que no pidió (RF-5a).
 */
import { useCallback, useState, type ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { FuentePanel, Panel, Spacing, TextoPanel } from '@/constants/theme';
import { VentanaDeMotivo } from '@/features/compras/vista-de-la-solicitud';
import { CarpetaDeDocumentos, useDocumentosDelLugar } from '@/features/documentos/pantalla-documentos';
import { api, type LugarDeLasSolicitudes } from '@/features/panel/cliente-api';
import { Acciones, Aviso, Boton, Celda, Confirmado, Etiqueta, Seccion, Tabla, type Columna } from '@/features/panel/componentes';
import type { PagoRegistrado, SolicitudDePagoDetallada } from '@/features/panel/contratos';
import { MarcoPantalla, useListado } from '@/features/panel/marco';
import { usePersona } from '@/features/panel/sesion';
import { fechaDelCorte } from '@/shared/rules/cortes';
import { nombreDeConcepto, nombreDeMedio } from '@/shared/rules/pagos';
import { alcanza } from '@/shared/rules/permisos';
import { enPesos } from '@/shared/rules/pesos';

import { FormularioDePago } from './formulario-de-pago';
import { EstadoDelPago } from './partes';

type Evento = SolicitudDePagoDetallada['historia'][number];

const cuando = (iso: string) => new Date(iso).toLocaleString('es-CO', { dateStyle: 'medium', timeStyle: 'short' });

/**
 * Lo que dice la historia de cada paso (RF-20). Para el almacenista, en las ajenas, los
 * cambios llegan vacíos: la historia dice qué pasó, sin cifras.
 */
export function textoDelEventoDePago(e: Evento): string {
  const c = (e.cambios as Record<string, unknown>[])[0];
  switch (e.paso) {
    case 'enviada':
      return 'Pidió el pago.';
    case 'corregir': {
      const campos = (c?.campos as string[] | undefined) ?? [];
      return campos.length ? `La corrigió y la volvió a enviar (cambió: ${campos.join(', ')}).` : 'La volvió a enviar sin cambios.';
    }
    case 'aprobar':
      return c ? `La aprobó por ${enPesos(Number(c.despues))} (se pidieron ${enPesos(Number(c.antes))}).` : 'La aprobó.';
    case 'rechazar':
      return 'La rechazó.';
    case 'devolver':
      return 'La devolvió para corregir.';
    case 'cancelar':
      return 'La canceló.';
    case 'registrar_pago':
      return c ? `Registró un pago de ${enPesos(Number(c.valor))} por ${nombreDeMedio(String(c.medio)).toLowerCase()}.` : 'Registró un pago.';
    case 'anular_pago':
      return c ? `Anuló un pago de ${enPesos(Number(c.valor))}.` : 'Anuló un pago.';
    default:
      return e.paso;
  }
}

function Dato({ titulo, children }: { titulo: string; children: ReactNode }) {
  return (
    <View style={estilos.dato}>
      <Text style={estilos.apoyo}>{titulo}</Text>
      {typeof children === 'string' ? <Text style={estilos.texto}>{children}</Text> : children}
    </View>
  );
}

export function VistaDelPago({
  id,
  alVolver,
  volverA = 'las solicitudes',
  accionesExtra,
}: {
  id: string;
  alVolver: () => void;
  volverA?: string;
  /** Los pasos de la gerencia, que pone Tesorería de Elemental (T17). */
  accionesExtra?: (s: SolicitudDePagoDetallada, listo: (mensaje: string) => void) => ReactNode;
}) {
  const persona = usePersona();
  const cargada = useListado<SolicitudDePagoDetallada>(useCallback(() => api.tesoreria.detalle(id).then((d) => [d]), [id]));
  const s = cargada.datos[0];
  // Los adjuntos, solo si quien mira ve el valor: si no, el servidor responde «no existe».
  const conValores = s !== undefined && 'valor' in s;
  const documentos = useDocumentosDelLugar(conValores ? { solicitudPagoId: id } : null);
  const [ventana, setVentana] = useState<'corregir' | 'cancelar' | null>(null);
  const [hecho, setHecho] = useState<string | null>(null);

  const listo = (mensaje: string) => {
    setVentana(null);
    setHecho(mensaje);
    cargada.recargar();
    documentos.recargar();
  };

  const volver = <Boton titulo={`← Volver a ${volverA}`} tono="secundario" onPress={alVolver} />;
  if (!s) {
    return (
      <MarcoPantalla titulo="Solicitud de pago" descripcion="" error={cargada.error} cargando={cargada.cargando}>
        <Acciones>{volver}</Acciones>
      </MarcoPantalla>
    );
  }

  const lugar: LugarDeLasSolicitudes =
    s.lugar.tipo === 'empresa' ? { empresa: s.lugar.id as 'occ' | 'geolab' } : { obraId: s.lugar.id };
  const nombreDelAdjunto = new Map((documentos.datos[0]?.documentos ?? []).map((d) => [d.id, d.nombre]));
  const aprobado = s.valorAprobado ?? null;
  const falta = aprobado !== null && s.pagado !== undefined ? aprobado - s.pagado : null;

  const pagos = s.pagos ?? [];
  const columnasPagos: Columna<PagoRegistrado>[] = [
    { clave: 'fecha', titulo: 'Fecha', ancho: 110, pintar: (p) => <Celda>{fechaDelCorte(p.fecha)}</Celda> },
    {
      clave: 'valor',
      titulo: 'Valor',
      ancho: 150,
      pintar: (p) => (
        <View style={estilos.celdaDoble}>
          <Text style={[estilos.texto, p.anulado && estilos.anulado]}>{enPesos(p.valor)}</Text>
          {p.anulado ? <Text style={estilos.apoyo}>{`Anulado por ${p.anulado.por}: ${p.anulado.motivo}`}</Text> : null}
        </View>
      ),
    },
    { clave: 'medio', titulo: 'Medio', ancho: 130, pintar: (p) => <Celda>{nombreDeMedio(p.medio)}</Celda> },
    { clave: 'referencia', titulo: 'Referencia', ancho: 140, pintar: (p) => <Celda>{p.referencia || '—'}</Celda> },
    {
      clave: 'comprobante',
      titulo: 'Comprobante',
      ancho: 200,
      pintar: (p) => <Celda>{(p.documentoId && nombreDelAdjunto.get(p.documentoId)) || '—'}</Celda>,
    },
    {
      clave: 'por',
      titulo: 'Registró',
      ancho: 200,
      pintar: (p) => (
        <View style={estilos.celdaDoble}>
          <Text style={estilos.texto}>{p.registradoPor}</Text>
          <Text style={estilos.apoyo}>{cuando(p.registradoEn)}</Text>
        </View>
      ),
    },
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
          <Text style={estilos.texto}>{textoDelEventoDePago(e)}</Text>
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
        {accionesExtra?.(s, listo)}
        {s.pasos.includes('cancelar') ? <Boton titulo="Cancelar la solicitud" tono="peligro" onPress={() => setVentana('cancelar')} /> : null}
      </Acciones>
      <Confirmado mensaje={hecho} />
      {devolucion ? <Aviso tono="error">{`Devuelta para corregir: ${devolucion.motivo ?? ''}`}</Aviso> : null}

      <Seccion titulo="La solicitud">
        <View style={estilos.datos}>
          <Dato titulo="Estado">
            <View style={estilos.marcas}>
              {s.estado === 'devuelta' ? null : <EstadoDelPago estado={s.estado} />}
              {/* «Corrígela» le habla a quien puede corregirla; a los demás basta «Devuelta». */}
              {s.marcas.map((m) => (
                <Etiqueta key={m} tono="malo">
                  {m === 'Devuelta: corrígela' && !s.pasos.includes('corregir') ? 'Devuelta' : m}
                </Etiqueta>
              ))}
              {s.urgente ? <Etiqueta tono="malo">Urgente</Etiqueta> : null}
            </View>
          </Dato>
          <Dato titulo="A quién">{[s.beneficiario, s.beneficiarioDocumento].filter(Boolean).join(' · ')}</Dato>
          <Dato titulo="Concepto">{nombreDeConcepto(s.concepto)}</Dato>
          <Dato titulo="Para cuándo">{fechaDelCorte(s.paraCuando)}</Dato>
          <Dato titulo="Para qué">{s.paraQue}</Dato>
        </View>
        {conValores ? (
          <View style={estilos.datos}>
            <Dato titulo="Pedido">{enPesos(s.valor ?? 0)}</Dato>
            <Dato titulo="Aprobado">{aprobado === null ? '—' : enPesos(aprobado)}</Dato>
            <Dato titulo="Pagado">{enPesos(s.pagado ?? 0)}</Dato>
            {falta !== null && falta > 0 ? <Dato titulo="Falta por pagar">{enPesos(falta)}</Dato> : null}
          </View>
        ) : (
          <Text style={estilos.apoyo}>El valor, los pagos y los soportes los ven quien la pidió y Tesorería.</Text>
        )}
      </Seccion>

      {pagos.length ? (
        <Seccion titulo="Pagos">
          <Tabla columnas={columnasPagos} filas={pagos} vacio="" />
        </Seccion>
      ) : null}

      {conValores ? (
        <CarpetaDeDocumentos
          cargados={documentos}
          pedido={{ solicitudPagoId: id }}
          deQuien="pago"
          titulo="Adjuntos"
          puedeSubir={alcanza(persona.rol, 'solicitudes', 'escribir') || alcanza(persona.rol, 'tesoreria', 'escribir')}
          puedeAnular={alcanza(persona.rol, 'tesoreria', 'anular')}
          claveDeBusqueda="buscarAdjunto"
        />
      ) : null}

      <Seccion titulo="Historia">
        <Tabla columnas={columnasHistoria} filas={historia} vacio="" />
      </Seccion>

      {ventana === 'corregir' ? (
        <FormularioDePago
          lugar={lugar}
          inicial={{
            id: s.id,
            codigo: s.codigo,
            version: s.version,
            datos: {
              beneficiario: s.beneficiario,
              beneficiarioDocumento: s.beneficiarioDocumento,
              concepto: s.concepto,
              paraQue: s.paraQue,
              valor: s.valor ?? 0,
              paraCuando: s.paraCuando,
              urgente: s.urgente,
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
            await api.tesoreria.paso(s.id, { paso: 'cancelar', version: s.version, motivo });
            listo(`Solicitud ${s.codigo} cancelada.`);
          }}
        />
      ) : null}
    </MarcoPantalla>
  );
}

const estilos = StyleSheet.create({
  datos: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.three, marginBottom: Spacing.two },
  dato: { gap: Spacing.half, minWidth: 160, maxWidth: 360 },
  celdaDoble: { gap: Spacing.half, alignItems: 'flex-start' },
  marcas: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.half },
  texto: { fontFamily: FuentePanel.texto, fontSize: TextoPanel.cuerpo, color: Panel.texto },
  apoyo: { fontFamily: FuentePanel.texto, fontSize: TextoPanel.apoyo, color: Panel.textoApoyo },
  anulado: { textDecorationLine: 'line-through', color: Panel.textoApoyo },
});
