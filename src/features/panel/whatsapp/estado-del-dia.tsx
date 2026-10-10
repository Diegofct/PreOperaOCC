/**
 * La pestaña «Estado del día» del módulo de WhatsApp (spec 024, RF-48, RF-55 a RF-57).
 *
 * De cada día con mensajes de la obra: los reportes que la obra espera —recibido o
 * pendiente, de quién y a qué hora—, si la bitácora está en espera, armada, incompleta o
 * cerrada, y, mientras espera, el botón «Guardar con lo que hay» para armarla sin
 * esperar la hora límite. La ven el residente de la obra y la gerencia.
 */
import { router } from 'expo-router';
import { useCallback, useState } from 'react';

import { fechaDeJornada } from '@/shared/rules/jornada';
import { alcanza } from '@/shared/rules/permisos';
import { ETIQUETAS_DE_REPORTE } from '@/shared/rules/whatsapp-automatico';

import { api } from '../cliente-api';
import {
  Acciones,
  Aviso,
  Boton,
  CampoDeFecha,
  Celda,
  Confirmacion,
  Etiqueta,
  Seccion,
  Selector,
  Tabla,
  type Columna,
  type Opcion,
  Paginacion,
} from '../componentes';
import type { DiaDeWhatsapp } from '../contratos';
import { useListado } from '../marco';
import { usePersona } from '../sesion';
import { POR_PAGINA, usePaginacion } from '../usar-listado-filtrado';

const FECHA = /^\d{4}-\d{2}-\d{2}$/;

function restarDias(fecha: string, dias: number): string {
  return new Date(Date.parse(`${fecha}T00:00:00Z`) - dias * 86_400_000).toISOString().slice(0, 10);
}

/** La hora en la obra, corta: «7:00 p. m.». */
function hora(iso: string): string {
  return new Date(iso).toLocaleTimeString('es-CO', { timeZone: 'America/Bogota', hour: 'numeric', minute: '2-digit' });
}

const ESTADO_DEL_DIA: Record<DiaDeWhatsapp['estado'], { texto: string; tono: 'neutro' | 'atencion' | 'malo' | 'bueno' }> = {
  en_espera: { texto: 'En espera', tono: 'atencion' },
  armada: { texto: 'Armada', tono: 'bueno' },
  incompleta: { texto: 'Incompleta', tono: 'malo' },
  cerrada: { texto: 'Cerrada', tono: 'neutro' },
};

/** Una fila de la tabla: el día, con un id que la tabla pueda usar. */
type FilaDelDia = DiaDeWhatsapp & { id: string };

