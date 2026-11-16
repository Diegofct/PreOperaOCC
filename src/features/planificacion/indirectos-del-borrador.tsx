/**
 * La pestaña de costos indirectos del borrador (spec 045, RF-74 a RF-95, RF-121).
 *
 * Los siete conceptos, en el orden del Excel de OCC, cada uno con su total y sus renglones. Cada
 * renglón tiene una de las cuatro formas —valor fijo, porcentaje, mensual o personal— y solo pide
 * las cifras de su forma; cambiar de forma conserva la descripción y el periodo y deja vacías las
 * cifras nuevas. Los de personal pueden marcarse como operativos, que suman el recargo de horas
 * extras al factor prestacional (RF-92, RF-93).
 *
 * El factor prestacional y el recargo son de esta planificación (RF-86, RF-87): cambiarlos
 * recalcula todos los renglones de personal en el momento (RF-90, RF-91). Los totales salen de la
 * regla, no de aquí: lo que se ve es `calculo.renglones`, lo mismo que guardará el servidor.
 *
 * Quitar un renglón de un borrador no lo conserva aparte (RF-84): un borrador no es evidencia.
 *
 * «Periodo deducido» (RF-169, RF-171) se lee de la estructura ya aplicada, no de lo que se está
 * digitando: así desaparece en cuanto se cambia el mes de inicio o los meses, como al guardar.
 */
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { FuentePanel, Panel, TextoPanel } from '@/constants/theme';
import { Acciones, Boton, Campo, Casilla, Celda, Etiqueta, Seccion, Selector, Tabla, type Columna } from '@/features/panel/componentes';
import { NOMBRE_DEL_CONCEPTO } from '@/shared/rules/cumplimiento-de-obra';
import { enPesos } from '@/shared/rules/pesos';
import {
  CONCEPTOS_INDIRECTOS,
  FORMAS_DE_INDIRECTO,
  type ConceptoIndirecto,
  type EstructuraDePlanificacion,
  type FormaDeIndirecto,
  type RenglonIndirecto,
} from '@/shared/rules/planificacion';
import type { CalculoDeLaPlanificacion } from '@/shared/rules/planificacion-borrador';

import { CampoCifra } from './campo-cifra';
import { MesesDelRenglon } from './meses-del-renglon';

const NOMBRE_DE_LA_FORMA: Record<FormaDeIndirecto, string> = {
  fijo: 'Valor fijo',
  porcentaje: 'Porcentaje',
  mensual: 'Mensual',
  personal: 'Personal',
};

