/**
 * El parte diario de obra.
 *
 * Sustituye a la bitácora por máquina. Lo que antes era un documento por equipo
 * y día es ahora uno por **obra** y día, con la maquinaria dentro como una
 * sección entre siete: maquinaria, personal, actividades, clima, control de calidad,
 * notas y la fotografía del día.
 *
 * ── Por qué cada sección guarda por su cuenta ──
 *
 * El parte se llena a lo largo de la tarde, no de una sentada: el residente
 * apunta las máquinas a media mañana, el personal cuando sale la gente y las
 * actividades al final. Un único botón de guardar al fondo obligaría a tenerlo
 * todo escrito antes de asegurar nada, y una tarde de trabajo se pierde con
 * cerrar el navegador. Cada sección viaja sola y reemplaza solo lo suyo.
 *
 * ── Sobre el día ──
 *
 * La fecha por defecto la decide el servidor, no este navegador: quien mira el
 * panel puede estar en otra ciudad y el parte es de la jornada de la obra.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";

import { Colors, Spacing, TextoPanel } from "@/constants/theme";
import { idDeFila, type ViajeDelParte } from "@/features/bitacoras/tipos";
import { formatearAbscisa } from "@/shared/rules/cantera";
import {
  CONDICIONES_CLIMA,
  ENSAYOS_DE_CALIDAD,
} from "@/shared/catalogos/bitacora";
import {
  desglosarJornada,
  horasLegibles,
  validarFranjas,
  mensajeDeFranja,
} from "@/shared/rules/horas";
import {
  avanceDeMedidor,
  ETIQUETA_MEDIDOR,
  fechaDeJornada,
  horasDeMaquina,
  medidorDeClase,
  mensajeDeAvance,
  sumarDias,
  UNIDAD_DE_MEDIDOR,
  validarAvance,
} from "@/shared/rules/jornada";
import { nombreDeCargo } from "@/shared/catalogos/cargos";
import {
  calcularDimensiones,
  resolverCantidad,
  type OrigenDeCantidad,
} from "@/shared/rules/dimensiones";
import {
  ACTIVIDADES_DEL_PRESUPUESTO,
  actividadPorItem,
  CLAVE_OTRA_ACTIVIDAD,
  etiquetaDeActividad,
  etiquetaDeUnidad,
  UNIDADES_DE_ACTIVIDAD,
} from "@/shared/catalogos/presupuesto";
import { alcanza } from "@/shared/rules/permisos";
import {
  bloqueosDelCierre,
  faltaObservacionDelEnsayo,
  faltasDeActividad,
  seccionesDelParte,
  TITULO_DE_SECCION,
  type CampoDeActividad,
} from "@/shared/rules/parte";

import { api, mensajeDe } from "./cliente-api";
import {
  Acciones,
  AccionesFormulario,
  FilaDeFormulario,
  Aviso,
  Boton,
  Campo,
  Casilla,
  Celda,
  Etiqueta,
  Formulario,
  Seccion,
  Selector,
  Tabla,
  type Columna,
} from "./componentes";
import {
  DisposicionConIndice,
  IndiceDeSecciones,
  MarcoDeSecciones,
  PieDeSeccion,
  SeccionEnMarco,
  useSaltoASeccion,
} from "./secciones-con-indice";
import type {
  ActividadDelParteFila,
  BitacoraFila,
  FilaDeControlDeCalidadFila,
  MaterialDelParteFila,
  CanteraDelParteFila,
  DiaDeObra,
  JornadaFila,
  ObraFila,
  ParteFila,
  PersonaFila,
  VehiculoFila,
} from "./contratos";
import { MarcoPantalla, useListado } from "./marco";
import { SubirFoto } from "./subir-foto";
import { usePersona } from "./sesion";

/** Vacío es ausencia, no cero. */
function aNumero(texto: string): number | null {
  const limpio = texto.trim();
  if (limpio === "") return null;
  const valor = Number(limpio);
  return Number.isFinite(valor) ? valor : null;
}

/**
 * Área y volumen de una fila de actividad, tal como los ve quien la llena.
 *
 * Es la misma regla que aplica el servidor al guardar (`calcularDimensiones`),
 * así que lo que la pantalla enseña calculado es lo que queda guardado.
 */
function medidasDe(fila: FilaActividad) {
  return calcularDimensiones({
    longitud: aNumero(fila.longitud),
    ancho: aNumero(fila.ancho),
    alto: aNumero(fila.alto),
    area: aNumero(fila.area),
    volumen: aNumero(fila.volumen),
  });
}

/**
 * La clave de la unidad de una fila: la del presupuesto, la elegida en «otra», o
 * ninguna si todavía no se eligió (spec 004, RF-66, RF-70).
 */
function unidadDe(fila: FilaActividad): string | null {
  if (fila.clave === CLAVE_OTRA_ACTIVIDAD) return fila.unidad || null;
  return actividadPorItem(fila.clave)?.unidad ?? null;
}

/**
 * La cantidad tal como la ve quien llena la fila: tomada de su medida si la unidad
 * la tiene, escrita si no. La misma regla que aplica el servidor (RF-67 a RF-69).
 */
function cantidadDe(fila: FilaActividad) {
  return resolverCantidad(unidadDe(fila), medidasDe(fila), aNumero(fila.cantidad));
}

const AYUDA_DE_CANTIDAD: Record<OrigenDeCantidad, string> = {
  volumen: "Del volumen",
  area: "Del área",
  longitud: "De la longitud",
};

/* ------------------------------------------------------------------------ */

type FilaMaquina = {
  vehiculoId: string;
  inicial: string;
  final: string;
  /** Lo que pasó con la máquina ese día (spec 004, RF-45). */
  observaciones: string;
};
type FilaPersona = { usuarioId: string; entrada: string; salida: string };
type FilaActividad = {
  /**
   * Nace en el navegador al pulsar «Añadir actividad», no al guardar: es a lo
   * que apunta la foto, y así la foto se puede subir antes de guardar
   * (spec 004, RF-47). El servidor lo conserva.
   */
  id: string;
  clave: string;
  texto: string;
  /** La clave de la unidad elegida. Solo en «otra»; en las demás la pone el presupuesto. */
  unidad: string;
  /** Lo escrito a mano. Solo cuenta si no se puede tomar de una medida. */
  cantidad: string;
  descripcion: string;
  observaciones: string;
  longitud: string;
  ancho: string;
  alto: string;
  area: string;
  volumen: string;
  /**
   * La fila tal como se guardó, si es de antes de los catálogos de OCC (RF-71): se
   * enseña de solo lectura y viaja solo con su id, para que el servidor la conserve.
   */
  heredada: ActividadDelParteFila | null;
};
type FilaClima = { condicion: string; desde: string; hasta: string };
type FilaControlDeCalidad = {
  id: string;
  /** El id del catálogo; vacío hasta que se elige. */
  ensayo: string;
  observacion: string;
  /**
   * El material tal como se guardó, si la fila es de antes de que la sección fuera
   * de ensayos (RF-63): se ve de solo lectura y viaja solo con su id.
   */
  heredado: MaterialDelParteFila | null;
};

