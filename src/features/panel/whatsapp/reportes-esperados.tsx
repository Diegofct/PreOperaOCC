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
import type { EmpresaId } from '@/shared/rules/empresas';
import {
  ETIQUETAS_DE_REPORTE,
  TIPOS_DE_REPORTE_DE_EMPRESA,
  TIPOS_DE_REPORTE_DE_OBRA,
  type TipoDeReporte,
} from '@/shared/rules/whatsapp-automatico';

import { useObraDeLaRuta } from '@/features/empresas/contexto-empresa';

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

const OPCIONES_DE_REPORTE: Opcion[] = TIPOS_DE_REPORTE_DE_OBRA.map((t) => ({ valor: t, etiqueta: ETIQUETAS_DE_REPORTE[t] }));
/** Spec 038 (RF-16, D8): la lista de equipos y el informe de mantenimiento. */
const OPCIONES_DE_REPORTE_DE_EMPRESA: Opcion[] = TIPOS_DE_REPORTE_DE_EMPRESA.map((t) => ({
  valor: t,
  etiqueta: ETIQUETAS_DE_REPORTE[t],
}));

export function ReportesEsperados({ opcionesDeObra, empresa }: { opcionesDeObra: Opcion[]; empresa?: EmpresaId }) {
  const { rol } = usePersona();
  const esGerencia = alcanza(rol, 'obras', 'listar');
  // Spec 038 (RF-16): en OCC, los de su bitácora; los cambian gerencia y el Encargado de OCC.
  const deEmpresa = empresa === 'occ' || empresa === 'geolab' ? empresa : null;
  const cambiaLaLista = deEmpresa ? alcanza(rol, 'bitacora_empresa', 'escribir') : esGerencia;
  const opcionesDeReporte = deEmpresa ? OPCIONES_DE_REPORTE_DE_EMPRESA : OPCIONES_DE_REPORTE;

  // La gerencia elige la obra; al residente el servidor le da la suya.
  const [obraDelSelector, setObraId] = useState<string | null>(null);
  // Spec 033, RF-24: dentro de una obra de Proyectos, solo lo de esa obra y sin selector.
  const obraDeLaRuta = useObraDeLaRuta();
  const obraId = obraDeLaRuta ?? obraDelSelector;
  // Lo que se está editando; `null` mientras nadie toca nada: entonces manda lo guardado.
  const [borrador, setBorrador] = useState<ReporteEsperadoFila[] | null>(null);
  const [guardando, setGuardando] = useState(false);
  const [hecho, setHecho] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const pedir = deEmpresa ? true : esGerencia ? obraId !== null : true;
  const datos = useListado<ReportesEsperadosDeLaObra>(
    useCallback(
      () =>
        deEmpresa
          ? api.whatsapp.esperados.leerDeEmpresa(deEmpresa).then((r) => [{ obraId: '', esperados: r.esperados, autores: r.autores }])
          : pedir
            ? api.whatsapp.esperados.leer(obraId).then((r) => [r])
            : Promise.resolve([]),
      [obraId, pedir, deEmpresa],
    ),
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
      if (deEmpresa) await api.whatsapp.esperados.guardarDeEmpresa(deEmpresa, lista);
      else await api.whatsapp.esperados.guardar(guardada.obraId, lista);
      setBorrador(null);
      datos.recargar();
      setHecho(deEmpresa ? 'Quedó guardada la lista de reportes esperados.' : 'Quedó guardada la lista de reportes esperados de la obra.');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo guardar la lista.');
    } finally {
      setGuardando(false);
    }
  }

  return (
    <Seccion titulo="Reportes esperados">
      {deEmpresa ? (
        <Ayuda>
          Lo que llega al grupo se guarda en la bitácora al momento. Con esta lista, el día queda «Armada» cuando llegan
          todos sus reportes, o «Incompleta» al mediodía del día siguiente si falta alguno. Sin lista, basta el primer
          reporte del día.
        </Ayuda>
      ) : (
        <Ayuda>
          Cuando lleguen todos los reportes de la lista, la bitácora del día se arma sola. Si alguno no llega, se arma
          al mediodía del día siguiente y queda incompleta. Sin lista, se arma con el primer reporte del día.
        </Ayuda>
      )}
      {esGerencia && !obraDeLaRuta && !deEmpresa ? (
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
          {lista.length === 0 ? (
            <Ayuda>
              {deEmpresa
                ? 'Sin lista: el día se da por completo con el primer reporte.'
                : 'Esta obra no tiene lista: la bitácora se arma con el primer reporte del día.'}
            </Ayuda>
          ) : null}
          {lista.map((fila, i) =>
            cambiaLaLista ? (
              <FilaDeFormulario key={i} ultima={i === lista.length - 1}>
                <Selector
                  etiqueta="Reporte"
                  valor={fila.tipoReporte}
                  opciones={opcionesDeReporte}
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
          {cambiaLaLista ? (
            <Acciones>
              <Boton
                titulo="Añadir reporte"
                tono="secundario"
                onPress={() => {
                  setHecho(null);
                  setLista((actual) => [
                    ...actual,
                    { tipoReporte: deEmpresa ? 'lista_equipos' : 'reporte_diario', autorId: null, autorNombre: null },
                  ]);
                }}
              />
              <Boton titulo={guardando ? 'Guardando…' : 'Guardar'} onPress={guardar} deshabilitado={guardando} />
            </Acciones>
          ) : (
            <Ayuda>{deEmpresa ? 'La lista la cambian la gerencia y el Encargado de OCC.' : 'La lista la cambia la gerencia.'}</Ayuda>
          )}
        </>
      )}
    </Seccion>
  );
}
