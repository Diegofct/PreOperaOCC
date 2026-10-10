/**
 * La pestaña «Creado automáticamente» del módulo de WhatsApp (spec 024, RF-32 a RF-36,
 * RF-75, RF-76).
 *
 * Lo que el sistema registró solo —personas, volquetas, materiales y sitios— para que
 * quien atiende el módulo lo revise. Si está bien, «Revisado» lo saca de la lista. Si
 * era alguien o algo que ya existía, «Es el mismo que…» pasa al registro bueno lo que lo
 * usaba (los viajes se anulan y se registran de nuevo; lo de bitácoras cerradas no se
 * toca) y da de baja lo creado.
 *
 * Las opciones para unir son de la misma obra: personas y vehículos de sus listados,
 * materiales y sitios de cantera y materiales de almacén del detalle del mensaje.
 */
import { useCallback, useState } from 'react';

import { alcanza } from '@/shared/rules/permisos';
import type { TipoCreado } from '@/shared/rules/whatsapp-automatico';

import { api, mensajeDe } from '../cliente-api';
import {
  Acciones,
  Aviso,
  Ayuda,
  Boton,
  Celda,
  Modal,
  Seccion,
  Selector,
  Tabla,
  type Columna,
  type Opcion,
  Paginacion,
} from '../componentes';
import type { CreadoFila } from '../contratos';
import { useListado } from '../marco';
import { CamposDeFechas, useFiltroDeFechas } from './filtro-de-fechas';
import { usePersona } from '../sesion';
import { POR_PAGINA, usePaginacion } from '../usar-listado-filtrado';

const NOMBRE_DEL_TIPO: Record<TipoCreado, string> = {
  persona: 'Persona',
  vehiculo: 'Volqueta',
  material_cantera: 'Material de cantera',
  sitio_cantera: 'Sitio de cantera',
  material_almacen: 'Material de almacén',
};

function dia(iso: string): string {
  return new Date(iso).toLocaleDateString('es-CO', { timeZone: 'America/Bogota', day: 'numeric', month: 'short' });
}

/** Una fila de la tabla, con un id que la tabla pueda usar. */
type FilaCreada = CreadoFila & { id: string };

export function CreadoAutomaticamente({ opcionesDeObra }: { opcionesDeObra: Opcion[] }) {
  const { rol } = usePersona();
  const esGerencia = alcanza(rol, 'obras', 'listar');
  const puedeAtender = alcanza(rol, 'whatsapp', 'aprobar');

  const [obraId, setObraId] = useState<string | null>(null);
  const [uniendo, setUniendo] = useState<FilaCreada | null>(null);
  const [hecho, setHecho] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // El rango de días en que se creó (spec 025, RF-47). Lo de antes sin revisar se avisa.
  const fechas = useFiltroDeFechas();
  const { desde, hasta } = fechas.consultado;
  const [anteriores, setAnteriores] = useState(0);
  const lista = useListado<FilaCreada>(
    useCallback(
      () =>
        api.whatsapp.creados.listar(obraId, { desde, hasta }).then((r) => {
          setAnteriores(r.anterioresSinRevisar);
          return r.creados.map((c) => ({ ...c, id: `${c.tipo}|${c.registroId}` }));
        }),
      [obraId, desde, hasta],
    ),
  );

  async function revisado(c: FilaCreada) {
    setError(null);
    try {
      await api.whatsapp.creados.revisado(c.tipo, c.registroId);
      setHecho(`«${c.nombre}» quedó revisado.`);
      lista.recargar();
    } catch (fallo) {
      setError(mensajeDe(fallo));
    }
  }

  const columnas: Columna<FilaCreada>[] = [
    {
      clave: 'creado',
      titulo: 'Creado',
      ancho: 90,
      ordenar: (c) => c.creadoEn,
      pintar: (c) => <Celda>{dia(c.creadoEn)}</Celda>,
    },
    {
      clave: 'que',
      titulo: 'Qué',
      ancho: 260,
      anchoMinimo: 180,
      pintar: (c) => (
        <>
          <Celda lineas={2}>{c.nombre}</Celda>
          <Celda lineas={2}>{[NOMBRE_DEL_TIPO[c.tipo], c.detalle].filter(Boolean).join(' · ')}</Celda>
        </>
      ),
    },
    {
      clave: 'obra',
      titulo: 'Obra y mensaje',
      ancho: 200,
      pintar: (c) => (
        <>
          <Celda lineas={2}>{c.obraNombre}</Celda>
          <Celda lineas={2}>{`De un mensaje de ${c.autorDelMensaje ?? 'alguien sin nombre'}`}</Celda>
        </>
      ),
    },
    {
      clave: 'acciones',
      titulo: '',
      ancho: 230,
      anchoMinimo: 200,
      pintar: (c) =>
        puedeAtender ? (
          <Acciones>
            <Boton titulo="Revisado" onPress={() => revisado(c)} />
            <Boton titulo="Es el mismo que…" tono="secundario" onPress={() => setUniendo(c)} />
          </Acciones>
        ) : null,
    },
  ];

  // Páginas de 15 (spec 025, RF-55 a RF-58).
  const paginaDeCreados = usePaginacion(lista.datos);

  return (
    <Seccion titulo="Creado automáticamente">
      <Ayuda>
        Lo que el sistema registró solo porque no existía. Si está bien, márquelo revisado. Si era alguien o algo que ya
        estaba registrado con otro nombre, use «Es el mismo que…».
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
      {error ? <Aviso tono="error">{error}</Aviso> : null}
      {lista.error ? <Aviso tono="error">{lista.error}</Aviso> : null}
      {anteriores > 0 ? (
        <Aviso tono="info">
          {`Hay ${anteriores} sin revisar de días anteriores al ${desde}. Cambie «Desde» para verl${anteriores === 1 ? 'o' : 'os'}.`}
        </Aviso>
      ) : null}
      <>
        <Tabla
          columnas={columnas}
          filas={paginaDeCreados.pagina}
          vacio={`No hay nada creado automáticamente por revisar entre el ${desde} y el ${hasta}.`}
        />
        <Paginacion
          pagina={paginaDeCreados.paginaActual}
          porPagina={POR_PAGINA}
          total={paginaDeCreados.total}
          onCambiar={paginaDeCreados.irAPagina}
        />
      </>
      {uniendo ? (
        <VentanaUnir
          creado={uniendo}
          alCerrar={() => setUniendo(null)}
          alUnir={(texto) => {
            setHecho(texto);
            setUniendo(null);
            lista.recargar();
          }}
        />
      ) : null}
    </Seccion>
  );
}