export default function PantallaPartes() {
  const persona = usePersona();
  const rol = persona?.rol ?? "operador";
  const esGerencia = alcanza(rol, "obras", "escribir");

  const [fecha, setFecha] = useState(fechaDeJornada());
  const [obraId, setObraId] = useState<string | null>(null);

  const dia = useListado<DiaDeObra>(
    useCallback(async () => [await api.partes.delDia(fecha)], [fecha]),
  );
  const vehiculos = useListado<VehiculoFila>(
    useCallback(() => api.vehiculos.listar(), []),
  );
  const personas = useListado<PersonaFila>(
    useCallback(() => api.personas.listar(), []),
  );
  const obras = useListado<ObraFila>(
    useCallback(
      () => (esGerencia ? api.obras.listar() : Promise.resolve([])),
      [esGerencia],
    ),
  );

  const partes = dia.datos[0]?.partes ?? [];
  const parte = partes.find((p) => !p.anuladoEn) ?? partes[0] ?? null;

  const esHoy = fecha === fechaDeJornada();
  const cerrado = Boolean(parte?.cerradoEn);
  const anulado = Boolean(parte?.anuladoEn);
  const editable = Boolean(parte) && !cerrado && !anulado;

  /** Para que el índice pueda llevar la vista a una sección. */
  const desplazamiento = useRef<ScrollView | null>(null);
  const salto = useSaltoASeccion(desplazamiento);
  const [seccionActiva, setSeccionActiva] = useState<string | null>(null);
  /** Bitácoras del formato viejo **cerradas** ese día. Las abiertas no cuentan. */
  const [historicoCerradas, setHistoricoCerradas] = useState(0);

  /**
   * Las fotos del parte, pedidas aquí y no dentro de su sección.
   *
   * Se izaron para que el índice pueda decir si ya hay fotografía del día. La
   * sección las recibe por props y sigue refrescándolas al subir una.
   */
  const fotos = useListado<{
    id: string;
    itemKey: string | null;
    disponible: boolean;
  }>(
    useCallback(
      () => (parte ? api.partes.fotos(parte.id) : Promise.resolve([])),
      [parte],
    ),
  );
  // Las que no llevan `itemKey` son del día; las que lo llevan son de una
  // actividad y se pintan en su fila.
  const fotosDelDia = fotos.datos
    .filter((f) => f.itemKey === null)
    .map((f) => f.id);

  /**
   * Los viajes de cantera del día (spec 010), pedidos aquí por la misma razón que
   * las fotos: el índice necesita su conteo (RF-28). La sección los recibe ya
   * decididos —vigentes, fijados o el aviso— por `canteraDelParte` en el servidor.
   */
  const cantera = useListado<CanteraDelParteFila>(
    useCallback(
      () => (parte ? api.partes.cantera(parte.id).then((c) => [c]) : Promise.resolve([])),
      [parte],
    ),
  );
  const seccionCantera = cantera.datos[0] ?? null;
  // Para el índice: `null` mientras carga («comprobando»); sin entrada si la
  // bitácora se cerró antes del módulo, donde no hay viajes que contar.
  const conteoCantera = cantera.cargando
    ? null
    : seccionCantera?.estado === "antes_del_control"
      ? undefined
      : (seccionCantera?.viajes.length ?? 0);

  /**
   * Lo que el índice enseña. Sale de `shared/rules/parte`, que es la misma regla
   * que decide qué impide cerrar — así el índice y el servidor no discrepan.
   *
   * Refleja **lo guardado**, no lo tecleado: cada sección arranca del parte y a
   * partir de ahí manda lo suyo, y al guardar se recarga el día. Encender una
   * entrada por algo escrito y sin guardar sería decir que está lista cuando
   * todavía se pierde al cerrar el navegador.
   */
  const secciones = seccionesDelParte({
    maquinaria: parte?.maquinaria.length ?? 0,
    personal: parte?.personal.length ?? 0,
    actividades: parte?.actividades.length ?? 0,
    clima: parte?.clima.length ?? 0,
    laboratorio: parte?.laboratorio.length ?? 0,
    notas: parte?.notas ?? "",
    // Con la marca, lo que no se exige sale como «no aplica» (RF-54).
    sinTrabajo: parte?.sinTrabajo ?? false,
    // Todavía no se iza el conteo de fotos: lo hace T17. Hasta entonces es
    // `null`, que la regla traduce a «comprobando» y nunca a «sin registrar».
    fotos: fotos.cargando ? null : fotosDelDia.length,
    historicoCerradas,
    cerrado,
    anulado,
    // Solo hay sección de cantera con un parte en pantalla.
    cantera: parte ? conteoCantera : undefined,
  });

  /**
   * Qué falta para poder cerrar, dicho **antes** de que alguien pulse Cerrar.
   *
   * Sale de `bloqueosDelCierre`, que es literalmente la misma función que llama
   * la ruta de cierre para rechazar. No es una copia ni una aproximación: si el
   * índice dijera una cosa y el servidor otra, el residente no sabría a cuál
   * hacerle caso.
   */
  //
  // Mientras las fotos cargan no se evalúa: diría «falta la fotografía del día»
  // durante el segundo en que todavía no se sabe si la hay.
  const bloqueos =
    parte && !cerrado && !anulado && !fotos.cargando
      ? bloqueosDelCierre(parte, {
          delDia: fotosDelDia.length,
          itemsConFoto: fotos.datos.flatMap((f) => (f.itemKey ? [f.itemKey] : [])),
        })
      : [];

  async function abrir() {
    await dia.ejecutar(() => api.partes.abrir(fecha, obraId ?? undefined));
  }

  return (
    <MarcoPantalla
      modulo="bitacoras"
      titulo="Parte diario de obra"
      descripcion="Qué se hizo hoy en la obra: máquinas, personal, actividades, clima y control de calidad. Se llena a lo largo del día y se cierra al terminar la jornada."
      error={dia.error ?? vehiculos.error ?? personas.error ?? obras.error}
      cargando={dia.cargando || vehiculos.cargando || personas.cargando}
      refDesplazamiento={desplazamiento}
    >
      <Seccion titulo={`Día ${fecha}`}>
        <Acciones>
          <Boton
            titulo="◀ Día anterior"
            tono="secundario"
            onPress={() => setFecha(sumarDias(fecha, -1))}
          />
          <Boton
            titulo="Día siguiente ▶"
            tono="secundario"
            onPress={() => setFecha(sumarDias(fecha, 1))}
            deshabilitado={esHoy}
          />
          {!esHoy ? (
            <Boton
              titulo="Volver a hoy"
              tono="secundario"
              onPress={() => setFecha(fechaDeJornada())}
            />
          ) : null}
        </Acciones>

        {parte ? (
          <View style={estilos.cabecera}>
            <Text style={estilos.obra}>{parte.obraNombre ?? "Sin obra"}</Text>
            {anulado ? (
              <Etiqueta tono="malo">Anulado</Etiqueta>
            ) : cerrado ? (
              <Etiqueta tono="bueno">Cerrado</Etiqueta>
            ) : (
              <Etiqueta tono="atencion">Abierto</Etiqueta>
            )}
            {parte.usuarioNombre ? (
              <Text style={estilos.apoyo}>Lo lleva {parte.usuarioNombre}</Text>
            ) : null}
          </View>
        ) : (
          <Formulario>
            {esGerencia ? (
              <Selector
                etiqueta="Obra"
                valor={obraId}
                opciones={obras.datos.map((o) => ({
                  valor: o.id,
                  etiqueta: o.nombre,
                  detalle: o.codigo,
                }))}
                onChange={setObraId}
                vacio="Elija la obra"
                ancho={260}
              />
            ) : null}
            <AccionesFormulario>
              <Boton
                titulo="Abrir el parte de este día"
                onPress={abrir}
                deshabilitado={esGerencia && !obraId}
              />
            </AccionesFormulario>
          </Formulario>
        )}

        {anulado && parte?.motivoAnulacion ? (
          <Aviso tono="info">Anulado: {parte.motivoAnulacion}</Aviso>
        ) : null}
      </Seccion>

      {parte ? (
        <DisposicionConIndice
          alMedir={salto.alMedirDisposicion}
          indice={
            <IndiceDeSecciones
              secciones={secciones}
              activa={seccionActiva}
              alElegir={(id) => {
                setSeccionActiva(id);
                salto.saltarA(id);
              }}
              pie={
                anulado ? (
                  <Etiqueta tono="neutro">Anulado</Etiqueta>
                ) : cerrado ? (
                  <Etiqueta tono="bueno">Cerrado</Etiqueta>
                ) : (
                  <>
                    <Etiqueta tono="atencion">Falta cerrar</Etiqueta>
                    {bloqueos.map((texto) => (
                      <Text key={texto} style={estilos.bloqueo}>
                        {texto}
                      </Text>
                    ))}
                  </>
                )
              }
            />
          }
        >
          <MarcoDeSecciones>
          <SeccionMaquinaria
            key={`maquinaria-${parte.id}`}
            parte={parte}
            vehiculos={vehiculos.datos.filter(
              (v) => v.obraId === parte.obraId || v.obraId === null,
            )}
            editable={editable}
            alGuardar={dia.recargar}
            alMedir={salto.alMedirBanda}
          />
          <SeccionPersonal
            key={`personal-${parte.id}`}
            parte={parte}
            personas={personas.datos}
            editable={editable}
            alGuardar={dia.recargar}
            alMedir={salto.alMedirBanda}
          />
          <SeccionActividades
            key={`actividades-${parte.id}`}
            parte={parte}
            editable={editable}
            alGuardar={dia.recargar}
            alMedir={salto.alMedirBanda}
          />
          <SeccionClima
            key={`clima-${parte.id}`}
            parte={parte}
            editable={editable}
            alGuardar={dia.recargar}
            alMedir={salto.alMedirBanda}
          />
          <SeccionLaboratorio
            key={`laboratorio-${parte.id}`}
            parte={parte}
            editable={editable}
            alGuardar={dia.recargar}
            alMedir={salto.alMedirBanda}
          />
          <SeccionCantera
            seccion={seccionCantera}
            cargando={cantera.cargando}
            error={cantera.error}
            alMedir={salto.alMedirBanda}
          />
          <SeccionNotas
            key={`notas-${parte.id}`}
            parte={parte}
            editable={editable}
            alGuardar={dia.recargar}
            alMedir={salto.alMedirBanda}
          />
          <SeccionFotoDelDia
            key={`foto-${parte.id}`}
            parte={parte}
            editable={editable}
            alMedir={salto.alMedirBanda}
            fotosDelDia={fotosDelDia}
            alSubir={fotos.recargar}
          />
          <Cierre
            // Lleva la marca de día sin trabajo en su estado: cambiar de día
            // tiene que montarla de nuevo, como a las demás secciones.
            key={`cierre-${parte.id}`}
            parte={parte}
            editable={editable}
            cerrado={cerrado}
            anulado={anulado}
            puedeAnular={alcanza(rol, "bitacoras", "anular")}
            alCambiar={dia.recargar}
            alMedir={salto.alMedirBanda}
          />
          <SeccionHistorico
            fecha={fecha}
            alContar={setHistoricoCerradas}
            alMedir={salto.alMedirBanda}
          />
          </MarcoDeSecciones>
        </DisposicionConIndice>
      ) : null}
    </MarcoPantalla>
  );
}

