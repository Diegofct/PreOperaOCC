/**
 * Lo demás que lleva un plan además de sus actividades (spec 044, RF-7 a RF-16, RF-102): personal,
 * maquinaria, materiales, control de volquetas, supuestos, riesgos y requerimientos a gerencia.
 *
 * Son renglones que se proponen y se ajustan: el sistema no calcula ninguno (RF-16), ni miden nada
 * en el cumplimiento. Por eso van como campos en la misma página y no en una ventana, a diferencia
 * de las actividades: no hay cuentas que mostrar ni sumas que cuadrar.
 *
 * La maquinaria propia se escoge entre los vehículos de la obra, y además admite una referencia; la
 * externa se describe con texto (RF-9, RF-10).
 *
 * El personal se guarda por cargo, con su gente en cada frente de trabajo; aquí se escribe un
 * renglón por cargo y frente, que es como se piensa («3 oficiales en cunetas»). Esos renglones viven
 * en este componente mientras se editan y de ellos sale lo que se guarda: reconstruirlos de lo
 * guardado en cada tecla borraría un renglón a medio escribir, que todavía no tiene cantidad.
 *
 * Al Residente los textos con valores en pesos le llegan reemplazados (RF-102). Un campo así se ve
 * pero no se escribe: él no sabe qué dice, y el servidor conserva el texto que había.
 */
