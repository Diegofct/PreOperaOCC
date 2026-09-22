/**
 * Registrar un viaje de cantera (spec 010, RF-7 a RF-19, RF-30, RF-34 y RF-35).
 *
 * Todo se **elige** de una lista, salvo la fecha —la hora también, en desplegables de
 * 15 minutos desde la spec 016—: el material, la volqueta,
 * el conductor, el origen y el destino salen de las opciones que el servidor da para
 * esa obra (solo lo vigente y elegible), y el PR y los metros, de sus listas (RF-12,
 * RF-13). Son como mucho ocho elecciones con destino obra (requisito no funcional).
 *
 * ── El PR y los metros solo con destino obra ──
 *
 * Aparecen al elegir «La obra» y **se borran al cambiar a otro destino** (RF-15): si
 * se quedaran guardados en el formulario, el viaje a una planta llegaría con una
 * abscisa que no le corresponde.
 *
 * ── Avisar con las mismas reglas ──
 *
 * Las faltas las dice `validarViaje`, la regla que usa el servidor, y se pintan al
 * intentar guardar. Lo que el servidor rechace bajo un campo se queda en la ventana.
 * Si la bitácora de ese día ya está cerrada, el viaje se guarda y la pantalla lo
 * avisa (RF-30): la ventana solo entrega el aviso.
 */
import { useState } from 'react';

import {
  DESTINO_OBRA,
  OPCIONES_DE_METROS,
  OPCIONES_DE_PR,
  formatearAbscisa,
  validarViaje,
  type CampoDeViaje,
} from '@/shared/rules/cantera';
import { nombreDeCargo } from '@/shared/catalogos/cargos';
import { DESFASE_COLOMBIA_MS, fechaDeJornada } from '@/shared/rules/jornada';

import { api, ErrorApi, mensajeDe } from './cliente-api';
import {
  Acciones,
  AccionesFormulario,
  Aviso,
  Boton,
  Campo,
  Formulario,
  Modal,
  Selector,
  SelectorDeHora,
} from './componentes';
import { ETIQUETA_TIPO_SITIO, type OpcionesDeCantera, type ViajeRegistrado } from './contratos';

/**
 * La hora de ahora en la obra, `HH:MM`, **redondeada hacia abajo al cuarto de hora**.
 *
 * La hora se elige en desplegables de 15 en 15 minutos (spec 016, RF-30). Con los
 * minutos exactos, la ventana abriría con un «37» suelto que no está en la lista.
 * Hacia abajo y no al más cercano: un viaje no puede quedar registrado a una hora que
 * todavía no ha llegado.
 */
function horaDeAhora(): string {
  const ahora = new Date(Date.now() - DESFASE_COLOMBIA_MS).toISOString().slice(11, 16);
  const minutos = Math.floor(Number(ahora.slice(3)) / 15) * 15;
  return `${ahora.slice(0, 3)}${String(minutos).padStart(2, '0')}`;
}

/**
 * Qué le falta a la obra para poder registrar un viaje, o `null`. Primer arranque
 * de la spec: sin un origen, sin material, sin volqueta o sin conductor no hay viaje
 * posible, y la ventana lo dice en vez de enseñar selectores vacíos.
 */
function queFaltaEnLaObra(opciones: OpcionesDeCantera): string | null {
  const faltan: string[] = [];
  if (opciones.sitios.length === 0) faltan.push('un sitio de origen (una cantera o planta)');
  if (opciones.materiales.length === 0) faltan.push('un material de cantera');
  if (opciones.volquetas.length === 0) faltan.push('una volqueta operativa en esta obra');
  if (opciones.conductores.length === 0) {
    faltan.push('una persona de la obra con cargo de conductor u operador');
  }
  if (faltan.length === 0) return null;
  return `Para registrar un viaje falta ${faltan.join(', ')}.`;
}

