/**
 * El editor de un borrador de presupuesto (spec 031, RF-47): agregar, cambiar, mover y
 * quitar vías, capítulos, ítems y rubros, y cambiar el AIU.
 *
 * Se edita una copia en la pantalla y se guarda entera con la versión que se leyó. Si
 * otra persona guardó entretanto, el servidor responde «Otra persona cambió el
 * presupuesto…» y no se pisa nada: hay que volver a cargar. Los totales se ven al
 * momento con las mismas reglas que usa el servidor, que de todos modos los recalcula al
 * guardar (constitución, principio 3).
 *
 * Los ítems de un capítulo se despliegan a pedido: 76 renglones con siete campos cada uno
 * no caben de una vez en una pantalla que se pueda leer.
 */
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { uuidv7 } from 'uuidv7';

import { FuentePanel, Panel, TextoPanel } from '@/constants/theme';
import { api, ErrorApi, mensajeDe } from '@/features/panel/cliente-api';
import {
  Acciones,
  AccionesFormulario,
  Aviso,
  Boton,
  Campo,
  Cifra,
  Cifras,
  Formulario,
  Seccion,
  Selector,
} from '@/features/panel/componentes';
import type { PresupuestoDetalle } from '@/features/panel/contratos';
import { UNIDADES_DE_ACTIVIDAD, type UnidadDeActividad } from '@/shared/catalogos/presupuesto';
import { enPesos } from '@/shared/rules/pesos';
import {
  faltasParaGuardarPresupuesto,
  normalizarEstructura,
  resumenDelPresupuesto,
  totalDelItem,
  type CapituloDelPresupuesto,
  type EstructuraDePresupuesto,
  type GrupoDelPresupuesto,
  type ItemDelPresupuesto,
  type RubroDelPresupuesto,
} from '@/shared/rules/presupuesto';

/** «1.500,5» o «1500.5» → 1500.5; vacío → null. */
function numeroDe(texto: string): number | null {
  const limpio = texto.trim().replace(/\s|\$/g, '');
  if (!limpio) return null;
  const normal = limpio.includes(',') ? limpio.replace(/\./g, '').replace(',', '.') : limpio;
  const n = Number(normal);
  return Number.isFinite(n) ? n : null;
}

const aTexto = (n: number | null) => (n === null ? '' : String(n).replace('.', ','));

/**
 * Un número que se escribe como texto: guarda lo escrito tal cual («1.500,» a medias) y
 * avisa el número cuando se puede leer. Sin esto, cada tecla reescribiría el campo.
 */
function CampoNumero({
  etiqueta,
  valor,
  alCambiar,
  ancho,
  ayuda,
}: {
  etiqueta: string;
  valor: number | null;
  alCambiar: (n: number | null) => void;
  ancho: number;
  ayuda?: string;
}) {
  const [texto, setTexto] = useState(aTexto(valor));
  return (
    <Campo
      etiqueta={etiqueta}
      valor={texto}
      onChange={(v) => {
        setTexto(v);
        alCambiar(numeroDe(v));
      }}
      ancho={ancho}
      ayuda={ayuda}
    />
  );
}

const OPCIONES_DE_UNIDAD = UNIDADES_DE_ACTIVIDAD.map((u) => ({ valor: u.id, etiqueta: u.etiqueta }));

function itemNuevo(): ItemDelPresupuesto {
  return {
    id: uuidv7(),
    renglon: null,
    item: '',
    icociv: '',
    especificaciones: '',
    descripcion: '',
    unidad: null,
    unidadEscrita: '',
    cantidad: null,
    valorUnitario: null,
    valorTotal: 0,
  };
}

