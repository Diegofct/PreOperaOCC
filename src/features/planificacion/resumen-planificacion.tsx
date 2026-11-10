/**
 * Lo que dice una planificación leída: el resumen con las dos medidas, los hallazgos y las cifras
 * que se descartaron (spec 043, RF-21 a RF-33, RF-111 a RF-115, D31). Solo lectura.
 *
 * Todas las cifras vienen hechas del servidor (RF-23): aquí no se suma nada. El resumen va en una
 * tabla de dos columnas, medida real y medida contractual, porque es así como se comparan: la
 * misma fila, dos medidas. El costo con medida real es el de la «Med. Coste» del Excel (D31), y se
 * dice debajo para que nadie lo compare con la medida real a mano y crea que no cuadra.
 *
 * Los hallazgos no se esconden ni se resumen: cada uno con su ítem y su capítulo, porque aprobar
 * con hallazgos es una decisión que se confirma viéndolos (RF-35). Las columnas de cada tabla caben
 * en `MaxContentWidthPanel` (1 280): sus anchos están anotados junto a cada una.
 */
import { StyleSheet, Text, View } from 'react-native';

import { FuentePanel, Panel, TextoPanel } from '@/constants/theme';
import { Aviso, Celda, Etiqueta, Seccion, Tabla, type Columna } from '@/features/panel/componentes';
import type { PlanificacionDetalle } from '@/features/panel/planificacion';
import type { RechazadoPorIa } from '@/shared/rules/formulario-presupuesto-ia';
import { diaCorto } from '@/shared/rules/jornada';
import { enPesos } from '@/shared/rules/pesos';
import type { DiferenciaConElExcel, HallazgoDePlanificacion, TipoDeHallazgo } from '@/shared/rules/planificacion';

const NOMBRE_DEL_HALLAZGO: Record<TipoDeHallazgo, string> = {
  no_existe: 'No está en el presupuesto',
  unidad_distinta: 'Unidad distinta',
  cantidad_distinta: 'Cantidad contractual distinta',
  costo_mayor: 'Costo mayor que el precio',
  sin_programacion: 'Sin programación',
  despues_del_plazo: 'Después del plazo',
  sin_costo: 'Sin precio de costo',
  para_revisar: 'Para revisar',
  rubro_sin_par: 'Rubro sin par',
};

const NOMBRE_DEL_TOTAL: Record<DiferenciaConElExcel['concepto'], string> = {
  contractual: 'Total a precio contractual',
  costo: 'Total a costo',
  indirectos: 'Indirectos',
};

interface FilaDelResumen {
  id: string;
  concepto: string;
  real: number;
  contractual: number;
  destacada?: boolean;
}

/** «oct de 2026»: con el año, porque una programación suele pasar de un año al otro. */
function mes(m: string): string {
  return `${diaCorto(`${m}-01`).replace(/^1-/, '')} de ${m.slice(0, 4)}`;
}