/* ------------------------------------------------------------------------ */
/* Control Cantera (spec 010)                                                */
/* ------------------------------------------------------------------------ */

/**
 * Los viajes de cantera de ese día en esa obra, **de solo lectura** (RF-26, RF-27).
 *
 * No hay botones: los viajes se registran y se anulan en su módulo, no aquí. Con
 * el parte abierto se ven los vigentes; cerrado, los que quedaron fijados al cerrar
 * (RF-29), aunque después se hayan registrado o anulado otros de ese día (RF-30).
 * Sin viajes, la sección lo dice en vez de quedar en blanco (RF-31, RF-37).
 */
function SeccionCantera({
  seccion,
  cargando,
  error,
  alMedir,
}: {
  seccion: CanteraDelParteFila | null;
  cargando: boolean;
  error: string | null;
  alMedir: (id: string, y: number) => void;
}) {
  const viajes = seccion?.viajes ?? [];

  const columnasCantera: Columna<ViajeDelParte>[] = [
    { clave: "hora", titulo: "Hora", ancho: 70, pintar: (v) => <Celda>{v.hora}</Celda> },
    {
      clave: "volqueta",
      titulo: "Volqueta",
      ancho: 90,
      pintar: (v) => <Celda>{v.volqueta}</Celda>,
    },
    {
      clave: "conductor",
      titulo: "Conductor",
      ancho: 160,
      pintar: (v) => <Celda>{v.conductor}</Celda>,
    },
    {
      clave: "material",
      titulo: "Material",
      ancho: 150,
      pintar: (v) => <Celda>{v.material}</Celda>,
    },
    { clave: "origen", titulo: "Origen", ancho: 160, pintar: (v) => <Celda>{v.origen}</Celda> },
    {
      clave: "destino",
      titulo: "Destino",
      ancho: 180,
      pintar: (v) => (
        <Celda>
          {v.destinoObra && v.pr !== null && v.metros !== null
            ? `Obra, ${formatearAbscisa(v.pr, v.metros)}`
            : (v.destino ?? "—")}
        </Celda>
      ),
    },
  ];

  return (
    <SeccionEnMarco
      id="cantera"
      error={error}
      titulo={`${TITULO_DE_SECCION.cantera} (${viajes.length})`}
      alMedir={alMedir}
    >
      {cargando ? (
        <Aviso tono="info">Cargando los viajes de cantera…</Aviso>
      ) : seccion?.aviso ? (
        <Aviso tono="info">{seccion.aviso}</Aviso>
      ) : (
        <>
          <Tabla columnas={columnasCantera} filas={viajes} vacio="" />
          <Text style={estilos.apoyo}>
            {seccion?.estado === "fijados"
              ? "Fijados al cerrar la bitácora. Lo que se registre o anule después en Control Cantera no cambia esta lista."
              : "Se registran y se anulan en Control Cantera. Al cerrar la bitácora, esta lista queda fijada."}
          </Text>
        </>
      )}
    </SeccionEnMarco>
  );
}

/* ------------------------------------------------------------------------ */
/* Histórico: las bitácoras por máquina de antes de la spec 004              */
/* ------------------------------------------------------------------------ */

/**
 * Lo que se registró cuando la bitácora era un documento por máquina.
 *
 * Se muestra de solo lectura y no se migra al formato nuevo: convertir aquellos
 * registros sería reescribir lo que ya se dio por cerrado. Aparece solo en los
 * días que tienen algo, para no ensuciar la pantalla con una sección vacía
 * todos los días de aquí en adelante.
 */
function SeccionHistorico({
  fecha,
  alContar,
  alMedir,
}: {
  fecha: string;
  /** Cuántas cerradas hay, para que el índice sepa si ofrecer esta entrada. */
  alContar: (cuantas: number) => void;
  alMedir: (id: string, y: number) => void;
}) {
  const jornada = useListado<JornadaFila>(
    useCallback(async () => [await api.bitacoras.delDia(fecha)], [fecha]),
  );

  /**
   * Solo las **cerradas** (spec 006 / RF-28).
   *
   * Una bitácora abierta no es evidencia: es un borrador que alguien empezó y
   * nunca terminó. Al mirar la base al planificar esta spec había seis, las seis
   * abiertas y todas de la misma semana en que se probaba este formato — restos
   * de pruebas, no trabajo registrado. Arrastrarlas al pie del parte nuevo todos
   * los días no conservaba nada y ensuciaba el documento.
   *
   * Lo que RF-36 de la spec 004 prometía sigue en pie: una bitácora cerrada de
   * verdad se sigue viendo. Y **ninguna fila se borra** — esto es un filtro de
   * pantalla, no una baja.
   */
  const bitacoras = (jornada.datos[0]?.bitacoras ?? []).filter(
    (b) => b.cerradaEn !== null && b.anuladoEn === null,
  );

  useEffect(() => {
    if (!jornada.cargando) alContar(bitacoras.length);
  }, [jornada.cargando, bitacoras.length, alContar]);

  if (jornada.cargando || bitacoras.length === 0) return null;

  const columnas: Columna<BitacoraFila>[] = [
    {
      clave: "equipo",
      titulo: "Equipo",
      ancho: 130,
      pintar: (b) => <Celda>{b.vehiculoCodigo}</Celda>,
    },
    {
      clave: "operador",
      titulo: "Operador",
      ancho: 170,
      pintar: (b) => <Celda>{b.operadorNombre ?? "—"}</Celda>,
    },
    {
      clave: "horometros",
      titulo: "Horómetros",
      ancho: 150,
      pintar: (b) => (
        <Celda>
          {b.horometroInicial ?? "—"} → {b.horometroFinal ?? "—"} h
        </Celda>
      ),
    },
    {
      clave: "horas",
      titulo: "Horas",
      ancho: 80,
      pintar: (b) => {
        const horas = horasDeMaquina(b.horometroInicial, b.horometroFinal);
        return <Celda>{horas === null ? "—" : `${horas} h`}</Celda>;
      },
    },
    {
      clave: "actividades",
      titulo: "Actividades",
      ancho: 210,
      pintar: (b) => (
        <Celda>{b.actividades.map((a) => a.nombre).join(", ") || "—"}</Celda>
      ),
    },
    {
      clave: "estado",
      titulo: "Estado",
      ancho: 110,
      pintar: (b) =>
        b.anuladoEn ? (
          <Etiqueta tono="malo">Anulada</Etiqueta>
        ) : b.cerradaEn ? (
          <Etiqueta tono="bueno">Cerrada</Etiqueta>
        ) : (
          <Etiqueta tono="atencion">Abierta</Etiqueta>
        ),
    },
  ];

  return (
    <SeccionEnMarco
      id="historico"
      titulo={`Bitácoras por máquina de ese día (${bitacoras.length})`}
      alMedir={alMedir}
      ultima
    >
      <Aviso tono="info">
        Registros del formato anterior, cuando la bitácora era un documento por
        máquina. Se conservan tal como se cerraron y no se pueden editar.
      </Aviso>
      <Tabla columnas={columnas} filas={bitacoras} vacio="" variante="desnuda" />
    </SeccionEnMarco>
  );
}

/* ------------------------------------------------------------------------ */
/* Maquinaria                                                                */
/* ------------------------------------------------------------------------ */

interface PropsSeccion {
  /** Dónde empieza esta banda, para que el índice pueda saltar a ella. */
  alMedir: (id: string, y: number) => void;
  parte: ParteFila;
  editable: boolean;
  alGuardar: () => void;
}

