/**
 * El parte diario de obra.
 *
 * Sustituye a la bitácora por máquina. Lo que antes era un documento por equipo
 * y día es ahora uno por **obra** y día, con la maquinaria dentro como una
 * sección entre siete: maquinaria, personal, actividades, clima, laboratorio,
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
import { useCallback, useState } from "react";
import { StyleSheet, Text, View } from "react-native";

import { Colors, Spacing, TextoPanel } from "@/constants/theme";
import { actividadesDe, CLAVE_OTRA } from "@/features/bitacoras/actividades";
import {
  CONDICIONES_CLIMA,
  ETIQUETA_UNIDAD,
  MATERIALES_LABORATORIO,
  materialPorId,
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
  UNIDAD_DE_MEDIDOR,
  validarAvance,
} from "@/shared/rules/jornada";
import { alcanza } from "@/shared/rules/permisos";

import { api } from "./cliente-api";
import {
  Acciones,
  AccionesFormulario,
  Ayuda,
  Bloque,
  FilaDeFormulario,
  Aviso,
  Boton,
  Campo,
  Celda,
  Etiqueta,
  Formulario,
  Seccion,
  Selector,
  Tabla,
  type Columna,
} from "./componentes";
import type {
  BitacoraFila,
  DiaDeObra,
  JornadaFila,
  ObraFila,
  ParteFila,
  PersonaFila,
  VehiculoFila,
} from "./contratos";
import { MarcoPantalla, mensajeDe, useListado } from "./marco";
import { SubirFoto } from "./subir-foto";
import { usePersona } from "./sesion";

/** Vacío es ausencia, no cero. */
function aNumero(texto: string): number | null {
  const limpio = texto.trim();
  if (limpio === "") return null;
  const valor = Number(limpio);
  return Number.isFinite(valor) ? valor : null;
}

/** Suma días a `YYYY-MM-DD` por mediodía UTC, para no cruzar el día. */
function sumarDias(fecha: string, dias: number): string {
  const base = new Date(`${fecha}T12:00:00Z`);
  base.setUTCDate(base.getUTCDate() + dias);
  return base.toISOString().slice(0, 10);
}

/* ------------------------------------------------------------------------ */

