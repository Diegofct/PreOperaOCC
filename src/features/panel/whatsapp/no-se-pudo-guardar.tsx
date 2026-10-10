/**
 * La pestaña «No se pudo guardar» del módulo de WhatsApp (spec 024, RF-60 a RF-64).
 *
 * Los renglones que el sistema no pudo guardar solo, con el motivo. Quien atiende el
 * módulo —el residente de la obra o la gerencia— los completa con los mismos
 * selectores de la propuesta y los guarda (RF-61), o los descarta con un motivo
 * (RF-63). Lo que no es un renglón —la fecha, la bitácora cerrada, un mensaje
 * abandonado— se reintenta.
 *
 * Las opciones de cada renglón (volquetas, conductores, personas, materiales, sitios)
 * son las de la obra del mensaje: salen de su detalle, el mismo de la propuesta.
 */
import { useCallback, useState } from 'react';

import { NOVEDADES_DE_PERSONAL, type NovedadDePersonal } from '@/shared/catalogos/bitacora';
import { DESTINO_OBRA, formatearAbscisa, OPCIONES_DE_METROS, OPCIONES_DE_PR } from '@/shared/rules/cantera';
import type { UbicacionPorValidar } from '@/shared/rules/parte';
import { alcanza } from '@/shared/rules/permisos';
import {
  etiquetaDeCategoria,
  type ActividadDelReporte,
  type EnsayoDelReporte,
  type FranjaDelReporte,
  type MaquinaDelReporte,
  type MovimientoDelReporte,
  type PersonaDelReporte,
  type ViajeDelReporte,
  ubicacionDeTexto,
} from '@/shared/rules/whatsapp';

import { api, ErrorApi, mensajeDe } from '../cliente-api';
import {
  Acciones,
  Aviso,
  Ayuda,
  Boton,
  Campo,
  Celda,
  Confirmacion,
  FilaDeFormulario,
  Modal,
  Seccion,
  Selector,
  SelectorDeHora,
  Tabla,
  type Columna,
  type Opcion,
  Paginacion,
} from '../componentes';
import type { DetalleDePropuesta, ExcepcionFila } from '../contratos';
import { useListado } from '../marco';
import { CamposDeFechas, useFiltroDeFechas } from './filtro-de-fechas';
import { usePersona } from '../sesion';
import {
  CampoNumero,
  FaltasDelRenglon,
  OPCIONES_DE_ACTIVIDAD,
  OPCIONES_DE_CLIMA,
  OPCIONES_DE_ENSAYO,
} from './propuesta-reporte';
import { POR_PAGINA, usePaginacion } from '../usar-listado-filtrado';

const OPCIONES_DE_NOVEDAD = NOVEDADES_DE_PERSONAL.map((n) => ({ valor: n.id, etiqueta: n.nombre }));

const OPCIONES_DE_CUMPLE = [
  { valor: 'si', etiqueta: 'Cumple' },
  { valor: 'no', etiqueta: 'No cumple' },
];

/** La ubicación de un ensayo como se lee: «PR 0 + 070 a PR 0 + 150», «PR 1 + 140» o el lugar. */
function textoDeUbicacion(u: UbicacionPorValidar | null): string {
  if (!u) return '';
  const abscisa = (a: { pr: number | null; metros: number | null }) =>
    a.pr === null || a.metros === null ? '' : formatearAbscisa(a.pr, a.metros);
  if ('lugar' in u) return u.lugar ?? '';
  if ('desde' in u) return `${abscisa(u.desde)} a ${abscisa(u.hasta)}`;
  return abscisa(u);
}

/**
 * La ubicación de un ensayo, escrita como en el reporte y leída con la misma regla
 * que el reporte (spec 025, RF-31, RF-43): «Pr 0+70 al Pr 0+150» es un tramo, «K1+140»
 * una abscisa, y lo demás un lugar. El texto se guarda aparte para no reescribirlo
 * mientras se teclea.
 */