function SeccionMaquinaria({
  parte,
  vehiculos,
  editable,
  alGuardar,
  alMedir,
}: PropsSeccion & { vehiculos: VehiculoFila[] }) {
  // El error de guardar se pinta dentro de esta sección y no arriba de la
  // página, que es donde no lo ve quien acaba de pulsar Guardar (spec 007, RF-28).
  const [error, alFallar] = useState<string | null>(null);
  // El estado arranca del parte y a partir de ahí manda lo que se teclea. No se
  // vuelve a sincronizar con un efecto a propósito: refrescar desde el servidor
  // mientras alguien escribe le borraría lo que está escribiendo. Cambiar de día
  // monta el componente de nuevo, porque lleva `key` con el id del parte.
  const [filas, setFilas] = useState<FilaMaquina[]>(() =>
    parte.maquinaria.map((m) => ({
      vehiculoId: m.vehiculoId,
      inicial: m.medidorInicial === null ? "" : String(m.medidorInicial),
      final: m.medidorFinal === null ? "" : String(m.medidorFinal),
      // Los partes anteriores al 2026-09-14 no las traen.
      observaciones: m.observaciones ?? "",
    })),
  );
  const [guardando, setGuardando] = useState(false);

  const usados = new Set(filas.map((f) => f.vehiculoId));
  const libres = vehiculos.filter((v) => !usados.has(v.id));

  function cambiar(indice: number, campo: keyof FilaMaquina, valor: string) {
    setFilas(
      filas.map((f, i) => (i === indice ? { ...f, [campo]: valor } : f)),
    );
  }

  async function guardar() {
    setGuardando(true);
    try {
      await api.partes.guardar(parte.id, {
        maquinaria: filas.map((f) => ({
          vehiculoId: f.vehiculoId,
          medidorInicial: aNumero(f.inicial),
          medidorFinal: aNumero(f.final),
          observaciones: f.observaciones,
        })),
      });
      alFallar(null);
      alGuardar();
    } catch (fallo) {
      alFallar(mensajeDe(fallo));
    } finally {
      setGuardando(false);
    }
  }

  return (
    <SeccionEnMarco
      id="maquinaria"
      error={error}
      titulo={`Maquinaria (${filas.length})`}
      alMedir={alMedir}
      accion={
        editable ? (
          <Boton titulo="Guardar" onPress={guardar} deshabilitado={guardando} />
        ) : null
      }
    >
      {filas.length > 0 ? (
        <>
          {filas.map((fila, indice) => {
            const equipo = vehiculos.find((v) => v.id === fila.vehiculoId);
            // Una camioneta se controla por kilómetros y una retroexcavadora por
            // horas de motor. Pedirle horas de motor a la camioneta es pedirle un
            // dato que su tablero no da, y así es como se llena con cualquier cosa.
            const clase = medidorDeClase(equipo?.claseMedidor);
            const unidad = UNIDAD_DE_MEDIDOR[clase];
            const rotulo = ETIQUETA_MEDIDOR[clase];
            const inicial = aNumero(fila.inicial);
            const final = aNumero(fila.final);
            const error = validarAvance(clase, inicial, final);
            const avance = avanceDeMedidor(inicial, final);

            return (
              <FilaDeFormulario
                key={`${fila.vehiculoId}-${indice}`}
                ultima={indice === filas.length - 1}
              >
                <Campo
                  etiqueta="Equipo"
                  valor={`${equipo?.codigoInterno ?? fila.vehiculoId}${equipo ? ` · ${equipo.tipoNombre}` : ""}`}
                  onChange={() => {}}
                  // Ya está elegido: cambiarlo es quitar la fila y añadir otra.
                  soloLectura
                  ancho={240}
                />
                <Campo
                  etiqueta={`${rotulo} inicial (${unidad})`}
                  valor={fila.inicial}
                  onChange={(v) => cambiar(indice, "inicial", v)}
                  soloNumeros
                  ancho={170}
                />
                <Campo
                  etiqueta={`${rotulo} final (${unidad})`}
                  valor={fila.final}
                  onChange={(v) => cambiar(indice, "final", v)}
                  soloNumeros
                  ancho={170}
                  // Mientras se llena, faltar una lectura no es un error: solo se
                  // marca lo imposible, que escrito se queda.
                  error={
                    error === "final_menor" || error === "salto_enorme"
                      ? mensajeDeAvance(clase, error, inicial)
                      : undefined
                  }
                  ayuda={
                    avance === null
                      ? undefined
                      : clase === "odometro"
                        ? `${avance} km recorridos`
                        : `${avance} horas de máquina`
                  }
                />
                {/* Va en su propio renglón de la fila, debajo de las lecturas, y
                    se sigue viendo cuando el parte ya está cerrado (RF-46). */}
                <Campo
                  etiqueta="Observaciones del día"
                  valor={fila.observaciones}
                  onChange={(v) => cambiar(indice, "observaciones", v)}
                  multilinea
                  ayuda={
                    editable
                      ? "Qué pasó con la máquina: fallas, tiempos muertos, traslados. Hace falta para cerrar el parte."
                      : undefined
                  }
                />
                {editable ? (
                  <AccionesFormulario>
                    <Boton
                      titulo="Quitar"
                      tono="peligro"
                      onPress={() =>
                        setFilas(filas.filter((_, i) => i !== indice))
                      }
                    />
                  </AccionesFormulario>
                ) : null}
              </FilaDeFormulario>
            );
          })}
        </>
      ) : null}

      {editable ? (
        <PieDeSeccion>
          <Selector
            etiqueta="Añadir máquina"
            valor={null}
            opciones={libres.map((v) => ({
              valor: v.id,
              etiqueta: v.codigoInterno,
              detalle: v.tipoNombre,
            }))}
            onChange={(v) =>
              v &&
              setFilas([
                ...filas,
                { vehiculoId: v, inicial: "", final: "", observaciones: "" },
              ])
            }
            vacio="Elija un equipo"
            ancho={260}
          />
        </PieDeSeccion>
      ) : null}

      {filas.length === 0 && !editable ? (
        <Aviso tono="info">Ese día no se registró ninguna máquina.</Aviso>
      ) : null}
    </SeccionEnMarco>
  );
}

/* ------------------------------------------------------------------------ */
/* Personal                                                                  */
/* ------------------------------------------------------------------------ */

function SeccionPersonal({
  parte,
  personas,
  editable,
  alGuardar,
  alMedir,
}: PropsSeccion & { personas: PersonaFila[] }) {
  // El error de guardar se pinta dentro de esta sección y no arriba de la
  // página, que es donde no lo ve quien acaba de pulsar Guardar (spec 007, RF-28).
  const [error, alFallar] = useState<string | null>(null);
  const [filas, setFilas] = useState<FilaPersona[]>(() =>
    parte.personal.map((p) => ({
      usuarioId: p.usuarioId,
      entrada: p.entrada ?? "",
      salida: p.salida ?? "",
    })),
  );
  const [guardando, setGuardando] = useState(false);

  const usados = new Set(filas.map((f) => f.usuarioId));
  const libres = personas.filter((p) => !usados.has(p.id));

  function cambiar(indice: number, campo: keyof FilaPersona, valor: string) {
    setFilas(
      filas.map((f, i) => (i === indice ? { ...f, [campo]: valor } : f)),
    );
  }

  async function guardar() {
    setGuardando(true);
    try {
      await api.partes.guardar(parte.id, {
        personal: filas.map((f) => ({
          usuarioId: f.usuarioId,
          entrada: f.entrada,
          salida: f.salida,
        })),
      });
      alFallar(null);
      alGuardar();
    } catch (fallo) {
      alFallar(mensajeDe(fallo));
    } finally {
      setGuardando(false);
    }
  }

  return (
    <SeccionEnMarco
      id="personal"
      error={error}
      titulo={`Personal (${filas.length})`}
      alMedir={alMedir}
      accion={
        editable ? (
          <Boton titulo="Guardar" onPress={guardar} deshabilitado={guardando} />
        ) : null
      }
    >
      {filas.length > 0 ? (
        <>
          {filas.map((fila, indice) => {
            const quien = personas.find((p) => p.id === fila.usuarioId);
            const desglose = desglosarJornada(
              parte.fecha,
              fila.entrada || null,
              fila.salida || null,
            );

            return (
              <FilaDeFormulario
                key={`${fila.usuarioId}-${indice}`}
                ultima={indice === filas.length - 1}
              >
                <Campo
                  etiqueta="Persona"
                  valor={quien?.nombreCompleto ?? fila.usuarioId}
                  onChange={() => {}}
                  // Ya está elegido: cambiarlo es quitar la fila y añadir otra.
                  soloLectura
                  ancho={240}
                />
                <Campo
                  etiqueta="Entrada"
                  valor={fila.entrada}
                  onChange={(v) => cambiar(indice, "entrada", v)}
                  ayuda="HH:MM"
                  ancho={120}
                />
                <Campo
                  etiqueta="Salida"
                  valor={fila.salida}
                  onChange={(v) => cambiar(indice, "salida", v)}
                  ayuda="HH:MM"
                  ancho={120}
                />
                {desglose ? (
                  <View style={estilos.desglose}>
                    <Text style={estilos.apoyo}>
                      {horasLegibles(desglose.trabajados)} trabajadas
                    </Text>
                    {desglose.extra > 0 ? (
                      <Etiqueta tono="atencion">
                        {horasLegibles(desglose.extra)} extra
                      </Etiqueta>
                    ) : null}
                    {desglose.nocturnos > 0 ? (
                      <Etiqueta tono="neutro">
                        {horasLegibles(desglose.nocturnos)} nocturnas
                      </Etiqueta>
                    ) : null}
                    {desglose.dominicalOFestivo ? (
                      <Etiqueta tono="atencion">Domingo o festivo</Etiqueta>
                    ) : null}
                  </View>
                ) : null}
                {editable ? (
                  <AccionesFormulario>
                    <Boton
                      titulo="Quitar"
                      tono="peligro"
                      onPress={() =>
                        setFilas(filas.filter((_, i) => i !== indice))
                      }
                    />
                  </AccionesFormulario>
                ) : null}
              </FilaDeFormulario>
            );
          })}
        </>
      ) : null}

      {editable ? (
        <PieDeSeccion>
          <Selector
            etiqueta="Añadir persona"
            valor={null}
            opciones={libres.map((p) => ({
              valor: p.id,
              etiqueta: p.nombreCompleto,
              // El nombre del cargo, no su slug: se leía «residente_1» (004/RF-20).
              detalle: p.cargo ? nombreDeCargo(p.cargo) : undefined,
            }))}
            onChange={(v) =>
              // En blanco a propósito: un valor puesto de antemano se queda
              // puesto el día que a alguien se le olvide cambiarlo, y nadie
              // distingue después lo escrito de lo que vino solo.
              v &&
              setFilas([...filas, { usuarioId: v, entrada: "", salida: "" }])
            }
            vacio="Elija una persona"
            ancho={280}
          />
        </PieDeSeccion>
      ) : null}

      {filas.length === 0 && !editable ? (
        <Aviso tono="info">Ese día no se registró personal.</Aviso>
      ) : null}
    </SeccionEnMarco>
  );
}

