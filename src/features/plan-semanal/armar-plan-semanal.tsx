/**
 * Las tres maneras de empezar el plan de una semana (spec 044, RF-2 a RF-5, RF-34, RF-42, RF-52,
 * RF-92, RF-101): que la IA lo proponga, subir el Excel que ya se tiene, o empezarlo en blanco.
 *
 * Las tres pasan por la misma ventana, que pregunta la semana. Al subir un Excel es obligatorio
 * (RF-92): el archivo no dice de qué semana es de un modo que se le pueda creer. Y al proponer evita
 * gastar una llamada a la IA en la semana equivocada. Si esa semana ya tiene borrador, ahí mismo se
 * confirma que se sustituye (RF-52); el anterior queda descartado, no se borra.
 *
 * La propuesta y la lectura corren por detrás en el servidor; aquí se consulta cada pocos segundos
 * y se muestra cuánto lleva. No hay por qué esperar mirando: la que está en curso en cada obra queda
 * anotada en este navegador, y al volver a la página se retoma el progreso, o se ve el borrador si
 * ya terminó. Es una comodidad de quien la lanzó, no el estado, que vive en el servidor.
 */
import { useCallback, useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { FuentePanel, Panel, TextoPanel } from '@/constants/theme';
import { elegirArchivo } from '@/features/contratos/elegir-archivo';
import { api, ErrorApi, mensajeDe } from '@/features/panel/cliente-api';
import { Acciones, Aviso, Boton, Casilla, Modal, Selector } from '@/features/panel/componentes';
import type { EstadoDeLecturaDePlanRespuesta, ListaDePlanesSemanales } from '@/features/panel/plan-semanal';

import { semanaEnTexto } from './estados';

const XLSX = '.xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
const CADA_CUANTO_MS = 3000;

type Manera = 'propuesta' | 'excel' | 'blanco';

const TITULO: Record<Manera, string> = {
  propuesta: 'Proponer el plan con IA',
  excel: 'Subir el Excel del plan',
  blanco: 'Empezar el plan en blanco',
};
const BOTON: Record<Manera, string> = { propuesta: 'Proponer', excel: 'Leer el Excel', blanco: 'Empezar' };
const EN_CURSO: Record<'propuesta' | 'excel', string> = { propuesta: 'Armando la propuesta', excel: 'Leyendo el Excel' };

/** Lo que está en curso en cada obra, en este navegador. Puede no estar: es solo una comodidad. */
interface Anotada {
  lecturaId: string;
  tipo: 'propuesta' | 'excel';
}
const llave = (obraId: string) => `plan-semanal:lectura:${obraId}`;
function anotada(obraId: string): Anotada | null {
  try {
    const guardada = window.localStorage.getItem(llave(obraId));
    const leida = guardada ? (JSON.parse(guardada) as Partial<Anotada>) : null;
    return leida?.lecturaId && (leida.tipo === 'propuesta' || leida.tipo === 'excel') ? { lecturaId: leida.lecturaId, tipo: leida.tipo } : null;
  } catch {
    return null;
  }
}
function anotar(obraId: string, lectura: Anotada | null) {
  try {
    if (lectura) window.localStorage.setItem(llave(obraId), JSON.stringify(lectura));
    else window.localStorage.removeItem(llave(obraId));
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
  | { tipo: 'confirmar'; manera: Manera; archivo: File | null }
  | { tipo: 'corriendo'; lectura: Anotada; desde: number };

/**
 * Los tres botones y, debajo, el progreso de lo que esté corriendo en esta obra. `alTerminar`
 * recibe el id del borrador que quedó, para abrirlo.
 */
export function ArmarPlanSemanal({
  obraId,
  lista,
  alTerminar,
}: {
  obraId: string;
  lista: ListaDePlanesSemanales;
  alTerminar: (planId: string) => void;
}) {
  // La pantalla monta este componente con `key` de la obra, así que el valor inicial basta.
  const [paso, setPaso] = useState<Paso>(() => {
    const pendiente = anotada(obraId);
    return pendiente ? { tipo: 'corriendo', lectura: pendiente, desde: Date.now() } : { tipo: 'nada' };
  });
  const [semana, setSemana] = useState<string | null>(null);
  const [sustituir, setSustituir] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ahora, setAhora] = useState(() => Date.now());

  const consultar = useCallback(
    async (lecturaId: string) => {
      let estado: EstadoDeLecturaDePlanRespuesta;
      try {
        estado = await api.planesSemanales.lectura(lecturaId);
      } catch (fallo) {
        // Una que ya no existe o no es de esta obra: se olvida.
        if (fallo instanceof ErrorApi && fallo.estado === 404) {
          anotar(obraId, null);
          setPaso({ tipo: 'nada' });
        }
        return;
      }
      if (estado.estado === 'en_curso') return;
      anotar(obraId, null);
      setPaso({ tipo: 'nada' });
      if (estado.estado === 'lista' && estado.planId) alTerminar(estado.planId);
      // RF-49: si falló, no hay borrador y se dice por qué.
      else setError(estado.error ?? 'No se pudo terminar.');
    },
    [obraId, alTerminar],
  );

  // Mientras corre: el reloj cada segundo y el servidor cada tres.
  const corriendo = paso.tipo === 'corriendo' ? paso.lectura.lecturaId : null;
  useEffect(() => {
    if (!corriendo) return;
    const reloj = setInterval(() => setAhora(Date.now()), 1000);
    const sondeo = setInterval(() => void consultar(corriendo), CADA_CUANTO_MS);
    const primera = setTimeout(() => void consultar(corriendo), 0);
    return () => {
      clearInterval(reloj);
      clearInterval(sondeo);
      clearTimeout(primera);
    };
  }, [corriendo, consultar]);

  async function abrir(manera: Manera) {
    // El archivo se escoge primero: si la persona cancela, no se abre nada.
    const archivo = manera === 'excel' ? await elegirArchivo(XLSX) : null;
    if (manera === 'excel' && !archivo) return;
    setError(null);
    setSustituir(false);
    // RF-92: la semana del Excel no se supone. Para lo demás se ofrece la que está en curso.
    setSemana(manera === 'excel' ? null : (lista.semanas[0] ?? null));
    setPaso({ tipo: 'confirmar', manera, archivo });
  }

  const borradorDeLaSemana = semana ? lista.planes.find((p) => p.semana === semana && p.estado === 'borrador') : undefined;

  async function confirmar() {
    if (paso.tipo !== 'confirmar' || !semana) return;
    setEnviando(true);
    setError(null);
    try {
      if (paso.manera === 'blanco') {
        const { id } = await api.planesSemanales.crear(obraId, semana);
        setPaso({ tipo: 'nada' });
        alTerminar(id);
        return;
      }
      const tipo = paso.manera;
      const { lecturaId } =
        tipo === 'excel' && paso.archivo
          ? await api.planesSemanales.leer(obraId, semana, paso.archivo, sustituir)
          : await api.planesSemanales.proponer(obraId, semana, sustituir);
      const lectura = { lecturaId, tipo };
      anotar(obraId, lectura);
      setPaso({ tipo: 'corriendo', lectura, desde: Date.now() });
    } catch (fallo) {
      setError(mensajeDe(fallo));
    } finally {
      setEnviando(false);
    }
  }

  const confirmando = paso.tipo === 'confirmar' ? paso : null;
  // En blanco no se sustituye nada: con borrador, se abre ese.
  const estorba = Boolean(borradorDeLaSemana) && (confirmando?.manera === 'blanco' || !sustituir);
  const ocupado = paso.tipo !== 'nada';

  // RF-5: sin planificación aprobada no se arma ningún plan, y se dice en vez de dejar botones que fallan.
  if (!lista.hayPlanificacion) {
    return <Aviso tono="info">Esta obra no tiene una planificación aprobada vigente. Primero hay que aprobar la planificación; después se arma el plan semanal.</Aviso>;
  }

  return (
    <View style={estilos.columna}>
      <Acciones>
        <Boton titulo="Proponer con IA" tono="primario" onPress={() => void abrir('propuesta')} deshabilitado={ocupado} />
        <Boton titulo="Subir Excel" tono="secundario" onPress={() => void abrir('excel')} deshabilitado={ocupado} />
        <Boton titulo="Empezar en blanco" tono="secundario" onPress={() => void abrir('blanco')} deshabilitado={ocupado} />
      </Acciones>
      {error && !confirmando ? <Aviso tono="error">{error}</Aviso> : null}

      {paso.tipo === 'corriendo' ? (
        <Aviso tono="info">
          {`${EN_CURSO[paso.lectura.tipo]}… ${transcurrido(paso.desde, ahora)}. Puede tardar hasta cuatro minutos. Puede cerrar esta página: sigue por detrás, y al volver verá el borrador.`}
        </Aviso>
      ) : null}

      {confirmando ? (
        <Modal titulo={TITULO[confirmando.manera]} onCerrar={() => setPaso({ tipo: 'nada' })} angosta>
          <View style={estilos.columna}>
            {confirmando.archivo ? <Text style={estilos.texto}>{`Archivo: ${confirmando.archivo.name}`}</Text> : null}
            <Selector
              etiqueta={confirmando.manera === 'excel' ? '¿De qué semana es este Excel?' : 'Semana'}
              valor={semana}
              opciones={lista.semanas.map((lunes, n) => ({ valor: lunes, etiqueta: semanaEnTexto(lunes), detalle: n === 0 ? 'Semana en curso' : undefined }))}
              onChange={(elegida) => {
                setSemana(elegida);
                setSustituir(false);
              }}
              vacio="Escoja la semana"
              obligatorio
              ancho={320}
            />
            <Text style={estilos.pie}>Se planean la semana en curso y las cuatro siguientes.</Text>
            {confirmando.manera === 'propuesta' ? (
              <Text style={estilos.pie}>
                La IA arma el borrador con la planificación aprobada, lo pendiente, la semana anterior, los vehículos y el almacén de la obra. Usted lo ajusta después.
              </Text>
            ) : null}
            {borradorDeLaSemana && confirmando.manera === 'blanco' ? (
              <Aviso tono="info">Esa semana ya tiene un borrador. Ábralo desde la lista para seguir ajustándolo.</Aviso>
            ) : null}
            {borradorDeLaSemana && confirmando.manera !== 'blanco' ? (
              <Casilla
                etiqueta="Sustituir el borrador que ya tiene esa semana. El anterior queda descartado, no se borra."
                marcada={sustituir}
                onChange={setSustituir}
              />
            ) : null}
            {error ? <Aviso tono="error">{error}</Aviso> : null}
            <Acciones>
              <Boton
                titulo={enviando ? 'Enviando…' : BOTON[confirmando.manera]}
                tono="primario"
                onPress={() => void confirmar()}
                deshabilitado={!semana || estorba || enviando}
              />
              <Boton titulo="Cancelar" tono="secundario" onPress={() => setPaso({ tipo: 'nada' })} />
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
  pie: { fontFamily: FuentePanel.texto, fontSize: TextoPanel.apoyo, color: Panel.textoApoyo },
});
