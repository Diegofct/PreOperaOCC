/**
 * La ventana donde se arma o se ajusta una actividad del plan (spec 044, RF-6, RF-21 a RF-25, RF-31,
 * RF-32, RF-91, RF-93, RF-97).
 *
 * Una actividad es una de tres cosas, y la ventana cambia con cuál: un **ítem de la planificación**
 * (se escoge de la lista, y es lo único que mide el cumplimiento), algo **fuera de la planificación**
 * (se describe a mano y se deja marcado) o un **rubro** (un valor, sin meta en cantidades).
 *
 * Al escribir la meta de la semana se reparte sola en partes iguales entre los días marcados; después
 * se puede ajustar cada día. El reparto, la meta diaria, el total y si la suma cuadra salen de la
 * regla (`shared/rules/plan-semanal.ts`): aquí no se hace ninguna cuenta. Una suma que no cuadra se
 * dice en la misma ventana, y se puede aceptar para seguir ajustando, pero el plan no se guarda así.
 *
 * El valor de un rubro lo escribe quien ve la plata. Al Residente ese campo no le sale: el servidor
 * conserva el valor que el rubro ya tenía.
 */
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { FuentePanel, Panel, TextoPanel } from '@/constants/theme';
import { Acciones, Aviso, Boton, Campo, Modal, Selector } from '@/features/panel/componentes';
import type { ItemParaElPlan } from '@/features/panel/plan-semanal';
import { descuadreDeLaActividad, metaDiaria, repartir, totalProgramado, type ActividadDelPlan, type TipoDeActividad } from '@/shared/rules/plan-semanal';

import { enCantidad, nombreDelDia } from './estados';

const NOMBRE_DEL_TIPO: Record<TipoDeActividad, string> = {
  item: 'Ítem de la planificación',
  fuera: 'Fuera de la planificación',
  rubro: 'Rubro (un valor, sin cantidades)',
};

/** «1.500,5» o «1500.5» → 1500.5; vacío o algo que no es un número → null. */
function numeroDe(texto: string): number | null {
  const limpio = texto.trim().replace(/\s|\$/g, '');
  if (!limpio) return null;
  const normal = limpio.includes(',') ? limpio.replace(/\./g, '').replace(',', '.') : limpio;
  const n = Number(normal);
  return Number.isFinite(n) && n >= 0 ? n : null;
}
const aTexto = (n: number | null | undefined) => (n === null || n === undefined ? '' : String(n).replace('.', ','));

export const ACTIVIDAD_NUEVA: ActividadDelPlan = {
  tipo: 'item',
  frenteDeTrabajo: '',
  llave: null,
  item: '',
  renglon: null,
  descripcion: '',
  unidad: '',
  metaSemana: null,
  cantidades: {},
  valorRubro: null,
  cuadrilla: '',
  equipo: '',
};