/* ------------------------------------------------------------------------ */
/* Actividades                                                               */
/* ------------------------------------------------------------------------ */

function SeccionActividades({
  parte,
  editable,
  alGuardar,
  alMedir,
}: PropsSeccion) {
  // El error de guardar se pinta dentro de esta sección y no arriba de la
  // página, que es donde no lo ve quien acaba de pulsar Guardar (spec 007, RF-28).
  const [error, alFallar] = useState<string | null>(null);
  // Lo que le falta a cada «otra», escrito bajo su campo. Solo después de pulsar
  // Guardar: marcar en rojo una fila recién añadida, antes de escribir nada, es
  // regañar por adelantado.
  const [intentoGuardar, setIntentoGuardar] = useState(false);
  // Las fotos del parte, para repartirlas entre las actividades que las tienen.
  const fotos = useListado<{
    id: string;
    itemKey: string | null;
    disponible: boolean;
  }>(useCallback(() => api.partes.fotos(parte.id), [parte.id]));

  const [filas, setFilas] = useState<FilaActividad[]>(() =>
    parte.actividades.map((a) => ({
      id: a.id,
      clave: a.clave,
      texto: a.clave === CLAVE_OTRA_ACTIVIDAD ? a.nombre : "",
      // Se guarda la etiqueta («m³»); el formulario trabaja con la clave.
      unidad: UNIDADES_DE_ACTIVIDAD.find((u) => u.etiqueta === a.unidad)?.id ?? "",
      cantidad:
        a.cantidad === null || a.cantidad === undefined ? "" : String(a.cantidad),
      descripcion: a.descripcion,
      observaciones: a.observaciones,
      longitud: a.longitud === null ? "" : String(a.longitud),
      ancho: a.ancho === null ? "" : String(a.ancho),
      alto: a.alto === null ? "" : String(a.alto),
      area: a.area === null ? "" : String(a.area),
      volumen: a.volumen === null ? "" : String(a.volumen),
      // Sin la propiedad `unidad`: se guardó antes del 2026-09-16.
      heredada: "unidad" in a ? null : a,
    })),
  );
  const [guardando, setGuardando] = useState(false);

  function cambiar(indice: number, campo: keyof FilaActividad, valor: string) {
    setFilas(
      filas.map((f, i) => {
        if (i !== indice) return f;
        const cambiada = { ...f, [campo]: valor };
        // Al dejar «otra», la unidad elegida para ella ya no es de nadie.
        if (campo === "clave" && valor !== CLAVE_OTRA_ACTIVIDAD) cambiada.unidad = "";
        return cambiada;
      }),
    );
  }

  function faltasDe(fila: FilaActividad): Partial<Record<CampoDeActividad, string>> {
    if (fila.heredada) return {};
    return Object.fromEntries(
      faltasDeActividad({
        otra: fila.clave === CLAVE_OTRA_ACTIVIDAD,
        texto: fila.texto,
        unidad: fila.unidad,
      }).map((f) => [f.campo, f.mensaje]),
    );
  }

  async function guardar() {
    setIntentoGuardar(true);
    // Lo que la regla ya sabe que se va a rechazar no se manda: el error se ve bajo
    // su campo, que es donde se corrige.
    if (filas.some((f) => Object.keys(faltasDe(f)).length > 0)) {
      alFallar("Falta completar alguna actividad: está marcado bajo su campo.");
      return;
    }
    setGuardando(true);
    try {
      await api.partes.guardar(parte.id, {
        actividades: filas.map((f) =>
          f.heredada
            ? { id: f.id }
            : {
                id: f.id,
                clave: f.clave,
                texto: f.texto,
                unidad:
                  f.clave === CLAVE_OTRA_ACTIVIDAD
                    ? UNIDADES_DE_ACTIVIDAD.find((u) => u.id === f.unidad)?.id ?? null
                    : null,
                // Se manda lo que se ve: calculado si hay de dónde, escrito si no. El
                // servidor lo recalcula igual con la misma regla (RF-58 a RF-60, RF-68).
                cantidad: cantidadDe(f).cantidad,
                descripcion: f.descripcion,
                observaciones: f.observaciones,
                longitud: aNumero(f.longitud),
                ancho: aNumero(f.ancho),
                alto: aNumero(f.alto),
                area: medidasDe(f).area,
                volumen: medidasDe(f).volumen,
              },
        ),
      });
      alFallar(null);
      setIntentoGuardar(false);
      alGuardar();
    } catch (fallo) {
      alFallar(mensajeDe(fallo));
    } finally {
      setGuardando(false);
    }
  }

  // Los ítems del presupuesto con su descripción sola —el número no se muestra
  // desde el 2026-09-17 (RF-75)— y la salida para lo que no está (RF-64, RF-24).
  // El buscador del selector encuentra por palabras y ya no por número, porque
  // busca en la etiqueta (RF-76). El `valor` sigue siendo el ítem: es la clave que
  // viaja al servidor, no algo que alguien lea.
  const opciones = [
    ...ACTIVIDADES_DEL_PRESUPUESTO.map((a) => ({
      valor: a.item,
      etiqueta: etiquetaDeActividad(a),
    })),
    { valor: CLAVE_OTRA_ACTIVIDAD, etiqueta: "Otra actividad" },
  ];
  const opcionesDeUnidad = UNIDADES_DE_ACTIVIDAD.map((u) => ({
    valor: u.id,
    etiqueta: u.etiqueta,
  }));
  const sinEscribir = () => {};

  return (
    <SeccionEnMarco
      id="actividades"
      error={error}
      titulo={`Actividades (${filas.length})`}
      alMedir={alMedir}
      accion={
        editable ? (
          <Boton titulo="Guardar" onPress={guardar} deshabilitado={guardando} />
        ) : null
      }
    >
      {filas.length > 0 ? (
        <>
          {filas.map((fila, indice) => {
            const ultima = indice === filas.length - 1;
            const fotoDeLaFila = (
              // Toda fila tiene id desde que se añade, así que la foto se sube sin
              // guardar antes (RF-47). Si la actividad se quita sin guardar, su
              // foto no es de ninguna actividad del parte y no se pinta (RF-48).
              <SubirFoto
                titulo="Foto de la actividad"
                rutaDeSubida={`/api/panel/partes/${parte.id}/foto?item=${fila.id}`}
                fotos={fotos.datos
                  .filter((f) => f.itemKey === fila.id)
                  .map((f) => f.id)}
                editable={editable}
                alSubir={() => {
                  fotos.recargar();
                  // El índice cuenta las fotos por su cuenta para saber si ya hay
                  // una actividad con foto; recargar el día se lo avisa. No
                  // desmonta la sección, así que lo escrito sin guardar sigue.
                  alGuardar();
                }}
              />
            );
            const quitar = editable ? (
              <AccionesFormulario>
                <Boton
                  titulo="Quitar actividad"
                  tono="peligro"
                  onPress={() => setFilas(filas.filter((_, i) => i !== indice))}
                />
              </AccionesFormulario>
            ) : null;

            // Guardada con la lista anterior: se ve como se guardó y no se toca
            // (RF-71). Quitarla sí, como cualquier fila de un parte abierto.
            if (fila.heredada) {
              const h = fila.heredada;
              const numero = (v: number | null) => (v === null ? "" : String(v));
              return (
                <FilaDeFormulario key={fila.id} ultima={ultima}>
                  <Campo
                    etiqueta="Actividad"
                    valor={h.nombre}
                    onChange={sinEscribir}
                    soloLectura
                    ayuda="De la lista anterior: se conserva como se guardó."
                    ancho={460}
                  />
                  <Campo
                    etiqueta="Descripción"
                    valor={h.descripcion}
                    onChange={sinEscribir}
                    soloLectura
                    ancho={300}
                  />
                  <Campo etiqueta="Longitud" valor={numero(h.longitud)} onChange={sinEscribir} soloLectura ancho={110} />
                  <Campo etiqueta="Ancho" valor={numero(h.ancho)} onChange={sinEscribir} soloLectura ancho={110} />
                  <Campo etiqueta="Alto" valor={numero(h.alto)} onChange={sinEscribir} soloLectura ancho={110} />
                  <Campo etiqueta="Área" valor={numero(h.area)} onChange={sinEscribir} soloLectura ancho={110} />
                  <Campo etiqueta="Volumen" valor={numero(h.volumen)} onChange={sinEscribir} soloLectura ancho={110} />
                  <Campo
                    etiqueta="Observaciones"
                    valor={h.observaciones}
                    onChange={sinEscribir}
                    soloLectura
                    multilinea
                  />
                  {fotoDeLaFila}
                  {quitar}
                </FilaDeFormulario>
              );
            }

            const otra = fila.clave === CLAVE_OTRA_ACTIVIDAD;
            const medidas = medidasDe(fila);
            const unidad = unidadDe(fila);
            const cantidad = cantidadDe(fila);
            const faltas = intentoGuardar ? faltasDe(fila) : {};
            return (
              <FilaDeFormulario key={fila.id} ultima={ultima}>
                <Selector
                  etiqueta="Actividad"
                  valor={fila.clave}
                  opciones={opciones}
                  onChange={(v) => cambiar(indice, "clave", v ?? "")}
                  ancho={460}
                />
                {otra ? (
                  <>
                    <Campo
                      etiqueta="¿Cuál?"
                      valor={fila.texto}
                      onChange={(v) => cambiar(indice, "texto", v)}
                      error={faltas.texto}
                      obligatorio
                      ancho={220}
                    />
                    <Selector
                      etiqueta="Unidad"
                      valor={fila.unidad || null}
                      opciones={opcionesDeUnidad}
                      onChange={(v) => cambiar(indice, "unidad", v ?? "")}
                      vacio="Elija"
                      error={faltas.unidad}
                      obligatorio
                      ancho={110}
                    />
                  </>
                ) : (
                  // La unidad del presupuesto se ve, pero no se elige (RF-66).
                  <Campo
                    etiqueta="Unidad"
                    valor={unidad ? etiquetaDeUnidad(unidad) : ""}
                    onChange={sinEscribir}
                    soloLectura
                    ancho={110}
                  />
                )}
                <Campo
                  etiqueta="Descripción"
                  valor={fila.descripcion}
                  onChange={(v) => cambiar(indice, "descripcion", v)}
                  ancho={300}
                />
                <Campo
                  etiqueta="Longitud"
                  valor={fila.longitud}
                  onChange={(v) => cambiar(indice, "longitud", v)}
                  soloNumeros
                  ancho={110}
                />
                <Campo
                  etiqueta="Ancho"
                  valor={fila.ancho}
                  onChange={(v) => cambiar(indice, "ancho", v)}
                  soloNumeros
                  ancho={110}
                />
                <Campo
                  etiqueta="Alto"
                  valor={fila.alto}
                  onChange={(v) => cambiar(indice, "alto", v)}
                  soloNumeros
                  ancho={110}
                />
                {/* Con sus factores escritos, área y volumen se calculan y no se
                    dejan escribir: escribir ahí no serviría de nada. Sin ellos,
                    se escriben a mano, y lo escrito se conserva aunque luego se
                    añada el factor y se vuelva a quitar (RF-58 a RF-60). */}
                <Campo
                  etiqueta="Área"
                  valor={medidas.areaCalculada ? String(medidas.area) : fila.area}
                  onChange={(v) => cambiar(indice, "area", v)}
                  soloNumeros
                  soloLectura={medidas.areaCalculada}
                  ayuda={medidas.areaCalculada ? "Largo × ancho" : undefined}
                  ancho={110}
                />
                <Campo
                  etiqueta="Volumen"
                  valor={medidas.volumenCalculado ? String(medidas.volumen) : fila.volumen}
                  onChange={(v) => cambiar(indice, "volumen", v)}
                  soloNumeros
                  soloLectura={medidas.volumenCalculado}
                  ayuda={medidas.volumenCalculado ? "Largo × ancho × alto" : undefined}
                  ancho={110}
                />
                {/* Cuánto se hizo, en la unidad de la actividad. Con m³, m² o m y su
                    medida, sale de ella y no se escribe; con kg, Und o m³-km, o sin
                    la medida, se escribe a mano (RF-67 a RF-69, RF-74). */}
                <Campo
                  etiqueta={unidad ? `Cantidad (${etiquetaDeUnidad(unidad)})` : "Cantidad"}
                  valor={cantidad.cantidadCalculada ? String(cantidad.cantidad) : fila.cantidad}
                  onChange={(v) => cambiar(indice, "cantidad", v)}
                  soloNumeros
                  soloLectura={cantidad.cantidadCalculada}
                  ayuda={cantidad.origen ? AYUDA_DE_CANTIDAD[cantidad.origen] : undefined}
                  ancho={130}
                />
                <Campo
                  etiqueta="Observaciones"
                  valor={fila.observaciones}
                  onChange={(v) => cambiar(indice, "observaciones", v)}
                  multilinea
                />
                {fotoDeLaFila}
                {quitar}
              </FilaDeFormulario>
            );
          })}
        </>
      ) : null}

      {editable ? (
        <PieDeSeccion>
          <Boton
            titulo="Añadir actividad"
            tono="secundario"
            onPress={() =>
              setFilas([
                ...filas,
                {
                  id: idDeFila(),
                  clave: opciones[0]?.valor ?? CLAVE_OTRA_ACTIVIDAD,
                  texto: "",
                  unidad: "",
                  cantidad: "",
                  descripcion: "",
                  observaciones: "",
                  longitud: "",
                  ancho: "",
                  alto: "",
                  area: "",
                  volumen: "",
                  heredada: null,
                },
              ])
            }
          />
        </PieDeSeccion>
      ) : null}

      {filas.length === 0 && !editable ? (
        <Aviso tono="info">Ese día no se registró ninguna actividad.</Aviso>
      ) : null}
    </SeccionEnMarco>
  );
}

