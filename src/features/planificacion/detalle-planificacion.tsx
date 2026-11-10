/**
 * Una versión de la planificación, en solo lectura (spec 043, RF-45, RF-49, RF-51).
 *
 * Aquí no hay ningún campo editable, ni lo habrá: un borrador se corrige arreglando el Excel y
 * volviéndolo a subir, y una aprobada no se toca. Lo único que se hace con una versión es mirarla,
 * bajar su Excel original y, para quien tiene el permiso, aprobarla o anularla
 * (`acciones-planificacion.tsx`).
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
import { diaCorto } from '@/shared/rules/jornada';

import { AccionesPlanificacion } from './acciones-planificacion';
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

export function DetallePlanificacion({ id, alCambiar }: { id: string; alCambiar: () => void }) {
  const detalle = useListado<PlanificacionDetalle>(useCallback(() => api.planificaciones.de(id).then((d) => [d]), [id]));
  const [bajando, setBajando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const p = detalle.datos[0];

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
          <Etiqueta tono="neutro">Solo lectura</Etiqueta>
        </View>
        <Cifras>
          <Cifra titulo="Rige" valor={vigenciaEnTexto(p)} />
          <Cifra titulo="Aprobada" valor={fecha(p.aprobadoEn)} />
          <Cifra titulo="Ítems" valor={String(p.estructura.items.length)} />
          <Cifra titulo="Hallazgos" valor={String(p.hallazgos.length)} />
        </Cifras>
        {p.estado === 'anulada' ? (
          <Aviso tono="info">{`Anulada el ${fecha(p.anuladoEn)} · Motivo: ${p.motivoAnulacion ?? '—'}`}</Aviso>
        ) : null}
        {p.presupuestoDesactualizado ? (
          <Aviso tono="info">
            Esta planificación se cruzó contra una versión anterior del presupuesto. Hay un presupuesto más nuevo aprobado.
          </Aviso>
        ) : null}
        {error ? <Aviso tono="error">{error}</Aviso> : null}
        <AccionesPlanificacion
          p={p}
          alCambiar={() => {
            detalle.recargar();
            alCambiar();
          }}
        />
        <Acciones>
          <Boton titulo={bajando ? 'Bajando…' : 'Bajar el Excel original'} tono="secundario" onPress={bajarExcel} deshabilitado={bajando} />
        </Acciones>
        <ResumenPlanificacion p={p} />
      </View>
    </Seccion>
  );
}

const estilos = StyleSheet.create({
  columna: { gap: 12 },
  fila: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
});