/** Un id para un renglón nuevo, fuera del componente: se llama al pulsar, nunca al dibujar. */
const idNuevo = () => `r-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

/** El renglón con otra forma: conserva lo común y deja vacías las cifras de la forma nueva. */
function conForma(r: RenglonIndirecto, forma: FormaDeIndirecto, arranque: string | null, meses: number | null): RenglonIndirecto {
  const base = { id: r.id, concepto: r.concepto, descripcion: r.descripcion, revisar: r.revisar };
  const periodo =
    r.forma === 'porcentaje'
      ? { mesInicio: arranque, tiempoEjecucion: meses, fijados: [] }
      : { mesInicio: r.mesInicio, tiempoEjecucion: r.tiempoEjecucion, fijados: r.fijados };
  switch (forma) {
    case 'fijo':
      return { ...base, ...periodo, forma, valor: null };
    case 'porcentaje':
      return { ...base, forma, porcentaje: null };
    case 'mensual':
      return { ...base, ...periodo, forma, cantidad: null, valorMensual: null, valorMensualAdicional: null };
    case 'personal':
      return { ...base, ...periodo, forma, salario: null, acomodacion: null, viaticos: null, dedicacion: null, operativo: false };
  }
}

type Fila = { id: string; renglon: RenglonIndirecto; total: number | null };

export function IndirectosDelBorrador({
  estructura,
  renglones,
  factorPrestacional,
  recargoHorasExtras,
  calculo,
  alCambiarRenglones,
  alCambiarFactores,
}: {
  estructura: EstructuraDePlanificacion;
  renglones: RenglonIndirecto[];
  factorPrestacional: number;
  recargoHorasExtras: number;
  calculo: CalculoDeLaPlanificacion | null;
  alCambiarRenglones: (renglones: RenglonIndirecto[]) => void;
  alCambiarFactores: (factor: number, recargo: number) => void;
}) {
  const [abierto, setAbierto] = useState<string | null>(null);
  const totalDe = new Map((calculo?.renglones ?? []).map((r) => [r.id, r.total]));
  const plazo = estructura.plazo;
  const deducidos = new Set((estructura.renglonesIndirectos ?? []).filter((r) => r.periodoDeducido).map((r) => r.id));

  function cambiar(id: string, nuevo: RenglonIndirecto) {
    alCambiarRenglones(renglones.map((r) => (r.id === id ? nuevo : r)));
  }

  function anadir(concepto: ConceptoIndirecto) {
    const id = idNuevo();
    alCambiarRenglones([
      ...renglones,
      {
        id,
        concepto,
        descripcion: 'Renglón nuevo',
        forma: 'fijo',
        valor: null,
        mesInicio: plazo?.arranque ?? null,
        tiempoEjecucion: plazo?.meses ?? null,
        fijados: [],
        revisar: false,
      },
    ]);
    setAbierto(id);
  }

  function quitar(id: string) {
    alCambiarRenglones(renglones.filter((r) => r.id !== id));
    if (abierto === id) setAbierto(null);
  }

  // Caben en `MaxContentWidthPanel` (1 280): 400 + 120 + 160 + 100 + 80 + 220 = 1 080, más 5
  // separaciones de 16 (80) y 16 a cada lado (32): 1 192.
  const columnas: Columna<Fila>[] = [
    {
      clave: 'descripcion',
      titulo: 'Renglón',
      ancho: 400,
      pintar: (f) => (
        <View style={estilos.celdaConMarca}>
          <Celda>{f.renglon.descripcion}</Celda>
          {f.renglon.revisar ? <Etiqueta tono="atencion">Para revisar</Etiqueta> : null}
          {deducidos.has(f.id) ? <Etiqueta tono="neutro">Periodo deducido</Etiqueta> : null}
          {f.renglon.forma === 'personal' && f.renglon.operativo ? <Etiqueta tono="neutro">Operativo</Etiqueta> : null}
        </View>
      ),
    },
    { clave: 'forma', titulo: 'Forma', ancho: 120, pintar: (f) => <Celda>{NOMBRE_DE_LA_FORMA[f.renglon.forma]}</Celda> },
    { clave: 'total', titulo: 'Total', ancho: 160, pintar: (f) => <Celda>{f.total === null ? '—' : enPesos(f.total)}</Celda> },
    {
      clave: 'inicio',
      titulo: 'Inicio',
      ancho: 100,
      pintar: (f) => <Celda>{f.renglon.forma === 'porcentaje' ? 'Con la obra' : (f.renglon.mesInicio ?? '—')}</Celda>,
    },
    {
      clave: 'meses',
      titulo: 'Meses',
      ancho: 80,
      pintar: (f) => <Celda>{f.renglon.forma === 'porcentaje' ? '—' : String(f.renglon.tiempoEjecucion ?? '—')}</Celda>,
    },
    {
      clave: 'acciones',
      titulo: '',
      ancho: 220,
      anchoMinimo: 220,
      pintar: (f) => (
        <View style={estilos.botones}>
          {abierto === f.id ? <Etiqueta tono="neutro">Abierto</Etiqueta> : <Boton titulo="Editar" tono="secundario" onPress={() => setAbierto(f.id)} />}
          <Boton titulo="Quitar" tono="secundario" onPress={() => quitar(f.id)} />
        </View>
      ),
    },
  ];

  const renglonAbierto = renglones.find((r) => r.id === abierto) ?? null;

  return (
    <View style={estilos.columna}>
      <Seccion titulo="Factores de esta planificación">
        <View style={estilos.columna}>
          <View style={estilos.fila}>
            <CampoCifra
              etiqueta="Factor prestacional"
              valor={factorPrestacional}
              alCambiar={(n) => alCambiarFactores(n ?? 0, recargoHorasExtras)}
              ancho={200}
              ayuda="Multiplica el salario del personal."
            />
            <CampoCifra
              etiqueta="Recargo de horas extras"
              valor={recargoHorasExtras}
              alCambiar={(n) => alCambiarFactores(factorPrestacional, n ?? 0)}
              ancho={200}
              ayuda="Se suma al factor en el personal operativo."
            />
          </View>
          {/* RF-121. */}
          {estructura.indirectosCopiadosDe ? (
            <Text style={estilos.pie}>{`Los indirectos se copiaron de ${estructura.indirectosCopiadosDe.obra} · v${estructura.indirectosCopiadosDe.version}.`}</Text>
          ) : null}
        </View>
      </Seccion>

      {renglonAbierto ? (
        <Seccion titulo={`Renglón: ${renglonAbierto.descripcion}`}>
          <View key={renglonAbierto.id + renglonAbierto.forma} style={estilos.columna}>
            <View style={estilos.fila}>
              <Campo
                etiqueta="Descripción"
                valor={renglonAbierto.descripcion}
                onChange={(v) => cambiar(renglonAbierto.id, { ...renglonAbierto, descripcion: v })}
                obligatorio
                ancho={420}
              />
              <Selector
                etiqueta="Forma de cálculo"
                valor={renglonAbierto.forma}
                opciones={FORMAS_DE_INDIRECTO.map((f) => ({ valor: f, etiqueta: NOMBRE_DE_LA_FORMA[f] }))}
                onChange={(f) => f && cambiar(renglonAbierto.id, conForma(renglonAbierto, f as FormaDeIndirecto, plazo?.arranque ?? null, plazo?.meses ?? null))}
                vacio="Escoja la forma"
                obligatorio
                ancho={220}
              />
            </View>
            <View style={estilos.fila}>
              {renglonAbierto.forma === 'fijo' ? (
                <CampoCifra etiqueta="Valor" valor={renglonAbierto.valor} alCambiar={(n) => cambiar(renglonAbierto.id, { ...renglonAbierto, valor: n })} ancho={200} />
              ) : null}
              {renglonAbierto.forma === 'porcentaje' ? (
                <CampoCifra
                  etiqueta="Porcentaje del importe real total"
                  valor={renglonAbierto.porcentaje}
                  alCambiar={(n) => cambiar(renglonAbierto.id, { ...renglonAbierto, porcentaje: n })}
                  ancho={260}
                  ayuda="En fracción: 0,02 es el 2 %."
                />
              ) : null}
              {renglonAbierto.forma === 'mensual' ? (
                <>
                  <CampoCifra etiqueta="Cantidad" valor={renglonAbierto.cantidad} alCambiar={(n) => cambiar(renglonAbierto.id, { ...renglonAbierto, cantidad: n })} ancho={120} />
                  <CampoCifra
                    etiqueta="Valor mensual"
                    valor={renglonAbierto.valorMensual}
                    alCambiar={(n) => cambiar(renglonAbierto.id, { ...renglonAbierto, valorMensual: n })}
                    ancho={180}
                  />
                  <CampoCifra
                    etiqueta="Adicional mensual"
                    valor={renglonAbierto.valorMensualAdicional}
                    alCambiar={(n) => cambiar(renglonAbierto.id, { ...renglonAbierto, valorMensualAdicional: n })}
                    ancho={180}
                    ayuda="Consumible o servicios; vacío es cero."
                  />
                </>
              ) : null}
              {renglonAbierto.forma === 'personal' ? (
                <>
                  <CampoCifra etiqueta="Salario" valor={renglonAbierto.salario} alCambiar={(n) => cambiar(renglonAbierto.id, { ...renglonAbierto, salario: n })} ancho={160} />
                  <CampoCifra
                    etiqueta="Acomodación"
                    valor={renglonAbierto.acomodacion}
                    alCambiar={(n) => cambiar(renglonAbierto.id, { ...renglonAbierto, acomodacion: n })}
                    ancho={150}
                  />
                  <CampoCifra etiqueta="Viáticos" valor={renglonAbierto.viaticos} alCambiar={(n) => cambiar(renglonAbierto.id, { ...renglonAbierto, viaticos: n })} ancho={150} />
                  <CampoCifra
                    etiqueta="Dedicación"
                    valor={renglonAbierto.dedicacion}
                    alCambiar={(n) => cambiar(renglonAbierto.id, { ...renglonAbierto, dedicacion: n })}
                    ancho={130}
                    ayuda="1 es tiempo completo."
                  />
                </>
              ) : null}
              {renglonAbierto.forma !== 'porcentaje' ? (
                <>
                  <Campo
                    etiqueta="Mes de inicio"
                    valor={renglonAbierto.mesInicio ?? ''}
                    onChange={(v) => cambiar(renglonAbierto.id, { ...renglonAbierto, mesInicio: v.trim() === '' ? null : v.trim() })}
                    ayuda="Como 2026-03."
                    ancho={140}
                  />
                  <CampoCifra
                    etiqueta="Meses"
                    valor={renglonAbierto.tiempoEjecucion}
                    alCambiar={(n) => cambiar(renglonAbierto.id, { ...renglonAbierto, tiempoEjecucion: n })}
                    ancho={110}
                  />
                </>
              ) : null}
            </View>
            {renglonAbierto.forma === 'personal' ? (
              <Casilla
                etiqueta="Operativo: suma el recargo de horas extras al factor prestacional."
                marcada={renglonAbierto.operativo}
                onChange={(operativo) => cambiar(renglonAbierto.id, { ...renglonAbierto, operativo })}
              />
            ) : null}
            {deducidos.has(renglonAbierto.id) ? (
              <Text style={estilos.pie}>El Excel no traía los meses de este renglón: el periodo lo puso la regla. Al cambiarlo se quita el aviso.</Text>
            ) : null}
            <Text style={estilos.pie}>{`Total del renglón: ${totalDe.has(renglonAbierto.id) ? enPesos(totalDe.get(renglonAbierto.id) as number) : '—'}`}</Text>
            {renglonAbierto.forma !== 'porcentaje' ? (
              <MesesDelRenglon
                total={totalDe.get(renglonAbierto.id) ?? 0}
                periodo={{ mesInicio: renglonAbierto.mesInicio, tiempoEjecucion: renglonAbierto.tiempoEjecucion }}
                fijados={renglonAbierto.fijados}
                alCambiar={(fijados) => cambiar(renglonAbierto.id, { ...renglonAbierto, fijados })}
              />
            ) : (
              <Text style={estilos.pie}>Un porcentaje se reparte en los meses en proporción a la obra programada.</Text>
            )}
            <Acciones>
              <Boton titulo="Cerrar el renglón" tono="secundario" onPress={() => setAbierto(null)} />
            </Acciones>
          </View>
        </Seccion>
      ) : null}

      {CONCEPTOS_INDIRECTOS.map((concepto) => {
        const filas: Fila[] = renglones.filter((r) => r.concepto === concepto).map((r) => ({ id: r.id, renglon: r, total: totalDe.get(r.id) ?? null }));
        const total = calculo?.indirectosPorConcepto[concepto] ?? 0;
        return (
          <Seccion key={concepto} titulo={`${NOMBRE_DEL_CONCEPTO[concepto]} · ${enPesos(total)}`}>
            <View style={estilos.columna}>
              {filas.length > 0 ? <Tabla filas={filas} columnas={columnas} vacio="" /> : <Text style={estilos.pie}>Sin renglones.</Text>}
              <Acciones>
                <Boton titulo="Añadir renglón" tono="secundario" onPress={() => anadir(concepto)} />
              </Acciones>
            </View>
          </Seccion>
        );
      })}
    </View>
  );
}

const estilos = StyleSheet.create({
  columna: { gap: 12 },
  fila: { flexDirection: 'row', gap: 12, flexWrap: 'wrap' },
  botones: { flexDirection: 'row', gap: 8 },
  celdaConMarca: { gap: 4 },
  pie: { fontFamily: FuentePanel.texto, fontSize: TextoPanel.apoyo, color: Panel.textoApoyo },
});