export function EstadoDelDia({ opcionesDeObra }: { opcionesDeObra: Opcion[] }) {
  const { rol } = usePersona();
  const esGerencia = alcanza(rol, 'obras', 'listar');
  // Atender el módulo: el residente de la obra y la gerencia (RF-64).
  const puedeAtender = alcanza(rol, 'whatsapp', 'aprobar');

  const hoy = fechaDeJornada();
  const [obraId, setObraId] = useState<string | null>(null);
  const [desde, setDesde] = useState(restarDias(hoy, 6));
  const [hasta, setHasta] = useState(hoy);
  const [porArmar, setPorArmar] = useState<FilaDelDia | null>(null);
  const [hecho, setHecho] = useState<string | null>(null);

  const fechasBien = FECHA.test(desde) && FECHA.test(hasta);
  const dias = useListado<FilaDelDia>(
    useCallback(
      () =>
        fechasBien
          ? api.whatsapp.dias
              .listar({ obraId, desde, hasta })
              .then((lista) => lista.map((d) => ({ ...d, id: `${d.obraId}|${d.fecha}` })))
          : Promise.resolve([]),
      [obraId, desde, hasta, fechasBien],
    ),
  );

  const columnas: Columna<FilaDelDia>[] = [
    {
      clave: 'fecha',
      titulo: 'Día',
      ancho: 110,
      ordenar: (d) => d.fecha,
      pintar: (d) => <Celda>{d.fecha}</Celda>,
    },
    {
      clave: 'obra',
      titulo: 'Obra',
      ancho: 160,
      pintar: (d) => <Celda lineas={2}>{d.obraNombre}</Celda>,
    },
    {
      clave: 'estado',
      titulo: 'Bitácora',
      ancho: 120,
      pintar: (d) => (
        <>
          <Etiqueta tono={ESTADO_DEL_DIA[d.estado].tono}>{ESTADO_DEL_DIA[d.estado].texto}</Etiqueta>
          {d.enEspera > 0 ? (
            <Celda lineas={2}>{`${d.enEspera} ${d.enEspera === 1 ? 'reporte espera' : 'reportes esperan'}`}</Celda>
          ) : null}
        </>
      ),
    },
    {
      clave: 'reportes',
      titulo: 'Reportes esperados',
      ancho: 300,
      anchoMinimo: 200,
      pintar: (d) =>
        d.reportes.length === 0 ? (
          <Celda lineas={2}>La obra no tiene lista: se arma con el primer reporte.</Celda>
        ) : (
          <>
            {d.reportes.map((r) => {
              const quien = r.autorNombre ? ` (${r.autorNombre})` : '';
              const texto = r.recibido
                ? `✓ ${ETIQUETAS_DE_REPORTE[r.tipoReporte]}: ${r.recibidoDe ?? 'llegó'}${r.recibidoEn ? `, ${hora(r.recibidoEn)}` : ''}`
                : `✗ ${ETIQUETAS_DE_REPORTE[r.tipoReporte]}${quien}: falta`;
              return (
                <Celda key={`${r.tipoReporte}|${r.autorId ?? ''}`} lineas={2}>
                  {texto}
                </Celda>
              );
            })}
          </>
        ),
    },
    {
      clave: 'acciones',
      titulo: '',
      ancho: 190,
      anchoMinimo: 170,
      pintar: (d) => (
        <Acciones>
          {d.estado === 'en_espera' && d.enEspera > 0 && puedeAtender ? (
            <Boton titulo="Guardar con lo que hay" onPress={() => setPorArmar(d)} />
          ) : null}
          {d.parteId ? (
            <Boton
              titulo="Ver bitácora"
              tono="secundario"
              onPress={() =>
                router.push({ pathname: '/panel/bitacoras', params: { fecha: d.fecha, obraId: d.obraId } })
              }
            />
          ) : null}
        </Acciones>
      ),
    },
  ];

  // Páginas de 15 (spec 025, RF-55 a RF-58).
  const paginaDeDias = usePaginacion(dias.datos);

  return (
    <Seccion titulo="Estado del día">
      <Acciones>
        {esGerencia ? (
          <Selector
            etiqueta="Obra"
            valor={obraId}
            opciones={opcionesDeObra}
            onChange={setObraId}
            vacio="Todas las obras"
            permiteVacio
            ancho={260}
          />
        ) : null}
        <CampoDeFecha
          etiqueta="Desde"
          valor={desde}
          onChange={setDesde}
          error={FECHA.test(desde) ? undefined : 'AAAA-MM-DD'}
          max={hasta || undefined}
        />
        <CampoDeFecha
          etiqueta="Hasta"
          valor={hasta}
          onChange={setHasta}
          error={FECHA.test(hasta) ? undefined : 'AAAA-MM-DD'}
          min={desde || undefined}
        />
      </Acciones>
      {hecho ? <Aviso tono="exito">{hecho}</Aviso> : null}
      {dias.error ? <Aviso tono="error">{dias.error}</Aviso> : null}
      <>
        <Tabla
          columnas={columnas}
          filas={paginaDeDias.pagina}
          vacio="No hay días con reportes en ese periodo."
        />
        <Paginacion
          pagina={paginaDeDias.paginaActual}
          porPagina={POR_PAGINA}
          total={paginaDeDias.total}
          onCambiar={paginaDeDias.irAPagina}
        />
      </>
      {porArmar ? (
        <Confirmacion
          titulo="Guardar con lo que hay"
          aviso={
            porArmar.reportes.some((r) => !r.recibido)
              ? `La bitácora del ${porArmar.fecha} se armará sin ${porArmar.reportes
                  .filter((r) => !r.recibido)
                  .map((r) => ETIQUETAS_DE_REPORTE[r.tipoReporte].toLowerCase())
                  .join(', ')} y quedará marcada como incompleta. Lo que llegue después entra mientras siga abierta.`
              : `Se armará la bitácora del ${porArmar.fecha} con lo que llegó.`
          }
          confirmar="Guardar con lo que hay"
          onCancelar={() => setPorArmar(null)}
          onConfirmar={async () => {
            await api.whatsapp.dias.armar(porArmar.obraId, porArmar.fecha);
            setHecho(`La bitácora del ${porArmar.fecha} quedó armada y abierta.`);
            setPorArmar(null);
            dias.recargar();
          }}
        />
      ) : null}
    </Seccion>
  );
}