/* ------------------------------------------------------------------------ */
/* Clima                                                                     */
/* ------------------------------------------------------------------------ */

function SeccionClima({
  parte,
  editable,
  alGuardar,
  alMedir,
}: PropsSeccion) {
  // El error de guardar se pinta dentro de esta sección y no arriba de la
  // página, que es donde no lo ve quien acaba de pulsar Guardar (spec 007, RF-28).
  // Con otro nombre que en las demás: aquí `error` ya es el de las franjas.
  const [errorAlGuardar, alFallar] = useState<string | null>(null);
  const [filas, setFilas] = useState<FilaClima[]>(() =>
    parte.clima.map((c) => ({
      condicion: c.condicion,
      desde: c.desde,
      hasta: c.hasta,
    })),
  );
  const [guardando, setGuardando] = useState(false);

  function cambiar(indice: number, campo: keyof FilaClima, valor: string) {
    setFilas(
      filas.map((f, i) => (i === indice ? { ...f, [campo]: valor } : f)),
    );
  }

  const error = validarFranjas(
    filas.map((f) => ({ desde: f.desde, hasta: f.hasta })),
  );

  async function guardar() {
    setGuardando(true);
    try {
      await api.partes.guardar(parte.id, { clima: filas });
      alFallar(null);
      alGuardar();
    } catch (fallo) {
      alFallar(mensajeDe(fallo));
    } finally {
      setGuardando(false);
    }
  }

  return (
    <SeccionEnMarco
      id="clima"
      error={errorAlGuardar}
      titulo={`Clima (${filas.length} ${filas.length === 1 ? "tramo" : "tramos"})`}
      alMedir={alMedir}
      accion={
        editable ? (
          <Boton
            titulo="Guardar"
            onPress={guardar}
            deshabilitado={guardando || error !== null}
          />
        ) : null
      }
    >
      {filas.length > 0 ? (
        <>
          {filas.map((fila, indice) => (
            <FilaDeFormulario key={indice} ultima={indice === filas.length - 1}>
              <Selector
                etiqueta="Condición"
                valor={fila.condicion}
                opciones={CONDICIONES_CLIMA.map((c) => ({
                  valor: c.id,
                  etiqueta: c.nombre,
                }))}
                onChange={(v) => cambiar(indice, "condicion", v ?? "")}
                ancho={220}
              />
              <Campo
                etiqueta="Desde"
                valor={fila.desde}
                onChange={(v) => cambiar(indice, "desde", v)}
                ayuda="HH:MM"
                ancho={120}
              />
              <Campo
                etiqueta="Hasta"
                valor={fila.hasta}
                onChange={(v) => cambiar(indice, "hasta", v)}
                ayuda="HH:MM"
                ancho={120}
              />
              {editable ? (
                <AccionesFormulario>
                  <Boton
                    titulo="Quitar tramo"
                    tono="peligro"
                    onPress={() =>
                      setFilas(filas.filter((_, i) => i !== indice))
                    }
                  />
                </AccionesFormulario>
              ) : null}
            </FilaDeFormulario>
          ))}
        </>
      ) : null}

      {error ? <Aviso tono="error">{mensajeDeFranja(error)}</Aviso> : null}

      {editable ? (
        <PieDeSeccion>
          <Boton
            titulo="Añadir tramo"
            tono="secundario"
            onPress={() =>
              setFilas([
                ...filas,
                { condicion: CONDICIONES_CLIMA[0].id, desde: "", hasta: "" },
              ])
            }
          />
        </PieDeSeccion>
      ) : null}

      {filas.length === 0 && !editable ? (
        <Aviso tono="info">Ese día no se registró el clima.</Aviso>
      ) : null}
    </SeccionEnMarco>
  );
}

