/**
 * Completar un renglón del grupo de una empresa en «No se pudo guardar» (spec 038, RF-11,
 * RF-12c, RF-14, RF-26).
 *
 * Lo que casi siempre falta es el equipo: el grupo de OCC lo nombró de una forma que no se
 * reconoce («Grúa», una placa que no existe). Aquí se elige de la flota y, según la sección,
 * se ajusta lo demás: el estado del equipo en la lista, lo que pasó en el día, el trabajo o la
 * lectura. El servidor lo vuelve a leer con las mismas reglas que si hubiera llegado bien; lo
 * que siga sin cuadrar vuelve como falta, con su motivo.
 *
 * Aparte de la ventana de las obras porque sus campos son otros y no necesita el detalle del
 * mensaje: el grupo de OCC no tiene un reporte de obra que revisar.
 */
import { useCallback, useState } from 'react';

import {
  NOMBRE_DE_TIPO_DE_TRABAJO,
  TIPOS_DE_TRABAJO,
} from '@/shared/rules/bitacora-occ';
import { identificacionDelVehiculo } from '@/shared/rules/vehiculos';

import { api, ErrorApi, mensajeDe } from '../cliente-api';
import { Acciones, Aviso, Ayuda, Boton, Campo, FilaDeFormulario, Modal, Selector } from '../componentes';
import type { ExcepcionFila, VehiculoFila } from '../contratos';
import { useListado } from '../marco';

/** Cómo se nombra cada sección de un mensaje de empresa en la lista. */
export const NOMBRE_DE_SECCION_DE_EMPRESA: Record<string, string> = {
  estado_equipos: 'Equipo de la lista',
  cambios: 'Cambio de estado',
  trabajos: 'Trabajo de mantenimiento',
  lecturas: 'Lectura de medidor',
  bitacora_empresa: 'Bitácora de OCC',
};

/** Las que se completan aquí; lo demás (la bitácora cerrada) se reintenta. */
export const SE_COMPLETAN_EN_EMPRESA = ['estado_equipos', 'cambios', 'trabajos', 'lecturas'];

type Datos = Record<string, unknown>;

const texto = (v: unknown) => (typeof v === 'string' ? v : '');

