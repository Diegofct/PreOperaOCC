/**
 * Aprobar un borrador, anular el vigente y descargar el plan en Excel (spec 044, RF-56 a RF-67,
 * RF-80, RF-99, RF-100).
 *
 * Quién aprueba depende de quién armó el plan (RF-56 a RF-58), y eso lo decide el servidor: el
 * detalle trae `puedeAprobar` y `puedeAnular` ya calculados para quien mira, y la ruta lo vuelve a
 * mirar. Al Residente nunca le llegan en verdadero (RF-59), así que no ve ninguno de los dos
 * botones; descargar sí, porque su Excel sale sin plata (RF-30, RF-102).
 *
 * ── Los avisos se confirman una sola vez ──
 *
 * Con avisos, la ventana los lista y pide una casilla por el conjunto (RF-60), no una por aviso.
 * Los avisos que se ven son los del plan como se entregó; el servidor los calcula otra vez al
 * aprobar (lo pendiente cambia con cada parte, y puede haber una planificación más nueva, RF-100).
 * Si los suyos no son los mismos, responde 409 con la lista: aquí se muestra esa y se vuelve a
 * pedir la casilla, porque lo confirmado ya no es lo que se va a aprobar.
 *
 * ── No se aprueba lo que no está guardado ──
 *
 * Aprobar manda la `version` que se abrió (RF-63). Con cambios sin guardar se aprobaría el plan del
 * servidor y no el de la pantalla, así que el botón se apaga hasta guardar. Si otra persona lo
 * cambió entretanto, se dice y se ofrece volver a cargarlo; nunca se reintenta solo.
 *
 * Un borrador cuya semana ya terminó no ofrece aprobar (RF-99): queda «Sin aprobar».
 */
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { FuentePanel, Panel, TextoPanel } from '@/constants/theme';
import { api, ErrorApi, mensajeDe } from '@/features/panel/cliente-api';
import { Acciones, Aviso, Boton, Campo, Casilla, Modal } from '@/features/panel/componentes';
import { guardarArchivo } from '@/features/panel/guardar-archivo';
import type { PlanSemanalDetalle } from '@/features/panel/plan-semanal';

import { semanaEnTexto } from './estados';

type AvisoDelPlan = PlanSemanalDetalle['vista']['avisos'][number];

