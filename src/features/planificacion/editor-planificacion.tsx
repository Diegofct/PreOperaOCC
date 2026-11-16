/**
 * El editor del borrador de planificación (spec 045, RF-44 a RF-64): la pestaña de ítems.
 *
 * ── La misma regla que el servidor, en cada tecla ──
 *
 * Lo que se edita es la `EdicionDelBorrador` (lo editable y nada más), y cada cambio pasa por
 * `aplicarEdicion` y `recalcularPlanificacion`, las mismas funciones que corre el servidor al
 * guardar (RF-56, RF-57). Así el resumen se mueve sin guardar, y lo que se ve es lo que se va a
 * guardar: el servidor no recibe totales de aquí, los vuelve a calcular.
 *
 * ── La tabla mira, el bloque de abajo edita ──
 *
 * La tabla de ítems es de solo lectura, con sus importes en vivo y un botón por fila. El ítem
 * abierto se edita en un bloque entre el resumen y la tabla —no en una ventana encima, ni debajo de
 * los cuarenta ítems—, para que el resumen se vea cambiar mientras se escribe. Los campos guardan su texto mientras se escribe («1.2» a medio
 * camino de «1.25»), y el número entra a la edición cuando se puede leer.
 *
 * ── Pestañas ──
 *
 * Ítems, Rubros e Indirectos (`indirectos-del-borrador.tsx`). Cada ítem y cada rubro abre sus meses
 * (`meses-del-renglon.tsx`): fijar uno reparte el resto. Si el Excel trajo los rubros en una sola
 * línea, esa línea es su calendario y se edita como un renglón; «Programar por rubro» la deshace y
 * deja cada rubro sin calendario, para darle el suyo (RF-163 a RF-167).
 *
 * ── Plazo ──
 *
 * El plazo y el mes de arranque se cambian en el resumen (RF-6, RF-7), con la misma validación del
 * servidor (`validarPlazo`, dentro de `aplicarEdicion`): un plazo fuera de 1 a 120 sale como error y
 * no deja guardar. Cambiarlos mueve lo que depende del plazo —el reparto de los porcentajes sin obra
 * y los hallazgos de lo programado fuera—, no el calendario de cada ítem.
 *
 * ── Guardar ──
 *
 * Con la versión que se abrió (RF-58). Si otra persona guardó antes, el servidor responde 409 y
 * aquí se ofrece volver a cargar (RF-59); lo escrito sin guardar se pierde, igual que en el plan
 * semanal (044).
 */
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { FuentePanel, Panel, TextoPanel } from '@/constants/theme';
import { api, ErrorApi, mensajeDe } from '@/features/panel/cliente-api';
import { Acciones, Aviso, Boton, Campo, Celda, Cifra, Cifras, Etiqueta, Seccion, Tabla, type Columna } from '@/features/panel/componentes';
import type { PlanificacionDetalle } from '@/features/panel/planificacion';
import { enPesos } from '@/shared/rules/pesos';
import { impedimentosParaAprobar, sinPrecioDeCosto, type ItemDeLaPlanificacion } from '@/shared/rules/planificacion';
import {
  aplicarEdicion,
  costoConOtraMedida,
  edicionDe,
  recalcularPlanificacion,
  type EdicionDelBorrador,
  type EdicionDelItem,
  type EdicionDelRubro,
} from '@/shared/rules/planificacion-borrador';
import { fijadosDeLosValores } from '@/shared/rules/planificacion-reparto';

import { CampoCifra } from './campo-cifra';
import { IndirectosDelBorrador } from './indirectos-del-borrador';
import { MesesDelRenglon } from './meses-del-renglon';

const cantidad = (n: number | null | undefined) => (n === null || n === undefined ? '—' : n.toLocaleString('es-CO', { maximumFractionDigits: 3 }));

