/**
 * Los meses de un renglón del borrador —un ítem, un rubro, la línea de rubros o un renglón
 * indirecto— y los que se fijaron a mano (spec 045, RF-98 a RF-104).
 *
 * Cada mes del periodo muestra lo que le toca: lo fijado, o su parte del resto. Escribir en un mes
 * lo fija; borrarlo lo suelta, y vuelve a recibir su parte. El reparto es el de la regla
 * (`repartir`): lo que falta se reparte entre todos los meses no fijados, anteriores y siguientes
 * (P7), así que fijar uno mueve los demás en el momento, sin guardar.
 *
 * Los fijados que quedaron fuera del periodo —porque se cambió el mes de inicio o la cantidad de
 * meses— se avisan aquí con su valor (RF-104) y se descartan al guardar (RF-103). «Repartir en
 * partes iguales» quita todos los fijados (RF-102).
 */
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { FuentePanel, Panel, TextoPanel } from '@/constants/theme';
import { Acciones, Aviso, Boton, Campo } from '@/features/panel/componentes';
import { numero } from '@/shared/rules/formulario-presupuesto';
import { enPesos } from '@/shared/rules/pesos';
import type { ValorDelMes } from '@/shared/rules/planificacion';
import { descartarFijadosFuera, mesesDelPeriodo, repartir, type Periodo } from '@/shared/rules/planificacion-reparto';

/** El campo de un mes: lo escrito se queda mientras se escribe; vacío suelta el mes. */
function CampoDelMes({
  mes,
  fijado,
  repartido,
  alCambiar,
}: {
  mes: string;
  fijado: number | undefined;
  repartido: number;
  alCambiar: (valor: number | null) => void;
}) {
  const [texto, setTexto] = useState(fijado === undefined ? '' : String(Math.round(fijado)));
  const leido = texto.trim() === '' ? null : numero(texto);
  return (
    <Campo
      etiqueta={fijado === undefined ? mes : `${mes} · fijado`}
      valor={texto}
      onChange={(v) => {
        setTexto(v);
        const n = v.trim() === '' ? null : numero(v);
        if (v.trim() === '' || n !== null) alCambiar(n);
      }}
      ayuda={fijado === undefined ? `Reparte ${enPesos(repartido)}` : undefined}
      error={texto.trim() !== '' && leido === null ? 'Un número.' : undefined}
      ancho={150}
    />
  );
}

export function MesesDelRenglon({
  total,
  periodo,
  fijados,
  alCambiar,
  sinPeriodo,
}: {
  /** Lo que se reparte: el importe real del ítem o rubro, o el total del renglón. */
  total: number;
  periodo: Periodo;
  fijados: readonly ValorDelMes[];
  alCambiar: (fijados: ValorDelMes[]) => void;
  /** El texto cuando aún no tiene mes de inicio ni meses. */
  sinPeriodo?: string;
}) {
  // Cambia solo con «Repartir en partes iguales», para que los campos olviden lo escrito. Mientras
  // se escribe la llave de cada mes no cambia: si cambiara al fijarse, el campo perdería el foco
  // con el primer dígito.
  const [vuelta, setVuelta] = useState(0);
  const meses = mesesDelPeriodo(periodo);
  const reparto = repartir(total, periodo, fijados);
  const { descartados } = descartarFijadosFuera(fijados, periodo);
  const valorDe = new Map(reparto.meses.map((m) => [m.mes, m.valor]));
  const fijadoDe = new Map(fijados.map((f) => [f.mes, f.valor]));
  const primerLibre = reparto.meses.find((m) => !fijadoDe.has(m.mes));

  function cambiarMes(mes: string, valor: number | null) {
    const sinEse = fijados.filter((f) => f.mes !== mes);
    alCambiar(valor === null ? sinEse : [...sinEse, { mes, valor }].sort((a, b) => a.mes.localeCompare(b.mes)));
  }

  if (meses.length === 0) {
    return <Text style={estilos.pie}>{sinPeriodo ?? 'Sin mes de inicio y cantidad de meses no hay meses que repartir.'}</Text>;
  }

  return (
    <View style={estilos.columna}>
      <Text style={estilos.pie}>
        {`Se reparten ${enPesos(total)} en ${meses.length} ${meses.length === 1 ? 'mes' : 'meses'}. Escriba en un mes para fijarlo; borre el valor para soltarlo.`}
      </Text>
      <View style={estilos.fila}>
        {meses.map((mes) => (
          <CampoDelMes
            key={`${mes}-${vuelta}`}
            mes={mes}
            fijado={fijadoDe.get(mes)}
            repartido={valorDe.get(mes) ?? primerLibre?.valor ?? 0}
            alCambiar={(valor) => cambiarMes(mes, valor)}
          />
        ))}
      </View>
      {reparto.hallazgo ? (
        <Aviso tono="error">
          {reparto.hallazgo.tipo === 'fijados_exceden_total'
            ? `Los meses fijados suman ${enPesos(reparto.hallazgo.diferencia)} más que el total.`
            : `Todos los meses están fijados y no suman el total: la diferencia es ${enPesos(reparto.hallazgo.diferencia)}.`}
        </Aviso>
      ) : null}
      {descartados.length > 0 ? (
        <Aviso tono="info">
          {`Con el periodo nuevo quedan fuera, y se descartan al guardar: ${descartados.map((d) => `${d.mes} (${enPesos(d.valor)})`).join(', ')}.`}
        </Aviso>
      ) : null}
      {fijados.length > 0 ? (
        <Acciones>
          <Boton
            titulo="Repartir en partes iguales"
            tono="secundario"
            onPress={() => {
              setVuelta((v) => v + 1);
              alCambiar([]);
            }}
          />
        </Acciones>
      ) : null}
    </View>
  );
}

const estilos = StyleSheet.create({
  columna: { gap: 8 },
  fila: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  pie: { fontFamily: FuentePanel.texto, fontSize: TextoPanel.apoyo, color: Panel.textoApoyo },
});
