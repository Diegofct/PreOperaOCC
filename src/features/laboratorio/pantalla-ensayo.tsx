/**
 * Un ensayo de granulometría: registrarlo, corregirlo y verlo (spec 018, RF-20 a
 * RF-32, RF-43, RF-52 a RF-56, RF-61 a RF-69).
 *
 * ── Se calcula mientras se escribe ──
 *
 * Cada tecla recalcula con `calcularGranulometria`, la misma función que el servidor
 * usa al guardar (RF-43): lo que se ve antes de guardar es lo que queda guardado. Y
 * cada tecla revalida con `validarEnsayo` en modo borrador, así que un error sale
 * debajo de su casilla sin esperar a pulsar nada.
 *
 * ── Qué se guarda ──
 *
 * Todo lo del formulario, cada vez: masas y retenidos enteros, con `null` en lo que
 * está vacío. El servidor lo funde, lo vuelve a validar y a calcular, y devuelve el
 * ensayo tal como quedó. Un borrador se puede guardar a medias (RF-31).
 *
 * ── La franja ──
 *
 * Mientras no se cambie, se juzga con la **copia** guardada en el ensayo, aunque el
 * catálogo haya cambiado (RF-21). Si se escoge otra, con la del catálogo (RF-22).
 *
 * ── Solo se escribe lo que se puede ──
 *
 * Borrador o devuelto, y quien tiene `escribir` en Laboratorio: lo demás se ve pero
 * no se toca. Los pasos del flujo —enviar, aprobar, devolver, anular, descartar— y la
 * historia viven en `acciones-ensayo.tsx`.
 */
import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useState } from 'react';
import { View } from 'react-native';

import { Spacing } from '@/constants/theme';
import {
  franjaPorId,
  FRANJAS_GRANULOMETRICAS,
  type FranjaGranulometrica,
} from '@/shared/catalogos/franjas-granulometricas';
import { SERIE_DE_TAMICES, tamizPorId, type IdTamiz } from '@/shared/catalogos/tamices';
import {
  calcularGranulometria,
  ETIQUETA_ESTADO_ENSAYO,
  formatearNumero,
  leerMasa,
  TOLERANCIA_DE_LAVADO,
  transicionPermitida,
  validarEnsayo,
  type MasasDelEnsayo,
  type ResultadoGranulometria,
  type RetenidosDelEnsayo,
} from '@/shared/rules/granulometria';
import { fechaDeJornada } from '@/shared/rules/jornada';
import { alcanza } from '@/shared/rules/permisos';

import { api, ErrorApi, mensajeDe } from '@/features/panel/cliente-api';
import {
  Acciones,
  AccionesFormulario,
  Aviso,
  Boton,
  Campo,
  Cifra,
  Cifras,
  Formulario,
  Seccion,
  Selector,
} from '@/features/panel/componentes';
import type { EnsayoDetalle } from '@/features/panel/contratos';
import { MarcoPantalla, useListado } from '@/features/panel/marco';
import { usePersona } from '@/features/panel/sesion';

import { AccionesDelEnsayo, HistoriaDelEnsayo } from './acciones-ensayo';
import { CurvaGranulometrica } from './curva-granulometrica';
import { EtiquetaDeEstado, EtiquetaDeVeredicto } from './etiquetas';
import { TablaDeTamices } from './tabla-tamices';

const CLAVES_DE_MASA = ['humeda', 'seca', 'tara', 'lavada'] as const;

const ROTULO_DE_MASA: Record<keyof MasasDelEnsayo, string> = {
  humeda: 'Masa inicial húmeda (g)',
  seca: 'Masa inicial seca, M1 (g)',
  tara: 'Tara (g)',
  lavada: 'Masa seca después del lavado, M2 (g)',
};

/** Lo que hay en las casillas, tal cual se escribió. */
interface Casillas {
  material: string;
  fuente: string;
  localizacion: string;
  numeroInforme: string;
  fechaRecepcion: string;
  fechaEjecucion: string;
  franjaId: string | null;
  masas: Record<keyof MasasDelEnsayo, string>;
  retenidos: Record<IdTamiz, string>;
  observaciones: string;
}