type FilaDeItem = { id: string; n: number; item: ItemDeLaPlanificacion; importeReal: number | null; costo: number | null };
type FilaDeRubro = { id: string; n: number; nombre: string; valor: number; costo: number | null; mesInicio: string | null; meses: number | null };
type Pestana = 'items' | 'rubros' | 'indirectos';

export function EditorPlanificacion({
  p,
  alGuardar,
  alRecargar,
}: {
  p: PlanificacionDetalle;
  /** Ya guardado: el detalle se vuelve a pedir. */
  alGuardar: () => void;
  /** Vuelve a pedir el borrador; lo que había sin guardar se pierde (RF-59). */
  alRecargar: () => void;
}) {
  const [edicion, setEdicion] = useState<EdicionDelBorrador>(() => edicionDe(p.estructura));
  const [sucio, setSucio] = useState(false);
  const [abierto, setAbierto] = useState<number | null>(null);
  const [pestana, setPestana] = useState<Pestana>('items');
  const [rubroAbierto, setRubroAbierto] = useState<number | null>(null);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<{ texto: string; choque: boolean; errores: string[] } | null>(null);

  // RF-56: la regla, en vivo. Lo que no cuadra (un negativo, un mes mal escrito) se lista y no se guarda.
  const aplicado = aplicarEdicion(p.estructura, edicion);
  const estructura = aplicado.ok ? aplicado.estructura : null;
  const calculo = estructura ? recalcularPlanificacion(estructura).calculo : null;
  const impedimentos = estructura ? impedimentosParaAprobar(estructura) : [];

  function cambiarItem(n: number, cambio: Partial<EdicionDelItem>) {
    setEdicion((e) => ({ ...e, items: e.items.map((item, i) => (i === n ? { ...item, ...cambio } : item)) }));
    setSucio(true);
    setError(null);
  }

  function cambiarRubro(n: number, cambio: Partial<EdicionDelRubro>) {
    setEdicion((e) => ({ ...e, rubros: e.rubros.map((r, i) => (i === n ? { ...r, ...cambio } : r)) }));
    setSucio(true);
    setError(null);
  }

  function cambiarLinea(fijados: EdicionDelBorrador['rubros'][number]['fijados']) {
    setEdicion((e) => ({ ...e, lineaDeRubros: { fijados } }));
    setSucio(true);
    setError(null);
  }

  /** RF-166, RF-167: sin la línea, cada rubro queda sin calendario para darle el suyo. */
  function programarPorRubro() {
    setEdicion((e) => ({ ...e, lineaDeRubros: null }));
    setRubroAbierto(null);
    setSucio(true);
    setError(null);
  }

  function cambiarRenglones(renglonesIndirectos: EdicionDelBorrador['renglonesIndirectos']) {
    setEdicion((e) => ({ ...e, renglonesIndirectos }));
    setSucio(true);
    setError(null);
  }

  /** RF-6, RF-7: un plazo que no se puede leer va como 0, para que la regla diga el motivo. */
  function cambiarPlazo(cambio: Partial<EdicionDelBorrador['plazo']>) {
    setEdicion((e) => ({ ...e, plazo: { ...e.plazo, ...cambio } }));
    setSucio(true);
    setError(null);
  }

  /** RF-90, RF-91: cambiarlos recalcula todos los renglones de personal. */
  function cambiarFactores(factorPrestacional: number, recargoHorasExtras: number) {
    setEdicion((e) => ({ ...e, factorPrestacional, recargoHorasExtras }));
    setSucio(true);
    setError(null);
  }

  async function guardar() {
    setGuardando(true);
    setError(null);
    try {
      await api.planificaciones.guardar(p.id, { version: p.version, ...edicion });
      setSucio(false);
      alGuardar();
    } catch (fallo) {
      const cuerpo = fallo instanceof ErrorApi ? (fallo.cuerpo as { errores?: string[] } | undefined) : undefined;
      setError({ texto: mensajeDe(fallo), choque: fallo instanceof ErrorApi && fallo.estado === 409, errores: cuerpo?.errores ?? [] });
    } finally {
      setGuardando(false);
    }
  }

  const filas: FilaDeItem[] = (estructura ?? p.estructura).items.map((item, n) => ({
    id: String(n),
    n,
    item,
    importeReal: calculo?.items[n]?.importeReal ?? null,
    costo: calculo?.items[n]?.importeCosto ?? null,
  }));

  // Caben en `MaxContentWidthPanel` (1 280): 70 + 260 + 100 + 130 + 90 + 60 + 130 + 130 + 100 = 1 070,
  // más 8 separaciones de 16 (128) y 16 a cada lado (32): 1 230.
  const columnas: Columna<FilaDeItem>[] = [
    { clave: 'item', titulo: 'Ítem', ancho: 70, pintar: (f) => <Celda>{f.item.item}</Celda>, ordenar: (f) => f.item.item },
    {
      clave: 'descripcion',
      titulo: 'Descripción',
      ancho: 260,
      pintar: (f) => (
        <View style={estilos.celdaConMarca}>
          <Celda>{f.item.descripcion}</Celda>
          {/* RF-63. */}
          {costoConOtraMedida(f.item) ? <Etiqueta tono="neutro">Costo con otra medida</Etiqueta> : null}
        </View>
      ),
    },
    { clave: 'medida', titulo: 'Med. real', ancho: 100, pintar: (f) => <Celda>{`${cantidad(f.item.medidaReal)} ${f.item.unidad}`}</Celda> },
    {
      clave: 'costo-unitario',
      titulo: 'Precio costo',
      ancho: 130,
      pintar: (f) =>
        (f.item.medidaReal ?? 0) > 0 && sinPrecioDeCosto(f.item.precioCosto) ? (
          <Etiqueta tono="atencion">Sin costo</Etiqueta>
        ) : (
          <Celda>{f.item.precioCosto === null ? '—' : enPesos(f.item.precioCosto)}</Celda>
        ),
    },
    { clave: 'inicio', titulo: 'Inicio', ancho: 90, pintar: (f) => <Celda>{f.item.mesInicio ?? '—'}</Celda> },
    { clave: 'meses', titulo: 'Meses', ancho: 60, pintar: (f) => <Celda>{cantidad(f.item.tiempoEjecucion)}</Celda> },
    { clave: 'real', titulo: 'Importe real', ancho: 130, pintar: (f) => <Celda>{f.importeReal === null ? '—' : enPesos(f.importeReal)}</Celda> },
    { clave: 'importe-costo', titulo: 'Importe a costo', ancho: 130, pintar: (f) => <Celda>{f.costo === null ? '—' : enPesos(f.costo)}</Celda> },
    {
      clave: 'acciones',
      titulo: '',
      ancho: 100,
      anchoMinimo: 100,
      pintar: (f) =>
        abierto === f.n ? <Etiqueta tono="neutro">Abierto</Etiqueta> : <Boton titulo="Editar" tono="secundario" onPress={() => setAbierto(f.n)} />,
    },
  ];

  const itemAbierto = abierto === null ? null : edicion.items[abierto];
  const original = abierto === null ? null : p.estructura.items[abierto];
  const importeDelAbierto = abierto === null ? 0 : (calculo?.items[abierto]?.importeReal ?? 0);

  // La línea de rubros: la que tiene el borrador ahora (la quita «Programar por rubro»).
  const linea = edicion.lineaDeRubros && (estructura ?? p.estructura).lineaDeRubros ? (estructura ?? p.estructura).lineaDeRubros : null;
  const totalDeRubros = (estructura ?? p.estructura).rubros.reduce((suma, r) => suma + r.valor, 0);
  const periodoDeLinea = edicion.lineaDeRubros ? fijadosDeLosValores(edicion.lineaDeRubros.fijados) : null;
  const filasDeRubros: FilaDeRubro[] = (estructura ?? p.estructura).rubros.map((r, n) => ({
    id: String(n),
    n,
    nombre: r.nombre,
    valor: r.valor,
    costo: r.costo,
    mesInicio: r.mesInicio ?? null,
    meses: r.tiempoEjecucion ?? null,
  }));
  const rubroEnEdicion = rubroAbierto === null ? null : edicion.rubros[rubroAbierto];
  const rubroOriginal = rubroAbierto === null ? null : p.estructura.rubros[rubroAbierto];

  // Caben en `MaxContentWidthPanel` (1 280): 420 + 160 + 160 + 100 + 80 + 100 = 1 020, más 5
  // separaciones de 16 (80) y 16 a cada lado (32): 1 132.
  const columnasDeRubros: Columna<FilaDeRubro>[] = [
    { clave: 'nombre', titulo: 'Rubro', ancho: 420, pintar: (r) => <Celda>{r.nombre}</Celda> },
    { clave: 'valor', titulo: 'Valor', ancho: 160, pintar: (r) => <Celda>{enPesos(r.valor)}</Celda> },
    {
      clave: 'costo',
      titulo: 'Costo',
      ancho: 160,
      pintar: (r) => (r.valor > 0 && sinPrecioDeCosto(r.costo) ? <Etiqueta tono="atencion">Sin costo</Etiqueta> : <Celda>{r.costo === null ? '—' : enPesos(r.costo)}</Celda>),
    },
    { clave: 'inicio', titulo: 'Inicio', ancho: 100, pintar: (r) => <Celda>{linea ? 'Por la línea' : (r.mesInicio ?? '—')}</Celda> },
    { clave: 'meses', titulo: 'Meses', ancho: 80, pintar: (r) => <Celda>{linea ? '—' : cantidad(r.meses)}</Celda> },
    {
      clave: 'acciones',
      titulo: '',
      ancho: 100,
      anchoMinimo: 100,
      pintar: (r) =>
        rubroAbierto === r.n ? <Etiqueta tono="neutro">Abierto</Etiqueta> : <Boton titulo="Editar" tono="secundario" onPress={() => setRubroAbierto(r.n)} />,
    },
  ];

  return (
    <View style={estilos.columna}>
      <Seccion titulo="Resumen del borrador">
        <View style={estilos.columna}>
          {/* RF-56: se mueve con cada cambio, antes de guardar. */}
          <Cifras>
            <Cifra titulo="Importe real total" valor={calculo ? enPesos(calculo.importeRealTotal) : '—'} pie="Ítems y rubros" />
            <Cifra titulo="Costo total" valor={calculo ? enPesos(calculo.importeCostoTotal) : '—'} />
            <Cifra titulo="Indirectos" valor={calculo ? enPesos(calculo.indirectosTotal) : '—'} />
            <Cifra
              titulo="Factor de indirectos"
              valor={calculo?.factorDeIndirectos == null ? 'Sin dato' : calculo.factorDeIndirectos.toLocaleString('es-CO', { maximumFractionDigits: 2 })}
            />
            <Cifra
              titulo="Resultado"
              valor={calculo?.resultadoTotal == null ? '—' : enPesos(calculo.resultadoTotal)}
              tono={calculo?.resultadoTotal != null && calculo.resultadoTotal < 0 ? 'malo' : 'neutro'}
            />
          </Cifras>
          <View style={estilos.fila}>
            <CampoCifra etiqueta="Plazo, en meses" valor={edicion.plazo.meses} alCambiar={(n) => cambiarPlazo({ meses: n ?? 0 })} ancho={160} ayuda="Entre 1 y 120." />
            <Campo
              etiqueta="Mes de arranque"
              valor={edicion.plazo.arranque}
              onChange={(v) => cambiarPlazo({ arranque: v.trim() })}
              ayuda="El mes 1 del plazo, como 2026-01."
              ancho={180}
            />
          </View>
          {!aplicado.ok ? aplicado.errores.map((e) => <Aviso key={e} tono="error">{e}</Aviso>) : null}
          {impedimentos.length > 0 ? (
            <Text style={estilos.pie}>{`Para aprobar faltan ${impedimentos.length === 1 ? '1 cosa' : `${impedimentos.length} cosas`}: costos, medidas o programación.`}</Text>
          ) : null}
        </View>
      </Seccion>

      <Acciones>
        <Boton titulo="Ítems" tono={pestana === 'items' ? 'primario' : 'secundario'} onPress={() => setPestana('items')} />
        <Boton titulo="Rubros" tono={pestana === 'rubros' ? 'primario' : 'secundario'} onPress={() => setPestana('rubros')} />
        <Boton titulo="Indirectos" tono={pestana === 'indirectos' ? 'primario' : 'secundario'} onPress={() => setPestana('indirectos')} />
      </Acciones>

      {pestana === 'items' && itemAbierto && original ? (
        <Seccion titulo={`Ítem ${original.item} · ${original.capitulo}`}>
          <View key={abierto} style={estilos.columna}>
            <Text style={estilos.pie}>
              {`${original.descripcion} · Contrato: ${cantidad(original.medidaContractual)} ${original.unidad} a ${original.precioContractual === null ? '—' : enPesos(original.precioContractual)}. Lo del contrato no se cambia aquí.`}
            </Text>
            <View style={estilos.fila}>
              <CampoCifra etiqueta="Medida real" valor={itemAbierto.medidaReal} alCambiar={(n) => cambiarItem(abierto as number, { medidaReal: n })} ancho={160} />
              <CampoCifra
                etiqueta="Medida para costo"
                valor={itemAbierto.medidaCoste}
                alCambiar={(n) => cambiarItem(abierto as number, { medidaCoste: n })}
                ancho={160}
                ayuda="Si es igual a la real, la sigue."
              />
              <CampoCifra etiqueta="Precio de costo" valor={itemAbierto.precioCosto} alCambiar={(n) => cambiarItem(abierto as number, { precioCosto: n })} ancho={180} />
              <Campo
                etiqueta="Mes de inicio"
                valor={itemAbierto.mesInicio ?? ''}
                onChange={(v) => cambiarItem(abierto as number, { mesInicio: v.trim() === '' ? null : v.trim() })}
                ayuda="Como 2026-03."
                ancho={140}
              />
              <CampoCifra
                etiqueta="Meses"
                valor={itemAbierto.tiempoEjecucion}
                alCambiar={(n) => cambiarItem(abierto as number, { tiempoEjecucion: n })}
                ancho={110}
              />
            </View>
            {/* RF-96 a RF-104: sus meses, con los fijados. */}
            <MesesDelRenglon
              total={importeDelAbierto}
              periodo={{ mesInicio: itemAbierto.mesInicio, tiempoEjecucion: itemAbierto.tiempoEjecucion }}
              fijados={itemAbierto.fijados}
              alCambiar={(fijados) => cambiarItem(abierto as number, { fijados })}
            />
            <Acciones>
              <Boton titulo="Cerrar el ítem" tono="secundario" onPress={() => setAbierto(null)} />
            </Acciones>
          </View>
        </Seccion>
      ) : null}

      {pestana === 'items' ? (
        <Seccion titulo="Ítems">
          <Tabla filas={filas} columnas={columnas} vacio="Este borrador no tiene ítems." />
        </Seccion>
      ) : null}

      {pestana === 'rubros' && linea && edicion.lineaDeRubros && periodoDeLinea ? (
        <Seccion titulo={`Línea de rubros: ${linea.nombre}`}>
          <View style={estilos.columna}>
            <Text style={estilos.pie}>
              El Excel programa los rubros juntos en esta línea: es su calendario y se edita como un solo renglón. A cada rubro se le
              digita su costo abajo.
            </Text>
            <MesesDelRenglon total={totalDeRubros} periodo={periodoDeLinea} fijados={edicion.lineaDeRubros.fijados} alCambiar={cambiarLinea} />
            <Acciones>
              <Boton titulo="Programar por rubro" tono="secundario" onPress={programarPorRubro} />
            </Acciones>
          </View>
        </Seccion>
      ) : null}

      {pestana === 'rubros' && rubroEnEdicion && rubroOriginal ? (
        <Seccion titulo={`Rubro ${rubroOriginal.nombre}`}>
          <View key={rubroAbierto} style={estilos.columna}>
            <Text style={estilos.pie}>{`Valor del presupuesto: ${enPesos(rubroOriginal.valor)}. El valor no se cambia aquí.`}</Text>
            <View style={estilos.fila}>
              <CampoCifra etiqueta="Costo" valor={rubroEnEdicion.costo} alCambiar={(n) => cambiarRubro(rubroAbierto as number, { costo: n })} ancho={200} />
              {linea ? null : (
                <>
                  <Campo
                    etiqueta="Mes de inicio"
                    valor={rubroEnEdicion.mesInicio ?? ''}
                    onChange={(v) => cambiarRubro(rubroAbierto as number, { mesInicio: v.trim() === '' ? null : v.trim() })}
                    ayuda="Como 2026-03."
                    ancho={140}
                  />
                  <CampoCifra
                    etiqueta="Meses"
                    valor={rubroEnEdicion.tiempoEjecucion}
                    alCambiar={(n) => cambiarRubro(rubroAbierto as number, { tiempoEjecucion: n })}
                    ancho={110}
                  />
                </>
              )}
            </View>
            {linea ? null : (
              <MesesDelRenglon
                total={rubroOriginal.valor}
                periodo={{ mesInicio: rubroEnEdicion.mesInicio, tiempoEjecucion: rubroEnEdicion.tiempoEjecucion }}
                fijados={rubroEnEdicion.fijados}
                alCambiar={(fijados) => cambiarRubro(rubroAbierto as number, { fijados })}
              />
            )}
            <Acciones>
              <Boton titulo="Cerrar el rubro" tono="secundario" onPress={() => setRubroAbierto(null)} />
            </Acciones>
          </View>
        </Seccion>
      ) : null}

      {pestana === 'indirectos' ? (
        <IndirectosDelBorrador
          estructura={estructura ?? p.estructura}
          renglones={edicion.renglonesIndirectos}
          factorPrestacional={edicion.factorPrestacional}
          recargoHorasExtras={edicion.recargoHorasExtras}
          calculo={calculo}
          alCambiarRenglones={cambiarRenglones}
          alCambiarFactores={cambiarFactores}
        />
      ) : null}

      {pestana === 'rubros' ? (
        <Seccion titulo="Rubros">
          <Tabla filas={filasDeRubros} columnas={columnasDeRubros} vacio="Este borrador no tiene rubros." />
        </Seccion>
      ) : null}


      <Acciones>
        <Boton
          titulo={guardando ? 'Guardando…' : 'Guardar el borrador'}
          tono="primario"
          onPress={() => void guardar()}
          deshabilitado={!sucio || guardando || !aplicado.ok}
        />
      </Acciones>
      {sucio ? <Text style={estilos.pie}>Hay cambios sin guardar.</Text> : null}
      {error ? <Aviso tono="error">{error.texto}</Aviso> : null}
      {error ? error.errores.slice(1).map((e) => <Aviso key={e} tono="error">{e}</Aviso>) : null}
      {error?.choque ? (
        <Acciones>
          <Boton titulo="Volver a cargar el borrador" tono="secundario" onPress={alRecargar} />
        </Acciones>
      ) : null}
    </View>
  );
}

const estilos = StyleSheet.create({
  columna: { gap: 12 },
  fila: { flexDirection: 'row', gap: 12, flexWrap: 'wrap' },
  celdaConMarca: { gap: 4 },
  pie: { fontFamily: FuentePanel.texto, fontSize: TextoPanel.apoyo, color: Panel.textoApoyo },
});
