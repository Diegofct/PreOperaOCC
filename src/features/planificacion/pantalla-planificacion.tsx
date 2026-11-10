/**
 * Planificación de la obra (spec 043, RF-44, RF-49, RF-86). Las versiones —v1, v2…— con su estado
 * y desde cuándo rigen, y la elegida en solo lectura.
 *
 * Solo se entra desde una obra de Proyectos: el menú la da a la Gerencia, al Director de
 * Proyectos y al Director de Obra, y el servidor vuelve a mirar la obra en cada petición. Suben el
 * Excel la Gerencia y el Director de Proyectos (`subir-planificacion.tsx`), y ellos mismos aprueban
 * y anulan desde el detalle.
 *
 * La versión que se mira va en la dirección (`version`), como en el presupuesto: recargar o
 * compartir el enlace deja a quien lo abre en la misma. Sin elegir, se abre el borrador si lo hay
 * —es en lo que se está trabajando— y si no, la vigente.
 */
import { useCallback } from 'react';
import { StyleSheet, View } from 'react-native';

import { useObraDeLaRuta } from '@/features/empresas/contexto-empresa';
import { api } from '@/features/panel/cliente-api';
import { Boton, Celda, Etiqueta, Seccion, Tabla, type Columna } from '@/features/panel/componentes';
import { MarcoPantalla, useListado } from '@/features/panel/marco';
import type { PlanificacionFila } from '@/features/panel/planificacion';
import { usePersona } from '@/features/panel/sesion';
import { useParametroDeDireccion } from '@/features/panel/usar-parametro-direccion';
import { alcanza } from '@/shared/rules/permisos';

import { DetallePlanificacion, vigenciaEnTexto } from './detalle-planificacion';
import { NOMBRE_DE_ESTADO, TONO_DE_ESTADO } from './estados';
import { SubirPlanificacion } from './subir-planificacion';

export default function PantallaPlanificacion() {
  const obraId = useObraDeLaRuta();
  const { rol } = usePersona();
  // RF-1: suben la Gerencia y el Director de Proyectos; el Director de Obra solo mira.
  const puedeSubir = alcanza(rol, 'planificacion', 'escribir');
  const lista = useListado<PlanificacionFila>(
    useCallback(() => (obraId ? api.planificaciones.listar(obraId) : Promise.resolve([])), [obraId]),
  );
  const [elegida, setElegida] = useParametroDeDireccion('version', '');
  const borrador = lista.datos.find((p) => p.estado === 'borrador');
  const vigente = lista.datos.find((p) => p.estado === 'vigente');
  const visible = lista.datos.find((p) => p.id === elegida) ?? borrador ?? vigente ?? lista.datos[lista.datos.length - 1];

  // Caben en `MaxContentWidthPanel`: 80 + 150 + 220 + 170 + 300 + 110 = 1 030, más 7 separaciones.
  const columnas: Columna<PlanificacionFila>[] = [
    { clave: 'version', titulo: 'Versión', ancho: 80, pintar: (p) => <Celda>{`v${p.numeroVersion}`}</Celda> },
    {
      clave: 'estado',
      titulo: 'Estado',
      ancho: 150,
      pintar: (p) => <Etiqueta tono={TONO_DE_ESTADO[p.estado]}>{NOMBRE_DE_ESTADO[p.estado]}</Etiqueta>,
    },
    { clave: 'rige', titulo: 'Rige', ancho: 220, pintar: (p) => <Celda>{vigenciaEnTexto(p)}</Celda> },
    {
      clave: 'aprobada',
      titulo: 'Aprobada',
      ancho: 170,
      pintar: (p) => (
        <Celda>{p.aprobadoEn ? new Date(p.aprobadoEn).toLocaleDateString('es-CO', { timeZone: 'America/Bogota' }) : '—'}</Celda>
      ),
    },
    {
      clave: 'nota',
      titulo: 'Nota',
      ancho: 300,
      pintar: (p) => <Celda>{p.estado === 'anulada' ? `Anulada: ${p.motivoAnulacion ?? ''}` : ''}</Celda>,
    },
    {
      clave: 'acciones',
      titulo: '',
      ancho: 110,
      anchoMinimo: 110,
      pintar: (p) =>
        visible?.id === p.id ? (
          <Etiqueta tono="neutro">Viendo</Etiqueta>
        ) : (
          <Boton titulo="Ver" tono="secundario" onPress={() => setElegida(p.id)} />
        ),
    },
  ];

  return (
    <MarcoPantalla
      exigeObra
      titulo="Planificación"
      descripcion="La planificación de la obra que se lee del Excel del Director de Proyectos: precios de costo, medidas y programación mes a mes, con sus versiones."
      error={lista.error}
      cargando={lista.cargando}
    >
      <View style={estilos.columna}>
        {obraId && puedeSubir ? (
          <SubirPlanificacion
            key={obraId}
            obraId={obraId}
            alTerminar={(id) => {
              setElegida(id);
              lista.recargar();
            }}
          />
        ) : null}
        <Seccion titulo="Versiones">
          <Tabla filas={lista.datos} columnas={columnas} vacio="Esta obra todavía no tiene planificación." />
        </Seccion>
        {visible ? <DetallePlanificacion key={visible.id} id={visible.id} alCambiar={lista.recargar} /> : null}
      </View>
    </MarcoPantalla>
  );
}

const estilos = StyleSheet.create({
  columna: { gap: 16 },
});