/** Una masa guardada, como texto de casilla: con coma, como se escribe en Colombia. */
function enCasilla(valor: number | null | undefined): string {
  return valor === null || valor === undefined ? '' : String(valor).replace('.', ',');
}

function desdeDetalle(d: EnsayoDetalle): Casillas {
  return {
    material: d.material ?? '',
    fuente: d.fuente ?? '',
    localizacion: d.localizacion ?? '',
    numeroInforme: d.numeroInforme ?? '',
    fechaRecepcion: d.fechaRecepcion ?? '',
    fechaEjecucion: d.fechaEjecucion ?? '',
    franjaId: d.franjaId,
    masas: {
      humeda: enCasilla(d.masas.humeda),
      seca: enCasilla(d.masas.seca),
      tara: enCasilla(d.masas.tara),
      lavada: enCasilla(d.masas.lavada),
    },
    retenidos: Object.fromEntries(
      SERIE_DE_TAMICES.map((t) => [t.id, enCasilla(d.retenidos[t.id])]),
    ) as Record<IdTamiz, string>,
    observaciones: d.observaciones ?? '',
  };
}

const textoONulo = (texto: string) => (texto.trim() === '' ? null : texto.trim());

export default function PantallaEnsayo() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const ensayo = useListado<EnsayoDetalle>(
    useCallback(() => api.laboratorio.detalle(id).then((d) => [d]), [id]),
  );
  const detalle = ensayo.datos[0];
  // RF-93: lo que dijo el servidor cuando otro se adelantó. Vive aquí y no en el
  // formulario porque el formulario se rearma al recargar.
  const [adelanto, setAdelanto] = useState<string | null>(null);

  return (
    <MarcoPantalla
      modulo="laboratorio"
      exigeObra
      titulo={
        detalle?.numeroInforme ? `Ensayo ${detalle.numeroInforme}` : 'Ensayo de granulometría'
      }
      descripcion="Determinación de los tamaños de las partículas de suelos — INV E-123-13."
      error={ensayo.error}
      cargando={ensayo.cargando}
    >
      {/*
       * Con clave: al cambiar de ensayo, o al volver a pedirlo porque otro se adelantó
       * (RF-93), el formulario arranca de lo que dice el servidor y no de lo de antes.
       */}
      {adelanto ? (
        <Aviso tono="info">{`Otra persona actuó sobre este ensayo mientras usted lo tenía abierto. ${adelanto} Esto es lo que hay ahora.`}</Aviso>
      ) : null}
      {detalle ? (
        <FormularioDeEnsayo
          key={`${detalle.id}-${detalle.estado}-${detalle.historia.length}`}
          inicial={detalle}
          onRecargar={(motivo) => {
            setAdelanto(motivo);
            ensayo.recargar();
          }}
        />
      ) : null}
    </MarcoPantalla>
  );
}