import { useState, type ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { FuentePanel, Panel, TextoPanel } from '@/constants/theme';
import { Boton, Campo, Selector } from '@/features/panel/componentes';
import type { PlanSemanalDetalle } from '@/features/panel/plan-semanal';
import { TEXTO_CON_PESOS, type EstructuraDelPlan } from '@/shared/rules/plan-semanal';

/** «1.500,5» o «1500.5» → 1500.5; vacío o algo que no es un número → null. */
function numeroDe(texto: string): number | null {
  const limpio = texto.trim().replace(/\s/g, '');
  if (!limpio) return null;
  const normal = limpio.includes(',') ? limpio.replace(/\./g, '').replace(',', '.') : limpio;
  const n = Number(normal);
  return Number.isFinite(n) && n >= 0 ? n : null;
}
const aTexto = (n: number | null) => (n === null ? '' : String(n).replace('.', ','));

/** Una cantidad que se escribe como texto: «12,» a medio teclear todavía no es un número. */
function CampoDeCantidad({
  etiqueta,
  valor,
  onChange,
  soloLectura,
  ancho = 120,
}: {
  etiqueta: string;
  valor: number | null;
  onChange: (n: number | null) => void;
  soloLectura: boolean;
  ancho?: number;
}) {
  const [texto, setTexto] = useState(() => aTexto(valor));
  return (
    <Campo
      etiqueta={etiqueta}
      valor={texto}
      onChange={(v) => {
        setTexto(v);
        onChange(numeroDe(v));
      }}
      soloLectura={soloLectura}
      ancho={ancho}
    />
  );
}

interface Contexto {
  editable: boolean;
  /** Si quien mira ve la plata: sin ella, un texto reemplazado no se puede escribir. */
  conPlata: boolean;
}

/** Un campo de texto del plan; el que llegó reemplazado al Residente queda de solo lectura. */
function CampoDeTexto({
  etiqueta,
  valor,
  onChange,
  ancho,
  multilinea,
  contexto,
}: {
  etiqueta: string;
  valor: string;
  onChange: (v: string) => void;
  ancho?: number;
  multilinea?: boolean;
  contexto: Contexto;
}) {
  const oculto = !contexto.conPlata && valor === TEXTO_CON_PESOS;
  return (
    <Campo etiqueta={etiqueta} valor={valor} onChange={onChange} ancho={ancho} multilinea={multilinea} compacto={multilinea} soloLectura={!contexto.editable || oculto} envolver />
  );
}

/** Una sección de renglones: su título, cada renglón con su «Quitar» y, al final, «Agregar». */
function Renglones<T>({
  titulo,
  filas,
  pintar,
  alQuitar,
  alAgregar,
  editable,
  pie,
}: {
  titulo: string;
  filas: readonly T[];
  pintar: (fila: T, n: number) => ReactNode;
  alQuitar: (n: number) => void;
  alAgregar: () => void;
  editable: boolean;
  pie?: ReactNode;
}) {
  return (
    <View style={estilos.seccion}>
      <Text style={estilos.subtitulo}>{titulo}</Text>
      {filas.length === 0 ? <Text style={estilos.pie}>Sin renglones.</Text> : null}
      {filas.map((fila, n) => (
        // Al quitar un renglón los de abajo cambian de sitio: la llave lleva el total para que sus
        // campos se vuelvan a armar con lo que ahora les toca.
        <View key={`${n}:${filas.length}`} style={estilos.fila}>
          {pintar(fila, n)}
          {editable ? (
            <View style={estilos.quitar}>
              <Boton titulo="Quitar" tono="secundario" onPress={() => alQuitar(n)} />
            </View>
          ) : null}
        </View>
      ))}
      {pie}
      {editable ? (
        <View style={estilos.agregar}>
          <Boton titulo="Agregar renglón" tono="secundario" onPress={alAgregar} />
        </View>
      ) : null}
    </View>
  );
}

interface RenglonDePersonal {
  cargo: string;
  frente: string;
  cantidad: number | null;
}

/** RF-7: un renglón por cargo y frente; un cargo sin frentes, un renglón con el frente vacío. */
function renglonesDePersonal(personal: EstructuraDelPlan['personal']): RenglonDePersonal[] {
  return personal.flatMap((p): RenglonDePersonal[] => {
    const frentes = Object.entries(p.porFrente);
    return frentes.length > 0 ? frentes.map(([frente, cantidad]) => ({ cargo: p.cargo, frente, cantidad })) : [{ cargo: p.cargo, frente: '', cantidad: null }];
  });
}

/** RF-7: de vuelta a como se guarda: cada cargo con su gente por frente, en el orden en que aparecen. */
function personalDe(renglones: readonly RenglonDePersonal[]): EstructuraDelPlan['personal'] {
  const porCargo = new Map<string, Record<string, number>>();
  for (const r of renglones) {
    const cargo = r.cargo.trim();
    if (!cargo) continue;
    const frentes = porCargo.get(cargo) ?? {};
    porCargo.set(cargo, frentes);
    const frente = r.frente.trim();
    if (frente && r.cantidad !== null) frentes[frente] = (frentes[frente] ?? 0) + r.cantidad;
  }
  return [...porCargo].map(([cargo, porFrente]) => ({ cargo, porFrente }));
}

export function SeccionesDelPlan({
  estructura,
  cambiar,
  editable,
  conPlata,
  vehiculos,
}: {
  estructura: EstructuraDelPlan;
  /** Recibe la estructura con el cambio aplicado. */
  cambiar: (nueva: EstructuraDelPlan) => void;
  editable: boolean;
  conPlata: boolean;
  vehiculos: PlanSemanalDetalle['vehiculos'];
}) {
  const contexto: Contexto = { editable, conPlata };
  const soloLectura = !editable;
  const { maquinaria, materiales, volquetas, riesgos } = estructura;
  const [personal, setPersonal] = useState(() => renglonesDePersonal(estructura.personal));

  function cambiarPersonal(renglones: RenglonDePersonal[]) {
    setPersonal(renglones);
    cambiar({ ...estructura, personal: personalDe(renglones) });
  }
  const en = <T,>(lista: readonly T[], n: number, cambio: Partial<T>): T[] => lista.map((x, i) => (i === n ? { ...x, ...cambio } : x));
  const sin = <T,>(lista: readonly T[], n: number): T[] => lista.filter((_, i) => i !== n);

  const nombreDelVehiculo = (id: string | null) => {
    const v = vehiculos.find((x) => x.id === id);
    return v ? `${v.codigo} · ${v.tipo}` : id ? 'Un vehículo que ya no está en la obra' : '—';
  };

  return (
    <View style={estilos.columna}>
      <Renglones
        titulo="Personal"
        filas={personal}
        editable={editable}
        alQuitar={(n) => cambiarPersonal(sin(personal, n))}
        alAgregar={() => cambiarPersonal([...personal, { cargo: '', frente: '', cantidad: null }])}
        pintar={(r, n) => (
          <>
            <CampoDeTexto etiqueta="Cargo" valor={r.cargo} onChange={(cargo) => cambiarPersonal(en(personal, n, { cargo }))} ancho={280} contexto={contexto} />
            <CampoDeTexto etiqueta="Frente de trabajo" valor={r.frente} onChange={(frente) => cambiarPersonal(en(personal, n, { frente }))} ancho={280} contexto={contexto} />
            <CampoDeCantidad etiqueta="Cantidad" valor={r.cantidad} onChange={(cantidad) => cambiarPersonal(en(personal, n, { cantidad }))} soloLectura={soloLectura} />
          </>
        )}
      />

      <Renglones
        // Con la máquina propia van seis campos y «Quitar» en un renglón: 200 + 80 + 130 + 180 + 230 + 210
        // = 1 030, más seis separaciones de 12 y el botón, caben en el ancho del panel sin partirse.
        titulo="Maquinaria y equipo"
        filas={maquinaria}
        editable={editable}
        alQuitar={(n) => cambiar({ ...estructura, maquinaria: sin(maquinaria, n) })}
        alAgregar={() => cambiar({ ...estructura, maquinaria: [...maquinaria, { equipo: '', cantidad: 1, propia: true, frenteDeTrabajo: '', vehiculoId: null, referencia: '' }] })}
        pie={editable && vehiculos.length === 0 ? <Text style={estilos.pie}>La obra no tiene vehículos registrados: la maquinaria propia se describe con su referencia.</Text> : null}
        pintar={(m, n) => {
          const poner = (cambio: Partial<(typeof maquinaria)[number]>) => cambiar({ ...estructura, maquinaria: en(maquinaria, n, cambio) });
          return (
            <>
              <CampoDeTexto etiqueta="Equipo" valor={m.equipo} onChange={(equipo) => poner({ equipo })} ancho={200} contexto={contexto} />
              <CampoDeCantidad etiqueta="Cant." valor={m.cantidad} onChange={(cantidad) => poner({ cantidad: cantidad ?? 0 })} soloLectura={soloLectura} ancho={80} />
              {editable ? (
                <Selector
                  etiqueta="Propiedad"
                  valor={m.propia ? 'propia' : 'externa'}
                  opciones={[
                    { valor: 'propia', etiqueta: 'Propia' },
                    { valor: 'externa', etiqueta: 'Externa' },
                  ]}
                  // RF-10: la externa no es un vehículo de la obra.
                  onChange={(v) => poner(v === 'externa' ? { propia: false, vehiculoId: null } : { propia: true })}
                  ancho={130}
                />
              ) : (
                <Campo etiqueta="Propiedad" valor={m.propia ? 'Propia' : 'Externa'} onChange={() => undefined} soloLectura ancho={130} />
              )}
              <CampoDeTexto etiqueta="Frente de trabajo" valor={m.frenteDeTrabajo} onChange={(frenteDeTrabajo) => poner({ frenteDeTrabajo })} ancho={180} contexto={contexto} />
              {m.propia && editable && vehiculos.length > 0 ? (
                <Selector
                  etiqueta="Vehículo de la obra"
                  valor={m.vehiculoId}
                  opciones={vehiculos.map((v) => ({ valor: v.id, etiqueta: `${v.codigo} · ${v.tipo}` }))}
                  onChange={(vehiculoId) => poner({ vehiculoId })}
                  vacio="Sin escoger"
                  permiteVacio
                  ancho={230}
                />
              ) : null}
              {m.propia && !editable ? <Campo etiqueta="Vehículo de la obra" valor={nombreDelVehiculo(m.vehiculoId)} onChange={() => undefined} soloLectura ancho={230} /> : null}
              <CampoDeTexto etiqueta={m.propia ? 'Referencia' : 'Descripción'} valor={m.referencia} onChange={(referencia) => poner({ referencia })} ancho={210} contexto={contexto} />
            </>
          );
        }}
      />

      <Renglones
        titulo="Materiales e insumos"
        filas={materiales}
        editable={editable}
        alQuitar={(n) => cambiar({ ...estructura, materiales: sin(materiales, n) })}
        alAgregar={() => cambiar({ ...estructura, materiales: [...materiales, { material: '', cantidadSemana: null, unidad: '', baseDeCalculo: '' }] })}
        pintar={(m, n) => {
          const poner = (cambio: Partial<(typeof materiales)[number]>) => cambiar({ ...estructura, materiales: en(materiales, n, cambio) });
          return (
            <>
              <CampoDeTexto etiqueta="Material" valor={m.material} onChange={(material) => poner({ material })} ancho={280} contexto={contexto} />
              <CampoDeCantidad etiqueta="Cantidad semana" valor={m.cantidadSemana} onChange={(cantidadSemana) => poner({ cantidadSemana })} soloLectura={soloLectura} ancho={140} />
              <CampoDeTexto etiqueta="Und." valor={m.unidad} onChange={(unidad) => poner({ unidad })} ancho={90} contexto={contexto} />
              <CampoDeTexto etiqueta="Base de cálculo" valor={m.baseDeCalculo} onChange={(baseDeCalculo) => poner({ baseDeCalculo })} ancho={320} contexto={contexto} />
            </>
          );
        }}
      />

      <Renglones
        titulo="Control de volquetas"
        filas={volquetas.conceptos}
        editable={editable}
        alQuitar={(n) => cambiar({ ...estructura, volquetas: { ...volquetas, conceptos: sin(volquetas.conceptos, n) } })}
        alAgregar={() =>
          cambiar({ ...estructura, volquetas: { ...volquetas, conceptos: [...volquetas.conceptos, { concepto: '', unidad: '', cantidadSemana: null, viajesSemana: null }] } })
        }
        pintar={(c, n) => {
          const poner = (cambio: Partial<(typeof volquetas.conceptos)[number]>) =>
            cambiar({ ...estructura, volquetas: { ...volquetas, conceptos: en(volquetas.conceptos, n, cambio) } });
          return (
            <>
              <CampoDeTexto etiqueta="Concepto" valor={c.concepto} onChange={(concepto) => poner({ concepto })} ancho={320} contexto={contexto} />
              <CampoDeTexto etiqueta="Und." valor={c.unidad} onChange={(unidad) => poner({ unidad })} ancho={90} contexto={contexto} />
              <CampoDeCantidad etiqueta="Cantidad semana" valor={c.cantidadSemana} onChange={(cantidadSemana) => poner({ cantidadSemana })} soloLectura={soloLectura} ancho={140} />
              <CampoDeCantidad etiqueta="Viajes semana" valor={c.viajesSemana} onChange={(viajesSemana) => poner({ viajesSemana })} soloLectura={soloLectura} ancho={140} />
            </>
          );
        }}
        pie={
          <View style={estilos.fila}>
            <CampoDeCantidad etiqueta="Volquetas requeridas" valor={volquetas.requeridas} onChange={(requeridas) => cambiar({ ...estructura, volquetas: { ...volquetas, requeridas } })} soloLectura={soloLectura} ancho={170} />
            <CampoDeCantidad etiqueta="Volquetas propias" valor={volquetas.propias} onChange={(propias) => cambiar({ ...estructura, volquetas: { ...volquetas, propias } })} soloLectura={soloLectura} ancho={170} />
            <CampoDeCantidad etiqueta="Volquetas externas" valor={volquetas.externas} onChange={(externas) => cambiar({ ...estructura, volquetas: { ...volquetas, externas } })} soloLectura={soloLectura} ancho={170} />
          </View>
        }
      />

      <View style={estilos.seccion}>
        <Text style={estilos.subtitulo}>Supuestos</Text>
        <CampoDeTexto etiqueta="Un supuesto por renglón" valor={estructura.supuestos} onChange={(supuestos) => cambiar({ ...estructura, supuestos })} multilinea contexto={contexto} />
      </View>

      <Renglones
        titulo="Riesgos"
        filas={riesgos}
        editable={editable}
        alQuitar={(n) => cambiar({ ...estructura, riesgos: sin(riesgos, n) })}
        alAgregar={() => cambiar({ ...estructura, riesgos: [...riesgos, { riesgo: '', efecto: '', mitigacion: '' }] })}
        pintar={(r, n) => {
          const poner = (cambio: Partial<(typeof riesgos)[number]>) => cambiar({ ...estructura, riesgos: en(riesgos, n, cambio) });
          return (
            <>
              <CampoDeTexto etiqueta="Riesgo" valor={r.riesgo} onChange={(riesgo) => poner({ riesgo })} ancho={280} contexto={contexto} />
              <CampoDeTexto etiqueta="Efecto en la meta" valor={r.efecto} onChange={(efecto) => poner({ efecto })} ancho={340} contexto={contexto} />
              <CampoDeTexto etiqueta="Mitigación" valor={r.mitigacion} onChange={(mitigacion) => poner({ mitigacion })} ancho={340} contexto={contexto} />
            </>
          );
        }}
      />

      <View style={estilos.seccion}>
        <Text style={estilos.subtitulo}>Requerimientos a gerencia</Text>
        <CampoDeTexto
          etiqueta="Un requerimiento por renglón"
          valor={estructura.requerimientos}
          onChange={(requerimientos) => cambiar({ ...estructura, requerimientos })}
          multilinea
          contexto={contexto}
        />
      </View>
    </View>
  );
}

const estilos = StyleSheet.create({
  columna: { gap: 20 },
  seccion: { gap: 8 },
  fila: { flexDirection: 'row', gap: 12, flexWrap: 'wrap', alignItems: 'flex-start' },
  // El botón baja lo que mide la etiqueta de un campo, para quedar a la altura de las cajas.
  quitar: { paddingTop: 22 },
  agregar: { flexDirection: 'row' },
  subtitulo: { fontFamily: FuentePanel.texto, fontWeight: '600', fontSize: TextoPanel.cuerpo, color: Panel.texto },
  pie: { fontFamily: FuentePanel.texto, fontSize: TextoPanel.apoyo, color: Panel.textoApoyo },
});
