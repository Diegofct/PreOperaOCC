/**
 * La pestaña «Reportes esperados» del módulo de WhatsApp (spec 024, RF-37 a RF-42).
 *
 * Qué reportes espera la bitácora de cada día de una obra —reporte diario, de personal,
 * control de calidad, inicio de actividades, viajes— y, si se quiere, quién de los que
 * escriben en el grupo los manda (RF-39). Cuando llegan todos, la bitácora se arma sola
 * (RF-43). Sin lista, se arma con el primer reporte del día (RF-41).
 *
 * La cambia la gerencia; el residente la ve (RF-42).
 */
import { useCallback, useState } from 'react';

import { alcanza } from '@/shared/rules/permisos';
import {
  ETIQUETAS_DE_REPORTE,
  TIPOS_DE_REPORTE,
  type TipoDeReporte,
} from '@/shared/rules/whatsapp-automatico';

import { api } from '../cliente-api';
import {
  Acciones,
  Aviso,
  Ayuda,
  Boton,
  Celda,
  FilaDeFormulario,
  Seccion,
  Selector,
  type Opcion,
} from '../componentes';
import type { ReporteEsperadoFila, ReportesEsperadosDeLaObra } from '../contratos';
import { useListado } from '../marco';
import { usePersona } from '../sesion';

/** El valor de «cualquier persona» en el selector de autor. */
const CUALQUIERA = '__cualquiera__';

const OPCIONES_DE_REPORTE: Opcion[] = TIPOS_DE_REPORTE.map((t) => ({ valor: t, etiqueta: ETIQUETAS_DE_REPORTE[t] }));

export function ReportesEsperados({ opcionesDeObra }: { opcionesDeObra: Opcion[] }) {
  const { rol } = usePersona();
  const esGerencia = alcanza(rol, 'obras', 'listar');

  // La gerencia elige la obra; al residente el servidor le da la suya.
  const [obraId, setObraId] = useState<string | null>(null);
  // Lo que se está editando; `null` mientras nadie toca nada: entonces manda lo guardado.
  const [borrador, setBorrador] = useState<ReporteEsperadoFila[] | null>(null);
  const [guardando, setGuardando] = useState(false);
  const [hecho, setHecho] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const pedir = esGerencia ? obraId !== null : true;
  const datos = useListado<ReportesEsperadosDeLaObra>(
    useCallback(() => (pedir ? api.whatsapp.esperados.leer(obraId).then((r) => [r]) : Promise.resolve([])), [obraId, pedir]),
  );
  const guardada = datos.datos[0] ?? null;
  const lista = borrador ?? guardada?.esperados ?? [];
  function setLista(cambio: (actual: ReporteEsperadoFila[]) => ReporteEsperadoFila[]) {
    setBorrador(cambio(lista));
  }

  const opcionesDeAutor: Opcion[] = [
    { valor: CUALQUIERA, etiqueta: 'Cualquier persona del grupo' },
    ...(guardada?.autores ?? []).map((a) => ({ valor: a.autorId, etiqueta: a.autorNombre ?? a.autorId })),
  ];

  function cambiar(i: number, cambio: Partial<ReporteEsperadoFila>) {
    setHecho(null);
    setLista((actual) => actual.map((fila, j) => (j === i ? { ...fila, ...cambio } : fila)));
  }

  async function guardar() {
    if (!guardada) return;
    setGuardando(true);
    setError(null);
    try {
      await api.whatsapp.esperados.guardar(guardada.obraId, lista);
      setBorrador(null);
      datos.recargar();
      setHecho('Quedó guardada la lista de reportes esperados de la obra.');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo guardar la lista.');
    } finally {
      setGuardando(false);
    }
  }

  return (
    <Seccion titulo="Reportes esperados">
      <Ayuda>
        Cuando lleguen todos los reportes de la lista, la bitácora del día se arma sola. Si alguno no llega, se arma
        al mediodía del día siguiente y queda incompleta. Sin lista, se arma con el primer reporte del día.
      </Ayuda>
      {esGerencia ? (
        <Acciones>
          <Selector
            etiqueta="Obra"
            valor={obraId}
            opciones={opcionesDeObra}
            onChange={(v) => {
              setHecho(null);
              setBorrador(null);
              setObraId(v);
            }}
            vacio="Elija la obra"
            ancho={300}
          />
        </Acciones>
      ) : null}
      {datos.error ? <Aviso tono="error">{datos.error}</Aviso> : null}
      {error ? <Aviso tono="error">{error}</Aviso> : null}
      {hecho ? <Aviso tono="exito">{hecho}</Aviso> : null}

      {!guardada ? null : (
        <>
          {lista.length === 0 ? <Ayuda>Esta obra no tiene lista: la bitácora se arma con el primer reporte del día.</Ayuda> : null}
          {lista.map((fila, i) =>
            esGerencia ? (
              <FilaDeFormulario key={i} ultima={i === lista.length - 1}>
                <Selector
                  etiqueta="Reporte"
                  valor={fila.tipoReporte}
                  opciones={OPCIONES_DE_REPORTE}
                  onChange={(v) => cambiar(i, { tipoReporte: (v as TipoDeReporte | null) ?? fila.tipoReporte })}
                  ancho={240}
                />
                <Selector
                  etiqueta="Quién lo manda"
                  valor={fila.autorId ?? CUALQUIERA}
                  opciones={opcionesDeAutor}
                  onChange={(v) => {
                    const autor = guardada.autores.find((a) => a.autorId === v);
                    cambiar(i, autor ? { autorId: autor.autorId, autorNombre: autor.autorNombre } : { autorId: null, autorNombre: null });
                  }}
                  ancho={280}
                />
                <Boton
                  titulo="Quitar"
                  tono="secundario"
                  onPress={() => {
                    setHecho(null);
                    setLista((actual) => actual.filter((_, j) => j !== i));
                  }}
                />
              </FilaDeFormulario>
            ) : (
              <Celda key={i} lineas={2}>
                {`• ${ETIQUETAS_DE_REPORTE[fila.tipoReporte]}${fila.autorNombre ? ` — lo manda ${fila.autorNombre}` : ' — cualquier persona del grupo'}`}
              </Celda>
            ),
          )}
          {esGerencia ? (
            <Acciones>
              <Boton
                titulo="Añadir reporte"
                tono="secundario"
                onPress={() => {
                  setHecho(null);
                  setLista((actual) => [...actual, { tipoReporte: 'reporte_diario', autorId: null, autorNombre: null }]);
                }}
              />
              <Boton titulo={guardando ? 'Guardando…' : 'Guardar'} onPress={guardar} deshabilitado={guardando} />
            </Acciones>
          ) : (
            <Ayuda>La lista la cambia la gerencia.</Ayuda>
          )}
        </>
      )}
    </Seccion>
  );
}
