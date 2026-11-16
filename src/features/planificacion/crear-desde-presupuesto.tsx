/**
 * Crear el borrador de planificación desde el presupuesto vigente, con el calendario que propone la
 * IA (spec 045, RF-8 a RF-31, RF-112, RF-113, RF-142).
 *
 * La ventana pide lo que el servidor exige —plazo, mes de arranque, el grupo si el presupuesto
 * tiene varios— y ofrece de dónde copiar los indirectos. Las mismas validaciones corren antes en la
 * pantalla, con la regla (`validarPlazo`), para no esperar una respuesta del servidor por un dato
 * mal escrito; el servidor las repite igual.
 *
 * La propuesta corre por detrás (RF-31): aquí se consulta cada pocos segundos y se muestra cuánto
 * lleva. Como en la subida del Excel, la lectura queda anotada en este navegador, y al volver a la
 * página se retoma el progreso. Si mientras tanto otra persona intenta crear un borrador en esta
 * obra, el servidor le responde que hay una propuesta en curso (RF-29).
 *
 * Lo anotado es solo de este navegador, así que al abrir la pantalla también se le pregunta al
 * servidor (RF-28): quien la abre desde otro equipo ve la misma espera, con el tiempo que lleva
 * desde que empezó, y al terminar se le abre el borrador igual que a quien la lanzó.
 */
