/**
 * Subir el Excel de planificación y leerlo (spec 043, RF-1, RF-4, RF-6, RF-43, RF-100, RF-103,
 * RF-107, RF-117).
 *
 * Tres pasos con el mismo archivo, que se guarda en memoria mientras la ventana está abierta:
 *
 *  1. La IA propone las hojas y la persona confirma: una sola hoja de frente (RF-100), la de la
 *     programación (la línea base, si el libro la trae; si no, con su confirmación, RF-103) y las
 *     demás que quiera dejar. Lo que se manda lo arma `armarSeleccion`, no esta pantalla.
 *  2. La lectura corre por detrás en el servidor; aquí se consulta cada pocos segundos y se muestra
 *     cuánto lleva. Puede tardar cuatro minutos y no hay por qué esperar mirando: la lectura de cada
 *     obra queda anotada en este navegador, y al volver a la página se retoma el progreso, o se ve
 *     el borrador si ya terminó. Es una comodidad de quien la lanzó, no el estado de la lectura,
 *     que vive en el servidor.
 *  3. Si un frente no se pudo asociar a un grupo del presupuesto (RF-107), se escoge aquí y se
 *     vuelve a mandar el mismo archivo: la lectura guardada hace que no cueste otra vez.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { FuentePanel, Panel, TextoPanel } from '@/constants/theme';
import { elegirArchivo } from '@/features/contratos/elegir-archivo';
import { api, ErrorApi, mensajeDe } from '@/features/panel/cliente-api';
import { Acciones, Aviso, Boton, Casilla, Modal, Selector } from '@/features/panel/componentes';
import type { EstadoDeLectura, PropuestaDeHojasRespuesta } from '@/features/panel/planificacion';
import type { FrenteSinGrupo } from '@/shared/rules/planificacion';
import { armarSeleccion, type FaltaDeSeleccion, type UsoDeHoja } from '@/shared/rules/planificacion-ia';

const XLSX = '.xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
const CADA_CUANTO_MS = 3000;

const NOMBRE_DEL_USO: Record<UsoDeHoja, string> = {
  planificacion: 'planificación por ítem',
  programacion: 'programación mensual',
  indirectos: 'indirectos',
  rubros: 'rubros',
  supuestos: 'supuestos',
  objetivos: 'objetivos',
  tiempos: 'mes de inicio y tiempo de ejecución',
};

/** La lectura en curso de cada obra, en este navegador. Puede no estar: es solo una comodidad. */
const llaveDeLaLectura = (obraId: string) => `planificacion:lectura:${obraId}`;
function lecturaAnotada(obraId: string): string | null {
  try {
    return window.localStorage.getItem(llaveDeLaLectura(obraId));
  } catch {
    return null;
  }
}
function anotarLectura(obraId: string, lecturaId: string | null) {
  try {
    if (lecturaId) window.localStorage.setItem(llaveDeLaLectura(obraId), lecturaId);
    else window.localStorage.removeItem(llaveDeLaLectura(obraId));
  } catch {
    // Sin almacenamiento, al volver no se retoma el progreso; el borrador aparece igual en la lista.
  }
}

function transcurrido(desde: number, ahora: number): string {
  const segundos = Math.max(0, Math.round((ahora - desde) / 1000));
  return `${Math.floor(segundos / 60)}:${String(segundos % 60).padStart(2, '0')}`;
}

type Paso =
  | { tipo: 'nada' }
  | { tipo: 'proponiendo' }
  | { tipo: 'confirmar'; respuesta: PropuestaDeHojasRespuesta }
  | { tipo: 'leyendo'; lecturaId: string; desde: number }
  | { tipo: 'grupo'; candidatos: FrenteSinGrupo[] };

/**
 * El botón de subir y, debajo, el progreso de una lectura de esta obra. `alTerminar` recibe el id
 * del borrador creado, para abrirlo.
 */
