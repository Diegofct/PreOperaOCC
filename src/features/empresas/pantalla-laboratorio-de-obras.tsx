/**
 * La Bitácora de Geolab (spec 038, RF-27, D6): el laboratorio y los ensayos de las
 * bitácoras de todas las obras, filtrables por obra y por fecha, como la pestaña «En las
 * obras» de OCC. Se lee de las bitácoras y no se escribe aquí: los ensayos se registran en
 * cada obra. Cuando Geolab tenga grupo y bitácora propios, irán en otra spec.
 *
 * La ven gerencia y el laboratorista (RF-29). El selector de obra lista las de su alcance;
 * el servidor devuelve las de todas, que es lo que lleva Geolab.
 */
import { useCallback, useState } from 'react';

import { api } from '@/features/panel/cliente-api';
import { Acciones, Celda, Etiqueta, Paginacion, Seccion, Selector, Tabla, type Columna } from '@/features/panel/componentes';
import type { EnsayoDeLasObrasFila, ObraFila } from '@/features/panel/contratos';
import { MarcoPantalla, useListado } from '@/features/panel/marco';
import { POR_PAGINA } from '@/features/panel/paginas';
import { usePaginacion } from '@/features/panel/usar-listado-filtrado';
import { CamposDeFechas, useFiltroDeFechas } from '@/features/panel/whatsapp/filtro-de-fechas';
import { fechaDelCorte } from '@/shared/rules/cortes';

export function PantallaLaboratorioDeLasObras() {
  const [obraId, setObraId] = useState<string | null>(null);
  const fechas = useFiltroDeFechas();
  const { desde, hasta } = fechas.consultado;
  const ensayos = useListado<EnsayoDeLasObrasFila>(
    useCallback(() => api.bitacoraDeEmpresa.laboratorio({ obraId, desde, hasta }), [obraId, desde, hasta]),
  );
  // Las obras del selector salen de los ensayos que llegan sin filtro de obra: el laboratorista
  // no lista obras, y así ve las que tienen ensayos.
  const todas = useListado<ObraFila>(useCallback(() => api.obras.listar().catch(() => []), []));
  const opcionesDeObra =
    todas.datos.length > 0
      ? todas.datos.map((o) => ({ valor: o.id, etiqueta: o.nombre }))
      : [...new Map(ensayos.datos.map((e) => [e.obraId, { valor: e.obraId, etiqueta: e.obraNombre }])).values()];
  const pagina = usePaginacion(ensayos.datos, `${obraId}|${desde}|${hasta}`);

  const columnas: Columna<EnsayoDeLasObrasFila>[] = [
    { clave: 'fecha', titulo: 'Día', ancho: 110, pintar: (e) => <Celda>{fechaDelCorte(e.fecha)}</Celda> },
    { clave: 'obra', titulo: 'Obra', ancho: 180, pintar: (e) => <Celda lineas={2}>{e.obraNombre}</Celda> },
    { clave: 'ensayo', titulo: 'Ensayo', ancho: 180, pintar: (e) => <Celda lineas={2}>{e.nombre}</Celda> },
    { clave: 'ubicacion', titulo: 'Ubicación', ancho: 150, pintar: (e) => <Celda lineas={2}>{e.ubicacion || '—'}</Celda> },
    {
      clave: 'resultado',
      titulo: 'Resultado',
      ancho: 130,
      pintar: (e) => <Celda>{e.resultado === null ? '—' : `${e.resultado.toLocaleString('es-CO')}${e.unidad ? ` ${e.unidad}` : ''}`}</Celda>,
    },
    {
      clave: 'cumple',
      titulo: 'Cumple',
      ancho: 110,
      pintar: (e) =>
        e.cumple === 'si' ? (
          <Etiqueta tono="bueno">Cumple</Etiqueta>
        ) : e.cumple === 'no' ? (
          <Etiqueta tono="malo">No cumple</Etiqueta>
        ) : (
          <Celda>—</Celda>
        ),
    },
    { clave: 'responsable', titulo: 'Responsable', ancho: 150, pintar: (e) => <Celda lineas={2}>{e.responsable ?? '—'}</Celda> },
    { clave: 'bitacora', titulo: 'Bitácora', ancho: 100, pintar: (e) => <Celda>{e.bitacoraCerrada ? 'Cerrada' : 'Abierta'}</Celda> },
  ];

  return (
    <MarcoPantalla
      titulo="Bitácora de Geolab"
      descripcion="El laboratorio de las bitácoras de todas las obras: cada ensayo con su obra, su ubicación, su resultado y si cumple. Se registran en la bitácora de cada obra."
      error={ensayos.error}
      cargando={ensayos.cargando}
    >
      <Seccion titulo="Ensayos de las obras">
        <Acciones>
          <Selector
            etiqueta="Obra"
            valor={obraId}
            opciones={opcionesDeObra}
            onChange={setObraId}
            permiteVacio
            vacio="Todas las obras"
            ancho={260}
          />
          <CamposDeFechas filtro={fechas} />
        </Acciones>
        <Tabla
          columnas={columnas}
          filas={pagina.pagina}
          vacio={`No hay ensayos en las bitácoras entre el ${fechaDelCorte(desde)} y el ${fechaDelCorte(hasta)}.`}
        />
        <Paginacion pagina={pagina.paginaActual} porPagina={POR_PAGINA} total={pagina.total} onCambiar={pagina.irAPagina} />
      </Seccion>
    </MarcoPantalla>
  );
}
