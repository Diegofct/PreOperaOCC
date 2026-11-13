/**
 * Plan semanal de la obra (spec 044, RF-2 a RF-5, RF-34, RF-42, RF-52, RF-78, RF-79, RF-92, RF-101).
 * Los planes de cada semana con su estado, quién los armó y quién los aprobó, y las tres maneras
 * de empezar uno (`armar-plan-semanal.tsx`).
 *
 * Solo se entra desde una obra de Proyectos: el menú la da a la Gerencia, a los dos directores y
 * al Residente, y el servidor vuelve a mirar la obra en cada petición. Arman el plan los cuatro;
 * aprueban y anulan los que diga la regla según quién lo creó (T23).
 *
 * Se planean la semana en curso y las cuatro siguientes; las pasadas siguen en la lista, en solo
 * lectura. Un borrador de una semana que ya terminó se muestra «Sin aprobar» (RF-99).
 *
 * El plan que se mira va en la dirección (`plan`), como la versión de la planificación: recargar o
 * compartir el enlace deja a quien lo abre en el mismo. Sin elegir, se abre el borrador de la semana
 * más cercana —es en lo que se está trabajando— y si no, el aprobado más reciente.
 *
 * Debajo de la lista se abre el plan elegido (`editor-plan-semanal.tsx`): para ajustarlo si es un
 * borrador que todavía se puede planear, y en solo lectura si no.
 */
import { useCallback } from 'react';
import { StyleSheet, View } from 'react-native';

import { useObraDeLaRuta } from '@/features/empresas/contexto-empresa';
import { api } from '@/features/panel/cliente-api';
import { Boton, Celda, Etiqueta, Seccion, Tabla, type Columna } from '@/features/panel/componentes';
import { MarcoPantalla, useListado } from '@/features/panel/marco';
import type { ListaDePlanesSemanales, PlanSemanalFila } from '@/features/panel/plan-semanal';
import { usePersona } from '@/features/panel/sesion';
import { useParametroDeDireccion } from '@/features/panel/usar-parametro-direccion';
import { alcanza } from '@/shared/rules/permisos';

import { ArmarPlanSemanal } from './armar-plan-semanal';
import { EditorPlanSemanal } from './editor-plan-semanal';
import { estadoEnPantalla, NOMBRE_DE_ORIGEN, semanaEnTexto, semanaPasada, vigenciaDelPlan } from './estados';

const SIN_DATOS: ListaDePlanesSemanales = { semanas: [], planes: [], hayPlanificacion: true };

export default function PantallaPlanSemanal() {
  const obraId = useObraDeLaRuta();
  const { rol } = usePersona();
  // RF-54: arman el plan la Gerencia, los dos directores y el Residente.
  const puedeArmar = alcanza(rol, 'plan_semanal', 'escribir');
  const carga = useListado<ListaDePlanesSemanales>(
    useCallback(() => (obraId ? api.planesSemanales.listar(obraId).then((l) => [l]) : Promise.resolve([])), [obraId]),
  );
  const lista = carga.datos[0] ?? SIN_DATOS;
  const enCurso = lista.semanas[0];
  const [elegido, setElegido] = useParametroDeDireccion('plan', '');

  // La lista viene de la semana más nueva a la más vieja: el borrador «en lo que se trabaja» es el
  // de la semana más cercana que todavía se puede planear.
  const borradores = lista.planes.filter((p) => p.estado === 'borrador' && !semanaPasada(p.semana, enCurso));
  const visible =
    lista.planes.find((p) => p.id === elegido) ??
    borradores[borradores.length - 1] ??
    lista.planes.find((p) => p.estado === 'vigente') ??
    lista.planes[0];

  // Caben en `MaxContentWidthPanel`: 170 + 130 + 150 + 180 + 180 + 190 + 110 = 1 110, más 8 separaciones.
  const columnas: Columna<PlanSemanalFila>[] = [
    { clave: 'semana', titulo: 'Semana', ancho: 170, pintar: (p) => <Celda>{semanaEnTexto(p.semana)}</Celda> },
    {
      clave: 'estado',
      titulo: 'Estado',
      ancho: 130,
      pintar: (p) => {
        const estado = estadoEnPantalla(p, enCurso);
        return <Etiqueta tono={estado.tono}>{estado.nombre}</Etiqueta>;
      },
    },
    { clave: 'origen', titulo: 'Origen', ancho: 150, pintar: (p) => <Celda>{NOMBRE_DE_ORIGEN[p.origen]}</Celda> },
    { clave: 'armo', titulo: 'Lo armó', ancho: 180, pintar: (p) => <Celda>{p.creadoPor.nombre}</Celda> },
    { clave: 'aprobo', titulo: 'Lo aprobó', ancho: 180, pintar: (p) => <Celda>{p.aprobadoPor?.nombre ?? '—'}</Celda> },
    { clave: 'rige', titulo: 'Rige', ancho: 190, pintar: (p) => <Celda>{vigenciaDelPlan(p)}</Celda> },
    {
      clave: 'acciones',
      titulo: '',
      ancho: 110,
      anchoMinimo: 110,
      pintar: (p) =>
        visible?.id === p.id ? <Etiqueta tono="neutro">Viendo</Etiqueta> : <Boton titulo="Ver" tono="secundario" onPress={() => setElegido(p.id)} />,
    },
  ];

  return (
    <MarcoPantalla
      exigeObra
      titulo="Plan semanal"
      descripcion="El plan de trabajo de cada semana: qué se va a ejecutar, con qué gente, máquinas y materiales. Una vez aprobado, es la meta con que se mide el cumplimiento de esa semana."
      error={carga.error}
      cargando={carga.cargando}
    >
      <View style={estilos.bloques}>
        {obraId && puedeArmar && carga.datos[0] ? (
          <ArmarPlanSemanal
            key={obraId}
            obraId={obraId}
            lista={lista}
            alTerminar={(id) => {
              setElegido(id);
              carga.recargar();
            }}
          />
        ) : null}
        <Seccion titulo="Planes de la obra">
          <Tabla filas={lista.planes} columnas={columnas} vacio="Esta obra todavía no tiene planes semanales." />
        </Seccion>
        {visible ? (
          <EditorPlanSemanal
            key={visible.id}
            id={visible.id}
            enCurso={enCurso}
            puedeArmar={puedeArmar}
            alCambiar={() => {
              // Abierto sin elegir, era «el borrador más cercano»: al aprobarlo deja de serlo y la
              // página saltaría a otro. Se fija en la dirección para seguir viendo el mismo.
              setElegido(visible.id);
              carga.recargar();
            }}
          />
        ) : null}
      </View>
    </MarcoPantalla>
  );
}

const estilos = StyleSheet.create({
  bloques: { gap: 16 },
});