export function SubirPlanificacion({ obraId, alTerminar }: { obraId: string; alTerminar: (planificacionId: string) => void }) {
  // Si este navegador dejó una lectura de esta obra, se retoma. La pantalla monta este componente
  // con `key` de la obra, así que el valor inicial basta.
  const [paso, setPaso] = useState<Paso>(() => {
    const anotada = lecturaAnotada(obraId);
    return anotada ? { tipo: 'leyendo', lecturaId: anotada, desde: Date.now() } : { tipo: 'nada' };
  });
  const [archivo, setArchivo] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [faltas, setFaltas] = useState<FaltaDeSeleccion[]>([]);
  const [ahora, setAhora] = useState(() => Date.now());

  // Lo que se escoge en la confirmación.
  const [frente, setFrente] = useState<string | null>(null);
  const [programacion, setProgramacion] = useState<string | null>(null);
  const [otras, setOtras] = useState<string[]>([]);
  const [confirmoProgramacion, setConfirmoProgramacion] = useState(false);
  const [sustituir, setSustituir] = useState(false);
  const [grupos, setGrupos] = useState<Record<string, string>>({});
  const [enviando, setEnviando] = useState(false);
  const ultimaPropuesta = useRef<PropuestaDeHojasRespuesta | null>(null);

  const consultar = useCallback(
    async (lecturaId: string) => {
      let estado: EstadoDeLectura;
      try {
        estado = await api.planificaciones.lectura(lecturaId);
      } catch (fallo) {
        // Una lectura que ya no existe o no es de esta obra: se olvida.
        if (fallo instanceof ErrorApi && fallo.estado === 404) {
          anotarLectura(obraId, null);
          setPaso({ tipo: 'nada' });
        }
        return;
      }
      if (estado.estado === 'en_curso') return;
      anotarLectura(obraId, null);
      if (estado.estado === 'lista' && estado.planificacionId) {
        setPaso({ tipo: 'nada' });
        setArchivo(null);
        alTerminar(estado.planificacionId);
      } else if (estado.estado === 'falta_grupo' && estado.candidatos) {
        setGrupos({});
        setPaso({ tipo: 'grupo', candidatos: estado.candidatos });
      } else {
        setPaso({ tipo: 'nada' });
        setError(estado.error ?? 'La lectura no se pudo terminar.');
      }
    },
    [obraId, alTerminar],
  );

  // Mientras lee: el reloj cada segundo y el servidor cada tres.
  const leyendo = paso.tipo === 'leyendo' ? paso.lecturaId : null;
  useEffect(() => {
    if (!leyendo) return;
    const reloj = setInterval(() => setAhora(Date.now()), 1000);
    const sondeo = setInterval(() => void consultar(leyendo), CADA_CUANTO_MS);
    const primera = setTimeout(() => void consultar(leyendo), 0);
    return () => {
      clearInterval(reloj);
      clearInterval(sondeo);
      clearTimeout(primera);
    };
  }, [leyendo, consultar]);

  async function subir() {
    const elegido = await elegirArchivo(XLSX);
    if (!elegido) return;
    setError(null);
    setFaltas([]);
    setArchivo(elegido);
    setPaso({ tipo: 'proponiendo' });
    try {
      const respuesta = await api.planificaciones.proponerHojas(obraId, elegido);
      ultimaPropuesta.current = respuesta;
      const { hojas } = respuesta.propuesta;
      const deFrente = hojas.filter((h) => h.usos.includes('planificacion')).map((h) => h.nombre);
      const lineaBase = hojas.find((h) => h.clase === 'linea_base')?.nombre;
      const deProgramacion = lineaBase ?? hojas.find((h) => h.usos.includes('programacion'))?.nombre ?? null;
      // Con un solo frente se da por escogido; con varios, la persona escoge (RF-100).
      setFrente(deFrente.length === 1 ? deFrente[0] : null);
      setProgramacion(deProgramacion);
      setOtras(hojas.filter((h) => !h.usos.includes('planificacion') && h.nombre !== deProgramacion).map((h) => h.nombre));
      setConfirmoProgramacion(false);
      setSustituir(false);
      setPaso({ tipo: 'confirmar', respuesta });
    } catch (fallo) {
      setPaso({ tipo: 'nada' });
      setError(mensajeDe(fallo));
    }
  }

  async function leer(conGrupos: Record<string, string> = {}) {
    const respuesta = ultimaPropuesta.current;
    if (!archivo || !respuesta || !frente || !programacion) return;
    setEnviando(true);
    setError(null);
    setFaltas([]);
    try {
      const seleccion = armarSeleccion(respuesta.propuesta, { frente, programacion, otras, confirmoProgramacion });
      const { lecturaId } = await api.planificaciones.leer(obraId, archivo, seleccion, {
        sustituir: sustituir || Object.keys(conGrupos).length > 0,
        grupos: conGrupos,
      });
      anotarLectura(obraId, lecturaId);
      setPaso({ tipo: 'leyendo', lecturaId, desde: Date.now() });
    } catch (fallo) {
      const cuerpo = fallo instanceof ErrorApi ? (fallo.cuerpo as { faltas?: FaltaDeSeleccion[] } | undefined) : undefined;
      setFaltas(cuerpo?.faltas ?? []);
      setError(mensajeDe(fallo));
    } finally {
      setEnviando(false);
    }
  }

  function cerrar() {
    setPaso({ tipo: 'nada' });
    setArchivo(null);
    setFaltas([]);
  }

  const respuesta = paso.tipo === 'confirmar' ? paso.respuesta : null;
  const hojasDeFrente = respuesta?.propuesta.hojas.filter((h) => h.usos.includes('planificacion')) ?? [];
  const sinLineaBase = respuesta ? !respuesta.propuesta.hojas.some((h) => h.clase === 'linea_base') : false;
  const listo = Boolean(frente && programacion && (!sinLineaBase || confirmoProgramacion) && (!respuesta?.borrador || sustituir));

  return (
    <View style={estilos.columna}>
      <Acciones>
        <Boton
          titulo={paso.tipo === 'proponiendo' ? 'Revisando el libro…' : 'Subir Excel de planificación'}
          tono="primario"
          onPress={() => void subir()}
          deshabilitado={paso.tipo !== 'nada'}
        />
      </Acciones>
      {error && paso.tipo !== 'confirmar' && paso.tipo !== 'grupo' ? <Aviso tono="error">{error}</Aviso> : null}

      {paso.tipo === 'leyendo' ? (
        <Aviso tono="info">
          {`Leyendo el Excel… ${transcurrido(paso.desde, ahora)}. Puede tardar hasta cuatro minutos. Puede cerrar esta página: la lectura sigue, y al volver verá el borrador.`}
        </Aviso>
      ) : null}

      {respuesta ? (
        <Modal titulo={`Confirmar las hojas de «${archivo?.name ?? 'el libro'}»`} onCerrar={cerrar} amplia>
          <View style={estilos.columna}>
            <Text style={estilos.texto}>
              La IA propuso para qué sirve cada hoja. Revise y confirme: solo se leen las hojas que deje.
            </Text>
            <Selector
              etiqueta="Hoja de planificación (un solo frente)"
              valor={frente}
              opciones={(hojasDeFrente.length ? hojasDeFrente.map((h) => h.nombre) : respuesta.hojasVisibles).map((n) => ({ valor: n, etiqueta: n }))}
              onChange={setFrente}
              vacio="Escoja el frente"
              obligatorio
              ancho={420}
            />
            {hojasDeFrente.length > 1 ? (
              <Text style={estilos.pie}>El libro trae una hoja por frente. Se carga uno solo; el otro va en otra obra o en otra planificación.</Text>
            ) : null}
            <Selector
              etiqueta={sinLineaBase ? 'Hoja con la programación inicial' : 'Línea base (programación mensual)'}
              valor={programacion}
              opciones={respuesta.hojasVisibles.map((n) => ({ valor: n, etiqueta: n }))}
              onChange={setProgramacion}
              vacio="Escoja la hoja"
              obligatorio
              ancho={420}
            />
            {sinLineaBase ? (
              <Casilla
                etiqueta="Confirmo que esta hoja tiene la programación inicial del contrato."
                marcada={confirmoProgramacion}
                onChange={setConfirmoProgramacion}
              />
            ) : null}
            <Text style={estilos.subtitulo}>Las demás hojas propuestas</Text>
            {respuesta.propuesta.hojas
              .filter((h) => !h.usos.includes('planificacion') && h.nombre !== programacion)
              .map((h) => (
                <Casilla
                  key={h.nombre}
                  etiqueta={`${h.nombre}: ${h.usos.map((u) => NOMBRE_DEL_USO[u]).join(', ')}`}
                  marcada={otras.includes(h.nombre)}
                  onChange={(marcada) => setOtras(marcada ? [...otras, h.nombre] : otras.filter((o) => o !== h.nombre))}
                />
              ))}
            {respuesta.borrador ? (
              <Casilla
                etiqueta={`Sustituir el borrador v${respuesta.borrador.numeroVersion}. El anterior queda descartado, no se borra.`}
                marcada={sustituir}
                onChange={setSustituir}
              />
            ) : null}
            {error ? <Aviso tono="error">{error}</Aviso> : null}
            {faltas.length > 1 ? faltas.slice(1).map((f) => <Aviso key={f.tipo} tono="error">{f.mensaje}</Aviso>) : null}
            <Acciones>
              <Boton titulo={enviando ? 'Enviando…' : 'Leer las hojas'} tono="primario" onPress={() => void leer()} deshabilitado={!listo || enviando} />
              <Boton titulo="Cancelar" tono="secundario" onPress={cerrar} />
            </Acciones>
          </View>
        </Modal>
      ) : null}

      {paso.tipo === 'grupo' ? (
        <Modal titulo="Escoja el frente del presupuesto" onCerrar={cerrar} amplia>
          <View style={estilos.columna}>
            <Text style={estilos.texto}>
              Un frente del libro cuadra igual con más de un grupo del presupuesto. Escoja a cuál corresponde; se crea el borrador
              sin volver a leer el libro.
            </Text>
            {paso.candidatos.map((f) => (
              <Selector
                key={f.frente}
                etiqueta={`Frente del libro: ${f.frente}`}
                valor={grupos[f.frente] ?? null}
                opciones={f.candidatos.map((c) => ({ valor: c.id, etiqueta: c.nombre, detalle: `${c.coincidencias} ítems coinciden` }))}
                onChange={(v) => setGrupos((g) => ({ ...g, ...(v ? { [f.frente]: v } : {}) }))}
                vacio="Escoja el grupo"
                obligatorio
                ancho={600}
              />
            ))}
            {!archivo ? <Aviso tono="info">Para escoger el grupo hace falta el archivo: vuelva a subirlo.</Aviso> : null}
            {error ? <Aviso tono="error">{error}</Aviso> : null}
            <Acciones>
              <Boton
                titulo={enviando ? 'Enviando…' : 'Crear el borrador'}
                tono="primario"
                onPress={() => void leer(grupos)}
                deshabilitado={!archivo || enviando || paso.candidatos.some((f) => !grupos[f.frente])}
              />
              <Boton titulo="Cancelar" tono="secundario" onPress={cerrar} />
            </Acciones>
          </View>
        </Modal>
      ) : null}
    </View>
  );
}

const estilos = StyleSheet.create({
  columna: { gap: 12 },
  texto: { fontFamily: FuentePanel.texto, fontSize: TextoPanel.cuerpo, color: Panel.texto },
  subtitulo: { fontFamily: FuentePanel.texto, fontWeight: '600', fontSize: TextoPanel.cuerpo, color: Panel.texto },
  pie: { fontFamily: FuentePanel.texto, fontSize: TextoPanel.apoyo, color: Panel.textoApoyo },
});