/* ------------------------------------------------------------------------ */
/* Control Calidad de Obra (antes «Laboratorio»; el id sigue siendo ese)     */
/* ------------------------------------------------------------------------ */

function SeccionLaboratorio({
  parte,
  editable,
  alGuardar,
  alMedir,
}: PropsSeccion) {
  // El error de guardar se pinta dentro de esta sección y no arriba de la
  // página, que es donde no lo ve quien acaba de pulsar Guardar (spec 007, RF-28).
  const [error, alFallar] = useState<string | null>(null);
  // Lo que le falta a cada ensayo, bajo su campo, solo después de pulsar Guardar.
  const [intentoGuardar, setIntentoGuardar] = useState(false);
  const [filas, setFilas] = useState<FilaControlDeCalidad[]>(() =>
    parte.laboratorio.map((fila) =>
      "material" in fila
        ? { id: fila.id, ensayo: "", observacion: "", heredado: fila }
        : { id: fila.id, ensayo: fila.ensayo, observacion: fila.observacion, heredado: null },
    ),
  );
  const [guardando, setGuardando] = useState(false);

  function cambiar(indice: number, campo: "ensayo" | "observacion", valor: string) {
    setFilas(filas.map((f, i) => (i === indice ? { ...f, [campo]: valor } : f)));
  }

  function faltasDe(fila: FilaControlDeCalidad): { ensayo?: string; observacion?: string } {
    if (fila.heredado) return {};
    return {
      ensayo: fila.ensayo ? undefined : "Elija el ensayo.",
      // La regla que también aplica el servidor (RF-72).
      observacion: faltaObservacionDelEnsayo(fila.observacion) ?? undefined,
    };
  }

  async function guardar() {
    setIntentoGuardar(true);
    // Lo que se va a rechazar no se manda: el error se ve bajo su campo.
    if (filas.some((f) => Object.values(faltasDe(f)).some(Boolean))) {
      alFallar("Falta completar algún ensayo: está marcado bajo su campo.");
      return;
    }
    setGuardando(true);
    try {
      await api.partes.guardar(parte.id, {
        laboratorio: filas.map((f) =>
          f.heredado
            ? { id: f.id }
            : { id: f.id, ensayo: f.ensayo, observacion: f.observacion },
        ),
      });
      alFallar(null);
      setIntentoGuardar(false);
      alGuardar();
    } catch (fallo) {
      alFallar(mensajeDe(fallo));
    } finally {
      setGuardando(false);
    }
  }

  // Los 17 de la guía de OCC, en su orden. Con más de ocho opciones el selector
  // trae buscador (RF-61).
  const opciones = ENSAYOS_DE_CALIDAD.map((e) => ({ valor: e.id, etiqueta: e.nombre }));
  const sinEscribir = () => {};

  // De solo lectura, las dos formas en la misma tabla: un ensayo dice su
  // observación; un material de antes, su cantidad (RF-63).
  const columnas: Columna<FilaDeControlDeCalidadFila>[] = [
    {
      clave: "nombre",
      titulo: "Ensayo o material",
      ancho: 240,
      pintar: (f) => <Celda>{f.nombre}</Celda>,
    },
    {
      clave: "detalle",
      titulo: "Observación o cantidad",
      ancho: 480,
      pintar: (f) => (
        <Celda>{"material" in f ? `${f.cantidad} ${f.unidad}` : f.observacion}</Celda>
      ),
    },
  ];

  return (
    <SeccionEnMarco
      id="laboratorio"
      error={error}
      titulo={`${TITULO_DE_SECCION.laboratorio} (${filas.length})`}
      alMedir={alMedir}
      accion={
        editable ? (
          <Boton titulo="Guardar" onPress={guardar} deshabilitado={guardando} />
        ) : null
      }
    >
      {editable ? (
        <>
          {filas.map((fila, indice) => {
            const ultima = indice === filas.length - 1;
            const quitar = (
              <AccionesFormulario>
                <Boton
                  titulo="Quitar"
                  tono="peligro"
                  onPress={() => setFilas(filas.filter((_, i) => i !== indice))}
                />
              </AccionesFormulario>
            );

            // Registrado antes de que la sección fuera de ensayos: se ve como se
            // guardó y no se toca; quitarlo sí (RF-63).
            if (fila.heredado) {
              return (
                <FilaDeFormulario key={fila.id} ultima={ultima}>
                  <Campo
                    etiqueta="Material"
                    valor={fila.heredado.nombre}
                    onChange={sinEscribir}
                    soloLectura
                    ayuda="De la lista anterior: se conserva como se guardó."
                    ancho={300}
                  />
                  <Campo
                    etiqueta="Cantidad"
                    valor={`${fila.heredado.cantidad} ${fila.heredado.unidad}`}
                    onChange={sinEscribir}
                    soloLectura
                    ancho={180}
                  />
                  {quitar}
                </FilaDeFormulario>
              );
            }

            const faltas = intentoGuardar ? faltasDe(fila) : {};
            return (
              <FilaDeFormulario key={fila.id} ultima={ultima}>
                <Selector
                  etiqueta="Ensayo"
                  valor={fila.ensayo || null}
                  opciones={opciones}
                  onChange={(v) => cambiar(indice, "ensayo", v ?? "")}
                  vacio="Elija el ensayo"
                  error={faltas.ensayo}
                  obligatorio
                  ancho={300}
                />
                {/* Obligatoria: si no hay nada que anotar, «Sin observaciones» (RF-72). */}
                <Campo
                  etiqueta="Observación"
                  valor={fila.observacion}
                  onChange={(v) => cambiar(indice, "observacion", v)}
                  ayuda={faltas.observacion ? undefined : "Si no hay nada que anotar, escriba «Sin observaciones»."}
                  error={faltas.observacion}
                  obligatorio
                  multilinea
                />
                {quitar}
              </FilaDeFormulario>
            );
          })}
          <PieDeSeccion>
            <Boton
              titulo="Añadir ensayo"
              tono="secundario"
              onPress={() =>
                setFilas([
                  ...filas,
                  { id: idDeFila(), ensayo: "", observacion: "", heredado: null },
                ])
              }
            />
          </PieDeSeccion>
        </>
      ) : (
        <Tabla
          columnas={columnas}
          filas={parte.laboratorio}
          vacio="Ese día no se registró nada en control de calidad."
          variante="desnuda"
        />
      )}
    </SeccionEnMarco>
  );
}

/* ------------------------------------------------------------------------ */
/* Notas                                                                     */
/* ------------------------------------------------------------------------ */

