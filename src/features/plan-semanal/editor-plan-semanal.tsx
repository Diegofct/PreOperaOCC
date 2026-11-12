/**
 * El plan de una semana, para ajustarlo o para mirarlo (spec 044, RF-6, RF-17 a RF-25, RF-31, RF-32,
 * RF-64, RF-79, RF-86, RF-87, RF-91, RF-93, RF-97, RF-99).
 *
 * Un borrador de una semana que todavía se puede planear se ajusta aquí; cualquier otro plan
 * —aprobado, anulado, descartado, o un borrador cuya semana ya terminó— se ve igual, sin nada que
 * tocar (RF-64, RF-79, RF-99).
 *
 * Arriba van los días de trabajo, que valen para todas las actividades (RF-18): al marcar o
 * desmarcar uno, la meta de cada actividad se reparte de nuevo entre los que quedan, porque una
 * cantidad en un día que no se trabaja no cuadra. Un festivo sale desmarcado y se puede marcar
 * (RF-19, RF-20). Debajo, las actividades con su reparto; cada una se ajusta en su ventana
 * (`ventana-actividad.tsx`).
 *
 * Nada se manda hasta «Guardar». Una actividad cuya suma no cuadra con su meta se señala en la
 * tabla y el plan no se guarda mientras esté así (RF-23); el servidor lo vuelve a comprobar. Se
 * guarda con la versión que se abrió: si otra persona guardó entretanto, se avisa sin pisar y se ofrece
 * volver a cargarlo (RF-86). Cualquier 409 al guardar quiere decir lo mismo —lo que hay en pantalla ya
 * no es lo último: otra versión, o el plan dejó de ser borrador—, así que todos ofrecen recargar.
 *
 * Debajo de las actividades van las demás secciones del plan (`secciones-del-plan.tsx`) y, al final,
 * «Guardar», que guarda el plan entero. Arriba, aprobar, anular y descargar (`acciones-plan-semanal.tsx`),
 * que valen para cualquier plan y no solo para el que se ajusta.
 *
 * ── La plata y los avisos ──
 *
 * Los valores y los avisos los calcula el servidor cada vez que entrega el plan (RF-94): aquí solo
 * se muestran. A quien ve la plata le sale el valor de cada actividad junto a su total y el valor de
 * la semana; al Residente, nada de eso, porque su plan llegó sin esas cifras (RF-29, RF-30). Los
 * avisos salen para los dos, sin el de costo para el Residente.
 *
 * Como son los del plan guardado, mientras hay cambios sin guardar el valor de cada actividad se
 * esconde —podría quedar junto a una actividad que ya es otra— y se dice que se actualizan al guardar.
 */