function FormularioDeEnsayo({
  inicial,
  onRecargar,
}: {
  inicial: EnsayoDetalle;
  onRecargar: (motivo: string) => void;
}) {
  const { rol } = usePersona();
  const [detalle, setDetalle] = useState(inicial);
  const [valores, setValores] = useState<Casillas>(() => desdeDetalle(inicial));
  const [guardando, setGuardando] = useState(false);
  const [mensaje, setMensaje] = useState<{ tono: 'exito' | 'error'; texto: string } | null>(null);
  const [erroresDelServidor, setErroresDelServidor] = useState<Record<string, string>>({});

  const editable =
    alcanza(rol, 'laboratorio', 'escribir') && transicionPermitida(detalle.estado, 'editar');

  function cambiar<K extends keyof Casillas>(campo: K, valor: Casillas[K]) {
    setValores((v) => ({ ...v, [campo]: valor }));
    setMensaje(null);
  }

  // Lo digitado, leído. Una casilla que no es número cuenta como vacía para el cálculo
  // y se marca aparte.
  const erroresDeLectura: Record<string, string> = {};
  const leer = (campo: string, texto: string): number | null => {
    const lectura = leerMasa(texto);
    if ('error' in lectura) {
      erroresDeLectura[campo] = lectura.error;
      return null;
    }
    return lectura.valor;
  };
  const masas = Object.fromEntries(
    CLAVES_DE_MASA.map((k) => [k, leer(`masas.${k}`, valores.masas[k])]),
  ) as unknown as MasasDelEnsayo;
  const retenidos = Object.fromEntries(
    SERIE_DE_TAMICES.map((t) => [t.id, leer(`retenidos.${t.id}`, valores.retenidos[t.id])]),
  ) as RetenidosDelEnsayo;

  // RF-21 y RF-22: la copia guardada mientras no se cambie la franja.
  const franja: FranjaGranulometrica | null =
    valores.franjaId === null
      ? null
      : valores.franjaId === detalle.franjaId
        ? detalle.franjaCopia
        : (franjaPorId(valores.franjaId) ?? null);

  const resultado = calcularGranulometria({ masas, retenidos }, franja);

  const ensayoALeer = {
    material: textoONulo(valores.material),
    fuente: textoONulo(valores.fuente),
    localizacion: textoONulo(valores.localizacion),
    numeroInforme: textoONulo(valores.numeroInforme),
    fechaRecepcion: textoONulo(valores.fechaRecepcion),
    fechaEjecucion: textoONulo(valores.fechaEjecucion),
    franjaId: valores.franjaId,
    masas,
    retenidos,
  };
  // Las fechas mal escritas no llegan a la regla: se dicen aquí.
  const erroresDeFecha: Record<string, string> = {};
  for (const campo of ['fechaRecepcion', 'fechaEjecucion'] as const) {
    const fecha = ensayoALeer[campo];
    if (fecha !== null && !/^\d{4}-\d{2}-\d{2}$/.test(fecha)) {
      erroresDeFecha[campo] = 'La fecha va en formato AAAA-MM-DD.';
      ensayoALeer[campo] = null;
    }
  }
  const erroresDeRegla = Object.fromEntries(
    validarEnsayo(ensayoALeer, fechaDeJornada(), 'borrador').map((e) => [e.campo, e.mensaje]),
  );
  const errores: Record<string, string> = {
    ...erroresDelServidor,
    ...erroresDeRegla,
    ...erroresDeFecha,
    ...erroresDeLectura,
  };
  const hayErrores = Object.keys(errores).length > 0;
  const sinGuardar = JSON.stringify(valores) !== JSON.stringify(desdeDetalle(detalle));

  /** Tras un paso del flujo: lo que dejó el servidor manda en toda la pantalla. */
  function trasElPaso(nuevo: EnsayoDetalle) {
    setDetalle(nuevo);
    setValores(desdeDetalle(nuevo));
    setErroresDelServidor({});
    setMensaje({
      tono: 'exito',
      texto: `Listo: el ensayo quedó ${ETIQUETA_ESTADO_ENSAYO[nuevo.estado].toLowerCase()}.`,
    });
  }

  async function guardar() {
    if (hayErrores) {
      setMensaje({ tono: 'error', texto: 'Revise las casillas marcadas antes de guardar.' });
      return;
    }
    setGuardando(true);
    setMensaje(null);
    setErroresDelServidor({});
    try {
      const guardado = await api.laboratorio.corregir(detalle.id, {
        ...ensayoALeer,
        observaciones: textoONulo(valores.observaciones),
      });
      setDetalle(guardado);
      setMensaje({ tono: 'exito', texto: 'Borrador guardado. Los cálculos los hizo el servidor.' });
    } catch (fallo) {
      if (fallo instanceof ErrorApi && fallo.campos) setErroresDelServidor(fallo.campos);
      setMensaje({ tono: 'error', texto: mensajeDe(fallo) });
    } finally {
      setGuardando(false);
    }
  }

  return (
    <>
      <View style={{ flexDirection: 'row', gap: Spacing.two, flexWrap: 'wrap' }}>
        <EtiquetaDeEstado estado={detalle.estado} />
        <EtiquetaDeVeredicto
          veredicto={resultado.completo ? (resultado.veredicto?.global ?? null) : null}
        />
      </View>
      <Acciones>
        <Boton
          titulo="Informe para imprimir"
          tono="secundario"
          onPress={() =>
            router.push({ pathname: '/panel/laboratorio/[id]/informe', params: { id: detalle.id } })
          }
        />
      </Acciones>
      {mensaje ? <Aviso tono={mensaje.tono}>{mensaje.texto}</Aviso> : null}
      <AccionesDelEnsayo
        detalle={detalle}
        rol={rol}
        sinGuardar={editable && sinGuardar}
        onCambiado={trasElPaso}
        onRecargar={onRecargar}
      />
      {!editable && transicionPermitida(detalle.estado, 'editar') ? (
        <Aviso tono="info">
          Usted puede ver este ensayo; lo registra y corrige el laboratorista.
        </Aviso>
      ) : null}

      <Seccion titulo="Muestra">
        <Formulario>
          <Campo
            etiqueta="Obra"
            valor={`${detalle.obraCodigo} · ${detalle.obraNombre}`}
            onChange={() => {}}
            soloLectura
            ancho={300}
          />
          <Campo
            etiqueta="Descripción del material"
            valor={valores.material}
            onChange={(v) => cambiar('material', v)}
            soloLectura={!editable}
            error={errores.material}
            ancho={300}
          />
          <Campo
            etiqueta="Fuente"
            valor={valores.fuente}
            onChange={(v) => cambiar('fuente', v)}
            soloLectura={!editable}
            error={errores.fuente}
            ancho={260}
          />
          <Campo
            etiqueta="Localización"
            valor={valores.localizacion}
            onChange={(v) => cambiar('localizacion', v)}
            soloLectura={!editable}
            error={errores.localizacion}
            ancho={300}
          />
          <Campo
            etiqueta="N.º de informe"
            valor={valores.numeroInforme}
            onChange={(v) => cambiar('numeroInforme', v)}
            soloLectura={!editable}
            error={errores.numeroInforme}
            ancho={150}
          />
          <Campo
            etiqueta="Fecha de recepción"
            valor={valores.fechaRecepcion}
            onChange={(v) => cambiar('fechaRecepcion', v)}
            ayuda="AAAA-MM-DD"
            soloLectura={!editable}
            error={errores.fechaRecepcion}
            ancho={170}
          />
          <Campo
            etiqueta="Fecha de ejecución"
            valor={valores.fechaEjecucion}
            onChange={(v) => cambiar('fechaEjecucion', v)}
            ayuda="AAAA-MM-DD"
            soloLectura={!editable}
            error={errores.fechaEjecucion}
            ancho={170}
          />
          {editable ? (
            <Selector
              etiqueta="Franja de la especificación"
              valor={valores.franjaId}
              opciones={FRANJAS_GRANULOMETRICAS.map((f) => ({ valor: f.id, etiqueta: f.nombre }))}
              onChange={(v) => cambiar('franjaId', v)}
              permiteVacio
              vacio="Sin escoger"
              error={errores.franja}
              ancho={300}
            />
          ) : (
            <Campo
              etiqueta="Franja de la especificación"
              valor={franja?.nombre ?? 'Sin escoger'}
              onChange={() => {}}
              soloLectura
              ancho={300}
            />
          )}
        </Formulario>
      </Seccion>

      <Seccion titulo="Masas">
        <Formulario>
          {CLAVES_DE_MASA.map((clave) => (
            <Campo
              key={clave}
              etiqueta={ROTULO_DE_MASA[clave]}
              valor={valores.masas[clave]}
              onChange={(v) => cambiar('masas', { ...valores.masas, [clave]: v })}
              soloLectura={!editable}
              error={errores[`masas.${clave}`]}
              ancho={clave === 'lavada' ? 300 : 220}
            />
          ))}
        </Formulario>
      </Seccion>

      <Seccion titulo="Tamices">
        <TablaDeTamices
          retenidos={valores.retenidos}
          onCambiar={(tamiz, texto) =>
            cambiar('retenidos', { ...valores.retenidos, [tamiz]: texto })
          }
          editable={editable}
          resultado={resultado}
          franja={franja}
          errores={errores}
        />
        {errores.retenidos ? <Aviso tono="error">{errores.retenidos}</Aviso> : null}
      </Seccion>

      <Seccion titulo="Resultados">
        <Resultados resultado={resultado} />
      </Seccion>

      <Seccion titulo="Curva granulométrica">
        <CurvaGranulometrica resultado={resultado} franja={franja} />
      </Seccion>

      <Seccion titulo="Observaciones">
        <Formulario>
          <Campo
            etiqueta="Observaciones"
            valor={valores.observaciones}
            onChange={(v) => cambiar('observaciones', v)}
            multilinea
            soloLectura={!editable}
          />
          {editable ? (
            <AccionesFormulario>
              <Acciones>
                <Boton
                  titulo={guardando ? 'Guardando…' : 'Guardar borrador'}
                  onPress={guardar}
                  deshabilitado={guardando}
                />
              </Acciones>
            </AccionesFormulario>
          ) : null}
        </Formulario>
      </Seccion>

      <HistoriaDelEnsayo detalle={detalle} />
    </>
  );
}

