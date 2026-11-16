/**
 * Una versión de la planificación (spec 043, RF-45, RF-49, RF-51; spec 045, RF-44 a RF-64).
 *
 * Una aprobada no se toca: se mira, se baja su Excel original si lo tiene y, para quien tiene el
 * permiso, se anula (`acciones-planificacion.tsx`). Desde la spec 045 un borrador se corrige en
 * pantalla (`editor-planificacion.tsx`) si quien lo mira puede escribir planificación; para los
 * demás sigue en solo lectura.
 *
 * Arriba, qué versión es, en qué estado está y desde cuándo rige; debajo, lo que dice
 * (`resumen-planificacion.tsx`): el resumen con las dos medidas, los hallazgos y lo descartado.
 */
import { useCallback, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { api, mensajeDe } from '@/features/panel/cliente-api';
import { Acciones, Aviso, Boton, Cifra, Cifras, Etiqueta, Seccion } from '@/features/panel/componentes';
import { guardarArchivo } from '@/features/panel/guardar-archivo';
import { useListado } from '@/features/panel/marco';
import type { PlanificacionDetalle } from '@/features/panel/planificacion';
import { usePersona } from '@/features/panel/sesion';
import { diaCorto } from '@/shared/rules/jornada';
import { alcanza } from '@/shared/rules/permisos';

import { AccionesPlanificacion } from './acciones-planificacion';
import { EditorPlanificacion } from './editor-planificacion';
import { NOMBRE_DE_ESTADO, TONO_DE_ESTADO } from './estados';
import { ResumenPlanificacion } from './resumen-planificacion';

function fecha(iso: string | null): string {
  return iso ? new Date(iso).toLocaleString('es-CO', { timeZone: 'America/Bogota', dateStyle: 'medium', timeStyle: 'short' }) : '—';
}

/** El rango en que rige, en palabras. Uno invertido es una versión que no midió ningún día. */
export function vigenciaEnTexto(p: { rigeDesde: string | null; rigeHasta: string | null }): string {
  if (!p.rigeDesde) return 'Sin aprobar';
  if (p.rigeHasta && p.rigeHasta < p.rigeDesde) return 'No rigió ningún día';
  return p.rigeHasta ? `Del ${diaCorto(p.rigeDesde)} al ${diaCorto(p.rigeHasta)}` : `Desde el ${diaCorto(p.rigeDesde)}`;
}

/** RF-147: de dónde nació, y de cuál si es copia. */
function origenEnTexto(p: PlanificacionDetalle, numeroDe: (id: string) => number | undefined): string {
  if (p.origen === 'excel') return 'De un Excel';
  if (p.origen === 'presupuesto') return 'Del presupuesto';
  const n = p.copiadaDe ? numeroDe(p.copiadaDe) : undefined;
  return n === undefined ? 'Copia de otra versión' : `Copia de la v${n}`;
}

export function DetallePlanificacion({
  id,
  alCambiar,
  alAbrir,
  numeroDe = () => undefined,
}: {
  id: string;
  alCambiar: () => void;
  alAbrir?: (id: string) => void;
  numeroDe?: (id: string) => number | undefined;
}) {
  const detalle = useListado<PlanificacionDetalle>(useCallback(() => api.planificaciones.de(id).then((d) => [d]), [id]));
  const [bajando, setBajando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { rol } = usePersona();
  const p = detalle.datos[0];
  // Spec 045, RF-46: corrigen el borrador la Gerencia y el Director de Proyectos.
  const editable = p?.estado === 'borrador' && alcanza(rol, 'planificacion', 'escribir');

  async function bajarExcel() {
    setBajando(true);
    setError(null);
    try {
      const { contenido, nombre } = await api.planificaciones.excel(id);
      guardarArchivo(contenido, nombre);
    } catch (fallo) {
      setError(mensajeDe(fallo));
    } finally {
      setBajando(false);
    }
  }

  if (detalle.error) return <Aviso tono="error">{detalle.error}</Aviso>;
  if (!p) return null;

  return (
    <Seccion titulo={`Versión ${p.numeroVersion}`}>
      <View style={estilos.columna}>
        <View style={estilos.fila}>
          <Etiqueta tono={TONO_DE_ESTADO[p.estado]}>{NOMBRE_DE_ESTADO[p.estado]}</Etiqueta>
          {editable ? <Etiqueta tono="bueno">Se corrige en pantalla</Etiqueta> : <Etiqueta tono="neutro">Solo lectura</Etiqueta>}
        </View>
        <Cifras>
          <Cifra titulo="Origen" valor={origenEnTexto(p, numeroDe)} />
          <Cifra titulo="Rige" valor={vigenciaEnTexto(p)} />
          <Cifra titulo="Aprobada" valor={fecha(p.aprobadoEn)} />
          <Cifra titulo="Ítems" valor={String(p.estructura.items.length)} />
          <Cifra titulo="Hallazgos" valor={String(p.hallazgos.length)} />
        </Cifras>
        {p.estado === 'anulada' ? (
          <Aviso tono="info">{`Anulada el ${fecha(p.anuladoEn)} · Motivo: ${p.motivoAnulacion ?? '—'}`}</Aviso>
        ) : null}
        {/* Spec 045, RF-24 a RF-26: lo que dijo la IA al proponer el calendario, o que no respondió. */}
        {p.estructura.propuesta?.fallida ? (
          <Aviso tono="info">
            La IA no propuso el calendario: los ítems y rubros quedaron sin programación. Asígneles mes de inicio y meses en
            pantalla.
          </Aviso>
        ) : p.estructura.propuesta?.explicacion ? (
          <Aviso tono="info">{`Calendario propuesto por la IA: ${p.estructura.propuesta.explicacion}`}</Aviso>
        ) : null}
        {p.presupuestoDesactualizado ? (
          <Aviso tono="info">
            Esta planificación se cruzó contra una versión anterior del presupuesto. Hay un presupuesto más nuevo aprobado.
          </Aviso>
        ) : null}
        {/* RF-45. */}
        {editable && p.origen === 'excel' ? (
          <Aviso tono="info">Lo que se corrija aquí ya no coincide necesariamente con el Excel original.</Aviso>
        ) : null}
        {error ? <Aviso tono="error">{error}</Aviso> : null}
        <AccionesPlanificacion
          p={p}
          alAbrir={alAbrir}
          alCambiar={() => {
            detalle.recargar();
            alCambiar();
          }}
        />
        {/* RF-148, RF-149, RF-152: solo si nació de un Excel y a quien le toca. */}
        {p.tieneExcel ? (
          <Acciones>
            <Boton titulo={bajando ? 'Bajando…' : 'Bajar el Excel original'} tono="secundario" onPress={bajarExcel} deshabilitado={bajando} />
          </Acciones>
        ) : null}
        {editable ? (
          <EditorPlanificacion
            key={`${p.id}-${p.version}`}
            p={p}
            alGuardar={() => {
              detalle.recargar();
              alCambiar();
            }}
            alRecargar={detalle.recargar}
          />
        ) : null}
        <ResumenPlanificacion p={p} />
      </View>
    </Seccion>
  );
}

const estilos = StyleSheet.create({
  columna: { gap: 12 },
  fila: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
});