export function VentanaViaje({
  obraId,
  opciones,
  onCerrar,
  onRegistrado,
}: {
  /** La obra elegida por la gerencia, o `null` para quien trabaja en la suya. */
  obraId: string | null;
  opciones: OpcionesDeCantera;
  onCerrar: () => void;
  onRegistrado: (registro: ViajeRegistrado) => void;
}) {
  const [fecha, setFecha] = useState(fechaDeJornada());
  const [hora, setHora] = useState(horaDeAhora());
  const [materialId, setMaterialId] = useState<string | null>(null);
  const [vehiculoId, setVehiculoId] = useState<string | null>(
    // Con una sola volqueta en la obra no hay nada que elegir.
    opciones.volquetas.length === 1 ? opciones.volquetas[0].id : null,
  );
  const [conductorId, setConductorId] = useState<string | null>(
    opciones.conductores.length === 1 ? opciones.conductores[0].id : null,
  );
  const [origenId, setOrigenId] = useState<string | null>(null);
  const [destino, setDestino] = useState<string | null>(null);
  const [pr, setPr] = useState<number | null>(null);
  const [metros, setMetros] = useState<number | null>(null);

  const [intentado, setIntentado] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [delServidor, setDelServidor] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);

  const aLaObra = destino === DESTINO_OBRA;
  const viaje = { fecha, hora, materialId, vehiculoId, conductorId, origenId, destino, pr, metros };
  const faltas = validarViaje(viaje, fechaDeJornada());
  const faltaDe = (campo: CampoDeViaje) =>
    delServidor[campo] ?? (intentado ? faltas.find((f) => f.campo === campo)?.mensaje : undefined);

  function elegirDestino(valor: string | null) {
    setDestino(valor);
    // RF-15: con otro destino, la abscisa no se guarda; se borra del formulario.
    if (valor !== DESTINO_OBRA) {
      setPr(null);
      setMetros(null);
    }
  }

  async function guardar() {
    setIntentado(true);
    setDelServidor({});
    setError(null);
    if (faltas.length > 0) return;

    setGuardando(true);
    try {
      const registro = await api.cantera.viajes.registrar({
        obraId,
        fecha,
        hora,
        materialId: materialId ?? '',
        vehiculoId: vehiculoId ?? '',
        conductorId: conductorId ?? '',
        origenId: origenId ?? '',
        destino: destino ?? '',
        pr: aLaObra ? pr : null,
        metros: aLaObra ? metros : null,
      });
      onRegistrado(registro);
    } catch (fallo) {
      // Lo que el servidor diga de un campo, bajo ese campo; lo demás, arriba de la
      // ventana (el aviso de la página queda detrás del telón).
      const campos = fallo instanceof ErrorApi ? fallo.campos : undefined;
      if (campos && Object.keys(campos).length > 0) setDelServidor(campos);
      else setError(mensajeDe(fallo));
    } finally {
      setGuardando(false);
    }
  }

  const falta = queFaltaEnLaObra(opciones);
  const sitios = opciones.sitios.map((s) => ({
    valor: s.id,
    etiqueta: s.nombre,
    detalle: ETIQUETA_TIPO_SITIO[s.tipo],
  }));

  return (
    <Modal titulo="Registrar un viaje" onCerrar={onCerrar}>
      {falta ? (
        <>
          <Aviso tono="info">{falta}</Aviso>
          <AccionesFormulario>
            <Boton titulo="Entendido" tono="secundario" onPress={onCerrar} />
          </AccionesFormulario>
        </>
      ) : (
        <>
          {error ? <Aviso tono="error">{error}</Aviso> : null}
          <Formulario>
            <Campo
              etiqueta="Fecha"
              obligatorio
              valor={fecha}
              onChange={setFecha}
              ayuda="AAAA-MM-DD. Hoy, o un día pasado."
              error={faltaDe('fecha')}
              ancho={170}
            />
            <SelectorDeHora
              etiqueta="Hora"
              obligatorio
              valor={hora}
              onChange={setHora}
              error={faltaDe('hora')}
            />
            <Selector
              etiqueta="Material"
              obligatorio
              valor={materialId}
              opciones={opciones.materiales.map((m) => ({ valor: m.id, etiqueta: m.nombre }))}
              onChange={setMaterialId}
              vacio="Elija el material"
              error={faltaDe('materialId')}
              ancho={240}
            />
            <Selector
              etiqueta="Volqueta"
              obligatorio
              valor={vehiculoId}
              opciones={opciones.volquetas.map((v) => ({
                valor: v.id,
                etiqueta: v.codigoInterno,
                detalle: v.placa ?? undefined,
              }))}
              onChange={setVehiculoId}
              vacio="Elija la volqueta"
              error={faltaDe('vehiculoId')}
              ancho={200}
            />
            <Selector
              etiqueta="Conductor"
              obligatorio
              valor={conductorId}
              opciones={opciones.conductores.map((c) => ({
                valor: c.id,
                etiqueta: c.nombreCompleto,
                detalle: nombreDeCargo(c.cargo),
              }))}
              onChange={setConductorId}
              vacio="Elija el conductor"
              error={faltaDe('conductorId')}
              ancho={260}
            />
            <Selector
              etiqueta="Origen"
              obligatorio
              // RF-9: solo sitios. La obra no es origen (fuera de alcance).
              valor={origenId}
              opciones={sitios}
              onChange={setOrigenId}
              vacio="Elija el origen"
              error={faltaDe('origenId')}
              ancho={260}
            />
            <Selector
              etiqueta="Destino"
              obligatorio
              // RF-10: los sitios y, además, la propia obra, primero.
              valor={destino}
              opciones={[{ valor: DESTINO_OBRA, etiqueta: 'La obra', detalle: 'Con PR y metros' }, ...sitios]}
              onChange={elegirDestino}
              vacio="Elija el destino"
              error={faltaDe('destino')}
              ancho={260}
            />
            {aLaObra ? (
              <>
                <Selector
                  etiqueta="PR de llegada"
                  obligatorio
                  valor={pr === null ? null : String(pr)}
                  opciones={OPCIONES_DE_PR.map((n) => ({ valor: String(n), etiqueta: `PR ${n}` }))}
                  onChange={(v) => setPr(v === null ? null : Number(v))}
                  vacio="Elija el PR"
                  error={faltaDe('pr')}
                  ancho={170}
                />
                <Selector
                  etiqueta="Metros"
                  obligatorio
                  valor={metros === null ? null : String(metros)}
                  opciones={OPCIONES_DE_METROS.map((n) => ({
                    valor: String(n),
                    etiqueta: `+ ${String(n).padStart(3, '0')}`,
                  }))}
                  onChange={(v) => setMetros(v === null ? null : Number(v))}
                  vacio="Elija los metros"
                  error={faltaDe('metros')}
                  ancho={170}
                />
              </>
            ) : null}
          </Formulario>

          {aLaObra && pr !== null && metros !== null ? (
            // RF-17: cómo va a quedar escrita la llegada, antes de guardar.
            <Aviso tono="info">{`Llegada: ${formatearAbscisa(pr, metros)}`}</Aviso>
          ) : null}

          <AccionesFormulario>
            <Acciones>
              <Boton
                titulo={guardando ? 'Guardando…' : 'Registrar viaje'}
                onPress={guardar}
                deshabilitado={guardando}
              />
              <Boton titulo="Cancelar" tono="secundario" onPress={onCerrar} />
            </Acciones>
          </AccionesFormulario>
        </>
      )}
    </Modal>
  );
}