type FilaMaquina = { vehiculoId: string; inicial: string; final: string };
type FilaPersona = { usuarioId: string; entrada: string; salida: string };
type FilaActividad = {
  /** El de la fila guardada. Vacío mientras la actividad no se haya guardado. */
  id: string;
  clave: string;
  texto: string;
  descripcion: string;
  observaciones: string;
  longitud: string;
  ancho: string;
  alto: string;
  area: string;
  volumen: string;
};
type FilaClima = { condicion: string; desde: string; hasta: string };
type FilaMaterial = { material: string; cantidad: string };

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

  async function abrir() {
    await dia.ejecutar(() => api.partes.abrir(fecha, obraId ?? undefined));
  }

  return (
    <MarcoPantalla
      modulo="bitacoras"
      titulo="Parte diario de obra"
      descripcion="Qué se hizo hoy en la obra: máquinas, personal, actividades, clima y laboratorio. Se llena a lo largo del día y se cierra al terminar la jornada."
      error={dia.error ?? vehiculos.error ?? personas.error ?? obras.error}
      cargando={dia.cargando || vehiculos.cargando || personas.cargando}
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
        <>
          <SeccionMaquinaria
            key={`maquinaria-${parte.id}`}
            parte={parte}
            vehiculos={vehiculos.datos.filter(
              (v) => v.obraId === parte.obraId || v.obraId === null,
            )}
            editable={editable}
            alGuardar={dia.recargar}
            alFallar={dia.setError}
          />
          <SeccionPersonal
            key={`personal-${parte.id}`}
            parte={parte}
            personas={personas.datos}
            editable={editable}
            alGuardar={dia.recargar}
            alFallar={dia.setError}
          />
          <SeccionActividades
            key={`actividades-${parte.id}`}
            parte={parte}
            editable={editable}
            alGuardar={dia.recargar}
            alFallar={dia.setError}
          />
          <SeccionClima
            key={`clima-${parte.id}`}
            parte={parte}
            editable={editable}
            alGuardar={dia.recargar}
            alFallar={dia.setError}
          />
          <SeccionLaboratorio
            key={`laboratorio-${parte.id}`}
            parte={parte}
            editable={editable}
            alGuardar={dia.recargar}
            alFallar={dia.setError}
          />
          <SeccionNotas
            key={`notas-${parte.id}`}
            parte={parte}
            editable={editable}
            alGuardar={dia.recargar}
            alFallar={dia.setError}
          />
          <SeccionFotoDelDia
            key={`foto-${parte.id}`}
            parte={parte}
            editable={editable}
          />
          <Cierre
            parte={parte}
            editable={editable}
            cerrado={cerrado}
            anulado={anulado}
            puedeAnular={alcanza(rol, "bitacoras", "anular")}
            alCambiar={dia.recargar}
            alFallar={dia.setError}
          />
        </>
      ) : null}

      <SeccionHistorico fecha={fecha} />
    </MarcoPantalla>
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
function SeccionHistorico({ fecha }: { fecha: string }) {
  const jornada = useListado<JornadaFila>(
    useCallback(async () => [await api.bitacoras.delDia(fecha)], [fecha]),
  );

  const bitacoras = jornada.datos[0]?.bitacoras ?? [];
  if (jornada.cargando || bitacoras.length === 0) return null;

  const columnas: Columna<BitacoraFila>[] = [
    {
      clave: "equipo",
      titulo: "Equipo",
      ancho: 160,
      pintar: (b) => <Celda>{b.vehiculoCodigo}</Celda>,
    },
    {
      clave: "operador",
      titulo: "Operador",
      ancho: 220,
      pintar: (b) => <Celda>{b.operadorNombre ?? "—"}</Celda>,
    },
    {
      clave: "horometros",
      titulo: "Horómetros",
      ancho: 180,
      pintar: (b) => (
        <Celda>
          {b.horometroInicial ?? "—"} → {b.horometroFinal ?? "—"} h
        </Celda>
      ),
    },
    {
      clave: "horas",
      titulo: "Horas",
      ancho: 110,
      pintar: (b) => {
        const horas = horasDeMaquina(b.horometroInicial, b.horometroFinal);
        return <Celda>{horas === null ? "—" : `${horas} h`}</Celda>;
      },
    },
    {
      clave: "actividades",
      titulo: "Actividades",
      ancho: 280,
      pintar: (b) => (
        <Celda>{b.actividades.map((a) => a.nombre).join(", ") || "—"}</Celda>
      ),
    },
    {
      clave: "estado",
      titulo: "Estado",
      ancho: 130,
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
    <Seccion titulo={`Bitácoras por máquina de ese día (${bitacoras.length})`}>
      <Aviso tono="info">
        Registros del formato anterior, cuando la bitácora era un documento por
        máquina. Se conservan tal como se cerraron y no se pueden editar.
      </Aviso>
      <Tabla columnas={columnas} filas={bitacoras} vacio="" />
    </Seccion>
  );
}

/* ------------------------------------------------------------------------ */
/* Maquinaria                                                                */
/* ------------------------------------------------------------------------ */

interface PropsSeccion {
  parte: ParteFila;
  editable: boolean;
  alGuardar: () => void;
  alFallar: (mensaje: string | null) => void;
}

function SeccionMaquinaria({
  parte,
  vehiculos,
  editable,
  alGuardar,
  alFallar,
}: PropsSeccion & { vehiculos: VehiculoFila[] }) {
  // El estado arranca del parte y a partir de ahí manda lo que se teclea. No se
  // vuelve a sincronizar con un efecto a propósito: refrescar desde el servidor
  // mientras alguien escribe le borraría lo que está escribiendo. Cambiar de día
  // monta el componente de nuevo, porque lleva `key` con el id del parte.
  const [filas, setFilas] = useState<FilaMaquina[]>(() =>
    parte.maquinaria.map((m) => ({
      vehiculoId: m.vehiculoId,
      inicial: m.medidorInicial === null ? "" : String(m.medidorInicial),
      final: m.medidorFinal === null ? "" : String(m.medidorFinal),
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
    <Seccion titulo={`Maquinaria (${filas.length})`}>
      {filas.length > 0 ? (
        <Bloque>
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
        </Bloque>
      ) : null}

      {editable ? (
        <Formulario>
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
              setFilas([...filas, { vehiculoId: v, inicial: "", final: "" }])
            }
            vacio="Elija un equipo"
            ancho={260}
          />
          <AccionesFormulario>
            <Boton
              titulo="Guardar maquinaria"
              onPress={guardar}
              deshabilitado={guardando}
            />
          </AccionesFormulario>
        </Formulario>
      ) : null}

      {filas.length === 0 && !editable ? (
        <Aviso tono="info">Ese día no se registró ninguna máquina.</Aviso>
      ) : null}
    </Seccion>
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
  alFallar,
}: PropsSeccion & { personas: PersonaFila[] }) {
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
    <Seccion titulo={`Personal (${filas.length})`}>
      {filas.length > 0 ? (
        <Bloque>
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
        </Bloque>
      ) : null}

      {editable ? (
        <Formulario>
          <Selector
            etiqueta="Añadir persona"
            valor={null}
            opciones={libres.map((p) => ({
              valor: p.id,
              etiqueta: p.nombreCompleto,
              detalle: p.cargo ?? undefined,
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
          <AccionesFormulario>
            <Boton
              titulo="Guardar personal"
              onPress={guardar}
              deshabilitado={guardando}
            />
          </AccionesFormulario>
        </Formulario>
      ) : null}

      {filas.length === 0 && !editable ? (
        <Aviso tono="info">Ese día no se registró personal.</Aviso>
      ) : null}
    </Seccion>
  );
}

/* ------------------------------------------------------------------------ */
/* Actividades                                                               */
/* ------------------------------------------------------------------------ */

function SeccionActividades({
  parte,
  editable,
  alGuardar,
  alFallar,
}: PropsSeccion) {
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
      texto: a.clave === CLAVE_OTRA ? a.nombre : "",
      descripcion: a.descripcion,
      observaciones: a.observaciones,
      longitud: a.longitud === null ? "" : String(a.longitud),
      ancho: a.ancho === null ? "" : String(a.ancho),
      alto: a.alto === null ? "" : String(a.alto),
      area: a.area === null ? "" : String(a.area),
      volumen: a.volumen === null ? "" : String(a.volumen),
    })),
  );
  const [guardando, setGuardando] = useState(false);

  function cambiar(indice: number, campo: keyof FilaActividad, valor: string) {
    setFilas(
      filas.map((f, i) => (i === indice ? { ...f, [campo]: valor } : f)),
    );
  }

  async function guardar() {
    setGuardando(true);
    try {
      await api.partes.guardar(parte.id, {
        actividades: filas.map((f) => ({
          id: f.id || null,
          clave: f.clave,
          texto: f.texto,
          descripcion: f.descripcion,
          observaciones: f.observaciones,
          longitud: aNumero(f.longitud),
          ancho: aNumero(f.ancho),
          alto: aNumero(f.alto),
          area: aNumero(f.area),
          volumen: aNumero(f.volumen),
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

  // El catálogo depende del tipo de máquina en la bitácora vieja; en el parte de
  // obra no hay una sola máquina, así que se ofrecen todas.
  const opciones = actividadesDe(null).map((a) => ({
    valor: a.clave,
    etiqueta: a.nombre,
  }));

  return (
    <Seccion titulo={`Actividades (${filas.length})`}>
      {filas.length > 0 ? (
        <Bloque>
          {filas.map((fila, indice) => (
            <FilaDeFormulario key={indice} ultima={indice === filas.length - 1}>
              <Selector
                etiqueta="Actividad"
                valor={fila.clave}
                opciones={opciones}
                onChange={(v) => cambiar(indice, "clave", v ?? "")}
                ancho={240}
              />
              {fila.clave === CLAVE_OTRA ? (
                <Campo
                  etiqueta="¿Cuál?"
                  valor={fila.texto}
                  onChange={(v) => cambiar(indice, "texto", v)}
                  ancho={220}
                />
              ) : null}
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
              <Campo
                etiqueta="Área"
                valor={fila.area}
                onChange={(v) => cambiar(indice, "area", v)}
                soloNumeros
                ancho={110}
              />
              <Campo
                etiqueta="Volumen"
                valor={fila.volumen}
                onChange={(v) => cambiar(indice, "volumen", v)}
                soloNumeros
                ancho={110}
              />
              <Campo
                etiqueta="Observaciones"
                valor={fila.observaciones}
                onChange={(v) => cambiar(indice, "observaciones", v)}
                ancho={300}
              />
              {fila.id ? (
                <SubirFoto
                  titulo="Foto de la actividad"
                  rutaDeSubida={`/api/panel/partes/${parte.id}/foto?item=${fila.id}`}
                  fotos={fotos.datos
                    .filter((f) => f.itemKey === fila.id)
                    .map((f) => f.id)}
                  editable={editable}
                  alSubir={fotos.recargar}
                />
              ) : (
                <Ayuda>
                  Guarde la actividad para poder adjuntarle una fotografía.
                </Ayuda>
              )}
              {editable ? (
                <AccionesFormulario>
                  <Boton
                    titulo="Quitar actividad"
                    tono="peligro"
                    onPress={() =>
                      setFilas(filas.filter((_, i) => i !== indice))
                    }
                  />
                </AccionesFormulario>
              ) : null}
            </FilaDeFormulario>
          ))}
        </Bloque>
      ) : null}

      {editable ? (
        <Acciones>
          <Boton
            titulo="Añadir actividad"
            tono="secundario"
            onPress={() =>
              setFilas([
                ...filas,
                {
                  id: "",
                  clave: opciones[0]?.valor ?? CLAVE_OTRA,
                  texto: "",
                  descripcion: "",
                  observaciones: "",
                  longitud: "",
                  ancho: "",
                  alto: "",
                  area: "",
                  volumen: "",
                },
              ])
            }
          />
          <Boton
            titulo="Guardar actividades"
            onPress={guardar}
            deshabilitado={guardando}
          />
        </Acciones>
      ) : null}

      {filas.length === 0 && !editable ? (
        <Aviso tono="info">Ese día no se registró ninguna actividad.</Aviso>
      ) : null}
    </Seccion>
  );
}

/* ------------------------------------------------------------------------ */
/* Clima                                                                     */
/* ------------------------------------------------------------------------ */

function SeccionClima({ parte, editable, alGuardar, alFallar }: PropsSeccion) {
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
    <Seccion
      titulo={`Clima (${filas.length} ${filas.length === 1 ? "tramo" : "tramos"})`}
    >
      {filas.length > 0 ? (
        <Bloque>
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
        </Bloque>
      ) : null}

      {error ? <Aviso tono="error">{mensajeDeFranja(error)}</Aviso> : null}

      {editable ? (
        <Acciones>
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
          <Boton
            titulo="Guardar clima"
            onPress={guardar}
            deshabilitado={guardando || error !== null}
          />
        </Acciones>
      ) : null}

      {filas.length === 0 && !editable ? (
        <Aviso tono="info">Ese día no se registró el clima.</Aviso>
      ) : null}
    </Seccion>
  );
}

/* ------------------------------------------------------------------------ */
/* Laboratorio                                                               */
/* ------------------------------------------------------------------------ */

function SeccionLaboratorio({
  parte,
  editable,
  alGuardar,
  alFallar,
}: PropsSeccion) {
  const [filas, setFilas] = useState<FilaMaterial[]>(() =>
    parte.laboratorio.map((m) => ({
      material: m.material,
      cantidad: String(m.cantidad),
    })),
  );
  const [guardando, setGuardando] = useState(false);

  function cambiar(indice: number, campo: keyof FilaMaterial, valor: string) {
    setFilas(
      filas.map((f, i) => (i === indice ? { ...f, [campo]: valor } : f)),
    );
  }

  async function guardar() {
    setGuardando(true);
    try {
      await api.partes.guardar(parte.id, {
        laboratorio: filas.map((f) => ({
          material: f.material,
          cantidad: aNumero(f.cantidad) ?? 0,
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

  const columnas: Columna<{
    id: string;
    material: string;
    nombre: string;
    cantidad: number;
    unidad: string;
  }>[] = [
    {
      clave: "material",
      titulo: "Material",
      ancho: 260,
      pintar: (m) => <Celda>{m.nombre}</Celda>,
    },
    {
      clave: "cantidad",
      titulo: "Cantidad",
      ancho: 180,
      pintar: (m) => <Celda>{`${m.cantidad} ${m.unidad}`}</Celda>,
    },
  ];

  return (
    <Seccion titulo={`Laboratorio (${filas.length})`}>
      {editable ? (
        <>
          {filas.length > 0 ? (
            <Bloque>
              {filas.map((fila, indice) => {
                const material = materialPorId(fila.material);
                return (
                  <FilaDeFormulario
                    key={indice}
                    ultima={indice === filas.length - 1}
                  >
                    <Selector
                      etiqueta="Material"
                      valor={fila.material}
                      opciones={MATERIALES_LABORATORIO.map((m) => ({
                        valor: m.id,
                        etiqueta: m.nombre,
                        detalle: ETIQUETA_UNIDAD[m.unidad],
                      }))}
                      onChange={(v) => cambiar(indice, "material", v ?? "")}
                      ancho={260}
                    />
                    <Campo
                      etiqueta={`Cantidad${material ? ` (${ETIQUETA_UNIDAD[material.unidad]})` : ""}`}
                      valor={fila.cantidad}
                      onChange={(v) => cambiar(indice, "cantidad", v)}
                      soloNumeros
                      ancho={180}
                    />
                    <AccionesFormulario>
                      <Boton
                        titulo="Quitar"
                        tono="peligro"
                        onPress={() =>
                          setFilas(filas.filter((_, i) => i !== indice))
                        }
                      />
                    </AccionesFormulario>
                  </FilaDeFormulario>
                );
              })}
            </Bloque>
          ) : null}
          <Acciones>
            <Boton
              titulo="Añadir material"
              tono="secundario"
              onPress={() =>
                setFilas([
                  ...filas,
                  { material: MATERIALES_LABORATORIO[0].id, cantidad: "" },
                ])
              }
            />
            <Boton
              titulo="Guardar laboratorio"
              onPress={guardar}
              deshabilitado={guardando}
            />
          </Acciones>
        </>
      ) : (
        <Tabla
          columnas={columnas}
          filas={parte.laboratorio}
          vacio="Ese día no se consumió material de laboratorio."
        />
      )}
    </Seccion>
  );
}

/* ------------------------------------------------------------------------ */
/* Notas                                                                     */
/* ------------------------------------------------------------------------ */

function SeccionNotas({ parte, editable, alGuardar, alFallar }: PropsSeccion) {
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
    <Seccion titulo="Notas y observaciones">
      {editable ? (
        <Formulario>
          <Campo
            etiqueta="Del día"
            valor={notas}
            onChange={setNotas}
            ayuda="Lo que haya que dejar dicho y no quepa en las secciones de arriba."
          />
          <AccionesFormulario>
            <Boton
              titulo="Guardar notas"
              onPress={guardar}
              deshabilitado={guardando}
            />
          </AccionesFormulario>
        </Formulario>
      ) : (
        <Aviso tono="info">{parte.notas ?? "Sin notas ese día."}</Aviso>
      )}
    </Seccion>
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
}: {
  parte: ParteFila;
  editable: boolean;
}) {
  const fotos = useListado<{
    id: string;
    itemKey: string | null;
    disponible: boolean;
  }>(useCallback(() => api.partes.fotos(parte.id), [parte.id]));

  // Las que no llevan `itemKey` son del día; las que lo llevan son de una
  // actividad y se pintan en su fila.
  const delDia = fotos.datos.filter((f) => f.itemKey === null).map((f) => f.id);

  return (
    <Seccion titulo="Fotografía del día">
      <SubirFoto
        titulo="Añadir fotografía"
        rutaDeSubida={`/api/panel/partes/${parte.id}/foto`}
        fotos={delDia}
        editable={editable}
        alSubir={fotos.recargar}
      />
    </Seccion>
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
  alFallar,
}: {
  parte: ParteFila;
  editable: boolean;
  cerrado: boolean;
  anulado: boolean;
  puedeAnular: boolean;
  alCambiar: () => void;
  alFallar: (mensaje: string | null) => void;
}) {
  const [anulando, setAnulando] = useState(false);
  const [motivo, setMotivo] = useState("");
  const [ocupado, setOcupado] = useState(false);

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
    <Seccion titulo="Cerrar la jornada">
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
              valor={motivo}
              onChange={setMotivo}
              ayuda="Queda guardado con su nombre. El parte anulado no se borra y el día vuelve a quedar libre."
              ancho={420}
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
    </Seccion>
  );
}

const estilos = StyleSheet.create({
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