import { useCallback, useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { FuentePanel, Panel, TextoPanel } from '@/constants/theme';
import { api, ErrorApi, mensajeDe } from '@/features/panel/cliente-api';
import { Acciones, Aviso, Boton, Campo, Casilla, Modal, Selector } from '@/features/panel/componentes';
import type { FuenteDeIndirectosFila, PlanificacionFila } from '@/features/panel/planificacion';
import { fechaDeJornada } from '@/shared/rules/jornada';
import { validarPlazo } from '@/shared/rules/planificacion';

const CADA_CUANTO_MS = 3000;

/** La propuesta en curso de cada obra, en este navegador. Puede no estar: es solo una comodidad. */
const llaveDeLaPropuesta = (obraId: string) => `planificacion:propuesta:${obraId}`;
function propuestaAnotada(obraId: string): string | null {
  try {
    return window.localStorage.getItem(llaveDeLaPropuesta(obraId));
  } catch {
    return null;
  }
}
function anotarPropuesta(obraId: string, lecturaId: string | null) {
  try {
    if (lecturaId) window.localStorage.setItem(llaveDeLaPropuesta(obraId), lecturaId);
    else window.localStorage.removeItem(llaveDeLaPropuesta(obraId));
  } catch {
    // Sin almacenamiento, al volver no se retoma el progreso; el borrador aparece igual en la lista.
  }
}

/** La hora de ahora, fuera del componente: se llama en manejadores, nunca al dibujar. */
const ahoraMismo = () => Date.now();

function transcurrido(desde: number, ahora: number): string {
  const segundos = Math.max(0, Math.round((ahora - desde) / 1000));
  return `${Math.floor(segundos / 60)}:${String(segundos % 60).padStart(2, '0')}`;
}

type Grupo = { id: string; nombre: string };
type Paso = { tipo: 'nada' } | { tipo: 'pedir' } | { tipo: 'proponiendo'; lecturaId: string; desde: number };

/**
 * El botón «Crear desde el presupuesto» y, debajo, el progreso de la propuesta. `borrador` es el de
 * la obra, si lo hay, para pedir confirmación antes de sustituirlo (RF-142).
 */
export function CrearDesdePresupuesto({
  obraId,
  borrador,
  alTerminar,
}: {
  obraId: string;
  borrador: PlanificacionFila | undefined;
  alTerminar: (planificacionId: string) => void;
}) {
  const [paso, setPaso] = useState<Paso>(() => {
    const anotada = propuestaAnotada(obraId);
    return anotada ? { tipo: 'proponiendo', lecturaId: anotada, desde: Date.now() } : { tipo: 'nada' };
  });
  const [ahora, setAhora] = useState(() => Date.now());
  const [error, setError] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  // Lo que se pide.
  const [meses, setMeses] = useState('');
  const [arranque, setArranque] = useState(() => fechaDeJornada().slice(0, 7));
  const [grupos, setGrupos] = useState<Grupo[] | null>(null);
  const [grupoId, setGrupoId] = useState<string | null>(null);
  const [fuentes, setFuentes] = useState<FuenteDeIndirectosFila[]>([]);
  const [copiarDe, setCopiarDe] = useState<string | null>(null);
  const [sustituir, setSustituir] = useState(false);

  async function abrir() {
    setError(null);
    setSustituir(false);
    setPaso({ tipo: 'pedir' });
    try {
      // RF-9, RF-10: sin presupuesto vigente no hay de dónde; el servidor lo dice igual al enviar.
      const presupuestos = await api.presupuestos.listar(obraId);
      const vigente = presupuestos.find((p) => p.estado === 'vigente');
      if (!vigente) {
        setGrupos([]);
        setError('Esta obra no tiene presupuesto vigente. Primero hay que aprobar el presupuesto en Contrato y luego crear la planificación.');
      } else {
        const detalle = await api.presupuestos.de(vigente.id);
        const deLaObra = detalle.estructura.grupos.map((g) => ({ id: g.id, nombre: g.nombre || 'Todo el presupuesto' }));
        setGrupos(deLaObra);
        setGrupoId(deLaObra.length === 1 ? deLaObra[0].id : null);
      }
      setFuentes(await api.planificaciones.paraCopiarIndirectos());
    } catch (fallo) {
      setError(mensajeDe(fallo));
    }
  }

  const consultar = useCallback(
    async (lecturaId: string) => {
      try {
        const estado = await api.planificaciones.lectura(lecturaId);
        if (estado.estado === 'en_curso') return;
        anotarPropuesta(obraId, null);
        setPaso({ tipo: 'nada' });
        if (estado.estado === 'lista' && estado.planificacionId) alTerminar(estado.planificacionId);
        else setError(estado.error ?? 'La propuesta no se pudo terminar.');
      } catch (fallo) {
        if (fallo instanceof ErrorApi && fallo.estado === 404) {
          anotarPropuesta(obraId, null);
          setPaso({ tipo: 'nada' });
        }
      }
    },
    [obraId, alTerminar],
  );

  // RF-28: la que corre en el servidor, la haya lanzado este navegador o no.
  useEffect(() => {
    let vigente = true;
    api.planificaciones
      .propuestaEnCurso(obraId)
      .then((viva) => {
        if (!vigente || !viva) return;
        const desde = Date.parse(viva.desde);
        setPaso((actual) =>
          actual.tipo === 'nada' || (actual.tipo === 'proponiendo' && actual.lecturaId === viva.lecturaId)
            ? { tipo: 'proponiendo', lecturaId: viva.lecturaId, desde }
            : actual,
        );
      })
      // Es una ayuda: si falla, la pantalla queda como estaba y el 409 sigue avisando (RF-29).
      .catch(() => undefined);
    return () => {
      vigente = false;
    };
  }, [obraId]);

  const proponiendo = paso.tipo === 'proponiendo' ? paso.lecturaId : null;
  useEffect(() => {
    if (!proponiendo) return;
    const reloj = setInterval(() => setAhora(Date.now()), 1000);
    const sondeo = setInterval(() => void consultar(proponiendo), CADA_CUANTO_MS);
    const primera = setTimeout(() => void consultar(proponiendo), 0);
    return () => {
      clearInterval(reloj);
      clearInterval(sondeo);
      clearTimeout(primera);
    };
  }, [proponiendo, consultar]);

  const plazo = { meses: Number(meses), arranque: arranque.trim() };
  const errorDelPlazo = meses.trim() === '' ? null : validarPlazo(plazo);
  const faltaGrupo = grupos !== null && grupos.length > 1 && !grupoId;
  const listo = meses.trim() !== '' && !errorDelPlazo && grupos !== null && grupos.length > 0 && !faltaGrupo && (!borrador || sustituir);

  async function crear() {
    setEnviando(true);
    setError(null);
    try {
      const { lecturaId } = await api.planificaciones.desdePresupuesto(obraId, {
        plazo,
        grupoId: grupos && grupos.length > 1 ? grupoId : null,
        copiarIndirectosDe: copiarDe,
        sustituir,
      });
      anotarPropuesta(obraId, lecturaId);
      setPaso({ tipo: 'proponiendo', lecturaId, desde: ahoraMismo() });
    } catch (fallo) {
      setError(mensajeDe(fallo));
    } finally {
      setEnviando(false);
    }
  }

  return (
    <View style={estilos.columna}>
      <Acciones>
        <Boton titulo="Crear desde el presupuesto" tono="secundario" onPress={() => void abrir()} deshabilitado={paso.tipo !== 'nada'} />
      </Acciones>
      {error && paso.tipo === 'nada' ? <Aviso tono="error">{error}</Aviso> : null}

      {paso.tipo === 'proponiendo' ? (
        <Aviso tono="info">
          {`La IA está proponiendo el calendario del borrador… ${transcurrido(paso.desde, ahora)}. Suele tardar menos de un minuto. Puede cerrar esta página: la propuesta sigue, y al volver verá el borrador.`}
        </Aviso>
      ) : null}

      {paso.tipo === 'pedir' ? (
        <Modal titulo="Crear la planificación desde el presupuesto" onCerrar={() => setPaso({ tipo: 'nada' })} amplia>
          <View style={estilos.columna}>
            <Text style={estilos.texto}>
              Se copian los ítems y rubros del presupuesto vigente con su medida real igual a la contractual y sin costos. La IA
              propone en qué mes empieza cada uno y cuánto dura; después todo se corrige en pantalla.
            </Text>
            <Campo
              etiqueta="Plazo de la obra, en meses"
              valor={meses}
              onChange={setMeses}
              soloNumeros
              obligatorio
              ancho={240}
              error={errorDelPlazo && !errorDelPlazo.includes('arranque') ? errorDelPlazo : undefined}
            />
            <Campo
              etiqueta="Mes de arranque"
              valor={arranque}
              onChange={setArranque}
              ayuda="El mes 1 del plazo, como 2026-01. Puede ser un mes ya pasado."
              obligatorio
              ancho={240}
              error={errorDelPlazo?.includes('arranque') ? errorDelPlazo : undefined}
            />
            {grupos && grupos.length > 1 ? (
              <Selector
                etiqueta="Grupo (frente) que se planifica"
                valor={grupoId}
                opciones={grupos.map((g) => ({ valor: g.id, etiqueta: g.nombre }))}
                onChange={setGrupoId}
                vacio="Escoja el grupo"
                obligatorio
                ancho={600}
              />
            ) : null}
            <Selector
              etiqueta="Copiar los costos indirectos de"
              valor={copiarDe}
              opciones={fuentes.map((f) => ({
                valor: f.id,
                etiqueta: `${f.obra} · v${f.numeroVersion}`,
                detalle: `${f.estado === 'vigente' ? 'Vigente' : 'Reemplazada'} · ${f.renglones} renglones`,
              }))}
              onChange={setCopiarDe}
              vacio={fuentes.length === 0 ? 'No hay planificaciones con indirectos por renglón' : 'No copiar: empezar sin indirectos'}
              ancho={600}
            />
            {borrador ? (
              <Casilla
                etiqueta={`Sustituir el borrador v${borrador.numeroVersion}. El anterior queda descartado, no se borra.`}
                marcada={sustituir}
                onChange={setSustituir}
              />
            ) : null}
            {error ? <Aviso tono="error">{error}</Aviso> : null}
            <Acciones>
              <Boton titulo={enviando ? 'Enviando…' : 'Crear el borrador'} tono="primario" onPress={() => void crear()} deshabilitado={!listo || enviando} />
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
});