/** Las opciones con las que se puede unir lo creado: del mismo tipo y de la misma obra. */
function useCandidatos(creado: CreadoFila): { opciones: Opcion[]; cargando: boolean; error: string | null } {
  const cargar = useCallback(async (): Promise<Opcion[]> => {
    const fuera = (o: Opcion) => o.valor !== creado.registroId;
    if (creado.tipo === 'persona') {
      const personas = await api.personas.listar();
      return personas
        .filter((p) => p.obraId === creado.obraId && !p.desdeWhatsapp)
        .map((p) => ({ valor: p.id, etiqueta: p.nombreCompleto }))
        .filter(fuera);
    }
    if (creado.tipo === 'vehiculo') {
      const vehiculos = await api.vehiculos.listar();
      return vehiculos
        .filter((v) => v.obraId === creado.obraId)
        .map((v) => ({ valor: v.id, etiqueta: v.placa ? `${v.codigoInterno} · ${v.placa}` : v.codigoInterno }))
        .filter(fuera);
    }
    const { opciones } = await api.whatsapp.propuestas.ver(creado.mensajeId);
    const lista =
      creado.tipo === 'material_cantera'
        ? opciones.cantera.materiales
        : creado.tipo === 'sitio_cantera'
          ? opciones.cantera.sitios
          : opciones.almacen;
    return lista.map((x) => ({ valor: x.id, etiqueta: x.nombre })).filter(fuera);
  }, [creado]);
  const datos = useListado<Opcion[]>(useCallback(() => cargar().then((o) => [o]), [cargar]));
  return { opciones: datos.datos[0] ?? [], cargando: datos.cargando, error: datos.error };
}

/** «Es el mismo que…» (RF-36, RF-75, RF-76). */
function VentanaUnir({
  creado,
  alCerrar,
  alUnir,
}: {
  creado: CreadoFila;
  alCerrar: () => void;
  alUnir: (texto: string) => void;
}) {
  const candidatos = useCandidatos(creado);
  const [elegido, setElegido] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [uniendo, setUniendo] = useState(false);

  async function unir() {
    if (!elegido) return;
    setUniendo(true);
    setError(null);
    try {
      const r = await api.whatsapp.creados.unir(creado.tipo, creado.registroId, elegido);
      const nombre = candidatos.opciones.find((o) => o.valor === elegido)?.etiqueta ?? 'el registro elegido';
      const partes = [
        r.viajes ? `${r.viajes} ${r.viajes === 1 ? 'viaje anulado y registrado' : 'viajes anulados y registrados'} de nuevo` : null,
        r.bitacoras ? `${r.bitacoras} ${r.bitacoras === 1 ? 'bitácora corregida' : 'bitácoras corregidas'}` : null,
        r.movimientos ? `${r.movimientos} ${r.movimientos === 1 ? 'movimiento pasado' : 'movimientos pasados'}` : null,
        r.sinTocar ? `${r.sinTocar} sin tocar porque su bitácora está cerrada` : null,
      ].filter(Boolean);
      alUnir(`«${creado.nombre}» quedó unido con ${nombre}.${partes.length ? ` ${partes.join('; ')}.` : ''}`);
    } catch (fallo) {
      setError(mensajeDe(fallo));
    } finally {
      setUniendo(false);
    }
  }

  return (
    <Modal titulo="Es el mismo que…" onCerrar={alCerrar}>
      <Ayuda>
        {`«${creado.nombre}» (${NOMBRE_DEL_TIPO[creado.tipo].toLowerCase()}) es el mismo que el registro que elija. Lo que lo usaba pasa a ese registro —los viajes se anulan y se registran de nuevo, y lo de bitácoras cerradas no se toca— y «${creado.nombre}» se da de baja.`}
      </Ayuda>
      {candidatos.error ? <Aviso tono="error">{candidatos.error}</Aviso> : null}
      <Selector
        etiqueta="Es el mismo que"
        valor={elegido}
        opciones={candidatos.opciones}
        onChange={setElegido}
        vacio={candidatos.cargando ? 'Cargando…' : 'Elija el registro'}
        ancho={320}
      />
      {error ? <Aviso tono="error">{error}</Aviso> : null}
      <Acciones>
        <Boton titulo={uniendo ? 'Uniendo…' : 'Unir'} deshabilitado={!elegido || uniendo} onPress={unir} />
        <Boton titulo="Cancelar" tono="secundario" onPress={alCerrar} />
      </Acciones>
    </Modal>
  );
}