function CampoDeUbicacion({
  valor,
  onChange,
}: {
  valor: UbicacionPorValidar | null;
  onChange: (u: UbicacionPorValidar | null) => void;
}) {
  const [texto, setTexto] = useState(() => textoDeUbicacion(valor));
  return (
    <Campo
      etiqueta="Ubicación"
      valor={texto}
      onChange={(x) => {
        setTexto(x);
        onChange(ubicacionDeTexto(x));
      }}
      ayuda="PR 1+140, «PR 0+70 al PR 0+150» o el lugar."
      ancho={260}
    />
  );
}

/** Cómo se nombra cada sección en la lista. */
const NOMBRE_DE_SECCION: Record<string, string> = {
  viajes: 'Viaje de cantera',
  personal: 'Persona',
  maquinaria: 'Máquina',
  clima: 'Clima',
  actividades: 'Actividad',
  ensayos: 'Ensayo',
  almacen: 'Almacén',
  fecha: 'Fecha del reporte',
  bitacora: 'Bitácora',
  mensaje: 'Mensaje',
};

/** Las secciones cuyo renglón se completa aquí. */
const SE_COMPLETAN = ['viajes', 'personal', 'maquinaria', 'clima', 'actividades', 'ensayos', 'almacen'];

function momento(iso: string): string {
  return new Date(iso).toLocaleString('es-CO', {
    timeZone: 'America/Bogota',
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function NoSePudoGuardar({ opcionesDeObra }: { opcionesDeObra: Opcion[] }) {
  const { rol } = usePersona();
  const esGerencia = alcanza(rol, 'obras', 'listar');
  const puedeAtender = alcanza(rol, 'whatsapp', 'aprobar');

  const [obraId, setObraId] = useState<string | null>(null);
  const [completando, setCompletando] = useState<ExcepcionFila | null>(null);
  const [descartando, setDescartando] = useState<ExcepcionFila | null>(null);
  const [reintentando, setReintentando] = useState<ExcepcionFila | null>(null);
  const [hecho, setHecho] = useState<string | null>(null);

  // El rango de días del reporte (spec 025, RF-46). Lo pendiente de antes no se
  // esconde: se cuenta y se avisa.
  const fechas = useFiltroDeFechas();
  const { desde, hasta } = fechas.consultado;
  const [anteriores, setAnteriores] = useState(0);
  const lista = useListado<ExcepcionFila>(
    useCallback(
      () =>
        api.whatsapp.excepciones.listar('pendiente', obraId, { desde, hasta }).then((r) => {
          setAnteriores(r.anterioresPendientes);
          return r.excepciones;
        }),
      [obraId, desde, hasta],
    ),
  );

  const columnas: Columna<ExcepcionFila>[] = [
    {
      clave: 'enviado',
      titulo: 'Enviado',
      ancho: 115,
      ordenar: (e) => e.enviadoEn,
      pintar: (e) => <Celda lineas={2}>{momento(e.enviadoEn)}</Celda>,
    },
    {
      clave: 'autor',
      titulo: 'Autor y obra',
      ancho: 150,
      pintar: (e) => (
        <>
          <Celda lineas={2}>{e.autorNombre ?? 'Sin nombre'}</Celda>
          <Celda>{e.obraNombre}</Celda>
        </>
      ),
    },
    {
      clave: 'que',
      titulo: 'Qué',
      ancho: 220,
      anchoMinimo: 150,
      pintar: (e) => (
        <>
          <Celda lineas={2}>
            {`${NOMBRE_DE_SECCION[e.seccion] ?? e.seccion}${e.renglon !== null ? ` ${e.renglon + 1}` : ''} · ${etiquetaDeCategoria(e.categoria)}`}
          </Celda>
          <Celda lineas={2}>{e.resumen ?? '—'}</Celda>
        </>
      ),
    },
    {
      clave: 'motivo',
      titulo: 'Por qué no se guardó',
      ancho: 220,
      anchoMinimo: 150,
      pintar: (e) => <Celda lineas={4}>{e.motivo}</Celda>,
    },
    {
      clave: 'acciones',
      titulo: '',
      ancho: 150,
      anchoMinimo: 130,
      pintar: (e) =>
        puedeAtender ? (
          <Acciones>
            {e.renglon !== null && SE_COMPLETAN.includes(e.seccion) ? (
              <Boton titulo="Completar" onPress={() => setCompletando(e)} />
            ) : (
              <Boton titulo="Reintentar" onPress={() => setReintentando(e)} />
            )}
            <Boton titulo="Descartar" tono="peligro" onPress={() => setDescartando(e)} />
          </Acciones>
        ) : null,
    },
  ];

  // Páginas de 15 (spec 025, RF-55 a RF-58).
  const paginaDeExcepciones = usePaginacion(lista.datos);

  return (
    <Seccion titulo="No se pudo guardar">
      <Ayuda>
        Lo que el sistema no pudo guardar solo. Complételo y guárdelo, o descártelo con un motivo. Lo que no es un
        renglón (la fecha, una bitácora cerrada) se reintenta.
      </Ayuda>
      <Acciones>
        {esGerencia ? (
          <Selector
            etiqueta="Obra"
            valor={obraId}
            opciones={opcionesDeObra}
            onChange={setObraId}
            vacio="Todas las obras"
            permiteVacio
            ancho={280}
          />
        ) : null}
        <CamposDeFechas filtro={fechas} />
      </Acciones>
      {hecho ? <Aviso tono="exito">{hecho}</Aviso> : null}
      {lista.error ? <Aviso tono="error">{lista.error}</Aviso> : null}
      {anteriores > 0 ? (
        <Aviso tono="info">
          {`Hay ${anteriores} pendiente${anteriores === 1 ? '' : 's'} de días anteriores al ${desde}. Cambie «Desde» para verl${anteriores === 1 ? 'o' : 'os'}.`}
        </Aviso>
      ) : null}
      <>
        <Tabla
          columnas={columnas}
          filas={paginaDeExcepciones.pagina}
          vacio={`No hay nada pendiente entre el ${desde} y el ${hasta}.`}
        />
        <Paginacion
          pagina={paginaDeExcepciones.paginaActual}
          porPagina={POR_PAGINA}
          total={paginaDeExcepciones.total}
          onCambiar={paginaDeExcepciones.irAPagina}
        />
      </>

      {completando ? (
        <VentanaCompletar
          excepcion={completando}
          alCerrar={() => setCompletando(null)}
          alGuardar={() => {
            setHecho('El renglón quedó guardado.');
            setCompletando(null);
            lista.recargar();
          }}
        />
      ) : null}
      {reintentando ? (
        <Confirmacion
          titulo="Reintentar"
          aviso="El mensaje se vuelve a procesar en el próximo pulso (cada 15 minutos). Si vuelve a fallar, reaparece aquí con el motivo."
          confirmar="Reintentar"
          onCancelar={() => setReintentando(null)}
          onConfirmar={async () => {
            await api.whatsapp.excepciones.guardar(reintentando.id);
            setHecho('El mensaje se volverá a procesar.');
            setReintentando(null);
            lista.recargar();
          }}
        />
      ) : null}
      {descartando ? (
        <VentanaDescartar
          excepcion={descartando}
          alCerrar={() => setDescartando(null)}
          alDescartar={() => {
            setHecho('El renglón quedó descartado.');
            setDescartando(null);
            lista.recargar();
          }}
        />
      ) : null}
    </Seccion>
  );
}

/** Descartar con motivo (RF-63). */
function VentanaDescartar({
  excepcion,
  alCerrar,
  alDescartar,
}: {
  excepcion: ExcepcionFila;
  alCerrar: () => void;
  alDescartar: () => void;
}) {
  const [motivo, setMotivo] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  return (
    <Modal titulo="Descartar" onCerrar={alCerrar}>
      <Ayuda>{`${NOMBRE_DE_SECCION[excepcion.seccion] ?? excepcion.seccion}: ${excepcion.motivo}`}</Ayuda>
      <Campo etiqueta="Motivo" valor={motivo} onChange={setMotivo} multilinea obligatorio />
      {error ? <Aviso tono="error">{error}</Aviso> : null}
      <Acciones>
        <Boton
          titulo={enviando ? 'Descartando…' : 'Descartar'}
          tono="peligro"
          deshabilitado={enviando}
          onPress={async () => {
            setEnviando(true);
            setError(null);
            try {
              await api.whatsapp.excepciones.descartar(excepcion.id, motivo);
              alDescartar();
            } catch (fallo) {
              setError(mensajeDe(fallo));
            } finally {
              setEnviando(false);
            }
          }}
        />
        <Boton titulo="Cancelar" tono="secundario" onPress={alCerrar} />
      </Acciones>
    </Modal>
  );
}

type Falta = { seccion: string; renglon: number | null; mensaje: string };

/** Completar un renglón y guardarlo (RF-61, RF-62). */
function VentanaCompletar({
  excepcion,
  alCerrar,
  alGuardar,
}: {
  excepcion: ExcepcionFila;
  alCerrar: () => void;
  alGuardar: () => void;
}) {
  const detalle = useListado<DetalleDePropuesta>(
    useCallback(() => api.whatsapp.propuestas.ver(excepcion.mensajeId).then((d) => [d]), [excepcion.mensajeId]),
  );
  const [datos, setDatos] = useState<Record<string, unknown>>((excepcion.datos ?? {}) as Record<string, unknown>);
  const [fecha, setFecha] = useState(excepcion.fecha ?? '');
  const [faltas, setFaltas] = useState<Falta[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);

  const cambiar = (cambio: Record<string, unknown>) => setDatos((d) => ({ ...d, ...cambio }));
  const opciones = detalle.datos[0]?.opciones;

  async function guardar() {
    setGuardando(true);
    setError(null);
    setFaltas([]);
    try {
      await api.whatsapp.excepciones.guardar(excepcion.id, datos, excepcion.fecha ? undefined : fecha);
      alGuardar();
    } catch (fallo) {
      const cuerpo = fallo instanceof ErrorApi ? (fallo.cuerpo as { faltas?: Falta[] } | undefined) : undefined;
      setFaltas(cuerpo?.faltas ?? []);
      setError(mensajeDe(fallo));
    } finally {
      setGuardando(false);
    }
  }

  return (
    <Modal titulo={`Completar: ${NOMBRE_DE_SECCION[excepcion.seccion] ?? excepcion.seccion}`} onCerrar={alCerrar}>
      <Ayuda>{`Por qué no se guardó: ${excepcion.motivo}`}</Ayuda>
      {detalle.error ? <Aviso tono="error">{detalle.error}</Aviso> : null}
      {!opciones ? null : (
        <>
          {excepcion.fecha ? (
            <Ayuda>{`Día del reporte: ${excepcion.fecha}`}</Ayuda>
          ) : (
            <Campo etiqueta="Día del reporte" valor={fecha} onChange={setFecha} ayuda="AAAA-MM-DD" ancho={160} />
          )}
          <FilaDeFormulario ultima>
            <CamposDelRenglon seccion={excepcion.seccion} datos={datos} cambiar={cambiar} opciones={opciones} />
          </FilaDeFormulario>
          <FaltasDelRenglon faltas={faltas} />
          {error ? <Aviso tono="error">{error}</Aviso> : null}
          <Acciones>
            <Boton titulo={guardando ? 'Guardando…' : 'Guardar'} deshabilitado={guardando} onPress={guardar} />
            <Boton titulo="Cancelar" tono="secundario" onPress={alCerrar} />
          </Acciones>
        </>
      )}
    </Modal>
  );
}

/** Los campos de un renglón según su sección, con las opciones de la obra del mensaje. */
function CamposDelRenglon({
  seccion,
  datos,
  cambiar,
  opciones,
}: {
  seccion: string;
  datos: Record<string, unknown>;
  cambiar: (cambio: Record<string, unknown>) => void;
  opciones: DetalleDePropuesta['opciones'];
}) {
  const personas = opciones.personas.map((p) => ({ valor: p.id, etiqueta: p.nombreCompleto, detalle: p.cargo ?? undefined }));
  const equipos = opciones.equipos.map((e) => ({
    valor: e.id,
    etiqueta: e.placa ? `${e.codigoInterno} · ${e.placa}` : e.codigoInterno,
  }));
  const escrito = (texto: string | null | undefined, que: string) => (texto ? <Ayuda>{`${que}: «${texto}»`}</Ayuda> : null);

  if (seccion === 'viajes') {
    const v = datos as unknown as ViajeDelReporte;
    const sitios = opciones.cantera.sitios.map((s) => ({ valor: s.id, etiqueta: s.nombre }));
    return (
      <>
        {escrito(v.placaEscrita, 'Placa en el reporte')}
        <Selector
          etiqueta="Volqueta"
          valor={v.vehiculoId}
          opciones={opciones.cantera.volquetas.map((q) => ({
            valor: q.id,
            etiqueta: q.placa ? `${q.codigoInterno} · ${q.placa}` : q.codigoInterno,
          }))}
          onChange={(x) => cambiar({ vehiculoId: x })}
          vacio="Elija la volqueta"
          ancho={240}
        />
        {escrito(v.conductorEscrito, 'Conductor en el reporte')}
        <Selector
          etiqueta="Conductor"
          valor={v.conductorId}
          opciones={opciones.cantera.conductores.map((c) => ({ valor: c.id, etiqueta: c.nombreCompleto }))}
          onChange={(x) => cambiar({ conductorId: x, conductorPor: null })}
          vacio="Elija el conductor"
          ancho={240}
        />
        <SelectorDeHora etiqueta="Hora" valor={v.hora ?? ''} onChange={(x) => cambiar({ hora: x || null })} />
        <Selector
          etiqueta="Material"
          valor={v.materialId}
          opciones={opciones.cantera.materiales.map((m) => ({ valor: m.id, etiqueta: m.nombre }))}
          onChange={(x) => cambiar({ materialId: x })}
          vacio="Elija el material"
          ancho={220}
        />
        <Selector
          etiqueta="Origen"
          valor={v.origenId}
          opciones={sitios}
          onChange={(x) => cambiar({ origenId: x })}
          vacio="Elija el origen"
          ancho={220}
        />
        <Selector
          etiqueta="Destino"
          valor={v.destino}
          opciones={[{ valor: DESTINO_OBRA, etiqueta: 'La obra' }, ...sitios]}
          onChange={(x) => cambiar(x === DESTINO_OBRA ? { destino: x } : { destino: x, pr: null, metros: null })}
          vacio="Elija el destino"
          ancho={220}
        />
        {v.destino === DESTINO_OBRA ? (
          <>
            <Selector
              etiqueta="PR de llegada"
              valor={v.pr === null ? null : String(v.pr)}
              opciones={OPCIONES_DE_PR.map((n) => ({ valor: String(n), etiqueta: `PR ${n}` }))}
              onChange={(x) => cambiar({ pr: x === null ? null : Number(x) })}
              vacio="Elija el PR"
              ancho={150}
            />
            <Selector
              etiqueta="Metros"
              valor={v.metros === null ? null : String(v.metros)}
              opciones={OPCIONES_DE_METROS.map((n) => ({ valor: String(n), etiqueta: `+ ${String(n).padStart(3, '0')}` }))}
              onChange={(x) => cambiar({ metros: x === null ? null : Number(x) })}
              vacio="Elija los metros"
              ancho={150}
            />
          </>
        ) : null}
        <Campo etiqueta="N.º de vale" valor={v.vale ?? ''} onChange={(x) => cambiar({ vale: x === '' ? null : x })} ancho={160} />
      </>
    );
  }

  if (seccion === 'personal') {
    const p = datos as unknown as PersonaDelReporte;
    return (
      <>
        {escrito(p.escrito, 'En el reporte')}
        <Selector
          etiqueta="Persona"
          valor={p.usuarioId}
          opciones={personas}
          onChange={(x) => cambiar({ usuarioId: x })}
          vacio="Elija la persona"
          ancho={260}
        />
        <SelectorDeHora etiqueta="Entrada" valor={p.entrada ?? ''} onChange={(x) => cambiar({ entrada: x || null })} />
        <SelectorDeHora etiqueta="Salida" valor={p.salida ?? ''} onChange={(x) => cambiar({ salida: x || null })} />
        {/* O las horas como las reporta la obra, o la novedad (spec 025, RF-27). */}
        <CampoNumero
          etiqueta="Laboradas (L)"
          valor={p.horasLaboradas}
          onChange={(n) => cambiar({ horasLaboradas: n })}
          editable
          ancho={110}
        />
        <CampoNumero
          etiqueta="Extra diurnas (ED)"
          valor={p.extraDiurnas}
          onChange={(n) => cambiar({ extraDiurnas: n })}
          editable
          ancho={130}
        />
        <CampoNumero
          etiqueta="Extra nocturnas (EN)"
          valor={p.extraNocturnas}
          onChange={(n) => cambiar({ extraNocturnas: n })}
          editable
          ancho={140}
        />
        <Selector
          etiqueta="Novedad"
          valor={p.novedad ?? null}
          opciones={OPCIONES_DE_NOVEDAD}
          onChange={(x) => cambiar({ novedad: (x as NovedadDePersonal | null) ?? null })}
          vacio="Sin novedad"
          permiteVacio
          ancho={170}
        />
      </>
    );
  }

  if (seccion === 'maquinaria') {
    const m = datos as unknown as MaquinaDelReporte;
    return (
      <>
        {escrito(m.escrito, 'En el reporte')}
        <Selector
          etiqueta="Equipo"
          valor={m.vehiculoId}
          opciones={equipos}
          onChange={(x) => cambiar({ vehiculoId: x })}
          vacio="Elija el equipo"
          ancho={240}
        />
        {escrito(m.operadorEscrito, 'Operador en el reporte')}
        <Selector
          etiqueta="Operador"
          valor={m.operadorId}
          opciones={personas}
          onChange={(x) => cambiar({ operadorId: x })}
          vacio="Sin operador"
          permiteVacio
          ancho={240}
        />
        <CampoNumero etiqueta="Inició" valor={m.medidorInicial} onChange={(n) => cambiar({ medidorInicial: n })} editable />
        <CampoNumero etiqueta="Terminó" valor={m.medidorFinal} onChange={(n) => cambiar({ medidorFinal: n })} editable />
      </>
    );
  }

  if (seccion === 'clima') {
    const f = datos as unknown as FranjaDelReporte;
    return (
      <>
        <Selector
          etiqueta="Clima"
          valor={f.condicion}
          opciones={OPCIONES_DE_CLIMA}
          onChange={(x) => cambiar({ condicion: x })}
          vacio="Elija el clima"
          ancho={220}
        />
        <SelectorDeHora etiqueta="Desde" valor={f.desde ?? ''} onChange={(x) => cambiar({ desde: x || null })} />
        <SelectorDeHora etiqueta="Hasta" valor={f.hasta ?? ''} onChange={(x) => cambiar({ hasta: x || null })} />
      </>
    );
  }

  if (seccion === 'actividades') {
    const a = datos as unknown as ActividadDelReporte;
    return (
      <>
        {escrito(a.itemEscrito, 'Ítem en el reporte')}
        <Selector
          etiqueta="Actividad"
          valor={a.clave}
          opciones={OPCIONES_DE_ACTIVIDAD}
          onChange={(x) => cambiar({ clave: x })}
          vacio="Elija la actividad"
          ancho={320}
        />
        <CampoNumero etiqueta="Cantidad" valor={a.cantidad} onChange={(n) => cambiar({ cantidad: n })} editable />
      </>
    );
  }

  if (seccion === 'ensayos') {
    const e = datos as unknown as EnsayoDelReporte;
    return (
      <>
        {escrito(e.escrito, 'En el reporte')}
        <Selector
          etiqueta="Ensayo"
          valor={e.ensayo}
          opciones={OPCIONES_DE_ENSAYO}
          onChange={(x) => cambiar({ ensayo: x })}
          vacio="Elija el ensayo"
          ancho={260}
        />
        <SelectorDeHora etiqueta="Inicio" valor={e.horaInicio ?? ''} onChange={(x) => cambiar({ horaInicio: x || null })} />
        {/* Opcional desde la spec 025 (RF-29). */}
        <SelectorDeHora etiqueta="Fin (opcional)" valor={e.horaFin ?? ''} onChange={(x) => cambiar({ horaFin: x || null })} />
        <Campo
          etiqueta="Responsable"
          valor={e.responsable ?? ''}
          onChange={(x) => cambiar({ responsable: x || null })}
          ancho={220}
        />
        <CampoDeUbicacion valor={e.ubicacion} onChange={(u) => cambiar({ ubicacion: u })} />
        {/* En casillas propias (spec 025, RF-27, RF-34 a RF-36). */}
        <CampoNumero etiqueta="Edad (días)" valor={e.edadDias} onChange={(n) => cambiar({ edadDias: n })} editable ancho={110} />
        <CampoNumero etiqueta="Resultado" valor={e.resultado} onChange={(n) => cambiar({ resultado: n })} editable ancho={110} />
        <Campo etiqueta="Unidad" valor={e.unidad ?? ''} onChange={(x) => cambiar({ unidad: x || null })} ancho={100} />
        <Selector
          etiqueta="¿Cumple?"
          valor={e.cumple ?? null}
          opciones={OPCIONES_DE_CUMPLE}
          onChange={(x) => cambiar({ cumple: x === 'si' || x === 'no' ? x : null })}
          vacio="No se sabe"
          permiteVacio
          ancho={150}
        />
        <Campo
          etiqueta="Observación"
          valor={e.observacion ?? ''}
          onChange={(x) => cambiar({ observacion: x || null })}
          ancho={320}
        />
      </>
    );
  }

  if (seccion === 'almacen') {
    const m = datos as unknown as MovimientoDelReporte;
    return (
      <>
        {escrito(m.escrito, 'Material en el reporte')}
        <Selector
          etiqueta="Material"
          valor={m.materialId}
          opciones={opciones.almacen.map((x) => ({ valor: x.id, etiqueta: x.nombre }))}
          onChange={(x) => cambiar({ materialId: x, materialNuevo: null })}
          vacio="Elija el material"
          ancho={260}
        />
        <Campo
          etiqueta={m.tipo === 'salida' ? 'Recibido por' : 'Entregado por'}
          valor={m.responsable ?? ''}
          onChange={(x) => cambiar({ responsable: x })}
          ancho={220}
        />
        {m.tipo === 'salida' ? (
          <Campo etiqueta="Para qué" valor={m.paraQue ?? ''} onChange={(x) => cambiar({ paraQue: x })} ancho={260} />
        ) : null}
      </>
    );
  }

  return <Ayuda>Este renglón no se completa aquí.</Ayuda>;
}