function SeccionNotas({
  parte,
  editable,
  alGuardar,
  alMedir,
}: PropsSeccion) {
  // El error de guardar se pinta dentro de esta sección y no arriba de la
  // página, que es donde no lo ve quien acaba de pulsar Guardar (spec 007, RF-28).
  const [error, alFallar] = useState<string | null>(null);
  const [notas, setNotas] = useState(() => parte.notas ?? "");
  const [guardando, setGuardando] = useState(false);

  async function guardar() {
    setGuardando(true);
    try {
      await api.partes.guardar(parte.id, { notas });
      alFallar(null);
      alGuardar();
    } catch (fallo) {
      alFallar(mensajeDe(fallo));
    } finally {
      setGuardando(false);
    }
  }

  return (
    <SeccionEnMarco
      id="notas"
      error={error}
      titulo="Notas y observaciones"
      alMedir={alMedir}
      accion={
        editable ? (
          <Boton titulo="Guardar" onPress={guardar} deshabilitado={guardando} />
        ) : null
      }
    >
      {editable ? (
        <Campo
          etiqueta="Del día"
          valor={notas}
          onChange={setNotas}
          multilinea
          ayuda="Lo que haya que dejar dicho y no quepa en las secciones de arriba."
        />
      ) : (
        <Aviso tono="info">{parte.notas ?? "Sin notas ese día."}</Aviso>
      )}
    </SeccionEnMarco>
  );
}

/* ------------------------------------------------------------------------ */
/* La fotografía del día                                                     */
/* ------------------------------------------------------------------------ */

/**
 * Una o varias fotografías del día.
 *
 * Se guardan en el mismo bucket privado que las firmas y las fotos de hallazgo
 * del preoperacional, y se sirven por la misma puerta: nunca hay un enlace
 * directo al almacén. Son evidencia de una obra, y con el bucket abierto
 * bastaría con adivinar un id para verla.
 */
function SeccionFotoDelDia({
  parte,
  editable,
  alMedir,
  fotosDelDia,
  alSubir,
}: {
  parte: ParteFila;
  editable: boolean;
  alMedir: (id: string, y: number) => void;
  /**
   * Las fotos del día, izadas a la pantalla.
   *
   * Antes se pedían aquí dentro, y entonces el índice no tenía forma de saber
   * cuántas hay para encender su entrada. Se descartó añadir el conteo a la
   * respuesta del parte: habría que tocar contrato, ruta y serialización para
   * un dato de presentación que la misma pantalla ya está pidiendo.
   */
  fotosDelDia: string[];
  alSubir: () => void;
}) {
  return (
    <SeccionEnMarco id="fotografia" titulo="Fotografía del día" alMedir={alMedir}>
      <SubirFoto
        titulo="Añadir fotografía"
        rutaDeSubida={`/api/panel/partes/${parte.id}/foto`}
        fotos={fotosDelDia}
        editable={editable}
        alSubir={alSubir}
      />
    </SeccionEnMarco>
  );
}

/* ------------------------------------------------------------------------ */
/* Cierre y anulación                                                        */
/* ------------------------------------------------------------------------ */

function Cierre({
  parte,
  editable,
  cerrado,
  anulado,
  puedeAnular,
  alCambiar,
  alMedir,
}: {
  parte: ParteFila;
  editable: boolean;
  cerrado: boolean;
  anulado: boolean;
  puedeAnular: boolean;
  alCambiar: () => void;
  alMedir: (id: string, y: number) => void;
}) {
  // El error de guardar se pinta dentro de esta sección y no arriba de la
  // página, que es donde no lo ve quien acaba de pulsar Guardar (spec 007, RF-28).
  const [error, alFallar] = useState<string | null>(null);
  const [anulando, setAnulando] = useState(false);
  const [motivo, setMotivo] = useState("");
  const [ocupado, setOcupado] = useState(false);

  // Día sin trabajo (spec 004, RF-53 a RF-55). Arranca de lo guardado y a partir
  // de ahí manda lo que se marca, igual que las demás secciones.
  const [sinTrabajo, setSinTrabajo] = useState(parte.sinTrabajo);
  const [motivoSinTrabajo, setMotivoSinTrabajo] = useState(
    parte.motivoSinTrabajo ?? "",
  );
  const marcaSinGuardar =
    sinTrabajo !== parte.sinTrabajo ||
    (sinTrabajo && motivoSinTrabajo.trim() !== (parte.motivoSinTrabajo ?? ""));
  const hayTrabajoRegistrado =
    parte.maquinaria.length > 0 ||
    parte.personal.length > 0 ||
    parte.actividades.length > 0;

  async function guardarDia() {
    setOcupado(true);
    try {
      // El servidor valida el motivo y que no haya trabajo registrado, con la
      // misma regla del cierre; si rechaza, el mensaje sale en el aviso.
      await api.partes.guardar(
        parte.id,
        sinTrabajo ? { sinTrabajo, motivoSinTrabajo } : { sinTrabajo },
      );
      alFallar(null);
      alCambiar();
    } catch (fallo) {
      alFallar(mensajeDe(fallo));
    } finally {
      setOcupado(false);
    }
  }

  async function cerrar() {
    setOcupado(true);
    try {
      await api.partes.cerrar(parte.id);
      alFallar(null);
      alCambiar();
    } catch (fallo) {
      alFallar(mensajeDe(fallo));
    } finally {
      setOcupado(false);
    }
  }

  async function anular() {
    setOcupado(true);
    try {
      await api.partes.anular(parte.id, motivo);
      setAnulando(false);
      setMotivo("");
      alFallar(null);
      alCambiar();
    } catch (fallo) {
      alFallar(mensajeDe(fallo));
    } finally {
      setOcupado(false);
    }
  }

  if (anulado) return null;

  return (
    <SeccionEnMarco
      id="cierre"
      titulo="Cerrar la jornada"
      alMedir={alMedir}
      error={error}
      ultima
    >
      {editable ? (
        <Formulario>
          <Casilla
            etiqueta="Ese día no se trabajó"
            marcada={sinTrabajo}
            onChange={setSinTrabajo}
            // Un día con trabajo registrado se cierra completo (RF-55). Si ya
            // estaba marcado, se deja desmarcar: es la salida de esa contradicción.
            deshabilitada={hayTrabajoRegistrado && !sinTrabajo}
          />
          {hayTrabajoRegistrado && !sinTrabajo ? (
            <Text style={estilos.apoyo}>
              Solo para un día sin máquinas, personas ni actividades registradas,
              como un domingo o un paro por lluvia.
            </Text>
          ) : null}
          {sinTrabajo ? (
            <Campo
              etiqueta="Por qué no se trabajó"
              obligatorio
              valor={motivoSinTrabajo}
              onChange={setMotivoSinTrabajo}
              multilinea
              ayuda="Con la marca guardada, para cerrar bastan el clima, las notas y la fotografía del día."
            />
          ) : null}
          {marcaSinGuardar ? (
            <Acciones>
              <Boton
                titulo="Guardar"
                tono="secundario"
                onPress={guardarDia}
                deshabilitado={ocupado}
              />
            </Acciones>
          ) : null}
        </Formulario>
      ) : parte.sinTrabajo ? (
        <Aviso tono="info">
          {`Día sin trabajo: ${parte.motivoSinTrabajo ?? "sin motivo escrito"}`}
        </Aviso>
      ) : null}

      {editable ? (
        <>
          <Aviso tono="info">
            Al cerrar, el parte queda como registro definitivo y los horómetros
            de las máquinas avanzan. Para corregirlo después habrá que anularlo
            y abrir otro.
          </Aviso>
          <Acciones>
            <Boton
              titulo="Cerrar el parte"
              onPress={cerrar}
              deshabilitado={ocupado}
            />
          </Acciones>
        </>
      ) : null}

      {cerrado && puedeAnular ? (
        anulando ? (
          <Formulario>
            <Campo
              etiqueta="Motivo de la anulación"
              obligatorio
              valor={motivo}
              onChange={setMotivo}
              ayuda="Queda guardado con su nombre. El parte anulado no se borra y el día vuelve a quedar libre."
              multilinea
            />
            <AccionesFormulario>
              <Acciones>
                <Boton
                  titulo="Confirmar anulación"
                  tono="peligro"
                  onPress={anular}
                  deshabilitado={motivo.trim().length === 0 || ocupado}
                />
                <Boton
                  titulo="Cancelar"
                  tono="secundario"
                  onPress={() => setAnulando(false)}
                />
              </Acciones>
            </AccionesFormulario>
          </Formulario>
        ) : (
          <Acciones>
            <Boton
              titulo="Anular este parte"
              tono="peligro"
              onPress={() => setAnulando(true)}
            />
          </Acciones>
        )
      ) : null}
    </SeccionEnMarco>
  );
}

const estilos = StyleSheet.create({
  /** Lo que impide cerrar, en el pie del índice. Se lee, no se decora. */
  bloqueo: {
    fontSize: TextoPanel.micro,
    color: Colors.light.textSecondary,
    lineHeight: 16,
  },
  cabecera: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.three,
    flexWrap: "wrap",
  },
  obra: {
    fontSize: TextoPanel.seccion,
    fontWeight: "800",
    color: Colors.light.text,
  },
  apoyo: { fontSize: TextoPanel.apoyo, color: Colors.light.textSecondary },
  desglose: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.two,
    flexWrap: "wrap",
  },
});