export function VentanaCompletarDeEmpresa({
  excepcion,
  alCerrar,
  alGuardar,
}: {
  excepcion: ExcepcionFila;
  alCerrar: () => void;
  alGuardar: () => void;
}) {
  const vehiculos = useListado<VehiculoFila>(useCallback(() => api.vehiculos.listar(), []));
  const original = (excepcion.datos ?? {}) as Datos;
  const seccion = excepcion.seccion;
  const [vehiculoId, setVehiculoId] = useState<string | null>(null);
  const [estado, setEstado] = useState<string | null>(texto(original.estado) || null);
  const [detalle, setDetalle] = useState(texto(original.motivo) || texto(original.texto) || texto(original.descripcion));
  const [tipo, setTipo] = useState<string | null>(texto(original.tipo) || null);
  const [valor, setValor] = useState(original.valor === null || original.valor === undefined ? '' : String(original.valor));
  const [unidad, setUnidad] = useState<string | null>(texto(original.unidad) || null);
  const [faltas, setFaltas] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);

  const opcionesDeEquipo = vehiculos.datos.map((v) => ({
    valor: v.id,
    etiqueta: identificacionDelVehiculo({ placa: v.placa, tipo: v.tipoNombre, marca: v.marca, modelo: v.modelo }),
    detalle: v.obraNombre ?? 'Sin obra',
  }));

  function datosDelRenglon(): Datos {
    switch (seccion) {
      case 'estado_equipos':
        return { vehiculoId, estado, motivo: detalle };
      case 'cambios':
        return { vehiculoId, estado, texto: detalle };
      case 'trabajos':
        return { vehiculoId, tipo_trabajo: tipo, descripcion: detalle };
      default:
        return { vehiculoId, valor: Number(valor.replace(',', '.')), unidad };
    }
  }

  const falta =
    !vehiculoId ||
    (seccion === 'estado_equipos' && !estado) ||
    (seccion === 'cambios' && !estado) ||
    (seccion === 'trabajos' && (!tipo || detalle.trim() === '')) ||
    (seccion === 'lecturas' && (!unidad || !(Number(valor.replace(',', '.')) > 0)));

  async function guardar() {
    setGuardando(true);
    setError(null);
    setFaltas([]);
    try {
      await api.whatsapp.excepciones.guardar(excepcion.id, datosDelRenglon());
      alGuardar();
    } catch (fallo) {
      const cuerpo = fallo instanceof ErrorApi ? (fallo.cuerpo as { faltas?: { mensaje: string }[] } | undefined) : undefined;
      setFaltas((cuerpo?.faltas ?? []).map((f) => f.mensaje));
      setError(mensajeDe(fallo));
    } finally {
      setGuardando(false);
    }
  }

  return (
    <Modal titulo={`Completar: ${NOMBRE_DE_SECCION_DE_EMPRESA[seccion] ?? seccion}`} onCerrar={alCerrar}>
      <Ayuda>{`Por qué no se guardó: ${excepcion.motivo}`}</Ayuda>
      {texto(original.escrito) ? <Ayuda>{`En el mensaje decía: «${texto(original.escrito)}»`}</Ayuda> : null}
      {excepcion.fecha ? <Ayuda>{`Día: ${excepcion.fecha}`}</Ayuda> : null}
      {vehiculos.error ? <Aviso tono="error">{vehiculos.error}</Aviso> : null}
      <FilaDeFormulario ultima>
        <Selector
          etiqueta="Equipo"
          obligatorio
          valor={vehiculoId}
          opciones={opcionesDeEquipo}
          onChange={setVehiculoId}
          vacio="Elija el equipo de la flota"
          ancho={300}
        />
        {seccion === 'estado_equipos' ? (
          <>
            <Selector
              etiqueta="Según la lista"
              obligatorio
              valor={estado}
              opciones={[
                { valor: 'operativo', etiqueta: 'Operativo' },
                { valor: 'inoperativo', etiqueta: 'Inoperativo' },
              ]}
              onChange={setEstado}
              ancho={200}
            />
            <Campo etiqueta="Motivo u observación" valor={detalle} onChange={setDetalle} ancho={300} />
          </>
        ) : null}
        {seccion === 'cambios' ? (
          <>
            <Selector
              etiqueta="Qué pasó"
              obligatorio
              valor={estado}
              opciones={[
                { valor: 'varado', etiqueta: 'Quedó varado' },
                { valor: 'en_mantenimiento', etiqueta: 'Entró a mantenimiento' },
                { valor: 'operativo', etiqueta: 'Volvió a estar operativo' },
              ]}
              onChange={setEstado}
              ancho={240}
            />
            <Campo etiqueta="Lo que dijo el grupo" valor={detalle} onChange={setDetalle} ancho={300} />
          </>
        ) : null}
        {seccion === 'trabajos' ? (
          <>
            <Selector
              etiqueta="Tipo"
              obligatorio
              valor={tipo}
              opciones={TIPOS_DE_TRABAJO.map((t) => ({ valor: t, etiqueta: NOMBRE_DE_TIPO_DE_TRABAJO[t] }))}
              onChange={setTipo}
              ancho={260}
            />
            <Campo etiqueta="Qué se hizo" obligatorio valor={detalle} onChange={setDetalle} multilinea />
          </>
        ) : null}
        {seccion === 'lecturas' ? (
          <>
            <Campo etiqueta="Lectura" obligatorio valor={valor} onChange={setValor} soloNumeros ancho={160} />
            <Selector
              etiqueta="Unidad"
              obligatorio
              valor={unidad}
              opciones={[
                { valor: 'km', etiqueta: 'Kilómetros' },
                { valor: 'horas', etiqueta: 'Horas' },
              ]}
              onChange={setUnidad}
              ancho={180}
            />
          </>
        ) : null}
      </FilaDeFormulario>
      {faltas.length > 0 ? <Aviso tono="error">{faltas.join(' ')}</Aviso> : error ? <Aviso tono="error">{error}</Aviso> : null}
      <Acciones>
        <Boton titulo={guardando ? 'Guardando…' : 'Guardar'} deshabilitado={guardando || falta} onPress={guardar} />
        <Boton titulo="Cancelar" tono="secundario" onPress={alCerrar} />
      </Acciones>
    </Modal>
  );
}