import { useCallback, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { FuentePanel, Panel, TextoPanel } from '@/constants/theme';
import { api, ErrorApi, mensajeDe } from '@/features/panel/cliente-api';
import { Acciones, Aviso, Boton, Casilla, Celda, Etiqueta, Seccion, Tabla, type Columna } from '@/features/panel/componentes';
import { useListado } from '@/features/panel/marco';
import { vistaConPlata, type PlanSemanalDetalle } from '@/features/panel/plan-semanal';
import { enPesos } from '@/shared/rules/pesos';
import { esFestivo } from '@/shared/rules/festivos';
import {
  descuadreDeLaActividad,
  diasDeLaSemana,
  metaDiaria,
  repartir,
  totalProgramado,
  type ActividadDelPlan,
  type EstructuraDelPlan,
} from '@/shared/rules/plan-semanal';

import { AccionesPlanSemanal } from './acciones-plan-semanal';
import { enCantidad, estadoEnPantalla, NOMBRE_DE_ORIGEN, nombreDelDia, semanaEnTexto, semanaPasada } from './estados';
import { SeccionesDelPlan } from './secciones-del-plan';
import { ACTIVIDAD_NUEVA, VentanaDeActividad } from './ventana-actividad';

interface FilaDeActividad {
  id: string;
  n: number;
  a: ActividadDelPlan;
  descuadre: string | null;
}

/**
 * La estructura con que se trabaja. Al Residente le llega sin el valor de los rubros: se completa
 * con vacío para poder mandarla, y el servidor conserva el que cada rubro tenía.
 */
function estructuraDeTrabajo(p: PlanSemanalDetalle): EstructuraDelPlan {
  const { estructura } = p.vista;
  return { ...estructura, actividades: estructura.actividades.map((a) => ({ ...a, valorRubro: 'valorRubro' in a ? a.valorRubro : null })) };
}

function cuando(iso: string): string {
  return new Date(iso).toLocaleString('es-CO', { timeZone: 'America/Bogota', dateStyle: 'medium', timeStyle: 'short' });
}

function PlanAbierto({
  p,
  editable,
  semanaTerminada,
  alEditar,
  alGuardar,
  alRecargar,
}: {
  p: PlanSemanalDetalle;
  editable: boolean;
  /** RF-99: la semana del plan ya pasó. */
  semanaTerminada: boolean;
  /** Algo cambió en pantalla y todavía no se ha guardado. */
  alEditar: () => void;
  alGuardar: () => void;
  /** Vuelve a pedir el plan al servidor; lo que había sin guardar se pierde. */
  alRecargar: () => void;
}) {
  const [estructura, setEstructura] = useState(() => estructuraDeTrabajo(p));
  const [sucio, setSucio] = useState(false);
  const [abierta, setAbierta] = useState<number | 'nueva' | null>(null);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<{ texto: string; choque: boolean } | null>(null);
  const conPlata = vistaConPlata(p.vista);
  // RF-26 a RF-28: los valores son del plan guardado. Con cambios sin guardar no se pintan por
  // actividad, porque el orden de las actividades puede ya no ser el mismo.
  const valores = vistaConPlata(p.vista) ? p.vista.valores : null;
  const { dias, actividades } = estructura;

  function cambiar(nueva: EstructuraDelPlan) {
    setEstructura(nueva);
    setSucio(true);
    setError(null);
    alEditar();
  }

  /** RF-17, RF-18, RF-21: los días valen para todo el plan, y cada meta se reparte de nuevo. */
  function marcarDia(dia: string, marcado: boolean) {
    const nuevos = diasDeLaSemana(p.semana).filter((d) => (d === dia ? marcado : dias.includes(d)));
    cambiar({
      ...estructura,
      dias: nuevos,
      actividades: actividades.map((a) => (a.metaSemana === null ? a : { ...a, cantidades: repartir(a.metaSemana, nuevos) })),
    });
  }

  function aceptarActividad(a: ActividadDelPlan) {
    cambiar({ ...estructura, actividades: abierta === 'nueva' ? [...actividades, a] : actividades.map((x, n) => (n === abierta ? a : x)) });
    setAbierta(null);
  }

  function quitarActividad() {
    cambiar({ ...estructura, actividades: actividades.filter((_, n) => n !== abierta) });
    setAbierta(null);
  }

  const filas: FilaDeActividad[] = actividades.map((a, n) => ({ id: String(n), n, a, descuadre: descuadreDeLaActividad(a, dias) }));
  const descuadradas = filas.filter((f) => f.descuadre !== null);

  async function guardar() {
    setGuardando(true);
    setError(null);
    try {
      await api.planesSemanales.guardar(p.id, { version: p.version, estructura });
      setSucio(false);
      alGuardar();
    } catch (fallo) {
      setError({ texto: mensajeDe(fallo), choque: fallo instanceof ErrorApi && fallo.estado === 409 });
    } finally {
      setGuardando(false);
    }
  }

  // Caben en `MaxContentWidthPanel` con seis días: 220 + 55 + 85 + 75 + 6 × 72 + 95 + 100 = 1 062, más 13 separaciones
  // de 16 (208): 1 270. Los días van a 72 para que «2.929,167» no se parta en dos renglones. El valor
  // de la actividad va en la columna del total, debajo, y no en una propia: no hay sitio para otra.
  const columnas: Columna<FilaDeActividad>[] = [
    {
      clave: 'actividad',
      titulo: 'Actividad',
      ancho: 220,
      pintar: ({ a }) => (
        <View style={estilos.actividad}>
          <Celda>{[a.item, a.descripcion].filter(Boolean).join(' · ') || '—'}</Celda>
          {a.frenteDeTrabajo ? <Text style={estilos.frente}>{a.frenteDeTrabajo}</Text> : null}
          <View style={estilos.marcas}>
            {a.tipo === 'fuera' ? <Etiqueta tono="atencion">Fuera de la planificación</Etiqueta> : null}
            {a.tipo === 'rubro' ? <Etiqueta tono="neutro">Rubro</Etiqueta> : null}
            {a.revisar ? <Etiqueta tono="malo">Revisar</Etiqueta> : null}
          </View>
        </View>
      ),
    },
    { clave: 'unidad', titulo: 'Und.', ancho: 55, pintar: ({ a }) => <Celda>{a.tipo === 'rubro' ? '—' : a.unidad}</Celda> },
    { clave: 'meta', titulo: 'Meta semana', ancho: 85, pintar: ({ a }) => <Celda>{enCantidad(a.metaSemana)}</Celda> },
    { clave: 'diaria', titulo: 'Meta diaria', ancho: 75, pintar: ({ a }) => <Celda>{enCantidad(metaDiaria(a.metaSemana, dias.length))}</Celda> },
    ...dias.map(
      (dia): Columna<FilaDeActividad> => ({
        clave: dia,
        titulo: nombreDelDia(dia),
        ancho: 72,
        pintar: ({ a }) => <Celda>{a.tipo === 'rubro' ? '—' : enCantidad(a.cantidades[dia] ?? 0)}</Celda>,
      }),
    ),
    {
      clave: 'total',
      titulo: valores ? 'Total y valor' : 'Total',
      ancho: 95,
      pintar: ({ a, n, descuadre }) => {
        const valor = valores && !sucio ? (valores.porActividad[n] ?? null) : null;
        return (
          <View style={estilos.actividad}>
            <Celda>{a.tipo === 'rubro' ? '—' : enCantidad(totalProgramado(a.cantidades))}</Celda>
            {valor !== null ? <Text style={estilos.valor}>{enPesos(valor)}</Text> : null}
            {valores && !sucio && valores.sinCosto.includes(n) ? <Etiqueta tono="atencion">Sin costo</Etiqueta> : null}
            {descuadre ? <Etiqueta tono="malo">No cuadra</Etiqueta> : null}
          </View>
        );
      },
    },
    ...(editable
      ? [
          {
            clave: 'acciones',
            titulo: '',
            ancho: 100,
            anchoMinimo: 100,
            pintar: ({ n }: FilaDeActividad) => <Boton titulo="Ajustar" tono="secundario" onPress={() => setAbierta(n)} />,
          } satisfies Columna<FilaDeActividad>,
        ]
      : []),
  ];

  return (
    <View style={estilos.columna}>
      <AccionesPlanSemanal p={p} semanaTerminada={semanaTerminada} sinGuardar={sucio} alCambiar={alRecargar} />

      <Text style={estilos.subtitulo}>Días de trabajo</Text>
      {editable ? (
        <>
          <View style={estilos.dias}>
            {diasDeLaSemana(p.semana).map((dia) => (
              <Casilla
                key={dia}
                etiqueta={`${nombreDelDia(dia)}${esFestivo(dia) ? ' · festivo' : ''}`}
                marcada={dias.includes(dia)}
                onChange={(marcado) => marcarDia(dia, marcado)}
              />
            ))}
          </View>
          <Text style={estilos.pie}>Valen para todas las actividades. Al cambiar un día, la meta de cada actividad se reparte de nuevo entre los marcados.</Text>
        </>
      ) : (
        <Text style={estilos.texto}>{dias.map((d) => `${nombreDelDia(d)}${esFestivo(d) ? ' (festivo)' : ''}`).join(' · ') || 'Ninguno'}</Text>
      )}

      <Text style={estilos.subtitulo}>Actividades</Text>
      <Tabla filas={filas} columnas={columnas} vacio="Este plan todavía no tiene actividades." />
      {descuadradas.map((f) => (
        <Aviso key={f.id} tono="error">{`${[f.a.item, f.a.descripcion].filter(Boolean).join(' · ')}: ${f.descuadre}`}</Aviso>
      ))}
      {editable ? (
        <Acciones>
          <Boton titulo="Agregar actividad" tono="secundario" onPress={() => setAbierta('nueva')} />
        </Acciones>
      ) : null}

      {valores ? (
        <Text style={estilos.texto}>
          {`Valor de la semana: ${enPesos(valores.total)}`}
          {valores.sinCosto.length > 0 ? ` · no incluye ${valores.sinCosto.length} ${valores.sinCosto.length === 1 ? 'actividad' : 'actividades'} sin precio de costo` : ''}
        </Text>
      ) : null}
      {p.vista.avisos.length > 0 ? (
        <View style={estilos.avisos}>
          <Text style={estilos.subtitulo}>{`Avisos del plan (${p.vista.avisos.length})`}</Text>
          {p.vista.avisos.map((aviso, n) => (
            <Text key={n} style={estilos.aviso}>{`• ${aviso.detalle}`}</Text>
          ))}
        </View>
      ) : null}
      {p.rechazados.length > 0 ? (
        <View style={estilos.avisos}>
          <Text style={estilos.subtitulo}>{`Cifras del Excel que no estaban en su fila (${p.rechazados.length})`}</Text>
          {p.rechazados.map((r, n) => (
            <Text key={n} style={estilos.aviso}>{`• ${r.que}: ${r.motivo}`}</Text>
          ))}
        </View>
      ) : null}
      {sucio && (valores || p.vista.avisos.length > 0) ? (
        <Text style={estilos.pie}>{`${valores ? 'Los valores y los avisos' : 'Los avisos'} son los del plan guardado: se actualizan al guardar.`}</Text>
      ) : null}

      <SeccionesDelPlan estructura={estructura} cambiar={cambiar} editable={editable} conPlata={conPlata} vehiculos={p.vehiculos} />

      {editable ? (
        <>
          <Acciones>
            <Boton
              titulo={guardando ? 'Guardando…' : 'Guardar'}
              tono="primario"
              onPress={() => void guardar()}
              deshabilitado={!sucio || guardando || descuadradas.length > 0}
            />
          </Acciones>
          {descuadradas.length > 0 ? <Text style={estilos.pie}>El plan no se guarda mientras una actividad no cuadre con su meta.</Text> : null}
          {sucio && descuadradas.length === 0 ? <Text style={estilos.pie}>Hay cambios sin guardar.</Text> : null}
          {error ? <Aviso tono="error">{error.texto}</Aviso> : null}
          {error?.choque ? (
            <Acciones>
              <Boton titulo="Volver a cargar el plan" tono="secundario" onPress={alRecargar} />
            </Acciones>
          ) : null}
        </>
      ) : null}

      {abierta !== null ? (
        <VentanaDeActividad
          key={String(abierta)}
          actividad={abierta === 'nueva' ? ACTIVIDAD_NUEVA : actividades[abierta]}
          esNueva={abierta === 'nueva'}
          dias={dias}
          items={p.items}
          conPlata={conPlata}
          alAceptar={aceptarActividad}
          alQuitar={quitarActividad}
          alCerrar={() => setAbierta(null)}
        />
      ) : null}
    </View>
  );
}

/**
 * El plan elegido en la lista. `enCurso` es el lunes de la semana en curso, del servidor; `puedeArmar`,
 * si el cargo de quien mira arma planes.
 */
export function EditorPlanSemanal({
  id,
  enCurso,
  puedeArmar,
  alCambiar,
}: {
  id: string;
  enCurso: string | undefined;
  puedeArmar: boolean;
  alCambiar: () => void;
}) {
  const detalle = useListado<PlanSemanalDetalle>(useCallback(() => api.planesSemanales.de(id).then((d) => [d]), [id]));
  // Va aquí y no dentro del plan abierto: al guardar, el plan se vuelve a abrir con la versión nueva
  // y un estado suyo se perdería justo cuando hay que decir que se guardó.
  const [guardado, setGuardado] = useState(false);
  const p = detalle.datos[0];
  if (detalle.error) return <Aviso tono="error">{detalle.error}</Aviso>;
  if (!p) return null;

  const estado = estadoEnPantalla(p, enCurso);
  const editable = puedeArmar && p.estado === 'borrador' && !semanaPasada(p.semana, enCurso);
  return (
    <Seccion titulo={`Plan · ${semanaEnTexto(p.semana)}`}>
      <View style={estilos.columna}>
        <View style={estilos.marcas}>
          <Etiqueta tono={estado.tono}>{estado.nombre}</Etiqueta>
          {editable ? null : <Etiqueta tono="neutro">Solo lectura</Etiqueta>}
        </View>
        <Text style={estilos.pie}>
          {[
            `Origen: ${NOMBRE_DE_ORIGEN[p.origen]}`,
            `Lo armó ${p.creadoPor.nombre}`,
            p.actualizadoPor ? `Último ajuste: ${p.actualizadoPor.nombre}, ${cuando(p.actualizadoEn)}` : null,
          ]
            .filter(Boolean)
            .join(' · ')}
        </Text>
        {p.estado === 'anulado' ? <Aviso tono="info">{`Anulado · Motivo: ${p.motivoAnulacion ?? '—'}`}</Aviso> : null}
        {p.estado === 'borrador' && semanaPasada(p.semana, enCurso) ? (
          <Aviso tono="info">La semana de este plan ya terminó: quedó sin aprobar y ya no se puede ajustar.</Aviso>
        ) : null}
        {editable ? <Aviso tono="info">{p.puedeAprobar ? 'Usted puede aprobar este plan.' : p.quienAprueba}</Aviso> : null}
        {/* Con cada guardado cambia la versión, y el plan se vuelve a abrir con lo que quedó en el servidor. Aprobar y anular también la suben. */}
        <PlanAbierto
          key={`${p.id}:${p.version}`}
          p={p}
          editable={editable}
          semanaTerminada={semanaPasada(p.semana, enCurso)}
          alEditar={() => setGuardado(false)}
          alGuardar={() => {
            setGuardado(true);
            detalle.recargar();
            alCambiar();
          }}
          alRecargar={() => {
            detalle.recargar();
            alCambiar();
          }}
        />
        {guardado ? <Aviso tono="exito">Plan guardado.</Aviso> : null}
      </View>
    </Seccion>
  );
}

const estilos = StyleSheet.create({
  columna: { gap: 12 },
  dias: { flexDirection: 'row', gap: 16, flexWrap: 'wrap' },
  marcas: { flexDirection: 'row', gap: 6, flexWrap: 'wrap' },
  actividad: { gap: 4 },
  frente: { fontFamily: FuentePanel.texto, fontSize: TextoPanel.apoyo, color: Panel.textoApoyo },
  subtitulo: { fontFamily: FuentePanel.texto, fontWeight: '600', fontSize: TextoPanel.cuerpo, color: Panel.texto },
  texto: { fontFamily: FuentePanel.texto, fontSize: TextoPanel.cuerpo, color: Panel.texto },
  pie: { fontFamily: FuentePanel.texto, fontSize: TextoPanel.apoyo, color: Panel.textoApoyo },
  valor: { fontFamily: FuentePanel.texto, fontSize: TextoPanel.apoyo, color: Panel.textoApoyo },
  avisos: { gap: 4 },
  aviso: { fontFamily: FuentePanel.texto, fontSize: TextoPanel.apoyo, color: Panel.texto },
});