export function EditorDePresupuesto({
  presupuesto,
  alGuardar,
  alCancelar,
}: {
  presupuesto: PresupuestoDetalle;
  alGuardar: () => void;
  alCancelar: () => void;
}) {
  const [estructura, setEstructura] = useState<EstructuraDePresupuesto>(presupuesto.estructura);
  const [nombre, setNombre] = useState(presupuesto.nombre);
  const [nota, setNota] = useState(presupuesto.notaVersion);
  const [abiertos, setAbiertos] = useState<Set<string>>(new Set());
  const [cambiado, setCambiado] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<{ texto: string; choque: boolean } | null>(null);

  const normal = normalizarEstructura(estructura);
  const resumen = resumenDelPresupuesto(normal);
  const faltas = faltasParaGuardarPresupuesto(normal);

  /** Todo cambio pasa por aquí: marca que hay algo sin guardar. */
  const editar = (cambio: (e: EstructuraDePresupuesto) => EstructuraDePresupuesto) => {
    setEstructura((e) => cambio(e));
    setCambiado(true);
  };
  const editarGrupo = (gId: string, cambio: (g: GrupoDelPresupuesto) => GrupoDelPresupuesto) =>
    editar((e) => ({ ...e, grupos: e.grupos.map((g) => (g.id === gId ? cambio(g) : g)) }));
  const editarCapitulo = (cId: string, cambio: (c: CapituloDelPresupuesto) => CapituloDelPresupuesto) =>
    editar((e) => ({
      ...e,
      grupos: e.grupos.map((g) => ({ ...g, capitulos: g.capitulos.map((c) => (c.id === cId ? cambio(c) : c)) })),
    }));
  const editarItem = (cId: string, iId: string, cambio: Partial<ItemDelPresupuesto>) =>
    editarCapitulo(cId, (c) => ({ ...c, items: c.items.map((i) => (i.id === iId ? { ...i, ...cambio } : i)) }));
  const editarRubro = (rId: string, cambio: Partial<RubroDelPresupuesto>) =>
    editar((e) => ({ ...e, rubros: e.rubros.map((r) => (r.id === rId ? { ...r, ...cambio } : r)) }));

  /** Mueve un capítulo a otra vía, al final (RF-47). Conserva su id: lo reportado lo sigue. */
  const moverCapitulo = (cId: string, aGrupo: string) =>
    editar((e) => {
      const capitulo = e.grupos.flatMap((g) => g.capitulos).find((c) => c.id === cId)!;
      return {
        ...e,
        grupos: e.grupos.map((g) => ({
          ...g,
          capitulos: [...g.capitulos.filter((c) => c.id !== cId), ...(g.id === aGrupo ? [capitulo] : [])],
        })),
      };
    });
  /** Mueve un ítem a otro capítulo, al final. Ojo: en el capítulo nuevo es otro ítem (RF-53). */
  const moverItem = (iId: string, aCapitulo: string) =>
    editar((e) => {
      const item = e.grupos.flatMap((g) => g.capitulos.flatMap((c) => c.items)).find((i) => i.id === iId)!;
      return {
        ...e,
        grupos: e.grupos.map((g) => ({
          ...g,
          capitulos: g.capitulos.map((c) => ({
            ...c,
            items: [...c.items.filter((i) => i.id !== iId), ...(c.id === aCapitulo ? [item] : [])],
          })),
        })),
      };
    });

  const opcionesDeGrupo = estructura.grupos.map((g) => ({ valor: g.id, etiqueta: g.nombre || 'Sin vía' }));
  const opcionesDeCapitulo = estructura.grupos.flatMap((g) =>
    g.capitulos.map((c) => ({ valor: c.id, etiqueta: `${c.codigo} · ${c.nombre}`, detalle: g.nombre || undefined })),
  );

  async function guardar() {
    setGuardando(true);
    setError(null);
    try {
      await api.presupuestos.guardar(presupuesto.id, {
        version: presupuesto.version,
        nombre: nombre.trim() || presupuesto.nombre,
        notaVersion: nota,
        estructura: normal,
      });
      alGuardar();
    } catch (fallo) {
      setError({ texto: mensajeDe(fallo), choque: fallo instanceof ErrorApi && fallo.estado === 409 });
    } finally {
      setGuardando(false);
    }
  }

  return (
    <View style={estilos.columna}>
      <Cifras>
        <Cifra titulo="Valor del presupuesto" valor={enPesos(resumen.valor)} pie="obras + rubros, sin guardar" />
        <Cifra titulo="Obras" valor={enPesos(resumen.obras)} pie={`${resumen.items} ítems`} />
        <Cifra titulo="Rubros" valor={enPesos(resumen.rubros)} pie={`${estructura.rubros.length} rubros`} />
      </Cifras>

      <Seccion titulo="Datos del presupuesto">
        <Formulario>
          <Campo
            etiqueta="Nombre"
            obligatorio
            valor={nombre}
            onChange={(v) => {
              setNombre(v);
              setCambiado(true);
            }}
            ancho={320}
          />
          <Campo
            etiqueta="Motivo de la versión"
            valor={nota}
            onChange={(v) => {
              setNota(v);
              setCambiado(true);
            }}
            ancho={320}
          />
          <CampoNumero
            etiqueta="Administración (%)"
            valor={Math.round(estructura.aiu.administracion * 10000) / 100}
            alCambiar={(n) => editar((e) => ({ ...e, aiu: { ...e.aiu, administracion: (n ?? 0) / 100 } }))}
            ancho={160}
          />
          <CampoNumero
            etiqueta="Imprevistos (%)"
            valor={Math.round(estructura.aiu.imprevistos * 10000) / 100}
            alCambiar={(n) => editar((e) => ({ ...e, aiu: { ...e.aiu, imprevistos: (n ?? 0) / 100 } }))}
            ancho={160}
          />
          <CampoNumero
            etiqueta="Utilidad (%)"
            valor={Math.round(estructura.aiu.utilidad * 10000) / 100}
            alCambiar={(n) => editar((e) => ({ ...e, aiu: { ...e.aiu, utilidad: (n ?? 0) / 100 } }))}
            ancho={160}
            ayuda="El AIU va incluido en los precios: solo se informa."
          />
        </Formulario>
      </Seccion>

      {estructura.grupos.map((g) => (
        <Seccion key={g.id} titulo={g.nombre ? `Vía: ${g.nombre}` : 'Capítulos'}>
          <Formulario>
            <Campo
              etiqueta="Nombre de la vía"
              valor={g.nombre}
              onChange={(v) => editarGrupo(g.id, (x) => ({ ...x, nombre: v }))}
              ancho={560}
            />
            <Acciones>
              <Boton
                titulo="Agregar capítulo"
                tono="secundario"
                onPress={() =>
                  editarGrupo(g.id, (x) => ({
                    ...x,
                    capitulos: [
                      ...x.capitulos,
                      {
                        id: uuidv7(),
                        codigo: String(x.capitulos.length + 1).padStart(2, '0'),
                        nombre: 'Capítulo nuevo',
                        items: [],
                      },
                    ],
                  }))
                }
              />
              {g.capitulos.length === 0 ? (
                <Boton
                  titulo="Quitar la vía"
                  tono="peligro"
                  onPress={() => editar((e) => ({ ...e, grupos: e.grupos.filter((x) => x.id !== g.id) }))}
                />
              ) : null}
            </Acciones>
          </Formulario>

          {g.capitulos.map((c) => {
            const abierto = abiertos.has(c.id);
            const subtotal =
              resumen.grupos.find((x) => x.id === g.id)?.capitulos.find((x) => x.id === c.id)?.subtotal ?? 0;
            return (
              <View key={c.id} style={estilos.capitulo}>
                <View style={estilos.fila}>
                  <Campo
                    etiqueta="Código"
                    valor={c.codigo}
                    onChange={(v) => editarCapitulo(c.id, (x) => ({ ...x, codigo: v }))}
                    ancho={90}
                  />
                  <Campo
                    etiqueta="Capítulo"
                    valor={c.nombre}
                    onChange={(v) => editarCapitulo(c.id, (x) => ({ ...x, nombre: v }))}
                    ancho={360}
                  />
                  {estructura.grupos.length > 1 ? (
                    <Selector
                      etiqueta="Mover a la vía"
                      valor={g.id}
                      opciones={opcionesDeGrupo}
                      onChange={(v) => v && v !== g.id && moverCapitulo(c.id, v)}
                      ancho={240}
                    />
                  ) : null}
                  <Text style={estilos.nota}>{`${c.items.length} ítems · ${enPesos(subtotal)}`}</Text>
                  <Boton
                    titulo={abierto ? 'Ocultar ítems' : 'Editar ítems'}
                    tono="secundario"
                    onPress={() =>
                      setAbiertos((a) => {
                        const b = new Set(a);
                        if (b.has(c.id)) b.delete(c.id);
                        else b.add(c.id);
                        return b;
                      })
                    }
                  />
                  {c.items.length === 0 ? (
                    <Boton
                      titulo="Quitar capítulo"
                      tono="peligro"
                      onPress={() =>
                        editarGrupo(g.id, (x) => ({ ...x, capitulos: x.capitulos.filter((y) => y.id !== c.id) }))
                      }
                    />
                  ) : null}
                </View>

                {abierto ? (
                  <View style={estilos.items}>
                    {c.items.map((i) => (
                      <View key={i.id} style={estilos.item}>
                        <Campo
                          etiqueta="Ítem"
                          valor={i.item}
                          onChange={(v) => editarItem(c.id, i.id, { item: v })}
                          ancho={90}
                        />
                        <Campo
                          etiqueta="Descripción"
                          valor={i.descripcion}
                          onChange={(v) => editarItem(c.id, i.id, { descripcion: v })}
                          ancho={320}
                        />
                        <Selector
                          etiqueta="Und."
                          valor={i.unidad}
                          opciones={OPCIONES_DE_UNIDAD}
                          onChange={(v) => editarItem(c.id, i.id, { unidad: (v as UnidadDeActividad | null) ?? null })}
                          vacio={i.unidadEscrita || 'Elija'}
                          ancho={110}
                        />
                        <CampoNumero
                          etiqueta="Cantidad"
                          valor={i.cantidad}
                          alCambiar={(n) => editarItem(c.id, i.id, { cantidad: n })}
                          ancho={130}
                        />
                        <CampoNumero
                          etiqueta="Valor unitario"
                          valor={i.valorUnitario}
                          alCambiar={(n) => editarItem(c.id, i.id, { valorUnitario: n })}
                          ancho={150}
                        />
                        <Campo
                          etiqueta="Total"
                          valor={enPesos(totalDelItem(i.cantidad, i.valorUnitario))}
                          onChange={() => {}}
                          ancho={170}
                          soloLectura
                        />
                        <Selector
                          etiqueta="Mover a"
                          valor={c.id}
                          opciones={opcionesDeCapitulo}
                          onChange={(v) => v && v !== c.id && moverItem(i.id, v)}
                          ancho={220}
                        />
                        <Boton
                          titulo="Quitar"
                          tono="peligro"
                          onPress={() =>
                            editarCapitulo(c.id, (x) => ({ ...x, items: x.items.filter((y) => y.id !== i.id) }))
                          }
                        />
                      </View>
                    ))}
                    <Acciones>
                      <Boton
                        titulo="Agregar ítem"
                        tono="secundario"
                        onPress={() => editarCapitulo(c.id, (x) => ({ ...x, items: [...x.items, itemNuevo()] }))}
                      />
                    </Acciones>
                  </View>
                ) : null}
              </View>
            );
          })}
        </Seccion>
      ))}

      <Acciones>
        <Boton
          titulo="Agregar vía"
          tono="secundario"
          onPress={() =>
            editar((e) => ({ ...e, grupos: [...e.grupos, { id: uuidv7(), nombre: 'Vía nueva', capitulos: [] }] }))
          }
        />
      </Acciones>

      <Seccion titulo="Rubros">
        {estructura.rubros.map((r) => (
          <View key={r.id} style={estilos.item}>
            <Campo etiqueta="Rubro" valor={r.nombre} onChange={(v) => editarRubro(r.id, { nombre: v })} ancho={360} />
            <Selector
              etiqueta="Vía"
              valor={r.grupoId}
              opciones={opcionesDeGrupo}
              onChange={(v) => editarRubro(r.id, { grupoId: v })}
              vacio="Todo el contrato"
              permiteVacio
              ancho={220}
            />
            <Campo etiqueta="Und." valor={r.unidad} onChange={(v) => editarRubro(r.id, { unidad: v })} ancho={110} />
            <CampoNumero
              etiqueta="Cantidad"
              valor={r.cantidad}
              alCambiar={(n) => editarRubro(r.id, { cantidad: n })}
              ancho={110}
            />
            <CampoNumero
              etiqueta="Valor unitario"
              valor={r.valorUnitario}
              alCambiar={(n) => editarRubro(r.id, { valorUnitario: n })}
              ancho={150}
            />
            <CampoNumero
              etiqueta="Valor"
              valor={r.valor}
              alCambiar={(n) => editarRubro(r.id, { valor: n ?? 0 })}
              ancho={170}
              ayuda={
                r.cantidad !== null && r.valorUnitario !== null ? 'Con cantidad y unitario, se calcula.' : undefined
              }
            />
            <Boton
              titulo="Quitar"
              tono="peligro"
              onPress={() => editar((e) => ({ ...e, rubros: e.rubros.filter((x) => x.id !== r.id) }))}
            />
          </View>
        ))}
        <Acciones>
          <Boton
            titulo="Agregar rubro"
            tono="secundario"
            onPress={() =>
              editar((e) => ({
                ...e,
                rubros: [
                  ...e.rubros,
                  {
                    id: uuidv7(),
                    grupoId: null,
                    nombre: 'Rubro nuevo',
                    unidad: 'estimado',
                    cantidad: null,
                    valorUnitario: null,
                    valor: 0,
                  },
                ],
              }))
            }
          />
        </Acciones>
      </Seccion>

      {faltas.length > 0 ? <Aviso tono="error">{`Corrija antes de guardar:\n· ${faltas.join('\n· ')}`}</Aviso> : null}
      {error ? (
        <Aviso tono="error">{error.choque ? `${error.texto} Lo que escribió aquí no se guardó.` : error.texto}</Aviso>
      ) : null}
      <AccionesFormulario>
        <Boton
          titulo={guardando ? 'Guardando…' : 'Guardar el borrador'}
          onPress={guardar}
          deshabilitado={guardando || !cambiado || faltas.length > 0}
        />
        <Boton titulo={error?.choque ? 'Volver a cargar' : 'Cancelar'} tono="secundario" onPress={alCancelar} />
        {cambiado ? <Text style={estilos.nota}>Hay cambios sin guardar.</Text> : null}
      </AccionesFormulario>
    </View>
  );
}

const estilos = StyleSheet.create({
  columna: { gap: 16 },
  fila: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'flex-end', gap: 12 },
  capitulo: { gap: 8, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: Panel.borde },
  items: { gap: 8, paddingLeft: 12 },
  item: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'flex-end',
    gap: 10,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: Panel.borde,
  },
  nota: { fontFamily: FuentePanel.texto, fontSize: TextoPanel.cuerpo, color: Panel.textoApoyo, paddingBottom: 10 },
});