export function AccionesPlanSemanal({
  p,
  semanaTerminada,
  sinGuardar,
  alCambiar,
}: {
  p: PlanSemanalDetalle;
  /** RF-99: la semana del plan ya pasó. */
  semanaTerminada: boolean;
  /** Hay cambios en pantalla que no se han guardado. */
  sinGuardar: boolean;
  /** Algo cambió en el servidor: el plan se vuelve a pedir. */
  alCambiar: () => void;
}) {
  const [ventana, setVentana] = useState<'aprobar' | 'anular' | null>(null);
  const [confirmo, setConfirmo] = useState(false);
  // Los avisos que mandó el servidor al intentar aprobar, si no eran los que se veían.
  const [avisosNuevos, setAvisosNuevos] = useState<AvisoDelPlan[] | null>(null);
  const [motivo, setMotivo] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [bajando, setBajando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cambio, setCambio] = useState(false);

  const puedeAprobar = p.puedeAprobar && !semanaTerminada;
  const avisos = avisosNuevos ?? p.vista.avisos;

  function abrir(cual: 'aprobar' | 'anular') {
    setVentana(cual);
    setConfirmo(false);
    setAvisosNuevos(null);
    setMotivo('');
    setError(null);
    setCambio(false);
  }

  async function ejecutar(accion: () => Promise<unknown>) {
    setEnviando(true);
    setError(null);
    try {
      await accion();
      setVentana(null);
      alCambiar();
    } catch (fallo) {
      const cuerpo = fallo instanceof ErrorApi ? (fallo.cuerpo as { avisos?: AvisoDelPlan[] } | undefined) : undefined;
      if (cuerpo?.avisos) {
        // RF-60, RF-100: los avisos de hoy no son los que se confirmaron; se piden otra vez.
        setAvisosNuevos(cuerpo.avisos);
        setConfirmo(false);
      } else {
        // RF-63: otra persona lo ajustó, lo aprobó o lo anuló. Se avisa y se recarga.
        setCambio(fallo instanceof ErrorApi && fallo.estado === 409);
      }
      setError(mensajeDe(fallo));
    } finally {
      setEnviando(false);
    }
  }

  async function bajarExcel() {
    setBajando(true);
    setError(null);
    try {
      const { contenido, nombre } = await api.planesSemanales.excel(p.id);
      guardarArchivo(contenido, nombre);
    } catch (fallo) {
      setError(mensajeDe(fallo));
    } finally {
      setBajando(false);
    }
  }

  const volverACargar = (
    <Boton
      titulo="Volver a cargar el plan"
      tono="primario"
      onPress={() => {
        setVentana(null);
        alCambiar();
      }}
    />
  );

  return (
    <View style={estilos.columna}>
      <Acciones>
        {puedeAprobar ? <Boton titulo="Aprobar" tono="primario" deshabilitado={sinGuardar} onPress={() => abrir('aprobar')} /> : null}
        {p.puedeAnular ? <Boton titulo="Anular" tono="peligro" onPress={() => abrir('anular')} /> : null}
        <Boton titulo={bajando ? 'Descargando…' : 'Descargar Excel'} tono="secundario" deshabilitado={bajando} onPress={() => void bajarExcel()} />
      </Acciones>
      {puedeAprobar && sinGuardar ? <Text style={estilos.nota}>Guarde los cambios antes de aprobar.</Text> : null}
      {error && ventana === null ? <Aviso tono="error">{error}</Aviso> : null}

      {ventana === 'aprobar' ? (
        <Modal titulo={`Aprobar el plan · ${semanaEnTexto(p.semana)}`} onCerrar={() => setVentana(null)}>
          <View style={estilos.columna}>
            <Text style={estilos.texto}>
              Al aprobarlo rige desde hoy, o desde el lunes si la semana todavía no empieza, y es la meta con que se mide el
              cumplimiento de esos días. Ya no se podrá ajustar: para cambiarlo habrá que anularlo y aprobar otro.
            </Text>
            {avisos.length > 0 ? (
              <View style={estilos.avisos}>
                <Text style={estilos.subtitulo}>{`Avisos del plan (${avisos.length})`}</Text>
                {avisos.map((aviso, n) => (
                  <Text key={n} style={estilos.nota}>{`• ${aviso.detalle}`}</Text>
                ))}
                <Casilla
                  etiqueta={avisos.length === 1 ? 'Revisé el aviso y lo apruebo así.' : `Revisé los ${avisos.length} avisos y lo apruebo así.`}
                  marcada={confirmo}
                  onChange={setConfirmo}
                />
              </View>
            ) : null}
            {error ? <Aviso tono="error">{error}</Aviso> : null}
            <Acciones>
              {cambio ? (
                volverACargar
              ) : (
                <Boton
                  titulo={enviando ? 'Aprobando…' : 'Aprobar'}
                  tono="primario"
                  deshabilitado={(avisos.length > 0 && !confirmo) || enviando}
                  onPress={() => void ejecutar(() => api.planesSemanales.aprobar(p.id, { version: p.version, confirmarAvisos: avisos.length > 0 && confirmo }))}
                />
              )}
              <Boton titulo="Cancelar" tono="secundario" onPress={() => setVentana(null)} />
            </Acciones>
          </View>
        </Modal>
      ) : null}

      {ventana === 'anular' ? (
        <Modal titulo={`Anular el plan · ${semanaEnTexto(p.semana)}`} onCerrar={() => setVentana(null)} angosta>
          <View style={estilos.columna}>
            <Text style={estilos.texto}>
              Deja de regir hoy: los días anteriores se siguen midiendo con él, y desde hoy esa semana se mide como si no tuviera
              plan hasta que se apruebe otro. No se borra: queda anulado con su motivo.
            </Text>
            <Campo etiqueta="Motivo" valor={motivo} onChange={setMotivo} multilinea obligatorio />
            {error ? <Aviso tono="error">{error}</Aviso> : null}
            <Acciones>
              {cambio ? (
                volverACargar
              ) : (
                <Boton
                  titulo={enviando ? 'Anulando…' : 'Anular'}
                  tono="peligro"
                  deshabilitado={!motivo.trim() || enviando}
                  onPress={() => void ejecutar(() => api.planesSemanales.anular(p.id, motivo))}
                />
              )}
              <Boton titulo="Cancelar" tono="secundario" onPress={() => setVentana(null)} />
            </Acciones>
          </View>
        </Modal>
      ) : null}
    </View>
  );
}

const estilos = StyleSheet.create({
  columna: { gap: 12 },
  avisos: { gap: 6 },
  texto: { fontFamily: FuentePanel.texto, fontSize: TextoPanel.cuerpo, color: Panel.texto },
  subtitulo: { fontFamily: FuentePanel.texto, fontWeight: '600', fontSize: TextoPanel.cuerpo, color: Panel.texto },
  nota: { fontFamily: FuentePanel.texto, fontSize: TextoPanel.apoyo, color: Panel.textoApoyo },
});