/** Humedad, tamaños, lavado y veredicto: lo que la hoja ponía al lado de la tabla. */
function Resultados({ resultado }: { resultado: ResultadoGranulometria }) {
  if (!resultado.completo) {
    return (
      <Aviso tono="info">
        {`Los resultados aparecen cuando estén todas las masas. Falta ${resultado.faltan.slice(0, 3).join(', ')}${resultado.faltan.length > 3 ? ` y ${resultado.faltan.length - 3} más` : ''}.`}
      </Aviso>
    );
  }

  const nombreDe = (id: string) => tamizPorId(id)?.nombre ?? id;
  const tm = resultado.tamanoMaximo;
  const lavado = resultado.lavado;
  const veredicto = resultado.veredicto;
  const fuera = veredicto?.tamices.filter((t) => t.posicion !== 'dentro') ?? [];

  return (
    <>
      <Cifras>
        <Cifra
          titulo="Humedad"
          valor={resultado.humedad === null ? '—' : `${formatearNumero(resultado.humedad, 1)} %`}
          pie={resultado.humedad === null ? 'Falta la masa húmeda' : 'Informativa'}
        />
        <Cifra
          titulo="Masa seca sin tara"
          valor={`${formatearNumero(resultado.masaSinTara, 1)} g`}
          pie={`Retenido total: ${formatearNumero(resultado.sumaRetenida, 1)} g`}
        />
        <Cifra
          titulo="Tamaño máximo"
          valor={'tamiz' in tm ? nombreDe(tm.tamiz) : `> ${nombreDe(tm.mayorQue)}`}
          pie="El menor tamiz por el que pasa todo"
        />
        <Cifra
          titulo="Tamaño máximo nominal"
          valor={resultado.tamanoMaximoNominal ? nombreDe(resultado.tamanoMaximoNominal) : '—'}
          pie="El mayor tamiz que retiene material"
        />
        <Cifra
          titulo="Veredicto"
          valor={veredicto ? (veredicto.global === 'cumple' ? '✓ CUMPLE' : '✗ NO CUMPLE') : '—'}
          pie={
            veredicto
              ? fuera.length === 0
                ? 'Todos los tamices dentro de la franja'
                : `Fuera: ${fuera.map((t) => nombreDe(t.tamiz)).join(', ')}`
              : 'Escoja la franja para juzgar'
          }
          tono={veredicto ? (veredicto.global === 'cumple' ? 'bueno' : 'malo') : 'neutro'}
        />
      </Cifras>
      {lavado ? (
        lavado.aviso ? (
          <Aviso tono="error">
            {`Control de lavado: lo tamizado se aleja ${formatearNumero(lavado.porcentaje, 2)} % de la masa lavada (M2), más del ${formatearNumero(TOLERANCIA_DE_LAVADO, 1)} % que admite la INV E-123. ${lavado.diferencia > 0 ? `Faltan ${formatearNumero(lavado.diferencia, 1)} g` : `Sobran ${formatearNumero(-lavado.diferencia, 1)} g`}. Se puede guardar y enviar igual; la decisión de repetir el ensayo es del laboratorio.`}
          </Aviso>
        ) : (
          <Aviso tono="info">
            {`Control de lavado: diferencia de ${formatearNumero(Math.abs(lavado.diferencia), 1)} g (${formatearNumero(lavado.porcentaje, 2)} % de M2), dentro del ${formatearNumero(TOLERANCIA_DE_LAVADO, 1)} %.`}
          </Aviso>
        )
      ) : (
        <Aviso tono="info">
          Sin la masa después del lavado (M2) no se puede comprobar el tamizado.
        </Aviso>
      )}
    </>
  );
}