export function ResumenPlanificacion({ p }: { p: PlanificacionDetalle }) {
  const { resumen } = p;
  const filas: FilaDelResumen[] = [
    { id: 'contractual', concepto: 'Total a precio contractual', real: resumen.medidaReal.contractual, contractual: resumen.medidaContractual.contractual },
    { id: 'costo', concepto: 'Total a costo', real: resumen.medidaReal.costo, contractual: resumen.medidaContractual.costo },
    { id: 'margen', concepto: 'Margen (antes de indirectos)', real: resumen.medidaReal.margen, contractual: resumen.medidaContractual.margen },
    { id: 'indirectos', concepto: 'Indirectos programados', real: resumen.indirectos, contractual: resumen.indirectos },
    { id: 'resultado', concepto: 'Resultado', real: resumen.medidaReal.resultado, contractual: resumen.medidaContractual.resultado, destacada: true },
  ];
  // 360 + 260 + 260 = 880, más 4 separaciones.
  const columnasDelResumen: Columna<FilaDelResumen>[] = [
    { clave: 'concepto', titulo: 'Concepto', ancho: 360, pintar: (f) => <Text style={f.destacada ? estilos.destacado : estilos.celda}>{f.concepto}</Text> },
    { clave: 'real', titulo: 'Con medida real', ancho: 260, pintar: (f) => <Text style={f.destacada ? estilos.destacado : estilos.celda}>{enPesos(f.real)}</Text> },
    {
      clave: 'contractual',
      titulo: 'Con medida contractual',
      ancho: 260,
      pintar: (f) => <Text style={f.destacada ? estilos.destacado : estilos.celda}>{enPesos(f.contractual)}</Text>,
    },
  ];

  const hallazgos = p.hallazgos.map((h, i) => ({ ...h, id: String(i) }));
  // 220 + 300 + 90 + 500 = 1 110, más 5 separaciones: 1 190.
  const columnasDeHallazgos: Columna<HallazgoDePlanificacion & { id: string }>[] = [
    {
      clave: 'tipo',
      titulo: 'Hallazgo',
      ancho: 220,
      pintar: (h) => <Etiqueta tono={h.tipo === 'para_revisar' || h.tipo === 'costo_mayor' ? 'malo' : 'atencion'}>{NOMBRE_DEL_HALLAZGO[h.tipo]}</Etiqueta>,
      ordenar: (h) => NOMBRE_DEL_HALLAZGO[h.tipo],
    },
    { clave: 'capitulo', titulo: 'Capítulo', ancho: 300, pintar: (h) => <Celda>{h.capitulo || '—'}</Celda>, ordenar: (h) => h.capitulo },
    { clave: 'item', titulo: 'Ítem', ancho: 90, pintar: (h) => <Celda>{h.item || (h.renglon !== null ? `Nº ${h.renglon}` : '—')}</Celda> },
    { clave: 'detalle', titulo: 'Detalle', ancho: 500, pintar: (h) => <Celda>{h.detalle}</Celda> },
  ];

  const rechazados = p.rechazados.map((r, i) => ({ ...r, id: String(i) }));
  // 80 + 80 + 560 + 300 = 1 020, más 5 separaciones.
  const columnasDeRechazados: Columna<RechazadoPorIa & { id: string }>[] = [
    { clave: 'hoja', titulo: 'Hoja', ancho: 80, pintar: (r) => <Celda>{String(r.hoja)}</Celda> },
    { clave: 'fila', titulo: 'Fila', ancho: 80, pintar: (r) => <Celda>{String(r.fila)}</Celda> },
    { clave: 'que', titulo: 'Qué se leyó', ancho: 560, pintar: (r) => <Celda>{r.que}</Celda> },
    { clave: 'motivo', titulo: 'Por qué se descartó', ancho: 300, pintar: (r) => <Celda>{r.motivo}</Celda> },
  ];

  return (
    <View style={estilos.columna}>
      <Seccion titulo="Resumen">
        <View style={estilos.columna}>
          <Tabla filas={filas} columnas={columnasDelResumen} vacio="" />
          <Text style={estilos.nota}>
            El total a costo con medida real usa la «Med. Coste» de cada ítem, como el Excel; si el ítem no la trae, su medida
            real. Los ítems sin precio de costo no suman al costo.
            {resumen.programacionDesde && resumen.programacionHasta
              ? ` La programación va de ${mes(resumen.programacionDesde)} a ${mes(resumen.programacionHasta)}.`
              : ''}
          </Text>
          {resumen.diferenciasConElExcel.length > 0 ? (
            <Aviso tono="info">
              {`No cuadra con los totales del Excel: ${resumen.diferenciasConElExcel
                .map((d) => `${NOMBRE_DEL_TOTAL[d.concepto]}, leído ${enPesos(d.leido)} y en el Excel ${enPesos(d.delExcel)} (diferencia ${enPesos(d.diferencia)})`)
                .join('; ')}.`}
            </Aviso>
          ) : (
            <Aviso tono="exito">Los totales leídos cuadran con los del Excel.</Aviso>
          )}
        </View>
      </Seccion>

      <Seccion titulo={`Hallazgos (${hallazgos.length})`}>
        <Tabla filas={hallazgos} columnas={columnasDeHallazgos} vacio="Sin hallazgos: todo cuadra con el presupuesto vigente." />
      </Seccion>

      {rechazados.length > 0 ? (
        <Seccion titulo={`Cifras descartadas (${rechazados.length})`}>
          <View style={estilos.columna}>
            <Text style={estilos.nota}>
              La IA leyó estas cifras y no estaban en la fila que citó, así que no se usaron. La hoja es el orden en que se
              confirmaron.
            </Text>
            <Tabla filas={rechazados} columnas={columnasDeRechazados} vacio="" />
          </View>
        </Seccion>
      ) : null}
    </View>
  );
}

const estilos = StyleSheet.create({
  columna: { gap: 12 },
  nota: { fontFamily: FuentePanel.texto, fontSize: TextoPanel.apoyo, color: Panel.textoApoyo },
  celda: { fontFamily: FuentePanel.texto, fontSize: TextoPanel.cuerpo, color: Panel.texto },
  destacado: { fontFamily: FuentePanel.texto, fontWeight: '700', fontSize: TextoPanel.cuerpo, color: Panel.texto },
});
