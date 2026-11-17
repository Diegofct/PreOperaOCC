/**
 * A qué parte de la planificación va cada renglón de una requisición de obra, con sus cifras y su
 * aviso (spec 048, RF-26 a RF-30, RF-40, RF-61, RF-62). La usan los detalles de la 036 (compra,
 * un renglón por fila) y de la 037 (pago, una sola fila).
 *
 * Va aparte de la tabla de renglones de la 046, que ya ocupa 1 254 de los 1 280 de
 * `MaxContentWidthPanel`: sumarle cuatro columnas habría dejado fuera la de los botones. Con las
 * cifras caben en 1 280: 40 + 330 + 130 + 130 + 140 + 130 + 200 = 1 100, más 6 × 16 y 32: 1 228.
 * Sin cifras (el Almacenista, RF-9) son tres columnas.
 */
import { StyleSheet, Text, View } from 'react-native';

import { FuentePanel, Panel, Spacing, TextoPanel } from '@/constants/theme';
import { Celda, Etiqueta, Seccion, Tabla, type Columna } from '@/features/panel/componentes';
import type { PlanificacionDelRenglon } from '@/features/panel/requisiciones';
import { enPesos } from '@/shared/rules/pesos';
import { textoDelAviso } from '@/shared/rules/requisicion-planificacion';

export interface FilaDePlanificacion {
  id: string;
  /** «1», «2»… o vacío en una requisición de pago. */
  orden: string;
  valorEstimado?: number | null;
  planificacion: PlanificacionDelRenglon;
}

const pesosO = (valor: number | null | undefined, sinValor = '—') => (valor === null || valor === undefined ? sinValor : enPesos(valor));

function AvisoEnCelda({ fila }: { fila: FilaDePlanificacion }) {
  const aviso = fila.planificacion.aviso;
  if (!aviso) return <Celda>—</Celda>;
  return <Etiqueta tono={aviso.tipo === 'se_pasa' ? 'malo' : 'atencion'}>{textoDelAviso(aviso, enPesos)}</Etiqueta>;
}

export function TablaDePlanificacion({ filas, conValores }: { filas: FilaDePlanificacion[]; conValores: boolean }) {
  const cifras = (f: FilaDePlanificacion) => f.planificacion.cifras ?? null;
  const columnas: Columna<FilaDePlanificacion>[] = [
    { clave: 'orden', titulo: '#', ancho: 40, pintar: (f) => <Celda>{f.orden || '—'}</Celda> },
    {
      clave: 'va',
      titulo: 'Va a',
      ancho: 330,
      pintar: (f) => (
        <View style={estilos.celdaDoble}>
          <Text style={estilos.texto}>{f.planificacion.imputacion?.etiqueta ?? 'Sin imputar (de antes de la planificación)'}</Text>
          {f.planificacion.imputacion?.frente ? <Text style={estilos.apoyo}>{f.planificacion.imputacion.frente}</Text> : null}
        </View>
      ),
    },
    ...(conValores
      ? ([
          { clave: 'valor', titulo: 'Valor estimado', ancho: 130, pintar: (f) => <Celda>{pesosO(f.valorEstimado)}</Celda> },
          { clave: 'planeado', titulo: 'Planeado', ancho: 130, pintar: (f) => <Celda>{cifras(f) ? pesosO(cifras(f)?.planeado, 'Sin precio de costo') : '—'}</Celda> },
          { clave: 'ya', titulo: 'Ya comprometido', ancho: 140, pintar: (f) => <Celda>{cifras(f) ? pesosO(cifras(f)?.yaComprometido) : '—'}</Celda> },
          { clave: 'queda', titulo: 'Queda', ancho: 130, pintar: (f) => <Celda>{cifras(f) ? pesosO(cifras(f)?.queda) : '—'}</Celda> },
        ] satisfies Columna<FilaDePlanificacion>[])
      : []),
    { clave: 'aviso', titulo: 'Aviso', ancho: 200, pintar: (f) => <AvisoEnCelda fila={f} /> },
  ];
  return (
    <Seccion titulo="A qué parte de la planificación va">
      <Tabla columnas={columnas} filas={filas} vacio="" />
    </Seccion>
  );
}

const estilos = StyleSheet.create({
  celdaDoble: { gap: Spacing.half },
  texto: { fontFamily: FuentePanel.texto, fontSize: TextoPanel.cuerpo, color: Panel.texto },
  apoyo: { fontFamily: FuentePanel.texto, fontSize: TextoPanel.apoyo, color: Panel.textoApoyo },
});