export function VentanaDeActividad({
  actividad,
  esNueva,
  dias,
  items,
  conPlata,
  alAceptar,
  alQuitar,
  alCerrar,
}: {
  actividad: ActividadDelPlan;
  esNueva: boolean;
  /** Los días marcados del plan, en orden. */
  dias: readonly string[];
  items: readonly ItemParaElPlan[];
  /** Si quien edita ve la plata: solo entonces se escribe el valor de un rubro. */
  conPlata: boolean;
  alAceptar: (actividad: ActividadDelPlan) => void;
  alQuitar: () => void;
  alCerrar: () => void;
}) {
  const [a, setA] = useState(actividad);
  // Los números se escriben como texto: «12,» a medio teclear no es un número todavía.
  const [meta, setMeta] = useState(aTexto(actividad.metaSemana));
  const [porDia, setPorDia] = useState<Record<string, string>>(() => Object.fromEntries(dias.map((d) => [d, aTexto(actividad.cantidades[d])])));
  const [valor, setValor] = useState(aTexto(actividad.valorRubro));
  const [falta, setFalta] = useState<string | null>(null);

  const delItem = a.tipo === 'item' ? items.find((i) => i.llave === a.llave) : undefined;
  const esRubro = a.tipo === 'rubro';
  const metaSemana = esRubro ? null : numeroDe(meta);
  const cantidades = Object.fromEntries(dias.flatMap((d) => (numeroDe(porDia[d] ?? '') === null ? [] : [[d, numeroDe(porDia[d]) as number]])));
  const descuadre = esRubro ? null : descuadreDeLaActividad({ metaSemana, cantidades }, dias);

  function cambiarTipo(tipo: TipoDeActividad | null) {
    if (!tipo) return;
    // Al cambiar de tipo se suelta el ítem: lo que mide el cumplimiento no se arrastra por error.
    setA({ ...a, tipo, llave: null, renglon: null, item: tipo === 'item' ? '' : a.item });
  }

  function escogerItem(llave: string | null) {
    const escogido = items.find((i) => i.llave === llave);
    if (!escogido) return;
    setA({ ...a, llave: escogido.llave, item: escogido.item, renglon: escogido.renglon, descripcion: escogido.descripcion, unidad: escogido.unidad });
  }

  /** RF-21: la meta en partes iguales entre los días marcados. */
  function repartirLaMeta(texto: string) {
    setMeta(texto);
    const n = numeroDe(texto);
    setPorDia(n === null ? {} : Object.fromEntries(Object.entries(repartir(n, dias)).map(([d, c]) => [d, aTexto(c)])));
  }

  function aceptar() {
    if (a.tipo === 'item' && !delItem) return setFalta('Escoja el ítem de la planificación.');
    if (!a.descripcion.trim()) return setFalta('Escriba la actividad.');
    if (!esRubro && metaSemana === null) return setFalta('Escriba la meta de la semana.');
    alAceptar({
      ...a,
      metaSemana,
      cantidades: esRubro ? {} : cantidades,
      // Sin plata a la vista no se toca el valor: el servidor conserva el que tenía.
      valorRubro: esRubro && conPlata ? numeroDe(valor) : esRubro ? actividad.valorRubro : null,
    });
  }

  return (
    <Modal titulo={esNueva ? 'Agregar actividad' : 'Ajustar actividad'} onCerrar={alCerrar} amplia>
      <View style={estilos.columna}>
        <Selector
          etiqueta="Tipo"
          valor={a.tipo}
          opciones={(['item', 'fuera', 'rubro'] as const).map((t) => ({ valor: t, etiqueta: NOMBRE_DEL_TIPO[t] }))}
          onChange={(t) => cambiarTipo(t as TipoDeActividad | null)}
          obligatorio
          ancho={360}
        />
        {a.tipo === 'item' ? (
          <Selector
            etiqueta="Ítem de la planificación"
            valor={delItem?.llave ?? null}
            opciones={items.map((i) => ({
              valor: i.llave,
              etiqueta: `${i.item || i.renglon || ''} · ${i.descripcion}`,
              detalle: `${i.capitulo} · pendiente ${enCantidad(i.pendiente)} ${i.unidad}`,
            }))}
            onChange={escogerItem}
            vacio="Escoja el ítem"
            obligatorio
            ancho={640}
          />
        ) : null}
        {a.tipo === 'fuera' ? (
          <Aviso tono="info">Lo que no es un ítem de la planificación queda marcado «Fuera de la planificación» y no cuenta como meta del cumplimiento.</Aviso>
        ) : null}
        {esRubro ? <Aviso tono="info">Un rubro se planea por su valor y no cuenta en el cumplimiento.</Aviso> : null}

        <View style={estilos.fila}>
          <Campo etiqueta="Frente de trabajo" valor={a.frenteDeTrabajo} onChange={(v) => setA({ ...a, frenteDeTrabajo: v })} ayuda="Como lo nombran en la obra: «3. Cunetas»." ancho={240} />
          {a.tipo === 'fuera' ? <Campo etiqueta="Ítem" valor={a.item} onChange={(v) => setA({ ...a, item: v })} ancho={120} /> : null}
          <Campo etiqueta="Actividad" valor={a.descripcion} onChange={(v) => setA({ ...a, descripcion: v })} obligatorio ancho={360} />
          {esRubro ? null : <Campo etiqueta="Unidad" valor={a.unidad} onChange={(v) => setA({ ...a, unidad: v })} soloLectura={a.tipo === 'item'} ancho={110} />}
        </View>
        <View style={estilos.fila}>
          <Campo etiqueta="Cuadrilla" valor={a.cuadrilla} onChange={(v) => setA({ ...a, cuadrilla: v })} ancho={360} />
          <Campo etiqueta="Equipo principal" valor={a.equipo} onChange={(v) => setA({ ...a, equipo: v })} ancho={360} />
        </View>

        {esRubro ? (
          conPlata ? (
            <Campo etiqueta="Valor de la semana ($)" valor={valor} onChange={setValor} soloNumeros ancho={220} />
          ) : null
        ) : (
          <>
            <View style={estilos.fila}>
              <Campo
                etiqueta={`Meta de la semana${a.unidad ? ` (${a.unidad})` : ''}`}
                valor={meta}
                onChange={repartirLaMeta}
                ayuda="Al escribirla se reparte en partes iguales entre los días marcados."
                obligatorio
                ancho={220}
              />
            </View>
            {delItem ? <Text style={estilos.dato}>{`Pendiente del ítem hoy: ${enCantidad(delItem.pendiente)} ${delItem.unidad}`}</Text> : null}
            <Text style={estilos.subtitulo}>Cantidad de cada día</Text>
            {dias.length === 0 ? <Aviso tono="info">El plan no tiene días marcados. Marque los días de trabajo antes de repartir.</Aviso> : null}
            <View style={estilos.fila}>
              {dias.map((dia) => (
                <Campo key={dia} etiqueta={nombreDelDia(dia)} valor={porDia[dia] ?? ''} onChange={(v) => setPorDia({ ...porDia, [dia]: v })} ancho={110} />
              ))}
            </View>
            <Text style={estilos.dato}>
              {`Meta diaria: ${enCantidad(metaDiaria(metaSemana, dias.length))} · Total programado: ${enCantidad(totalProgramado(cantidades))}`}
            </Text>
            {descuadre ? <Aviso tono="error">{`${descuadre} Así no se puede guardar el plan.`}</Aviso> : null}
          </>
        )}

        {falta ? <Aviso tono="error">{falta}</Aviso> : null}
        <Acciones>
          <Boton titulo="Aceptar" tono="primario" onPress={aceptar} />
          <Boton titulo="Cancelar" tono="secundario" onPress={alCerrar} />
          {esNueva ? null : <Boton titulo="Quitar del plan" tono="peligro" onPress={alQuitar} />}
        </Acciones>
      </View>
    </Modal>
  );
}

const estilos = StyleSheet.create({
  columna: { gap: 12 },
  fila: { flexDirection: 'row', gap: 12, flexWrap: 'wrap', alignItems: 'flex-start' },
  subtitulo: { fontFamily: FuentePanel.texto, fontWeight: '600', fontSize: TextoPanel.cuerpo, color: Panel.texto },
  dato: { fontFamily: FuentePanel.texto, fontSize: TextoPanel.apoyo, color: Panel.textoApoyo },
});
